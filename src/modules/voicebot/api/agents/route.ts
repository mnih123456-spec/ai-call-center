import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { VoiceAgentProfile } from '../../data/entities'
import { agentProfileSchema } from '../../data/validators'
import { fetchProviderCatalog } from '../../lib/provider'
import { wyslijScenariuszDoAgenta } from '../../lib/scenariusz'
import { BRANZA_WLASNA, BRANZE, opisOdpowiedzi, powitanieBranzy, scenariuszBranzy, slowaKluczoweBranzy, wiedzaBranzowa, znanaBranza } from '../../lib/branze'
import { MODELE, pobierzUstawienia, sprawdzUstawienia, wyslijPolaDoAgenta, zapiszUstawienia } from '../../lib/ustawienia-agenta'
import { dataCollectionDlaDostawcy, polaZPytan } from '../../lib/pola-z-pytan'
import { pobierzWiedze } from '../../lib/wiedza'
import { nazwaWDopelniaczu } from '../../lib/odmiana'

const logger = createLogger('voicebot')

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['voicebot.campaigns.view'] },
  POST: { requireAuth: true, requireFeatures: ['voicebot.campaigns.manage'] },
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request)
  // Lista branz nie zalezy od firmy: to nasz katalog, taki sam dla wszystkich.
  // Zwracamy ja nawet wtedy, gdy nie rozpoznajemy zakresu, bo inaczej ekran
  // zakladania klienta pokazuje puste pole wyboru i nie da sie przejsc dalej.
  const katalogBranz = BRANZE.map((b) => ({ id: b.id, nazwa: b.nazwa, przyklady: b.przyklady ?? [], pytania: b.pytania ?? [] }))
  if (!auth?.orgId) return json({ profile: [], agenci: [], branze: katalogBranz, modele: MODELE })

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')

  const [profile, katalog] = await Promise.all([
    em.find(
      VoiceAgentProfile,
      { tenantId: auth.tenantId, organizationId: auth.orgId, deletedAt: null },
      { orderBy: { createdAt: 'asc' } },
    ),
    fetchProviderCatalog(),
  ])

  // Ustawienia rozmowy zyja u dostawcy, nie u nas, wiec czytamy je przy
  // kazdym wejsciu na ekran. Inaczej panel pokazywalby stan sprzed zmiany
  // zrobionej gdzie indziej.
  const ustawienia = new Map<string, Awaited<ReturnType<typeof pobierzUstawienia>>>()
  await Promise.all(profile.map(async (p) => { ustawienia.set(p.agentId, await pobierzUstawienia(p.agentId)) }))

  return json({
    modele: MODELE,
    profile: profile.map((p) => ({
      id: p.id,
      agentId: p.agentId,
      name: p.name,
      direction: p.direction,
      questions: p.questions ?? '',
      industry: p.industry ?? '',
      industryKnowledge: p.industryKnowledge ?? '',
      knowledgeUrl: p.knowledgeUrl ?? '',
      knowledgeText: p.knowledgeText ?? '',
      knowledgeReadAt: p.knowledgeReadAt?.toISOString() ?? null,
      syncedAt: p.syncedAt?.toISOString() ?? null,
      syncResult: p.syncResult ?? null,
      llm: ustawienia.get(p.agentId)?.llm ?? null,
      cisza: ustawienia.get(p.agentId)?.cisza ?? null,
    })),
    // Lista agentów u dostawcy, żeby przypisanie szło z wyboru, a nie
    // z przepisywania identyfikatora. Ta sama zasada co przy numerach.
    agenci: katalog.agents,
    branze: katalogBranz,
    katalogDziala: katalog.configured,
  })
}

/**
 * Zapis profilu agenta firmy.
 *
 * Klient podaje pytania do scenariusza rozmowy i adres swojej strony,
 * a nie prompt. Prompt jest nasz i to on odpowiada za to, że bot przedstawia
 * się, pyta o zgodę i nie zmyśla. Gdyby klient mógł go nadpisać, pierwsza
 * firma, która skasuje zdanie o zgodzie, zrobi z tego problem prawny nasz,
 * a nie swój.
 */
