// Builds the data for two games from one Wikidata download:
//   src/data/countriesAbroad.ts  Countries Abroad: a country's name as other
//                                languages write it (Allemagne → Germany)
//   src/data/nativeNames.ts      Native Names: what a country calls itself in
//                                its own official language (Suomi → Finland)
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/country-names/fetch.mjs
//   (add --offline to rebuild from the last download without asking Wikidata,
//    --dump to print every name with its tier and value, --native-candidates
//    to print each country's official languages and the native name the
//    script would pick for each)
//
// Countries: the 197 in src/data/flags.ts (UN members, Kosovo, Taiwan,
// Palestine and Vatican City), found on Wikidata by ISO code (P297).
//
// Each country's own languages come from its official languages (P37):
//   national  statements that apply to the whole country, with the few
//             Wikidata gets wrong set by hand (NATIONAL)
//   regional  statements limited to a part of it (P518), such as Catalan in
//             Spain, plus REGIONAL_EXTRA
//
// Countries Abroad
//   1. Each country's label (rdfs:label) in the Cities Abroad languages, except
//      the country's own national and regional ones: Deutschland is Native
//      Names' business, not this game's.
//   2. Drops a name spelled the same or nearly the same as the English name, an
//      alternative or a name that fits two countries (looksLikeCountry in
//      src/utils/countryNames.ts, on the Latin spelling for other scripts), one
//      that holds the answer ("Îles Marshall"), one spelled like another
//      country's English name, and one that is the country's own name in a
//      neighbouring language ("Norge" in Danish, "Slovensko" in Czech).
//   3. Keeps a label only if it agrees with that language's Wikipedia article
//      title (or is listed in CONFIRMED).
//   4. Groups languages that write a country the same way and gives each name a
//      tier, a value and a rank exactly as Cities Abroad does.
//
// Native Names
//   1. Each country's label in each national official language: one name per
//      language. NATIVE_TEXT (native-table.mjs) picks the everyday short name
//      where the label is the long official one (대한민국 → 한국).
//   2. Latin spellings: the rule-based romanisers of Cities Abroad (plus
//      Mongolian) where one applies, else the hand-checked table in
//      native-table.mjs. A name in a script with neither is left out and listed.
//   3. Drops a name spelled the same or nearly the same as the English
//      (looksLikeNative: Italia, Brasil, México, Türkiye), except the few the
//      game keeps on purpose (KEEP_CLOSE).
//   4. Tiers by how far the name strays and how well known the country is, with
//      the owner's examples set by hand (TIER_OVERRIDES); easy names are worth
//      10, medium 20 and hard 30.
import fs from 'node:fs'
import path from 'node:path'
import { ROMANISERS, isKatakana } from '../cities-abroad/romanise.mjs'
import {
  ROOT, LANG_NAME, FAM, ORDER, NON_LATIN_FAM, sparql, qid, pause, chunks, wikiOf, bareTitle,
  LATIN_RE, SCRIPT_OK, variants, closeness, soundCloseness,
} from '../cities-abroad/shared.mjs'
import { NATIVE_TEXT, NATIVE_ROMAN, LANG_NAMES, KEEP_CLOSE } from './native-table.mjs'

const src = f => import(path.join(ROOT, 'src', f))
const { FLAGS } = await src('data/flags.ts')
const { foldName, squash } = await src('utils/abroad.ts')
const { COUNTRIES, COUNTRY_ALIASES, looksLikeAbroad, looksLikeNative, holdsAnswer } = await src('utils/countryNames.ts')

const OUT_ABROAD = path.join(ROOT, 'src/data/countriesAbroad.ts')
const OUT_NATIVE = path.join(ROOT, 'src/data/nativeNames.ts')
const CACHE = path.join(ROOT, 'node_modules/.cache/country-names.json')
const OFFLINE = process.argv.includes('--offline')
const DUMP = process.argv.includes('--dump')

// Wikidata items to use instead of the one the ISO code finds: NL's code sits
// on the Kingdom of the Netherlands, whose labels are the long form.
const QID_OVERRIDE = { NL: 'Q55' }

