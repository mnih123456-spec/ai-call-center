# Zlecenia Michala - zapis na biezaco

## 2026-09-19, wieczor

| # | Zlecenie | Stan |
|---|---|---|
| 1 | Wyciac zakladanie nowego klienta z ekranu z pytaniami bota | zrobione |
| 2 | Wyciac "Zaloz kolejnego klienta" z ekranu po zalozeniu | zrobione |
| 3 | "Zmien pytania" ma wchodzic prosto w edycje pytan | zrobione, karta otwiera sie sama |
| 4 | Rozmowa probna ma byc wykonalna zaraz po zalozeniu | zrobione, wychodzi z numeru platformy |
| 5 | Pytania branzy samochodowej maja brzmiec jak pytania do czlowieka | zrobione |
| 6 | Zdjac "Ostatnia operacja: Utworz organizacje" | zrobione |
| 7 | Wlasna branza z wiedza branzowa | zrobione 19.09 wieczor: kolumna `industry_knowledge`, pole na obu ekranach, tresc idzie do promptu |
| 8 | Zapisywac zlecenia w osobnym pliku | ten plik |
| 9 | Menu w kolejnosci sciezki klienta | zrobione |
| 10 | Poprawic wylogowywanie | zrobione wczesniej |

## 2026-09-19, noc

| # | Zlecenie | Stan |
|---|---|---|
| 11 | Przelacznik "Widok klienta / Widok admina" w naglowku, tylko dla operatora | zrobione, `src/components/WidokKlienta.tsx` + CSS w `globals.css` |
| 12 | W widoku klienta tylko menu Voicebot, bez Nowy klient, Limity, CRM | zrobione |
| 13 | Oczko w naglowku zaslaniajace dane, wspolne z tabelami | zrobione |
| 14 | Lewe menu z widocznym paskiem przewijania | zrobione |
| 15 | Bot mowil "dzien dobry" drugi raz | zrobione, regula w `REGULY_STALE`; dziala dla botow zakladanych od teraz i po zapisie pytan |
| 16 | Pytania kredytowe jak w pierwszej kampanii u dostawcy | zrobione, 4 pytania + dokladne instrukcje wyciagania odpowiedzi |
| 17 | Jakosc zapisanych odpowiedzi | opisy pol przepisane, slowa kluczowe dla rozpoznawania mowy, ponowna transkrypcja po ciszy |

## Znalezione i naprawione przy okazji

- Bot zakladany dla warsztatu zbieral pola kredytowe z szablonu (kwota, bank,
  rok umowy) zamiast pol z pytan branzy. To bylo ogniwo, przez ktore kolumny
  wynikow nie mialy szans dzialac.
- Przycisk "Usun bota" nie dzialal nigdy: blokowala go kampania startowa,
  ktora sami zakladamy przy kazdym bocie. Teraz kampania gasnie razem z botem.
- Rozmowa probna znikala firmie, ktora przed chwila zalozyla konto.

## TODO po hackathonie

- Branze jako dane w bazie, silnik uczy sie branz z rozmow klientow.
- Rotacja kluczy: ElevenLabs, haslo ai@aicallcenter.pl, token Bitrix.
- Skasowac _NIE-WYSYLAC-NA-SERWER/ftp.netrc.
