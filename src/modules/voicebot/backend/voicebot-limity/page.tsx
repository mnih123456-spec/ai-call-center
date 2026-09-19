"use client"
import * as React from 'react'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type Progi = {
  minutesPerMonth: number | null
  maxVoices: number | null
  maxConcurrentCalls: number | null
}

type Zuzycie = { minutyWMiesiacu: number; rozmowyTeraz: number; glosy: number }

const PUSTE = { minutesPerMonth: '', maxVoices: '', maxConcurrentCalls: '' }

function naPole(wartosc: number | null): string {
  return wartosc === null ? '' : String(wartosc)
}

export default function VoicebotLimityPage() {
  const t = useT()
  const [formularz, setFormularz] = React.useState(PUSTE)
  const [zuzycie, setZuzycie] = React.useState<Zuzycie | null>(null)
  const [ladowanie, setLadowanie] = React.useState(true)
  const [zapis, setZapis] = React.useState(false)
  const [blad, setBlad] = React.useState<string | null>(null)
  const [komunikat, setKomunikat] = React.useState<string | null>(null)

  const wczytaj = React.useCallback(async () => {
    setLadowanie(true)
    setBlad(null)
    try {
      const res = await fetch('/api/voicebot/limits', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as { progi?: Progi; zuzycie?: Zuzycie }
      setFormularz({
        minutesPerMonth: naPole(body.progi?.minutesPerMonth ?? null),
        maxVoices: naPole(body.progi?.maxVoices ?? null),
        maxConcurrentCalls: naPole(body.progi?.maxConcurrentCalls ?? null),
      })
      setZuzycie(body.zuzycie ?? null)
    } catch {
      setBlad(t('voicebot.limits.loadError', 'Nie udało się pobrać limitów.'))
    } finally {
      setLadowanie(false)
    }
  }, [t])

  React.useEffect(() => { void wczytaj() }, [wczytaj])

  const zapisz = React.useCallback(async () => {
    setZapis(true)
    setBlad(null)
    setKomunikat(null)
    try {
      const res = await fetch('/api/voicebot/limits', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(formularz),
      })
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) {
        setBlad(body?.error ?? t('voicebot.limits.saveError', 'Nie udało się zapisać.'))
        return
      }
      setKomunikat(t('voicebot.limits.saved', 'Zapisano.'))
      await wczytaj()
    } catch {
      setBlad(t('voicebot.limits.saveError', 'Nie udało się zapisać.'))
    } finally {
      setZapis(false)
    }
  }, [formularz, wczytaj, t])

  const pole = (
    klucz: keyof typeof PUSTE,
    etykieta: string,
    podpis: string,
    teraz: string,
  ) => (
    <label className="flex flex-col gap-1 text-sm">
      <span>{etykieta}</span>
      <input
        className="w-40 rounded border px-2 py-1"
        type="number"
        min={0}
        value={formularz[klucz]}
        onChange={(e) => setFormularz((f) => ({ ...f, [klucz]: e.target.value }))}
        placeholder={t('voicebot.limits.noLimit', 'bez limitu')}
      />
      <span className="text-xs text-muted-foreground">{podpis}</span>
      <span className="text-xs">{teraz}</span>
    </label>
  )

  return (
    <Page>
      <PageHeader
        title={t('voicebot.limits.title', 'Limity firmy')}
        description={t(
          'voicebot.limits.subtitle',
          'Puste pole znaczy bez limitu. Progi liczą się w chwili wykonywania telefonu, a nie przy zlecaniu kampanii.',
        )}
        actions={<Button variant="outline" onClick={() => void wczytaj()}>{t('voicebot.limits.refresh', 'Odśwież')}</Button>}
      />
      <PageBody>
        {ladowanie ? (
          <div className="text-sm text-muted-foreground">{t('voicebot.limits.loading', 'Wczytuję...')}</div>
        ) : (
          <div className="grid max-w-2xl gap-4 rounded border p-4">
            {pole(
              'minutesPerMonth',
              t('voicebot.limits.minutes', 'Minuty rozmów w miesiącu'),
              t('voicebot.limits.minutesHint', 'Po wyczerpaniu kolejne zlecenia są zamykane z adnotacją, a nie odkładane w nieskończoność.'),
              t('voicebot.limits.minutesNow', 'Zużyte w tym miesiącu: ') + (zuzycie?.minutyWMiesiacu ?? 0),
            )}
            {pole(
              'maxConcurrentCalls',
              t('voicebot.limits.concurrent', 'Rozmowy równocześnie'),
              t('voicebot.limits.concurrentHint', 'Kolejka pilnuje odstępu w jednej kampanii, ale firma może mieć ich wiele naraz.'),
              t('voicebot.limits.concurrentNow', 'Trwa teraz: ') + (zuzycie?.rozmowyTeraz ?? 0),
            )}
            {pole(
              'maxVoices',
              t('voicebot.limits.voices', 'Liczba głosów'),
              t('voicebot.limits.voicesHint', 'Sloty na głosy są wspólne dla wszystkich firm na koncie u dostawcy.'),
              t('voicebot.limits.voicesNow', 'Zajęte: ') + (zuzycie?.glosy ?? 0),
            )}

            <div className="flex items-center gap-3">
              <Button onClick={() => void zapisz()} disabled={zapis}>
                {zapis ? t('voicebot.limits.saving', 'Zapisuję...') : t('voicebot.limits.save', 'Zapisz')}
              </Button>
              {komunikat ? <span className="text-sm text-muted-foreground">{komunikat}</span> : null}
            </div>

            {blad ? <div className="text-sm text-destructive">{blad}</div> : null}
          </div>
        )}
      </PageBody>
    </Page>
  )
}
