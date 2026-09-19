# Krytyka modułu voicebot

Przegląd kodu z 19.09.2026. Kolejność: zagrożenia dla pokazu, izolacja firm, obietnice bez pokrycia. Ścieżki odnoszą się do katalogu głównego repozytorium. Nie wykonywałem połączeń, operacji na bazie ani zapytań do dostawców. Nie sprawdzałem konfiguracji działającego tunelu. Nie uruchamiałem pełnej walidacji generującej pliki. Jedyny wykonany eksperyment to uruchomienie istniejącego walidatora limitów w pamięci procesu Node.

## 3. Co pęknie podczas pokazu na żywo

### 1. Utrata webhooka zostawia rozmowę i zajęty limit na zawsze

**Krytyczne dla kolejnych telefonów przy ustawionym limicie równoczesnych rozmów.**

Lokalizacje: `src/modules/voicebot/lib/dispatch-call.ts:42`, `src/modules/voicebot/lib/dispatch-call.ts:32`, `src/modules/voicebot/lib/dispatch-call.ts:78`, `src/modules/voicebot/lib/limity.ts:122`.

Po przyjęciu telefonu przez dostawcę rekord dostaje `conversationId`, ale nadal ma status `dialing`. Jeśli webhook nie przejdzie przez cloudflared, mechanizm wygaszania go nie znajdzie, bo wymaga `conversationId: null`. Licznik równoczesnych rozmów nadal go uwzględnia, a następne zadania odkładają się co 30 sekund bez końca. Limit 1 wystarczy, żeby jeden utracony webhook zatrzymał dalszą kampanię. Bez limitu kolejne telefony mogą ruszyć, ale wynik pierwszego pozostanie zawieszony.

Nawet wariant bez `conversationId` nie ma samodzielnego zegara naprawczego: wygaszenie uruchamia dopiero inne zadanie `pending` tej samej kampanii. Ponowienie zadania zawieszonej rozmowy kończy się wcześniej, na sprawdzeniu statusu. Endpoint `src/modules/voicebot/api/calls/dispatch/route.ts:33` publikuje tylko `pending`, więc nie naprawia tego stanu. Potrzebne jest uzgadnianie wyników z dostawcą albo jawna operacja odzyskania rozmowy.

### 2. Zapis pustych limitów blokuje kampanię, zamiast zdjąć ograniczenia

Lokalizacje: `src/modules/voicebot/data/validators.ts:192`, `src/modules/voicebot/backend/voicebot-limity/page.tsx:107`, `src/modules/voicebot/lib/limity.ts:49`, `src/modules/voicebot/lib/dispatch-call.ts:80`.

Użytkownik widzi „Puste pole znaczy bez limitu”, ale pierwsza gałąź unii Zod wykonuje konwersję liczbową przed obsługą pustej wartości: zarówno `''`, jak i `null` stają się `0`. Potwierdzone na rzeczywistym `limitsSchema`: wszystkie trzy puste pola zwracają zera. Zapisanie formularza choćby tylko w celu zmiany limitu równoczesności ustawia puste minuty na zero. Worker uznaje limit miesięczny za wyczerpany i zamyka oczekujące telefony jako `failed`.

Późniejsze podniesienie limitu nie przywraca tych rekordów do kolejki. W module nie ma operacji ponowienia `failed`; trzeba tworzyć nowe zlecenia. To błąd zarówno obietnicy interfejsu, jak i przygotowania pokazu.

### 3. Awaria CRM po rozmowie jest nieodwracalna przez ponowienie webhooka

Lokalizacje: `src/modules/voicebot/api/webhook/route.ts:329`, `src/modules/voicebot/api/webhook/route.ts:354`, `src/modules/voicebot/api/webhook/route.ts:371`, `src/modules/voicebot/api/webhook/route.ts:375`.

