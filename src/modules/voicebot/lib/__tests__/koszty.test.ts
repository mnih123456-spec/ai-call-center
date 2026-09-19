import { describe, expect, it } from '@jest/globals'
import { kosztWierszaPln, naZlote, sumaUsd } from '../koszty'

describe('sumaUsd', () => {
  // Dokładna suma ułamków chroni raport przed narastaniem błędów zmiennoprzecinkowych.
  it('sumuje wiele wierszy z dokładnością do mikroDolara', () => {
    expect(sumaUsd(['0.1', '0.2', '1.234567', '0.000001'].map((costUsd) => ({ costUsd })))).toBe(1.534568)
  })

  // Niepoprawne dane nie mogą zatruć całego podsumowania wartością NaN lub Infinity.
  it('pomija puste i niepoprawne wartości, zachowując poprawne', () => {
    const koszty = [null, '', ' ', 'abc', 'NaN', 'Infinity', '-Infinity', '0.10', '0.20']
    expect(sumaUsd(koszty.map((costUsd) => ({ costUsd })))).toBe(0.3)
    expect(sumaUsd([])).toBe(0)
  })
})

describe('naZlote', () => {
  // Jawne kwoty kontrolują kurs i zaokrąglenie bez powielania wzoru produkcyjnego.
  it.each([[0, '0.00'], [1, '3.70'], [0.01, '0.04'], [2.345, '8.68']])(
    'przelicza %s USD na %s PLN z dwoma miejscami po przecinku', (usd, pln) => {
      expect(naZlote(usd)).toBe(pln)
    },
  )
})

describe('kosztWierszaPln', () => {
  // Grosze ułatwiają odczyt małych kosztów; granica 100 groszy przełącza jednostkę na złote.
  it.each([
    ['0.01', '4 gr'], ['0.10', '37 gr'], ['0.267', '99 gr'],
    ['0.27', '1.00 zł'], ['1', '3.70 zł'], ['2.345', '8.68 zł'],
  ])('formatuje %s USD jako %s', (usd, oczekiwany) => {
    expect(kosztWierszaPln(usd)).toBe(oczekiwany)
  })

  // Brak kosztu i uszkodzone wartości nie powinny pokazywać klientowi pozornej opłaty.
  it.each([null, '', ' ', '0', '0.000000', 'abc', 'NaN', 'Infinity', '-Infinity'])(
    'nie wyświetla kosztu dla %p', (usd) => {
      expect(kosztWierszaPln(usd)).toBe('')
    },
  )
})
