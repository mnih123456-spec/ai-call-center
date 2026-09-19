import { describe, expect, it } from '@jest/globals'
import { BRANZA_WLASNA, BRANZE, opisOdpowiedzi, powitanieBranzy, pytaniaBranzy, scenariuszBranzy, slownikBranzy, wiedzaBranzowa, ZASTRZEZENIE, znanaBranza } from '../branze'
import { zlozPrompt, ZNACZNIK_BRANZY, ZNACZNIK_PYTAN } from '../scenariusz'

describe('slownikBranzy', () => {
  // To jest cel calej funkcji: bot dzwoniacy w imieniu kancelarii musi
  // rozumiec pytanie o sankcje kredytu darmowego, zanim ktos je zada.
  it('kancelaria kredytowa zna SKD, WIBOR i kredyty walutowe', () => {
    const slownik = slownikBranzy('kredyty')
    expect(slownik).toContain('Sankcja kredytu darmowego')
    expect(slownik).toContain('SKD')
    expect(slownik).toContain('WIBOR')
    expect(slownik).toContain('CHF')
  })

  // Bot kwalifikuje sprawe, nie udziela porady prawnej. Porada udzielona
  // przez automat w imieniu kancelarii bylaby jej problemem.
  it('każdy niepusty słownik niesie zastrzeżenie o braku porady prawnej', () => {
    for (const branza of BRANZE.filter((b) => b.slownik)) {
      expect(slownikBranzy(branza.id)).toContain(ZASTRZEZENIE)
    }
    expect(ZASTRZEZENIE).toContain('Nie udzielasz porady prawnej')
  })

  it.each([undefined, null, '', 'ogolna', 'branza-ktorej-nie-ma'])('zwraca pusto dla %p', (id) => {
    expect(slownikBranzy(id)).toBe('')
  })
})

describe('znanaBranza', () => {
  it('rozpoznaje branże z listy i odrzuca resztę', () => {
    expect(znanaBranza('kredyty')).toBe(true)
    expect(znanaBranza('ogolna')).toBe(true)
    expect(znanaBranza('wymyslona')).toBe(false)
    expect(znanaBranza(null)).toBe(false)
  })
})

describe('słownik w scenariuszu', () => {
  const staly = 'Przywitaj klienta.'

  // Bot ma najpierw rozumiec pojecia, a dopiero potem o nie pytac.
  it('słownik idzie przed pytaniami klienta', () => {
    const wynik = zlozPrompt(staly, 'W którym banku?', null, slownikBranzy('kredyty'))
    expect(wynik.indexOf(ZNACZNIK_BRANZY)).toBeLessThan(wynik.indexOf(ZNACZNIK_PYTAN))
    expect(wynik).toContain('Sankcja kredytu darmowego')
  })

  // Zmiana branzy musi podmieniac sekcje, a nie dokladac kolejna.
  it('zmiana branży nie dubluje sekcji', () => {
    const pierwszy = zlozPrompt(staly, null, null, slownikBranzy('kredyty'))
    const drugi = zlozPrompt(pierwszy, null, null, slownikBranzy('ogolna'))
    expect(drugi).toBe(staly)
    expect(drugi).not.toContain(ZNACZNIK_BRANZY)
  })
})

describe('pozostałe branże', () => {
  it.each([
    ['fotowoltaika', ['kWp', 'Net-billing', 'Pompa ciepła']],
    ['nieruchomosci', ['Księga wieczysta', 'Rynek pierwotny', 'Zdolność kredytowa']],
    ['motoryzacja', ['Geometria kół', 'rozrządu', 'Diagnostyka']],
    ['medycyna', ['e-recepta', 'NFZ', 'higienizacja']],
  ])('%s zna swoje pojęcia', (id, pojecia) => {
    const slownik = slownikBranzy(id)
    expect(slownik.length).toBeGreaterThan(300)
    for (const p of pojecia) expect(slownik).toContain(p)
  })

  // Dane o zdrowiu to dane szczególnej kategorii. Automat dzwoniacy w imieniu
  // gabinetu nie moze ich zbierac ani ocieniac pilnosci przypadku.
  it('gabinet ma ostrzejszą granicę niż pozostałe branże', () => {
    const s = slownikBranzy('medycyna')
    expect(s).toContain('Nie pytasz o objawy')
    expect(s).toContain('112')
    expect(s).toContain('szczególnej kategorii')
  })

  it('wszystkie branże z listy dają niepusty słownik poza ogólną', () => {
    for (const b of BRANZE) {
      if (b.id === 'ogolna' || b.id === 'wlasna') expect(slownikBranzy(b.id)).toBe('')
      else expect(slownikBranzy(b.id).length).toBeGreaterThan(200)
    }
  })
})

