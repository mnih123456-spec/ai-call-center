import { createLogger } from '@open-mercato/shared/lib/logger'

const logger = createLogger('voicebot')

const API = 'https://api.elevenlabs.io/v1/convai'

/**
 * Znacznik sekcji zarządzanej przez nas.
 *
 * Pytania klienta doklejamy do promptu agenta, a nie zastępujemy nim całego
 * scenariusza. Powitanie, potwierdzenie tożsamości i pytanie o zgodę są stałe
 * i od nich zależy zgodność rozmowy z prawem. Klient ma dodawać, nie
 * przepisywać.
 *
 * Znacznik pozwala podmieniać tę sekcję w kółko: przy każdym zapisie
 * odcinamy wszystko od niego w dół i doklejamy nową treść. Bez niego kolejne
 * zapisy dopisywałyby pytania jedne pod drugimi, aż prompt spuchłby do
 * granicy modelu.
 */
export const ZNACZNIK_PYTAN = '=== PYTANIA OD KLIENTA (sekcja zarzadzana automatycznie, nie edytowac recznie) ==='

/**
 * Składa nowy prompt: stała część plus pytania klienta.
 *
 * Funkcja jest czysta, żeby dało się ją sprawdzić testem bez dotykania konta
 * u dostawcy. Zmiana promptu na produkcji jest nieodwracalna w tym sensie,
 * że nie ma tam historii wersji.
 */
export function zlozPrompt(obecny: string, pytania: string | null | undefined): string {
  const indeks = obecny.indexOf(ZNACZNIK_PYTAN)
  const staly = (indeks >= 0 ? obecny.slice(0, indeks) : obecny).trimEnd()

  const lista = (pytania ?? '')
    .split(/\r?\n/)
    .map((w) => w.trim())
    .filter(Boolean)

  if (lista.length === 0) return staly

  const punkty = lista.map((p) => `- ${p}`).join('\n')
  return `${staly}\n\n${ZNACZNIK_PYTAN}\n\nDodatkowo, o ile rozmowa na to pozwoli, ustal:\n\n${punkty}`
}

export type WynikSynchronizacji = { ok: true; dlugosc: number } | { ok: false; blad: string }

/**
 * Wysyła pytania klienta do agenta u dostawcy.
 *
 * Najpierw czytamy obecny prompt, bo doklejamy do niego, a nie zastępujemy.
 * Wysyłamy wyłącznie tę jedną gałąź konfiguracji, żeby nie ruszyć głosu ani
 * ustawień rozmowy.
 */
export async function wyslijPytaniaDoAgenta(
  agentId: string,
  pytania: string | null | undefined,
): Promise<WynikSynchronizacji> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return { ok: false, blad: 'Brak klucza dostawcy głosu.' }

  try {
    const odczyt = await fetch(`${API}/agents/${agentId}`, {
      headers: { 'xi-api-key': apiKey },
      signal: AbortSignal.timeout(20000),
    })
    if (!odczyt.ok) {
      return { ok: false, blad: `Nie udało się odczytać agenta, status ${odczyt.status}.` }
    }

    const dane = (await odczyt.json()) as {
      conversation_config?: { agent?: { prompt?: { prompt?: string } } }
    }
    const obecny = dane.conversation_config?.agent?.prompt?.prompt
    if (typeof obecny !== 'string') {
      return { ok: false, blad: 'Agent nie ma scenariusza, którego moglibyśmy uzupełnić.' }
    }

    const nowy = zlozPrompt(obecny, pytania)

    const zapis = await fetch(`${API}/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ conversation_config: { agent: { prompt: { prompt: nowy } } } }),
      signal: AbortSignal.timeout(20000),
    })
    if (!zapis.ok) {
      const tekst = await zapis.text().catch(() => '')
      return { ok: false, blad: `Dostawca odrzucił zmianę, status ${zapis.status}. ${tekst.slice(0, 200)}` }
    }

    logger.info('agent prompt synced', { agentId, dlugosc: nowy.length })
    return { ok: true, dlugosc: nowy.length }
  } catch {
    return { ok: false, blad: 'Nie udało się połączyć z dostawcą głosu.' }
  }
}
