import crypto from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { EntityManager } from '@mikro-orm/postgresql'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { VoiceCall, VoiceCampaign } from '../../../data/entities'
import { POST } from '../route'

jest.mock('../../../data/entities', () => ({
  VoiceCall: class VoiceCall {}, VoiceCampaign: class VoiceCampaign {}, VoiceCrmConnection: class VoiceCrmConnection {},
}))
jest.mock('@open-mercato/shared/lib/di/container', () => ({ createRequestContainer: jest.fn() }))
jest.mock('@open-mercato/shared/lib/encryption/find', () => ({ findOneWithDecryption: jest.fn() }))
jest.mock('@open-mercato/shared/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn() }),
}))
jest.mock('../../../lib/crm-bitrix', () => ({ BitrixCrm: jest.fn() }))
jest.mock('../../../lib/crm-mercato', () => ({ MercatoCrm: jest.fn() }))

const epoch = Date.parse('2026-09-18T12:00:00Z')
const secret = 'sekret-wylacznie-do-testow'
const scope = {
  tenantId: '10000000-0000-4000-8000-000000000001',
  organizationId: '20000000-0000-4000-8000-000000000001',
}
const campaignId = '30000000-0000-4000-8000-000000000001'
let poprzedniSekret: string | undefined

function zdarzenie(phoneNumberId = 'number') {
  return JSON.stringify({
    type: 'post_call_transcription',
    data: {
      conversation_id: 'conversation-inbound',
      metadata: {
        call_duration_secs: 45,
        phone_call: { direction: 'inbound', external_number: '+48500100200', phone_number_id: phoneNumberId },
      },
      analysis: { transcript_summary: 'Klient prosi o kontakt.' },
    },
  })
}

function podpis(body: string, timestamp = epoch / 1000, signingSecret = secret) {
  const digest = crypto.createHmac('sha256', signingSecret).update(`${timestamp}.${body}`).digest('hex')
  return `t=${timestamp},v0=${digest}`
}

function zadanie(body = zdarzenie(), header: string | null = podpis(body)) {
  return new Request('http://localhost/api/voicebot/webhook', {
    method: 'POST', body,
    headers: header === null ? {} : { 'elevenlabs-signature': header },
  })
}

function fixture(initialCalls: VoiceCall[] = []) {
  const calls = [...initialCalls]
  const campaigns: VoiceCampaign[] = [{
    ...scope, id: campaignId, name: 'Test', agentId: 'agent', phoneNumberId: 'number',
    status: 'running', minIntervalSecs: 10, createdAt: new Date(epoch), updatedAt: new Date(epoch),
  }]
  // Mock filtruje rzeczywiste warunki zapytań, żeby nie wskazywać oddzwonienia wyłącznie kolejnością wywołań.
  const dopasuj = (entity: unknown, where: Record<string, unknown>, options?: { orderBy?: Record<string, string> }) => {
      const rows = (entity === VoiceCampaign ? campaigns : calls).filter((row) =>
        Object.entries(where).every(([key, value]) => {
          const actual = (row as unknown as Record<string, unknown>)[key] ?? null
          if (value && typeof value === 'object') {
            if ('$gte' in value) return actual instanceof Date && actual >= (value.$gte as Date)
            if ('$ne' in value) return actual !== value.$ne
          }
          return actual === value
        }),
      )
      if (options?.orderBy?.createdAt) {
        const sign = options.orderBy.createdAt === 'desc' ? -1 : 1
        rows.sort((a, b) => sign * (a.createdAt.getTime() - b.createdAt.getTime()))
      }
      return rows
  }
  const fake = {
    findOne: jest.fn(async (entity: unknown, where: Record<string, unknown>, options?: { orderBy?: Record<string, string> }) =>
      dopasuj(entity, where, options)[0] ?? null),
    // Webhook czyta wszystkie kampanie numeru, zeby wykryc, ze nalezy on do
    // dwoch firm naraz. Wtedy nie da sie ustalic, czyja jest rozmowa.
    find: jest.fn(async (entity: unknown, where: Record<string, unknown>, options?: { orderBy?: Record<string, string> }) =>
      dopasuj(entity, where, options)),
    create: jest.fn((_entity: unknown, data: Partial<VoiceCall>) => ({
      ...data, id: '40000000-0000-4000-8000-000000000099',
    } as VoiceCall)),
    persist: jest.fn((call: VoiceCall) => { if (!calls.includes(call)) calls.push(call) }),
    flush: jest.fn(async () => {}),
  }
  jest.mocked(createRequestContainer).mockResolvedValue({
    resolve: (name: string) => {
      if (name !== 'em') throw new Error(`Nieoczekiwana zależność: ${name}`)
      return fake as unknown as EntityManager
    },
  } as unknown as Awaited<ReturnType<typeof createRequestContainer>>)
  // Brak skonfigurowanego CRM izoluje zapis webhooka od usług zewnętrznych.
  jest.mocked(findOneWithDecryption).mockResolvedValue(null)
  return { calls, fake }
}

