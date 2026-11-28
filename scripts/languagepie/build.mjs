// Spoken Here: builds src/data/languageShares.ts from the hand-checked input
// (countries.mjs) and checks it against every other source it has cached.
//
//   node scripts/languagepie/build.mjs [--offline] [--refresh] [--out <file.ts>] [--report <file.md>] [--table <file.md>]
//
// Checks, for every country:
//   - the CIA World Factbook's "Languages" field (public domain; the
//     factbook/factbook.json mirror on GitHub): each named language's share,
//     after leaving out "unspecified" on both sides, within DIFF points
//   - the Pew Research Center's 2019 survey (cache/pew2019.json), for the 16
//     European countries it asked
//   - the Wikipedia page the figures were read from: every figure must appear on it
// A country "has two sources" when the Factbook or Pew agrees with it, or when
// its figures are the Factbook's and the Wikipedia page gives them too.
// Disagreements, missing figures, and the countries left out go to report.md.
//
// Then the pies: "Not stated" is left out (the shares become shares of those
// who answered), languages under MIN_SLICE% go into Other, at most MAX_NAMED
// named slices. Easy and medium are chosen by hand (MEDIUM in countries.mjs);
// hard takes every pie whose nearest neighbour, by total variation distance
// between the family slices, is at least HARD_NN points away.
//
// Everything fetched is kept in scripts/languagepie/cache/ (only the parts
// used), so the build runs offline; --refresh fetches it all again.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { COUNTRIES, LEFT_OUT, MEDIUM } from './countries.mjs'
import { GROUPS, groupOf, familyLine } from './families.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const CACHE = path.join(ROOT, 'scripts/languagepie/cache')
const args = process.argv.slice(2)
const OFFLINE = args.includes('--offline')
const REFRESH = args.includes('--refresh')
const argOf = (flag, fallback) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback)
const OUT = path.resolve(argOf('--out', path.join(ROOT, 'src/data/languageShares.ts')))
const REPORT = path.resolve(argOf('--report', path.join(ROOT, 'scripts/languagepie/report.md')))
const TABLE = argOf('--table', null)
const UA = 'GlobalioBuild/1.0 (https://globalio.app)'
const sleep = ms => new Promise(r => setTimeout(r, ms))

export const MIN_SLICE = 3     // named slices are at least this share
export const MAX_NAMED = 6     // and at most this many
const DIFF = 3                 // points two sources may differ by and still agree
const HARD_NN = 6              // a pie this far from every other by family alone can be played on hard

// ── The countries ─────────────────────────────────────────────────────────
const flagsTs = fs.readFileSync(path.join(ROOT, 'src/data/flags.ts'), 'utf8')
const FLAGS = [...flagsTs.matchAll(/f\('([A-Z]{2})','((?:[^'\\]|\\.)*)','([^']+)'/g)].map(m => ({ code: m[1], name: m[2].replace(/\\'/g, "'"), region: m[3] }))
const NAME = Object.fromEntries(FLAGS.map(f => [f.code, f.name]))
const problems = []
for (const f of FLAGS) {
  if (!COUNTRIES[f.code] && !LEFT_OUT[f.code]) problems.push(`${f.code} (${f.name}) is neither in COUNTRIES nor in LEFT_OUT`)
  if (COUNTRIES[f.code] && LEFT_OUT[f.code]) problems.push(`${f.code} is both in COUNTRIES and LEFT_OUT`)
}
for (const c of [...Object.keys(COUNTRIES), ...Object.keys(LEFT_OUT)]) if (!NAME[c]) problems.push(`${c} is not a country in flags.ts`)

const KINDS = ['census', 'survey', 'register', 'estimate']
const MEASURES = ['mother', 'first', 'home', 'main', 'everyday', 'household', 'spoken']
for (const [c, e] of Object.entries(COUNTRIES)) {
  if (!KINDS.includes(e.kind)) problems.push(`${c}: kind ${e.kind}`)
  if (!MEASURES.includes(e.measure)) problems.push(`${c}: measure ${e.measure}`)
  if (!(e.year >= 1990 && e.year <= 2026)) problems.push(`${c}: year ${e.year}`)
  if (!e.src?.[0] || !/^https?:\/\//.test(e.src?.[1] ?? '')) problems.push(`${c}: src needs a name and a link`)
  for (const name of Object.keys(e.s)) if (!groupOf(name)) problems.push(`${c}: "${name}" has no family in families.mjs`)
  const total = Object.values(e.s).reduce((a, b) => a + b, 0)
  if (!e.multi && Math.abs(total - 100) > 1.5) problems.push(`${c}: shares add up to ${total.toFixed(1)}, not 100 (set multi if people could name several)`)
  if (e.multi && total <= 100) problems.push(`${c}: multi, but the shares add up to ${total.toFixed(1)}`)
  const vals = Object.entries(e.s).filter(([n]) => !/^(Other\b|Not stated$)/.test(n)).map(([, v]) => v)
  if (vals.some((v, i) => i && v > vals[i - 1])) problems.push(`${c}: list the languages largest first`)
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1) }

// ── Cached sources ────────────────────────────────────────────────────────
const readJson = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return fallback } }
const writeJson = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 1) + '\n')

