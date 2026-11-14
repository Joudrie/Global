// Builds src/data/citiesAbroad.ts: world cities an English speaker knows, as
// other languages write them, from Wikidata.
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/cities-abroad/fetch.mjs
//   (add --offline to rebuild from the last download without asking Wikidata,
//    --dump to print every name with its tier and value)
//
// 1. Cities: every country's capital in src/data/capitals.ts (Wikidata P36),
//    plus every town or city with 40,000 people or more whose Wikidata item
//    has at least MIN_LINKS sitelinks (Wikipedia articles in that many
//    languages): the fame signal that keeps the answers to cities players
//    know. ALLOW_CITY adds famous smaller ones (Bruges, Lucerne), and no
//    country has more than MAX_PER_COUNTRY. Countries with a split or disputed capital (Connections'
//    NO_CAPITAL_TILE) keep their cities, but none of them is called the
//    capital. SKIP_CITY drops the ones that are famous on paper only.
// 2. Names: each city's label (rdfs:label) in the languages below.
// 3. Drops every name a player could answer by copying it: spelled the same
//    or nearly the same as the English name or an accepted alternative
//    (looksLikeAnswer in src/utils/citiesAbroad.ts, on the Latin spelling for
//    other scripts), containing one as a word ("Ciudad de México"), or another
//    place's English name (Turkish "Cuba" is Juba).
// 4. Keeps a label only if it agrees with that language's Wikipedia article
//    title (or is listed in CONFIRMED after a check by hand). Small wikis that
//    copy the English label are caught by step 3.
// 5. Groups languages that write a city the same way ("Londres": Spanish,
//    French, Portuguese…), and gives each name a tier, a value (10, 20, 30)
//    and a difficulty rank from how far it is from the English, how familiar
//    the language is and how well known the city is. TIER_OVERRIDES and
//    VALUE_OVERRIDES fix the ones that read wrong by eye.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROMANISERS, isKatakana } from './romanise.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const src = f => import(path.join(ROOT, 'src', f))
const { CAPITALS } = await src('data/capitals.ts')
const { FLAGS } = await src('data/flags.ts')
const { NO_CAPITAL_TILE, capitalName } = await src('utils/connectionsTiles.ts')
const { foldName, soundFold, coreOf, nameWords, contentWords, acceptedAnswers, looksLikeAnswer, nearlySame, editDistance, slugOf, CITY_ALIASES } = await src('utils/citiesAbroad.ts')

const OUT = path.join(ROOT, 'src/data/citiesAbroad.ts')
const CACHE = path.join(ROOT, 'node_modules/.cache/cities-abroad.json')
const UA = 'GlobalioBuild/1.0 (https://globalio.app)'
const OFFLINE = process.argv.includes('--offline')
const DUMP = process.argv.includes('--dump')

// Latin-script languages, most familiar to an English speaker first. `fam`
// (0–1) feeds the tier and the value.
const LATIN = [
  ['es', 'Spanish', 1], ['fr', 'French', 1], ['de', 'German', 1], ['it', 'Italian', 1], ['pt', 'Portuguese', 0.9],
  ['nl', 'Dutch', 0.8], ['ca', 'Catalan', 0.7], ['gl', 'Galician', 0.65], ['sv', 'Swedish', 0.7], ['da', 'Danish', 0.7],
  ['nb', 'Norwegian', 0.7], ['nn', 'Norwegian Nynorsk', 0.6], ['lb', 'Luxembourgish', 0.6], ['af', 'Afrikaans', 0.6],
  ['ro', 'Romanian', 0.6], ['pl', 'Polish', 0.55], ['tr', 'Turkish', 0.55], ['cs', 'Czech', 0.5], ['sk', 'Slovak', 0.5],
  ['hr', 'Croatian', 0.5], ['bs', 'Bosnian', 0.45], ['sl', 'Slovenian', 0.45], ['hu', 'Hungarian', 0.45], ['fi', 'Finnish', 0.45],
  ['id', 'Indonesian', 0.5], ['ms', 'Malay', 0.45], ['tl', 'Tagalog', 0.4], ['mt', 'Maltese', 0.45], ['sq', 'Albanian', 0.4],
  ['et', 'Estonian', 0.4], ['lv', 'Latvian', 0.4], ['lt', 'Lithuanian', 0.4], ['is', 'Icelandic', 0.4], ['fo', 'Faroese', 0.35],
  ['ga', 'Irish', 0.4], ['cy', 'Welsh', 0.4], ['gd', 'Scottish Gaelic', 0.35], ['br', 'Breton', 0.35], ['eu', 'Basque', 0.35],
  ['az', 'Azerbaijani', 0.35], ['uz', 'Uzbek', 0.35], ['vi', 'Vietnamese', 0.35], ['sw', 'Swahili', 0.4],
  ['xh', 'Xhosa', 0.3], ['zu', 'Zulu', 0.3], ['mi', 'Māori', 0.3],
]
// Other scripts, each with a rule-based Latin spelling (romanise.mjs).
const NON_LATIN = [
  ['ru', 'Russian'], ['uk', 'Ukrainian'], ['be', 'Belarusian'], ['bg', 'Bulgarian'], ['sr', 'Serbian'], ['mk', 'Macedonian'],
  ['el', 'Greek'], ['ka', 'Georgian'], ['hy', 'Armenian'], ['ko', 'Korean'], ['ja', 'Japanese'],
]
const LANG_NAME = Object.fromEntries([...LATIN, ...NON_LATIN].map(([c, n]) => [c, n]))
const FAM = Object.fromEntries(LATIN.map(([c, , f]) => [c, f]))
const ORDER = [...LATIN, ...NON_LATIN].map(([c]) => c)
const NON_LATIN_FAM = 0.2

