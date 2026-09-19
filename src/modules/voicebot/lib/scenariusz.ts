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
 * Znacznik drugiej sekcji zarządzanej: wiedzy wczytanej ze strony firmy.
 *
 * Osobny od pytań, bo obie sekcje zmieniają się niezależnie. Pytania klient
 * pisze ręcznie, wiedza bierze się z odczytu strony i bywa odświeżana sama.
 */
export const ZNACZNIK_WIEDZY = '=== WIEDZA O FIRMIE (sekcja zarzadzana automatycznie, nie edytowac recznie) ==='

/**
 * Znacznik trzeciej sekcji: słownika branżowego.
 *
 * Osobny od wiedzy ze strony, bo to dwa różne źródła. Tamtą pisze klient na
 * swojej stronie, tę piszemy my i za nią odpowiadamy.
 */
export const ZNACZNIK_BRANZY = '=== SLOWNIK BRANZOWY (sekcja zarzadzana automatycznie, nie edytowac recznie) ==='

const ZNACZNIKI = [ZNACZNIK_PYTAN, ZNACZNIK_WIEDZY, ZNACZNIK_BRANZY]

/**
 * Składa nowy prompt: stała część, słownik branżowy, pytania klienta
 * i wiedza o firmie.
 *
 * Funkcja jest czysta, żeby dało się ją sprawdzić testem bez dotykania konta
 * u dostawcy. Zmiana promptu na produkcji jest nieodwracalna w tym sensie,
 * że nie ma tam historii wersji.
 *
 * Cięcie idzie od pierwszego napotkanego znacznika, więc wszystkie trzy
 * sekcje są przepisywane od nowa przy każdym zapisie i nie narastają.
 */
export function zlozPrompt(
  obecny: string,
  pytania: string | null | undefined,
  wiedza?: string | null,
  branza?: string | null,
  stalyZastepczy?: string | null,
): string {
  const granice = ZNACZNIKI
    .map((z) => obecny.indexOf(z))
    .filter((i) => i >= 0)
  const ciecie = granice.length > 0 ? Math.min(...granice) : -1
  // Stala czesc zwykle zostaje, ale gdy branza ma gotowy scenariusz, przy
  // kazdym zapisie bierzemy jego aktualna wersje. Inaczej poprawka regul
  // dzialalaby tylko dla botow zakladanych od tej pory, a nie dla tych, ktore
  // klient juz ma i wlasnie poprawia.
  const staly = (stalyZastepczy?.trim() || (ciecie >= 0 ? obecny.slice(0, ciecie) : obecny)).trimEnd()

  const lista = (pytania ?? '')
    .split(/\r?\n/)
    .map((w) => w.trim())
    .filter(Boolean)

  const czysta = oczyscWiedze(wiedza)
  const slownik = oczyscWiedze(branza)

  let wynik = staly
  // Slownik branzowy idzie przed pytaniami: bot ma najpierw rozumiec, czym
  // jest sankcja kredytu darmowego, a dopiero potem o nia pytac.
  if (slownik) {
    wynik += `\n\n${ZNACZNIK_BRANZY}\n\n${slownik}`
  }
  if (lista.length > 0) {
    const punkty = lista.map((p) => `- ${p}`).join('\n')
    wynik += `\n\n${ZNACZNIK_PYTAN}\n\nPytania, które masz zadać rozmówcy. Zadajesz je po polsku, jedno naraz, i czekasz na odpowiedź:\n\n${punkty}`
  }
  if (czysta) {
    wynik += `\n\n${ZNACZNIK_WIEDZY}\n\nTak o sobie pisze firma, w imieniu której dzwonisz. Korzystaj z tego, gdy rozmówca pyta o firmę lub jej usługi. Jeżeli odpowiedzi tu nie ma, mówisz, że sprawdzi to człowiek, i nie zmyślasz.\n\n${czysta}`
  }
  return wynik
}

/**
 * Przygotowuje doklejaną treść do wstawienia w scenariusz.
 *
 * Treść potrafi pochodzić z cudzej strony, więc nie może wnieść do promptu własnych
 * znaczników sekcji. Inaczej kolejny zapis obciąłby scenariusz w miejscu
 * wskazanym przez tę stronę, a nie przez nas.
 */
export function oczyscWiedze(wiedza: string | null | undefined): string {
  return (wiedza ?? '')
    .split(/\r?\n/)
    .filter((w) => !ZNACZNIKI.some((z) => w.includes(z)))
    .join('\n')
    .trim()
}

export type WynikSynchronizacji = { ok: true; dlugosc: number } | { ok: false; blad: string }

/**
 * Wysyła pytania klienta i wiedzę o jego firmie do agenta u dostawcy.
 *
 * Najpierw czytamy obecny prompt, bo doklejamy do niego, a nie zastępujemy.
 * Wysyłamy wyłącznie tę jedną gałąź konfiguracji, żeby nie ruszyć głosu ani
 * ustawień rozmowy.
 */
export async function wyslijScenariuszDoAgenta(
  agentId: string,
  pytania: string | null | undefined,
  wiedza?: string | null,
  branza?: string | null,
  stalyZastepczy?: string | null,
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

    const nowy = zlozPrompt(obecny, pytania, wiedza, branza, stalyZastepczy)

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
