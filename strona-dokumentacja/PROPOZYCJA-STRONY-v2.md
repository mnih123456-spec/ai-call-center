# Propozycja strony aicallcenter.pl, wersja 2

Zapis 20.09.2026. Wersja 1 (dziś na serwerze) mówi o jednym problemie:
nieodebrane pierwsze telefony. To było pod konkurs. Wersja 2 ma mówić
o tym, co bot naprawdę załatwia, w obie strony, i czym różnimy się od
konkurencji.

## Co mówi konkurencja

| Kto | Główne hasło | Dla kogo | Model ceny |
|---|---|---|---|
| Fonio.ai | "recepcjonistka AI, która nie przegapi żadnego telefonu", start w 20 minut, RODO i AI Act | gabinety, nieruchomości, hydraulicy, hotele, dealerzy | abonament |
| InteliWISE | "Polski Voicebot nr 1", 1,50 zł za rozmowę zamiast 3,50 zł konsultanta, 10-100 rozmów naraz | e-commerce, banki, ubezpieczenia, call center | wdrożenie enterprise |
| Sono, Agisona, Callback24 | "obsługa telefoniczna 24/7", "do 70% niższe koszty" | firmy z infolinią | 0,50-2 zł za minutę |

Wspólny mianownik: sprzedają **zastąpienie infolinii**. Duże wdrożenia,
rozmowy przychodzące, cena za minutę.

Luka, w którą wchodzimy: **firma z kilkuset zgłoszeniami miesięcznie**,
bez infolinii, gdzie problemem nie jest odbieranie tysięcy telefonów, tylko
to, że zgłoszenie z reklamy leży kilka godzin, a potem ktoś dzwoni trzy razy
i przepisuje notatki do CRM. Nikt z powyższych nie mówi "wynik rozmowy jako
pola w Twoim CRM" ani "bot dla Twojej firmy w minutę, sam go ustawiasz".

## Pięć problemów, które bot rozwiązuje (kolejność na stronie)

### 1. Zgłoszenie czeka godzinami. Bot dzwoni w minutę.

Szansa na kontakt jest 100 razy większa w 5 minut od zgłoszenia niż po
30 minutach; po dobie 60 razy mniejsza (MIT, HBR). Zgłoszenie z reklamy
o 21:40 dostaje telefon o 21:41, nie następnego dnia o 11. To jest problem
numer jeden i to on ma być w nagłówku, nie "nie odbierają".

### 2. Klient oddzwania i nikt nie odbiera. Bot odbiera zawsze i wie, kto dzwoni.

62 procent telefonów do małych firm zostaje bez odpowiedzi, 85 procent
dzwoniących nie próbuje drugi raz. Bot odbiera, rozpoznaje numer, wie, że
to oddzwonienie na naszą próbę sprzed godziny, i kończy sprawę. Rozmowy
przychodzące, także poza godzinami.

### 3. Handlowiec dostaje numer. Powinien dostać odpowiedzi.

Bot zadaje pytania, które firma ustawiła, i oddaje wynik jako pola w CRM:
rodzaj kredytu, kwota, rok, bank; albo marka, rocznik, usterka, termin.
Człowiek dzwoni tylko do tych, do których warto, i wie, o czym rozmawiać.
Nagranie i transkrypcja obok, na dowód.

### 4. Trzecia próba się nie odbywa. Bot nie zapomina.

93 procent klientów, którzy w końcu kupią, wymaga od dwóch do sześciu
prób. Bot dzwoni ponownie w ustalonych odstępach i godzinach, każdą próbę
zapisuje, a po oddzwonieniu klienta przestaje. Człowiek nie musi pamiętać.

### 5. Potwierdzenia, przypomnienia, uśpione bazy.

Ta sama maszyna dzwoni do wczytanej listy: potwierdza wizyty, przypomina
o dokumentach, pyta starą bazę, czy temat jest aktualny. 35 groszy za
rozmowę, 2 grosze za nieodebraną próbę.

