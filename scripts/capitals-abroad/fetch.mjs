// Builds src/data/capitalsAbroad.ts: every capital in src/data/capitals.ts as
// it is written in other languages, from Wikidata.
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/capitals-abroad/fetch.mjs
//   (add --offline to rebuild from the last download without asking Wikidata)
//
// 1. Finds each country on Wikidata by its ISO code (P297) and takes its
//    capital (P36) whose English label matches capitals.ts.
// 2. Reads that capital's label (rdfs:label) in each language below.
// 3. Drops every name a player could answer by copying it: the English name,
//    any accepted English alternative ("Kiev"), a name that contains one as a
//    word ("Ciudad de Panamá"), and Cyrillic or Greek names whose Latin
//    spelling is one letter off the English. Countries with a split or
//    disputed capital are left out, as in Connections (NO_CAPITAL_TILE), plus
//    SKIP_CAPITAL. Non-Latin scripts other than Cyrillic and Greek are kept
//    only where Wikidata gives a romanisation of that exact name.
// 4. Keeps a label only if it agrees with that language's Wikipedia article
//    title (or is listed in CONFIRMED after a check by hand).
// 5. Groups languages that write a capital the same way ("Londres": Spanish,
//    French, Portuguese, Catalan), and gives each name a tier from how far it
//    is from the English, how familiar the language is and how well known the
//    capital is (Wikipedia sitelinks). TIER_OVERRIDES fixes the ones that read
//    wrong by eye.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROMANISERS } from './romanise.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const src = f => import(path.join(ROOT, 'src', f))
const { CAPITALS } = await src('data/capitals.ts')
const { FLAGS } = await src('data/flags.ts')
const { NO_CAPITAL_TILE, capitalName } = await src('utils/connectionsTiles.ts')
const { foldName, acceptedAnswers, editDistance } = await src('utils/capitalsAbroad.ts')

const OUT = path.join(ROOT, 'src/data/capitalsAbroad.ts')
const CACHE = path.join(ROOT, 'node_modules/.cache/capitals-abroad.json')
const UA = 'GlobalioBuild/1.0 (https://globalio.app; sjoudrie@gmail.com)'
const OFFLINE = process.argv.includes('--offline')

// Languages, most familiar to an English speaker first. `fam` (0–1) feeds the tier.
const LATIN = [
  ['es', 'Spanish', 1], ['fr', 'French', 1], ['de', 'German', 1], ['it', 'Italian', 1], ['pt', 'Portuguese', 0.9],
  ['nl', 'Dutch', 0.8], ['ca', 'Catalan', 0.75], ['sv', 'Swedish', 0.75], ['da', 'Danish', 0.75], ['nb', 'Norwegian', 0.75],
  ['pl', 'Polish', 0.6], ['cs', 'Czech', 0.55], ['hr', 'Croatian', 0.55], ['ro', 'Romanian', 0.6], ['tr', 'Turkish', 0.55],
  ['hu', 'Hungarian', 0.5], ['fi', 'Finnish', 0.5],
]
const NON_LATIN = [
  ['ru', 'Russian'], ['uk', 'Ukrainian'], ['el', 'Greek'],
  ['zh', 'Chinese'], ['ja', 'Japanese'], ['ko', 'Korean'], ['ar', 'Arabic'], ['he', 'Hebrew'],
  ['hi', 'Hindi'], ['th', 'Thai'], ['ka', 'Georgian'], ['hy', 'Armenian'],
]
const LANG_NAME = Object.fromEntries([...LATIN, ...NON_LATIN].map(([c, n]) => [c, n]))
const FAM = Object.fromEntries(LATIN.map(([c, , f]) => [c, f]))
const ORDER = [...LATIN, ...NON_LATIN].map(([c]) => c)

// Wikidata items to use where the country's P36 doesn't carry our capital
// under the same English name. Filled in from the script's own report.
const CAPITAL_QID = {
}

// Countries left out besides Connections' split and disputed capitals.
const SKIP_CAPITAL = {
  GQ: 'moving its capital from Malabo to Ciudad de la Paz; Wikidata already lists the new one',
  NR: 'no official capital; Yaren is a district that hosts the government',
}

