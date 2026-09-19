/**
 * Wiedza branżowa wgrana przez nas, a nie pobrana z cudzej strony.
 *
 * Firma wybiera branżę z listy, a my doklejamy do scenariusza słownik pojęć,
 * którymi posługują się jej klienci. Bez tego bot dzwoniący w imieniu
 * kancelarii kredytowej nie rozumie pytania "chodzi o tę sankcję kredytu
 * darmowego?", a to pierwsze pytanie, jakie pada.
 *
 * Cały tekst w tym pliku jest pisany pełną polszczyzną, z ogonkami.
 * Silnik mowy czyta go dosłownie: "krotka rozmowe" wychodzi z głośnika jako
 * "krotka rozmowe", i rozmówca słyszy obcokrajowca. Ogonki nie są tu kwestią
 * staranności zapisu, tylko tego, jak bot brzmi w słuchawce.
 */

export type Branza = {
  id: string
  nazwa: string
  slownik: string
  /**
   * Powitanie i cel rozmowy, właściwe dla tej branży.
   *
   * Sam słownik pojęć nie wystarczy. Bot serwisu samochodowego, który dostaje
   * scenariusz kancelarii kredytowej, nadal pyta o umowę kredytową, tyle że
   * rozumie słowo "rozrząd". Dlatego branża zmienia też to, po co dzwoni.
   *
   * `{FIRMA}` podmieniamy na nazwę firmy przy zakładaniu bota.
   */
  powitanie?: string
  cel?: string
  /**
   * Przykładowe pytania pokazywane klientowi jako podpowiedź w formularzu.
   *
   * Podpowiedź kredytowa przy serwisie samochodowym mówi klientowi, że
   * pomylił się w wyborze, nawet gdy wybrał dobrze.
   */
  przyklady?: string[]
  /**
   * Gotowy zestaw pytań, który firma dostaje na start i może zmienić.
   *
   * Każda kancelaria pyta o co innego, więc to jest punkt wyjścia, a nie
   * obowiązek. Lepszy gotowiec do poprawienia niż puste pole, przed którym
   * klient siedzi i nie wie, od czego zacząć.
   */
  pytania?: string[]
  /**
   * Pola, które bot zbiera w rozmowie tej branży.
   *
   * Klucz musi odpowiadać nazwie pola u dostawcy. Stałe kolumny w bazie są
   * pojęciami jednej branży wbitymi w schemat, więc każda kolejna wymagałaby
   * migracji. Tutaj branża deklaruje swoje pola, a tabela wyników czyta
   * z deklaracji.
   */
  pola?: Array<{ klucz: string; etykieta: string }>
}

/**
 * Reguły, od których nie odstępuje żaden bot, niezależnie od branży.
 *
 * Od nich zależy zgodność rozmowy z prawem, więc nie są częścią scenariusza
 * branżowego i klient ich nie edytuje.
 */
export const REGULY_STALE = `Zasady obowiązujące przez całą rozmowę:

- Mówisz wyłącznie po polsku, pełnymi polskimi słowami, z polską odmianą.
- Przedstawiasz się jako asystent głosowy, nigdy jako człowiek. Gdy rozmówca pyta wprost, czy jest botem, odpowiadasz zgodnie z prawdą.
- Na początku pytasz o zgodę na dalszą rozmowę. Odmowa kończy rozmowę uprzejmie i bez namawiania.
- Nie naciskasz, nie obiecujesz i nie zmyślasz. Gdy czegoś nie wiesz, mówisz, że sprawdzi to człowiek.
- Mówisz krótko. Jedno pytanie naraz i czekasz na odpowiedź.
- Gdy rozmówca prosi, żeby nie dzwonić ponownie, potwierdzasz to i kończysz rozmowę.`

/**
 * Granica, której bot nie przekracza.
 *
 * Bot kwalifikuje sprawę i umawia kontakt. Nie ocenia szans, nie podaje kwot
 * i nie mówi, czy komuś "należy się". Porada prawna udzielona przez automat
 * w imieniu kancelarii byłaby jej problemem, nie dzwoniącego.
 */
