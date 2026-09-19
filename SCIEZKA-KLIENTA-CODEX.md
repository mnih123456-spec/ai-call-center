# Ścieżka klienta: warsztat samochodowy w Radomiu

## Przejście krok po kroku

### 1. Dostaję login i szukam początku

**Co widzę:** W grupie „Voicebot” kolejność wynikająca z menu to: „Przegląd” (90), „Kampanie głosowe” i „Nowy klient” (oba 100), „Wczytaj listę” (105), „Połączenia i wyniki” (110), „Do sprawdzenia” i „Głosy” (oba 115), „Połączenie z CRM” (120), „Boty telefoniczne” (125), „Limity firmy” (130). Przy jednakowych numerach nie mam z tych plików pewności co do kolejności. Widoczność zależy od uprawnień. W szczególności „Nowy klient” wymaga prawa tworzenia kont firm.

**Co klikam:** Szukam „Ustaw swojego bota”. Nie znajduję, więc wchodzę w „Kampanie głosowe”, a potem szukam miejsca przygotowania bota. Jeżeli mam „Nowy klient”, zaglądam tam. Jeżeli nie, docieram niżej do „Boty telefoniczne”.

**Co myślę:** „Mam czterech mechaników i nieodebrane telefony. Dlaczego najpierw mam kampanie, a ustawienie bota prawie na końcu? Nowy klient to kierowca, który chce wymienić klocki, czy ja?”

*Zakres tego przejścia: odtwarzam widoki z kodu siedmiu wskazanych stron, ich metadanych, polskich tłumaczeń i bezpośrednio wyświetlanych komponentów. Nie loguję się do działającej aplikacji ani nie wykonuję rozmów. Pozostałe pozycje menu uwzględniam wyłącznie w kolejności. Nie zakładam konkretnych uprawnień, numerów, branż ani wyników zwracanych przez serwer.*

### 2. „Nowy klient”, jeżeli w ogóle mam ten ekran

**Co widzę:** Obietnicę „w minutę dostaniesz gotowego bota dla tej firmy”. Pola nazwy firmy, branży i opcjonalnej strony. Przykład to „Kancelaria Nowak”. Przycisk „Załóż konto i bota”.

**Co klikam:** Wpisuję nazwę warsztatu, szukam swojej branży na liście, wpisuję stronę, jeśli ją mam. Waham się przed założeniem konta, skoro właśnie dostałem login. Jeżeli kliknę i się uda, widzę „Gotowe”, informację o numerze albo „Zostało przypisać mu numer telefonu”, a pod spodem „Posłuchaj, jak brzmi” i „Zmień pytania”. Wybieram „Zmień pytania”, zanim pozwolę mu mówić za mnie.

**Co myślę:** „Czy zakładam drugą firmę? Czy dopiero uruchamiam tę kupioną usługę? Jeżeli konta nie uda się dokończyć, czy mam nacisnąć jeszcze raz? Przy braku numeru nie wiem, gdzie go przypisać.”

Jeżeli dostanę „Konto firmy powstało, ale bot nie”, zostaję z formularzem zakładania i bez przycisku dokończenia. Nie wiem, co już zostało założone i jak to naprawić.

### 3. „Boty telefoniczne”: pierwsze utworzenie albo poprawienie pytań

**Co widzę:** Jeśli nie mam bota, formularz „Załóż swojego bota”. Jeśli już go mam, kartę z nazwą, branżą, liczbą pytań i ewentualnym „zna stronę firmy”.

**Co klikam:** W wariancie bez bota wpisuję dane i naciskam „Załóż bota”. Po udanym odświeżeniu listy mam kartę bota, ale jako zwykły klient tracę całą sekcję tworzenia, razem z umieszczonym w niej potwierdzeniem i linkiem do testu. Sam muszę odkryć „Konfiguruj”.

W istniejącej karcie klikam „Konfiguruj”. Widzę pytania, wybór branży i stronę firmy. Wpisuję pytania o samochód, usterkę i dogodny termin. Szukam miejsca na godziny pracy i wolne terminy czterech mechaników. W tych formularzach nie znajduję kalendarza ani osobnego pola na takie ustalenia. Jeżeli nie mam strony, pozostają mi pytania, choć chcę również przekazać botowi odpowiedzi.

