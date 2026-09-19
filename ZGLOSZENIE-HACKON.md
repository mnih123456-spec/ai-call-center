# Zgłoszenie do aplikacji HackOn

Do wklejenia w szkic projektu, gdy pojawi się w sobotę.
Miejsca oznaczone `[DO UZUPEŁNIENIA]` wymagają liczb, które zna tylko Michał.

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
znosi skalę: połowa osób nie odbiera za pierwszym razem, a oddzwaniają
wtedy, gdy akurat nikt nie siedzi przy telefonie.

Zbudowaliśmy na Open Mercato moduł, który tę pracę przejmuje. Bot dzwoni,
prowadzi rozmowę po polsku, a jej wynik trafia do systemu jako komplet pól,
nie jako nagranie do odsłuchania. Gdy ktoś oddzwoni na nasz numer, bot
odbiera, wie, w jakiej sprawie dzwoniliśmy, i dokleja rozmowę do tej samej
historii kontaktu.

---

## Problem, stan obecny

Kto traci czas: `[DO UZUPEŁNIENIA - kto u ciebie dzwoni do leadów]`

| Krok dzisiaj | Gdzie |
|---|---|
| Lead wpada z formularza | strona, reklama |
| Ktoś musi go przedzwonić | telefon |
| Nie odbiera za pierwszym razem | `[DO UZUPEŁNIENIA - jaki procent]` |
| Próba druga i trzecia | telefon |
| Gdy oddzwoni, trafia na kogokolwiek | telefon |
| Przepisanie ustaleń do CRM | Bitrix24 |

Gdzie się sypie:

- Oddzwonienie trafia na osobę, która nie wie, w jakiej sprawie dzwoniliśmy.
- Informacja "nie odebrał" nigdzie nie zostaje, więc nie wiadomo, kogo ponowić.
- Ustalenia z rozmowy przepisuje człowiek, więc część z nich ginie.
- Po godzinach i w weekend nie odbiera nikt.

Ile to kosztuje: `[DO UZUPEŁNIENIA - liczba leadów miesięcznie, czas jednej
próby, koszt godziny pracy]`

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

`[DO UZUPEŁNIENIA - wyliczenie na podstawie trzech liczb powyżej]`

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
| Panel: sześć ekranów | działa |

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
- sześć ekranów w panelu,
- 44 testy w 5 zestawach.

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
- [ ] Uzupełnić trzy liczby i policzyć porównanie przed i po
- [x] Przygotować zestaw danych demo (scripts/dane-demo.mjs, 13 rozmów)
- [ ] Nagrać wideo zapasowe
- [x] Napisać scenariusz wystąpienia (SCENARIUSZ-DEMO.md)
