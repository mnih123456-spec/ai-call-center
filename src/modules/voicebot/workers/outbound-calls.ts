import type { EntityManager } from '@mikro-orm/postgresql'
import type { JobContext, QueuedJob, WorkerMeta } from '@open-mercato/queue'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { CALL_QUEUE, callJobSchema } from '../lib/call-queue'
import { dispatchCall } from '../lib/dispatch-call'

export const metadata: WorkerMeta = {
  queue: CALL_QUEUE,
  id: 'voicebot:outbound-calls',
  concurrency: 1,
}

export default async function handler(job: QueuedJob<unknown>, _ctx: JobContext): Promise<void> {
  // Sprawdzamy zakres przed utworzeniem kontenera i pierwszym zapytaniem.
  // Do kolejki trafia wylacznie zakres zapisany przez uwierzytelnione API.
  const payload = callJobSchema.parse(job.payload)
  const container = await createRequestContainer()
  try {
    await dispatchCall(container.resolve<EntityManager>('em').fork(), payload)
  } finally {
    await container.dispose()
  }
}
