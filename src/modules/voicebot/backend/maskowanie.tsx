"use client"
import * as React from 'react'
import { Button } from '@open-mercato/ui/primitives/button'

/**
 * Zasłanianie danych osobowych na ekranie.
 *
 * Potrzebne, bo panel pokazuje numery telefonów i nazwiska, a pokazywany bywa
 * na scenie, na rzutniku i na relacji na żywo. Dane w bazie zostają nietknięte:
 * to jest wyłącznie warstwa wyświetlania, przełączana jednym kliknięciem.
 *
 * Wybór trzymamy w pamięci przeglądarki, żeby po odświeżeniu strony w trakcie
 * pokazu nie odsłonić wszystkiego przypadkiem. Odczyt jest opakowany w try,
 * bo w trybie prywatnym albo przy zablokowanych danych witryn potrafi rzucić
 * wyjątkiem, a wtedy ekran ma się wyświetlić normalnie, a nie wywalić.
 */
const KLUCZ = 'voicebot.maskowanie'
const ZDARZENIE = 'voicebot:maskowanie'

function odczytaj(): boolean {
  try {
    return window.localStorage.getItem(KLUCZ) === '1'
  } catch {
    // Brak dostępu do pamięci przeglądarki nie może zepsuć ekranu.
    return false
  }
}

/**
 * Stan wystawiamy też jako atrybut na `<html>`, żeby ekrany bez własnego
 * maskowania mogły zasłonić pojedyncze elementy samym arkuszem stylów.
 */
function zastosuj(zaslonione: boolean) {
  document.documentElement.dataset.zaslona = zaslonione ? '1' : '0'
}

export function useMaskowanie(): { zaslonione: boolean; przelacz: () => void } {
  const [zaslonione, setZaslonione] = React.useState(false)

  // Przełącznik jest w nagłówku i w tabelach naraz, więc każdy egzemplarz
  // nasłuchuje zmian od pozostałych. Inaczej oczko w nagłówku zasłoniłoby
  // jedno, a tabela dalej pokazywałaby numery.
  React.useEffect(() => {
    const start = odczytaj()
    setZaslonione(start)
    zastosuj(start)
    const nasluch = () => {
      const nowe = odczytaj()
      setZaslonione(nowe)
      zastosuj(nowe)
    }
    window.addEventListener(ZDARZENIE, nasluch)
    window.addEventListener('storage', nasluch)
    return () => {
      window.removeEventListener(ZDARZENIE, nasluch)
      window.removeEventListener('storage', nasluch)
    }
  }, [])

  const przelacz = React.useCallback(() => {
    const nowe = !odczytaj()
    try {
      window.localStorage.setItem(KLUCZ, nowe ? '1' : '0')
    } catch {
      // Zmiana zadziała do końca sesji, tylko się nie zapamięta.
    }
    setZaslonione(nowe)
    zastosuj(nowe)
    window.dispatchEvent(new Event(ZDARZENIE))
  }, [])

  return { zaslonione, przelacz }
}

/**
 * Numer z zasłoniętym środkiem.
 *
 * Zostawiamy prefiks kraju i dwie ostatnie cyfry, żeby na scenie dało się
 * powiedzieć "ten wiersz", nie ujawniając numeru.
 */
export function maskujNumer(numer: string | null | undefined): string {
  if (!numer) return ''
  if (numer.length <= 6) return '•'.repeat(numer.length)
  const przod = numer.startsWith('+') ? numer.slice(0, 3) : numer.slice(0, 2)
  const tyl = numer.slice(-2)
  return `${przod}${'•'.repeat(Math.max(3, numer.length - przod.length - 2))}${tyl}`
}

/** Imię i nazwisko skrócone do inicjałów. */
export function maskujOsobe(tekst: string | null | undefined): string {
  if (!tekst) return ''
  return tekst
    .split(/\s+/)
    .filter(Boolean)
    .map((czesc) => `${czesc[0].toUpperCase()}.`)
    .join(' ')
}

/**
 * Przełącznik do nagłówka strony.
 *
 * Świadomie nie używamy tu emoji ani obrazka: ikona oka w postaci znaku
 * Unicode wygląda różnie w różnych systemach, a na rzutniku musi być
 * jednoznaczna. Krótki napis jest czytelny zawsze.
 */
export function PrzyciskMaskowania({ zaslonione, przelacz, etykietaWlacz, etykietaWylacz }: {
  zaslonione: boolean
  przelacz: () => void
  etykietaWlacz: string
  etykietaWylacz: string
}) {
  return (
    <Button
      variant="outline"
      onClick={przelacz}
      aria-pressed={zaslonione}
      title={zaslonione ? etykietaWylacz : etykietaWlacz}
    >
      {zaslonione ? etykietaWylacz : etykietaWlacz}
    </Button>
  )
}
