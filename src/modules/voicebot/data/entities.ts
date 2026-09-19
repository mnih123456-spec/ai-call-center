import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy'

/**
 * Kampania połączeń głosowych. Wiąże listę leadów z konkretnym agentem
 * i numerem telefonu u dostawcy.
 */
@Entity({ tableName: 'voicebot_campaigns' })
@Index({ properties: ['phoneNumberId'] })
export class VoiceCampaign {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ type: 'text' })
  name!: string

  @Property({ type: 'text', nullable: true })
  description?: string | null

  /** Identyfikator agenta u dostawcy głosu. */
  @Property({ name: 'agent_id', type: 'text' })
  agentId!: string

  /** Identyfikator numeru telefonu u dostawcy głosu. */
  @Property({ name: 'phone_number_id', type: 'text', nullable: true })
  phoneNumberId?: string | null

  /** draft, running, paused, finished */
  @Property({ type: 'text', default: 'draft' })
  status: string = 'draft'

  /** Minimalny odstęp między startami połączeń, w sekundach. */
  @Property({ name: 'min_interval_secs', type: 'integer', default: 180 })
  minIntervalSecs: number = 180

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

/**
 * Agent głosowy firmy-klienta.
 *
 * Każda firma ma własnego agenta u dostawcy, zrobionego z naszego sprawdzonego
 * szablonu. Klient nie pisze promptu, tylko **dodaje pytania** do scenariusza
 * rozmowy: prompt jest nasz i to on odpowiada za to, że bot przedstawia się,
 * pyta o zgodę i nie zmyśla.
 *
 * Do tej pory identyfikator agenta siedział przy kampanii, czyli o poziom za
 * nisko: dwie kampanie tej samej firmy mogły wskazywać na różnych agentów,
 * a nikt nie widział, która firma ma którego.
 *
 * Ten wiersz jest też jedynym miejscem, w którym da się odpowiedzieć na
 * pytanie "dlaczego bot u tego klienta mówi to, co mówi".
 */
@Entity({ tableName: 'voicebot_agents' })
@Index({ properties: ['tenantId'] })
export class VoiceAgentProfile {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  /** Identyfikator agenta u dostawcy głosu. */
  @Property({ name: 'agent_id', type: 'text' })
  agentId!: string

  @Property({ type: 'text' })
  name!: string

  /** outbound albo inbound: ten sam klient ma zwykle obu. */
  @Property({ type: 'text', default: 'outbound' })
  direction: string = 'outbound'

  /**
   * Pytania dodane przez klienta, po jednym w wierszu.
   *
   * Trzymamy je jako tekst, a nie listę w bazie, bo klient edytuje je
   * w jednym polu i kolejność ma znaczenie.
   */
  @Property({ type: 'text', nullable: true })
  questions?: string | null

  /**
   * Branża firmy, wybrana z listy.
   *
   * Decyduje o słowniku pojęć doklejanym do scenariusza. Bot dzwoniący
   * w imieniu kancelarii kredytowej musi rozumieć pytanie o sankcję kredytu
   * darmowego, zanim ktoś je zada.
   */
  @Property({ type: 'text', nullable: true })
  industry?: string | null

  /** Adres strony firmy, z której bot ma czerpać wiedzę o niej. */
  @Property({ name: 'knowledge_url', type: 'text', nullable: true })
  knowledgeUrl?: string | null

  /**
   * Notatka o firmie, wyciągnięta z jej strony.
   *
   * Trzymamy ją u siebie z dwóch powodów: klient musi zobaczyć, czego bot się
   * o nim nauczył, zanim ten zadzwoni do jego klientów, a przy każdym zapisie
   * pytań nie chcemy ponownie czytać cudzej strony i płacić za model.
   */
  @Property({ name: 'knowledge_text', type: 'text', nullable: true })
  knowledgeText?: string | null

  /** Kiedy ostatnio przeczytaliśmy stronę firmy. */
  @Property({ name: 'knowledge_read_at', type: Date, nullable: true })
  knowledgeReadAt?: Date | null

  /** Kiedy ostatnio wysłaliśmy pytania do dostawcy. */
  @Property({ name: 'synced_at', type: Date, nullable: true })
  syncedAt?: Date | null

