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

  @Property({ name: 'extra_notes', type: 'text', nullable: true })
  extraNotes?: string | null

  @Property({ type: 'text', nullable: true })
  summary?: string | null

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
