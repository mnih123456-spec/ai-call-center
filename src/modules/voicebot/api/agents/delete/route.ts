import type { EntityManager } from '@mikro-orm/postgresql'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { VoiceAgentProfile, VoiceCampaign } from '../../../data/entities'
import { usunAgentaUDostawcy } from '../../../lib/nowy-agent'

const logger = createLogger('voicebot')

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['voicebot.campaigns.manage'] },
}

const schema = z.object({ id: z.string().uuid() })

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/**
 * Usunięcie bota firmy.
 *
 * Kasujemy go również u dostawcy, bo slotów na agentów jest na koncie
 * skończona liczba, a bot zapomniany na koncie dalej ją zajmuje.
 *
 * Bota używanego przez kampanię odmawiamy usunąć. Kampania wskazująca na
 * nieistniejącego agenta wygląda w panelu normalnie i psuje się dopiero przy
 * pierwszym telefonie, czyli w najgorszym możliwym momencie.
 */
export async function POST(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.orgId) return json({ error: 'Brak kontekstu organizacji' }, 403)

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json({ error: 'Treść żądania nie jest poprawnym JSON-em' }, 400)
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) return json({ error: 'Nieprawidłowe żądanie' }, 400)

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')
  const zakres = { tenantId: auth.tenantId ?? null, organizationId: auth.orgId }

  const profil = await em.findOne(VoiceAgentProfile, { ...zakres, id: parsed.data.id, deletedAt: null })
  if (!profil) return json({ error: 'Nie znaleziono bota' }, 404)

  const kampanie = await em.find(VoiceCampaign, {
    ...zakres,
    agentId: profil.agentId,
    deletedAt: null,
  })
  if (kampanie.length > 0) {
    return json({
      error: `Tego bota używa ${kampanie.length === 1 ? 'kampania' : 'kampanie'}: `
        + kampanie.map((k) => k.name).join(', ')
        + '. Usuń ją albo przestaw na innego bota.',
    }, 409)
  }

  const teraz = new Date()
  profil.deletedAt = teraz
  profil.updatedAt = teraz
  em.persist(profil)
  await em.flush()

  // Dopiero po skasowaniu u nas ruszamy konto dostawcy. Gdyby kolejność była
  // odwrotna i zapis padł, zostałby w panelu bot bez odpowiednika, którym nie
  // da się zadzwonić, a który wygląda na sprawny.
  const uDostawcy = await usunAgentaUDostawcy(profil.agentId)

  logger.info('company bot deleted', { id: profil.id, agentId: profil.agentId, uDostawcy: uDostawcy.ok })

  return json({
    ok: true,
    uwaga: uDostawcy.ok ? null : `Bot usunięty z panelu, ale u dostawcy został: ${uDostawcy.blad}`,
  })
}