// National official languages where Wikidata's P37 misleads: every Belgian
// statement is limited to a region, minority languages carry no qualifier
// (Sweden, Poland, Taiwan), English in the US is deprecated, and Chinese,
// Filipino, Montenegrin and Dari have no plain language code. Language codes
// are Wikidata's label codes.
// Azerbaijani's statement is qualified by its standard, as if it were a
// region. Jamaican Patois, Spanish in Antigua and Cape Verdean Creole carry no
// official status, and Mexico's law makes Spanish and its 68 indigenous
// languages equal "national languages" with none official: the game keeps
// Spanish, the language of government.
const NATIONAL = {
  BE: ['nl', 'fr', 'de'], GB: ['en'], SE: ['sv'], PL: ['pl'], SI: ['sl'], US: ['en'], UY: ['es'], AZ: ['az'],
  TW: ['zh'], SG: ['en', 'ms', 'ta', 'zh'], PH: ['en', 'tl'], AF: ['ps', 'fa'], ME: ['cnr'], JM: ['en'], AG: ['en'],
  CV: ['pt'], MX: ['es'],
}
// Languages that are official in part of a country but that P37 doesn't say
// so of, and P37 regional statements that don't make a language the
// country's own (Spanish in Puerto Rico, Ukrainian in occupied Crimea).
const REGIONAL_EXTRA = { GB: ['ga', 'gd'], ME: ['sr', 'hr', 'bs', 'sq'] }
const NOT_OWN = { US: ['es', 'sm', 'ch', 'haw'], RU: ['uk'], PW: ['ja'] }
// Codes P37 gives that are written under another code in labels.
const CODE_ALIAS = { 'zh-cn': 'zh', 'zh-tw': 'zh', 'fa-af': 'fa', 'en-gb': 'en', 'en-au': 'en', 'ko-kp': 'ko', no: 'nb' }

// Countries Abroad: labels that differ from that language's Wikipedia article
// title but were checked by hand and are right. `${code}:${lang}:${name}`
const CONFIRMED = new Set([])
// Countries Abroad names to leave out though Wikidata has them. `${code}:${lang}:${name}`
const EXCLUDE = new Set([])
// Countries Abroad tiers and values set by hand (the owner's examples). `${code}:${name}`
const TIER_OVERRIDES = {}
const VALUE_OVERRIDES = {}

// Native Names: the share of names, gentlest first, that are easy, then medium.
const NATIVE_SPLIT = [0.34, 0.67]
// Native Names tiers set by hand: the owner's examples. `${code}:${name}`
const NATIVE_TIERS = {
  'DE:Deutschland': 'easy', 'PL:Polska': 'easy', 'SE:Sverige': 'easy', 'NO:Norge': 'easy', 'NL:Nederland': 'easy', 'ES:España': 'easy',
  'FI:Suomi': 'medium', 'HR:Hrvatska': 'medium', 'AT:Österreich': 'medium', 'EE:Eesti': 'medium', 'IE:Éire': 'medium',
  'ME:Crna Gora': 'medium', 'JP:日本': 'medium', 'CN:中国': 'medium', 'RU:Россия': 'medium', 'GR:Ελλάδα': 'medium',
  'HU:Magyarország': 'hard', 'AL:Shqipëria': 'hard', 'GE:საქართველო': 'hard', 'AM:Հայաստան': 'hard', 'BT:འབྲུག་ཡུལ་': 'hard',
  'ET:ኢትዮጵያ': 'hard', 'TH:ประเทศไทย': 'hard', 'KH:កម្ពុជា': 'hard', 'EG:مصر': 'hard', 'NZ:Aotearoa': 'hard',
  'KP:조선': 'hard', 'KR:한국': 'hard',
  // Then the ones that read wrong by eye after the automatic pass: Slovensko is
  // a step up (it's Slovakia, not Slovenia); names that show their answer
  // (…Afrika, centrafricaine, Nijar, Naoero, Filastin) a step down.
  'SK:Slovensko': 'medium', 'NE:Nijar': 'medium', 'NR:Naoero': 'medium', 'PS:فلسطين': 'medium',
  'CF:République centrafricaine': 'medium', 'ZA:Afrika Borwa': 'medium', 'ZA:Afrika-Dzonga': 'medium',
  'ZA:Aferika Borwa': 'medium', 'ZA:Afurika Tshipembe': 'medium',
  'PG:Papua Niugini': 'easy', 'PE:Piruw': 'easy', 'MU:Maurice': 'easy',
}

