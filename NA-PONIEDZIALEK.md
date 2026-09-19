# Na poniedziałek, po hackatonie

Lista rzeczy, które świadomie odkładamy, żeby nie zabierały czasu w weekend.

## 1. skills.sh, katalog umiejętności dla agentów

`https://skills.sh` to ranking i wyszukiwarka gotowych skilli do Claude Code
i pokrewnych narzędzi. Instaluje się je do projektu i agent używa ich tak samo
jak twoich własnych, tych z `.agents/skills`.

**Sprawdzone 19.09.** Na dziś nic stamtąd nie jest nam potrzebne i nie warto
przerywać dla tego pracy. Na poniedziałek warte obejrzenia:

| Skill | Po co nam |
|---|---|
| `frontend-design`, `web-design-guidelines` | wygląd strony `aicallcenter.pl` i panelu |
| `diagnosing-bugs`, `code-review` | drugie zdanie o kodzie, tańsze niż pełny przegląd |
| `domain-modeling`, `to-spec` | rozpisywanie kolejnych modułów przed pisaniem kodu |
| `supabase-postgres-best-practices` | tylko jeśli kiedyś wyjdziemy poza własne Postgresy |

Czego tam nie szukać: skilli do generowania wideo. Film z demo ma pokazywać
twój panel, a nie wygenerowaną animację.

## 2. Analiza wąskiego gardła w obdzwanianiu

Osobny plik: `ANALIZA-WASKIE-GARDLO.md`. Samodzielny, można go wkleić
do nowego czatu. Pamiętaj: Bitrix kancelarii, nie Adsignio.

## 3. Higiena po hackatonie

- Zmienić żeton webhooka Bitrix24 i hasło do `ai@aicallcenter.pl`. Oba
  przewinęły się przez zapis rozmowy. Szczegóły w `DECYZJE-OTWARTE.md`,
  punkt 16.
- Skasować rekordy testowe w Bitriksie: leady 83 i 85, kontakt 3341,
  deal 10021.
- Usunąć z bazy demo dwa wiersze "Michal Test" z prawdziwym numerem.
- Wymienić klucz ElevenLabs. Na czas hackatonu zdjęliśmy z niego wszystkie
  ograniczenia, więc daje pełny dostęp do konta.
- Ustawić własne dane logowania do panelu. Teraz działa domyślne
  `superadmin@acme.com` z hasłem `secret`, które Chrome słusznie zgłasza jako
  ujawnione. Docelowo: `OM_INIT_SUPERADMIN_EMAIL` i
  `OM_INIT_SUPERADMIN_PASSWORD` w `.env`, przed wystawieniem czegokolwiek
  poza laptop.
- Skasować plik `ftp.netrc` z katalogu hackatonu, bo leży w nim hasło do
  konta FTP.
- Usunąć z konta ElevenLabs agenta "DEMO HackOn - Potwierdzanie leadow"
  i webhook "AI call center - Open Mercato", jeśli nie wchodzą do produkcji.

## 4. Brakująca biblioteka na laptopie

19.09 testy przestały się uruchamiać, bo w systemie nie ma
`vcruntime140_1.dll` z pakietu Microsoft Visual C++. Bez niej `jest` nie
potrafi odnaleźć żadnego pliku i zgłasza mylący błąd o brakującym
`jest.setup.ts`.

Doraźnie podłożona została kopia tej biblioteki obok wtyczki w
`node_modules`. **To znika przy każdym `yarn install`.**

**Trwałe rozwiązanie:** zainstalować *Microsoft Visual C++ 2015-2022
Redistributable (x64)* ze strony Microsoftu, `vc_redist.x64.exe`. Wymaga praw
administratora, trwa dwie minuty i załatwia sprawę raz na zawsze, także dla
innych narzędzi, które jeszcze się na to natkną.

## 5. Strona i dokumenty

W katalogu `strona/` leży wizytówka produktu plus szkice polityki
prywatności i regulaminu. **Szkice, nie dokumenty gotowe do publikacji.**
Przed wgraniem na hosting:

1. Uzupełnić wszystkie znaczniki `[DO UZUPEŁNIENIA: ...]`.
2. Przepuścić całość przez skill `strony-php-bezpieczenstwo`.
3. Dać polityce i regulaminowi oczy prawnika. Masz go pod ręką.