// The Factbook mirror names its files by the old FIPS 10-4 codes.
const FIPS = {
  AL:'europe/al',AD:'europe/an',AT:'europe/au',BY:'europe/bo',BE:'europe/be',BA:'europe/bk',BG:'europe/bu',HR:'europe/hr',CY:'europe/cy',CZ:'europe/ez',DK:'europe/da',EE:'europe/en',FI:'europe/fi',FR:'europe/fr',DE:'europe/gm',GR:'europe/gr',HU:'europe/hu',IS:'europe/ic',IE:'europe/ei',IT:'europe/it',XK:'europe/kv',LV:'europe/lg',LI:'europe/ls',LT:'europe/lh',LU:'europe/lu',MT:'europe/mt',MD:'europe/md',MC:'europe/mn',ME:'europe/mj',NL:'europe/nl',MK:'europe/mk',NO:'europe/no',PL:'europe/pl',PT:'europe/po',RO:'europe/ro',RU:'central-asia/rs',SM:'europe/sm',RS:'europe/ri',SK:'europe/lo',SI:'europe/si',ES:'europe/sp',SE:'europe/sw',CH:'europe/sz',UA:'europe/up',GB:'europe/uk',VA:'europe/vt',
  DZ:'africa/ag',AO:'africa/ao',BJ:'africa/bn',BW:'africa/bc',BF:'africa/uv',BI:'africa/by',CM:'africa/cm',CV:'africa/cv',CF:'africa/ct',TD:'africa/cd',KM:'africa/cn',CG:'africa/cf',CD:'africa/cg',CI:'africa/iv',DJ:'africa/dj',EG:'africa/eg',GQ:'africa/ek',ER:'africa/er',SZ:'africa/wz',ET:'africa/et',GA:'africa/gb',GM:'africa/ga',GH:'africa/gh',GN:'africa/gv',GW:'africa/pu',KE:'africa/ke',LS:'africa/lt',LR:'africa/li',LY:'africa/ly',MG:'africa/ma',MW:'africa/mi',ML:'africa/ml',MR:'africa/mr',MU:'africa/mp',MA:'africa/mo',MZ:'africa/mz',NA:'africa/wa',NE:'africa/ng',NG:'africa/ni',RW:'africa/rw',ST:'africa/tp',SN:'africa/sg',SC:'africa/se',SL:'africa/sl',SO:'africa/so',ZA:'africa/sf',SS:'africa/od',SD:'africa/su',TZ:'africa/tz',TG:'africa/to',TN:'africa/ts',UG:'africa/ug',ZM:'africa/za',ZW:'africa/zi',
  AF:'south-asia/af',AM:'central-asia/am',AZ:'central-asia/aj',BD:'south-asia/bg',BT:'south-asia/bt',BN:'east-n-southeast-asia/bx',KH:'east-n-southeast-asia/cb',CN:'east-n-southeast-asia/ch',GE:'central-asia/gg',IN:'south-asia/in',ID:'east-n-southeast-asia/id',JP:'east-n-southeast-asia/ja',KZ:'central-asia/kz',KG:'central-asia/kg',LA:'east-n-southeast-asia/la',MY:'east-n-southeast-asia/my',MV:'south-asia/mv',MN:'east-n-southeast-asia/mg',MM:'east-n-southeast-asia/bm',NP:'south-asia/np',KP:'east-n-southeast-asia/kn',PK:'south-asia/pk',PH:'east-n-southeast-asia/rp',SG:'east-n-southeast-asia/sn',LK:'south-asia/ce',KR:'east-n-southeast-asia/ks',TW:'east-n-southeast-asia/tw',TJ:'central-asia/ti',TH:'east-n-southeast-asia/th',TL:'east-n-southeast-asia/tt',TM:'central-asia/tx',UZ:'central-asia/uz',VN:'east-n-southeast-asia/vm',
  BH:'middle-east/ba',IR:'middle-east/ir',IQ:'middle-east/iz',IL:'middle-east/is',JO:'middle-east/jo',KW:'middle-east/ku',LB:'middle-east/le',OM:'middle-east/mu',PS:'middle-east/we',QA:'middle-east/qa',SA:'middle-east/sa',SY:'middle-east/sy',TR:'middle-east/tu',AE:'middle-east/ae',YE:'middle-east/ym',
  AG:'central-america-n-caribbean/ac',AR:'south-america/ar',BS:'central-america-n-caribbean/bf',BB:'central-america-n-caribbean/bb',BZ:'central-america-n-caribbean/bh',BO:'south-america/bl',BR:'south-america/br',CA:'north-america/ca',CL:'south-america/ci',CO:'south-america/co',CR:'central-america-n-caribbean/cs',CU:'central-america-n-caribbean/cu',DM:'central-america-n-caribbean/do',DO:'central-america-n-caribbean/dr',EC:'south-america/ec',SV:'central-america-n-caribbean/es',GD:'central-america-n-caribbean/gj',GT:'central-america-n-caribbean/gt',GY:'south-america/gy',HT:'central-america-n-caribbean/ha',HN:'central-america-n-caribbean/ho',JM:'central-america-n-caribbean/jm',MX:'north-america/mx',NI:'central-america-n-caribbean/nu',PA:'central-america-n-caribbean/pm',PY:'south-america/pa',PE:'south-america/pe',KN:'central-america-n-caribbean/sc',LC:'central-america-n-caribbean/st',VC:'central-america-n-caribbean/vc',SR:'south-america/ns',TT:'central-america-n-caribbean/td',US:'north-america/us',UY:'south-america/uy',VE:'south-america/ve',
  AU:'australia-oceania/as',FJ:'australia-oceania/fj',KI:'australia-oceania/kr',MH:'australia-oceania/rm',FM:'australia-oceania/fm',NR:'australia-oceania/nr',NZ:'australia-oceania/nz',PW:'australia-oceania/ps',PG:'east-n-southeast-asia/pp',WS:'australia-oceania/ws',SB:'australia-oceania/bp',TO:'australia-oceania/tn',TV:'australia-oceania/tv',VU:'australia-oceania/nh',
}

