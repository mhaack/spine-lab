# Spine Lab

Data tests for a bookshelf app that draws real book spines at real size.

## ISBN tester

`index.html` is a single-page tester, served by GitHub Pages at
https://mhaack.github.io/spine-lab/. Enter an ISBN (or tap a sample) to compare
what each source returns: pages, height, dimensions and cover. "Run all test
ISBNs" checks nine German and five English editions and shows a hit rate per field.

## `isbn-lookup` Edge Function

`supabase/functions/isbn-lookup/index.ts` runs on Supabase and merges five
sources for one ISBN:

| Source | Used for |
|---|---|
| DNB SRU (MARC21-xml) | German editions: pages (`300 $a`), height in cm (`300 $c`), editions |
| Library of Congress SRU (MARCXML) | English editions: same MARC fields as the DNB |
| Google Books | Page count, dimensions, cover |
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

### Google Books

Google Books answers requests from Supabase's servers with
`503 backendFailed`, with or without an API key. The tester page therefore calls
Google Books directly from the browser (no key needed) and shows that result.
The server's attempt stays in the JSON as `sources.googleServer` for comparison.
For the iOS app this means: call Google Books from the device, not the backend.

WorldCat is not included: OCLC only issues API keys to member libraries and
people working on their behalf.
