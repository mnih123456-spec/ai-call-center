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

type Branza = { id: string; nazwa: string; przyklady?: string[]; pytania?: string[] }
type Model = { id: string; nazwa: string }

type Edycja = {
  id: string
  questions: string
  industry: string
  knowledgeUrl: string
  odswiez: boolean
  llm: string
  cisza: string
}

/**
 * Konfiguracja bota firmy.
 *
 * Ten ekran nie zaklada firm ani botow. Firma, ktora tu wchodzi, ma juz
 * jednego bota i przyszla zmienic mu pytania. Propozycja zalozenia kolejnej
 * firmy w tym miejscu odpowiada na pytanie, ktorego nikt nie zadal, wiec
 * zakladanie zyje wylacznie na ekranie "Nowy klient".
 */
export default function VoicebotAgenciPage() {
  const t = useT()
  const [profile, setProfile] = React.useState<Profil[]>([])
  const [branze, setBranze] = React.useState<Branza[]>([])
  const [modele, setModele] = React.useState<Model[]>([])
  const [katalogDziala, setKatalogDziala] = React.useState(true)

  const [edycja, setEdycja] = React.useState<Edycja | null>(null)

  const [ladowanie, setLadowanie] = React.useState(true)
  const [zapis, setZapis] = React.useState(false)
  const [kasowany, setKasowany] = React.useState<string | null>(null)
  const [blad, setBlad] = React.useState<string | null>(null)
  const [komunikat, setKomunikat] = React.useState<string | null>(null)

  // Model i czas ciszy to sprawa operatora platformy. Klient ma dostac bota,
  // ktory dziala, a nie liste modeli do eksperymentow na wlasnych rozmowach.
  const [operator, setOperator] = React.useState(false)

  // Rozwiniecie karty robimy raz, zaraz po wczytaniu. Bez tego "Zwin"
  // zamykaloby karte, ktora natychmiast otwieralaby sie z powrotem.
  const rozwinieto = React.useRef(false)

  const wczytaj = React.useCallback(async () => {
    setLadowanie(true)
    setBlad(null)
    try {
      const res = await fetch('/api/voicebot/agents', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as {
        profile?: Profil[]
        branze?: Branza[]
        modele?: Model[]
        katalogDziala?: boolean
      }
      const lista = Array.isArray(body.profile) ? body.profile : []
      setProfile(lista)
      setBranze(Array.isArray(body.branze) ? body.branze : [])
      setModele(Array.isArray(body.modele) ? body.modele : [])
      setKatalogDziala(body.katalogDziala !== false)

      // Firma z jednym botem przyszla tu edytowac wlasnie jego. Kazanie jej
      // najpierw kliknac "Konfiguruj" to klikniecie bez decyzji.
      if (!rozwinieto.current && lista.length === 1) {
        rozwinieto.current = true
        const p = lista[0]
        setEdycja({
          id: p.id,
          questions: p.questions,
          industry: p.industry,
          knowledgeUrl: p.knowledgeUrl,
          odswiez: false,
          llm: p.llm ?? '',
          cisza: p.cisza === null ? '' : String(p.cisza),
        })
      }
    } catch {
      setBlad(t('voicebot.agents.loadError', 'Nie udało się pobrać botów.'))
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

  const otworz = React.useCallback((p: Profil) => {
    setKomunikat(null)
    setBlad(null)
    setEdycja((obecna) => obecna?.id === p.id ? null : {
      id: p.id,
      questions: p.questions,
      industry: p.industry,
      knowledgeUrl: p.knowledgeUrl,
      odswiez: false,
      llm: p.llm ?? '',
      cisza: p.cisza === null ? '' : String(p.cisza),
    })
  }, [])

  const zapisz = React.useCallback(async (p: Profil) => {
    if (!edycja) return
    setZapis(true)
    setBlad(null)
    setKomunikat(null)
    try {
      const res = await fetch('/api/voicebot/agents', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: p.id,
          agentId: p.agentId,
          name: p.name,
          direction: p.direction,
          questions: edycja.questions,
          industry: edycja.industry,
          knowledgeUrl: edycja.knowledgeUrl,
          odswiezWiedze: edycja.odswiez,
          ...(operator ? { llm: edycja.llm } : {}),
          ...(operator && edycja.cisza ? { cisza: Number(edycja.cisza) } : {}),
        }),
      })
      const body = (await res.json().catch(() => null)) as
        | { error?: string; wyslane?: boolean; syncResult?: string }
        | null
      if (!res.ok) {
        setBlad(body?.error ?? t('voicebot.agents.saveError', 'Nie udało się zapisać.'))
        return
      }
      // Zapis u nas i przekazanie zmian botowi to dwie rozne rzeczy. Gdy druga
      // zawiedzie, klient musi to wiedziec, bo bot dalej mowi po staremu,
      // a panel pokazuje nowe pytania.
      setKomunikat(body?.syncResult ?? t('voicebot.agents.saved', 'Zapisane i przekazane botowi.'))
      await wczytaj()
    } catch {
      setBlad(t('voicebot.agents.saveError', 'Nie udało się zapisać.'))
    } finally {
      setZapis(false)
    }
  }, [edycja, operator, wczytaj, t])

  const usunBota = React.useCallback(async (p: Profil) => {
    // Potwierdzenie jest tu konieczne: bot znika razem ze swoim scenariuszem
    // u dostawcy i nie da sie go odtworzyc jednym klikniecem.
    const zgoda = window.confirm(
      t('voicebot.agents.deleteConfirm', 'Usunąć bota ') + p.name +
      t('voicebot.agents.deleteConfirmTail', '? Zniknie też jego scenariusz u dostawcy. Tego nie da się cofnąć.'),
    )
    if (!zgoda) return
    setKasowany(p.id)
    setBlad(null)
    setKomunikat(null)
    try {
      const res = await fetch('/api/voicebot/agents/delete', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: p.id }),
      })
      const body = (await res.json().catch(() => null)) as { error?: string; uwaga?: string } | null
      if (!res.ok) {
        setBlad(body?.error ?? t('voicebot.agents.deleteError', 'Nie udało się usunąć bota.'))
        return
      }
      setEdycja(null)
      setKomunikat(body?.uwaga ?? t('voicebot.agents.deleted', 'Bot usunięty.'))
      await wczytaj()
    } catch {
      setBlad(t('voicebot.agents.deleteError', 'Nie udało się usunąć bota.'))
    } finally {
      setKasowany(null)
    }
  }, [wczytaj, t])

  const nazwaBranzy = React.useCallback(
    (id: string) => branze.find((b) => b.id === id)?.nazwa ?? '',
    [branze],
  )

  return (
    <Page>
      <PageHeader
        title={t('voicebot.agents.title', 'Pytania, które zadaje bot')}
        actions={<Button variant="outline" onClick={() => void wczytaj()}>{t('voicebot.agents.refresh', 'Odśwież')}</Button>}
      />
      <PageBody>
        {ladowanie ? (
          <div className="text-sm text-muted-foreground">{t('voicebot.agents.loading', 'Wczytuję...')}</div>
        ) : (
          <div className="grid max-w-3xl gap-6">
            {!katalogDziala ? (
              <div className="rounded border border-dashed p-3 text-sm text-muted-foreground">
                {t('voicebot.agents.noCatalog', 'Brak połączenia z dostawcą głosu. Zmiany nie dotrą teraz do bota.')}
              </div>
            ) : null}

            {komunikat ? <div className="rounded border bg-muted p-3 text-sm">{komunikat}</div> : null}
            {blad ? <div className="text-sm text-destructive">{blad}</div> : null}

            {profile.length === 0 ? (
              <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
                {t('voicebot.agents.empty', 'Ta firma nie ma jeszcze bota.')}
              </div>
            ) : null}

            {profile.map((p) => {
              const otwarta = edycja?.id === p.id
              const branzaWybrana = otwarta ? edycja.industry : p.industry
              const gotowePytania = (branze.find((b) => b.id === branzaWybrana)?.pytania ?? []).join('\n')
              const podpowiedz = (branze.find((b) => b.id === branzaWybrana)?.przyklady ?? []).join('\n')

              return (
                <section key={p.id} className="rounded border">
                  <header className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.industry ? nazwaBranzy(p.industry) : t('voicebot.agents.noIndustry', 'Bez branży')}
                        {p.knowledgeText ? t('voicebot.agents.hasKnowledge', ' · zna stronę firmy') : ''}
                        {p.questions
                          ? ` · ${p.questions.split('\n').filter(Boolean).length} ${t('voicebot.agents.questionCount', 'pytań')}`
                          : ''}
                      </div>
                    </div>
                    {profile.length > 1 ? (
                      <Button variant="outline" onClick={() => otworz(p)}>
                        {otwarta ? t('voicebot.agents.close', 'Zwiń') : t('voicebot.agents.configure', 'Konfiguruj')}
                      </Button>
                    ) : null}
                  </header>

                  {otwarta ? (
                    <div className="grid gap-4 border-t p-4">
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium">
                          {t('voicebot.agents.field.questions', 'O co bot ma zapytać? Jedno pytanie w każdym wierszu.')}
                        </span>
                        <textarea
                          className="min-h-40 rounded border px-2 py-1"
                          value={edycja.questions}
                          onChange={(e) => setEdycja((x) => x && { ...x, questions: e.target.value })}
                          placeholder={podpowiedz}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t('voicebot.agents.field.questionsHint', 'Każde pytanie to jedna kolumna w wynikach rozmów.')}
                        </span>
                        {gotowePytania ? (
                          <button
                            type="button"
                            className="self-start text-xs underline text-muted-foreground"
                            onClick={() => setEdycja((x) => x && { ...x, questions: gotowePytania })}
                          >
                            {edycja.questions.trim()
                              ? t('voicebot.agents.field.questionsReplace', 'Zastąp gotowym zestawem dla tej branży')
                              : t('voicebot.agents.field.questionsFill', 'Wstaw gotowy zestaw pytań dla tej branży')}
                          </button>
                        ) : null}
                      </label>

                      <label className="flex flex-col gap-1 text-sm">
                        <span>{t('voicebot.agents.field.industry', 'Czym zajmuje się firma')}</span>
                        <select
                          className="rounded border px-2 py-1"
                          value={edycja.industry}
                          onChange={(e) => setEdycja((x) => x && { ...x, industry: e.target.value })}
                        >
                          {branze.map((b) => <option key={b.id} value={b.id}>{b.nazwa}</option>)}
                        </select>
                        <span className="text-xs text-muted-foreground">
                          {t('voicebot.agents.field.industryHint', 'Decyduje, jakimi słowami bot się posługuje.')}
                        </span>
                      </label>

                      <label className="flex flex-col gap-1 text-sm">
                        <span>{t('voicebot.agents.field.knowledge', 'Adres strony firmy')}</span>
                        <input
                          className="rounded border px-2 py-1"
                          value={edycja.knowledgeUrl}
                          onChange={(e) => setEdycja((x) => x && { ...x, knowledgeUrl: e.target.value })}
                          placeholder="https://twojafirma.pl"
                        />
                        <span className="text-xs text-muted-foreground">
                          {t('voicebot.agents.field.knowledgeHint', 'Przeczytamy ją i bot będzie wiedział, czym firma się zajmuje.')}
                        </span>
                      </label>

                      {edycja.knowledgeUrl ? (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={edycja.odswiez}
                            onChange={(e) => setEdycja((x) => x && { ...x, odswiez: e.target.checked })}
                          />
                          <span>{t('voicebot.agents.field.refresh', 'Przeczytaj stronę jeszcze raz')}</span>
                        </label>
                      ) : null}

                      {p.knowledgeText ? (
                        <details>
                          <summary className="cursor-pointer text-xs text-muted-foreground">
                            {t('voicebot.agents.knowledgeShow', 'Co bot wie o firmie')}
                            {p.knowledgeReadAt ? ` (${new Date(p.knowledgeReadAt).toLocaleString('pl-PL')})` : ''}
                          </summary>
                          <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-2 text-xs">{p.knowledgeText}</pre>
                        </details>
                      ) : null}

                      {operator ? (
                        <details className="rounded border border-dashed p-3">
                          <summary className="cursor-pointer text-sm">
                            {t('voicebot.agents.operator', 'Ustawienia operatora')}
                          </summary>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-1 text-sm">
                              <span>{t('voicebot.agents.field.llm', 'Model rozmowy')}</span>
                              <select
                                className="rounded border px-2 py-1"
                                value={edycja.llm}
                                onChange={(e) => setEdycja((x) => x && { ...x, llm: e.target.value })}
                              >
                                <option value="">{t('voicebot.agents.field.llmKeep', 'Bez zmiany')}</option>
                                {modele.map((m) => <option key={m.id} value={m.id}>{m.nazwa}</option>)}
                              </select>
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                              <span>{t('voicebot.agents.field.cisza', 'Cisza kończąca wypowiedź, w sekundach')}</span>
                              <input
                                className="rounded border px-2 py-1"
                                type="number" min={0.5} max={10} step={0.5}
                                value={edycja.cisza}
                                onChange={(e) => setEdycja((x) => x && { ...x, cisza: e.target.value })}
                                placeholder="1.5"
                              />
                            </label>
                            <p className="text-xs text-muted-foreground sm:col-span-2">
                              {t('voicebot.agents.field.llmHint', 'Cięższy model dokłada sekundy ciszy, w których rozmówca myśli, że połączenie padło.')}
                              {' '}
                              <span className="font-mono">{p.agentId}</span>
                            </p>
                          </div>
                        </details>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-3">
                        <Button onClick={() => void zapisz(p)} disabled={zapis}>
                          {zapis
                            ? t('voicebot.agents.saving', 'Zapisuję...')
                            : t('voicebot.agents.save', 'Zapisz i przekaż botowi')}
                        </Button>
                        <a className="text-sm underline" href="/backend/voicebot">
                          {t('voicebot.agents.toCampaigns', 'Zadzwoń do mnie na próbę')}
                        </a>
                        <button
                          type="button"
                          className="ml-auto text-sm text-destructive underline"
                          onClick={() => void usunBota(p)}
                          disabled={kasowany === p.id || zapis}
                        >
                          {kasowany === p.id
                            ? t('voicebot.agents.deleting', 'Usuwam...')
                            : t('voicebot.agents.delete', 'Usuń bota')}
                        </button>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {t(
                          'voicebot.agents.hint',
                          'Bot zawsze przedstawia się jako automat i pyta o zgodę na rozmowę. Tego nie da się wyłączyć, bo od tego zależy zgodność rozmowy z prawem.',
                        )}
                      </p>
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>
        )}
      </PageBody>
    </Page>
  )
}
