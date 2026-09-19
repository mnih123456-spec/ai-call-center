"use client"
import * as React from 'react'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { PrzyciskMaskowania, maskujOsobe, useMaskowanie } from '../maskowanie'

type Glos = {
  voiceId: string
  nazwa: string
  rodzaj: string
  jezyk: string | null
  probkaUrl: string | null
}

type Wlasny = {
  voiceId: string
  name: string
  consentPerson: string
  consentAt: string
}

type Kampania = { id: string; name: string; agentId: string }

export default function VoicebotGlosyPage() {
  const t = useT()
  const { zaslonione, przelacz } = useMaskowanie()
  const [glosy, setGlosy] = React.useState<Glos[]>([])
  const [wlasne, setWlasne] = React.useState<Wlasny[]>([])
  const [kampanie, setKampanie] = React.useState<Kampania[]>([])
  const [kampania, setKampania] = React.useState('')
  const [ladowanie, setLadowanie] = React.useState(true)
  const [blad, setBlad] = React.useState<string | null>(null)
  const [komunikat, setKomunikat] = React.useState<string | null>(null)
  const [przypisywany, setPrzypisywany] = React.useState<string | null>(null)

  // Formularz nagrania
  const [nazwa, setNazwa] = React.useState('')
  const [osoba, setOsoba] = React.useState('')
  const [zgoda, setZgoda] = React.useState(false)
  const [plik, setPlik] = React.useState<File | null>(null)
  const [wysylka, setWysylka] = React.useState(false)

  const wczytaj = React.useCallback(async () => {
    setLadowanie(true)
    setBlad(null)
    try {
      const [gRes, kRes] = await Promise.all([
        fetch('/api/voicebot/voices', { credentials: 'same-origin' }),
        fetch('/api/voicebot/campaigns?pageSize=100', { credentials: 'same-origin' }),
      ])
      if (gRes.ok) {
        const body = (await gRes.json()) as { glosy?: Glos[]; wlasne?: Wlasny[] }
        setGlosy(Array.isArray(body.glosy) ? body.glosy : [])
        setWlasne(Array.isArray(body.wlasne) ? body.wlasne : [])
      }
      if (kRes.ok) {
        const body = (await kRes.json()) as { items?: Kampania[] }
        const lista = Array.isArray(body.items) ? body.items : []
        setKampanie(lista)
        if (!kampania && lista.length) setKampania(lista[0].id)
      }
    } catch {
      setBlad(t('voicebot.voices.loadError', 'Nie udało się pobrać głosów.'))
    } finally {
      setLadowanie(false)
    }
  }, [kampania, t])

  React.useEffect(() => { void wczytaj() }, [wczytaj])

  const przypisz = React.useCallback(async (voiceId: string) => {
    if (!kampania) return
    setPrzypisywany(voiceId)
    setBlad(null)
    setKomunikat(null)
    try {
      const res = await fetch('/api/voicebot/voices', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId: kampania, voiceId }),
      })
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) {
        setBlad(body?.error ?? t('voicebot.voices.assignError', 'Nie udało się zmienić głosu.'))
        return
      }
      setKomunikat(t('voicebot.voices.assigned', 'Głos ustawiony. Kolejna rozmowa pójdzie już nim.'))
    } catch {
      setBlad(t('voicebot.voices.assignError', 'Nie udało się zmienić głosu.'))
    } finally {
      setPrzypisywany(null)
    }
  }, [kampania, t])

  const wyslijNagranie = React.useCallback(async () => {
    if (!plik || !nazwa.trim() || !osoba.trim() || !zgoda) return
    setWysylka(true)
    setBlad(null)
    setKomunikat(null)
    try {
      const dane = new FormData()
      dane.append('nazwa', nazwa.trim())
      dane.append('osoba', osoba.trim())
      dane.append('zgoda', 'true')
      dane.append('nagranie', plik, plik.name)

      const res = await fetch('/api/voicebot/voices', {
        method: 'POST',
        credentials: 'same-origin',
        body: dane,
      })
      const body = (await res.json().catch(() => null)) as { error?: string; name?: string } | null
      if (!res.ok) {
        setBlad(body?.error ?? t('voicebot.voices.cloneError', 'Nie udało się przygotować głosu.'))
        return
      }
      setNazwa('')
      setOsoba('')
      setZgoda(false)
      setPlik(null)
      setKomunikat(t('voicebot.voices.cloned', 'Głos gotowy. Znajdziesz go na liście poniżej.'))
      await wczytaj()
    } catch {
      setBlad(t('voicebot.voices.cloneError', 'Nie udało się przygotować głosu.'))
    } finally {
      setWysylka(false)
    }
  }, [plik, nazwa, osoba, zgoda, wczytaj, t])

  const wlasneId = React.useMemo(() => new Set(wlasne.map((w) => w.voiceId)), [wlasne])
  const opisZgody = React.useCallback((voiceId: string) => {
    const w = wlasne.find((x) => x.voiceId === voiceId)
    if (!w) return null
    const kto = zaslonione ? maskujOsobe(w.consentPerson) : w.consentPerson
    return `${kto}, zgoda ${new Date(w.consentAt).toLocaleDateString('pl-PL')}`
  }, [wlasne, zaslonione])

  return (
    <Page>
      <PageHeader
        title={t('voicebot.voices.title', 'Głosy')}
        description={t('voicebot.voices.subtitle', 'Wybierz, jakim głosem bot rozmawia z Twoimi klientami.')}
        actions={
          <div className="flex gap-2">
            <PrzyciskMaskowania
              zaslonione={zaslonione}
              przelacz={przelacz}
              etykietaWlacz={t('voicebot.mask.on', 'Zasłoń dane')}
              etykietaWylacz={t('voicebot.mask.off', 'Pokaż dane')}
            />
            <Button variant="outline" onClick={() => void wczytaj()}>{t('voicebot.voices.refresh', 'Odśwież')}</Button>
          </div>
        }
      />
      <PageBody>
        {ladowanie ? (
          <div className="text-sm text-muted-foreground">{t('voicebot.voices.loading', 'Wczytuję...')}</div>
        ) : (
          <div className="max-w-3xl">
            {kampanie.length === 0 ? (
              <div className="mb-6 rounded border border-dashed p-3 text-sm text-muted-foreground">
                {t('voicebot.voices.noCampaigns', 'Najpierw załóż kampanię, bo głos przypisuje się do jej agenta.')}
              </div>
            ) : (
              <label className="mb-6 flex flex-col gap-1 text-sm">
                <span>{t('voicebot.voices.field.campaign', 'Kampania, której zmieniasz głos')}</span>
                <select
                  className="rounded border px-2 py-1"
                  value={kampania}
                  onChange={(e) => setKampania(e.target.value)}
                >
                  {kampanie.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </label>
            )}

            {komunikat ? <div className="mb-4 text-sm text-muted-foreground">{komunikat}</div> : null}
            {blad ? <div className="mb-4 text-sm text-destructive">{blad}</div> : null}

            <h2 className="mb-2 text-sm font-medium">{t('voicebot.voices.list', 'Dostępne głosy')}</h2>
            {glosy.length === 0 ? (
              <div className="rounded border border-dashed p-3 text-sm text-muted-foreground">
                {t('voicebot.voices.empty', 'Brak głosów. Sprawdź klucz dostawcy albo nagraj własny.')}
              </div>
            ) : (
              <ul className="divide-y rounded border">
                {glosy.map((g) => (
                  <li key={g.voiceId} className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {g.nazwa}
                        {wlasneId.has(g.voiceId) ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {t('voicebot.voices.own', 'głos firmowy')}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {opisZgody(g.voiceId) ?? g.jezyk ?? g.rodzaj}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {g.probkaUrl ? (
                        // Odsłuch przed wyborem, bo nazwa głosu nic nie mówi.
                        <audio controls preload="none" src={g.probkaUrl} className="h-8" />
                      ) : null}
                      <Button
                        variant="outline"
                        disabled={!kampania || przypisywany === g.voiceId}
                        onClick={() => void przypisz(g.voiceId)}
                      >
                        {przypisywany === g.voiceId
                          ? t('voicebot.voices.assigning', 'Ustawiam...')
                          : t('voicebot.voices.use', 'Użyj')}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <h2 className="mb-2 mt-8 text-sm font-medium">
              {t('voicebot.voices.cloneTitle', 'Nagraj własny głos firmowy')}
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              {t(
                'voicebot.voices.cloneHint',
                'Wystarczy trzy do pięciu minut spokojnej mowy, bez muzyki i bez innych osób w tle. Plik mp3 lub wav.',
              )}
            </p>

            <div className="grid gap-3 rounded border p-4">
              <label className="flex flex-col gap-1 text-sm">
                <span>{t('voicebot.voices.field.name', 'Nazwa głosu')}</span>
                <input
                  className="rounded border px-2 py-1"
                  value={nazwa}
                  onChange={(e) => setNazwa(e.target.value)}
                  placeholder={t('voicebot.voices.field.namePlaceholder', 'np. Recepcja, głos Anny')}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span>{t('voicebot.voices.field.person', 'Czyj to głos, imię i nazwisko')}</span>
                <input
                  className="rounded border px-2 py-1"
                  value={osoba}
                  onChange={(e) => setOsoba(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span>{t('voicebot.voices.field.file', 'Nagranie')}</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="text-sm"
                  onChange={(e) => setPlik(e.target.files?.[0] ?? null)}
                />
              </label>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={zgoda}
                  onChange={(e) => setZgoda(e.target.checked)}
                />
                <span>
                  {t(
                    'voicebot.voices.field.consent',
                    'Potwierdzam, że osoba nagrana na tej próbce wyraziła zgodę na użycie swojego głosu przez bota telefonicznego.',
                  )}
                </span>
              </label>

              <div>
                <Button
                  onClick={() => void wyslijNagranie()}
                  disabled={wysylka || !plik || !nazwa.trim() || !osoba.trim() || !zgoda}
                >
                  {wysylka
                    ? t('voicebot.voices.cloning', 'Przygotowuję głos...')
                    : t('voicebot.voices.clone', 'Przygotuj głos')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </PageBody>
    </Page>
  )
}
