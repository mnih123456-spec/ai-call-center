'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { IconButton } from '@open-mercato/ui/primitives/icon-button'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { useMaskowanie } from '@/modules/voicebot/backend/maskowanie'

/**
 * Widok klienta albo widok admina.
 *
 * Panel jest jeden, ale ogląda go dwóch ludzi: operator platformy, który
 * chce widzieć wszystko, i klient, który ma zobaczyć tylko swojego bota.
 * Przełącznik w nagłówku pozwala operatorowi obejrzeć panel oczami klienta
 * bez wylogowania. Wybór trzymamy w pamięci przeglądarki i wystawiamy jako
 * atrybut na `<html>`, a resztę robi arkusz stylów: chowa grupy menu, które
 * nie należą do voicebota, i narzędzia z nagłówka.
 */
const KLUCZ = 'voicebot.widok'
const ZDARZENIE = 'voicebot:widok'

export type Widok = 'klient' | 'admin'

function odczytaj(): Widok {
  try {
    return window.localStorage.getItem(KLUCZ) === 'klient' ? 'klient' : 'admin'
  } catch {
    return 'admin'
  }
}

function zastosuj(widok: Widok) {
  document.documentElement.dataset.widok = widok
}

export function useWidokKlienta(): { widok: Widok; ustaw: (w: Widok) => void } {
  const [widok, setWidok] = React.useState<Widok>('admin')

  React.useEffect(() => {
    const start = odczytaj()
    setWidok(start)
    zastosuj(start)
    const nasluch = () => {
      const nowy = odczytaj()
      setWidok(nowy)
      zastosuj(nowy)
    }
    window.addEventListener(ZDARZENIE, nasluch)
    window.addEventListener('storage', nasluch)
    return () => {
      window.removeEventListener(ZDARZENIE, nasluch)
      window.removeEventListener('storage', nasluch)
    }
  }, [])

  const ustaw = React.useCallback((w: Widok) => {
    try {
      window.localStorage.setItem(KLUCZ, w)
    } catch {
      // Bez pamięci przeglądarki wybór żyje do odświeżenia strony.
    }
    setWidok(w)
    zastosuj(w)
    window.dispatchEvent(new Event(ZDARZENIE))
  }, [])

  return { widok, ustaw }
}

/** Czy zalogowany jest operator platformy. Klient nie dostaje przełącznika. */
function useOperator(): boolean {
  const [operator, setOperator] = React.useState(false)
  React.useEffect(() => {
    let zywe = true
    void (async () => {
      try {
        const res = await fetch('/api/directory/organization-switcher', { credentials: 'same-origin' })
        if (!res.ok) return
        const body = (await res.json()) as { isSuperAdmin?: boolean }
        if (zywe) setOperator(body.isSuperAdmin === true)
      } catch {
        // Brak odpowiedzi znaczy: nie operator.
      }
    })()
    return () => { zywe = false }
  }, [])
  return operator
}

export function PrzelacznikWidoku() {
  const t = useT()
  const operator = useOperator()
  const { widok, ustaw } = useWidokKlienta()
  if (!operator) return null

  const klasa = (aktywny: boolean) =>
    `px-2.5 py-1 text-xs font-medium transition-colors ${aktywny ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted/60'}`

  return (
    <div
      role="group"
      aria-label={t('voicebot.widok.grupa', 'Widok panelu')}
      className="hidden sm:inline-flex overflow-hidden rounded-md border"
    >
      <button type="button" className={klasa(widok === 'klient')} aria-pressed={widok === 'klient'} onClick={() => ustaw('klient')}>
        {t('voicebot.widok.klient', 'Widok klienta')}
      </button>
      <button type="button" className={klasa(widok === 'admin')} aria-pressed={widok === 'admin'} onClick={() => ustaw('admin')}>
        {t('voicebot.widok.admin', 'Widok admina')}
      </button>
    </div>
  )
}

/**
 * Oczko w nagłówku: jedno kliknięcie zasłania dane osobowe na całym panelu.
 *
 * Używa tego samego przełącznika, co tabele voicebota, więc numery i nazwiska
 * w wynikach rozmów zasłaniają się razem z resztą.
 */
export function OczkoDanych() {
  const t = useT()
  const { zaslonione, przelacz } = useMaskowanie()
  const etykieta = zaslonione
    ? t('voicebot.maskowanie.odslon', 'Odsłoń dane')
    : t('voicebot.maskowanie.zaslon', 'Zasłoń dane')
  return (
    <IconButton
      type="button"
      variant="ghost"
      size="sm"
      aria-pressed={zaslonione}
      aria-label={etykieta}
      title={etykieta}
      onClick={przelacz}
    >
      {zaslonione ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
    </IconButton>
  )
}
