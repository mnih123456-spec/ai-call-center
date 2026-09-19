# Stan projektu - 19.09.2026, wieczor

Przekazanie pracy. Wszystko, co dziala, i wszystko, co zostalo.

---

## Jak to uruchomic

Trzy rzeczy musza chodzic naraz. Kazda osobno.

| Co | Komenda | Po co |
|---|---|---|
| Baza | `docker compose up -d` | postgres, redis, meilisearch |
| Panel | `yarn dev` | aplikacja na `localhost:3000` |
| Tunel | `cloudflared tunnel --url http://127.0.0.1:3000` | publiczny adres, pod ktory dostawca odsyla wynik rozmowy |

Tunel **umiera po kilku godzinach mimo ze proces zyje**. Objaw: rozmowa sie
odbywa, ale wynik nie wraca do tabeli. Wtedy: nowy tunel, nowy webhook u
dostawcy (adresu istniejacego webhooka nie da sie zmienic - PATCH zwraca
`{"status":"ok"}` i nic nie robi), nowy sekret do `.env`, restart panelu,
przepiecie wszystkich agentow.

Skrypt do przepiecia: `.../scratchpad/przepnij-webhook.mjs` (wymaga poprawki
ksztaltu payloadu - patrz nizej "Ksztalt API dostawcy").

Po kazdej zmianie `.env` **trzeba zrestartowac panel**. `TaskStop` na `yarn dev`
nie zabija procesu Next - trzeba `taskkill /PID <pid> /F` na procesie
nasluchujacym na 3000, inaczej stary serwer ze starym `.env` dalej odpowiada.

---

## Sciezka klienta - stan na teraz

1. `localhost:3000/login` - `superadmin@acme.com` / `secret`
2. `/backend/voicebot-nowa-firma` - nazwa, branza, opcjonalnie strona -> **Zaloz konto i bota**
3. `/backend/voicebot-agenci` - karta bota otwiera sie sama, pytania na gorze -> **Zapisz i przekaz botowi**
4. `/backend/voicebot` - **Polaczenie testowe** -> numer
5. `/backend/voicebot-calls` - kolumny zbudowane z pytan klienta

Kroki 1-3 przeklikane recznie w przegladarce. Kroki 4-5 **nigdy nie byly
sprawdzone na zywej rozmowie** - to jedyna rzecz, ktorej nie da sie sprawdzic
bez prawdziwego telefonu i prawdziwych minut.

---

## Zrobione dzisiaj

### Sciezka klienta

- Formularz zakladania firmy zyje **tylko** na ekranie "Nowy klient". Zniknal
  z ekranu pytan i z ekranu potwierdzenia. Wyskakiwal w trzech miejscach, bo
  naprawialem go po jednym ekranie naraz zamiast wyciac raz ze wszystkich.
- Ekran pytan otwiera karte bota sam, gdy firma ma jednego bota. Nie trzeba
  klikac "Konfiguruj", zeby dojsc do jedynej rzeczy, po ktora sie przyszlo.
- Po zalozeniu konta jeden przycisk: "Dalej: ustaw pytania dla bota".
- Menu przestawione w kolejnosc sciezki: Nowy klient, Pytania bota, Kampanie,
  Polaczenia i wyniki, reszta nizej.

### Menu

Wylaczone moduly, ktorych klient voicebota nie potrzebuje: `audit_logs`,
`dashboards`, `messages`, `attachments`, `communication_channels`,
`dictionaries`, `currencies`, `api_docs`, `ai_assistant`.

Zostalo: Klienci (CRM Mercato, tam laduja rozmowy) i Voicebot.

Kopia poprzedniej listy: `src/modules.ts.przed-trimem`. Przywrocenie to
`cp src/modules.ts.przed-trimem src/modules.ts && yarn generate`.

Wylaczenie `audit_logs` zabralo przy okazji pasek "Ostatnia operacja: Utworz
organizacje", ktory nazywal klientowi nasza kuchnie.

### Jezyk bota

