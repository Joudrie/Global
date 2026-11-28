// Builds src/data/coatsOfArms.ts and public/arms/: each country's current coat
// of arms (or emblem, or seal) and, where Wikipedia lists them plainly, its
// former ones, for the Codex's "Coats of arms" section (beta).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/arms/fetch.mjs
//   (add --offline to rebuild from the last download without asking Wikimedia;
//    the answers are cached in node_modules/.cache/arms/)
//
// Scope for now: the countries in src/data/flags.ts whose English name starts
// with A–Z, i.e. all of them (SCOPE below; it was A–M while the section began).
//
// 1. Wikidata (SPARQL): each country's item (by ISO code), its coat of arms
//    images (P94) and its coat-of-arms item (P237) with that item's English
//    article and start date (P571 inception / P580 start time).
// 2. English Wikipedia: the country article's infobox (image_coat and
//    symbol_type, which says "Emblem", "Seal"…; Denmark's uses image_seal).
//    The infobox image wins when it and Wikidata disagree (Wikipedia follows
//    redesigns faster); every disagreement is printed. CURRENT and SKIP below
//    cover the countries whose infobox shows no arms, checked by hand.
//    The name is the emblem's own article (the one the infobox links to, else
//    the P237 article), redirects followed: "Coat of arms of Albania",
//    "Imperial crest of Japan", "State Emblem of India".
// 3. Description: the first two sentences of that article's intro.
//    Adopted: only when two sources agree (see adoptedYear).
// 4. Former arms, from the emblem's own article (every image it shows: in
//    galleries, tables, thumbnails and {{Historical coat of arms}}-style
//    templates) and Wikidata's dated P94 statements. Each needs:
//    - years from the caption or a table's year cell; or the file title's
//      years ("(1949-1956)") agreeing with Wikidata's start/end, the words
//      beside the image, or (for a range) both years in the article;
//      otherwise it is kept undated only if the file names this country, it
//      sits in a history section (or names a former state: "Kingdom of
//      Fiji", "Badge of …"), and it isn't today's arms by another name;
//    - a caption or file title naming this country or one of its former
//      names (ALIASES), and no other country or occupying power;
//    - not a flag, coin, seal of a king, city, proposal, photo or rendering.
//    Colonial arms tied to the territory are labelled "(colony)". Emblems of
//    fascist and Nazi-era regimes and their Axis puppet states stay out.
//    For countries the English article leaves bare, the same rules run over
//    the emblem's article in the country's own Wikipedia, then the German,
//    French, Spanish and Russian ones, and Commons' "Historical coats of arms
//    of …" categories (their captions only date images; the file title must
//    say whose arms they are). The rest show "coming soon". Run with --why to
//    see every image's verdict.
// 5. Wikimedia Commons: each file's page, author and licence (extmetadata).
//    Files that aren't on Commons or aren't public domain / Creative Commons
//    are left out and printed. Thumbnails come from Commons, are trimmed and
//    shrunk with ImageMagick and squeezed with pngquant when installed:
//      public/arms/<code>.png        current, fits 320×320 (the detail)
//      public/arms/thumb/<code>.png  current, fits 120×120 (the list row)
//      public/arms/<code>-<n>.png    former, fits 240×240
//    Pale, colourless images (Afghanistan's) are flagged `light` for a backing.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const { FLAGS } = await import(path.join(ROOT, 'src/data/flags.ts'))

const OUT = path.join(ROOT, 'src/data/coatsOfArms.ts')
const PUB = path.join(ROOT, 'public/arms')
const CACHE_DIR = path.join(ROOT, 'node_modules/.cache/arms')
const HTTP_CACHE = path.join(CACHE_DIR, 'http.json')
const OFFLINE = process.argv.includes('--offline')
const UA = 'GlobalioBuild/1.0 (https://globalio.app)'

/** The countries covered so far: English names A–M. */
const SCOPE = /^[A-Z]/i
const SCOPE_LABEL = 'A–Z'
/** Former arms per country, newest first; older ones wait for a later pass. */
const MAX_FORMER = 16
/** Undated former arms per country (the file names the country, no source dates it). */
const MAX_UNDATED = 4
const SIZES = { detail: 320, thumb: 120, former: 240 }

// Wikidata items that share a country's ISO code but aren't the state.
const NOT_THE_STATE = new Set(['Q644636' /* Cyprus, the island */])
// Checked by hand (2026-11): countries whose English Wikipedia infobox shows
// no coat of arms.
const CURRENT = {
  // Official arms; the infobox leaves them out by editors' choice (its FAQ).
  CA: { file: 'Royal Coat of arms of Canada.svg', why: 'English Wikipedia\'s infobox leaves the arms out by editors\' choice; the file is Wikidata\'s (P94)' },
  // The infobox shows both variants side by side; this is Wikidata's preferred
  // one, used outside Scotland.
  GB: { file: 'Coat of arms of the United Kingdom (2022, variant 2).svg', article: 'Coat of arms of the United Kingdom', why: 'the infobox shows both variants side by side; this is Wikidata\'s preferred one (used outside Scotland)' },
  // No official arms or emblem: the infobox shows the Great Seal instead.
  FR: { file: 'Great Seal of France.svg', article: 'Great Seal of France', note: 'France has no official coat of arms or emblem. Wikipedia shows its Great Seal instead.' },
}
const SKIP = {
  LB: 'Lebanon\'s coat of arms is unofficial, and Wikipedia\'s infobox shows none.',
  LY: 'Libya has had no national emblem since 2011, and Wikipedia\'s infobox shows none.',
  TR: 'Turkey has no official coat of arms or emblem (its constitution names none), and Wikipedia\'s infobox shows none.',
}
// Former names a gallery caption may use for the country.
const ALIASES = {
  BY: ['Byelorussian', 'Belarusian'], BJ: ['Dahomey'], BF: ['Upper Volta'], BW: ['Bechuanaland'], BZ: ['British Honduras'],
  CD: ['Democratic Republic of the Congo', 'Democratic Republic of Congo', 'Zaire', 'Congo'], CI: ['Ivory Coast', 'Côte d\'Ivoire'], CZ: ['Czech', 'Czechoslovakia', 'Bohemia and Moravia'],
  ET: ['Ethiopian', 'Abyssinia'], GH: ['Gold Coast'], GY: ['British Guiana'], IR: ['Persia', 'Iranian'], KH: ['Khmer', 'Kampuchea'],
  KZ: ['Kazakh'], KG: ['Kirghiz', 'Kyrgyz'], LS: ['Basutoland'], MD: ['Moldavian', 'Moldavia'], MM: ['Burma'], MW: ['Nyasaland'],
  MV: ['Maldivian'],
  MK: ['Macedonia', 'Macedonian'], UA: ['Ukrainian'], UZ: ['Uzbek'], TZ: ['Tanganyika', 'Zanzibar'], ZW: ['Rhodesia', 'Southern Rhodesia'],
  ZM: ['Northern Rhodesia'], NA: ['South West Africa'], TH: ['Siam', 'Siamese'], LK: ['Ceylon'], KN: ['Saint Christopher', 'St Kitts', 'St. Kitts'],
  VU: ['New Hebrides'], TV: ['Ellice Islands'], SO: ['Somali'], TG: ['Togoland'], PG: ['Papua', 'New Guinea'], CH: ['Swiss', 'Helvetic'],
  VA: ['Holy See', 'Papal States'], NO: ['Norwegian'], SK: ['Slovak'], TJ: ['Tajik'], TM: ['Turkmen'], AE: ['Trucial States'], RU: ['Russian Empire', 'Russian SFSR', 'Russian Soviet Federative Socialist Republic', 'Tsardom of Russia'], GB: ['Great Britain', 'Kingdom of Great Britain', 'England'], CF: ['Central African Empire'], MY: ['Malaya', 'Federation of Malaya'], GW: ['Portuguese Guinea'], DE: ['German Empire', 'German Reich', 'North German Confederation'], LA: ['Lao'], DJ: ['French Somaliland', 'Afars and Issas'], KI: ['Gilbert and Ellice'], AZ: ['Azerbaijani'],
  AM: ['Armenian'], GE: ['Georgian'], HR: ['Croatian'], EE: ['Estonian'], LV: ['Latvian'], LT: ['Lithuanian'], MN: ['Mongolian'],
}
// Gallery entries that pass the rules below but aren't the country's arms
// (checked by hand), by file name.
const FORMER_DROP = new Set([
  // DR Congo: a rebel state's arms (Simba rebellion, 1964–1965), not the country's.
  'Coat of arms of the People\'s Republic of the Congo (Stanleyville).svg',
  // India: Portuguese India was Goa and a few enclaves, not India.
  'Blason of Goa (ancient).svg', 'Lesser coat of arms of Portuguese India.svg',
  'Coat of arms of Portuguese India (1935-1951).svg', 'Coat of arms of Portuguese India (1951-1974).svg',
  // China: the Japanese-backed Wang Jingwei regime (1940–1945).
  'Emblem of the Republic of China-Nanjing 1940-1945.svg',
  // Emblems of fascist regimes during the Second World War, which the Codex
  // shouldn't show beside a country's arms without context: the Arrow Cross
  // government of Hungary (1944–1945) and the Ustaše state in Croatia (1941–1945).
  'Coat of arms of Hungary (1945).svg', 'Coat of arms of Croatia (1941–1945).svg',
  // Japanese-sponsored puppet states of the same war: the Second Philippine
  // Republic (1943–1945) and Ba Maw's State of Burma (1943–1945).
  'Emblem of the Philippines (1943-1945).svg', 'Coat of arms of the Philippines (1943–1945).svg', 'State of Burma Emblem.svg',
  // From other Wikipedias: a count's arms given the Grand Duchy's name
  // (Luxembourg), and Indonesia's 1950 design the English article says was
  // rejected; an undated "Bourbon kingdom" fantasy for Ecuador.
  'Coat of arms Grand Duchy of Luxembourg.png', 'Coat of arms of United States of Indonesia.svg', 'Arms of Ecuador kingdom Bourbon.png',
  // Sweden: today's lesser arms, not a former version.
  'Coat of arms of Sweden (shield and chain).svg',
  // Azerbaijan: the 1920 design was never adopted.
  'Coat of arms of the Azerbaijan Democratic Republic.svg',
  // Chad's seal is in use today, beside the arms.
  'Seal of Chad.svg',
  // Czech Republic: today's lesser arms (the Bohemian lion), not a former version.
  'Small coat of arms of Bohemia and whole Czech lands.svg',
  // Comoros: Wikidata and the file title say 1978–2016, the article 1978–2001
  // (for its own copy of the seal, which stays).
  'Seal of the Comoros (1978-2016).svg',
])
// Former national emblems that the word filters would throw out ("royal").
const FORMER_ALLOW = new Set(['Royal Seal of the Kingdom of Laos.svg'])

