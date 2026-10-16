// isbn-lookup: merges DNB (SRU, MARC21), Google Books and Open Library for one ISBN.
// GET /isbn-lookup?isbn=9783257228007  → JSON. Only ISBN digits are accepted, so this is not an open proxy.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
const UA = "SpineLab-ISBN-Test/0.1 (+https://markus-haack.com)";
const TIMEOUT = 9000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

// ---------- ISBN helpers ----------
function clean(s: string) { return s.replace(/[^0-9Xx]/g, "").toUpperCase(); }
function to13(i: string): string | null {
  if (i.length === 13) return i;
  if (i.length !== 10) return null;
  const core = "978" + i.slice(0, 9);
  let sum = 0;
  for (let k = 0; k < 12; k++) sum += +core[k] * (k % 2 ? 3 : 1);
  return core + ((10 - (sum % 10)) % 10);
}
function to10(i: string): string | null {
  if (i.length === 10) return i;
  if (!i.startsWith("978")) return null;
  const core = i.slice(3, 12);
  let sum = 0;
  for (let k = 0; k < 9; k++) sum += +core[k] * (10 - k);
  const c = (11 - (sum % 11)) % 11;
  return core + (c === 10 ? "X" : String(c));
}
function valid13(i: string) {
  if (!/^\d{13}$/.test(i)) return false;
  let sum = 0;
  for (let k = 0; k < 13; k++) sum += +i[k] * (k % 2 ? 3 : 1);
  return sum % 10 === 0;
}

async function get(url: string, accept = "application/json") {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: accept }, signal: AbortSignal.timeout(TIMEOUT), redirect: "follow" });
  return r;
}
async function timed<T>(fn: () => Promise<T>) {
  const t = performance.now();
  try {
    const v = await fn();
    return { ok: true, ms: Math.round(performance.now() - t), ...v as object };
  } catch (e) {
    return { ok: false, ms: Math.round(performance.now() - t), error: String((e as Error)?.message ?? e) };
  }
}

// ---------- DNB (SRU, MARC21-xml) ----------
function decode(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/[\u0098\u009C]/g, "") // MARC non-filing markers
    .replace(/\s+/g, " ").trim();
}
function subs(rec: string, tag: string, code: string): string[] {
  const out: string[] = [];
  const df = new RegExp(`<datafield[^>]*tag="${tag}"[^>]*>([\\s\\S]*?)</datafield>`, "g");
  for (const m of rec.matchAll(df)) {
    const sf = new RegExp(`<subfield code="${code}">([\\s\\S]*?)</subfield>`, "g");
    for (const s of m[1].matchAll(sf)) out.push(decode(s[1]));
  }
  return out;
}
function control(rec: string, tag: string) {
  const m = rec.match(new RegExp(`<controlfield tag="${tag}">([\\s\\S]*?)</controlfield>`));
  return m ? decode(m[1]) : null;
}
function parsePages(extent: string | undefined) {
  if (!extent) return null;
  const m = extent.match(/(\d+)\s*(?:S\.|Seiten|p\.|pages)/i);
  return m ? +m[1] : null;
}
function parseHeightCm(dims: string | undefined) {
  if (!dims) return null;
  const m = dims.match(/(\d+(?:[.,]\d+)?)/);
  return m && /cm/.test(dims) ? +m[1].replace(",", ".") : null;
}

async function dnb(isbn13: string, isbn10: string | null) {
  const url = `https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=num%3D${isbn13}&recordSchema=MARC21-xml&maximumRecords=50`;
  const r = await get(url, "application/xml");
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const xml = await r.text();
  const total = +(xml.match(/<numberOfRecords>(\d+)<\/numberOfRecords>/)?.[1] ?? 0);
  const chunks = xml.split("<recordData>").slice(1);
  const records = chunks.map((rec) => {
    const isbns = subs(rec, "020", "a").map((s) => clean(s.split(" ")[0]));
    const extent = subs(rec, "300", "a")[0];
    const dims = subs(rec, "300", "c")[0];
    const yearRaw = subs(rec, "264", "c")[0] ?? "";
    const title = [subs(rec, "245", "a")[0], subs(rec, "245", "b")[0]].filter(Boolean).join(" : ");
    return {
      idn: control(rec, "001"),
      title,
      author: subs(rec, "100", "a")[0] ?? null,
      publisher: subs(rec, "264", "b")[0] ?? null,
      year: +(yearRaw.match(/\d{4}/)?.[0] ?? 0) || null,
      edition: subs(rec, "250", "a")[0] ?? null,
      extent: extent ?? null,
      dimensions: dims ?? null,
      pages: parsePages(extent),
      heightCm: parseHeightCm(dims),
      isbns,
      exactIsbnMatch: isbns.includes(isbn13) || (isbn10 ? isbns.includes(isbn10) : false),
    };
  });
  const exact = records.filter((r) => r.exactIsbnMatch);
  const pool = exact.length ? exact : records;
  const best = [...pool].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))[0] ?? null;
  // Height: newest record that has one (older reprints often keep the same format)
  const heightFrom = [...pool].sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).find((r) => r.heightCm);
  const pageCounts = [...new Set(pool.map((r) => r.pages).filter(Boolean))];
  return {
    url,
    totalRecords: total,
    returnedRecords: records.length,
    exactMatches: exact.length,
    looseMatches: records.length - exact.length,
    distinctPageCounts: pageCounts,
    best: best && { ...best, heightCm: best.heightCm ?? heightFrom?.heightCm ?? null },
    records,
  };
}

