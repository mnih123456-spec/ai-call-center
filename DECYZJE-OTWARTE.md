# Decyzje czekające na Michała

Lista pytań, które padły i nie zostały rozstrzygnięte. Nowe na dole.
Po rozstrzygnięciu wpis wędruje do `..\DZIENNIK-PRAC.md`.

## 1. Commit na gałęzi czy na main

Zmiany "Rozmowy przychodzace i sklejanie oddzwonien" (`0532925`) siedzą
na gałęzi `voicebot-rozmowy-przychodzace`. Na `main` jest tylko szkielet.

Dla jury prostsza jest jedna liniowa historia na `main`.

**Do decyzji:** przenieść czy zostawić na gałęzi.

## 2. Skąd firmy-klienci biorą numer

Na demo: używamy numeru ACTIO, który już mamy. Ustalone.

**Do decyzji na później:** czy docelowo klient przynosi swój numer przez SIP,
czy my mu numer dajemy. Druga droga może oznaczać działalność
telekomunikacyjną i wpis do rejestru UKE, co trzeba sprawdzić.

## 3. ROZSTRZYGNIETE: liczby do porownania przed i po

Potrzebne do kryterium wartego 30% w ścieżce 03. Tylko Michał je zna:

Dane z panelu raportow, 1-18 wrzesnia 2026 (18 dni):

- **180 nowych kontaktow**
- **149 na etapie kontakt 2**, czyli 82,8 procent nie odebralo za pierwszym razem
- **4 minuty** na jedna probe: wejsc w karte, wybrac numer, odczekac, wpisac
  notatke, zamknac
- pracownik: placa minimalna plus 1000 zl premii

Po przeliczeniu na miesiac: 300 kontaktow, 548 prob, 36,5 godziny, okolo
1480 zl. Bot: okolo 110 zl.

**Do potwierdzenia przez Michala:** wysokosc placy minimalnej w 2026.
W wyliczeniu podstawione 4666 zl, czyli stawka z 2025.

## 4. Nazwa produktu

Nazwa robocza ustalona 19.09: **AI call center**. Docelowa nadal otwarta.
W grze: Oddzwoni, Odbiera, Telefonistka, Dyzurka, Linia, Pierwszy Kontakt.
Żadna nie wybrana.

## 5. Nieznane połączenie na telefon Michała

18.09 wieczorem zadzwonił do niego bot z nieznanego numeru. Na koncie
ElevenLabs nic tego dnia nie wychodziło, ostatnia rozmowa jest z 16.09 15:42.
Czyli szło skądinąd, prawdopodobnie ze starej konfiguracji Make.

**Do ustalenia:** jaki numer się wyświetlił. Bez tego nie ma czego szukać.

## 6. Wideo zapasowe

Obowiązkowe we wszystkich ścieżkach. Nagrywamy w sobotę wieczorem,
nie w niedzielę rano.

**Do decyzji:** kto nagrywa i czym.

## 7. Dane demo

Regulamin ścieżki 03 zabrania używania prawdziwych danych firmy.
Potrzebny zestaw zmyślonych leadów do pokazania na scenie.

**Do decyzji:** ile rekordów i jakie nazwiska.

## 8. Webhook w panelu ElevenLabs

Sekret podpisu generuje ElevenLabs, nie my. Trzeba go założyć ręcznie:

1. Panel ElevenLabs, ustawienia obszaru roboczego, sekcja webhooków.
2. Wkleić adres tunelu z końcówką `/api/voicebot/webhook`.
3. Skopiować pokazany raz sekret.
4. Wkleić go do `.env` jako `VOICEBOT_WEBHOOK_SECRET` i zrestartować serwer.

**Uwaga:** adres tunelu Cloudflare zmienia się przy każdym uruchomieniu.
Po restarcie laptopa trzeba go w ElevenLabs podmienić. Na demo warto odpalić
tunel raz, rano, i już go nie ruszać.

Adres z 18.09 wieczorem: `https://bronze-joins-rather-treaty.trycloudflare.com`

## 9. Prawdziwy numer Michała w bazie demo

W tabeli połączeń zostały dwa wiersze "Michal Test" z numerem `+48503956401`,
pamiątka po teście prawdziwym telefonem z 16.09.

Na scenie i na relacji wyświetliłby się prawdziwy numer.

**Do decyzji:** skasować je przy uruchamianiu danych demo. Dowód z tamtego
testu jest opisany w dzienniku, więc nic nie ginie.

## 10. Kolejność prac

Zaproponowana: licznik kosztów, potem złącze CRM z Bitrixem,
potem powiązanie z kartami klientów z modułu `customers`.

Bez odpowiedzi, więc idę po kolei od licznika kosztów.

## 11. Limity dla firm-klientów

Wszyscy klienci korzystają z jednego konta u dostawcy głosu, więc limity
dostawcy są wspólne i jeden klient może je zjeść pozostałym.

**Najpilniejsze, bo kosztowe:** zakresy numerów, na które wolno dzwonić.
Bez tego klient wkleja listę z numerami premium albo zagranicznymi, a rachunek
idzie na nas. Dopuścić polskie komórki i stacjonarne, zakresy premium
zablokować wprost.

Pozostałe do ustalenia:

- minuty na tenanta w miesiącu
- liczba głosów na tenanta (slotów jest 30 na całe konto, 9 już zajętych)
- rozmowy równoczesne na tenanta (kolejka pilnuje odstępu w kampanii,
  ale klient może założyć pięćdziesiąt kampanii)