// ── HTTP, cached ─────────────────────────────────────────────────────────────
fs.mkdirSync(CACHE_DIR, { recursive: true })
const cache = fs.existsSync(HTTP_CACHE) ? JSON.parse(fs.readFileSync(HTTP_CACHE, 'utf8')) : {}
const saveCache = () => fs.writeFileSync(HTTP_CACHE, JSON.stringify(cache))
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchRetry(url, init = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...init.headers }, signal: AbortSignal.timeout(110_000) })
      .catch(err => ({ ok: false, status: 0, text: async () => String(err), headers: new Headers() }))
    if (res.ok) { await sleep(500); return res } // be polite between requests
    // Wikimedia answers 429 in bursts to shared addresses: wait and retry.
    if (attempt >= 15 || ![0, 429, 500, 502, 503, 504].includes(res.status)) throw new Error(`${res.status} ${url}: ${(await res.text()).slice(0, 200)}`)
    const wait = Number(res.headers.get('retry-after')) || Math.min(30, 2 * attempt)
    process.stderr.write(`  ${res.status}, retrying in ${wait}s\n`)
    await sleep(wait * 1000)
  }
}
async function getText(url, { body } = {}) {
  const key = body ? `${url}\n${body}` : url
  if (key in cache) return cache[key]
  if (OFFLINE) throw new Error(`--offline: not cached: ${key.slice(0, 160)}`)
  const res = await fetchRetry(url, body ? { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json' } } : {})
  const text = await res.text()
  cache[key] = text; saveCache()
  return text
}
const getJSON = async (url, opts) => JSON.parse(await getText(url, opts))
const sparql = async query => (await getJSON('https://query.wikidata.org/sparql', { body: new URLSearchParams({ query, format: 'json' }).toString() })).results.bindings
const api = (host, params) => getJSON(`https://${host}/w/api.php?` + new URLSearchParams({ format: 'json', formatversion: '2', ...params }))
const wiki = params => api('en.wikipedia.org', params)
const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n))
const qid = uri => uri.replace('http://www.wikidata.org/entity/', '')
const fileOf = uri => decodeURIComponent(uri.replace(/^https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//, ''))
const yearOf = v => (v ? Number(v.value.match(/^-?\d+/)[0]) : undefined)
/** The File: namespace in the Wikipedias the script reads. */
const FILE_NS = 'File|Image|Datei|Bild|Fichier|Archivo|Imagen|Файл|Изображение|Plik|Bestand|Afbeelding|Ficheiro|Imagem|Immagine|Fil|Pilt|Soubor|Dosya|Tiedosto|Kuva|Slika|Datoteka|Податотека|Skrá|Berkas|Gambar|ファイル|画像|파일|ملف|קובץ|پرونده|Tập tin|Hình|Fișier|Failas|Attēls|Fitxer|Dosiero|Mynd|Ffeil|Faili|Ifayela'
const normFile = f => f.replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(new RegExp(`^(${FILE_NS})\\s*:`, 'i'), '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim().replace(/^./, c => c.toUpperCase())

/** Follows the API's normalized/redirects lists from an asked title. */
const resolver = q => t => {
  for (const n of q.normalized ?? []) if (n.from === t) t = n.to
  for (const r of q.redirects ?? []) if (r.from === t) t = r.to
  return t
}
/** Every page's wikitext for these titles (redirects followed), by asked title. */
async function wikitexts(titles, host = 'en.wikipedia.org') {
  const out = {}
  for (const group of chunks([...new Set(titles)], 10)) {
    const d = await api(host, { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', redirects: '1', titles: group.join('|') })
    const to = resolver(d.query)
    for (const t of group) {
      const p = d.query.pages.find(p => p.title === to(t))
      if (p?.revisions) out[t] = { title: p.title, text: p.revisions[0].slots.main.content }
    }
  }
  return out
}
/** Each article's plain-text intro, by resolved title. */
async function intros(titles) {
  const out = {}
  for (const group of chunks([...new Set(titles)], 20)) {
    const d = await wiki({ action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', exlimit: '20', redirects: '1', titles: group.join('|') })
    const to = resolver(d.query)
    for (const t of group) {
      const p = d.query.pages.find(p => p.title === to(t))
      if (p?.extract) out[t] = p.extract
    }
  }
  return out
}

// ── Wikitext helpers ─────────────────────────────────────────────────────────
const stripComments = s => s.replace(/<!--[\s\S]*?-->/g, '')
/** An infobox parameter's raw value: to the end of the line or the next "|" outside [[…]] and {{…}}. */
function infoboxParam(text, names) {
  const t = stripComments(text)
  for (const n of names) {
    const m = new RegExp(`\\|\\s*${n}\\s*=`).exec(t)
    if (!m) continue
    let depth = 0, v = ''
    for (let i = m.index + m[0].length; i < t.length; i++) {
      const two = t.slice(i, i + 2)
      if (two === '[[' || two === '{{') { depth++; v += two; i++; continue }
      if ((two === ']]' || two === '}}') && depth > 0) { depth--; v += two; i++; continue }
      if (t[i] === '\n' || (t[i] === '|' && depth === 0) || (two === '}}' && depth === 0)) break
      v += t[i]
    }
    if (v.trim()) return v.trim()
  }
  return undefined
}
const linkTarget = s => s?.match(/\[\[([^|\]#]+)/)?.[1]?.trim()
const plain = s => (s ?? '')
  .replace(/<ref[^>]*\/>/gi, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
  .replace(/\{\{(?:nowrap|lang|transl|nobr)\|(?:[a-z-]+\|)?([^{}]*)\}\}/gi, '$1')
  .replace(/\{\{(?:ndash|snd)\}\}/gi, '–').replace(/\{\{[^{}]*\}\}/g, '')
  .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/\[https?:\S+\s*([^\]]*)\]/g, '$1')
  .replace(/'''?/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
  .replace(/\s+/g, ' ').trim()
const fileFromValue = v => (v ? normFile(v.replace(/^\[\[/, '').replace(/\|.*$/s, '').replace(/\]\]$/, '')) : undefined)

// ── 1. Wikidata ──────────────────────────────────────────────────────────────
const countries = FLAGS.filter(f => SCOPE.test(f.name))
console.log(`${countries.length} countries (${SCOPE_LABEL})`)
const rows = await sparql(`SELECT ?item ?code ?title ?coa ?coaStart ?arms ?armsTitle ?armsLabel ?armsInception ?armsStart WHERE {
  VALUES ?code { ${countries.map(f => `"${f.code}"`).join(' ')} }
  ?item wdt:P297 ?code .
  OPTIONAL { ?art schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?title }
  OPTIONAL { ?item p:P94 ?st . ?st ps:P94 ?coa . ?st wikibase:rank ?rank . FILTER(?rank != wikibase:DeprecatedRank) OPTIONAL { ?st pq:P580 ?coaStart } }
  OPTIONAL { ?item wdt:P237 ?arms .
    OPTIONAL { ?aa schema:about ?arms; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?armsTitle }
    OPTIONAL { ?arms rdfs:label ?armsLabel FILTER(lang(?armsLabel) = "en") }
    OPTIONAL { ?arms wdt:P571 ?armsInception } OPTIONAL { ?arms wdt:P580 ?armsStart } }
}`)
const wd = {}
for (const r of rows) {
  const id = qid(r.item.value)
  if (NOT_THE_STATE.has(id)) continue
  const c = (wd[r.code.value] ??= { qid: id, title: r.title?.value, files: [], arms: null })
  if (r.coa) {
    const file = normFile(fileOf(r.coa.value))
    const had = c.files.find(f => f.file === file)
    if (!had) c.files.push({ file, start: yearOf(r.coaStart) })
  }
  if (r.arms && !c.arms) c.arms = { qid: qid(r.arms.value), title: r.armsTitle?.value, label: r.armsLabel?.value, years: [] }
  if (r.arms && c.arms?.qid === qid(r.arms.value)) for (const y of [yearOf(r.armsStart), yearOf(r.armsInception)]) if (y && !c.arms.years.includes(y)) c.arms.years.push(y)
}

// ── 2. Infoboxes ─────────────────────────────────────────────────────────────
const articleOf = f => wd[f.code]?.title ?? f.name
const countryPages = await wikitexts(countries.map(articleOf))
const picks = []
const notes = []
const skipped = []
for (const f of countries) {
  if (SKIP[f.code]) { skipped.push({ code: f.code, reason: SKIP[f.code] }); continue }
  const w = wd[f.code]
  const page = countryPages[articleOf(f)]
  if (!page) notes.push(`${f.code}: no Wikipedia article "${articleOf(f)}"`)
  const info = page && fileFromValue(infoboxParam(page.text, ['image_coat', 'image_seal', 'image_symbol']))
  const type = page && (infoboxParam(page.text, ['symbol_type']) ?? infoboxParam(page.text, ['seal_type']))
  const typeLink = linkTarget(type) ?? (page && infoboxParam(page.text, ['seal_link', 'symbol_type_article']))
  const wdFiles = (w?.files ?? []).map(x => x.file)
  const hand = CURRENT[f.code]
  const file = hand?.file ?? info ?? (wdFiles.length === 1 ? wdFiles[0] : undefined)
  if (!file) { skipped.push({ code: f.code, reason: 'No coat of arms on Wikidata or in Wikipedia\'s infobox.' }); continue }
  const source = hand ? 'checked by hand' : info && wdFiles.includes(info) ? 'Wikipedia and Wikidata agree' : info ? 'Wikipedia infobox' : 'Wikidata'
  if (hand) notes.push(`${f.code}: ${hand.why ?? hand.note}`)
  else if (info && !wdFiles.includes(info)) notes.push(`${f.code}: infobox "${info}" ≠ Wikidata ${wdFiles.map(x => `"${x}"`).join(', ') || '(none)'}`)
  picks.push({ f, w, file, source, type: plain(type), article: hand?.article ?? typeLink ?? w?.arms?.title, note: hand?.note })
}

// ── 3. The emblems' own articles: name, intro, galleries ────────────────────
const armsPages = await wikitexts(picks.map(p => p.article).filter(Boolean))
const armsIntros = await intros(picks.map(p => p.article).filter(Boolean))
const kindOf = name => (/seal/i.test(name) ? 'seal' : /crest/i.test(name) ? 'crest' : /emblem/i.test(name) ? 'emblem' : /arms/i.test(name) ? 'arms' : 'emblem')
const termOf = type => (type && !/^coat of arms$/i.test(type) ? type.replace(/^./, c => c.toUpperCase()) : 'Coat of arms')

/** The first two sentences of an intro, if they make a short description. */
function shortDescription(text) {
  const para = text?.split('\n').map(s => s.trim()).find(s => s.length > 40)
  if (!para) return undefined
  // Sentences end at ". " before a capital, but not after "St.", "c.", initials.
  const sentences = []
  for (const piece of para.split(/(?<=[.!?])\s+(?=[A-Z"“])/)) {
    const prev = sentences[sentences.length - 1]
    if (prev && /\b(St|c|ca|Mt|No|Dr|Jr|Sr|[A-Z])\.$/.test(prev)) sentences[sentences.length - 1] = `${prev} ${piece}`
    else sentences.push(piece)
  }
  let out = ''
  for (const s of sentences) {
    if (out && (out + ' ' + s).length > 320) break
    out = out ? `${out} ${s}` : s
    if (out.length > 160) break
  }
  // Drop pronunciations and names in other scripts: "(Albanian: Stema e …)".
  out = out.replace(/\s*\([^()]*\)/g, m => (/[^\u0000-\u024f\u2000-\u206f]|lit\.|pronounced|;|:/.test(m) ? '' : m)).replace(/\s+([,.])/g, '$1').trim()
  return out.length > 360 ? undefined : out
}

// A year range in a caption: "1928–1939", "1975–87", "from 11 June 1951 to 11 November 1975", "1992–present".
const MONTH = '(?:January|February|March|April|May|June|July|August|September|October|November|December)'
const DAY = `(?:\\d{1,2}\\s+${MONTH}\\s+|${MONTH}\\s+(?:\\d{1,2},?\\s+)?)?`
const RANGE = new RegExp(`(?:\\b(?:from|between|in|during)\\s+)?(?:c\\.\\s*)?${DAY}(1[0-9]{3}|20[0-9]{2})\\s*(?:–|—|-|−|\\bto\\b|\\buntil\\b|\\band\\b|\\bbis\\b|\\bà\\b|\\bau\\b|\\bal\\b|\\bhasta\\b|\\bat[ée]\\b|\\btot\\b|\\btil\\b|\\btill\\b|\\bdo\\b|до|по)\\s*${DAY}(1[0-9]{3}|20[0-9]{2}|\\d{2}\\b|present|now|today|heute|aujourd|actualidad|presente|наст)?`, 'i')
function yearRange(caption) {
  const m = caption.match(RANGE)
  if (!m) return null
  const from = Number(m[1])
  const raw = m[2]
  if (!raw) return null // "1875 –": open-ended, unclear
  if (/present|now|today|heute|aujourd|actualidad|presente|наст/i.test(raw)) return { from, to: null, text: m[0] }
  let to = Number(raw)
  if (raw.length === 2) to = Math.floor(from / 100) * 100 + to + (to < from % 100 ? 100 : 0)
  return to >= from ? { from, to, text: m[0] } : null
}

const OTHER_STATES = /Northern Cyprus|Turkish Federated State|Great Britain|England|Ottoman|Holy Roman|Austria-Hungary|Russian Empire|Soviet Union|USSR|Khedive|Khedivate|Venice|Lusignan|Mamluk|United Arab Republic|Yugoslavia|Transleithania|Hungarian Crown|Order of Malta|Hospitaller|Aragon|Habsburg|Burgund|Prussia|Brandenburg|Bavaria|Saxony|Napoleon|Spanish Empire|British West Africa|Central America|New Granada|Leeward Islands|British East Africa|British Central Africa|Ruanda-Urundi|Anglo-Egyptian|Bessarabia|Taiping|Manchukuo|Azad Hind|Tripolitania|Cyrenaica|Sweden|Swedish|Suède|Danish|Dano-Norwegian|Dutch|Netherlands|Holland|Venetian|East Germany|German Democratic Republic/
const NOT_ARMS = /\b(flags?|banners?|standards?|coins?|passports?|stamps?|currency|banknotes?|maps?|photos?|photograph|masthead|gazette|proposals?|proposed|rejected|design for|reconstruction|king|queen|emperor|empress|sultan|emir of|shah|cardinal|count|countess|duke|duchess|prince|princess|bishop|ecclesiastic\w*|reign|reigned|house of|dynasty|city|cities|town|municipal\w*|council|company|occupation|occupied|presiden\w*|personal|monogram|governor|governorate|oblast|province of|air force|army|navy|police|roundel|rival|exile|unilateral\w*|royal|helmet|crown of|regalia|banner of|order of|medal|uniform|building|gate|statue|carving|relief|prime minister|chief adviser|minist\w*|parliament|senate|assembly|court|cabinet|speaker|statute|chairman|chief of state|head of state|turco-egyptian|shahbanou|directorate|telegraph|agency|authority)\b/i
// A person with a regnal number: "Henry VI", "Christian IV".
const REGNAL = /\b[A-Z][a-z]+ (?:[IVX]+)\b/
const GENERIC_WORDS = /\b(the|a|an|of|from|to|in|and|with|used|use|version|versions|official|greater|lesser|middle|small|large|national|state|coat|coats|arms|armorial|achievement|emblem|emblems|seal|seals|badge|crest|design|first|second|third|old|older|former|historical|historic|until|since|ca|c|between|during|modification|modified|variant|colou?r|colou?red|full|simplified|this)\b/gi

/** Splits "a|b [[c|d]]|{{e|f}}" on the pipes outside [[…]] and {{…}}. */
function splitTop(s) {
  const out = []
  let depth = 0, cur = ''
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2)
    if (two === '[[' || two === '{{') { depth++; cur += two; i++; continue }
    if ((two === ']]' || two === '}}') && depth > 0) { depth--; cur += two; i++; continue }
    if (s[i] === '|' && depth === 0) { out.push(cur); cur = ''; continue }
    cur += s[i]
  }
  out.push(cur)
  return out
}
const IMAGE_OPTION = /^\s*(thumb|thumbnail|frame|frameless|framed|border|left|right|center|centre|none|baseline|middle|sub|super|top|bottom|text-top|text-bottom|upright(\s*=.*)?|\d*x?\d+\s*px|(alt|link|page|class|lang|thumbtime|upright)\s*=.*)\s*$/i
const IMAGE_FILE = /\.(svg|png|jpe?g|gif|tiff?)$/i
/** "[[File:X|thumb|caption]]" with one level of nested links inside. */
const FILE_LINK = new RegExp(`\\[\\[(?:${FILE_NS})\\s*:([^|\\]]+)((?:\\|(?:[^[\\]]|\\[\\[[^\\]]*\\]\\])*)?)\\]\\]`, 'gi')
/** A table cell that is only a year range: "1819—1834", "''1540—1556''", "1834–c. 1940". */
const YEAR_CELL = /^\s*(c\.\s*)?(1[0-9]{3}|20[0-9]{2})\s*(–|—|-|−|to)\s*(c\.\s*)?(1[0-9]{3}|20[0-9]{2}|present|today)\s*$/i

/** Every image an article shows, with the words beside it: a gallery or
 *  thumbnail caption, a table row's year cell (and the row's other text),
 *  a {{multiple image}} caption; and the section it sits in. */
function articleImages(wikitext) {
  const t = stripComments(wikitext)
  const heads = [...t.matchAll(/^(={2,})\s*(.*?)\s*\1\s*$/gm)].map(h => ({ i: h.index, lvl: h[1].length, t: plain(h[2]) }))
  const sectionAt = i => {
    const path = []
    for (const h of heads) {
      if (h.i > i) break
      while (path.length && path[path.length - 1].lvl >= h.lvl) path.pop()
      path.push(h)
    }
    return path.map(h => h.t).join(' > ')
  }
  const out = []
  const taken = []
  const inTaken = i => taken.some(([a, b]) => i >= a && i < b)
  for (const g of t.matchAll(/<gallery[^>]*>([\s\S]*?)<\/gallery>/gi)) {
    taken.push([g.index, g.index + g[0].length])
    for (const line of g[1].split('\n').map(l => l.trim()).filter(Boolean)) {
      const parts = splitTop(line)
      const file = normFile(parts[0])
      if (!IMAGE_FILE.test(file)) continue
      out.push({ file, caption: plain(parts.slice(1).filter(x => !IMAGE_OPTION.test(x)).join(' ')), from: 'gallery', section: sectionAt(g.index) })
    }
  }
  for (const tb of t.matchAll(/\{\|[\s\S]*?\n\|\}/g)) {
    taken.push([tb.index, tb.index + tb[0].length])
    for (const row of tb[0].split(/\n\|-[^\n]*/)) {
      const files = [...row.matchAll(FILE_LINK)].map(m => normFile(m[1])).filter(f => IMAGE_FILE.test(f))
      if (!files.length) continue
      const cells = row.replace(FILE_LINK, ' ').split(/\n[|!]|\|\||!!/).map(c => plain(c.replace(/^[^|\n]*?(style|width|rowspan|colspan|align|class)\s*=[^|]*\|/i, '')))
      const yearCell = cells.find(c => YEAR_CELL.test(c.replace(/''/g, '')))
      out.push({ file: files[0], caption: yearCell ?? '', rowText: cells.join(' '), from: 'table', section: sectionAt(tb.index) })
    }
  }
  for (const m of t.matchAll(FILE_LINK)) {
    if (inTaken(m.index)) continue
    const file = normFile(m[1])
    if (!IMAGE_FILE.test(file)) continue
    const params = splitTop(m[2].replace(/^\|/, '')).filter(x => !IMAGE_OPTION.test(x))
    out.push({ file, caption: plain(params[params.length - 1] ?? ''), from: 'thumbnail', section: sectionAt(m.index) })
  }
  // Templates with images: {{Multiple image | image1 = X | caption1 = …}},
  // {{Historical coat of arms | image = X | name = … | years_in_use = 1958–1963}},
  // {{Infobox coat of arms | name = Commonwealth Coat of Arms 1908–1912 | image = X}}.
  const stack = []
  for (let i = 0; i < t.length - 1; i++) {
    if (t[i] === '{' && t[i + 1] === '{') { stack.push(i); i++; continue }
    if (!(t[i] === '}' && t[i + 1] === '}' && stack.length)) continue
    const start = stack.pop()
    const body = t.slice(start + 2, i)
    i++
    if (!/\|\s*image\d*\s*=/i.test(body) || inTaken(start)) continue
    const params = {}
    for (const part of splitTop(body).slice(1)) {
      const m = part.match(/^\s*([\w ]+?)\s*=([\s\S]*)$/)
      if (m) params[m[1].toLowerCase()] = m[2].trim()
    }
    for (const [k, v] of Object.entries(params)) {
      const n = k.match(/^image(\d*)$/)?.[1]
      if (n === undefined) continue
      const file = normFile(v.replace(/^\[\[(?:File|Image):/i, '').replace(/\|.*$/s, '').replace(/\]\]$/, ''))
      if (!IMAGE_FILE.test(file)) continue
      const name = params[`name${n}`] ?? (n === '' ? params.name : undefined)
      const years = params.years_in_use ?? params.years ?? params[`years${n}`]
      const caption = name ? `${name}${years ? ` (${years})` : ''}` : (params[`caption${n}`] ?? (n === '' ? params.caption : '') ?? '')
      out.push({ file, caption: plain(caption), from: 'template', section: sectionAt(start) })
    }
  }
  return out
}

/** A name for a state or regime that no longer exists (or a colonial badge). */
const FORMER_POLITY = /\b(Kingdom|Empire|Federation|Colony|colonial|Protectorate|SSR|Soviet|Socialist|People's|Democratic Republic|Dominion|Lordship|Principality|Badge)\b/i
const HISTORY_SECTION = /histor|former|previous|past\b|evolution|older|earlier|chronolog|changes|colonial|timeline|origin|predecessor|Geschichte|ehemalig|früher|ancien|antigu|истори|прежн|бывш|storia|storic|geschiedenis|tidligere|ajalugu|tarih|sejarah|commons:/i
// A country's own earlier states that OTHER_STATES lists for the others.
const OWN_HISTORY = {
  RU: /Russian Empire/g, GB: /Great Britain|England/g, NL: /Dutch|Netherlands|Holland/g, SE: /Sweden|Swedish/g,
  ES: /Spanish Empire/g, AT: /Austria-Hungary|Habsburg/g, HU: /Austria-Hungary|Hungarian Crown|Transleithania/g,
  DE: /Prussia|Holy Roman/g, DK: /Danish/g, TR: /Ottoman/g,
}
// Fascist and Nazi-era regimes' emblems stay out of the Codex (the owner's
// rule): by name here, by file in FORMER_DROP (Hungary 1945, Croatia 1941–1945…).
const FASCIST = /\b(Nazi|Third Reich|Arrow Cross|Usta[šs]e|Ustasha|Independent State of Croatia|Italian Social Republic|Sal[òo] Republic|fasces|fascis[mt]\w*|Francoist|Franco(?:'s)? (?:Spain|regime|dictatorship|era)|Nedi[ćc]|Quisling|Vichy|National Legionary|Slovak State|First Slovak Republic|Government of National Salvation|Reichskommissariat|Protectorate of Bohemia and Moravia|Second Philippine Republic|State of Burma \(1943|Manchukuo|Mengjiang|Wang Jingwei)\b/i
// Sections that hold today's variants, other bodies' emblems or designs that
// never became official, not the country's former arms.
const NOT_HISTORY_SECTION = /subdivision|provinc|regions?\b|states and|territor|cities|municipal|other (coats|emblems|arms)|govern(ment)? (bodies|agencies)|national bodies|ministr|military|armed forces|police|presiden|proposal|proposed|competition|design contest|similar|derivative|usage|\buse\b|see also|variants of the|royal (arms|coat|standard)|monarch|personal|subnational|unilaterally|separatist/i
// Renderings, objects and photographs, not a version of the arms.
const NOT_A_VERSION = /monochrome|black and white|black-and-white|\bb&w\b|rendition|relief|\b3d\b|outline|silhouette|gr[ae]yscale|engraving|drawing|sketch|illustration|photo|carving|stone|sculpture|embroider|plaque|mosaic|stained|window|fa[cç]ade|entrance|book|postcard|poster|letterhead|logo|explained|meaning|means|diagram|construction sheet|template|blank|example|interpretation|proposal|proposed|draft|alternative|winner|competition|model|featuring|text\b|deemed|prototype|carved|temporary|exhibition|leaflet|printed|projekt|unofficial|de facto/i
/** Wikidata's P94 statements with start and end times, by country, file. */
const wdDates = {}
{
  const rows = await sparql(`SELECT ?code ?coa ?start ?end WHERE {
    VALUES ?code { ${countries.map(f => `"${f.code}"`).join(' ')} }
    ?item wdt:P297 ?code . ?item p:P94 ?st . ?st ps:P94 ?coa . ?st pq:P580 ?start . ?st pq:P582 ?end . }`)
  for (const r of rows) {
    const list = ((wdDates[r.code.value] ??= {})[normFile(fileOf(r.coa.value))] ??= [])
    list.push({ from: yearOf(r.start), to: yearOf(r.end) })
  }
}
/** The years in a file's title: "(1949-1956)", "(1945)", "1957–1990". */
function fileYears(file) {
  const t = file.replace(/\.[a-z]+$/i, '')
  const r = yearRange(t)
  if (r) return r
  const one = t.match(/\((1[0-9]{3}|20[0-9]{2})\)/)
  return one ? { from: Number(one[1]), to: Number(one[1]), text: one[0] } : null
}
const COLONY = /\b(British|Portuguese|French|Italian|Belgian|Spanish|Dutch|German|Danish) (?!(?:Republic|Empire|Confederation|Reich|Democratic|Federal|Socialist|Soviet|People)\b)[A-Z][a-z]+|\bcolon(y|ial)\b|\bprotectorate\b|Government-General|Congo Free State|Nyasaland|Basutoland|Bechuanaland|Gold Coast|Portuguese West Africa|Portuguese East Africa|^Badge of|\bbadge$|Captaincy General|Northern Rhodesia|Southern Rhodesia|Gilbert and Ellice/i
const NAME_FIX = [
  [/^Coat of arms of ZAVNOH & Federal State of Croatia$/, 'Coat of arms of the Federal State of Croatia'],
  [/^Emblem used by the /, 'Emblem of the '],
  [/ of (?!the )((?:[A-Z][a-z]+ )+(?:Soviet Socialist|Socialist Soviet|Autonomous Soviet Socialist|Autonomous Socialist Soviet) Republic)/, ' of the $1'],
  [/^Coat of arms of the Portuguese Brazil$/, 'Coat of arms of Portuguese Brazil'],
  [/^Coat of arms of British Honduras\/Belize$/, 'Coat of arms of British Honduras'],
  [/^Former (\w)/, (_, c) => c.toUpperCase()],
  [/^Small or 'lesser' coat of arms/, 'Lesser coat of arms'],
  [/\s+variant$/i, ''],
  [/\s+Laurel$/, ''],
  [/\s+-\s+(obverse|reverse)$/i, ''],
  [/^Coat of arms from the /, 'Coat of arms of the '],
  [/,?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(?:to|–|-)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\b.*$/, ''],
  [/,\s+(?:as|which|used|adopted|with|when)\b.*$/, ''],
  [/\s+(?:was|is|were|which|that)$/, ''],
  [/ of (?!the )((?:[A-Z][a-z]+ )(?:ASSR|SSR)\b)/, ' of the $1'],
  [/ of (?!the )([A-Z][a-z]+ People's Republic\b)/, ' of the $1'],
  [/ of the (French|Portuguese|Belgian|German|Italian|Spanish) (?=[A-Z])/, ' of $1 '],
  [/^Coat of arms Ceylon dutch colony$/, 'Coat of arms of Dutch Ceylon (colony)'],
  [/\s+1[0-9]{3}\s*[-–]\s*\d{2,4}$/, ''],
  [/\bthe republic of the united Netherlands\b/, 'the Republic of the United Netherlands'],
  [/^\d+(st|nd|rd|th) coat of arms of /i, 'Coat of arms of '],
  [/ of Russian Empire\b/, ' of the Russian Empire'],
  [/\bCoat of arms of Soviet Armenia\b/, 'Coat of arms of the Armenian SSR'],
  [/ of The /g, ' of the '],
  [/^Coat of arms of (the )?Austro-Hungarian condominium of /, 'Coat of arms of Austro-Hungarian '],
  // "Coat of arms of Republic of X" → "… of the Republic of X" (only right after the arms word).
  [/^((?:[\w'-]+\s+)*?(?:coat of arms|arms|emblem|seal|badge|crest)) of (?!the )((?:Kingdom|Republic|State|Empire|Union|Coalition|Khmer Republic|United|Independent|Provisional|Transitional|Federation|(?:Democratic|People's|Federal|Federative|Socialist|Islamic) (?:Republic|State|Emirate|Union))\b)/i, '$1 of the $2'],
  [/(?<=\w )Coat of arms/g, 'coat of arms'],
  [/\s+/g, ' '],
]

function formerArms(p, extra = []) {
  const page = armsPages[p.article]
  const names = [p.f.name, ...(ALIASES[p.f.code] ?? [])]
  // "South Australia" and "Western Australia" are states, not Australia.
  const mentions = (s, n) => new RegExp(`${n === p.f.name ? '(?<!\\b(?:South|North|West|Western|East|Eastern|Northern|Southern|Upper|Lower|New|Little)\\s)' : ''}\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w)`, 'i').test(s)
  const isThis = s => names.some(n => mentions(s, n))
  // Another country in the Codex, unless it's part of this one's names
  // ("Guinea" in "Guinea-Bissau") or a name of its own ("United States of Brazil").
  const others = FLAGS.filter(o => o.code !== p.f.code && !names.some(n => n.toLowerCase().includes(o.name.toLowerCase())))
  const own = OWN_HISTORY[p.f.code]
  const isOther = s => OTHER_STATES.test(own ? s.replace(own, '') : s) || others.some(o => new RegExp(`\\b${o.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(?!\\s+of\\b)`).test(s))
  const articleText = page ? plain(stripComments(page.text)) : ''
  const inArticle = y => new RegExp(`\\b${y}\\b`).test(articleText)
  // The current emblem's own name and the plain forms of it ("Arms of Hungary"):
  // an undated image by one of these names is a variant of today's, not a former one.
  const country = p.f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const plainName = new RegExp(`^(the )?((greater|lesser|middle|small|national|state|great|imperial)\\s+)?(coat of arms|arms|emblem|seal|crest)( of)? (the )?(${country}|${(ALIASES[p.f.code] ?? []).map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') || '\\u0000'})$`, 'i')
  const wdHere = wdDates[p.f.code] ?? {}
  // The article's images, then Wikidata's dated former files.
  const images = page ? articleImages(page.text) : []
  for (const file of Object.keys(wdHere)) images.push({ file, caption: '', from: 'wikidata', section: '' })
  images.push(...extra)
  const out = []
  const decisions = []
  let adoptedHint
  for (const c of images) {
    const { file } = c
    const why = s => decisions.push(`${file} [${c.from}] ${s}`)
    const allowed = FORMER_ALLOW.has(file)
    if (file === p.file) { const r = yearRange(c.caption); if (r && r.to === null) adoptedHint = r.from; continue }
    if (FORMER_DROP.has(file)) { why('dropped by hand'); continue }
    if (out.some(x => x.file === file)) continue
    const fromFile = file.replace(/^CoA of /, 'Coat of arms of ').replace(/\.[a-z]+$/i, '').replace(/\),\s+(Coat of arms|Emblem|Seal|Arms)\b.*$/i, ')').replace(/\s*\([^()]*\)/g, '').replace(/\s+(?:c\.\s*)?(1[0-9]{3}|20[0-9]{2})(\s*[–-]\s*(1[0-9]{3}|20[0-9]{2}|present)?)?$/i, '').replace(/[_]/g, ' ').trim()
    const fileTerm = fromFile.match(/^((?:greater|lesser|middle|small|national|state|imperial|royal)\s+)?(coat of arms|emblem|seal|arms|badge)\b/i)?.[0]
    const fileNamesThis = (!!fileTerm || allowed) && isThis(fromFile) && !/\b[A-Z]{4,}\b/.test(fromFile)
    const fileWords = file.replace(/\.[a-z]+$/i, '').replace(/[_-]/g, ' ')
    const section = c.section ?? ''
    if (NOT_HISTORY_SECTION.test(section) && c.from !== 'wikidata') { why(`section "${section}"`); continue }
    // "Coat of arms of Kingdom of Belgium 1846.png": a plate from an 1840s armorial, not a version.
    if (/\s1[5-8]\d\d\.(png|jpe?g|gif)$/i.test(file)) { why('a plate from an old armorial'); continue }
    if (FASCIST.test(fileWords) || FASCIST.test(c.caption)) { why('a fascist or Nazi-era regime\'s emblem'); continue }
    if (!allowed && (NOT_A_VERSION.test(fileWords) || NOT_A_VERSION.test(c.caption))) { why('a rendering, object or proposal'); continue }

    // ── Years: the caption's (or the table's year cell), else the file
    // title's when Wikidata or the words beside the image agree.
    const capRange = yearRange(c.caption)
    if (capRange && capRange.to === null) { why('in use today'); continue }
    const fr = fileYears(file)
    if (fr && fr.to === null) { why('in use today (file)'); continue }
    const wdr = wdHere[file] ?? []
    let years = null, yearsFrom = ''
    if (capRange) {
      years = { ...capRange }
      const second = yearRange(c.caption.slice(c.caption.indexOf(capRange.text) + capRange.text.length))
      if (second?.to) years.to = Math.max(years.to, second.to)
      yearsFrom = 'caption'
    } else if (fr && wdr.some(r => r.from === fr.from && r.to === fr.to)) {
      years = fr; yearsFrom = 'file title and Wikidata'
    } else if (fr && [c.caption, c.rowText ?? '', section].some(s => new RegExp(`\\b(${fr.from}|${fr.to})\\b`).test(s))) {
      years = fr; yearsFrom = 'file title and the article'
    } else if (wdr.length === 1 && [c.caption, c.rowText ?? '', section].some(s => new RegExp(`\\b(${wdr[0].from}|${wdr[0].to})\\b`).test(s))) {
      years = wdr[0]; yearsFrom = 'Wikidata and the article'
    } else if (fr && fr.from !== fr.to && inArticle(fr.from) && inArticle(fr.to)) {
      // "Emblem of Laos (1975-1991).svg" in an article that gives both years.
      years = fr; yearsFrom = 'file title, both years in the article'
    }
    if (years && (!(years.from <= years.to) || years.to > new Date().getFullYear())) years = null

    // ── The name: the caption without its dates, else the file's title.
    let name = ''
    let generic = true
    if (c.caption && c.from !== 'table' && !c.foreign) {
      const full = c.caption.replace(/\s*\([^()]*\b\d{4}\b[^()]*\)/g, ' ').replace(capRange?.text ?? '\u0000', ' ')
        .split(/\.\s/)[0]
        // ", adopted in 1826", "from July 5, 1975", "from 13 July to 6 August"
        .replace(/[\s,]*\b(adopted|introduced|from|since|in use|used)\b(?=[^.]*(\d|January|February|March|April|May|June|July|August|September|October|November|December)).*$/i, '')
        .replace(/[\s,;:.–—-]+$/, '').replace(/\s+\b(from|in|between|during|used during|used)$/i, '').replace(/[\s,;:.–—-]+$/, '').replace(/^[\s,;:–—-]+/, '')
        .replace(/\s+/g, ' ').trim()
      if (!allowed && (NOT_ARMS.test(full) || REGNAL.test(full))) { why(`caption "${full}"`); continue }
      name = full.replace(/\s*\([^()]*\)/g, '').trim()
      if (years && yearsFrom === 'caption' && /\d{4}.*\d{4}.*\d{4}/.test(c.caption)) name = name.split(/ and |, /)[0].trim()
      generic = !name.replace(GENERIC_WORDS, '').replace(/[^\p{L}]+/gu, '')
    }
    if (!allowed && (NOT_ARMS.test(fileWords) || REGNAL.test(fileWords))) { why('file title'); continue }
    if (generic) {
      if (!fileNamesThis) { why('nothing says whose arms these are'); continue }
      name = fromFile
    } else if (!isThis(name)) {
      // A caption about something else ("Arms of the Holy Roman Emperor"), unless the file names this country.
      if (!fileNamesThis || !years) { why(`caption "${name}" names another place`); continue }
      name = fromFile
    } else if (!/\b(arms|emblem|seal|badge|crest|insignia|escutcheon)\b/i.test(name)) {
      // "Kingdom of Croatia" → "Coat of arms of the Kingdom of Croatia".
      const term = fileTerm ?? { arms: 'Coat of arms', emblem: 'Emblem', seal: 'Seal', crest: 'Crest' }[kindOf(page?.title ?? '')]
      const the = /^(Kingdom|Republic|Democratic|People's|Islamic|Federal|Federative|Socialist|State|Free State|Colony|Empire|Union|Independent|Provisional|Transitional|Emirate|United|First|Second|Third|Banovina|Principality|Grand Duchy|Duchy)\b/.test(name) ? 'the ' : ''
      name = `${term.replace(/^./, ch => ch.toUpperCase())} of ${the}${name}`
    }
    if (name.length > 72) {
      // A sentence: keep it only when it names this country and dates the image.
      if (!years || !(fileNamesThis || (isThis(name) && !isOther(c.caption)))) { why('caption is a sentence, not a name'); continue }
      const said = name.match(/\b(coat of arms|emblem|seal|badge)\b/i)?.[1]
      name = fileNamesThis ? fromFile : `${said ? said.replace(/^./, ch => ch.toUpperCase()) : 'Coat of arms'} of ${p.f.name}`
    }
    if (isOther(name) || isOther(file)) { why('another country or state'); continue }
    // Undated: only when the file itself says it is this country's arms, it
    // sits in a history section (or its caption says former/old…), and it is
    // named for a former state or version, not today's arms ("Arms of Iceland").
    if (!years) {
      if (!fileNamesThis) { why('undated and the file doesn\'t say whose'); continue }
      const bare = name.replace(/\s*\([^()]*\)$/, '').trim()
      const historyish = HISTORY_SECTION.test(section) || /gallery/i.test(section) || c.from === 'wikidata'
        || /\b(former|previous|old|historic(al)?|original|early|earlier|colonial|first)\b/i.test(c.caption) || FORMER_POLITY.test(bare)
      if (!historyish) { why('undated, outside a history section'); continue }
      if (plainName.test(bare) || bare.toLowerCase() === (page?.title ?? '').toLowerCase() || /\d|variant|version|^seal of the government of/i.test(bare)) { why(`undated "${bare}": a version of today's arms?`); continue }
      const key = n => n.toLowerCase().replace(/\bthe\s+/g, '').replace(/\s*\([^()]*\)$/, '')
      if (out.some(x => key(x.name) === key(bare))) { why('undated twin of a dated one'); continue }
    }
    name = name.replace(/^the\s+/i, '').replace(/^./, ch => ch.toUpperCase()).replace(/\bCoat of Arms\b/g, 'Coat of arms').replace(/\bArms\b/g, m => (name.startsWith(m) ? m : 'arms'))
    for (const [re, to] of NAME_FIX) name = name.replace(re, to)
    name = name.replace(new RegExp(`\\b${country}\\b`, 'gi'), p.f.name)
    name = name.replace(/^./, ch => ch.toUpperCase())
    if (/Protectorate of Bohemia and Moravia/.test(name)) name += ' (German occupation)'
    else if (/\bprotectorate\b/i.test(name)) { /* says so already */ }
    else if (COLONY.test(name) && !/\bcolon(y|ial)\b/i.test(name)) name += ' (colony)'
    if (/\bEyalet\b/.test(name)) name += ' (Ottoman province)'
    if (years && out.some(x => x.from === years.from && x.to === years.to)) { why('same years as another version'); continue }
    out.push({ file, name, ...(years ? { from: years.from, to: years.to } : {}), via: `${c.from}${years ? `, years from ${yearsFrom}` : ', undated'}` })
    why(`KEPT as "${name}" ${years ? `${years.from}–${years.to}` : 'undated'}`)
  }
  // Newest first; undated ones last, at most a few.
  const dated = out.filter(x => x.from !== undefined).sort((a, b) => b.from - a.from || b.to - a.to)
  const key = n => n.toLowerCase().replace(/\b(the|national|state)\s+/g, '').replace(/\s*\([^()]*\)$/, '')
  const undated = out.filter(x => x.from === undefined && !dated.some(d => key(d.name) === key(x.name))).slice(0, MAX_UNDATED)
  const all = [...dated, ...undated]
  return { former: all.slice(0, MAX_FORMER), cut: Math.max(0, all.length - MAX_FORMER), adoptedHint, decisions }
}

/** Adopted: the file's own "(2020–present)", Wikidata's start time for that
 *  file, the gallery caption "…(1992–present)" for that file, else the later
 *  of the intro's "current design … 1912" and Wikidata's year for the emblem
 *  when the intro says it too (Australia: arms 1908, current version 1912;
 *  Germany: design 1928, adopted 1950). */
function adoptedYear(p, hint, intro) {
  const own = p.file.match(/\((?:c\.\s*)?(1[0-9]{3}|20[0-9]{2})\s*(?:–|-)\s*(?:present)?\)/i)
  if (own) return { year: Number(own[1]), from: 'the file name' }
  const st = p.w?.files.find(x => x.file === p.file)?.start
  if (st) return { year: st, from: 'Wikidata (P94 start time)' }
  if (hint) return { year: hint, from: 'the article\'s gallery' }
  const YEAR_RE = /\b(1[0-9]{3}|20[0-9]{2})\b/
  let current
  // "established in its current form in 1944 but has its origins in … 1813":
  // the first year after "current", else the last before it; not lifespans in brackets.
  const sentence = intro?.split(/(?<=\.)\s+/).map(s => s.replace(/\([^()]*\)/g, '')).find(s => /\b(current|present)\b/i.test(s) && YEAR_RE.test(s) && !/\b(rendering|die|engraving|drawing|painting|reverse)\b/i.test(s))
  if (sentence) {
    const at = sentence.search(/\b(current|present)\b/i)
    const after = sentence.slice(at).match(YEAR_RE)
    const before = [...sentence.slice(0, at).matchAll(new RegExp(YEAR_RE, 'g'))].pop()
    current = Number((after ?? before)[1])
  }
  const confirmed = (p.w?.arms?.years ?? []).filter(y => intro && new RegExp(`\\b${y}\\b`).test(intro))
  const wdYear = confirmed.length ? Math.max(...confirmed) : undefined
  if (current && wdYear) return { year: Math.max(current, wdYear), from: 'the article and Wikidata (the later)' }
  if (current) return { year: current, from: 'the article ("current … year")' }
  if (wdYear) return { year: wdYear, from: 'Wikidata, confirmed by the article' }
  return undefined
}

// ── 5. Commons: licences, authors, thumbnails ────────────────────────────────
async function commonsInfo(files) {
  const out = {}
  for (const group of chunks([...new Set(files)], 40)) {
    const d = await api('commons.wikimedia.org', {
      action: 'query', prop: 'imageinfo', redirects: '1', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '500',
      iiextmetadatafilter: 'LicenseShortName|License|LicenseUrl|Artist|NonFree',
      titles: group.map(x => `File:${x}`).join('|'),
    })
    const to = resolver(d.query)
    for (const x of group) {
      const p = d.query.pages.find(p => p.title === to(`File:${x}`))
      out[x] = p && !p.missing && p.imageinfo ? { title: p.title, ...p.imageinfo[0] } : null
    }
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
    .replace(/^(File\s*:\s*)?[^:]+\.(svg|png|jpe?g)\S*\s*(:|by)\s*/i, '') // "File:X.svg : Someone", "X.svg by Someone"
    .replace(/\s*dyskusja\s+Mail\b.*$/i, '').replace(/\s*\d{1,2}:\d{2}, \d{1,2} \w+ \d{4} \(UTC\)/g, '')
    .replace(/\S+@\S+\.[a-z]{2,}/gi, '') // no e-mail addresses in credits
    .replace(/\bUnknown(\s+Unknown)+\b/gi, 'Unknown').replace(/\b(Unknown author)(\s+\1)+/gi, '$1')
    .replace(/\(\s*talk\s*\)/gi, '').replace(/[^\s,;:]+\.svg'?\)?/gi, '').replace(/\bderitive\b/g, 'derivative')
    // Commons boilerplate that follows the name.
    .replace(/\s*\b(This (W3C|SVG|vector|file|image)\b|Legal disclaimer|Communist symbol)\b.*$/i, '')
    .replace(/\s+([,.;])/g, '$1').replace(/^[\s,;:.&]+|[\s,;:&]+$/g, '').replace(/\s+/g, ' ').trim()
  // Commons' boilerplate when the author is in the file history, or unknown.
  if (!a || /see file history|^unknown( author)?$|^own work$|^the original uploader was|no machine-readable author/i.test(a)) return ''
  if (a.length > 48) {
    // Long credits: keep who made it, drop how ("based on…", "(Originalbeschreibung…)", "derivative work…").
    a = a.replace(/\s*\([^()]*\)?/g, '').split(/;|\.\s|\s+based on\b|,\s*based\b|\s+derivative work\b|\s+from (?:the )?original\b|\s+from\s+F l a n k e r|,\s*with\b|\s+including\b|\s+using\b|,\s*earlier\b|\s+Vectori[sz]ation\b|,\s*vectori[sz]\w+ by\b|\s+converted\b/i)[0].trim()
  }
  return a.length > 60 ? a.slice(0, 58).replace(/[\s,;:(]+\S*$/, '') + '…' : a
}
const commonsPage = ii => `https://commons.wikimedia.org/wiki/${encodeURIComponent(ii.title.replace(/ /g, '_')).replace(/%3A/g, ':').replace(/%2C/g, ',').replace(/%28/g, '(').replace(/%29/g, ')')}`

const HAS = cmd => { try { execFileSync('which', [cmd], { stdio: 'ignore' }); return true } catch { return false } }
const MAGICK = HAS('convert')
const PNGQUANT = HAS('pngquant')
if (!MAGICK) console.warn('ImageMagick not found: saving Commons thumbnails as they come')
async function download(ii) {
  const url = ii.thumburl ?? ii.url
  const raw = path.join(CACHE_DIR, 'img', crypto.createHash('sha1').update(url).digest('hex') + path.extname(new URL(url).pathname).toLowerCase())
  if (!fs.existsSync(raw)) {
    if (OFFLINE) throw new Error(`--offline: image not cached: ${url}`)
    fs.mkdirSync(path.dirname(raw), { recursive: true })
    fs.writeFileSync(raw, Buffer.from(await (await fetchRetry(url)).arrayBuffer()))
  }
  return raw
}
function writePng(raw, out, box) {
  fs.mkdirSync(path.dirname(out), { recursive: true })
  if (!MAGICK) { fs.copyFileSync(raw, out); return }
  // [0]: the first frame of a GIF; trim transparent or plain margins.
  // Scans and JPEGs come on a white sheet: clear white connected to the
  // corners (flood fill, so white inside the emblem stays). Corners that
  // aren't white (transparent, or a coloured full-bleed design) are left alone.
  const [w, h] = execFileSync('identify', ['-format', '%w %h', `${raw}[0]`]).toString().trim().split(' ').map(Number)
  const clear = ['-alpha', 'set', '-fuzz', '6%', '-fill', 'none', ...[[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].flatMap(([x, y]) => ['-floodfill', `+${x}+${y}`, 'white'])]
  execFileSync('convert', [`${raw}[0]`, ...clear, '-background', 'none', '-trim', '+repage', '-resize', `${box}x${box}>`, '-strip', `PNG32:${out}`])
  if (PNGQUANT) {
    try { execFileSync('pngquant', ['--quality=50-85', '--speed', '1', '--strip', '--force', '--output', out, out], { stdio: 'ignore' }) } catch { /* 99: quality not reached, keep the full-colour file */ }
  }
}
const sizeOf = file => execFileSync('identify', ['-format', '%w %h', file]).toString().trim().split(' ').map(Number)
/** Pale and colourless (Afghanistan's white emblem): it fades into the
 *  parchment, so the Codex puts a slate backing behind it. Mean brightness
 *  and saturation of the visible pixels (transparent ones count as black,
 *  so each mean is divided by the coverage). */
function isLight(file) {
  if (!MAGICK) return false
  const num = args => Number(execFileSync('convert', [file, '-background', 'black', '-alpha', 'remove', ...args, '-format', '%[fx:mean]', 'info:']).toString())
  const cover = Number(execFileSync('convert', [file, '-alpha', 'extract', '-format', '%[fx:mean]', 'info:']).toString())
  if (cover < 0.02) return false
  const lum = num(['-colorspace', 'Gray']) / cover
  const sat = num(['-colorspace', 'HSL', '-channel', 'G', '-separate', '+channel']) / cover
  return lum > 0.65 && sat < 0.12
}

// ── Put it together ──────────────────────────────────────────────────────────
const formers = new Map(picks.map(p => [p.f.code, formerArms(p)]))

// ── 4b. Countries the English article leaves bare: other Wikipedias (the
// country's own language first, then German, French, Spanish, Russian) and
// Commons' "Historical coats of arms of …" categories. Their captions can't
// name anything, so only images whose (English) file title names this country
// with an arms word count, with the same year rules: the caption's years, or
// the file title's when the caption, Wikidata or the English article agrees.
const OWN_LANG = {
  AE: 'ar', AR: 'es', BD: 'bn', BE: 'nl', BT: 'dz', CH: 'de', CU: 'es', DJ: 'fr', DK: 'da', EC: 'es', EE: 'et', FR: 'fr', GA: 'fr',
  HN: 'es', ID: 'id', IL: 'he', IR: 'fa', JO: 'ar', JP: 'ja', LI: 'de', LK: 'si', LU: 'lb', MA: 'ar', MC: 'fr', MK: 'mk', MN: 'mn',
  MV: 'dv', NE: 'fr', NL: 'nl', NO: 'nb', PK: 'ur', PS: 'ar', SE: 'sv', SK: 'sk', SM: 'it', SO: 'so', SR: 'nl', ST: 'pt', TD: 'fr',
  TG: 'fr', TH: 'th', TZ: 'sw', UA: 'uk', UZ: 'uz', VA: 'it', XK: 'sq',
}
const OTHER_LANGS = ['de', 'fr', 'es', 'ru']
const bare = picks.filter(p => !formers.get(p.f.code).former.length && p.w?.arms?.qid)
if (bare.length) {
  const langs = [...new Set([...OTHER_LANGS, ...bare.map(p => OWN_LANG[p.f.code]).filter(Boolean)])]
  const links = await sparql(`SELECT ?arms ?lang ?title WHERE {
    VALUES ?arms { ${bare.map(p => `wd:${p.w.arms.qid}`).join(' ')} }
    ?art schema:about ?arms; schema:inLanguage ?lang; schema:name ?title; schema:isPartOf ?wiki .
    FILTER(STRENDS(STR(?wiki), ".wikipedia.org/")) FILTER(?lang IN (${langs.map(l => `"${l}"`).join(', ')})) }`)
  const byLang = {}
  for (const r of links) (byLang[r.lang.value] ??= []).push({ qid: qid(r.arms.value), title: r.title.value })
  const texts = {}
  for (const [lang, list] of Object.entries(byLang)) {
    const got = await wikitexts(list.map(x => x.title), `${lang === 'nb' ? 'no' : lang}.wikipedia.org`)
    for (const x of list) if (got[x.title]) (texts[x.qid] ??= {})[lang] = got[x.title].text
  }
  for (const p of bare) {
    const extra = []
    const order = [OWN_LANG[p.f.code], ...OTHER_LANGS].filter((l, i, a) => l && a.indexOf(l) === i)
    for (const lang of order) {
      const text = texts[p.w.arms.qid]?.[lang]
      if (text) for (const c of articleImages(text)) extra.push({ ...c, from: `${lang}.wikipedia`, foreign: true })
    }
    // Commons: "Historical coats of arms of X" and "… national coats of arms of X".
    for (const cat of [`Historical coats of arms of ${p.f.name}`, `Historical national coats of arms of ${p.f.name}`]) {
      const d = await api('commons.wikimedia.org', { action: 'query', list: 'categorymembers', cmtitle: `Category:${cat}`, cmtype: 'file', cmlimit: '200' })
      for (const m of d.query?.categorymembers ?? []) extra.push({ file: normFile(m.title), caption: '', from: 'commons', foreign: true, section: `Commons: ${cat}` })
    }
    if (!extra.length) continue
    const again = formerArms(p, extra)
    if (again.former.length) {
      formers.set(p.f.code, again)
      notes.push(`${p.f.code}: ${again.former.length} former from ${[...new Set(again.former.map(x => x.via.split(',')[0]))].join(', ')}`)
    }
  }
}
const info = await commonsInfo([...picks.map(p => p.file), ...[...formers.values()].flatMap(x => x.former.map(y => y.file))])
const entries = []
const left = [] // former files left out for their licence
const licences = {}
for (const p of picks) {
  let ii = info[p.file]
  let lic = licenceOf(ii)
  // The infobox file may be a local, non-free upload: fall back to Wikidata's.
  const alt = !lic.ok && p.w?.files.length === 1 && p.w.files[0].file !== p.file ? p.w.files[0].file : null
  if (alt) {
    const altInfo = (await commonsInfo([alt]))[alt]
    if (licenceOf(altInfo).ok) {
      notes.push(`${p.f.code}: infobox file ${p.file} is ${lic.why}; using Wikidata's ${alt}`)
      p.file = alt; p.source = 'Wikidata (the infobox file isn\'t on Commons)'; ii = altInfo; lic = licenceOf(ii)
    }
  }
  if (!lic.ok) { skipped.push({ code: p.f.code, reason: `The image (${p.file}) is ${lic.why}.` }); continue }
  const code = p.f.code.toLowerCase()
  const raw = await download(ii)
  writePng(raw, path.join(PUB, `${code}.png`), SIZES.detail)
  writePng(raw, path.join(PUB, 'thumb', `${code}.png`), SIZES.thumb)
  const [w, h] = MAGICK ? sizeOf(path.join(PUB, `${code}.png`)) : [ii.thumbwidth, ii.thumbheight]
  licences[lic.licence] = (licences[lic.licence] ?? 0) + 1
  const page = armsPages[p.article]
  const name = page?.title ?? `${termOf(p.type)} of ${articleOf(p.f).replace(/^The /, 'the ')}`
  const intro = p.article && armsIntros[p.article]
  const { former: candidates, cut, adoptedHint } = formers.get(p.f.code)
  let adopted = adoptedYear(p, adoptedHint, intro)
  const former = []
  for (const x of candidates) {
    const fi = info[x.file]
    const fl = licenceOf(fi)
    if (!fl.ok) { left.push(`${p.f.code} ${x.file}: ${fl.why}`); continue }
    const n = former.length + 1
    writePng(await download(fi), path.join(PUB, `${code}-${n}.png`), SIZES.former)
    licences[fl.licence] = (licences[fl.licence] ?? 0) + 1
    const out = path.join(PUB, `${code}-${n}.png`)
    former.push({ name: x.name, ...(x.from !== undefined ? { from: x.from, to: x.to } : {}), src: `/arms/${code}-${n}.png`, ...(isLight(out) ? { light: true } : {}), commons: commonsPage(fi), author: authorOf(fi), licence: fl.licence, ...(fl.url ? { licenceUrl: fl.url } : {}), _via: x.via })
  }
  if (cut) notes.push(`${p.f.code}: ${cut} older former arms wait for a later pass`)
  // A former version newer than the adoption year means that year is the
  // design's origin, not this version's (Costa Rica: 1848, last changed 1998).
  if (adopted && former.some(x => x.from > adopted.year)) {
    notes.push(`${p.f.code}: adopted ${adopted.year} (${adopted.from}) predates a former version; left out`)
    adopted = undefined
  }
  entries.push({
    code: p.f.code, name, kind: kindOf(name),
    src: `/arms/${code}.png`, thumb: `/arms/thumb/${code}.png`, ratio: Math.round((w / h) * 1000) / 1000,
    ...(isLight(path.join(PUB, `${code}.png`)) ? { light: true } : {}),
    ...(adopted ? { adopted: adopted.year } : {}),
    ...(p.note ? { note: p.note } : {}),
    ...(shortDescription(intro) ? { description: shortDescription(intro) } : {}),
    ...(page ? { article: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}` } : {}),
    commons: commonsPage(ii), author: authorOf(ii), licence: lic.licence, ...(lic.url ? { licenceUrl: lic.url } : {}),
    source: p.source,
    former,
    _adoptedFrom: adopted?.from,
  })
}
// Former files on disk that this run didn't write (a country lost one).
const keep = new Set(entries.flatMap(e => [e.src, e.thumb, ...e.former.map(x => x.src)]).map(s => path.join(ROOT, 'public', s)))
for (const f of fs.readdirSync(PUB, { recursive: true })) {
  const full = path.join(PUB, f)
  if (fs.statSync(full).isFile() && !keep.has(full)) fs.rmSync(full)
}

// ── Write ────────────────────────────────────────────────────────────────────
entries.sort((a, b) => a.code.localeCompare(b.code))
skipped.sort((a, b) => a.code.localeCompare(b.code))
const clean = e => { const { _adoptedFrom, ...rest } = e; return { ...rest, former: rest.former.map(({ _via, ...x }) => x) } }
const ts = `// Generated by scripts/arms/fetch.mjs from Wikidata, English Wikipedia and
// Wikimedia Commons: don't edit by hand, change the script and run it again.
// The images live in public/arms/ (see the script's header for sizes).
// The Codex loads this file only when its "Coats of arms" section opens.

export interface ArmsCredit {
  /** The file's page on Wikimedia Commons (source, author, licence). */
  commons: string
  author: string
  /** "Public domain", "CC BY-SA 4.0"… */
  licence: string
  licenceUrl?: string
}
export interface FormerArms extends ArmsCredit {
  name: string
  /** Missing when no source dates it: the file names the country, nothing more. */
  from?: number
  to?: number
  src: string
  /** Mostly white or pale: shown on a darker backing. */
  light?: boolean
}
export interface CountryArms extends ArmsCredit {
  /** The country's code in src/data/flags.ts. */
  code: string
  /** The emblem's own name: "Coat of arms of Albania", "Imperial crest of Japan". */
  name: string
  kind: 'arms' | 'emblem' | 'seal' | 'crest'
  /** 320px image for the detail and 120px for the list row. */
  src: string
  thumb: string
  /** Width / height of the image. */
  ratio: number
  /** Mostly white or pale (Afghanistan): shown on a darker backing. */
  light?: boolean
  adopted?: number
  /** Said when the country has no coat of arms as such. */
  note?: string
  /** The first sentences of the emblem's Wikipedia article. */
  description?: string
  /** That article. */
  article?: string
  /** How the image was chosen: "Wikipedia and Wikidata agree", "Wikipedia infobox"… */
  source: string
  /** Newest first, undated ones last. Empty: not gathered yet ("coming soon"). */
  former: FormerArms[]
}

/** The countries covered so far, by English name. */
export const ARMS_SCOPE = ${JSON.stringify(SCOPE_LABEL)}
export const ARMS_SCOPE_RE = ${SCOPE}

export const COATS_OF_ARMS: CountryArms[] = ${JSON.stringify(entries.map(clean), null, 2)}

/** Countries in scope left out, and why. */
export const ARMS_SKIPPED: { code: string; reason: string }[] = ${JSON.stringify(skipped, null, 2)}
`
fs.writeFileSync(OUT, ts)

// ── Report ───────────────────────────────────────────────────────────────────
const bytes = [...keep].reduce((n, f) => n + fs.statSync(f).size, 0)
console.log(`${entries.length} countries with arms, ${skipped.length} skipped, ${entries.filter(e => e.former.length).length} with former arms (${entries.reduce((n, e) => n + e.former.length, 0)} images)`)
console.log(`public/arms: ${keep.size} files, ${(bytes / 1024 / 1024).toFixed(2)} MB`)
console.log('Licences:', Object.entries(licences).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join(', '))
for (const s of skipped) console.log(`skipped ${s.code}: ${s.reason}`)
for (const n of notes) console.log(`note ${n}`)
for (const l of left) console.log(`left out (licence) ${l}`)
if (process.argv.includes('--why')) {
  for (const [code, f] of formers) for (const d of f.decisions) console.log(`why ${code} ${d}`)
}
if (process.argv.includes('--dump')) {
  for (const e of entries) {
    console.log(`${e.code} ${e.name} [${e.kind}] adopted ${e.adopted ?? '–'} (${e._adoptedFrom ?? ''}) · ${e.licence} · ${e.author}`)
    console.log(`   ${e.description ?? '(no description)'}`)
    for (const x of e.former) console.log(`   ${x.from ?? '?'}–${x.to ?? '?'} ${x.name} · ${x.licence} · ${x.author}${x.light ? ' · light' : ''} · ${x._via}`)
  }
}
