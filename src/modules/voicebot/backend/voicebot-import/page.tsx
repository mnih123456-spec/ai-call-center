"use client"
import * as React from 'react'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type Kampania = { id: string; name: string; status: string }

type BladWiersza = { wiersz: number; tresc: string; powod: string }

type Wynik = {
  dodane: number
  bledy: BladWiersza[]
  pominieteDuplikaty: number
  pominieteBoCzekaja?: number
  error?: string
}

const PRZYKLAD = `+48500100200, Anna, Kowalczyk
500 100 201; Marek; Zielinski
48500100202`

export default function VoicebotImportPage() {
  const t = useT()
  const [kampanie, setKampanie] = React.useState<Kampania[]>([])
  const [kampania, setKampania] = React.useState('')
  const [tekst, setTekst] = React.useState('')
  const [ladowanie, setLadowanie] = React.useState(true)
  const [wysylka, setWysylka] = React.useState(false)
  const [wynik, setWynik] = React.useState<Wynik | null>(null)
  const [blad, setBlad] = React.useState<string | null>(null)

  const wczytaj = React.useCallback(async () => {
    setLadowanie(true)
    try {
      const res = await fetch('/api/voicebot/campaigns?pageSize=100', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as { items?: Kampania[] }
      const lista = Array.isArray(body.items) ? body.items : []
      setKampanie(lista)
      if (!kampania && lista.length) setKampania(lista[0].id)
    } catch {
      setBlad(t('voicebot.import.loadError', 'Nie udało się pobrać listy kampanii.'))
    } finally {
      setLadowanie(false)
    }
  }, [kampania, t])

  React.useEffect(() => { void wczytaj() }, [wczytaj])

  // Liczymy niepuste wiersze, żeby użytkownik przed wysłaniem wiedział,
  // ile pozycji właśnie wkleił. Przy wklejaniu z arkusza łatwo o pomyłkę
  // rzędu wielkości, a każda rozmowa kosztuje.
  const wierszy = React.useMemo(
    () => tekst.split(/\r?\n/).filter((w) => w.trim().length > 0).length,
    [tekst],
  )

  const wyslij = React.useCallback(async () => {
    if (!kampania || !tekst.trim()) return
    setWysylka(true)
    setBlad(null)
    setWynik(null)
    try {
      const res = await fetch('/api/voicebot/calls/import', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId: kampania, tekst }),
      })
      const body = (await res.json().catch(() => null)) as Wynik | null
      if (body) setWynik(body)
      if (!res.ok && !body) {
        setBlad(t('voicebot.import.sendError', 'Nie udało się wczytać listy.'))
        return
      }
      if (body && body.dodane > 0) setTekst('')
    } catch {
      setBlad(t('voicebot.import.sendError', 'Nie udało się wczytać listy.'))
    } finally {
      setWysylka(false)
    }
  }, [kampania, tekst, t])

  return (
    <Page>
      <PageHeader
        title={t('voicebot.import.title', 'Wczytaj listę')}
        description={t('voicebot.import.subtitle', 'Wklej kontakty, a bot obdzwoni je po kolei z zachowaniem odstępu.')}
      />
      <PageBody>
        {ladowanie ? (
          <div className="text-sm text-muted-foreground">{t('voicebot.import.loading', 'Wczytuję...')}</div>
        ) : kampanie.length === 0 ? (
          <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
            {t('voicebot.import.noCampaigns', 'Najpierw załóż kampanię, bo to do niej trafiają wczytane kontakty.')}
          </div>
        ) : (
          <div className="max-w-2xl">
            <label className="mb-4 flex flex-col gap-1 text-sm">
              <span>{t('voicebot.import.field.campaign', 'Kampania')}</span>
              <select
                className="rounded border px-2 py-1"
                value={kampania}
                onChange={(e) => setKampania(e.target.value)}
              >
                {kampanie.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span>
                {t('voicebot.import.field.list', 'Kontakty, po jednym w wierszu')}
                {wierszy > 0 ? ` (${wierszy})` : ''}
              </span>
              <textarea
                className="min-h-56 rounded border px-2 py-1 font-mono text-xs"
                value={tekst}
                onChange={(e) => setTekst(e.target.value)}
                placeholder={PRZYKLAD}
                spellCheck={false}
              />
            </label>

            <p className="mt-2 text-xs text-muted-foreground">
              {t(
                'voicebot.import.hint',
                'Kolejność: numer, imię, nazwisko, opcjonalnie numer sprawy. Rozdziel przecinkiem, średnikiem albo tabulatorem. Sam numer też wystarczy. Numery bez prefiksu uzupełnimy o +48.',
              )}
            </p>

            <div className="mt-4">
              <Button onClick={() => void wyslij()} disabled={wysylka || !tekst.trim()}>
                {wysylka
                  ? t('voicebot.import.sending', 'Wczytuję...')
                  : t('voicebot.import.send', 'Wczytaj do kampanii')}
              </Button>
            </div>

            {blad ? <div className="mt-3 text-sm text-destructive">{blad}</div> : null}

            {wynik ? (
              <div className="mt-6 rounded border p-4 text-sm">
                <div className="font-medium">
                  {t('voicebot.import.result.added', 'Dodano do kolejki')}: {wynik.dodane}
                </div>
                {wynik.pominieteDuplikaty > 0 ? (
                  <div className="mt-1 text-muted-foreground">
                    {t('voicebot.import.result.duplicates', 'Pominięto powtórzone numery')}: {wynik.pominieteDuplikaty}
                  </div>
                ) : null}
                {wynik.pominieteBoCzekaja ? (
                  <div className="mt-1 text-muted-foreground">
                    {t('voicebot.import.result.waiting', 'Pominięto, bo już czekają w tej kampanii')}: {wynik.pominieteBoCzekaja}
                  </div>
                ) : null}
                {wynik.error ? <div className="mt-1 text-destructive">{wynik.error}</div> : null}

                {wynik.bledy.length > 0 ? (
                  <div className="mt-3">
                    <div className="mb-1 font-medium">
                      {t('voicebot.import.result.errors', 'Wiersze do poprawy')}: {wynik.bledy.length}
                    </div>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {wynik.bledy.slice(0, 20).map((b) => (
                        <li key={b.wiersz}>
                          {t('voicebot.import.result.row', 'wiersz')} {b.wiersz}: {b.tresc} — {b.powod}
                        </li>
                      ))}
                    </ul>
                    {wynik.bledy.length > 20 ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t('voicebot.import.result.more', 'i dalsze')}: {wynik.bledy.length - 20}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </PageBody>
    </Page>
  )
}
