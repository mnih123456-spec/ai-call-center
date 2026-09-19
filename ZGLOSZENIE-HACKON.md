# Zgłoszenie do aplikacji HackOn

Do wklejenia w szkic projektu, gdy pojawi się w sobotę.
Liczby pochodzą z panelu raportów, okres 1-18 września 2026.

Ścieżki: **03 Solve Your Real Problem** (główna) i **01 Showcase**.

---

## Nazwa

**AI call center** (nazwa robocza)

Docelowa nieustalona. W grze: Oddzwoni, Odbiera, Telefonistka, Dyżurka,
Linia, Pierwszy Kontakt.

## Jedno zdanie

Voicebot telefoniczny dla firm, który dzwoni do leadów, odbiera ich telefony
i zapisuje wynik rozmowy jako gotowy, uporządkowany rekord w CRM.

## Krótki opis

Firmy kredytowe zbierają leady z formularzy i reklam, a potem ktoś musi do
każdego zadzwonić, potwierdzić tożsamość, uzyskać zgodę na rozmowę i ustalić,
o jaki produkt chodzi. Ta praca jest powtarzalna, kosztowna i bardzo źle
znosi skalę: ponad osiemdziesiąt procent nie odbiera za pierwszym razem,
a oddzwaniają wtedy, gdy akurat nikt nie siedzi przy telefonie.

Zbudowaliśmy na Open Mercato moduł, który tę pracę przejmuje. Bot dzwoni,
prowadzi rozmowę po polsku, a jej wynik trafia do systemu jako komplet pól,
nie jako nagranie do odsłuchania. Gdy ktoś oddzwoni na nasz numer, bot
odbiera, wie, w jakiej sprawie dzwoniliśmy, i dokleja rozmowę do tej samej
historii kontaktu.

---

## Problem, stan obecny

**Dane z panelu raportów kancelarii, okres 1-18 września 2026, czyli 18 dni:**

- **180 nowych kontaktów**
- **149 z nich na etapie "kontakt 2"**, czyli nie odebrali za pierwszym razem

To jest **82,8 procent nieodebranych przy pierwszej próbie**.

W przeliczeniu na pełny miesiąc: **300 kontaktów, 248 nieodebranych**,
czyli co najmniej **548 prób telefonicznych miesięcznie**.

| Krok dzisiaj | Gdzie |
|---|---|
| Lead wpada z formularza | strona, reklama |
| Ktoś musi go przedzwonić | telefon |
| Nie odbiera za pierwszym razem | **82,8% przypadków** |
| Próba druga i trzecia | telefon |
| Gdy oddzwoni, trafia na kogokolwiek | telefon |
| Przepisanie ustaleń do CRM | Bitrix24 |

Gdzie się sypie:

- Oddzwonienie trafia na osobę, która nie wie, w jakiej sprawie dzwoniliśmy.
- Informacja "nie odebrał" nigdzie nie zostaje, więc nie wiadomo, kogo ponowić.
- Ustalenia z rozmowy przepisuje człowiek, więc część z nich ginie.
- Po godzinach i w weekend nie odbiera nikt.

**Ile to kosztuje:**

Jedna próba to **4 minuty pracy**: wejść w kartę klienta, wybrać numer,
odczekać sygnały, wpisać notatkę, zamknąć. Tyle trwa nawet wtedy, gdy nikt
nie odbierze.

548 prób razy 4 minuty to **36,5 godziny miesięcznie**, czyli tydzień roboczy.

Koszt osoby: płaca minimalna plus 1000 zł premii, z narzutami pracodawcy
wychodzi około **40 zł za godzinę**.

**36,5 godziny razy 40 zł daje około 1480 zł miesięcznie** wydane na samo
wykręcanie numerów, w większości bez odbioru.

## Stan docelowy

| Krok po zmianie | Kto robi |
|---|---|
| Lead wpada do systemu | automat |
| Bot dzwoni z zachowaniem odstępu | automat |
| Wynik rozmowy zapisany polami | automat |
| Klient oddzwania, bot odbiera i zna kontekst | automat |
| Rozmowa doklejona do historii kontaktu | automat |
| Człowiek dzwoni tylko tam, gdzie warto | człowiek |

Koszt rozmowy u dostawcy jest mierzony i widoczny w panelu. Dla rozmów
wykonanych w trakcie prac wychodzi **około 0,30 zł za minutę**, czyli
kilkanaście groszy za typową rozmowę kwalifikacyjną.

