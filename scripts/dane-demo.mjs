/**
 * Zestaw danych demo dla modułu voicebot.
 *
 * Regulamin ścieżki 03 zabrania pokazywania prawdziwych danych firmy, więc
 * wszystkie nazwiska i numery są zmyślone. Numery mieszczą się w zakresie
 * 48 500 000 000 i dalej, czyli w puli komórkowej, ale żaden nie jest niczyj:
 * dobrane są tak, żeby nie trafić w realny numer z kampanii.
 *
 * Skrypt jest idempotentny: przed wstawieniem kasuje własne wiersze,
 * rozpoznając je po przedrostku DEMO- w polu lead_ref. Dzięki temu można go
 * puścić kilka razy przed demem i za każdym razem dostać ten sam obraz.
 *
 * Uruchomienie:
 *   node scripts/dane-demo.mjs
 */
import 'dotenv/config'
import pg from 'pg'

const { Client } = pg

const PRZEDROSTEK = 'DEMO-'
const KAMPANIA = 'Leady z formularza, wrzesień (demo)'

/**
 * Numery prawdziwych osób, które nie mogą zostać na liście demo.
 *
 * Trafiły tam z ręcznych testów prowadzonych z telefonem w dłoni. Skrypt
 * kasuje je przy każdym uruchomieniu, żeby jedno przeoczenie nie skończyło
 * się pokazaniem czyjegoś numeru na ekranie przed salą.
 */
const NUMERY_PRYWATNE = ['+48503956401', '+48570372252']

/**
 * Dzień, w którym rozmowa się odbyła, liczony wstecz od teraz.
 * Rozrzut po kilku dniach sprawia, że lista wygląda jak praca, a nie
 * jak jeden wsad zrobiony minutę przed prezentacją.
 */
function kiedy(godzinWstecz) {
  return new Date(Date.now() - godzinWstecz * 3600 * 1000)
}