Caly tekst scenariuszy byl pisany **bez polskich ogonkow**. Silnik mowy czyta
doslownie, wiec bot mowil "krotka rozmowe" zamiast "krotka rozmowe" - rozmowca
slyszal obcokrajowca. Poprawione w `src/modules/voicebot/lib/branze.ts`
i `scenariusz.ts`: powitania, cele, slowniki, reguly stale.

Doszla tez jawna regula: "Mowisz wylacznie po polsku, pelnymi polskimi
slowami, z polska odmiana."

### Pola wynikow

Bot zakladany dla warsztatu **zbieral pola kredytowe z szablonu**: kwota, bank,
rok umowy, produkt_kod. Szablon powstal dla kancelarii i kopia przynosila jego
liste pol. To bylo ogniwo, przez ktore kolumny z pytan nie mialy prawa
zadzialac, niezaleznie od tego, co pokazywal panel.

Teraz `zalozAgentaDlaFirmy` podmienia `platform_settings.data_collection` na
pola wyprowadzone z pytan branzy. Sprawdzone u dostawcy: nowy bot motoryzacyjny
ma 6 pol z pytan o samochod, zero pol kredytowych.

### Usuwanie bota

Przycisk "Usun bota" **nie dzialal nigdy i dla nikogo**: blokowala go kampania
startowa, ktora sami zakladamy przy kazdym bocie. Teraz kampania gasnie razem
z botem.

### Rozmowa probna

Znikala firmie, ktora przed chwila zalozyla konto: sprawdzenie uprawnienia
`voicebot.calls.start` zwracalo `false`, bo sesja byla juz przelaczona na nowe
konto, a uprawnienia dla niego jeszcze sie nie policzyly. Teraz sprawdzamy tez,
czy to operator platformy.

Firma bez wlasnego numeru dzwoni **z numeru platformy** (`+48457112147`,
`VOICEBOT_NUMER_PLATFORMY`). Kampanii to nie dotyczy - tam numer musi byc
wlasny, bo to ruch na rachunek klienta.

### Pytania branzy samochodowej

Byly rownowaznikami zdan z formularza. Teraz pelne zdania do czlowieka:

```
Jakim samochodem Pan jeździ? Proszę podać markę i model.
Który to rocznik i ile mniej więcej ma przebiegu?
Proszę powiedzieć co się dzieje z autem.
Czy zapaliła się jakaś kontrolka na desce rozdzielczej?
Kiedy najwygodniej byłoby Panu podjechać do nas?
Czy na czas naprawy będzie Panu potrzebne auto zastępcze?
```

---

## Do zrobienia

### 1. Wlasna branza z wiedza branzowa - ZROBIONE

Klient wybiera "Inna branza, opisze ja sam" i dostaje pole tekstowe (do 4000
znakow) na obu ekranach: przy zakladaniu firmy i na ekranie pytan. Tresc siedzi
w kolumnie `industry_knowledge` (migracja `Migration20260919164754`) i idzie do
promptu w sekcje `ZNACZNIK_BRANZY` przez `wiedzaBranzowa(id, opis)` w
`branze.ts`. Przy branzy z listy opis jest ignorowany i kasowany z bazy, zeby
nie wrocil po zmianie wyboru. Tresc przechodzi przez `oczyscWiedze()`, bo
pisze ja klient.

**Nie sprawdzone na zywo w przegladarce** - panel wymaga restartu po migracji
(instancja ORM zyje w procesie i nie zna nowej kolumny do restartu).

### 2. Pelna rozmowa od poczatku do konca

Nigdy niesprawdzone: pytanie w panelu -> pole u dostawcy -> prawdziwa rozmowa
-> webhook -> kolumna w tabeli. Kazdy kawalek sprawdzony osobno, calosc nie.

### 3. Statusy nieodebranych

`termination_reason` od dostawcy nie jest mapowany na `no_answer` / `busy`.
Te statusy nie powstaja nigdy, mimo ze tabela je przewiduje.

### 4. Kafelek statystyk

Pokazuje 60% tam, gdzie z danych wychodzi 83%. Liczniki sumuja tylko pierwsze
100 wierszy.

### 5. Liczby w dokumentach