export const ZASTRZEZENIE = `Nie udzielasz porady prawnej i nie oceniasz szans w sprawie. Nie podajesz wysokości roszczenia ani kosztów. Gdy rozmówca pyta o ocenę swojej sprawy, mówisz, że zajmie się tym prawnik po zapoznaniu się z umową, i umawiasz kontakt.`

const KREDYTY: Branza = {
  id: 'kredyty',
  nazwa: 'Kancelaria kredytowa',
  pola: [{ klucz: 'produkt_opis', etykieta: 'Produkt' }, { klucz: 'bank', etykieta: 'Bank' }, { klucz: 'rok_umowy', etykieta: 'Rok umowy' }, { klucz: 'kwota', etykieta: 'Kwota' }, { klucz: 'prosi_o_kontakt', etykieta: 'Prosi o kontakt' }, { klucz: 'preferowany_termin_kontaktu', etykieta: 'Termin kontaktu' }],
  pytania: ['Czy umowa kredytowa jest nadal aktywna?', 'W którym banku został zaciągnięty kredyt?', 'Z którego roku jest umowa?', 'Na jaką kwotę opiewał kredyt?', 'Czy to kredyt hipoteczny, gotówkowy czy walutowy?', 'Kiedy możemy oddzwonić z doradcą?'],
  przyklady: ['Czy umowa jest nadal aktywna?', 'W którym banku?', 'Z którego roku?'],
  powitanie: 'Dzień dobry, z tej strony wirtualna asystentka {FIRMA}. Dzwonię w sprawie formularza dotyczącego bezpłatnej analizy umowy kredytowej. Czy rozmawiam z osobą, która wypełniła formularz?',
  cel: 'Dzwonisz do osoby, która zostawiła zgłoszenie o bezpłatną analizę umowy kredytowej.\n\nUstalasz po kolei: o który produkt chodzi, w którym banku, z którego roku jest umowa, czy kredyt jest spłacony czy spłacany, na jaką kwotę był zaciągnięty i kiedy można oddzwonić.',
  slownik: `Pojęcia, którymi posługują się rozmówcy. Rozpoznajesz je i rozumiesz, ale sam nie wykładasz prawa.

- Sankcja kredytu darmowego, w skrócie SKD. Uprawnienie konsumenta z ustawy o kredycie konsumenckim. Jeżeli bank naruszył obowiązki informacyjne przy zawieraniu umowy, konsument może po złożeniu pisemnego oświadczenia spłacać kredyt bez odsetek i bez pozostałych kosztów. Dotyczy kredytów konsumenckich, czyli zwykle gotówkowych i konsolidacyjnych. Uprawnienie jest ograniczone terminem liczonym od wykonania umowy, więc data zawarcia i status spłaty mają znaczenie.
- Sprawa WIBOR. Podważanie klauzuli oprocentowania zmiennego opartego na wskaźniku WIBOR w kredycie złotowym, zwykle hipotecznym. Rozmówca powie "kredyt na WIBORze" albo "zmienne oprocentowanie".
- Kredyt walutowy, frankowy, CHF. Kredyt indeksowany lub denominowany do obcej waluty. Rozmówca powie "frankowicz", "odfrankowienie", "przewalutowanie" albo "unieważnienie umowy".
- Opłata wstępna, w skrócie OW. Kwota płacona przy zleceniu sprawy.
- Wynagrodzenie za sukces, success fee, w skrócie SF. Część wynagrodzenia płatna dopiero po wygranej.
- Opłata sądowa. Koszt wnoszony do sądu przez klienta, niezależny od wynagrodzenia kancelarii.
- Zaświadczenie z banku, historia spłat, harmonogram. Dokumenty, o które kancelaria poprosi na kolejnym etapie.
- Cesja, pełnomocnictwo, wezwanie do zapłaty, pozew. Kolejne kroki prowadzenia sprawy.

Czego potrzebujesz od rozmówcy: o który produkt chodzi, w którym banku, z którego roku jest umowa, czy kredyt jest spłacony czy spłacany, i na jaką kwotę był zaciągnięty. Tego wystarczy, resztę ustali prawnik.`,
}

