import { LockMode } from '@mikro-orm/core'
import type { EntityManager } from '@mikro-orm/postgresql'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { VoiceCall, VoiceCampaign } from '../data/entities'
import { callJobSchema, enqueueCall, type CallJob } from './call-queue'
import { startOutboundCall, type StartCallInput } from './provider'

const logger = createLogger('voicebot').child({ component: 'dispatch-call' })
type Claim = { kind: 'skip' } | { kind: 'wait'; delayMs: number } | { kind: 'start'; input: StartCallInput }

export async function dispatchCall(em: EntityManager, raw: CallJob): Promise<void> {
  const job = callJobSchema.parse(raw)
  const scope = { tenantId: job.tenantId, organizationId: job.organizationId }
  const campaignScope = { ...scope, campaignId: job.campaignId, direction: 'outbound' }
  const claim = await em.transactional<Claim>(async (tx) => {
    // Blokada w bazie, a nie zmienna w procesie: chroni rowniez przed dwoma
    // workerami uruchomionymi na roznych maszynach. Telefon idzie po commit.
    const campaign = await tx.findOne(VoiceCampaign, {
      ...scope, id: job.campaignId, deletedAt: null,
    }, { lockMode: LockMode.PESSIMISTIC_WRITE })
    if (!campaign || campaign.status === 'finished') return { kind: 'skip' }
    const call = await tx.findOne(VoiceCall, {
      ...campaignScope, id: job.callId, status: 'pending', deletedAt: null,
    })
    if (!call) return { kind: 'skip' }
    if (campaign.status === 'paused') return { kind: 'wait', delayMs: 30_000 }
    if (!['draft', 'running'].includes(campaign.status)) return { kind: 'skip' }

    // Brak potwierdzenia dostawcy moze oznaczac przerwany proces po wyslaniu
    // telefonu. Nie przejmujemy takiego zlecenia automatycznie: nie mamy
    // gwarancji idempotencji u dostawcy, wiec groziloby to drugim kosztem.
    const inFlight = await tx.findOne(VoiceCall, {
      ...campaignScope, status: 'dialing', conversationId: null, finishedAt: null,
    })
    if (inFlight) return { kind: 'wait', delayMs: 30_000 }

    const first = await tx.findOne(VoiceCall, {
      ...campaignScope, status: 'pending', deletedAt: null,
    }, { orderBy: { createdAt: 'asc', id: 'asc' } })
    if (first?.id !== call.id) return { kind: 'wait', delayMs: 1_000 }

    const last = await tx.findOne(VoiceCall, {
      ...campaignScope, startedAt: { $ne: null },
    }, { orderBy: { startedAt: 'desc', id: 'desc' } })
    const now = new Date()
    // Liczymy konserwatywnie od potwierdzenia zlecenia (updatedAt), nie tylko
    // od rezerwacji. Wolny dostawca nie skroci rzeczywistego odstepu.
    const previous = last ? Math.max(last.startedAt!.getTime(), last.updatedAt.getTime()) : 0
    const interval = campaign.minIntervalSecs
    if (!Number.isFinite(interval) || interval < 0) throw new Error('[internal] Invalid campaign interval')
    const delayMs = previous + interval * 1000 - now.getTime()
    if (last && delayMs > 0) return { kind: 'wait', delayMs }

    call.status = 'dialing'
    call.startedAt = now
    call.updatedAt = now
    await tx.flush()
    return {
      kind: 'start',
      input: {
        agentId: campaign.agentId,
        phoneNumberId: campaign.phoneNumberId ?? null,
        toNumber: call.phone,
        variables: { lead_id: call.id, imie: call.firstName ?? '', nazwisko: call.lastName ?? '' },
      },
    }
  })

  if (claim.kind === 'skip') return
  if (claim.kind === 'wait') {
    // To opoznione zadanie frameworka, nie timer ani petla utrzymujaca proces.
    await enqueueCall(job, claim.delayMs)
    return
  }

  const result = await startOutboundCall(claim.input)
  const finished = new Date()
  // Webhook mogl juz zapisac wynik. Warunek stanu chroni go przed nadpisaniem
  // opozniona odpowiedzia HTTP dostawcy; aktualizujemy tylko pola zlecenia.
  await em.nativeUpdate(VoiceCall, {
    ...campaignScope, id: job.callId, status: 'dialing', conversationId: null,
  }, result.ok ? {
    conversationId: result.conversationId,
    updatedAt: finished,
  } : {
    status: 'failed', failureReason: result.error, finishedAt: finished, updatedAt: finished,
  })
  logger.info('call dispatch finished', { callId: job.callId, ok: result.ok })
}