async function getFactbook() {
  const file = path.join(CACHE, 'factbook.json')
  const cached = readJson(file, null)
  if (cached && !REFRESH) return cached.countries
  if (OFFLINE) throw new Error('No Factbook cache: run without --offline once')
  const out = {}
  for (const f of FLAGS) {
    const url = `https://raw.githubusercontent.com/factbook/factbook.json/master/${FIPS[f.code]}.json`
    const r = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!r.ok) throw new Error(`${url}: ${r.status}`)
    const d = await r.json()
    const L = d['People and Society']?.Languages ?? {}
    const note = typeof L.note === 'string' ? L.note : L.note?.text ?? ''
    out[f.code] = { file: `${FIPS[f.code]}.json`, text: L.text ?? L.Languages?.text ?? '', note }
    await sleep(250)
  }
  writeJson(file, { from: 'https://github.com/factbook/factbook.json', fetched: new Date().toISOString().slice(0, 10), countries: out })
  return out
}

// The numbers on each Wikipedia page used ("62.3", "22.8"…): enough to check
// a figure was transcribed right, without keeping the pages.
const numbersOn = wikitext => [...new Set((wikitext.replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').match(/\d+(?:\.\d+)?/g) ?? []))].filter(n => +n <= 100).sort()
async function getWiki() {
  const file = path.join(CACHE, 'wikipedia.json')
  const cached = readJson(file, { pages: {} })
  const want = [...new Set(Object.values(COUNTRIES).map(e => e.wiki).filter(Boolean))]
  const missing = want.filter(t => REFRESH || !cached.pages[t])
  if (missing.length && OFFLINE) throw new Error(`No Wikipedia cache for ${missing.join(', ')}: run without --offline once`)
  for (let i = 0; i < missing.length; i += 20) {
    const batch = missing.slice(i, i + 20)
    const u = 'https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content|ids&rvslots=main&redirects=1&format=json&formatversion=2&titles=' + encodeURIComponent(batch.join('|'))
    const j = await (await fetch(u, { headers: { 'User-Agent': UA } })).json()
    const back = {}
    for (const n of j.query.normalized ?? []) back[n.to] = n.from
    for (const r of j.query.redirects ?? []) back[r.to] = back[r.from] ?? r.from
    for (const p of j.query.pages) {
      const asked = back[p.title] ?? p.title
      if (p.missing) throw new Error(`Wikipedia has no page "${asked}"`)
      const rev = p.revisions[0]
      cached.pages[asked] = { title: p.title, revision: rev.revid, numbers: numbersOn(rev.slots.main.content) }
    }
    await sleep(1000)
  }
  if (missing.length) writeJson(file, cached)
  return cached.pages
}

const factbook = await getFactbook()
const wiki = await getWiki()
const pew = readJson(path.join(CACHE, 'pew2019.json'), { countries: {} })

// ── Reading the Factbook's field ──────────────────────────────────────────
const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/&ccedil;/g, 'ç').replace(/&ocirc;/g, 'ô').replace(/&eacute;/g, 'é').replace(/<[^>]+>/g, '')
function splitTop(s) {
  const out = []; let depth = 0, cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth = Math.max(0, depth - 1)
    if (depth === 0 && (ch === ',' || ch === ';')) { out.push(cur); cur = ''; continue }
    cur += ch
  }
  return [...out, cur].map(x => x.trim()).filter(Boolean)
}
export function parseFactbook(text) {
  const t = decode(text)
  const ym = [...t.matchAll(/\((\d{4})\s*(?:est\.?)?\)/g)].pop()
  const body = ym ? t.slice(0, ym.index) + t.slice(ym.index + ym[0].length) : t
  const items = []
  for (const part of splitTop(body)) {
    let depth = 0, at = -1
    for (let i = 0; i < part.length; i++) {
      if (part[i] === '(') depth++
      else if (part[i] === ')') depth--
      else if (depth === 0 && /\d/.test(part[i]) && /^\d+(?:\.\d+)?\s*%/.test(part.slice(i)) && !/[\d.]/.test(part[i - 1] ?? '')) { at = i; break }
    }
    if (at < 0) continue
    const pct = parseFloat(part.slice(at))
    const name = (part.slice(0, at) + ' ' + part.slice(at).replace(/^\d+(?:\.\d+)?\s*%/, '')).replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim()
    items.push({ name, pct, lt: /(<|less than)\s*$/.test(part.slice(0, at)) })
  }
  return { year: ym ? +ym[1] : null, items }
}
// Names the Factbook spells differently.
const FB_ALIASES = {
  Spanish: ['castilian'], Bengali: ['bangla'], Kurdish: ['kurmanji'], Mooré: ['mossi'], Tswana: ['setswana'], Kalanga: ['sekalanga'],
  Kgalagadi: ['shekgalagadi'], Mbukushu: ['sembukushu'], Shona: ['zezuru'], Zulu: ['isizulu'], Xhosa: ['isixhosa'], Sepedi: ['pedi'],
  Sotho: ['sesotho'], Tsonga: ['xitsonga'], Swati: ['siswati'], Venda: ['tshivenda'], Ndebele: ['isindebele'], Romani: ['roma'],
  Tigrinya: ['tigrigna'], Oshiwambo: ['oshiwambo'], Khoekhoegowab: ['nama/damara'], Otjiherero: ['herero'], Rukwangali: ['kavango'],
  Lozi: ['zambezi'], Nepali: ['lhotshamkha'], Sharchop: ['sharchopkha'], Dari: ['dari'], Uzbek: ['uzbeki'], Turkmen: ['turkmani'],
  Romanian: ['moldovan/romanian'], 'Mauritian Creole': ['creole'], 'Seychellois Creole': ['seychellois creole'], 'Belizean Creole': ['creole'],
  Maya: ['maya'], Tetum: ['tetun prasa'], Cebuano: ['bisaya/binisaya'], Maithili: ['maithali'], Newar: ['nepalbhasha'], Magar: ['magar'],
  Yazidi: ['ezidian'], 'Cape Verdean Creole': ['cabo verdian'], Chinese: ['chinese'], 'Other Chinese': ['other chinese'], Mandarin: ['mandarin'],
  'Indigenous languages': ['indigenous'], 'Oceanic languages': ['indigenous languages'], 'Spanish only': ['only spanish', 'spanish only'],
  'Guarani only': ['only guarani'], 'Guarani and Spanish': ['spanish and guarani'], 'Thai only': ['thai only'],
  'Thai and another language': ['thai and other'], 'Tongan only': ['tongan only'], 'Tongan and another language': ['tongan and other'],
  'Spanish and an indigenous language': ['spanish and indigenous'], 'Indigenous languages only': ['indigenous only'],
  'Samoan and English': ['samoan/english'], 'Two languages': ['two languages', 'multilingual', 'two mother tongues'], Hindi: ['hindi'],
}
const UNSTATED = /unspecified|unknown|no answer|undeclared|not stated|no response|none$/i
function fbValue(items, lang) {
  const keys = [lang.toLowerCase(), ...(FB_ALIASES[lang] ?? [])]
  const hit = items.find(i => { const n = i.name.toLowerCase(); return keys.some(k => n === k || n.startsWith(k + ' ') || n.startsWith(k)) })
  return hit?.pct
}

// ── Comparing ─────────────────────────────────────────────────────────────
// Shares of those who answered, for comparing two sources fairly.
const answeredShare = (pairs, multi) => {
  const unstated = pairs.filter(([n]) => UNSTATED.test(n) || n === 'Not stated').reduce((a, [, v]) => a + v, 0)
  const scale = multi ? 1 : 100 / (100 - unstated)
  return { scale, unstated }
}
const report = { agree: [], differ: [], single: [], wikiMissing: [] }
const checksOf = {}
for (const [c, e] of Object.entries(COUNTRIES)) {
  const pairs = Object.entries(e.s)
  const mine = answeredShare(pairs, e.multi)
  const named = pairs.filter(([n, v]) => v >= MIN_SLICE && !/^(Other|Not stated)$/.test(n))
  const checks = []
  const fromFactbook = /World Factbook/.test(e.src[0]) || /cia\.gov/.test(e.src[1])
  const compare = (label, theirs, theirMulti, year) => {
    const t = answeredShare(theirs.map(i => [i.name, i.pct]), theirMulti)
    const rows = named.map(([n, v]) => {
      const tv = theirs.find(i => i.name === n)?.pct ?? (theirs.fb ? fbValue(theirs, n) : undefined)
      return { n, a: +(v * mine.scale).toFixed(1), b: tv === undefined ? undefined : +(tv * t.scale).toFixed(1) }
    })
    const compared = rows.filter(r => r.b !== undefined)
    if (!compared.length) return null
    const bad = compared.filter(r => Math.abs(r.a - r.b) > DIFF)
    const line = `${label}${year ? ` (${year})` : ''}: ${compared.map(r => `${r.n} ${r.a} vs ${r.b}`).join(', ')}`
    return { ok: !bad.length && compared[0].n === named[0]?.[0], line, bad }
  }
  // The Factbook.
  const fb = factbook[c] ? parseFactbook(factbook[c].text) : { items: [] }
  fb.items.fb = true
  if (fb.items.length) {
    const fbMulti = /more than (one|100)|sum to more|add up to more|multilingual/i.test(factbook[c].note) || fb.items.reduce((a, i) => a + i.pct, 0) > 101
    const r = compare('CIA World Factbook', fb.items, fbMulti, fb.year)
    if (r) {
      if (fromFactbook) checks.push({ source: 'factbook-self' })
      else if (r.ok) checks.push({ source: `CIA World Factbook${fb.year ? ` (${fb.year})` : ''}`, line: r.line })
      else report.differ.push(`**${NAME[c]}** (${e.year}, ${e.src[0]}) — ${r.line}`)
    }
  }
  // Pew.
  if (pew.countries[c] && !/Pew/.test(e.src[0])) {
    const items = Object.entries(pew.countries[c]).map(([name, pct]) => ({ name, pct }))
    const r = compare('Pew Research Center', items, c === 'UA', 2019)
    if (r) { if (r.ok) checks.push({ source: 'Pew Research Center (2019)', line: r.line }); else report.differ.push(`**${NAME[c]}** (${e.year}, ${e.src[0]}) — ${r.line}`) }
  }
  // Wikipedia: every figure on the page.
  if (e.wiki) {
    const page = wiki[e.wiki]
    const nums = new Set(page?.numbers ?? [])
    const absent = pairs.filter(([, v]) => !nums.has(String(v)) && !nums.has(v.toFixed(1)) && !nums.has(v.toFixed(2))).map(([n, v]) => `${n} ${v}`)
    const shown = pairs.filter(([n, v]) => v >= MIN_SLICE && n !== 'Not stated')
    const shownAbsent = shown.filter(([n, v]) => absent.includes(`${n} ${v}`))
    if (absent.length) report.wikiMissing.push(`**${NAME[c]}**: not on [${e.wiki}](https://en.wikipedia.org/wiki/${e.wiki.replace(/ /g, '_')}): ${absent.join(', ')}${shownAbsent.length ? '' : ' (only small or summed figures)'}`)
    if (!shownAbsent.length && (fromFactbook || /Pew/.test(e.src[0]))) checks.push({ source: `Wikipedia (${e.wiki})` })
  }
  const real = checks.filter(x => x.source !== 'factbook-self')
  checksOf[c] = real.map(x => x.source)
  if (real.length) report.agree.push(`**${NAME[c]}**: ${real.map(x => x.line ?? x.source).join('; ')}`)
  else report.single.push(`**${NAME[c]}** (${e.year}, ${e.src[0]})`)
}

// ── The pies ──────────────────────────────────────────────────────────────
const round1 = v => Math.round(v * 10) / 10
const entries = []
for (const f of FLAGS) {
  const e = COUNTRIES[f.code]
  if (!e) continue
  const pairs = Object.entries(e.s)
  const unstated = e.s['Not stated'] ?? 0
  const scale = e.multi ? 1 : 100 / (100 - unstated)
  const langs = pairs.filter(([n]) => n !== 'Not stated').map(([name, v]) => ({ name, pct: round1(v * scale), group: groupOf(name), family: familyLine(name) }))
  const named = langs.filter(l => l.name !== 'Other' && l.pct >= MIN_SLICE).slice(0, MAX_NAMED)
  const rest = langs.filter(l => !named.includes(l))
  const other = round1(rest.reduce((a, l) => a + l.pct, 0))
  const slices = [...named, ...(other > 0 ? [{ name: 'Other', pct: other, group: 'other', family: GROUPS.other[0] }] : [])]
  entries.push({
    code: f.code, region: f.region, year: e.year, kind: e.kind, measure: e.measure, multi: !!e.multi,
    answered: unstated && !e.multi ? round1(100 - unstated) : null,
    slices, full: [...langs.filter(l => l.name !== 'Other'), ...langs.filter(l => l.name === 'Other')],
    source: e.src[0], url: e.src[1], checks: checksOf[f.code], note: e.note,
  })
}

// How alike two pies are: total variation distance between their shares
// (normalised to 100). By language: " only" is dropped, so "Spanish only" and
// "Spanish" compare as one. By family: each group's slices in size order
// ("Romance 1", "Romance 2"), since hard still shows Spain's three Romance
// slices apart. (src/utils/spokenHere.ts compares pies the same way.)
const keyOf = n => n.replace(/ only$/, '')
const vec = (e, by) => {
  const total = e.slices.reduce((a, s) => a + s.pct, 0)
  const v = {}, seen = {}
  for (const s of e.slices) {
    const k = by === 'family' ? `${s.group} ${(seen[s.group] = (seen[s.group] ?? 0) + 1)}` : keyOf(s.name)
    v[k] = (v[k] ?? 0) + (s.pct * 100) / total
  }
  return v
}
export const tvd = (a, b) => { let d = 0; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) d += Math.abs((a[k] ?? 0) - (b[k] ?? 0)); return d / 2 }
const nearest = by => entries.map(e => Math.min(...entries.filter(o => o !== e).map(o => tvd(vec(e, by), vec(o, by)))))
const nnName = nearest('name'), nnFam = nearest('family')
entries.forEach((e, i) => {
  e.tier = MEDIUM.includes(e.code) ? 'medium' : 'easy'
  e.hard = nnFam[i] >= HARD_NN && e.slices.filter(s => s.group !== 'other').length >= 2
  const o = COUNTRIES[e.code].tier
  if (o === 'easy' || o === 'medium') e.tier = o
  if (o === 'hard') e.hard = true
  e.nn = { name: round1(nnName[i]), family: round1(nnFam[i]) }
})
if (args.includes('--nn')) for (const e of [...entries].sort((a, b) => b.nn.name - a.nn.name)) console.log(e.code, e.nn.name, e.nn.family, e.slices.map(s => s.name + ' ' + s.pct).join(', '))
// Rank inside a tier, 0 gentlest: the most distinctive pies first.
for (const t of ['easy', 'medium']) {
  const list = entries.filter(e => e.tier === t).sort((a, b) => b.nn.name - a.nn.name)
  list.forEach((e, i) => { e.rank = list.length > 1 ? round1((i / (list.length - 1)) * 100) / 100 : 0 })
}
{
  const list = entries.filter(e => e.hard).sort((a, b) => b.nn.family - a.nn.family)
  list.forEach((e, i) => { e.hardRank = list.length > 1 ? round1((i / (list.length - 1)) * 100) / 100 : 0 })
}