const CODES = FLAGS.map(f => f.code)

// ── Wikidata ──────────────────────────────────────────────────────────────
const values = qs => `VALUES ?c { ${qs.map(q => `wd:${q}`).join(' ')} }`

async function download() {
  // Each country's item, by ISO code; the one with most sitelinks where two share it.
  const itemRows = await sparql(`
    SELECT ?iso ?c ?links WHERE {
      VALUES ?iso { ${CODES.map(c => `"${c}"`).join(' ')} }
      ?c wdt:P297 ?iso ; wikibase:sitelinks ?links .
    }`)
  const best = {}
  for (const r of itemRows) {
    const row = { iso: r.iso.value, qid: qid(r.c.value), links: +r.links.value }
    if (!best[row.iso] || best[row.iso].links < row.links) best[row.iso] = row
  }
  for (const [iso, q] of Object.entries(QID_OVERRIDE)) best[iso] = { iso, qid: q, links: 0 }
  const qids = Object.values(best).map(b => b.qid)
  await pause()
  const linkRows = await sparql(`SELECT ?c ?links WHERE { ${values(qids)} ?c wikibase:sitelinks ?links }`)
  for (const r of linkRows) for (const b of Object.values(best)) if (b.qid === qid(r.c.value)) b.links = +r.links.value
  // Official languages (P37), with the codes their labels are written under.
  await pause()
  const p37 = (await sparql(`
    SELECT ?c ?lang ?langLabel ?code ?code1 ?part ?rank ?end WHERE {
      ${values(qids)}
      ?c p:P37 ?st . ?st ps:P37 ?lang ; wikibase:rank ?rank .
      OPTIONAL { ?st pq:P518 ?part }
      OPTIONAL { ?st pq:P582 ?end }
      OPTIONAL { ?lang wdt:P424 ?code }
      OPTIONAL { ?lang wdt:P218 ?code1 }
      OPTIONAL { ?lang rdfs:label ?langLabel FILTER(lang(?langLabel) = "en") }
    }`)).map(r => ({
    qid: qid(r.c.value), lang: qid(r.lang.value), label: r.langLabel?.value ?? '', code: r.code?.value ?? r.code1?.value ?? null,
    part: !!r.part, rank: r.rank.value.split('#').pop(), ended: !!r.end,
  }))
  // Every label, native label (P1705) and Wikipedia article title.
  await pause()
  const labels = (await sparql(`SELECT ?c ?l WHERE { ${values(qids)} ?c rdfs:label ?l }`))
    .map(r => ({ qid: qid(r.c.value), lang: r.l['xml:lang'], label: r.l.value }))
  await pause()
  const native = (await sparql(`SELECT ?c ?v WHERE { ${values(qids)} ?c wdt:P1705 ?v }`))
    .map(r => ({ qid: qid(r.c.value), lang: r.v['xml:lang'], label: r.v.value }))
  const titles = []
  for (const part of chunks(qids, 50)) {
    await pause()
    const rows = await sparql(`
      SELECT ?c ?wiki ?title WHERE {
        ${values(part)}
        ?article schema:about ?c ; schema:isPartOf ?wiki ; schema:name ?title .
        FILTER(STRENDS(STR(?wiki), ".wikipedia.org/"))
      }`)
    titles.push(...rows.map(r => ({ qid: qid(r.c.value), wiki: r.wiki.value, title: r.title.value })))
  }
  return { fetched: new Date().toISOString().slice(0, 10), items: Object.values(best), p37, labels, native, titles }
}

let raw
if (OFFLINE) raw = JSON.parse(fs.readFileSync(CACHE, 'utf8'))
else {
  raw = await download()
  fs.mkdirSync(path.dirname(CACHE), { recursive: true })
  fs.writeFileSync(CACHE, JSON.stringify(raw))
}

