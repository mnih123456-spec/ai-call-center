import { describe, expect, it } from '@jest/globals'
import { NAZWA_W_SZABLONIE, podmienNazwe } from '../nowy-agent'

describe('podmienNazwe', () => {
  it('podmienia każde wystąpienie nazwy z szablonu', () => {
    const szablon = `Jesteś wirtualną asystentką ${NAZWA_W_SZABLONIE}. Wkrótce skontaktuje się specjalista ${NAZWA_W_SZABLONIE}.`
    expect(podmienNazwe(szablon, 'Kancelaria Nowak')).toBe(
      'Jesteś wirtualną asystentką Kancelaria Nowak. Wkrótce skontaktuje się specjalista Kancelaria Nowak.',
    )
  })

  // Scenariusz bez nazwy z szablonu zostaje nietkniety, zamiast dostac
  // doklejona nazwe w przypadkowym miejscu.
  it('nie rusza tekstu, w którym nazwy z szablonu nie ma', () => {
    const obcy = 'Przywitaj klienta i zapytaj o zgodę.'
    expect(podmienNazwe(obcy, 'Kancelaria Nowak')).toBe(obcy)
  })

  it.each([undefined, null, ''])('pusty scenariusz %p daje pusty wynik', (t) => {
    expect(podmienNazwe(t, 'Kancelaria Nowak')).toBe('')
  })

  // Nazwa firmy bywa dluga i z polskimi znakami, a bot i tak ma ja wymowic.
  it('radzi sobie z nazwą ze znakami diakrytycznymi', () => {
    expect(podmienNazwe(`asystentka ${NAZWA_W_SZABLONIE}`, 'Żółć i Wspólnicy'))
      .toBe('asystentka Żółć i Wspólnicy')
  })
})
