# Przegląd jurorski przed pokazem

Przegląd z 19.09.2026, wykonany z pozycji jurora, który ma jutro o 12:15 uwierzyć,
że to jest działający wielofirmowy produkt. Czytane: cały `src/modules/voicebot/`,
`SCENARIUSZ-DEMO.md`, `ZGLOSZENIE-HACKON.md`, `README.md`, `scripts/dane-demo.mjs`,
`NA-PONIEDZIALEK.md`. Nie uruchamiałem serwera, testów ani bazy. Nie powtarzam
znalezisk z `KRYTYKA-CODEX.md` poza trzema miejscami, gdzie mam do nich coś nowego.

Uwaga wstępna, na korzyść zespołu: punkty 2 i 7 z `KRYTYKA-CODEX.md` są już
nieaktualne. `progSchema` w `src/modules/voicebot/data/validators.ts:192` stawia
teraz `null` i pusty ciąg przed `z.coerce.number()`, a `zapiszNumery`
w `src/modules/voicebot/api/limits/route.ts:24` odróżnia brak pola od pustej
listy. Warto to wiedzieć, gdyby ktoś cytował stary przegląd.

---

## 1. Które zdanie ze scenariusza nie ma pokrycia w kodzie

### 1.1. Wyjątki: statusy "nieodebrane" i "zajęte" nie powstają w żadnej ścieżce kodu

> "4. **Wyjątki.** Nieodebrane, zajęte, numer nieosiągalny. To jest te 25 procent
> za kompletność, więc nie przewijaj tego szybko." (`SCENARIUSZ-DEMO.md:48`)

To jest najmocniejsza obietnica całej ścieżki 03 i nie ma za nią kodu.
Webhook, który jest jedynym miejscem zapisującym wynik rozmowy, ustawia wyłącznie
dwa statusy: `failed` przy `call_initiation_failure`
(`src/modules/voicebot/api/webhook/route.ts:344`) albo `completed`
(`src/modules/voicebot/api/webhook/route.ts:354`). Worker ustawia jeszcze `dialing`
i `failed` (`src/modules/voicebot/lib/dispatch-call.ts:101`,
`src/modules/voicebot/lib/dispatch-call.ts:133`).

Wartości `no_answer` i `busy` istnieją tylko w trzech miejscach: w komentarzu
encji (`src/modules/voicebot/data/entities.ts:376`), w enumie walidatora
(`src/modules/voicebot/data/validators.ts:6`) i w skrypcie danych demo
(`scripts/dane-demo.mjs:64`, `scripts/dane-demo.mjs:104`,
`scripts/dane-demo.mjs:130`). "Numer nieosiągalny" to literał wpisany ręcznie
w `scripts/dane-demo.mjs:118`.

Skutek: trzy wiersze, które na scenie mają udowodnić kompletność obsługi
wyjątków, są wpisane do bazy `INSERT`-em przed prezentacją i nie mogłyby
powstać w działającym systemie. Dodatkowo reguła przeglądu
`{ reason: 'no_answer', where: { status: 'no_answer' } }`
(`src/modules/voicebot/api/calls/review/rules.ts:16`) i tłumaczenie statusu
w `src/modules/voicebot/backend/voicebot-do-sprawdzenia/page.tsx:64` to martwy
kod na produkcji: ekran "Do sprawdzenia" nigdy nie pokaże z tego powodu żadnej
rozmowy poza seedem.

### 1.2. Role: pracownik widzi przycisk zlecania połączeń

> "5. **Role.** Przeloguj się na konto pracownika. Widzi wyniki, nie widzi przycisku
> zlecania połączeń. > Pracownik ogląda, ale nie uruchomi kosztownych połączeń."
> (`SCENARIUSZ-DEMO.md:50`)

Pokryte częściowo i tylko dla jednego ekranu. Ekran "Wczytaj listę" faktycznie
znika, bo wymaga `voicebot.calls.start`
(`src/modules/voicebot/backend/voicebot-import/page.meta.ts:3`).

