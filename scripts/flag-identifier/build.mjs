// Writes src/data/flagIdentify.ts (and the countries alone in
// flagIdentifyCountries.ts), the Flag Identifier's description of every
// flag it can find: the country flags from the hand-checked lines in
// checked.mjs, then the other flags (states and regions, cities, pride,
// movements, historical flags) from more.mjs, with names, kinds and images taken from the
// site's own data for them.
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/flag-identifier/build.mjs
//
// REPORT=1 also prints where the checked country lines differ from the draft
// that derive.mjs works out from the site's other flag data (flagAttribs.ts,
// flagPalettes.ts, flagSymbols.ts, the Flag Fusion layout families). Look at
// those after changing either side: most are deliberate (the draft can't tell
// light blue from blue by eye), a new one may be a mistake.
// scripts/flagidentifier.test.mjs fails if the file is out of date.
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { CHECKED } from './checked.mjs'
import { MORE } from './more.mjs'
import { CODEX_LINES } from './codex.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
export const OUT = path.join(ROOT, 'src/data/flagIdentify.ts')
export const COUNTRIES_OUT = path.join(ROOT, 'src/data/flagIdentifyCountries.ts')
const data = f => import(path.join(ROOT, 'src/data', f))
const { FLAGS } = await data('flags.ts')
const { SUB_FLAGS } = await data('subdivisions.ts')
const { US_CITY_FLAGS } = await data('usCityFlags.ts')
const { IDENTITY_FLAGS } = await data('identityFlags.ts')
const { HISTORICAL_FLAGS } = await data('historicalFlags.ts')
const { ETHNIC_FLAGS } = await data('ethnicFlags.ts')
const { EXTINCT_STATES } = await data('extinctStates.ts')
const { ORG_FLAGS } = await data('orgFlags.ts')
const { CODEX } = await data('codex.ts')
const { TERRITORIES } = await data('territories.ts')
const { UK_NATIONS } = await data('ukNations.ts')
const TERRITORY_BY_IMG = new Map(Object.values(TERRITORIES).flat().filter(t => t.flagUrl && !t.noFlag).map(t => [t.flagUrl, t]))
const { fp } = await data('flagUrl.ts')
const { stripFlagOf, splitParen } = await data('codexGalleries.ts')
const COUNTRY_NAME = new Map(FLAGS.map(f => [f.code, f.name]))
/** "the United States", "the Netherlands", "France". */
const theName = n => /^(United |Central African|Dominican|Czech|Democratic|Republic)|s$/.test(n)
  && !/^(Belarus|Cyprus|Laos|Mauritius|Barbados|Honduras|Paraguay|Seychelles|Kiribati|Saint .*)$/.test(n)
  ? `the ${n}` : n
