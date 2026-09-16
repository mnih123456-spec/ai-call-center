import { getAuthFromCookies } from '@open-mercato/shared/lib/auth/server'
import { fetchProviderCatalog } from '../../lib/provider'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['voicebot.campaigns.view'] },
}

export async function GET() {
  const auth = await getAuthFromCookies()
  if (!auth?.orgId) {
    return new Response(JSON.stringify({ configured: false, agents: [], numbers: [] }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }
  const catalog = await fetchProviderCatalog()
  return new Response(JSON.stringify(catalog), { status: 200, headers: { 'content-type': 'application/json' } })
}