Ale ekran "Kampanie głosowe" wymaga wyłącznie `voicebot.campaigns.view`
(`src/modules/voicebot/backend/page.meta.ts:3`), a renderuje bezwarunkowo
komponent `PolaczenieTestowe` (`src/modules/voicebot/backend/page.tsx:172`)
z przyciskiem "Zadzwoń" (`src/modules/voicebot/backend/PolaczenieTestowe.tsx:106`)
oraz przycisk "Nowa kampania" (`src/modules/voicebot/backend/page.tsx:167`)
i "Edytuj" (`src/modules/voicebot/backend/page.tsx:153`). W całym katalogu
`backend/` nie ma ani jednego sprawdzenia uprawnień po stronie komponentu, jest
tylko gating stron w `page.meta.ts`.

Czyli: konto pracownika z `voicebot.calls.view` plus `voicebot.campaigns.view`
widzi przycisk uruchamiający płatne połączenie. API zwróci 403
(`src/modules/voicebot/api/calls/test/route.ts:15`), ale zdanie ze sceny mówi
o przycisku, a nie o kodzie odpowiedzi. Jeśli pracownik nie ma
`voicebot.campaigns.view`, to nie widzi też kampanii, agentów, CRM, głosów ani
limitów, więc demonstracja "widzi wyniki" ogranicza się do dwóch ekranów.

### 1.3. "Koszt rozmowy widać w panelu, bo pobieramy go od dostawcy"

> "Koszt rozmowy widac w panelu, bo pobieramy go od dostawcy." (`SCENARIUSZ-DEMO.md:61`)

Pobierany jest koszt w dolarach (`src/modules/voicebot/api/webhook/route.ts:338`).
Liczba pokazana na ekranie jest w złotych i powstaje z kursu wpisanego na sztywno
w kodzie: `export const KURS_USD_PLN = 3.7`
(`src/modules/voicebot/lib/koszty.ts:8`), z komentarzem "świadomie nie pobieramy
go z zewnątrz". Zdanie na scenie sugeruje, że złotówki są od dostawcy. Nie są.

Osobno: licznik "Koszt rozmów" na ekranie połączeń
(`src/modules/voicebot/backend/voicebot-calls/page.tsx:186`) sumuje wyłącznie
wiersze aktualnie wczytane, a zapytanie ma `pageSize=100`
(`src/modules/voicebot/backend/voicebot-calls/page.tsx:75`). To samo dotyczy
liczników "Rozmów", "Z ustalonym produktem", "Prosi o kontakt" i "Oddzwonili"
(`src/modules/voicebot/backend/voicebot-calls/page.tsx:145`). Przy stu jeden
rozmowach te liczby zaczynają kłamać, bez żadnego ostrzeżenia w interfejsie.
Scenariusz ścieżki 01 każe je pokazać wprost: "liczniki u góry łącznie z kosztem"
(`SCENARIUSZ-DEMO.md:139`).

### 1.4. Panel pokaże skuteczność, która przeczy liczbie z otwarcia

> "**149 z nich nie odebralo za pierwszym razem.** To jest osiemdziesiat trzy
> procent." (`SCENARIUSZ-DEMO.md:24`)

Na ekranie "Przegląd" kafel "Skuteczność dodzwonień" liczy się jako
`completedOutbound / outbound` (`src/modules/voicebot/api/stats/summary.ts:69`).
Na danych z `scripts/dane-demo.mjs` jest dziesięć rozmów wychodzących, z czego
sześć ma status `completed`. Kafel pokaże **60,0 procent** z podpisem
"6 z 10 wychodzących zakończonych rozmową" (`src/modules/voicebot/backend/voicebot-przeglad/page.tsx:68`).

Juror, który usłyszy "osiemdziesiąt trzy procent nie odbiera", a potem zobaczy
w panelu sześćdziesiąt procent skuteczności, zapyta, która liczba jest prawdziwa.
Zestaw demo trzeba dobrać tak, żeby potwierdzał tezę, a nie jej przeczył.

### 1.5. "W poniedziałek mogę to włączyć u siebie"

> "To nie jest prototyp na weekend. Stoi na Open Mercato, ma migracje,
> uprawnienia i rozdzielone firmy. W poniedziałek mogę to włączyć u siebie."
> (`SCENARIUSZ-DEMO.md:101`)

