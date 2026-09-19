import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromCookies } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { VoiceTenantLimits } from '../../data/entities'
import { filtrujNumery } from '../../lib/limity'
import { fetchProviderCatalog } from '../../lib/provider'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['voicebot.campaigns.view'] },
}

/**
 * Katalog dostawcy zawężony do tego, co wolno tej firmie.
 *
 * Wszystkie firmy korzystają z jednego konta u dostawcy, więc jego lista
 * numerów jest wspólna. Zawężenie musi siedzieć tutaj, a nie w przeglądarce:
 * ekran można obejść, odpowiedź API nie.
 */
export async function GET() {
  const auth = await getAuthFromCookies()
  if (!auth?.orgId) {
    return new Response(JSON.stringify({ configured: false, agents: [], numbers: [] }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')

  const [catalog, limity] = await Promise.all([
    fetchProviderCatalog(),
    em.findOne(VoiceTenantLimits, {
      tenantId: auth.tenantId ?? null,
      organizationId: auth.orgId,
      deletedAt: null,
    }),
  ])

  const zawezony = {
    ...catalog,
    // Gdy firma nie wskazala wlasnych numerow, obowiazuje lista wdrozenia.
    // Na wspolnym koncie dostawcy to ona decyduje, ktore numery w ogole
    // wolno komukolwiek zobaczyc.
    numbers: filtrujNumery(catalog.numbers, limity?.allowedNumbers || process.env.VOICEBOT_NUMERY_DOZWOLONE),
  }

  return new Response(JSON.stringify(zawezony), { status: 200, headers: { 'content-type': 'application/json' } })
}