Rozmowa zostaje zapisana jako `completed` przed wysłaniem do CRM. Jeśli potem CRM nie odpowie, zapisuje się błąd; jeśli proces padnie między zapisem rozmowy a wysyłką, może nie być nawet błędu. Każde ponowienie webhooka kończy się odpowiedzią `duplicate`, bez ponowienia eksportu. Panel nie ma akcji ponownego wysłania wyniku. Na pokazie telefon może się udać, ale zapowiedziana karta klienta nie powstanie nawet po naprawieniu połączenia z CRM. Brakuje osobnego, trwałego stanu wysyłki i możliwości jej ponowienia.

### 4. Pięć nieudanych prób zużywa całą godzinę testów

Lokalizacje: `src/modules/voicebot/api/calls/test/route.ts:63`, `src/modules/voicebot/api/calls/test/route.ts:70`, `src/modules/voicebot/api/calls/test/route.ts:92`, `src/modules/voicebot/api/calls/test/route.ts:105`.

Limit testów liczy wszystkie rekordy `isTest`, również te zakończone błędem dostawcy lub odrzucone przez politykę numerów. Rekord powstaje przed próbą telefonu. Pięć kliknięć podczas awarii sieci albo poprawiania konfiguracji wyłącza „Zadzwoń” dla organizacji do czasu wygaśnięcia godzinnego okna. Naprawa dostawcy, odświeżenie strony i zmiana kampanii nic nie dają; formularz limitów nie steruje tym stałym limitem. Przed pokazem trzeba uwzględnić także nieudane próby z próby generalnej.

### 5. Interfejs ukrywa awarię publikacji do kolejki

Lokalizacje: `src/modules/voicebot/lib/call-queue.ts:51`, `src/modules/voicebot/api/calls/import/route.ts:122`, `src/modules/voicebot/backend/voicebot-import/page.tsx:11`, `src/modules/voicebot/backend/voicebot-import/page.tsx:77`, `src/modules/voicebot/backend/voicebot-import/page.tsx:145`.

Użytkownik widzi „Dodano do kolejki”, a naprawdę zapis do bazy mógł się udać przy nieudanej publikacji zadań. API zwraca `queuePending`, ale ekran go nie obsługuje i usuwa wklejoną listę. Jest endpoint naprawczy `/calls/dispatch`, lecz żaden ekran modułu go nie wywołuje. Ponowny import tych samych kontaktów może opublikować oczekujące rekordy, ale wymaga ponownego wklejenia listy i wiedzy o tym ukrytym zachowaniu. Brakuje widocznego błędu oraz przycisku ponowienia publikacji.

## 2. Gdzie dane jednej firmy mogą wyciec do drugiej

### 6. Własny profil lub kampania pozwala przejąć cudzego agenta

Lokalizacje: `src/modules/voicebot/api/agents/route.ts:122`, `src/modules/voicebot/api/agents/route.ts:131`, `src/modules/voicebot/api/agents/route.ts:185`, `src/modules/voicebot/api/campaigns/route.ts:83`, `src/modules/voicebot/commands/campaigns.ts:39`.

Zakres lokalnego rekordu jest sprawdzany, ale własność przekazanego `agentId` już nie. Firma z uprawnieniem zarządzania kampaniami może podać identyfikator cudzego agenta, zapisać go we własnym profilu, a następnie zmienić mu prompt i ustawienia przez wspólny klucz dostawcy. Może też utworzyć własną kampanię z cudzym agentem i zadzwonić nim, potencjalnie uzyskując odpowiedzi oparte na cudzej wiedzy. Ukrycie listy agentów w interfejsie nie zamyka tej drogi. Sprawdzenie musi dotyczyć uprawnienia do zewnętrznego zasobu, nie tylko właściciela lokalnego wiersza.

### 7. Numery nadal wyciekają przez limity, a zapis limitów usuwa zawężenie

Lokalizacje: `src/modules/voicebot/api/limits/route.ts:13`, `src/modules/voicebot/api/limits/route.ts:53`, `src/modules/voicebot/api/limits/route.ts:87`, `src/modules/voicebot/backend/voicebot-limity/page.tsx:64`, `src/modules/voicebot/lib/limity.ts:159`, `src/modules/voicebot/api/provider/route.ts:44`.

