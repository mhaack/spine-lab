# Spine Lab

Data tests for a bookshelf app that draws real book spines at real size.

## Design

`design/DESIGN.md` beschreibt das App-Design (Farben, Schriften, Bausteine, Regal-Logik, Screens)
mit Tokens für CSS und SwiftUI. Die Screens aus dem Design-Canvas liegen in `design/screens/`,
der Rücken-Generator als lauffähiger Prototyp in `design/prototypes/spine-lab.html`.

## ISBN tester

`index.html` is a single-page tester, served by GitHub Pages at
https://mhaack.github.io/spine-lab/. Enter an ISBN (or tap a sample) to compare
what each source returns: pages, height, dimensions and cover. "Run all test
ISBNs" checks sixteen German and thirteen English editions and shows a hit rate per field.

## `isbn-lookup` Edge Function

`supabase/functions/isbn-lookup/index.ts` runs on Supabase and merges five
sources for one ISBN:

| Source | Used for |
|---|---|
| DNB SRU (MARC21-xml) | German editions: pages (`300 $a`), height in cm (`300 $c`), editions |
| K10plus SRU (MARCXML) | German union catalogue (GBV/SWB): same MARC fields, backup when the DNB is down |
| Library of Congress SRU (MARCXML) | English editions: same MARC fields as the DNB |
| Open Library | Page count, physical dimensions, cover |
| DNB / MVB cover service | Cover availability check only (display rights restricted) |

```
GET https://itzvyiwotjxywkpesznj.supabase.co/functions/v1/isbn-lookup?isbn=9783257228007
```

Returns `summary` (one value per source) and `sources` (full per-source detail,
including every DNB record). Accepts 10- or 13-digit ISBNs, with or without hyphens.

### Deploy

```sh
supabase functions deploy isbn-lookup --project-ref itzvyiwotjxywkpesznj
```

Google Books was tried and removed: it rejects requests from Supabase's servers
(`503 backendFailed`) and its free quota ran out quickly when called from the browser.

WorldCat is not included: OCLC only issues API keys to member libraries and
people working on their behalf.