// Names to leave out even though Wikidata has them: outdated or mistaken labels.
// `${code}:${lang}:${name}`
const EXCLUDE = new Set([
  // Spanish Wikipedia's names, but they are the English name less its "'s":
  // a round that only catches out the apostrophe.
  'AG:es:Saint John', 'GD:es:Saint George',
  // Portuguese Wikipedia's article, but "São João" is just "Saint John" and
  // reads as a different city.
  'AG:pt:São João',
])

// Labels that differ from that language's Wikipedia article title but were
// checked by hand and are right: the article is about the municipality
// ("Ville de Bruxelles", "Präfektur Tokio") while the label is the city's name.
// `${code}:${lang}:${name}`
const CONFIRMED = new Set([
  'BE:fr:Bruxelles', 'BE:de:Brüssel', 'BE:pt:Bruxelas', 'BE:ro:Bruxelles', 'BE:hr:Bruxelles', 'BE:fi:Bryssel',
  'SM:fr:Saint-Marin', 'JP:de:Tokio',
])

// Tiers set by hand. The first group are the examples in the game's brief;
// the rest read wrong by eye after the automatic pass. `${code}:${name}`
const TIER_OVERRIDES = {
  'IT:Roma': 'easy', 'PT:Lisboa': 'easy', 'GR:Atenas': 'easy',
  'GB:Londres': 'medium', 'AT:Viena': 'medium', 'CN:Pekín': 'medium', 'RU:Moskau': 'medium', 'PL:Varsovia': 'hard',
  // Alike in their language family, so alike in tier.
  'GR:Atene': 'easy', 'AT:Vienne': 'medium',
  'CN:Pékin': 'medium', 'CN:Pekin': 'medium', 'CN:Peking': 'medium', 'CN:Pequín': 'medium',
  // Score as close, but read as a different name to an English speaker.
  'FI:Helsingfors': 'medium', 'RO:București': 'medium', 'UZ:Tasquente': 'medium',
}

// ── Wikidata ──────────────────────────────────────────────────────────────
async function sparql(query) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ query }),
      signal: AbortSignal.timeout(90_000),
    })
    if (res.ok) return (await res.json()).results.bindings
    if (attempt >= 4 || ![429, 500, 502, 503, 504].includes(res.status)) throw new Error(`Wikidata ${res.status}: ${(await res.text()).slice(0, 300)}`)
    const wait = Number(res.headers.get('retry-after')) || attempt * 10
    console.warn(`Wikidata ${res.status}, retrying in ${wait}s`)
    await new Promise(r => setTimeout(r, wait * 1000))
  }
}
const qid = uri => uri.replace('http://www.wikidata.org/entity/', '')
const pause = () => new Promise(r => setTimeout(r, 1500)) // be polite between queries

// Wikidata's English label, or its language-neutral "mul" label where the
// English one was folded into it (St. John's).
const EN_LABEL = `OPTIONAL { ?cap rdfs:label ?en FILTER(lang(?en) = "en") }
      OPTIONAL { ?cap rdfs:label ?mul FILTER(lang(?mul) = "mul") }`
const wikiOf = lang => `https://${lang === 'nb' ? 'no' : lang}.wikipedia.org/`

