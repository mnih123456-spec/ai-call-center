import type { EntityManager } from '@mikro-orm/postgresql'
import { VoiceCall, VoiceTenantLimits } from '../data/entities'

export type Zakres = { tenantId: string | null; organizationId: string | null }

export type Progi = {
  minutesPerMonth: number | null
  maxVoices: number | null
  maxConcurrentCalls: number | null
}

export type Wykorzystanie = {
  minutyWMiesiacu: number
  rozmowyTeraz: number
}

export type Werdykt =
  | { wolno: true }
  | { wolno: false; powod: string; trwale: boolean }

/**
 * Domyślne progi dla firmy, która nie ma jeszcze własnych.
 *
 * Puste znaczy "bez limitu". Firma bez ustawionego progu ma działać, a nie
 * stanąć: wolimy zobaczyć rachunek niż wytłumaczyć klientowi, czemu kampania
 * nie ruszyła w dniu wdrożenia.
 */
export const PROGI_DOMYSLNE: Progi = {
  minutesPerMonth: null,
  maxVoices: null,
  maxConcurrentCalls: null,
}

/** Pierwsza sekunda bieżącego miesiąca, po której liczymy zużycie. */
export function poczatekMiesiaca(teraz: Date = new Date()): Date {
  return new Date(Date.UTC(teraz.getUTCFullYear(), teraz.getUTCMonth(), 1))
}

/**
 * Ocena progów na podstawie zużycia.
 *
 * Funkcja jest czysta, żeby dało się ją sprawdzić testem bez bazy. Dzieli
 * odmowy na trwałe i chwilowe, bo to różne rzeczy: wyczerpane minuty trwają
 * do końca miesiąca i rozmowę trzeba zamknąć, a zajęte linie miną za chwilę
 * i wystarczy poczekać.
 */
export function ocenProgi(progi: Progi, zuzycie: Wykorzystanie): Werdykt {
  if (progi.minutesPerMonth !== null && progi.minutesPerMonth >= 0) {
    if (zuzycie.minutyWMiesiacu >= progi.minutesPerMonth) {
      return {
        wolno: false,
        trwale: true,
        powod: `Wyczerpany miesięczny limit ${progi.minutesPerMonth} minut.`,
      }
    }
  }

  if (progi.maxConcurrentCalls !== null && progi.maxConcurrentCalls > 0) {
    if (zuzycie.rozmowyTeraz >= progi.maxConcurrentCalls) {
      return {
        wolno: false,
        trwale: false,
        powod: `Osiągnięty limit ${progi.maxConcurrentCalls} rozmów równocześnie.`,
      }
    }
  }

  return { wolno: true }
}

/** Czy firma może dodać kolejny głos. */
export function ocenGlosy(progi: Progi, ile: number): Werdykt {
  if (progi.maxVoices === null || progi.maxVoices < 0) return { wolno: true }
  if (ile < progi.maxVoices) return { wolno: true }
  return {
    wolno: false,
    trwale: true,
    powod: `Osiągnięty limit ${progi.maxVoices} głosów dla tej firmy.`,
  }
}

/** Progi zapisane dla firmy albo domyślne, gdy nikt ich nie ustawił. */
export async function pobierzProgi(em: EntityManager, zakres: Zakres): Promise<Progi> {
  const wiersz = await em.findOne(VoiceTenantLimits, {
    tenantId: zakres.tenantId,
    organizationId: zakres.organizationId,
    deletedAt: null,
  })
  if (!wiersz) return { ...PROGI_DOMYSLNE }
  return {
    minutesPerMonth: wiersz.minutesPerMonth ?? null,
    maxVoices: wiersz.maxVoices ?? null,
    maxConcurrentCalls: wiersz.maxConcurrentCalls ?? null,
  }
}

/**
 * Zużycie firmy: minuty w tym miesiącu i rozmowy trwające teraz.
 *
 * Minuty liczymy z zakończonych rozmów, bo tylko one mają zmierzony czas.
 * Rozmowy w toku dokładamy jako pełne minuty, żeby limit nie pękł przez
 * kilkanaście połączeń wystartowanych w tej samej sekundzie.
 */
export async function pobierzWykorzystanie(
  em: EntityManager,
  zakres: Zakres,
  teraz: Date = new Date(),
): Promise<Wykorzystanie> {
  const scope = {
    tenantId: zakres.tenantId,
    organizationId: zakres.organizationId,
    deletedAt: null,
  }

  const zakonczone = await em.find(
    VoiceCall,
    { ...scope, startedAt: { $gte: poczatekMiesiaca(teraz) }, durationSecs: { $ne: null } },
    { fields: ['durationSecs'] },
  )
  const sekundy = zakonczone.reduce((acc, w) => acc + (w.durationSecs ?? 0), 0)

  const wToku = await em.count(VoiceCall, { ...scope, status: 'dialing', finishedAt: null })

  return {
    minutyWMiesiacu: Math.ceil(sekundy / 60) + wToku,
    rozmowyTeraz: wToku,
  }
}

/** Skrót: pobiera progi i zużycie, po czym wydaje werdykt. */
export async function sprawdzLimity(
  em: EntityManager,
  zakres: Zakres,
  teraz: Date = new Date(),
): Promise<Werdykt> {
  const [progi, zuzycie] = await Promise.all([
    pobierzProgi(em, zakres),
    pobierzWykorzystanie(em, zakres, teraz),
  ])
  return ocenProgi(progi, zuzycie)
}
