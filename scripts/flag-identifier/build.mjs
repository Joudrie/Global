// Writes src/data/flagIdentify.ts, the Flag Identifier's description of every
// flag it can find: the country flags from the hand-checked lines in
// checked.mjs, then the other flags (states and regions, cities, pride,
// movements) from more.mjs, with names, kinds and images taken from the
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
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { CHECKED } from './checked.mjs'
import { MORE } from './more.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
export const OUT = path.join(ROOT, 'src/data/flagIdentify.ts')
const data = f => import(path.join(ROOT, 'src/data', f))
const { FLAGS } = await data('flags.ts')
const { SUB_FLAGS } = await data('subdivisions.ts')
const { US_CITY_FLAGS } = await data('usCityFlags.ts')
const { IDENTITY_FLAGS } = await data('identityFlags.ts')
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
  BR: 'State of Brazil', MX: 'State of Mexico', JP: 'Prefecture of Japan',
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

// Same as slug() in scripts/prerender.mjs, which makes the /identity/<category>/ pages.
const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

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
  throw new Error(`${key}: unknown source "${src}"`)
}

function moreEntry(key) {
  const value = MORE[key]
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
  const all = [...countries, ...Object.keys(MORE).map(moreEntry)]
  // One entry per flag: a code or an image twice means the same flag was added twice.
  for (const field of ['code', 'img']) {
    const seen = new Map()
    for (const e of all) {
      if (!e[field]) continue
      if (seen.has(e[field])) throw new Error(`${e.name} and ${seen.get(e[field])} share the ${field} ${e[field]}`)
      seen.set(e[field], e.name)
    }
  }
  return all
}

export function render() {
  const rows = entries().map(e => `  ${JSON.stringify(e)},`)
  return `// Generated by scripts/flag-identifier/build.mjs from the hand-checked lines in
// scripts/flag-identifier/checked.mjs (countries) and more.mjs (every other
// kind of flag). Do not edit by hand: change a line there and run the script
// again. How the Flag Identifier reads these is in src/utils/flagIdentify.ts.
import type { IdentifyEntry } from "../utils/flagIdentify"

export const IDENTIFY_FLAGS: IdentifyEntry[] = [
${rows.join('\n')}
]
`
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const all = entries()
  fs.writeFileSync(OUT, render())
  const counts = IDENTIFY_CATEGORIES.map(c => `${all.filter(e => e.category === c.id).length} ${c.id}`).join(', ')
  console.log(`[flag-identifier] wrote ${path.relative(ROOT, OUT)} (${all.length} flags: ${counts})`)
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
