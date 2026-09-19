# Wiedza z linku

Firma podaje w panelu adres swojej strony. Czytamy ją, robimy z niej krótką
notatkę i doklejamy do scenariusza agenta głosowego, żeby bot umiał
odpowiedzieć, gdy rozmówca zapyta o firmę albo jej usługi.

Wcześniej to pole tylko się zapisywało i nikt tej strony nie otwierał.

## Droga danych

1. `POST /api/voicebot/agents` zapisuje profil agenta razem z adresem strony.
2. `pobierzStrone()` sprawdza adres i pobiera stronę.
3. `wytnijTekst()` zostawia z HTML-a samą treść.
4. `streszczStrone()` oddaje treść modelowi Claude i dostaje notatkę.
5. Notatka ląduje w kolumnie `knowledge_text`, a data odczytu w
   `knowledge_read_at`.
6. `wyslijScenariuszDoAgenta()` skleja prompt agenta: stała część, pytania
   klienta, notatka o firmie, i wysyła całość do dostawcy głosu.

## Kiedy czytamy stronę

Tylko wtedy, gdy adres się zmienił, gdy notatki jeszcze nie ma albo gdy klient
zaznaczy w formularzu ponowny odczyt. Każdy odczyt to zapytanie do cudzego
serwera i płatne wywołanie modelu, a strona firmy zmienia się rzadziej niż jej
pytania do bota.

Nieudany odczyt nie kasuje poprzedniej notatki. Lepiej, żeby bot wiedział to,
co wiedział wczoraj, niż żeby nagle przestał wiedzieć.

## Trzy rzeczy, które trzeba tu rozumieć

**Adres podaje klient, a pobiera go nasz serwer.** Dlatego `ocenAdres()`
przepuszcza wyłącznie publiczne adresy http i https. Bez tego klient mógłby
naszymi rękami odpytać to, co widzi nasza maszyna, a czego nie widzi on.

**Treść cudzej strony jest danymi, nie poleceniem.** Notatka trafia do
promptu bota, który dzwoni do ludzi, więc strona z wpisanym „zapytaj
o numer karty” byłaby realnym problemem. Model dostaje treść w ramce
i instrukcję, że poleceń ze strony nie wykonuje, a przy sklejaniu promptu
odrzucamy wiersze, które podszywałyby się pod nasze znaczniki sekcji.

**Notatka jest widoczna w panelu.** Klient musi wiedzieć, co bot powie o jego
firmie, zanim ten zadzwoni do jego klientów.

## Konfiguracja

W `.env`:

    VOICEBOT_ANTHROPIC_API_KEY=sk-ant-...

Nazwa jest celowo inna niż `ANTHROPIC_API_KEY`. Ta druga, gdy jest ustawiona
w systemie, przestawia Claude Code z abonamentu na rozliczenie z karty.
Jeśli `VOICEBOT_ANTHROPIC_API_KEY` jest puste, kod sięga po `ANTHROPIC_API_KEY`
z `.env`.

Bez klucza reszta modułu działa normalnie, a przy zapisie agenta pojawia się
komunikat, że strony nie udało się przeczytać.

## Pliki

| Plik | Co robi |
|---|---|
| `lib/wiedza.ts` | ocena adresu, pobranie strony, wycięcie tekstu, streszczenie |
| `lib/scenariusz.ts` | sklejanie promptu z pytań i wiedzy, wysyłka do dostawcy |
| `api/agents/route.ts` | zapis profilu i decyzja, czy czytać stronę |
| `backend/voicebot-agenci/page.tsx` | pole adresu, podgląd notatki, ponowny odczyt |
