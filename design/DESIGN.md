# Rücken – Design

Arbeitstitel einer Bücherregal-App: Bücher erscheinen als echte Buchrücken in echter Größe,
werden per Barcode gescannt und stehen in einem Regal, das sich wie ein eigenes Zimmer anfühlt.

Diese Datei ist die Vorlage für die Umsetzung. Die Screens in `screens/` zeigen, wie es aussehen
soll. Sie sind im Format des Design-Canvas (`.dc.html`) geschrieben und laufen nicht eigenständig
(sie laden ein `support.js`, das es hier nicht gibt). Lies sie als Spezifikation: Markup, Maße,
Farben und Texte sind verbindlich, die `{{…}}`-Platzhalter und `<sc-for>`/`<sc-if>` sind
Template-Syntax des Canvas.

`prototypes/spine-lab.html` ist der lauffähige Prototyp des Rücken-Generators (im Browser öffnen).

## Prinzipien

1. **Echte Maße.** Höhe aus dem Katalog (DNB, Library of Congress), Dicke aus der Seitenzahl.
   Ein Millimeter im Regal ist ein Millimeter in echt; der Maßstab ist pro Ansicht ein fester Faktor.
2. **Rücken zuerst.** Jeder Rücken wird erzeugt (Farbe, Schrift, Stil). Einzelne Lieblingsbücher
   stehen mit dem Cover nach vorn.
3. **Scannen zuerst.** Barcode vor die Kamera, das Buch sortiert sich ein. Tippen ist der Plan B.
4. **Dein Leseraum.** Wand, Holz, Licht und Deko frei wählbar. Deko lockert die Reihen auf.

## Farben

| Token | Hex | Verwendung |
|---|---|---|
| `ground` | `#120F0D` | App-Hintergrund |
| `surface` | `#1C1815` | Karten, Segmente, Bottom Sheets |
| `surface-2` | `#241F1B` | Hinweis-Boxen, Icon-Kacheln |
| `line` | `#2F2924` | Rahmen, inaktive Fortschrittsbalken |
| `paper` | `#F2EBDF` | Text, primärer Button |
| `paper-soft` | `#C9BEB0` | Untertitel, inaktive Chips |
| `muted` | `#A3978A` | Labels, Nebentexte (6,5:1 auf `ground`) |
| `brass` | `#D6A24A` | Akzent: Auswahl, Fortschritt, Scan-Button |
| `wood` | `#7E5435` | Regalbrett im Standard-Thema |

Auswahl wird immer mit `brass` markiert (2px Rahmen oder Füllung), nie nur über Farbe des Textes.

## Schrift

Alle drei Schriften sind Google Fonts (OFL), für iOS bündelbar.

| Rolle | Schrift | Größen |
|---|---|---|
| Überschriften, große Zahlen | **Young Serif** 400 | 22–31 px Screens, 44–68 px Zahlen |
| Untertitel, Autorennamen, Rücken (Stil „klassisch“/„schlicht“) | **Newsreader** kursiv 400/500 | 16–21 px |
| Bedienelemente, Labels, Zahlen in Tabellen | **Hanken Grotesk** 500/600/700 | 11–17 px |

- Eyebrow-Labels: 11–13 px, 600, Großbuchstaben, Laufweite 0,1 em, Farbe `muted` oder `brass`.
- Zahlen in Listen mit `tabular-nums`.

## Layout und Bausteine

Bildschirm 390 × 844 pt, Seitenrand 20–24 pt, Abstand oben 56 pt (unter der Statusleiste).

