import crypto from 'node:crypto'
import type { EntityManager } from '@mikro-orm/postgresql'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { VoiceCall } from '../../data/entities'
import { postCallWebhookSchema } from '../../data/validators'

const logger = createLogger('voicebot')

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

  const vars = data.conversation_initiation_client_data?.dynamic_variables ?? {}
  const leadId = firstString(vars.lead_id) ?? firstString(vars.deal_id)

  const call = leadId
    ? await em.findOne(VoiceCall, { id: leadId, deletedAt: null })
    : await em.findOne(VoiceCall, { conversationId: data.conversation_id, deletedAt: null })

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
  logger.info('call result stored', { id: call.id, product: call.productCode })

  return json({ accepted: true, status: call.status, id: call.id })
}