Własny plik zespołu mówi co innego. `NA-PONIEDZIALEK.md:54` notuje, że panel
działa na domyślnym `superadmin@acme.com` z hasłem `secret`, a `NA-PONIEDZIALEK.md:52`,
że klucz ElevenLabs ma na czas hackathonu zdjęte wszystkie ograniczenia, czyli
daje pełny dostęp do konta. `NA-PONIEDZIALEK.md:46` wymienia żeton webhooka
Bitrix24 do wymiany. To nie jest stan "włączam w poniedziałek", tylko stan
"w poniedziałek zaczynam od higieny dostępów". Zdanie ze sceny jest do obrony
tylko wtedy, gdy zostanie zawężone, na przykład do "kod jest gotowy, zostaje
wymiana kluczy".

### 1.6. "Każdy klient jako osobny tenant, ze swoim numerem"

> "Docelowo to produkt dla firm, każdy klient jako osobny tenant, ze swoim
> numerem i swoim CRM-em. Bot rozpoznaje firmę po numerze, na który ktoś
> zadzwonił." (`SCENARIUSZ-DEMO.md:152`)

"Ze swoim numerem" nie ma pokrycia. Kreator nowego klienta przypisuje świeżej
firmie **pierwszy numer ze wspólnej listy konta**:
`phoneNumberId: numery[0]?.phoneNumberId ?? null`
(`src/modules/voicebot/api/agents/create/route.ts:113`), gdzie `numery` powstaje
z `filtrujNumery(katalog.numbers, limity?.allowedNumbers || process.env.VOICEBOT_NUMERY_DOZWOLONE)`
(`src/modules/voicebot/api/agents/create/route.ts:108`). Nowy tenant nie ma
jeszcze wiersza limitów, więc działa globalna lista z `.env`, identyczna dla
wszystkich. Każda kolejna firma dostaje więc dokładnie ten sam numer.

Konsekwencja jest poważniejsza niż nieścisłość w opisie. Właściciela rozmowy
przychodzącej wyznacza globalne, nieograniczone tenantem zapytanie o najnowszą
kampanię z tym numerem (`src/modules/voicebot/api/webhook/route.ts:99`, orderBy
`createdAt: 'desc'`). Kliknięcie "Nowy klient" na scenie tworzy kampanię
startową z tym samym numerem i z datą "teraz"
(`src/modules/voicebot/api/agents/create/route.ts:109`), więc od tej chwili:

- każda rozmowa przychodząca na numer ACTIO przypisuje się do świeżo założonej
  firmy demo, a nie do kancelarii;
- każdy webhook wyniku rozmowy wychodzącej kancelarii wpada w kontrolę
  `call.tenantId !== kampania.tenantId` i dostaje **403**
  (`src/modules/voicebot/api/webhook/route.ts:280`), a wiersz zostaje w `dialing`
  na zawsze;
- domyślna kampania w oknie "Połączenie testowe" przeskakuje na nową firmę, bo
  komponent bierze `kampanie[0]` (`src/modules/voicebot/backend/PolaczenieTestowe.tsx:31`),
  a lista jest sortowana malejąco po dacie utworzenia
  (`src/modules/voicebot/data/validators.ts:31`), więc bot przedstawi się nazwą
  nowej firmy.

`KRYTYKA-CODEX.md` punkt 10 opisuje to jako drogę ataku firmy B na firmę A.
Nowe jest to, że nie trzeba żadnego atakującego: wystarczy pokazać własną
flagową funkcję "zakładanie klienta jednym przyciskiem", żeby samemu rozwalić
resztę pokazu. `scripts/dane-demo.mjs:200` zakłada kampanię demo od nowa, więc
jedyną obroną jest kolejność: dane demo muszą iść **po** demonstracji nowego
klienta, a nie przed, jak stoi w checkliście (`SCENARIUSZ-DEMO.md:162`).

### 1.7. Ścieżka 01: "wiersz jest, z produktem i kwotą"

> "Odświeżasz listę, wiersz jest, z produktem i kwotą." (`SCENARIUSZ-DEMO.md:129`)