export async function POST(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.orgId) return json({ error: 'Brak kontekstu organizacji' }, 403)

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json({ error: 'Treść żądania nie jest poprawnym JSON-em' }, 400)
  }

  const parsed = agentProfileSchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Nieprawidłowe dane agenta', details: parsed.error.flatten() }, 400)
  }

  const { resolve } = await createRequestContainer()
  const em = resolve<EntityManager>('em')
  const teraz = new Date()

  let profil = parsed.data.id
    ? await em.findOne(VoiceAgentProfile, {
        id: parsed.data.id,
        tenantId: auth.tenantId,
        organizationId: auth.orgId,
        deletedAt: null,
      })
    : await em.findOne(VoiceAgentProfile, {
        agentId: parsed.data.agentId,
        tenantId: auth.tenantId,
        organizationId: auth.orgId,
        deletedAt: null,
      })

  // Nieznana branza znaczy brak slownika, a nie blad zapisu: liste branz
  // rozwijamy, a stary wybor nie moze blokowac edycji agenta.
  let branza = znanaBranza(parsed.data.industry) ? parsed.data.industry! : null
  // Opis wlasnej branzy zapisujemy tylko przy branzy wlasnej. Przy branzy
  // z listy stary opis nie moze zostac w bazie i wrocic po zmianie wyboru.
  const wiedzaWlasna = branza === BRANZA_WLASNA ? (parsed.data.industryKnowledge?.trim() || null) : null

  const poprzedniAdres = profil?.knowledgeUrl ?? null
  const nowyAdres = parsed.data.knowledgeUrl || null

  if (profil) {
    profil.agentId = parsed.data.agentId
    profil.name = parsed.data.name
    profil.direction = parsed.data.direction
    profil.questions = parsed.data.questions ?? null
    profil.industry = branza
    profil.industryKnowledge = wiedzaWlasna
    profil.knowledgeUrl = parsed.data.knowledgeUrl ?? null
    profil.updatedAt = teraz
  } else {
    profil = em.create(VoiceAgentProfile, {
      agentId: parsed.data.agentId,
      name: parsed.data.name,
      direction: parsed.data.direction,
      questions: parsed.data.questions ?? null,
      industry: branza,
      industryKnowledge: wiedzaWlasna,
      knowledgeUrl: parsed.data.knowledgeUrl ?? null,
      tenantId: auth.tenantId ?? null,
      organizationId: auth.orgId,
      createdAt: teraz,
      updatedAt: teraz,
    })
  }

  em.persist(profil)
  await em.flush()

  // Strone czytamy tylko wtedy, gdy adres sie zmienil, gdy klient poprosil
  // o odswiezenie albo gdy notatki jeszcze nie ma. Kazdy odczyt to zapytanie
  // do cudzego serwera i platne wywolanie modelu, a tresc strony firmy
  // zmienia sie rzadziej niz jej pytania do bota.
  const trzebaCzytac = Boolean(nowyAdres) && (
    parsed.data.odswiezWiedze === true
    || nowyAdres !== poprzedniAdres
    || !profil.knowledgeText
  )

  let bladWiedzy: string | null = null
  let rozpoznanaBranza: string | null = null
  if (!nowyAdres) {
    profil.knowledgeText = null
    profil.knowledgeReadAt = null
  } else if (trzebaCzytac) {
    const odczyt = await pobierzWiedze(nowyAdres)
    if (odczyt.ok) {
      profil.knowledgeText = odczyt.wiedza
      profil.knowledgeReadAt = new Date()
      // Rozpoznana branza uzupelnia wybor, ale go nie nadpisuje. Czlowiek,
      // ktory cos wybral, wie o swojej firmie wiecej niz model czytajacy
      // jej strone.
      if (!branza && odczyt.branza) {
        branza = odczyt.branza
        profil.industry = branza
        rozpoznanaBranza = odczyt.branza
      }
    } else {
      // Nieudany odczyt nie kasuje poprzedniej notatki: lepiej, zeby bot
      // wiedzial to, co wiedzial wczoraj, niz zeby nagle przestal wiedziec.
      bladWiedzy = odczyt.blad
    }
  }

  // Dopiero po zapisie u nas wysylamy scenariusz do dostawcy. Gdyby wysylka
  // szla pierwsza i sie udala, a zapis padl, klient mialby bota mowiacego
  // rzeczy, ktorych nie widzi w panelu.
  const nazwaD = await nazwaWDopelniaczu(profil.name)
  const wysylka = await wyslijScenariuszDoAgenta(
    profil.agentId,
    profil.questions,
    profil.knowledgeText,
    wiedzaBranzowa(profil.industry, profil.industryKnowledge),
    scenariuszBranzy(profil.industry, nazwaD) || null,
    powitanieBranzy(profil.industry, nazwaD) || null,
  )

  // Model i czas ciszy ida osobnym zadaniem, bo dotycza sposobu prowadzenia
  // rozmowy, a nie jej tresci. Blad tutaj nie moze przewrocic zapisu pytan.
  let bladUstawien: string | null = null
  if (parsed.data.llm !== undefined || parsed.data.cisza !== undefined) {
    const ocena = sprawdzUstawienia({ llm: parsed.data.llm ?? null, cisza: parsed.data.cisza ?? null })
    if (!ocena.ok) bladUstawien = ocena.blad
    else {
      const zapis = await zapiszUstawienia(profil.agentId, ocena.dane)
      if (!zapis.ok) bladUstawien = zapis.blad
    }
  }

  // Pytania klienta zamieniamy na pola, ktore bot ma zebrac. Bez tego kroku
  // bot zada pytanie, ale odpowiedz utonie w transkrypcji zamiast trafic do
  // tabeli wynikow jako kolumna.
  const pola = polaZPytan(profil.questions)
  const wysylkaPol = await wyslijPolaDoAgenta(
    profil.agentId,
    dataCollectionDlaDostawcy(pola, opisOdpowiedzi),
    slowaKluczoweBranzy(profil.industry),
  )

  const czesci: string[] = []
  czesci.push(wysylka.ok ? 'Pytania przekazane do agenta.' : wysylka.blad)
  if (!wysylkaPol.ok) czesci.push(`Pol do zebrania nie zapisano: ${wysylkaPol.blad}`)
  else if (pola.length > 0) czesci.push(`Bot zbierze ${pola.length} odpowiedzi.`)
  if (bladUstawien) czesci.push(`Ustawien rozmowy nie zapisano: ${bladUstawien}`)
  if (bladWiedzy) czesci.push(`Strony nie udalo sie przeczytac: ${bladWiedzy}`)
  else if (profil.knowledgeText) czesci.push(`Wiedza ze strony wczytana, ${profil.knowledgeText.length} znakow.`)
  if (rozpoznanaBranza) {
    const nazwa = BRANZE.find((b) => b.id === rozpoznanaBranza)?.nazwa ?? rozpoznanaBranza
    czesci.push(`Rozpoznana branza: ${nazwa}.`)
  }

  profil.syncedAt = new Date()
  profil.syncResult = czesci.join(' ')
  em.persist(profil)
  await em.flush()

  logger.info('agent profile saved', {
    id: profil.id,
    direction: profil.direction,
    wyslane: wysylka.ok,
    wiedza: Boolean(profil.knowledgeText),
  })

  return json({
    id: profil.id,
    agentId: profil.agentId,
    wyslane: wysylka.ok && !bladWiedzy && !bladUstawien,
    syncResult: profil.syncResult,
    knowledgeText: profil.knowledgeText ?? '',
  }, 201)
}
