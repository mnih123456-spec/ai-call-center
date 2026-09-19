'use client'
import * as React from 'react'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { DataTable } from '@open-mercato/ui/backend/DataTable'
import { Button } from '@open-mercato/ui/primitives/button'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { PrzyciskMaskowania, maskujNumer, maskujOsobe, useMaskowanie } from '../maskowanie'
import type { ReviewReason } from '../../api/calls/review/rules'

type ReviewRow = {
  id: string; firstName: string | null; lastName: string | null
  phone: string; status: string; reasons: ReviewReason[]; createdAt: string
}

export default function VoicebotReviewPage() {
  const t = useT()
  const { zaslonione, przelacz } = useMaskowanie()
  const [rows, setRows] = React.useState<ReviewRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(25)
  const [total, setTotal] = React.useState(0)
  const [revision, refresh] = React.useReducer((value: number) => value + 1, 0)

  React.useEffect(() => {
    // Spóźniona odpowiedź nie może podmienić aktualnie wybranej strony.
    let active = true
    setLoading(true)
    setError(false)
    setRows([])
    void (async () => {
      try {
        const response = await apiCall<{ items: ReviewRow[]; total: number }>(
          `/api/voicebot/calls/review?page=${page}&pageSize=${pageSize}`,
        )
        if (!response.ok || !response.result) throw new Error('review_load_failed')
        if (active) { setRows(response.result.items); setTotal(response.result.total) }
      } catch {
        if (active) { setError(true); setTotal(0) }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [page, pageSize, revision])

  const columns = React.useMemo<ColumnDef<ReviewRow>[]>(() => {
    const reasons: Record<ReviewReason, string> = {
      consent_missing: t('voicebot.review.reason.consent', 'Brak zgody lub jej potwierdzenia'),
      identity_unconfirmed: t('voicebot.review.reason.identity', 'Niepotwierdzona tożsamość'),
      product_unknown: t('voicebot.review.reason.product', 'Nieustalony produkt'),
      call_failed: t('voicebot.review.reason.failed', 'Nieudane połączenie'),
      no_answer: t('voicebot.review.reason.noAnswer', 'Brak odpowiedzi'),
      crm_error: t('voicebot.review.reason.crm', 'Nie udało się zapisać do CRM'),
    }
    const statuses: Record<string, string> = {
      pending: t('voicebot.review.status.pending', 'Oczekujące'),
      dialing: t('voicebot.review.status.dialing', 'Łączenie'),
      completed: t('voicebot.review.status.completed', 'Zakończone'),
      failed: t('voicebot.review.status.failed', 'Nieudane'),
      no_answer: t('voicebot.review.status.noAnswer', 'Nieodebrane'),
      busy: t('voicebot.review.status.busy', 'Zajęte'),
    }
    return [
      { id: 'person', header: t('voicebot.calls.column.person', 'Rozmówca'), cell: ({ row }) => {
        const name = [row.original.firstName, row.original.lastName].filter(Boolean).join(' ')
        return name ? (zaslonione ? maskujOsobe(name) : name) : t('voicebot.review.unknownPerson', 'Nieznany rozmówca')
      } },
      { id: 'phone', header: t('voicebot.calls.column.phone', 'Numer'), cell: ({ row }) => zaslonione ? maskujNumer(row.original.phone) : row.original.phone },
      { id: 'status', header: t('voicebot.calls.column.status', 'Status'), cell: ({ row }) => statuses[row.original.status] ?? t('voicebot.review.status.unknown', 'Nieznany') },
      { id: 'reasons', header: t('voicebot.review.column.reason', 'Powód'), cell: ({ row }) => row.original.reasons.map((reason) => reasons[reason]).join('; ') },
      { id: 'date', header: t('voicebot.review.column.date', 'Data'), cell: ({ row }) => new Date(row.original.createdAt).toLocaleString() },
    ]
  }, [t, zaslonione])

  return <Page>
    <PageHeader title={t('voicebot.review.title', 'Do sprawdzenia')} actions={<div className="flex gap-2">
      <PrzyciskMaskowania zaslonione={zaslonione} przelacz={przelacz}
        etykietaWlacz={t('voicebot.mask.on', 'Zasłoń dane')} etykietaWylacz={t('voicebot.mask.off', 'Pokaż dane')} />
      <Button variant="outline" disabled={loading} onClick={() => refresh()}>{t('voicebot.calls.refresh', 'Odśwież')}</Button>
    </div>} />
    <PageBody>
      {error ? <div role="alert" className="text-sm text-destructive">{t('voicebot.review.loadError', 'Nie udało się pobrać rozmów. Spróbuj odświeżyć listę.')}</div> :
        <DataTable<ReviewRow> entityId="voicebot:voice_call" extensionTableId="voicebot.calls.review"
          columns={columns} data={rows} isLoading={loading}
          emptyState={t('voicebot.review.empty', 'Brak rozmów wymagających sprawdzenia.')}
          pagination={{ page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), onPageChange: setPage,
            onPageSizeChange: (size) => { setPageSize(size); setPage(1) } }} />}
    </PageBody>
  </Page>
}
