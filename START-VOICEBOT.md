# Voicebot - start nowego czatu

## Otwórz czat w katalogu

    D:\ai\cc\hackon\om-voicebot

Tam jest pamięć i 30 skilli Open Mercato. Otwarty gdzie indziej nie będzie nic wiedział.

## Wklej to na start

---

Pracujemy nad modułem voicebot w Open Mercato. Projekt jest już zbudowany
i działa, przetestowany prawdziwym telefonem.

Przeczytaj najpierw:
- `..\DZIENNIK-PRAC.md`, sekcje CZĘŚĆ 1, 2 i 3 - tam jest wszystko, co zrobiliśmy,
  z uzasadnieniem każdej decyzji w kodzie
- `src\modules\voicebot\` - cały moduł

Potem powiedz mi krótko, co już działa i co jest do zrobienia.

Kontekst, którego nie ma w plikach:

Jadę na hackaton Open Mercato we Wrocławiu, 18-20 września 2026. Code freeze
w niedzielę o 11:00, demo o 12:15. Prawdopodobnie kończę w sobotę wieczorem,
więc demo musi poprowadzić ktoś z zespołu albo mam nagranie zapasowe.

Regulamin wymaga dwóch rzeczy: ujawnienia, że agent ElevenLabs, prompty,
numer telefonu i konfiguracja Make istniały przed hackatonem, oraz umiejętności
wytłumaczenia każdego fragmentu kodu napisanego przez AI.

Docelowo to ma być produkt sprzedawany firmom, podobny do fonio.ai, ale
wyspecjalizowany w branży kredytowej. Każda firma-klient to osobny tenant.

Pisz po polsku, bez długich myślników.

---

## Co jest gotowe

| Element | Stan |
|---|---|
| Encje VoiceCampaign i VoiceCall | tabele w bazie |
| Trasy API: kampanie, połączenia, webhook, katalog dostawcy | działają |
| Adapter ElevenLabs z trybem symulacji | działa |
| Dwa ekrany w panelu | działają |
| Test prawdziwym telefonem | przeszedł, 24 sekundy |
| Uprawnienia, pięć z zależnościami | gotowe |

## Co zostało do zrobienia

1. **Rozmowy przychodzące.** Agent `agent_5901m0anqg7keessv8ns1eg17vzm`
   już istnieje w ElevenLabs. To rdzeń fonio.ai, u nas brakuje.
2. **Powiązanie połączeń z kartami klientów** z modułu `customers`.
   Dziś połączenie ma tylko numer telefonu.
3. **Kolejka połączeń** z odstępem 180 sekund i jednym naraz.
   Framework ma 18 kolejek, wystarczy dołożyć zadanie.
4. **Licznik kosztów** per tenant. Framework ma gotowe tabele zużycia.
5. **Webhook automatyczny.** Dziś wynik wpisuje się ręcznie, bo localhost
   nie jest widoczny z internetu. Tunel: `Tunel - publiczny adres.bat` na pulpicie.
6. **Konfiguracja agenta z panelu** - dziś identyfikator to pole tekstowe.

## Dane produkcyjne, sprawdzone w API 18.09.2026

- **Numer wychodzący:** `48732129033`, id `phnum_6901m0amey85ex397p35hac3mh77`
- **Agent wychodzący:** `agent_6701kympd8htf14rz0d4gf71nmpc` "Potwierdzanie leadów"
- **Agent przychodzący:** `agent_5901m0anqg7keessv8ns1eg17vzm`

**NIE brać identyfikatorów z plików w `..\voicebot\`** - to archiwum sprzed
miesięcy, numery są nieaktualne. Zawsze odpytać
`GET https://api.elevenlabs.io/v1/convai/phone-numbers` kluczem
`ELEVENLABS_API_KEY` ze zmiennych środowiskowych.

## Uruchomienie

Kliknąć `Hackaton - start.bat` na pulpicie.
Panel: http://localhost:3000/backend, `superadmin@acme.com` / `secret`.

## Podział pracy

- **Ten czat:** voicebot.
- **Drugi czat (katalog `D:\ai\cc\hackon`):** portal partnerski,
  następca bez-inwestycji.pl.

Nie mieszać. Wymagania portalu są w `..\PORTAL-WYMAGANIA.md`.
