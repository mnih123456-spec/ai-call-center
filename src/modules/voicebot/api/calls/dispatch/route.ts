import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { resolveTranslations } from '@open-mercato/shared/lib/i18n/server'
import { readJsonSafe } from '@open-mercato/shared/lib/http/readJsonSafe'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { VoiceCampaign } from '../../../data/entities'
import { callDispatchSchema as schema } from '../../../data/validators'
import { publishPendingCalls } from '../../../lib/call-queue'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['voicebot.calls.start'] },
}

/** Ponawia publikacje zapisanych pending po awarii kolejki, bez nowych rekordow. */
export async function POST(request: Request) {
  const auth = await getAuthFromRequest(request)
  const { translate: t } = await resolveTranslations()
  if (!auth?.tenantId || !auth.orgId) {
    return Response.json({ error: t('voicebot.queue.scope_required', 'Wybierz organizację.') }, { status: 403 })
  }
  const parsed = schema.safeParse(await readJsonSafe(request))
  if (!parsed.success) {
    return Response.json({ error: t('voicebot.queue.invalid_campaign', 'Nieprawidłowa kampania.') }, { status: 400 })
  }
  const container = await createRequestContainer()
  const em = container.resolve<EntityManager>('em')
  const scope = { tenantId: auth.tenantId, organizationId: auth.orgId }
  const campaign = await em.findOne(VoiceCampaign, { ...scope, id: parsed.data.campaignId, deletedAt: null })
  if (!campaign) {
    return Response.json({ error: t('voicebot.queue.campaign_missing', 'Kampania nie istnieje.') }, { status: 404 })
  }
  const result = await publishPendingCalls(em, scope, campaign.id)
  return Response.json(result, { status: result.queuePending ? 503 : 200 })
}

export const openApi: OpenApiRouteDoc = {
  methods: {
    POST: {
      summary: 'Republish pending campaign calls after a queue outage',
      requestBody: { schema },
      responses: [{ status: 200 }, { status: 503 }],
    },
  },
}
