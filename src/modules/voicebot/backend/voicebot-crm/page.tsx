"use client"
import * as React from 'react'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type Stan = {
  configured: boolean
  provider?: string
  active?: boolean
  adresSkrocony?: string
  checkedAt?: string | null
  checkResult?: string | null
}

const PUSTY: Stan = { configured: false }

export default function VoicebotCrmPage() {
  const t = useT()
  const [stan, setStan] = React.useState<Stan>(PUSTY)
  const [adres, setAdres] = React.useState('')
  const [ladowanie, setLadowanie] = React.useState(true)
  const [zapis, setZapis] = React.useState(false)
  const [blad, setBlad] = React.useState<string | null>(null)
  const [sukces, setSukces] = React.useState<string | null>(null)

  const wczytaj = React.useCallback(async () => {
    setLadowanie(true)
    setBlad(null)
    try {
      const res = await fetch('/api/voicebot/crm', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(String(res.status))
      setStan(((await res.json()) as Stan) ?? PUSTY)
    } catch {
      setBlad(t('voicebot.crm.loadError', 'Nie udało się pobrać stanu połączenia.'))
    } finally {
      setLadowanie(false)
    }
  }, [t])

  React.useEffect(() => { void wczytaj() }, [wczytaj])

  const zapisz = React.useCallback(async () => {
    if (!adres.trim()) return
    setZapis(true)
    setBlad(null)
    setSukces(null)
    try {
      const res = await fetch('/api/voicebot/crm', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: 'bitrix24', webhookUrl: adres.trim(), active: true }),
      })
      const tresc = (await res.json().catch(() => null)) as
        | { error?: string; szczegoly?: string; checkResult?: string }
        | null
      if (!res.ok) {
        setBlad([tresc?.error, tresc?.szczegoly].filter(Boolean).join(': ')
          || t('voicebot.crm.saveError', 'Nie udało się zapisać połączenia.'))
        return
      }
      setAdres('')
      setSukces(tresc?.checkResult ?? t('voicebot.crm.saved', 'Zapisano.'))
      await wczytaj()
    } catch {
      setBlad(t('voicebot.crm.saveError', 'Nie udało się zapisać połączenia.'))
    } finally {
      setZapis(false)
    }
  }, [adres, wczytaj, t])

  return (
    <Page>
      <PageHeader
        title={t('voicebot.crm.title', 'Połączenie z CRM')}
        description={t('voicebot.crm.subtitle', 'Wyniki rozmów trafiają do systemu, którego używa Twój zespół.')}
        actions={<Button variant="outline" onClick={() => void wczytaj()}>{t('voicebot.crm.refresh', 'Odśwież')}</Button>}
      />
      <PageBody>
        {ladowanie ? (
          <div className="text-sm text-muted-foreground">{t('voicebot.crm.loading', 'Wczytuję...')}</div>
        ) : (
          <div className="max-w-2xl">
            <div className="mb-6 rounded border p-4 text-sm">
              {stan.configured ? (
                <>
                  <div className="font-medium">{t('voicebot.crm.connected', 'Połączono z Bitrix24')}</div>
                  <div className="mt-1 text-muted-foreground">
                    {t('voicebot.crm.address', 'Adres')}: {stan.adresSkrocony}
                  </div>
                  {stan.checkResult ? (
                    <div className="mt-1 text-muted-foreground">{stan.checkResult}</div>
                  ) : null}
                  {stan.checkedAt ? (
                    <div className="mt-1 text-muted-foreground">
                      {t('voicebot.crm.checkedAt', 'Sprawdzono')}: {new Date(stan.checkedAt).toLocaleString('pl-PL')}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="font-medium">{t('voicebot.crm.notConnected', 'Brak połączenia z CRM')}</div>
                  <div className="mt-1 text-muted-foreground">
                    {t('voicebot.crm.notConnectedHint', 'Wyniki rozmów zapisują się tylko tutaj, w panelu.')}
                  </div>
                </>
              )}
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span>{t('voicebot.crm.field.url', 'Adres webhooka przychodzącego Bitrix24')}</span>
              <input
                className="rounded border px-2 py-1 font-mono text-xs"
                value={adres}
                onChange={(e) => setAdres(e.target.value)}
                placeholder="https://firma.bitrix24.pl/rest/1/xxxxxxxxxxxx"
                autoComplete="off"
                spellCheck={false}
              />
            </label>

            <p className="mt-2 text-xs text-muted-foreground">
              {t(
                'voicebot.crm.hint',
                'Adres znajdziesz w Bitriksie: Aplikacje, Webhooki, Webhook przychodzący. Potrzebne uprawnienia do modułu CRM. Adres zawiera token, więc traktuj go jak hasło.',
              )}
            </p>

            <div className="mt-4 flex items-center gap-3">
              <Button onClick={() => void zapisz()} disabled={zapis || !adres.trim()}>
                {zapis
                  ? t('voicebot.crm.checking', 'Sprawdzam połączenie...')
                  : t('voicebot.crm.save', 'Sprawdź i zapisz')}
              </Button>
              {sukces ? <span className="text-sm text-muted-foreground">{sukces}</span> : null}
            </div>

            {blad ? <div className="mt-3 text-sm text-destructive">{blad}</div> : null}
          </div>
        )}
      </PageBody>
    </Page>
  )
}