// ── Countries and their languages ─────────────────────────────────────────
const ITEM = Object.fromEntries(raw.items.map(i => [i.iso, i]))
const ISO_OF = Object.fromEntries(raw.items.map(i => [i.qid, i.iso]))
const LABEL = {}   // iso → lang → label
for (const l of raw.labels) if (ISO_OF[l.qid]) (LABEL[ISO_OF[l.qid]] ??= {})[l.lang] = l.label
const NATIVE_LABELS = {} // iso → lang → [P1705 values]
for (const l of raw.native) if (ISO_OF[l.qid]) ((NATIVE_LABELS[ISO_OF[l.qid]] ??= {})[l.lang] ??= []).push(l.label)
const TITLE = {}   // iso → wiki → title
for (const t of raw.titles) if (ISO_OF[t.qid]) (TITLE[ISO_OF[t.qid]] ??= {})[t.wiki] = t.title
const titleIn = (iso, lang) => TITLE[iso]?.[wikiOf(lang)]

const codeOf = c => (c ? CODE_ALIAS[c] ?? c : null)
const SIGN = /sign language/i
function languagesOf(iso) {
  const rows = raw.p37.filter(r => ISO_OF[r.qid] === iso && r.rank !== 'DeprecatedRank' && !r.ended && r.code && !SIGN.test(r.label))
  const national = NATIONAL[iso] ?? [...new Set(rows.filter(r => !r.part).flatMap(r => (r.code === 'no' ? ['nb', 'nn'] : [codeOf(r.code)])))]
  const regional = [...new Set([...rows.filter(r => r.part).map(r => codeOf(r.code)), ...(REGIONAL_EXTRA[iso] ?? [])])]
  const own = new Set([...national, ...regional].filter(l => !(NOT_OWN[iso] ?? []).includes(l)))
  return { national: [...new Set(national)], own }
}
const LANGS = Object.fromEntries(CODES.map(iso => [iso, languagesOf(iso)]))

const answersOf = iso => [COUNTRIES[iso].country, ...(COUNTRY_ALIASES[iso] ?? [])]
const fameRank = [...CODES].sort((a, b) => ITEM[a].links - ITEM[b].links)
const FAME = Object.fromEntries(fameRank.map((c, i) => [c, i / Math.max(1, fameRank.length - 1)]))

// Labels follow sentence case; a name on its own starts with a capital. Xhosa,
// Zulu, Swazi and Ndebele write a place's noun prefix in lower case (iKapa,
// uMzantsi Afrika); Wikipedia titles can't, so labels copied from them read "UMzantsi".
const PREFIX_LANGS = ['xh', 'zu', 'ss', 'nr']
function tidy(iso, lang, label) {
  let name = label.trim().normalize('NFC')
  const title = titleIn(iso, lang)
  if (name[0] !== name[0].toUpperCase() && !PREFIX_LANGS.includes(lang) && title && foldName(bareTitle(title)) === foldName(name)) name = bareTitle(title)
  if (PREFIX_LANGS.includes(lang) && /^[IUEAO]-?\p{Lu}/u.test(name)) name = name[0].toLowerCase() + name.slice(1)
  return name
}

// ── Native Names ──────────────────────────────────────────────────────────
// The name a country calls itself in one of its languages: NATIVE_TEXT where
// set; else the native label (P1705) in that language when it is the label
// with its own capitals (iSewula Afrika) or the label is a longer, official
// form (IRiphabliki yaseNingizimu Afrika → iNingizimu Afrika); else the label.
const words = s => s.split(/[\s-]+/).filter(Boolean).length
function nativeText(iso, lang) {
  if (NATIVE_TEXT[`${iso}:${lang}`] !== undefined) return NATIVE_TEXT[`${iso}:${lang}`]
  const label = LABEL[iso]?.[lang] ?? (lang === 'nb' ? LABEL[iso]?.no : undefined)
  const p1705 = NATIVE_LABELS[iso]?.[lang] ?? []
  if (!label) return p1705.length === 1 ? p1705[0] : null
  const same = p1705.find(v => v.toLowerCase() === label.toLowerCase())
  if (same) return same
  const shorter = p1705.filter(v => words(v) < words(label)).sort((a, b) => words(a) - words(b))[0]
  return shorter ?? tidy(iso, lang, label)
}

