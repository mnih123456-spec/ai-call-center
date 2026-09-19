"use client"
import * as React from 'react'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type Profil = {
  id: string
  agentId: string
  name: string
  direction: string
  questions: string
  industry: string
  knowledgeUrl: string
  knowledgeText: string
  knowledgeReadAt: string | null
  syncedAt: string | null
  syncResult: string | null
  llm: string | null
  cisza: number | null
}

type AgentDostawcy = { agentId: string; name: string }
type Branza = { id: string; nazwa: string; przyklady?: string[]; pytania?: string[] }
type Model = { id: string; nazwa: string }

const PUSTY_FORMULARZ = {
  id: '' as string,
  agentId: '',
  name: '',
  direction: 'outbound',
  questions: '',
  industry: '',
  knowledgeUrl: '',
  odswiez: false,
  llm: '',
  cisza: '',
}

export default function VoicebotAgenciPage() {
  const t = useT()
  const [profile, setProfile] = React.useState<Profil[]>([])
  const [agenci, setAgenci] = React.useState<AgentDostawcy[]>([])
  const [branze, setBranze] = React.useState<Branza[]>([])
  const [modele, setModele] = React.useState<Model[]>([])
  const [katalogDziala, setKatalogDziala] = React.useState(true)
  const [formularz, setFormularz] = React.useState(PUSTY_FORMULARZ)
  const [nowa, setNowa] = React.useState({ nazwaFirmy: '', industry: '', knowledgeUrl: '' })
  const [zakladanie, setZakladanie] = React.useState(false)
  const [gotowe, setGotowe] = React.useState<{ nazwa: string; kampania: string; numer: string | null; uwaga: string | null } | null>(null)
  // Wybor modelu to sprawa operatora platformy, nie klienta. Klient ma dostac
  // bota, ktory dziala, a nie liste modeli do eksperymentow na wlasnych
  // rozmowach.
  const [operator, setOperator] = React.useState(false)
  const [ladowanie, setLadowanie] = React.useState(true)
  const [zapis, setZapis] = React.useState(false)
  const [blad, setBlad] = React.useState<string | null>(null)
  const [komunikat, setKomunikat] = React.useState<string | null>(null)

  const wczytaj = React.useCallback(async () => {
    setLadowanie(true)
    setBlad(null)
    try {
      const res = await fetch('/api/voicebot/agents', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as {
        profile?: Profil[]
        agenci?: AgentDostawcy[]
        branze?: Branza[]
        modele?: Model[]
        katalogDziala?: boolean
      }
      setProfile(Array.isArray(body.profile) ? body.profile : [])
      setAgenci(Array.isArray(body.agenci) ? body.agenci : [])
      setBranze(Array.isArray(body.branze) ? body.branze : [])
      setModele(Array.isArray(body.modele) ? body.modele : [])
      setKatalogDziala(body.katalogDziala !== false)
    } catch {
      setBlad(t('voicebot.agents.loadError', 'Nie udało się pobrać agentów.'))
    } finally {
      setLadowanie(false)
    }
  }, [t])

  React.useEffect(() => { void wczytaj() }, [wczytaj])

  React.useEffect(() => {
    let zywe = true
    void (async () => {
      try {
        const res = await fetch('/api/directory/organization-switcher', { credentials: 'same-origin' })
        if (!res.ok) return
        const body = (await res.json()) as { isSuperAdmin?: boolean }
        if (zywe) setOperator(body.isSuperAdmin === true)
      } catch { /* brak odpowiedzi znaczy: nie operator */ }
    })()
    return () => { zywe = false }
  }, [])

  const zapisz = React.useCallback(async () => {
    if (!formularz.agentId || !formularz.name.trim()) return
    setZapis(true)
    setBlad(null)
    setKomunikat(null)
    try {
      const res = await fetch('/api/voicebot/agents', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(formularz.id ? { id: formularz.id } : {}),
          agentId: formularz.agentId,
          name: formularz.name.trim(),
          direction: formularz.direction,
          questions: formularz.questions,
          industry: formularz.industry,
          knowledgeUrl: formularz.knowledgeUrl,
          odswiezWiedze: formularz.odswiez,
          llm: formularz.llm,
          ...(formularz.cisza ? { cisza: Number(formularz.cisza) } : {}),
        }),
      })
      const body = (await res.json().catch(() => null)) as
        | { error?: string; wyslane?: boolean; syncResult?: string }
        | null
      if (!res.ok) {
        setBlad(body?.error ?? t('voicebot.agents.saveError', 'Nie udało się zapisać.'))
        return
      }
      setFormularz({ ...PUSTY_FORMULARZ })
      // Zapis u nas i przekazanie pytań do dostawcy to dwie różne rzeczy.
      // Gdy druga zawiedzie, klient musi to wiedzieć, bo bot dalej mówi
      // po staremu, a panel pokazuje nowe pytania.
      setKomunikat(body?.wyslane === false
        ? t('voicebot.agents.savedNotSynced', 'Zapisano u nas, ale nie wszystko się udało: ') + (body?.syncResult ?? '')
        : body?.syncResult ?? t('voicebot.agents.saved', 'Zapisano i przekazano do agenta.'))
      await wczytaj()
    } catch {
      setBlad(t('voicebot.agents.saveError', 'Nie udało się zapisać.'))
    } finally {
      setZapis(false)
    }
  }, [formularz, wczytaj, t])

  const zalozBota = React.useCallback(async () => {
    setZakladanie(true)
    setBlad(null)
    setKomunikat(null)
    try {
      const res = await fetch('/api/voicebot/agents/create', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(nowa),
      })
      const body = (await res.json().catch(() => null)) as
        | { error?: string; nazwa?: string; uwaga?: string; kampaniaNazwa?: string; numerPrzypisany?: string | null }
        | null
      if (!res.ok) {
        setBlad(body?.error ?? t('voicebot.agents.new.error', 'Nie udało się założyć bota.'))
        return
      }
      setNowa({ nazwaFirmy: '', industry: '', knowledgeUrl: '' })
      setGotowe({
        nazwa: body?.nazwa ?? '',
        kampania: body?.kampaniaNazwa ?? '',
        numer: body?.numerPrzypisany ?? null,
        uwaga: body?.uwaga ?? null,
      })
      await wczytaj()
    } catch {
      setBlad(t('voicebot.agents.new.error', 'Nie udało się założyć bota.'))
    } finally {
      setZakladanie(false)
    }
  }, [nowa, wczytaj, t])

  // Podpowiedz kredytowa przy serwisie samochodowym mowi klientowi, ze
  // pomylil sie w wyborze, nawet gdy wybral dobrze.
  const podpowiedzPytan = React.useMemo(() => {
    const wybrana = branze.find((b) => b.id === formularz.industry)
    const lista = wybrana?.przyklady ?? []
    return lista.length > 0
      ? lista.join('\n')
      : t('voicebot.agents.field.questionsFallback', 'O co bot ma dopytać w rozmowie?')
  }, [branze, formularz.industry, t])

  const gotowePytania = React.useMemo(
    () => (branze.find((b) => b.id === formularz.industry)?.pytania ?? []).join('\n'),
    [branze, formularz.industry],
  )

  const edytuj = React.useCallback((p: Profil) => {
    setFormularz({
      id: p.id,
      agentId: p.agentId,
      name: p.name,
      direction: p.direction,
      questions: p.questions,
      industry: p.industry,
      knowledgeUrl: p.knowledgeUrl,
      odswiez: false,
      llm: p.llm ?? '',
      cisza: p.cisza === null ? '' : String(p.cisza),
    })
    setKomunikat(null)
    setBlad(null)
  }, [])

  return (
    <Page>
      <PageHeader
        title={t('voicebot.agents.title', 'Agenci i scenariusz')}
        description={t('voicebot.agents.subtitle', 'Dodaj pytania, które bot ma zadać. Reszta scenariusza jest nasza i sprawdzona.')}
        actions={<Button variant="outline" onClick={() => void wczytaj()}>{t('voicebot.agents.refresh', 'Odśwież')}</Button>}
      />
      <PageBody>
        {ladowanie ? (
          <div className="text-sm text-muted-foreground">{t('voicebot.agents.loading', 'Wczytuję...')}</div>
        ) : (
          <div className="max-w-3xl">
            {!katalogDziala ? (
              <div className="mb-4 rounded border border-dashed p-3 text-sm text-muted-foreground">
                {t('voicebot.agents.noCatalog', 'Brak połączenia z dostawcą głosu. Identyfikator agenta trzeba wpisać ręcznie.')}
              </div>
            ) : null}

            {/* Zakladanie bota od zera. Stoi nad lista, bo firma, ktora
                dopiero zaczyna, nie ma czego edytowac, a wybieranie agenta
                z listy konta konczylo sie tym, ze bot mowil cudza nazwa. */}
            <div className="mb-6 grid gap-3 rounded border p-4">
              <div className="text-sm font-medium">
                {t('voicebot.agents.new.title', 'Nowy bot dla tej firmy')}
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  'voicebot.agents.new.hint',
                  'Zakładamy bota od zera, na naszym sprawdzonym scenariuszu. Przedstawi się nazwą Twojej firmy, dostanie słownik pojęć z jej branży, a z podanego adresu przeczytamy, czym firma się zajmuje.',
                )}
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span>{t('voicebot.agents.new.company', 'Nazwa firmy')}</span>
                  <input
                    className="rounded border px-2 py-1"
                    value={nowa.nazwaFirmy}
                    onChange={(e) => setNowa((n) => ({ ...n, nazwaFirmy: e.target.value }))}
                    placeholder={t('voicebot.agents.new.companyPlaceholder', 'np. Kancelaria Nowak')}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span>{t('voicebot.agents.field.industry', 'Branża firmy')}</span>
                  <select
                    className="rounded border px-2 py-1"
                    value={nowa.industry}
                    onChange={(e) => setNowa((n) => ({ ...n, industry: e.target.value }))}
                  >
                    {branze.map((b) => <option key={b.id} value={b.id}>{b.nazwa}</option>)}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span>{t('voicebot.agents.new.site', 'Adres strony firmy')}</span>
                  <input
                    className="rounded border px-2 py-1"
                    value={nowa.knowledgeUrl}
                    onChange={(e) => setNowa((n) => ({ ...n, knowledgeUrl: e.target.value }))}
                    placeholder="https://twojafirma.pl"
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={() => void zalozBota()} disabled={zakladanie || nowa.nazwaFirmy.trim().length < 2}>
                  {zakladanie
                    ? t('voicebot.agents.new.working', 'Zakładam bota...')
                    : t('voicebot.agents.new.submit', 'Załóż bota')}
                </Button>
                {nowa.knowledgeUrl ? (
                  <span className="text-xs text-muted-foreground">
                    {t('voicebot.agents.new.slow', 'Z odczytem strony potrwa to kilkanaście sekund.')}
                  </span>
                ) : null}
              </div>

              {/* Zalozony bot sam jeszcze nie dzwoni. Bez tego kroku kreator
                  konczyl sie komunikatem i nie bylo wiadomo, co dalej. */}
              {gotowe ? (
                <div className="mt-2 rounded border border-dashed p-3 text-sm">
                  <div className="font-medium">
                    {t('voicebot.agents.new.readyTitle', 'Bot gotowy: ')}{gotowe.nazwa}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {t('voicebot.agents.new.readyCampaign', 'Założyliśmy dla niego kampanię ')}
                    <span className="font-medium">{gotowe.kampania}</span>
                    {gotowe.numer
                      ? t('voicebot.agents.new.readyNumber', ' i przypisaliśmy numer ') + gotowe.numer
                      : t('voicebot.agents.new.readyNoNumber', ', ale bez numeru: przypisz go na ekranie kampanii')}
                    {'.'}
                  </div>
                  {gotowe.uwaga ? (
                    <div className="mt-1 text-muted-foreground">{gotowe.uwaga}</div>
                  ) : null}
                  <a className="mt-2 inline-block underline" href="/backend/voicebot">
                    {t('voicebot.agents.new.readyCta', 'Przejdź do kampanii i wykonaj rozmowę testową')}
                  </a>
                </div>
              ) : null}
            </div>

            {profile.length > 0 ? (
              <ul className="mb-6 divide-y rounded border">
                {profile.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {p.name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {p.direction === 'inbound'
                            ? t('voicebot.agents.inbound', 'przychodzące')
                            : t('voicebot.agents.outbound', 'wychodzące')}
                        </span>
                      </div>
                      {/* Identyfikator agenta pokazujemy wprost: przy zgłoszeniu
                          od klienta to pierwsza rzecz, której szuka wsparcie. */}
                      <div className="font-mono text-xs text-muted-foreground">{p.agentId}</div>
                      {p.knowledgeUrl ? (
                        <div className="text-xs text-muted-foreground">{p.knowledgeUrl}</div>
                      ) : null}
                      {p.syncResult ? (
                        <div className="text-xs text-muted-foreground">{p.syncResult}</div>
                      ) : null}
                      {/* Notatkę pokazujemy w całości, bo klient musi wiedzieć,
                          co bot powie o jego firmie, zanim ten zadzwoni. */}
                      {p.knowledgeText ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-muted-foreground">
                            {t('voicebot.agents.knowledgeShow', 'Co bot wie o firmie')}
                            {p.knowledgeReadAt
                              ? ` (${new Date(p.knowledgeReadAt).toLocaleString('pl-PL')})`
                              : ''}
                          </summary>
                          <pre className="mt-2 max-w-xl whitespace-pre-wrap rounded bg-muted p-2 text-xs">
                            {p.knowledgeText}
                          </pre>
                        </details>
                      ) : null}
                    </div>
                    <Button variant="outline" onClick={() => edytuj(p)}>
                      {t('voicebot.agents.edit', 'Edytuj')}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mb-6 rounded border border-dashed p-3 text-sm text-muted-foreground">
                {t('voicebot.agents.empty', 'Nie masz jeszcze przypisanego agenta.')}
              </div>
            )}

            {/* Formularz pokazuje sie dopiero po kliknieciu Edytuj. Wczesniej
                staly obok siebie dwie drogi dodania bota, kreator i recznie
                wypelniany formularz, i nie bylo wiadomo, ktorej uzyc. Recznie
                przypisac agenta moze jeszcze operator, bo tylko on widzi
                agentow spoza tej firmy. */}
            {formularz.id || operator ? (
            <div className="grid gap-3 rounded border p-4">
              <div className="text-sm font-medium">
                {formularz.id
                  ? t('voicebot.agents.formEdit', 'Edycja bota: ') + formularz.name
                  : t('voicebot.agents.formNew', 'Przypisanie istniejącego agenta (operator)')}
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span>{t('voicebot.agents.field.agent', 'Agent u dostawcy')}</span>
                {agenci.length > 0 ? (
                  <select
                    className="rounded border px-2 py-1"
                    value={formularz.agentId}
                    onChange={(e) => setFormularz((f) => ({ ...f, agentId: e.target.value }))}
                  >
                    <option value="">{t('voicebot.agents.field.choose', 'Wybierz')}</option>
                    {agenci.map((a) => <option key={a.agentId} value={a.agentId}>{a.name}</option>)}
                  </select>
                ) : (
                  <input
                    className="rounded border px-2 py-1 font-mono text-xs"
                    value={formularz.agentId}
                    onChange={(e) => setFormularz((f) => ({ ...f, agentId: e.target.value }))}
                    placeholder="agent_..."
                  />
                )}
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span>{t('voicebot.agents.field.name', 'Nazwa u nas')}</span>
                <input
                  className="rounded border px-2 py-1"
                  value={formularz.name}
                  onChange={(e) => setFormularz((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t('voicebot.agents.field.namePlaceholder', 'np. Potwierdzanie leadów')}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span>{t('voicebot.agents.field.direction', 'Kierunek rozmów')}</span>
                <select
                  className="rounded border px-2 py-1"
                  value={formularz.direction}
                  onChange={(e) => setFormularz((f) => ({ ...f, direction: e.target.value }))}
                >
                  <option value="outbound">{t('voicebot.agents.outbound', 'wychodzące')}</option>
                  <option value="inbound">{t('voicebot.agents.inbound', 'przychodzące')}</option>
                </select>
              </label>

              {/* Ustawienia rozmowy, a nie jej treści. Widoczne wyłącznie dla
                  operatora platformy: klient ma dostać bota, który działa,
                  a nie listę modeli do eksperymentów na własnych rozmowach. */}
              {operator ? (
              <div className="grid gap-3 rounded border border-dashed p-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span>{t('voicebot.agents.field.llm', 'Model rozmowy')}</span>
                  <select
                    className="rounded border px-2 py-1"
                    value={formularz.llm}
                    onChange={(e) => setFormularz((f) => ({ ...f, llm: e.target.value }))}
                  >
                    <option value="">{t('voicebot.agents.field.llmKeep', 'Bez zmiany')}</option>
                    {modele.map((m) => <option key={m.id} value={m.id}>{m.nazwa}</option>)}
                    {formularz.llm && !modele.some((m) => m.id === formularz.llm) ? (
                      <option value={formularz.llm}>{formularz.llm}</option>
                    ) : null}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span>{t('voicebot.agents.field.cisza', 'Cisza kończąca wypowiedź, w sekundach')}</span>
                  <input
                    className="rounded border px-2 py-1"
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={formularz.cisza}
                    onChange={(e) => setFormularz((f) => ({ ...f, cisza: e.target.value }))}
                    placeholder="1.5"
                  />
                </label>

                <p className="text-xs text-muted-foreground sm:col-span-2">
                  {t(
                    'voicebot.agents.field.llmHint',
                    'W rozmowie telefonicznej liczy się czas do pierwszego słowa. Cięższy model dokłada sekundy ciszy, w których rozmówca myśli, że połączenie padło. Krótsza cisza przyspiesza odpowiedź, ale zbyt krótka wchodzi rozmówcy w słowo.',
                  )}
                </p>
              </div>
              ) : null}

              <label className="flex flex-col gap-1 text-sm">
                <span>{t('voicebot.agents.field.industry', 'Branża firmy')}</span>
                <select
                  className="rounded border px-2 py-1"
                  value={formularz.industry}
                  onChange={(e) => setFormularz((f) => ({ ...f, industry: e.target.value }))}
                >
                  {branze.map((b) => <option key={b.id} value={b.id}>{b.nazwa}</option>)}
                </select>
                <span className="text-xs text-muted-foreground">
                  {t(
                    'voicebot.agents.field.industryHint',
                    'Doklejamy słownik pojęć z tej branży, żeby bot rozumiał, o czym mówi rozmówca. Ten słownik jest nasz i sprawdzony, w odróżnieniu od wiedzy ze strony.',
                  )}
                </span>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span>{t('voicebot.agents.field.questions', 'Pytania, które bot ma zadać, po jednym w wierszu')}</span>
                <textarea
                  className="min-h-32 rounded border px-2 py-1"
                  value={formularz.questions}
                  onChange={(e) => setFormularz((f) => ({ ...f, questions: e.target.value }))}
                  placeholder={podpowiedzPytan}
                />
                {/* Kazda firma pyta o co innego, wiec gotowiec jest punktem
                    wyjscia, a nie obowiazkiem. Nadpisujemy tylko na wyrazne
                    klikniecie, zeby nie skasowac komus jego wlasnych pytan. */}
                {gotowePytania ? (
                  <button
                    type="button"
                    className="self-start text-xs underline text-muted-foreground"
                    onClick={() => setFormularz((f) => ({ ...f, questions: gotowePytania }))}
                  >
                    {formularz.questions.trim()
                      ? t('voicebot.agents.field.questionsReplace', 'Zastąp gotowym zestawem dla tej branży')
                      : t('voicebot.agents.field.questionsFill', 'Wstaw gotowy zestaw pytań dla tej branży')}
                  </button>
                ) : null}
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span>{t('voicebot.agents.field.knowledge', 'Adres strony firmy, z której bot ma czerpać wiedzę')}</span>
                <input
                  className="rounded border px-2 py-1"
                  value={formularz.knowledgeUrl}
                  onChange={(e) => setFormularz((f) => ({ ...f, knowledgeUrl: e.target.value }))}
                  placeholder="https://twojafirma.pl"
                />
                <span className="text-xs text-muted-foreground">
                  {t(
                    'voicebot.agents.field.knowledgeHint',
                    'Przeczytamy tę stronę i zrobimy z niej krótką notatkę, z której bot korzysta, gdy rozmówca pyta o firmę. Notatkę zobaczysz na liście powyżej.',
                  )}
                </span>
              </label>

              {formularz.knowledgeUrl ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formularz.odswiez}
                    onChange={(e) => setFormularz((f) => ({ ...f, odswiez: e.target.checked }))}
                  />
                  <span>
                    {t('voicebot.agents.field.refresh', 'Przeczytaj stronę jeszcze raz, mimo że adres się nie zmienił')}
                  </span>
                </label>
              ) : null}

              <p className="text-xs text-muted-foreground">
                {t(
                  'voicebot.agents.hint',
                  'Nie podajesz treści całej rozmowy. Powitanie, potwierdzenie tożsamości i pytanie o zgodę są stałe i tego nie zmieniamy, bo od tego zależy zgodność rozmowy z prawem.',
                )}
              </p>

              <div className="flex items-center gap-3">
                <Button onClick={() => void zapisz()} disabled={zapis || !formularz.agentId || !formularz.name.trim()}>
                  {zapis
                    ? (formularz.knowledgeUrl
                      ? t('voicebot.agents.savingReading', 'Zapisuję i czytam stronę...')
                      : t('voicebot.agents.saving', 'Zapisuję...'))
                    : t('voicebot.agents.save', 'Zapisz')}
                </Button>
                {formularz.id ? (
                  <Button variant="outline" onClick={() => setFormularz({ ...PUSTY_FORMULARZ })} disabled={zapis}>
                    {t('voicebot.agents.cancel', 'Anuluj')}
                  </Button>
                ) : null}
                {komunikat ? <span className="text-sm text-muted-foreground">{komunikat}</span> : null}
              </div>

              {blad ? <div className="text-sm text-destructive">{blad}</div> : null}
            </div>
            ) : null}

            {blad && !formularz.id && !operator ? (
              <div className="text-sm text-destructive">{blad}</div>
            ) : null}
            {komunikat && !formularz.id && !operator ? (
              <div className="text-sm text-muted-foreground">{komunikat}</div>
            ) : null}
          </div>
        )}
      </PageBody>
    </Page>
  )
}