  @Property({ name: 'sync_result', type: 'text', nullable: true })
  syncResult?: string | null

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

/**
 * Głos nagrany przez firmę-klienta i sklonowany u dostawcy.
 *
 * Trzymamy go u siebie z jednego powodu: **zgody**. Klonowanie cudzego głosu
 * wymaga zgody osoby, która go użyczyła, a dostawca przyjmuje tylko nasze
 * oświadczenie, że ją mamy. Gdyby kiedyś ktoś zapytał, czyj to głos i kto
 * pozwolił, odpowiedź musi być w naszej bazie, a nie w czyjejś pamięci.
 *
 * Dlatego pola zgody są wymagane, a nie opcjonalne.
 */
@Entity({ tableName: 'voicebot_voices' })
@Index({ properties: ['tenantId'] })
export class VoiceProfile {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  /** Identyfikator głosu u dostawcy. */
  @Property({ name: 'voice_id', type: 'text' })
  voiceId!: string

  @Property({ type: 'text' })
  name!: string

  /** Imię i nazwisko osoby, której głos sklonowano. */
  @Property({ name: 'consent_person', type: 'text' })
  consentPerson!: string

  /** Kto w firmie potwierdził, że zgoda została udzielona. */
  @Property({ name: 'consent_confirmed_by', type: 'uuid', nullable: true })
  consentConfirmedBy?: string | null

  @Property({ name: 'consent_at', type: Date })
  consentAt: Date = new Date()

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

/**
 * Połączenie tenanta z jego własnym systemem CRM.
 *
 * Każda firma-klient ma swój CRM i swoje dane dostępowe, dlatego to jest
 * wiersz w bazie, a nie ustawienie w środowisku. Jeden tenant, jedno aktywne
 * połączenie z danym dostawcą.
 *
 * UWAGA: `webhookUrl` zawiera w sobie żeton dostępowy, czyli jest hasłem.
 * Kolumna jest objęta mapą szyfrowania modułu (`encryption.ts`), więc odczyt
 * wymaga zakresu deszyfrującego.
 */
@Entity({ tableName: 'voicebot_crm_connections' })
@Unique({ name: 'voicebot_crm_conn_tenant_provider', properties: ['tenantId', 'provider'] })
export class VoiceCrmConnection {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  /** bitrix24, w przyszłości kolejne systemy. */
  @Property({ type: 'text', default: 'bitrix24' })
  provider: string = 'bitrix24'

  @Property({ name: 'webhook_url', type: 'text' })
  webhookUrl!: string

  /**
   * Lejek i etap, w których ma lądować nowa szansa sprzedaży.
   *
   * Puste znaczy "domyślny lejek dostawcy". Trzymamy identyfikatory jako
   * tekst, bo każdy system nazywa je inaczej i nie wszystkie są liczbami.
   */
  @Property({ name: 'pipeline_id', type: 'text', nullable: true })
  pipelineId?: string | null

  @Property({ name: 'stage_id', type: 'text', nullable: true })
  stageId?: string | null

  /** Wyłączenie bez kasowania danych dostępowych. */
  @Property({ type: 'boolean', default: true })
  active: boolean = true

  /** Kiedy ostatnio sprawdziliśmy, że adres działa. */
  @Property({ name: 'checked_at', type: Date, nullable: true })
  checkedAt?: Date | null

  @Property({ name: 'check_result', type: 'text', nullable: true })
  checkResult?: string | null

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

/**
 * Limity firmy-klienta.
 *
 * Wszystkie firmy dzwonią z jednego konta u dostawcy głosu, więc jego limity
 * i jego rachunek są wspólne. Bez tych progów jedna firma, która wklei listę
 * dziesięciu tysięcy numerów, zjada minuty pozostałym i wystawia nam rachunek,
 * o którym dowiadujemy się na koniec miesiąca.
 *
 * Puste pole znaczy "bez limitu". To świadoma decyzja: firma, której nie
 * ustawiono progu, ma działać, a nie stanąć.
 */
@Entity({ tableName: 'voicebot_limits' })
@Unique({ name: 'voicebot_limits_tenant_org', properties: ['tenantId', 'organizationId'] })
export class VoiceTenantLimits {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  /** Minuty rozmów w miesiącu kalendarzowym. */
  @Property({ name: 'minutes_per_month', type: 'integer', nullable: true })
  minutesPerMonth?: number | null

