import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { VoiceCampaign, VoiceProfile } from '../../data/entities'
import { pobierzGlosy, sklonujGlos, ustawGlosAgenta } from '../../lib/glosy'

const logger = createLogger('voicebot')

/** Największe nagranie, jakie przyjmujemy: około dziesięciu minut mowy. */
const MAX_ROZMIAR_NAGRANIA = 20 * 1024 * 1024

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['voicebot.campaigns.view'] },
  POST: { requireAuth: true, requireFeatures: ['voicebot.campaigns.manage'] },
  PUT: { requireAuth: true, requireFeatures: ['voicebot.campaigns.manage'] },
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.orgId) return json({ glosy: [], wlasne: [] })

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')

  const [glosy, wlasne] = await Promise.all([
    pobierzGlosy(),
    em.find(VoiceProfile, { tenantId: auth.tenantId, organizationId: auth.orgId, deletedAt: null }),
  ])

  // Głosy sklonowane leżą na wspólnym koncie u dostawcy, więc lista z API
  // zawiera także cudze. Pokazujemy tylko te, które ten tenant u nas
  // zarejestrował, plus katalogowe, które są dla wszystkich.
  const wlasneId = new Set(wlasne.map((w) => w.voiceId))
  const widoczne = glosy.filter((g) => g.rodzaj === 'premade' || wlasneId.has(g.voiceId))

  return json({
    glosy: widoczne,
    wlasne: wlasne.map((w) => ({
      voiceId: w.voiceId,
      name: w.name,
      consentPerson: w.consentPerson,
      consentAt: w.consentAt.toISOString(),
    })),
  })
}

/**
 * Nagranie próbki głosu i sklonowanie go u dostawcy.
 *
 * Przyjmujemy formularz wieloczęściowy, bo idzie tu plik dźwiękowy.
 * Zgoda osoby użyczającej głosu jest polem wymaganym: bez niej nie wysyłamy
 * nagrania nigdzie. To nie jest formalność, tylko jedyny ślad, który zostanie,
 * gdy ktoś kiedyś zapyta, czyj to głos i kto pozwolił go użyć.
 */
export async function POST(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.orgId || !auth.tenantId) return json({ error: 'Brak kontekstu organizacji' }, 403)

  let formularz: FormData
  try {
    formularz = await request.formData()
  } catch {
    return json({ error: 'Oczekiwano formularza z nagraniem' }, 400)
  }

  const nazwa = String(formularz.get('nazwa') ?? '').trim()
  const osoba = String(formularz.get('osoba') ?? '').trim()
  const zgoda = String(formularz.get('zgoda') ?? '') === 'true'
  const pliki = formularz.getAll('nagranie').filter((p): p is File => p instanceof File)

  if (!nazwa) return json({ error: 'Podaj nazwę głosu' }, 400)
  if (!osoba) return json({ error: 'Podaj imię i nazwisko osoby, której głos nagrywasz' }, 400)
  if (!zgoda) return json({ error: 'Bez potwierdzenia zgody nie prześlemy nagrania' }, 400)
  if (pliki.length === 0) return json({ error: 'Dołącz nagranie' }, 400)

  const razem = pliki.reduce((suma, p) => suma + p.size, 0)
  if (razem > MAX_ROZMIAR_NAGRANIA) {
    return json({ error: 'Nagranie jest za duże. Wystarczą trzy do pięciu minut mowy.' }, 400)
  }

  const wynik = await sklonujGlos({
    nazwa,
    tenantId: auth.tenantId,
    pliki,
    opis: `Głos firmowy. Osoba: ${osoba}.`,
  })
  if (!wynik.ok) return json({ error: wynik.blad }, 502)

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')
  const teraz = new Date()

  const profil = em.create(VoiceProfile, {
    voiceId: wynik.voiceId,
    name: nazwa,
    consentPerson: osoba,
    consentConfirmedBy: typeof auth.sub === 'string' ? auth.sub : null,
    consentAt: teraz,
    tenantId: auth.tenantId,
    organizationId: auth.orgId,
    createdAt: teraz,
    updatedAt: teraz,
  })
  em.persist(profil)
  await em.flush()

  logger.info('voice profile stored', { voiceId: wynik.voiceId })
  return json({ voiceId: wynik.voiceId, name: nazwa }, 201)
}

/**
 * Przypisanie głosu do agenta obsługującego kampanię.
 *
 * Głos jest cechą agenta u dostawcy, a nie naszej kampanii, więc zmieniamy go
 * tam. Kampanię sprawdzamy najpierw u siebie, żeby nikt nie podmienił głosu
 * w cudzym agencie, podając jego identyfikator wprost.
 */
export async function PUT(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.orgId) return json({ error: 'Brak kontekstu organizacji' }, 403)

  let raw: { campaignId?: string; voiceId?: string }
  try {
    raw = (await request.json()) as typeof raw
  } catch {
    return json({ error: 'Treść żądania nie jest poprawnym JSON-em' }, 400)
  }

  if (!raw.campaignId || !raw.voiceId) {
    return json({ error: 'Podaj kampanię i głos' }, 400)
  }

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')

  const kampania = await em.findOne(VoiceCampaign, {
    id: raw.campaignId,
    tenantId: auth.tenantId,
    organizationId: auth.orgId,
    deletedAt: null,
  })
  if (!kampania) return json({ error: 'Kampania nie istnieje' }, 404)

  const wynik = await ustawGlosAgenta(kampania.agentId, raw.voiceId)
  if (!wynik.ok) return json({ error: wynik.blad }, 502)

  return json({ ok: true, agentId: kampania.agentId, voiceId: raw.voiceId })
}
