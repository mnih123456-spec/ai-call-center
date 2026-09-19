import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { VoiceCall } from '../../../data/entities'
import { pobierzNagranie } from '../../../lib/rozmowa'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['voicebot.calls.view'] },
}

/**
 * Nagranie rozmowy, podawane przez nas, a nie wprost od dostawcy.
 *
 * Dostawca wymaga klucza konta, a ten jest wspólny dla wszystkich firm.
 * Gdybyśmy dali przeglądarce odnośnik wprost do niego, klucz wyciekłby do
 * pierwszego lepszego użytkownika panelu, a razem z nim dostęp do nagrań
 * wszystkich naszych klientów. Dlatego nagranie przechodzi przez nas,
 * a my najpierw sprawdzamy, czy ta rozmowa należy do tej firmy.
 */
export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.orgId) return new Response('Brak uprawnień', { status: 403 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return new Response('Brak identyfikatora rozmowy', { status: 400 })

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')

  const call = await em.findOne(VoiceCall, {
    id,
    tenantId: auth.tenantId,
    organizationId: auth.orgId,
    deletedAt: null,
  })
  if (!call?.conversationId) return new Response('Nagranie niedostępne', { status: 404 })

  const nagranie = await pobierzNagranie(call.conversationId)
  if (!nagranie) return new Response('Dostawca nie udostępnił nagrania', { status: 404 })

  return new Response(nagranie.dane, {
    status: 200,
    headers: {
      'content-type': nagranie.typ,
      // Nagranie rozmowy to dane osobowe, więc nie pozwalamy go
      // przechowywać pośrednikom ani pamięci podręcznej przeglądarki.
      'cache-control': 'private, no-store',
    },
  })
}
