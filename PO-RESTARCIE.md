# Po restarcie laptopa, zanim znów zadzwonimy

Adres tunelu zmienia się przy każdym uruchomieniu, a w nim wisi webhook
u dostawcy głosu. Dlatego kolejność ma znaczenie.

## 1. Docker

Kontenery bazy, Redisa i wyszukiwarki muszą wstać przed serwerem.

## 2. Serwer

    yarn dev

Poczekaj, aż `http://localhost:3000/login` odpowie. Pierwsze uruchomienie po
restarcie potrafi zająć minutę.

## 3. Tunel

    cloudflared tunnel --url http://localhost:3000

Zapisz nowy adres, zaczyna się od `https://` i kończy na `.trycloudflare.com`.

## 4. Webhook u dostawcy

**Tego już nie trzeba klikać w panelu ElevenLabs.** Klucz ma pełne uprawnienia,
więc Claude podmienia adres webhooka z kodu i od razu wpisuje nowy sekret
podpisu do `.env`. Wystarczy podać mu nowy adres tunelu.

Webhook nazywa się "AI call center - Open Mercato" i jest podpięty wyłącznie
do agenta `DEMO HackOn - Potwierdzanie leadow`. Twój produkcyjny agent dalej
wysyła wyniki do Make i nic mu nie zmieniamy.

## 5. Dane demo

    node scripts/dane-demo.mjs

Kasuje prawdziwe numery z listy i ustawia kampanię na agenta demo oraz numer
testowy ACTIO.

## Stan ustawień, który działał 19.09

| Co | Wartość |
|---|---|
| Agent demo | `agent_8101m2wgzvnmekwsdwnsyhg9v4je` |
| Numer wychodzący | `+48457112147` ACTIO test |
| Model rozmowy | `gemini-2.0-flash-lite` |
| Cisza kończąca wypowiedź | 1,5 s |

Model ma znaczenie: na `gemini-2.5-flash-lite` dostawca podmieniał go na
cięższy i bot milczał prawie sześć sekund po każdej odpowiedzi rozmówcy.
Model i czas ciszy przestawisz sam, na ekranie **Agenci i scenariusz**.
