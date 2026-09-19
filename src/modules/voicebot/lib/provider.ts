import { createLogger } from '@open-mercato/shared/lib/logger'
import { toE164 } from './phone'
import { ocenNumer } from './dozwolone-numery'

const logger = createLogger('voicebot')

export type StartCallInput = {
  agentId: string
  phoneNumberId: string | null
  toNumber: string
  variables: Record<string, string>
}

export type StartCallResult =
  | { ok: true; conversationId: string | null; simulated: boolean }
  | { ok: false; error: string }

const API_BASE = 'https://api.elevenlabs.io/v1/convai'

/**
 * Zleca połączenie wychodzące u dostawcy głosu.
 *
 * Bez klucza w środowisku zwraca wynik symulowany zamiast błędu. Dzięki temu
 * cały przepływ, panel i webhook dają się przejść i pokazać bez wykonywania
 * prawdziwego połączenia i bez ponoszenia jego kosztu.
 */
export async function startOutboundCall(input: StartCallInput): Promise<StartCallResult> {
  // Sprawdzenie zakresu numeru stoi tutaj, a nie w trasie API, bo tędy
  // przechodzi każde połączenie wychodzące: z panelu, z importu listy,
  // z kolejki i z API klienta. Umieszczone wyżej dałoby się obejść nową
  // ścieżką, o której ktoś zapomni.
  const ocena = ocenNumer(input.toNumber)
  if (!ocena.ok) {
    logger.warn('call blocked by number policy')
    return { ok: false, error: ocena.powod }
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    logger.warn('provider key missing, simulating call')
    return { ok: true, conversationId: `sim_${crypto.randomUUID()}`, simulated: true }
  }

  const transport = process.env.VOICEBOT_TRANSPORT === 'twilio' ? 'twilio' : 'sip-trunk'
  const body: Record<string, unknown> = {
    agent_id: input.agentId,
    to_number: input.toNumber,
    call_recording_enabled: true,
    conversation_initiation_client_data: { dynamic_variables: input.variables },
  }
  if (input.phoneNumberId) body.agent_phone_number_id = input.phoneNumberId

  try {
    const res = await fetch(`${API_BASE}/${transport}/outbound-call`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      logger.warn('provider rejected call', { status: res.status })
      return { ok: false, error: `Dostawca odrzucił zlecenie, status ${res.status}. ${text.slice(0, 200)}` }
    }
    const payload = (await res.json().catch(() => null)) as { conversation_id?: string } | null
    return { ok: true, conversationId: payload?.conversation_id ?? null, simulated: false }
  } catch {
    logger.warn('provider call failed')
    return { ok: false, error: 'Nie udało się połączyć z dostawcą głosu.' }
  }
}

export type ProviderAgent = { agentId: string; name: string }
export type ProviderNumber = { phoneNumberId: string; phoneNumber: string; provider: string }
export type ProviderCatalog = {
  configured: boolean
  agents: ProviderAgent[]
  numbers: ProviderNumber[]
  error?: string
}

async function providerGet<T>(path: string, apiKey: string): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'xi-api-key': apiKey },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) return null
  return (await res.json().catch(() => null)) as T | null
}

/**
 * Pobiera z dostawcy listę agentów i numerów, żeby panel mógł je podać
 * do wyboru zamiast kazać przepisywać identyfikatory z cudzej konsoli.
 *
 * Numery bywają zapisane raz z plusem, raz bez. Normalizujemy je do E.164,
 * bo inaczej ta sama linia wygląda w panelu jak dwie różne.
 */
export async function fetchProviderCatalog(): Promise<ProviderCatalog> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return { configured: false, agents: [], numbers: [] }

  try {
    const [agentsRaw, numbersRaw] = await Promise.all([
      providerGet<{ agents?: Array<{ agent_id?: string; name?: string }> }>('/agents', apiKey),
      providerGet<Array<{ phone_number_id?: string; phone_number?: string; provider?: string }>>('/phone-numbers', apiKey),
    ])

    if (!agentsRaw && !numbersRaw) {
      return { configured: true, agents: [], numbers: [], error: 'Dostawca odrzucił klucz albo nie odpowiedział.' }
    }

    const agents: ProviderAgent[] = (agentsRaw?.agents ?? [])
      .filter((a): a is { agent_id: string; name?: string } => typeof a?.agent_id === 'string')
      .map((a) => ({ agentId: a.agent_id, name: a.name?.trim() || a.agent_id }))

    const numbers: ProviderNumber[] = (Array.isArray(numbersRaw) ? numbersRaw : [])
      .filter((n): n is { phone_number_id: string; phone_number?: string; provider?: string } => typeof n?.phone_number_id === 'string')
      .map((n) => ({
        phoneNumberId: n.phone_number_id,
        phoneNumber: toE164(n.phone_number) ?? '',
        provider: n.provider ?? '',
      }))

    return { configured: true, agents, numbers }
  } catch {
    logger.warn('provider catalog failed')
    return { configured: true, agents: [], numbers: [], error: 'Nie udało się połączyć z dostawcą głosu.' }
  }
}