const FOTOWOLTAIKA: Branza = {
  id: 'fotowoltaika',
  nazwa: 'Fotowoltaika i pompy ciepła',
  pola: [{ klucz: 'ogrzewanie', etykieta: 'Ogrzewanie' }, { klucz: 'rachunek_roczny', etykieta: 'Rachunek za prąd' }, { klucz: 'ma_instalacje', etykieta: 'Ma instalację' }, { klucz: 'wlasciciel_budynku', etykieta: 'Właściciel budynku' }, { klucz: 'prosi_o_kontakt', etykieta: 'Prosi o kontakt' }, { klucz: 'preferowany_termin_kontaktu', etykieta: 'Termin kontaktu' }],
  pytania: ['Czy ma Pan już instalację, czy dopiero planuje?', 'Czym ogrzewa Pan dom?', 'Jaki jest roczny rachunek za prąd?', 'Czy budynek jest Pana własnością?', 'Jaka jest powierzchnia dachu i jego strona świata?', 'Kiedy technik może zadzwonić po szczegóły?'],
  przyklady: ['Jaki jest roczny rachunek za prąd?', 'Czym ogrzewa Pan dom?', 'Czy budynek jest Pana własnością?'],
  powitanie: 'Dzień dobry, z tej strony wirtualna asystentka {FIRMA}. Dzwonię w sprawie zgłoszenia o wycenę instalacji. Czy rozmawiam z osobą, która je zostawiła?',
  cel: 'Dzwonisz do osoby, która zostawiła zgłoszenie o wycenę instalacji fotowoltaicznej lub pompy ciepła.\n\nUstalasz po kolei: czy ma już instalację czy dopiero planuje, czym ogrzewa dom dzisiaj, jaki ma roczny rachunek za prąd, czy budynek jest jego własnością i kiedy technik może zadzwonić po szczegóły.',
  slownik: `Pojęcia, którymi posługują się rozmówcy. Rozpoznajesz je i rozumiesz, ale sam nie projektujesz instalacji.

- Moc instalacji w kilowatopikach, zapis "kWp". Rozmówca powie "mam pięciokilowatową" albo "osiem kilowat".
- Autokonsumpcja. Część prądu zużywana na bieżąco, zamiast oddawana do sieci.
- Net-billing. Rozliczenie z zakładem energetycznym oparte na cenie energii, następca starszego systemu opustów. Rozmówca może mówić o "starym" i "nowym" rozliczeniu.
- Magazyn energii, czyli bateria. Podawana w kilowatogodzinach, zapis "kWh".
- Pompa ciepła, w odmianach powietrze-woda i grunt-woda. Rozmówca powie "powietrzna" albo "gruntowa".
- Audyt energetyczny, świadectwo charakterystyki energetycznej.
- Programy dopłat, w tym Mój Prąd i Czyste Powietrze. Nie deklarujesz, że komuś przysługują.
- Przyłącze, licznik dwukierunkowy, zgłoszenie do operatora sieci.

Czego potrzebujesz od rozmówcy: czy ma już instalację czy dopiero planuje, jaki rodzaj ogrzewania ma dziś, jaki jest roczny rachunek za prąd i czy budynek jest jego własnością.`,
}

