import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { makeCrudRoute } from '@open-mercato/shared/lib/crud/factory'
import { createCrudOpenApiFactory } from '@open-mercato/shared/lib/openapi/crud'
import { z } from 'zod'
import { VoiceCampaign } from '../../data/entities'
import { campaignCreateSchema, campaignListSchema, campaignUpdateSchema } from '../../data/validators'

const logger = createLogger('voicebot')

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
  if (!auth?.tenantId || !auth.orgId) return json({ items: [], total: 0 })

  const url = new URL(request.url)
  const parsed = campaignListSchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return json({ error: 'Nieprawidłowe parametry zapytania' }, 400)
  const { page, pageSize, sortField, sortDir } = parsed.data

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')

  const where = { tenantId: auth.tenantId, organizationId: auth.orgId, deletedAt: null }
  const [rows, total] = await em.findAndCount(VoiceCampaign, where, {
    orderBy: { [sortField === 'created_at' ? 'createdAt' : sortField]: sortDir },
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })

  return json({
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      agentId: r.agentId,
      phoneNumberId: r.phoneNumberId ?? null,
      status: r.status,
      minIntervalSecs: r.minIntervalSecs,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  })
}

export async function POST(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.tenantId || !auth.orgId) return json({ error: 'Brak kontekstu organizacji' }, 403)

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json({ error: 'Treść żądania nie jest poprawnym JSON-em' }, 400)
  }

  const parsed = campaignCreateSchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Nieprawidłowe dane kampanii', details: parsed.error.flatten() }, 400)
  }

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')

  const now = new Date()
  const campaign = em.create(VoiceCampaign, {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    agentId: parsed.data.agentId,
    phoneNumberId: parsed.data.phoneNumberId ?? null,
    minIntervalSecs: parsed.data.minIntervalSecs,
    status: 'draft',
    tenantId: auth.tenantId ?? null,
    organizationId: auth.orgId,
    createdAt: now,
    updatedAt: now,
  })
  em.persist(campaign)
  await em.flush()
  logger.info('campaign created', { id: campaign.id })

  return json({ id: campaign.id }, 201)
}

// Fabryka zachowuje strażników mutacji i rejestr audytu również dla edycji.
const campaignUpdates = makeCrudRoute({
  metadata,
  orm: { entity: VoiceCampaign, tenantField: 'tenantId', orgField: 'organizationId', softDeleteField: 'deletedAt' },
  actions: {
    update: {
      commandId: 'voicebot.campaigns.update',
      schema: campaignUpdateSchema,
      response: ({ result }) => ({ id: result.id, updatedAt: result.updatedAt }),
    },
  },
})

export async function PUT(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.tenantId || !auth.orgId) return json({ error: 'Brak kontekstu organizacji' }, 403)
  return campaignUpdates.PUT(request)
}

const campaignResponseSchema = campaignCreateSchema.extend({
  id: z.string().uuid(), status: z.string(), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
})

export const openApi = createCrudOpenApiFactory({ defaultTag: 'Voicebot' })({
  resourceName: 'Campaign',
  querySchema: campaignListSchema,
  listResponseSchema: z.object({ items: z.array(campaignResponseSchema), total: z.number(), page: z.number().optional(), pageSize: z.number().optional() }),
  create: { schema: campaignCreateSchema, responseSchema: z.object({ id: z.string().uuid() }) },
  update: { schema: campaignUpdateSchema, responseSchema: z.object({ id: z.string().uuid(), updatedAt: z.string().datetime() }) },
})
