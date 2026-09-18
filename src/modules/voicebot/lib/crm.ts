/**
 * Wspólny kształt złącza CRM.
 *
 * Bitrix jest pierwszą realizacją, nie jedyną. Każda firma-klient ma swój
 * system i swoje dane dostępowe, więc nazwa dostawcy i adres są daną
 * konfiguracyjną tenanta, nigdy stałą w kodzie.
 */

export type DanePolaczenia = {
  /** Numer rozmówcy w E.164. */
  phone: string
  firstName?: string | null
  lastName?: string | null
  direction: string
  durationSecs?: number | null
  productCode?: string | null
  productDescription?: string | null
  amount?: string | null
  currency?: string | null
  contractYear?: string | null
  bank?: string | null
  identityConfirmed?: boolean | null
  consentGiven?: boolean | null
  requestsContact?: boolean | null
  preferredContactTime?: string | null
  summary?: string | null
}

export type ZnalezionyRekord = {
  /** LEAD, CONTACT albo COMPANY po stronie CRM. */
  typ: string
  id: string
}

export type WynikCrm =
  | { ok: true; utworzono: boolean; rekord: ZnalezionyRekord | null }
  | { ok: false; blad: string }

/** Lejek sprzedaży u dostawcy. */
export type Lejek = { id: string; nazwa: string }

/** Etap w lejku. */
export type Etap = { id: string; nazwa: string }

/**
 * Gdzie ma lądować nowa szansa sprzedaży.
 *
 * Puste pola znaczą "zostaw dostawcy jego domyślne ustawienie".
 */
export type UstawieniaZapisu = {
  pipelineId?: string | null
  stageId?: string | null
}

export interface ZlaczeCrm {
  /** Sprawdza, czy adres i uprawnienia działają. Nic nie zmienia. */
  sprawdzPolaczenie(): Promise<{ ok: boolean; opis: string }>

  /**
   * Lejki dostępne u klienta, do wyboru w panelu.
   *
   * Pobieramy je zamiast kazać przepisywać identyfikatory z cudzej konsoli.
   * Ta sama zasada co przy agentach i numerach u dostawcy głosu: raz już
   * kosztowała nas telefon wykonany z nieaktualnego numeru wziętego z pliku.
   */
  pobierzLejki(): Promise<Lejek[]>

  /** Etapy w danym lejku. */
  pobierzEtapy(pipelineId: string): Promise<Etap[]>

  /**
   * Zapisuje wynik rozmowy w CRM i zwraca rekord, do którego trafił.
   *
   * Całe znajdowanie i zakładanie siedzi po stronie dostawcy, bo każdy CRM
   * ma inny model: jeden pracuje na leadach, inny na kontaktach i szansach,
   * a jeszcze inny na zgłoszeniach. Reszta modułu nie musi o tym wiedzieć.
   */
  zapiszWynikRozmowy(dane: DanePolaczenia): Promise<ZnalezionyRekord>
}

/**
 * Czy z tej rozmowy warto zakładać rekord w CRM klienta.
 *
 * Bez tej bramki każdy pomyłkowy telefon, telemarketer i rozłączenie po dwóch
 * sekundach tworzyłyby nowego leada. Po tygodniu klient miałby w CRM setkę
 * pustych rekordów i wyłączyłby integrację. Zakładamy rekord tylko wtedy,
 * gdy rozmowa faktycznie coś wniosła.
 */
export function czyWartoZakladac(dane: DanePolaczenia): boolean {
  if (dane.consentGiven === false) return false
  if (dane.identityConfirmed === true) return true
  if (dane.requestsContact === true) return true
  if (dane.productCode && dane.productCode !== 'NIEUSTALONY') return true
  return (dane.durationSecs ?? 0) >= 20
}

/**
 * Notatka z rozmowy w postaci czytelnej dla handlowca.
 *
 * Handlowiec nie będzie czytał transkrypcji, więc podajemy to, co ustalone,
 * w kolejności, w jakiej o tym myśli: kto, o co chodzi, co dalej.
 */
export function notatkaZRozmowy(dane: DanePolaczenia): string {
  const l: string[] = []
  l.push(dane.direction === 'inbound' ? 'Rozmowa przychodząca (bot odebrał).' : 'Rozmowa wychodząca (bot dzwonił).')
  if (dane.identityConfirmed != null) l.push(`Tożsamość potwierdzona: ${dane.identityConfirmed ? 'tak' : 'nie'}.`)
  if (dane.consentGiven != null) l.push(`Zgoda na rozmowę: ${dane.consentGiven ? 'tak' : 'nie'}.`)
  if (dane.productCode) l.push(`Produkt: ${dane.productCode}${dane.productDescription ? ` (${dane.productDescription})` : ''}.`)
  if (dane.bank) l.push(`Bank: ${dane.bank}.`)
  if (dane.contractYear) l.push(`Rok umowy: ${dane.contractYear}.`)
  if (dane.amount) l.push(`Kwota: ${dane.amount}${dane.currency ? ` ${dane.currency}` : ''}.`)
  if (dane.requestsContact) l.push(`Prosi o kontakt${dane.preferredContactTime ? `: ${dane.preferredContactTime}` : ''}.`)
  if (dane.durationSecs != null) l.push(`Czas rozmowy: ${dane.durationSecs} s.`)
  if (dane.summary) l.push(`\nPodsumowanie: ${dane.summary}`)
  return l.join('\n')
}

export function pelneImie(dane: DanePolaczenia): string {
  const czesci = [dane.firstName, dane.lastName].filter(Boolean)
  return czesci.length ? czesci.join(' ') : dane.phone
}