const LEADY = [
  {
    ref: 'L-1001', imie: 'Anna', nazwisko: 'Kowalczyk', tel: '+48571000101',
    status: 'completed', kierunek: 'outbound', czas: 96, kosztUsd: '0.128400', kredyty: 710,
    tozsamosc: true, zgoda: true, produkt: 'WIBOR', bank: 'PKO BP', rok: '2019',
    kwota: '340000', waluta: 'PLN', kontakt: true, termin: 'jutro po 16',
    podsumowanie: 'Potwierdziła tożsamość i zgodę. Hipoteka w złotych z 2019 roku, PKO BP. Prosi o kontakt doradcy.',
    godzin: 52,
  },
  {
    ref: 'L-1002', imie: 'Marek', nazwisko: 'Zieliński', tel: '+48571000102',
    status: 'no_answer', kierunek: 'outbound', czas: null, kosztUsd: '0.004100', kredyty: 22,
    powod: 'Nie odebrał', godzin: 50,
  },
  {
    // Oddzwonienie do nieodebranej próby powyżej. To jest scena, którą
    // pokazujemy na demo: bot dzwonił, nie odebrał, klient oddzwonił.
    ref: 'L-1002', imie: 'Marek', nazwisko: 'Zieliński', tel: '+48571000102',
    status: 'completed', kierunek: 'inbound', oddzwonienieDo: 1, czas: 134,
    kosztUsd: '0.179200', kredyty: 992,
    tozsamosc: true, zgoda: true, produkt: 'SKD', bank: 'Santander', rok: '2021',
    kwota: '58000', waluta: 'PLN', kontakt: true, termin: 'w piątek rano',
    podsumowanie: 'Oddzwonił po nieodebranym połączeniu. Pożyczka gotówkowa z 2021 roku, Santander. Chce rozmawiać z doradcą.',
    godzin: 49,
  },
  {
    ref: 'L-1003', imie: 'Katarzyna', nazwisko: 'Wójcik', tel: '+48571000103',
    status: 'completed', kierunek: 'outbound', czas: 71, kosztUsd: '0.094800', kredyty: 524,
    tozsamosc: true, zgoda: true, produkt: 'VAL', bank: 'Millennium', rok: '2008',
    kwota: '210000', waluta: 'CHF', kontakt: true, termin: 'dowolnie po 18',
    podsumowanie: 'Kredyt walutowy z 2008 roku, Millennium, waluta CHF. Zainteresowana analizą umowy.',
    godzin: 47,
  },
  {
    ref: 'L-1004', imie: 'Tomasz', nazwisko: 'Lewandowski', tel: '+48571000104',
    status: 'completed', kierunek: 'outbound', czas: 38, kosztUsd: '0.050700', kredyty: 280,
    tozsamosc: true, zgoda: false, produkt: 'NIEUSTALONY',
    aktualny: false, kontakt: false,
    podsumowanie: 'Nie wyraził zgody na rozmowę. Poprosił o nieodzywanie się ponownie.',
    godzin: 45,
  },
  {
    ref: 'L-1005', imie: 'Magdalena', nazwisko: 'Dąbrowska', tel: '+48571000105',
    status: 'completed', kierunek: 'outbound', czas: 112, kosztUsd: '0.149600', kredyty: 828,
    tozsamosc: true, zgoda: true, produkt: 'WIBOR', bank: 'mBank', rok: '2020',
    kwota: '480000', waluta: 'PLN', kontakt: true, termin: 'poniedziałek przed 12',
    podsumowanie: 'Hipoteka w złotych z 2020 roku, mBank. Pyta o koszt analizy i termin.',
    godzin: 30,
  },
  {
    ref: 'L-1006', imie: 'Piotr', nazwisko: 'Nowak', tel: '+48571000106',
    status: 'busy', kierunek: 'outbound', czas: null, kosztUsd: '0.003600', kredyty: 19,
    powod: 'Zajęte', godzin: 28,
  },
  {
    ref: 'L-1007', imie: 'Agnieszka', nazwisko: 'Mazur', tel: '+48571000107',
    status: 'completed', kierunek: 'outbound', czas: 64, kosztUsd: '0.085300', kredyty: 472,
    tozsamosc: true, zgoda: true, produkt: 'SKD', bank: 'Alior', rok: '2022',
    kwota: '32000', waluta: 'PLN', kontakt: false,
    podsumowanie: 'Pożyczka gotówkowa z 2022 roku, Alior. Chce najpierw materiały na mailu.',
    godzin: 26,
  },
  {
    ref: 'L-1008', imie: 'Robert', nazwisko: 'Jankowski', tel: '+48571000108',
    status: 'failed', kierunek: 'outbound', czas: null, kosztUsd: null, kredyty: null,
    powod: 'Numer nieosiągalny', godzin: 24,
  },
  {
    ref: 'L-1009', imie: 'Ewa', nazwisko: 'Szymańska', tel: '+48571000109',
    status: 'completed', kierunek: 'outbound', czas: 88, kosztUsd: '0.117400', kredyty: 649,
    tozsamosc: true, zgoda: true, produkt: 'WIBOR', bank: 'ING', rok: '2018',
    kwota: '295000', waluta: 'PLN', kontakt: true, termin: 'jutro rano',
    podsumowanie: 'Hipoteka z 2018 roku, ING. Prosi o telefon od doradcy jutro rano.',
    godzin: 20,
  },
  {
    ref: 'L-1010', imie: 'Paweł', nazwisko: 'Wróbel', tel: '+48571000110',
    status: 'no_answer', kierunek: 'outbound', czas: null, kosztUsd: '0.004000', kredyty: 21,
    powod: 'Nie odebrał', godzin: 18,
  },
  {
    // Drugi przypadek oddzwonienia, tym razem bez wcześniejszych danych
    // w rozmowie: pokazuje, że historia rośnie, a nic się nie nadpisuje.
    ref: 'L-1010', imie: 'Paweł', nazwisko: 'Wróbel', tel: '+48571000110',
    status: 'completed', kierunek: 'inbound', oddzwonienieDo: 10, czas: 57,
    kosztUsd: '0.076100', kredyty: 421,
    tozsamosc: true, zgoda: true, produkt: 'NIEUSTALONY', kontakt: true, termin: 'wieczorem',
    podsumowanie: 'Oddzwonił, ale nie pamiętał szczegółów umowy. Prosi o kontakt doradcy wieczorem.',
    godzin: 17,
  },
  {
    // Ktoś zupełnie nowy, spoza kampanii. Pokazuje, że rozmowa przychodząca
    // od nieznanego numeru też zostaje zapisana, tylko bez kampanii.
    ref: null, imie: null, nazwisko: null, tel: '+48571000199',
    status: 'completed', kierunek: 'inbound', bezKampanii: true, czas: 49,
    kosztUsd: '0.065400', kredyty: 362,
    tozsamosc: false, zgoda: true, produkt: 'SKD', kontakt: true, termin: 'dzisiaj po 17',
    podsumowanie: 'Nowy dzwoniący z reklamy, nie był wcześniej w bazie. Pyta o sankcję kredytu darmowego.',
    godzin: 6,
  },
]

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  try {
    const zakres = await client.query(
      `select tenant_id, organization_id from voicebot_campaigns
       where deleted_at is null order by created_at limit 1`,
    )
    if (zakres.rowCount === 0) {
      throw new Error('Brak jakiejkolwiek kampanii. Najpierw zaloz jedna w panelu, zeby znany byl tenant.')
    }
    const { tenant_id: tenantId, organization_id: orgId } = zakres.rows[0]

    await client.query('begin')

    // Własne wiersze z poprzedniego uruchomienia oraz rozmowy testowe
    // z prac nad webhookiem. Te drugie mają sztuczne identyfikatory rozmowy
    // i na demo tylko zaśmiecałyby obraz.
    await client.query(
      `delete from voicebot_calls
       where lead_ref like $1
          or phone like '+4857100%'
          or conversation_id like 'conv_test_%'
          or conversation_id like 'conv_podpis_%'
          or conversation_id like 'sim_%'`,
      [`${PRZEDROSTEK}%`],
    )

    // Numery, które należą do prawdziwych osób, a nie do danych demo.
    // Zostały po ręcznych testach z telefonem w dłoni. Na scenie i na
    // nagraniu byłyby widoczne jako czyjś prawdziwy numer, a regulamin
    // ścieżki 03 zabrania pokazywania prawdziwych danych.
    const prywatne = await client.query(
      `delete from voicebot_calls
       where phone = any($1::text[])
       returning phone`,
      [NUMERY_PRYWATNE],
    )
    if (prywatne.rowCount > 0) {
      console.log(`Usunieto ${prywatne.rowCount} rozmow z prawdziwymi numerami prywatnymi.`)
    }
    await client.query(`delete from voicebot_campaigns where name = $1`, [KAMPANIA])

    const kampania = await client.query(
      `insert into voicebot_campaigns
         (name, description, agent_id, phone_number_id, status, min_interval_secs,
          tenant_id, organization_id, created_at, updated_at)
       values ($1, $2, $3, $4, 'running', 180, $5, $6, now(), now())
       returning id`,
      [
        KAMPANIA,
        'Zestaw pokazowy. Dane zmyslone na potrzeby demo.',
        'agent_6701kympd8htf14rz0d4gf71nmpc',
        'phnum_6901m0amey85ex397p35hac3mh77',
        tenantId,
        orgId,
      ],
    )
    const kampaniaId = kampania.rows[0].id

    const wstawione = []

    for (const l of LEADY) {
      const kiedyRozmowa = kiedy(l.godzin)
      const koniec = l.czas ? new Date(kiedyRozmowa.getTime() + l.czas * 1000) : kiedyRozmowa
      const powiazane = l.oddzwonienieDo != null ? wstawione[l.oddzwonienieDo] : null

      const r = await client.query(
        `insert into voicebot_calls
           (campaign_id, lead_ref, phone, first_name, last_name, status, direction,
            related_call_id, conversation_id, started_at, finished_at, duration_secs,
            failure_reason, cost_usd, cost_credits,
            identity_confirmed, consent_given, product_code, amount, currency,
            contract_year, bank, lead_active, requests_contact, preferred_contact_time,
            summary, tenant_id, organization_id, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
                 $21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
         returning id`,
        [
          l.bezKampanii ? null : kampaniaId,
          l.ref ? `${PRZEDROSTEK}${l.ref}` : null,
          l.tel,
          l.imie,
          l.nazwisko,
          l.status,
          l.kierunek,
          powiazane,
          `conv_demo_${l.tel.slice(-4)}_${l.godzin}`,
          kiedyRozmowa,
          l.status === 'pending' ? null : koniec,
          l.czas ?? null,
          l.powod ?? null,
          l.kosztUsd ?? null,
          l.kredyty ?? null,
          l.tozsamosc ?? null,
          l.zgoda ?? null,
          l.produkt ?? null,
          l.kwota ?? null,
          l.waluta ?? null,
          l.rok ?? null,
          l.bank ?? null,
          l.aktualny ?? null,
          l.kontakt ?? null,
          l.termin ?? null,
          l.podsumowanie ?? null,
          tenantId,
          orgId,
          kiedyRozmowa,
          kiedyRozmowa,
        ],
      )
      wstawione.push(r.rows[0].id)
    }

    await client.query('commit')

    const podsumowanie = await client.query(
      `select direction, status, count(*)::int as ile,
              coalesce(sum(cost_usd), 0)::text as koszt
       from voicebot_calls
       where tenant_id = $1 and deleted_at is null
       group by direction, status order by direction, status`,
      [tenantId],
    )
    console.log(`Kampania demo: ${KAMPANIA}`)
    console.table(podsumowanie.rows)
    console.log(`Wstawiono ${wstawione.length} polaczen.`)
  } catch (e) {
    await client.query('rollback').catch(() => {})
    throw e
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('Blad:', e.message)
  process.exit(1)
})