Cztery rzeczy muszą zadziałać, żeby to zdanie było prawdziwe, i żadna nie ma
zapasowego zachowania widocznego dla operatora:

1. Kolumna "Status" na ekranie połączeń pokazuje surową wartość z bazy
   (`src/modules/voicebot/backend/voicebot-calls/page.tsx:111`, `accessorKey: 'status'`),
   czyli na scenie pojawi się `completed`, `failed`, `no_answer`. Ekran
   "Do sprawdzenia" tłumaczy te statusy
   (`src/modules/voicebot/backend/voicebot-do-sprawdzenia/page.tsx:59`),
   główny ekran nie.
2. Kierunek rozmowy jest brany z opcjonalnego pola
   `data.metadata?.phone_call?.direction` (`src/modules/voicebot/api/webhook/route.ts:265`).
   Gdy dostawca nie przyśle bloku `phone_call`, kierunek zostaje `outbound`,
   kampania jest `null` i oddzwonienie kończy się odpowiedzią 404
   "Nie znaleziono połączenia" (`src/modules/voicebot/api/webhook/route.ts:326`).
   Cała scena z oddzwonieniem wisi na jednym opcjonalnym polu cudzego payloadu.
3. Bez klucza dostawcy `startOutboundCall` zwraca **sukces symulowany**
   (`src/modules/voicebot/lib/provider.ts:41`), a interfejs pokazuje komunikat
   "Tryb symulacji" (`src/modules/voicebot/backend/PolaczenieTestowe.tsx:55`).
   To akurat jest zrobione dobrze, ale trzeba o tym pamiętać: przy błędzie
   ładowania `.env` telefon nie zadzwoni, a panel nie zgłosi błędu.
4. Rozmowa testowa z próby generalnej zostaje na liście: ani `GET /calls`
   (`src/modules/voicebot/api/calls/route.ts:33`), ani statystyki
   (`src/modules/voicebot/api/stats/route.ts:22`) nie filtrują `isTest`, mimo
   że komentarz encji obiecuje coś przeciwnego
   (`src/modules/voicebot/data/entities.ts:367`). Codex zgłosił to dla CRM
   i statystyk; dokładam listę połączeń, czyli dokładnie ten ekran, który
   pokazujecie na scenie.

### 1.8. Zgłoszenie: liczby i tabela "co dokładnie działa"

- "160 testów w 12 zestawach" (`ZGLOSZENIE-HACKON.md:236`). W repozytorium jest
  **18 plików testowych**, nie 12, a wywołań `it(` i `test(` jest 150, przy czym
  część to `it.each`, więc faktyczna liczba przypadków jest inna niż 160
  w obie strony. Liczba podana z taką precyzją zaprasza do policzenia.
  `src/modules/voicebot/lib/__tests__/queue-transport.test.ts` nie ma ani jednego
  `it(`.
- "Panel: osiem ekranów" (`ZGLOSZENIE-HACKON.md:173`). Plików `page.meta.ts` jest
  dziesięć. Dokument jest nieaktualny wobec kodu, co jest gorsze niż liczba
  zaniżona świadomie.
- "API dla systemu klienta, uwierzytelniane kluczem | działa"
  (`ZGLOSZENIE-HACKON.md:171`) oraz "`api_keys` - klucze, którymi system klienta
  zleca połączenia" (`ZGLOSZENIE-HACKON.md:197`). W całym module nie ma ani jednej
  linii kodu dotyczącej kluczy API ani jednego testu. Działa to wyłącznie dlatego,
  że `getAuthFromRequest` frameworka sam rozpoznaje klucz
  (`node_modules/@open-mercato/shared/src/lib/auth/server.ts:452`). To jest
  uczciwe w kolumnie "moduły Open Mercato, których użyliśmy", ale nieuczciwe
  w tabeli "co dokładnie działa" bez adnotacji "dostajemy z frameworka".
  Dodatkowo klucz nieprzypięty do organizacji dostanie 403 na
  `src/modules/voicebot/api/calls/route.ts:85`, bo `auth.orgId` jest wtedy `null`.
