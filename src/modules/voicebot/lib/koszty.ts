/**
 * Przeliczanie kosztu rozmów na złotówki.
 *
 * Dostawca rozlicza się w dolarach, a klient myśli w złotych, więc kurs
 * siedzi w jednym miejscu. Jest przybliżony i świadomie nie pobieramy go
 * z zewnątrz: koszt rozmowy pokazujemy poglądowo, a nie fakturowo.
 */
export const KURS_USD_PLN = 3.7

/**
 * Sumuje koszty w dolarach.
 *
 * Wartości przychodzą jako łańcuchy znaków, bo w bazie to liczba
 * stałoprzecinkowa. Sumujemy w groszach dolara, a nie na liczbach
 * zmiennoprzecinkowych, żeby przy tysiącach rozmów nie uciekały końcówki.
 */
export function sumaUsd(wiersze: Array<{ costUsd: string | null }>): number {
  const mikro = wiersze.reduce((acc, w) => {
    const wartosc = w.costUsd ? Number(w.costUsd) : 0
    if (!Number.isFinite(wartosc)) return acc
    return acc + Math.round(wartosc * 1_000_000)
  }, 0)
  return mikro / 1_000_000
}

/** Kwota w złotych, zaokrąglona do grosza. */
export function naZlote(usd: number): string {
  return (usd * KURS_USD_PLN).toFixed(2)
}

/** Koszt pojedynczej rozmowy, w groszach, bo to zwykle ułamki złotówki. */
export function kosztWierszaPln(costUsd: string | null): string {
  if (!costUsd) return ''
  const wartosc = Number(costUsd)
  if (!Number.isFinite(wartosc) || wartosc === 0) return ''
  const grosze = Math.round(wartosc * KURS_USD_PLN * 100)
  return grosze < 100 ? `${grosze} gr` : `${(grosze / 100).toFixed(2)} zł`
}