  /**
   * Numery, z ktorych ta firma moze dzwonic, po jednym w wierszu.
   *
   * Wszystkie firmy korzystaja z jednego konta u dostawcy, wiec jego lista
   * numerow jest wspolna. Bez tego pola kazdy klient widzi w panelu numery
   * pozostalych, a to przeciek miedzy firmami, nie niewygoda.
   *
   * Puste znaczy: pokaz wszystkie. Tak zostaje na pojedynczym wdrozeniu,
   * gdzie i tak jest jedna firma.
   */
  @Property({ name: 'allowed_numbers', type: 'text', nullable: true })
  allowedNumbers?: string | null

  /** Ile głosów firma może mieć u dostawcy. Slotów jest 30 na całe konto. */
  @Property({ name: 'max_voices', type: 'integer', nullable: true })
  maxVoices?: number | null

  /**
   * Ile rozmów firma może prowadzić naraz.
   *
   * Kolejka pilnuje odstępu w obrębie jednej kampanii, ale klient może założyć
   * pięćdziesiąt kampanii i każda ruszy równolegle.
   */
  @Property({ name: 'max_concurrent_calls', type: 'integer', nullable: true })
  maxConcurrentCalls?: number | null

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

/**
 * Pojedyncze połączenie do leada wraz z wynikiem rozmowy.
 *
 * Wynik przychodzi webhookiem po zakończeniu rozmowy, dlatego wszystkie pola
 * wynikowe są nullowalne: wiersz powstaje w momencie zlecenia połączenia,
 * a uzupełnia się później.
 *
 * `conversation_id` jest unikalny w obrębie tenanta i pełni rolę klucza
 * idempotencji: dostawca potrafi wysłać ten sam webhook więcej niż raz.
 */
@Entity({ tableName: 'voicebot_calls' })
@Index({ properties: ['tenantId', 'status'] })
@Index({ properties: ['tenantId', 'phone'] })
@Unique({ properties: ['tenantId', 'conversationId'] })
export class VoiceCall {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  /** Puste dla rozmowy przychodzącej od kogoś, kto nie jest w żadnej kampanii. */
  @Property({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId?: string | null

  /** outbound: bot dzwoni do leada. inbound: ktoś dzwoni na nasz numer. */
  @Property({ type: 'text', default: 'outbound' })
  direction: string = 'outbound'

  /**
   * Wcześniejsze połączenie, na które to jest oddzwonieniem.
   * Oddzwonienie zakłada nowy wiersz i nigdy nie nadpisuje tamtego,
   * bo informacja o tym, że ktoś nie odebrał, sama w sobie ma wartość.
   */
  @Property({ name: 'related_call_id', type: 'uuid', nullable: true })
  relatedCallId?: string | null

  /** Identyfikator rekordu w systemie źródłowym, np. deal w CRM. */
  @Property({ name: 'lead_ref', type: 'text', nullable: true })
  leadRef?: string | null

  @Property({ type: 'text' })
  phone!: string

  @Property({ name: 'first_name', type: 'text', nullable: true })
  firstName?: string | null

  @Property({ name: 'last_name', type: 'text', nullable: true })
  lastName?: string | null

  /**
   * Polaczenie testowe, wykonane przyciskiem "zadzwon do mnie".
   *
   * Nie liczy sie do statystyk kampanii i nie trafia do CRM klienta, bo nie
   * dotyczy zadnego leada. Bez tego rozroznienia pierwsze piec rozmow kazdej
   * firmy psuloby jej wlasne wskazniki skutecznosci.
   */
  @Property({ name: 'is_test', type: 'boolean', default: false })
  isTest: boolean = false

  /** pending, dialing, completed, failed, no_answer, busy */
  @Property({ type: 'text', default: 'pending' })
  status: string = 'pending'

  @Property({ name: 'conversation_id', type: 'text', nullable: true })
  conversationId?: string | null

  @Property({ name: 'started_at', type: Date, nullable: true })
  startedAt?: Date | null

  @Property({ name: 'finished_at', type: Date, nullable: true })
  finishedAt?: Date | null

  @Property({ name: 'duration_secs', type: 'integer', nullable: true })
  durationSecs?: number | null

  @Property({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason?: string | null

  /**
   * Koszt rozmowy u dostawcy, w dolarach.
   *
   * Liczba stałoprzecinkowa, nie zmiennoprzecinkowa: pojedyncza rozmowa
   * kosztuje ułamki centa, a sumujemy ich tysiące, więc błędy zaokrągleń
   * zmiennoprzecinkowych kumulowałyby się na rachunku tenanta.
   */
  @Property({ name: 'cost_usd', type: 'decimal', precision: 12, scale: 6, nullable: true })
  costUsd?: string | null

  /** Koszt w kredytach dostawcy. Po tym pilnuje się zużycia pakietu. */
  @Property({ name: 'cost_credits', type: 'integer', nullable: true })
  costCredits?: number | null

  // --- wynik rozmowy ---

  @Property({ name: 'identity_confirmed', type: 'boolean', nullable: true })
  identityConfirmed?: boolean | null

  @Property({ name: 'consent_given', type: 'boolean', nullable: true })
  consentGiven?: boolean | null

  /** WIBOR, VAL, SKD, NIEUSTALONY */
  @Property({ name: 'product_code', type: 'text', nullable: true })
  productCode?: string | null

  @Property({ name: 'product_description', type: 'text', nullable: true })
  productDescription?: string | null

  @Property({ type: 'text', nullable: true })
  amount?: string | null

  @Property({ type: 'text', nullable: true })
  currency?: string | null

  @Property({ name: 'contract_year', type: 'text', nullable: true })
  contractYear?: string | null

  @Property({ type: 'text', nullable: true })
  bank?: string | null

  @Property({ name: 'lead_active', type: 'boolean', nullable: true })
  leadActive?: boolean | null

  @Property({ name: 'requests_contact', type: 'boolean', nullable: true })
  requestsContact?: boolean | null

  @Property({ name: 'preferred_contact_time', type: 'text', nullable: true })
  preferredContactTime?: string | null

  /**
   * Wszystko, co bot zebral w rozmowie, jako pary nazwa-wartosc.
   *
   * Stale kolumny obok, takie jak bank czy rok umowy, sa pojeciami jednej
   * branzy wbitymi w schemat bazy. Kazda kolejna branza wymagalaby wtedy
   * migracji i programisty przy kazdym kliencie. Tutaj laduje to, co branza
   * zadeklarowala, bez zmiany schematu.
   *
   * Stare kolumny zostaja i nadal sa wypelniane, bo na nich opiera sie widok
   * kredytowy i dane demo.
   */
  @Property({ name: 'collected', type: 'json', nullable: true })
  collected?: Record<string, unknown> | null

  @Property({ name: 'extra_notes', type: 'text', nullable: true })
  extraNotes?: string | null

  @Property({ type: 'text', nullable: true })
  summary?: string | null

  /**
   * Rekord w CRM klienta, do którego trafił wynik rozmowy, w postaci
   * "LEAD:123" albo "CONTACT:456".
   *
   * Trzymamy to u siebie z dwóch powodów: handlowiec widzi w panelu, że
   * rozmowa gdzieś poszła, a przy ponownym webhooku nie zakładamy drugiego
   * rekordu na to samo.
   */
  @Property({ name: 'crm_record_ref', type: 'text', nullable: true })
  crmRecordRef?: string | null

  /**
   * Powód, dla którego zapis do CRM się nie udał.
   *
   * Błąd po stronie CRM nie może wywrócić webhooka, bo wynik rozmowy jest
   * cenniejszy niż zapis w cudzym systemie i nie da się go powtórzyć.
   * Dlatego zapisujemy powód i idziemy dalej, a nie rzucamy błędem.
   */
  @Property({ name: 'crm_error', type: 'text', nullable: true })
  crmError?: string | null

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}
