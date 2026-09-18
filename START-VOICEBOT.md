# Voicebot - start nowego czatu

## Otwórz czat w katalogu

    D:\ai\cc\hackon\om-voicebot

Tam jest pamięć i 30 skilli Open Mercato. Otwarty gdzie indziej nie będzie nic wiedział.

## Wklej to na start

---

Pracujemy nad modułem voicebot w Open Mercato. Projekt działa, przetestowany
prawdziwym telefonem. Jesteśmy na hackatonie HackOn we Wrocławiu.

Przeczytaj najpierw:
- `..\DZIENNIK-PRAC.md`, części 1, 2, 3, 6 i 8 (część 4, 5 i 7 dotyczą portalu,
  czyli innego projektu)
- `PODZIAL-PRACY-CODEX.md` - co jest do zrobienia i kto co bierze
- `DECYZJE-OTWARTE.md` - pytania czekające na moją odpowiedź
- `src\modules\voicebot\` - cały moduł

Potem powiedz krótko, na czym stoimy i co robimy dalej.

Zasady pracy: pisz po polsku, bez długich myślników. Krótkie odpowiedzi,
jeden temat naraz. Jak masz pytanie, zadaj jedno, a resztę zapisz na później.

---

## Stan na 18.09.2026, wieczór

Osiem commitów na `main`. Działa i jest sprawdzone:

| Element | Stan |
|---|---|
| Kampanie, wybór agenta i numeru z listy dostawcy | działa |
| Połączenia wychodzące | działa, test prawdziwym telefonem |
| Rozmowy przychodzące | działa |
| Sklejanie oddzwonień z nieodebraną próbą | działa, 4 przypadki przetestowane |
| Rozpoznanie firmy po numerze, na który zadzwoniono | działa |
| Podpis webhooka w formacie ElevenLabs | działa, sprawdzony przez tunel |
| Licznik kosztów rozmów | działa |
| Dwa ekrany panelu, kierunek i koszt | działa |
| Dane demo, 13 rozmów | `node scripts/dane-demo.mjs` |
| Złącze Bitrix, kod i encja | napisane, niepodpięte |

## Co dalej

Pełna lista z podziałem na agentów: `PODZIAL-PRACY-CODEX.md`.

W skrócie: podpiąć Bitrix, powiązać rozmowy z modułem `customers`, kolejka
z odstępem, ekran przeglądu, edycja kampanii.

## Uruchomienie

Kliknąć `Hackaton - start.bat` na pulpicie.
Panel: http://localhost:3000/backend, `superadmin@acme.com` / `secret`.

**Zanim ruszysz:** wyłączyć drugi projekt (portal), bo dwa serwery Open Mercato
naraz nie mieszczą się w 16 GB pamięci. Sprawdzić też, czy port 3000 jest wolny,
bo stary proces potrafi nie zginąć po restarcie.

Tunel dla webhooka:

    cloudflared tunnel --url http://localhost:3000

Adres zmienia się przy każdym uruchomieniu, więc po starcie trzeba go podmienić
w ustawieniach webhooka w panelu ElevenLabs.

## Dane produkcyjne, sprawdzone w API 18.09.2026

- **Numer:** `48732129033`, id `phnum_6901m0amey85ex397p35hac3mh77`, łącze ACTIO
- **Agent wychodzący:** `agent_6701kympd8htf14rz0d4gf71nmpc`
- **Agent przychodzący:** `agent_5901m0anqg7keessv8ns1eg17vzm`, przypisany do numeru

**NIE brać identyfikatorów z plików w `..\voicebot\`** - to archiwum sprzed
miesięcy. Zawsze odpytać `GET https://api.elevenlabs.io/v1/convai/phone-numbers`
kluczem `ELEVENLABS_API_KEY` ze zmiennych środowiskowych.

## Konkurs

Zgłoszone dwie ścieżki: **03 Solve Your Real Problem** i **01 Showcase**.
Opis i ujawnienia: `ZGLOSZENIE-HACKON.md`.
Scenariusze wystąpień: `SCENARIUSZ-DEMO.md`.
Code freeze w niedzielę o 11:00, demo o 12:15.

## Podział pracy między czatami

- **Ten czat (`om-voicebot`):** voicebot.
- **Drugi czat (`D:\ai\cc\hackon`):** portal partnerski, następca bez-inwestycji.pl.

Nie mieszać. Dziennik jest wspólny, więc przy dopisywaniu sprawdzić numer
ostatniej części, bo drugi czat też do niego pisze.
