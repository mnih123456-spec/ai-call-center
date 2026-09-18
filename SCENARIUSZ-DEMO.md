# Scenariusz wystąpień

Dwa wystąpienia po 5-7 minut plus pytania. Ten sam produkt, dwie różne opowieści.
Wideo zapasowe obowiązkowe w obu ścieżkach.

---

# ŚCIEŻKA 03: Solve Your Real Problem

Kryteria: realność problemu i mierzalna wartość 30%, kompletność z wyjątkami 25%,
Open Mercato 20%, użyteczność dla ról 15%, przewaga nad obecnym 10%.

Wnioski: **najpierw liczby, potem wyjątki.** Efektowne UI tu nie punktuje.

## Minuta 0:00-0:45, problem

Mówisz od siebie, bez slajdu z definicją.

> Prowadzę kancelarię, która pomaga ludziom z umowami kredytowymi. Ludzie
> zostawiają zgłoszenie w formularzu, a potem ktoś musi do każdego zadzwonić,
> potwierdzić, że to ta osoba, uzyskać zgodę i ustalić, o jaki kredyt chodzi.
>
> `[LICZBA]` zgłoszeń miesięcznie. `[LICZBA]` procent nie odbiera za pierwszym
> razem. Jedna próba to `[LICZBA]` minut pracy człowieka.

**Kluczowe zdanie, powiedz je wolno:**

> Najgorsze jest to, co się dzieje, gdy ktoś oddzwoni. Trafia na przypadkową
> osobę, która nie wie, w jakiej sprawie dzwoniliśmy.

## Minuta 0:45-3:45, demo na żywo

Kolejność ma znaczenie. Pokazujesz to, za co są punkty za kompletność.

1. **Lista połączeń.** Pokaż, że to nie są nagrania do odsłuchania, tylko
   gotowe pola: produkt, bank, rok umowy, kwota, zgoda, tożsamość.
2. **Wiersz "Oddzwonienie".** To jest sedno. Pokaż parę wierszy Zieliński:
   pierwszy nieodebrany, drugi oddzwonienie. Powiedz:
   > Ta informacja, że nie odebrał za pierwszym razem, nie zniknęła. Oddzwonienie
   > doklejone jest obok, a nie zamiast.
3. **Nieznany dzwoniący.** Wiersz bez kampanii. Powiedz, że ktoś z reklamy też
   zostaje zapisany, tylko bez przypisania.
4. **Wyjątki.** Nieodebrane, zajęte, numer nieosiągalny. To jest te 25 procent
   za kompletność, więc nie przewijaj tego szybko.
5. **Role.** Przeloguj się na konto pracownika. Widzi wyniki, nie widzi przycisku
   zlecania połączeń.
   > Pracownik ogląda, ale nie uruchomi kosztownych połączeń.

## Minuta 3:45-4:45, liczby

> Koszt rozmowy widać w panelu, bo pobieramy go od dostawcy. Typowa rozmowa
> kwalifikacyjna to kilkanaście do kilkudziesięciu groszy.
>
> Człowiek robiący to samo: `[LICZBA]` minut razy `[STAWKA]` za godzinę.

**Porównanie przed i po:** `[DO UZUPEŁNIENIA]`

## Minuta 4:45-5:30, wdrożenie

> To nie jest prototyp na weekend. Stoi na Open Mercato, ma migracje,
> uprawnienia i rozdzielone firmy. W poniedziałek mogę to włączyć u siebie.

Zakończ ujawnieniem, samemu, zanim ktoś zapyta:

> Agent głosowy, prompty i numer telefonu istniały przede mną. Na hackatonie
> powstał cały moduł w Open Mercato: model danych, API, obsługa rozmów
> przychodzących i panel.

---

# ŚCIEŻKA 01: Showcase

Kryteria: efekt wow i jakość demo 30%, Open Mercato 25%, wartość biznesowa 20%,
innowacyjność 15%, kompletność 10%.

Wnioski: **zacznij od dzwoniącego telefonu.** Tu punktuje wrażenie.

## Minuta 0:00-1:00, wow

Nie tłumacz, co zbudowałeś. Zadzwoń.

1. Zlecasz połączenie z panelu na swój telefon.
2. Telefon dzwoni **na sali**. Odbierasz i rozmawiasz z botem na głośnomówiącym.
3. Rozłączasz się.

> Ta rozmowa właśnie wpada do systemu.

Odświeżasz listę, wiersz jest, z produktem i kwotą.

**Zapasowo:** jeśli sieć zawiedzie, masz nagranie. Nie improwizuj, przełącz się
na wideo bez tłumaczenia się.

## Minuta 1:00-3:00, co się pod tym dzieje

> Bot nie jest chatbotem, który gada. To jest maszyna do zamieniania rozmowy
> w rekord. Tu nie ma transkrypcji do czytania, są pola.

Pokaż kolejno: kampanie z listą agentów pobraną od dostawcy, połączenia
z wynikami, liczniki u góry łącznie z kosztem.

## Minuta 3:00-4:30, Open Mercato

To jest 25 procent, więc nazwij moduły wprost.

> Nie budowaliśmy platformy, tylko warstwę na niej. Z Open Mercato bierzemy
> logowanie, uprawnienia, rozdzielenie firm, migracje, komponenty panelu
> i system modułów. Core nie był ruszany, to overlay w `src/modules`.

## Minuta 4:30-5:30, dokąd to idzie

> Docelowo to produkt dla firm, każdy klient jako osobny tenant, ze swoim
> numerem i swoim CRM-em. Bot rozpoznaje firmę po numerze, na który ktoś
> zadzwonił.

Zakończ tym samym ujawnieniem, co w ścieżce 03.

---

# Przed wejściem na scenę

- [ ] Uruchomić dane demo: `node scripts/dane-demo.mjs`
- [ ] Sprawdzić, że tunel działa i adres zgadza się z ustawieniem w ElevenLabs
- [ ] Rozgrzać serwer: wejść na `/backend/voicebot` i `/backend/voicebot-calls`
- [ ] Wyłączyć drugi projekt, żeby nie zjadał pamięci
- [ ] Telefon naładowany, głośnomówiący sprawdzony
- [ ] Wideo zapasowe otwarte w drugiej karcie
- [ ] Zamknąć terminal i plik `.env`, żeby nie pokazać kluczy
