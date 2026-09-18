# Co się działo w nocy z 18 na 19 września

Przeczytaj to jako pierwsze. Dalej jest `PODZIAL-PRACY-CODEX.md`.

## Krótko

| Rzecz | Stan |
|---|---|
| Moja praca wieczorem | zacommitowana na `main`, ostatni commit `de2d08c` |
| Kolejka połączeń od Codexa | na gałęzi `codex/kolejka`, sprawdzona, **niescalona** |
| Ekran przeglądu i edycja kampanii | zlecone Codexowi po 1:25, wynik do sprawdzenia |
| Powiązanie z modułem `customers` | **zatrzymane celowo**, powód niżej |

## Co zrobiłem wieczorem, już na `main`

**Wczytywanie wklejonej listy kontaktów**, czyli ścieżka dla klienta bez CRM-u.
Ekran `/backend/voicebot-import`, parser znoszący przecinki, średniki
i tabulatory, pomijanie duplikatów w liście i tych, które już czekają.

Przy okazji złapałem własny błąd, zanim zdążył zaszkodzić: dziewięciocyfrowy
numer bez prefiksu zamieniał się na numer zagraniczny (Falklandy), a bot
faktycznie by tam zadzwonił. Numery z wklejonej listy mają teraz własną
normalizację, osobną od tej dla danych od dostawcy, bo tylko tutaj wolno nam
domyślać się kraju. Reguły sprawdzone dziesięcioma przypadkami.

## Co zrobił Codex

**Kolejka połączeń wychodzących z odstępem.** Połączenia `pending` trafiają do
kolejki, a worker uruchamia je pojedynczo na kampanię, pilnując
`minIntervalSecs`. `callId` służy za klucz idempotencji, więc ponowne
dostarczenie zadania nie dzwoni drugi raz.

Dołożył też obejście dla Jesta na tym Windowsie, bo natywny resolver się nie
ładuje (`ERR_DLOPEN_FAILED`). Stąd pliki `run-tests.cjs` i `test-resolver.cjs`.

**Co sprawdziłem osobiście:** `yarn typecheck` bez błędów w module,
**23 testy w 3 zestawach przechodzą**.

**Czego NIE sprawdziłem:** nie przeczytałem tego kodu linijka po linijce
i nie uruchomiłem kolejki na żywo z prawdziwym telefonem. Dlatego siedzi
na osobnej gałęzi, a nie na `main`.

Scalenie, gdy uznasz, że jest dobre:

```bash
git merge codex/kolejka
```

Powrót, gdyby było złe: nic nie trzeba robić, `main` już jest czysty.

## Dlaczego Codex zrobił tylko jedno z trzech zadań

Wyczerpał limit twojego konta OpenAI w trakcie pierwszego zadania.
Komunikat: "You've hit your usage limit... try again at Sep 19th, 2026 1:20 AM".

Ustawiłem drugą turę tak, żeby ruszyła sama po 1:25 i wzięła ekran przeglądu
oraz edycję kampanii. Rano sprawdź, czy się udało.

## Co zatrzymałem i dlaczego

Powiązanie rozmów z kartami klientów z modułu `customers` (zadanie K2).

Numer telefonu klienta siedzi w polu `primary_phone` encji `customer_entity`
i **jest szyfrowany**. Zwykłe wyszukanie po numerze nigdy by nie trafiło.
Potrzebny jest ich mechanizm pól skrótu, opisany w
`.ai/skills/om-data-model-design/references/sensitive-data.md`.

Nie chciałem tego zgadywać w nocy, bo błąd w tym miejscu nie wywala się
głośno, tylko po cichu nigdy nie dopasowuje. Wolę zrobić to rano, czytając
ich kontrakt.

## Do zrobienia przez Ciebie, zanim ruszymy

1. **Skasować w Bitriksie rzeczy testowe:** leady 83 i 85, kontakt 3341,
   deal 10021.
2. **Wygenerować nowy webhook w Bitriksie**, bo poprzedni token wkleiłeś
   do czatu, więc jest w zapisie rozmowy. Stary skasować.
3. Zdecydować, czy scalamy `codex/kolejka`.

## Reszta decyzji

W `DECYZJE-OTWARTE.md`, dziesięć pozycji. Najpilniejsze: nazwa produktu
i trzy liczby do porównania "przed i po", bo to kryterium warte 30 procent
w ścieżce 03, a tych liczb nikt poza Tobą nie zna.
