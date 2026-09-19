/**
 * Dopełniacz nazwy firmy regułą, bez modelu i bez sieci.
 *
 * Nazwa firmy zaczyna się zwykle od rzeczownika pospolitego: Kancelaria,
 * Warsztat, Gabinet. Ten rzeczownik odmieniamy ze słownika, a przymiotniki
 * po nim dopasowujemy do jego rodzaju: "Kancelaria Bankowa" daje
 * "Kancelarii Bankowej", "Warsztat Samochodowy" daje "Warsztatu
 * Samochodowego". Nazwisk, marek i słów spoza słownika nie ruszamy:
 * "Kancelaria Nowak" daje "Kancelarii Nowak". Gdy pierwsze słowo jest
 * nieznane, zwracamy nazwę bez zmian, bo zła odmiana brzmi gorzej niż jej brak.
 */

type Rodzaj = 'z' | 'm' | 'n'

/** Rzeczownik w mianowniku -> [dopełniacz, rodzaj]. Małe litery. */
const RZECZOWNIKI: Record<string, [string, Rodzaj]> = {
  kancelaria: ['kancelarii', 'z'],
  firma: ['firmy', 'z'],
  spółka: ['spółki', 'z'],
  agencja: ['agencji', 'z'],
  przychodnia: ['przychodni', 'z'],
  klinika: ['kliniki', 'z'],
  lecznica: ['lecznicy', 'z'],
  hurtownia: ['hurtowni', 'z'],
  pracownia: ['pracowni', 'z'],
  szkoła: ['szkoły', 'z'],
  fundacja: ['fundacji', 'z'],
  grupa: ['grupy', 'z'],
  restauracja: ['restauracji', 'z'],
  piekarnia: ['piekarni', 'z'],
  cukiernia: ['cukierni', 'z'],
  drukarnia: ['drukarni', 'z'],
  apteka: ['apteki', 'z'],
  księgarnia: ['księgarni', 'z'],
  warsztat: ['warsztatu', 'm'],
  gabinet: ['gabinetu', 'm'],
  serwis: ['serwisu', 'm'],
  sklep: ['sklepu', 'm'],
  salon: ['salonu', 'm'],
  zakład: ['zakładu', 'm'],
  dom: ['domu', 'm'],
  hotel: ['hotelu', 'm'],
  bank: ['banku', 'm'],
  instytut: ['instytutu', 'm'],
  ośrodek: ['ośrodka', 'm'],
  punkt: ['punktu', 'm'],
  klub: ['klubu', 'm'],
  dentysta: ['dentysty', 'm'],
  mechanik: ['mechanika', 'm'],
  doradca: ['doradcy', 'm'],
  biuro: ['biura', 'n'],
  studio: ['studia', 'n'],
  centrum: ['centrum', 'n'],
  przedsiębiorstwo: ['przedsiębiorstwa', 'n'],
  laboratorium: ['laboratorium', 'n'],
}

const NIEODMIENNE = new Set(['i', 'oraz', 'sp.', 'z', 'o.o.', 'sp', 's.a.', 'sa', 'wspólnicy', 'partnerzy', 'synowie'])

/** Zachowuje wielkość pierwszej litery słowa wzorcowego. */
function jakWzor(wzor: string, slowo: string): string {
  if (wzor[0] === wzor[0].toUpperCase() && wzor[0] !== wzor[0].toLowerCase()) {
    return slowo[0].toUpperCase() + slowo.slice(1)
  }
  return slowo
}

/**
 * Przymiotnik dopasowany do rodzaju rzeczownika, albo null, gdy słowo nie
 * wygląda na przymiotnik. Nazwiska na -ski i -cki traktujemy jak przymiotniki
 * ("Warsztatu Kowalskiego"), pozostałe nazwiska zostają.
 */
function przymiotnik(slowo: string, rodzaj: Rodzaj): string | null {
  const s = slowo.toLowerCase()
  if (rodzaj === 'z') {
    if (/(ow|n|sk|ck|dz|cz|ln|rn|tn|jn|szn|żn|wn)a$/.test(s)) return jakWzor(slowo, s.slice(0, -1) + 'ej')
    return null
  }
  if (rodzaj === 'm') {
    if (/(ow|n|sk|ck|dz|cz|ln|rn|tn|jn|szn|żn|wn)y$/.test(s)) return jakWzor(slowo, s.slice(0, -1) + 'ego')
    if (/(sk|ck|dz|g|k)i$/.test(s)) return jakWzor(slowo, s.slice(0, -1) + 'iego')
    return null
  }
  if (/(ow|n|sk|ck|dz|cz|ln|rn|tn|jn|szn|żn|wn)e$/.test(s)) return jakWzor(slowo, s.slice(0, -1) + 'ego')
  if (/(sk|ck|g|k)ie$/.test(s)) return jakWzor(slowo, s.slice(0, -2) + 'iego')
  return null
}

export function dopelniaczRegula(nazwa: string): string {
  const czysta = nazwa.trim().replace(/\s+/g, ' ')
  if (!czysta) return czysta
  const slowa = czysta.split(' ')
  const pierwsze = slowa[0]
  const wpis = RZECZOWNIKI[pierwsze.toLowerCase()]
  if (!wpis) return czysta

  const [dop, rodzaj] = wpis
  const wynik = [jakWzor(pierwsze, dop)]
  // Odmieniamy przymiotniki tylko bezposrednio po rzeczowniku. Pierwsze slowo,
  // ktore nie jest przymiotnikiem, konczy odmiane: "Kancelarii Nowak i Wspolnicy".
  let odmieniamy = true
  for (const slowo of slowa.slice(1)) {
    if (odmieniamy && !NIEODMIENNE.has(slowo.toLowerCase())) {
      const p = przymiotnik(slowo, rodzaj)
      if (p) {
        wynik.push(p)
        continue
      }
    }
    odmieniamy = false
    wynik.push(slowo)
  }
  return wynik.join(' ')
}
