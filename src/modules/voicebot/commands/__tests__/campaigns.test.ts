import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { CommandRuntimeContext } from '@open-mercato/shared/lib/commands'
import { updateCampaignCommand } from '../campaigns'
import { campaignUpdateSchema } from '../../data/validators'

jest.mock('@open-mercato/shared/lib/commands', () => ({ registerCommand: jest.fn() }))
jest.mock('../../data/entities', () => ({ VoiceCampaign: class VoiceCampaign {} }))
jest.mock('@mikro-orm/core', () => ({ LockMode: { PESSIMISTIC_WRITE: 'write' } }))

const id = '12345678-1234-4234-8234-123456789012'
const updatedAt = '2026-09-18T10:00:00.000Z'
const makeRow = () => ({
  id, name: 'Kampania', description: 'Opis', agentId: 'old-agent', phoneNumberId: 'old-number',
  status: 'draft', minIntervalSecs: 25, updatedAt: new Date(updatedAt),
  tenantId: 'tenant-a', organizationId: 'org-a', deletedAt: null,
})
let row = makeRow()
const findOne = jest.fn(async (_entity: unknown, where: Record<string, unknown>, _options: unknown) => (
  where.id === row.id && where.tenantId === row.tenantId && where.organizationId === row.organizationId && row.deletedAt === null ? row : null
))
const nativeUpdate = jest.fn(async (_entity: unknown, _where: unknown, changes: object) => { Object.assign(row, changes); return 1 })
const tx = { findOne, nativeUpdate }
const em = { fork: () => em, transactional: async (callback: (manager: typeof tx) => Promise<unknown>) => callback(tx) }
const resolve = jest.fn(() => em)
const context = (tenantId: string | null = 'tenant-a', orgId: string | null = 'org-a') => ({
  auth: { tenantId, orgId, sub: 'user-a' }, container: { resolve },
}) as unknown as CommandRuntimeContext

beforeEach(() => { row = makeRow(); jest.clearAllMocks() })

describe('edycja kampanii', () => {
  it('zapisuje nowy numer i agenta, zachowując pozostałe ustawienia', async () => {
    const result = await updateCampaignCommand.execute({ id, updatedAt, phoneNumberId: 'new-number', agentId: 'new-agent' }, context())
    expect(row).toMatchObject({ phoneNumberId: 'new-number', agentId: 'new-agent', minIntervalSecs: 25, description: 'Opis' })
    expect(result.updatedAt).not.toBe(updatedAt)
    expect(findOne).toHaveBeenCalledWith(expect.anything(), { id, tenantId: 'tenant-a', organizationId: 'org-a', deletedAt: null }, { lockMode: 'write' })
    expect(nativeUpdate).toHaveBeenCalledTimes(1)
  })

  it.each(['draft', 'running', 'paused', 'finished'])('pozwala wybrać status %s bez resetowania odstępu', async (status) => {
    await updateCampaignCommand.execute({ id, updatedAt, status }, context())
    expect(row.status).toBe(status)
    expect(row.minIntervalSecs).toBe(25)
  })

  it('pozwala wyczyścić pola opcjonalne', async () => {
    await updateCampaignCommand.execute({ id, updatedAt, phoneNumberId: null, description: null }, context())
    expect(row.phoneNumberId).toBeNull()
    expect(row.description).toBeNull()
  })

  it('nie ufa zakresowi z treści', async () => {
    await updateCampaignCommand.execute({ id, updatedAt, tenantId: 'tenant-b', organizationId: 'org-b', status: 'paused' }, context())
    expect(row.tenantId).toBe('tenant-a')
    expect(row.organizationId).toBe('org-a')
  })

  it.each([['tenant-b', 'org-a'], ['tenant-a', 'org-b']])('nie edytuje obcego zakresu %s/%s', async (tenantId, orgId) => {
    await expect(updateCampaignCommand.execute({ id, updatedAt, status: 'running' }, context(tenantId, orgId))).rejects.toMatchObject({ status: 404 })
    expect(nativeUpdate).not.toHaveBeenCalled()
  })

  it.each([[null, 'org-a'], ['tenant-a', null]])('odrzuca brak zakresu przed zapytaniem', async (tenantId, orgId) => {
    await expect(updateCampaignCommand.execute({ id, updatedAt }, context(tenantId, orgId))).rejects.toMatchObject({ status: 403 })
    expect(resolve).not.toHaveBeenCalled()
  })

  it('odrzuca drugi zapis ze starą wersją', async () => {
    await updateCampaignCommand.execute({ id, updatedAt, phoneNumberId: 'new-number' }, context())
    await expect(updateCampaignCommand.execute({ id, updatedAt, phoneNumberId: 'stale-number' }, context())).rejects.toMatchObject({ status: 409 })
    expect(row.phoneNumberId).toBe('new-number')
    expect(nativeUpdate).toHaveBeenCalledTimes(1)
  })

  it.each([{ status: 'invalid' }, { id: 'invalid' }, { updatedAt: undefined }, { minIntervalSecs: 1.5 }])('odrzuca niepoprawne dane %j', (override) => {
    expect(campaignUpdateSchema.safeParse({ id, updatedAt, ...override }).success).toBe(false)
  })
})