// ── Colours: every tone readable, no two groups of a pie alike ────────────
const lum = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const PAPER = '#FFFCF4', INK = '#1F3A3C'
for (const [id, [, , color]] of Object.entries(GROUPS)) {
  const best = Math.max(contrast(color, PAPER), contrast(color, INK))
  if (best < 4.5) problems.push(`${id}: ${color} is ${best.toFixed(2)}:1 with its label, under 4.5`)
}
// No pie may give one tone to two different groups.
for (const e of entries) {
  const byColor = {}
  for (const s of e.slices) if (s.group !== 'other') (byColor[GROUPS[s.group][2]] ??= new Set()).add(s.group)
  for (const [c, gs] of Object.entries(byColor)) if (gs.size > 1) problems.push(`${e.code}: ${[...gs].join(' and ')} share ${c}`)
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1) }

// ── Write ─────────────────────────────────────────────────────────────────
const usedGroups = [...new Set(entries.flatMap(e => e.full.concat(e.slices).map(s => s.group)))].sort()
const q = s => JSON.stringify(s)
const sliceTs = s => `{ name: ${q(s.name)}, pct: ${s.pct}, group: ${q(s.group)}, family: ${q(s.family)} }`
const ts = `// Generated by scripts/languagepie/build.mjs from scripts/languagepie/countries.mjs.
// Do not edit by hand: change the input and run \`node scripts/languagepie/build.mjs\`.
// Spoken Here: for each country, the share of people speaking each language,
// the year and kind of the figures, and where they come from.

export type LanguageGroup = ${usedGroups.map(q).join(' | ')}
export type Measure = ${MEASURES.map(q).join(' | ')}

export interface GroupInfo { name: string; family: string; color: string }
/** Each group's name, the family it belongs to ("" when it is one) and its colour. */
export const LANGUAGE_GROUPS: Record<LanguageGroup, GroupInfo> = {
${usedGroups.map(id => `  ${id}: { name: ${q(GROUPS[id][0])}, family: ${q(GROUPS[id][1])}, color: ${q(GROUPS[id][2])} },`).join('\n')}
}

export interface LanguageSlice {
  name: string
  /** Percent of the people counted (of those who answered, when answered is set). */
  pct: number
  group: LanguageGroup
  /** "Romance · Indo-European" */
  family: string
}

export interface LanguageShare {
  code: string
  year: number
  kind: "census" | "survey" | "register" | "estimate"
  measure: Measure
  /** People could give more than one answer, so the shares add up to more than 100. */
  multi: boolean
  /** Percent who answered, when the shares are of them; null when everyone is counted. */
  answered: number | null
  /** The pie: up to ${MAX_NAMED} languages of at least ${MIN_SLICE}%, then Other. */
  slices: LanguageSlice[]
  /** Every language the source names, small ones too, then its Other. */
  full: LanguageSlice[]
  source: string
  url: string
  /** Other sources that give the same figures (within ${DIFF} points). */
  checks: string[]
  note?: string
  /** Easy: the pie looks like no other country's. Medium: it has lookalikes. */
  tier: "easy" | "medium"
  /** Told apart from every other pie by its families alone, so hard can show it. */
  hard: boolean
  /** 0 (gentlest) – 1 inside the tier, and inside hard. */
  rank: number
  hardRank?: number
}

export const LANGUAGE_SHARES: LanguageShare[] = [
${entries.map(e => `  { code: ${q(e.code)}, year: ${e.year}, kind: ${q(e.kind)}, measure: ${q(e.measure)}, multi: ${e.multi}, answered: ${e.answered},
    slices: [${e.slices.map(sliceTs).join(', ')}],
    full: [${e.full.map(sliceTs).join(', ')}],
    source: ${q(e.source)}, url: ${q(e.url)}, checks: [${e.checks.map(q).join(', ')}],${e.note ? ` note: ${q(e.note)},` : ''}
    tier: ${q(e.tier)}, hard: ${e.hard}, rank: ${e.rank}${e.hard ? `, hardRank: ${e.hardRank}` : ''} },`).join('\n')}
]
`
fs.writeFileSync(OUT, ts)

