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