// ---------- Google Books ----------
async function google(isbn13: string) {
  const key = Deno.env.get("GOOGLE_BOOKS_KEY");
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn13}${key ? `&key=${key}` : ""}`;
  const r = await get(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  const item = data.items?.[0];
  if (!item) return { totalItems: data.totalItems ?? 0, found: false };
  // The list response omits dimensions; the volume detail sometimes has them.
  let detail: any = null;
  try {
    const d = await get(`${item.selfLink}${key ? `?key=${key}` : ""}`);
    if (d.ok) detail = await d.json();
  } catch { /* detail is optional */ }
  const v = { ...item.volumeInfo, ...(detail?.volumeInfo ?? {}) };
  const img = v.imageLinks ?? {};
  const cover = img.medium ?? img.small ?? img.thumbnail ?? img.smallThumbnail ?? null;
  return {
    totalItems: data.totalItems,
    found: true,
    id: item.id,
    title: [v.title, v.subtitle].filter(Boolean).join(" : "),
    authors: v.authors ?? [],
    publisher: v.publisher ?? null,
    publishedDate: v.publishedDate ?? null,
    pageCount: v.pageCount ?? null,
    printedPageCount: v.printedPageCount ?? null,
    dimensions: v.dimensions ?? null,
    language: v.language ?? null,
    imageLinkKeys: Object.keys(img),
    coverUrl: cover ? cover.replace(/^http:/, "https:").replace("&edge=curl", "") : null,
  };
}

// ---------- Open Library ----------
async function openLibrary(isbn13: string) {
  const url = `https://openlibrary.org/isbn/${isbn13}.json`;
  const r = await get(url);
  if (r.status === 404) return { found: false };
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const e = await r.json();
  const coverId = e.covers?.find((c: number) => c > 0);
  return {
    found: true,
    key: e.key,
    title: [e.title, e.subtitle].filter(Boolean).join(" : "),
    publishers: e.publishers ?? [],
    publishDate: e.publish_date ?? null,
    numberOfPages: e.number_of_pages ?? null,
    pagination: e.pagination ?? null,
    physicalDimensions: e.physical_dimensions ?? null,
    physicalFormat: e.physical_format ?? null,
    coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null,
  };
}

// ---------- DNB / MVB cover service (licence-restricted; checked for availability only) ----------
async function dnbCover(isbn13: string) {
  const url = `https://portal.dnb.de/opac/mvb/cover?isbn=${isbn13}`;
  const r = await get(url, "image/*");
  const type = r.headers.get("content-type") ?? "";
  const bytes = (await r.arrayBuffer()).byteLength;
  const available = r.ok && type.startsWith("image/") && bytes > 1000;
  return { url, status: r.status, contentType: type, bytes, available, note: "MVB cover: display rights are restricted" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const u = new URL(req.url);
  const raw = u.searchParams.get("isbn") ?? "";
  const c = clean(raw);
  const isbn13 = to13(c);
  if (!isbn13 || !/^\d{13}$/.test(isbn13)) {
    return json({ error: "Pass ?isbn= with a 10- or 13-digit ISBN.", input: raw }, 400);
  }
  const isbn10 = to10(isbn13);

  const [d, g, o, dc] = await Promise.all([
    timed(() => dnb(isbn13, isbn10)),
    timed(() => google(isbn13)),
    timed(() => openLibrary(isbn13)),
    timed(() => dnbCover(isbn13)),
  ]);

  const db: any = d, gb: any = g, ol: any = o, cv: any = dc;
  const summary = {
    title: db.best?.title ?? gb.title ?? ol.title ?? null,
    pages: { dnb: db.best?.pages ?? null, google: gb.pageCount ?? null, openLibrary: ol.numberOfPages ?? null },
    heightCm: { dnb: db.best?.heightCm ?? null, google: gb.dimensions?.height ?? null, openLibrary: ol.physicalDimensions ?? null },
    cover: { google: gb.coverUrl ?? null, openLibrary: ol.coverUrl ?? null, dnbMvb: cv.available ? cv.url : null },
  };

  return json({
    isbn13,
    isbn10,
    checksumValid: valid13(isbn13),
    fetchedAt: new Date().toISOString(),
    summary,
    sources: { dnb: d, google: g, openLibrary: o, dnbCover: dc },
  });
});
