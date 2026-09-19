import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals'
import type { EntityManager } from '@mikro-orm/postgresql'
import { VoiceCall, VoiceCampaign } from '../../data/entities'
import { dispatchCall } from '../dispatch-call'
import { publishPendingCalls, type CallJob } from '../call-queue'
import { startOutboundCall, type StartCallInput, type StartCallResult } from '../provider'

jest.mock('@mikro-orm/core', () => ({ LockMode: { PESSIMISTIC_WRITE: 'write' } }))
jest.mock('../../data/entities', () => ({ VoiceCall: class VoiceCall {}, VoiceCampaign: class VoiceCampaign {} }))
jest.mock('../provider', () => ({ startOutboundCall: jest.fn() }))
jest.mock('@open-mercato/shared/lib/logger', () => ({
  createLogger: () => ({ child: () => ({ info: jest.fn(), warn: jest.fn() }) }),
}))

const scheduled: Array<{ payload: CallJob; at: number }> = []
let publishFails = false
jest.mock('@open-mercato/queue', () => ({
  createModuleQueue: () => ({
    enqueue: async (payload: CallJob, options?: { delayMs?: number }) => {
      if (publishFails) throw new Error('queue unavailable')
      scheduled.push({ payload, at: Date.now() + (options?.delayMs ?? 0) })
      return 'job'
    },
  }),
}))

const tenantId = '10000000-0000-4000-8000-000000000001'
const organizationId = '20000000-0000-4000-8000-000000000001'
const campaignId = '30000000-0000-4000-8000-000000000001'
const scope = { tenantId, organizationId }
const epoch = Date.parse('2026-09-18T12:00:00Z')
const provider = jest.mocked(startOutboundCall)
const jobFor = (call: VoiceCall): CallJob => ({
  type: 'voicebot.call.dispatch', tenantId: call.tenantId!, organizationId: call.organizationId!,
  campaignId: call.campaignId!, callId: call.id,
})