// ── Report ────────────────────────────────────────────────────────────────
const years = entries.map(e => e.year)
const left = Object.entries(LEFT_OUT).map(([c, why]) => {
  const fbText = factbook[c] ? decode(factbook[c].text) : ''
  return `- **${NAME[c]}**: ${why}.${/\d\s*%/.test(fbText) ? ` (Factbook: "${fbText.slice(0, 120)}")` : ''}`
})
const tierCount = t => entries.filter(e => e.tier === t).length
const md = `# Spoken Here: data report

Generated by \`scripts/languagepie/build.mjs\`. ${entries.length} countries in the game, ${Object.keys(LEFT_OUT).length} left out.
Data years ${Math.min(...years)}–${Math.max(...years)}; ${entries.filter(e => 2026 - e.year > 10).length} countries have figures more than ten years old.
Tiers: ${tierCount('easy')} easy, ${tierCount('medium')} medium; ${entries.filter(e => e.hard).length} can be played on hard (families only).

## Two sources agree (${report.agree.length})
${report.agree.map(l => `- ${l}`).join('\n')}

## Sources disagree (${report.differ.length})
Shares of those who answered; more than ${DIFF} points apart, or a different language on top. Usually a different year or a different question.
${report.differ.map(l => `- ${l}`).join('\n')}

## One source only (${report.single.length})
${report.single.map(l => `- ${l}`).join('\n')}

## Figures not found on the Wikipedia page (${report.wikiMissing.length})
Usually sums the input made ("Other" folding several small languages) or a rounding.
${report.wikiMissing.map(l => `- ${l}`).join('\n')}

## Left out (${left.length})
${left.join('\n')}
`
fs.writeFileSync(REPORT, md)

