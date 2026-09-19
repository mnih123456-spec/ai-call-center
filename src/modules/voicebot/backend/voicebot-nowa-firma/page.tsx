"use client"
import * as React from 'react'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type Branza = { id: string; nazwa: string }

type Wynik = {
  nazwa: string
  kampania: string
  numer: string | null
  uwaga: string | null
}

const ETAPY = ['konto', 'przelaczenie', 'bot', 'gotowe'] as const
type Etap = (typeof ETAPY)[number]

/**
 * Zakładanie klienta od zera, jednym przyciskiem.
 *
 * Wcześniej to były cztery czynności w trzech miejscach: załóż tenanta, załóż
 * organizację, przełącz się na nią, dopiero potem załóż bota. Dla klienta to
 * jest jedna decyzja, a nie cztery, i tak ma wyglądać.
 *
 * Ekran frameworka do zakładania tenanta ma napisy wpisane w kod na sztywno,
 * po angielsku, więc i tak nie nadawał się do pokazania klientowi.
 */
export default function VoicebotNowaFirmaPage() {
  const t = useT()
  const [nazwa, setNazwa] = React.useState('')
  const [branza, setBranza] = React.useState('')
  const [strona, setStrona] = React.useState('')
  const [branze, setBranze] = React.useState<Branza[]>([])

  const [etap, setEtap] = React.useState<Etap | null>(null)
  const [blad, setBlad] = React.useState<string | null>(null)
  const [wynik, setWynik] = React.useState<Wynik | null>(null)

  React.useEffect(() => {
    let zywe = true
    void (async () => {
      try {
        const res = await fetch('/api/voicebot/agents', { credentials: 'same-origin' })
        if (!res.ok) return
        const body = (await res.json()) as { branze?: Branza[] }
        if (zywe && Array.isArray(body.branze)) setBranze(body.branze)
      } catch { /* lista branz nie jest warunkiem zalozenia konta */ }
    })()
    return () => { zywe = false }
  }, [])

  /**
   * Przełącza sesję na świeżo założoną firmę.
   *
   * To te same ciasteczka, których używa przełącznik firm w nagłówku.
   * Bez tego kolejne żądanie poszłoby jeszcze w zakresie poprzedniej firmy
   * i bot powstałby nie tam, gdzie trzeba.
   */
  const przelaczNaFirme = React.useCallback((tenantId: string, orgId: string) => {
    const maxAge = 60 * 60 * 24 * 30
    document.cookie = `om_selected_tenant=${encodeURIComponent(tenantId)}; path=/; max-age=${maxAge}; samesite=lax`
    document.cookie = `om_selected_org=${encodeURIComponent(orgId)}; path=/; max-age=${maxAge}; samesite=lax`
  }, [])

  const zaloz = React.useCallback(async () => {
    const czysta = nazwa.trim()
    if (czysta.length < 2) return
    setBlad(null)
    setWynik(null)

    try {
      setEtap('konto')
      const odpFirma = await fetch('/api/directory/tenants', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: czysta, isActive: true }),
      })
      const firma = (await odpFirma.json().catch(() => null)) as { id?: string; error?: string } | null
      if (!odpFirma.ok || !firma?.id) {
        setBlad(firma?.error ?? t('voicebot.newCompany.errorTenant', 'Nie udało się założyć konta firmy.'))
        return
      }

      const odpOrg = await fetch('/api/directory/organizations', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: czysta, tenantId: firma.id, isActive: true }),
      })
      const org = (await odpOrg.json().catch(() => null)) as { id?: string; error?: string } | null
      if (!odpOrg.ok || !org?.id) {
        setBlad(org?.error ?? t('voicebot.newCompany.errorOrg', 'Konto powstało, ale nie udało się go uruchomić.'))
        return
      }

      setEtap('przelaczenie')
      przelaczNaFirme(firma.id, org.id)

      setEtap('bot')
      const odpBot = await fetch('/api/voicebot/agents/create', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nazwaFirmy: czysta, industry: branza, knowledgeUrl: strona }),
      })
      const bot = (await odpBot.json().catch(() => null)) as
        | { error?: string; nazwa?: string; uwaga?: string; kampaniaNazwa?: string; numerPrzypisany?: string | null }
        | null
      if (!odpBot.ok) {
        setBlad(
          t('voicebot.newCompany.errorBot', 'Konto firmy powstało, ale bot nie: ')
          + (bot?.error ?? ''),
        )
        return
      }

      setNazwa('')
      setBranza('')
      setStrona('')
      setEtap('gotowe')
      setWynik({
        nazwa: bot?.nazwa ?? czysta,
        kampania: bot?.kampaniaNazwa ?? '',
        numer: bot?.numerPrzypisany ?? null,
        uwaga: bot?.uwaga ?? null,
      })
    } catch {
      setBlad(t('voicebot.newCompany.error', 'Nie udało się dokończyć zakładania.'))
    } finally {
      if (etap !== 'gotowe') setEtap((e) => (e === 'gotowe' ? e : null))
    }
  }, [nazwa, branza, strona, przelaczNaFirme, etap, t])

  const pracuje = etap !== null && etap !== 'gotowe'

  const napisEtapu = React.useMemo(() => {
    switch (etap) {
      case 'konto': return t('voicebot.newCompany.stepAccount', 'Zakładam konto...')
      case 'przelaczenie': return t('voicebot.newCompany.stepSwitch', 'Przygotowuję miejsce na dane...')
      case 'bot': return t('voicebot.newCompany.stepBot', 'Uczę bota rozmawiać...')
      default: return ''
    }
  }, [etap, t])

  return (
    <Page>
      <PageHeader title={t('voicebot.newCompany.title', 'Nowy klient')} />
      <PageBody>
        <div className="grid max-w-xl gap-4">
          {/* Po zalozeniu formularz znika. Zostawiony na ekranie zaprasza do
              zalozenia kolejnej firmy, a tego nikt w tym momencie nie chce:
              wlasnie zalozyl jedna i ma ja skonfigurowac. */}
          {wynik ? null : (
          <div className="grid gap-3 rounded border p-4">
            <p className="text-sm text-muted-foreground">
              {t(
                'voicebot.newCompany.lead',
                'Podaj trzy rzeczy, a w minutę dostaniesz gotowego bota dla tej firmy.',
              )}
            </p>

            <label className="flex flex-col gap-1 text-sm">
              <span>{t('voicebot.newCompany.name', 'Nazwa firmy')}</span>
              <input
                className="rounded border px-2 py-1"
                value={nazwa}
                onChange={(e) => setNazwa(e.target.value)}
                placeholder={t('voicebot.newCompany.placeholder', 'np. Kancelaria Nowak')}
                disabled={pracuje}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span>{t('voicebot.newCompany.industry', 'Branża')}</span>
              <select
                className="rounded border px-2 py-1"
                value={branza}
                onChange={(e) => setBranza(e.target.value)}
                disabled={pracuje}
              >
                {branze.map((b) => <option key={b.id} value={b.id}>{b.nazwa}</option>)}
              </select>
              <span className="text-xs text-muted-foreground">
                {t('voicebot.newCompany.industryHint', 'Decyduje, po co bot dzwoni i jakich pojęć używa.')}
              </span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span>{t('voicebot.newCompany.site', 'Adres strony firmy, opcjonalnie')}</span>
              <input
                className="rounded border px-2 py-1"
                value={strona}
                onChange={(e) => setStrona(e.target.value)}
                placeholder="https://twojafirma.pl"
                disabled={pracuje}
              />
              <span className="text-xs text-muted-foreground">
                {t('voicebot.newCompany.siteHint', 'Przeczytamy ją, żeby bot wiedział, czym firma się zajmuje.')}
              </span>
            </label>

            <div className="flex items-center gap-3">
              <Button onClick={() => void zaloz()} disabled={pracuje || nazwa.trim().length < 2}>
                {pracuje
                  ? napisEtapu
                  : t('voicebot.newCompany.submit', 'Załóż konto i bota')}
              </Button>
            </div>

            {blad ? <div className="text-sm text-destructive">{blad}</div> : null}
          </div>
          )}

          {wynik ? (
            <div className="rounded border p-4 text-sm">
              <div className="font-medium">
                {t('voicebot.newCompany.doneTitle', 'Gotowe. Bot dla ')}{wynik.nazwa}{t('voicebot.newCompany.doneTitleTail', ' jest przygotowany.')}
              </div>
              <div className="mt-1 text-muted-foreground">
                {t('voicebot.newCompany.doneBody', 'Ma przygotowane pytania i wie, o czym rozmawiać.')}
                {wynik.numer
                  ? t('voicebot.newCompany.doneNumber', ' Będzie dzwonił z numeru ') + wynik.numer + '.'
                  : t('voicebot.newCompany.doneNoNumber', ' Zostało przypisać mu numer telefonu.')}
              </div>
              {wynik.uwaga ? <div className="mt-1 text-muted-foreground">{wynik.uwaga}</div> : null}

              <div className="mt-3 flex flex-wrap gap-4">
                <a className="underline" href="/backend/voicebot">
                  {t('voicebot.newCompany.ctaCall', 'Posłuchaj, jak brzmi')}
                </a>
                <a className="underline" href="/backend/voicebot-agenci">
                  {t('voicebot.newCompany.ctaBot', 'Zmień pytania')}
                </a>
                <button
                  type="button"
                  className="underline text-muted-foreground"
                  onClick={() => { setWynik(null); setEtap(null) }}
                >
                  {t('voicebot.newCompany.ctaNext', 'Załóż kolejnego klienta')}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </PageBody>
    </Page>
  )
}
