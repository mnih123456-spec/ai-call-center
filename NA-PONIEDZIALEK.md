# Na poniedziałek, po hackatonie

Lista rzeczy, które świadomie odkładamy, żeby nie zabierały czasu w weekend.

## 1. skills.sh, katalog umiejętności dla agentów

`https://skills.sh` to ranking i wyszukiwarka gotowych skilli do Claude Code
i pokrewnych narzędzi. Instaluje się je do projektu i agent używa ich tak samo
jak twoich własnych, tych z `.agents/skills`.

**Sprawdzone 19.09.** Na dziś nic stamtąd nie jest nam potrzebne i nie warto
przerywać dla tego pracy. Na poniedziałek warte obejrzenia:

| Skill | Po co nam |
|---|---|
| `frontend-design`, `web-design-guidelines` | wygląd strony `aicallcenter.pl` i panelu |
| `diagnosing-bugs`, `code-review` | drugie zdanie o kodzie, tańsze niż pełny przegląd |
| `domain-modeling`, `to-spec` | rozpisywanie kolejnych modułów przed pisaniem kodu |
| `supabase-postgres-best-practices` | tylko jeśli kiedyś wyjdziemy poza własne Postgresy |

Czego tam nie szukać: skilli do generowania wideo. Film z demo ma pokazywać
twój panel, a nie wygenerowaną animację.

## 1b. cezar-cli, kokpit do agentów programistycznych

`npx cezar-cli`, alias na `@open-mercato/cezar`. Od zespołu Open Mercato,
czyli od autorów frameworka, na licencji MIT. Lokalny kokpit do uruchamiania
i śledzenia zadań agentów AI w repozytorium, otwiera się w przeglądarce.

Dotyczy agentów programistycznych, nie naszych głosowych. Zastąpiłby ręczne
zlecanie zadań Codexowi, które dziś robimy poleceniem w konsoli.

**Sprawdzone 19.09:** wersja 0.11.0, 562 wydania od lipca 2026, ostatnie
cztery dni temu. Rozwija się bardzo szybko, więc spodziewaj się ostrych
krawędzi. Dlatego nie wprowadzaliśmy go dzień przed zamknięciem kodu.

Warto obejrzeć w poniedziałek: autorzy znają ten framework od środka.

## 2. Analiza wąskiego gardła w obdzwanianiu

Osobny plik: `ANALIZA-WASKIE-GARDLO.md`. Samodzielny, można go wkleić
do nowego czatu. Pamiętaj: Bitrix kancelarii, nie Adsignio.

## 3. Higiena po hackatonie

- Zmienić żeton webhooka Bitrix24 i hasło do `ai@aicallcenter.pl`. Oba
  przewinęły się przez zapis rozmowy. Szczegóły w `DECYZJE-OTWARTE.md`,
  punkt 16.
- Skasować rekordy testowe w Bitriksie: leady 83 i 85, kontakt 3341,
  deal 10021.
- Usunąć z bazy demo dwa wiersze "Michal Test" z prawdziwym numerem.
- Wymienić klucz ElevenLabs. Na czas hackatonu zdjęliśmy z niego wszystkie
  ograniczenia, więc daje pełny dostęp do konta.
- Ustawić własne dane logowania do panelu. Teraz działa domyślne
  `superadmin@acme.com` z hasłem `secret`, które Chrome słusznie zgłasza jako
  ujawnione. Docelowo: `OM_INIT_SUPERADMIN_EMAIL` i
  `OM_INIT_SUPERADMIN_PASSWORD` w `.env`, przed wystawieniem czegokolwiek
  poza laptop.
- Skasować plik `ftp.netrc` z katalogu hackatonu, bo leży w nim hasło do
  konta FTP.
- Usunąć z konta ElevenLabs agenta "DEMO HackOn - Potwierdzanie leadow"
  i webhook "AI call center - Open Mercato", jeśli nie wchodzą do produkcji.

## 4. Brakująca biblioteka na laptopie

19.09 testy przestały się uruchamiać, bo w systemie nie ma
`vcruntime140_1.dll` z pakietu Microsoft Visual C++. Bez niej `jest` nie
potrafi odnaleźć żadnego pliku i zgłasza mylący błąd o brakującym
`jest.setup.ts`.

