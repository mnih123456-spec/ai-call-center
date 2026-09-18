import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromCookies } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { VoiceCrmConnection } from '../../data/entities'
import { crmConnectionSchema } from '../../data/validators'
import { BitrixCrm } from '../../lib/crm-bitrix'

const logger = createLogger('voicebot')

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['voicebot.campaigns.view'] },
  POST: { requireAuth: true, requireFeatures: ['voicebot.campaigns.manage'] },
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

  const polaczenie = await em.findOne(VoiceCrmConnection, {
    tenantId: auth.tenantId,
    organizationId: auth.orgId,
    deletedAt: null,
  })

  if (!polaczenie) return json({ configured: false })

  return json({
    configured: true,
    provider: polaczenie.provider,
    active: polaczenie.active,
    adresSkrocony: skrocAdres(polaczenie.webhookUrl),
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

  // Adres sprawdzamy, zanim go zapiszemy. Zapisany, ale niedziałający adres
  // byłby gorszy od jego braku: system wyglądałby na skonfigurowany, a wyniki
  // rozmów po cichu nie trafiałyby do CRM klienta.
  const zlacze = new BitrixCrm(parsed.data.webhookUrl)
  const sprawdzenie = await zlacze.sprawdzPolaczenie()
  if (!sprawdzenie.ok) {
    return json({ error: 'Nie udało się połączyć z CRM', szczegoly: sprawdzenie.opis }, 400)
  }

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')

  const teraz = new Date()
  let polaczenie = await em.findOne(VoiceCrmConnection, {
    tenantId: auth.tenantId,
    organizationId: auth.orgId,
    provider: parsed.data.provider,
    deletedAt: null,
  })

  if (polaczenie) {
    polaczenie.webhookUrl = parsed.data.webhookUrl
    polaczenie.active = parsed.data.active
    polaczenie.checkedAt = teraz
    polaczenie.checkResult = sprawdzenie.opis
    polaczenie.updatedAt = teraz
  } else {
    polaczenie = em.create(VoiceCrmConnection, {
      provider: parsed.data.provider,
      webhookUrl: parsed.data.webhookUrl,
      active: parsed.data.active,
      checkedAt: teraz,
      checkResult: sprawdzenie.opis,
      tenantId: auth.tenantId ?? null,
      organizationId: auth.orgId,
      createdAt: teraz,
      updatedAt: teraz,
    })
  }

  em.persist(polaczenie)
  await em.flush()
  logger.info('crm connection saved', { provider: polaczenie.provider })

  return json({
    ok: true,
    provider: polaczenie.provider,
    active: polaczenie.active,
    adresSkrocony: skrocAdres(polaczenie.webhookUrl),
    checkResult: sprawdzenie.opis,
  })
}