## Obietnica na nagłówek (formuła: komu, co, w jakim czasie, bez czego)

> Każde zgłoszenie dostaje telefon w minutę. Każdy, kto oddzwoni, zostaje
> odebrany. Twój zespół dostaje gotowe odpowiedzi w CRM, nie listę numerów
> do wykręcenia.

Podtytuł: Bot głosowy dla firm, które mają zgłoszenia z reklam i formularzy,
a nie infolinię. Ustawiasz go sam w minutę, mówi po polsku, pyta o to, o co
Ty byś zapytał.

## Mechanizm, którego nie ma konkurencja (sekcja "Jak to działa")

1. Podajesz nazwę firmy i branżę. Bot przedstawia się Twoją nazwą i zna
   pojęcia Twojej branży. Minuta.
2. Dostajesz gotowe pytania, zmieniasz je jak chcesz. Każde pytanie to
   kolumna w wynikach.
3. Zgłoszenie wpada z formularza, reklamy albo Twojego systemu przez API.
   Bot dzwoni w minutę, dzwoni ponownie, odbiera oddzwonienia.
4. Wynik ląduje w Twoim CRM jako pola. Nagranie i transkrypcja obok.

## Dowód

- Rozmowa do odsłuchania na stronie (nagranie z 20.09, kancelaria, 46 s).
- Liczby z badań z przypisem (już są).
- Koszt: 300 zgłoszeń, 900 prób, 60 godzin pracy zespołu za 2400 zł wobec
  około 120 zł bota (już jest).

## Oferta i gwarancja (metodyka AK)

- Wejście bez ryzyka: "Usłysz bota na swoim numerze w 60 sekund" zostaje
  jako główne wezwanie. Nikt nie kupuje bota bez usłyszenia go.
- Gwarancja z własną nazwą, nie "zwrot pieniędzy": **"Pierwsze 100 rozmów
  na nasz koszt"**. Klient widzi wyniki w CRM, zanim zapłaci. Zwrot nie jest
  potrzebny, bo nic nie zapłacił.
- Cena za rozmowę, nie za minutę, zakotwiczona na koszcie człowieka
  (4 minuty i 2,70 zł za próbę), nie na cenach konkurencji.
- Zniszowanie na start: kancelarie kredytowe (znamy branżę, mamy słownik
  i wyniki), potem serwisy, fotowoltaika, nieruchomości, gabinety, czyli
  branże, które panel już obsługuje. Osobna podstrona na branżę, ten sam
  produkt, inne pytania i inny przykład rozmowy.

## Czego nie pisać

- Że to zastępuje call center. Nie zastępuje, i nie z tym konkurujemy.
- Że rozwiązuje "nieodbieranie" w ogóle. To jeden z pięciu problemów,
  a nie nagłówek.
- Liczb konkretnego klienta (usunięte 20.09).

## Do decyzji z Michałem

- Czy hasło ma iść w "minutę od zgłoszenia" (problem 1), czy w "wynik w CRM"
  (problem 3). Rekomendacja: 1 w nagłówku, 3 jako przewaga.
- Czy nagranie rozmowy na stronie ma być z kancelarii (branża startowa),
  czy neutralne (serwis samochodowy).
- Czy "pierwsze 100 rozmów na nasz koszt" jest do udźwignięcia: 100 rozmów
  to około 35 zł u dostawcy plus minuty operatora.

## Decyzje Michała, 20.09 (głosowo, w drodze)

- Na stronie nigdzie o kancelarii i nic z kancelarii. Komunikacja ogólna.
- Żadnej rozmowy do odsłuchania na wierzchu strony. Zamiast tego rejestracja
  z numerem i bot dzwoni do zainteresowanego; zaangażowanie przed dowodem.
- Sześć prób: to statystyka Velocify (3,5 mln zgłoszeń), nie dane Michała.
