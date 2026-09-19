"use client"
import * as React from 'react'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type Pozycja = { id: string; nazwa: string }

type Stan = {
  configured: boolean
  dostawcy?: Pozycja[]
  provider?: string
  active?: boolean
  adresSkrocony?: string
  wymagaAdresu?: boolean
  pipelineId?: string | null
  stageId?: string | null
  lejki?: Pozycja[]
  etapy?: Pozycja[]
  bladDostawcy?: string | null
  checkedAt?: string | null
  checkResult?: string | null
}

const PUSTY: Stan = { configured: false, dostawcy: [{ id: 'bitrix24', nazwa: 'Bitrix24' }] }

export default function VoicebotCrmPage() {
  const t = useT()
  const [stan, setStan] = React.useState<Stan>(PUSTY)
  const [dostawca, setDostawca] = React.useState('bitrix24')
  const [adres, setAdres] = React.useState('')
  const [lejek, setLejek] = React.useState('')
  const [etap, setEtap] = React.useState('')
  const [etapy, setEtapy] = React.useState<Pozycja[]>([])
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
      const body = ((await res.json()) as Stan) ?? PUSTY
      setStan(body)
      if (body.provider) setDostawca(body.provider)
      setLejek(body.pipelineId ?? '')
      setEtap(body.stageId ?? '')
      setEtapy(body.etapy ?? [])
    } catch {
      setBlad(t('voicebot.crm.loadError', 'Nie udało się pobrać stanu połączenia.'))
    } finally {
      setLadowanie(false)
    }
  }, [t])

  React.useEffect(() => { void wczytaj() }, [wczytaj])

  const zapisz = React.useCallback(async (nowyLejek?: string, nowyEtap?: string) => {
    setZapis(true)
    setBlad(null)
    setSukces(null)
    try {
      const res = await fetch('/api/voicebot/crm', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: dostawca,
          ...(adres.trim() ? { webhookUrl: adres.trim() } : {}),
          pipelineId: (nowyLejek ?? lejek) || null,
          stageId: (nowyEtap ?? etap) || null,
          active: true,
        }),
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
  }, [dostawca, adres, lejek, etap, wczytaj, t])

  // Etapy należą do lejka, więc po zmianie lejka trzeba je pobrać na nowo.
  // Robimy to przez zapis, bo listę zna serwer, który ma dane dostępowe.
  const zmienLejek = React.useCallback((wartosc: string) => {
    setLejek(wartosc)
    setEtap('')
    void zapisz(wartosc, '')
  }, [zapisz])

  const dostawcy = stan.dostawcy ?? PUSTY.dostawcy ?? []
  const lejki = stan.lejki ?? []

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
                  <div className="font-medium">{t('voicebot.crm.connected', 'Połączono')}</div>
                  <div className="mt-1 text-muted-foreground">
                    {t('voicebot.crm.address', 'Adres')}: {stan.adresSkrocony}
                  </div>
                  {stan.checkResult ? <div className="mt-1 text-muted-foreground">{stan.checkResult}</div> : null}
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

            <div className="grid gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span>{t('voicebot.crm.field.provider', 'System CRM')}</span>
                <select
                  className="rounded border px-2 py-1"
                  value={dostawca}
                  onChange={(e) => setDostawca(e.target.value)}
                >
                  {dostawcy.map((d) => <option key={d.id} value={d.id}>{d.nazwa}</option>)}
                </select>
              </label>

              {/* Wbudowany CRM nie ma adresu ani żetonu: pisze do własnej bazy. */}
              {dostawca !== 'mercato' ? (
                <label className="flex flex-col gap-1 text-sm">
                  <span>
                    {stan.configured && stan.wymagaAdresu
                      ? t('voicebot.crm.field.urlChange', 'Nowy adres webhooka (zostaw puste, żeby nie zmieniać)')
                      : t('voicebot.crm.field.url', 'Adres webhooka przychodzącego')}
                  </span>
                  <input
                    className="rounded border px-2 py-1 font-mono text-xs"
                    value={adres}
                    onChange={(e) => setAdres(e.target.value)}
                    placeholder="https://firma.bitrix24.pl/rest/1/xxxxxxxxxxxx"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
              ) : (
                <div className="rounded border border-dashed p-3 text-sm text-muted-foreground">
                  {t(
                    'voicebot.crm.builtinHint',
                    'Wyniki rozmów trafiają na karty klientów w tym panelu. Nie trzeba nic podłączać.',
                  )}
                </div>
              )}

              {stan.configured && dostawca !== 'mercato' ? (
                <>
                  <label className="flex flex-col gap-1 text-sm">
                    <span>{t('voicebot.crm.field.pipeline', 'Lejek')}</span>
                    <select
                      className="rounded border px-2 py-1"
                      value={lejek}
                      onChange={(e) => zmienLejek(e.target.value)}
                      disabled={zapis || lejki.length === 0}
                    >
                      <option value="">{t('voicebot.crm.field.default', 'Domyślny')}</option>
                      {lejki.map((l) => <option key={l.id} value={l.id}>{l.nazwa}</option>)}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm">
                    <span>{t('voicebot.crm.field.stage', 'Etap, na którym ląduje nowa szansa')}</span>
                    <select
                      className="rounded border px-2 py-1"
                      value={etap}
                      onChange={(e) => setEtap(e.target.value)}
                      disabled={zapis || etapy.length === 0}
                    >
                      <option value="">{t('voicebot.crm.field.default', 'Domyślny')}</option>
                      {etapy.map((s) => <option key={s.id} value={s.id}>{s.nazwa}</option>)}
                    </select>
                  </label>
                </>
              ) : null}
            </div>

            {stan.bladDostawcy ? (
              <div className="mt-3 text-sm text-destructive">{stan.bladDostawcy}</div>
            ) : null}

            {dostawca !== 'mercato' ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {t(
                  'voicebot.crm.hint',
                  'Adres znajdziesz w Bitriksie: Aplikacje, Webhooki, Webhook przychodzący. Potrzebne uprawnienie do modułu CRM. Adres zawiera token, więc traktuj go jak hasło.',
                )}
              </p>
            ) : null}

            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={() => void zapisz()}
                disabled={zapis || (dostawca !== 'mercato' && !stan.configured && !adres.trim())}
              >
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
