import { createLogger } from '@open-mercato/shared/lib/logger'
import {
  type DanePolaczenia,
  type ZlaczeCrm,
  type ZnalezionyRekord,
  notatkaZRozmowy,
  pelneImie,
} from './crm'

const logger = createLogger('voicebot')

/**
 * Złącze z Bitrix24 przez webhook przychodzący.
 *
 * Wybrany świadomie zamiast aplikacji OAuth: klient wkleja jeden adres
 * i gotowe, bez zakładania aplikacji, bez zgód i bez odświeżania żetonów.
 * Dla wdrożenia u małej firmy to różnica między pięcioma minutami a dniem.
 *
 * Adres webhooka zawiera w sobie żeton, więc jest hasłem. Trzymamy go po
 * stronie serwera, nie wysyłamy do przeglądarki i nie zapisujemy w logach.
 * Dlatego w komunikatach o błędach pojawia się wyłącznie nazwa metody.
 */
export class BitrixCrm implements ZlaczeCrm {
  private readonly bazowy: string

  constructor(adresWebhooka: string) {
    this.bazowy = adresWebhooka.replace(/\/+$/, '')
  }

  /**
   * Wywołanie metody REST.
   *
   * Bitrix odpowiada kodem 200 także wtedy, gdy metoda zawiodła, a powód
   * podaje w polu `error`. Sprawdzanie samego kodu HTTP przepuściłoby
   * ciche niepowodzenia, więc patrzymy na treść.
   */
  private async wywolaj<T>(metoda: string, parametry: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.bazowy}/${metoda}.json`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parametry),
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) {
      throw new Error(`Bitrix odrzucił wywołanie ${metoda}, status ${res.status}`)
    }

    const tresc = (await res.json().catch(() => null)) as
      | { result?: T; error?: string; error_description?: string }
      | null

    if (!tresc) throw new Error(`Bitrix zwrócił odpowiedź, której nie da się odczytać (${metoda})`)
    if (tresc.error) {
      throw new Error(`Bitrix: ${tresc.error_description || tresc.error} (${metoda})`)
    }
    return tresc.result as T
  }

  async sprawdzPolaczenie(): Promise<{ ok: boolean; opis: string }> {
    try {
      const profil = await this.wywolaj<{ NAME?: string; LAST_NAME?: string }>('profile', {})
      const kto = [profil?.NAME, profil?.LAST_NAME].filter(Boolean).join(' ')
      return { ok: true, opis: kto ? `Połączono jako ${kto}.` : 'Połączono.' }
    } catch (e) {
      return { ok: false, opis: e instanceof Error ? e.message : 'Nie udało się połączyć z Bitrixem.' }
    }
  }

  /**
   * Szukanie po numerze telefonu.
   *
   * Bitrix dopasowuje numery po swojemu i bywa wrażliwy na format, dlatego
   * pytamy dwa razy: postacią z plusem i samymi cyframi. Kontakt ma
   * pierwszeństwo przed leadem, bo kontakt oznacza kogoś, kto jest już
   * klientem, a lead dopiero kandydata.
   */
  async znajdzPoNumerze(phone: string): Promise<ZnalezionyRekord | null> {
    const warianty = Array.from(new Set([phone, phone.replace(/^\+/, '')]))

    for (const typ of ['CONTACT', 'LEAD'] as const) {
      for (const numer of warianty) {
        const wynik = await this.wywolaj<Record<string, string[] | undefined>>(
          'crm.duplicate.findbycomm',
          { entity_type: typ, type: 'PHONE', values: [numer] },
        )
        const znalezione = wynik?.[typ]
        if (Array.isArray(znalezione) && znalezione.length > 0) {
          return { typ, id: String(znalezione[0]) }
        }
      }
    }
    return null
  }

  async utworzLead(dane: DanePolaczenia): Promise<ZnalezionyRekord> {
    const tytul = `Rozmowa z botem: ${pelneImie(dane)}`
    const pola: Record<string, unknown> = {
      TITLE: tytul,
      NAME: dane.firstName ?? undefined,
      LAST_NAME: dane.lastName ?? undefined,
      PHONE: [{ VALUE: dane.phone, VALUE_TYPE: 'WORK' }],
      COMMENTS: notatkaZRozmowy(dane),
      OPENED: 'Y',
    }

    const id = await this.wywolaj<number>('crm.lead.add', {
      fields: pola,
      params: { REGISTER_SONET_EVENT: 'Y' },
    })

    logger.info('bitrix lead created', { id })
    return { typ: 'LEAD', id: String(id) }
  }

  /**
   * Dopisanie rozmowy do istniejącego rekordu.
   *
   * Używamy komentarza na osi czasu, a nie własnego pola, bo komentarz widzi
   * każdy handlowiec bez zmiany konfiguracji jego Bitrixa. Docelowo warto
   * przejść na API telefoniczne, które pokaże rozmowę razem z nagraniem
   * w tym samym miejscu, co rozmowy z centrali.
   */
  async zapiszRozmowe(rekord: ZnalezionyRekord, dane: DanePolaczenia): Promise<void> {
    await this.wywolaj<number>('crm.timeline.comment.add', {
      fields: {
        ENTITY_ID: Number(rekord.id),
        ENTITY_TYPE: rekord.typ.toLowerCase(),
        COMMENT: notatkaZRozmowy(dane),
      },
    })
    logger.info('bitrix comment added', { typ: rekord.typ, id: rekord.id })
  }
}
