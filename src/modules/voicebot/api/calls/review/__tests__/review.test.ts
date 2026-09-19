import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { GET, metadata } from '../route'
import { reviewFilter, reviewReasons } from '../rules'

const good = { status: 'completed', consentGiven: true, identityConfirmed: true, productCode: 'WIBOR', isTest: false }
let auth: { tenantId?: string; orgId?: string } | null
const findAndCount = jest.fn(async (_entity: unknown, _where: unknown, _options: unknown): Promise<[object[], number]> => [[], 0])
jest.mock('@open-mercato/shared/lib/auth/server', () => ({ getAuthFromRequest: async () => auth }))
jest.mock('@open-mercato/shared/lib/di/container', () => ({ createRequestContainer: async () => ({ resolve: () => ({ findAndCount }) }) }))
jest.mock('../../../../data/entities', () => ({ VoiceCall: class {} }))

beforeEach(() => {
  jest.clearAllMocks()
  auth = { tenantId: 'tenant-a', orgId: 'org-a' }
  findAndCount.mockResolvedValue([[], 0])
})

describe('kwalifikacja rozmów do sprawdzenia', () => {
  it.each([false, null, undefined])('brak zgody %s kwalifikuje zakończoną rozmowę', (consentGiven) => {
    expect(reviewReasons({ ...good, consentGiven })).toEqual(['consent_missing'])
  })
  it.each(['NIEUSTALONY', '', null, undefined])('brak produktu %s kwalifikuje zakończoną rozmowę', (productCode) => {
    expect(reviewReasons({ ...good, productCode })).toEqual(['product_unknown'])
  })
  it('tylko jawne false kwalifikuje niepotwierdzoną tożsamość', () => {
    expect(reviewReasons({ ...good, identityConfirmed: false })).toEqual(['identity_unconfirmed'])
    for (const identityConfirmed of [true, null, undefined]) expect(reviewReasons({ ...good, identityConfirmed })).toEqual([])
  })
  it.each(['pending', 'dialing', 'busy'])('braki wyników nie kwalifikują statusu %s', (status) => {
    expect(reviewReasons({ status, consentGiven: false, identityConfirmed: false })).toEqual([])
  })
  it.each([['failed', 'call_failed'], ['no_answer', 'no_answer']])('kwalifikuje status %s', (status, reason) => {
    expect(reviewReasons({ status })).toEqual([reason])
  })
  it.each(['pending', 'dialing', 'busy', 'completed'])('błąd CRM kwalifikuje niezależnie od statusu %s', (status) => {
    expect(reviewReasons({ ...good, status, crmError: 'awaria' })).toEqual(['crm_error'])
  })
  it.each(['', null, undefined])('pusty błąd CRM %s nie kwalifikuje', (crmError) => {
    expect(reviewReasons({ ...good, crmError })).toEqual([])
  })
  it('zwraca wszystkie przyczyny', () => {
    expect(reviewReasons({ status: 'completed', identityConfirmed: false, crmError: 'awaria' }))
      .toEqual(['consent_missing', 'identity_unconfirmed', 'product_unknown', 'crm_error'])
  })
  it.each(['completed', 'failed', 'no_answer'])('pomija testy także przy statusie %s i błędzie CRM', (status) => {
    expect(reviewReasons({ status, isTest: true, identityConfirmed: false, crmError: 'awaria' })).toEqual([])
  })
})

describe('GET review', () => {
  it('wymaga uprawnienia do podglądu', () => {
    expect(metadata.GET).toEqual({ requireAuth: true, requireFeatures: ['voicebot.calls.view'] })
  })
  it.each([null, {}, { tenantId: 'tenant-a' }, { orgId: 'org-a' }])('odrzuca niepełny zakres %s przed odczytem', async (value) => {
    auth = value
    expect((await GET(new Request('http://localhost/api/voicebot/calls/review'))).status).toBe(403)
    expect(findAndCount).not.toHaveBeenCalled()
  })
  it('stosuje zakres sesji i kwalifikację przed paginacją oraz ogranicza odpowiedź', async () => {
    findAndCount.mockResolvedValue([[{ ...good, id: 'call', phone: '+48500100200', status: 'failed', crmError: 'sekret', createdAt: new Date('2026-09-19T10:00:00Z') }], 51])
    const response = await GET(new Request('http://localhost/api/voicebot/calls/review?page=2&pageSize=25&tenantId=obcy&organizationId=obca'))
    expect(findAndCount).toHaveBeenCalledWith(expect.anything(), {
      ...reviewFilter(), tenantId: 'tenant-a', organizationId: 'org-a', deletedAt: null,
    }, { orderBy: { createdAt: 'desc', id: 'desc' }, limit: 25, offset: 25 })
    const body = await response.json()
    expect(body).toMatchObject({ total: 51, page: 2, pageSize: 25, items: [{ reasons: ['call_failed', 'crm_error'] }] })
    expect(body.items[0]).not.toHaveProperty('crmError')
  })
  it.each(['page=0', 'page=abc', 'pageSize=101', 'pageSize=1.5'])('odrzuca błędną paginację %s', async (query) => {
    expect((await GET(new Request(`http://localhost/api/voicebot/calls/review?${query}`))).status).toBe(400)
    expect(findAndCount).not.toHaveBeenCalled()
  })
  it('zwraca poprawną pustą listę', async () => {
    const response = await GET(new Request('http://localhost/api/voicebot/calls/review'))
    expect(await response.json()).toEqual({ items: [], total: 0, page: 1, pageSize: 25 })
  })
})