async function download() {
  const codes = CAPITALS.map(c => c.code)
  const capRows = await sparql(`
    SELECT ?iso ?cap ?en ?mul ?links WHERE {
      VALUES ?iso { ${codes.map(c => `"${c}"`).join(' ')} }
      ?country wdt:P297 ?iso ; p:P36 ?st .
      ?st ps:P36 ?cap ; wikibase:rank ?rank .
      FILTER(?rank != wikibase:DeprecatedRank)
      FILTER NOT EXISTS { ?st pq:P582 ?end }
      ${EN_LABEL}
      ?cap wikibase:sitelinks ?links .
    }`)
  const en = r => (r.en ?? r.mul)?.value ?? ''
  const found = capRows.map(r => ({ code: r.iso.value, qid: qid(r.cap.value), en: en(r), links: +r.links.value }))
  const extra = Object.values(CAPITAL_QID).filter(q => !found.some(f => f.qid === q))
  if (extra.length) {
    await pause()
    const rows = await sparql(`
      SELECT ?cap ?en ?mul ?links WHERE {
        VALUES ?cap { ${extra.map(q => `wd:${q}`).join(' ')} }
        ${EN_LABEL}
        ?cap wikibase:sitelinks ?links .
      }`)
    for (const r of rows) found.push({ code: null, qid: qid(r.cap.value), en: en(r), links: +r.links.value })
  }
  const qids = [...new Set(found.map(f => f.qid))]
  const VALUES_CAP = `VALUES ?cap { ${qids.map(q => `wd:${q}`).join(' ')} }`
  await pause()
  const labelRows = await sparql(`
    SELECT ?cap ?label WHERE {
      ${VALUES_CAP}
      ?cap rdfs:label ?label .
      FILTER(lang(?label) IN (${ORDER.map(l => `"${l}"`).join(', ')}))
    }`)
  const labels = labelRows.map(r => ({ qid: qid(r.cap.value), lang: r.label['xml:lang'], label: r.label.value }))
  // The Wikipedia article title in each language: a second opinion on the label.
  await pause()
  const titleRows = await sparql(`
    SELECT ?cap ?wiki ?title WHERE {
      ${VALUES_CAP}
      VALUES ?wiki { ${ORDER.map(l => `<${wikiOf(l)}>`).join(' ')} }
      ?article schema:about ?cap ; schema:isPartOf ?wiki ; schema:name ?title .
    }`)
  const titles = titleRows.map(r => ({ qid: qid(r.cap.value), lang: ORDER.find(l => wikiOf(l) === r.wiki.value), title: r.title.value }))
  // Romanisations Wikidata gives as a qualifier of a name statement (native
  // label, official name, name, short name), with the name's language.
  await pause()
  const romRows = await sparql(`
    SELECT ?cap ?text ?rom WHERE {
      ${VALUES_CAP}
      VALUES (?p ?ps) { (p:P1705 ps:P1705) (p:P1448 ps:P1448) (p:P1559 ps:P1559) (p:P2561 ps:P2561) (p:P1813 ps:P1813) (p:P1549 ps:P1549) }
      VALUES ?pq { pq:P1721 pq:P2125 pq:P2001 pq:P1942 pq:P2440 pq:P5825 }
      ?cap ?p ?st . ?st ?ps ?text ; ?pq ?rom .
    }`)
  const romanised = romRows.map(r => ({ qid: qid(r.cap.value), lang: r.text['xml:lang'], text: r.text.value, rom: r.rom.value }))
  return { fetched: new Date().toISOString().slice(0, 10), found, labels, titles, romanised }
}

let raw
if (OFFLINE) raw = JSON.parse(fs.readFileSync(CACHE, 'utf8'))
else {
  raw = await download()
  fs.mkdirSync(path.dirname(CACHE), { recursive: true })
  fs.writeFileSync(CACHE, JSON.stringify(raw))
}

// ── Capitals ──────────────────────────────────────────────────────────────
const FLAG_NAME = new Map(FLAGS.map(f => [f.code, f.name]))
const capitals = []
const problems = []
for (const c of CAPITALS) {
  if (NO_CAPITAL_TILE.has(c.code) || SKIP_CAPITAL[c.code]) continue
  if (!FLAG_NAME.has(c.code)) { problems.push(`${c.code} is not in FLAGS`); continue }
  const want = foldName(c.capital)
  const hit = CAPITAL_QID[c.code]
    ? raw.found.find(f => f.qid === CAPITAL_QID[c.code])
    : raw.found.find(f => f.code === c.code && foldName(f.en) === want)
  if (!hit) {
    const offered = raw.found.filter(f => f.code === c.code).map(f => `${f.qid} ${f.en}`).join(', ') || 'nothing'
    problems.push(`${c.code} ${c.capital}: Wikidata P36 gives ${offered}`)
    continue
  }
  capitals.push({ code: c.code, capital: capitalName(c.code) || c.capital, country: FLAG_NAME.get(c.code), region: c.region, qid: hit.qid, links: hit.links })
}

