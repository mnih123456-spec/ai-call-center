import { describe, expect, it } from '@jest/globals'
import { filtrujNumery, ocenGlosy, ocenProgi, poczatekMiesiaca, PROGI_DOMYSLNE, type Progi } from '../limity'

const bezLimitu: Progi = { minutesPerMonth: null, maxVoices: null, maxConcurrentCalls: null }

describe('ocenProgi', () => {
  // Firma bez ustawionych progow ma dzwonic. Wolimy zobaczyc rachunek niz
  // tlumaczyc klientowi, czemu kampania nie ruszyla w dniu wdrozenia.
  it('przepuszcza firmę bez ustawionych progów', () => {
    expect(ocenProgi(bezLimitu, { minutyWMiesiacu: 100000, rozmowyTeraz: 50 })).toEqual({ wolno: true })
    expect(PROGI_DOMYSLNE).toEqual(bezLimitu)
  })

  it('przepuszcza, dopóki zużycie jest poniżej progu', () => {
    const progi: Progi = { minutesPerMonth: 100, maxVoices: null, maxConcurrentCalls: 3 }
    expect(ocenProgi(progi, { minutyWMiesiacu: 99, rozmowyTeraz: 2 })).toEqual({ wolno: true })
  })

  // Wyczerpane minuty trwaja do konca miesiaca, wiec rozmowe trzeba zamknac,
  // a nie odkladac w nieskonczonosc.
  it('odmawia trwale po wyczerpaniu minut', () => {
    const wynik = ocenProgi(
      { minutesPerMonth: 100, maxVoices: null, maxConcurrentCalls: null },
      { minutyWMiesiacu: 100, rozmowyTeraz: 0 },
    )
    expect(wynik.wolno).toBe(false)
    if (!wynik.wolno) {
      expect(wynik.trwale).toBe(true)
      expect(wynik.powod).toContain('100 minut')
    }
  })

  // Zajete linie zwolnia sie za chwile, wiec to odmowa chwilowa i rozmowa
  // ma wrocic do kolejki, a nie zginac.
  it('odmawia chwilowo przy zajętych liniach', () => {
    const wynik = ocenProgi(
      { minutesPerMonth: null, maxVoices: null, maxConcurrentCalls: 2 },
      { minutyWMiesiacu: 0, rozmowyTeraz: 2 },
    )
    expect(wynik.wolno).toBe(false)
    if (!wynik.wolno) expect(wynik.trwale).toBe(false)
  })

  // Minuty sa wazniejsze: przekroczony budzet nie przestaje byc przekroczony
  // przez to, ze akurat wszystkie linie sa wolne.
  it('minuty mają pierwszeństwo przed liniami', () => {
    const wynik = ocenProgi(
      { minutesPerMonth: 10, maxVoices: null, maxConcurrentCalls: 1 },
      { minutyWMiesiacu: 10, rozmowyTeraz: 1 },
    )
    expect(wynik.wolno).toBe(false)
    if (!wynik.wolno) expect(wynik.trwale).toBe(true)
  })

  // Zero minut to swiadome zatrzymanie firmy, na przyklad za brak platnosci.
  it('próg zero zatrzymuje wszystkie rozmowy', () => {
    const wynik = ocenProgi(
      { minutesPerMonth: 0, maxVoices: null, maxConcurrentCalls: null },
      { minutyWMiesiacu: 0, rozmowyTeraz: 0 },
    )
    expect(wynik.wolno).toBe(false)
  })

  it('ujemny próg traktujemy jak brak progu', () => {
    expect(ocenProgi(
      { minutesPerMonth: -1, maxVoices: null, maxConcurrentCalls: -5 },
      { minutyWMiesiacu: 999, rozmowyTeraz: 999 },
    )).toEqual({ wolno: true })
  })
})

describe('ocenGlosy', () => {
  it('przepuszcza poniżej progu i odmawia na progu', () => {
    const progi: Progi = { minutesPerMonth: null, maxVoices: 3, maxConcurrentCalls: null }
    expect(ocenGlosy(progi, 2)).toEqual({ wolno: true })
    expect(ocenGlosy(progi, 3).wolno).toBe(false)
    expect(ocenGlosy(progi, 9).wolno).toBe(false)
  })

  it('brak progu oznacza brak ograniczenia', () => {
    expect(ocenGlosy(bezLimitu, 30)).toEqual({ wolno: true })
  })
})

describe('poczatekMiesiaca', () => {
  it('zwraca pierwszą sekundę miesiąca', () => {
    expect(poczatekMiesiaca(new Date('2026-09-19T10:42:13.500Z')).toISOString())
      .toBe('2026-09-01T00:00:00.000Z')
  })

  // Granica miesiaca to najczestszy blad w takich liczeniach: rozmowa
  // z 31 sierpnia nie moze obciazac wrzesniowego limitu.
  it('nie wciąga ostatniego dnia poprzedniego miesiąca', () => {
    expect(poczatekMiesiaca(new Date('2026-09-01T00:00:00.000Z')).toISOString())
      .toBe('2026-09-01T00:00:00.000Z')
    expect(poczatekMiesiaca(new Date('2026-01-15T12:00:00.000Z')).toISOString())
      .toBe('2026-01-01T00:00:00.000Z')
  })
})

describe('filtrujNumery', () => {
  const numery = [
    { phoneNumberId: 'phnum_a', phoneNumber: '+48732129033' },
    { phoneNumberId: 'phnum_b', phoneNumber: '+48457112147' },
    { phoneNumberId: 'phnum_c', phoneNumber: '+48503956401' },
  ]

  // Puste ustawienie na pojedynczym wdrozeniu nie moze blokowac wyboru numeru.
  it.each([undefined, null, '', '  \n , ; '])('puste ustawienie %p przepuszcza wszystkie', (d) => {
    expect(filtrujNumery(numery, d)).toHaveLength(3)
  })

  // Sedno: jedna firma nie moze zobaczyc numeru drugiej na wspolnym koncie.
  it('zostawia wyłącznie wskazane numery', () => {
    const wynik = filtrujNumery(numery, 'phnum_a\nphnum_b')
    expect(wynik.map((n) => n.phoneNumber)).toEqual(['+48732129033', '+48457112147'])
  })

  it.each(['phnum_a, phnum_b', 'phnum_a;phnum_b', ' phnum_a \r\n phnum_b \n'])(
    'przyjmuje rozdzielenie przecinkiem, średnikiem i nową linią: %p',
    (zapis) => {
      expect(filtrujNumery(numery, zapis).map((n) => n.phoneNumberId)).toEqual(['phnum_a', 'phnum_b'])
    },
  )

  // Numer skasowany u dostawcy nie moze wywrocic ekranu ani wpuscic reszty.
  it('nieznany identyfikator po prostu niczego nie dokłada', () => {
    expect(filtrujNumery(numery, 'phnum_z')).toEqual([])
  })
})
