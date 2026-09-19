# Kroki demo: nowy klient od zera do rozmowy

Do przeklikania na próbie i jutro na scenie. Każdy krok ma to, co klikasz,
i to, co ma się stać. Jeśli coś nie zagra, na dole jest sekcja "Gdy coś pójdzie
nie tak".

---

## Przed startem (5 minut przed)

1. Trzy rzeczy muszą chodzić: baza (`docker compose up -d`), panel (`yarn dev`),
   tunel (`cloudflared tunnel --url http://127.0.0.1:3000`).
2. Jeśli panel był restartowany, wejdź raz na każdy ekran z listy niżej, żeby
   się skompilowały. Pierwsze wejście trwa kilka sekund, drugie jest natychmiastowe.
3. Zaloguj się: `localhost:3000/login`, `superadmin@acme.com` / `secret`.
4. W nagłówku, po prawej: **Widok klienta**. Menu zostaje tylko z pozycjami
   voicebota. Obok jest oczko: włącz, gdy na ekranie mają być numery telefonów.
5. Telefon, na który bot ma zadzwonić, leży obok, odblokowany, z włączonym
   głośnikiem.

---

## Ścieżka klienta (3 minuty)

### 1. Nowy klient

Menu: **Nowy klient** (widoczne w widoku admina; w widoku klienta wejdź
adresem `/backend/voicebot-nowa-firma`).

| Pole | Co wpisać |
|---|---|
| Nazwa firmy | np. `Solar Nowak` |
| Branża | **Fotowoltaika i pompy ciepła** |
| Adres strony | puste, albo prawdziwa strona, jeśli chcesz pokazać "Co bot wie o firmie" |

Kliknij **Załóż konto i bota**. Po kilku sekundach: komunikat "Bot założony
i dostosowany do firmy" i przycisk **Dalej: ustaw pytania dla bota**.

Co mówisz: *"Firma podaje nazwę i branżę. W minutę ma bota, który przedstawia
się jej nazwą i zna słownictwo jej branży."*

Wariant na pytanie z sali "a jak mojej branży nie ma na liście": wybierz
**Inna branża, opiszę ją sam**, pojawia się pole na opis. Wpisz dwa zdania,
np. `Szkoła językowa dla dorosłych. Bot dzwoni do osób, które zostawiły numer
na stronie, żeby umówić bezpłatną lekcję próbną.` Ten tekst idzie do
scenariusza bota.

### 2. Pytania bota

Przycisk **Dalej** otwiera od razu kartę bota z gotowymi pytaniami branży:

```
Czy ma Pan już instalację, czy dopiero planuje?
Czym ogrzewa Pan dom?
Jaki jest roczny rachunek za prąd?
Czy budynek jest Pana własnością?
Jaka jest powierzchnia dachu i jego strona świata?
Kiedy technik może zadzwonić po szczegóły?
```

Zmień jedno pytanie albo dopisz własne, np. `Czy interesuje Pana też magazyn
energii?`. Kliknij **Zapisz i przekaż botowi**. Komunikat: "Pytania przekazane
do agenta. Bot zbierze 7 odpowiedzi."

Co mówisz: *"Każde pytanie to jedna kolumna w wynikach. Klient dopisuje
pytanie i dostaje kolumnę, bez programisty."*

### 3. Rozmowa próbna

Menu: **Kampanie głosowe**. Sekcja "Połączenie testowe": kampania jest już
wybrana (`Solar Nowak - kampania startowa`). Wpisz numer telefonu. **Zadzwoń**.

Telefon dzwoni w 5 do 15 sekund. Bot mówi:

> Dzień dobry, z tej strony wirtualna asystentka Solar Nowak. Dzwonię
> w sprawie zgłoszenia o wycenę instalacji. Czy rozmawiam z osobą, która je
> zostawiła?

Odpowiadaj krótko i wyraźnie: "tak", "dopiero planuję", "gazem", "cztery
tysiące rocznie", "tak, mój", "sto metrów, południe", "jutro rano", "tak".
Bot kończy: podziękowanie i rozłączenie.

Co mówisz w trakcie: nic. Niech sala słucha bota.

### 4. Połączenia i wyniki

Menu: **Połączenia i wyniki**. Wiersz z rozmową pojawia się do 30 sekund po
rozłączeniu (wynik wraca przez tunel). Kolumny: Kiedy, Rozmówca, Numer,
Status, po jednej kolumnie na każde pytanie, Czas, Koszt, Rozmowa.

Co mówisz: *"To nie nagranie do odsłuchania. To rekord: rachunek za prąd
cyframi, właściciel tak lub nie, termin. Gotowe do CRM."*

Kliknij **Rozmowa** przy wierszu: transkrypcja i nagranie, na dowód.

---

## Drugi bot, druga branża (jeśli jest czas)

Powtórz kroki 1 do 4 z branżą **Gabinet lekarski lub stomatologiczny** i nazwą
np. `Dentysta Kowalczyk`. Pytania: pierwsza czy kolejna wizyta, specjalista,
NFZ czy prywatnie, termin, pora dnia. Bot przedstawia się nową nazwą
i pyta o zupełnie inne rzeczy. To pokazuje, że branża to dane, nie kod.

---

## Gdy coś pójdzie nie tak

| Objaw | Co robić |
|---|---|
| Żółty dymek "Runtime error detected" u góry | Zamknij. To sonda panelu deweloperskiego, dane idą normalnie. Po restarcie panelu dymek jest wyłączony. |
| Telefon nie dzwoni po 30 s | Sprawdź w panelu dostawcy ostatnią rozmowę. "SIP 403 Auth Failed" to operator ACTIO, nie my. Numer testowy +48457112147 jest zablokowany od 19.09 wieczór; rozmowy próbne idą z numeru produkcyjnego 48732129033. |
| Bot mówi po angielsku albo czyta "zakończ połączenie" | Zły model. Pytania bota, pole modelu na dole karty (widzi je operator), ustaw **GPT-4.1 mini**, Zapisz. Nie wybieraj Gemini 2.5 Flash. |
| Bot dwa razy mówi "dzień dobry" | Stary scenariusz. Pytania bota, **Zapisz i przekaż botowi**, to odświeża reguły. |
| Wiersz w tabeli nie pojawia się | Tunel padł. Nowy tunel, nowy webhook u dostawcy, nowy sekret w `.env`, restart panelu. Opis w STAN.md. Na scenie: pokaż wiersz z próby generalnej. |
| Bot przekręca rzadkie słowo (marka auta) | Rozpoznawanie mowy dostawcy. Powtórz wyraźniej. Na sali: "słowa kluczowe branży poprawiają rozpoznawanie, to jedno z ograniczeń dostawcy". |
| "Wykonano już N połączeń testowych" | Limit podniesiony do 60 na godzinę, nie powinno wystąpić. |

## Restart panelu (gdy trzeba)

```
for /f "tokens=5" %p in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %p /F
yarn dev
```

Tunel zostaje, nie restartuj go bez potrzeby.

---

## Stan na 19.09, 20:15

- Pełna ścieżka sprawdzona na żywo raz, na bocie samciągpług (motoryzacja).
- Model: GPT-4.1 mini na wszystkich botach.
- Numer rozmów próbnych: ACTIO produkcja 48732129033. Pula numerów dla nowych
  kampanii ograniczona do tego numeru; nowa firma nie dostaje własnego numeru,
  próbna wychodzi z numeru platformy. To celowe: pozostałe numery dziś nie
  dzwonią.
- Po tej zmianie potrzebny jest **jeden restart panelu** (plik środowiska).
