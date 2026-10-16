# Spine Lab

Data tests for a bookshelf app that draws real book spines at real size.

## ISBN tester

`index.html` is a single-page tester, served by GitHub Pages at
https://mhaack.github.io/spine-lab/. Enter an ISBN (or tap a sample) to compare
what each source returns: pages, height, dimensions and cover. "Run all test
ISBNs" checks nine German editions and shows a hit rate per field.

## `isbn-lookup` Edge Function

`supabase/functions/isbn-lookup/index.ts` runs on Supabase and merges four
sources for one ISBN:

| Source | Used for |
|---|---|
| DNB SRU (MARC21-xml) | Pages (`300 $a`), height in cm (`300 $c`), editions |
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

### Google Books key (optional)

Without a key, Google Books returns HTTP 429 from Supabase's shared IPs.
Set a key as a function secret:

```sh
supabase secrets set GOOGLE_BOOKS_KEY=... --project-ref itzvyiwotjxywkpesznj
```