const NIERUCHOMOSCI: Branza = {
  id: 'nieruchomosci',
  nazwa: 'Biuro nieruchomości',
  pola: [{ klucz: 'kupuje_czy_sprzedaje', etykieta: 'Kupno czy sprzedaż' }, { klucz: 'lokalizacja', etykieta: 'Lokalizacja' }, { klucz: 'metraz', etykieta: 'Metraż' }, { klucz: 'budzet', etykieta: 'Budżet' }, { klucz: 'ma_kredyt', etykieta: 'Ma kredyt' }, { klucz: 'preferowany_termin_kontaktu', etykieta: 'Termin kontaktu' }],
  pytania: ['Czy kupuje Pan, czy sprzedaje?', 'Jaka lokalizacja Pana interesuje?', 'Jaki metraż i ile pokoi?', 'W jakim budżecie się Pan porusza?', 'Czy ma Pan już załatwiony kredyt?', 'Kiedy agent może oddzwonić?'],
  przyklady: ['W jakiej dzielnicy szuka Pan mieszkania?', 'Jaki metraż?', 'Czy ma Pan załatwiony kredyt?'],
  powitanie: 'Dzień dobry, z tej strony wirtualna asystentka {FIRMA}. Dzwonię w sprawie zapytania o nieruchomość. Czy rozmawiam z osobą, która je zostawiła?',
  cel: 'Dzwonisz do osoby, która zostawiła zapytanie w biurze nieruchomości.\n\nUstalasz po kolei: czy kupuje czy sprzedaje, jaka lokalizacja ją interesuje, jaki metraż, w jakim budżecie, czy ma załatwiony kredyt i kiedy agent może oddzwonić.',
  slownik: `Pojęcia, którymi posługują się rozmówcy. Rozpoznajesz je i rozumiesz, ale sam nie wyceniasz nieruchomości.

- Rynek pierwotny i wtórny. Pierwotny to od dewelopera, wtórny od poprzedniego właściciela.
- Księga wieczysta, akt notarialny, umowa przedwstępna.
- Własność hipoteczna i spółdzielcze własnościowe prawo do lokalu. To nie to samo i ma znaczenie przy kredycie.
- Metraż w metrach kwadratowych, układ pomieszczeń, piętro, winda, balkon, ekspozycja okien.
- Stan deweloperski, do odświeżenia, do remontu, pod klucz.
- Czynsz administracyjny, opłata za użytkowanie wieczyste.
- Zdolność kredytowa, wkład własny, promesa z banku.

Czego potrzebujesz od rozmówcy: czy kupuje czy sprzedaje, jaka lokalizacja go interesuje, jaki metraż, w jakim budżecie i czy ma już załatwiony kredyt.`,
}

const MOTORYZACJA: Branza = {
  id: 'motoryzacja',
  nazwa: 'Serwis samochodowy',
  pola: [{ klucz: 'marka_model', etykieta: 'Marka i model' }, { klucz: 'rocznik', etykieta: 'Rocznik' }, { klucz: 'przebieg', etykieta: 'Przebieg' }, { klucz: 'objaw', etykieta: 'Co się dzieje z autem' }, { klucz: 'termin_podstawienia', etykieta: 'Kiedy podstawi auto' }, { klucz: 'auto_zastepcze', etykieta: 'Auto zastępcze' }],
  pytania: ['Jakim samochodem Pan jeździ? Proszę podać markę i model.', 'Który to rocznik i ile mniej więcej ma przebiegu?', 'Proszę powiedzieć co się dzieje z autem.', 'Czy zapaliła się jakaś kontrolka na desce rozdzielczej?', 'Kiedy najwygodniej byłoby Panu podjechać do nas?', 'Czy na czas naprawy będzie Panu potrzebne auto zastępcze?'],
  przyklady: ['Jakim samochodem Pan jeździ?', 'Co się dzieje z autem?', 'Kiedy mógłby Pan podjechać?'],
  powitanie: 'Dzień dobry, z tej strony wirtualna asystentka {FIRMA}. Dzwonię w sprawie wizyty w serwisie. Czy rozmawiam z właścicielem samochodu?',
  cel: 'Dzwonisz, żeby umówić wizytę w serwisie samochodowym albo potwierdzić już umówioną.\n\nUstalasz po kolei: markę i model, rocznik, przebieg, co dokładnie dzieje się z autem i kiedy może je podstawić. Nie stawiasz diagnozy i nie podajesz ceny naprawy, bo to zależy od oględzin.',
  slownik: `Pojęcia, którymi posługują się rozmówcy. Rozpoznajesz je i rozumiesz, ale sam nie stawiasz diagnozy.

- Przegląd okresowy i badanie techniczne. To dwie różne rzeczy: pierwszą robi serwis, drugą stacja kontroli pojazdów.
- Wymiana oleju, filtrów, klocków i tarcz hamulcowych, rozrządu, płynu chłodniczego.
- Geometria kół, wyważanie, sezonowa wymiana opon, przechowalnia opon.
- Diagnostyka komputerowa, błędy sterownika, kontrolka silnika.
- Klimatyzacja: odgrzybianie, nabicie czynnika.
- Części oryginalne i zamienniki. Różnica jest w cenie i w gwarancji.
- Auto zastępcze, holowanie, naprawa z polisy OC sprawcy albo z autocasco.

Czego potrzebujesz od rozmówcy: marka i model, rocznik, przebieg, co dokładnie się dzieje z autem i kiedy może je podstawić.`,
}