`GET /limits` zwraca pełne `numeryKonta` z konta dostawcy każdemu użytkownikowi z `voicebot.campaigns.view`, niezależnie od zawężenia `/provider`. Ponadto ekran limitów wysyła tylko trzy progi, bez `allowedNumbers`, a serwer traktuje brak tego pola jako skasowanie listy. Zwykłe zapisanie minut usuwa więc wcześniejsze przypisanie numerów. Przy pustej konfiguracji wdrożenia filtr przepuszcza wszystkie numery; przy konfiguracji globalnej wszystkie firmy dostają tę samą listę zastępczą.

### 8. Pełna lista agentów nadal wychodzi dwoma endpointami

Lokalizacje: `src/modules/voicebot/api/agents/route.ts:65`, `src/modules/voicebot/api/provider/route.ts:40`, `src/modules/voicebot/lib/provider.ts:112`.

`/agents` zwraca nieprzefiltrowane `katalog.agents`. `/provider` kopiuje cały katalog i podmienia tylko `numbers`, zachowując wszystkich agentów. To wciąż ujawnia nazwy i identyfikatory botów innych firm. Wspominam ponownie znany wcześniej problem, ponieważ w przejrzanym stanie repozytorium nadal występuje w obu odpowiedziach API.

### 9. Można przypisać cudzy sklonowany głos mimo filtrowania listy

Lokalizacje: `src/modules/voicebot/api/voices/route.ts:39`, `src/modules/voicebot/api/voices/route.ts:141`, `src/modules/voicebot/api/voices/route.ts:149`.

Odczyt filtruje prywatne głosy, ale zapis sprawdza tylko własność kampanii. Dowolny podany `voiceId` trafia do dostawcy bez potwierdzenia, że głos jest katalogowy lub należy do bieżącej firmy i organizacji. Znając identyfikator cudzego klonu, firma może użyć go we własnym agencie. Jest to obejście izolacji zasobu; nie wymaga dostępu do lokalnego rekordu właściciela głosu.

### 10. Właściciela połączenia przychodzącego wybiera najnowsza kampania z danym numerem

Lokalizacje: `src/modules/voicebot/api/campaigns/route.ts:84`, `src/modules/voicebot/commands/campaigns.ts:39`, `src/modules/voicebot/api/webhook/route.ts:103`, `src/modules/voicebot/api/webhook/route.ts:304`, `src/modules/voicebot/api/webhook/route.ts:314`.

Tworzenie i edycja kampanii przyjmują dowolny `phoneNumberId`, bez kontroli jego przypisania do firmy. Webhook ustala właściciela przez globalne wyszukanie najnowszej kampanii z tym numerem. Firma B może więc założyć kampanię z numerem A i skierować kolejne niepowiązane połączenia przychodzące do własnego tenanta, wraz z wynikiem i odnośnikiem do nagrania. Dla wychodzących połączeń A może to zamiast wycieku spowodować odrzucanie webhooków jako konflikt tenanta. Numer potrzebuje jednoznacznego, zaufanego przypisania; kampania tworzona przez klienta nie może być takim rejestrem.

### 11. Bez sekretu publiczny webhook pozwala podmienić powiązanie z nagraniem

Lokalizacje: `src/modules/voicebot/api/webhook/route.ts:53`, `src/modules/voicebot/api/webhook/route.ts:272`, `src/modules/voicebot/api/webhook/route.ts:280`, `src/modules/voicebot/api/webhook/route.ts:333`, `src/modules/voicebot/api/calls/recording/route.ts:38`, `src/modules/voicebot/api/calls/transcript/route.ts:43`.

