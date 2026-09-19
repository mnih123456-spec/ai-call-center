"use client"
import * as React from 'react'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type Wypowiedz = { kto: string; tekst: string; sekunda: number | null }

function czasWypowiedzi(sekunda: number | null): string {
  if (sekunda == null) return ''
  const m = Math.floor(sekunda / 60)
  const s = Math.floor(sekunda % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Odsłuch nagrania i zapis rozmowy.
 *
 * Pola wyciągnięte z rozmowy są tym, na czym pracuje handlowiec, a to jest
 * miejsce, w którym sprawdza, skąd się wzięły, gdy coś wygląda nietypowo.
 * Dlatego zapis rozmowy jest pod spodem, a nie zamiast pól.
 *
 * Nagranie i zapis idą przez nasze trasy, nie wprost od dostawcy, bo jego
 * klucz jest wspólny dla wszystkich firm i nie może trafić do przeglądarki.
 */
export function PodgladRozmowy({ callId, zamknij }: { callId: string; zamknij: () => void }) {
  const t = useT()
  const [wypowiedzi, setWypowiedzi] = React.useState<Wypowiedz[]>([])
  const [powod, setPowod] = React.useState<string | null>(null)
  const [ladowanie, setLadowanie] = React.useState(true)

  React.useEffect(() => {
    let aktualne = true
    setLadowanie(true)
    setPowod(null)
    fetch(`/api/voicebot/calls/transcript?id=${encodeURIComponent(callId)}`, { credentials: 'same-origin' })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as
          | { wypowiedzi?: Wypowiedz[]; powod?: string; error?: string }
          | null
        if (!aktualne) return
        setWypowiedzi(Array.isArray(body?.wypowiedzi) ? body.wypowiedzi : [])
        setPowod(body?.powod ?? body?.error ?? null)
      })
      .catch(() => {
        if (aktualne) setPowod(t('voicebot.detail.error', 'Nie udało się pobrać zapisu rozmowy.'))
      })
      .finally(() => { if (aktualne) setLadowanie(false) })
    return () => { aktualne = false }
  }, [callId, t])

  return (
    <div className="mt-4 rounded border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{t('voicebot.detail.title', 'Przebieg rozmowy')}</div>
        <Button variant="outline" onClick={zamknij}>{t('voicebot.detail.close', 'Zamknij')}</Button>
      </div>

      <audio
        className="mb-4 w-full"
        controls
        preload="none"
        src={`/api/voicebot/calls/recording?id=${encodeURIComponent(callId)}`}
      />

      {ladowanie ? (
        <div className="text-sm text-muted-foreground">{t('voicebot.detail.loading', 'Wczytuję zapis...')}</div>
      ) : powod ? (
        <div className="text-sm text-muted-foreground">{powod}</div>
      ) : wypowiedzi.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          {t('voicebot.detail.empty', 'Dostawca nie udostępnił zapisu tej rozmowy.')}
        </div>
      ) : (
        <ol className="space-y-2 text-sm">
          {wypowiedzi.map((w, i) => (
            <li key={`${w.sekunda ?? i}-${i}`} className="flex gap-3">
              <span className="w-10 shrink-0 text-xs text-muted-foreground">{czasWypowiedzi(w.sekunda)}</span>
              <span className="w-16 shrink-0 text-xs font-medium">
                {w.kto === 'user'
                  ? t('voicebot.detail.person', 'Rozmówca')
                  : t('voicebot.detail.bot', 'Bot')}
              </span>
              <span>{w.tekst}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