- **Primärer Button:** 56 pt hoch, voll gerundet, `paper` auf `ground`-Text, 17 pt / 600, unten mit 34 pt Abstand.
- **Sekundärer Button:** Text in `paper`, kein Hintergrund, 44 pt hoch.
- **Zurück / Icon-Button:** Kreis 44 pt, 1 pt Rahmen `line`, Linien-Icon 18–20 pt.
- **Fortschritt (Onboarding):** 4 pt Balken, Spur `line`, Füllung `brass`, neben dem Zurück-Button.
- **Chips:** 36 pt hoch, aktiv gefüllt `paper`, inaktiv 1 pt `line` mit Text `paper-soft`.
- **Segmente:** Spur `surface` mit 4 pt Innenabstand, aktives Segment gefüllt (`paper` oder `brass`).
- **Auswahl-Kacheln (Wand/Holz/Licht/Deko):** 72 × 84 pt, Radius 14, Vorschau der Wand mit Brett-Streifen, Label darunter.
- **Karten:** `surface`, 1 pt `line`, Radius 14–18.
- **Tab-Leiste:** Regal · Scannen (erhöhter `brass`-Kreis 58 pt) · Lesejahr.
- Icons: eigene Linien-Icons, 1,6–2,2 pt Strich, keine Emoji.

## Das Regal

Referenz-Implementierung: `screens/Shelf.dc.html` (Logik im `<script>`-Block).

### Rücken-Geometrie

```
dicke_mm  = seiten × papier + deckel
            papier: dünn 0,045 · normal 0,055 · voluminös 0,075 (mm pro Seite)
            deckel: Taschenbuch 1 mm · Hardcover 4 mm
hoehe_mm  = Katalogwert (DNB/LoC, ganze cm) × 10, Fallback 190 mm
pixel     = mm × k   (k = Maßstab der Ansicht, z. B. 0,62 Widget, 0,85 Regal, 1,1 Detail)
```

- Text nur ab 8 px Rückenbreite; Schriftgröße ≈ 50 % der Breite (fett: 60 %), gedeckelt.
- Leserichtung: deutsch von unten nach oben (180° gedreht), englisch von oben nach unten; umschaltbar.
- Verlagskürzel klein am Fuß, wenn Platz ist.
- Tintenfarbe nach Helligkeit der Rückenfarbe (Luminanz > 0,42 → dunkle Tinte), Stil „klassisch“ mit Goldton.
- Farbe: aus dem Cover gesampelt (häufigste gesättigte Farbe), sonst aus einer Palette.

### Rücken-Stile

| Stil | Merkmal |
|---|---|
| Band | Querband im oberen Drittel, Großbuchstaben Hanken Grotesk 600 |
| Klassisch | zwei doppelte Goldlinien oben und unten, Newsreader |
| Schlicht | nur Titel, Newsreader 500 |
| Kräftig | große Großbuchstaben, Hanken Grotesk 700 |

„Automatisch“ wählt pro Buch einen Stil (z. B. Reclam immer schlicht).

### Regal-Optionen

| Kategorie | Optionen (Wand / Brett) |
|---|---|
| Wand | Lesesaal `#2A201B`/`#7E5435` · Mitternacht `#121419`/`#2C2F38` · Leinen `#E6DED0`/`#C2B293` · Moos `#232C26`/`#6B5638` · Tinte `#1B2033`/`#3B415E` |
| Holz | Passend (zur Wand) · Eiche `#B5895A` · Nussbaum `#5C3D29` · Kirsche `#8C4A32` · Birke `#D8C9AE` · Schwarz `#201E1D` |
| Licht | Aus · Leselampe (warmer Lichtkegel von oben) · Lichterkette (Lämpchen an der Brettkante) · Mondlicht (kühler Kegel) |
| Deko | Katze · Lampe · Buchstütze · Pflanze (mehrfach wählbar) |

- Brett: 12 pt hoch, Oberkante 28 % aufgehellt, weicher Schatten nach unten; Seitenwangen 8 pt.
- Reihenhöhe = 240 mm × k.
- Deko: höchstens ein Objekt pro Reihe, abwechselnd am Anfang und am Ende.
- Cover nach vorn: Bücher mit diesem Schalter stehen frontal (Breite ≈ 0,64 × Höhe), mit Schatten.

### Einordnen und Sortieren

- **Automatisch:** nach Farbe (Farbton, Grau ans Ende), Autor (Nachname), Höhe (absteigend), zuletzt hinzugefügt.
- **Von Hand:** Buch gedrückt halten und ziehen; Cover, Deko und Buchstützen verschiebbar.
- **Neue Bücher:** passend einreihen (zeigt „Brett 2, nach Farbe“) oder ans Ende stellen.
- Reihen werden von links aufgefüllt, ein Buch, das nicht passt, rutscht in die nächste Reihe.