**Do sprawdzenia: czy działające wdrożenie ma ustawiony `VOICEBOT_WEBHOOK_SECRET`.** W kodzie jego brak oznacza akceptację niepodpisanych żądań, a nie odmowę. Wystarczy pominąć metadane numeru, żeby kontrola zgodności tenanta nie zadziałała. Żądanie może wskazać własny, jeszcze niezakończony rekord przez `lead_id`, ale nadać mu cudzy `conversation_id`. Późniejszy odczyt nagrania lub transkrypcji przejdzie kontrolę własności lokalnego rekordu i pobierze cudzą rozmowę wspólnym kluczem. Ten scenariusz wymaga znajomości cudzego identyfikatora rozmowy; nie twierdzę, że moduł sam ujawnia ich pełną listę.

### 12. Webhook miesza organizacje wewnątrz tenanta

Lokalizacje: `src/modules/voicebot/api/webhook/route.ts:119`, `src/modules/voicebot/api/webhook/route.ts:168`, `src/modules/voicebot/api/webhook/route.ts:208`, `src/modules/voicebot/api/webhook/route.ts:280`.

Wyszukanie poprzedniej próby, wcześniejszego rekordu CRM oraz aktywnego połączenia CRM ogranicza się do `tenantId`, bez `organizationId`. Oddzwonienie w organizacji B może przez to odziedziczyć imię, nazwisko i referencję sprawy z organizacji A. Wybór aktywnego CRM może wskazać konfigurację innej organizacji; zakres przekazany jako kontekst odszyfrowania nie jest filtrem własności widocznym w tym zapytaniu. Kontrola zgodności webhooka również porównuje tylko tenantów. To naruszenie granicy organizacji, nie dowód samodzielnego obejścia granicy dwóch różnych tenantów. Faktyczny skutek wysyłki do obcego CRM przy szyfrowaniu organizacyjnym pozostaje **do sprawdzenia**.

### 13. Czytanie strony pozwala wyjść poza publiczny internet

Lokalizacje: `src/modules/voicebot/lib/wiedza.ts:93`, `src/modules/voicebot/lib/wiedza.ts:115`, `src/modules/voicebot/lib/wiedza.ts:130`, `src/modules/voicebot/api/agents/create/route.ts:131`.

Adres jest sprawdzany wyłącznie tekstowo po nazwie hosta. Pobranie śledzi przekierowania bez ponownej kontroli adresu i nie weryfikuje adresów IP rozwiązanych przez DNS. Publiczna strona kontrolowana przez klienta może przekierować serwer na prywatny endpoint. Uzyskana treść trafia do modelu streszczającego, a streszczenie wraca do klienta jako wiedza firmy. Możliwość dostępu do konkretnych danych innych firm w sieci laptopa jest **do sprawdzenia**, ale sama droga SSRF wynika z kodu. Dodatkowo limit rozmiaru jest sprawdzany dopiero po wczytaniu całej odpowiedzi do pamięci.

## 1. Czy coś tu obiecuje więcej, niż robi

### 14. Nowy bot „zna stronę firmy” tylko w naszej bazie

Lokalizacje: `src/modules/voicebot/api/agents/create/route.ts:62`, `src/modules/voicebot/api/agents/create/route.ts:71`, `src/modules/voicebot/api/agents/create/route.ts:87`, `src/modules/voicebot/lib/nowy-agent.ts:41`, `src/modules/voicebot/backend/voicebot-agenci/page.tsx:237`.

**Użytkownik widzi „zna stronę firmy” i może rozwinąć „Co bot wie o firmie”, ale kreator zapisuje streszczenie wyłącznie w `VoiceAgentProfile`, a funkcja tworząca agenta dostaje tylko nazwę firmy i branżę.** Nie ma późniejszego wysłania wiedzy w tej ścieżce. Dopiero osobne „Zapisz i przekaż botowi” wykonuje synchronizację. Pierwsze połączenie bezpośrednio po kreatorze nie ma więc wiedzy, którą panel już prezentuje jako wiedzę bota.

### 15. Zmiana branży nie zmienia podstawowego scenariusza rozmowy

