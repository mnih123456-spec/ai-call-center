/**
 * Wiedza branżowa wgrana przez nas, a nie pobrana z cudzej strony.
 *
 * Firma wybiera branżę z listy, a my doklejamy do scenariusza słownik pojęć,
 * którymi posługują się jej klienci. Bez tego bot dzwoniący w imieniu
 * kancelarii kredytowej nie rozumie pytania "chodzi o tę sankcję kredytu
 * darmowego?", a to pierwsze pytanie, jakie pada.
 *
 * Treść jest nasza i sprawdzona, w odróżnieniu od wiedzy ze strony klienta.
 * Dlatego siedzi w osobnej sekcji promptu: tamtą pisze klient, tę my.
 */

export type Branza = {
  id: string
  nazwa: string
  slownik: string
}

/**
 * Granica, której bot nie przekracza.
 *
 * Bot kwalifikuje sprawę i umawia kontakt. Nie ocenia szans, nie podaje kwot
 * i nie mówi, czy komuś "należy się". Porada prawna udzielona przez automat
 * w imieniu kancelarii byłaby jej problemem, nie dzwoniącego.
 */
export const ZASTRZEZENIE = `Nie udzielasz porady prawnej i nie oceniasz szans w sprawie. Nie podajesz wysokosci roszczenia ani kosztow. Gdy rozmowca pyta o ocene swojej sprawy, mowisz, ze zajmie sie tym prawnik po zapoznaniu sie z umowa, i umawiasz kontakt.`

const KREDYTY: Branza = {
  id: 'kredyty',
  nazwa: 'Kancelaria kredytowa',
  slownik: `Pojecia, ktorymi posluguja sie rozmowcy. Rozpoznajesz je i rozumiesz, ale sam nie wykladasz prawa.

- Sankcja kredytu darmowego, w skrocie SKD. Uprawnienie konsumenta z ustawy o kredycie konsumenckim. Jezeli bank naruszyl obowiazki informacyjne przy zawieraniu umowy, konsument moze po zlozeniu pisemnego oswiadczenia splacac kredyt bez odsetek i bez pozostalych kosztow. Dotyczy kredytow konsumenckich, czyli zwykle gotowkowych i konsolidacyjnych. Uprawnienie jest ograniczone terminem liczonym od wykonania umowy, wiec data zawarcia i status splaty maja znaczenie.
- Sprawa WIBOR. Podwazanie klauzuli oprocentowania zmiennego opartego na wskazniku WIBOR w kredycie zlotowym, zwykle hipotecznym. Rozmowca powie "kredyt na WIBORze" albo "zmienne oprocentowanie".
- Kredyt walutowy, frankowy, CHF. Kredyt indeksowany lub denominowany do obcej waluty. Rozmowca powie "frankowicz", "odfrankowienie", "przewalutowanie" albo "uniewaznienie umowy".
- Oplata wstepna, w skrocie OW. Kwota placona przy zleceniu sprawy.
- Wynagrodzenie za sukces, success fee, w skrocie SF. Czesc wynagrodzenia platna dopiero po wygranej.
- Oplata sadowa. Koszt wnoszony do sadu przez klienta, niezalezny od wynagrodzenia kancelarii.
- Zaswiadczenie z banku, historia splat, harmonogram. Dokumenty, o ktore kancelaria poprosi na kolejnym etapie.
- Cesja, pelnomocnictwo, wezwanie do zaplaty, pozew. Kolejne kroki prowadzenia sprawy.

Czego potrzebujesz od rozmowcy: o ktory produkt chodzi, w ktorym banku, z ktorego roku jest umowa, czy kredyt jest splacony czy splacany, i na jaka kwote byl zaciagniety. Tego wystarczy, reszte ustali prawnik.`,
}

const OGOLNA: Branza = {
  id: 'ogolna',
  nazwa: 'Bez wiedzy branżowej',
  slownik: '',
}

export const BRANZE: Branza[] = [OGOLNA, KREDYTY]

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