// A town or city needs this many sitelinks to count as famous. Capitals always
// count, and so do the well-known smaller cities in ALLOW_CITY. Wikidata is
// asked for everything from CANDIDATE_LINKS up, so these can be tuned offline.
const MIN_LINKS = 132
const CANDIDATE_LINKS = 102
const ALLOW_CITY = new Set(['bruges', 'lucerne', 'cannes', 'versailles', 'liege', 'padua', 'nazareth', 'siena', 'avignon',
  'trier', 'dubrovnik', 'shenzhen', 'aachen', 'heidelberg', 'salzburg', 'cambridge', 'oxford', 'pisa', 'verona', 'toledo', 'mantua'])
// At most this many cities per country besides its capital, the best known
// first: otherwise the United States, Germany and France crowd out the world.
const MAX_PER_COUNTRY = 20
const MIN_PEOPLE = 40000

// Wikidata items to add although the query above misses them (too few people).
const EXTRA_CITIES = {
  Q5776: 'Bethlehem',
}

// Cities left out by hand (by id), with why. Most have more sitelinks than fame
// (bot-made articles in small wikis), so English speakers wouldn't know them.
const SKIP_CITY = {
  'edirne': 'known to English speakers by its old name, Adrianople',
  'veliko-tarnovo': 'more sitelinks than fame', 'dong-hoi': 'more sitelinks than fame', 'roubaix': 'more sitelinks than fame',
  'concepcion': 'more sitelinks than fame', 'durres': 'more sitelinks than fame', 'nha-trang': 'more sitelinks than fame',
  'vung-tau': 'more sitelinks than fame',
  'constantinople': 'an old name; the game uses current names only',
  'babylon': 'an ancient city', 'carthage': 'an ancient city', 'troy': 'an ancient city', 'petra': 'an ancient city',
  'manhattan': 'a borough of New York', 'brooklyn': 'a borough of New York', 'queens': 'a borough of New York', 'the-bronx': 'a borough of New York',
  'osasco': 'more sitelinks than fame', 'podolsk': 'more sitelinks than fame', 'krasnodar': 'more sitelinks than fame',
  'sokhumi': 'capital of a breakaway region', 'tskhinvali': 'capital of a breakaway region', 'khankendi': 'capital of a breakaway region',
  'tiraspol': 'capital of a breakaway region', 'donetsk': 'under occupation', 'luhansk': 'under occupation',
  'sevastopol': 'under occupation', 'simferopol': 'under occupation', 'yalta': 'under occupation',
  'sri-jayawardenepura-kotte': 'little known', 'lugo': 'little known', 'zhengzhou': 'little known', 'chittagong': 'little known',
  'saratov': 'little known', 'dnipro': 'little known', 'kaunas': 'little known', 'katowice': 'little known', 'ahmedabad': 'little known',
  'nizhny-novgorod': 'little known', 'rostov-on-don': 'little known', 'curitiba': 'little known', 'tampere': 'little known',
  'vlore': 'little known', 'mbabane': 'little known', 'ufa': 'little known', 'omsk': 'little known', 'perm': 'little known',
}

// Countries whose own capital is left out (their other cities stay).
const SKIP_CAPITAL = {
  GQ: 'moving its capital from Malabo to Ciudad de la Paz; Wikidata already lists the new one',
  NR: 'no official capital; Yaren is a district that hosts the government',
}

// Cities claimed by two countries: shown with both, and never called a capital.
const DISPUTED = {
  Q1218: { city: 'Jerusalem', country: 'Israel / Palestine', region: 'Middle East' },
}

// Wikidata's country items that have no ISO code of their own.
const COUNTRY_ISO = { Q29999: 'NL', Q55: 'NL', Q756617: 'DK' }
// Cities whose Wikidata country is ambiguous (a historical one without an end date).
const CITY_COUNTRY = { Lahore: 'PK' }

// English names to use instead of Wikidata's label.
const EN_NAME = {
  'New York City': 'New York', 'Freiburg im Breisgau': 'Freiburg', 'Halle (Saale)': 'Halle',
  'Klagenfurt am Wörthersee': 'Klagenfurt', 'Tromsø Municipality': 'Tromsø', 'Acapulco de Juárez': 'Acapulco',
  'Frankfurt am Main': 'Frankfurt', 'Marrakech': 'Marrakesh',
}

