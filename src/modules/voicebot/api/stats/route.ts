import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { VoiceCall } from '../../data/entities'
import { statsSchema, summarizeCalls } from './summary'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['voicebot.calls.view'] },
}

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return Response.json({ error: 'unauthorized' }, { status: 401 })
  // Brak pełnego zakresu nie może zamienić podsumowania w odczyt całej bazy.
  if (!auth.tenantId || !auth.orgId) {
    return Response.json({ error: 'scope_required' }, { status: 403 })
  }
  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')
  // Projekcja pomija numery, transkrypcje i dane rozmówców; statystyki nie mają limitu listy.
  const rows = await em.find(VoiceCall, {
    tenantId: auth.tenantId, organizationId: auth.orgId, deletedAt: null,
  }, {
    fields: ['createdAt', 'direction', 'status', 'relatedCallId', 'productCode', 'costUsd'],
  })
  return Response.json(summarizeCalls(rows), { headers: { 'Cache-Control': 'private, no-store' } })
}

export const openApi: OpenApiRouteDoc = {
  tag: 'Voicebot',
  methods: {
    GET: {
      summary: 'Podsumowanie połączeń w bieżącej organizacji',
      description: 'Okresy według createdAt w Europe/Warsaw; tydzień od poniedziałku. Skuteczność, oddzwonienia i produkty obejmują całą historię. Koszty PLN są orientacyjne.',
      responses: [{ status: 200, description: 'Statystyki połączeń', schema: statsSchema }],
      errors: [
        { status: 401, description: 'Wymagane logowanie' },
        { status: 403, description: 'Brak uprawnień lub zakresu tenanta i organizacji' },
      ],
    },
  },
}
