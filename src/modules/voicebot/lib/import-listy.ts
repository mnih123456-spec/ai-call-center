import { toE164 } from './phone'

export type PozycjaListy = {
  phone: string
  firstName: string | null
  lastName: string | null
  leadRef: string | null
}

export type BladWiersza = {
  wiersz: number
  tresc: string
  powod: string
}

export type WynikParsowania = {
  pozycje: PozycjaListy[]
  bledy: BladWiersza[]
  pominieteDuplikaty: number
}

/**
 * Numer z wklejonej listy sprowadzony do postaci międzynarodowej.
 *
 * Tu, w odróżnieniu od `toE164`, wolno nam domyślać się kraju, bo wiemy,
 * skąd pochodzi tekst: klient wkleił własną listę, a nie dane od dostawcy.
 *
 * To rozróżnienie jest istotne. Samo dopisanie plusa do dziewięciu cyfr
 * daje numer poprawny formalnie, ale w zupełnie innym kraju: "500100201"
 * stałoby się numerem na Falklandach, a bot faktycznie by tam zadzwonił.
 * Dlatego dziewięciocyfrowy numer bez prefiksu traktujemy jako polski,
 * a wszystko inne musi mieć prefiks podany wprost.
 */
export function numerZListy(surowy: string | undefined): string | null {
  if (!surowy) return null
  const oczyszczony = surowy.replace(/[^\d+]/g, '')
  if (!oczyszczony) return null

  if (oczyszczony.startsWith('+')) return toE164(oczyszczony)

  const cyfry = oczyszczony.replace(/\D/g, '')

  // "00" na początku to międzynarodowy prefiks wybierania, odpowiednik plusa.
  if (cyfry.startsWith('00')) return toE164(`+${cyfry.slice(2)}`)
  if (cyfry.length === 9) return toE164(`+48${cyfry}`)
  if (cyfry.length === 11 && cyfry.startsWith('48')) return toE164(`+${cyfry}`)

  return null
}

/**
 * Rozbija wiersz na pola.
 *
 * Ludzie wklejają listy z arkusza, z maila i z notatnika, więc separator bywa
 * przecinkiem, średnikiem albo tabulatorem. Przyjmujemy wszystkie trzy zamiast
 * kazać komukolwiek przerabiać plik przed wklejeniem.
 */
function rozbij(wiersz: string): string[] {
  return wiersz.split(/[;,\t]/).map((p) => p.trim())
}

/**
 * Zamienia wklejoną listę na pozycje gotowe do zlecenia połączeń.
 *
 * Kolejność pól: numer, imię, nazwisko, opcjonalne odwołanie do leada.
 * Sam numer w wierszu też jest poprawny, bo przy imporcie z reklam często
 * nic więcej nie ma.
 *
 * Zasada przewodnia: **jeden zły wiersz nie unieważnia całej listy.** Klient,
 * który wkleja dwieście numerów i dostaje komunikat "popraw i wklej jeszcze
 * raz", poprawi jeden wiersz i wklei całość drugi raz, tworząc duplikaty.
 * Dlatego dobre wiersze przechodzą, a złe wracają z podaniem powodu.
 */
export function parsujListe(tekst: string): WynikParsowania {
  const pozycje: PozycjaListy[] = []
  const bledy: BladWiersza[] = []
  const widziane = new Set<string>()
  let pominieteDuplikaty = 0

  const wiersze = tekst.split(/\r?\n/)

  for (let i = 0; i < wiersze.length; i++) {
    const surowy = wiersze[i]
    const tresc = surowy.trim()
    if (!tresc) continue

    const pola = rozbij(tresc)
    const numer = numerZListy(pola[0])

    if (!numer) {
      bledy.push({
        wiersz: i + 1,
        tresc: tresc.slice(0, 80),
        powod: 'Nie rozpoznano numeru. Podaj dziewięć cyfr albo numer z prefiksem kraju',
      })
      continue
    }

    // Ten sam numer dwa razy na jednej liście to zwykle pomyłka przy sklejaniu
    // arkuszy. Dzwonienie dwa razy do tej samej osoby w jednej kampanii
    // wygląda z jej strony na nękanie, więc powtórki pomijamy po cichu.
    if (widziane.has(numer)) {
      pominieteDuplikaty++
      continue
    }
    widziane.add(numer)

    pozycje.push({
      phone: numer,
      firstName: pola[1] || null,
      lastName: pola[2] || null,
      leadRef: pola[3] || null,
    })
  }

  return { pozycje, bledy, pominieteDuplikaty }
}
