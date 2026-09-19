import { describe, expect, it } from '@jest/globals'
import { BRANZE, slownikBranzy, ZASTRZEZENIE, znanaBranza } from '../branze'
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