## Screens und Ablauf

| Datei | Screen | Weiter zu |
|---|---|---|
| `01-Leseziel` | Jahresziel per Schieberegler, Regal wächst mit, „≈ 42 cm Regal pro Jahr“ | 02 |
| `02-Hochrechnung` | „In zehn Jahren stehen hier 240 Bücher“, 4,2 m Regal, 15 Tage pro Buch | 03 |
| `03-Regal-gestalten` | Wand / Holz / Licht / Deko mit Live-Vorschau | 04 |
| `04-Erste-Buecher` | Scannen, Goodreads-CSV, Suche nach Titel/ISBN | 06 |
| `05-Regal` | Startseite: Regal, Filter-Chips, „Liest du gerade“, Tab-Leiste | 06, 07, 09, 03 |
| `06-Scanner` | Kamera mit Rahmen, Ergebnis-Sheet mit Rücken, Maßen und Einordnungs-Hinweis | 05, 09 |
| `07-Buchdetail` | Großer Rücken, Maße, Rücken/Cover-Schalter, Lesestatus, Stil und Farbe | 05 |
| `09-Ordnen` | Automatisch vs. von Hand, Sortieroptionen, Regel für neue Bücher | 05 |
| `08-Widgets` | iOS-Widgets: Aktuelles Buch, Lesejahr, Regal mittel und groß | – |

Rechenbasis im Onboarding: 300 Seiten pro Buch → 17,5 mm Rücken.

## Datenquellen

Siehe `supabase/functions/isbn-lookup`: DNB (deutsche Ausgaben, Seiten und Höhe), Library of
Congress (englische Ausgaben), Open Library (Seiten, teils Dicke, Cover). Google Books wurde
entfernt. Cover-Bilder nur mit geklärten Nutzungsrechten anzeigen; die Rückenfarbe darf aus dem
Cover gesampelt werden.

## Tokens zum Kopieren

### CSS

```css
:root {
  --ground: #120F0D; --surface: #1C1815; --surface-2: #241F1B; --line: #2F2924;
  --paper: #F2EBDF; --paper-soft: #C9BEB0; --muted: #A3978A; --brass: #D6A24A; --wood: #7E5435;
  --font-display: "Young Serif", Georgia, serif;
  --font-serif: "Newsreader", Georgia, serif;
  --font-ui: "Hanken Grotesk", "Helvetica Neue", sans-serif;
  --radius-card: 14px; --radius-tile: 14px; --radius-sheet: 26px;
  --gutter: 20px; --button-h: 56px; --hit: 44px;
}
```

### SwiftUI

```swift
import SwiftUI

extension Color {
    init(hex: UInt32) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255)
    }
    static let ground    = Color(hex: 0x120F0D)
    static let surface   = Color(hex: 0x1C1815)
    static let surface2  = Color(hex: 0x241F1B)
    static let line      = Color(hex: 0x2F2924)
    static let paper     = Color(hex: 0xF2EBDF)
    static let paperSoft = Color(hex: 0xC9BEB0)
    static let muted     = Color(hex: 0xA3978A)
    static let brass     = Color(hex: 0xD6A24A)
    static let wood      = Color(hex: 0x7E5435)
}

extension Font {
    static func display(_ size: CGFloat) -> Font { .custom("YoungSerif-Regular", size: size) }
    static func serifItalic(_ size: CGFloat) -> Font { .custom("Newsreader-Italic", size: size) }
    static func ui(_ size: CGFloat, _ weight: Font.Weight = .semibold) -> Font {
        .custom("HankenGrotesk-Regular", size: size).weight(weight)
    }
}

/// Rückendicke in mm (siehe „Rücken-Geometrie“).
func spineThicknessMM(pages: Int, hardcover: Bool, paper: Double = 0.055) -> Double {
    Double(pages) * paper + (hardcover ? 4 : 1)
}
```

Die PostScript-Namen der Fonts nach dem Einbinden mit `UIFont.familyNames` prüfen.