- "Odbiór wyniku rozmowy webhookiem, z podpisem HMAC | działa"
  (`ZGLOSZENIE-HACKON.md:156`). Sprawdziłem: `VOICEBOT_WEBHOOK_SECRET` jest
  ustawiony w `.env`, więc wątpliwość z `KRYTYKA-CODEX.md` punkt 11 na tym
  wdrożeniu nie występuje. Nadal jednak brak sekretu **przepuszcza** żądanie
  zamiast je odrzucić (`src/modules/voicebot/api/webhook/route.ts:53`), więc
  zdanie "działa" jest prawdziwe tylko dla tej jednej maszyny.

### 1.9. README: zdanie o wielotenantowości podważone własnym kodem

> "Zakres tenanta i organizacji jest w sesji, a nie w treści żądania, więc nie da
> się go podmienić z przeglądarki." (`README.md:30`)

W tym samym repozytorium jest ekran, który podmienia ten zakres z przeglądarki,
zwykłym `document.cookie`:

```
document.cookie = `om_selected_tenant=${encodeURIComponent(tenantId)}; ...`
document.cookie = `om_selected_org=${encodeURIComponent(orgId)}; ...`
```

(`src/modules/voicebot/backend/voicebot-nowa-firma/page.tsx:62`). Framework
najpewniej sprawdza przynależność użytkownika do tenanta po stronie serwera,
ale zdanie z README w tej formie jest literalnie obalone przez własny kod
zespołu, a to jest zdanie, które sami wskazujecie jako największą wartość
frameworka.

Drugie zdanie z README warte doprecyzowania: "Kolejka połączeń z blokadą
`PESSIMISTIC_WRITE` w bazie (...) To dostaliśmy z frameworka" (`README.md:45`).
Kolejka i worker są z frameworka, ale sama blokada to wasz kod
(`src/modules/voicebot/lib/dispatch-call.ts:29`). Tu akurat oddajecie własną
zasługę frameworkowi, co jest błędem w drugą stronę.

### 1.10. Lokalizacja: dziewięć z dziesięciu ekranów jest tylko po polsku

README zarzuca frameworkowi: "Ekrany administracyjne nie są przetłumaczone.
Zakładanie tenanta ma napisy wpisane w kod na sztywno" (`README.md:73`).
W module używanych jest **275 różnych kluczy** `t('voicebot...')`, a słowniki
`src/modules/voicebot/i18n/pl.json` i `src/modules/voicebot/i18n/en.json` mają
po **32 wpisy**, wyłącznie dla ekranu kampanii. Pozostałe dziewięć ekranów
pokaże polskie napisy domyślne niezależnie od wybranego języka. Zarzut wobec
frameworka jest słuszny, ale sami robicie to samo, tylko w drugą stronę
językową. Juror, który przełączy panel na angielski, to zobaczy.

---

## 2. Pięć pytań, na które nie ma dobrej odpowiedzi

### Pytanie 1

> "Pokazaliście wiersze ze statusem nieodebrane i zajęte. Proszę pokazać w kodzie
> miejsce, które ustawia status `no_answer` na rozmowie przychodzącej z webhooka."

Spodziewana odpowiedź: "dostawca to przysyła" albo "to jest w polu
`termination_reason`". Słaba, bo jedyna gałąź czytająca `termination_reason`
(`src/modules/voicebot/api/webhook/route.ts:345`) ustawia status `failed`,
a nie `no_answer`, a `data.analysis` w ogóle nie jest mapowane na status.
Dopytanie, które kończy sprawę: "to skąd wzięły się te trzy wiersze na ekranie?".
Odpowiedź brzmi: `scripts/dane-demo.mjs`. Wtedy juror przestaje wierzyć
w resztę listy, w tym w oddzwonienia, bo one też są zaseedowane.

### Pytanie 2

> "Zakładamy przy mnie nową firmę waszym przyciskiem `Nowy klient`, a potem
> dzwonicie jeszcze raz na ten sam numer. Do której firmy trafi wynik?"

