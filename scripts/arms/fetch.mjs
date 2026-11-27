// Builds src/data/coatsOfArms.ts and public/arms/: each country's current coat
// of arms (or emblem, or seal) and, where Wikipedia lists them plainly, its
// former ones, for the Codex's "Coats of arms" section (beta).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/arms/fetch.mjs
//   (add --offline to rebuild from the last download without asking Wikimedia;
//    the answers are cached in node_modules/.cache/arms/)
//
// Scope for now: the countries in src/data/flags.ts whose English name starts
// with A–M (SCOPE below). Widen SCOPE (and SCOPE_LABEL) to add the rest.
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
// 4. Former arms: <gallery> entries in that article whose caption carries a
//    year range ("1928–1939", "from 1890 to 1929") and names this country (or
//    one of its former names) or nothing else, and not a flag, coin, seal of
//    a king, city, colony of another country… (see formerArms). Nothing is
//    guessed: a country without such a list shows "coming soon".
// 5. Wikimedia Commons: each file's page, author and licence (extmetadata).
//    Files that aren't on Commons or aren't public domain / Creative Commons
//    are left out and printed. Thumbnails come from Commons, are trimmed and
//    shrunk with ImageMagick and squeezed with pngquant when installed:
//      public/arms/<code>.png        current, fits 320×320 (the detail)
//      public/arms/thumb/<code>.png  current, fits 120×120 (the list row)
//      public/arms/<code>-<n>.png    former, fits 240×240
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
const SCOPE = /^[A-M]/i
const SCOPE_LABEL = 'A–M'
/** Former arms per country, newest first; older ones wait for a later pass. */
const MAX_FORMER = 12
const SIZES = { detail: 320, thumb: 120, former: 240 }

