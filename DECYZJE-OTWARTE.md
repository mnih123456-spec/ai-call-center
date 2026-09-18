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

## 3. Trzy liczby do porównania "przed i po"

Potrzebne do kryterium wartego 30% w ścieżce 03. Tylko Michał je zna:

- Ile leadów miesięcznie trzeba przedzwonić i potwierdzić?
- Ilu z nich nie odbiera za pierwszym razem?
- Ile czasu zajmuje człowiekowi jedna próba i ile kosztuje godzina tej osoby?

## 4. Nazwa produktu

Propozycje: Oddzwoni, HaloLead, Kredytofon, Pierwszy Kontakt, Kredka.
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