## 12. Skąd firmy biorą numer, wersja rozstrzygnięta technicznie

Zwykłego numeru komórkowego nie da się podpiąć do dostawcy głosu, bo operator
komórkowy nie daje łącza SIP. Firma ma trzy wyjścia: przenieść numer do
operatora SIP, ustawić przekierowanie z komórki na numer SIP (działa tylko dla
przychodzących), albo wziąć nowy numer.

Fonio robi to samo: "numer od fonio albo podłącz swoją centralę przez SIP".
Centrala, nie komórka.

**Rekomendacja:** nie podpisywać umowy na odsprzedaż numerów. To czyni nas
przedsiębiorcą telekomunikacyjnym z wpisem do UKE i odpowiedzialnością za ruch.
Lepiej, żeby klient podpisał umowę z operatorem sam, a my tylko konfigurujemy
łącze. Sprzedajemy oprogramowanie, nie minuty.

**ROZSTRZYGNIETE 19.09:** nie odsprzedajemy numerow. Zamiast tego
porozumienie o wspolpracy z operatorem, z prowizja od podpisanych umow.

W panelu, w miejscu wyboru numeru, ma byc skrot: **Zamow numer u partnera**,
prowadzacy wprost do operatora. Klient podpisuje umowe sam albo podlacza
wlasne lacze SIP. My sprzedajemy oprogramowanie, nie minuty.

**Do zrobienia w kodzie:** odnosnik na ekranie kampanii, widoczny zwlaszcza
wtedy, gdy lista numerow u dostawcy jest pusta. Ekran kampanii jest teraz
w rekach Codexa na galezi codex/noc, wiec dokladamy to po scaleniu.

## 13. Role numerów na koncie, ustalone 19.09

| Numer | Rola |
|---|---|
| `48732129033` ACTIO produkcja | **do demo i testów**, przychodzące i wychodzące |
| `+48457112147` ACTIO test | **do demo i testów**, zapasowy |
| `+48223783966` DATERA test | prawdopodobnie nie działa, nie używać |
| `+48570372252` | komórkowy Michała przypisany do jednej z firm |
| `+48503956401` | prywatny i firmowy numer Michała. **Na demie to on gra klienta**: na ten numer bot dzwoni i z tego numeru Michał oddzwania |

Wniosek dla danych demo: numeru `+48503956401` nie pokazujemy na liście jako
danych historycznych, bo to prawdziwy numer. Na scenie pojawi się wyłącznie
jako świeża rozmowa, wykonana na żywo, i można go zasłonić przyciskiem.

## 14. ACTIO: co mają i o czym trzeba wiedzieć

Sprawdzone na ich stronie 19.09.

**Przydatne dla nas:**

- **SMS API**: REST z webhookami, od 0,075 zł za SMS. Czyli SMS po rozmowie
  da się zrobić u tego samego operatora co telefonię.
- **Wirtualny numer komórkowy bez karty SIM**, od 25 zł netto miesięcznie.
  To rozwiązuje problem firmy, która chce numer komórkowy, a nie stacjonarny.
- **Zarejestrowany operator w UKE z prawem przenoszenia numerów (MNP)**,
  więc model z prowizją i umową klienta bezpośrednio z nimi jest wykonalny.

**Ostrzeżenie strategiczne:** ACTIO ma w ofercie **własnego AI Voicebota**,
oznaczonego jako nowość. Nasz dostawca łącza wchodzi w tę samą branżę.

To nie przekreśla współpracy, ale zmienia charakter rozmowy: negocjujemy
z kimś, kto jest jednocześnie partnerem i konkurentem.

**Do decyzji:** czy przy rozmowie o prowizji pokazujemy im produkt, czy tylko
pytamy o warunki na numery i SMS.

## 15. PRZYPOMNIENIE: przegląd kodu o 15:00

**19.09 około 15:00 Michał uruchamia w czacie komendę:**

    /code-review ultra

To wielogłowy przegląd całej gałęzi w chmurze, płatny, uruchamiany wyłącznie
przez użytkownika. Claude nie może go odpalić sam.

**Dlaczego nie ja:** przeglądam własny kod, więc czytam to, co zamierzałem
napisać, a nie to, co faktycznie napisałem. Wartość daje czytelnik, który
tego nie pisał.

**Dlaczego o 15:00:** wcześniej przejrzy połowę roboty i trzeba będzie
powtarzać.

**Claude ma o tym przypomnieć**, gdy zegar zbliży się do tej godziny.

## 16. Hasła wklejone do czatu, do zmiany po hackatonie

W zapisie tej rozmowy znajdują się:

- żeton webhooka Bitrix24 (wklejony 18.09 wieczorem)
- hasło do konta `ai@aicallcenter.pl` (wklejone 19.09 rano)

Oba trzeba zmienić po hackatonie. Zapis rozmowy jest przechowywany i nie
należy zakładać, że nikt go nigdy nie przeczyta.

## 17. Dwaj tenanci w bazie demo

Założone 19.09 do pokazania wielotenantowości:

- `Acme Corp` (`5fba395b-...`) - firma z danymi, 19 rozmów, Bitrix podłączony
- `Kancelaria Nowak (demo)` (`0e4af89c-...`) - pusta, do pokazania izolacji

Sprawdzone na żywo: przełączenie organizacji zmienia widok na pusty,
bez przecieku danych. Każda firma ma własną konfigurację CRM.