## Porównanie przed i po

Na danych z września 2026, przeliczonych na pełny miesiąc:

| | Dziś, człowiek | Z botem |
|---|---|---|
| Prób telefonicznych | 548 | 548 |
| Czas pracy człowieka | **36,5 godziny** | około godziny na przegląd wyników |
| Koszt miesięczny | **~1480 zł** | **~110 zł** |
| Kto odbiera, gdy klient oddzwoni wieczorem | nikt | bot, i wie, w jakiej sprawie dzwoniliśmy |
| Gdzie ląduje ustalenie z rozmowy | notatka pisana ręcznie | pola w CRM, bez przepisywania |

Koszt bota policzony z rzeczywistych rachunków dostawcy: około 35 groszy za
rozmowę odbytą i 2 grosze za nieodebraną próbę.

**Różnica to około 1370 zł miesięcznie i tydzień roboczy odzyskany.**

Ale najważniejsza liczba jest inna. W tym samym okresie **12 kontaktów ze 180
doszło do podpisanej umowy**, czyli **co piętnasty lead**.

**Ile warta jest jedna umowa**, według cennika kancelarii:

| Produkt | Opłata wstępna | Wynagrodzenie za sukces |
|---|---|---|
| WIBOR | 3 000 zł | 30 000 zł |
| SKD | brak | 30% korzyści, minimum 10 000 zł |
| Kredyty walutowe | wg kapitału | 12 000 - 33 800 zł |

Przy obecnej strukturze spraw daje to **średnio około 20-25 tysięcy złotych
na umowę**.

**Uczciwe zastrzeżenie, które mówimy wprost:** wynagrodzenie za sukces jest
płatne **po wygranej sprawie**, a proces trwa latami. To nie jest gotówka od
ręki, tylko wartość, która dojrzewa. Natychmiast wpływa wyłącznie opłata
wstępna: 3 000 zł przy WIBOR, przy SKD zero.

Dlatego właściwe zdanie brzmi tak: każde piętnaście leadów uratowanych od
przepadnięcia to **jedna dodatkowa umowa warta dwadzieścia kilka tysięcy
w perspektywie procesu**, przy koszcie bota 110 zł miesięcznie.

Bot nie musi być lepszy od człowieka w rozmowie. Wystarczy, że dzwoni
w sekundę po zgłoszeniu, ponawia bez zmęczenia i odbiera, gdy klient
oddzwoni o dwudziestej drugiej.

Ale ważniejsze jest to, czego w tej tabeli nie widać: dziś lead, który nie
odbierze trzy razy, po prostu przepada. Bot próbuje dalej i odbiera, gdy ten
człowiek w końcu oddzwoni.

---

## Co dokładnie działa

| Funkcja | Stan |
|---|---|
| Kampanie połączeń, wybór agenta i numeru z listy dostawcy | działa |
| Zlecanie połączeń wychodzących | działa, przetestowane prawdziwym telefonem |
| Tryb symulacji bez klucza dostawcy | działa |
| Odbiór wyniku rozmowy webhookiem, z podpisem HMAC | działa |
| Rozpoznanie rozmowy przychodzącej | działa |
| Sklejanie oddzwonienia z wcześniejszą, nieodebraną próbą | działa |
| Rozpoznanie firmy po numerze, na który zadzwoniono | działa |
| Odporność na powtórzony webhook | działa |
| Licznik kosztów rozmów, w złotówkach | działa |
| Kolejka połączeń z odstępem, jedno naraz na kampanię | działa |
| Wczytywanie wklejonej listy kontaktów, dla firm bez CRM | działa |
| Zapis wyniku do Bitrix24: kontakt, szansa, wpis na osi czasu | działa, sprawdzone na żywo |
| Zapis wyniku do wbudowanego CRM Open Mercato | działa, sprawdzone na żywo |
| Wybór lejka i etapu w CRM klienta, z list pobranych z jego systemu | działa |
| Wybór głosu z katalogu, z odsłuchem | działa, 21 głosów |
| Własny głos firmy z nagranej próbki, ze zgodą zapisaną u nas | działa |
| Szyfrowanie żetonu dostępowego do CRM klienta | działa, sprawdzone na bazie |
| Blokada numerów premium i zagranicznych | działa |
| API dla systemu klienta, uwierzytelniane kluczem | działa |
| Uprawnienia: podgląd oddzielony od zlecania połączeń | działa |
| Panel: osiem ekranów | działa |