const MEDYCYNA: Branza = {
  id: 'medycyna',
  nazwa: 'Gabinet lekarski lub stomatologiczny',
  pola: [{ klucz: 'specjalista', etykieta: 'Specjalista' }, { klucz: 'pierwsza_wizyta', etykieta: 'Pierwsza wizyta' }, { klucz: 'prywatnie_czy_nfz', etykieta: 'Prywatnie czy NFZ' }, { klucz: 'preferowany_termin_kontaktu', etykieta: 'Termin wizyty' }],
  pytania: ['Czy to wizyta pierwsza, czy kolejna?', 'U którego specjalisty?', 'Wizyta prywatna czy w ramach NFZ?', 'Jaki termin Panu odpowiada?', 'Czy woli Pan godziny poranne czy popołudniowe?'],
  przyklady: ['U którego specjalisty?', 'Wizyta prywatna czy na NFZ?', 'Jaki termin Panu pasuje?'],
  powitanie: 'Dzień dobry, z tej strony wirtualna asystentka {FIRMA}. Dzwonię w sprawie terminu wizyty. Czy rozmawiam z osobą, która się zapisywała?',
  cel: 'Dzwonisz wyłącznie po to, żeby umówić albo potwierdzić termin wizyty.\n\nUstalasz: czy to wizyta pierwsza czy kolejna, u którego specjalisty, prywatnie czy na NFZ, i jaki termin pasuje. Nie pytasz o nic więcej.',
  slownik: `Pojęcia, którymi posługują się rozmówcy. Rozpoznajesz je i rozumiesz.

- Wizyta pierwszorazowa i kontrolna, konsultacja, przegląd.
- Skierowanie, e-recepta, e-zwolnienie, teleporada.
- Wizyta prywatna i w ramach NFZ. To różne kolejki i różne ceny.
- W stomatologii: przegląd, higienizacja, wypełnienie, leczenie kanałowe, implant, proteza, aparat ortodontyczny.
- Znieczulenie miejscowe, sedacja.

Granica, której nie przekraczasz, jest tu ostrzejsza niż gdzie indziej:

- Nie pytasz o objawy, choroby, leki ani wyniki badań. Dane o zdrowiu to dane szczególnej kategorii i nie zbiera ich automat przez telefon.
- Nie oceniasz, czy coś jest pilne, i nie sugerujesz rozpoznania ani leczenia.
- Jeżeli rozmówca zaczyna opowiadać o dolegliwościach, mówisz, że te sprawy omówi z lekarzem podczas wizyty, i wracasz do ustalenia terminu.
- Przy sprawie nagłej mówisz, że w takiej sytuacji trzeba zadzwonić pod 112 albo zgłosić się do najbliższej placówki.

Czego potrzebujesz od rozmówcy: czy to wizyta pierwsza czy kolejna, u którego specjalisty, prywatnie czy na NFZ, oraz jaki termin mu pasuje.`,
}