Spodziewana odpowiedź: "każda firma ma swój numer". Słaba, bo
`src/modules/voicebot/api/agents/create/route.ts:113` przypisuje nowej firmie
`numery[0]` z tej samej, wspólnej listy konta, a
`src/modules/voicebot/api/webhook/route.ts:99` wybiera właściciela numeru jako
najnowszą kampanię z tym `phoneNumberId`, bez filtra tenanta. Nowa firma jest
najnowsza, więc przejmuje numer. Wyniki rozmów kancelarii zaczynają dostawać
403 z `src/modules/voicebot/api/webhook/route.ts:282`. To jest pytanie, które
można zadać na scenie i na scenie zweryfikować, więc nie da się go zagadać.

### Pytanie 3

> "Mówicie, że pracownik nie widzi przycisku zlecania połączeń. Proszę wejść
> na tym koncie pracownika na `/backend/voicebot`."

Spodziewana odpowiedź: "pracownik nie ma dostępu do kampanii". Słaba
dwustronnie. Jeśli pracownik faktycznie nie ma `voicebot.campaigns.view`, to
nie widzi ośmiu z dziesięciu ekranów i teza "widzi wyniki" robi się bardzo
wąska. Jeśli ma, to widzi `PolaczenieTestowe`
(`src/modules/voicebot/backend/page.tsx:172`) i przycisk "Zadzwoń"
(`src/modules/voicebot/backend/PolaczenieTestowe.tsx:106`), czyli dokładnie ten
przycisk, którego według scenariusza nie widzi. W module nie ma ani jednego
sprawdzenia uprawnienia w komponencie, tylko gating całych stron.

### Pytanie 4

> "Ile z tych trzynastu wierszy na ekranie powstało w ciągu ostatniej doby przez
> prawdziwą rozmowę, a ile wpisał skrypt?"

Spodziewana odpowiedź: "to dane demo, bo regulamin zabrania prawdziwych".
Poprawna i uczciwa, ale przesuwa ciężar dowodu: skoro wszystko oprócz jednego
telefonu ze ścieżki 01 jest wpisane `INSERT`-em, to ścieżka 03 nie pokazała
ani jednego działającego wyjątku, ani jednego działającego oddzwonienia, ani
jednego prawdziwego kosztu. Dobitka: `scripts/dane-demo.mjs:178` kasuje wiersze
z `conversation_id like 'sim_%'`, czyli skrypt sam usuwa ślady rozmów
symulowanych. Pytanie kończące: "czy w tej bazie jest choć jedno oddzwonienie,
które wasz kod skleił sam?".

### Pytanie 5

> "Tabela mówi 972 próby u człowieka i 972 próby u bota. Sam mówicie, że dziś
> lead przepada po trzeciej próbie, a bot ponawia bez zmęczenia. To ile prób
> robi bot?"

Spodziewana odpowiedź: "tyle samo, dla porównywalności". Słaba, bo cała wartość
produktu opiera się na zdaniu "bot próbuje dalej" (`ZGLOSZENIE-HACKON.md:144`).
Jeśli bot próbuje dalej, jego liczba prób jest wyższa niż 972 i koszt 118 zł
(`ZGLOSZENIE-HACKON.md:106`) jest policzony na cudzej liczbie prób. Jeśli robi
tyle samo, to nie ratuje żadnego leada i druga, mocniejsza liczba o dwunastu
umowach (`ZGLOSZENIE-HACKON.md:116`) się rozpada. Dodatkowo z kwot podanych
niżej, 35 groszy za rozmowę odbytą i 2 grosze za nieodebraną
(`ZGLOSZENIE-HACKON.md:110`), 118 zł wychodzi tylko przy założeniu, że bot
dodzwania się do wszystkich trzystu kontaktów, czyli przy stuprocentowej
odbieralności, przy tezie otwarcia mówiącej o osiemdziesięciu trzech procentach
nieodebranych.

---

## 3. Co by mnie przekonało, trzy najmniejsze zmiany

### Zmiana 1: jedna gałąź w webhooku, która ustawia `no_answer`