**Co myślę:** „Czy on tylko zbierze wiadomość, czy obieca klientowi termin? Skąd wie, kiedy mam wolny podnośnik? Sama strona warsztatu tego nie wie.”

Klikam „Zapisz i przekaż botowi”. Formularz się zwija. Link „Rozmowa testowa” był wewnątrz niego, więc aby go użyć po zapisaniu, muszę ponownie rozwinąć kartę albo wrócić do menu. Zapis nie prowadzi mnie dalej.

### 4. Wracam do kampanii, żeby usłyszeć bota

**Co widzę:** „Kampanie głosowe” i opis „Listy leadów obsługiwane przez bota telefonicznego”. Przy istniejącej kampanii jest „Posłuchaj, jak to brzmi”. Bez kampanii blok testowy w ogóle znika, a tabela każe utworzyć pierwszą kampanię.

**Co klikam:** Jeśli kampanii brakuje, wybieram „Nowa kampania”. Mam podać jej nazwę, „Agenta” i „Numer wychodzący”, gdzie dozwolone jest „Brak”. Nie wiem, czy agent to ten sam bot, którego przed chwilą ustawiałem. Zapisuję, ale dostaję tylko „Kampania została zapisana”.

**Co myślę:** „Czy już działa? Czy mam zmienić status na «W toku»? Czy wtedy sam zacznie dzwonić? Gdzie go zatrzymam?”

Jeżeli nie ma numerów, czytam o zamówieniu numeru u operatora, własnej centrali i łączu SIP. Kliknięcie „Zamów numer u partnera” otwiera zewnętrzną stronę. Nie dostaję tutaj ceny, instrukcji wyboru usługi, sposobu przekazania zamówionego numeru ani kontaktu do osoby, która ma go podłączyć. Jeśli numer już jest, ten sam link do zamawiania nadal widzę.

„Mam telefon warsztatu, na który dzwonią ludzie. Skoro zwykłej komórki nie da się podpiąć, to jak bot ma pomagać z moimi nieodebranymi połączeniami?”

### 5. Wykonuję próbę

**Co widzę:** Po otwarciu „Połączenie testowe” wybór kampanii i pole numeru z przykładem zaczynającym się od +48.

**Co klikam:** Wpisuję swój numer i naciskam „Zadzwoń”. Czekam na „Dzwonimy. Odbierz telefon”. Jeśli konto działa w symulacji, dopiero po kliknięciu dowiaduję się: „prawdziwy telefon nie zadzwoni, ale przepływ przeszedł”.

**Co myślę:** „Ile kosztuje ta próba? Ile mogę ich zrobić? Co to znaczy, że przepływ przeszedł, skoro chciałem posłuchać? Jeśli rozmowa się udała, gdzie teraz dodaję ludzi i gdzie sprawdzę, co bot ustalił?”

Pod wynikiem nie mam linku do listy kontaktów ani do wyników rozmowy. Wracam do menu.

### 6. „Wczytaj listę”: przepisuję numery z telefonu

**Co widzę:** „Wklej kontakty, a bot obdzwoni je po kolei z zachowaniem odstępu”. Wybór kampanii, duże pole tekstowe i instrukcję o przecinkach, średnikach, tabulatorach, prefiksie i opcjonalnym numerze sprawy.

**Co klikam:** Wklejam kilka numerów osób, do których nie zdążyłem oddzwonić. Widzę liczbę wierszy, ale nie widzę kosztu, czasu rozpoczęcia ani godzin wykonywania rozmów. Waham się przed „Wczytaj do kampanii”. Jeśli kliknę, dostaję „Dodano do kolejki”.

**Co myślę:** „Czy już do nich dzwoni? Jest wieczór. Czy najpierw mogę sprawdzić listę? Jak cofnąć zły numer? Co oznacza kolejka i gdzie ją znajdę?”

