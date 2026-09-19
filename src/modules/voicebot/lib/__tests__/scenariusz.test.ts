import { describe, expect, it } from '@jest/globals'
import { zlozPrompt, ZNACZNIK_PYTAN } from '../scenariusz'

describe('zlozPrompt', () => {
  const staly = '  Przywitaj klienta.\r\n\tPotwierdź tożsamość.  \nZapytaj o zgodę: „Tak?”'

  // Brak pytań nie tworzy pustej sekcji, która niepotrzebnie zajmowałaby kontekst modelu.
  it.each([undefined, null, '', ' \t\r\n  \n'])('pozostawia sam prompt dla pytań %p', (pytania) => {
    expect(zlozPrompt(staly, pytania)).toBe(staly)
    expect(zlozPrompt(staly, pytania)).not.toContain(ZNACZNIK_PYTAN)
  })

  // Pełna równość chroni treść instrukcji i kolejność punktów przekazywanych agentowi.
  it('dodaje pytania jako listę po znaczniku, zachowując stałą treść', () => {
    expect(zlozPrompt(staly, 'Jaki termin?\nJaki budżet?')).toBe(
      `${staly}\n\n${ZNACZNIK_PYTAN}\n\nDodatkowo, o ile rozmowa na to pozwoli, ustal:\n\n- Jaki termin?\n- Jaki budżet?`,
    )
  })

  // Ponowny zapis musi zastąpić sekcję, inaczej prompt rośnie aż do limitu modelu.
  it('przy drugim wywołaniu podmienia pytania i nie dubluje sekcji', () => {
    const pierwszy = zlozPrompt(staly, 'Stare pytanie?\nDrugie stare?')
    const drugi = zlozPrompt(pierwszy, 'Nowe pytanie?')
    expect(drugi).toBe(zlozPrompt(staly, 'Nowe pytanie?'))
    expect(drugi.split(ZNACZNIK_PYTAN)).toHaveLength(2)
    expect(drugi).not.toContain('Stare pytanie?')
    expect(drugi).not.toContain('Drugie stare?')
    expect(zlozPrompt(drugi, 'Nowe pytanie?')).toBe(drugi)
  })

  // Usunięcie pytań powinno usunąć także poprzednią sekcję, aby agent ich nie powtarzał.
  it('usuwa poprzednią sekcję po wyczyszczeniu pytań', () => {
    expect(zlozPrompt(zlozPrompt(staly, 'Stare pytanie?'), '')).toBe(staly)
  })

  // Wklejenie tekstu z pustymi wierszami nie może tworzyć pustych punktów rozmowy.
  it('pomija puste wiersze i przycina białe znaki pytań', () => {
    expect(zlozPrompt(staly, ' \r\n\t Jaki termin? \t\r\n\r\n Jaki budżet?  \n\t')).toBe(
      zlozPrompt(staly, 'Jaki termin?\nJaki budżet?'),
    )
  })

  // Końcowe białe znaki są obcinane i to jest zamierzone, a nie przeoczenie.
  // Dwa powody: sklejenie z sekcją pytań ma dawać dokładnie jedną pustą linię
  // odstępu, a wynik ma być stabilny, czyli drugi zapis tej samej treści
  // niczego już nie zmienia. Treść stałego promptu zostaje nietknięta.
  it('obcina końcowe białe znaki, ale nie rusza treści stałego promptu', () => {
    const zBialymi = `${staly}  \t\r\n`
    expect(zlozPrompt(zBialymi, null)).toBe(staly)
    // Stabilność: powtórzenie na własnym wyniku nic nie zmienia.
    expect(zlozPrompt(zlozPrompt(zBialymi, null), null)).toBe(staly)
  })
})
