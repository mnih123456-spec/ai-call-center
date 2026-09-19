/**
 * Czy pod ten numer wolno zadzwonić.
 *
 * To jest zabezpieczenie kosztowe, nie walidacja formatu. Wszyscy klienci
 * dzwonią z jednego konta u dostawcy, więc rachunek za rozmowy jednej firmy
 * trafia do nas. Bez tej bramki wystarczy, że klient wklei listę z numerami
 * o podwyższonej opłacie albo zagranicznymi, i koszt jest nasz, a wykryjemy
 * go dopiero na fakturze.
 *
 * Domyślnie dopuszczamy wyłącznie Polskę. Inne kraje trzeba włączyć świadomie
 * przez `VOICEBOT_DOZWOLONE_KRAJE`, podając prefiksy po przecinku, na przykład
 * `+48,+49`. Zasada jest odwrotna niż zwykle: wszystko zabronione poza tym,
 * co wpisane, bo pomyłka w drugą stronę kosztuje pieniądze.
 */

export type OcenaNumeru = { ok: true } | { ok: false; powod: string }

const DOMYSLNE_KRAJE = ['+48']

/**
 * Zakresy o podwyższonej opłacie i usługowe w Polsce.
 *
 * `70` to numery premium, gdzie minuta potrafi kosztować kilkanaście złotych.
 * `300` i `400` to numery o opłacie dzielonej. Żaden z nich nie jest numerem
 * klienta, więc ich obecność na liście oznacza pomyłkę albo nadużycie.
 */
const ZABRONIONE_ZAKRESY_PL = ['70', '300', '400']

function dozwoloneKraje(): string[] {
  const zmienna = process.env.VOICEBOT_DOZWOLONE_KRAJE
  if (!zmienna) return DOMYSLNE_KRAJE
  const lista = zmienna.split(',').map((p) => p.trim()).filter((p) => p.startsWith('+'))
  return lista.length ? lista : DOMYSLNE_KRAJE
}

export function ocenNumer(phone: string): OcenaNumeru {
  const kraje = dozwoloneKraje()
  const kraj = kraje.find((p) => phone.startsWith(p))

  if (!kraj) {
    return {
      ok: false,
      powod: `Numery spoza dozwolonych krajów (${kraje.join(', ')}) są zablokowane.`,
    }
  }

  if (kraj === '+48') {
    const krajowy = phone.slice(3)
    if (krajowy.length !== 9) {
      return { ok: false, powod: 'Polski numer musi mieć dziewięć cyfr.' }
    }
    const zabroniony = ZABRONIONE_ZAKRESY_PL.find((z) => krajowy.startsWith(z))
    if (zabroniony) {
      return {
        ok: false,
        powod: `Numery z zakresu ${zabroniony} mają podwyższoną opłatę i są zablokowane.`,
      }
    }
  }

  return { ok: true }
}
