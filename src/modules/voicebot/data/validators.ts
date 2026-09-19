import { z } from 'zod'

export const productCodeSchema = z.enum(['WIBOR', 'VAL', 'SKD', 'NIEUSTALONY'])

export const callStatusSchema = z.enum([
  'pending', 'dialing', 'completed', 'failed', 'no_answer', 'busy',
])

/** Numer w formacie E.164, np. +48500100200. */
export const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, 'Numer musi być w formacie E.164, np. +48500100200')

export const campaignCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  agentId: z.string().min(1).max(200),
  phoneNumberId: z.string().max(200).nullable().optional(),
  minIntervalSecs: z.coerce.number().min(0).max(3600).default(180),
})

export const campaignUpdateSchema = campaignCreateSchema.partial().extend({
  id: z.string().uuid(),
  updatedAt: z.string().datetime(),
  // Częściowa edycja nie może przywracać domyślnego odstępu z tworzenia.
  minIntervalSecs: z.coerce.number().int().min(0).max(3600).optional(),
  status: z.enum(['draft', 'running', 'paused', 'finished']).optional(),
})

export const campaignListSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  sortField: z.enum(['name', 'status', 'created_at']).default('created_at'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})

export const callStartSchema = z.object({
  campaignId: z.string().uuid(),
  phone: phoneSchema,
  leadRef: z.string().max(200).nullable().optional(),
  firstName: z.string().max(100).nullable().optional(),
  lastName: z.string().max(100).nullable().optional(),
})

// Zakres zadania ustala API z sesji; nie jest czescia publicznego formularza.
export const callJobSchema = z.object({
  type: z.literal('voicebot.call.dispatch'),
  tenantId: z.string().uuid(),
  organizationId: z.string().uuid(),
  campaignId: z.string().uuid(),
  callId: z.string().uuid(),
})
export const callDispatchSchema = z.object({ campaignId: z.string().uuid() })

/**
 * Wklejona lista kontaktów.
 *
 * Górne ograniczenie jest po to, żeby jedno wklejenie nie zablokowało
 * bazy na minutę. Przy większych listach lepszy jest import pliku,
 * i to będzie osobna sprawa.
 */
export const listImportSchema = z.object({
  campaignId: z.string().uuid(),
  tekst: z.string().min(1).max(200000),
})

/**
 * Polaczenie testowe.
 *
 * Ten sam ksztalt co zlecenie zwykle, tylko bez odwolania do leada: test nie
 * dotyczy niczyjej sprawy, tylko sprawdzenia, jak bot brzmi.
 */
export const testCallSchema = z.object({
  campaignId: z.string().uuid(),
  phone: phoneSchema,
  firstName: z.string().max(100).nullable().optional(),
  lastName: z.string().max(100).nullable().optional(),
})

/**
 * Profil agenta firmy.
 *
 * Klient podaje pytania do scenariusza rozmowy, a nie prompt. Prompt jest nasz
 * i to on odpowiada za to, ze bot przedstawia sie, pyta o zgode i nie zmysla.
 * Gdyby klient mogl go nadpisac, pierwsza firma, ktora skasuje zdanie o zgodzie,
 * zrobilaby z tego problem prawny nasz, a nie swoj.
 */
export const agentProfileSchema = z.object({
  id: z.string().uuid().optional(),
  agentId: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  direction: z.enum(['outbound', 'inbound']).default('outbound'),
  industry: z.string().max(50).nullable().optional().or(z.literal('')),
  industryKnowledge: z.string().max(4000).nullable().optional(),
  questions: z.string().max(5000).nullable().optional(),
  knowledgeUrl: z.string().url().max(500).nullable().optional().or(z.literal('')),
  /** Wymuszenie ponownego odczytu strony, gdy adres się nie zmienił. */
  odswiezWiedze: z.boolean().optional(),
  /** Ustawienia rozmowy przekazywane dostawcy: model i czas ciszy. */
  llm: z.string().max(80).nullable().optional().or(z.literal('')),
  cisza: z.coerce.number().min(0.5).max(10).nullable().optional(),
})