Lokalizacje: `src/modules/voicebot/api/agents/route.ts:126`, `src/modules/voicebot/api/agents/route.ts:185`, `src/modules/voicebot/lib/scenariusz.ts:61`, `src/modules/voicebot/lib/nowy-agent.ts:84`, `src/modules/voicebot/backend/voicebot-agenci/page.tsx:362`.

**Użytkownik zmienia branżę i klika „Zapisz i przekaż botowi”, ale zapis dokleja nowy słownik, zachowując dawny cel rozmowy i powitanie.** Pełny scenariusz branży jest wybierany tylko przy tworzeniu agenta. Co więcej, pierwotny słownik jest wtedy częścią tekstu bez znacznika sekcji, więc późniejsza synchronizacja go nie usuwa. Bot przeniesiony z branży kredytowej do innej może nadal prowadzić stary wywiad, uzupełniony jedynie o nowe słownictwo.

### 16. Limit liczby głosów jest dekoracją

Lokalizacje: `src/modules/voicebot/backend/voicebot-limity/page.tsx:129`, `src/modules/voicebot/lib/limity.ts:72`, `src/modules/voicebot/api/voices/route.ts:86`.

**Użytkownik ustawia „Liczba głosów”, ale endpoint klonowania wykonuje płatną operację bez odczytu limitu i liczby istniejących głosów.** Funkcja `ocenGlosy` nie ma wywołania w produkcyjnej ścieżce modułu. Jedna firma może zużyć wspólne sloty dostawcy mimo widocznego ograniczenia.

### 17. „Szkic” jest wykonywalną kampanią

Lokalizacje: `src/modules/voicebot/backend/page.tsx:88`, `src/modules/voicebot/api/campaigns/route.ts:86`, `src/modules/voicebot/api/calls/import/route.ts:111`, `src/modules/voicebot/lib/dispatch-call.ts:36`.

**Użytkownik widzi kampanię jako „Szkic”, ale import kontaktów publikuje zadania, a worker jawnie dopuszcza wykonywanie telefonów w stanie `draft`.** Nie ma obowiązkowego przejścia do „W toku” przed rozpoczęciem połączeń. Przy przygotowywaniu danych do pokazu samo wczytanie listy może uruchomić telefony wcześniej niż operator zamierzał.

### 18. Testowa rozmowa trafia do CRM i statystyk jak rzeczywista

Lokalizacje: `src/modules/voicebot/api/calls/test/route.ts:29`, `src/modules/voicebot/api/calls/test/route.ts:84`, `src/modules/voicebot/api/webhook/route.ts:375`, `src/modules/voicebot/api/stats/route.ts:22`.

**Użytkownik uruchamia „Połączenie testowe”, ale oznaczenie `isTest` nie powstrzymuje wysyłki do CRM ani nie wyłącza rozmowy ze statystyk przeglądu.** Webhook bezwarunkowo przechodzi do wysyłki, jeżeli treść spełnia warunki CRM, a zapytanie statystyk nie filtruje `isTest`. Próba generalna może tworzyć fikcyjne kontakty i zniekształcić liczby pokazywane na scenie; deklarowane w komentarzu endpointu oddzielenie testów nie jest wykonane.

### 19. Awaria transkrypcji udaje brak zapisu rozmowy

Lokalizacje: `src/modules/voicebot/lib/rozmowa.ts:36`, `src/modules/voicebot/lib/rozmowa.ts:49`, `src/modules/voicebot/api/calls/transcript/route.ts:44`, `src/modules/voicebot/backend/PodgladRozmowy.tsx:78`.

**Użytkownik widzi „Dostawca nie udostępnił zapisu tej rozmowy”, ale identyczną odpowiedź dostaje przy timeoutach, odrzuconym kluczu i błędach serwera dostawcy.** Biblioteka zamienia wszystkie te awarie na pustą tablicę, a nasze API odpowiada sukcesem. Na pokazie operator nie odróżni rozmowy bez transkrypcji od chwilowej awarii, którą warto ponowić.