if (TABLE) {
  const measureText = { mother: 'Mother tongue', first: 'First language', home: 'Language spoken at home', main: 'Main language', everyday: 'Everyday language', household: 'Household language', spoken: 'Languages spoken' }
  const rows = entries.map(e => `| ${NAME[e.code]} | ${e.year} | ${e.kind} | ${measureText[e.measure]}${e.multi ? ' (several allowed)' : ''}${e.answered ? ` (of ${e.answered}% who answered)` : ''} | ${e.slices.map(s => `${s.name} ${s.pct}`).join(', ')} | [${e.source}](${e.url}) | ${e.checks.join('; ') || '—'} | ${e.tier}${e.hard ? ' + hard' : ''} |`)
  fs.writeFileSync(path.resolve(TABLE), `# Spoken Here dataset (${entries.length} countries)\n\n| Country | Year | Kind | Measure | Pie | Source | Also agrees | Tier |\n|---|---|---|---|---|---|---|---|\n${rows.join('\n')}\n\n## Left out (${left.length})\n${left.join('\n')}\n`)
}
console.log(`[languagepie] ${entries.length} countries (${tierCount('easy')} easy, ${tierCount('medium')} medium, ${entries.filter(e => e.hard).length} hard), ${report.agree.length} with two sources, ${report.differ.length} disagreements -> ${path.relative(ROOT, OUT)}, ${path.relative(ROOT, REPORT)}`)
void os
