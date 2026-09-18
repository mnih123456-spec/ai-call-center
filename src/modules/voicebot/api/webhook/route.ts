import crypto from 'node:crypto'
import type { EntityManager } from '@mikro-orm/postgresql'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { VoiceCall, VoiceCampaign } from '../../data/entities'
import { postCallWebhookSchema } from '../../data/validators'
import { toE164 } from '../../lib/phone'

const logger = createLogger('voicebot')

/** Jak daleko wstecz szukamy połączenia, na które ktoś oddzwania. */
const OKNO_ODDZWONIENIA_MS = 14 * 24 * 60 * 60 * 1000

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const metadata = {
  POST: { requireAuth: false },
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function signatureMatches(rawBody: string, header: string | null): boolean {
  const secret = process.env.VOICEBOT_WEBHOOK_SECRET
  if (!secret) return true
  if (!header) return false

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const provided = header.replace(/^sha256=/, '').trim()
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(provided, 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function firstString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number') return String(value)
  return null
}

function asBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (['true', 'tak', 'yes', '1'].includes(v)) return true
    if (['false', 'nie', 'no', '0'].includes(v)) return false
  }
  return null
}

/**
 * Kampania, do której należy numer, na który zadzwoniono.
 *
 * To jest sposób na ustalenie tenanta bez sesji: każda firma-klient ma swój
 * numer, więc numer jest naturalnym kluczem. Treści żądania nie pytamy o to,
 * do kogo należy rozmowa, bo nadeszła z zewnątrz.
 */
async function kampaniaNumeru(em: EntityManager, phoneNumberId: string | null | undefined) {
  if (!phoneNumberId) return null
  return em.findOne(
    VoiceCampaign,
    { phoneNumberId, deletedAt: null },
    { orderBy: { createdAt: 'desc' } },
  )
}

/**
 * Ostatnie połączenie wychodzące do tego numeru w tym tenancie.
 *
 * Służy do sklejenia oddzwonienia z próbą, która je wywołała. Szukamy tylko
 * wychodzących, bo oddzwonienie jest odpowiedzią na nasz telefon, a nie na
 * własną wcześniejszą rozmowę przychodzącą.
 */
async function poprzedniaProba(em: EntityManager, tenantId: string | null, phone: string) {
  return em.findOne(
    VoiceCall,
    {
      tenantId,
      phone,
      direction: 'outbound',
      createdAt: { $gte: new Date(Date.now() - OKNO_ODDZWONIENIA_MS) },
      deletedAt: null,
    },
    { orderBy: { createdAt: 'desc' } },
  )
}

