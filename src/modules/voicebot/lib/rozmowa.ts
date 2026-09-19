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