const LATIN_NATIVE = /^[\p{Script=Latin}\p{M}\s\-–'’ʻʼ.,()·]+$/u
const RULE_SCRIPT = { ...SCRIPT_OK, mn: /^[\p{Script=Cyrillic}\s\-–]+$/u }
const nativeProblems = { missing: [], noRoman: [], tableMismatch: [] }
const nativeDropped = { close: [] }
const nativeByKey = new Map()
for (const iso of CODES) {
  for (const lang of LANGS[iso].national) {
    const text = nativeText(iso, lang)
    if (!text) { nativeProblems.missing.push(`${iso} ${lang}`); continue }
    let roman
    const table = NATIVE_ROMAN[`${iso}:${lang}`]
    if (LATIN_NATIVE.test(text)) roman = undefined
    else if (table) {
      if (table.text !== text) { nativeProblems.tableMismatch.push(`${iso} ${lang}: data ${text}, table ${table.text}`); continue }
      roman = table.roman
    } else if (ROMANISERS[lang] && RULE_SCRIPT[lang]?.test(text) && (lang !== 'ja' || isKatakana(text))) roman = ROMANISERS[lang](text)
    else { nativeProblems.noRoman.push(`${iso} ${lang} ${text}`); continue }
    const shown = roman ?? text
    const keep = KEEP_CLOSE.has(`${iso}:${text}`)
    if (!keep && looksLikeNative(COUNTRIES[iso], shown)) { nativeDropped.close.push(`${iso} ${lang} ${text}${roman ? ` (${roman})` : ''}`); continue }
    const key = `${iso}\u0000${text}\u0000${roman ?? ''}`
    if (!nativeByKey.has(key)) nativeByKey.set(key, { country: iso, name: text, roman, langs: [], kept: keep })
    nativeByKey.get(key).langs.push(lang)
  }
}
const nativeNames = [...nativeByKey.values()]
// Every native name of a country (kept or not), to keep them out of Countries Abroad.
const ALL_NATIVE = {}
for (const iso of CODES) {
  ALL_NATIVE[iso] = []
  for (const lang of LANGS[iso].national) {
    const text = nativeText(iso, lang)
    if (!text) continue
    const table = NATIVE_ROMAN[`${iso}:${lang}`]
    const roman = LATIN_NATIVE.test(text) ? undefined : table?.text === text ? table.roman
      : ROMANISERS[lang] && RULE_SCRIPT[lang]?.test(text) ? ROMANISERS[lang](text) : undefined
    ALL_NATIVE[iso].push(text, ...(roman ? [roman] : []))
    const label = LABEL[iso]?.[lang]
    if (label) ALL_NATIVE[iso].push(label)
  }
}

if (process.argv.includes('--native-candidates')) {
  for (const iso of CODES) {
    const l = LANGS[iso]
    console.log(iso, COUNTRIES[iso].country, '|', l.national.map(lang => `${lang}=${nativeText(iso, lang)}`).join(' ; '), '| own:', [...l.own].join(' '))
  }
  console.log(nativeProblems)
  process.exit(0)
}

// ── Countries Abroad ──────────────────────────────────────────────────────
const abroadDropped = { own: 0, manual: 0, script: [], close: [], contains: [], native: [], clash: [], title: [] }
const abroadByKey = new Map()
for (const iso of CODES) {
  const c = COUNTRIES[iso]
  for (const lang of ORDER) {
    const label = LABEL[iso]?.[lang]
    if (!label) continue
    if (LANGS[iso].own.has(lang)) { abroadDropped.own++; continue }
    const name = tidy(iso, lang, label)
    if (EXCLUDE.has(`${iso}:${lang}:${name}`)) { abroadDropped.manual++; continue }
    let roman
    if (FAM[lang] !== undefined) {
      if (!LATIN_RE.test(name)) { abroadDropped.script.push(`${iso} ${lang} ${name}`); continue }
    } else {
      if (!SCRIPT_OK[lang].test(name)) { abroadDropped.script.push(`${iso} ${lang} ${name}`); continue }
      roman = ROMANISERS[lang](name)
    }
    const shown = roman ?? name
    const what = `${iso} ${lang} ${name}${roman ? ` (${roman})` : ''}`
    // No free rounds: a name (or its Latin spelling) that is, or nearly is, an answer.
    if (variants(lang, shown).some(v => looksLikeAbroad(c, v))) { abroadDropped.close.push(what); continue }
    if (holdsAnswer(c, shown)) { abroadDropped.contains.push(what); continue }
    // The country's own name in a neighbouring language belongs to Native Names.
    const mine = [shown, name].map(squash).filter(Boolean)
    if (ALL_NATIVE[iso].some(v => mine.includes(squash(v)))) { abroadDropped.native.push(what); continue }
    // Another country's English name ("Dominika" is Dominica in Polish): a trap, not a clue.
    const other = CODES.find(o => o !== iso && answersOf(o).some(a => squash(a) === squash(shown)))
    if (other) { abroadDropped.clash.push(`${what} = ${COUNTRIES[other].country}`); continue }
    // A second opinion: the label must agree with that language's Wikipedia article title.
    const title = titleIn(iso, lang)
    if (!CONFIRMED.has(`${iso}:${lang}:${name}`) && (!title || foldName(bareTitle(title)) !== foldName(name))) {
      abroadDropped.title.push(`${iso} ${lang} label "${name}" / article "${title ?? '(none)'}"`)
      continue
    }
    const key = `${iso}\u0000${name}\u0000${roman ?? ''}`
    if (!abroadByKey.has(key)) abroadByKey.set(key, { country: iso, name, roman, langs: [] })
    abroadByKey.get(key).langs.push(lang)
  }
}
const abroadNames = [...abroadByKey.values()]
for (const n of abroadNames) {
  n.langs.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
  // Bokmål and Nynorsk spelling it alike is just "Norwegian".
  if (n.langs.includes('nb')) n.langs = n.langs.filter(l => l !== 'nn')
}

// ── Tiers, values and ranks ───────────────────────────────────────────────
// Countries Abroad: as Cities Abroad. How alike a name looks and sounds, half
// the spelling and half the consonants, against the English and alternatives.
const measure = (n, langsFam) => {
  const answers = answersOf(n.country)
  n.close = Math.max(...n.langs.flatMap(l => variants(l, n.roman ?? n.name)).map(v => 0.5 * closeness(answers, v) + 0.5 * soundCloseness(answers, v)))
  n.fam = n.roman ? NON_LATIN_FAM : Math.max(...n.langs.map(langsFam))
  n.fame = FAME[n.country]
  // Difficulty: mostly how far the name strays, then the language, then the country.
  n.diff = 0.55 * (1 - n.close) + 0.25 * (1 - n.fam) + 0.2 * (1 - n.fame)
  // How interesting the name is: far from the English, in an unexpected language.
  n.interest = 0.75 * (1 - n.close) + 0.25 * (1 - n.fam)
}
for (const n of abroadNames) measure(n, l => FAM[l])
// Easy: close to the English, in a language English speakers meet often, for a
// country most people know (Alemania). Medium: those languages straying
// further (Allemagne), or other languages staying close. Hard: other languages
// straying far (Saksa, Németország), and every other script.
function autoTier(n) {
  if (n.roman) return 'hard'
  if (n.fam >= 0.7) return n.close >= 0.55 && n.fame >= 0.2 ? 'easy' : 'medium'
  return n.close >= 0.45 ? 'medium' : 'hard'
}
const autoValue = n => (n.interest < 0.33 ? 10 : n.interest < 0.55 ? 20 : 30)
for (const n of abroadNames) {
  const key = `${n.country}:${n.name}`
  n.auto = autoTier(n)
  n.tier = TIER_OVERRIDES[key] ?? n.auto
  n.value = VALUE_OVERRIDES[key] ?? autoValue(n)
}

// Native Names: tiers by difficulty, the owner's examples set by hand. The
// spelling alone can't tell that Deutschland or España is common knowledge,
// so the country's fame weighs more here than in Countries Abroad.
const NATIVE_FAM = l => FAM[l] ?? 0.3
for (const n of nativeNames) {
  n.langs.sort((a, b) => (n.langs.length > 1 ? NATIVE_ORDER(a) - NATIVE_ORDER(b) : 0))
  measure(n, NATIVE_FAM)
  n.diff = 0.45 * (1 - n.close) + 0.2 * (1 - n.fam) + 0.35 * (1 - n.fame)
}
function NATIVE_ORDER(l) { const i = ORDER.indexOf(l); return i < 0 ? 999 : i }
const byDiff = [...nativeNames].sort((a, b) => a.diff - b.diff)
byDiff.forEach((n, i) => {
  const p = i / Math.max(1, byDiff.length - 1)
  n.auto = n.kept ? 'easy' : p < NATIVE_SPLIT[0] ? 'easy' : p < NATIVE_SPLIT[1] ? 'medium' : 'hard'
  n.tier = NATIVE_TIERS[`${n.country}:${n.name}`] ?? n.auto
  n.value = { easy: 10, medium: 20, hard: 30 }[n.tier]
})

// Rank: difficulty as a percentile inside the tier, so every tier runs 0 → 1.
function rankIn(names) {
  for (const t of ['easy', 'medium', 'hard']) {
    const pool = names.filter(n => n.tier === t).sort((a, b) => a.diff - b.diff)
    pool.forEach((n, i) => { n.rank = Math.round((i / Math.max(1, pool.length - 1)) * 100) / 100 })
  }
}
rankIn(abroadNames)
rankIn(nativeNames)

// ── Report ────────────────────────────────────────────────────────────────
function report(title, names) {
  const perLang = {}
  for (const n of names) for (const l of n.langs) perLang[l] = (perLang[l] ?? 0) + 1
  const countries = new Set(names.map(n => n.country)).size
  console.log(`${title}: ${names.length} names for ${countries} countries in ${Object.keys(perLang).length} languages`)
  for (const t of ['easy', 'medium', 'hard']) {
    const pool = names.filter(n => n.tier === t)
    console.log(`  ${t}: ${pool.length} names, ${new Set(pool.map(n => n.country)).size} countries, ${new Set(pool.map(n => n.langs[0])).size} first languages; values ${[10, 20, 30].map(v => `${v}×${pool.filter(n => n.value === v).length}`).join(' ')}`)
  }
  return perLang
}
console.log(`Wikidata snapshot ${raw.fetched}: ${raw.items.length} countries, ${raw.labels.length} labels`)
const abroadPerLang = report('Countries Abroad', abroadNames)
console.log(`  Dropped: ${abroadDropped.own} in the country's own languages, ${abroadDropped.close.length} spelled (nearly) like the English, ${abroadDropped.contains.length} holding the answer, ${abroadDropped.native.length} the country's own name, ${abroadDropped.clash.length} like another country's name, ${abroadDropped.title.length} not matching Wikipedia, ${abroadDropped.script.length} unexpected characters, ${abroadDropped.manual} by hand`)
console.log(`  Per language: ${ORDER.map(l => `${l} ${abroadPerLang[l] ?? 0}`).join(', ')}`)
const nativePerLang = report('Native Names', nativeNames)
console.log(`  Dropped ${nativeDropped.close.length} spelled (nearly) like the English; kept on purpose: ${nativeNames.filter(n => n.kept).map(n => n.roman ?? n.name).join(', ')}`)
console.log(`  No label: ${nativeProblems.missing.join(', ') || 'none'}`)
console.log(`  No Latin spelling: ${nativeProblems.noRoman.join(', ') || 'none'}`)
if (nativeProblems.tableMismatch.length) console.log(`  Table out of date:\n    ${nativeProblems.tableMismatch.join('\n    ')}`)
if (DUMP) {
  console.log(`Countries Abroad, another country's name:\n  ${abroadDropped.clash.join('\n  ')}`)
  console.log(`Countries Abroad, holding the answer:\n  ${abroadDropped.contains.join('\n  ')}`)
  console.log(`Countries Abroad, the country's own name:\n  ${abroadDropped.native.join('\n  ')}`)
  console.log(`Countries Abroad, not matching Wikipedia:\n  ${abroadDropped.title.join('\n  ')}`)
  console.log(`Native Names, spelled like the English:\n  ${nativeDropped.close.join('\n  ')}`)
  for (const [title, names] of [['Countries Abroad', abroadNames], ['Native Names', nativeNames]]) {
    console.log(`── ${title}`)
    for (const n of [...names].sort((a, b) => a.tier.localeCompare(b.tier) || a.diff - b.diff))
      console.log(`${n.tier.padEnd(6)} ${n.auto !== n.tier ? '*' : ' '} ${n.value} d${n.diff.toFixed(2)} c${n.close.toFixed(2)} i${n.interest.toFixed(2)} f${n.fame.toFixed(2)} ${COUNTRIES[n.country].country} ← ${n.name}${n.roman ? ` (${n.roman})` : ''} [${n.langs.join(' ')}]`)
  }
}

// ── Write ─────────────────────────────────────────────────────────────────
const q = s => JSON.stringify(s)
function write(file, names, langNames, nonLatin, about) {
  const used = [...new Set(names.flatMap(n => n.langs))]
  const order = l => (ORDER.includes(l) ? ORDER.indexOf(l) : 1000 + used.indexOf(l))
  const usedLangs = used.sort((a, b) => order(a) - order(b))
  const lines = [...names]
    .sort((a, b) => COUNTRIES[a.country].country.localeCompare(COUNTRIES[b.country].country) || order(a.langs[0]) - order(b.langs[0]) || a.name.localeCompare(b.name))
    .map(n => `  n(${q(n.country)}, ${q(n.tier)}, ${n.value}, ${n.rank}, ${q(n.name)}, ${q(n.langs.join(' '))}${n.roman ? `, ${q(n.roman)}` : ''}),`)
  fs.writeFileSync(file, `// GENERATED by scripts/country-names/fetch.mjs from Wikidata (${raw.fetched}). Do not edit by hand:
// fix a name, tier or value in the script (or scripts/country-names/native-table.mjs) and run it again.
${about}
import type { CountryName } from "../utils/countryNames"
import type { Tier, Value } from "../utils/abroad"

export const LANGUAGES: Record<string, string> = {
${usedLangs.map(l => `  ${/^[a-z]+$/.test(l) ? l : q(l)}: ${q(langNames(l))},`).join('\n')}
}

/** Language codes whose names are not in the Latin alphabet (shown with a Latin spelling). */
export const NON_LATIN_LANGS = new Set<string>([${usedLangs.filter(nonLatin).map(q).join(', ')}])

// n(country code, tier, value, rank, name, languages, Latin spelling)
const n = (country: string, tier: Tier, value: Value, rank: number, name: string, langs: string, roman?: string): CountryName =>
  roman ? { country, name, roman, langs: langs.split(" "), tier, value, rank } : { country, name, langs: langs.split(" "), tier, value, rank }

export const NAMES: CountryName[] = [
${lines.join('\n')}
]
`)
  console.log(`Wrote ${path.relative(ROOT, file)}`)
}
write(OUT_ABROAD, abroadNames, l => LANG_NAME[l], l => FAM[l] === undefined,
  `// Each name is the country's label in that language, checked against that language's Wikipedia.
// Names in other scripts carry a Latin spelling made by rule (scripts/cities-abroad/romanise.mjs).`)
const nativeLangName = l => LANG_NAMES[l] ?? LANG_NAME[l]
for (const n of nativeNames) for (const l of n.langs) if (!nativeLangName(l)) throw new Error(`No English name for language ${l}`)
write(OUT_NATIVE, nativeNames, nativeLangName, l => nativeNames.some(n => n.roman && n.langs.includes(l)),
  `// Each name is what the country calls itself in a national official language (Wikidata P37):
// its label in that language, or the everyday short form in native-table.mjs. Latin spellings are
// made by rule (scripts/cities-abroad/romanise.mjs) or come from the hand-checked table in
// scripts/country-names/native-table.mjs, which names each system.`)