export async function POST(request: Request) {
  const rawBody = await request.text()

  const header = request.headers.get('elevenlabs-signature')
    ?? request.headers.get('x-signature')
    ?? request.headers.get('x-hub-signature-256')
  if (!signatureMatches(rawBody, header)) {
    logger.warn('webhook signature rejected')
    return json({ error: 'Nieprawidłowy podpis' }, 401)
  }

  let raw: unknown
  try {
    raw = JSON.parse(rawBody)
  } catch {
    return json({ error: 'Treść żądania nie jest poprawnym JSON-em' }, 400)
  }

  const parsed = postCallWebhookSchema.safeParse(raw)
  if (!parsed.success) return json({ error: 'Nieznany kształt zdarzenia' }, 400)

  const { type, data } = parsed.data
  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')

  const polaczenie = data.metadata?.phone_call
  const kierunek = polaczenie?.direction === 'inbound' ? 'inbound' : 'outbound'
  const kampania = await kampaniaNumeru(em, polaczenie?.phone_number_id)

  const vars = data.conversation_initiation_client_data?.dynamic_variables ?? {}
  const leadId = firstString(vars.lead_id) ?? firstString(vars.deal_id)

  let call = leadId && UUID_RE.test(leadId)
    ? await em.findOne(VoiceCall, { id: leadId, deletedAt: null })
    : null
  if (!call) {
    call = await em.findOne(VoiceCall, { conversationId: data.conversation_id, deletedAt: null })
  }

  // Wskazany wiersz musi należeć do tenanta, który jest właścicielem numeru.
  // Inaczej cudzy identyfikator w treści żądania nadpisałby wynik u innej firmy.
  if (call && kampania && call.tenantId && kampania.tenantId && call.tenantId !== kampania.tenantId) {
    logger.warn('webhook tenant mismatch', { conversationId: data.conversation_id })
    return json({ accepted: false, reason: 'Połączenie nie należy do tego numeru' }, 403)
  }

  if (!call && kierunek === 'inbound') {
    if (!kampania) {
      logger.warn('webhook inbound for unknown number', { phoneNumberId: polaczenie?.phone_number_id })
      return json({ accepted: false, reason: 'Numer nie jest przypisany do żadnej kampanii' }, 404)
    }

    const phone = toE164(polaczenie?.external_number) ?? toE164(firstString(vars.system__caller_id))
    if (!phone) {
      logger.warn('webhook inbound without caller number', { conversationId: data.conversation_id })
      return json({ accepted: false, reason: 'Brak numeru dzwoniącego' }, 400)
    }

    const proba = await poprzedniaProba(em, kampania.tenantId ?? null, phone)
    const now = new Date()

    // Oddzwonienie zakłada własny wiersz i wskazuje na wcześniejszą próbę.
    // Nie nadpisuje jej, bo to, że ktoś nie odebrał za pierwszym razem,
    // jest osobną obserwacją i ma wartość sprzedażową.
    call = em.create(VoiceCall, {
      campaignId: proba?.campaignId ?? null,
      relatedCallId: proba?.id ?? null,
      leadRef: proba?.leadRef ?? null,
      firstName: proba?.firstName ?? null,
      lastName: proba?.lastName ?? null,
      phone,
      direction: 'inbound',
      status: 'dialing',
      startedAt: now,
      tenantId: kampania.tenantId ?? null,
      organizationId: kampania.organizationId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    em.persist(call)
    await em.flush()
    logger.info('inbound call recorded', { id: call.id, related: call.relatedCallId })
  }

  if (!call) {
    logger.warn('webhook for unknown call', { conversationId: data.conversation_id })
    return json({ accepted: false, reason: 'Nie znaleziono połączenia' }, 404)
  }

  if (call.status === 'completed') {
    return json({ accepted: true, duplicate: true })
  }

  call.conversationId = data.conversation_id
  call.finishedAt = new Date()

  if (type === 'call_initiation_failure') {
    call.status = 'failed'
    call.failureReason = firstString(data.metadata?.termination_reason) ?? 'Połączenie nie doszło do skutku'
    em.persist(call)
    await em.flush()
    return json({ accepted: true, status: call.status })
  }

  const results = data.analysis?.data_collection_results ?? {}
  const pick = (key: string): unknown => (results as Record<string, { value?: unknown }>)[key]?.value

  call.status = 'completed'
  call.durationSecs = data.metadata?.call_duration_secs ?? null
  call.summary = firstString(data.analysis?.transcript_summary)
  call.identityConfirmed = asBool(pick('tozsamosc_potwierdzona'))
  call.consentGiven = asBool(pick('zgoda_na_rozmowe'))
  call.productCode = firstString(pick('produkt_kod'))
  call.productDescription = firstString(pick('produkt_opis'))
  call.amount = firstString(pick('kwota'))
  call.currency = firstString(pick('waluta'))
  call.contractYear = firstString(pick('rok_umowy'))
  call.bank = firstString(pick('bank'))
  call.leadActive = asBool(pick('lead_aktualny'))
  call.requestsContact = asBool(pick('prosi_o_kontakt'))
  call.preferredContactTime = firstString(pick('preferowany_termin_kontaktu'))
  call.extraNotes = firstString(pick('dodatkowe_informacje'))

  em.persist(call)
  await em.flush()
  logger.info('call result stored', { id: call.id, direction: call.direction, product: call.productCode })

  return json({
    accepted: true,
    status: call.status,
    id: call.id,
    direction: call.direction,
    relatedCallId: call.relatedCallId ?? null,
  })
}
