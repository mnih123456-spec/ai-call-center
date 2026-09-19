import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { VoiceProfile, VoiceTenantLimits } from '../../data/entities'
import { limitsSchema } from '../../data/validators'
import { pobierzProgi, pobierzWykorzystanie } from '../../lib/limity'

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
  if (!auth?.orgId) return json({ error: 'Brak kontekstu organizacji' }, 403)

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')
  const zakres = { tenantId: auth.tenantId ?? null, organizationId: auth.orgId }

  const [progi, zuzycie, glosy] = await Promise.all([
    pobierzProgi(em, zakres),
    pobierzWykorzystanie(em, zakres),
    em.count(VoiceProfile, { ...zakres, deletedAt: null }),
  ])

  return json({ progi, zuzycie: { ...zuzycie, glosy } })
}

/**
 * Zapis progów firmy.
 *
 * Zakres bierzemy z sesji, nigdy z treści żądania: inaczej administrator
 * jednej firmy podniósłby limity drugiej, podmieniając identyfikator.
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

  const parsed = limitsSchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Nieprawidłowe progi', details: parsed.error.flatten() }, 400)
  }

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')
  const zakres = { tenantId: auth.tenantId ?? null, organizationId: auth.orgId }
  const teraz = new Date()

  let wiersz = await em.findOne(VoiceTenantLimits, { ...zakres, deletedAt: null })
  if (wiersz) {
    wiersz.minutesPerMonth = parsed.data.minutesPerMonth ?? null
    wiersz.maxVoices = parsed.data.maxVoices ?? null
    wiersz.maxConcurrentCalls = parsed.data.maxConcurrentCalls ?? null
    wiersz.updatedAt = teraz
  } else {
    wiersz = em.create(VoiceTenantLimits, {
      minutesPerMonth: parsed.data.minutesPerMonth ?? null,
      maxVoices: parsed.data.maxVoices ?? null,
      maxConcurrentCalls: parsed.data.maxConcurrentCalls ?? null,
      tenantId: zakres.tenantId,
      organizationId: zakres.organizationId,
      createdAt: teraz,
      updatedAt: teraz,
    })
  }

  em.persist(wiersz)
  await em.flush()

  logger.info('tenant limits saved', {
    organizationId: zakres.organizationId,
    minuty: wiersz.minutesPerMonth,
    glosy: wiersz.maxVoices,
    rownoczesne: wiersz.maxConcurrentCalls,
  })

  return json({ ok: true, progi: {
    minutesPerMonth: wiersz.minutesPerMonth ?? null,
    maxVoices: wiersz.maxVoices ?? null,
    maxConcurrentCalls: wiersz.maxConcurrentCalls ?? null,
  } })
}
