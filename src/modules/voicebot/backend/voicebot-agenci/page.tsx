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
  knowledgeUrl: string
  syncedAt: string | null
  syncResult: string | null
}

type AgentDostawcy = { agentId: string; name: string }

const PUSTY_FORMULARZ = {
  id: '' as string,
  agentId: '',
  name: '',
  direction: 'outbound',
  questions: '',
  knowledgeUrl: '',
}

export default function VoicebotAgenciPage() {
  const t = useT()
  const [profile, setProfile] = React.useState<Profil[]>([])
  const [agenci, setAgenci] = React.useState<AgentDostawcy[]>([])
  const [katalogDziala, setKatalogDziala] = React.useState(true)
  const [formularz, setFormularz] = React.useState(PUSTY_FORMULARZ)
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
        katalogDziala?: boolean
      }
      setProfile(Array.isArray(body.profile) ? body.profile : [])
      setAgenci(Array.isArray(body.agenci) ? body.agenci : [])
      setKatalogDziala(body.katalogDziala !== false)
    } catch {
      setBlad(t('voicebot.agents.loadError', 'Nie udało się pobrać agentów.'))
    } finally {
      setLadowanie(false)
    }
  }, [t])

  React.useEffect(() => { void wczytaj() }, [wczytaj])

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
          knowledgeUrl: formularz.knowledgeUrl,
        }),
      })
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) {
        setBlad(body?.error ?? t('voicebot.agents.saveError', 'Nie udało się zapisać.'))
        return
      }
      setFormularz({ ...PUSTY_FORMULARZ })
      setKomunikat(t('voicebot.agents.saved', 'Zapisano.'))
      await wczytaj()
    } catch {
      setBlad(t('voicebot.agents.saveError', 'Nie udało się zapisać.'))
    } finally {
      setZapis(false)
    }
  }, [formularz, wczytaj, t])

  const edytuj = React.useCallback((p: Profil) => {
    setFormularz({
      id: p.id,
      agentId: p.agentId,
      name: p.name,
      direction: p.direction,
      questions: p.questions,
      knowledgeUrl: p.knowledgeUrl,
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

            <div className="grid gap-3 rounded border p-4">
              <div className="text-sm font-medium">
                {formularz.id
                  ? t('voicebot.agents.formEdit', 'Edycja agenta')
                  : t('voicebot.agents.formNew', 'Nowy agent')}
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

              <label className="flex flex-col gap-1 text-sm">
                <span>{t('voicebot.agents.field.questions', 'Pytania, które bot ma zadać, po jednym w wierszu')}</span>
                <textarea
                  className="min-h-32 rounded border px-2 py-1"
                  value={formularz.questions}
                  onChange={(e) => setFormularz((f) => ({ ...f, questions: e.target.value }))}
                  placeholder={t(
                    'voicebot.agents.field.questionsPlaceholder',
                    'Czy umowa jest nadal aktywna?\nW którym banku?\nZ którego roku?',
                  )}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span>{t('voicebot.agents.field.knowledge', 'Adres strony firmy, z której bot ma czerpać wiedzę')}</span>
                <input
                  className="rounded border px-2 py-1"
                  value={formularz.knowledgeUrl}
                  onChange={(e) => setFormularz((f) => ({ ...f, knowledgeUrl: e.target.value }))}
                  placeholder="https://twojafirma.pl"
                />
              </label>

              <p className="text-xs text-muted-foreground">
                {t(
                  'voicebot.agents.hint',
                  'Nie podajesz treści całej rozmowy. Powitanie, potwierdzenie tożsamości i pytanie o zgodę są stałe i tego nie zmieniamy, bo od tego zależy zgodność rozmowy z prawem.',
                )}
              </p>

              <div className="flex items-center gap-3">
                <Button onClick={() => void zapisz()} disabled={zapis || !formularz.agentId || !formularz.name.trim()}>
                  {zapis ? t('voicebot.agents.saving', 'Zapisuję...') : t('voicebot.agents.save', 'Zapisz')}
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
          </div>
        )}
      </PageBody>
    </Page>
  )
}

