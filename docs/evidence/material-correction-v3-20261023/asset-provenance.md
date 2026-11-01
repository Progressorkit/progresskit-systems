# Materiały V3 — audyt pochodzenia grafik

Data: 2026-10-23. Repozytorium: `ProgressorKit Systems`, baza Git `9322e4e4b35be58517fbf7073c8015673770ef43`.

**Status stopki: `BLOCKED_ORIGINAL_NOT_IDENTIFIED`.** Dokładny oryginał czerwonego aluminium oraz oryginał lasu z górami przeznaczony do stopki pozostają `NOT_IDENTIFIED` w sprawdzonych zasobach. Nie jest to wynik odbioru wizualnego stopki ani dowód nieistnienia materiałów w innych lokalizacjach.

## Zakres i granice poszukiwania

- Bezpośredni odczyt repozytorium: 187 commitów osiągalnych z dostępnych refs; 77 historycznych ścieżek obrazów poza `docs/evidence/`; dokumenty pochodzenia i wskazane w nich briefy TXT; bieżące pliki oraz historyczne bloby obrazów.
- `git fsck --full --no-reflogs --unreachable`: 46 nieosiągalnych blobów, w tym dwa obrazy JPEG. Powiązania z drzewami wskazują screenshoty Glikemii w `glikemia foto/`, nie materiał stopki. Nie kopiowano tych obrazów do dowodów.
- `docs/reference` nie istnieje w sprawdzanym drzewie; dostępna historia `git log --all -- docs/reference` nie zawiera wpisów.
- Według niezależnego przeszukania lokalnych zasobów, przekazanego przez koordynatora: dostępne attachments obejmowały 148 TXT i jeden JSON, bez plików obrazów; `/mnt/data` było nieobecne. Nie powtarzano tego szerokiego przeszukania podczas zapisu raportu.
- Po zakończeniu poszukiwań zweryfikowano wyłącznie dwie konkretnie wskazane makiety poniżej. Ograniczone poszukiwanie nie obejmuje każdej lokalizacji, archiwum ani wcześniejszej wiadomości poza dostępnymi źródłami.

## Dwie odnalezione makiety — wyłącznie referencje wizualne

Koordynator obejrzał oba obrazy: pokazują srebrne aluminium, czerwone odbicia i mechanizm; nie zawierają stopki. Bezpośrednio zweryfikowano ich ścieżki, rozmiary, wymiary i SHA-256. Obie pozycje mają status `VISUAL_REFERENCE_ONLY`; żadnej nie utożsamiono z poszukiwanym oryginałem aluminium lub krajobrazu stopki.

| Plik lokalny | Wymiary / bajty | SHA-256 |
| --- | --- | --- |
| `/home/pawe/Pobrane/exec-40370cb3-2236-475d-a781-26110ab6c815.png` | 1586×992 / 2 155 696 | `49e12c3a7d45beec5907faa71daf86db1491257cfe2c41577e75981978c89906` |
| `/home/pawe/Pobrane/exec-83313dab-3881-4601-81c1-27b25191c6b7.png` | 1586×992 / 2 303 149 | `c0e478b3dc7d92f59246185684094388c1bb548c22d06d9757bdba7364a85d22` |

## Krajobraz HERO jest osobnym materiałem

[PROGRESSKIT_V5_HERO_ASSET.md](../../PROGRESSKIT_V5_HERO_ASSET.md) dokumentuje edycję generatywną istniejącej makiety. Polecenie dotyczyło obszaru HERO z górami, księżycem i murem; wyraźnie wyłączało sekcje oraz stopkę poniżej HERO. Wynik odtwarza zasłonięte piksele i nie jest identycznym wycięciem źródła. Nie ma dowodu wiążącego go z oryginałem lasu z górami do stopki.

