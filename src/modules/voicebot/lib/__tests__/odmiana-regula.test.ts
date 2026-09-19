import { describe, expect, it } from '@jest/globals'
import { dopelniaczRegula } from '../odmiana-regula'

describe('dopelniaczRegula', () => {
  it('rzeczownik ze słownika i przymiotnik w jego rodzaju', () => {
    expect(dopelniaczRegula('Kancelaria Bankowa')).toBe('Kancelarii Bankowej')
    expect(dopelniaczRegula('Kancelaria Prawna Nowak')).toBe('Kancelarii Prawnej Nowak')
    expect(dopelniaczRegula('Warsztat Samochodowy')).toBe('Warsztatu Samochodowego')
    expect(dopelniaczRegula('Biuro Rachunkowe')).toBe('Biura Rachunkowego')
    expect(dopelniaczRegula('Gabinet Stomatologiczny')).toBe('Gabinetu Stomatologicznego')
  })

  it('nazwiska na -ski jak przymiotniki, inne nazwiska bez zmian', () => {
    expect(dopelniaczRegula('Warsztat Kowalski')).toBe('Warsztatu Kowalskiego')
    expect(dopelniaczRegula('Kancelaria Nowak')).toBe('Kancelarii Nowak')
    expect(dopelniaczRegula('Kancelaria Kowalski i Wspólnicy')).toBe('Kancelarii Kowalski i Wspólnicy')
    expect(dopelniaczRegula('Dentysta Kowalczyk')).toBe('Dentysty Kowalczyk')
  })

  it('nieznane pierwsze słowo zostawia nazwę w spokoju', () => {
    expect(dopelniaczRegula('Solar Nowak')).toBe('Solar Nowak')
    expect(dopelniaczRegula('samciągpług')).toBe('samciągpług')
    expect(dopelniaczRegula('AdSignio')).toBe('AdSignio')
    expect(dopelniaczRegula('')).toBe('')
  })
})
