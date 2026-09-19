import { describe, expect, it } from '@jest/globals'
import { CISZA_MAX, CISZA_MIN, MODELE, sprawdzUstawienia } from '../ustawienia-agenta'

describe('sprawdzUstawienia', () => {
  it('przepuszcza model z listy i czas ciszy w zakresie', () => {
    const w = sprawdzUstawienia({ llm: 'gemini-2.5-flash-lite', cisza: 1.5 })
    expect(w).toEqual({ ok: true, dane: { llm: 'gemini-2.5-flash-lite', cisza: 1.5 } })
  })

  // Nieznany model i tak odbilby sie od dostawcy, ale z komunikatem po
  // angielsku i bez wskazowki, co zrobic.
  it.each(['gpt-5-turbo-ultra', 'gemini-9', 'cokolwiek'])('odrzuca model spoza listy: %s', (llm) => {
    const w = sprawdzUstawienia({ llm, cisza: null })
    expect(w.ok).toBe(false)
    if (!w.ok) expect(w.blad).toContain('Nieznany model')
  })

  it.each([undefined, null, '', '   '])('brak modelu %p znaczy "zostaw jak jest"', (llm) => {
    const w = sprawdzUstawienia({ llm, cisza: null })
    expect(w).toEqual({ ok: true, dane: { llm: null, cisza: null } })
  })

  // Zero sekund ciszy wchodziloby rozmowcy w slowo przy kazdym oddechu,
  // a kilkanascie brzmi jak zerwane polaczenie.
  it.each([0, 0.4, 10.5, 60, -1])('odrzuca czas ciszy poza zakresem: %p', (cisza) => {
    const w = sprawdzUstawienia({ llm: null, cisza })
    expect(w.ok).toBe(false)
    if (!w.ok) expect(w.blad).toContain('Czas ciszy')
  })

  it.each([CISZA_MIN, 1.5, 3, CISZA_MAX])('przyjmuje brzegi zakresu: %p', (cisza) => {
    expect(sprawdzUstawienia({ llm: null, cisza }).ok).toBe(true)
  })

  it('odrzuca wartość, która nie jest liczbą', () => {
    expect(sprawdzUstawienia({ llm: null, cisza: Number.NaN }).ok).toBe(false)
  })
})

describe('lista modeli', () => {
  // Kolejnosc nie jest kosmetyczna: pierwszy na liscie jest tym, ktory
  // klient wybierze, gdy nie wie, co wybrac.
  it('zaczyna się od najszybszego i nie ma powtórek', () => {
    expect(MODELE[0].id).toBe('gemini-2.5-flash-lite')
    expect(new Set(MODELE.map((m) => m.id)).size).toBe(MODELE.length)
    expect(MODELE.every((m) => m.id && m.nazwa)).toBe(true)
  })
})
