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
  provider: z.enum(['bitrix24']).default('bitrix24'),
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