function fixture(count = 5) {
  const campaigns: VoiceCampaign[] = [{
    ...scope, id: campaignId, name: 'Test', status: 'running', minIntervalSecs: 10,
    agentId: 'agent', phoneNumberId: 'number', createdAt: new Date(epoch), updatedAt: new Date(epoch),
  }]
  const calls: VoiceCall[] = Array.from({ length: count }, (_, i) => ({
    ...scope, campaignId, id: `40000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    phone: '+48500100200', status: 'pending', direction: 'outbound', isTest: false,
    createdAt: new Date(epoch + i), updatedAt: new Date(epoch),
  }))
  let transaction = Promise.resolve()
  const committed = new Set<string>()
  let failFlush = false
  const locks: unknown[] = []
  const matches = (row: object, where: Record<string, unknown>) => Object.entries(where).every(([key, value]) => {
    const actual = (row as Record<string, unknown>)[key] ?? null
    if (value && typeof value === 'object' && '$ne' in value) return actual !== value.$ne
    if (value && typeof value === 'object' && '$gt' in value) return String(actual) > String(value.$gt)
    return actual === value
  })
  const find = (entity: unknown, where: Record<string, unknown>, options?: {
    orderBy?: Record<string, string>; limit?: number;
  }) => {
    const rows = (entity === VoiceCampaign ? campaigns : calls).filter((row) => matches(row, where))
    for (const [key, direction] of Object.entries(options?.orderBy ?? {}).reverse()) {
      rows.sort((a, b) => {
        const left = (a as unknown as Record<string, string | Date>)[key]
        const right = (b as unknown as Record<string, string | Date>)[key]
        return (left < right ? -1 : left > right ? 1 : 0) * (direction === 'asc' ? 1 : -1)
      })
    }
    return rows.slice(0, options?.limit ?? rows.length)
  }
  const fake = {
    find: async (entity: unknown, where: Record<string, unknown>, options?: Parameters<typeof find>[2]) => find(entity, where, options),
    findOne: async (entity: unknown, where: Record<string, unknown>, options?: Parameters<typeof find>[2] & { lockMode?: unknown }) => {
      if (entity === VoiceCampaign) locks.push(options?.lockMode)
      return find(entity, where, options)[0] ?? null
    },
    flush: async () => { if (failFlush) throw new Error('rollback') },
    nativeUpdate: async (entity: unknown, where: Record<string, unknown>, values: object) => {
      const rows = find(entity, where)
      rows.forEach((row) => Object.assign(row, values))
      return rows.length
    },
    transactional: async <T>(callback: (tx: EntityManager) => Promise<T>) => {
      const previous = transaction
      let release!: () => void
      transaction = new Promise<void>((resolve) => { release = resolve })
      await previous
      const before = calls.map((call) => ({ ...call }))
      try {
        const result = await callback(fake as unknown as EntityManager)
        calls.filter((call) => call.status === 'dialing').forEach((call) => committed.add(call.id))
        return result
      }
      catch (error) { calls.splice(0, calls.length, ...before); throw error }
      finally { release() }
    },
  }
  provider.mockImplementation(async (input) => {
    expect(committed.has(input.variables.lead_id)).toBe(true)
    return { ok: true, conversationId: `conversation-${provider.mock.calls.length}`, simulated: true }
  })
  return { em: fake as unknown as EntityManager, calls, campaigns, locks, failFlush: () => { failFlush = true } }
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(epoch)
  jest.clearAllMocks()
  scheduled.length = 0
  publishFails = false
})
afterEach(() => { jest.useRealTimers() })

describe('kolejka polaczen', () => {
  it('uruchamia piec pending pojedynczo w 0, 10, 20, 30 i 40 sekundzie', async () => {
    const f = fixture()
    const starts: number[] = []
    provider.mockImplementation(async () => {
      starts.push(Date.now() - epoch)
      return { ok: true, conversationId: `conversation-${starts.length}`, simulated: true }
    })
    expect(await publishPendingCalls(f.em, scope, campaignId)).toEqual({ published: 5, queuePending: false })
    for (let n = 0; scheduled.length && n < 500; n++) {
      scheduled.sort((a, b) => a.at - b.at)
      const next = scheduled.shift()!
      jest.setSystemTime(next.at)
      await dispatchCall(f.em, next.payload)
    }
    expect(starts).toEqual([0, 10_000, 20_000, 30_000, 40_000])
    expect(scheduled).toHaveLength(0)
    expect(f.calls.every((call) => call.status === 'dialing')).toBe(true)
    expect(f.locks.every((mode) => mode === 'write')).toBe(true)
  })

  it('duplikat zadania i restart nie ponawiaja wyslanego telefonu', async () => {
    const f = fixture(1)
    await Promise.all([dispatchCall(f.em, jobFor(f.calls[0])), dispatchCall(f.em, jobFor(f.calls[0]))])
    await dispatchCall(f.em, jobFor(f.calls[0]))
    expect(provider).toHaveBeenCalledTimes(1)
  })

  it('nie uruchamia nastepnego telefonu podczas wolnego zlecenia, nawet przy zerowym odstepie', async () => {
    const f = fixture(2)
    f.campaigns[0].minIntervalSecs = 0
    let complete!: (result: StartCallResult) => void
    let entered!: () => void
    const started = new Promise<void>((resolve) => { entered = resolve })
    provider.mockImplementation(async (_input: StartCallInput) => {
      entered()
      return new Promise<StartCallResult>((resolve) => { complete = resolve })
    })
    const first = dispatchCall(f.em, jobFor(f.calls[0]))
    await started
    jest.setSystemTime(epoch + 20_000)
    await dispatchCall(f.em, jobFor(f.calls[1]))
    expect(provider).toHaveBeenCalledTimes(1)
    expect(f.calls[1].status).toBe('pending')
    complete({ ok: true, conversationId: 'conversation', simulated: true })
    await first
    provider.mockResolvedValue({ ok: true, conversationId: 'second', simulated: true })
    await dispatchCall(f.em, jobFor(f.calls[1]))
    expect(provider).toHaveBeenCalledTimes(2)
  }, 1000)

  it.each(['paused', 'finished', 'unknown'])('nie dzwoni przy stanie kampanii %s', async (status) => {
    const f = fixture(1)
    f.campaigns[0].status = status
    await dispatchCall(f.em, jobFor(f.calls[0]))
    expect(provider).not.toHaveBeenCalled()
    expect(f.calls[0].status).toBe('pending')
  })

  it('wznawia pauze i czyta aktualne ustawienia kampanii', async () => {
    const f = fixture(1)
    f.campaigns[0].status = 'paused'
    await dispatchCall(f.em, jobFor(f.calls[0]))
    f.campaigns[0].status = 'running'
    f.campaigns[0].agentId = 'new-agent'
    f.campaigns[0].phoneNumberId = 'new-number'
    await dispatchCall(f.em, scheduled.shift()!.payload)
    expect(provider).toHaveBeenCalledWith(expect.objectContaining({ agentId: 'new-agent', phoneNumberId: 'new-number' }))
  })

  it('nie ufa obcemu tenantowi ani organizacji', async () => {
    const f = fixture(1)
    const other = '90000000-0000-4000-8000-000000000001'
    await dispatchCall(f.em, { ...jobFor(f.calls[0]), tenantId: other })
    await dispatchCall(f.em, { ...jobFor(f.calls[0]), organizationId: other })
    await expect(dispatchCall(f.em, { ...jobFor(f.calls[0]), tenantId: '' })).rejects.toThrow()
    expect(provider).not.toHaveBeenCalled()
  })

  it('odstep jednej kampanii nie blokuje drugiej', async () => {
    const f = fixture(2)
    const otherCampaign = '30000000-0000-4000-8000-000000000002'
    f.campaigns.push({ ...f.campaigns[0], id: otherCampaign })
    f.calls[1].campaignId = otherCampaign
    await dispatchCall(f.em, jobFor(f.calls[0]))
    await dispatchCall(f.em, jobFor(f.calls[1]))
    expect(provider).toHaveBeenCalledTimes(2)
    expect(scheduled).toHaveLength(0)
  })

  it('ponowne dostarczenie zadania nie dzwoni do usunietego polaczenia', async () => {
    const f = fixture(1)
    f.calls[0].deletedAt = new Date()
    await dispatchCall(f.em, jobFor(f.calls[0]))
    expect(provider).not.toHaveBeenCalled()
  })

  it('blad zapisu cofa rezerwacje i nie wywoluje dostawcy', async () => {
    const f = fixture(1)
    f.failFlush()
    await expect(dispatchCall(f.em, jobFor(f.calls[0]))).rejects.toThrow('rollback')
    expect(provider).not.toHaveBeenCalled()
    expect(f.calls[0].status).toBe('pending')
  })

  it('odrzucenie przez dostawce nie ponawia telefonu ani nie pomija odstepu', async () => {
    const f = fixture(2)
    provider.mockResolvedValueOnce({ ok: false, error: 'rejected' })
    await dispatchCall(f.em, jobFor(f.calls[0]))
    await dispatchCall(f.em, jobFor(f.calls[0]))
    await dispatchCall(f.em, jobFor(f.calls[1]))
    expect(provider).toHaveBeenCalledTimes(1)
    expect(f.calls[0].status).toBe('failed')
    expect(scheduled[0].at).toBe(epoch + 10_000)
  })

  it('nie nadpisuje wyniku webhooka, ktory przyszedl przed odpowiedzia HTTP', async () => {
    const f = fixture(1)
    provider.mockImplementation(async () => {
      Object.assign(f.calls[0], { status: 'completed', conversationId: 'webhook', summary: 'wynik' })
      return { ok: false, error: 'timeout' }
    })
    await dispatchCall(f.em, jobFor(f.calls[0]))
    expect(f.calls[0]).toMatchObject({ status: 'completed', conversationId: 'webhook', summary: 'wynik' })
  })

  it('awaria publikacji zachowuje pending do bezpiecznego ponowienia', async () => {
    const f = fixture(1)
    publishFails = true
    expect(await publishPendingCalls(f.em, scope, campaignId)).toEqual({ published: 0, queuePending: true })
    expect(f.calls[0].status).toBe('pending')
    publishFails = false
    expect(await publishPendingCalls(f.em, scope, campaignId)).toEqual({ published: 1, queuePending: false })
  })

  it('nie przejmuje zlecenia o nieznanym wyniku po smierci procesu', async () => {
    const f = fixture(2)
    Object.assign(f.calls[0], { status: 'dialing', startedAt: new Date(epoch), conversationId: null })
    jest.setSystemTime(epoch + 3600_000)
    await dispatchCall(f.em, jobFor(f.calls[0]))
    await dispatchCall(f.em, jobFor(f.calls[1]))
    expect(provider).not.toHaveBeenCalled()
  })

  it('zlecenie bez potwierdzenia nie blokuje kampanii na zawsze', async () => {
    const f = fixture(2)
    // Rozmowa wisi w stanie dialing, bo webhook nigdy nie doszedl. Tak wyglada
    // niewpiety tunel: bez tego kampania stanelaby po pierwszym telefonie.
    Object.assign(f.calls[0], { status: 'dialing', startedAt: new Date(epoch), conversationId: null })
    jest.setSystemTime(epoch + 3600_000)

    await dispatchCall(f.em, jobFor(f.calls[1]))
    expect(f.calls[0].status).toBe('failed')
    expect(f.calls[0].failureReason).toContain('przekroczeniu czasu')
    expect(provider).not.toHaveBeenCalled()

    // Zamkniecie przeterminowanego zlecenia przesuwa zegar odstepu, wiec
    // nastepny telefon idzie po jednym odstepie, a nie natychmiast.
    jest.setSystemTime(epoch + 3600_000 + 10_000)
    await dispatchCall(f.em, jobFor(f.calls[1]))
    expect(provider).toHaveBeenCalledTimes(1)
    expect(f.calls[1].status).toBe('dialing')
  })

  it('swieze zlecenie bez potwierdzenia dalej wstrzymuje kampanie', async () => {
    const f = fixture(2)
    Object.assign(f.calls[0], { status: 'dialing', startedAt: new Date(epoch), conversationId: null })
    // Minuta to normalny czas trwania rozmowy, a nie awaria.
    jest.setSystemTime(epoch + 60_000)
    await dispatchCall(f.em, jobFor(f.calls[1]))
    expect(f.calls[0].status).toBe('dialing')
    expect(provider).not.toHaveBeenCalled()
  })
})
