/**
 * Sprowadza numer telefonu do postaci E.164 z plusem.
 *
 * Dostawca podaje numery niejednolicie: w katalogu numerów bywa "48732129033",
 * w metadanych rozmowy przychodzącej "48503956401", a nasza baza trzyma
 * wyłącznie postać z plusem, bo taki format wymusza walidator.
 *
 * Bez jednego wspólnego przejścia przez tę funkcję oddzwonienie nigdy nie
 * trafiłoby na wcześniejsze połączenie i każdy powrót wyglądałby na nową
 * osobę. Nic by się przy tym nie wywaliło, dane po prostu przestałyby się
 * łączyć, dlatego normalizacja jest w jednym miejscu, a nie przepisywana
 * przy każdym użyciu.
 */
export function toE164(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const digits = String(raw).replace(/[^\d+]/g, '')
  if (!digits) return null
  const withPlus = digits.startsWith('+') ? digits : `+${digits}`
  return /^\+[1-9]\d{7,14}$/.test(withPlus) ? withPlus : null
}
