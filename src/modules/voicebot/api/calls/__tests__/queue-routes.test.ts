import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { POST as startCall } from '../route'
import { POST as importCalls } from '../import/route'
import { POST as republish } from '../dispatch/route'

const tenantId = '10000000-0000-4000-8000-000000000001'
const orgId = '20000000-0000-4000-8000-000000000001'
const campaignId = '30000000-0000-4000-8000-000000000001'
let auth: { tenantId?: string; orgId?: string } | null = { tenantId, orgId }
const findOne = jest.fn(async (_entity: unknown, _where: unknown) => ({ id: campaignId }))
const find = jest.fn(async () => [])
const create = jest.fn((_entity: unknown, data: object) => ({ id: 'call-id', ...data }))
const flush = jest.fn(async () => {})
const persist = jest.fn()
const em = { findOne, find, create, flush, persist }
const publish = jest.fn(async (_em: unknown, _scope: unknown, _campaignId: unknown) => ({ published: 1, queuePending: false }))
const enqueue = jest.fn(async (_payload: unknown) => {})
jest.mock('@open-mercato/shared/lib/auth/server', () => ({ getAuthFromRequest: async () => auth }))
jest.mock('@open-mercato/shared/lib/di/container', () => ({ createRequestContainer: async () => ({ resolve: () => em }) }))
jest.mock('@open-mercato/shared/lib/logger', () => ({ createLogger: () => ({ info: jest.fn(), warn: jest.fn() }) }))
jest.mock('@open-mercato/shared/lib/i18n/server', () => ({ resolveTranslations: async () => ({ translate: (_key: string, fallback: string) => fallback }) }))
jest.mock('../../../data/entities', () => ({ VoiceCall: class {}, VoiceCampaign: class {} }))
jest.mock('../../../lib/call-queue', () => ({
  publishPendingCalls: (...args: Parameters<typeof publish>) => publish(...args),
  enqueueCall: (payload: unknown) => enqueue(payload),
}))

const request = (body: object) => new Request('http://localhost/api/voicebot/calls', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
})

beforeEach(() => { jest.clearAllMocks(); auth = { tenantId, orgId } })

describe('wejscia kolejki', () => {
  it('pojedyncze API zapisuje pending i publikuje dopiero po flush', async () => {
    const response = await startCall(request({ campaignId, phone: '+48500100200', tenantId: 'obcy', organizationId: 'obca' }))
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ status: 'pending', conversationId: null })
    expect(create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'pending', tenantId, organizationId: orgId }))
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ tenantId, organizationId: orgId, campaignId, callId: 'call-id' }))
    expect(flush.mock.invocationCallOrder[0]).toBeLessThan(enqueue.mock.invocationCallOrder[0])
  })

  it('import publikuje piec zapisanych pending w zakresie sesji', async () => {
    const response = await importCalls(request({ campaignId, tekst: [1, 2, 3, 4, 5].map((n) => `+4850010020${n},Jan,Kowalski`).join('\n') }))
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ dodane: 5, queuePending: false })
    expect(create).toHaveBeenCalledTimes(5)
    expect(findOne).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tenantId, organizationId: orgId }))
    expect(publish).toHaveBeenCalledWith(em, { tenantId, organizationId: orgId }, campaignId)
    expect(flush.mock.invocationCallOrder[0]).toBeLessThan(publish.mock.invocationCallOrder[0])
  })

  it.each([null, { orgId }, { tenantId }])('brak pelnego zakresu odrzuca wszystkie wejscia przed baza', async (value) => {
    auth = value
    for (const handler of [startCall, importCalls, republish]) {
      expect((await handler(request({ campaignId, phone: '+48500100200', tekst: '+48500100200' }))).status).toBe(403)
    }
    expect(findOne).not.toHaveBeenCalled()
    expect(publish).not.toHaveBeenCalled()
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('odzyskiwanie pending nie tworzy nowych rekordow', async () => {
    const response = await republish(request({ campaignId, tenantId: 'obcy' }))
    expect(response.status).toBe(200)
    expect(create).not.toHaveBeenCalled()
    expect(publish).toHaveBeenCalledWith(em, { tenantId, organizationId: orgId }, campaignId)
  })
})
