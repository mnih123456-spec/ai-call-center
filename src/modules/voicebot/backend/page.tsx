"use client"
import * as React from 'react'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { DataTable } from '@open-mercato/ui/backend/DataTable'
import { CrudForm, type CrudField } from '@open-mercato/ui/backend/CrudForm'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { createCrud, updateCrud } from '@open-mercato/ui/backend/utils/crud'
import { campaignCreateSchema, campaignUpdateSchema } from '../data/validators'
import { Button } from '@open-mercato/ui/primitives/button'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { PolaczenieTestowe } from './PolaczenieTestowe'

/**
 * Dokad prowadzi skrot "Zamow numer u partnera".
 *
 * Nie odsprzedajemy numerow ani minut, bo to czynilo by nas przedsiebiorca
 * telekomunikacyjnym z wpisem do rejestru UKE i odpowiedzialnoscia za ruch.
 * Klient podpisuje umowe z operatorem sam, my tylko konfigurujemy lacze.
 */
const PARTNER_NUMEROW_URL = process.env.NEXT_PUBLIC_VOICEBOT_PARTNER_NUMEROW_URL ?? 'https://actio.pl'

type CampaignRow = {
  id: string
  name: string
  description: string | null
  agentId: string
  phoneNumberId: string | null
  status: string
  minIntervalSecs: number
  updatedAt: string
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
  const [editing, setEditing] = React.useState<CampaignRow | null>(null)
  const [success, setSuccess] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cRes, kRes] = await Promise.all([
        apiCall<{ items?: CampaignRow[] }>('/api/voicebot/campaigns?pageSize=100'),
        apiCall<Catalog>('/api/voicebot/provider'),
      ])
      if (!cRes.ok) throw new Error(String(cRes.status))
      const body = cRes.result ?? {}
      setRows(Array.isArray(body.items) ? body.items : [])
      setCatalog(kRes.ok ? kRes.result ?? PUSTY_KATALOG : { ...PUSTY_KATALOG, error: 'unavailable' })
    } catch {
      setError(t('voicebot.campaigns.loadError', 'Nie udało się pobrać listy kampanii.'))
    } finally {
      setLoading(false)
    }
  }, [t])

  React.useEffect(() => { void load() }, [load])

  const opisNumeru = React.useCallback((id: string | null): string => {
    if (!id) return ''
    const n = catalog.numbers.find((x) => x.phoneNumberId === id)
    if (!n) return id
    return n.provider ? n.phoneNumber + ' (' + n.provider + ')' : n.phoneNumber
  }, [catalog])

  const opisAgenta = React.useCallback((id: string): string => {
    return catalog.agents.find((a) => a.agentId === id)?.name ?? id
  }, [catalog])

  const statuses = React.useMemo(() => [
    { value: 'draft', label: t('voicebot.campaigns.status.draft', 'Szkic') },
    { value: 'running', label: t('voicebot.campaigns.status.running', 'W toku') },
    { value: 'paused', label: t('voicebot.campaigns.status.paused', 'Wstrzymana') },
    { value: 'finished', label: t('voicebot.campaigns.status.finished', 'Zakończona') },
  ], [t])

  const fields = React.useMemo<CrudField[]>(() => {
    const agents = catalog.agents.map((a) => ({ value: a.agentId, label: a.name }))
    const numbers = catalog.numbers.map((n) => ({ value: n.phoneNumberId, label: opisNumeru(n.phoneNumberId) }))
    // Brak pozycji w katalogu nie może po cichu podmienić zapisanego wyboru.
    if (editing?.agentId && !agents.some((a) => a.value === editing.agentId)) {
      agents.unshift({ value: editing.agentId, label: t('voicebot.campaigns.savedAgent', 'Zapisany agent (poza katalogiem)') })
    }
    if (editing?.phoneNumberId && !numbers.some((n) => n.value === editing.phoneNumberId)) {
      numbers.unshift({ value: editing.phoneNumberId, label: t('voicebot.campaigns.savedNumber', 'Zapisany numer (poza katalogiem)') })
    }
    const result: CrudField[] = [
      { id: 'name', type: 'text', required: true, label: t('voicebot.campaigns.field.name', 'Nazwa kampanii') },
      { id: 'agentId', type: 'select', required: true, label: t('voicebot.campaigns.field.agent', 'Agent'), options: agents },
      { id: 'phoneNumberId', type: 'select', label: t('voicebot.campaigns.field.number', 'Numer wychodzący'), options: [
        { value: '', label: t('voicebot.campaigns.field.none', 'Brak') }, ...numbers,
      ] },
    ]
    if (editing) result.push({ id: 'status', type: 'select', required: true, label: t('voicebot.campaigns.column.status', 'Status'), options: statuses })
    return result
  }, [catalog, editing, opisNumeru, statuses, t])

  const initialValues = React.useMemo(() => editing ? {
    ...editing, phoneNumberId: editing.phoneNumberId ?? '',
  } : {
    name: '', agentId: catalog.agents[0]?.agentId ?? '', phoneNumberId: catalog.numbers[0]?.phoneNumberId ?? '',
  }, [editing, catalog])

  const zapisz = async (values: Record<string, unknown>) => {
    setSaving(true)
    setSuccess(false)
    try {
      const payload = {
        name: String(values.name ?? '').trim(), agentId: String(values.agentId ?? ''),
        phoneNumberId: values.phoneNumberId || null,
      }
      const options = { errorMessage: t('voicebot.campaigns.saveError', 'Nie udało się zapisać kampanii.') }
      if (editing) {
        await updateCrud('voicebot/campaigns', campaignUpdateSchema.parse({
          ...payload, id: editing.id, updatedAt: editing.updatedAt, status: values.status,
        }), options)
      } else {
        await createCrud('voicebot/campaigns', campaignCreateSchema.parse({ ...payload, minIntervalSecs: 180 }), options)
      }
      setFormOpen(false)
      setEditing(null)
      setSuccess(true)
      await load()
    } finally {
      // CrudForm zachowuje wartości i pokazuje błąd, również konflikt wersji 409.
      setSaving(false)
    }
  }

  const columns: ColumnDef<CampaignRow>[] = React.useMemo(() => [
    { accessorKey: 'name', header: t('voicebot.campaigns.column.name', 'Nazwa') },
    { accessorKey: 'status', header: t('voicebot.campaigns.column.status', 'Status'), cell: ({ row }) => statuses.find((s) => s.value === row.original.status)?.label ?? row.original.status },
    { id: 'agent', header: t('voicebot.campaigns.column.agent', 'Agent'), cell: ({ row }) => opisAgenta(row.original.agentId) },
    { id: 'numer', header: t('voicebot.campaigns.column.number', 'Numer'), cell: ({ row }) => opisNumeru(row.original.phoneNumberId) },
    { id: 'edit', header: t('voicebot.campaigns.actions', 'Działania'), cell: ({ row }) => (
      <Button variant="outline" disabled={saving || formOpen} onClick={() => { setEditing(row.original); setFormOpen(true); setSuccess(false) }}>
        {t('voicebot.campaigns.edit', 'Edytuj')}
      </Button>
    ) },
  ], [t, opisAgenta, opisNumeru, statuses, saving, formOpen])

  return (
    <Page>
      <PageHeader
        title={t('voicebot.campaigns.title', 'Kampanie głosowe')}
        description={t('voicebot.campaigns.subtitle', 'Listy leadów obsługiwane przez bota telefonicznego.')}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" disabled={loading || saving || formOpen} onClick={() => void load()}>{t('voicebot.campaigns.refresh', 'Odśwież')}</Button>
            <Button disabled={loading || saving || formOpen} onClick={() => { setEditing(null); setFormOpen(true); setSuccess(false) }}>{t('voicebot.campaigns.new', 'Nowa kampania')}</Button>
          </div>
        }
      />
      <PageBody>
        <PolaczenieTestowe kampanie={rows.map((r) => ({ id: r.id, name: r.name }))} />
        {!catalog.configured && !loading ? (
          <div className="mb-4 rounded border border-dashed p-3 text-sm text-muted-foreground">
            {t('voicebot.campaigns.noCatalog', 'Brak konfiguracji dostawcy głosu. Lista agentów i numerów jest niedostępna.')}
          </div>
        ) : null}
        {catalog.error ? <div role="alert" className="mb-4 text-sm text-destructive">{t('voicebot.campaigns.catalogError', 'Nie udało się pobrać agentów i numerów. Odśwież listę, aby spróbować ponownie.')}</div> : null}

        {/*
          Firma bez numeru nie ruszy z miejsca, a numeru komórkowego nie da się
          tu podpiąć: operator komórkowy nie udostępnia łącza SIP. Dlatego
          zamiast samego "brak numerów" pokazujemy, co z tym zrobić. Numer
          klient zamawia u operatora sam, my go tylko konfigurujemy.
        */}
        {catalog.configured && !loading && catalog.numbers.length === 0 ? (
          <div className="mb-4 rounded border border-dashed p-3 text-sm">
            <div className="font-medium">
              {t('voicebot.campaigns.noNumbers', 'Nie masz jeszcze numeru do dzwonienia')}
            </div>
            <div className="mt-1 text-muted-foreground">
              {t(
                'voicebot.campaigns.noNumbersHint',
                'Numer zamawiasz u operatora telefonii, a potem podłączamy go tutaj. Możesz też podłączyć własną centralę przez łącze SIP. Zwykłego numeru komórkowego nie da się podpiąć.',
              )}
            </div>
            <a
              className="mt-2 inline-block underline"
              href={PARTNER_NUMEROW_URL}
              target="_blank"
              rel="noreferrer noopener"
            >
              {t('voicebot.campaigns.orderNumber', 'Zamów numer u partnera')}
            </a>
          </div>
        ) : catalog.configured && !loading ? (
          /*
            Firma z jednym numerem potrzebuje drugiego, gdy rusza druga
            kampania albo gdy chce dzwonić z numeru lokalnego dla swojego
            miasta. Dlatego skrót zostaje na ekranie także wtedy, gdy numery
            już są, tyle że dyskretnie.
          */
          <div className="mb-4 text-sm text-muted-foreground">
            <a
              className="underline"
              href={PARTNER_NUMEROW_URL}
              target="_blank"
              rel="noreferrer noopener"
            >
              {t('voicebot.campaigns.orderNumber', 'Zamów numer u partnera')}
            </a>
          </div>
        ) : null}

        {formOpen ? (
          <CrudForm
            key={editing?.id ?? 'new'}
            title={editing ? t('voicebot.campaigns.editTitle', 'Edycja kampanii') : t('voicebot.campaigns.new', 'Nowa kampania')}
            fields={fields}
            initialValues={initialValues}
            submitLabel={t('voicebot.campaigns.save', 'Zapisz kampanię')}
            onSubmit={zapisz}
            extraActions={<Button type="button" variant="outline" disabled={saving} onClick={() => { setFormOpen(false); setEditing(null) }}>{t('voicebot.campaigns.cancel', 'Anuluj')}</Button>}
          />
        ) : null}
        {success ? <div role="status" className="mb-3 text-sm">{t('voicebot.campaigns.saved', 'Kampania została zapisana.')}</div> : null}

        {error ? <div role="alert" className="mb-3 text-sm text-destructive">{error}</div> : null}
        <DataTable columns={columns} data={rows} isLoading={loading} emptyState={t('voicebot.campaigns.empty', 'Brak kampanii. Utwórz pierwszą kampanię.')} />
      </PageBody>
    </Page>
  )
}
