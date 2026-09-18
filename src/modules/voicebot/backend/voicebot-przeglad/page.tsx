'use client'

import * as React from 'react'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { KpiCard } from '@open-mercato/ui/backend/charts'
import { LoadingMessage, ErrorMessage } from '@open-mercato/ui/backend/detail'
import { EmptyState } from '@open-mercato/ui/primitives/empty-state'
import { Button } from '@open-mercato/ui/primitives/button'
import { readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { statsSchema, type Stats } from '../../api/stats/summary'

export default function VoicebotOverviewPage() {
  const t = useT()
  const [stats, setStats] = React.useState<Stats | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)
  const [revision, setRevision] = React.useState(0)

  React.useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    // Odpowiedź poprzedniego odczytu nie może nadpisać nowszego widoku.
    void readApiResultOrThrow<unknown>('/api/voicebot/stats')
      .then((body) => { if (active) setStats(statsSchema.parse(body)) })
      .catch(() => { if (active) { setError(true); setStats(null) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])

  const productName = (code: string | null): string => {
    switch (code) {
      case 'WIBOR': return t('voicebot.overview.product.wibor', 'Hipoteka PLN')
      case 'VAL': return t('voicebot.overview.product.val', 'Kredyt walutowy')
      case 'SKD': return t('voicebot.overview.product.skd', 'Pożyczka gotówkowa')
      case 'NIEUSTALONY': return t('voicebot.overview.product.unknown', 'Nieustalony')
      case null: return t('voicebot.overview.product.missing', 'Brak produktu')
      default: return code
    }
  }
  const allTime = t('voicebot.overview.allTime', 'Cała historia')
  const estimate = t('voicebot.overview.estimate', 'Koszt orientacyjny według zapisanego zużycia')
  const money = (value: number) => t('voicebot.overview.pln', '{amount} zł', { amount: value.toFixed(2) })

  return (
    <Page>
      <PageHeader
        title={t('voicebot.overview.title', 'Przegląd')}
        description={t('voicebot.overview.subtitle', 'Wyniki połączeń i koszty w jednym miejscu.')}
        actions={<Button variant="outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>
          {t('voicebot.overview.refresh', 'Odśwież')}
        </Button>}
      />
      <PageBody>
        <div className="space-y-6" aria-busy={loading}>
          {loading ? <div role="status"><LoadingMessage label={t('voicebot.overview.loading', 'Ładowanie statystyk…')} /></div> : null}
          {error ? <ErrorMessage label={t('voicebot.overview.error', 'Nie udało się pobrać statystyk. Spróbuj odświeżyć widok.')} /> : null}
          {!loading && !error && stats ? <>
            {stats.total === 0 ? <EmptyState
              title={t('voicebot.overview.empty', 'Nie ma jeszcze połączeń')}
              description={t('voicebot.overview.emptyDescription', 'Statystyki pojawią się po zapisaniu pierwszego połączenia.')}
            /> : null}
            <p className="text-sm text-muted-foreground">{t('voicebot.overview.periods', 'Okresy według daty utworzenia połączenia, czas polski. Tydzień zaczyna się w poniedziałek.')}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard title={t('voicebot.overview.today', 'Rozmowy dzisiaj')} value={stats.today} />
              <KpiCard title={t('voicebot.overview.week', 'Rozmowy w tym tygodniu')} value={stats.week} />
              <KpiCard title={t('voicebot.overview.success', 'Skuteczność dodzwonień')} value={stats.successRate}
                formatValue={(value) => t('voicebot.overview.percent', '{value}%', { value: value.toFixed(1) })}
                footer={stats.outbound ? t('voicebot.overview.ratio', '{completed} z {total} wychodzących zakończonych rozmową · cała historia', { completed: stats.completedOutbound, total: stats.outbound }) : t('voicebot.overview.noOutbound', 'Brak połączeń wychodzących')} />
              <KpiCard title={t('voicebot.overview.callbacks', 'Oddzwonienia')} value={stats.callbacks} footer={allTime} />
              <KpiCard title={t('voicebot.overview.costToday', 'Koszt dzisiaj')} value={Number(stats.todayPln)} formatValue={money} footer={estimate} />
              <KpiCard title={t('voicebot.overview.costMonth', 'Koszt w tym miesiącu')} value={Number(stats.monthPln)} formatValue={money} footer={estimate} />
            </div>
            <section className="space-y-4" aria-labelledby="voicebot-products-title">
              <div>
                <h2 id="voicebot-products-title" className="text-lg font-semibold">{t('voicebot.overview.products', 'Rozkład produktów')}</h2>
                <p className="text-sm text-muted-foreground">{allTime}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.products.map(({ code, count }) => <KpiCard key={code ?? '__missing'} title={productName(code)} value={count}
                  footer={t('voicebot.overview.productShare', '{value}% wszystkich połączeń', { value: (100 * count / stats.total).toFixed(1) })} />)}
              </div>
            </section>
          </> : null}
        </div>
      </PageBody>
    </Page>
  )
}