// Names to leave out even though Wikidata has them: outdated or mistaken
// labels, or ones that only trip on an apostrophe. `${cityId}:${lang}:${name}`
const EXCLUDE = new Set([
  // "Saint John" and "Saint George" read as other places, not the capitals.
  'saint-johns:es:Saint John', 'saint-johns:pt:São João', 'saint-georges:es:Saint George', 'saint-georges:pt:São Jorge',
  // Breton Wikipedia titles these by their Chechen, Sardinian and Corsican
  // names, which the game would call Breton.
  'grozny:br:Sölƶa-Ġala', 'cagliari:br:Casteddu', 'ajaccio:br:Aiacciu',
])

// Labels that differ from that language's Wikipedia article title but were
// checked by hand and are right: the article is about the municipality
// ("Ville de Bruxelles", "Präfektur Tokio") while the label is the city's name.
// `${cityId}:${lang}:${name}`
const CONFIRMED = new Set([
  'brussels:fr:Bruxelles', 'brussels:de:Brüssel', 'brussels:pt:Bruxelas', 'brussels:ro:Bruxelles', 'brussels:hr:Bruxelles', 'brussels:fi:Bryssel',
  'san-marino:fr:Saint-Marin', 'tokyo:de:Tokio',
])

// Tiers and values set by hand: the brief's own examples, then the ones that
// read wrong by eye after the automatic pass. `${cityId}:${name}`
const TIER_OVERRIDES = {
  'vienna:Wien': 'easy', 'moscow:Moskau': 'easy', 'london:Londres': 'easy',
  'warsaw:Varsovia': 'medium', 'munich:Monaco di Baviera': 'medium', 'venice:Venedig': 'medium', 'milan:Mailand': 'medium',
  'venice:Benetke': 'hard', 'thessaloniki:Selanik': 'hard', 'copenhagen:Kaupmannahöfn': 'hard', 'cape-town:iKapa': 'hard',
  'saint-petersburg:Pietari': 'hard', 'vienna:Bécs': 'hard',
}
const VALUE_OVERRIDES = {
  'vienna:Wien': 10, 'london:Londres': 10, 'moscow:Moskau': 10, 'warsaw:Varsovia': 20, 'thessaloniki:Selanik': 20,
  'copenhagen:Kaupmannahöfn': 30, 'cape-town:iKapa': 30, 'saint-petersburg:Pietari': 30, 'vienna:Bécs': 30,
}

// ── Wikidata ──────────────────────────────────────────────────────────────
async function sparql(query) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ query }),
      signal: AbortSignal.timeout(110_000),
    }).catch(err => ({ ok: false, status: 0, text: async () => String(err), headers: new Headers() }))
    // A query that runs out of time mid-answer comes back cut off: retry it like an error.
    let status = res.status
    if (res.ok) {
      try { return JSON.parse(await res.text()).results.bindings } catch { status = 0 }
    }
    if (attempt >= 5 || ![0, 429, 500, 502, 503, 504].includes(status)) throw new Error(`Wikidata ${status}: ${res.ok ? 'answer cut off' : (await res.text()).slice(0, 300)}`)
    const wait = Number(res.headers.get('retry-after')) || attempt * 15
    console.warn(`Wikidata ${status || 'answer cut off'}, retrying in ${wait}s`)
    await new Promise(r => setTimeout(r, wait * 1000))
  }
}
const qid = uri => uri.replace('http://www.wikidata.org/entity/', '')
const pause = () => new Promise(r => setTimeout(r, 1500)) // be polite between queries
const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n))
const values = qs => `VALUES ?city { ${qs.map(q => `wd:${q}`).join(' ')} }`
const wikiOf = lang => `https://${lang === 'nb' ? 'no' : lang}.wikipedia.org/`

