import type { EntityManager } from '@mikro-orm/postgresql'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { VoiceCampaign, VoiceAgentProfile, VoiceTenantLimits } from '../../../data/entities'
import { znanaBranza } from '../../../lib/branze'
import { zalozAgentaDlaFirmy } from '../../../lib/nowy-agent'
import { filtrujNumery } from '../../../lib/limity'
import { fetchProviderCatalog } from '../../../lib/provider'
import { pobierzWiedze } from '../../../lib/wiedza'

const logger = createLogger('voicebot')

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['voicebot.campaigns.manage'] },
}

const schema = z.object({
  nazwaFirmy: z.string().min(2).max(120),
  industry: z.string().max(50).nullable().optional().or(z.literal('')),
  knowledgeUrl: z.string().url().max(500).nullable().optional().or(z.literal('')),
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/**
 * Zakłada bota dla firmy w jednym kroku.
 *
 * Do tej pory agenta zakładało się ręcznie na koncie dostawcy, a w panelu
 * wybierało z listy. To rodziło dwa problemy naraz: firma widziała agentów
 * innych firm, a wybranie cudzego agenta sprawiało, że bot przedstawiał się
 * cudzą nazwą. Tutaj bot powstaje razem z profilem i od początku należy do
 * tej jednej firmy.
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

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Podaj nazwę firmy, a adres strony w pełnej postaci z https', details: parsed.error.flatten() }, 400)
  }

  const branza = znanaBranza(parsed.data.industry) ? parsed.data.industry! : null

  // Strone czytamy przed zalozeniem bota: jesli model rozpozna branze, bot
  // dostanie wlasciwy slownik od razu, a nie przy nastepnym zapisie.
  let wiedza: string | null = null
  let branzaKoncowa = branza
  let uwagaWiedzy: string | null = null
  if (parsed.data.knowledgeUrl) {
    const odczyt = await pobierzWiedze(parsed.data.knowledgeUrl)
    if (odczyt.ok) {
      wiedza = odczyt.wiedza
      if (!branzaKoncowa && odczyt.branza) branzaKoncowa = odczyt.branza
    } else {
      uwagaWiedzy = odczyt.blad
    }
  }

  const wynik = await zalozAgentaDlaFirmy(parsed.data.nazwaFirmy, branzaKoncowa)
  if (!wynik.ok) return json({ error: wynik.blad }, 502)

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')
  const teraz = new Date()

  const profil = em.create(VoiceAgentProfile, {
    agentId: wynik.agentId,
    name: wynik.nazwa,
    direction: 'outbound',
    questions: null,
    industry: branzaKoncowa,
    knowledgeUrl: parsed.data.knowledgeUrl || null,
    knowledgeText: wiedza,
    knowledgeReadAt: wiedza ? teraz : null,
    syncedAt: teraz,
    syncResult: uwagaWiedzy
      ? `Bot założony. Strony nie udało się przeczytać: ${uwagaWiedzy}`
      : 'Bot założony i dostosowany do firmy.',
    tenantId: auth.tenantId ?? null,
    organizationId: auth.orgId,
    createdAt: teraz,
    updatedAt: teraz,
  })
  em.persist(profil)
  await em.flush()

  // Sam bot nie pozwala jeszcze zadzwonic. Zakladamy od razu kampanie, zeby
  // kreator konczyl sie czyms, co da sie kliknac, a nie ekranem bez dalszego
  // kroku. Kampania startuje jako szkic, wiec nic samo nie wydzwoni.
  const limity = await em.findOne(VoiceTenantLimits, {
    tenantId: auth.tenantId ?? null, organizationId: auth.orgId, deletedAt: null,
  })
  const katalog = await fetchProviderCatalog()
  const numery = filtrujNumery(katalog.numbers, limity?.allowedNumbers || process.env.VOICEBOT_NUMERY_DOZWOLONE)
  const kampania = em.create(VoiceCampaign, {
    name: `${wynik.nazwa} - kampania startowa`,
    description: null,
    agentId: wynik.agentId,
    phoneNumberId: numery[0]?.phoneNumberId ?? null,
    minIntervalSecs: 180,
    status: 'draft',
    tenantId: auth.tenantId ?? null,
    organizationId: auth.orgId,
    createdAt: teraz,
    updatedAt: teraz,
  })
  em.persist(kampania)
  await em.flush()

  logger.info('company bot created', { id: profil.id, agentId: wynik.agentId, branza: branzaKoncowa, campaignId: kampania.id })

  return json({
    id: profil.id,
    agentId: wynik.agentId,
    nazwa: wynik.nazwa,
    industry: branzaKoncowa,
    knowledgeText: wiedza ?? '',
    uwaga: uwagaWiedzy,
    kampaniaId: kampania.id,
    kampaniaNazwa: kampania.name,
    numerPrzypisany: numery[0]?.phoneNumber ?? null,
  }, 201)
}
