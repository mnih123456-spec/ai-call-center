import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { VoiceCall } from '../../../data/entities'
import { pobierzTranskrypcje } from '../../../lib/rozmowa'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['voicebot.calls.view'] },
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
  })
}

/**
 * Transkrypcja rozmowy.
 *
 * Tak samo jak nagranie: idzie przez nas, bo klucz dostawcy jest wspólny dla
 * wszystkich firm, a rozmowa musi należeć do tej, która o nią pyta.
 */
export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.orgId) return json({ wypowiedzi: [] }, 403)

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return json({ error: 'Brak identyfikatora rozmowy' }, 400)

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')

  const call = await em.findOne(VoiceCall, {
    id,
    tenantId: auth.tenantId,
    organizationId: auth.orgId,
    deletedAt: null,
  })
  if (!call) return json({ error: 'Rozmowa nie istnieje' }, 404)
  if (!call.conversationId) return json({ wypowiedzi: [], powod: 'Rozmowa nie ma zapisu u dostawcy' })

  const wypowiedzi = await pobierzTranskrypcje(call.conversationId)
  return json({ wypowiedzi, summary: call.summary ?? null })
}
