# Treść do formularza zgłoszeniowego

Do przeklejenia pole po polu. Dwie ścieżki, ten sam produkt, inny nacisk.
Formularz pokazuje 50 procent, bo brakuje opisu i pliku README.

---

## TYTUŁ PROJEKTU

    AI call center

Zmień domyślne "mich's Project". To samo w obu ścieżkach.

## TAGLINE (do 140 znaków)

**Ścieżka 03, Solve Your Real Problem:**

    Bot dzwoni do zgłoszeń, rozmawia po polsku i oddaje gotowy wynik do CRM. Zamiast 65 godzin miesięcznie na wykręcanie numerów.

**Ścieżka 01, Showcase:**

    Wielofirmowa platforma telefoniczna na Open Mercato. Zamieniamy rozmowę telefoniczną w rekord w CRM.

## OPIS

    AI call center to moduł Open Mercato, który prowadzi rozmowy telefoniczne
    za firmę i oddaje ich wynik jako gotowe pola, a nie nagranie do
    odsłuchania.

    Każda firma to osobny tenant z własnym botem, własnym numerem, własnym
    CRM-em i własnym scenariuszem. Bot przedstawia się nazwą tej firmy,
    posługuje się pojęciami jej branży i zadaje pytania, które ona ustawiła.

    Rozmowy idą w obie strony. Gdy ktoś nie odbierze i oddzwoni później,
    system dokleja oddzwonienie do pierwotnej próby, zamiast zakładać nowy,
    oderwany rekord. Rozmowę przychodzącą od nieznanego numeru też zapisuje,
    tylko bez przypisania do kampanii. Firmę rozpoznaje po numerze, na który
    ktoś zadzwonił.

    Wynik rozmowy trafia do CRM klienta, na wybrany przez niego lejek
    i etap. Koszt każdego połączenia jest widoczny w panelu, bo pobieramy go
    od dostawcy.

## PROBLEM

    Współpracuję z kancelariami, które pomagają ludziom z umowami kredytowymi,
    i dostarczam im zgłoszenia z reklam. To przypadek jednej z nich. Ludzie
    zostawiają zgłoszenie w formularzu i czekają na telefon.

    Dane z CRM tej kancelarii za wrzesień, przeliczone na miesiąc: 300 nowych
    zgłoszeń, z czego 248 nie odbiera za pierwszym razem. Doliczając kolejne
    etapy kontaktu, od trzeciego do szóstego, wychodzi 972 próby telefoniczne
    miesięcznie. Średnio ponad trzy telefony na jedno zgłoszenie.

    Jedna próba to cztery minuty: wejść w kartę, wybrać numer, odczekać
    sygnały, wpisać notatkę, zamknąć. Tyle samo, gdy nikt nie odbierze.
    Razem 65 godzin miesięcznie, czyli osiem dni roboczych jednej osoby,
    około 2590 zł.

    Najgorsze jest to, co dzieje się, gdy klient oddzwoni na nieodebrane. Dzwoni
    na numer pracownika, który akurat prowadzi inną rozmowę albo jest po godzinach.
    Nikt nie odbiera, klient próbuje raz i odpuszcza. Zgłoszenie, za które
    kancelaria zapłaciła w reklamie, przepada.

## ROZWIĄZANIE

    Te same 972 rozmowy botem kosztują około 118 zł miesięcznie, licząc
    z rzeczywistych stawek dostawcy: 35 groszy za rozmowę odbytą i 2 grosze
    za nieodebraną próbę.

    Ale oszczędność czasu jest tu drugą sprawą. Pierwszą jest to, że nic nie
    przepada. Oddzwonienie dokleja się do pierwotnej próby, więc człowiek,
    który odbiera, widzi całą historię. Ustalenia z rozmowy lądują w CRM jako
    pola, nie jako notatka do przepisania.

    Firma konfiguruje to sama, w jednym ekranie: wybiera branżę, dostaje
    gotowy zestaw pytań do zmiany, podaje adres swojej strony. Stronę czyta
    model i robi z niej notatkę, z której bot korzysta w rozmowie.

## STOS TECHNOLOGICZNY

Dodaj kolejno, każde przez Enter:

    Open Mercato
    Next.js
    TypeScript
    PostgreSQL
    MikroORM
    Redis
    ElevenLabs Conversational AI
    Claude API
    Bitrix24 REST
    SIP trunk

## CO ZOSTAŁO ZBUDOWANE PODCZAS HACKATHONU

Zaznacz **"Ten projekt korzysta z istniejącego kodu"** i wpisz:

    Przed hackathonem istniały: konto u dostawcy głosu z jednym agentem
    telefonicznym, jego prompt, numer SIP od operatora oraz prosty przepływ
    w Make, który przekazywał wynik rozmowy do arkusza. Żadnego z tych
    elementów nie liczymy jako pracy hackathonowej.

    Podczas hackathonu powstał cały moduł w Open Mercato: model danych
    i migracje, API, obsługa rozmów przychodzących ze sklejaniem oddzwonień,
    kolejka połączeń z blokadą w bazie, weryfikacja podpisu webhooka,
    złącze do Bitrix24 konfigurowane na koncie klienta, licznik kosztów,
    limity na firmę, zawężenie numerów i agentów per firma, czytanie strony
    firmy przez Claude API, scenariusze i słowniki pojęć dla pięciu branż,
    zakładanie bota dla nowej firmy jednym krokiem oraz jedenaście ekranów panelu.

    Moduł jest nakładką: rdzeń Open Mercato nie był modyfikowany, całość
    siedzi w src/modules/voicebot.

## URL DEMA

Zostaw puste albo wpisz `https://aicallcenter.pl` - to strona produktu,
nie działające demo. Panel stoi lokalnie i nie jest publiczny.

## URL REPOZYTORIUM

Uzupełnij, jeśli wypchniesz repozytorium na GitHuba. Dziś jest tylko lokalne.

## WIDEO PITCH

Tu wchodzi nagranie zapasowe, które i tak trzeba zrobić.

## GALERIA MEDIÓW

Zrzuty w tej kolejności, bo tak opowiadają historię:

1. Lista rozmów z wypełnionymi polami wyniku
2. Para wierszy Zieliński: nieodebrane i doklejone oddzwonienie
3. Ekran botów z kartą firmy i wybraną branżą
4. Notatka "Co bot wie o firmie", wczytana ze strony
5. Przełącznik firm pokazujący pustą drugą firmę
6. Liczniki z kosztem rozmów
