"use client"
import * as React from 'react'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { DataTable } from '@open-mercato/ui/backend/DataTable'
import { Button } from '@open-mercato/ui/primitives/button'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type CampaignRow = {
  id: string
  name: string
  description: string | null
  agentId: string
  phoneNumberId: string | null
  status: string
  minIntervalSecs: number
  createdAt: string
}

type Catalog = {
  configured: boolean
  agents: { agentId: string; name: string }[]
  numbers: { phoneNumberId: string; phoneNumber: string; provider: string }[]
  error?: string
}

const PUSTY_KATALOG: Catalog = { configured: false, agents: [], numbers: [] }

export default function VoicebotCampaignsPage() {
  const t = useT()
  const [rows, setRows] = React.useState<CampaignRow[]>([])
  const [catalog, setCatalog] = React.useState<Catalog>(PUSTY_KATALOG)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [name, setName] = React.useState('')
  const [agentId, setAgentId] = React.useState('')
  const [phoneNumberId, setPhoneNumberId] = React.useState('')

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cRes, kRes] = await Promise.all([
        fetch('/api/voicebot/campaigns?pageSize=100', { credentials: 'same-origin' }),
        fetch('/api/voicebot/provider', { credentials: 'same-origin' }),
      ])
      if (!cRes.ok) throw new Error(String(cRes.status))
      const body = (await cRes.json()) as { items?: CampaignRow[] }
      setRows(Array.isArray(body.items) ? body.items : [])
      if (kRes.ok) setCatalog(((await kRes.json()) as Catalog) ?? PUSTY_KATALOG)
    } catch {
      setError(t('voicebot.campaigns.loadError', 'Nie udało się pobrać listy kampanii.'))
    } finally {
      setLoading(false)
    }
  }, [t])

  React.useEffect(() => { void load() }, [load])

  React.useEffect(() => {
    if (!agentId && catalog.agents.length) setAgentId(catalog.agents[0].agentId)
    if (!phoneNumberId && catalog.numbers.length) setPhoneNumberId(catalog.numbers[0].phoneNumberId)
  }, [catalog, agentId, phoneNumberId])

  const opisNumeru = React.useCallback((id: string | null): string => {
    if (!id) return ''
    const n = catalog.numbers.find((x) => x.phoneNumberId === id)
    if (!n) return id
    return n.provider ? n.phoneNumber + ' (' + n.provider + ')' : n.phoneNumber
  }, [catalog])

  const opisAgenta = React.useCallback((id: string): string => {
    return catalog.agents.find((a) => a.agentId === id)?.name ?? id
  }, [catalog])

  const zapisz = React.useCallback(async () => {
    if (!name.trim() || !agentId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/voicebot/campaigns', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), agentId, phoneNumberId: phoneNumberId || null, minIntervalSecs: 180 }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setName('')
      setFormOpen(false)
      await load()
    } catch {
      setError(t('voicebot.campaigns.saveError', 'Nie udało się zapisać kampanii.'))
    } finally {
      setSaving(false)
    }
  }, [name, agentId, phoneNumberId, load, t])

  const columns: ColumnDef<CampaignRow>[] = React.useMemo(() => [
    { accessorKey: 'name', header: t('voicebot.campaigns.column.name', 'Nazwa') },
    { accessorKey: 'status', header: t('voicebot.campaigns.column.status', 'Status') },
    { id: 'agent', header: t('voicebot.campaigns.column.agent', 'Agent'), cell: ({ row }) => opisAgenta(row.original.agentId) },
    { id: 'numer', header: t('voicebot.campaigns.column.number', 'Numer'), cell: ({ row }) => opisNumeru(row.original.phoneNumberId) },
  ], [t, opisAgenta, opisNumeru])

  return (
    <Page>
      <PageHeader
        title={t('voicebot.campaigns.title', 'Kampanie głosowe')}
        description={t('voicebot.campaigns.subtitle', 'Listy leadów obsługiwane przez bota telefonicznego.')}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void load()}>{t('voicebot.campaigns.refresh', 'Odśwież')}</Button>
            <Button onClick={() => setFormOpen((v) => !v)}>{t('voicebot.campaigns.new', 'Nowa kampania')}</Button>
          </div>
        }
      />
      <PageBody>
        {!catalog.configured ? (
          <div className="mb-4 rounded border border-dashed p-3 text-sm text-muted-foreground">
            {t('voicebot.campaigns.noKey', 'Brak klucza dostawcy głosu. Agentów i numerów trzeba wpisać ręcznie, a połączenia będą symulowane.')}
          </div>
        ) : null}
        {catalog.error ? <div className="mb-4 text-sm text-destructive">{catalog.error}</div> : null}

        {formOpen ? (
          <div className="mb-4 grid gap-3 rounded border p-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span>{t('voicebot.campaigns.field.name', 'Nazwa kampanii')}</span>
              <input
                className="rounded border px-2 py-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('voicebot.campaigns.field.namePlaceholder', 'np. Leady z formularza, wrzesien')}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t('voicebot.campaigns.field.agent', 'Agent')}</span>
              <select className="rounded border px-2 py-1" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                {catalog.agents.length === 0 ? <option value="">{t('voicebot.campaigns.field.none', 'brak')}</option> : null}
                {catalog.agents.map((a) => <option key={a.agentId} value={a.agentId}>{a.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t('voicebot.campaigns.field.number', 'Numer wychodzący')}</span>
              <select className="rounded border px-2 py-1" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)}>
                {catalog.numbers.length === 0 ? <option value="">{t('voicebot.campaigns.field.none', 'brak')}</option> : null}
                {catalog.numbers.map((n) => (
                  <option key={n.phoneNumberId} value={n.phoneNumberId}>{opisNumeru(n.phoneNumberId)}</option>
                ))}
              </select>
            </label>
            <div className="md:col-span-3">
              <Button onClick={() => void zapisz()} disabled={saving || !name.trim() || !agentId}>
                {saving ? t('voicebot.campaigns.saving', 'Zapisuje...') : t('voicebot.campaigns.save', 'Zapisz kampanie')}
              </Button>
            </div>
          </div>
        ) : null}

        {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}
        <DataTable columns={columns} data={rows} isLoading={loading} />
      </PageBody>
    </Page>
  )
}
