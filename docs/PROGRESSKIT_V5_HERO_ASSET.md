# ProgressKit V5 — asset krajobrazu HERO

Data: 2026-10-15.

## Autoryzacja i zakres

Właściciel wskazał istniejącą makietę jako źródło zatwierdzonego krajobrazu i polecił usunąć z niego wtopiony interfejs. Wykorzystano skill imagegen w trybie **wbudowanego narzędzia**, operację edycji istniejącego obrazu. Nie uruchamiano CLI ani bezpośredniego API.

Nie generowano logotypu, monogramu, napisu PROGRESSKIT ani nowej koncepcji krajobrazu. Oryginalne logo jest niezależnym zasobem obsługiwanym przez implementację strony.

## Źródło

- Plik: `/home/pawe/Pobrane/a_dark_cinematic_high_end_ux_ui_website_landing.png`.
- Wymiary: **1024 × 1536 px**.
- Rozmiar: **2 062 911 B**.
- SHA-256: `d0bdf4566efcce79dd43d6ab7f5c156be66047ea2fd023cf310d283989478a5a`.
- Obejrzano lokalnie przed edycją.
- Wybrany obszar źródła: hero w przybliżeniu x=0–1024, y=68–440; nawigacja nad nim i cały interfejs poniżej wyłączone z wyniku.
- Źródło pozostaje niezmienione. Pełna makieta nie jest materiałem do publikacji ani obrazem produktu.

## Prompt przekazany narzędziu

```text
Use case: precise-object-edit.
Asset type: clean website hero landscape extracted from the supplied existing mockup.
Input image: EDIT TARGET, not a style reference. Edit this exact existing landscape; do not generate another landscape.
Primary request: Extract only the wide hero scenery occupying approximately x=0..1024 and y=68..440 of the 1024x1536 source image. Remove every baked-in UI element in that region: the large PROGRESSKIT SYSTEMS lettering, the slogan, the red-outlined button and its arrow, and ALL lettering engraved on the right-hand wall. Reconstruct only the scenery concealed by those overlays. Exclude the top navigation and every category tile, project card, section and footer below the hero.
Invariants: preserve the original jagged mountain ridge shapes and positions across the bottom, the huge planet/moon with its thin red illuminated arc in the upper center-right, the tall monolithic dark stone wall panels at the right, the original perspective/camera/composition, original gray stone textures, black sky, red rim lighting, and dark monumental mood. The moon may remain naturally cut off by the top edge exactly as in the existing hero. Do not relocate or redesign the moon, mountains or wall.
Composition/framing: one wide landscape wallpaper, approximately 2.5:1 to 2.75:1 aspect ratio, faithfully matching that hero crop; upscale the extracted scene cleanly if needed. No surrounding webpage, no border, no UI.
Text: absolutely none. No words, symbols, engraved letters, placeholder text, logos or monograms anywhere. Do not create a PK logo or a PROGRESSKIT word. No new objects, buildings, people, stars, product images or decorative features. No new scenery and no creative reinterpretation. Only remove the overlays from the existing hero and restore their obscured background.
```

Parametry: `referenced_image_paths` wskazujący wyłącznie powyższy oryginał; `transparent_background=false`. Jedno wywołanie, bez kolejnych wariantów lub alternatywnych pejzaży.

## Wynik

Wynik wbudowanej edycji:
- Plik: `/home/pawe/.codex/generated_images/01a13ea4-42f0-7373-8dd2-2db61ad473e3/exec-90bdf079-d534-433d-b023-64c95cf6698c.png`.
- Wymiary: **1983 × 793 px**, proporcje około **2,50:1**.
- Rozmiar: **2 212 542 B**.
- SHA-256: `954bdff17d5ae0b0d8e54e59605c1ac6c27b70c7c15d3f0e3dfc8fc0517e4d86`.

Zasób strony:
- Plik: `assets/brand/hero-landscape-v5.webp`.
- Wymiary: **1983 × 793 px** — bez zmiany kadru i rozdzielczości względem wyniku edycji.
- Rozmiar: **201 050 B**.
- SHA-256: `78842ff512a72cf732bdbe74a989c1a992bea11f49e90a6e0a11f9e85dd9b0ad`.
- Optymalizacja: konwersja PNG do WebP, Pillow, quality=92, method=6. Bez ręcznego retuszu lub dopisywania elementów.

## Kontrola obrazu i ograniczenia

Obejrzano cały oryginał oraz wynik edycji lokalnym `view_image`, następnie także finalny WebP.

Kontrola wzrokowa:
- **PASS:** usunięto nagłówek, slogan, przycisk, strzałkę i wszystkie widoczne litery z kamiennej ściany.
- **PASS:** brak nawigacji, kategorii, kart produktów, stopki, znaków PK, napisów lub innych elementów UI.
- **PASS:** zachowano rozpoznawalną kompozycję wskazanego źródła — poszarpane góry w dolnej części, wielki księżyc/planetę z czerwonym łukiem, monolityczną ścianę po prawej i ciemne oświetlenie kamienia.
- **PASS:** brak danych prywatnych i treści produktowych w krajobrazie.
- Edycja generatywna odtwarza obszary zasłonięte oryginalnym tekstem i może zmieniać drobne szczegóły tekstur. Nie jest to wycięcie identyczne pikselowo; nie deklarujemy takiej zgodności.
- Oględziny nie stanowią akceptacji właściciela ani testu finalnego kadrowania strony na urządzeniach.
- Ocena końcowej kompozycji HERO i zgoda na publikację pozostają osobną bramką. Nie przeprowadzono wdrożenia.

Zakres zmian tego podzadania: wyłącznie nowy WebP i ten dokument. Bez modyfikacji kodu, CSS, konfiguracji ani oryginału.
