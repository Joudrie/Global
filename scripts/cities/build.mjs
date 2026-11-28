// Builds src/data/cityFlags.ts and public/city-flags/: the flags of the bigger
// cities of each European country, for the Codex's "City Flags" section (beta).
//
//   NODE_USE_ENV_PROXY=1 node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/cities/build.mjs
//   --offline        rebuild from the last download without asking Wikimedia
//                    (every answer and image is cached in node_modules/.cache/cities/)
//   --selection      print what each country gets and what was left out, then stop
//   --candidates     print every place each country has, then stop
//   --report=<file>  write a table of the data (Markdown)
//   --sheets=<dir>   write the entries as JSON there, for contact sheets
// A fresh run takes about an hour: Wikidata's query service allows one query a
// minute from shared addresses, and Commons throttles downloads.
//
// 1. Wikidata (SPARQL), for the countries in src/data/flags.ts with region
//    "Europe" (Monaco and Vatican City are left out: the city is the country,
//    and its flag is the national one): every item in the country (P17), not
//    dissolved (P576), with a flag image (P41) and a population (P1082), that
//    is a human settlement, city, municipality or capital (P31/P279*) and not
//    part of one (NOT_A_CITY). The population is the latest dated value
//    (P585), and its year is kept; undated figures are left out. Russia counts
//    once, under Europe: only places west of 60°E.
// 2. Selection, per country: the capital (the country's P36) always; then by
//    population every place of 100,000 or more, at most MAX_PER_COUNTRY in all;
//    a country with fewer than MIN_PER_COUNTRY of those is topped up with its
//    next-biggest places (of MIN_FILL people or more), so each has a few.
//    A city and the municipality around it are one place (same flag or name).
// 3. The flag: Wikidata's P41 unless FLAG below says otherwise. It must look
//    like a flag on Commons (a file name or category saying flag, banner or
//    the local word for it, and nothing saying logo or coat of arms), be in use
//    today, and not be a bigger region's flag too (unless SHARED_OK).
//    FLAG/DROP/SHARED_OK/EXTRA record every call made by eye on contact sheets.
// 4. Names: the English label; the local name from the native label (P1705)
//    or the label in the country's language, when it differs.
// 5. Description: the first sentence that says what the flag looks like, from
//    the English Wikipedia article on the flag (the P163 flag item's article,
//    or "Flag of <city>"). Nothing is made up: no article, no description.
// 6. Wikimedia Commons: each file's author and licence (extmetadata). Files
//    that aren't public domain or Creative Commons are left out and printed.
//    Images are Commons' 500px renderings (PNG for SVGs), squeezed with
//    pngquant, or the copy the app already hosts under public/cf/ (see
//    scripts/flags/cf): public/city-flags/<cc>/<slug>.png|svg|gif|jpg
// 7. The U.S. cities in src/data/usCityFlags.ts get their population the same
//    way (Wikidata, found by their English Wikipedia article), for sorting.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const { FLAGS } = await import(path.join(ROOT, 'src/data/flags.ts'))

const OUT = path.join(ROOT, 'src/data/cityFlags.ts')
const PUB = path.join(ROOT, 'public/city-flags')
const CACHE_DIR = path.join(ROOT, 'node_modules/.cache/cities')
const HTTP_CACHE = path.join(CACHE_DIR, 'http.json')
const OFFLINE = process.argv.includes('--offline')
const SHEETS = process.argv.find(a => a.startsWith('--sheets='))?.slice(9)
const UA = 'GlobalioBuild/1.0 (https://globalio.app)'

const MIN_POP = 100_000
const MAX_PER_COUNTRY = 25
const MIN_PER_COUNTRY = 10
/** Places that only top a small country up need at least this many people (no villages). */
const MIN_FILL = 1_000
/** Images are Commons thumbnails this wide (a standard width: Commons renders
 *  250, 330, 500, 960… on demand; other widths wait for minutes). */
const THUMB_W = 500

/** City-states: the city flag is the national flag. */
const SKIP_COUNTRIES = { MC: 'Monaco is a city-state: its flag is the national flag.', VA: 'Vatican City is a city-state: its flag is the national flag.' }
/** Wikidata items for the countries whose ISO code (P297) is on another item:
 *  Kosovo has none; NL's is on the Kingdom of the Netherlands, CY's on the island too. */
const COUNTRY_QID = { XK: 'Q1246', NL: 'Q55', CY: 'Q229' }
/** Places Wikidata puts in two countries: the one the Codex lists them under. */
const PREFER_COUNTRY = { RS: 'XK', RU: 'UA' }
/** Languages for the local name, most likely first. */
const LANGS = {
  AL: ['sq'], AD: ['ca'], AT: ['de'], BY: ['be', 'ru'], BE: ['nl', 'fr', 'de'], BA: ['bs', 'hr', 'sr'], BG: ['bg'], HR: ['hr'],
  CY: ['el', 'tr'], CZ: ['cs'], DK: ['da'], EE: ['et'], FI: ['fi', 'sv'], FR: ['fr'], DE: ['de'], GR: ['el'], HU: ['hu'],
  IS: ['is'], IE: ['ga'], IT: ['it'], XK: ['sq', 'sr'], LV: ['lv'], LI: ['de'], LT: ['lt'], LU: ['lb', 'fr', 'de'], MT: ['mt'],
  MD: ['ro'], ME: ['sr', 'cnr'], NL: ['nl'], MK: ['mk'], NO: ['nb', 'nn', 'no'], PL: ['pl'], PT: ['pt'], RO: ['ro'], RU: ['ru'],
  SM: ['it'], RS: ['sr'], SK: ['sk'], SI: ['sl'], ES: ['es', 'ca', 'eu', 'gl'], SE: ['sv'], CH: ['de', 'fr', 'it', 'rm'],
  UA: ['uk'], GB: ['cy', 'gd', 'en'],
}

/** Types that make an item part of a city (boroughs, districts, quarters) or
 *  an area around one (metropolitan areas, counties): never a city here. */
const NOT_A_CITY = new Set([
  'Q123705', 'Q21851888', 'Q30339232', 'Q34985575', 'Q40256562', 'Q821435', 'Q61089180', 'Q2327515', 'Q2597772',
  'Q851110', 'Q2983893', 'Q74728036', 'Q75338598', 'Q75339006', 'Q3565075', 'Q113126851',
  'Q19644586', 'Q278976', // city districts, boroughs, quarters, neighbourhoods
  'Q159313', 'Q3175539', 'Q245260', 'Q1907114', 'Q15110', 'Q180673', 'Q648681', 'Q5283531', 'Q17301072', 'Q6465',
  'Q36784', 'Q46395', 'Q19730508', // urban areas, metropolitan cities, counties, districts, regions, former municipalities
])
/** Administrative units drawn around a city (Russia's urban okrugs, Ukraine's
 *  hromadas): out unless the item is also a city. */
const ADMIN_ONLY = new Set(['Q13626398', 'Q104841013', 'Q1849719', 'Q192299'])