async function download() {
  // Capitals: each country's current capital (P36).
  const capRows = await sparql(`
    SELECT ?iso ?city WHERE {
      VALUES ?iso { ${CAPITALS.map(c => `"${c.code}"`).join(' ')} }
      ?country wdt:P297 ?iso ; p:P36 ?st .
      ?st ps:P36 ?city ; wikibase:rank ?rank .
      FILTER(?rank != wikibase:DeprecatedRank)
      FILTER NOT EXISTS { ?st pq:P582 ?end }
    }`)
  const capitals = capRows.map(r => ({ code: r.iso.value, qid: qid(r.city.value) }))
  // Towns and cities with enough people and enough sitelinks to be a candidate.
  await pause()
  const bigRows = await sparql(`
    SELECT DISTINCT ?city WHERE {
      ?city wdt:P1082 ?pop . FILTER(?pop >= ${MIN_PEOPLE})
      ?city wikibase:sitelinks ?links . FILTER(?links >= ${CANDIDATE_LINKS})
    }`)
  const qids = [...new Set([...capitals.map(c => c.qid), ...bigRows.map(r => qid(r.city.value)), ...Object.keys(EXTRA_CITIES)])]
  // What each one is (P31), its current country (P17), English name and sitelinks.
  const info = []
  for (const part of chunks(qids, 400)) {
    await pause()
    const rows = await sparql(`
      SELECT ?city ?type ?typeLabel ?country ?iso ?en ?mul ?links WHERE {
        ${values(part)}
        ?city wikibase:sitelinks ?links .
        OPTIONAL { ?city wdt:P31 ?type . OPTIONAL { ?type rdfs:label ?typeLabel FILTER(lang(?typeLabel) = "en") } }
        OPTIONAL { ?city p:P17 ?cst . ?cst ps:P17 ?country ; wikibase:rank ?crank . FILTER(?crank != wikibase:DeprecatedRank)
                   FILTER NOT EXISTS { ?cst pq:P582 ?cend } OPTIONAL { ?country wdt:P297 ?iso } }
        OPTIONAL { ?city rdfs:label ?en FILTER(lang(?en) = "en") }
        OPTIONAL { ?city rdfs:label ?mul FILTER(lang(?mul) = "mul") }
      }`)
    info.push(...rows.map(r => ({
      qid: qid(r.city.value), links: +r.links.value, type: r.type && qid(r.type.value), typeLabel: r.typeLabel?.value,
      country: r.country && qid(r.country.value), iso: r.iso?.value, en: r.en?.value, mul: r.mul?.value,
    })))
  }
  // Each city's label in every language, and the Wikipedia article title in each.
  const cityQids = [...new Set(info.filter(i => isSettlement(info, i.qid) || capitals.some(c => c.qid === i.qid)).map(i => i.qid))]
  const labels = [], titles = []
  for (const part of chunks(cityQids, 120)) {
    await pause()
    const lrows = await sparql(`
      SELECT ?city ?label WHERE {
        ${values(part)}
        ?city rdfs:label ?label .
        FILTER(lang(?label) IN (${ORDER.map(l => `"${l}"`).join(', ')}))
      }`)
    labels.push(...lrows.map(r => ({ qid: qid(r.city.value), lang: r.label['xml:lang'], label: r.label.value })))
    await pause()
    const trows = await sparql(`
      SELECT ?city ?wiki ?title WHERE {
        ${values(part)}
        VALUES ?wiki { ${ORDER.map(l => `<${wikiOf(l)}>`).join(' ')} }
        ?article schema:about ?city ; schema:isPartOf ?wiki ; schema:name ?title .
      }`)
    titles.push(...trows.map(r => ({ qid: qid(r.city.value), lang: ORDER.find(l => wikiOf(l) === r.wiki.value), title: r.title.value })))
  }
  return { fetched: new Date().toISOString().slice(0, 10), capitals, info, labels, titles }
}

// A town or city, not a country, region or island: one of its P31 types names
// a kind of settlement, and it isn't a country unless it's a city-state.
const CITY_TYPE = /\b(city|town|capital|commune|comune|municipality|metropolis|megacity|settlement|borough|şəhər|locality|seat|kism|Hanseatic|residenz|Lutherstadt|centre|center|urban)\b/i
const COUNTRY_TYPES = new Set(['Q6256', 'Q3624078', 'Q112099', 'Q7275'])
const CITY_STATE = 'Q133442'
function isSettlement(info, q) {
  const rows = info.filter(i => i.qid === q)
  const types = new Set(rows.map(r => r.type))
  if ([...types].some(t => COUNTRY_TYPES.has(t)) && !types.has(CITY_STATE)) return false
  return rows.some(r => r.typeLabel && CITY_TYPE.test(r.typeLabel))
}

let raw
if (OFFLINE) raw = JSON.parse(fs.readFileSync(CACHE, 'utf8'))
else {
  raw = await download()
  fs.mkdirSync(path.dirname(CACHE), { recursive: true })
  fs.writeFileSync(CACHE, JSON.stringify(raw))
}

// ── Cities ────────────────────────────────────────────────────────────────
const FLAG = new Map(FLAGS.map(f => [f.code, f]))
const infoBy = new Map()
for (const i of raw.info) {
  if (!infoBy.has(i.qid)) infoBy.set(i.qid, { qid: i.qid, links: i.links, en: i.en ?? i.mul, isos: new Set() })
  const e = infoBy.get(i.qid)
  const iso = i.iso ?? COUNTRY_ISO[i.country]
  if (iso) e.isos.add(iso)
}
const capitalOf = new Map() // qid → country code, for capitals that count as capitals
for (const c of CAPITALS) {
  const hits = raw.capitals.filter(x => x.code === c.code)
  const want = foldName(c.capital)
  const hit = hits.find(h => foldName(infoBy.get(h.qid)?.en ?? '') === want) ?? (hits.length === 1 ? hits[0] : null)
  if (hit && !SKIP_CAPITAL[c.code]) capitalOf.set(hit.qid, c.code)
}

