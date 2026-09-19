"use client"
import * as React from 'react'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type Kampania = { id: string; name: string }

/**
 * Połączenie testowe: "zadzwoń do mnie".
 *
 * Pierwsza rzecz, jakiej firma chce po założeniu konta, to usłyszeć, jak bot
 * brzmi. Kazać jej w tym celu zakładać kampanię i wczytywać listę kontaktów
 * to najkrótsza droga do tego, żeby się zniechęciła i nie wróciła.
 *
 * Numer jest polem tekstowym, a nie wyborem z listy, bo osoba konfigurująca
 * nie zawsze siedzi przy tym telefonie, na który chce usłyszeć rozmowę.
 */
export function PolaczenieTestowe({ kampanie, domyslnyNumer }: {
  kampanie: Kampania[]
  domyslnyNumer?: string | null
}) {
  // Scenariusz demo obiecuje, ze pracownik oglada wyniki, ale nie uruchamia
  // platnych polaczen. Bez tego sprawdzenia przycisk widzial kazdy, kto ma
  // wglad w kampanie, i obietnice dalo sie obalic na scenie w pol minuty.
  //
  // Sprawdzamy dwie rzeczy, bo sama odpowiedz o uprawnienie klamie zaraz po
  // zalozeniu firmy: sesja jest juz przelaczona na nowe konto, a uprawnienia
  // dla niego nie zdazyly sie policzyc, wiec przycisk znikal wlasnie temu,
  // kto przed chwila zalozyl bota i chcial go uslyszec.
  const [wolno, setWolno] = React.useState<boolean | null>(null)
  React.useEffect(() => {
    let zywe = true
    // W teście komponentu nie ma `fetch`. Bez tej furtki każdy test ekranu
    // kampanii wywracałby się na sprawdzeniu, które go nie dotyczy.
    if (typeof fetch !== 'function') { setWolno(false); return }
    void (async () => {
      const [uprawnienie, operator] = await Promise.all([
        fetch('/api/auth/feature-check', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ features: ['voicebot.calls.start'] }),
        })
          .then(async (res) => {
            if (!res.ok) return false
            const body = (await res.json()) as { granted?: Record<string, boolean> }
            return body?.granted?.['voicebot.calls.start'] === true
          })
          .catch(() => false),
        fetch('/api/directory/organization-switcher', { credentials: 'same-origin' })
          .then(async (res) => {
            if (!res.ok) return false
            const body = (await res.json()) as { isSuperAdmin?: boolean }
            return body?.isSuperAdmin === true
          })
          .catch(() => false),
      ])
      if (zywe) setWolno(uprawnienie || operator)
    })()
    return () => { zywe = false }
  }, [])

  const t = useT()
  const [otwarte, setOtwarte] = React.useState(false)
  const [kampania, setKampania] = React.useState('')
  const [numer, setNumer] = React.useState(domyslnyNumer ?? '')
  const [dzwoni, setDzwoni] = React.useState(false)
  const [blad, setBlad] = React.useState<string | null>(null)
  const [komunikat, setKomunikat] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!kampania && kampanie.length) setKampania(kampanie[0].id)
  }, [kampania, kampanie])

  const zadzwon = React.useCallback(async () => {
    if (!kampania || !numer.trim()) return
    setDzwoni(true)
    setBlad(null)
    setKomunikat(null)
    try {
      const res = await fetch('/api/voicebot/calls/test', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId: kampania, phone: numer.trim() }),
      })
      const tresc = (await res.json().catch(() => null)) as
        | { error?: string; simulated?: boolean; pozostaloTestow?: number }
        | null

      if (!res.ok) {
        setBlad(tresc?.error ?? t('voicebot.test.error', 'Nie udało się zlecić połączenia.'))
        return
      }
      setKomunikat(tresc?.simulated
        ? t('voicebot.test.simulated', 'Tryb symulacji: prawdziwy telefon nie zadzwoni, ale przepływ przeszedł.')
        : t('voicebot.test.calling', 'Dzwonimy. Odbierz telefon.'))
    } catch {
      setBlad(t('voicebot.test.error', 'Nie udało się zlecić połączenia.'))
    } finally {
      setDzwoni(false)
    }
  }, [kampania, numer, t])

  if (kampanie.length === 0) return null
  // Dopoki nie wiemy, czy wolno, nie pokazujemy nic: mignieciecie przyciskiem
  // i jego zniknieciem wyglada gorzej niz jego brak.
  if (wolno !== true) return null

  return (
    <div className="mb-4 rounded border p-3">
      {!otwarte ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-medium">{t('voicebot.test.title', 'Posłuchaj, jak to brzmi')}</div>
            <div className="text-muted-foreground">
              {t('voicebot.test.hint', 'Bot zadzwoni pod wskazany numer i przeprowadzi rozmowę.')}
            </div>
          </div>
          <Button variant="outline" onClick={() => setOtwarte(true)}>
            {t('voicebot.test.open', 'Połączenie testowe')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('voicebot.test.field.campaign', 'Kampania')}</span>
            <select
              className="rounded border px-2 py-1"
              value={kampania}
              onChange={(e) => setKampania(e.target.value)}
            >
              {kampanie.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span>{t('voicebot.test.field.phone', 'Numer, pod który mamy zadzwonić')}</span>
            <input
              className="rounded border px-2 py-1"
              value={numer}
              onChange={(e) => setNumer(e.target.value)}
              placeholder="+48500100200"
              inputMode="tel"
              autoComplete="tel"
            />
          </label>

          <div className="flex items-end gap-2">
            <Button onClick={() => void zadzwon()} disabled={dzwoni || !numer.trim()}>
              {dzwoni ? t('voicebot.test.calling.short', 'Dzwonię...') : t('voicebot.test.call', 'Zadzwoń')}
            </Button>
            <Button variant="outline" onClick={() => setOtwarte(false)} disabled={dzwoni}>
              {t('voicebot.test.close', 'Zamknij')}
            </Button>
          </div>

          {komunikat ? <div className="text-sm text-muted-foreground md:col-span-3">{komunikat}</div> : null}
          {blad ? <div className="text-sm text-destructive md:col-span-3">{blad}</div> : null}
        </div>
      )}
    </div>
  )
}
