/**
 * Pola wyniku rozmowy wyprowadzone z pytań klienta.
 *
 * Wcześniej rozmowa zapisywała się w stałych kolumnach: produkt, bank, rok
 * umowy. To są pojęcia jednej branży wbite w schemat bazy, więc każda kolejna
 * branża wymagałaby migracji i programisty przy każdym kliencie.
 *
 * Źródłem prawdy są pytania, które klient wpisał. Każde pytanie to jedno pole,
 * które bot ma ustalić, i jedna kolumna w tabeli wyników. Klient dopisuje
 * pytanie i dostaje kolumnę, bez naszego udziału.
 */

export type PoleWyniku = { klucz: string; etykieta: string }

/** Ile pól przekazujemy dostawcy. Powyżej tego rozmowa robi się ankietą. */
export const LIMIT_POL = 12

const ZNAKI: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
  Ą: 'a', Ć: 'c', Ę: 'e', Ł: 'l', Ń: 'n', Ó: 'o', Ś: 's', Ź: 'z', Ż: 'z',
}

/**
 * Klucz techniczny pytania.
 *
 * Musi być stabilny: zmiana klucza przy tej samej treści pytania rozjechałaby
 * kolumnę z danymi zebranymi wcześniej. Dlatego bierze się wprost z treści,
 * a nie z pozycji na liście.
 */
export function kluczPytania(pytanie: string): string {
  const bezOgonkow = pytanie.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (z) => ZNAKI[z] ?? z)
  const slowa = bezOgonkow
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .split('_')
    .filter(Boolean)
    .slice(0, 5)
  return slowa.join('_').slice(0, 48) || 'pytanie'
}

/**
 * Zamienia pytania klienta na listę pól.
 *
 * Powtórzone klucze rozróżniamy numerem, bo dwa różne pytania mogą po
 * uproszczeniu dać ten sam klucz, a wtedy jedna odpowiedź nadpisałaby drugą.
 */
export function polaZPytan(pytania: string | null | undefined): PoleWyniku[] {
  const lista = (pytania ?? '')
    .split(/\r?\n/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, LIMIT_POL)

  const uzyte = new Map<string, number>()
  return lista.map((pytanie) => {
    const bazowy = kluczPytania(pytanie)
    const ile = uzyte.get(bazowy) ?? 0
    uzyte.set(bazowy, ile + 1)
    return {
      klucz: ile === 0 ? bazowy : `${bazowy}_${ile + 1}`,
      etykieta: pytanie.replace(/\s+/g, ' ').slice(0, 60),
    }
  })
}

/**
 * Kształt, w którym dostawca przyjmuje pola do zebrania.
 *
 * Wszystko jako tekst: bot ma zapisać to, co powiedział rozmówca, a nie
 * interpretować, czy „chyba tak" jest prawdą logiczną.
 */
export function dataCollectionDlaDostawcy(pola: PoleWyniku[]): Record<string, unknown> {
  const wynik: Record<string, unknown> = {}
  for (const pole of pola) {
    wynik[pole.klucz] = {
      type: 'string',
      description: `Odpowiedź rozmówcy na pytanie: ${pole.etykieta}. Zapisz to, co powiedział. Gdy nie odpowiedział, zostaw puste.`,
    }
  }
  return wynik
}
