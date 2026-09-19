import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { VoiceCall, VoiceCampaign } from '../../data/entities'
import { callListSchema, callStartSchema } from '../../data/validators'
import { enqueueCall } from '../../lib/call-queue'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'

const logger = createLogger('voicebot')

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['voicebot.calls.view'] },
  POST: { requireAuth: true, requireFeatures: ['voicebot.calls.start'] },
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.orgId || !auth.tenantId) return json({ items: [], total: 0 })

  const url = new URL(request.url)
  const parsed = callListSchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return json({ error: 'Nieprawidłowe parametry zapytania' }, 400)
  const { campaignId, status, page, pageSize, sortField, sortDir } = parsed.data

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')

  const where: Record<string, unknown> = {
    tenantId: auth.tenantId,
    organizationId: auth.orgId,
    deletedAt: null,
  }
  if (campaignId) where.campaignId = campaignId
  if (status) where.status = status

  const orderField = sortField === 'created_at' ? 'createdAt' : sortField
  const [rows, total] = await em.findAndCount(VoiceCall, where, {
    orderBy: { [orderField]: sortDir },
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })

  return json({
    items: rows.map((r) => ({
      id: r.id,
      campaignId: r.campaignId,
      leadRef: r.leadRef ?? null,
      phone: r.phone,
      firstName: r.firstName ?? null,
      lastName: r.lastName ?? null,
      status: r.status,
      direction: r.direction,
      relatedCallId: r.relatedCallId ?? null,
      conversationId: r.conversationId ?? null,
      durationSecs: r.durationSecs ?? null,
      costUsd: r.costUsd ?? null,
      crmRecordRef: r.crmRecordRef ?? null,
      crmError: r.crmError ?? null,
      identityConfirmed: r.identityConfirmed ?? null,
      consentGiven: r.consentGiven ?? null,
      productCode: r.productCode ?? null,
      amount: r.amount ?? null,
      currency: r.currency ?? null,
      contractYear: r.contractYear ?? null,
      bank: r.bank ?? null,
      requestsContact: r.requestsContact ?? null,
      preferredContactTime: r.preferredContactTime ?? null,
      summary: r.summary ?? null,
      collected: r.collected ?? null,
      failureReason: r.failureReason ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  })
}

export async function POST(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.orgId || !auth.tenantId) return json({ error: 'Brak kontekstu organizacji' }, 403)

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json({ error: 'Treść żądania nie jest poprawnym JSON-em' }, 400)
  }

  const parsed = callStartSchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Nieprawidłowe dane połączenia', details: parsed.error.flatten() }, 400)
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

  const now = new Date()
  const call = em.create(VoiceCall, {
    campaignId: campaign.id,
    leadRef: parsed.data.leadRef ?? null,
    phone: parsed.data.phone,
    firstName: parsed.data.firstName ?? null,
    lastName: parsed.data.lastName ?? null,
    status: 'pending',
    direction: 'outbound',
    isTest: false,
    tenantId: auth.tenantId,
    organizationId: auth.orgId,
    createdAt: now,
    updatedAt: now,
  })
  em.persist(call)
  await em.flush()

  // Pojedyncze zlecenie przechodzi ta sama kolejke co import. Inaczej sto
  // rownoleglych POST-ow nadal obchodziloby limit ustawiony w kampanii.
  let queuePending = false
  try {
    await enqueueCall({
      type: 'voicebot.call.dispatch', callId: call.id, campaignId: campaign.id,
      tenantId: auth.tenantId, organizationId: auth.orgId,
    })
  } catch {
    // Rekord juz istnieje; zwrot 500 zachecalby klienta do utworzenia drugiego.
    queuePending = true
    logger.warn('call queue publication incomplete', { callId: call.id })
  }
  logger.info('call queued', { id: call.id })
  return json({ id: call.id, status: 'pending', conversationId: null, simulated: false,
    queuePending }, 201)
}

export const openApi: OpenApiRouteDoc = {
  methods: {
    GET: { summary: 'List voice calls', query: callListSchema, responses: [{ status: 200 }] },
    POST: {
      summary: 'Queue an outbound call',
      description: 'Returns pending. Provider results arrive asynchronously on the call record.',
      requestBody: { schema: callStartSchema },
      responses: [{ status: 201, description: 'Call saved; queuePending indicates publication needs recovery.' }],
    },
  },
}
