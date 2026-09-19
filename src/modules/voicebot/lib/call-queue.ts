import { createModuleQueue, type Queue } from '@open-mercato/queue'
import type { EntityManager } from '@mikro-orm/postgresql'
import { createLogger } from '@open-mercato/shared/lib/logger'
import type { z } from 'zod'
import { VoiceCall } from '../data/entities'
import { callJobSchema } from '../data/validators'

export { callJobSchema } from '../data/validators'

export const CALL_QUEUE = 'voicebot-outbound-calls'
export type CallJob = z.infer<typeof callJobSchema>
export type CallScope = Pick<CallJob, 'tenantId' | 'organizationId'>

const logger = createLogger('voicebot').child({ component: 'call-queue' })
let queue: Queue<CallJob> | undefined

export function getCallQueue(): Queue<CallJob> {
  return queue ??= createModuleQueue<CallJob>(CALL_QUEUE, { concurrency: 1 })
}

export async function enqueueCall(payload: CallJob, delayMs = 0): Promise<void> {
  await getCallQueue().enqueue(callJobSchema.parse(payload), { delayMs })
}

/**
 * Pending jest trwalym znacznikiem pracy do wykonania. Publikujemy dopiero po
 * zapisie importu; ponowienie publikacji nie tworzy kolejnego telefonu, bo
 * worker uzywa callId jako klucza idempotencji i sprawdza stan pod blokada.
 */
export async function publishPendingCalls(
  em: EntityManager,
  scope: CallScope,
  campaignId: string,
): Promise<{ published: number; queuePending: boolean }> {
  callJobSchema.omit({ callId: true }).parse({ ...scope, campaignId, type: 'voicebot.call.dispatch' })
  let published = 0
  let afterId: string | undefined
  try {
    for (;;) {
      const calls = await em.find(VoiceCall, {
        ...scope, campaignId, status: 'pending', direction: 'outbound', deletedAt: null,
        ...(afterId ? { id: { $gt: afterId } } : {}),
      }, { fields: ['id'], orderBy: { id: 'asc' }, limit: 200 })
      for (const call of calls) {
        await enqueueCall({ ...scope, campaignId, callId: call.id, type: 'voicebot.call.dispatch' })
        published++
      }
      if (calls.length < 200) return { published, queuePending: false }
      afterId = calls[calls.length - 1].id
    }
  } catch {
    // Nie zwracamy bledu importu po jego zapisie: klient moglby ponownie
    // utworzyc te same rekordy. Pending mozna opublikowac trasa dispatch.
    logger.warn('call queue publication incomplete', { campaignId, published })
    return { published, queuePending: true }
  }
}
