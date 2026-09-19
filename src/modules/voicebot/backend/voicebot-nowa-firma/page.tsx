"use client"
import * as React from 'react'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type Wynik = { tenantId: string; orgId: string; nazwa: string }

/**
 * Zakładanie firmy po polsku.
 *
 * Ekran frameworka ma napisy wpisane w kod na sztywno, po angielsku, bez
 * kluczy tłumaczeń, więc nie da się ich podmienić słownikiem. Zamiast
 * podmieniać cudzy ekran, wołamy jego trasy z własnego. Logika zakładania
 * zostaje po stronie frameworka, nasza jest tylko warstwa widoczna.
 */
export default function VoicebotNowaFirmaPage() {
  const t = useT()
  const [nazwa, setNazwa] = React.useState('')
  const [pracuje, setPracuje] = React.useState(false)
  const [blad, setBlad] = React.useState<string | null>(null)
  const [wynik, setWynik] = React.useState<Wynik | null>(null)

  const zaloz = React.useCallback(async () => {
    const czysta = nazwa.trim()
    if (czysta.length < 2) return
    setPracuje(true)
    setBlad(null)
    setWynik(null)
    try {
      const odpFirma = await fetch('/api/directory/tenants', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: czysta, isActive: true }),
      })
      const firma = (await odpFirma.json().catch(() => null)) as { id?: string; error?: string } | null
      if (!odpFirma.ok || !firma?.id) {
        setBlad(firma?.error ?? t('voicebot.newCompany.errorTenant', 'Nie udało się założyć firmy.'))
        return
      }

      // Firma bez organizacji jest pusta: to organizacja niesie dane i to do
      // niej przypina się bot. Zakładamy obie naraz, bo dla klienta to jedna
      // czynność, a nie dwie.
      const odpOrg = await fetch('/api/directory/organizations', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: czysta, tenantId: firma.id, isActive: true }),
      })
      const org = (await odpOrg.json().catch(() => null)) as { id?: string; error?: string } | null
      if (!odpOrg.ok || !org?.id) {
        setBlad(org?.error ?? t('voicebot.newCompany.errorOrg', 'Firma powstała, ale nie udało się założyć jej organizacji.'))
        return
      }

      setNazwa('')
      setWynik({ tenantId: firma.id, orgId: org.id, nazwa: czysta })
    } catch {
      setBlad(t('voicebot.newCompany.error', 'Nie udało się założyć firmy.'))
    } finally {
      setPracuje(false)
    }
  }, [nazwa, t])

  return (
    <Page>
      <PageHeader title={t('voicebot.newCompany.title', 'Nowa firma')} />
      <PageBody>
        <div className="grid max-w-xl gap-4">
          <div className="grid gap-3 rounded border p-4">
            <label className="flex flex-col gap-1 text-sm">
              <span>{t('voicebot.newCompany.name', 'Nazwa firmy')}</span>
              <input
                className="rounded border px-2 py-1"
                value={nazwa}
                onChange={(e) => setNazwa(e.target.value)}
                placeholder={t('voicebot.newCompany.placeholder', 'np. Kancelaria Nowak')}
              />
            </label>

            <div className="flex items-center gap-3">
              <Button onClick={() => void zaloz()} disabled={pracuje || nazwa.trim().length < 2}>
                {pracuje
                  ? t('voicebot.newCompany.working', 'Zakładam...')
                  : t('voicebot.newCompany.submit', 'Załóż firmę')}
              </Button>
            </div>

            {blad ? <div className="text-sm text-destructive">{blad}</div> : null}
          </div>

          {wynik ? (
            <div className="rounded border p-4 text-sm">
              <div className="font-medium">
                {t('voicebot.newCompany.doneTitle', 'Firma założona: ')}{wynik.nazwa}
              </div>
              <ol className="mt-2 list-decimal pl-5 text-muted-foreground">
                <li>
                  {t('voicebot.newCompany.step1', 'Przełącz się na nią przełącznikiem firm u góry ekranu.')}
                </li>
                <li>
                  {t('voicebot.newCompany.step2', 'Wejdź w Boty telefoniczne i załóż jej bota.')}
                </li>
                <li>
                  {t('voicebot.newCompany.step3', 'Wykonaj rozmowę testową na swój numer.')}
                </li>
              </ol>
              <a className="mt-3 inline-block underline" href="/backend/voicebot-agenci">
                {t('voicebot.newCompany.cta', 'Przejdź do botów telefonicznych')}
              </a>
            </div>
          ) : null}
        </div>
      </PageBody>
    </Page>
  )
}