// ── Names ─────────────────────────────────────────────────────────────────
const LATIN_RE = /^[\p{Script=Latin}\s\-–'’ʻʼ.,()·]+$/u // · for Catalan l·l
const scriptOk = { ru: /^[\p{Script=Cyrillic}\s\-–'’ʼ.]+$/u, uk: /^[\p{Script=Cyrillic}\s\-–'’ʼ.]+$/u, el: /^[\p{Script=Greek}\s\-–'’.]+$/u }

// The words of a name, folded ("Ciudad de Panamá" → ciudad, de, panama).
const words = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[\s\-–,.()'’]+/).map(foldName).filter(Boolean)
// True when some run of whole words in the name is already a right answer:
// "Kuwait-Stadt" and "Ciudad de Panamá" can be answered by copying a word.
function containsAnswer(name, right) {
  const w = words(name)
  for (let i = 0; i < w.length; i++) for (let j = i + 1; j <= w.length; j++) if (right.has(w.slice(i, j).join(''))) return true
  return false
}
// The Wikipedia title without its disambiguation: "Victoria (Seychelles)" → "Victoria".
const bareTitle = t => t.replace(/\s*\(.*\)\s*$/, '').replace(/,.*$/, '').trim()

const excluded = { same: 0, alias: 0, contains: [], nearRoman: [], noRoman: {}, script: [], manual: 0, title: [], clash: [] }
// Every English country and capital name, to catch a foreign name that is
// another place's English name (Turkish "Cuba" is Juba, not Cuba).
const englishNames = new Map()
for (const c of [...CAPITALS, ...FLAGS.map(f => ({ code: f.code, country: f.name }))]) for (const n of [c.capital, c.country]) {
  if (!n) continue
  const f = foldName(n)
  if (!englishNames.has(f)) englishNames.set(f, new Set())
  englishNames.get(f).add(c.code)
}
const byKey = new Map()
const labelsFor = q => raw.labels.filter(l => l.qid === q)
for (const c of capitals) {
  const right = acceptedAnswers(c)
  for (const { lang, label } of labelsFor(c.qid)) {
    const title = raw.titles.find(t => t.qid === c.qid && t.lang === lang)?.title
    let name = label.trim()
    // Labels follow sentence case ("l'Havana", "πόλη της Γουατεμάλας"); a
    // name on its own starts with a capital, as in the article title.
    if (name[0] !== name[0].toUpperCase() && title && foldName(bareTitle(title)) === foldName(name)) name = bareTitle(title)
    if (EXCLUDE.has(`${c.code}:${lang}:${name}`)) { excluded.manual++; continue }
    let roman
    if (FAM[lang] !== undefined) {
      if (!LATIN_RE.test(name)) { excluded.script.push(`${c.code} ${lang} ${name}`); continue }
    } else if (ROMANISERS[lang]) {
      if (!scriptOk[lang].test(name)) { excluded.script.push(`${c.code} ${lang} ${name}`); continue }
      roman = ROMANISERS[lang](name)
    } else {
      const r = raw.romanised.find(x => x.qid === c.qid && x.text === name && x.lang.split('-')[0] === lang)
      if (!r) { excluded.noRoman[lang] = (excluded.noRoman[lang] ?? 0) + 1; continue }
      roman = r.rom
    }
    // No free rounds: a name (or its Latin spelling) that already is an answer.
    const f = foldName(roman ?? name)
    if (f === foldName(c.capital)) { excluded.same++; continue }
    if (right.has(f)) { excluded.alias++; continue }
    if (englishNames.has(f) && !englishNames.get(f).has(c.code)) { excluded.clash.push(`${c.code} ${lang} ${name}`); continue }
    if (containsAnswer(roman ?? name, right)) { excluded.contains.push(`${c.code} ${lang} ${name}${roman ? ` (${roman})` : ''}`); continue }
    // A Latin spelling one letter off the English (Монако, Monako) makes a
    // non-Latin name a copying exercise, not a hard round.
    if (roman && [...right].some(a => editDistance(f, a) <= 1)) { excluded.nearRoman.push(`${c.code} ${lang} ${name} (${roman})`); continue }
    // A second opinion: the label must agree with that language's Wikipedia
    // article title (CONFIRMED lists the few checked by hand that don't).
    if (!CONFIRMED.has(`${c.code}:${lang}:${name}`) && (!title || foldName(bareTitle(title)) !== foldName(name))) {
      excluded.title.push(`${c.code} ${lang} label "${name}" / article "${title ?? '(none)'}"`)
      continue
    }
    const key = `${c.code}\u0000${name}\u0000${roman ?? ''}`
    if (!byKey.has(key)) byKey.set(key, { code: c.code, name, roman, langs: [] })
    byKey.get(key).langs.push(lang)
  }
}
const names = [...byKey.values()]
for (const n of names) n.langs.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))

// ── Tiers ─────────────────────────────────────────────────────────────────
// The core of a name for comparing: no articles or words for "city"
// ("La Habana" → habana, "Città del Vaticano" → vaticano, "Vatican City" → vatican).
const FILLER = new Set(['la', 'le', 'les', 'el', 'il', 'l', 'lo', 'al', 'de', 'del', 'della', 'do', 'da', 'di', 'du', 'des', 'of', 'the',
  'ciudad', 'ciutat', 'citta', 'cidade', 'ville', 'stadt', 'stad', 'staden', 'by', 'varos', 'orasul', 'sehri', 'grad', 'mesto', 'miasto', 'kaupunki', 'city'])
const core = s => words(s.replace(/['’]/g, ' ')).filter(w => !FILLER.has(w)).join('') || foldName(s)
// Closeness to the English, 0–1: edit distance on folded letters, plus credit
// for a shared start (the first letters are what a reader recognises).
function closeness(english, foreign) {
  const a = core(english), b = core(foreign)
  const lev = 1 - editDistance(a, b) / Math.max(a.length, b.length)
  let p = 0
  while (p < Math.min(a.length, b.length) && a[p] === b[p]) p++
  const prefix = Math.min(1, p / Math.min(4, a.length, b.length))
  return 0.7 * lev + 0.3 * prefix
}
// How well known a capital is: its rank by Wikipedia sitelinks, 0 (least) – 1 (most).
const byLinks = [...capitals].sort((a, b) => a.links - b.links)
const FAME = Object.fromEntries(byLinks.map((c, i) => [c.code, i / (byLinks.length - 1)]))
const CAP = Object.fromEntries(capitals.map(c => [c.code, c]))

// Easy: close to the English, in a language English speakers meet often, and
// a capital most people have heard of. Hard: far from the English (or close
// but obscure), and every non-Latin script. Medium: the rest.
function autoTier(n) {
  if (n.roman) return 'hard'
  const close = closeness(CAP[n.code].capital, n.name)
  const fam = Math.max(...n.langs.map(l => FAM[l]))
  const fame = FAME[n.code]
  if (close >= 0.68 && fam >= 0.75 && fame >= 0.5) return 'easy'
  if (close < 0.45 || (close < 0.55 && fame < 0.3)) return 'hard'
  return 'medium'
}
for (const n of names) {
  n.auto = autoTier(n)
  n.tier = TIER_OVERRIDES[`${n.code}:${n.name}`] ?? n.auto
  n.close = closeness(CAP[n.code].capital, n.roman ?? n.name)
}

// ── Report ────────────────────────────────────────────────────────────────
const count = t => names.filter(n => n.tier === t).length
const capsIn = t => new Set(names.filter(n => n.tier === t).map(n => n.code)).size
console.log(`Wikidata snapshot ${raw.fetched}: ${capitals.length} capitals, ${raw.labels.length} labels`)
console.log(`Names kept: ${names.length} (easy ${count('easy')} over ${capsIn('easy')} capitals, medium ${count('medium')} over ${capsIn('medium')}, hard ${count('hard')} over ${capsIn('hard')})`)
console.log(`Dropped: ${excluded.same} same as English, ${excluded.alias} an accepted alternative, ${excluded.contains.length} containing the answer, ${excluded.nearRoman.length} non-Latin one letter off in Latin letters, ${excluded.title.length} not matching Wikipedia, ${excluded.manual} by hand`)
console.log(`Left out: ${Object.entries(SKIP_CAPITAL).map(([c, why]) => `${c} (${why})`).join('; ')}`)
if (process.argv.includes('--dump')) {
  console.log(`Containing the answer:\n  ${excluded.contains.join('\n  ')}`)
  console.log(`One letter off in Latin letters:\n  ${excluded.nearRoman.join('\n  ')}`)
  console.log(`Not matching the Wikipedia title:\n  ${excluded.title.join('\n  ')}`)
}
if (excluded.clash.length) console.log(`Another place's English name:\n  ${excluded.clash.join('\n  ')}`)
console.log(`Dropped for no Wikidata romanisation: ${JSON.stringify(excluded.noRoman)}`)
if (excluded.script.length) console.log(`Dropped for unexpected characters:\n  ${excluded.script.join('\n  ')}`)
const perLang = {}
for (const n of names) for (const l of n.langs) perLang[l] = (perLang[l] ?? 0) + 1
console.log(`Per language: ${ORDER.map(l => `${l} ${perLang[l] ?? 0}`).join(', ')}`)
if (problems.length) console.log(`Not matched:\n  ${problems.join('\n  ')}`)
if (process.argv.includes('--dump')) {
  for (const n of [...names].sort((a, b) => a.tier.localeCompare(b.tier) || b.close - a.close))
    console.log(`${n.tier.padEnd(6)} ${n.auto !== n.tier ? '*' : ' '} ${n.close.toFixed(2)} f${FAME[n.code].toFixed(2)} ${n.code} ${CAP[n.code].capital} ← ${n.name}${n.roman ? ` (${n.roman})` : ''} [${n.langs.join(' ')}]`)
}

// ── Write ─────────────────────────────────────────────────────────────────
const usedLangs = ORDER.filter(l => perLang[l])
const q = s => JSON.stringify(s)
const capLines = capitals.filter(c => names.some(n => n.code === c.code))
  .map(c => `  ${c.code}: { code: ${q(c.code)}, capital: ${q(c.capital)}, country: ${q(c.country)}, region: ${q(c.region)} }, // ${c.qid}`)
const nameLines = [...names]
  .sort((a, b) => a.code.localeCompare(b.code) || ORDER.indexOf(a.langs[0]) - ORDER.indexOf(b.langs[0]) || a.name.localeCompare(b.name))
  .map(n => `  n(${q(n.code)}, ${q(n.tier)}, ${q(n.name)}, ${q(n.langs.join(' '))}${n.roman ? `, ${q(n.roman)}` : ''}),`)
fs.writeFileSync(OUT, `// GENERATED by scripts/capitals-abroad/fetch.mjs from Wikidata (${raw.fetched}). Do not edit by hand:
// fix a name or a tier in the script (EXCLUDE, TIER_OVERRIDES) and run it again.
// Each capital's Wikidata item is noted after it; names are that item's labels.
// Russian, Ukrainian and Greek names carry a Latin spelling (BGN/PCGN, the 2010
// Ukrainian national system and ELOT 743; see scripts/capitals-abroad/romanise.mjs).
import type { AbroadCapital, AbroadName, Tier } from "../utils/capitalsAbroad"

export const ABROAD_LANGUAGES: Record<string, string> = {
${usedLangs.map(l => `  ${l}: ${q(LANG_NAME[l])},`).join('\n')}
}

/** Language codes whose names are not in the Latin alphabet (shown with a Latin spelling). */
export const NON_LATIN_LANGS = new Set([${usedLangs.filter(l => !FAM[l]).map(q).join(', ')}])

export const ABROAD_CAPITALS: Record<string, AbroadCapital> = {
${capLines.join('\n')}
}

const n = (code: string, tier: Tier, name: string, langs: string, roman?: string): AbroadName =>
  roman ? { code, name, roman, langs: langs.split(" "), tier } : { code, name, langs: langs.split(" "), tier }

export const ABROAD_NAMES: AbroadName[] = [
${nameLines.join('\n')}
]
`)
console.log(`Wrote ${path.relative(ROOT, OUT)}`)
