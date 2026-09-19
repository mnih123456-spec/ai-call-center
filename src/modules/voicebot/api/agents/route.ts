import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { VoiceAgentProfile } from '../../data/entities'
import { agentProfileSchema } from '../../data/validators'
import { fetchProviderCatalog } from '../../lib/provider'
import { wyslijPytaniaDoAgenta } from '../../lib/scenariusz'

const logger = createLogger('voicebot')

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['voicebot.campaigns.view'] },
  POST: { requireAuth: true, requireFeatures: ['voicebot.campaigns.manage'] },
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.orgId) return json({ profile: [], agenci: [] })

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')

  const [profile, katalog] = await Promise.all([
    em.find(
      VoiceAgentProfile,
      { tenantId: auth.tenantId, organizationId: auth.orgId, deletedAt: null },
      { orderBy: { createdAt: 'asc' } },
    ),
    fetchProviderCatalog(),
  ])

  return json({
    profile: profile.map((p) => ({
      id: p.id,
      agentId: p.agentId,
      name: p.name,
      direction: p.direction,
      questions: p.questions ?? '',
      knowledgeUrl: p.knowledgeUrl ?? '',
      syncedAt: p.syncedAt?.toISOString() ?? null,
      syncResult: p.syncResult ?? null,
    })),
    // Lista agentów u dostawcy, żeby przypisanie szło z wyboru, a nie
    // z przepisywania identyfikatora. Ta sama zasada co przy numerach.
    agenci: katalog.agents,
    katalogDziala: katalog.configured,
  })
}

/**
 * Zapis profilu agenta firmy.
 *
 * Klient podaje pytania do scenariusza rozmowy i adres swojej strony,
 * a nie prompt. Prompt jest nasz i to on odpowiada za to, że bot przedstawia
 * się, pyta o zgodę i nie zmyśla. Gdyby klient mógł go nadpisać, pierwsza
 * firma, która skasuje zdanie o zgodzie, zrobi z tego problem prawny nasz,
 * a nie swój.
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

  const parsed = agentProfileSchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Nieprawidłowe dane agenta', details: parsed.error.flatten() }, 400)
  }

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')
  const teraz = new Date()

  let profil = parsed.data.id
    ? await em.findOne(VoiceAgentProfile, {
        id: parsed.data.id,
        tenantId: auth.tenantId,
        organizationId: auth.orgId,
        deletedAt: null,
      })
    : await em.findOne(VoiceAgentProfile, {
        agentId: parsed.data.agentId,
        tenantId: auth.tenantId,
        organizationId: auth.orgId,
        deletedAt: null,
      })

  if (profil) {
    profil.agentId = parsed.data.agentId
    profil.name = parsed.data.name
    profil.direction = parsed.data.direction
    profil.questions = parsed.data.questions ?? null
    profil.knowledgeUrl = parsed.data.knowledgeUrl ?? null
    profil.updatedAt = teraz
  } else {
    profil = em.create(VoiceAgentProfile, {
      agentId: parsed.data.agentId,
      name: parsed.data.name,
      direction: parsed.data.direction,
      questions: parsed.data.questions ?? null,
      knowledgeUrl: parsed.data.knowledgeUrl ?? null,
      tenantId: auth.tenantId ?? null,
      organizationId: auth.orgId,
      createdAt: teraz,
      updatedAt: teraz,
    })
  }

  em.persist(profil)
  await em.flush()

  // Dopiero po zapisie u nas wysylamy pytania do dostawcy. Gdyby wysylka
  // szla pierwsza i sie udala, a zapis padl, klient mialby bota mowiacego
  // rzeczy, ktorych nie widzi w panelu.
  const wysylka = await wyslijPytaniaDoAgenta(profil.agentId, profil.questions)
  profil.syncedAt = new Date()
  profil.syncResult = wysylka.ok
    ? 'Pytania przekazane do agenta.'
    : wysylka.blad
  em.persist(profil)
  await em.flush()

  logger.info('agent profile saved', { id: profil.id, direction: profil.direction, wyslane: wysylka.ok })

  return json({
    id: profil.id,
    agentId: profil.agentId,
    wyslane: wysylka.ok,
    syncResult: profil.syncResult,
  }, 201)
}
