import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromCookies } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { VoiceCampaign } from '../../data/entities'
import { campaignCreateSchema, campaignListSchema } from '../../data/validators'

const logger = createLogger('voicebot')

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['voicebot.campaigns.view'] },
  POST: { requireAuth: true, requireFeatures: ['voicebot.campaigns.manage'] },
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

export async function GET(request: Request) {
  const auth = await getAuthFromCookies()
  if (!auth?.orgId) return json({ items: [], total: 0 })

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
    })),
    total,
    page,
    pageSize,
  })
}

export async function POST(request: Request) {
  const auth = await getAuthFromCookies()
  if (!auth?.orgId) return json({ error: 'Brak kontekstu organizacji' }, 403)

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