Miejsce: `src/modules/voicebot/api/webhook/route.ts:343`, obok istniejącej
gałęzi `call_initiation_failure`. Wystarczy odczytać `termination_reason`
i zmapować rozpoznane powody na `no_answer` i `busy`, z odwzorowaniem
pozostałych na `failed`. To jest kilkanaście linii i jeden test obok
`src/modules/voicebot/api/webhook/__tests__/webhook.test.ts`.

Dlaczego to najwięcej daje: zdejmuje zarzut z punktu 1.1, czyli z jedynego
miejsca, w którym scenariusz obiecuje wprost "te 25 procent za kompletność".
Ożywia przy okazji ekran "Do sprawdzenia" i regułę
`src/modules/voicebot/api/calls/review/rules.ts:16`, które dziś są martwe.
Zamienia trzy zaseedowane wiersze w trzy wiersze, które da się wyprodukować
na żywo.

Wariant jeszcze mniejszy, gdyby zabrakło czasu: skreślić punkt 4 ze scenariusza
i nie obiecywać wyjątków, których kod nie produkuje.

### Zmiana 2: ukryć `PolaczenieTestowe` i "Nowa kampania" bez `voicebot.calls.start`

Miejsce: `src/modules/voicebot/backend/page.tsx:167` i
`src/modules/voicebot/backend/page.tsx:172`. Jeden odczyt uprawnień w komponencie
i dwa warunki renderowania. Istnieje już test ekranu
(`src/modules/voicebot/backend/__tests__/campaigns.test.tsx`), więc jest gdzie
dopisać asercję.

Dlaczego to najwięcej daje: to jedyna obietnica ze scenariusza, którą juror może
obalić **na scenie, w trzydzieści sekund**, prosząc o przelogowanie. Koszt
naprawy jest nieproporcjonalnie mały wobec skali kompromitacji. Dodatkowo
punkt 5 scenariusza przestaje być zapewnieniem, a staje się pokazem.

### Zmiana 3: dwie linie w checkliście plus jedno zdanie o kursie

Miejsce: `SCENARIUSZ-DEMO.md:162` i `SCENARIUSZ-DEMO.md:61`.

Po pierwsze, w checkliście przed wejściem na scenę uporządkować kolejność:
"Uruchomić dane demo" musi być **ostatnim** krokiem, po jakiejkolwiek
demonstracji zakładania nowego klienta, bo inaczej najnowsza kampania przejmuje
wspólny numer i każdy kolejny webhook dostaje 403
(`src/modules/voicebot/api/webhook/route.ts:280`). Dopisać też: nie klikać
"Nowy klient" po uruchomieniu danych demo.

Po drugie, zamienić zdanie o koszcie na wersję, która nie obiecuje więcej niż
kod: "koszt w dolarach bierzemy od dostawcy, na złote przeliczamy przybliżonym
kursem wpisanym u nas". To zdanie brzmi lepiej niż jego brak, dokładnie jak
wasze własne zastrzeżenie o wynagrodzeniu za sukces
(`SCENARIUSZ-DEMO.md:96`): jury, które samo wyłapie przemilczenie, przestaje
wierzyć w resztę liczb.

Dlaczego to najwięcej daje: zero kodu, zero ryzyka regresji, a zdejmuje
jednocześnie największe zagrożenie operacyjne pokazu i jedno z trzech miejsc,
gdzie scena obiecuje więcej niż kod.

---

## Czego nie sprawdziłem

Nie uruchamiałem serwera, workera, bazy ani testów. Nie wykonywałem połączeń
ani zapytań do dostawców. Nie weryfikowałem, czy framework waliduje ciasteczka
`om_selected_tenant` i `om_selected_org` po stronie serwera, więc punkt 1.9
traktuję jako zarzut wobec zdania w README, a nie wobec bezpieczeństwa.
Nie sprawdzałem konta ElevenLabs, więc liczba "21 głosów"
(`ZGLOSZENIE-HACKON.md:167`) pozostaje nieweryfikowalna z kodu; katalog jest
pobierany, a nie zapisany (`src/modules/voicebot/lib/glosy.ts:30`).
Nie przeliczałem ponownie założeń biznesowych z `ANALIZA-WASKIE-GARDLO.md`.
