import { createLogger } from '@open-mercato/shared/lib/logger'

const logger = createLogger('voicebot')

const API = 'https://api.elevenlabs.io/v1/convai'

export type Wypowiedz = {
  /** agent albo user. */
  kto: string
  tekst: string
  sekunda: number | null
}

export type Nagranie = { dane: ArrayBuffer; typ: string }

function klucz(): string | null {
  return process.env.ELEVENLABS_API_KEY ?? null
}

/**
 * Transkrypcja rozmowy u dostawcy.
 *
 * Pokazujemy ją obok pól wyciągniętych z rozmowy, a nie zamiast nich.
 * Pola są tym, na czym pracuje handlowiec, a transkrypcja służy do
 * sprawdzenia, skąd się wzięły, gdy coś wygląda nietypowo.
 */
export async function pobierzTranskrypcje(conversationId: string): Promise<Wypowiedz[]> {
  const k = klucz()
  if (!k) return []

  try {
    const res = await fetch(`${API}/conversations/${conversationId}`, {
      headers: { 'xi-api-key': k },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return []

    const tresc = (await res.json()) as {
      transcript?: Array<{ role?: string; message?: string | null; time_in_call_secs?: number }>
    }

    return (tresc.transcript ?? [])
      .filter((w) => typeof w?.message === 'string' && w.message.trim().length > 0)
      .map((w) => ({
        kto: w.role === 'user' ? 'user' : 'agent',
        tekst: (w.message as string).trim(),
        sekunda: typeof w.time_in_call_secs === 'number' ? w.time_in_call_secs : null,
      }))
  } catch {
    logger.warn('transcript fetch failed')
    return []
  }
}

/**
 * Nagranie rozmowy.
 *
 * Zwracamy surowe bajty, bo trasa API poda je dalej przeglądarce. Klucz
 * dostawcy nie może opuścić serwera: jest wspólny dla wszystkich firm.
 */
export async function pobierzNagranie(conversationId: string): Promise<Nagranie | null> {
  const k = klucz()
  if (!k) return null

  try {
    const res = await fetch(`${API}/conversations/${conversationId}/audio`, {
      headers: { 'xi-api-key': k },
      signal: AbortSignal.timeout(60000),
    })
    if (!res.ok) return null

    return {
      dane: await res.arrayBuffer(),
      typ: res.headers.get('content-type') ?? 'audio/mpeg',
    }
  } catch {
    logger.warn('recording fetch failed')
    return null
  }
}

export type StanRozmowy = { status: string; blad: string | null }

/**
 * Stan rozmowy u dostawcy.
 *
 * Potrzebny tylko wtedy, gdy wynik nie wrócił webhookiem. Tak jest przy
 * połączeniach, które nie doszły do skutku: numer zajęty, nikt nie odebrał,
 * operator odrzucił. Dostawca nie wysyła wtedy webhooka, więc bez tego
 * odczytu wiersz zostawał na zawsze jako "dialing".
 */
export async function pobierzStanRozmowy(conversationId: string): Promise<StanRozmowy | null> {
  const k = klucz()
  if (!k) return null
  try {
    const res = await fetch(`${API}/conversations/${conversationId}`, {
      headers: { 'xi-api-key': k },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const tresc = (await res.json()) as {
      status?: string
      metadata?: { error?: { reason?: string; code?: number } | null; termination_reason?: string }
    }
    const powod = tresc.metadata?.error?.reason ?? tresc.metadata?.termination_reason ?? null
    return { status: tresc.status ?? 'unknown', blad: powod ? String(powod).slice(0, 200) : null }
  } catch {
    logger.warn('conversation status fetch failed')
    return null
  }
}

/**
 * Status wiersza na podstawie powodu niepowodzenia od dostawcy.
 *
 * Kody SIP: 486 i 600 to zajęty, 480, 487 i 408 to nikt nie odebrał.
 * Wszystko inne to błąd łącza albo operatora i idzie jako nieudane.
 */
export function statusZBledu(blad: string | null | undefined): 'busy' | 'no_answer' | 'failed' {
  const t = (blad ?? '').toLowerCase()
  if (/\b(486|600)\b|busy/.test(t)) return 'busy'
  if (/\b(480|487|408)\b|no answer|temporarily unavailable|request timeout|no-answer/.test(t)) return 'no_answer'
  return 'failed'
}
