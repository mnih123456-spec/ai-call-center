import { createLogger } from '@open-mercato/shared/lib/logger'
import {
  type DanePolaczenia,
  type Etap,
  type Lejek,
  type UstawieniaZapisu,
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
  private readonly ustawienia: UstawieniaZapisu

  constructor(adresWebhooka: string, ustawienia: UstawieniaZapisu = {}) {
    this.bazowy = adresWebhooka.replace(/\/+$/, '')
    this.ustawienia = ustawienia
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
   * Lejki szans sprzedaży.
   *
   * `crm.category.list` dla typu 2 (szansa sprzedaży) zwraca także lejek
   * domyślny o identyfikatorze 0, którego starsza metoda `crm.dealcategory.list`
   * nie pokazuje. Dlatego używamy tej, inaczej klient nie mógłby wybrać
   * lejka, w którym najczęściej pracuje.
   */
  async pobierzLejki(): Promise<Lejek[]> {
    const wynik = await this.wywolaj<{ categories?: Array<{ id?: number | string; name?: string }> }>(
      'crm.category.list',
      { entityTypeId: 2 },
    )
    return (wynik?.categories ?? [])
      .filter((c) => c?.id !== undefined && c?.id !== null)
      .map((c) => ({ id: String(c.id), nazwa: c.name?.trim() || `Lejek ${c.id}` }))
  }

  async pobierzEtapy(pipelineId: string): Promise<Etap[]> {
    const wynik = await this.wywolaj<Array<{ STATUS_ID?: string; NAME?: string }>>(
      'crm.dealcategory.stage.list',
      { id: Number(pipelineId) },
    )
    return (Array.isArray(wynik) ? wynik : [])
      .filter((s): s is { STATUS_ID: string; NAME?: string } => typeof s?.STATUS_ID === 'string')
      .map((s) => ({ id: s.STATUS_ID, nazwa: s.NAME?.trim() || s.STATUS_ID }))
  }

  /**
   * Szukanie kontaktu po numerze telefonu.
   *
   * Bitrix dopasowuje numery po swojemu i bywa wrażliwy na format, dlatego
   * pytamy dwa razy: postacią z plusem i samymi cyframi.
   */
  private async znajdzKontakt(phone: string): Promise<string | null> {
    const warianty = Array.from(new Set([phone, phone.replace(/^\+/, '')]))
    for (const numer of warianty) {
      const wynik = await this.wywolaj<Record<string, string[] | undefined>>(
        'crm.duplicate.findbycomm',
        { entity_type: 'CONTACT', type: 'PHONE', values: [numer] },
      )
      const znalezione = wynik?.CONTACT
      if (Array.isArray(znalezione) && znalezione.length > 0) return String(znalezione[0])
    }
    return null
  }

  /**
   * Otwarty deal tego kontaktu, jeśli istnieje.
   *
   * Szukamy, żeby nie zakładać drugiego deala na tę samą sprawę. Klient,
   * który oddzwania trzy razy, ma mieć jedną szansę sprzedaży z trzema
   * wpisami, a nie trzy szanse.
   */
  private async znajdzOtwartyDeal(contactId: string): Promise<string | null> {
    const filtr: Record<string, unknown> = { CONTACT_ID: Number(contactId), CLOSED: 'N' }

    // Szukamy w tym samym lejku, w którym byśmy zakładali. Inaczej rozmowa
    // wpadłaby do otwartej sprawy z zupełnie innego procesu, na przykład
    // do windykacji, tylko dlatego że dotyczy tego samego człowieka.
    if (this.ustawienia.pipelineId) filtr.CATEGORY_ID = Number(this.ustawienia.pipelineId)

    const wynik = await this.wywolaj<Array<{ ID?: string }>>('crm.deal.list', {
      filter: filtr,
      select: ['ID'],
      order: { ID: 'DESC' },
    })
    const pierwszy = Array.isArray(wynik) ? wynik[0] : null
    return pierwszy?.ID ? String(pierwszy.ID) : null
  }

  private async utworzKontakt(dane: DanePolaczenia): Promise<string> {
    const id = await this.wywolaj<number>('crm.contact.add', {
      fields: {
        // Przy rozmowie przychodzącej od nieznanego numeru nie mamy imienia.
        // Wpisujemy wtedy numer, bo na liście kontaktów "Nieznany" nic nie
        // mówi, a numer pozwala rozpoznać, z kim była rozmowa.
        NAME: dane.firstName ?? dane.phone,
        LAST_NAME: dane.lastName ?? undefined,
        PHONE: [{ VALUE: dane.phone, VALUE_TYPE: 'WORK' }],
        OPENED: 'Y',
        SOURCE_DESCRIPTION: 'Rozmowa z botem telefonicznym',
      },
      params: { REGISTER_SONET_EVENT: 'Y' },
    })
    logger.info('bitrix contact created', { id })
    return String(id)
  }

  private async utworzDeal(contactId: string, dane: DanePolaczenia): Promise<string> {
    const pola: Record<string, unknown> = {
      TITLE: `${pelneImie(dane)}${dane.productCode && dane.productCode !== 'NIEUSTALONY' ? ` - ${dane.productCode}` : ''}`,
      CONTACT_ID: Number(contactId),
      COMMENTS: notatkaZRozmowy(dane),
      OPENED: 'Y',
    }

    // Pola ustawiamy tylko wtedy, gdy klient je wskazał. Puste CATEGORY_ID
    // wysłane do Bitriksa nie znaczy "domyślny lejek", tylko lejek zerowy,
    // więc lepiej pominąć klucz niż wysłać pustą wartość.
    if (this.ustawienia.pipelineId) pola.CATEGORY_ID = Number(this.ustawienia.pipelineId)
    if (this.ustawienia.stageId) pola.STAGE_ID = this.ustawienia.stageId

    const id = await this.wywolaj<number>('crm.deal.add', {
      fields: pola,
      params: { REGISTER_SONET_EVENT: 'Y' },
    })
    logger.info('bitrix deal created', { id })
    return String(id)
  }

  /**
   * Zapis wyniku rozmowy: kontakt, deal i wpis na osi czasu.
   *
   * Kolejność odpowiada temu, jak pracuje zespół: najpierw ustalamy, czy
   * znamy tego człowieka, potem czy jest z nim otwarta sprawa, i dopiero
   * do niej dopisujemy rozmowę. Nowy deal powstaje tylko wtedy, gdy żadnej
   * otwartej nie ma.
   *
   * Wpis idzie komentarzem na oś czasu, bo widzi go każdy handlowiec bez
   * zmiany konfiguracji swojego Bitriksa.
   */
  async zapiszWynikRozmowy(dane: DanePolaczenia): Promise<ZnalezionyRekord> {
    const contactId = (await this.znajdzKontakt(dane.phone)) ?? (await this.utworzKontakt(dane))
    const dealId = (await this.znajdzOtwartyDeal(contactId)) ?? (await this.utworzDeal(contactId, dane))

    await this.wywolaj<number>('crm.timeline.comment.add', {
      fields: {
        ENTITY_ID: Number(dealId),
        ENTITY_TYPE: 'deal',
        COMMENT: notatkaZRozmowy(dane),
      },
    })

    logger.info('bitrix call stored', { dealId })
    return { typ: 'DEAL', id: dealId }
  }
}
