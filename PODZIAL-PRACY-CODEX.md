# Podział pracy między Claude i Codexa

Cel: wyrobić się do niedzieli 11:00. Zadania są tak dobrane, żeby dwa agenty
nie pisały po tych samych plikach.

## Zasady wspólne

1. **Przed startem przeczytać** `..\DZIENNIK-PRAC.md`, części 3, 6 i 8.
   Tam jest uzasadnienie każdej decyzji, a jury może o nie zapytać.
2. **Nie ruszać core Open Mercato.** Wszystko dzieje się w `src/modules/voicebot/`.
   To warunek regulaminu obu ścieżek.
3. **Zakres tenanta bierze się z sesji**, nigdy z treści żądania. Wyjątkiem jest
   webhook, który nie ma sesji i rozpoznaje tenanta po numerze, na który
   zadzwoniono.
4. **Po zmianie encji:** `yarn db:generate`, obejrzeć SQL, dopiero potem pytać
   o `yarn db:migrate`.
5. **Sprawdzenie przed commitem:** `yarn typecheck`. Błędy w `agent_examples`
   są zastane i nie są nasze.
6. **Commit po polsku, bez polskich znaków**, opisujący DLACZEGO, nie tylko CO.
7. Jeden agent, jedno zadanie naraz. Po skończeniu dopisać wynik do dziennika.

## Stan na start

Sześć commitów na `main`. Działa: kampanie, połączenia wychodzące, rozmowy
przychodzące ze sklejaniem oddzwonień, licznik kosztów, podpis webhooka,
dwa ekrany panelu, dane demo.

---

# ZADANIA DLA CODEXA

Dobrane tak, żeby były samodzielne i dało się je sprawdzić bez pytania o zdanie.

## C1. Kolejka połączeń z odstępem

**Problem:** `minIntervalSecs` w kampanii jest zapisywane, ale nic go nie
pilnuje. Dziś można wystrzelić sto połączeń naraz, co jest kosztowne i wygląda
jak spam.

**Do zrobienia:** zadanie w kolejce, które bierze połączenia w stanie `pending`
i uruchamia po jednym na kampanię, z zachowaniem odstępu. Framework ma gotowy
mechanizm kolejek, szukać w `.ai/guides/` pod hasłem kolejek i zadań cyklicznych.

**Gotowe, gdy:** zlecenie pięciu połączeń w kampanii z odstępem 10 sekund
uruchamia je pojedynczo, a nie równolegle.

**Pułapka:** status `dialing` jest nadawany w chwili zlecenia. Kolejka musi
rozróżniać "czeka w kolejce" od "właśnie dzwoni", więc prawdopodobnie trzeba
faktycznie zacząć używać statusu `pending`, dziś nieużywanego.

**Pliki:** nowy katalog `src/modules/voicebot/jobs/` albo `subscribers/`,
plus `api/calls/route.ts` w miejscu nadawania statusu.

## C2. Wklejanie listy numerów do kampanii

**Problem:** nie każdy klient ma CRM. Dziś połączenie da się zlecić tylko
pojedynczo i tylko przez API. Klient bez CRM-u nie ma jak ruszyć kampanii.

**Do zrobienia:** w kampanii pole, do którego wkleja się listę, po jednym
kontakcie w wierszu, w postaci `numer, imię, nazwisko`. Po zatwierdzeniu
powstają połączenia w stanie `pending`, które podejmuje kolejka z zadania C1.

**Gotowe, gdy:** wklejenie dwudziestu wierszy tworzy dwadzieścia połączeń,
błędne numery są pokazane z powodem i **nie blokują** reszty listy.

**Pułapka:** numery trzeba przepuścić przez `lib/phone.ts`, bo ludzie wklejają
je w każdej możliwej postaci: ze spacjami, z myślnikami, bez prefiksu.
Walidator wymaga E.164 z plusem.

**Pliki:** `api/calls/route.ts` (nowa trasa zbiorcza albo tryb wsadowy),
`backend/page.tsx`.

## C3. Ekran przeglądu

**Problem:** panel ma listy, nie ma widoku zbiorczego. Konkurencja ma "Przegląd"
jako pierwszą pozycję menu, a w ścieżce Showcase wygląd waży 30 procent.