## Stos technologiczny

- **Open Mercato** jako platforma, moduł `voicebot` jako overlay w `src/modules/`
- Next.js, React, TypeScript
- MikroORM i PostgreSQL, migracje wersjonowane
- Redis, Meilisearch
- Zod do walidacji wejścia
- ElevenLabs Conversational AI jako silnik głosu
- Łącze SIP operatora ACTIO
- cloudflared jako tunel dla webhooka w trakcie demo

## Wykorzystane moduły i mechanizmy Open Mercato

- `auth` - sesje i uprawnienia, każde żądanie zakresowane tenantem
- `directory` - tenant i organizacja
- ACL modułu z zależnościami między uprawnieniami
- Kontener zależności i menedżer encji z kontekstu żądania
- Komponenty panelu: `Page`, `DataTable`, przyciski, warstwa tłumaczeń
- System migracji i snapshotów schematu
- Rejestr modułów i tras API z metadanymi uprawnień
- `customers` - rozmowy zapisują się na kartach klientów przez komendy
  domenowe modułu, nie przez bezpośredni zapis encji
- `api_keys` - klucze, którymi system klienta zleca połączenia
- Kolejki i workery frameworka - odstęp między rozmowami
- Szyfrowanie danych wrażliwych tenanta - żeton dostępowy do CRM klienta
- Komendy domenowe i dziennik zmian

---

# UJAWNIENIE

Regulamin wymaga wskazania, co istniało przed hackatonem, oraz podania
użytych narzędzi AI. Poniższe mówimy wprost, także na scenie.

## Co istniało przed hackatonem

Te elementy **nie powstały w trakcie wydarzenia**:

1. **Agent głosowy w ElevenLabs** wraz z promptami, w dwóch wariantach:
   wychodzącym i przychodzącym.
2. **Numer telefonu i łącze SIP** u operatora ACTIO.
3. **Konfiguracja scenariusza w Make**, używana wcześniej do tego samego
   procesu bez Open Mercato.
4. **Wiedza branżowa**: zestaw pól, które warto zebrać w rozmowie kredytowej.

## Co powstało na hackatonie

Cały kod modułu `voicebot` w Open Mercato, czyli:

- model danych, migracje, walidatory i mapa szyfrowania,
- trasy API wraz z uprawnieniami i kluczami dla systemów klienta,
- adapter dostawcy głosu z trybem symulacji,
- obsługa rozmów przychodzących i sklejanie oddzwonień,
- rozpoznawanie firmy po numerze, na który zadzwoniono,
- sprawdzanie podpisu webhooka wraz z ochroną przed odtworzeniem,
- kolejka połączeń z odstępem, oparta o kolejki frameworka,
- dwa złącza CRM za wspólnym interfejsem: Bitrix24 i wbudowany Open Mercato,
- obsługa głosów wraz z klonowaniem z próbki i zapisem zgody,
- blokada numerów o podwyższonej opłacie,
- licznik kosztów rozmów,
- osiem ekranów w panelu,
- 160 testów w 12 zestawach.

Historia commitów pokazuje daty i zakres każdej zmiany.

## Użyte narzędzia AI

- **Claude Code** (Anthropic) - główne narzędzie do pisania kodu
- **Codex CLI** (OpenAI) - drugi agent, zapasowy
- **Modele przez OpenRouter** - tanie i darmowe modele do zadań pobocznych
- **ElevenLabs Conversational AI** - silnik rozmowy głosowej, element produktu

Każdy fragment kodu napisanego przez AI jest opisany w `DZIENNIK-PRAC.md`
wraz z uzasadnieniem decyzji projektowej, którą realizuje.

## Dane

Demo działa na danych przygotowanych na potrzeby pokazu. Prawdziwe dane
klientów nie są używane.

---

## Do zrobienia przed demo

- [x] Nazwa robocza: AI call center. Docelowa nadal otwarta.
- [x] Liczby i porównanie przed i po (dane z 1-18.09.2026)
- [x] Przygotować zestaw danych demo (scripts/dane-demo.mjs, 13 rozmów)
- [ ] Nagrać wideo zapasowe
- [x] Napisać scenariusz wystąpienia (SCENARIUSZ-DEMO.md)