export const callListSchema = z.object({
  campaignId: z.string().uuid().optional(),
  status: callStatusSchema.optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  sortField: z.enum(['created_at', 'status', 'phone']).default('created_at'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Dane dostępowe do CRM klienta.
 *
 * Adres musi być pełnym adresem webhooka przychodzącego Bitriksa, czyli
 * zawierać w ścieżce `/rest/`. Sprawdzamy to od razu, bo najczęstszą pomyłką
 * jest wklejenie adresu samego portalu, a wtedy błąd wyszedłby dopiero przy
 * pierwszej rozmowie, czyli w najgorszym możliwym momencie.
 */
export const crmConnectionSchema = z.object({
  provider: z.enum(['bitrix24', 'mercato']).default('bitrix24'),
  /**
   * Pomijany przy zmianie samego lejka albo etapu: adres jest już zapisany,
   * a wymaganie ponownego wklejania hasła przy każdej drobnej zmianie
   * kończy się tym, że ludzie trzymają je w notatniku.
   */
  webhookUrl: z.string()
    .url('To nie jest poprawny adres')
    .max(500)
    .refine((v) => v.startsWith('https://'), 'Adres musi zaczynać się od https://')
    .refine((v) => v.includes('/rest/'), 'To nie wygląda na adres webhooka. Powinien zawierać /rest/')
    .optional(),
  /** Puste znaczy: zostaw dostawcy jego domyślny lejek. */
  pipelineId: z.string().max(50).nullable().optional(),
  stageId: z.string().max(100).nullable().optional(),
  active: z.boolean().default(true),
})

export type CrmConnectionInput = z.infer<typeof crmConnectionSchema>

/**
 * Kształt webhooka po zakończeniu rozmowy.
 *
 * Celowo luźny: dostawca dokłada pola bez zapowiedzi, a odrzucenie całego
 * zdarzenia z powodu nieznanego klucza oznaczałoby utratę wyniku rozmowy,
 * której nie da się powtórzyć.
 */
const collectedValueSchema = z.object({ value: z.unknown() }).passthrough()

export const postCallWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    conversation_id: z.string().min(1),
    conversation_initiation_client_data: z.object({
      dynamic_variables: z.record(z.string(), z.unknown()).optional(),
    }).passthrough().optional(),
    analysis: z.object({
      call_successful: z.string().optional(),
      transcript_summary: z.string().optional(),
      data_collection_results: z.record(z.string(), collectedValueSchema).optional(),
    }).passthrough().optional(),
    metadata: z.object({
      call_duration_secs: z.coerce.number().optional(),
      start_time_unix_secs: z.coerce.number().optional(),
      termination_reason: z.string().optional(),
      /** Koszt rozmowy: w kredytach dostawcy i w dolarach. */
      cost: z.coerce.number().optional(),
      cost_fiat: z.coerce.number().optional(),
      /**
       * Obecne tylko przy rozmowie telefonicznej. Stąd bierzemy kierunek,
       * numer dzwoniącego i numer, na który zadzwoniono. Ten ostatni jest
       * naszym kluczem tenanta: webhook nie ma sesji, więc nie może ufać
       * temu, co przyszło w treści.
       */
      phone_call: z.object({
        direction: z.string().optional(),
        external_number: z.string().optional(),
        agent_number: z.string().optional(),
        phone_number_id: z.string().optional(),
      }).passthrough().optional(),
    }).passthrough().optional(),
  }).passthrough(),
}).passthrough()

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>
export type CallStartInput = z.infer<typeof callStartSchema>
export type PostCallWebhook = z.infer<typeof postCallWebhookSchema>

/**
 * Progi firmy-klienta.
 *
 * Puste pole znaczy "bez limitu", dlatego dopuszczamy null i pusty ciąg:
 * w formularzu wyczyszczenie pola ma zdejmować próg, a nie ustawiać zero.
 */
const progSchema = z
  // Kolejnosc w unii jest tu cala istota rzeczy. z.coerce.number() zamienia
  // zarowno pusty ciag, jak i null na zero, wiec postawiony pierwszy zamienia
  // "bez limitu" w "zero minut", czyli w zakaz dzwonienia. Puste wartosci
  // musza zostac rozpoznane, zanim cokolwiek sprobuje je przeliczyc.
  .union([
    z.null(),
    z.literal('').transform(() => null),
    z.coerce.number().int().min(0).max(1_000_000),
  ])
  .optional()

export const limitsSchema = z.object({
  /** Identyfikatory numerow u dostawcy, z ktorych firma moze dzwonic. */
  allowedNumbers: z.array(z.string().max(200)).max(50).optional(),
  minutesPerMonth: progSchema,
  maxVoices: progSchema,
  maxConcurrentCalls: progSchema,
})
