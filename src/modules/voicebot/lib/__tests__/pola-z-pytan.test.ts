import { describe, expect, it } from '@jest/globals'
import { dataCollectionDlaDostawcy, kluczPytania, LIMIT_POL, polaZPytan } from '../pola-z-pytan'

describe('kluczPytania', () => {
  it('robi z pytania klucz techniczny bez ogonków', () => {
    expect(kluczPytania('Jaka marka i model?')).toBe('jaka_marka_i_model')
    expect(kluczPytania('Czy umowa jest nadal aktywna?')).toBe('czy_umowa_jest_nadal_aktywna')
    expect(kluczPytania('Jaki przebieg ma auto?')).toBe('jaki_przebieg_ma_auto')
  })

  // Klucz bierze sie z tresci, nie z pozycji: przestawienie pytan nie moze
  // rozjechac kolumny z danymi zebranymi wczesniej.
  it('ten sam tekst daje ten sam klucz niezależnie od miejsca na liście', () => {
    const a = polaZPytan('Pierwsze?\nJaki bank?')
    const b = polaZPytan('Jaki bank?\nPierwsze?')
    expect(a.find((p) => p.etykieta === 'Jaki bank?')?.klucz)
      .toBe(b.find((p) => p.etykieta === 'Jaki bank?')?.klucz)
  })

  it.each(['', '   ', '???', '!!!'])('z pustego pytania %p robi klucz zastępczy', (p) => {
    expect(kluczPytania(p)).toBe('pytanie')
  })
})

describe('polaZPytan', () => {
  it.each([undefined, null, '', ' \n\t '])('brak pytań %p daje brak pól', (p) => {
    expect(polaZPytan(p)).toEqual([])
  })

  it('pomija puste wiersze i przycina białe znaki', () => {
    const pola = polaZPytan('  Jaki bank?  \n\n\n  Z którego roku?  ')
    expect(pola.map((p) => p.etykieta)).toEqual(['Jaki bank?', 'Z którego roku?'])
  })

  // Dwa rozne pytania moga po uproszczeniu dac ten sam klucz. Bez rozroznienia
  // jedna odpowiedz nadpisalaby druga.
  it('rozróżnia pytania, które dają ten sam klucz', () => {
    const pola = polaZPytan('Jaki bank?\nJaki bank obsługuje kredyt?\nJaki bank!')
    const klucze = pola.map((p) => p.klucz)
    expect(new Set(klucze).size).toBe(klucze.length)
  })

  it('ogranicza liczbę pól, żeby rozmowa nie stała się ankietą', () => {
    const duzo = Array.from({ length: LIMIT_POL + 5 }, (_, i) => `Pytanie numer ${i}?`).join('\n')
    expect(polaZPytan(duzo)).toHaveLength(LIMIT_POL)
  })

  it('skraca bardzo długie pytanie w etykiecie', () => {
    const dlugie = 'Czy ' + 'bardzo '.repeat(40) + 'długie pytanie?'
    expect(polaZPytan(dlugie)[0].etykieta.length).toBeLessThanOrEqual(60)
  })
})

describe('dataCollectionDlaDostawcy', () => {
  it('opisuje każde pole tekstem i treścią pytania', () => {
    const dc = dataCollectionDlaDostawcy(polaZPytan('Jaki przebieg?'))
    const pole = dc['jaki_przebieg'] as { type: string; description: string }
    expect(pole.type).toBe('string')
    expect(pole.description).toContain('Jaki przebieg?')
  })

  // Bot ma zapisac to, co powiedzial rozmowca, a nie interpretowac
  // "chyba tak" jako prawde logiczna.
  it('wszystko jest tekstem, nie wartością logiczną', () => {
    const dc = dataCollectionDlaDostawcy(polaZPytan('Czy auto jest sprawne?\nCzy ma gwarancję?'))
    for (const pole of Object.values(dc)) {
      expect((pole as { type: string }).type).toBe('string')
    }
  })

  it('brak pytań daje pusty zestaw pól', () => {
    expect(dataCollectionDlaDostawcy([])).toEqual({})
  })
})
