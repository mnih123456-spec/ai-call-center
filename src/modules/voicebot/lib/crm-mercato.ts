import type { AwilixContainer } from 'awilix'
import { createLogger } from '@open-mercato/shared/lib/logger'
import {
  type DanePolaczenia,
  type Etap,
  type Lejek,
  type PodpowiedzRekordu,
  type ZlaczeCrm,
  type ZnalezionyRekord,
  notatkaZRozmowy,
} from './crm'

const logger = createLogger('voicebot')

export type ZakresTenanta = {
  tenantId: string
  organizationId: string
  /** Użytkownik, w którego imieniu zapisujemy. Przy webhooku nie ma sesji. */
  userId?: string | null
}

/**
 * Wbudowany CRM Open Mercato jako odbiorca wyników rozmów.
 *
 * Dla klienta, który nie ma własnego systemu, panel jest jego CRM-em.
 * Rozmowa ląduje na karcie klienta w module `customers`, a nie tylko
 * w tabeli połączeń, więc handlowiec pracuje tam, gdzie pracuje zawsze.
 *
 * Zapisy idą przez komendy domenowe modułu `customers`, nie przez bezpośredni
 * zapis encji. Komenda pilnuje zakresu tenanta, zapisuje wpis do dziennika
 * zmian i wywołuje zdarzenia, na które nasłuchują inne moduły. Ominięcie jej
 * dałoby wiersz w bazie, o którym reszta systemu nic by nie wiedziała.
 */
export class MercatoCrm implements ZlaczeCrm {
  private readonly container: AwilixContainer
  private readonly zakres: ZakresTenanta

  constructor(container: AwilixContainer, zakres: ZakresTenanta) {
    this.container = container
    this.zakres = zakres
  }

  private kontekst() {
    return {
      container: this.container,
      auth: {
        sub: this.zakres.userId ?? undefined,
        tenantId: this.zakres.tenantId,
        orgId: this.zakres.organizationId,
      },
      organizationScope: {
        selectedId: this.zakres.organizationId,
        filterIds: [this.zakres.organizationId],
        allowedIds: [this.zakres.organizationId],
        tenantId: this.zakres.tenantId,
      },
      selectedOrganizationId: this.zakres.organizationId,
      organizationIds: [this.zakres.organizationId],
    }
  }

  /**
   * Szyna komend.
   *
   * Zwraca wynik opakowany w `{ result, logEntry }`, bo przy okazji wykonania
   * zapisuje wpis do dziennika zmian. Sięganie wprost po pola wyniku daje
   * `undefined` i wygląda na błąd komendy, którym nie jest.
   */
  private szyna() {
    return this.container.resolve('commandBus') as {
      execute: <T>(id: string, args: { input: unknown; ctx: unknown }) => Promise<{ result: T }>
    }
  }

  async sprawdzPolaczenie(): Promise<{ ok: boolean; opis: string }> {
    try {
      this.szyna()
      return { ok: true, opis: 'Zapisujemy do wbudowanego CRM Open Mercato.' }
    } catch {
      return { ok: false, opis: 'Nie udało się sięgnąć po szynę komend.' }
    }
  }

  /**
   * Lejków nie podajemy.
   *
   * Wbudowany moduł ma własne lejki szans sprzedaży, ale w tej wersji
   * zapisujemy rozmowę jako interakcję na karcie klienta, a nie jako szansę.
   * Pokazanie listy lejków sugerowałoby wybór, który na nic nie wpływa.
   */
  async pobierzLejki(): Promise<Lejek[]> {
    return []
  }

  async pobierzEtapy(): Promise<Etap[]> {
    return []
  }

  /**
   * Imię i nazwisko wymagane przez komendę tworzącą osobę.
   *
   * Rozmowa przychodząca od nieznanego numeru nie niesie nazwiska, a komenda
   * odrzuca puste. Wpisujemy wtedy numer, bo na liście klientów "Nieznany"
   * nic nie mówi, a po numerze da się rozpoznać, z kim była rozmowa.
   */
  private imiona(dane: DanePolaczenia): { firstName: string; lastName: string } {
    return {
      firstName: dane.firstName?.trim() || 'Rozmówca',
      lastName: dane.lastName?.trim() || dane.phone,
    }
  }

  private async utworzKlienta(dane: DanePolaczenia): Promise<string> {
    const { firstName, lastName } = this.imiona(dane)
    const wynik = await this.szyna().execute<{ entityId?: string }>('customers.people.create', {
      input: {
        tenantId: this.zakres.tenantId,
        organizationId: this.zakres.organizationId,
        firstName,
        lastName,
        primaryPhone: dane.phone,
        source: 'voicebot',
        description: notatkaZRozmowy(dane),
      },
      ctx: this.kontekst(),
    })

    const entityId = wynik?.result?.entityId
    if (!entityId) throw new Error('Komenda tworząca klienta nie zwróciła identyfikatora')
    logger.info('mercato customer created', { entityId })
    return entityId
  }

  private async zapiszInterakcje(entityId: string, dane: DanePolaczenia): Promise<void> {
    const teraz = new Date()
    await this.szyna().execute('customers.interactions.create', {
      input: {
        tenantId: this.zakres.tenantId,
        organizationId: this.zakres.organizationId,
        entityId,
        interactionType: 'call',
        // Interakcja jest zamknięta, bo opisuje rozmowę, która się odbyła,
        // a nie zaplanowaną do wykonania. Domyślny status to "planned".
        status: 'done',
        title: dane.direction === 'inbound'
          ? 'Rozmowa przychodząca obsłużona przez bota'
          : 'Rozmowa wychodząca wykonana przez bota',
        body: notatkaZRozmowy(dane),
        phoneNumber: dane.phone,
        occurredAt: teraz,
        source: 'voicebot',
      },
      ctx: this.kontekst(),
    })
  }

  async zapiszWynikRozmowy(dane: DanePolaczenia, znany?: PodpowiedzRekordu): Promise<ZnalezionyRekord> {
    // Znanego klienta bierzemy z naszej historii połączeń. Szukanie po numerze
    // nie jest tu możliwe: pole primary_phone jest szyfrowane i nie ma przy nim
    // kolumny skrótu, więc dopasowanie wymagałoby odszyfrowania wszystkich kart.
    const entityId = znany?.id ?? (await this.utworzKlienta(dane))
    await this.zapiszInterakcje(entityId, dane)
    logger.info('mercato call stored', { entityId })
    return { typ: 'CUSTOMER', id: entityId }
  }
}
