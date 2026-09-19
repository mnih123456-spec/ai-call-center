import type { EntityManager } from '@mikro-orm/postgresql'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { VoiceCall } from '../../../data/entities'
import { reviewFilter, reviewReasons } from './rules'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['voicebot.calls.view'] },
}

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.tenantId || !auth.orgId) return json({ error: 'scope_required' }, 403)
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) return json({ error: 'invalid_query' }, 400)
  const { page, pageSize } = parsed.data
  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')
  const where: Record<string, unknown> = {
    ...reviewFilter(), tenantId: auth.tenantId, organizationId: auth.orgId, deletedAt: null,
  }
  const [rows, total] = await em.findAndCount(VoiceCall, where, {
    orderBy: { createdAt: 'desc', id: 'desc' }, limit: pageSize, offset: (page - 1) * pageSize,
  })
  return json({
    items: rows.map((row) => ({
      id: row.id, firstName: row.firstName ?? null, lastName: row.lastName ?? null,
      phone: row.phone, status: row.status, createdAt: row.createdAt.toISOString(),
      // Surowy błąd CRM może zawierać dane dostawcy; wystarcza kod przyczyny.
      reasons: reviewReasons(row),
    })),
    total, page, pageSize,
  })
}

export const openApi: OpenApiRouteDoc = {
  methods: { GET: {
    summary: 'List non-test voice calls requiring human review', query: querySchema,
    responses: [{ status: 200 }, { status: 400 }, { status: 403 }],
  } },
}
