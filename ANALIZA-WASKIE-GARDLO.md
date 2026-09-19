# Gdzie jest wąskie gardło w obdzwanianiu leadów

Zadanie do wykonania w poniedziałek, na spokojnie, przy panelu Bitriksa.
Ten plik jest samodzielny: można go wkleić do nowego czatu i zacząć pracę.

## WAZNE: ktory Bitrix

Liczby ponizej pochodza z **Bitriksa kancelarii**, a nie z konta
`adsignio.bitrix24.pl`. To sa dwa rozne systemy.

Sprawdzone 19.09: w Adsignio za okres 1-18 wrzesnia sa tylko 3 leady,
4 kontakty i 6 deali. Kto bedzie robil te analize, musi pracowac na tym
drugim koncie, inaczej wyjdzie mu bzdura.

## Co wiemy dzisiaj

Dane z panelu raportów, **1-18 września 2026**, czyli 18 dni:

| Liczba | Co znaczy |
|---|---|
| 180 | nowych kontaktów |
| 149 | weszło na etap "kontakt 2", czyli nie odebrali za pierwszym razem |
| 12 | doszło do etapu "umowa podpisana" |

Z tego wynika:

- **odbieralność przy pierwszej próbie: 17,2 procent**
- **konwersja lead do umowy: 6,7 procent**, czyli **co piętnasty lead**
- w skali miesiąca: 300 kontaktów, około 20 umów

**Wniosek wstępny:** wąskim gardłem nie jest zamykanie sprzedaży, tylko
dodzwonienie się. Podpisywalność 6,7 procent z surowego leada jest rozsądna.
Odbieralność 17 procent przy leadach, które same zostawiły numer, jest słaba.

## Pytanie, na które trzeba odpowiedzieć

**Dlaczego 83 procent ludzi nie odbiera za pierwszym razem, skoro sami
zostawili numer i czekają na kontakt?**

Trzy hipotezy, do rozstrzygnięcia danymi, nie przeczuciem.

### Hipoteza 1: dzwonimy za późno

Zależność między czasem reakcji a szansą na kontakt jest bardzo stroma
i liczy się w minutach, nie w godzinach. Człowiek, który wypełnił formularz,
przez kilka minut siedzi przy telefonie i czeka. Po godzinie już nie.

**Co zmierzyć:** rozkład czasu od utworzenia deala do pierwszej próby
telefonicznej. Nie średnią, tylko rozkład: mediana i to, ile prób wychodzi
w pierwszych 5 minutach, do godziny, tego samego dnia, później.

**Jak to wyciągnąć z Bitriksa** (pamiętaj: konto kancelarii, nie Adsignio)**:**

- `crm.deal.list` z polami `ID`, `DATE_CREATE`, `STAGE_ID`, filtrowane
  po dacie utworzenia i po lejku
- `crm.activity.list` z filtrem `OWNER_ID` (id deala), `OWNER_TYPE_ID: 2`
  i `TYPE_ID: 2` (połączenie), pola `CREATED`, `START_TIME`, `DIRECTION`
- albo `voximplant.statistic.get`, jeśli telefonia idzie przez Bitrix

Różnica między `DATE_CREATE` deala a pierwszym połączeniem to szukana liczba.

**Jak wygląda odpowiedź:** tabela z przedziałami czasu i odsetkiem prób
w każdym, plus odbieralność osobno dla każdego przedziału. Jeśli odbieralność
w pierwszych 5 minutach jest wyraźnie wyższa niż po godzinie, hipoteza
potwierdzona i mamy dźwignię.

### Hipoteza 2: dzwonimy w złych porach

**Co zmierzyć:** odbieralność w rozbiciu na godziny dnia i dni tygodnia.

Podejrzenie do sprawdzenia: czy próby nie kumulują się rano, gdy ludzie
dojeżdżają do pracy i nie odbierają z nieznanych numerów.

**Jak wygląda odpowiedź:** mapa godzina po godzinie. Jeśli między 17 a 20
odbieralność jest dwukrotnie wyższa niż o 9, to jest gotowa zmiana
do wprowadzenia jeszcze przed jakimkolwiek botem.

### Hipoteza 3: problem z numerem, z którego dzwonimy

Ludzie nie odbierają z numerów, których nie znają, a już zwłaszcza
z numerów oznaczonych przez aplikacje jako spam.

**Co sprawdzić:**

- z jakiego numeru wychodzą te połączenia i czy to ten sam numer, z którego
  przychodzą SMS-y i maile do klienta
- czy numer nie jest oznaczony jako spam w popularnych aplikacjach
  do identyfikacji dzwoniących
- czy w ogóle wysyłamy SMS zapowiadający telefon

## Czego NIE zakładać z góry

Nie zakładaj, że odpowiedź brzmi "za późno dzwonimy". To najbardziej
prawdopodobna hipoteza, ale nie jedyna, a przyczyna bywa banalna: numer
oznaczony w aplikacjach jako spam albo formularz zbierający numery
z literówkami, bez sprawdzania poprawności.

**Sprawdź najpierw jakość samych numerów:** ile z tych 180 to numery
w ogóle poprawne i osiągalne. Jeśli 20 procent to śmieci, to zmienia
całą arytmetykę.

## Co zrobić z wynikiem

| Jeśli okaże się, że | To znaczy |
|---|---|
| Dzwonimy średnio po godzinach | Bot ma tu największą dźwignię: dzwoni w sekundę po zgłoszeniu |
| Odbieralność zależy od pory | Zmiana grafiku dzwonienia daje efekt od razu, bez technologii |
| Numer jest oznaczony jako spam | Trzeba zmienić numer, bot tego nie naprawi |
| Numery są złej jakości | Problem jest w formularzu, nie w dzwonieniu |

## Liczba, której brakuje

**Ile jest warta jedna podpisana umowa.**

Bez niej mówimy o oszczędności 1370 zł miesięcznie na czasie pracownika.
Z nią mówimy o przychodzie, bo skoro co piętnasty lead daje umowę, to każde
piętnaście uratowanych leadów to jedna umowa więcej.

To jest zupełnie inna rozmowa, i z jury, i z klientem, któremu będziemy
to sprzedawać.

## Kontekst

To jest wątek poboczny wobec hackatonu HackOn (18-20 września 2026), na
którym powstał moduł voicebota w Open Mercato. Analiza służy dwóm rzeczom:
zrozumieniu własnego procesu w kancelarii oraz zbudowaniu argumentu
sprzedażowego dla produktu.

Dane liczbowe i wyliczenia kosztów: `ZGLOSZENIE-HACKON.md` w tym samym
katalogu.
