import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import { ocenNumer } from '../dozwolone-numery'

let poprzednieKraje: string | undefined
beforeEach(() => {
  poprzednieKraje = process.env.VOICEBOT_DOZWOLONE_KRAJE
  delete process.env.VOICEBOT_DOZWOLONE_KRAJE
})
afterEach(() => {
  if (poprzednieKraje === undefined) delete process.env.VOICEBOT_DOZWOLONE_KRAJE
  else process.env.VOICEBOT_DOZWOLONE_KRAJE = poprzednieKraje
})

describe('ocenNumer', () => {
  // Zwykły polski numer klienta ma być dostępny bez dodatkowej konfiguracji.
  it('dopuszcza polski numer', () => {
    expect(ocenNumer('+48500100200')).toEqual({ ok: true })
  })

  // Zakresy usługowe są blokowane mimo poprawnej długości, aby ograniczyć koszty.
  it.each([
    ['70', '+48700100200'], ['300', '+48300100200'], ['400', '+48400100200'],
  ])('odrzuca zakres %s', (zakres, phone) => {
    expect(ocenNumer(phone)).toEqual({ ok: false, powod: expect.stringContaining(`zakresu ${zakres}`) })
  })

  // Domyślna blokada zagranicy zapobiega niezamierzonym płatnym połączeniom.
  it('odrzuca numer zagraniczny', () => {
    expect(ocenNumer('+4915112345678')).toEqual({ ok: false, powod: expect.stringContaining('spoza dozwolonych krajów') })
  })

  // Sprawdzamy oba kierunki błędu długości, żeby nie dopuścić niepełnych ani nadmiarowych cyfr.
  it.each(['+4850010020', '+485001002000'])('odrzuca błędną długość: %s', (phone) => {
    expect(ocenNumer(phone)).toEqual({ ok: false, powod: expect.stringContaining('dziewięć cyfr') })
  })

  // Jawne rozszerzenie listy ma odblokować wskazany kraj, bez odblokowania wszystkich pozostałych.
  it('rozszerza listę krajów przez zmienną środowiskową', () => {
    process.env.VOICEBOT_DOZWOLONE_KRAJE = '+48, +49'
    expect(ocenNumer('+4915112345678')).toEqual({ ok: true })
    expect(ocenNumer('+48500100200')).toEqual({ ok: true })
    expect(ocenNumer('+33612345678').ok).toBe(false)
    expect(ocenNumer('+48700100200').ok).toBe(false)
  })
})