**Do zrobienia:** strona `backend/voicebot-przeglad/` z kaflami: rozmowy dziś
i w tym tygodniu, skuteczność dodzwonień, liczba oddzwonień, koszt dziś
i w miesiącu, rozkład produktów.

**Gotowe, gdy:** strona działa na danych z `scripts/dane-demo.mjs`, obsługuje
stan pusty i stan ładowania.

**Pułapka:** framework rejestruje podstrony **bez przedrostka modułu**, więc
katalog musi nazywać się `voicebot-przeglad`, a nie `przeglad`. Inaczej adres
koliduje z innymi modułami. To samo wyszło wcześniej przy `voicebot-calls`.

**Pliki:** nowy katalog w `backend/`, ewentualnie nowa trasa w `api/`.

## C4. Wybór agenta i numeru przy edycji kampanii

**Problem:** kampanię da się założyć, ale nie da się jej zmienić. Przy pomyłce
w numerze trzeba zakładać nową. Tak właśnie 16.09 telefon poszedł ze starego
numeru testowego.

**Do zrobienia:** edycja kampanii z tymi samymi listami wyboru co przy
zakładaniu, plus zmiana statusu (`draft`, `running`, `paused`, `finished`).

**Gotowe, gdy:** zmiana numeru w istniejącej kampanii działa, a kolejne
połączenie idzie z nowego numeru.

**Pułapka:** walidator `campaignUpdateSchema` już istnieje w
`data/validators.ts`, ale nie ma trasy, która go używa. Zacząć od niego.

**Pliki:** `api/campaigns/route.ts` (metoda PUT), `backend/page.tsx`.

---

# ZADANIA DLA CLAUDE

Zostają u mnie, bo dotykają rzeczy, które już mam w głowie.

## K4. Profil agenta per tenant i widok dla admina

Klient nie pisze promptu, tylko **dodaje pytania** do scenariusza rozmowy
i podaje adres swojej strony. Prompt jest nasz i sprawdzony. Z tego wynika,
ze kazdy tenant ma wlasnego agenta w ElevenLabs, utworzonego z szablonu.

Potrzebne: encja profilu agenta per tenant (identyfikator agenta, lista pytan
klienta, zrodlo wiedzy, stan) oraz ekran dla admina pokazujacy, ktory tenant
ma ktorego agenta i ktory numer. Bez tego nie da sie niczego zdiagnozowac,
gdy klient zadzwoni z pretensja.

Dzis identyfikator agenta siedzi przy kampanii, czyli o poziom za nisko.

## K1. Podpięcie złącza Bitrix do webhooka

Interfejs `lib/crm.ts`, realizacja `lib/crm-bitrix.ts` i encja
`VoiceCrmConnection` są gotowe. Zostało: ekran do wpisania adresu, trasa API
do zapisu i sprawdzenia połączenia, oraz wywołanie złącza po zapisaniu wyniku
rozmowy, za bramką `czyWartoZakladac`.

## K2. Powiązanie rozmów z kartami klientów z modułu `customers`

To jest punktowane w kryterium "wykorzystanie Open Mercato", warte 20 procent
w ścieżce 03. Wymaga przeczytania faktów modułu `customers` i użycia
identyfikatorów, nie relacji ORM między modułami.

## K3. Szyfrowanie adresu webhooka Bitriksa

Pole `webhook_url` zawiera żeton, czyli hasło. Przed wpisaniem tam czegokolwiek
prawdziwego trzeba objąć kolumnę mapą szyfrowania modułu.

---

# Czego NIE robimy przed demem

- Wiedzy z linku, czyli uczenia bota o firmie z jej strony. Efektowne, ale to
  ozdoba, a nie rdzeń.
- Wdrożenia na serwer. Demo jest z laptopa plus wideo zapasowe.
- Telefonicznego API Bitriksa z nagraniami. Komentarz na osi czasu wystarczy.

# Uwaga o Codexie w tej sesji

Serwer MCP `codex` nie podłączył się do tego czatu (błąd: połączenie zamknięte).
Nie znaczy to, że Codexa nie ma. Uruchamia się go osobno komendą `codex`
w katalogu `D:\ai\cc\hackon\om-voicebot`, a darmowy model przez
`codex --profile darmowy`.