| Etap pochodzenia | Plik | Stan / SHA-256 |
| --- | --- | --- |
| Udokumentowana makieta źródłowa HERO | `/home/pawe/Pobrane/a_dark_cinematic_high_end_ux_ui_website_landing.png` | Nieobecna pod tą ścieżką podczas sprawdzenia. Dokument podaje 1024×1536, 2 062 911 B i `d0bdf4566efcce79dd43d6ab7f5c156be66047ea2fd023cf310d283989478a5a`; nie jest to bieżąca weryfikacja bajtów brakującego pliku. |
| Wynik edycji generatywnej | `/home/pawe/.codex/generated_images/01a13ea4-42f0-7373-8dd2-2db61ad473e3/exec-90bdf079-d534-433d-b023-64c95cf6698c.png` | Istnieje; bezpośrednio zgodny hash `954bdff17d5ae0b0d8e54e59605c1ac6c27b70c7c15d3f0e3dfc8fc0517e4d86`, 1983×793, 2 212 542 B. **Nie jest oryginałem stopki.** |
| Publiczny zasób po konwersji WebP | `assets/brand/hero-landscape-v5.webp` | Istnieje; bezpośrednio zgodny hash `78842ff512a72cf732bdbe74a989c1a992bea11f49e90a6e0a11f9e85dd9b0ad`, 1983×793, 201 050 B. **Nie jest oryginałem stopki.** |

Pierwsze dodanie WebP i dokumentu pochodzenia w dostępnych refs: `cca27e0da61bec239ea95d216377ea3b54cfe77b`, 2026-10-15 11:10:59 +02:00. Dodanie do obecnej linii `main`: `6a52e83a7fd12699190ccf0b25974486030cb162`, 2026-10-20 14:53:40 +02:00. Git blob WebP: `9b92ef7123a3cc0b480bba54eac13f4cb9901dbf`.

## Wykluczone starsze kandydatury

Obejrzano `bg1.jpg`, `bg2.jpg`, `bg3.jpg` oraz `zdjtlo.png`; `bg4.jpg` jest bajtowo identyczne z `bg2.jpg`. Pierwsze i czwarte tło odczytano z historii Git. Tła przedstawiają zielone efekty Matrix/tech, a `zdjtlo.png` — osobę przy komputerze. Nie są poszukiwanymi materiałami.

| Ścieżka | SHA-256 | Pierwsze dodanie tej ścieżki |
| --- | --- | --- |
| `bg1.jpg` | `ffcb47869ffea3a71a06d94db7f43653d9dcaec1df1c33f16edf523703e95968` | `90e0d43a885e131b00840ec486d1ed806e344043`, 2026-02-02 |
| `bg2.jpg` / `bg4.jpg` | `77eeef84f8cb91b002b2e5ad24d8a2b2bbd6947271815d9dfab4d3a7165a65c3` | Odpowiednio `eb5fa360957b9a4277a6c235a8789e9a4980c4d5` / `da5d24079ebfa95f0541d07dccdb2c67a5395ee0`, 2026-02-02 |
| `bg3.jpg` | `689b744dbb4bc1d4033d8cc6b224ffb0e57769e126613e0ce304767f4748fda7` | `b1fff60a5fce8fb50cfe51b5fff8f89d2debe8d1`, 2026-02-02 |
| `zdjtlo.png` | `0e47f9c63af667cd14e3e7352abd5d3979884d46553ba97667c0ec2ac54cdc56` | `46d0e1a88a23f84e5e37cf4c323ba42242088c3e`, 2026-03-30 |

Sprawdzone briefy `b21f1fcf-8ba4-4301-878e-aad9198154e3/Wklejony tekst.txt` oraz `9af5415e-ff1d-4412-9d8f-4ae031d12779/Wklejony tekst.txt` opisują odpowiednio HERO z górami/księżycem/murem i ciemne szczotkowane aluminium. Pierwszy wymienia stopkę w kolejności sekcji, ale nie wskazuje pliku lasu z górami ani oryginalnej tekstury do niej.

## Wniosek operacyjny

Stopka pozostaje bez zmian do jednoznacznej identyfikacji oryginałów. Koordynator wysłał opcjonalne pytanie o ich ścieżki; odpowiedź była oczekiwana podczas zapisu tego raportu. Brak odpowiedzi nie jest zgodą na użycie innego materiału. Nie wygenerowano zamienników, nie przeniesiono HERO do stopki i nie nadano stopce wyniku `VISUAL_PASS`. Zapis tego podzadania obejmuje wyłącznie niniejszy dokument oraz `asset-provenance.json`, bez zmian produktu, commit/push/deploy.