/** A gallery name as the Codex shows it: no footnote marks or markup. */
const clean = s => s.replace(/<sup>.*?<\/sup>/g, '').replace(/'{2,}/g, '').replace(/\s+/g, ' ').trim()
/** Every gallery item by its file, with the region and group it's listed under. */
const byFile = regions => new Map(regions.flatMap(r => (r.groups ?? [{ label: '', items: r.items }])
  .flatMap(g => g.items.map(it => [it.file, { ...it, region: r.region, group: g.label }]))))
const ETHNIC = byFile(ETHNIC_FLAGS), EXTINCT = byFile(EXTINCT_STATES), ORGS = byFile(ORG_FLAGS)
/** "Peoples of Europe" → "People, Europe" (the kind label under a people's flag). */
function peopleLabel(region) {
  if (/^Creole/.test(region)) return 'Creole people'
  if (/multiethnic/.test(region)) return 'Multicultural region'
  if (/^Historic/.test(region)) return 'Historic people'
  return `People, ${region.replace(/^Peoples of (the )?/, '').replace(/ \((indigenous|modern)\)$/, (_, k) => k === 'indigenous' ? ' (indigenous)' : '')}`
}
const { LAYOUTS, COLOURS, DETAILS, LAYOUT_DETAIL, IDENTIFY_CATEGORIES } = await import(path.join(ROOT, 'src/utils/flagIdentify.ts'))

const LAYOUT_IDS = new Set(LAYOUTS.map(l => l.id))
const COLOUR_IDS = new Set(COLOURS.map(c => c.id))
const DETAIL_IDS = new Set(DETAILS.map(d => d.id))
const KINDS = new Set(IDENTIFY_CATEGORIES.map(c => c.id))

/** One checked line → an entry, or throws on a word that isn't an id. */
export function parseLine(code, line) {
  const parts = line.split('/').map(s => s.trim().split(/\s+/).filter(Boolean))
  if (parts.length !== 3) throw new Error(`${code}: want "layouts / colours / details"`)
  const [lay, col, det] = parts
  const check = (ok, word, what) => { if (!ok) throw new Error(`${code}: "${word}" is not a ${what}`) }
  const layouts = lay.map(w => (check(LAYOUT_IDS.has(w), w, 'layout'), w))
  if (!layouts.length) throw new Error(`${code}: no layout`)
  const colors = [], minorColors = []
  for (const w of col) {
    const minor = w.endsWith('?'), word = w.replace(/\?$/, '')
    for (const c of word.split('|')) check(COLOUR_IDS.has(c), c, 'colour')
    if (minor) { check(!word.includes('|'), word, 'single minor colour'); minorColors.push(word) }
    else colors.push(word)
  }
  if (!colors.length) throw new Error(`${code}: no main colour`)
  const details = [], minorDetails = []
  for (const w of det) {
    const minor = w.endsWith('?'), word = w.replace(/\?$/, '')
    check(DETAIL_IDS.has(word), word, 'detail')
    ;(minor ? minorDetails : details).push(word)
  }
  for (const l of layouts) {
    const d = LAYOUT_DETAIL[l]
    if (d && !details.includes(d)) details.push(d)
  }
  const dup = [...colors.flatMap(c => c.split('|')), ...minorColors].find((c, i, all) => all.indexOf(c) !== i)
    ?? [...details, ...minorDetails].find((d, i, all) => all.indexOf(d) !== i)
  if (dup) throw new Error(`${code}: "${dup}" twice`)
  return { layouts, colors, minorColors, details, minorDetails }
}

// ── What kind of flag each source holds, and the label shown under its name ──

/** First-level divisions by country: what one is called. */
const SUB_LABEL = {
  US: 'US state', CA: 'Province of Canada', AU: 'State of Australia', DE: 'State of Germany',
  AT: 'State of Austria', ES: 'Region of Spain', CH: 'Canton of Switzerland', IT: 'Region of Italy',
  FR: 'Region of France', NL: 'Province of the Netherlands', BE: 'Province of Belgium',
  BR: 'State of Brazil', MX: 'State of Mexico', JP: 'Prefecture of Japan', AR: 'Province of Argentina',
  RU: 'Region of Russia', GB: 'Council area of the UK',
  CO: 'Department of Colombia', VE: 'State of Venezuela', PE: 'Region of Peru', EC: 'Province of Ecuador',
  SE: 'County of Sweden', BG: 'Province of Bulgaria', IE: 'County of Ireland', UA: 'Region of Ukraine',
  HR: 'County of Croatia', HU: 'County of Hungary', FI: 'Region of Finland', NO: 'County of Norway',
  EE: 'County of Estonia', PL: 'Province of Poland', CZ: 'Region of Czechia', SK: 'Region of Slovakia',
  LT: 'County of Lithuania', CL: 'Region of Chile', UY: 'Department of Uruguay', PY: 'Department of Paraguay',
  BO: 'Department of Bolivia', GT: 'Department of Guatemala', SV: 'Department of El Salvador',
  NI: 'Department of Nicaragua', HN: 'Department of Honduras', CR: 'Province of Costa Rica',
  PA: 'Province of Panama', DO: 'Province of the Dominican Republic', TH: 'Province of Thailand',
  KE: 'County of Kenya', RO: 'County of Romania', ID: 'Province of Indonesia', MD: 'District of Moldova',
  NG: 'State of Nigeria', EG: 'Governorate of Egypt', MN: 'Province of Mongolia', KR: 'Province of South Korea',
  MY: 'State of Malaysia', PW: 'State of Palau', PG: 'Province of Papua New Guinea', CV: 'Municipality of Cape Verde',
  LR: 'County of Liberia', ET: 'Region of Ethiopia', JE: 'Parish of Jersey', GG: 'Parish of Guernsey',
  AL: 'County of Albania', LI: 'Municipality of Liechtenstein', SM: 'Municipality of San Marino',
  SS: 'State of South Sudan', ME: 'Municipality of Montenegro', PT: 'District of Portugal', DK: 'Region of Denmark',
  GR: 'Region of Greece', MT: 'Region of Malta', LV: 'Region of Latvia', BA: 'Region of Bosnia and Herzegovina',
  BY: 'Region of Belarus', AD: 'Parish of Andorra', XK: 'District of Kosovo', LK: 'Province of Sri Lanka',
  SD: 'State of Sudan', SB: 'Province of the Solomon Islands', VU: 'Province of Vanuatu', MM: 'State of Myanmar',
  AE: 'Emirate of the UAE', PK: 'Province of Pakistan', FM: 'State of Micronesia', KM: 'Island of the Comoros',
  IQ: 'Region of Iraq',
}
const SUB_LABEL_ONE = {
  'us-dc': 'US capital', 'us-pr': 'US territory', 'us-gu': 'US territory', 'us-vi': 'US territory',
  'us-as': 'US territory', 'us-mp': 'US territory',
  'ca-nt': 'Territory of Canada', 'ca-nu': 'Territory of Canada', 'ca-yt': 'Territory of Canada',
  'au-act': 'Territory of Australia', 'au-nt': 'Territory of Australia',
  'es-ce': 'Autonomous city of Spain', 'es-me': 'Autonomous city of Spain',
  'fr-gua': 'Overseas region of France', 'fr-guy': 'Overseas region of France', 'fr-lre': 'Overseas region of France',
  'fr-may': 'Overseas region of France', 'fr-mq': 'Overseas region of France',
  'be-bru': 'Region of Belgium', 'br-df': 'Federal district of Brazil', 'mx-cmx': 'Capital of Mexico',
  'ar-c': 'Capital of Argentina',
}
/** identityFlags.ts categories → kind and label. */
const IDENTITY_KIND = {
  'Pride & LGBTQ+': ['identity', 'Pride'],
  'Pan-National & Ethnic': ['identity', 'People or pan-national'],
  'Indigenous Peoples': ['identity', 'Indigenous people'],
  'Separatist & Autonomous': ['movement', 'Separatist or regional'],
  'Civic & Ideological': ['movement', 'Movement or cause'],
  Micronations: ['movement', 'Micronation'],
}

/** The first sentence of a long note: the row shows it, and links to the page with the rest. */
const firstSentence = s => (s.match(/^.*?[.!?](?=\s+[A-Z"'(]|$)/s)?.[0] ?? s).trim()

// Same as slug() in scripts/prerender.mjs, which makes the /identity/<category>/ pages.
const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
/** A stable id for a gallery flag: its name, plus a short hash of its file so two names never meet. */
const fileId = (name, file) => `${slug(name).slice(0, 40) || 'flag'}-${createHash('sha1').update(file).digest('hex').slice(0, 6)}`

/** A more.mjs key → the flag's name, kind, label, image, note and page from the site's data. */
function source(key) {
  const [src, id] = key.split(/:(.*)/s)
  if (src === 'sub') {
    const s = SUB_FLAGS.find(x => x.code === id)
    if (!s) throw new Error(`${key}: no such subdivision`)
    return { code: s.code, name: s.name, category: 'region', label: SUB_LABEL_ONE[s.code] ?? SUB_LABEL[s.countryCode] ?? `Region of ${s.countryName}`, img: s.flagUrl }
  }
  if (src === 'city') {
    const c = US_CITY_FLAGS.find(x => x.id === id)
    if (!c) throw new Error(`${key}: no such US city flag`)
    return { code: `city-${c.id}`, name: c.name, category: 'city', label: `US city, ${c.state}`, img: c.flagUrl, note: c.note }
  }
  if (src === 'id') {
    const f = IDENTITY_FLAGS.find(x => x.id === id)
    if (!f) throw new Error(`${key}: no such identity flag`)
    const kind = IDENTITY_KIND[f.category]
    if (!kind) throw new Error(`${key}: no kind for "${f.category}"`)
    return {
      code: `flag-${f.id}`, name: f.name, category: kind[0], label: kind[1], img: f.flagUrl, note: f.note,
      href: `/identity/${slug(f.category)}/#${f.id}`,   // its entry on the identity flags pages (prerender.mjs)
    }
  }
  if (src === 'hist') {
    const h = HISTORICAL_FLAGS.find(x => x.id === id)
    if (!h) throw new Error(`${key}: no such historical flag`)
    return {
      code: `hist-${h.id}`, name: h.name, category: 'historical', label: `Historical, ${h.era}`, img: h.flagUrl, note: firstSentence(h.note),
      href: `/historical/${slug(h.region)}/#${h.id}`,   // its entry on the historical flags pages (prerender.mjs)
    }
  }
  if (src === 'eth') {
    const it = ETHNIC.get(id)
    if (!it) throw new Error(`${key}: no such ethnic flag`)
    // A people's flag that is a territory's own flag (Gibraltarians, Bermudians)
    // goes under the territory, the name people look it up by.
    const t = TERRITORY_BY_IMG.get(fp(it.file))
    if (t) return { code: `terr-${slug(t.name)}`, name: t.name, category: 'region', label: t.status, img: t.flagUrl, note: t.note }
    return { code: `eth-${fileId(clean(it.name), id)}`, name: clean(it.name), category: 'identity', label: peopleLabel(it.region), img: fp(it.file) }
  }
  if (src === 'ext') {
    const it = EXTINCT.get(id)
    if (!it) throw new Error(`${key}: no such extinct state`)
    return { code: `ext-${fileId(stripFlagOf(splitParen(clean(it.name))[0]), id)}`, name: stripFlagOf(splitParen(clean(it.name))[0]), category: 'historical', label: 'Former state', img: fp(it.file) }
  }
  if (src === 'org') {
    const it = ORGS.get(id)
    if (!it) throw new Error(`${key}: no such organisation flag`)
    const label = /sport/i.test(it.region) ? 'Sports federation' : /former/i.test(it.region) ? 'Former organization' : 'International organization'
    return { code: `org-${fileId(stripFlagOf(clean(it.name)), id)}`, name: stripFlagOf(clean(it.name)), category: 'organization', label, img: fp(it.file) }
  }
  if (src === 'cx') {
    const [code, label] = id.split(/:(.*)/s)
    const h = CODEX[code]?.flagHistory.flatMap(x => [x, ...(x.parallel ?? [])]).find(x => x.label === label)
    if (!h) throw new Error(`${key}: no such flag in ${code}'s history`)
    return {
      code: `cx-${code.toLowerCase()}-${slug(label)}`, name: h.label, category: 'historical',
      label: `Former flag of ${theName(COUNTRY_NAME.get(code) ?? code)}`, img: h.flagUrl, note: firstSentence(h.note), href: `/flags/${code.toLowerCase()}/`,
    }
  }
  if (src === 'terr') {
    const [code, name] = id.split(/:(.*)/s)
    const t = TERRITORIES[code]?.find(x => x.name === name)
    if (!t || !t.flagUrl || t.noFlag) throw new Error(`${key}: no such territory flag`)
    return { code: `terr-${slug(name)}`, name: t.name, category: 'region', label: `${t.status}`, img: t.flagUrl, note: t.note }
  }
  if (src === 'uk') {
    const [nation, label] = id.split(/:(.*)/s)
    const h = UK_NATIONS.find(n => n.name === nation)?.flagHistory.find(x => x.label === label)
    if (!h) throw new Error(`${key}: no such flag in ${nation}'s history`)
    return { code: `uk-${slug(nation)}-${slug(label)}`, name: h.label, category: 'historical', label: `Historic flag of ${nation}`, img: h.flagUrl, note: h.note }
  }
  throw new Error(`${key}: unknown source "${src}"`)
}

const LINES = { ...MORE, ...CODEX_LINES }
const twice = Object.keys(CODEX_LINES).filter(k => k in MORE)
if (twice.length) throw new Error(`in both more.mjs and codex.mjs: ${twice.join(', ')}`)

function moreEntry(key) {
  const value = LINES[key]
  const [line, over = {}] = Array.isArray(value) ? value : [value]
  const unknown = Object.keys(over).filter(k => !['name', 'kind', 'label', 'also'].includes(k))
  if (unknown.length) throw new Error(`${key}: unknown option ${unknown.join(', ')}`)
  const base = source(key)
  const category = over.kind ?? base.category
  const also = over.also ?? []
  for (const k of [category, ...also]) if (!KINDS.has(k)) throw new Error(`${key}: "${k}" is not a kind`)
  if (also.includes(category)) throw new Error(`${key}: also "${category}", its own kind`)
  if (!base.img) throw new Error(`${key}: no image in the source data`)
  return {
    code: base.code, name: over.name ?? base.name, category, ...(also.length ? { also } : {}),
    label: over.label ?? base.label, img: base.img, ...(base.note ? { note: base.note } : {}),
    ...(base.href ? { href: base.href } : {}), ...parseLine(key, line),
  }
}

export function entries() {
  const missing = FLAGS.filter(f => !CHECKED[f.code]).map(f => f.code)
  if (missing.length) throw new Error(`no line in checked.mjs for ${missing.join(', ')}`)
  const extra = Object.keys(CHECKED).filter(c => !FLAGS.some(f => f.code === c))
  if (extra.length) throw new Error(`checked.mjs has lines for unknown codes: ${extra.join(', ')}`)
  const countries = FLAGS.map(f => ({ code: f.code, name: f.name, category: 'country', label: 'Country', ...parseLine(f.code, CHECKED[f.code]) }))
  const all = [...countries, ...Object.keys(LINES).map(moreEntry)]
  // One entry per flag: a code or an image twice means the same flag was added twice.
  for (const field of ['code', 'img']) {
    const seen = new Map()
    for (const e of all) {
      if (!e[field]) continue
      if (seen.has(e[field])) throw new Error(`${e.name} and ${seen.get(e[field])} share the ${field} ${e[field]}`)
      seen.set(e[field], e.name)
    }
  }
  // Grouped by kind, in the order of IDENTIFY_CATEGORIES (more.mjs order within each).
  return IDENTIFY_CATEGORIES.flatMap(c => all.filter(e => e.category === c.id))
}

// TypeScript gives up on one array literal this long ("union type that is too
// complex", TS2590), so the rows go in typed blocks of at most this many, by kind.
const BLOCK = 150
const HEADER = `// Generated by scripts/flag-identifier/build.mjs from the hand-checked lines in
// scripts/flag-identifier/checked.mjs (countries) and more.mjs (every other
// kind of flag). Do not edit by hand: change a line there and run the script
// again. How the Flag Identifier reads these is in src/utils/flagIdentify.ts.
`
const block = (name, rows) => `const ${name}: IdentifyEntry[] = [
${rows.map(e => `  ${JSON.stringify(e)},`).join('\n')}
]`

// Every other flag is written as one short call per row, f(code, name, kind,
// label, img, "layouts", "colours", "small colours", "details", "small
// details", { also, note, href }), with the word lists space-separated:
// about half the size of the same rows as objects, for 3,000+ flags.
const words = xs => xs.join(' ')
const compact = e => {
  const extra = Object.fromEntries(['also', 'note', 'href'].filter(k => e[k]).map(k => [k, e[k]]))
  const args = [e.code, e.name, e.category, e.label, e.img ?? '', words(e.layouts), words(e.colors), words(e.minorColors), words(e.details), words(e.minorDetails)]
  return `  f(${args.map(a => JSON.stringify(a)).join(',')}${Object.keys(extra).length ? `,${JSON.stringify(extra)}` : ''}),`
}
const compactBlock = (name, rows) => `const ${name}: IdentifyEntry[] = [
${rows.map(compact).join('\n')}
]`

function blocks(rows, prefix) {
  const out = []
  for (let i = 0; i < rows.length; i += BLOCK) out.push([`${prefix}_${out.length + 1}`, rows.slice(i, i + BLOCK)])
  return out
}

/** The generated files: the country flags on their own (Flag DNA needs only
 *  those, so it doesn't load the rest), and every flag. */
export function render() {
  const all = entries()
  const countries = blocks(all.filter(e => e.category === 'country'), 'COUNTRY')
  const others = IDENTIFY_CATEGORIES.filter(c => c.id !== 'country')
    .flatMap(c => blocks(all.filter(e => e.category === c.id), c.id.toUpperCase()))
  return {
    [COUNTRIES_OUT]: `${HEADER}import type { IdentifyEntry } from "../utils/flagIdentify"

${countries.map(([n, rows]) => block(n, rows)).join('\n\n')}

/** The country flags only, in the order of data/flags.ts. */
export const IDENTIFY_COUNTRIES: IdentifyEntry[] = [${countries.map(([n]) => `...${n}`).join(', ')}]
`,
    [OUT]: `${HEADER}import type { IdentifyEntry, IdentifyCategory } from "../utils/flagIdentify"
import { IDENTIFY_COUNTRIES } from "./flagIdentifyCountries"

const list = (s: string) => (s ? s.split(" ") : []) as never[]
/** One flag, from the compact row build.mjs writes (see there). */
function f(code: string, name: string, category: IdentifyCategory, label: string, img: string,
  layouts: string, colors: string, minorColors: string, details: string, minorDetails: string,
  extra: Pick<IdentifyEntry, "also" | "note" | "href"> = {}): IdentifyEntry {
  return {
    code, name, category, label, ...(img ? { img } : {}), ...extra, layouts: list(layouts), colors: list(colors),
    minorColors: list(minorColors), details: list(details), minorDetails: list(minorDetails),
  }
}

${others.map(([n, rows]) => compactBlock(n, rows)).join('\n\n')}

/** Every flag the identifier searches: countries first, then each kind in turn. */
export const IDENTIFY_FLAGS: IdentifyEntry[] = [
  ...IDENTIFY_COUNTRIES,
${others.map(([n]) => `  ...${n},`).join('\n')}
]
`,
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const all = entries()
  for (const [file, text] of Object.entries(render())) fs.writeFileSync(file, text)
  // World city flags (src/data/cityFlags.ts, from another branch) aren't described yet.
  if (fs.existsSync(path.join(ROOT, 'src/data/cityFlags.ts'))) {
    console.log('[flag-identifier] src/data/cityFlags.ts is here: add a wcity: source above and describe its flags in codex.mjs')
  }
  const counts = IDENTIFY_CATEGORIES.map(c => `${all.filter(e => e.category === c.id).length} ${c.id}`).join(', ')
  console.log(`[flag-identifier] wrote ${path.relative(ROOT, OUT)} and ${path.relative(ROOT, COUNTRIES_OUT)} (${all.length} flags: ${counts})`)
  if (process.env.REPORT) {
    const { deriveDraft } = await import('./derive.mjs')
    const fmt = xs => xs.length ? xs.join(' ') : '-'
    for (const e of all.filter(x => x.category === 'country')) {
      const d = deriveDraft(e.code)
      const diffs = []
      const cmp = (label, mine, theirs) => {
        const add = mine.filter(x => !theirs.includes(x)), drop = theirs.filter(x => !mine.includes(x))
        if (add.length || drop.length) diffs.push(`${label} +${fmt(add)} -${fmt(drop)}`)
      }
      cmp('layouts', e.layouts, d.layouts)
      cmp('colours', [...e.colors.flatMap(c => c.split('|')), ...e.minorColors], [...d.colors, ...d.minorColors])
      cmp('details', [...e.details, ...e.minorDetails], [...d.details, ...d.minorDetails])
      if (diffs.length) console.log(`${e.code}  ${diffs.join(' · ')}`)
    }
  }
}
