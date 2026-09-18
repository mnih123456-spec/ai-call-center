# C4 — edycja kampanii

Dodano PUT `/api/voicebot/campaigns` i przycisk „Edytuj” w liście kampanii.
Tworzenie i edycja używają wspólnego formularza CrudForm oraz katalogu agentów
i numerów. Edycja pozwala zmienić nazwę, agenta, numer i status: draft, running,
paused lub finished. Brak zapisanej pozycji w katalogu nie podmienia jej na
pierwszą dostępną. Anulowanie nie zapisuje zmian.

PUT korzysta z campaignUpdateSchema, wymaga `id` i `updatedAt` z GET oraz
uprawnienia `voicebot.campaigns.manage`. Pozostałe pola są opcjonalne. Pominięcie
odstępu połączeń zachowuje jego dotychczasową wartość. Zakres pochodzi z sesji;
brak tenanta lub organizacji blokuje zapis, a obcy/usunięty rekord zwraca 404.
Komenda wykonuje kontrolę wersji i aktualizację pod blokadą w jednej transakcji.
Stara wersja zwraca 409 obsługiwane przez standardowy formularz. Audyt przechowuje
stan przed i po zmianie; powrót do wcześniejszego numeru wymaga jawnej edycji.

Trasa zlecania połączeń już odczytuje agentId i phoneNumberId z kampanii przy
każdym nowym zleceniu. Nie zmieniano jej ani kolejki. Nie wykonano prawdziwego
telefonu ani testu z aktywnym dostawcą. Encje nie zmieniły się, więc migracja
nie jest potrzebna i nie została uruchomiona.

Weryfikacja:

- 19 testów komendy i mapowania danych formularza przechodzi. Baza i CrudForm
  są zastąpione atrapami; nie jest to test przeglądarkowy ani integracyjny bazy.
- `yarn.cmd generate` i ESLint zmienionych plików TypeScript przechodzą.
- `yarn.cmd typecheck` ujawnia błędy spoza voicebota: agent_examples oraz brak
  @open-mercato/web-research w wygenerowanym web-research-adapters.generated.ts.

Standardowy Jest w tym środowisku Windows nie ładuje natywnego unrs-resolver.
Powtarzalne uruchomienie tych samych testów Jesta z lokalnym resolverem Node:

```text
node src/modules/voicebot/commands/__tests__/run-tests.cjs
```

Notatkę umieszczono w module, ponieważ zadanie ogranicza zapisy do
`src/modules/voicebot`; nie zmieniano wspólnego dziennika poza tym katalogiem.
