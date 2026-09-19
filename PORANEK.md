# Co się działo w nocy z 18 na 19 września

Przeczytaj to jako pierwsze. Dalej jest `PODZIAL-PRACY-CODEX.md`.

## Krótko

| Rzecz | Stan |
|---|---|
| Moja praca wieczorem | zacommitowana na `main` |
| Cała praca Codexa | na gałęzi `codex/noc`, sprawdzona, **niescalona** |
| Powiązanie z modułem `customers` | **zatrzymane celowo**, powód niżej |

Gałąź `codex/noc` zawiera trzy rzeczy: kolejkę połączeń z odstępem, ekran
przeglądu i edycję kampanii. Sprawdziłem ją w całości: typy bez błędów
w module, **42 testy w 5 zestawach przechodzą**.

Scalenie, gdy uznasz, że jest dobre:

    git merge codex/noc

Gałęzie `codex/kolejka` i `codex/przeglad-edycja` to jej składowe, zostawione
na wypadek, gdybyś chciał wziąć tylko część.

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

**Ekran przeglądu.** Widok zbiorczy z kaflami: rozmowy dziś i w tym tygodniu,
skuteczność dodzwonień, liczba oddzwonień, koszt dziś i w miesiącu, rozkład
produktów. Adres: `/backend/voicebot-przeglad`.

**Edycja kampanii.** Metoda PUT, komenda domenowa i edycja w ekranie kampanii,
razem ze zmianą statusu. Wcześniej kampanii nie dało się zmienić, i właśnie
dlatego raz telefon poszedł ze starego numeru testowego.

**Co sprawdziłem osobiście:** typy bez błędów w module, 42 testy przechodzą.

**Czego NIE sprawdziłem:** nie przeczytałem tego kodu linijka po linijce
i nie uruchomiłem kolejki na żywo z prawdziwym telefonem. Dlatego to czeka
na gałęzi, a nie na `main`.

**Jedną rzecz poprawiłem sam.** Po złożeniu obu tur trzy testy ekranu kampanii
padały na `toHaveValue is not a function`. Wyglądało to na błąd logiki, a było
brakiem biblioteki dopasowań: konfiguracja z pierwszej tury pomijała plik
startowy szablonu, a testy z drugiej na nim polegały.

## Dwie wpadki nocne, obie naprawione

**Codex nie zacommitował ani razu**, mimo polecenia. Za pierwszym razem
wyczerpał limit konta OpenAI w trakcie pierwszego zadania, za drugim Git
odmówił zapisu (`index.lock: Permission denied`). Pracę zacommitowałem sam,
opisując w każdym commicie, że kod nie był przejrzany.

**Ja przypadkiem scaliłem `codex/noc` do `main`.** Cudzysłowy odwrotne
w moim skrypcie wykonały się jako polecenia i jednym z nich był `git merge`.
Cofnąłem to, `main` jest z powrotem tam, gdzie był, a praca leży nietknięta
na gałęzi. Wniosek na przyszłość: nie generować plików skryptem powłoki,
tylko zapisywać je wprost.

## Co zatrzymałem i dlaczego

Powiązanie rozmów z kartami klientów z modułu `customers` (zadanie K2).

Numer telefonu klienta siedzi w polu `primary_phone` encji `customer_entity`
i **jest szyfrowany**. Zwykłe wyszukanie po numerze nigdy by nie trafiło.
Potrzebny jest ich mechanizm pól skrótu, opisany w
`.ai/skills/om-data-model-design/references/sensitive-data.md`.

Nie chciałem tego zgadywać w nocy, bo błąd w tym miejscu nie wywala się
głośno, tylko po cichu nigdy nie dopasowuje. Zrobię to rano, czytając
ich kontrakt.

## Do zrobienia przez Ciebie, zanim ruszymy

1. **Skasować w Bitriksie rzeczy testowe:** leady 83 i 85, kontakt 3341,
   deal 10021.
2. **Wygenerować nowy webhook w Bitriksie**, bo poprzedni token wkleiłeś
   do czatu, więc jest w zapisie rozmowy. Stary skasować.
3. Zdecydować, czy scalamy `codex/noc`.

## Reszta decyzji

W `DECYZJE-OTWARTE.md`, dziesięć pozycji. Najpilniejsze: nazwa produktu
i trzy liczby do porównania "przed i po", bo to kryterium warte 30 procent
w ścieżce 03, a tych liczb nikt poza Tobą nie zna.
