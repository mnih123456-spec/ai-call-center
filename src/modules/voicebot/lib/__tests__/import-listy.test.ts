import { describe, expect, it } from '@jest/globals'
import { numerZListy, parsujListe } from '../import-listy'

describe('numerZListy', () => {
  // Normalizacja prefiksów zapobiega skierowaniu połączenia do niewłaściwego kraju.
  it.each([
    ['500100201', '+48500100201'],
    ['500 100 201', '+48500100201'],
    ['004915112345678', '+4915112345678'],
    ['+4915112345678', '+4915112345678'],
  ])('normalizuje %s do %s', (wejscie, wynik) => {
    expect(numerZListy(wejscie)).toBe(wynik)
  })

  // Niepełne i puste numery nie mogą trafić do kolejki połączeń.
  it.each([undefined, '', '   ', 'brak', '123'])('odrzuca %p', (numer) => {
    expect(numerZListy(numer)).toBeNull()
  })
})

describe('parsujListe', () => {
  // Każdy separator musi zachować wszystkie pola, aby import z arkusza nie zgubił danych.
  it.each([',', ';', '\t'])('rozdziela pola separatorem %p', (separator) => {
    expect(parsujListe(['500100201', ' Anna ', ' Nowak ', ' lead-1 '].join(separator))).toEqual({
      pozycje: [{ phone: '+48500100201', firstName: 'Anna', lastName: 'Nowak', leadRef: 'lead-1' }],
      bledy: [],
      pominieteDuplikaty: 0,
    })
  })

  // Błąd jednego wiersza nie blokuje pozostałych; numer uwzględnia też puste wiersze.
  it('raportuje wadliwy wiersz i przyjmuje poprawne wiersze przed nim i po nim', () => {
    const wynik = parsujListe('500100201\r\n\r\nbrak;Anna\r\n+4915112345678')
    expect(wynik.pozycje.map((p) => p.phone)).toEqual(['+48500100201', '+4915112345678'])
    expect(wynik.bledy).toEqual([{
      wiersz: 3,
      tresc: 'brak;Anna',
      powod: expect.any(String),
    }])
    expect(wynik.bledy[0].powod.length).toBeGreaterThan(0)
    expect(wynik.pominieteDuplikaty).toBe(0)
  })

  // Duplikaty liczymy po normalizacji, by różne zapisy numeru nie powodowały wielu telefonów.
  it('pomija powtórzenia i zachowuje dane pierwszego wystąpienia', () => {
    expect(parsujListe('500100201;Anna\n500100201;Jan\n+48500100201\n0048500100201')).toEqual({
      pozycje: [{ phone: '+48500100201', firstName: 'Anna', lastName: null, leadRef: null }],
      bledy: [],
      pominieteDuplikaty: 3,
    })
  })

  // Lista z reklam może zawierać wyłącznie numer; brak nazwiska nie jest błędem importu.
  it('przyjmuje sam numer', () => {
    expect(parsujListe('500100201')).toEqual({
      pozycje: [{ phone: '+48500100201', firstName: null, lastName: null, leadRef: null }],
      bledy: [],
      pominieteDuplikaty: 0,
    })
  })

  // Puste wklejenie nie powinno tworzyć ani kontaktów, ani pozornych błędów.
  it('pomija puste wiersze', () => {
    expect(parsujListe(' \r\n\t\n')).toEqual({ pozycje: [], bledy: [], pominieteDuplikaty: 0 })
  })
})