// Wikidata items that share a country's ISO code but aren't the state.
const NOT_THE_STATE = new Set(['Q644636' /* Cyprus, the island */])
// Checked by hand (2026-11): countries whose English Wikipedia infobox shows
// no coat of arms.
const CURRENT = {
  // Official arms; the infobox leaves them out by editors' choice (its FAQ).
  CA: { file: 'Royal Coat of arms of Canada.svg', why: 'English Wikipedia\'s infobox leaves the arms out by editors\' choice; the file is Wikidata\'s (P94)' },
  // No official arms or emblem: the infobox shows the Great Seal instead.
  FR: { file: 'Great Seal of France.svg', article: 'Great Seal of France', note: 'France has no official coat of arms or emblem. Wikipedia shows its Great Seal instead.' },
}
const SKIP = {
  LB: 'Lebanon\'s coat of arms is unofficial, and Wikipedia\'s infobox shows none.',
  LY: 'Libya has had no national emblem since 2011, and Wikipedia\'s infobox shows none.',
}
// Former names a gallery caption may use for the country.
const ALIASES = {
  BY: ['Byelorussian', 'Belarusian'], BJ: ['Dahomey'], BF: ['Upper Volta'], BW: ['Bechuanaland'], BZ: ['British Honduras'],
  CD: ['Democratic Republic of the Congo', 'Democratic Republic of Congo', 'Zaire', 'Congo'], CI: ['Ivory Coast', 'Côte d\'Ivoire'], CZ: ['Czech', 'Czechoslovakia', 'Bohemia and Moravia'],
  ET: ['Ethiopian', 'Abyssinia'], GH: ['Gold Coast'], GY: ['British Guiana'], IR: ['Persia', 'Iranian'], KH: ['Khmer', 'Kampuchea'],
  KZ: ['Kazakh'], KG: ['Kirghiz', 'Kyrgyz'], LS: ['Basutoland'], MD: ['Moldavian', 'Moldavia'], MM: ['Burma'], MW: ['Nyasaland'],
  MV: ['Maldivian'], LA: ['Lao'], DJ: ['French Somaliland', 'Afars and Issas'], KI: ['Gilbert and Ellice'], AZ: ['Azerbaijani'],
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
])

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
const normFile = f => f.replace(/^(File|Image):/i, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim().replace(/^./, c => c.toUpperCase())

/** Follows the API's normalized/redirects lists from an asked title. */
const resolver = q => t => {
  for (const n of q.normalized ?? []) if (n.from === t) t = n.to
  for (const r of q.redirects ?? []) if (r.from === t) t = r.to
  return t
}
/** Every page's wikitext for these titles (redirects followed), by asked title. */
async function wikitexts(titles) {
  const out = {}
  for (const group of chunks([...new Set(titles)], 10)) {
    const d = await wiki({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', redirects: '1', titles: group.join('|') })
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
const kindOf = name => (/seal/i.test(name) ? 'seal' : /crest/i.test(name) ? 'crest' : /emblem/i.test(name) ? 'emblem' : 'arms')
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
const RANGE = new RegExp(`(?:\\b(?:from|between|in|during)\\s+)?(?:c\\.\\s*)?${DAY}(1[0-9]{3}|20[0-9]{2})\\s*(?:–|—|-|−|\\bto\\b|\\buntil\\b|\\band\\b)\\s*${DAY}(1[0-9]{3}|20[0-9]{2}|\\d{2}\\b|present|now|today)?`, 'i')
function yearRange(caption) {
  const m = caption.match(RANGE)
  if (!m) return null
  const from = Number(m[1])
  const raw = m[2]
  if (!raw) return null // "1875 –": open-ended, unclear
  if (/present|now|today/i.test(raw)) return { from, to: null, text: m[0] }
  let to = Number(raw)
  if (raw.length === 2) to = Math.floor(from / 100) * 100 + to + (to < from % 100 ? 100 : 0)
  return to >= from ? { from, to, text: m[0] } : null
}

const OTHER_STATES = /Northern Cyprus|Turkish Federated State|Great Britain|England|Ottoman|Holy Roman|Austria-Hungary|Russian Empire|Soviet Union|USSR|Khedive|Khedivate|Venice|Lusignan|Mamluk|United Arab Republic|Yugoslavia|Transleithania|Hungarian Crown|Order of Malta|Hospitaller|Aragon|Habsburg|Burgund|Prussia|Brandenburg|Bavaria|Saxony|Napoleon|Spanish Empire|British West Africa|Central America|New Granada|Leeward Islands|East Africa|Central Africa|Ruanda-Urundi|Anglo-Egyptian|Bessarabia|Taiping|Manchukuo|Azad Hind|Tripolitania|Cyrenaica|Sweden|Swedish|Suède|Danish|Dano-Norwegian|Dutch|Netherlands|Holland/
const NOT_ARMS = /\b(flags?|banners?|standards?|coins?|passports?|stamps?|currency|banknotes?|maps?|photos?|photograph|masthead|gazette|proposals?|proposed|rejected|design for|reconstruction|king|queen|emperor|empress|sultan|emir of|shah|cardinal|count|countess|duke|duchess|prince|princess|bishop|ecclesiastic\w*|reign|reigned|house of|dynasty|city|cities|town|municipal\w*|council|company|occupation|occupied|presiden\w*|personal|monogram|governor|governorate|oblast|province of|air force|army|navy|police|roundel|rival|exile|unilateral\w*|royal|helmet|crown of|regalia|banner of|order of|medal|uniform|building|gate|statue|carving|relief)\b/i
// A person with a regnal number: "Henry VI", "Christian IV".
const REGNAL = /\b[A-Z][a-z]+ (?:[IVX]+)\b/
const GENERIC_WORDS = /\b(the|a|an|of|from|to|in|and|with|used|use|version|versions|official|greater|lesser|middle|small|large|national|state|coat|coats|arms|armorial|achievement|emblem|emblems|seal|seals|badge|crest|design|first|second|third|old|older|former|historical|historic|until|since|ca|c|between|during|modification|modified|variant|colou?r|colou?red|full|simplified|this)\b/gi

function formerArms(p) {
  const page = armsPages[p.article]
  if (!page) return { former: [], adoptedHint: undefined }
  const names = [p.f.name, ...(ALIASES[p.f.code] ?? [])]
  const mentions = (s, n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w)`, 'i').test(s)
  const isThis = s => names.some(n => mentions(s, n))
  // Another country in the Codex, unless it's part of this one's names
  // ("Guinea" in "Guinea-Bissau") or a name of its own ("United States of Brazil").
  const others = FLAGS.filter(o => o.code !== p.f.code && !names.some(n => n.toLowerCase().includes(o.name.toLowerCase())))
  const isOther = s => OTHER_STATES.test(s) || others.some(o => new RegExp(`\\b${o.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(?!\\s+of\\b)`).test(s))
  const text = stripComments(page.text)
  const out = []
  let adoptedHint
  for (const g of text.matchAll(/<gallery[^>]*>([\s\S]*?)<\/gallery>/gi)) {
    for (const line of g[1].split('\n').map(l => l.trim()).filter(Boolean)) {
      const parts = line.split('|')
      const file = normFile(parts[0])
      if (!/\.(svg|png|jpe?g|gif|tiff?)$/i.test(file)) continue
      const caption = plain(parts.slice(1).filter(x => !/^\s*(alt|link|page|class|lang|upright|thumbtime)\s*=/.test(x)).join('|'))
      const range = yearRange(caption)
      if (!range) continue
      if (range.to === null) { if (file === p.file) adoptedHint = range.from; continue }
      if (file === p.file || FORMER_DROP.has(file)) continue
      // A caption with two periods ("… (1806–1820) and … (1820–1849)") covers both.
      const second = yearRange(caption.slice(caption.indexOf(range.text) + range.text.length))
      if (second?.to) range.to = Math.max(range.to, second.to)
      // The name: the caption without its dates, cut at the first full stop.
      const full = caption.replace(/\s*\([^()]*\b\d{4}\b[^()]*\)/g, ' ').replace(range.text, ' ')
        .replace(/\b(from|in|between|during|used during|used)\s*$/i, '').replace(/[\s,;:–—-]+$/, '').replace(/^[\s,;:–—-]+/, '')
        .split(/\.\s/)[0].replace(/\.$/, '').replace(/\s+/g, ' ').trim()
      let name = full.replace(/\s*\([^()]*\)/g, '').trim()
      if (second) name = name.split(/ and |, /)[0].trim()
      // The file's own title often says whose arms they are: "Coat of arms of Bulgaria (1948-1968).svg".
      const fromFile = file.replace(/\.[a-z]+$/i, '').replace(/\s*\([^()]*\)/g, '').trim()
      const fileTerm = fromFile.match(/^((?:greater|lesser|middle|small|national|state)\s+)?(coat of arms|emblem|seal|arms|badge)\b/i)?.[0]
      const generic = !name.replace(GENERIC_WORDS, '').replace(/[^\p{L}]+/gu, '')
      if (generic) {
        // "1919–1920 coat of arms": only when the file says whose.
        if (!fileTerm || !isThis(fromFile)) continue
        name = /\d|\b[A-Z]{4,}\b/.test(fromFile) ? page.title : fromFile
      } else if (!/\b(arms|emblem|seal|badge|crest|insignia|escutcheon)\b/i.test(name)) {
        // "Kingdom of Croatia" → "Coat of arms of the Kingdom of Croatia".
        const term = fileTerm ?? { arms: 'Coat of arms', emblem: 'Emblem', seal: 'Seal', crest: 'Crest' }[kindOf(page.title)]
        const the = /^(Kingdom|Republic|Democratic|People's|Islamic|Federal|Federative|Socialist|State|Free State|Colony|Empire|Union|Independent|Provisional|Transitional|Emirate|United|First|Second|Third|Banovina|Principality|Grand Duchy|Duchy)\b/.test(name) ? 'the ' : ''
        name = `${term.replace(/^./, c => c.toUpperCase())} of ${the}${name}`
      }
      if (name.length > 72) continue // a sentence, not a name: not straightforward
      const fileWords = fromFile.replace(/[_-]/g, ' ')
      if (NOT_ARMS.test(full) || NOT_ARMS.test(fileWords) || REGNAL.test(full) || REGNAL.test(fileWords)) continue
      if (!generic && !isThis(name)) continue
      if (isOther(name) || isOther(file)) continue
      name = name.replace(/^the\s+/i, '').replace(/^./, c => c.toUpperCase()).replace(/\bCoat of Arms\b/g, 'Coat of arms')
      if (out.some(x => x.file === file || (x.from === range.from && x.to === range.to))) continue
      out.push({ file, name, from: range.from, to: range.to, caption })
    }
  }
  out.sort((a, b) => b.from - a.from || b.to - a.to)
  return { former: out.slice(0, MAX_FORMER), cut: Math.max(0, out.length - MAX_FORMER), adoptedHint }
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
  const sentence = intro?.split(/(?<=\.)\s+/).map(s => s.replace(/\([^()]*\)/g, '')).find(s => /\b(current|present)\b/i.test(s) && YEAR_RE.test(s))
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
  const a = htmlText(meta(ii, 'Artist'))
    .replace(/^(Original|Author|Image|Autor of SVG image|Original Author):\s*/i, '')
    .replace(/^(File:)?[^:]+\.(svg|png|jpe?g)\s*:\s*/i, '') // "File:X.svg : Someone"
    .replace(/\s*dyskusja\s+Mail\b.*$/i, '').replace(/\s*\d{1,2}:\d{2}, \d{1,2} \w+ \d{4} \(UTC\)/g, '')
    .replace(/\b(Unknown author)(\s+\1)+/gi, '$1').replace(/\s+([,.;])/g, '$1').trim()
  // Commons' boilerplate when the author is in the file history, or unknown.
  if (!a || /see file history|this vector image includes|^unknown( author)?$/i.test(a)) return ''
  return a.length > 70 ? a.slice(0, 68).replace(/[\s,;:(]+\S*$/, '') + '…' : a
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
  execFileSync('convert', [`${raw}[0]`, '-background', 'none', '-trim', '+repage', '-resize', `${box}x${box}>`, '-strip', `PNG32:${out}`])
  if (PNGQUANT) {
    try { execFileSync('pngquant', ['--quality=50-85', '--speed', '1', '--strip', '--force', '--output', out, out], { stdio: 'ignore' }) } catch { /* 99: quality not reached, keep the full-colour file */ }
  }
}
const sizeOf = file => execFileSync('identify', ['-format', '%w %h', file]).toString().trim().split(' ').map(Number)

// ── Put it together ──────────────────────────────────────────────────────────
const formers = new Map(picks.map(p => [p.f.code, formerArms(p)]))
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
    former.push({ name: x.name, from: x.from, to: x.to, src: `/arms/${code}-${n}.png`, commons: commonsPage(fi), author: authorOf(fi), licence: fl.licence, ...(fl.url ? { licenceUrl: fl.url } : {}) })
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
const clean = e => { const { _adoptedFrom, ...rest } = e; return rest }
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
  from: number
  to: number
  src: string
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
  adopted?: number
  /** Said when the country has no coat of arms as such. */
  note?: string
  /** The first sentences of the emblem's Wikipedia article. */
  description?: string
  /** That article. */
  article?: string
  /** How the image was chosen: "Wikipedia and Wikidata agree", "Wikipedia infobox"… */
  source: string
  /** Newest first. Empty: not gathered yet ("coming soon"). */
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
if (process.argv.includes('--dump')) {
  for (const e of entries) {
    console.log(`${e.code} ${e.name} [${e.kind}] adopted ${e.adopted ?? '–'} (${e._adoptedFrom ?? ''}) · ${e.licence} · ${e.author}`)
    console.log(`   ${e.description ?? '(no description)'}`)
    for (const x of e.former) console.log(`   ${x.from}–${x.to} ${x.name} · ${x.licence}`)
  }
}
