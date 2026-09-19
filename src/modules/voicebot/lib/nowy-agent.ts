import { createLogger } from '@open-mercato/shared/lib/logger'
import { powitanieBranzy, scenariuszBranzy, slownikBranzy } from './branze'

const logger = createLogger('voicebot')

const API = 'https://api.elevenlabs.io/v1/convai'

/**
 * Nazwa firmy w naszym szablonie scenariusza.
 *
 * Bot przedstawia się nazwą firmy w powitaniu i w pożegnaniu. Przy zakładaniu
 * bota dla nowej firmy podmieniamy dokładnie ten ciąg, zamiast przepisywać
 * scenariusz od nowa: reszta jest sprawdzona i ma zostać nietknięta.
 */
export const NAZWA_W_SZABLONIE = process.env.VOICEBOT_NAZWA_W_SZABLONIE ?? 'Acme Corp'

export type WynikZalozenia =
  | { ok: true; agentId: string; nazwa: string }
  | { ok: false; blad: string }

/**
 * Podmienia nazwę firmy w tekście scenariusza.
 *
 * Funkcja jest czysta, żeby dało się ją sprawdzić testem bez zakładania
 * czegokolwiek na cudzym koncie. Zakładanie agenta jest nieodwracalne w tym
 * sensie, że slotów u dostawcy jest skończona liczba.
 */
export function podmienNazwe(tekst: string | null | undefined, nazwa: string): string {
  return String(tekst ?? '').split(NAZWA_W_SZABLONIE).join(nazwa)
}

/**
 * Zakłada u dostawcy bota dla nowej firmy.
 *
 * Powielamy nasz sprawdzony szablon, podmieniamy w nim nazwę firmy, przypinamy
 * nasz webhook jako własny tego agenta i ustawiamy szybki model. Webhook
 * przypinamy per agent, a nie jako domyślny całego konta, żeby nie przejąć
 * wyników rozmów innych agentów, które mogą należeć do zupełnie innego
 * przepływu.
 */
export async function zalozAgentaDlaFirmy(
  nazwaFirmy: string,
  branza: string | null,
): Promise<WynikZalozenia> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const szablon = process.env.VOICEBOT_AGENT_SZABLON
  const webhook = process.env.VOICEBOT_WEBHOOK_ID ?? null
  const model = process.env.VOICEBOT_MODEL_DOMYSLNY ?? 'gemini-2.0-flash-lite'

  if (!apiKey) return { ok: false, blad: 'Brak klucza dostawcy głosu.' }
  if (!szablon) return { ok: false, blad: 'Nie wskazano szablonu bota (VOICEBOT_AGENT_SZABLON).' }

  const nazwa = nazwaFirmy.trim()
  if (!nazwa) return { ok: false, blad: 'Podaj nazwę firmy.' }

  try {
    const kopia = await fetch(`${API}/agents/${szablon}/duplicate`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ name: nazwa }),
      signal: AbortSignal.timeout(30000),
    })
    if (!kopia.ok) {
      const tekst = await kopia.text().catch(() => '')
      return { ok: false, blad: `Nie udało się założyć bota, status ${kopia.status}. ${tekst.slice(0, 160)}` }
    }
    const { agent_id: agentId } = (await kopia.json()) as { agent_id?: string }
    if (!agentId) return { ok: false, blad: 'Dostawca nie zwrócił identyfikatora bota.' }

    const odczyt = await fetch(`${API}/agents/${agentId}`, {
      headers: { 'xi-api-key': apiKey },
      signal: AbortSignal.timeout(20000),
    })
    const dane = odczyt.ok
      ? ((await odczyt.json()) as {
          conversation_config?: { agent?: { first_message?: string; prompt?: { prompt?: string } } }
        })
      : null
    const cc = dane?.conversation_config?.agent

    // Branza z gotowym scenariuszem zastepuje tresc szablonu, a nie dokleja
    // sie do niej. Bot serwisu samochodowego nie moze dalej pytac o umowe
    // kredytowa tylko dlatego, ze szablon powstal dla kancelarii.
    const wlasny = scenariuszBranzy(branza, nazwa)
    const prompt = wlasny || `${podmienNazwe(cc?.prompt?.prompt, nazwa)}

${slownikBranzy(branza)}`.trim()
    const powitanie = powitanieBranzy(branza, nazwa) || podmienNazwe(cc?.first_message, nazwa)

    const zapis = await fetch(`${API}/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        conversation_config: {
          agent: {
            first_message: powitanie,
            prompt: { prompt, llm: model },
          },
          turn: { turn_timeout: 1.5 },
        },
        ...(webhook
          ? {
              platform_settings: {
                workspace_overrides: {
                  webhooks: {
                    post_call_webhook_id: webhook,
                    events: ['transcript'],
                    transcript_format: 'json',
                    send_audio: false,
                  },
                },
              },
            }
          : {}),
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!zapis.ok) {
      const tekst = await zapis.text().catch(() => '')
      // Bot istnieje, ale mowi nie ta nazwa. Zwracamy blad, zeby nikt nim
      // nie zadzwonil w przekonaniu, ze wszystko sie udalo.
      return { ok: false, blad: `Bot powstał, ale nie udało się go dostosować: ${zapis.status}. ${tekst.slice(0, 120)}` }
    }

    logger.info('agent provisioned for company', { agentId, nazwa, branza })
    return { ok: true, agentId, nazwa }
  } catch {
    return { ok: false, blad: 'Nie udało się połączyć z dostawcą głosu.' }
  }
}

/**
 * Kasuje bota u dostawcy.
 *
 * Slotów na agentów jest na koncie skończona liczba, a bot zapomniany na
 * koncie dalej ją zajmuje. Brak agenta u dostawcy traktujemy jak sukces:
 * skoro go nie ma, to cel został osiągnięty.
 */
export async function usunAgentaUDostawcy(agentId: string): Promise<{ ok: true } | { ok: false; blad: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return { ok: false, blad: 'Brak klucza dostawcy głosu.' }

  try {
    const res = await fetch(`${API}/agents/${agentId}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': apiKey },
      signal: AbortSignal.timeout(20000),
    })
    if (res.ok || res.status === 404) {
      logger.info('agent removed at provider', { agentId, status: res.status })
      return { ok: true }
    }
    const tekst = await res.text().catch(() => '')
    return { ok: false, blad: `status ${res.status}. ${tekst.slice(0, 120)}` }
  } catch {
    return { ok: false, blad: 'brak połączenia z dostawcą' }
  }
}
