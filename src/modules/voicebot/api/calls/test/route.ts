import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { VoiceCall, VoiceCampaign } from '../../../data/entities'
import { testCallSchema } from '../../../data/validators'
import { startOutboundCall } from '../../../lib/provider'

const logger = createLogger('voicebot')

/** Ile połączeń testowych wolno wykonać w ciągu godziny na jedną firmę. */
const LIMIT_TESTOW_NA_GODZINE = 5

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['voicebot.calls.start'] },
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/**
 * Połączenie testowe: bot dzwoni pod wskazany numer od razu.
 *
 * Pierwsza rzecz, jakiej firma chce po założeniu konta, to usłyszeć, jak to
 * brzmi. Kazać jej w tym celu zakładać kampanię i wczytywać listę to najkrótsza
 * droga do tego, żeby się zniechęciła.
 *
 * Różni się od zwykłego zlecenia dwoma rzeczami: omija kolejkę, bo ma zadzwonić
 * teraz, i jest oznaczone jako testowe, żeby nie zaśmiecało statystyk kampanii
 * ani nie trafiało do CRM klienta.
 */
export async function POST(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.orgId) return json({ error: 'Brak kontekstu organizacji' }, 403)

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json({ error: 'Treść żądania nie jest poprawnym JSON-em' }, 400)
  }

  const parsed = testCallSchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Nieprawidłowy numer testowy', details: parsed.error.flatten() }, 400)
  }

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')

  const campaign = await em.findOne(VoiceCampaign, {
    id: parsed.data.campaignId,
    tenantId: auth.tenantId,
    organizationId: auth.orgId,
    deletedAt: null,
  })
  if (!campaign) return json({ error: 'Kampania nie istnieje' }, 404)

  // Bez limitu przycisk "zadzwoń do mnie" jest gotowym narzędziem do nękania
  // dowolnego numeru, w dodatku na nasz rachunek.
  const godzinaWstecz = new Date(Date.now() - 3600 * 1000)
  // Liczymy proby, ktore faktycznie wyszly. Telefon odrzucony przez dostawce
  // albo przez polityke numerow nikogo nie nekal i nikt za niego nie zaplacil,
  // a wliczany do limitu potrafil zablokowac przycisk na godzine w trakcie
  // poprawiania konfiguracji.
  const ostatnieTesty = await em.count(VoiceCall, {
    tenantId: auth.tenantId,
    organizationId: auth.orgId,
    isTest: true,
    status: { $ne: 'failed' },
    createdAt: { $gte: godzinaWstecz },
    deletedAt: null,
  })
  if (ostatnieTesty >= LIMIT_TESTOW_NA_GODZINE) {
    return json({
      error: `Wykonano już ${LIMIT_TESTOW_NA_GODZINE} połączeń testowych w ciągu godziny. Spróbuj później.`,
    }, 429)
  }

  const teraz = new Date()
  const call = em.create(VoiceCall, {
    campaignId: campaign.id,
    phone: parsed.data.phone,
    firstName: parsed.data.firstName ?? null,
    lastName: parsed.data.lastName ?? null,
    status: 'dialing',
    direction: 'outbound',
    isTest: true,
    startedAt: teraz,
    tenantId: auth.tenantId ?? null,
    organizationId: auth.orgId,
    createdAt: teraz,
    updatedAt: teraz,
  })
  em.persist(call)
  await em.flush()

  const wynik = await startOutboundCall({
    agentId: campaign.agentId,
    phoneNumberId: campaign.phoneNumberId ?? null,
    toNumber: parsed.data.phone,
    variables: {
      lead_id: call.id,
      imie: parsed.data.firstName ?? '',
      nazwisko: parsed.data.lastName ?? '',
    },
  })

  if (!wynik.ok) {
    call.status = 'failed'
    call.failureReason = wynik.error
    call.finishedAt = new Date()
    em.persist(call)
    await em.flush()
    return json({ id: call.id, error: wynik.error }, 502)
  }

  call.conversationId = wynik.conversationId
  em.persist(call)
  await em.flush()
  logger.info('test call started', { id: call.id, simulated: wynik.simulated })

  return json({
    id: call.id,
    status: call.status,
    simulated: wynik.simulated,
    pozostaloTestow: LIMIT_TESTOW_NA_GODZINE - ostatnieTesty - 1,
  }, 201)
}
