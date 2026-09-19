"use client"
import * as React from 'react'
import Link from 'next/link'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type Kampania = { id: string; name: string }

/**
 * Instrukcja wywołania rozmowy przez API, dla klienta.
 *
 * Sam klucz wydaje ekran kluczy w ustawieniach, ale ustawienia to nasza
 * kuchnia i w widoku klienta ich nie ma. Klient ma jedno miejsce w swoim menu:
 * tu widzi adres, kształt żądania z własnym identyfikatorem kampanii
 * i przycisk do wydania klucza. Przykład składamy z prawdziwych danych firmy,
 * żeby dało się go skopiować i wysłać bez poprawiania.
 */
export default function VoicebotApiPage() {
  const t = useT()
  const [kampanie, setKampanie] = React.useState<Kampania[]>([])
  const [wybrana, setWybrana] = React.useState<string>('')
  const [adres, setAdres] = React.useState('')
  const [skopiowano, setSkopiowano] = React.useState(false)

  React.useEffect(() => {
    setAdres(`${window.location.origin}/api/voicebot/calls`)
    let zywe = true
    void (async () => {
      try {
        const res = await fetch('/api/voicebot/campaigns?pageSize=50', { credentials: 'same-origin' })
        if (!res.ok) return
        const body = (await res.json()) as { items?: Kampania[] }
        const lista = Array.isArray(body.items) ? body.items : []
        if (!zywe) return
        setKampanie(lista)
        if (lista[0]) setWybrana(lista[0].id)
      } catch {
        // Bez listy kampanii przykład ma pusty identyfikator, instrukcja dalej działa.
      }
    })()
    return () => { zywe = false }
  }, [])

  const cialo = JSON.stringify({
    campaignId: wybrana || 'IDENTYFIKATOR-KAMPANII',
    phone: '+48600000000',
    firstName: 'Jan',
    lastName: 'Kowalski',
    leadRef: 'ID-W-TWOIM-SYSTEMIE',
  }, null, 2)

  const curl = `curl -X POST ${adres} \\
  -H "x-api-key: TWOJ-KLUCZ" \\
  -H "content-type: application/json" \\
  -d '${cialo.replace(/\n\s*/g, ' ')}'`

  const kopiuj = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(curl)
      setSkopiowano(true)
      window.setTimeout(() => setSkopiowano(false), 2000)
    } catch {
      // Brak schowka: tekst i tak jest na ekranie do zaznaczenia.
    }
  }, [curl])

  return (
    <Page>
      <PageHeader
        title={t('voicebot.api.title', 'Integracja API')}
        description={t('voicebot.api.description', 'Twój system może zlecić botowi rozmowę jednym żądaniem, na przykład od razu po tym, jak ktoś zostawi numer na stronie.')}
      />
      <PageBody>
        <div className="grid max-w-3xl gap-6">
          <section className="grid gap-2 rounded border p-4">
            <h2 className="font-medium">{t('voicebot.api.step1', '1. Wydaj klucz')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('voicebot.api.step1Hint', 'Klucz pokazujemy raz, przy wydaniu. Przechowuj go po stronie serwera, nigdy w kodzie strony widocznym dla przeglądarki.')}
            </p>
            <Button asChild className="w-fit">
              <Link href="/backend/api-keys">{t('voicebot.api.keys', 'Przejdź do kluczy API')}</Link>
            </Button>
          </section>

          <section className="grid gap-2 rounded border p-4">
            <h2 className="font-medium">{t('voicebot.api.step2', '2. Wyślij żądanie')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('voicebot.api.step2Hint', 'Jedno żądanie to jedna rozmowa. Bot zadzwoni z numeru kampanii, a wynik pojawi się w Połączeniach i wynikach.')}
            </p>
            {kampanie.length > 0 ? (
              <label className="flex flex-col gap-1 text-sm">
                <span>{t('voicebot.api.campaign', 'Kampania w przykładzie')}</span>
                <select className="w-fit rounded border px-2 py-1" value={wybrana} onChange={(e) => setWybrana(e.target.value)}>
                  {kampanie.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </label>
            ) : null}
            <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{curl}</pre>
            <Button variant="outline" className="w-fit" onClick={() => void kopiuj()}>
              {skopiowano ? t('voicebot.api.copied', 'Skopiowano') : t('voicebot.api.copy', 'Kopiuj przykład')}
            </Button>
          </section>

          <section className="grid gap-2 rounded border p-4 text-sm">
            <h2 className="font-medium">{t('voicebot.api.fields', 'Pola żądania')}</h2>
            <table className="text-sm">
              <tbody>
                <tr><td className="pr-4 font-mono">campaignId</td><td>{t('voicebot.api.f.campaignId', 'Kampania, z której numeru i scenariusza bot dzwoni. Wymagane.')}</td></tr>
                <tr><td className="pr-4 font-mono">phone</td><td>{t('voicebot.api.f.phone', 'Numer w formacie międzynarodowym, np. +48600000000. Wymagane.')}</td></tr>
                <tr><td className="pr-4 font-mono">firstName, lastName</td><td>{t('voicebot.api.f.name', 'Imię i nazwisko rozmówcy, jeśli znane.')}</td></tr>
                <tr><td className="pr-4 font-mono">leadRef</td><td>{t('voicebot.api.f.leadRef', 'Twój identyfikator zgłoszenia. Wraca razem z wynikiem rozmowy.')}</td></tr>
              </tbody>
            </table>
            <p className="text-muted-foreground">
              {t('voicebot.api.answer', 'Odpowiedź 201 z identyfikatorem rozmowy znaczy, że zlecenie jest w kolejce. Błąd 400 to niepoprawne dane, 401 to zły klucz.')}
            </p>
          </section>
        </div>
      </PageBody>
    </Page>
  )
}