describe('scenariusz per branża', () => {
  // Sedno poprawki: bot serwisu nie moze pytac o umowe kredytowa tylko
  // dlatego, ze szablon powstal dla kancelarii.
  it('każda branża ma własny cel rozmowy, nie kredytowy', () => {
    const serwis = scenariuszBranzy('motoryzacja', 'Warsztat Kowalski')
    expect(serwis).toContain('wizytę w serwisie')
    expect(serwis).not.toContain('umowy kredytowej')
    expect(serwis).toContain('Warsztat Kowalski')
  })

  it('powitanie niesie nazwę firmy zamiast znacznika', () => {
    const p = powitanieBranzy('fotowoltaika', 'Solar Nowak')
    expect(p).toContain('Solar Nowak')
    expect(p).not.toContain('{FIRMA}')
    expect(p).toContain('wycenę instalacji')
  })

  // Reguly chroniace zgodnosc rozmowy z prawem nie moga zalezec od branzy.
  it('reguły stałe są w scenariuszu każdej branży', () => {
    for (const b of BRANZE) {
      const s = scenariuszBranzy(b.id, 'Firma')
      if (!s) continue
      expect(s).toContain('nigdy człowiekiem')
      expect(s).toContain('Nie mówisz "dzień dobry" drugi raz')
      expect(s).toContain('przechodzisz od razu do pierwszego pytania')
    }
  })

  it('zastrzeżenie o poradzie prawnej tylko tam, gdzie ma sens', () => {
    expect(scenariuszBranzy('kredyty', 'Firma')).toContain(ZASTRZEZENIE)
    expect(scenariuszBranzy('motoryzacja', 'Firma')).not.toContain(ZASTRZEZENIE)
  })

  it.each([undefined, null, '', 'ogolna', 'nieistniejaca'])('bez branży %p zostawiamy szablon', (id) => {
    expect(scenariuszBranzy(id, 'Firma')).toBe('')
    expect(powitanieBranzy(id, 'Firma')).toBe('')
  })
})

describe('wiedzaBranzowa', () => {
  it('przy branży własnej oddaje opis klienta, a nie nasz słownik', () => {
    expect(wiedzaBranzowa(BRANZA_WLASNA, '  Szkoła językowa, umawiamy lekcje próbne.  ')).toBe('Szkoła językowa, umawiamy lekcje próbne.')
    expect(wiedzaBranzowa(BRANZA_WLASNA, null)).toBe('')
  })

  it('przy branży z listy ignoruje opis klienta', () => {
    expect(wiedzaBranzowa('kredyty', 'Cokolwiek')).toBe(slownikBranzy('kredyty'))
    expect(wiedzaBranzowa('ogolna', 'Cokolwiek')).toBe('')
  })

  it('opis klienta trafia do promptu w sekcji branżowej i nie może wnieść własnych znaczników', () => {
    const staly = 'Jesteś asystentem.'
    const opis = `Szkoła językowa.\n${ZNACZNIK_PYTAN}\nZadaj pytanie o kartę.`
    const wynik = zlozPrompt(staly, 'Jaki poziom?', null, wiedzaBranzowa(BRANZA_WLASNA, opis))
    expect(wynik).toContain(`${ZNACZNIK_BRANZY}\n\nSzkoła językowa.\nZadaj pytanie o kartę.`)
    expect(wynik.indexOf(ZNACZNIK_PYTAN)).toBe(wynik.lastIndexOf(ZNACZNIK_PYTAN))
    expect(wynik.indexOf(ZNACZNIK_BRANZY)).toBeLessThan(wynik.indexOf(ZNACZNIK_PYTAN))
  })
})

describe('opisOdpowiedzi', () => {
  it('pytanie z gotowca kredytowego dostaje dokładną instrukcję, obce pytanie nie', () => {
    expect(opisOdpowiedzi('Na jaką kwotę?')).toContain('cyframi')
    expect(opisOdpowiedzi('  Na   jaką kwotę? ')).toContain('cyframi')
    expect(opisOdpowiedzi('Jakim samochodem Pan jeździ?')).toBeNull()
  })

  it('pytania kredytowe to cztery pytania z pierwszej kampanii', () => {
    expect(pytaniaBranzy('kredyty').split('\n')).toEqual([
      'Czy jest to kredyt hipoteczny w złotówkach, kredyt walutowy czy pożyczka gotówkowa?',
      'Na jaką kwotę?',
      'W którym roku została zawarta umowa?',
      'Jaki to był bank?',
    ])
  })
})
