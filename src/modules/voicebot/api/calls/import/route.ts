import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { VoiceCall, VoiceCampaign } from '../../../data/entities'
import { listImportSchema } from '../../../data/validators'
import { parsujListe } from '../../../lib/import-listy'
import { publishPendingCalls } from '../../../lib/call-queue'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'

const logger = createLogger('voicebot')

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['voicebot.calls.start'] },
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/**
 * Wczytanie wklejonej listy kontaktów do kampanii.
 *
 * Powstają połączenia w stanie `pending`, czyli zlecone, ale jeszcze
 * niewybrane. Wybieraniem zajmuje się kolejka, która pilnuje odstępu między
 * rozmowami. Gdybyśmy dzwonili od razu przy imporcie, dwieście wklejonych
 * numerów oznaczałoby dwieście równoczesnych rozmów: kosztownie, i u dostawcy
 * natychmiast poza limitem.
 */
export async function POST(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.orgId || !auth.tenantId) return json({ error: 'Brak kontekstu organizacji' }, 403)

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json({ error: 'Treść żądania nie jest poprawnym JSON-em' }, 400)
  }

  const parsed = listImportSchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Nieprawidłowe dane importu', details: parsed.error.flatten() }, 400)
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

  const wynik = parsujListe(parsed.data.tekst)

  if (wynik.pozycje.length === 0) {
    return json({
      dodane: 0,
      bledy: wynik.bledy,
      pominieteDuplikaty: wynik.pominieteDuplikaty,
      error: 'Żaden wiersz nie zawierał poprawnego numeru',
    }, 400)
  }

  // Numery, które już czekają w tej kampanii. Klient wkleja listę drugi raz
  // częściej, niż się wydaje: raz dlatego, że poprawił jeden wiersz, raz
  // dlatego, że nie był pewien, czy pierwsze wklejenie się udało.
  const juzCzekaja = await em.find(
    VoiceCall,
    {
      campaignId: campaign.id,
      tenantId: auth.tenantId,
      organizationId: auth.orgId,
      status: 'pending',
      deletedAt: null,
    },
    { fields: ['phone'] },
  )
  const zajete = new Set(juzCzekaja.map((c) => c.phone))

  const teraz = new Date()
  let dodane = 0
  let pominieteBoCzekaja = 0

  for (const pozycja of wynik.pozycje) {
    if (zajete.has(pozycja.phone)) {
      pominieteBoCzekaja++
      continue
    }
    const call = em.create(VoiceCall, {
      campaignId: campaign.id,
      phone: pozycja.phone,
      firstName: pozycja.firstName,
      lastName: pozycja.lastName,
      leadRef: pozycja.leadRef,
      status: 'pending',
      direction: 'outbound',
      tenantId: auth.tenantId,
      organizationId: auth.orgId,
      createdAt: teraz,
      updatedAt: teraz,
    })
    em.persist(call)
    dodane++
  }

  await em.flush()
  const publication = await publishPendingCalls(em, {
    tenantId: auth.tenantId, organizationId: auth.orgId,
  }, campaign.id)
  logger.info('list imported', { campaignId: campaign.id, dodane })

  return json({
    dodane,
    bledy: wynik.bledy,
    pominieteDuplikaty: wynik.pominieteDuplikaty,
    pominieteBoCzekaja,
    queuePending: publication.queuePending,
  }, 201)
}

export const openApi: OpenApiRouteDoc = {
  methods: {
    POST: {
      summary: 'Import and queue campaign calls',
      requestBody: { schema: listImportSchema },
      responses: [{ status: 201, description: 'Calls saved; queuePending indicates publication needs recovery.' }],
    },
  },
}