// ── Calls made by eye (contact sheets, 2026-11) ──────────────────────────────
/** Wikidata item → the Commons file to use instead of its P41, and why. */
const FLAG = {
  Q90: { file: 'Flag of Paris.svg', why: "Wikidata's P41 is the banner of the arms; Paris's flag is the blue and red bicolour" },
  Q220: { file: 'Flag of Rome.svg', why: "Wikidata's P41 is the gonfalon; Rome's flag is the crimson and gold bicolour" },
  Q490: { file: 'Flag of Milan.svg', why: "Wikidata's P41 is the gonfalon; Milan's flag is the red cross on white" },
  Q21197: { file: 'Flag of Chișinău.svg', why: "Wikidata's P41 is a photo of the flag; Commons has the drawing" },
  Q1479: { file: 'Flag of Bordeaux.svg', why: "Wikidata's P41 is the coat of arms" },
  Q2656: { file: 'Flag of Palermo.svg', why: "Wikidata's P41 is the gonfalon; Commons has the flag" },
  Q2683: { file: 'Flag of Parma.svg', why: "Wikidata's P41 is the gonfalon; Commons has the flag" },
}
/** Cities whose own flag a bigger area took as its flag too (the region or
 *  canton around it): kept although the file is the region's as well. */
const SHARED_OK = {
  Q72: 'Zürich: the city and the canton fly the same flag',
  Q70: 'Bern: the city and the canton fly the same flag',
  Q4191: 'Lucerne: the city and the canton fly the same flag',
  Q8818: "Valencia: the Senyera is the city's flag, which the Valencian Community took",
  Q102397: "Miskolc: the district shares the city's flag",
  Q37133: 'Mariupol: the hromada around the city uses its flag',
}
/** Capitals with no flag on Wikidata (P41), and the Commons file used instead. */
const EXTRA = {
  Q1863: { code: 'AD', file: 'Flag of Andorra la Vella.svg', why: 'the capital; no P41 on Wikidata' },
  Q19660: { code: 'RO', file: 'ROU Bucharest Flag.svg', why: 'the capital; no P41 on Wikidata' },
}
/** Wikidata item → why it is left out. */
const DROP = {
  Q1209: 'the state of Bremen; the city of Bremen (Q24879) is listed',
  Q12172: 'the canton of Basel-Stadt; the city of Basel (Q78) is listed',
  Q189419: 'Zemun is a municipality of the City of Belgrade',
  Q1410: 'Gibraltar is a British Overseas Territory, in the Codex under territories',
  Q43048: 'Rhodes here is the island, not the city',
  Q212096: 'Kastellorizo is an island village', Q54239: 'Othoni is an island village',
  Q1280107: 'Ursynów is a district of Warsaw', Q855983: 'Białołęka is a district of Warsaw',
  Q133315: "the file is the flag of the counties of Fermanagh and Limerick, not the city's",
  Q183551: "the file is County Waterford's flag, not the city's",
  Q36647: "the file is County Cork's red and white, not a city flag",
  // Logos with the place's name lettered on, not flags (contact sheets).
  Q1748: "Copenhagen: the municipality's logo on white; the city has no flag of its own",
  Q648: "Lille: the city's logo ('ville de Lille') on white",
  Q30974: "Rouen: the city's logo with its name on blue",
  Q2762100: 'North Nicosia: the municipality logo on white',
  Q921052: "Dalvík: the municipality's logo on white",
  Q860148: "Deçan: the municipality's logo", Q200061: 'Prizren: a logo medallion on white',
  Q909791: "Tropojë: the municipality's logo on white", Q1945622: "Divjakë: the municipality's logo on white",
  Q821023: "Peqin: the municipality's logo on white", Q19258: "Prrenjas: the municipality's seal on green",
  Q1842: "Luxembourg City: the city's lion logo on white",
}
/** File names that say the image isn't the place's flag today. */
const NOT_TODAY = /\b(hypothetical|proposals?|proposed|proposition|unofficial|non-officiel|fictional|concept|former|old|historical|alternative)\b|\((1[0-8]\d\d|19[0-8]\d)\)/i
/** Plain colour fields shared by many places: they don't show this place's flag file. */
const GENERIC = /^Flag( of)? (blue|red|white|yellow|green|black|gold|orange)[ -]/i
/** Files named for the region a place is in ("Flag of Burgenland (state).svg"). */
const REGION_FILE = /\((state|province|region|county|canton)\)/i

