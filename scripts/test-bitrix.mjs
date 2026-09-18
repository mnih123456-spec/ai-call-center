/**
 * Sprawdzenie połączenia z Bitrix24 przed podpięciem złącza.
 *
 * Skrypt jest celowo samodzielny i nie importuje modułu voicebota: ma
 * odpowiedzieć na jedno pytanie, czy adres webhooka i nazwy metod działają
 * na TYM koncie Bitriksa. Nazwy metod różnią się między wersjami i planami,
 * więc lepiej sprawdzić je osobno niż szukać przyczyny w środku aplikacji.
 *
 * Nic nie tworzy, chyba że podasz --utworz.
 *
 * Uruchomienie:
 *   node scripts/test-bitrix.mjs "https://firma.bitrix24.pl/rest/1/token" +48571000101
 *   node scripts/test-bitrix.mjs "<adres>" +48571000101 --utworz
 */

const [, , adresSurowy, numer, ...reszta] = process.argv
const utworz = reszta.includes('--utworz')

if (!adresSurowy) {
  console.error('Podaj adres webhooka Bitriksa jako pierwszy argument.')
  console.error('Przyklad: node scripts/test-bitrix.mjs "https://firma.bitrix24.pl/rest/1/token" +48571000101')
  process.exit(1)
}

const bazowy = adresSurowy.replace(/\/+$/, '')

async function wywolaj(metoda, parametry = {}) {
  const res = await fetch(`${bazowy}/${metoda}.json`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parametry),
    signal: AbortSignal.timeout(20000),
  })
  const tresc = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`status ${res.status}: ${JSON.stringify(tresc)?.slice(0, 200)}`)
  if (tresc?.error) throw new Error(`${tresc.error}: ${tresc.error_description ?? ''}`)
  return tresc?.result
}

async function krok(opis, fn) {
  process.stdout.write(`${opis} ... `)
  try {
    const wynik = await fn()
    console.log('OK')
    return { ok: true, wynik }
  } catch (e) {
    console.log('BLAD: ' + (e instanceof Error ? e.message : String(e)))
    return { ok: false }
  }
}

const wyniki = []

const profil = await krok('1. Adres i uprawnienia (profile)      ', () => wywolaj('profile'))
wyniki.push(profil.ok)
if (profil.ok) {
  const p = profil.wynik ?? {}
  console.log(`   zalogowany jako: ${[p.NAME, p.LAST_NAME].filter(Boolean).join(' ') || '(brak nazwiska)'}`)
}

if (numer) {
  const warianty = Array.from(new Set([numer, numer.replace(/^\+/, '')]))
  for (const typ of ['CONTACT', 'LEAD']) {
    const szukanie = await krok(`2. Szukanie po numerze (${typ.padEnd(7)})    `, async () => {
      for (const n of warianty) {
        const w = await wywolaj('crm.duplicate.findbycomm', { entity_type: typ, type: 'PHONE', values: [n] })
        if (Array.isArray(w?.[typ]) && w[typ].length) return { numer: n, id: w[typ][0] }
      }
      return null
    })
    wyniki.push(szukanie.ok)
    if (szukanie.ok) {
      console.log(szukanie.wynik ? `   znaleziono ${typ} o id ${szukanie.wynik.id}` : '   nie znaleziono, czyli numer nowy')
    }
  }
}

if (utworz) {
  const dodanie = await krok('3. Zakladanie leada (crm.lead.add)    ', () =>
    wywolaj('crm.lead.add', {
      fields: {
        TITLE: 'TEST zlacza voicebota, mozna skasowac',
        NAME: 'Test',
        LAST_NAME: 'Voicebot',
        PHONE: [{ VALUE: numer ?? '+48571000199', VALUE_TYPE: 'WORK' }],
        COMMENTS: 'Wpis testowy zalozony przez skrypt sprawdzajacy zlacze. Mozna skasowac.',
        OPENED: 'Y',
      },
    }),
  )
  wyniki.push(dodanie.ok)
  if (dodanie.ok) {
    const id = dodanie.wynik
    console.log(`   zalozony lead o id ${id}`)

    const komentarz = await krok('4. Komentarz na osi czasu             ', () =>
      wywolaj('crm.timeline.comment.add', {
        fields: { ENTITY_ID: Number(id), ENTITY_TYPE: 'lead', COMMENT: 'Notatka testowa ze zlacza voicebota.' },
      }),
    )
    wyniki.push(komentarz.ok)
    console.log(`\n   PAMIETAJ o skasowaniu leada ${id} w Bitriksie.`)
  }
} else {
  console.log('\n(pomijam zakladanie leada, dodaj --utworz zeby sprawdzic takze zapis)')
}

console.log(wyniki.every(Boolean) ? '\nWSZYSTKO DZIALA' : '\nSA BLEDY, patrz wyzej')