Nie mam stąd przycisku do wyników ani zatrzymania. Jeżeli część wpisów jest błędna, po dodaniu choć jednego kontaktu pole zostaje wyczyszczone. Widzę najwyżej pierwsze 20 błędnych wierszy i liczbę pozostałych, więc przy dłuższej liście nie mam nawet wszystkich błędów do poprawienia na ekranie.

Jeżeli nie mam kampanii, dostaję „Najpierw załóż kampanię”, ale bez linku. Jeżeli pobieranie kampanii się nie uda, ten widok może wyglądać tak samo: właściwy komunikat błędu jest umieszczony dopiero w gałęzi formularza z kampaniami.

### 7. „Połączenia i wyniki”: szukam umówionych napraw

**Co widzę:** Liczniki rozmów, „Z ustalonym produktem”, „Prosi o kontakt”, „Oddzwonili” i koszt. W tabeli między innymi „Produkt”, „Kwota”, „Rok umowy”, „Bank” i „CRM”. Jeśli odpowiednie dane przyjdą, nazwy produktów to „Hipoteka PLN”, „Kredyt walutowy” albo „Pożyczka gotówkowa”. Kolumna statusu wyświetla wartość z serwera bez tłumaczenia na tej stronie.

**Co klikam:** „Odśwież”, a przy rozmowie z dostępnym identyfikatorem nagrania „Posłuchaj”. Pod tabelą otwiera się odtwarzacz i zapis rozmowy. Przy braku zapisu dowiaduję się o dostawcy, który go nie udostępnił.

**Co myślę:** „Czy dostałem panel kancelarii od kredytów? Gdzie samochód, usterka i proponowany termin? Mam odsłuchiwać wszystkie rozmowy, żeby przepisać je do zeszytu? Widzę, ile osób prosi o kontakt, ale nie widzę tutaj przycisku, który pokaże właśnie te osoby albo pozwoli oznaczyć, że już się nimi zająłem.”

Nie widzę też, z której kampanii pochodzi wiersz. Bez nagrania nie mam tego przycisku, a choć dane strony przewidują podsumowanie, tabela go nie pokazuje. Pusta lista nie daje własnej instrukcji następnego kroku.

### 8. „Połączenie z CRM”: sprawdzam, czy czegoś nie pominąłem

**Co widzę:** „Brak połączenia z CRM” oraz informację, że wyniki zapisują się tylko w panelu. Formularz „System CRM”, a dla zewnętrznego systemu „Adres webhooka przychodzącego”. Instrukcja odsyła do Bitriksa, webhooków, uprawnień do modułu CRM i tokenu traktowanego jak hasło. Po skonfigurowaniu mogą pojawić się „Lejek” i „Etap, na którym ląduje nowa szansa”.

**Co klikam:** Otwieram listę systemów, próbując znaleźć coś dla siebie. Jeśli serwer udostępnia wbudowany system i go wybiorę, widzę, że wyniki trafią na karty klientów w panelu. Nadal nie mam linku do tych kart. Bez tego wyboru nie wiem, skąd wziąć wymagany adres. Wychodzę.

**Co myślę:** „Nie mam Bitriksa, mam warsztat. Czy bez tego bot nie będzie działał? Czy muszę coś jeszcze kupić? Nie chcę przekazywać jakiegoś hasła, żeby oddzwonić do pana od opon.”

Gdybym miał już połączenie i zmienił „Lejek”, zapis nastąpiłby od razu, mimo osobnego przycisku „Sprawdź i zapisz”. Nie spodziewam się, że samo oglądanie wyborów zmienia ustawienia.

### 9. „Limity firmy”: dopiero teraz szukam kontroli wydatków

**Co widzę:** Minuty w miesiącu, rozmowy równocześnie i liczbę głosów. Puste pole oznacza brak limitu. Po wyczerpaniu minut kolejne zlecenia są „zamykane z adnotacją”. „Sloty na głosy są wspólne dla wszystkich firm na koncie u dostawcy”.

**Co klikam:** Próbuję wpisać limit minut, ale nie wiem, jaki odpowiada mojemu budżetowi. Nie znajduję limitu w złotych. Przed „Zapisz” zastanawiam się, co stanie się z klientami, do których bot nie zdąży zadzwonić.