// ── HTTP, cached ─────────────────────────────────────────────────────────────
fs.mkdirSync(CACHE_DIR, { recursive: true })
const cache = fs.existsSync(HTTP_CACHE) ? JSON.parse(fs.readFileSync(HTTP_CACHE, 'utf8')) : {}
let dirty = 0
const saveCache = (force) => { if (dirty && (force || dirty > 20)) { fs.writeFileSync(HTTP_CACHE, JSON.stringify(cache)); dirty = 0 } }
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchRetry(url, init = {}) {
  for (let attempt = 1; ; attempt++) {
    const { sparql: _s, ...opts } = init
    const res = await fetch(url, { ...opts, headers: { 'User-Agent': UA, 'Api-User-Agent': UA, ...init.headers }, signal: AbortSignal.timeout(120_000) })
      .catch(err => ({ ok: false, status: 0, text: async () => String(err), headers: new Headers() }))
    if (res.ok) { await sleep(1000); return res } // be polite between requests
    // Wikimedia answers 429 in bursts to shared addresses: wait and retry.
    if (attempt >= 40 || ![0, 429, 500, 502, 503, 504].includes(res.status)) throw new Error(`${res.status} ${url}: ${(await res.text()).slice(0, 200)}`)
    // Commons, too, throttles shared addresses hard: back off for longer each time.
    const after = Number(res.headers.get('retry-after')) || 0
    const wait = init.sparql ? Math.max(after, 65) : after ? Math.max(after, 3 * attempt) : Math.min(120, 5 * attempt)
    process.stderr.write(`  ${res.status}, retrying in ${wait}s\n`)
    await sleep(wait * 1000)
  }
}
async function getText(url, { body, sparql } = {}) {
  const key = body ? `${url}\n${body}` : url
  if (key in cache) return cache[key]
  if (OFFLINE) throw new Error(`--offline: not cached: ${key.slice(0, 160)}`)
  const res = await fetchRetry(url, body ? { method: 'POST', body, sparql, headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json' } } : {})
  const text = await res.text()
  if (sparql && !text.trimStart().startsWith('{')) throw new Error(`SPARQL error: ${text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400)}`)
  cache[key] = text; dirty++; saveCache(sparql)
  return text
}
const getJSON = async (url, opts) => JSON.parse(await getText(url, opts))
// The query service allows one query a minute from shared addresses (Nov
// 2026), so the script asks a few big questions rather than many small ones.
let lastSparql = 0
async function sparql(query) {
  const body = new URLSearchParams({ query, format: 'json' }).toString()
  const key = `https://query.wikidata.org/sparql\n${body}`
  const had = key in cache
  if (!had && !OFFLINE) {
    const wait = lastSparql + 62_000 - Date.now()
    if (lastSparql && wait > 0) { process.stderr.write(`  (waiting ${Math.round(wait / 1000)}s for the query service)\n`); await sleep(wait) }
  }
  const text = await getText('https://query.wikidata.org/sparql', { body, sparql: true })
  if (!had) lastSparql = Date.now()
  try { return JSON.parse(text).results.bindings } catch { delete cache[key]; throw new Error(`SPARQL answer isn't JSON: ${text.slice(0, 300)}`) }
}
const api = (host, params) => getJSON(`https://${host}/w/api.php?` + new URLSearchParams({ format: 'json', formatversion: '2', ...params }))
const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n))
const qid = uri => uri.replace('http://www.wikidata.org/entity/', '')
const fileOf = uri => decodeURIComponent(uri.replace(/^https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//, '')).replace(/_/g, ' ')
const v = (b, k) => b[k]?.value
const wbIds = list => list.map(q => `wd:${q}`).join(' ')
const latestPop = pops => {
  // The latest dated figure; on a tie (two figures for one date) the bigger.
  const p = [...pops].sort((a, b) => b.date.localeCompare(a.date) || b.pop - a.pop)[0]
  return p ? { population: p.pop, year: Number(p.date.match(/^-?\d+/)[0]) } : {}
}

// ── 1. Candidates ────────────────────────────────────────────────────────────
const europe = FLAGS.filter(f => f.region === 'Europe' && !SKIP_COUNTRIES[f.code])
const countryQid = { ...COUNTRY_QID }
const capitals = {}
for (const r of await sparql(`SELECT ?c ?iso ?cap WHERE {
  { VALUES ?iso { ${europe.filter(f => !COUNTRY_QID[f.code]).map(f => `"${f.code}"`).join(' ')} } ?c wdt:P297 ?iso. }
  UNION { VALUES (?c ?iso) { ${Object.entries(COUNTRY_QID).map(([iso, q]) => `(wd:${q} "${iso}")`).join(' ')} } }
  OPTIONAL { ?c wdt:P36 ?cap }
}`)) {
  const iso = v(r, 'iso')
  countryQid[iso] = qid(v(r, 'c'))
  if (r.cap) (capitals[iso] ??= new Set()).add(qid(v(r, 'cap')))
}
const codeOfQid = Object.fromEntries(Object.entries(countryQid).map(([c, q]) => [q, c]))
const missingCountries = europe.filter(f => !countryQid[f.code]).map(f => f.code)
if (missingCountries.length) throw new Error(`no Wikidata item for ${missingCountries.join(', ')}`)

/** Every item in these countries with a flag and a population of at least
 *  `min` (Wikidata's best figure; the dated figures come later). */
async function popRows(codes, min) {
  return sparql(`SELECT ?item ?country ?flag ?pop WHERE {
    VALUES ?country { ${wbIds(codes.map(c => countryQid[c]))} }
    ?item wdt:P17 ?country; wdt:P41 ?flag; wdt:P1082 ?pop.
    ${min ? `FILTER(?pop >= ${min})` : ''}
    FILTER NOT EXISTS { ?item wdt:P576 ?gone }
  }`)
}
const items = new Map() // item → { id, codes, flags, best }
const addRows = rows => {
  for (const r of rows) {
    const id = qid(v(r, 'item'))
    const it = items.get(id) ?? { id, codes: new Set(), flags: new Set(), best: 0 }
    it.codes.add(codeOfQid[qid(v(r, 'country'))])
    it.flags.add(fileOf(v(r, 'flag')))
    it.best = Math.max(it.best, Number(v(r, 'pop')))
    items.set(id, it)
  }
}
// The big countries alone, the rest in groups: the service gives up on
// questions that take over a minute.
const BIG = ['DE', 'FR', 'IT', 'ES', 'GB', 'PL', 'RU', 'UA', 'NL', 'BE', 'AT', 'CH', 'CZ']
const rest = europe.map(f => f.code).filter(c => !BIG.includes(c))
for (const group of [...BIG.map(c => [c]), ...chunks(rest, 11)]) addRows(await popRows(group, 20_000))
// Small countries have few places of 20,000: ask again for every size.
const perCountry = code => [...items.values()].filter(it => it.codes.has(code)).length
const small = europe.map(f => f.code).filter(c => perCountry(c) < 3 * MIN_PER_COUNTRY)
for (const group of chunks(small, 8)) addRows(await popRows(group, 0))

// Types and coordinates of the places that could make the cut: every item
// whose latest figure is at least 20,000, and all of them in small countries.
// With their dated population figures (the latest is the one shown).
const qnum = id => Number(id.slice(1))
const maybe = [...items.values()].filter(it => it.best >= 20_000 || [...it.codes].some(c => small.includes(c))).sort((a, b) => qnum(a.id) - qnum(b.id))
const types = new Map(), coords = new Map(), pops = new Map()
for (const group of chunks(maybe, 1200)) {
  for (const r of await sparql(`SELECT ?item ?t ?coord ?pop ?date WHERE { VALUES ?item { ${wbIds(group.map(it => it.id))} }
    { ?item wdt:P31 ?t } UNION { ?item wdt:P625 ?coord } UNION { ?item p:P1082 ?ps. ?ps ps:P1082 ?pop; pq:P585 ?date. MINUS { ?ps wikibase:rank wikibase:DeprecatedRank } } }`)) {
    const id = qid(v(r, 'item'))
    if (r.t) (types.get(id) ?? types.set(id, new Set()).get(id)).add(qid(v(r, 't')))
    const m = v(r, 'coord')?.match(/Point\(([-\d.e]+) ([-\d.e]+)\)/)
    if (m) coords.set(id, { lon: Number(m[1]), lat: Number(m[2]) })
    if (r.pop) (pops.get(id) ?? pops.set(id, []).get(id)).push({ pop: Number(v(r, 'pop')), date: v(r, 'date') })
  }
}
for (const it of maybe) Object.assign(it, latestPop(pops.get(it.id) ?? []))
// Which of those types are places people live: subclasses of human
// settlement, city, municipality or capital. Asked upwards from each type.
const allTypes = [...new Set([...types.values()].flatMap(s => [...s]))].sort((a, b) => qnum(a) - qnum(b))
const settlementTypes = new Set()
const typeLabels = new Map()
for (const group of chunks(allTypes, 800)) {
  for (const r of await sparql(`SELECT DISTINCT ?t ?tl ?cls WHERE {
    VALUES ?t { ${wbIds(group)} }
    OPTIONAL { ?t rdfs:label ?tl FILTER(lang(?tl) = "en") }
    OPTIONAL { VALUES ?cls { wd:Q486972 wd:Q15284 wd:Q515 wd:Q5119 } ?t wdt:P279* ?cls }
  }`)) {
    const t = qid(v(r, 't'))
    if (r.cls) settlementTypes.add(t)
    if (r.tl) typeLabels.set(t, v(r, 'tl'))
  }
}
saveCache(true)
console.log(`items ${items.size}, maybe ${maybe.length}, types ${allTypes.length} (${settlementTypes.size} settlements)`)

if (process.argv.includes('--candidates')) {
  for (const f of europe) {
    const list = maybe.filter(it => it.codes.has(f.code) && it.population && [...(types.get(it.id) ?? [])].some(t => settlementTypes.has(t))).sort((a, b) => b.population - a.population)
    console.log(`\n## ${f.code} ${f.name} (${list.length}) capital ${[...(capitals[f.code] ?? [])].join(',')}`)
    for (const it of list.slice(0, 45)) {
      const ts = [...(types.get(it.id) ?? [])]
      const ok = ts.some(t => settlementTypes.has(t))
      console.log(`  ${ok ? '+' : '-'} ${it.id} ${it.population} ${it.year} ${[...it.codes].join('/')} ${coords.get(it.id)?.lon ?? ''} | ${[...it.flags].join(" | ")} | ${ts.map(t => typeLabels.get(t) ?? t).join(', ')}`)
    }
  }
  process.exit(0)
}

// ── 2. Pools: the places, by country ─────────────────────────────────────────
// Extra capitals (no P41): their population, types and place from Wikidata's JSON.
for (const [id, x] of Object.entries(EXTRA)) {
  const e = Object.values((await getJSON(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`)).entities)[0]
  const dated = (e.claims.P1082 ?? []).filter(st => st.rank !== 'deprecated' && st.qualifiers?.P585)
    .map(st => ({ pop: Number(st.mainsnak.datavalue.value.amount), date: st.qualifiers.P585[0].datavalue.value.time.replace(/^\+/, '') }))
  const it = { id, codes: new Set([x.code]), flags: new Set([x.file]), best: 0, ...latestPop(dated) }
  types.set(id, new Set((e.claims.P31 ?? []).map(st => st.mainsnak.datavalue?.value.id).filter(Boolean)))
  for (const t of types.get(id)) if (!typeLabels.has(t)) typeLabels.set(t, t)
  items.set(id, it); maybe.push(it)
  FLAG[id] = { file: x.file, why: x.why }
}
saveCache(true)
const typeNames = it => [...(types.get(it.id) ?? [])].map(t => typeLabels.get(t) ?? '')
/** A type that says city or town, not an administrative unit around one. */
const cityLike = it => typeNames(it).some(l => /\b(city|town|capital|metropolis|megacity|commune|comune|settlement|village|burgh|polis)\b/i.test(l) && !/municipal|district|council|okrug|part\b|province|county/i.test(l))
const isPlace = it => {
  const ts = [...(types.get(it.id) ?? [])]
  if (EXTRA[it.id]) return true
  if (!ts.some(t => settlementTypes.has(t)) || ts.some(t => NOT_A_CITY.has(t))) return false
  if (typeNames(it).some(l => /^(city district|borough of|quarter|neighbou?rhood|district of (Budapest|Warsaw|Antwerp)|sector of|raion of city)/i.test(l))) return false
  return !ts.some(t => ADMIN_ONLY.has(t)) || cityLike(it)
}
const countryOf = it => {
  const codes = [...it.codes]
  if (codes.length === 1) return codes[0]
  for (const c of codes) if (codes.includes(PREFER_COUNTRY[c])) return PREFER_COUNTRY[c]
  return codes.sort()[0]
}
const pools = {}
for (const f of europe) {
  pools[f.code] = maybe.filter(it => countryOf(it) === f.code && it.population && isPlace(it) && !DROP[it.id]
      && (f.code !== 'RU' || (coords.get(it.id)?.lon ?? 99) < 60))
    .sort((a, b) => b.population - a.population)
}
// Which items use each flag file: a city whose file is a region's (Burgenland's
// for a village, the Valencian Community's for Valencia) isn't shown its own flag.
const usersOf = new Map()
for (const it of items.values()) for (const f of it.flags) (usersOf.get(f) ?? usersOf.set(f, []).get(f)).push(it)

// ── 3. Commons: is it a flag, and may we use it? ─────────────────────────────
const resolver = q => t => {
  for (const n of q.normalized ?? []) if (n.from === t) t = n.to
  for (const r of q.redirects ?? []) if (r.from === t) t = r.to
  return t
}
/** A batched title query (Commons files, Wikipedia pages), answered title by
 *  title from the cache: earlier answers are reused whatever batch they came
 *  in, so a changed list asks only for the new titles. Asked title → the
 *  answer and the title it resolved to. */
async function batched(host, params, titles, n) {
  const base = `https://${host}/w/api.php?`
  const known = new Map()
  for (const [k, text] of Object.entries(cache)) {
    if (!k.startsWith(base)) continue
    const q = new URLSearchParams(k.slice(base.length))
    if (Object.entries(params).some(([name, val]) => q.get(name) !== val)) continue
    let d; try { d = JSON.parse(text) } catch { continue }
    if (!d.query) continue
    const to = resolver(d.query)
    for (const t of (q.get('titles') ?? '').split('|')) known.set(t, { d, t: to(t) })
  }
  const miss = [...new Set(titles)].filter(t => !known.has(t))
  for (const group of chunks(miss, n)) {
    const d = await api(host, { ...params, titles: group.join('|') })
    const to = resolver(d.query)
    for (const t of group) known.set(t, { d, t: to(t) })
  }
  return known
}
const pageOf = a => a?.d.query.pages.find(p => p.title === a.t)
async function commonsInfo(files) {
  const res = await batched('commons.wikimedia.org', {
    action: 'query', prop: 'imageinfo|categories', redirects: '1', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '640', // unused (imageOf builds the thumbnail URL); kept so cached answers still match
    iiextmetadatafilter: 'LicenseShortName|License|LicenseUrl|Artist|NonFree|ImageDescription', clshow: '!hidden', cllimit: 'max',
  }, files.map(x => `File:${x}`), 40)
  const out = {}
  for (const x of new Set(files)) {
    const p = pageOf(res.get(`File:${x}`))
    out[x] = p && !p.missing && p.imageinfo ? { title: p.title, categories: (p.categories ?? []).map(c => c.title.replace(/^Category:/, '')), ...p.imageinfo[0] } : null
  }
  return out
}
const meta = (ii, k) => ii?.extmetadata?.[k]?.value
const htmlText = s => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
function licenceOf(ii) {
  if (!ii) return { ok: false, why: 'not on Wikimedia Commons' }
  const short = htmlText(meta(ii, 'LicenseShortName'))
  const lic = String(meta(ii, 'License') ?? '').toLowerCase()
  if (String(meta(ii, 'NonFree')) === 'true') return { ok: false, why: `non-free (${short})` }
  const pd = /^(public domain|pd\b|pd-|cc0|no restrictions)/i.test(short) || /^(pd|cc0)/.test(lic)
  const cc = /^cc[ -]by/i.test(short) || lic.startsWith('cc-by')
  if (!pd && !cc) return { ok: false, why: `licence "${short || lic || 'unknown'}" isn't public domain or Creative Commons` }
  return { ok: true, licence: pd ? (/cc0/i.test(short + lic) ? 'CC0' : 'Public domain') : short, url: meta(ii, 'LicenseUrl') || undefined }
}
function authorOf(ii) {
  let a = htmlText(meta(ii, 'Artist'))
    .replace(/^(Original|Author|Image|Autor of SVG image|Original Author)\s*:\s*/i, '').replace(/^:\s*/, '')
    .replace(/^(File:)?[^:]+\.(svg|png|jpe?g)\s*(:|by)\s*/i, '')
    .replace(/\(\s*talk\s*\)/gi, '').replace(/[^\s,;:]+\.svg'?\)?/gi, '')
    .replace(/\s*\b(This (W3C|SVG|vector|file|image)\b|Legal disclaimer)\b.*$/i, '')
    .replace(/\b(Unknown author|Unknown)( \1)+/gi, '$1').replace(/^(Vectori[sz]ed|Drawn|Made|Created) by:? /i, '')
    .replace(/\s+([,.;])/g, '$1').replace(/^[\s,;:.&]+|[\s,;:&]+$/g, '').replace(/\s+/g, ' ').trim()
  if (!a || /see file history|^unknown( author)?$|^own work$|^the original uploader was|no machine-readable author/i.test(a)) return ''
  if (a.length > 48) {
    a = a.replace(/\s*\([^()]*\)?/g, '').split(/;|\.\s|\s+based on\b|,\s*based\b|\s+derivative work\b|\s+from (?:the )?original\b|,\s*with\b|\s+including\b|\s+using\b|\s+Vectori[sz]ation\b|\s+converted\b/i)[0].trim()
  }
  return a.length > 60 ? a.slice(0, 58).replace(/[\s,;:(]+\S*$/, '') + '…' : a
}
const commonsPage = title => `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_')).replace(/%3A/g, ':').replace(/%2C/g, ',').replace(/%28/g, '(').replace(/%29/g, ')')}`

// The word for "flag" in the languages Commons names files in, and words that
// mean the file is something else.
const FLAG_WORD = /\b(flags?|banners?|gonfal(one|oni|on|ons)|bandier[ae]|flamur(i|it)?|drapel(ul)?|prapor|vlag|vlaggen|flagge|flaggen|fahne|drapeaux?|bandeiras?|banderas?|bandiere?|zastava|zastave|zastavy|flaga|flagi|lippu|lipp|flagg|flagget|fáni|zászló|zászlaja|vlajka|steag|steagul|bayra[gğ]ı|флаг|флаги|прапор|прапори|сцяг|знаме|знамиња|застава|σημαία|bratara|karogs|vėliava)\b/i
const NOT_FLAG = /\b(logos?|logotype|wordmark|brand|branding|signet|coats? of arms|wappen|blason|stemmi?|escudos?|herb|grb|címere?|znak|герб|гербы|seals?|emblems?)\b/i
function flagCheck(file, ii) {
  const cats = ii?.categories ?? []
  const nameFlag = FLAG_WORD.test(file), catFlag = cats.some(c => FLAG_WORD.test(c))
  const nameNot = NOT_FLAG.test(file) && !nameFlag
  const catNot = cats.length > 0 && cats.every(c => NOT_FLAG.test(c) && !FLAG_WORD.test(c))
  if (nameNot) return `the file name says it isn't a flag (${file})`
  if (catNot) return `its Commons categories say it isn't a flag (${cats.slice(0, 2).join('; ')})`
  if (!nameFlag && !catFlag) return `neither its name nor its categories say flag (${cats.slice(0, 2).join('; ') || 'no categories'})`
  return null
}

/** The flag to use when Wikidata gives several: one named as a flag, not a
 *  variant, an old one or an upright banner. */
function pickFlag(it) {
  if (FLAG[it.id]) return FLAG[it.id].file
  const score = f => (FLAG_WORD.test(f) ? 4 : 0) - (NOT_FLAG.test(f) ? 3 : 0) - (NOT_TODAY.test(f) ? 3 : 0)
    - (/\b(variant|civil|state|with|mit|avec|con|z|s)\b|\(v\)|vertical|hochformat|gonfalon/i.test(f) ? 1 : 0)
  return [...it.flags].sort((a, b) => score(b) - score(a) || a.length - b.length || a.localeCompare(b))[0]
}

// Names first: a city and the municipality around it are often two items
// ("Varna" and "Varna Municipality"), with the same flag or two copies of it.
const PRE = 55 // per country, enough for MAX_PER_COUNTRY after duplicates and drops
const preShort = []
for (const f of europe) {
  const pool = pools[f.code]
  for (const it of new Set([...pool.slice(0, PRE), ...pool.filter(x => capitals[f.code]?.has(x.id))])) { it.file = pickFlag(it); it.code = f.code; preShort.push(it) }
}
const allLangs = [...new Set(['en', ...Object.values(LANGS).flat()])]
const labels = new Map(), natives = new Map(), flagArticles = new Map(), cityArticles = new Map()
const articleTitle = u => decodeURIComponent(u.replace('https://en.wikipedia.org/wiki/', '')).replace(/_/g, ' ')
// Asked in groups of countries, so a change in one country asks again only for its group.
for (const codes of chunks(europe.map(f => f.code), 8)) {
  const group = preShort.filter(it => codes.includes(it.code))
  for (const r of await sparql(`SELECT ?item ?l ?native ?fa ?ca WHERE {
    VALUES ?item { ${wbIds(group.map(it => it.id))} }
    { ?item rdfs:label ?l FILTER(lang(?l) IN (${allLangs.map(l => `"${l}"`).join(', ')})) }
    UNION { ?item wdt:P1705 ?native }
    UNION { ?item wdt:P163 ?flagItem. ?fa schema:about ?flagItem; schema:isPartOf <https://en.wikipedia.org/> }
    UNION { ?ca schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> }
  }`)) {
    const id = qid(v(r, 'item'))
    if (r.l) (labels.get(id) ?? labels.set(id, {}).get(id))[r.l['xml:lang']] = v(r, 'l')
    if (r.native) (natives.get(id) ?? natives.set(id, {}).get(id))[r.native['xml:lang']] = v(r, 'native')
    if (r.fa) flagArticles.set(id, articleTitle(v(r, 'fa')))
    if (r.ca) cityArticles.set(id, articleTitle(v(r, 'ca')))
  }
}
saveCache(true)
/** English name: the label, or the English Wikipedia title without its ", Country" part. */
const NAME = { Q1848: 'City of San Marino' } // where the label reads oddly (checked by hand)
// "Horsens Municipality", "Municipality of Trbovlje": the Codex lists them as places.
const plainName = n => n.replace(/^(Municipality|City Municipality|Urban Municipality) of /, '').replace(/ (Municipality|City Municipality|Urban Municipality|Urban Okrug)$/, '')
const nameOf = it => NAME[it.id] ?? plainName(labels.get(it.id)?.en ?? cityArticles.get(it.id)?.replace(/,.*$/, '') ?? labels.get(it.id)?.[LANGS[it.code]?.[0]] ?? it.id)
const fold = s => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const baseName = it => fold(nameOf(it)).replace(/\b(city|municipality|urban|okrug|district|of|the|town|commune|municipal|council|hromada|territorial|community)\b/g, '').replace(/[^a-z]/g, '')

const dropped = [] // { code, id, file, population, why }
const drop = (it, why) => { dropped.push({ code: it.code, id: it.id, file: it.file, population: it.population, why }); return false }
const unique = {}
for (const f of europe) {
  const isCap = it => !!capitals[f.code]?.has(it.id)
  // The capital first, then real cities before the units around them, then the bigger.
  const order = preShort.filter(x => x.code === f.code)
    .sort((a, b) => Number(isCap(b)) - Number(isCap(a)) || Number(cityLike(b)) - Number(cityLike(a)) || b.population - a.population)
  const files = new Map(), names = new Map()
  unique[f.code] = order.filter(it => {
    const sameFile = files.get(it.file), sameName = names.get(baseName(it))
    if (sameFile) return drop(it, `the same flag as ${nameOf(sameFile)} (${sameFile.id})`)
    if (sameName) return drop(it, `the same place as ${nameOf(sameName)} (${sameName.id})`)
    files.set(it.file, it); names.set(baseName(it), it)
    return true
  }).sort((a, b) => b.population - a.population)
}

// ── 3b. Is it this place's flag today? ───────────────────────────────────────
const SPARES = 12
const shortlist = []
for (const f of europe) {
  const list = unique[f.code]
  for (const it of new Set([...list.slice(0, MAX_PER_COUNTRY + SPARES), ...list.filter(x => capitals[f.code]?.has(x.id))])) shortlist.push(it)
}
const info = await commonsInfo(shortlist.map(it => it.file))
saveCache(true)
function usable(it) {
  if (DROP[it.id]) return drop(it, DROP[it.id])
  const ii = info[it.file]
  if (!ii) return drop(it, `${it.file} isn't on Wikimedia Commons`)
  if (!FLAG[it.id]) {
    if (NOT_TODAY.test(it.file)) return drop(it, `the file isn't the flag in use today (${it.file})`)
    if (GENERIC.test(it.file)) return drop(it, `a plain colour field shared by many places (${it.file})`)
    if (REGION_FILE.test(it.file)) return drop(it, `the file is the flag of the region it is in (${it.file})`)
    const why = flagCheck(it.file, ii)
    if (why) return drop(it, why)
    // A file a much bigger region or country also uses as its flag.
    const region = !SHARED_OK[it.id] && (usersOf.get(it.file) ?? []).find(u => u.id !== it.id && !isPlace(u) && (u.best || 0) >= 1.5 * it.population)
    if (region) return drop(it, `that's the flag of a bigger area too (${region.id}, ${region.best.toLocaleString('en-US')} people)`)
  }
  const lic = licenceOf(ii)
  if (!lic.ok) return drop(it, lic.why)
  return true
}

// ── 4. Selection ─────────────────────────────────────────────────────────────
const chosen = []
const noCapital = []
for (const f of europe) {
  const isCap = it => !!capitals[f.code]?.has(it.id)
  const ok = shortlist.filter(x => x.code === f.code).filter(usable).sort((a, b) => b.population - a.population)
  let pick = ok.filter(it => it.population >= MIN_POP).slice(0, MAX_PER_COUNTRY)
  if (pick.length < MIN_PER_COUNTRY) pick = ok.filter(it => it.population >= MIN_FILL).slice(0, MIN_PER_COUNTRY)
  for (const it of ok.filter(isCap)) if (!pick.includes(it)) pick.push(it)
  if (!ok.some(isCap)) noCapital.push(f.code)
  for (const it of pick.sort((a, b) => b.population - a.population)) { it.capital = isCap(it); chosen.push(it) }
}
console.log(`chosen ${chosen.length} in ${new Set(chosen.map(c => c.code)).size} countries; no capital: ${noCapital.join(', ')}`)
if (process.argv.includes('--selection')) {
  for (const f of europe) {
    console.log(`\n## ${f.code} ${f.name}`)
    for (const it of chosen.filter(c => c.code === f.code)) console.log(`  ${it.id} ${nameOf(it)}${it.capital ? ' (capital)' : ''} ${it.population} ${it.year} | ${it.file}`)
    for (const d of dropped.filter(d => d.code === f.code && !d.why.startsWith('the same '))) console.log(`  - ${d.id} ${d.population} ${d.file}: ${d.why}`)
  }
  process.exit(0)
}

// The images first: Wikipedia, next, can keep the script waiting (see 6).
/** Commons' own rendering of the file, THUMB_W wide (narrower rasters at the
 *  largest standard width below theirs). The file servers throttle uncached
 *  originals hard (ten minutes at a time) but not thumbnails. SVGs come as PNG. */
function imageOf(ii) {
  const m = ii.url.split('?')[0].match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+)$/)
  if (!m) throw new Error(`not a Commons file URL: ${ii.url}`)
  const svg = ii.mime === 'image/svg+xml'
  const w = svg ? THUMB_W : [THUMB_W, 330, 250, 120].find(x => x < ii.width)
  if (!w) return { url: ii.url.split('?')[0], ext: path.extname(m[3]).toLowerCase() }
  const ext = svg ? '.png' : path.extname(m[3]).toLowerCase().replace('.jpeg', '.jpg')
  return { url: `${m[1]}/thumb/${m[2]}/${m[3]}/${w}px-${m[3]}${svg ? '.png' : ''}`, ext }
}
// Flags the app already hosts through the self-hosting pipeline (public/cf,
// scripts/flags/cf) are copied from there instead.
const cfCanon = f => f.replace(/ /g, '_').normalize('NFC').replace(/^./, c => c.toUpperCase())
const cfHosted = new Map(Object.entries(JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/flags/cf/manifest.json'), 'utf8'))).map(([name, p]) => [cfCanon(name), p]))
function hostedCopy(ii) {
  const p = cfHosted.get(cfCanon(ii.title.replace(/^File:/, '')))
  return p && fs.existsSync(path.join(ROOT, 'public', p)) ? path.join(ROOT, 'public', p) : null
}
for (const it of chosen) if (!hostedCopy(info[it.file])) await download(imageOf(info[it.file]).url)

// ── 5. Names and the flag's Wikipedia article ────────────────────────────────
// The local name: the native label (P1705) in one of the country's languages,
// else the label in one; never one with an admin word ("Komuna", "Občina",
// "Kommune") or two scripts in it. In Kosovo, labels before native labels;
// the UK only by native label (Welsh and Gaelic labels exist for English
// towns too).
const LABEL_FIRST = new Set(['XK'])
const ADMIN_WORD = /^(Bashkia|Komuna|Općina|Opština|Општина|Община|Občina|Município|Municipio|Gemeente|Comune|Δήμος|Gmina|Grad|Град|Commune|Stadt|Ville)(?=\s|$)|\s(Kommune|kommune|kommun|Municipality|Municipiul)$/
const oneScript = s => !(/[A-Za-zÀ-ɏ]/.test(s) && /[Ѐ-ӿ]/.test(s)) && !/[/(]/.test(s)
function localOf(it) {
  // Albania's English names are already the Albanian ones (Shkodër; Shkodra is the same name, definite).
  if (it.code === 'AL') return undefined
  // Romansh is a Swiss language, but not St. Gallen's or Lucerne's.
  const langs = (LANGS[it.code] ?? []).filter(l => l !== 'rm')
  const nat = natives.get(it.id) ?? {}
  const lab = it.code === 'GB' ? {} : labels.get(it.id) ?? {}
  const fromNat = langs.map(l => nat[l]), fromLab = langs.map(l => lab[l])
  // The first usable one is the local name; none when it reads like the English.
  const local = (LABEL_FIRST.has(it.code) ? [...fromLab, ...fromNat] : [...fromNat, ...fromLab])
    .find(x => x && !ADMIN_WORD.test(x) && oneScript(x))
  return local && fold(local) !== fold(nameOf(it)) ? local : undefined
}

// "Flag of <city>" articles that Wikidata doesn't link: kept only when the
// article is about that flag (its title still starts "Flag of" once
// redirects are followed, and it names the city).
const want = chosen.filter(it => !flagArticles.has(it.id) && cityArticles.has(it.id))
const probes = await batched('en.wikipedia.org', { action: 'query', redirects: '1' }, want.map(it => `Flag of ${cityArticles.get(it.id)}`), 40)
for (const it of want) {
  const a = probes.get(`Flag of ${cityArticles.get(it.id)}`)
  const page = pageOf(a)
  const redirect = (a.d.query.redirects ?? []).find(r => r.to === a.t && r.tofragment)
  if (page && !page.missing && !redirect && /^Flag of /.test(a.t) && a.t.includes(nameOf(it).split(' ')[0])) flagArticles.set(it.id, a.t)
}
async function intros(titles) {
  const res = await batched('en.wikipedia.org', { action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', exlimit: '20', redirects: '1' }, titles, 20)
  const out = {}
  for (const t of new Set(titles)) {
    const p = pageOf(res.get(t))
    if (p?.extract) out[t] = { title: p.title, text: p.extract }
  }
  return out
}
const flagIntros = await intros([...flagArticles.values()])
saveCache(true)

// The first sentence of the intro that says what the flag looks like: its
// colours or its layout, not only that it is a symbol of the city.
const DESIGN = /\b(red|white|blue|yellow|gold|golden|green|black|silver|azure|gules|argent|or|orange|purple|crimson|ochre|stripes?|bands?|bars?|cross|crosses|saltires?|field|bicolou?r|tricolou?r|triband|horizontal|vertical|diagonal|charged|iris|lily)\b/i
const NOT_DESIGN = /^(According|It is distinct|It may)|\bis (one of )?the (official )?symbols?\b|\bis the official flag of\b/i
/** Item → '' where Wikipedia's first lines are about another flag (checked by hand). */
const DESCRIPTION = {
  Q641: '', // Venice: the article is about the Republic of Venice's banner
  Q2256: '', // Birmingham: the line picked compares it with the council's banner
  Q48256: '', // Dnipro: the line picked is mid-history
  Q7525: '', Q70: '', // Sevastopol, Bern: the lines picked describe the coat of arms
  Q25804: '', // Trondheim: the opening line is about its seal
}
function sentences(text) {
  const para = text.split('\n').map(s => s.trim()).filter(s => s.length > 30).join(' ')
  const out = []
  for (const piece of para.split(/(?<=[.!?])\s+(?=[A-Z"“])/)) {
    const prev = out[out.length - 1]
    if (prev && /\b(St|c|ca|Mt|No|Dr|Jr|Sr|[A-Z])\.$/.test(prev)) out[out.length - 1] = `${prev} ${piece}`
    else out.push(piece)
  }
  return out
}
function describe(it) {
  if (it.id in DESCRIPTION) return DESCRIPTION[it.id] || undefined
  const intro = flagIntros[flagArticles.get(it.id)]
  if (!intro) return undefined
  const s = sentences(intro.text).slice(0, 3).find(x => DESIGN.test(x) && !NOT_DESIGN.test(x))
  if (!s) return undefined
  const clean = s.replace(/\s+/g, ' ').replace(/\s*\([^()]*\)/g, m => (/[^\u0000-ɏ -⁯]|lit\.|pronounced|;|:|listen/i.test(m) ? '' : m)).replace(/\s+([,.])/g, '$1').trim()
  // "It is a horizontal triband…": out of its article, "it" is the flag.
  const line = clean.replace(/^It\b/, 'The flag')
  return line.length <= 260 ? line : undefined
}

// ── 6. Images ────────────────────────────────────────────────────────────────
const HAS = cmd => { try { execFileSync('which', [cmd], { stdio: 'ignore' }); return true } catch { return false } }
const PNGQUANT = HAS('pngquant')
async function download(url) {
  const raw = path.join(CACHE_DIR, 'img', crypto.createHash('sha1').update(url).digest('hex') + path.extname(new URL(url).pathname).toLowerCase())
  if (!fs.existsSync(raw)) {
    if (OFFLINE) throw new Error(`--offline: image not cached: ${url}`)
    fs.mkdirSync(path.dirname(raw), { recursive: true })
    fs.writeFileSync(raw, Buffer.from(await (await fetchRetry(url)).arrayBuffer()))
  }
  return raw
}
const slug = s => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'city'
fs.rmSync(PUB, { recursive: true, force: true })
const entries = []
const usedSlugs = new Set()
for (const it of chosen) {
  const ii = info[it.file]
  const lic = licenceOf(ii)
  const name = nameOf(it)
  let s = `${it.code.toLowerCase()}/${slug(name)}`
  if (usedSlugs.has(s)) s += `-${it.id.toLowerCase()}`
  usedSlugs.add(s)
  const local = hostedCopy(ii)
  const { url, ext } = local ? { url: null, ext: path.extname(local) } : imageOf(ii)
  const raw = local ?? await download(url)
  const out = path.join(PUB, s + ext)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.copyFileSync(raw, out)
  if (ext === '.png' && PNGQUANT) {
    try { execFileSync('pngquant', ['--quality=60-90', '--speed', '1', '--strip', '--force', '--output', out, out], { stdio: 'ignore' }) } catch { /* quality not reached: keep the original */ }
  }
  const description = describe(it)
  entries.push({
    id: s.replace('/', '-'), name, local: localOf(it), country: it.code,
    population: it.population, year: it.year, capital: it.capital || undefined,
    flagUrl: `/city-flags/${s}${ext}`, description,
    article: description && !(it.id in DESCRIPTION) ? `https://en.wikipedia.org/wiki/${encodeURIComponent(flagIntros[flagArticles.get(it.id)].title.replace(/ /g, '_'))}` : undefined,
    commons: commonsPage(ii.title), author: authorOf(ii) || undefined, licence: lic.licence, licenceUrl: lic.url,
    wikidata: it.id, file: ii.title.replace(/^File:/, ''),
  })
}
saveCache(true)

// ── 7. U.S. cities: their population, for sorting ────────────────────────────
const { US_CITY_FLAGS } = await import(path.join(ROOT, 'src/data/usCityFlags.ts'))
const STATES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska',
  NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', PR: 'Puerto Rico' }
/** English Wikipedia's article for each U.S. city, where "City, State" isn't it. */
const US_ARTICLE = { nyc: 'New York City', dc: 'Washington, D.C.', 'st-paul': 'Saint Paul, Minnesota' }
const usTitle = c => US_ARTICLE[c.id] ?? `${c.name}, ${STATES[c.state] ?? c.state}`
// Their Wikidata items from their English Wikipedia articles (Wikidata's own
// API: Wikipedia's throttles shared addresses for many minutes at a time).
// "City, State" first, then the plain name for the big ones ("Chicago").
const usItem = {}
for (const titleOf of [usTitle, c => c.name]) {
  const todo = US_CITY_FLAGS.filter(c => !usItem[c.id])
  for (const group of chunks(todo, 50)) {
    const d = await api('www.wikidata.org', { action: 'wbgetentities', sites: 'enwiki', props: 'sitelinks', sitefilter: 'enwiki', titles: group.map(titleOf).join('|') })
    const byTitle = new Map(Object.entries(d.entities).filter(([id]) => /^Q\d+$/.test(id)).map(([id, e]) => [e.sitelinks?.enwiki?.title, id]))
    for (const c of group) if (byTitle.has(titleOf(c))) usItem[c.id] = byTitle.get(titleOf(c))
  }
}
for (const c of US_CITY_FLAGS) if (!usItem[c.id]) console.warn(`US: no article for ${usTitle(c)}`)
const usPops = new Map()
for (const r of await sparql(`SELECT ?item ?pop ?date WHERE { VALUES ?item { ${wbIds(Object.values(usItem))} }
  ?item wdt:P17 wd:Q30; p:P1082 ?ps. ?ps ps:P1082 ?pop; pq:P585 ?date. MINUS { ?ps wikibase:rank wikibase:DeprecatedRank } }`)) {
  const id = qid(v(r, 'item'))
  ;(usPops.get(id) ?? usPops.set(id, []).get(id)).push({ pop: Number(v(r, 'pop')), date: v(r, 'date') })
}
const usPopulation = {}
for (const c of US_CITY_FLAGS) {
  const p = latestPop(usPops.get(usItem[c.id]) ?? [])
  if (p.population) usPopulation[c.id] = [p.population, p.year]
  else console.warn(`US: no dated population for ${c.name}, ${c.state}`)
}
saveCache(true)

// ── 8. Write it out ──────────────────────────────────────────────────────────
const nameOfCode = Object.fromEntries(FLAGS.map(f => [f.code, f.name]))
entries.sort((a, b) => nameOfCode[a.country].localeCompare(nameOfCode[b.country]) || b.population - a.population)
const js = x => JSON.stringify(x)
const line = e => `  { ${Object.entries(e).filter(([k, x]) => x !== undefined && k !== 'wikidata' && k !== 'file').map(([k, x]) => `${k}: ${js(x)}`).join(', ')} },`
let lastCountry = ''
const body = entries.map(e => {
  const head = e.country !== lastCountry ? `  // ${nameOfCode[e.country]}\n` : ''
  lastCountry = e.country
  return head + line(e)
}).join('\n')
fs.writeFileSync(OUT, `// AUTO-GENERATED by scripts/cities/build.mjs — do not edit by hand (rerun it).
// City flags of Europe for the Codex's "City Flags" section (beta): each
// country's capital and its biggest places (every one of ${MIN_POP.toLocaleString('en-US')} or more, at
// most ${MAX_PER_COUNTRY}; at least ${MIN_PER_COUNTRY} where it has that many), from Wikidata. Images are
// Wikimedia Commons files, hosted under public/city-flags/; descriptions are
// the first line of English Wikipedia's article on the flag, where there is one.
// Read it through cityAtlas.ts.

export interface WorldCityFlag {
  /** "fr-paris" */
  id: string
  /** English name. */
  name: string
  /** The local name, when it differs ("München"). */
  local?: string
  /** The country's code in flags.ts. */
  country: string
  /** Wikidata's latest dated figure, and its year. */
  population: number
  year: number
  capital?: true
  flagUrl: string
  /** What the flag shows, from Wikipedia (\`article\`). */
  description?: string
  article?: string
  /** The image's Wikimedia Commons page, author and licence. */
  commons: string
  author?: string
  licence: string
  licenceUrl?: string
}

export const EUROPE_CITY_FLAGS: WorldCityFlag[] = [
${body}
]

/** Population and year of the U.S. cities in usCityFlags.ts, by id (Wikidata). */
export const US_CITY_POPULATION: Record<string, [population: number, year: number]> = {
${Object.entries(usPopulation).map(([id, p]) => `  ${js(id)}: ${js(p)},`).join('\n')}
}
`)
const bytes = dir => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, d) => n + (d.isDirectory() ? bytes(path.join(dir, d.name)) : fs.statSync(path.join(dir, d.name)).size), 0)
console.log(`wrote ${entries.length} cities in ${new Set(entries.map(e => e.country)).size} countries, images ${(bytes(PUB) / 1e6).toFixed(1)} MB; US populations ${Object.keys(usPopulation).length}/${US_CITY_FLAGS.length}`)

// What was left out, for the record: places that would have made the cut.
const smallest = {}
for (const e of entries) smallest[e.country] = Math.min(smallest[e.country] ?? Infinity, e.population)
const mattered = dropped.filter(d => !d.why.startsWith('the same ') && d.population >= (smallest[d.code] ?? 0))
// And the calls made by hand (DROP), which never reach the pools.
for (const [id, why] of Object.entries(DROP)) {
  const it = items.get(id)
  if (it) mattered.push({ code: countryOf(it), id, file: [...it.flags][0], population: it.population ?? it.best, why })
}
console.log(`\nleft out (${mattered.length}):`)
for (const d of mattered) console.log(`  ${d.code} ${d.id} ${d.population} ${d.file}: ${d.why}`)
for (const [code, why] of Object.entries(SKIP_COUNTRIES)) console.log(`  ${code}: ${why}`)

// A table of the data, and contact sheets, for review.
const REPORT = process.argv.find(a => a.startsWith('--report='))?.slice(9)
if (REPORT) {
  const rows = entries.map(e => `| ${nameOfCode[e.country]} | ${e.name}${e.capital ? ' (capital)' : ''} | ${e.population.toLocaleString('en-US')} | ${e.year} | ${e.licence} |`)
  fs.writeFileSync(REPORT, `# City flags: dataset\n\n${entries.length} cities in ${new Set(entries.map(e => e.country)).size} European countries (scripts/cities/build.mjs).\n\n| Country | City | Population | Year | Licence |\n|---|---|---:|---:|---|\n${rows.join('\n')}\n\n## Left out\n\n${mattered.map(d => `- ${nameOfCode[d.code]}: ${d.id} (${d.population.toLocaleString('en-US')}), ${d.file}: ${d.why}`).join('\n')}\n${Object.entries(SKIP_COUNTRIES).map(([c, why]) => `- ${nameOfCode[c]}: ${why}`).join('\n')}\n`)
}
if (SHEETS) {
  fs.mkdirSync(SHEETS, { recursive: true })
  fs.writeFileSync(path.join(SHEETS, 'entries.json'), JSON.stringify(entries.map(e => ({ ...e, countryName: nameOfCode[e.country], qid: e.wikidata }))))
}
