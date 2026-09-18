import { LockMode } from '@mikro-orm/core'
import type { EntityManager } from '@mikro-orm/postgresql'
import { registerCommand, type CommandHandler } from '@open-mercato/shared/lib/commands'
import { forbidden, notFound } from '@open-mercato/shared/lib/crud/errors'
import { enforceCommandOptimisticLock } from '@open-mercato/shared/lib/crud/optimistic-lock-command'
import { VoiceCampaign } from '../data/entities'
import { campaignUpdateSchema } from '../data/validators'

export const updateCampaignCommand: CommandHandler<unknown, { id: string; updatedAt: string; before: unknown; after: unknown }> = {
  id: 'voicebot.campaigns.update',
  // Zmiana numeru wpływa na kolejne telefony; cofnięcie wymaga świadomej edycji.
  isUndoable: false,
  async execute(raw, ctx) {
    const input = campaignUpdateSchema.parse(raw)
    const tenantId = ctx.auth?.tenantId
    const organizationId = ctx.auth?.orgId
    if (!tenantId || !organizationId) throw forbidden()
    const em = ctx.container.resolve<EntityManager>('em').fork()
    return em.transactional(async (tx) => {
      // Blokada obejmuje odczyt wersji i zapis, więc dwa równoczesne zapisy nie wygrają.
      const campaign = await tx.findOne(VoiceCampaign, {
        id: input.id, tenantId, organizationId, deletedAt: null,
      }, { lockMode: LockMode.PESSIMISTIC_WRITE })
      if (!campaign) throw notFound()
      enforceCommandOptimisticLock({
        resourceKind: 'voicebot.campaigns', resourceId: campaign.id,
        current: campaign.updatedAt, expected: input.updatedAt, request: ctx.request,
      })
      const snapshot = () => ({
        name: campaign.name, description: campaign.description ?? null,
        agentId: campaign.agentId, phoneNumberId: campaign.phoneNumberId ?? null,
        status: campaign.status, minIntervalSecs: campaign.minIntervalSecs,
      })
      const before = snapshot()
      const { id, updatedAt: expectedVersion, ...changes } = input
      const updatedAt = new Date(Math.max(Date.now(), campaign.updatedAt.getTime() + 1, new Date(expectedVersion).getTime() + 1))
      // Jawny zapis wersji omija onUpdate encji: zegar nie może cofnąć wersji
      // ani nadać dwóch identycznych znaczników zapisom w tej samej milisekundzie.
      await tx.nativeUpdate(VoiceCampaign, { id, tenantId, organizationId, deletedAt: null }, { ...changes, updatedAt })
      return { id, updatedAt: updatedAt.toISOString(), before, after: { ...before, ...changes } }
    })
  },
  buildLog: ({ result, ctx }) => ({
    resourceKind: 'voicebot.campaigns', resourceId: result.id,
    tenantId: ctx.auth?.tenantId, organizationId: ctx.auth?.orgId,
    snapshotBefore: result.before, snapshotAfter: result.after,
  }),
}

registerCommand(updateCampaignCommand)