const problems = []
const candidates = []
for (const e of infoBy.values()) {
  const capCode = capitalOf.get(e.qid)
  const realCapital = capCode && !NO_CAPITAL_TILE.has(capCode)
  const famous = e.links >= MIN_LINKS || ALLOW_CITY.has(slugOf(EN_NAME[e.en] ?? e.en ?? ''))
  if (!realCapital && !EXTRA_CITIES[e.qid] && (!famous || !isSettlement(raw.info, e.qid))) continue
  const disputed = DISPUTED[e.qid]
  let code = capCode
  if (!code && !disputed) {
    const isos = CITY_COUNTRY[e.en] ? [CITY_COUNTRY[e.en]] : [...e.isos].filter(i => FLAG.has(i))
    if (isos.length !== 1) { if (e.links >= MIN_LINKS + 20) problems.push(`${e.qid} ${e.en}: country ${[...e.isos].join('/') || 'none'}`); continue }
    code = isos[0]
  }
  const isCapital = !!capCode && !NO_CAPITAL_TILE.has(capCode)
  const english = isCapital ? (capitalName(capCode) || CAPITALS.find(c => c.code === capCode).capital) : (EN_NAME[e.en] ?? e.en)
  if (!english) { problems.push(`${e.qid}: no English name`); continue }
  if (SKIP_CITY[slugOf(english)]) continue
  candidates.push({
    qid: e.qid, links: e.links, id: slugOf(english), city: english,
    country: disputed?.country ?? FLAG.get(code).name, code: disputed ? '' : code,
    region: disputed?.region ?? FLAG.get(code).region, capital: isCapital,
  })
}
// One city per English name: the capital, else the one with the most sitelinks
// ("Córdoba" is Spain's, not Argentina's).
candidates.sort((a, b) => (b.capital - a.capital) || b.links - a.links)
const cities = []
const seenName = new Set()
const perCountry = new Map()
for (const c of candidates) {
  const f = foldName(c.city)
  if (seenName.has(f) || cities.some(x => x.id === c.id)) continue
  seenName.add(f)
  if (!c.capital) {
    const k = c.code || c.country
    if ((perCountry.get(k) ?? 0) >= MAX_PER_COUNTRY) continue
    perCountry.set(k, (perCountry.get(k) ?? 0) + 1)
  }
  cities.push(c)
}

