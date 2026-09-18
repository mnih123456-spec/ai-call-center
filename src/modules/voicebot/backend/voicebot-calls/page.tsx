"use client"
import * as React from 'react'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { DataTable } from '@open-mercato/ui/backend/DataTable'
import { Button } from '@open-mercato/ui/primitives/button'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type CallRow = {
  id: string
  phone: string
  firstName: string | null
  lastName: string | null
  status: string
  direction: string
  relatedCallId: string | null
  productCode: string | null
  amount: string | null
  currency: string | null
  contractYear: string | null
  bank: string | null
  requestsContact: boolean | null
  durationSecs: number | null
  summary: string | null
  createdAt: string
}

const PRODUKT: Record<string, string> = {
  WIBOR: 'Hipoteka PLN',
  VAL: 'Kredyt walutowy',
  SKD: 'Pożyczka gotówkowa',
  NIEUSTALONY: 'Nieustalony',
}

function osoba(row: CallRow): string {
  const parts = [row.firstName, row.lastName].filter(Boolean)
  return parts.length ? parts.join(' ') : row.phone
}

function kwota(row: CallRow): string {
  if (!row.amount) return ''
  return row.currency ? `${row.amount} ${row.currency}` : row.amount
}

function czas(secs: number | null): string {
  if (secs == null) return ''
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m ? `${m} min ${s} s` : `${s} s`
}

function jestOddzwonieniem(row: CallRow): boolean {
  return row.direction === 'inbound' && row.relatedCallId != null
}

export default function VoicebotCallsPage() {
  const t = useT()
  const [rows, setRows] = React.useState<CallRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/voicebot/calls?pageSize=100', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as { items?: CallRow[] }
      setRows(Array.isArray(body.items) ? body.items : [])
    } catch {
      setError(t('voicebot.calls.loadError', 'Nie udało się pobrać listy połączeń.'))
    } finally {
      setLoading(false)
    }
  }, [t])

  React.useEffect(() => { void load() }, [load])

  const columns: ColumnDef<CallRow>[] = React.useMemo(() => [
    { id: 'osoba', header: t('voicebot.calls.column.person', 'Rozmówca'), cell: ({ row }) => osoba(row.original) },
    { accessorKey: 'phone', header: t('voicebot.calls.column.phone', 'Numer') },
    {
      id: 'kierunek',
      header: t('voicebot.calls.column.direction', 'Kierunek'),
      cell: ({ row }) => {
        if (row.original.direction !== 'inbound') {
          return t('voicebot.calls.direction.outbound', 'Wychodzące')
        }
        return jestOddzwonieniem(row.original)
          ? t('voicebot.calls.direction.callback', 'Oddzwonienie')
          : t('voicebot.calls.direction.inbound', 'Przychodzące')
      },
    },
    { accessorKey: 'status', header: t('voicebot.calls.column.status', 'Status') },
    {
      id: 'produkt',
      header: t('voicebot.calls.column.product', 'Produkt'),
      cell: ({ row }) => (row.original.productCode ? PRODUKT[row.original.productCode] ?? row.original.productCode : ''),
    },
    { id: 'kwota', header: t('voicebot.calls.column.amount', 'Kwota'), cell: ({ row }) => kwota(row.original) },
    { accessorKey: 'contractYear', header: t('voicebot.calls.column.year', 'Rok umowy') },
    { accessorKey: 'bank', header: t('voicebot.calls.column.bank', 'Bank') },
    { id: 'czas', header: t('voicebot.calls.column.duration', 'Czas'), cell: ({ row }) => czas(row.original.durationSecs) },
  ], [t])

  const zebrane = rows.filter((r) => r.productCode && r.productCode !== 'NIEUSTALONY').length
  const prosiOKontakt = rows.filter((r) => r.requestsContact).length
  const oddzwonienia = rows.filter(jestOddzwonieniem).length

  return (
    <Page>
      <PageHeader
        title={t('voicebot.calls.title', 'Połączenia i wyniki')}
        description={t('voicebot.calls.subtitle', 'Rozmowy zlecone przez bota wraz z danymi zebranymi podczas rozmowy.')}
        actions={<Button variant="outline" onClick={() => void load()}>{t('voicebot.calls.refresh', 'Odśwież')}</Button>}
      />
      <PageBody>
        <div className="mb-4 flex flex-wrap gap-6 text-sm">
          <div>
            <div className="text-muted-foreground">{t('voicebot.calls.stat.total', 'Rozmów')}</div>
            <div className="text-2xl font-semibold">{rows.length}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t('voicebot.calls.stat.qualified', 'Z ustalonym produktem')}</div>
            <div className="text-2xl font-semibold">{zebrane}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t('voicebot.calls.stat.callback', 'Prosi o kontakt')}</div>
            <div className="text-2xl font-semibold">{prosiOKontakt}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t('voicebot.calls.stat.returned', 'Oddzwonili')}</div>
            <div className="text-2xl font-semibold">{oddzwonienia}</div>
          </div>
        </div>
        {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}
        <DataTable columns={columns} data={rows} isLoading={loading} />
      </PageBody>
    </Page>
  )
}
