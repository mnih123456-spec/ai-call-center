import { createLogger } from '@open-mercato/shared/lib/logger'

const logger = createLogger('voicebot')

const API = 'https://api.elevenlabs.io/v1'

export type Glos = {
  voiceId: string
  nazwa: string
  /** premade: głos z katalogu dostawcy. cloned: nagrany przez klienta. */
  rodzaj: string
  jezyk: string | null
  probkaUrl: string | null
}

export type WynikKlonowania =
  | { ok: true; voiceId: string }
  | { ok: false; blad: string }

function klucz(): string | null {
  return process.env.ELEVENLABS_API_KEY ?? null
}

/**
 * Głosy dostępne na koncie: katalogowe i sklonowane.
 *
 * Pobieramy je zamiast wpisywać na sztywno, bo katalog dostawcy się zmienia,
 * a głosy sklonowane przez klientów dochodzą w trakcie pracy.
 */
export async function pobierzGlosy(): Promise<Glos[]> {
  const k = klucz()
  if (!k) return []

  try {
    const res = await fetch(`${API}/voices`, {
      headers: { 'xi-api-key': k },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return []
    const tresc = (await res.json()) as {
      voices?: Array<{
        voice_id?: string
        name?: string
        category?: string
        preview_url?: string
        labels?: Record<string, string>
      }>
    }

    return (tresc.voices ?? [])
      .filter((g): g is { voice_id: string } & typeof g => typeof g?.voice_id === 'string')
      .map((g) => ({
        voiceId: g.voice_id,
        nazwa: g.name?.trim() || g.voice_id,
        rodzaj: g.category ?? 'premade',
        jezyk: g.labels?.language ?? null,
        probkaUrl: g.preview_url ?? null,
      }))
  } catch {
    logger.warn('voices list failed')
    return []
  }
}

/**
 * Klonowanie głosu z nagranej próbki.
 *
 * Używamy klonowania natychmiastowego, bo działa z kilku minut nagrania
 * i jest gotowe od razu. Klonowanie profesjonalne daje lepszy efekt, ale
 * wymaga około pół godziny materiału, trenuje się godzinami, a plan pozwala
 * na jeden taki głos, więc nie nadaje się do obsługi wielu firm.
 *
 * Nazwę głosu poprzedzamy identyfikatorem tenanta, bo wszystkie głosy leżą
 * na jednym koncie u dostawcy. Bez tego dwie firmy nagrywające "Recepcja"
 * dostałyby dwa nierozróżnialne wpisy na liście.
 */
export async function sklonujGlos(params: {
  nazwa: string
  tenantId: string
  pliki: File[]
  opis?: string | null
}): Promise<WynikKlonowania> {
  const k = klucz()
  if (!k) return { ok: false, blad: 'Brak klucza dostawcy głosu.' }
  if (params.pliki.length === 0) return { ok: false, blad: 'Nie przesłano nagrania.' }

  const formularz = new FormData()
  formularz.append('name', `${params.tenantId.slice(0, 8)} ${params.nazwa}`.trim())
  if (params.opis) formularz.append('description', params.opis)
  for (const plik of params.pliki) formularz.append('files', plik, plik.name)

  try {
    const res = await fetch(`${API}/voices/add`, {
      method: 'POST',
      headers: { 'xi-api-key': k },
      body: formularz,
      signal: AbortSignal.timeout(120000),
    })

    if (!res.ok) {
      const tekst = await res.text().catch(() => '')
      logger.warn('voice clone rejected', { status: res.status })
      return { ok: false, blad: `Dostawca odrzucił nagranie, status ${res.status}. ${tekst.slice(0, 200)}` }
    }

    const tresc = (await res.json()) as { voice_id?: string }
    if (!tresc?.voice_id) return { ok: false, blad: 'Dostawca nie zwrócił identyfikatora głosu.' }

    logger.info('voice cloned', { voiceId: tresc.voice_id })
    return { ok: true, voiceId: tresc.voice_id }
  } catch {
    logger.warn('voice clone failed')
    return { ok: false, blad: 'Nie udało się przesłać nagrania do dostawcy.' }
  }
}

/**
 * Ustawia głos agenta.
 *
 * Głos jest cechą agenta u dostawcy, nie naszej kampanii, więc zmiana musi
 * pójść do niego. Wysyłamy wyłącznie tę jedną gałąź konfiguracji, żeby nie
 * nadpisać promptu ani ustawień rozmowy, które klient ma dopracowane.
 */
export async function ustawGlosAgenta(agentId: string, voiceId: string): Promise<{ ok: boolean; blad?: string }> {
  const k = klucz()
  if (!k) return { ok: false, blad: 'Brak klucza dostawcy głosu.' }

  try {
    const res = await fetch(`${API}/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'xi-api-key': k, 'content-type': 'application/json' },
      body: JSON.stringify({ conversation_config: { tts: { voice_id: voiceId } } }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      const tekst = await res.text().catch(() => '')
      return { ok: false, blad: `Dostawca odrzucił zmianę głosu, status ${res.status}. ${tekst.slice(0, 200)}` }
    }
    logger.info('agent voice set', { agentId, voiceId })
    return { ok: true }
  } catch {
    return { ok: false, blad: 'Nie udało się zmienić głosu agenta.' }
  }
}
