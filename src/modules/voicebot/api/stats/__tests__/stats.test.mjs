import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const directory = dirname(fileURLToPath(import.meta.url))

// Izolujemy bazę i sesję; test działa bez brakujących plików konfiguracyjnych Jesta.
function load(filename, mocks = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const localRequire = (name) => {
    if (name in mocks) return mocks[name]
    return name.startsWith('.') ? load(resolve(dirname(filename), `${name}.ts`), mocks) : require(name)
  }
  runInNewContext(code, { module, exports: module.exports, require: localRequire, Response, Date, Intl, URL })
  return module.exports
}

const { summarizeCalls } = load(resolve(directory, '../summary.ts'))
const now = new Date('2026-09-21T10:00:00Z')
const call = (overrides = {}) => ({ createdAt: now, direction: 'outbound', status: 'completed', costUsd: '0.100000', ...overrides })

test('zestaw demo daje 60% skuteczności i dwa oddzwonienia bez zapisu do bazy', () => {
  const source = readFileSync(resolve(directory, '../../../../../../scripts/dane-demo.mjs'), 'utf8')
  const fixture = source.match(/const LEADY = (\[[\s\S]*?\n\])/)
  assert.ok(fixture)
  // Odczytujemy wyłącznie tablicę danych; skrypt demo usuwa i wstawia rekordy.
  const leads = runInNewContext(`(${fixture[1]})`)
  const stats = summarizeCalls(leads.map((lead) => call({
    createdAt: new Date(now.getTime() - lead.godzin * 3600000),
    direction: lead.kierunek,
    status: lead.status,
    productCode: lead.produkt ?? null,
    costUsd: lead.kosztUsd ?? null,
    relatedCallId: lead.oddzwonienieDo == null ? null : String(lead.oddzwonienieDo),
  })), now)
  assert.equal(stats.total, 13)
  assert.equal(stats.outbound, 10)
  assert.equal(stats.successRate, 60)
  assert.equal(stats.callbacks, 2)
})

test('pusta historia nie powoduje dzielenia przez zero', () => {
  const stats = summarizeCalls([], now)
  assert.equal(stats.total, 0)
  assert.equal(stats.successRate, null)
  assert.equal(stats.todayPln, '0.00')
  assert.equal(stats.products.length, 0)
})

test('ponad 100 rekordów, właściwy mianownik i tylko powiązane przychodzące', () => {
  const stats = summarizeCalls([
    ...Array.from({ length: 101 }, () => call({ productCode: 'WIBOR' })),
    call({ status: 'no_answer', relatedCallId: 'other' }),
    call({ direction: 'inbound', relatedCallId: 'previous', productCode: 'SKD' }),
    call({ direction: 'inbound' }),
    call({ direction: 'inbound', relatedCallId: '' }),
  ], now)
  assert.equal(stats.total, 105)
  assert.equal(stats.outbound, 102)
  assert.equal(stats.completedOutbound, 101)
  assert.equal(stats.callbacks, 1)
  assert.equal(stats.successRate, 100 * 101 / 102)
  assert.equal(stats.todayPln, '38.85')
  assert.equal(stats.products.find((p) => p.code === 'WIBOR').count, 101)
  assert.equal(stats.products.find((p) => p.code === null).count, 3)
})

test('północ w Polsce, poniedziałek, początek miesiąca i przyszłe rekordy', () => {
  const stats = summarizeCalls([
    call({ createdAt: new Date('2026-09-20T21:59:59Z') }),
    call({ createdAt: new Date('2026-09-20T22:00:00Z') }),
    call({ createdAt: new Date('2026-08-31T21:59:59Z') }),
    call({ createdAt: new Date('2026-08-31T22:00:00Z') }),
    call({ createdAt: new Date('2026-09-22T00:00:00Z') }),
  ], now)
  assert.equal(stats.total, 4)
  assert.equal(stats.today, 1)
  assert.equal(stats.week, 1)
  assert.equal(stats.todayPln, '0.37')
  assert.equal(stats.monthPln, '1.11')
})

test('obie godziny podczas jesiennej zmiany czasu należą do tego samego dnia', () => {
  const stats = summarizeCalls([
    call({ createdAt: new Date('2026-10-25T00:30:00Z') }),
    call({ createdAt: new Date('2026-10-25T01:30:00Z') }),
  ], new Date('2026-10-25T12:00:00Z'))
  assert.equal(stats.today, 2)
})

test('brak pełnego zakresu zamyka dostęp; identyfikatory z URL są ignorowane', async () => {
  let auth = null
  let reads = 0
  const { GET, metadata } = load(resolve(directory, '../route.ts'), {
    '@open-mercato/shared/lib/auth/server': { getAuthFromRequest: async () => auth },
    '@open-mercato/shared/lib/di/container': { createRequestContainer: async () => ({ resolve: () => ({
      find: async (_entity, where, options) => {
        reads++
        assert.equal(where.tenantId, 'trusted-tenant')
        assert.equal(where.organizationId, 'trusted-org')
        assert.equal(where.deletedAt, null)
        assert.equal(options.fields.includes('phone'), false)
        return []
      },
    }) }) },
    '../../data/entities': { VoiceCall: class VoiceCall {} },
  })
  const request = new Request('http://localhost/api/voicebot/stats?tenantId=foreign&organizationId=foreign')
  for (const scope of [null, { tenantId: 'tenant' }, { orgId: 'org' }]) {
    auth = scope
    assert.equal((await GET(request)).status, scope ? 403 : 401)
  }
  assert.equal(reads, 0)
  auth = { tenantId: 'trusted-tenant', orgId: 'trusted-org' }
  const response = await GET(request)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal((await response.json()).total, 0)
  assert.equal(reads, 1)
  assert.equal(metadata.GET.requireFeatures[0], 'voicebot.calls.view')
})
