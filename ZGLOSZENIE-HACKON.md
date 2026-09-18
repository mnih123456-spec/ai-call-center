# Zgłoszenie do aplikacji HackOn

Do wklejenia w szkic projektu, gdy pojawi się w sobotę.
Miejsca oznaczone `[DO UZUPEŁNIENIA]` wymagają liczb, które zna tylko Michał.

Ścieżki: **03 Solve Your Real Problem** (główna) i **01 Showcase**.

---

## Nazwa

`[DO UZUPEŁNIENIA - nazwa nieustalona]`

W grze: Oddzwoni, Odbiera, Telefonistka, Dyżurka, Linia, Pierwszy Kontakt.

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
| Licznik kosztów rozmów | działa |
| Uprawnienia: podgląd oddzielony od zlecania połączeń | działa |
| Panel: kampanie oraz połączenia z wynikami | działa |

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

Planowane: `customers` do powiązania rozmów z kartami klientów.

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

- model danych, migracje i walidatory,
- cztery trasy API wraz z uprawnieniami,
- adapter dostawcy głosu z trybem symulacji,
- obsługa rozmów przychodzących i sklejanie oddzwonień,
- rozpoznawanie firmy po numerze, na który zadzwoniono,
- sprawdzanie podpisu webhooka wraz z ochroną przed odtworzeniem,
- licznik kosztów rozmów,
- dwa ekrany w panelu.

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

- [ ] Wybrać nazwę
- [ ] Uzupełnić trzy liczby i policzyć porównanie przed i po
- [ ] Przygotować zestaw danych demo
- [ ] Nagrać wideo zapasowe
- [ ] Napisać scenariusz wystąpienia, osobno dla ścieżki 03 i 01