**Co myślę:** „Dlaczego moje głosy zależą od innych firm? Ile głosów potrzebuję przy czterech mechanikach? Czy zamknięty telefon przepadnie, czy wróci w przyszłym miesiącu? Gdzie odszukam te osoby i ponowię oddzwonienie?”

Po „Zapisano” nie dostaję odnośnika do rozmów zatrzymanych przez limit ani dalszego kroku. Nadal nie wiem, czy usługa obsługuje nieodebrane telefony z mojego warsztatu, czy tylko listę ręcznie wklejonych numerów.

## Problemy od najgorszego

Odnośniki wskazują bieżące pliki w repozytorium. Wnioski dotyczą pokazanej ścieżki, a nie potwierdzonego działania usług telefonicznych.

1. **Nie dochodzę do celu: obsługi pytań o termin w moim warsztacie.** Konfiguruję pytania i stronę, lecz nie dostaję sposobu przekazania dostępności mechaników ani wyjaśnienia, czy bot zbiera prośbę, czy umawia wizytę. Wprowadzanie numerów jest ręczne, bez pokazanej ścieżki od nieodebranego telefonu. Źródła: [pytania i wiedza](src/modules/voicebot/backend/voicebot-agenci/page.tsx#L298), [ręczna lista](src/modules/voicebot/backend/voicebot-import/page.tsx#L111).

2. **Brak numeru zatrzymuje uruchomienie i wypycha mnie do innej firmy.** „Podłączamy go tutaj” nie mówi kto, kiedy i jak. Nie wiem też, jak powiązać usługę z używaną komórką warsztatu. Nie mam kosztu ani instrukcji powrotu po zamówieniu. Źródło: [komunikat i link do partnera](src/modules/voicebot/backend/page.tsx#L186).

3. **Nie wiem, które kliknięcie zaczyna płatne obdzwonienie i jak je zatrzymać.** „Wczytaj” kończy się kolejką; nie ma podglądu planu, ceny, terminu startu ani odnośnika do zatrzymania. Edycja kampanii pokazuje statusy, ale nie objaśnia ich wpływu na telefonowanie. Nie przesądzam tutaj, jak realizuje to serwer. Źródła: [statusy](src/modules/voicebot/backend/page.tsx#L87), [edycja statusu](src/modules/voicebot/backend/page.tsx#L111), [zlecenie listy](src/modules/voicebot/backend/voicebot-import/page.tsx#L132), [wynik importu](src/modules/voicebot/backend/voicebot-import/page.tsx#L142).

4. **Wyniki wyglądają jak panel do kredytów, nie do warsztatu.** Bank, rok umowy i produkt kredytowy zajmują miejsce informacji potrzebnych do naprawy. Licznik „Prosi o kontakt” nie prowadzi do obsłużenia tych osób, a podsumowanie nie jest wyświetlane w kolumnach. Źródła: [nazwy produktów](src/modules/voicebot/backend/voicebot-calls/page.tsx#L35), [kolumny](src/modules/voicebot/backend/voicebot-calls/page.tsx#L111), [liczniki](src/modules/voicebot/backend/voicebot-calls/page.tsx#L173).

5. **Potwierdzenie utworzenia pierwszego bota znika właśnie temu, kto go potrzebuje.** Sukces ustawia wynik i odświeża profile. Gdy zwykły klient ma już pierwszy profil, warunek ukrywa sekcję tworzenia wraz z potwierdzeniem i linkiem do testu. Źródła: [obsługa sukcesu](src/modules/voicebot/backend/voicebot-agenci/page.tsx#L183), [warunek widoczności](src/modules/voicebot/backend/voicebot-agenci/page.tsx#L432), [ukrywane potwierdzenie](src/modules/voicebot/backend/voicebot-agenci/page.tsx#L484).

6. **Menu wymusza skakanie i nie rozróżnia przygotowania od codziennej pracy.** Bot jest po imporcie, wynikach i CRM, a limity na końcu. „Nowy klient” i kampanie mają ten sam porządek. Nazwa „Nowy klient” myli zakładanie konta firmy z dodawaniem klienta warsztatu. Źródła: [kampanie](src/modules/voicebot/backend/page.meta.ts#L8), [nowy klient](src/modules/voicebot/backend/voicebot-nowa-firma/page.meta.ts#L3), [import](src/modules/voicebot/backend/voicebot-import/page.meta.ts#L8), [wyniki](src/modules/voicebot/backend/voicebot-calls/page.meta.ts#L8), [CRM](src/modules/voicebot/backend/voicebot-crm/page.meta.ts#L8), [boty](src/modules/voicebot/backend/voicebot-agenci/page.meta.ts#L8), [limity](src/modules/voicebot/backend/voicebot-limity/page.meta.ts#L8).

7. **Częściowo założone konto nie ma ścieżki dokończenia.** Po błędzie organizacji lub bota nadal mam formularz rozpoczynający od utworzenia konta firmy. Nie ma osobnego wznowienia ani wskazania, dokąd przejść. Ponowne kliknięcie ponownie wysyła żądanie tworzenia konta; nie zakładam, czy serwer dopuści duplikat. Źródła: [początek operacji](src/modules/voicebot/backend/voicebot-nowa-firma/page.tsx#L73), [częściowe błędy](src/modules/voicebot/backend/voicebot-nowa-firma/page.tsx#L93), [błąd bota](src/modules/voicebot/backend/voicebot-nowa-firma/page.tsx#L111).

8. **Limity nie dają mi zrozumiałej kontroli kosztów, a grożą utratą oddzwonień.** Brakuje przeliczenia minut na budżet i objaśnienia odzyskania zamkniętych zleceń. Informacja o wspólnych slotach obciąża mnie sprawami operatora. Źródła: [brak limitu](src/modules/voicebot/backend/voicebot-limity/page.tsx#L104), [zamykane zlecenia](src/modules/voicebot/backend/voicebot-limity/page.tsx#L119), [sloty](src/modules/voicebot/backend/voicebot-limity/page.tsx#L131).

9. **CRM wygląda jak kolejny obowiązkowy etap wymagający informatyka.** Jest informacja, że wyniki zostają w panelu, ale nie ma prostego „Nie używam takiego systemu, przejdź do wyników”. Domyślny wybór strony to Bitrix24; formularz zewnętrzny wymaga webhooka. Dla wbudowanego systemu brakuje linku do zapowiedzianych kart klientów. Źródła: [domyślny wybór](src/modules/voicebot/backend/voicebot-crm/page.tsx#L30), [formularz](src/modules/voicebot/backend/voicebot-crm/page.tsx#L143), [wbudowany system](src/modules/voicebot/backend/voicebot-crm/page.tsx#L173), [instrukcja techniczna](src/modules/voicebot/backend/voicebot-crm/page.tsx#L216).

10. **Import utrudnia poprawienie błędów i ukrywa błąd pobierania kampanii.** Po częściowym sukcesie znika cały wpisany tekst, a lista pokazuje tylko 20 błędów. Błąd pobierania trafia do stanu, którego pusty wariant strony nie wyświetla. Źródła: [czyszczenie](src/modules/voicebot/backend/voicebot-import/page.tsx#L77), [pusta lista](src/modules/voicebot/backend/voicebot-import/page.tsx#L94), [miejsce błędu](src/modules/voicebot/backend/voicebot-import/page.tsx#L140), [ograniczenie listy](src/modules/voicebot/backend/voicebot-import/page.tsx#L165).

11. **Po kolejnych sukcesach muszę sam wymyślać następny krok.** Zapis bota zwija kartę z linkiem do testu, zapis kampanii tylko potwierdza zapis, test tylko informuje o dzwonieniu, import tylko liczy dodane pozycje. Źródła: [zwinięcie bota](src/modules/voicebot/backend/voicebot-agenci/page.tsx#L151), [link wewnątrz edycji](src/modules/voicebot/backend/voicebot-agenci/page.tsx#L401), [zapis kampanii](src/modules/voicebot/backend/page.tsx#L236), [wynik testu](src/modules/voicebot/backend/PolaczenieTestowe.tsx#L114), [wynik importu](src/modules/voicebot/backend/voicebot-import/page.tsx#L142).

12. **Próba nie wyjaśnia ceny i może wcale nie zadzwonić.** Symulacja ujawnia się dopiero w wyniku. Strona odbiera pole pozostałych testów, lecz nie pokazuje go użytkownikowi. Źródło: [odpowiedź i komunikaty testu](src/modules/voicebot/backend/PolaczenieTestowe.tsx#L46).

13. **Wybór lejka zapisuje ustawienia bez kliknięcia zapisu.** Przy próbie zrozumienia formularza mogę zmienić konfigurację, chociaż osobny przycisk sugeruje, że dopiero on zatwierdza. Źródła: [natychmiastowy zapis](src/modules/voicebot/backend/voicebot-crm/page.tsx#L98), [osobny przycisk](src/modules/voicebot/backend/voicebot-crm/page.tsx#L225).

14. **Awaria zamienia się w informację o waszym zapleczu albo surowe dane.** Brak konfiguracji dostawcy nie wskazuje sposobu uzyskania pomocy. Kampanie mogą pokazać identyfikator zamiast nazwy, wyniki surowy status i referencję CRM lub błąd. Źródła: [identyfikatory](src/modules/voicebot/backend/page.tsx#L76), [brak konfiguracji](src/modules/voicebot/backend/page.tsx#L173), [status](src/modules/voicebot/backend/voicebot-calls/page.tsx#L111), [referencja lub błąd CRM](src/modules/voicebot/backend/voicebot-calls/page.tsx#L134).

### Nazwy techniczne i żargon widoczny dla klienta

Poniżej spis z badanej powierzchni, także komunikatów warunkowych. Nazwy zależne od odpowiedzi serwera oznaczam osobno, zamiast wymyślać ich wartości.

| Napis lub pojęcie | Gdzie je spotykam |
| --- | --- |
| „Voicebot” | Grupa menu, np. [page.meta.ts:6](src/modules/voicebot/backend/page.meta.ts#L6). |
| „Bot”, „boty telefoniczne” | [Boty:239](src/modules/voicebot/backend/voicebot-agenci/page.tsx#L239). Samo pojęcie znam z zakupu, ale panel miesza je z „agentem”. |
| „Kampania”, „kampanie głosowe”, „edycja kampanii” | [Kampanie:105](src/modules/voicebot/backend/page.tsx#L105), [test:83](src/modules/voicebot/backend/PolaczenieTestowe.tsx#L83), [import:101](src/modules/voicebot/backend/voicebot-import/page.tsx#L101). |
| „Leadów” | [Kampanie:163](src/modules/voicebot/backend/page.tsx#L163). |
| „Agent”, „agenci”, „katalog”, „poza katalogiem” | [Kampanie:99](src/modules/voicebot/backend/page.tsx#L99), [106](src/modules/voicebot/backend/page.tsx#L106), [175](src/modules/voicebot/backend/page.tsx#L175). |
| „Konfiguracja dostawcy głosu”, „dostawca głosu” | [Kampanie:175](src/modules/voicebot/backend/page.tsx#L175), [boty:249](src/modules/voicebot/backend/voicebot-agenci/page.tsx#L249). |
| „Scenariusz u dostawcy” | Potwierdzenie usuwania, [boty:203](src/modules/voicebot/backend/voicebot-agenci/page.tsx#L203). |
| „Centrala”, „łącze SIP” | [Kampanie:194](src/modules/voicebot/backend/page.tsx#L194). |
| „Tryb symulacji”, „przepływ przeszedł” | Warunkowy wynik [testu:55](src/modules/voicebot/backend/PolaczenieTestowe.tsx#L55). |
| „Tabulator”, „prefiks”, „numer sprawy” | Instrukcja [importu:128](src/modules/voicebot/backend/voicebot-import/page.tsx#L128). Numer sprawy to żargon innej działalności. |
| „Kolejka”, „zlecenia”, „progi” | [Import:145](src/modules/voicebot/backend/voicebot-import/page.tsx#L145), [limity:107](src/modules/voicebot/backend/voicebot-limity/page.tsx#L107), [119](src/modules/voicebot/backend/voicebot-limity/page.tsx#L119), [125](src/modules/voicebot/backend/voicebot-limity/page.tsx#L125). |
| „CRM”, „System CRM”, „moduł CRM” | [Wyniki:135](src/modules/voicebot/backend/voicebot-calls/page.tsx#L135), [CRM:145](src/modules/voicebot/backend/voicebot-crm/page.tsx#L145), [220](src/modules/voicebot/backend/voicebot-crm/page.tsx#L220). |
| „Bitrix24”, „Bitriks” | Nazwa domyślnego systemu [CRM:25](src/modules/voicebot/backend/voicebot-crm/page.tsx#L25) i instrukcja [220](src/modules/voicebot/backend/voicebot-crm/page.tsx#L220). Nazwa produktu wymaga wyjaśnienia jego roli. |
| „Webhook”, „webhook przychodzący”, „adres webhooka” | [CRM:160](src/modules/voicebot/backend/voicebot-crm/page.tsx#L160), [220](src/modules/voicebot/backend/voicebot-crm/page.tsx#L220). |
| „Token”, „uprawnienie do modułu” | [CRM:220](src/modules/voicebot/backend/voicebot-crm/page.tsx#L220). |
| „Lejek”, „etap”, „nowa szansa” | Warunkowe pola [CRM:184](src/modules/voicebot/backend/voicebot-crm/page.tsx#L184), [197](src/modules/voicebot/backend/voicebot-crm/page.tsx#L197). |
| „Sloty na głosy”, „konto u dostawcy” | [Limity:131](src/modules/voicebot/backend/voicebot-limity/page.tsx#L131). |
| „Produkt”, „Z ustalonym produktem”, „Hipoteka PLN”, „Kredyt walutowy”, „Pożyczka gotówkowa”, „Rok umowy”, „Bank” | Żargon kredytowy w [wynikach:35](src/modules/voicebot/backend/voicebot-calls/page.tsx#L35), [114](src/modules/voicebot/backend/voicebot-calls/page.tsx#L114), [173](src/modules/voicebot/backend/voicebot-calls/page.tsx#L173). Wartości produktów pojawią się tylko przy odpowiednich danych. |
| Identyfikator agenta lub numeru, nieznany kod produktu, surowy status, referencja CRM, komunikaty błędów dostawcy | Warunkowe dane bez przetłumaczenia: [kampanie:79](src/modules/voicebot/backend/page.tsx#L79), [84](src/modules/voicebot/backend/page.tsx#L84), [wyniki:111](src/modules/voicebot/backend/voicebot-calls/page.tsx#L111), [115](src/modules/voicebot/backend/voicebot-calls/page.tsx#L115), [138](src/modules/voicebot/backend/voicebot-calls/page.tsx#L138), [CRM:213](src/modules/voicebot/backend/voicebot-crm/page.tsx#L213). Dokładne brzmienie zależy od serwera. |

Nie dopisuję „API” do widocznych etykiet, bo w przeczytanych widokach nie występuje. Nie przypisuję zwykłemu klientowi „Modelu rozmowy”, „Ciszy kończącej wypowiedź”, identyfikatora z ustawień operatora ani propozycji „Załóż bota dla kolejnej firmy” przy istniejącym bocie: kod ogranicza te elementy do operatora ([boty:356](src/modules/voicebot/backend/voicebot-agenci/page.tsx#L356), [432](src/modules/voicebot/backend/voicebot-agenci/page.tsx#L432)). Osobna pozycja „Nowy klient” pozostaje zależna od uprawnienia tworzenia firm.

Nie przejdę tej ścieżki sam do działającego oddzwaniania w sprawie terminów w moim warsztacie, tylko zadzwonię z pretensjami, że kupiłem pomoc z telefonami, a dostałem konfigurację kampanii i tabelę kredytów.
