# C1 — kolejka polaczen z odstepem

Import i pojedynczy `POST /api/voicebot/calls` zapisuja `pending`, a po
zatwierdzeniu zapisu publikuja zadania do `voicebot-outbound-calls`.
Worker korzysta z `startOutboundCall`. `callId` jest trwalym kluczem
idempotencji; ponowne dostarczenie zadania nie dzwoni drugi raz.

Uzyty kontrakt: `@open-mercato/queue` w wersji
`0.7.1-develop.7202.1.a52dc6707c`, `createModuleQueue`, `enqueue({ ... },
{ delayMs })` oraz odkrywany `workers/outbound-calls.ts`. Scheduler nie jest
wlaczony w `src/modules.ts`; dlatego czekanie realizuje opoznione zadanie
istniejacej kolejki, bez wlasnego timera i bez zmiany rejestru modulow.
Resolver `framework:context` napotkal `spawnSync rg EPERM`; kontrakt
potwierdzono bezposrednio w eksportach i typach zainstalowanego pakietu.

## Dlaczego tak

- Blokada wiersza kampanii w transakcji obejmuje sprawdzenie odstepu i
  rezerwacje `pending -> dialing`. Samo `concurrency: 1` nie chroniloby
  przed drugim procesem workera.
- Wywolanie dostawcy nastepuje **po commit**. Podczas zlecania `dialing`
  bez `conversationId` blokuje kolejne starty tej kampanii.
- Odstep jest minimalny: liczony konserwatywnie od pozniejszej z dat
  `startedAt` i `updatedAt` ostatniej proby. Opozniona odpowiedz dostawcy
  ani webhook nie skroci limitu. Rzeczywista przerwa moze byc dluzsza.
- To odstep pomiedzy zleceniami, nie czekanie na koniec calej rozmowy.
  Po potwierdzeniu zlecenia nastepna rozmowa moze ruszyc po uplywie limitu.
- Najstarsze pending ma pierwszenstwo. Kampanie sa od siebie niezalezne.
  `paused` odklada zadania o 30 sekund, `finished` i usunieta kampania
  nie dzwonia. `draft` zachowuje mozliwosc jawnego zlecania jak dotychczas.
- Zakres zapisywany do zadania pochodzi z `getAuthFromRequest`, nigdy
  z JSON klienta. Kazdy odczyt i zapis workera sprawdza oba identyfikatory.
- Odpowiedz workera nie nadpisuje zakonczonej rozmowy, jesli webhook
  dotarl przed odpowiedzia HTTP dostawcy.

## Uruchomienie i odzyskiwanie

Po `yarn generate` worker jest w rejestrach runtime i CLI. Dla wybranej
strategii uruchom frameworkowy worker (albo uzyj istniejacego `worker --all`):

```text
yarn mercato queue worker voicebot-outbound-calls
```

Dla `local` uruchamiaj jeden proces konsumenta tej kolejki, zgodnie z
ograniczeniem transportu frameworka. `async` korzysta z ustawien Redis
aplikacji. Nie zmieniono domyslnej strategii ani polityki ponowien.

Stare pending sprzed instalacji tej zmiany, utracone zadania i awarie
publikacji odzyskuje uwierzytelnione API:

```text
POST /api/voicebot/calls/dispatch
Content-Type: application/json

{"campaignId":"UUID kampanii"}
```

Wymaga `voicebot.calls.start`. Publikuje tylko istniejace pending wskazanej
kampanii w organizacji sesji. Nie tworzy nowych polaczen. Powtorzenie jest
bezpieczne. Import rowniez ponownie publikuje pozostale pending.
`queuePending: true` w odpowiedzi importu lub zlecenia oznacza: rekordy
zapisano, ale publikacja wymaga odzyskania ta trasa. Nie ponawiaj tworzenia
pojedynczego polaczenia tylko z powodu tej flagi.

Po przerwaniu procesu pomiedzy rezerwacja a zapisem odpowiedzi dostawcy
`dialing` bez `conversationId` pozostaje zablokowane. Tak samo traktowana
jest odpowiedz sukcesu bez identyfikatora rozmowy. Webhook moze uzupelnic
wynik; w przeciwnym razie trzeba ustalic faktyczny stan u dostawcy przed
reczna korekta. Automatyczne przestawienie na pending groziloby drugim
platnym telefonem. Trasa `dispatch` celowo tego nie robi.

## Zgodnosc API

`POST /calls` nadal zwraca 201 i identyfikator rekordu. Zamiast natychmiastowego
wyniku dostawcy zwraca `status: pending`, `conversationId: null`,
`simulated: false` i dodatkowe `queuePending`. `simulated` na tym etapie
nie opisuje wyniku przyszlego wywolania. Wynik nalezy czytac z listy rozmow;
odrzucenie u dostawcy jest teraz zapisywane asynchronicznie jako `failed`,
a nie zwracane synchronicznie jako 502. Jest to zamierzona zmiana C1.

## Weryfikacja i dziennik zadania

Testy: `node src/modules/voicebot/run-tests.cjs`.
Test transportu async potrzebuje lokalnego Redis na `127.0.0.1:6379`.
Tworzy i usuwa wlasna kolejke o losowej nazwie; nie dotyka danych aplikacji.
Testy telefonow uzywaja atrapy dostawcy i bazy — nie wykonuja platnych rozmow.

Runner zachowuje Jest i transformer repozytorium. Lokalna konfiguracja
pomija nieistniejacy `jest.setup.ts`; fallback resolvera omija niedzialajacy
binding Windows `unrs-resolver` bez zmian w `node_modules`.

Sprawdzone: piec startow co 10 sekund, duplikaty i rownolegle zadania,
wolny dostawca, pauza/wznowienie, odrebne kampanie, zakresy tenant/org,
rollback, odrzucenie dostawcy, wyscig z webhookiem, odzyskanie publikacji,
oba wejscia API oraz rzeczywiste opoznienia transportow local i async.
Blokada SQL jest sprawdzana na poziomie kontraktu/mocka, nie na zywej bazie.

Nie zmieniono encji; migracja nie jest potrzebna i nie byla uruchamiana.
`yarn generate` zakonczone powodzeniem, z ostrzezeniem o statycznym
generowaniu OpenAPI po `spawn EPERM`. Typecheck nie wykazal bledow voicebot,
ale globalnie pozostaja diagnostyki w `agent_examples` oraz brak
`@open-mercato/web-research` w wygenerowanym rejestrze adapterow.

Ten wpis pelni role dziennika C1 i lokalnej lekcji o idempotencji zlecenia.
Pozostaje w module, aby dotrzymac ograniczenia zmian do `src/modules/voicebot`.