// ── Names ─────────────────────────────────────────────────────────────────
const LATIN_RE = /^[\p{Script=Latin}\s\-–'’ʻʼ.,()·]+$/u // · for Catalan l·l
const CYRILLIC = /^[\p{Script=Cyrillic}\s\-–'’ʼ.]+$/u
const SCRIPT_OK = {
  ru: CYRILLIC, uk: CYRILLIC, be: CYRILLIC, bg: CYRILLIC, sr: CYRILLIC, mk: CYRILLIC,
  el: /^[\p{Script=Greek}\s\-–'’.]+$/u, ka: /^[\p{Script=Georgian}\s\-–]+$/u, hy: /^[\p{Script=Armenian}\s\-–]+$/u,
  ko: /^[\p{Script=Hangul}\s\-–·]+$/u, ja: { test: isKatakana },
}
// True when some run of whole words in the name is already a right answer:
// "Kuwait-Stadt" and "Ciudad de México" can be answered by copying a word.
function containsAnswer(name, right) {
  const w = nameWords(name)
  for (let i = 0; i < w.length; i++) for (let j = i + 1; j <= w.length; j++) if (right.has(w.slice(i, j).join(''))) return true
  return false
}
// True when the name holds every word of an answer ("Rostow am Don") or the
// whole answer inside a longer word ("Vatikanstadt", "Ho Chi Minhstad").
function coversAnswer(c, shown) {
  const words = nameWords(shown).map(soundFold)
  for (const a of [c.city, ...(CITY_ALIASES[c.id] ?? [])]) {
    const need = contentWords(a).filter(w => w.length >= 3).map(soundFold)
    if (need.length && need.every(x => words.some(w => nearlySame(w, x)))) return true
    const whole = soundFold(a)
    if (whole.length >= 5 && soundFold(shown).includes(whole)) return true
  }
  return false
}
// Other spellings of a shown name to hold up against the English: without a
// Xhosa or Zulu noun prefix (iKapa → Kapa, eRoma → Roma), without a
// Lithuanian or Latvian ending (Berlynas → Berlyn), and Korean and Japanese
// without the vowels they put between consonants, with r for l
// (Bereullin → bellin, Berurin → bellin).
function variants(lang, shown) {
  const out = [shown]
  const prefix = shown.match(/^[iueao]-?(?=\p{Lu})/iu)
  if ((lang === 'xh' || lang === 'zu') && prefix) out.push(shown.slice(prefix[0].length))
  if (lang === 'lt') out.push(shown.replace(/(ius|ias|as|is|ys|us|a|ė|e|ai|os)$/u, ''))
  if (lang === 'lv') out.push(shown.replace(/(is|us|s|a|e)$/u, ''))
  const plain = shown.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (lang === 'ko') {
    // 시 after a name is "city" (상하이시, Sanghaisi).
    const city = plain.replace(/[\s-]*si$/, '')
    out.push(city, city.replace(/eu(?=[^aeiouy]|$)/g, '').replace(/r/g, 'l'))
  }
  if (lang === 'ja') out.push(plain.replace(/([^aeiouyn'])u(?=[^aeiouy]|$)/g, '$1').replace(/([td])o(?=[^aeiouy]|$)/g, '$1').replace(/r/g, 'l'))
  return out.filter(v => v.length >= 2)
}
// Countries whose own languages aren't written in Latin letters. Their cities'
// Latin-script names are mostly transliterations (Donezk, Sotschi, Jerewan):
// unless the city is among the best known, such a name has to stray further
// from the English to be kept.
const NON_LATIN_COUNTRIES = new Set(['RU', 'UA', 'BY', 'BG', 'RS', 'MK', 'GR', 'CY', 'GE', 'AM', 'KZ', 'KG', 'TJ', 'MN', 'CN', 'TW', 'JP', 'KR', 'KP',
  'TH', 'LA', 'KH', 'MM', 'IN', 'NP', 'BD', 'LK', 'BT', 'PK', 'AF', 'IR', 'IQ', 'SY', 'LB', 'JO', 'IL', 'PS', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM',
  'YE', 'EG', 'LY', 'SD', 'ER', 'ET', 'DZ', 'MA', 'TN', 'MV', ''])
const TRANSLIT_FAME = 0.8      // the best-known fifth of cities are exempt
const TRANSLIT_RATIO = 0.34    // edits per letter at or under which a name is a transliteration
const fameAll = Object.fromEntries([...cities].sort((a, b) => a.links - b.links).map((c, i, all) => [c.id, i / Math.max(1, all.length - 1)]))
function isTransliteration(c, lang, shown) {
  if (FAM[lang] === undefined || !NON_LATIN_COUNTRIES.has(c.code) || fameAll[c.id] >= TRANSLIT_FAME) return false
  const b = soundFold(coreOf(shown))
  return [c.city, ...(CITY_ALIASES[c.id] ?? [])].some(e => {
    const a = soundFold(coreOf(e))
    return editDistance(a, b) / Math.max(a.length, b.length) <= TRANSLIT_RATIO
  })
}
// The Wikipedia title without its disambiguation: "Victoria (Seychelles)" → "Victoria".
const bareTitle = t => t.replace(/\s*\(.*\)\s*$/, '').replace(/,.*$/, '').trim()

// Every English country, capital and city name, to catch a foreign name that
// is another place's English name.
const englishNames = new Map()
const addEnglish = (n, owner) => {
  if (!n) return
  const f = foldName(n)
  if (!englishNames.has(f)) englishNames.set(f, new Set())
  englishNames.get(f).add(owner)
}
for (const c of CAPITALS) { addEnglish(c.capital, c.code); addEnglish(c.country, c.code) }
for (const f of FLAGS) addEnglish(f.name, f.code)
for (const c of cities) addEnglish(c.city, c.id)

const dropped = { close: [], contains: [], translit: [], clash: [], script: [], title: [], manual: 0 }
const byKey = new Map()
const labelsBy = new Map()
for (const l of raw.labels) { if (!labelsBy.has(l.qid)) labelsBy.set(l.qid, []); labelsBy.get(l.qid).push(l) }
const titleBy = new Map(raw.titles.map(t => [`${t.qid}:${t.lang}`, t.title]))
for (const c of cities) {
  const right = acceptedAnswers(c)
  for (const { lang, label } of labelsBy.get(c.qid) ?? []) {
    const title = titleBy.get(`${c.qid}:${lang}`)
    let name = label.trim()
    // Labels follow sentence case ("l'Havana"); a name on its own starts with
    // a capital, as in the article title. Xhosa and Zulu names keep their
    // lower-case prefix (iKapa), as their own articles write them.
    if (name[0] !== name[0].toUpperCase() && !['xh', 'zu'].includes(lang) && title && foldName(bareTitle(title)) === foldName(name)) name = bareTitle(title)
    // Xhosa and Zulu write a place's noun prefix in lower case (iKapa, eGoli);
    // Wikipedia titles can't start lower case, so labels copied from them read "IKapa".
    if (['xh', 'zu'].includes(lang) && /^[IUEAO]-?\p{Lu}/u.test(name)) name = name[0].toLowerCase() + name.slice(1)
    if (EXCLUDE.has(`${c.id}:${lang}:${name}`)) { dropped.manual++; continue }
    let roman
    if (FAM[lang] !== undefined) {
      if (!LATIN_RE.test(name)) { dropped.script.push(`${c.id} ${lang} ${name}`); continue }
    } else {
      if (!SCRIPT_OK[lang].test(name)) { dropped.script.push(`${c.id} ${lang} ${name}`); continue }
      roman = ROMANISERS[lang](name)
    }
    const shown = roman ?? name
    const what = `${c.id} ${lang} ${name}${roman ? ` (${roman})` : ''}`
    // No free rounds: a name (or its Latin spelling) that is, or nearly is, an answer.
    if (variants(lang, shown).some(v => looksLikeAnswer(c, v))) { dropped.close.push(what); continue }
    if (containsAnswer(shown, right) || coversAnswer(c, shown)) { dropped.contains.push(what); continue }
    if (isTransliteration(c, lang, shown)) { dropped.translit.push(what); continue }
    const owners = englishNames.get(foldName(shown))
    if (owners && !owners.has(c.id) && !owners.has(c.code)) { dropped.clash.push(`${c.id} ${lang} ${name}${roman ? ` (${roman})` : ''}`); continue }
    // A second opinion: the label must agree with that language's Wikipedia
    // article title (CONFIRMED lists the few checked by hand that don't).
    if (!CONFIRMED.has(`${c.id}:${lang}:${name}`) && (!title || foldName(bareTitle(title)) !== foldName(name))) {
      dropped.title.push(`${c.id} ${lang} label "${name}" / article "${title ?? '(none)'}"`)
      continue
    }
    const key = `${c.id}\u0000${name}\u0000${roman ?? ''}`
    if (!byKey.has(key)) byKey.set(key, { city: c.id, name, roman, langs: [] })
    byKey.get(key).langs.push(lang)
  }
}
const names = [...byKey.values()]
for (const n of names) {
  n.langs.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
  // Bokmål and Nynorsk spelling it alike is just "Norwegian".
  if (n.langs.includes('nb')) n.langs = n.langs.filter(l => l !== 'nn')
}
const CITY = Object.fromEntries(cities.map(c => [c.id, c]))
const used = cities.filter(c => names.some(n => n.city === c.id))

// ── Tiers, values and ranks ───────────────────────────────────────────────
// Closeness to the English, 0–1, on the sound-alike spelling without articles:
// edit distance, plus credit for a shared start (the first letters are what a
// reader recognises).
function closeness(city, foreign) {
  let best = 0
  for (const e of [city.city, ...(CITY_ALIASES[city.id] ?? [])]) {
    const a = soundFold(coreOf(e)), b = soundFold(coreOf(foreign))
    const lev = 1 - editDistance(a, b) / Math.max(a.length, b.length)
    let p = 0
    while (p < Math.min(a.length, b.length) && a[p] === b[p]) p++
    const prefix = Math.min(1, p / Math.min(4, a.length, b.length))
    best = Math.max(best, 0.7 * lev + 0.3 * prefix)
  }
  return best
}
// The consonants of a name in sound classes, vowels and h dropped: what is left
// when a name is only respelled ("Keyptaun" and "Cape Town" are both KPTN,
// "Wien" and "Vienna" both FN), not renamed ("Höfðaborg" is FTPLK).
function skeleton(s) {
  return soundFold(s)
    .replace(/dzh|dsh|dj|tsh|ch|sh|zh|j/g, 'J').replace(/th/g, 'T').replace(/kh|gh/g, 'K').replace(/ng/g, 'N')
    .replace(/ts|tz|z|s|c/g, 'S').replace(/[bp]/g, 'P').replace(/[fvw]/g, 'F').replace(/[kgq]/g, 'K')
    .replace(/[dt]/g, 'T').replace(/[lr]/g, 'L').replace(/[mn]/g, 'N').replace(/[a-z0-9]/g, '').replace(/(.)\1+/g, '$1')
}
function soundCloseness(city, foreign) {
  let best = 0
  for (const e of [city.city, ...(CITY_ALIASES[city.id] ?? [])]) {
    const a = skeleton(coreOf(e)), b = skeleton(coreOf(foreign))
    best = Math.max(best, 1 - editDistance(a, b) / Math.max(1, a.length, b.length))
  }
  return best
}
// How well known a city is: its rank by sitelinks among the cities used, 0 (least) – 1 (most).
const byLinks = [...used].sort((a, b) => a.links - b.links)
const FAME = Object.fromEntries(byLinks.map((c, i) => [c.id, i / Math.max(1, byLinks.length - 1)]))
for (const n of names) {
  const c = CITY[n.city]
  // How alike it looks and sounds: half the spelling, half the consonants.
  // Each spelling variant counts (a Korean name without its added vowels, a
  // Lithuanian one without its ending); the closest decides.
  n.close = Math.max(...n.langs.flatMap(l => variants(l, n.roman ?? n.name))
    .map(v => 0.5 * closeness(c, v) + 0.5 * soundCloseness(c, v)))
  n.fam = n.roman ? NON_LATIN_FAM : Math.max(...n.langs.map(l => FAM[l]))
  n.fame = FAME[c.id]
  // Difficulty: mostly how far the name strays, then the language, then the city.
  n.diff = 0.55 * (1 - n.close) + 0.25 * (1 - n.fam) + 0.2 * (1 - n.fame)
  // How interesting the name is: far from the English, in an unexpected language.
  n.interest = 0.75 * (1 - n.close) + 0.25 * (1 - n.fam)
}
// Easy: close to the English, in a language English speakers meet often, for
// a city most people know (Moskau, Londres). Medium: those languages straying
// further (Varsovia, Mailand), or other languages staying close (Lontoo).
// Hard: other languages straying far (Benetke, Bécs), and every other script.
function autoTier(n) {
  if (n.roman) return 'hard'
  if (n.fam >= 0.7) return n.close >= 0.55 && n.fame >= 0.2 ? 'easy' : 'medium'
  return n.close >= 0.45 ? 'medium' : 'hard'
}
const autoValue = n => (n.interest < 0.33 ? 10 : n.interest < 0.55 ? 20 : 30)
for (const n of names) {
  const key = `${n.city}:${n.name}`
  n.auto = autoTier(n)
  n.tier = TIER_OVERRIDES[key] ?? n.auto
  n.value = VALUE_OVERRIDES[key] ?? autoValue(n)
}
// Rank: difficulty as a percentile inside the tier, so every tier runs 0 → 1.
for (const t of ['easy', 'medium', 'hard']) {
  const pool = names.filter(n => n.tier === t).sort((a, b) => a.diff - b.diff)
  pool.forEach((n, i) => { n.rank = Math.round((i / Math.max(1, pool.length - 1)) * 100) / 100 })
}

// ── Report ────────────────────────────────────────────────────────────────
const count = t => names.filter(n => n.tier === t).length
const citiesIn = t => new Set(names.filter(n => n.tier === t).map(n => n.city)).size
const langsIn = t => new Set(names.filter(n => n.tier === t).map(n => n.langs[0])).size
const perLang = {}
for (const n of names) for (const l of n.langs) perLang[l] = (perLang[l] ?? 0) + 1
console.log(`Wikidata snapshot ${raw.fetched}: ${infoBy.size} items, ${cities.length} cities, ${raw.labels.length} labels`)
console.log(`Names kept: ${names.length} for ${used.length} cities (${used.filter(c => c.capital).length} capitals) in ${Object.keys(perLang).length} languages`)
for (const t of ['easy', 'medium', 'hard']) console.log(`  ${t}: ${count(t)} names, ${citiesIn(t)} cities, ${langsIn(t)} first languages; values ${[10, 20, 30].map(v => `${v}×${names.filter(n => n.tier === t && n.value === v).length}`).join(' ')}`)
console.log(`Dropped: ${dropped.close.length} spelled (nearly) like the English, ${dropped.contains.length} containing the answer, ${dropped.translit.length} transliterations of lesser-known cities, ${dropped.clash.length} another place's English name, ${dropped.title.length} not matching Wikipedia, ${dropped.script.length} unexpected characters, ${dropped.manual} by hand`)
console.log(`Per language: ${ORDER.map(l => `${l} ${perLang[l] ?? 0}`).join(', ')}`)
if (problems.length) console.log(`Not used:\n  ${problems.join('\n  ')}`)
if (DUMP) {
  console.log(`Another place's English name:\n  ${dropped.clash.join('\n  ')}`)
  console.log(`Containing the answer:\n  ${dropped.contains.join('\n  ')}`)
  console.log(`Transliterations:\n  ${dropped.translit.join('\n  ')}`)
  for (const n of [...names].sort((a, b) => a.tier.localeCompare(b.tier) || a.diff - b.diff))
    console.log(`${n.tier.padEnd(6)} ${n.auto !== n.tier ? '*' : ' '} ${n.value} d${n.diff.toFixed(2)} c${n.close.toFixed(2)} i${n.interest.toFixed(2)} f${n.fame.toFixed(2)} ${CITY[n.city].city} ← ${n.name}${n.roman ? ` (${n.roman})` : ''} [${n.langs.join(' ')}]`)
}

// ── Write ─────────────────────────────────────────────────────────────────
const usedLangs = ORDER.filter(l => perLang[l])
const q = s => JSON.stringify(s)
const cityLines = [...used].sort((a, b) => a.id.localeCompare(b.id))
  .map(c => `  ${q(c.id)}: { id: ${q(c.id)}, city: ${q(c.city)}, country: ${q(c.country)}, code: ${q(c.code)}, region: ${q(c.region)}, capital: ${c.capital} }, // ${c.qid}`)
const nameLines = [...names]
  .sort((a, b) => a.city.localeCompare(b.city) || ORDER.indexOf(a.langs[0]) - ORDER.indexOf(b.langs[0]) || a.name.localeCompare(b.name))
  .map(n => `  n(${q(n.city)}, ${q(n.tier)}, ${n.value}, ${n.rank}, ${q(n.name)}, ${q(n.langs.join(' '))}${n.roman ? `, ${q(n.roman)}` : ''}),`)
fs.writeFileSync(OUT, `// GENERATED by scripts/cities-abroad/fetch.mjs from Wikidata (${raw.fetched}). Do not edit by hand:
// fix a name, tier or value in the script (EXCLUDE, TIER_OVERRIDES, VALUE_OVERRIDES) and run it again.
// Each city's Wikidata item is noted after it; names are that item's labels.
// Names in other scripts carry a Latin spelling made by rule (see scripts/cities-abroad/romanise.mjs).
import type { AbroadCity, AbroadName, Tier, Value } from "../utils/citiesAbroad"

export const ABROAD_LANGUAGES: Record<string, string> = {
${usedLangs.map(l => `  ${l}: ${q(LANG_NAME[l])},`).join('\n')}
}

/** Language codes whose names are not in the Latin alphabet (shown with a Latin spelling). */
export const NON_LATIN_LANGS = new Set([${usedLangs.filter(l => FAM[l] === undefined).map(q).join(', ')}])

export const ABROAD_CITIES: Record<string, AbroadCity> = {
${cityLines.join('\n')}
}

// n(city, tier, value, rank, name, languages, Latin spelling)
const n = (city: string, tier: Tier, value: Value, rank: number, name: string, langs: string, roman?: string): AbroadName =>
  roman ? { city, name, roman, langs: langs.split(" "), tier, value, rank } : { city, name, langs: langs.split(" "), tier, value, rank }

export const ABROAD_NAMES: AbroadName[] = [
${nameLines.join('\n')}
]
`)
console.log(`Wrote ${path.relative(ROOT, OUT)}`)
