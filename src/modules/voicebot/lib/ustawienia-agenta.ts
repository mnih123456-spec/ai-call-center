import { createLogger } from '@open-mercato/shared/lib/logger'

const logger = createLogger('voicebot')

const API = 'https://api.elevenlabs.io/v1/convai'

/**
 * Modele, które udostępniamy w panelu.
 *
 * Dostawca przyjmuje ich kilkadziesiąt, ale w rozmowie telefonicznej liczy się
 * jedno: czas do pierwszego słowa. Cięższy model dokłada sekundy ciszy, w
 * których rozmówca myśli, że połączenie padło. Dlatego lista jest krótka
 * i uszeregowana od najszybszych.
 *
 * Zmierzone na tym koncie: `gemini-2.5-flash-lite` odpowiada w 0,6 s,
 * `gemini-2.5-flash` w 5,7 s. To nie jest różnica smaku.
 */
export const MODELE = [
  { id: 'gemini-2.5-flash-lite', nazwa: 'Gemini 2.5 Flash Lite (najszybszy)' },
  { id: 'gemini-2.0-flash-lite', nazwa: 'Gemini 2.0 Flash Lite' },
  { id: 'gemini-2.5-flash', nazwa: 'Gemini 2.5 Flash (odradzany: czyta na głos swoje myśli po angielsku)' },
  { id: 'gemini-2.0-flash', nazwa: 'Gemini 2.0 Flash' },
  { id: 'gpt-4o-mini', nazwa: 'GPT-4o mini' },
  { id: 'gpt-4.1-nano', nazwa: 'GPT-4.1 nano' },
  { id: 'gpt-4.1-mini', nazwa: 'GPT-4.1 mini (zalecany)' },
  { id: 'claude-haiku-4-5', nazwa: 'Claude Haiku 4.5' },
  { id: 'claude-3-5-sonnet', nazwa: 'Claude 3.5 Sonnet' },
]

/** Ile sekund ciszy kończy wypowiedź rozmówcy. */
export const CISZA_MIN = 0.5
export const CISZA_MAX = 10

export type UstawieniaAgenta = { llm: string | null; cisza: number | null }

/**
 * Sprawdza, co wolno wysłać do dostawcy.
 *
 * Nieznany model odrzucamy, zamiast przepuszczać: dostawca i tak odpowie
 * błędem, tyle że klient zobaczy wtedy komunikat po angielsku i bez wskazówki.
 */
export function sprawdzUstawienia(
  wejscie: { llm?: string | null; cisza?: number | null },
): { ok: true; dane: UstawieniaAgenta } | { ok: false; blad: string } {
  const llm = wejscie.llm?.trim() || null
  if (llm && !MODELE.some((m) => m.id === llm)) {
    return { ok: false, blad: 'Nieznany model rozmowy.' }
  }

  const cisza = wejscie.cisza ?? null
  if (cisza !== null) {
    if (!Number.isFinite(cisza)) return { ok: false, blad: 'Czas ciszy musi być liczbą.' }
    if (cisza < CISZA_MIN || cisza > CISZA_MAX) {
      return { ok: false, blad: `Czas ciszy musi mieścić się między ${CISZA_MIN} a ${CISZA_MAX} sekundy.` }
    }
  }

  return { ok: true, dane: { llm, cisza } }
}

/** Odczyt ustawień rozmowy z konta dostawcy. */
export async function pobierzUstawienia(agentId: string): Promise<UstawieniaAgenta | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(`${API}/agents/${agentId}`, {
      headers: { 'xi-api-key': apiKey },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const dane = (await res.json()) as {
      conversation_config?: { agent?: { prompt?: { llm?: string } }; turn?: { turn_timeout?: number } }
    }
    return {
      llm: dane.conversation_config?.agent?.prompt?.llm ?? null,
      cisza: dane.conversation_config?.turn?.turn_timeout ?? null,
    }
  } catch {
    return null
  }
}

export type WynikZapisu = { ok: true } | { ok: false; blad: string }

/**
 * Zapis ustawień rozmowy u dostawcy.
 *
 * Wysyłamy wyłącznie te dwie gałęzie konfiguracji, żeby nie ruszyć scenariusza,
 * głosu ani niczego, czego klient nie zmieniał na ekranie.
 */
export async function zapiszUstawienia(
  agentId: string,
  ustawienia: UstawieniaAgenta,
): Promise<WynikZapisu> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return { ok: false, blad: 'Brak klucza dostawcy głosu.' }

  const config: Record<string, unknown> = {}
  if (ustawienia.llm) config.agent = { prompt: { llm: ustawienia.llm } }
  if (ustawienia.cisza !== null) config.turn = { turn_timeout: ustawienia.cisza }
  if (Object.keys(config).length === 0) return { ok: true }

  try {
    const res = await fetch(`${API}/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ conversation_config: config }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      const tekst = await res.text().catch(() => '')
      return { ok: false, blad: `Dostawca odrzucił ustawienia, status ${res.status}. ${tekst.slice(0, 160)}` }
    }
    logger.info('agent runtime settings saved', { agentId, llm: ustawienia.llm, cisza: ustawienia.cisza })
    return { ok: true }
  } catch {
    return { ok: false, blad: 'Nie udało się połączyć z dostawcą głosu.' }
  }
}

/**
 * Przekazuje dostawcy listę pól, które bot ma zebrać w rozmowie.
 *
 * Bez tego pytania klienta żyją wyłącznie w treści scenariusza: bot je zada,
 * ale odpowiedzi nie wrócą jako dane, tylko utoną w transkrypcji. Dopiero to
 * sprawia, że dopisanie pytania daje kolumnę w tabeli wyników.
 */
export async function wyslijPolaDoAgenta(
  agentId: string,
  dataCollection: Record<string, unknown>,
  slowaKluczowe: string[] = [],
): Promise<WynikZapisu> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return { ok: false, blad: 'Brak klucza dostawcy głosu.' }

  try {
    // Slowa kluczowe dla rozpoznawania mowy ida razem z polami, bo oba
    // wynikaja z branzy i oba trzeba odswiezyc, gdy klient ja zmieni.
    const res = await fetch(`${API}/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        platform_settings: { data_collection: dataCollection },
        conversation_config: { asr: { keywords: slowaKluczowe }, turn: { retranscribe_on_turn_timeout: true } },
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      const tekst = await res.text().catch(() => '')
      return { ok: false, blad: `Dostawca odrzucił listę pól, status ${res.status}. ${tekst.slice(0, 160)}` }
    }
    logger.info('agent data collection saved', { agentId, pol: Object.keys(dataCollection).length })
    return { ok: true }
  } catch {
    return { ok: false, blad: 'Nie udało się połączyć z dostawcą głosu.' }
  }
}