const OGOLNA: Branza = {
  id: 'ogolna',
  nazwa: 'Bez wiedzy branżowej',
  slownik: '',
}

/**
 * Branża opisana przez klienta własnymi słowami.
 *
 * Lista poniżej jest skończona, a branż nie ma skończonej liczby. Firma,
 * której nie ma na liście, dostaje puste pole i wpisuje tam, czym się zajmuje
 * i co bot ma wiedzieć. Ten tekst trafia do scenariusza w to samo miejsce,
 * w które idzie nasz słownik branżowy, więc działa tak samo, tylko autorem
 * jest klient.
 */
export const BRANZA_WLASNA = 'wlasna'

const WLASNA: Branza = {
  id: BRANZA_WLASNA,
  nazwa: 'Inna branża, opiszę ją sam',
  slownik: '',
}

export const BRANZE: Branza[] = [OGOLNA, KREDYTY, FOTOWOLTAIKA, NIERUCHOMOSCI, MOTORYZACJA, MEDYCYNA, WLASNA]

/** Słownik branży albo pusty ciąg, gdy firma żadnej nie wybrała. */
export function slownikBranzy(id: string | null | undefined): string {
  if (!id) return ''
  const branza = BRANZE.find((b) => b.id === id)
  if (!branza || !branza.slownik) return ''
  return `${branza.slownik}\n\n${ZASTRZEZENIE}`
}

/** Czy identyfikator wskazuje na znaną branżę. */
export function znanaBranza(id: string | null | undefined): boolean {
  return BRANZE.some((b) => b.id === id)
}

/** Branża z listy albo nic, gdy identyfikator jest nieznany. */
export function znajdzBranze(id: string | null | undefined): Branza | null {
  if (!id) return null
  return BRANZE.find((b) => b.id === id) ?? null
}

/**
 * Powitanie bota dla danej branży i firmy.
 *
 * Puste znaczy: zostaw powitanie z szablonu. Tak jest dla branży ogólnej,
 * gdzie nie mamy nic lepszego do zaproponowania niż to, co już tam stoi.
 */
export function powitanieBranzy(id: string | null | undefined, nazwaFirmy: string): string {
  const branza = znajdzBranze(id)
  if (!branza?.powitanie) return ''
  return branza.powitanie.split('{FIRMA}').join(nazwaFirmy)
}

/**
 * Pełny scenariusz rozmowy dla branży i firmy.
 *
 * Kolejność jest celowa: najpierw kim jesteś i po co dzwonisz, potem reguły,
 * od których nie wolno odstąpić, na końcu słownik pojęć. Bot czyta to jak
 * instrukcję, a nie jak encyklopedię, więc to, co najważniejsze, idzie
 * najwyżej.
 */
export function scenariuszBranzy(id: string | null | undefined, nazwaFirmy: string): string {
  const branza = znajdzBranze(id)
  if (!branza?.cel) return ''
  const czesci = [
    `Jesteś asystentem głosowym ${nazwaFirmy}. Rozmawiasz po polsku.`,
    branza.cel.split('{FIRMA}').join(nazwaFirmy),
    REGULY_STALE,
    branza.slownik,
  ]
  if (branza.id === 'kredyty') czesci.push(ZASTRZEZENIE)
  return czesci.filter(Boolean).join('\n\n')
}

/** Gotowy zestaw pytań dla branży, jako tekst do pola formularza. */
export function pytaniaBranzy(id: string | null | undefined): string {
  return (znajdzBranze(id)?.pytania ?? []).join('\n')
}

/** Pola, które w tej branży mają pojawić się jako kolumny wyniku rozmowy. */
export function polaBranzy(id: string | null | undefined): Array<{ klucz: string; etykieta: string }> {
  return znajdzBranze(id)?.pola ?? []
}
