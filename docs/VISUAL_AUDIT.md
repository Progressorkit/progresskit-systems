# ProgressKit Systems — audyt spójności wizualnej V4 final

## Cel
Jedna marka i jeden shell wizualny dla strony głównej i podstron produktów. Produkty mogą mieć własny akcent, ale nie własny, odrębny motyw całej strony.

## System bazowy
- tło: czarny / głęboki grafit (`#050607`, `#090b0d`)
- powierzchnie: ciemny stalowy grafit (`#0b0d0f`, `#111417`)
- tekst: chłodna biel i szary metalik (`#f3f5f6`, `#cfd6db`)
- główny sygnał marki: czerwień (`#ef1b2d`)
- logo w shellu: metaliczny `progressorkit-stamp.png`
- wspólne: promienie narożników, linie, typografia, CTA, header, footer, odstępy i karty

## Strona główna
Referencja systemu: grafit + metal + czerwone akcenty. Czerwień jest sygnałem, nie dominantą tła.

## Glikemia Premium
- wspólny shell ProgressKit
- globalne CTA pozostaje czerwone
- niebiesko-turkusowy akcent jest ograniczony do statusu, drobnych linii, obramowań i subtelnego światła produktu
- brak pełnego niebieskiego motywu strony

## ProgressKit Mail
- wspólny shell ProgressKit
- czerwony akcent ograniczony do statusów, linii i CTA
- realne zrzuty klienta Android zamiast generycznego renderu
- jeden zrzut z prawdziwą treścią wiadomości został zanonimizowany przez rozmycie tła; dialog systemowy pozostaje czytelny

## Funkcjonalność i dowody
- Glikemia: główna karta pokazuje pełną prezentację produktu; `Pobierz APK` jest dominującym CTA i używa liczonej ścieżki backendowej
- Mail: główna karta prowadzi do `/progresskit-mail/`; podstrona pokazuje sześć realnych ekranów, w tym realną wiadomość odebraną w kliencie Android
- Adivara: wizual pozostaje jawnie oznaczony jako wizualizacja UX w rozwoju
- GoTransport360 / Obserwator / KAN: bez martwych CTA

## Zasada na przyszłość
Nowa podstrona produktu dziedziczy bazowy shell ProgressKit. Kolor produktu może zajmować rolę akcentu lokalnego, ale nie może zastępować wspólnego grafitowo-stalowego języka marki.
