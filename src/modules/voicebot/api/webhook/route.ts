import crypto from 'node:crypto'
import type { EntityManager } from '@mikro-orm/postgresql'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { VoiceCall, VoiceCampaign, VoiceCrmConnection } from '../../data/entities'
import { postCallWebhookSchema } from '../../data/validators'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { toE164 } from '../../lib/phone'
import type { AwilixContainer } from 'awilix'
import { type DanePolaczenia, type ZnalezionyRekord, czyWartoZakladac } from '../../lib/crm'
import { BitrixCrm } from '../../lib/crm-bitrix'
import { MercatoCrm } from '../../lib/crm-mercato'

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

/** Zdarzenie starsze niż pół godziny odrzucamy jako odtworzone. */
const MAX_WIEK_PODPISU_S = 30 * 60

function porownajStale(oczekiwany: string, otrzymany: string): boolean {
  const a = Buffer.from(oczekiwany, 'utf8')
  const b = Buffer.from(otrzymany, 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/**
 * Sprawdzenie podpisu webhooka.
 *
 * Dostawca przysyła nagłówek w postaci "t=<znacznik czasu>,v0=<skrót>",
 * a podpisuje wartość "<znacznik>.<treść>", nie samą treść. Liczenie skrótu
 * z samej treści dawało nagłówek o innej długości, więc po włączeniu sekretu
 * każdy webhook dostawałby 401 i wyniki rozmów przestałyby wchodzić, bez
 * żadnego widocznego błędu po stronie dostawcy.
 *
 * Prostszą postać bez znacznika czasu obsługujemy dalej, bo tym samym wejściem
 * potrafi się posłużyć scenariusz w Make.
 */
function signatureMatches(rawBody: string, header: string | null): boolean {
  const secret = process.env.VOICEBOT_WEBHOOK_SECRET
  if (!secret) return true
  if (!header) return false

  const pola = new Map<string, string>()
  for (const kawalek of header.split(',')) {
    const i = kawalek.indexOf('=')
    if (i > 0) pola.set(kawalek.slice(0, i).trim(), kawalek.slice(i + 1).trim())
  }

  const znacznik = pola.get('t')
  const podpis = pola.get('v0')

  if (znacznik && podpis) {
    const wiek = Math.abs(Date.now() / 1000 - Number(znacznik))
    if (!Number.isFinite(wiek) || wiek > MAX_WIEK_PODPISU_S) return false
    const oczekiwany = crypto.createHmac('sha256', secret).update(`${znacznik}.${rawBody}`).digest('hex')
    return porownajStale(oczekiwany, podpis)
  }

  const oczekiwany = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return porownajStale(oczekiwany, header.replace(/^sha256=/, '').trim())
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

/**
 * Przepisuje wynik rozmowy na kształt, którego oczekuje złącze CRM.
 */
function daneDoCrm(call: VoiceCall): DanePolaczenia {
  return {
    phone: call.phone,
    firstName: call.firstName,
    lastName: call.lastName,
    direction: call.direction,
    durationSecs: call.durationSecs,
    productCode: call.productCode,
    productDescription: call.productDescription,
    amount: call.amount,
    currency: call.currency,
    contractYear: call.contractYear,
    bank: call.bank,
    identityConfirmed: call.identityConfirmed,
    consentGiven: call.consentGiven,
    requestsContact: call.requestsContact,
    preferredContactTime: call.preferredContactTime,
    summary: call.summary,
  }
}

/**
 * Rekord w CRM, który już dotyczy tego rozmówcy.
 *
 * Szukamy go we własnej historii połączeń, a nie w CRM-ie. Jeśli pod ten sam
 * numer dzwoniliśmy wcześniej i wtedy coś powstało, to jest ten sam człowiek.
 *
 * Dzięki temu wbudowany CRM Open Mercato w ogóle daje się obsłużyć: numer
 * telefonu klienta jest tam szyfrowany i nie ma przy nim kolumny skrótu, więc
 * wyszukanie po numerze wymagałoby odszyfrowania wszystkich kart tenanta przy
 * każdej rozmowie. Nasza tabela połączeń pełni tu rolę indeksu.
 */
async function znanyRekord(em: EntityManager, call: VoiceCall): Promise<ZnalezionyRekord | null> {
  const wczesniejsze = await em.findOne(
    VoiceCall,
    {
      tenantId: call.tenantId,
      phone: call.phone,
      crmRecordRef: { $ne: null },
      id: { $ne: call.id },
      deletedAt: null,
    },
    { orderBy: { createdAt: 'desc' } },
  )
  if (!wczesniejsze?.crmRecordRef) return null

  const rozdzielnik = wczesniejsze.crmRecordRef.indexOf(':')
  if (rozdzielnik < 1) return null
  return {
    typ: wczesniejsze.crmRecordRef.slice(0, rozdzielnik),
    id: wczesniejsze.crmRecordRef.slice(rozdzielnik + 1),
  }
}

/**
 * Wysyła wynik rozmowy do CRM klienta.
 *
 * Uruchamiane dopiero po zapisaniu rozmowy u nas, bo wynik rozmowy jest
 * cenniejszy niż zapis w cudzym systemie i nie da się go powtórzyć. Żaden
 * błąd po stronie CRM nie może wywrócić webhooka: gdyby wywrócił, dostawca
 * ponowiłby zdarzenie, a my mielibyśmy podwójne rekordy.
 *
 * Zwraca opis do zapisania przy rozmowie, żeby w panelu było widać, co się
 * stało, zamiast szukać po logach.
 */
async function wyslijDoCrm(
  em: EntityManager,
  container: AwilixContainer,
  call: VoiceCall,
): Promise<{ ref: string | null; blad: string | null }> {
  // Adres jest szyfrowany w spoczynku. Zakres podajemy z samego połączenia,
  // bo webhook nie ma sesji: tenant został wcześniej ustalony po numerze,
  // na który zadzwoniono, i to on wybiera klucz odszyfrowania.
  const polaczenie = await findOneWithDecryption(
    em,
    VoiceCrmConnection,
    { tenantId: call.tenantId, active: true, deletedAt: null },
    undefined,
    { tenantId: call.tenantId ?? null, organizationId: call.organizationId ?? null },
  )
  if (!polaczenie) return { ref: null, blad: null }

  const dane = daneDoCrm(call)
  if (!czyWartoZakladac(dane)) {
    return { ref: null, blad: 'Rozmowa bez treści, pominięta świadomie' }
  }

  try {
    const zlacze = polaczenie.provider === 'mercato'
      ? new MercatoCrm(container, {
          tenantId: call.tenantId!,
          organizationId: call.organizationId!,
        })
      : new BitrixCrm(polaczenie.webhookUrl, {
          pipelineId: polaczenie.pipelineId,
          stageId: polaczenie.stageId,
        })

    const rekord = await zlacze.zapiszWynikRozmowy(dane, await znanyRekord(em, call))
    return { ref: `${rekord.typ}:${rekord.id}`, blad: null }
  } catch (e) {
    const powod = e instanceof Error ? e.message : 'Nieznany błąd CRM'
    logger.warn('crm push failed', { callId: call.id })
    return { ref: null, blad: powod.slice(0, 300) }
  }
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
  const kontener = await createRequestContainer()
  const em = kontener.resolve<EntityManager>('em')

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

  // Koszt zapisujemy przy każdym zakończeniu, także nieudanym, bo sama próba
  // zestawienia połączenia potrafi kosztować.
  const kosztUsd = data.metadata?.cost_fiat
  if (kosztUsd != null) call.costUsd = kosztUsd.toFixed(6)
  const kosztKredyty = data.metadata?.cost
  if (kosztKredyty != null) call.costCredits = Math.round(kosztKredyty)

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

  // Dopiero teraz, gdy wynik rozmowy jest już bezpiecznie u nas.
  const crm = await wyslijDoCrm(em, kontener, call)
  if (crm.ref || crm.blad) {
    call.crmRecordRef = crm.ref
    call.crmError = crm.blad
    em.persist(call)
    await em.flush()
  }

  return json({
    accepted: true,
    status: call.status,
    id: call.id,
    direction: call.direction,
    relatedCallId: call.relatedCallId ?? null,
    crm: crm.ref ?? null,
  })
}