function poprzedniePolaczenie(): VoiceCall {
  return {
    ...scope, id: '40000000-0000-4000-8000-000000000001', campaignId,
    phone: '+48500100200', direction: 'outbound', status: 'failed', isTest: false,
    conversationId: 'conversation-outbound', summary: 'Nie odebrał.',
    createdAt: new Date(epoch - 60_000), updatedAt: new Date(epoch - 60_000),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  jest.setSystemTime(epoch)
  poprzedniSekret = process.env.VOICEBOT_WEBHOOK_SECRET
  process.env.VOICEBOT_WEBHOOK_SECRET = secret
})
afterEach(() => {
  jest.useRealTimers()
  if (poprzedniSekret === undefined) delete process.env.VOICEBOT_WEBHOOK_SECRET
  else process.env.VOICEBOT_WEBHOOK_SECRET = poprzedniSekret
})

describe('podpis webhooka', () => {
  // Prawdziwy HMAC sprawdza także format dostawcy i odczyt sekretu ze środowiska.
  it('przyjmuje poprawny podpis', async () => {
    const f = fixture()
    const response = await POST(zadanie())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ accepted: true, status: 'completed' })
    expect(f.calls).toHaveLength(1)
  })

  // Odrzucenie musi nastąpić przed dostępem do bazy, aby fałszywe i odtworzone zdarzenia nie miały skutków.
  it.each(['podrobiony', 'starszy niż pół godziny', 'brak nagłówka'])('odrzuca podpis: %s', async (wariant) => {
    const f = fixture()
    const body = zdarzenie()
    const header = wariant === 'brak nagłówka' ? null
      : wariant === 'podrobiony' ? podpis(body, epoch / 1000, 'inny-sekret')
        : podpis(body, epoch / 1000 - 1801)
    const response = await POST(zadanie(body, header))
    expect(response.status).toBe(401)
    expect(jest.mocked(createRequestContainer)).not.toHaveBeenCalled()
    expect(f.fake.persist).not.toHaveBeenCalled()
    expect(f.fake.flush).not.toHaveBeenCalled()
    expect(f.calls).toHaveLength(0)
  })
})

describe('zapis rozmów z webhooka', () => {
  // Nowy rozmówca dziedziczy właściciela numeru, ale nie staje się automatycznie leadem kampanii.
  it('tworzy rozmowę od nieznanego numeru bez kampanii', async () => {
    const f = fixture()
    const response = await POST(zadanie())
    expect(response.status).toBe(200)
    expect(f.calls).toHaveLength(1)
    expect(f.calls[0]).toMatchObject({
      ...scope, campaignId: null, relatedCallId: null, direction: 'inbound',
      phone: '+48500100200', status: 'completed', conversationId: 'conversation-inbound',
      summary: 'Klient prosi o kontakt.', durationSecs: 45,
    })
    expect(f.fake.create).toHaveBeenCalledTimes(1)
    expect(f.fake.flush).toHaveBeenCalled()
  })

  // Oddzwonienie musi zachować historię nieudanej próby, zamiast zastępować ją nowym wynikiem.
  it('wiąże oddzwonienie przez relatedCallId i nie nadpisuje poprzedniego wiersza', async () => {
    const old = poprzedniePolaczenie()
    const before = structuredClone(old)
    const f = fixture([old])
    const response = await POST(zadanie())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ accepted: true, relatedCallId: old.id })
    expect(f.calls).toHaveLength(2)
    expect(old).toEqual(before)
    expect(f.calls[1]).toMatchObject({ relatedCallId: old.id, campaignId, direction: 'inbound', status: 'completed' })
    expect(f.calls[1].id).not.toBe(old.id)
    expect(f.fake.persist.mock.calls.every(([call]) => call !== old)).toBe(true)
  })

  // Ponowienie dostawcy nie może nadpisać wyniku ani ponownie uruchomić integracji CRM.
  it('zwraca duplicate dla zakończonej rozmowy i niczego nie zmienia', async () => {
    const completed = { ...poprzedniePolaczenie(), status: 'completed', conversationId: 'conversation-inbound' }
    const before = structuredClone(completed)
    const f = fixture([completed])
    const response = await POST(zadanie())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ accepted: true, duplicate: true })
    expect(f.calls).toEqual([before])
    expect(f.fake.create).not.toHaveBeenCalled()
    expect(f.fake.persist).not.toHaveBeenCalled()
    expect(f.fake.flush).not.toHaveBeenCalled()
    expect(findOneWithDecryption).not.toHaveBeenCalled()
  })

  // Bez właściciela numeru odbierającego nie można bezpiecznie przypisać nowej rozmowy do tenanta.
  it('odrzuca numer odbierający nieprzypisany do żadnej kampanii', async () => {
    const f = fixture()
    const response = await POST(zadanie(zdarzenie('unknown-number')))
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ accepted: false, reason: 'Numer nie jest przypisany do żadnej kampanii' })
    expect(f.calls).toHaveLength(0)
    expect(f.fake.create).not.toHaveBeenCalled()
    expect(f.fake.persist).not.toHaveBeenCalled()
    expect(f.fake.flush).not.toHaveBeenCalled()
    expect(findOneWithDecryption).not.toHaveBeenCalled()
  })
})