README mowi "160 testow" i "osiem ekranow". Realnie 289 testow i 10 ekranow.
README ma tez zdanie o zakresie tenanta, ktoremu przeczy
`voicebot-nowa-firma/page.tsx` ustawiajacy `om_selected_tenant` przez
`document.cookie`.

### 6. Ekran CRM

Wymaga technika. Klient nie wie, co tam wpisac.

### 7. Wczytywanie listy

Gubi wklejony tekst i ukrywa bledy publikacji do kolejki.

### 8. Strona

Przebudowa bez nazw technicznych zlecona Codexowi. Pliki w `strona/`.
Kopia z serwera w `strona-kopia-z-serwera/`.

---

## Po hackathonie

- Branze jako dane w bazie zamiast listy w kodzie. Silnik uczy sie branz
  z rozmow klientow i wyciaga wnioski.
- Rotacja: klucz ElevenLabs, haslo `ai@aicallcenter.pl`, token Bitrix.
- Skasowac `_NIE-WYSYLAC-NA-SERWER/ftp.netrc`.
- Zainstalowac VC++ 2015-2022 Redistributable (bez tego `jest` przewraca sie
  na brakujacym `vcruntime140_1.dll`; teraz dziala na kopii recznej).
- Nagrac zapasowy film z pokazu (obowiazkowy).
- `/code-review ultra`.

---

## Ksztalt API dostawcy - rzeczy, ktore kosztowaly czas

| Rzecz | Jak jest naprawde |
|---|---|
| Zalozenie webhooka | `POST /v1/workspace/webhooks` z `{settings:{name, webhook_url, auth_type:'hmac'}}`. Nie `{name, webhook_url}` - to zwraca 422. |
| Sekret webhooka | Zwracany **raz**, przy zakladaniu. Potem nie do odczytania. |
| Adres webhooka | Niezmienny. PATCH zwraca `{"status":"ok"}` i ignoruje zmiane. |
| Webhook per agent | `platform_settings.workspace_overrides.webhooks.post_call_webhook_id` |
| Pola do zebrania | `platform_settings.data_collection`, wszystkie jako `type:'string'` |
| Model | Od 19.09 wieczor: `gemini-2.5-flash` (VOICEBOT_MODEL_DOMYSLNY, przelaczone tez na wszystkich istniejacych botach), `turn_timeout: 1.5`. Wczesniej `gemini-2.0-flash-lite`: szybszy (0,6 s vs 5,7 s zmierzone wczesniej), ale mowil "dzien dobry" dwa razy i czytal na glos "zakoncz polaczenie". Jesli cisza za dluga: `gemini-2.5-flash-lite` na ekranie pytan. |
| Numery | `phnum_9901kz8gc1xze21s4e307f9e0490` = +48457112147 (probny), `phnum_6901m0amey85ex397p35hac3mh77` = +48732129033 |

---

## Pliki, ktore warto znac

| Plik | Co robi |
|---|---|
| `src/modules/voicebot/lib/branze.ts` | Branze, scenariusze, slowniki, gotowe pytania |
| `src/modules/voicebot/lib/pola-z-pytan.ts` | Pytanie -> klucz pola -> kolumna wyniku |
| `src/modules/voicebot/lib/nowy-agent.ts` | Zakladanie bota u dostawcy |
| `src/modules/voicebot/lib/scenariusz.ts` | Skladanie promptu z sekcji zarzadzanych |
| `src/modules/voicebot/lib/wiedza.ts` | Czytanie strony firmy, streszczenie przez Claude |
| `src/modules/voicebot/api/webhook/route.ts` | Odbior wyniku rozmowy |
| `src/modules/voicebot/backend/voicebot-nowa-firma/page.tsx` | Ekran zakladania |
| `src/modules/voicebot/backend/voicebot-agenci/page.tsx` | Ekran pytan |
| `ZLECENIA.md` | Lista zlecen i ich stan |
| `DECYZJE-OTWARTE.md` | 21 otwartych decyzji |
| `src/modules.ts.przed-trimem` | Lista modulow sprzed wylaczenia |
