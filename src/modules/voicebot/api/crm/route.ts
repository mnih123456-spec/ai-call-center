import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromCookies } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { VoiceCrmConnection } from '../../data/entities'
import { crmConnectionSchema } from '../../data/validators'
import { BitrixCrm } from '../../lib/crm-bitrix'

const logger = createLogger('voicebot')

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['voicebot.campaigns.view'] },
  POST: { requireAuth: true, requireFeatures: ['voicebot.campaigns.manage'] },
}

/**
 * Systemy, z którymi umiemy się połączyć.
 *
 * Lista jest po stronie serwera, a nie wpisana w ekran, bo dołożenie
 * kolejnego systemu ma być zmianą w jednym miejscu.
 */
const DOSTAWCY = [
  { id: 'mercato', nazwa: 'Wbudowany CRM Open Mercato' },
  { id: 'bitrix24', nazwa: 'Bitrix24' },
]

/** Czy ten dostawca wymaga adresu i danych dostępowych. */
function wymagaAdresu(provider: string): boolean {
  return provider !== 'mercato'
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/**
 * Skrócony adres do pokazania w panelu.
 *
 * Adres webhooka zawiera żeton dostępowy, więc jest hasłem i nie wraca do
 * przeglądarki w całości. Użytkownik musi jednak rozpoznać, czy wpisał ten
 * właściwy, dlatego zostawiamy nazwę portalu i cztery znaki żetonu.
 */
function skrocAdres(url: string): string {
  try {
    const u = new URL(url)
    const ogon = u.pathname.replace(/\/+$/, '').slice(-4)
    return `${u.host}/...${ogon}`
  } catch {
    return '(adres nieczytelny)'
  }
}

export async function GET() {
  const auth = await getAuthFromCookies()
  if (!auth?.orgId) return json({ configured: false })

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')

  // Adres jest szyfrowany w spoczynku, więc czytamy go pomocnikiem
  // odszyfrowującym. Zwykłe findOne oddałoby szyfrogram, a my wysłalibyśmy
  // go do Bitriksa i dostali błąd nie do wytłumaczenia.
  const polaczenie = await findOneWithDecryption(
    em,
    VoiceCrmConnection,
    { tenantId: auth.tenantId, organizationId: auth.orgId, active: true, deletedAt: null },
    undefined,
    { tenantId: auth.tenantId ?? null, organizationId: auth.orgId },
  )

  if (!polaczenie) return json({ configured: false, dostawcy: DOSTAWCY })

  // Listy pobieramy z systemu klienta, żeby nie kazać mu przepisywać
  // identyfikatorów. Gdy dostawca akurat nie odpowiada, oddajemy to, co
  // zapisane, zamiast wywracać cały ekran.
  let lejki: Array<{ id: string; nazwa: string }> = []
  let etapy: Array<{ id: string; nazwa: string }> = []
  let bladDostawcy: string | null = null

  if (wymagaAdresu(polaczenie.provider)) {
    try {
      const zlacze = new BitrixCrm(polaczenie.webhookUrl)
      lejki = await zlacze.pobierzLejki()
      const wybrany = polaczenie.pipelineId ?? lejki[0]?.id
      if (wybrany) etapy = await zlacze.pobierzEtapy(wybrany)
    } catch (e) {
      bladDostawcy = e instanceof Error ? e.message : 'Nie udało się pobrać list z CRM.'
    }
  }

  return json({
    configured: true,
    dostawcy: DOSTAWCY,
    provider: polaczenie.provider,
    active: polaczenie.active,
    adresSkrocony: polaczenie.webhookUrl ? skrocAdres(polaczenie.webhookUrl) : '',
    wymagaAdresu: wymagaAdresu(polaczenie.provider),
    pipelineId: polaczenie.pipelineId ?? null,
    stageId: polaczenie.stageId ?? null,
    lejki,
    etapy,
    bladDostawcy,
    checkedAt: polaczenie.checkedAt?.toISOString() ?? null,
    checkResult: polaczenie.checkResult ?? null,
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

  const parsed = crmConnectionSchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Nieprawidłowe dane połączenia', details: parsed.error.flatten() }, 400)
  }

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')

  const teraz = new Date()
  let polaczenie = await findOneWithDecryption(
    em,
    VoiceCrmConnection,
    {
      tenantId: auth.tenantId,
      organizationId: auth.orgId,
      provider: parsed.data.provider,
      deletedAt: null,
    },
    undefined,
    { tenantId: auth.tenantId ?? null, organizationId: auth.orgId },
  )

  // Wbudowany CRM nie ma adresu ani żetonu: piszemy do własnej bazy przez
  // komendy modułu customers. Pole adresu zostaje puste.
  let adres = ''
  let sprawdzenie = { ok: true, opis: 'Zapisujemy do wbudowanego CRM Open Mercato.' }

  if (wymagaAdresu(parsed.data.provider)) {
    const podany = parsed.data.webhookUrl ?? polaczenie?.webhookUrl
    if (!podany) {
      return json({ error: 'Podaj adres webhooka, bo żaden nie jest jeszcze zapisany' }, 400)
    }
    adres = podany

    // Adres sprawdzamy, zanim go zapiszemy. Zapisany, ale niedziałający adres
    // byłby gorszy od jego braku: system wyglądałby na skonfigurowany, a wyniki
    // rozmów po cichu nie trafiałyby do CRM klienta.
    sprawdzenie = await new BitrixCrm(adres).sprawdzPolaczenie()
    if (!sprawdzenie.ok) {
      return json({ error: 'Nie udało się połączyć z CRM', szczegoly: sprawdzenie.opis }, 400)
    }
  }

  if (polaczenie) {
    polaczenie.webhookUrl = adres
    polaczenie.pipelineId = parsed.data.pipelineId ?? null
    polaczenie.stageId = parsed.data.stageId ?? null
    polaczenie.active = parsed.data.active
    polaczenie.checkedAt = teraz
    polaczenie.checkResult = sprawdzenie.opis
    polaczenie.updatedAt = teraz
  } else {
    polaczenie = em.create(VoiceCrmConnection, {
      provider: parsed.data.provider,
      webhookUrl: adres,
      pipelineId: parsed.data.pipelineId ?? null,
      stageId: parsed.data.stageId ?? null,
      active: parsed.data.active,
      checkedAt: teraz,
      checkResult: sprawdzenie.opis,
      tenantId: auth.tenantId ?? null,
      organizationId: auth.orgId,
      createdAt: teraz,
      updatedAt: teraz,
    })
  }

  // Jeden tenant, jeden aktywny odbiorca wyników. Unikalność w bazie jest po
  // parze tenant i dostawca, więc bez tego dałoby się mieć dwa aktywne naraz,
  // a webhook wybierałby jeden z nich w sposób nieokreślony. Wyniki rozmów
  // trafiałyby raz tu, raz tam, i nikt by nie wiedział dlaczego.
  const pozostale = await em.find(VoiceCrmConnection, {
    tenantId: auth.tenantId,
    organizationId: auth.orgId,
    provider: { $ne: parsed.data.provider },
    active: true,
    deletedAt: null,
  })
  for (const inne of pozostale) {
    inne.active = false
    inne.updatedAt = teraz
    em.persist(inne)
  }

  em.persist(polaczenie)
  await em.flush()
  logger.info('crm connection saved', { provider: polaczenie.provider, wylaczone: pozostale.length })

  return json({
    ok: true,
    provider: polaczenie.provider,
    active: polaczenie.active,
    adresSkrocony: polaczenie.webhookUrl ? skrocAdres(polaczenie.webhookUrl) : '',
    checkResult: sprawdzenie.opis,
  })
}
