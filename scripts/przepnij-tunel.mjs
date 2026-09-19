#!/usr/bin/env node
/**
 * Przepina wyniki rozmów na nowy tunel po restarcie laptopa.
 *
 * Tunel cloudflared po ponownym uruchomieniu dostaje nowy adres, a webhook
 * u dostawcy ma adres niezmienny, więc trzeba założyć nowy webhook, wpisać
 * jego sekret do .env i przepiąć każdego bota. To jest ta część, której nie
 * da się przeklikać w panelu. Skrypt robi wszystko naraz.
 *
 * Użycie:
 *   node scripts/przepnij-tunel.mjs https://nowy-adres.trycloudflare.com
 *
 * Po skrypcie: restart panelu (yarn dev), bo .env czyta się przy starcie.
 */
import fs from 'node:fs'
import path from 'node:path'

const API = 'https://api.elevenlabs.io/v1'
const ENV = path.resolve(process.cwd(), '.env')

const adres = (process.argv[2] ?? '').trim().replace(/\/+$/, '')
if (!/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(adres) && !/^https:\/\/[^/\s]+$/.test(adres)) {
  console.error('Podaj adres tunelu, np. node scripts/przepnij-tunel.mjs https://cos-tam.trycloudflare.com')
  process.exit(1)
}

const envTekst = fs.readFileSync(ENV, 'utf8')
const env = Object.fromEntries(
  envTekst.split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => {
    const i = l.indexOf('=')
    return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]
  }),
)
const klucz = env.ELEVENLABS_API_KEY
if (!klucz) {
  console.error('Brak ELEVENLABS_API_KEY w .env')
  process.exit(1)
}
const naglowki = { 'xi-api-key': klucz, 'content-type': 'application/json' }
const webhookUrl = `${adres}/api/voicebot/webhook`

// 1. Sprawdzenie, że tunel prowadzi do panelu.
try {
  const r = await fetch(`${adres}/api/healthz`, { signal: AbortSignal.timeout(15000) })
  if (!r.ok) throw new Error(`status ${r.status}`)
  console.log('Tunel odpowiada:', adres)
} catch (e) {
  console.error('Tunel nie odpowiada pod', adres, '-', e.message, '\nUruchom panel i tunel, potem spróbuj jeszcze raz.')
  process.exit(1)
}

// 2. Nowy webhook. Kształt wymagany przez dostawcę: settings.{name, webhook_url, auth_type}.
const nazwa = `AI call center - tunel ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
const zal = await fetch(`${API}/workspace/webhooks`, {
  method: 'POST',
  headers: naglowki,
  body: JSON.stringify({ settings: { name: nazwa, webhook_url: webhookUrl, auth_type: 'hmac' } }),
})
if (!zal.ok) {
  console.error('Dostawca odrzucił założenie webhooka:', zal.status, (await zal.text()).slice(0, 300))
  process.exit(1)
}
const nowy = await zal.json()
const webhookId = nowy.webhook_id ?? nowy.id
const szukajSekretu = (obiekt) => {
  for (const [k, v] of Object.entries(obiekt ?? {})) {
    if (typeof v === 'string' && /secret/i.test(k) && v.length >= 16) return v
    if (v && typeof v === 'object') {
      const glebiej = szukajSekretu(v)
      if (glebiej) return glebiej
    }
  }
  return null
}
const sekret = szukajSekretu(nowy)
if (!webhookId) {
  console.error('Dostawca nie zwrócił identyfikatora webhooka. Odpowiedź:', JSON.stringify(nowy).slice(0, 800))
  process.exit(1)
}
console.log('Nowy webhook:', webhookId)
if (!sekret) {
  // Sekret pokazuje sie tylko raz, wiec wypisujemy cala odpowiedz: lepiej
  // przepisac go recznie do .env, niz zalozyc kolejny webhook.
  console.error('Nie znalazłem sekretu w odpowiedzi. Cała odpowiedź dostawcy, przepisz sekret ręcznie do VOICEBOT_WEBHOOK_SECRET:')
  console.error(JSON.stringify(nowy, null, 2))
}

// 3. .env: identyfikator i sekret. Sekret pokazuje się tylko raz, więc zapis od razu.
let nowyEnv = envTekst
const ustaw = (nazwaZm, wartosc) => {
  const re = new RegExp(`^${nazwaZm}=.*$`, 'm')
  nowyEnv = re.test(nowyEnv) ? nowyEnv.replace(re, `${nazwaZm}=${wartosc}`) : `${nowyEnv.trimEnd()}\n${nazwaZm}=${wartosc}\n`
}
ustaw('VOICEBOT_WEBHOOK_ID', webhookId)
if (sekret) ustaw('VOICEBOT_WEBHOOK_SECRET', sekret)
fs.writeFileSync(ENV, nowyEnv, 'utf8')
console.log(sekret ? '.env zapisany: VOICEBOT_WEBHOOK_ID, VOICEBOT_WEBHOOK_SECRET' : '.env zapisany: tylko VOICEBOT_WEBHOOK_ID, sekret wpisz ręcznie')

// 4. Przepięcie botów. Wszystkie w koncie, poza szablonem, żeby wynik rozmowy
//    każdego bota wracał na nowy adres.
const lista = await (await fetch(`${API}/convai/agents?page_size=100`, { headers: naglowki })).json()
let ok = 0
for (const ag of lista.agents ?? []) {
  if (ag.agent_id === env.VOICEBOT_AGENT_SZABLON) continue
  const r = await fetch(`${API}/convai/agents/${ag.agent_id}`, {
    method: 'PATCH',
    headers: naglowki,
    body: JSON.stringify({
      platform_settings: {
        workspace_overrides: {
          webhooks: { post_call_webhook_id: webhookId, events: ['transcript'], transcript_format: 'json', send_audio: false },
        },
      },
    }),
  })
  if (r.ok) ok++
  else console.error('Nie przepięto', ag.name, r.status)
}
console.log(`Przepięte boty: ${ok}`)
console.log('\nTeraz restart panelu: zabij proces na porcie 3000 i uruchom yarn dev.')