Doraźnie podłożona została kopia tej biblioteki obok wtyczki w
`node_modules`. **To znika przy każdym `yarn install`.**

**Trwałe rozwiązanie:** zainstalować *Microsoft Visual C++ 2015-2022
Redistributable (x64)* ze strony Microsoftu, `vc_redist.x64.exe`. Wymaga praw
administratora, trwa dwie minuty i załatwia sprawę raz na zawsze, także dla
innych narzędzi, które jeszcze się na to natkną.

## 5. Strona i dokumenty

W katalogu `strona/` leży wizytówka produktu plus szkice polityki
prywatności i regulaminu. **Szkice, nie dokumenty gotowe do publikacji.**
Przed wgraniem na hosting:

1. Uzupełnić wszystkie znaczniki `[DO UZUPEŁNIENIA: ...]`.
2. Przepuścić całość przez skill `strony-php-bezpieczenstwo`.
3. Dać polityce i regulaminowi oczy prawnika. Masz go pod ręką.

## Dopisane 20.09 rano, przed wystapieniem

### 2. Przeglad botow produkcyjnych AdSignio u dostawcy

Boty spoza panelu ("AdSignio - Polaczenia przychodzace", "Adsignio -
Potwierdzanie leadow", szablon "DEMO HackOn - Potwierdzanie leadow") zostaly
w nocy 19/20.09 przelaczone skryptami tak samo jak boty z panelu:

- model rozmowy: `gpt-4.1-mini` (bylo: gemini-2.0-flash-lite),
- silnik glosu: `eleven_v3_conversational`, stabilnosc 0,5 (bylo: flash, 0,8),
- webhook: tunel hackathonowy zamiast "Make - wynik rozmowy AdSignio".

Do zrobienia: sprawdzic, ktory z tych trzech ma dzwonic i odbierac naprawde,
przepiac jego webhook z powrotem na Make (`31d021a6e4ed41bfa6785f3578bbbebd`),
odsluchac po jednej rozmowie na GPT + v3 i zdecydowac, czy to zostaje.
Poprawic `scripts/przepnij-tunel.mjs`, zeby omijal boty spoza panelu.

### 3. Co nowego u dostawcy

Przejrzec zmiany w ElevenLabs Conversational AI z ostatnich tygodni: modele
rozmowy, silniki glosu, rozpoznawanie mowy (czy doszedl wybor silnika STT),
narzedzia, ceny. W nocy odkrylismy `eleven_v3_conversational` przypadkiem,
z listy modeli, nie z dokumentacji.

### 4. Badanie rynku: dostawcy i Fonio

- Czy poza ElevenLabs jest lepszy dostawca rozmow glosowych po polsku:
  Retell, Vapi, Bland, LiveKit Agents, Pipecat z Deepgram.
- Fonio: co robia inaczej niz "ElevenLabs w ladnym panelu". Wiemy: STT
  Deepgram, LLM OpenAI, TTS ElevenLabs/Azure, wlasna orkiestracja, 500-900 ms.
  Jesli tylko skladaja te same klocki, jestesmy na tym samym poziomie; jesli
  maja cos wlasnego (STT po polsku, obsluga przerwan, oddzwanianie), trzeba
  to dogonic. Zrobic po jednej rozmowie testowej u nich i u nas na tym samym
  scenariuszu i porownac transkrypcje.

### 5. Decyzja o frameworku

Zostac na Open Mercato czy przeniesc modul na wlasny, lzejszy szkielet.
Argument za Mercato: wielofirmowosc, logowanie, uprawnienia, tabele gotowe.
Argument przeciw: ciezar srodowiska i warstwa plikow, ktorej nie uzywamy.
Decyzja po pierwszym placacym kliencie, nie wczesniej. Logika rozmow
w `src/modules/voicebot/lib` jest przenosna niezaleznie od decyzji.

### 6. Drzewka rozmowy (Workflows u dostawcy)

ElevenLabs ma wizualny edytor Workflows: wezly z wlasnym promptem i narzedziami,
krawedzie z warunkami "jesli klient powie X". Da sie ustawiac przez API.
Dzis rozgalezienia sa w prompcie (np. waluta tylko przy kredycie walutowym).
Do sprawdzenia pod rozmowy przychodzace: klient mowi, w jakiej sprawie dzwoni,
i trafia na galaz. Alternatywa: przekazanie do innego bota (transfer_to_agent),
juz dostepne na kazdym bocie.

**Uzupelnienie Michala, 20.09:** rozgalezienia musza byc juz w botach
dzwoniacych (wychodzacych), nie tylko przychodzacych. Przyklady:

- kredyty: gdy rozmowca powie "walutowy", dodatkowe pytanie o walute;
  przy zlotowkowym bez pytania, waluta PLN,
- nieruchomosci: "chce sprzedac" to inna sciezka pytan (jaka nieruchomosc,
  gdzie, za ile, od kiedy na sprzedaz) niz "chce kupic" (lokalizacja, metraz,
  budzet, kredyt).

Do zdecydowania: prompt z warunkami (dziala od reki, do kilku rozgalezien)
czy Workflows u dostawcy (drzewko na sztywno, wiecej galezi, mniej zgadywania
przez model). Wynik ma trafiac do tych samych kolumn niezaleznie od galezi,
pola z pytan obu galezi nalezy zglosic dostawcy razem.

### 7. Limity rownoczesnych rozmow

Stan 20.09: konto ElevenLabs na planie Creator, limit rownoczesnych rozmow
glosowych 10 (Pro 20, Scale/Business 30). Kredyty: 241 tys. znakow miesiecznie,
przy ok. 1000 znakow na rozmowe to ok. 230 rozmow; to skonczy sie pierwsze.

Trunk ACTIO: liczba kanalow nieznana, zalezy od umowy. Zapytac ACTIO o liczbe
kanalow na numerze produkcyjnym i cene dodatkowych. Wczorajsze "SIP 480" moglo
byc zajeciem jedynego kanalu.

Panel: limit "maksimum rownoczesnych rozmow" na firme (ekran Limity firmy,
domyslnie bez ograniczenia) i odstep miedzy polaczeniami w kampanii
(domyslnie 180 s). Obowiazuje najnizsze z trzech ograniczen.

Potrzeba: 972 proby miesiecznie w godzinach 8-20 to 2 kanaly; obdzwonienie
300 leadow w godzine po kampanii reklamowej to 10 kanalow i plan Pro.

**Jak skalowac rownoleglosc (decyzja 20.09):** jedno konto u dostawcy,
wyzszy plan wraz z klientami (Pro przy pierwszym placacym, Business przy
trzech, Enterprise dalej). Nie zakladac kilku kont: regulamin dostawcy tego
zabrania, blokada objelaby wszystkie naraz, a panel musialby zonglowac
kluczami. Panel juz kolejkuje rozmowy, wiec limit boli dopiero przy setkach
leadow w godzine.

Tak dziala Fonio: jedno konto platformy, klienci dziela wspolna pule.
Dwie rzeczy, ktorych nam brakuje: telefonia bez sufitu kanalow (Telnyx albo
Twilio, rozliczenie za minute, skaluje sie na zadanie) i drugi dostawca glosu
na wypadek awarii lub limitu (Azure). Plan: ACTIO zostaje dla malych klientow,
Twilio lub Telnyx pod kampanie masowe.

### 8. Stare kolumny na liscie rozmow

"Produkt", "Kwota", "Rok umowy", "Bank" w `voicebot-calls/page.tsx` to stale
kolumny z pol pierwszego szablonu (produkt_kod, kwota, rok_umowy, bank).
Nowe boty zbieraja pola z pytan, wiec te kolumny sa puste i dubluja
"Na jaka kwote" i "Jaki to byl bank" z prawej. Ukryc je, gdy zaden wiersz
nie ma tych pol, albo usunac razem z kolumnami w encji po migracji danych demo.

### 9. API w druga strone

Dzis: klient zleca rozmowe (POST /api/voicebot/calls) i moze odczytac liste
rozmow z wynikami, transkrypcje i nagranie tym samym kluczem (GET). Wynik
trafia do CRM klienta przez zlacze Bitrix24 albo wbudowany CRM. Brakuje:
webhooka wychodzacego z wynikiem rozmowy pod adres podany przez klienta
(z podpisem HMAC, jak u dostawcy) oraz opisu odczytu na ekranie "Integracja API".

### 10. Telefonia zawiodla na scenie (20.09, 13:34)

Dwie przyczyny naraz: internet na sali (zlecenie do dostawcy doszlo minute po
wyslaniu, panel po 20 s zapisal blad polaczenia) i trunk ACTIO, ktory nie
odpowiedzial na zestawienie polaczenia (kod 1011 "sip request timed out").
Wczoraj ten sam trunk odbijal co druga probe (480, 403). Wniosek: przed
kazdym pokazem probna rozmowa 10 minut wczesniej, nagranie zapasowe pod reka,
a docelowo telefonia od operatora, ktory skaluje sie na zadanie (Twilio,
Telnyx), zamiast trunku z jednym kanalem. Limit czasu na zlecenie u dostawcy
w `provider.ts` (20 s) podniesc do 45 s, bo zlecenie i tak dochodzi.

### 11. Odpowiedz na pytanie "a co jest wasze, skoro to ElevenLabs"

Padlo od jury 20.09. Wersja do klientow i inwestorow:
1. Dostawca daje trzy klocki: rozpoznawanie mowy, glos i spiecie rozmowy
   z modelem. To samo kupuje Fonio i kazdy inny; nikt nie pisze wlasnego
   rozpoznawania mowy.
2. Nasze jest wszystko wokol: bot dla firmy w minute, pytania jako kolumny
   wynikow, oddzwonienie sklejone z pierwsza proba, wynik w CRM klienta,
   izolacja firm, policzone koszty, API dla systemu klienta.
3. Dostawca jest wymienny: zakladanie bota, start rozmowy i odbior wyniku
   siedza w trzech plikach (`nowy-agent.ts`, `provider.ts`, `webhook/route.ts`).

## Poniedzialek: system w internecie i cztery decyzje (zapis 20.09 po wystapieniu)

### 12. Co trzeba, zeby panel stal w internecie

Wdrozenie jest przygotowane pod Railway: `Dockerfile`, `railway.toml`
(aplikacja, healthcheck `/api/healthz`), `railway.worker.toml` (worker
kolejki), `scripts/railway-start.sh` (migracje przy starcie, cache i kolejka
na Redis). Do zrobienia:

1. Projekt w Railway z trzema uslugami danych: Postgres (obraz z pgvector),
   Redis, Meilisearch. Dwie uslugi aplikacyjne z tego samego repo: `web`
   (railway.toml) i `worker` (railway.worker.toml).
2. Zmienne srodowiska: wszystko z `.env.example` plus sekcja Voicebot,
   `DATABASE_URL`, `REDIS_URL`, `MEILISEARCH_*`, `APP_URL` = domena,
   `JWT_SECRET`/`AUTH_SECRET` nowe, `DEMO_MODE=false`, bez zmiennych `OM_DEV_*`.
3. Domena: wlasna albo `*.up.railway.app`. Webhook u dostawcy zaklada sie
   raz, na staly adres (`node scripts/przepnij-tunel.mjs https://domena`),
   tunel przestaje istniec.
4. Po pierwszym starcie: `node scripts/dane-demo.mjs` tylko jesli ma byc
   demo; dla klientow nie. Zmienic haslo `superadmin@acme.com`.
5. Wrocic z limitem rozmow probnych do 5/h (`VOICEBOT_LIMIT_TESTOW_NA_GODZINE`).
6. Koszt: Railway ok. 20-40 USD/mies. przy tym zestawie. Alternatywa: jeden
   VPS (Hetzner, 8-15 EUR) z `docker-compose.fullapp.yml`, ale wtedy sami
   robimy kopie bazy i aktualizacje.

### 13. Ile Mercato naprawde uzywamy (pomiar 20.09)

Nasz kod: 9,3 tys. linii w `src/modules/voicebot`. Framework na dysku:
218 MB w `node_modules/@open-mercato`. Wlaczone moduly: 16 (auth, directory,
configs, entities, query_index, notifications, events, search, customers,
feature_toggles, api_keys, voicebot, record_locks, system_status_overlays,
sso, security). Z czego voicebot korzysta bezposrednio (liczba plikow):
logger 23, kontener DI 19, auth z sesji i klucza API 16, i18n 14, przyciski
i szkielet strony 25, DataTable 3, OpenAPI 5, szyfrowanie kolumn 3, kolejka 3.

Posrednio, bez importow: logowanie, firmy i organizacje (tenant), uprawnienia,
klucze API, migracje ze snapshotem, wbudowany CRM (customers), menu i widok.

Wniosek: "smieci" to pakiety na dysku i ciezar srodowiska dev, nie kod na
sciezce rozmowy. Przepisanie od zera znaczy napisanie od nowa: logowania,
tenantow, uprawnien, kluczy API, kolejki z blokada, szyfrowania, tabel
i formularzy. To miesiace, nie tygodnie. Decyzja jak wczesniej: po pierwszym
placacym kliencie. Jesli wtedy zapadnie "przepisac", to logika w `lib/`
(rozmowa, branze, kolejka, CRM, odmiana, limity) przenosi sie bez zmian,
a UI i auth trzeba napisac na nowo.

### 14. Liczba prob (ponawianie nieodebranych)

Dzis: jedna proba na numer, bez ponawiania (`dispatch-call.ts`, "nie
dzwonimy pod ten numer ponownie"). Do zrobienia:
- na kampanii: maksymalna liczba prob (domyslnie 3), odstep miedzy probami
  (domyslnie 2 h), okno godzin dzwonienia (domyslnie 8-20, dni robocze),
- na pojedynczym zleceniu przez API: te same trzy pola jako nadpisanie,
- worker: po `no_answer`/`busy` planuje kolejna probe zamiast konczyc,
  `failed` (403, 1011 od operatora) ponawia po 15 min raz,
- oddzwonienie klienta w miedzyczasie kasuje zaplanowane proby (patrz 15),
- w tabeli: numer proby i "nastepna proba o".

### 15. Oddzwonienia: co jest, co sprawdzic

Jest: webhook rozmowy przychodzacej zaklada wiersz `inbound`, po numerze
dzwoniacego szuka wczesniejszej proby w tej samej firmie i wpisuje ja jako
`relatedCallId` (`webhook/route.ts`, `poprzedniaProba`). Warunek: numer, na
ktory klient oddzwania, musi byc u dostawcy przypiety do bota przychodzacego
i przypisany do kampanii tej firmy w panelu. Do sprawdzenia na zywo z numerem
732 (u dostawcy jest na nim bot "AdSignio - Polaczenia przychodzace", nie bot
z panelu): oddzwonic po nieodebranej probie i zobaczyc pare wierszy.

### 16. Powitanie i pozegnanie jako osobne pola

Wydzielic z scenariusza dwa pola na karcie bota: "Powitanie" i "Pozegnanie",
domyslnie z branzy (z odmieniona nazwa firmy), edytowalne przez klienta.
Powitanie idzie do `first_message` u dostawcy, pozegnanie do sekcji
zakonczenia w prompcie. Wymaga dwoch kolumn w `VoiceAgentProfile`
(migracja), pol na ekranie pytan i przekazania w `wyslijScenariuszDoAgenta`.
`{FIRMA}` w tekstach klienta podmieniac na nazwe w dopelniaczu.

### 17. Pomysly z telefonu, gdy laptop jest wylaczony (dla Michala)

Najprosciej: ten plik w aplikacji GitHub na telefonie, olowek, dopisac na
koncu, zapisac. W poniedzialek Claude pobiera zmiany i czyta. Alternatywa:
jeden czat "Pomysly voicebot" w aplikacji Claude, tresc do wklejenia w sesji.
Sesja w chmurze mozliwa, ale bez dostepu do laptopa, Dockera i panelu; na
notatki wystarczy, na prace z panelem nie.

### 18. Wlasne konto ElevenLabs klienta (pomysl Michala, 20.09)

Dla wybranych firm mozliwosc podpiecia ich wlasnego konta u dostawcy, widoczne
i edytowalne tylko w widoku admina. Co to znaczy w kodzie:
- klucz API dostawcy na poziomie firmy, w kolumnie szyfrowanej (jak zeton
  CRM w `encryption.ts`), pusty = konto platformy,
- `provider.ts`, `nowy-agent.ts`, `ustawienia-agenta.ts`, `rozmowa.ts`:
  klucz z firmy zamiast z `.env`, gdy ustawiony,
- webhook: kazde konto dostawcy ma wlasny webhook i sekret, wiec przy
  podpieciu konta trzeba zalozyc webhook w ich workspace i trzymac sekret
  per firma; `webhook/route.ts` musi rozpoznac firme po sekrecie (naglowek
  podpisu), nie tylko po numerze,
- numery i boty tej firmy zyja na jej koncie: katalog numerow i agentow
  pobierany jej kluczem,
- szablon bota: kopiowac przez API nie da sie miedzy kontami, wiec szablon
  trzeba odtworzyc na ich koncie (prompt i ustawienia mamy w kodzie, `branze.ts`).
Korzysc: rozliczenie minut i limity rownoleglosci po stronie klienta, my
sprzedajemy panel. Koszt: dwa tryby do testowania. Zaczac od jednej firmy.

### 19. Cesar i orkiestrator w Open Mercato (do zbadania)

Michal, 20.09: "Cesar" to ich agent (Open Mercato), a "orkiestrator" to agent,
ktory rozdziela zadania miedzy innych agentow. Warte obejrzenia pod nasz
pipeline: w repo sa juz skille `om-auto-create-pr`, `om-auto-implement-spec`,
`om-auto-review-pr` i modul `agent_orchestrator` (import w
`src/modules/agent_examples/ai-agents.ts`, dzis nie dziala, bo brak pakietu
`@open-mercato/enterprise`). Sprawdzic w repo Open Mercato po weekendzie:
co robi Cesar, jak dziala orkiestrator, czy da sie go uzyc do naszej pracy
(np. jeden agent na kod, jeden na testy, jeden na dokumenty) i czy wymaga
pakietu enterprise.

### 20. Numer dla klienta i cennik (Michal, 20.09, glosowo)

- Publiczna probna rozmowa ze strony: formularz (branza, numer, zgoda) ->
  bot branzy dzwoni w minute. Dzis formularz wysyla mail do biuro@adsignio.pl;
  jutro endpoint publiczny z limitem prob na numer i na godzine, jeden numer
  testowy platformy dla wszystkich prob.
- Szybka sciezka do wlasnego numeru klienta: "zamow numer u partnera" ma
  prowadzic do podpiecia numeru i wyslania umowy do klienta (na telefon,
  np. link SMS/e-mail), bez recznego przepisywania. Klient podpisuje umowe
  z operatorem (ACTIO) na same polaczenia.
- Cennik platformy, osobno od polaczen: pokrywa hosting, dostawce glosu
  i marze. Do ustalenia model: abonament miesieczny za panel + cena za
  rozmowe (u dostawcy ok. 35 gr odbyta, 2 gr nieodebrana) albo pakiety
  rozmow. Zakotwiczyc na koszcie czlowieka (ok. 2,70 zl za probe), nie na
  konkurencji (0,50-2 zl za minute u innych).

### 21. Bot firmowy AI call center do rozmow z klientami (Michal, 20.09)

Wystawic wlasnego bota przychodzacego na numerze platformy: klient
zainteresowany usluga dzwoni i rozmawia z botem, ktory odpowiada na pytania
o produkt, ceny, jak to dziala, RODO, branze, czas wdrozenia. Trzeba:
- wymyslic liste pytan, jakie zadaja zainteresowani, i napisac scenariusz
  z odpowiedziami (baza wiedzy z tej strony i z NA-PONIEDZIALEK),
- zbierac numer i firme, zapisywac wynik jak kazda rozmowe,
- przekazanie do czlowieka tylko gdy klient wyraznie o to prosi
  (transfer_to_number), w innych przypadkach bot konczy sam,
- nie pisac o tym na stronie; ma dzialac automatycznie od pierwszego telefonu.
Zalozenie Michala: nikt nie bedzie recznie rozmawial z kazdym zainteresowanym.

Usuniete ze strony 20.09: kafelki branz z przykladowymi pytaniami
(niesprawdzone branze nie moga byc na landingu). Zostal formularz: branza
z listy, numer, zgoda.
