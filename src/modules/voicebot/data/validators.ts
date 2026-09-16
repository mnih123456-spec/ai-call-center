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
    }).passthrough().optional(),
  }).passthrough(),
}).passthrough()

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>
export type CallStartInput = z.infer<typeof callStartSchema>
export type PostCallWebhook = z.infer<typeof postCallWebhookSchema>
