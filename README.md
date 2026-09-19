# AI call center

Moduł Open Mercato, który prowadzi rozmowy telefoniczne za firmę i oddaje ich
wynik jako gotowe pola, a nie nagranie do odsłuchania.

Powstał na hackathonie HackOn, 18-20 września 2026, jako nakładka: rdzeń
Open Mercato nie był modyfikowany, całość siedzi w `src/modules/voicebot`.

## Co robi

Każda firma to osobny tenant z własnym botem, numerem, CRM-em i scenariuszem.
Bot przedstawia się nazwą tej firmy, posługuje się pojęciami jej branży
i zadaje pytania, które ona ustawiła.

Rozmowy idą w obie strony. Gdy ktoś nie odbierze i oddzwoni później, system
dokleja oddzwonienie do pierwotnej próby, zamiast zakładać oderwany rekord.
Firmę rozpoznaje po numerze, na który ktoś zadzwonił. Wynik trafia do CRM
klienta, na wybrany przez niego lejek i etap.

## Opinia o pracy z Open Mercato

Piszemy ją po dwóch dniach budowania na tym frameworku, z perspektywy
niewielkiego zespołu, który przyszedł z konkretnym problemem, a nie
z ciekawości.

### Co nam oszczędziło najwięcej czasu

**Wielotenantowość, której nie trzeba budować.** To jest najmocniejsza rzecz
w tym frameworku i zorientowaliśmy się w tym dopiero, gdy zobaczyliśmy, ile
kodu jej nie napisaliśmy. Zakres tenanta i organizacji jest w sesji, a nie
w treści żądania. Przeglądarka może najwyżej poprosić o przełączenie na inną
firmę ciasteczkiem wyboru, ale to serwer sprawdza, czy zalogowany ma do niej
prawo, i tylko operator platformy ma je do wszystkich. Przełącznik
organizacji dostaliśmy gotowy. Na scenie pokazujemy przełączenie firmy i pustą
listę drugiego klienta, i to jest prawdziwy dowód izolacji, a nie slajd o niej.

Gdybyśmy budowali to sami, zeszłoby nam na to więcej czasu niż na cały moduł
i zrobilibyśmy to gorzej.

**Nakładka zamiast forka.** Przez dwa dni ani razu nie musieliśmy zmienić
niczego w `node_modules`. Cały moduł to jeden katalog, który da się przenieść
do innej instalacji.

**Migracje ze snapshotem.** `yarn db:generate` generuje migrację z różnicy
w encjach, a snapshot pilnuje, żeby dwie osoby nie wygenerowały sprzecznych.
Zrobiliśmy tak pięć zmian schematu w dwa dni, bez ani jednej kolizji.

**Kolejka jako moduł, nie jako biblioteka.** Kolejka połączeń z blokadą
`PESSIMISTIC_WRITE` w bazie była kluczowa: chroni przed dwoma workerami na
dwóch maszynach, a nie tylko przed dwoma wątkami w jednym procesie. To
dostaliśmy z frameworka.

**Mapa szyfrowania kolumn.** Adres webhooka do CRM klienta zawiera w sobie
żeton dostępowy, czyli jest hasłem. Objęcie kolumny szyfrowaniem to było
dopisanie jednego wpisu w `encryption.ts`.

**Wygenerowane fakty o modułach w `.ai/guides`.** To jest rzecz, której nie
widzieliśmy w żadnym innym frameworku, a która dla zespołu pracującego
z agentem AI ma ogromne znaczenie. Zamiast czytać cudzy kod, agent czyta
zwięzły, wygenerowany opis kontraktu modułu. Oszczędza to mnóstwo kontekstu
i zapobiega zgadywaniu.

### Co nas kosztowało czas

**Pola z wartością domyślną są nadal wymagane przy tworzeniu encji.**
Kolumna z `default` w bazie nie zwalnia z podania wartości w `em.create`.
Wygląda to jak niespójność i trafiliśmy w nią kilka razy, za każdym razem
tracąc kilkanaście minut.

**Łatwo zapomnieć o `yarn generate`.** Po zmianie plików odkrywanych przez
framework, na przykład dodaniu ekranu, trasa po prostu nie istnieje, a błąd
nie mówi dlaczego. Ostrzeżenie w konsoli przy niezgodności między plikami
a wygenerowanymi rejestrami bardzo by pomogło.

**Ekrany administracyjne nie są przetłumaczone.** Zakładanie tenanta ma
napisy wpisane w kod na sztywno, po angielsku, bez kluczy tłumaczeń, więc
nie da się tego poprawić słownikiem. W polskim produkcie widać to od razu.
W menu "Tenants" przetłumaczono jako "Najemcy", czyli lokatorów.

**Środowisko deweloperskie jest ciężkie.** Dwa projekty Open Mercato
uruchomione naraz nasyciły procesor laptopa w stu procentach. Przy jednym
projekcie jest dobrze, ale warto o tym wiedzieć przed hackathonem.

**Restart potrafi zostawić osierocony proces.** Kilka razy port pomocniczy
został zajęty po zatrzymaniu serwera i kolejne uruchomienie kończyło się
komunikatem, który nie wskazywał przyczyny.

### Czy zbudowalibyśmy to jeszcze raz na Open Mercato

Tak, i to bez wahania, ale z jednego konkretnego powodu.

Nasz produkt jest wielotenantowy od pierwszego dnia: każdy klient to osobna
firma z własnymi danymi, własnym CRM-em i własnym botem. To jest dokładnie
ten rodzaj aplikacji, przy którym Open Mercato daje najwięcej, bo
rozdzielenie firm, uprawnienia i migracje ma gotowe i przemyślane.

Gdybyśmy budowali prostą aplikację dla jednej firmy, framework byłby za
ciężki. Przy produkcie dla wielu firm jest odwrotnie: oszczędza tygodnie
i, co ważniejsze, oszczędza błędy, których nie widać w testach, tylko
u pierwszego klienta.

## Struktura modułu

    src/modules/voicebot/
      data/          encje, walidatory
      api/           trasy API z metadanymi uprawnień
      backend/       ekrany panelu
      lib/           logika: kolejka, dostawca, CRM, limity, branże, wiedza
      workers/       worker kolejki połączeń
      migrations/    migracje i snapshot

## Dokumentacja projektu

| Plik | Zawartość |
|---|---|
| `ZGLOSZENIE-HACKON.md` | liczby i uzasadnienie biznesowe |
| `SCENARIUSZ-DEMO.md` | scenariusz obu wystąpień |
| `DECYZJE-OTWARTE.md` | decyzje podjęte i czekające, z uzasadnieniem |
| `NA-PONIEDZIALEK.md` | dług do spłacenia po hackathonie |
| `PO-RESTARCIE.md` | jak podnieść środowisko po restarcie laptopa |
| `src/modules/voicebot/WIEDZA-Z-LINKU.md` | jak działa czytanie strony firmy |
