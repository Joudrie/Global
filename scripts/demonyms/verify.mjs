// Demonyms: checks every candidate in places.mjs against three kinds of source
// and writes the ones that pass to src/data/demonyms.ts.
//
//   node scripts/demonyms/verify.mjs [--offline] [--refresh] [--report <file.md>] [--table <file.md>] [--out <file.ts>]
//
// Sources, for each place:
//   - Wikidata: the place's demonym statements (P1549) in English
//   - the English Wikipedia: the place's infobox (demonym) and the "List of
//     adjectival and demonymic forms" pages (the demonym column)
//   - Wiktionary: the answer's entry, defined as a word for someone from the place
// A place is kept when at least two kinds of source give the answer. It is
// dropped only when Wikidata or the place's infobox gives a second standard
// word beside it that Wiktionary has in current use, rare or not (Monacan for
// Monaco, Floridan for Florida). Every other form a source gives is sorted by
// classify(): a spelling variant or a less usual word is accepted when typed; a
// nickname, an adjective or another place's word is never right.
//
// Every fake is checked too: it may not be any word the sources give for the
// place, Wiktionary may not define it as one, and if Wikidata or Wiktionary
// says it's the word for somewhere else it must be a declared trap pointing
// there. A fake that fails is replaced by one from fakes.mjs (checked the same
// way). Origin notes are kept only when Wiktionary's etymology of the answer
// contains the words the note rests on.
//
// Everything fetched is kept in scripts/demonyms/cache.json (only the parts
// used), so the check runs offline; --refresh fetches it all again.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PLACES } from './places.mjs'
import { generateFakes } from './fakes.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const CACHE_FILE = path.join(ROOT, 'scripts/demonyms/cache.json')
const args = process.argv.slice(2)
const OFFLINE = args.includes('--offline')
const REFRESH = args.includes('--refresh')
const argOf = (flag, fallback) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback)
const REPORT = argOf('--report', path.join(os.tmpdir(), 'demonyms-report.md'))
const TABLE = argOf('--table', null)
const OUT = path.resolve(argOf('--out', path.join(ROOT, 'src/data/demonyms.ts')))
const UA = 'GlobalioBuild/1.0 (https://globalio.app)'

const LIST_PAGES = [
  'List of adjectival and demonymic forms of place names',
  'List of adjectivals and demonyms for cities',
  'List of adjectival and demonymic forms for countries and nations',
  'List of demonyms for U.S. states and territories',
  'List of adjectivals and demonyms for Australia',
  'List of adjectivals and demonyms for Canada',
  'List of adjectivals and demonyms for New Zealand',
  'List of adjectivals and demonyms for India',
  'List of adjectivals and demonyms for former regions',
  'List of adjectivals and demonyms for subcontinental regions',
  'List of adjectivals and demonyms for Greco-Roman antiquity',
]
// Wiktionary labels that mean a word is not a second demonym in common use:
// informal words and nicknames, and words that have gone out of use. "Rare"
// and "uncommon" are not on the list: a rare alternative is still an
// alternative (Monacan for Monaco, Angelino for Los Angeles).
const MINOR_LABELS = ['informal', 'colloquial', 'slang', 'nickname', 'jocular', 'humorous', 'derogatory', 'pejorative', 'offensive', 'ethnic slur',
  'archaic', 'obsolete', 'dated', 'historical', 'historic', 'nonstandard', 'proscribed', 'misspelling', 'eye dialect', 'pronunciation spelling',
  'abbreviation', 'clipping', 'now rare', 'very rare', 'dialectal', 'dialect']
const isMinorLabel = l => MINOR_LABELS.some(m => l.includes(m))
/** Labels that leave a form out of common use, unless one says it's merely rare or uncommon. */
const outOfUse = labels => labels.some(isMinorLabel) && !labels.some(l => /\b(rare|uncommon)\b/.test(l) && !/now rare|very rare/.test(l))

// ── Cache and fetching ─────────────────────────────────────────────────────

const empty = () => ({ titles: {}, wikidata: {}, reverse: {}, infobox: {}, lists: null, wiktionary: {} })
const cache = !REFRESH && fs.existsSync(CACHE_FILE) ? { ...empty(), ...JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) } : empty()
const saveCache = (c = Object.fromEntries(Object.keys(cache).map(k => [k, raw[k] ?? cache[k]]))) => fs.writeFileSync(CACHE_FILE, JSON.stringify(c, null, 0).replace(/\],"/g, '],\n"') + '\n')
// Which cached entries the check reads, so the saved cache keeps only those (--offline runs give the same result).
const used = { titles: new Set(), wikidata: new Set(), reverse: new Set(), infobox: new Set(), lists: new Set(), wiktionary: new Set() }
const raw = {}
function track(keys = Object.keys(used)) {
  for (const k of keys) {
    const target = cache[k]
    if (!target || raw[k] === target) continue
    raw[k] = target
    const note = key => { if (typeof key === 'string') used[k].add(key) }
    cache[k] = new Proxy(target, { get: (o, key) => { note(key); return o[key] }, has: (o, key) => { note(key); return key in o } })
  }
}
const pruned = () => Object.fromEntries(Object.keys(used).map(k => [k, Object.fromEntries(Object.entries(raw[k] ?? {}).filter(([key]) => used[k].has(key)))]))

const sleep = ms => new Promise(r => setTimeout(r, ms))
let last = 0
async function get(url, opts = {}) {
  if (OFFLINE) throw new Error(`--offline, and this isn't cached: ${url.slice(0, 120)}`)
  for (let i = 0; i < 8; i++) {
    const wait = last + 1200 - Date.now()
    if (wait > 0) await sleep(wait)
    last = Date.now()
    let res, text
    try {
      res = await fetch(url, { ...opts, headers: { 'User-Agent': UA, ...(opts.headers ?? {}) } })
      text = await res.text()
    } catch (err) { await sleep(4000 * (i + 1)); continue }
    if (res.status === 429 || res.status >= 500 || text.startsWith('You are making too many requests')) { await sleep(8000 * (i + 1)); continue }
    if (!res.ok) throw new Error(`${res.status} ${url.slice(0, 120)}`)
    return text
  }
  throw new Error(`gave up on ${url.slice(0, 120)}`)
}
const mw = async (host, params) => {
  for (let i = 0; i < 5; i++) {
    const r = JSON.parse(await get(`https://${host}/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })}`))
    if (r.error?.code === 'maxlag') { await sleep(5000); continue }
    if (r.error) throw new Error(`${host}: ${r.error.info}`)
    return r
  }
  throw new Error(`${host}: lagged`)
}
const sparql = async q => JSON.parse(await get('https://query.wikidata.org/sparql', {
  method: 'POST', body: `query=${encodeURIComponent(q)}`,
  headers: { Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
})).results.bindings
const chunk = (xs, n) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n))
const unique = xs => [...new Set(xs)]

async function resolveTitles(titles) {
  const need = unique(titles).filter(t => !(t in cache.titles))
  for (const batch of chunk(need, 50)) {
    const r = await mw('en.wikipedia.org', { action: 'query', prop: 'pageprops', ppprop: 'wikibase_item', redirects: '1', titles: batch.join('|') })
    const step = Object.fromEntries([...(r.query.normalized ?? []), ...(r.query.redirects ?? [])].map(x => [x.from, x.to]))
    const pages = Object.fromEntries(r.query.pages.map(p => [p.title, p.missing || !p.pageprops?.wikibase_item ? null : { title: p.title, qid: p.pageprops.wikibase_item }]))
    for (const t of batch) {
      let x = t
      for (let i = 0; i < 3 && step[x]; i++) x = step[x]
      cache.titles[t] = pages[x] ?? null
    }
  }
}

async function fetchWikidata(qids) {
  const need = unique(qids).filter(q => q && !(q in cache.wikidata))
  for (const batch of chunk(need, 80)) {
    const rows = await sparql(`SELECT ?item ?d WHERE { VALUES ?item { ${batch.map(q => `wd:${q}`).join(' ')} }
      ?item p:P1549 ?st . ?st ps:P1549 ?d . ?st wikibase:rank ?r . FILTER(?r != wikibase:DeprecatedRank) FILTER(LANGMATCHES(LANG(?d), "en")) }`)
    for (const q of batch) cache.wikidata[q] = []
    for (const b of rows) cache.wikidata[b.item.value.split('/').pop()].push(`${b.d.value}@${b.d['xml:lang']}`)
  }
}

// Which places Wikidata gives a word as the demonym of ("Nepalese" → Nepal).
async function fetchReverse(words) {
  const need = unique(words).filter(w => !(w in cache.reverse))
  for (const batch of chunk(need, 120)) {
    const rows = await sparql(`SELECT ?d ?item ?itemLabel WHERE { VALUES ?d { ${batch.map(w => `${JSON.stringify(w)}@en`).join(' ')} }
      ?item wdt:P1549 ?d . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`)
    for (const w of batch) cache.reverse[w] = []
    for (const b of rows) cache.reverse[b.d.value]?.push([b.item.value.split('/').pop(), b.itemLabel.value])
  }
}

// The demonym fields of each article's infobox (its first section), refs and comments removed.
const stripRefs = t => t.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>/g, '').replace(/<ref[\s\S]*?<\/ref>/g, '')
async function fetchInfoboxes(titles) {
  const need = unique(titles).filter(t => !(t in cache.infobox))
  for (const batch of chunk(need, 20)) {
    for (const t of batch) cache.infobox[t] = []
    let cont = {}
    for (let i = 0; i < 20; i++) {
      const r = await mw('en.wikipedia.org', { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', rvsection: '0', titles: batch.join('|'), ...cont })
      for (const p of r.query.pages) {
        const text = stripRefs(p.revisions?.[0]?.slots?.main?.content ?? '')
        if (!text || !(p.title in cache.infobox)) continue
        cache.infobox[p.title] = [...text.matchAll(/\|\s*(demonyms?\d*)\s*=([\s\S]*?)(?=\n\s*\||\n\s*\}\})/gi)].map(m => m[2].trim().slice(0, 600)).filter(Boolean)
      }
      if (!r.continue) break
      cont = r.continue
    }
  }
}

// Every row of the Wikipedia lists: linked place → [page, adjective, demonym].
async function fetchLists() {
  if (cache.lists) return
  const rows = {}
  for (const page of LIST_PAGES) {
    let r
    try { r = await mw('en.wikipedia.org', { action: 'parse', page, prop: 'wikitext', redirects: '1' }) } catch (err) { console.warn(`  list missing: ${page} (${err.message})`); continue }
    const title = r.parse.title
    for (const raw of r.parse.wikitext.split(/\n\|-[^\n]*/)) {
      const cells = raw.split('\n').filter(l => /^[|!]/.test(l) && !/^\|[}+]/.test(l) && !/^\{\|/.test(l))
        .map(l => l.replace(/^[|!]/, '')).join('||').replace(/<ref[\s\S]*?<\/ref>/g, '').split(/\|\||!!/).map(c => c.replace(/^\s*[a-z-]+="[^"]*"\s*\|(?!\|)/i, '').trim())
      if (cells.length < 3) continue
      const link = cells[0].match(/\[\[([^\]|#]+)/) ?? cells[0].match(/\{\{flag(?:country|icon)?\|([^|}]+)/i)
      if (!link) continue
      const key = link[1].trim().replace(/_/g, ' ')
      ;(rows[key] ??= []).push([title, stripRefs(cells[1]).slice(0, 300), stripRefs(cells[2]).slice(0, 300)])
    }
  }
  cache.lists = rows
}

// A Wiktionary entry, per language: etymology, definitions (with part of
// speech and labels), alternative forms and synonyms.
async function fetchWiktionary(words) {
  const titles = unique(words.flatMap(w => unique([w, w.toLowerCase(), deaccent(w), deaccent(w).toLowerCase()]))).filter(t => !(t in cache.wiktionary))
  for (const batch of chunk(titles, 40)) {
    const r = await mw('en.wiktionary.org', { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: batch.join('|') })
    const step = Object.fromEntries((r.query.normalized ?? []).map(x => [x.to, x.from]))
    for (const t of batch) cache.wiktionary[t] = null
    for (const p of r.query.pages) {
      const t = step[p.title] ?? p.title
      if (!p.missing && t in cache.wiktionary) cache.wiktionary[t] = parseWiktionary(p.revisions?.[0]?.slots?.main?.content ?? '')
    }
  }
}

function parseWiktionary(text) {
  const out = {}
  const langs = text.split(/^==([^=\n]+)==\s*$/m)
  for (let i = 1; i < langs.length; i += 2) {
    const lang = langs[i].trim(), body = langs[i + 1]
    const english = lang === 'English'
    const entry = { ety: '', defs: [], alt: [], syn: [] }
    let pos = '', section = ''
    for (const line of body.split('\n')) {
      const h = line.match(/^===+\s*([^=]+?)\s*===+\s*$/)
      if (h) { section = h[1]; if (/^(Noun|Proper noun|Adjective)$/.test(section)) pos = section; else if (!/^(Usage notes|Synonyms|Alternative forms|Etymology.*)$/.test(section)) pos = ''; continue }
      if (/^Etymology/.test(section) && entry.ety.length < (english ? 900 : 300)) entry.ety += line + ' '
      if (!english) { if (/^#\s/.test(line) && pos) entry.defs.push({ pos, labels: labelsIn(line), text: line.slice(2, 200) }); continue }
      if (section === 'Alternative forms') entry.alt.push(...termsIn(line))
      // A synonyms section line counts for the sense it names, or for every sense when it names none.
      if (section === 'Synonyms') { const sense = line.match(/\{\{(?:sense|s)\|([^}]*)\}\}/)?.[1] ?? null; for (const t of termsIn(line)) entry.syn.push({ ...t, sense, pos }) }
      if (/^#\s/.test(line) && pos) entry.defs.push({ pos, labels: labelsIn(line), text: line.slice(2, 400) })
      // "#: {{syn|en|…}}" under a definition: synonyms of that sense only.
      if (/^#:\s*\{\{(?:syn|synonyms)\|/.test(line) && entry.defs.length) for (const t of termsIn(line)) entry.syn.push({ ...t, def: entry.defs.length - 1 })
    }
    entry.ety = entry.ety.trim().slice(0, 900)
    if (!english) { entry.ety = entry.ety.slice(0, 300); if (!entry.ety) delete entry.ety; delete entry.alt; delete entry.syn; entry.defs = entry.defs.slice(0, 4) }
    if (entry.defs.length || entry.ety) out[lang] = entry
  }
  return out
}
const labelsIn = line => [...line.matchAll(/\{\{(?:lb|lbl|label|term-label|q|qual|qualifier|i)\|(?:[a-z-]+\|)?([^}]*)\}\}/g)]
  .flatMap(m => m[1].split('|').map(s => s.trim().toLowerCase())).filter(Boolean)
/** The words a line offers: {{alt|en|A|B||label}}, {{syn|en|A<q:rare>}}, {{l|en|A}}, [[A]]; each with its labels. */
function termsIn(line) {
  const out = []
  for (const m of line.matchAll(/\{\{(alt|alter|syn|synonyms|l|link)\|[a-z-]+\|([^{}]*)\}\}/g)) {
    const params = m[2].split('|')
    const cut = params.indexOf('')
    const words = (cut >= 0 && /^alt/.test(m[1]) ? params.slice(0, cut) : params).filter(p => p && !p.includes('='))
    const shared = cut >= 0 && /^alt/.test(m[1]) ? params.slice(cut + 1).filter(p => p && !p.includes('=')).map(x => x.toLowerCase()) : []
    for (const w of /^l/.test(m[1]) ? words.slice(0, 1) : words) {
      const labels = [...w.matchAll(/<(?:q|qq|l|ll|lb):([^>]*)>/g)].flatMap(x => x[1].split(/[,;]\s*/)).map(x => x.trim().toLowerCase())
      const word = w.replace(/<[^>]*>/g, '').replace(/#.*$/, '').replace(/^Thesaurus:.*$/, '').trim()
      if (word && !/^[a-z]{2,3}$/.test(word)) out.push({ w: word, labels: [...labels, ...shared, ...labelsIn(line)] })
    }
  }
  if (!out.length) for (const m of line.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)) if (!m[1].includes(':')) out.push({ w: m[1].trim(), labels: labelsIn(line) })
  return out
}

// ── Text ───────────────────────────────────────────────────────────────────

function deaccent(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/Œ/g, 'Oe').replace(/æ/g, 'ae').replace(/Æ/g, 'Ae') }
const fold = s => deaccent(s).toLowerCase().replace(/\bst\b\.?/g, 'saint').replace(/[^a-z]/g, '')

/** Wikitext to plain text: no refs, comments, templates' names, links' targets or quotes. */
function plain(s) {
  let t = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>/g, '').replace(/<ref[\s\S]*?<\/ref>/g, '')
  for (let i = 0; i < 4; i++) {
    t = t.replace(/\{\{(?:efn|sfn|refn|cn|citation needed|ref|r|note|nbsp|clarify|dubious|failed verification|according to whom)[^{}]*\}\}/gi, '')
      .replace(/\{\{(?:lang|lang-[a-z]+|transl|nowrap|small|nobold|noitalic|nobr|native name)\|(?:[a-z-]+\|)?([^{}|]*)[^{}]*\}\}/gi, '$1')
      .replace(/\{\{(?:hlist|ubl|unbulleted list|plainlist|flatlist|bulleted list|nowrap|endplainlist)\|([^{}]*)\}\}/gi, (_, x) => x.split('|').filter(p => !p.includes('=')).join(', '))
      .replace(/\{\{[^{}]*\}\}/g, '')
  }
  return t.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/'''?/g, '').replace(/<br\s*\/?>/gi, ', ').replace(/<[^>]+>/g, '')
    .replace(/\{\{\s*(?:plainlist|flatlist)\s*\|?/gi, '').replace(/\}\}/g, '').replace(/&nbsp;/g, ' ').trim()
}

/** The forms in a cell or infobox value, each with its notes: split on
 *  commas, "or", slashes and bullets; text in brackets after a form is a note
 *  about it (masculine, colloquial, English, Neapolitan…). */
function itemsIn(raw) {
  const items = []
  const t = plain(raw.replace(/\{\{(?:cslist|hlist|ubl|unbulleted list|plainlist|flatlist)\s*\|/gi, '{{hlist|'))
  for (const part of t.split(/\s*(?:[,;/*\n•]|\bor\b|\band\b|\s[-–—]\s)\s*(?![^(]*\))/)) {
    const notes = [...part.matchAll(/\(([^)]*)\)/g)].map(m => m[1].trim().toLowerCase())
    const lang = part.match(/^\s*([A-Z][a-z]+)\s*:/)?.[1]
    const prefix = part.match(/^\s*(archaic|obsolete|rare|dated|colloquial|colloq\.|informal|historical|slang)\s+(?=[A-Z])/i)?.[1]
    if (prefix) notes.push(prefix.toLowerCase())
    const form = part.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/^\s*[A-Z][a-z]+\s*:/, '').replace(/^\s*(archaic|obsolete|rare|dated|colloquial|colloq\.|informal|historical|slang)\s+(?=[A-Z])/i, '').replace(/^[\s:.]+|[\s:.]+$/g, '').replace(/\s+(m|f)$/, '')
    if (form && /[A-Za-zÀ-ÿ]/.test(form) && form.length < 40) items.push({ form, notes: lang ? [...notes, lang.toLowerCase()] : notes })
  }
  // When some forms are marked "(English)", the unmarked ones are another language's.
  if (items.some(i => i.notes.includes('english'))) for (const i of items) if (!i.notes.includes('english')) i.notes.push('not english')
  return items
}
const formsIn = raw => ({ forms: itemsIn(raw).map(i => i.form) })
const LANGUAGE_NOTES = /^(not english|french|spanish|italian|neapolitan|portuguese|catalan|german|dutch|irish|welsh|scots|scottish gaelic|gaelic|maori|māori|latin|greek|arabic|russian|polish|occitan|basque|galician|breton|corsican|sicilian|venetian|local|native)$/

/** The folded spellings that are `word` itself: plural, gender (-o/-a,
 *  -ais/-aise), and -man/-woman forms. */
function spellings(word) {
  const a = fold(word)
  const s = new Set([a, `${a}s`, `${a}es`])
  if (/o$/.test(a)) for (const x of ['a', 'os', 'as']) s.add(a.slice(0, -1) + x)
  if (/(ais|ois)$/.test(a)) { s.add(`${a}e`); s.add(`${a}es`) }
  if (/(ain|ien|in)$/.test(a)) { s.add(`${a}e`); s.add(`${a}es`); s.add(`${a}ne`) }
  if (/man$/.test(a)) { const b = a.slice(0, -3); for (const x of ['men', 'woman', 'women', 'people', 'person']) s.add(b + x) }
  else for (const x of ['man', 'men', 'woman', 'women']) s.add(a + x)
  return s
}
const isWord = (form, words) => words.some(w => spellings(w).has(fold(form)))

const nameRe = name => new RegExp(`(^|[^a-z])${deaccent(name).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`)
const mentions = (text, names) => names.some(n => nameRe(n).test(deaccent(plain(text)).toLowerCase()) || nameRe(n).test(deaccent(text).toLowerCase()))
// "{{alt form|en|Athenian}}", "{{archaic form of|en|Cretan}}", "{{syn of|en|Bostonian#Noun}}": the word it points to, and the label it implies.
const FORM_OF = /\{\{(alt form|alternative form of|alt sp|alternative spelling of|alt-sp|syn of|synonym of|alt case form of|archaic form of|archaic spelling of|obsolete form of|obsolete spelling of|dated form of|dated spelling of|rare form of|rare spelling of|uncommon form of|misspelling of|nonstandard form of|nonstandard spelling of|eye dialect of|pronunciation spelling of|abbreviation of|abbr of|clipping of|short for|plural of|feminine of|female equivalent of)\|en\|([^|}#]+)/
function formOf(text) {
  const m = text.match(FORM_OF)
  if (!m) return null
  const kind = m[1]
  const label = /archaic/.test(kind) ? 'archaic' : /obsolete/.test(kind) ? 'obsolete' : /dated/.test(kind) ? 'dated' : /rare/.test(kind) ? 'rare'
    : /uncommon/.test(kind) ? 'uncommon' : /misspelling/.test(kind) ? 'misspelling' : /nonstandard/.test(kind) ? 'nonstandard' : /eye dialect|pronunciation/.test(kind) ? 'eye dialect'
    : /abbr|clipping|short/.test(kind) ? 'abbreviation' : null
  return { kind, target: m[2].trim(), label, same: /plural|feminine|female|case/.test(kind) }
}
const PERSON = /demonym-noun|\b(native|natives|inhabitant|inhabitants|resident|residents|citizen|citizens)\b|\b(person|someone|somebody|people|man|woman|men|women)\s+(from|of|born in)\b|\b(who lives|living) in\b|\b(members?|descendants?) of the (population|people)\b|^\s*an?\s+(\[\[)?[A-Z][a-z]+(\]\])?\s+(\[\[)?(person|man|woman|native)\b/i
const isPersonDef = (d, accepted = []) => d.pos !== 'Adjective' && (PERSON.test(plain(d.text)) || PERSON.test(d.text) || !!(formOf(d.text) && isWord(formOf(d.text).target, accepted)) || isBare(d.text, accepted))
// A definition that is just the answer: "{{lb|en|archaic}} [[Cypriot]]", "A [[New Yorker]]".
const isBare = (text, accepted) => { const t = plain(text).replace(/[.;]\s*$/, '').replace(/^(an?|the)\s+/i, '').trim(); return accepted.some(a => fold(t) === fold(a)) }
/** The English definitions of a word (all its capitalisations) that are about this place: they name it, or point to its answer. */
function placeDefs(word, names, accepted) {
  const defs = unique([word, word.toLowerCase(), deaccent(word), deaccent(word).toLowerCase(), word[0].toUpperCase() + word.slice(1)])
    .flatMap(t => cache.wiktionary[t]?.English?.defs ?? [])
  return defs.filter(d => mentions(d.text, names) || (formOf(d.text) && isWord(formOf(d.text).target, accepted)) || isBare(d.text, accepted))
    .map(d => ({ ...d, labels: unique([...d.labels, ...(formOf(d.text)?.label ? [formOf(d.text).label] : [])]) }))
}

/** The Wiktionary entry for a word: its own page, else lower case or without accents. */
function wiktionary(word) {
  for (const t of unique([word, deaccent(word), word.toLowerCase(), deaccent(word).toLowerCase()])) {
    const e = cache.wiktionary[t]
    if (e) return { title: t, entry: e }
  }
  return null
}

// ── Checking one place ─────────────────────────────────────────────────────

const titleOf = p => p.wiki ?? p.place
const baseName = t => t.replace(/\s*\(.*\)$/, '').replace(/,.*$/, '')
const trapSpec = t => (typeof t === 'string' ? { wiki: t } : t)

function sourcesFor(word, title, names) {
  // Which sources give `word` as the word for someone from this place.
  const t = cache.titles[title]
  const out = []
  if (!t) return out
  const wd = (cache.wikidata[t.qid] ?? []).map(x => x.split('@')[0])
  if (wd.some(f => isWord(f, [word]))) out.push(`Wikidata ${t.qid} (P1549)`)
  const ib = (cache.infobox[t.title] ?? []).flatMap(v => formsIn(v).forms)
  if (ib.some(f => isWord(f, [word]))) out.push(`Wikipedia: ${t.title} (infobox)`)
  for (const [page, , dem] of listRows(t.title, names)) if (formsIn(dem).forms.some(f => isWord(f, [word]))) out.push(`Wikipedia: ${page}`)
  const wk = wiktionary(word)
  if (wk) for (const [lang, e] of Object.entries(wk.entry)) {
    if (e.defs.some(d => mentions(d.text, names))) { out.push(lang === 'English' ? `Wiktionary: ${wk.title}` : `Wiktionary: ${wk.title} (${lang})`); break }
  }
  return unique(out)
}

function listRows(title, names) {
  const keys = unique([title, ...names])
  return unique(keys.flatMap(k => cache.lists?.[k] ?? []).map(r => JSON.stringify(r))).map(r => JSON.parse(r))
}

// How a form the sources give for the place's people is treated:
//   variant      the answer spelled another way (accents, a doubled letter, ph/f, one letter, "St", a Spanish
//                ending anglicised: Angelino, Amsterdamer, St Petersburger, Madrilenian): accepted when typed
//   alternative  a less usual word (rare, old, one source, another language's: Liverpolitan, Parisien): accepted when typed
//   nickname     informal words (Scouser, Geordie): never an answer
//   other        not a word for the place's people (an adjective, another place's word, a sausage): never an answer
//   coequal      a second standard word that Wikidata or the place's infobox gives alongside the answer and
//                a dictionary has as a current word for its people (Monacan, Floridan): the place is dropped
// None of them may be a fake.
const NICK = /informal|colloq|slang|nickname|jocular|humorous|derog|pejor|offens|ethnic slur/
const OLD = /archaic|obsolete|dated|histor|nonstandard|now rare|very rare/
const NOT_A_WORD = /misspelling|eye dialect|pronunciation spelling|abbreviation|clipping/
function classify(f0, o, p, names, accepted, adj, dem) {
  const answer = fold(p.answer)
  const g = fold(f0)
  const same = x => fold(x).replace(/ph/g, 'f').replace(/(.)\1+/g, '$1')
  // Spelling variants of the answer itself.
  if (accepted.some(a => same(a) === same(f0))) return { kind: 'variant', why: 'the same word, spelled differently' }
  if (g === `${answer}e`) return { kind: 'variant', why: 'the same word with a final e (Corfiote)' }
  const strongSource = o.by.has('Wikidata') || (o.by.has('infobox') && !o.notes.length)
  const oneLetter = answer.length >= 6 && editDistance(g, answer) <= 1
  if (oneLetter && !strongSource) return { kind: 'variant', why: 'the same word, one letter different' }
  const prefix = g.endsWith(answer) ? g.slice(0, -answer.length) : null
  if (prefix && names.some(n => deaccent(n).toLowerCase().split(/[\s-]+/).map(fold).includes(prefix) || fold(n).startsWith(prefix))) return { kind: 'variant', why: `the answer with "${prefix}" from the place's name` }
  if (/[oa]$/.test(answer) && answer.length >= 7 && g.startsWith(answer.slice(0, -1)) && g.length > answer.length) return { kind: 'variant', why: 'the same word with an English ending' }
  const ignore = Object.entries(p.ignore ?? {}).find(([k]) => isWord(f0, [k]))
  if (ignore) return { kind: /^nickname|^a nickname/i.test(ignore[1]) ? 'nickname' : 'other', why: ignore[1] }
  // A plural ("Madagascans", "Comorans") is judged as its singular.
  const pluralOf = unique([f0, f0.toLowerCase()]).flatMap(t => cache.wiktionary[t]?.English?.defs ?? []).map(d => formOf(d.text)).find(x => x?.kind === 'plural of')?.target
  const f = pluralOf ?? (/s$/.test(f0) && cache.wiktionary[f0.slice(0, -1)] ? f0.slice(0, -1) : f0)
  const strong = strongSource
  const nickNote = o.notes.find(n => NICK.test(n))
  if (nickNote) return { kind: 'nickname', why: `marked "${nickNote}"` }
  const badNote = o.notes.find(n => NOT_A_WORD.test(n))
  if (badNote || /\.$/.test(f0)) return { kind: 'other', why: badNote ? `marked "${badNote}"` : 'an abbreviation' }
  const oldNote = o.notes.find(n => OLD.test(n))
  if (oldNote) return { kind: 'alternative', why: `marked "${oldNote}"` }
  if (o.notes.some(n => LANGUAGE_NOTES.test(n))) return { kind: 'alternative', why: `another language's word (${o.notes.filter(n => LANGUAGE_NOTES.test(n)).join(', ')})` }
  const defs = placeDefs(f, names, accepted)
  const person = defs.filter(d => isPersonDef(d, accepted))
  if (person.length) {
    if (person.every(d => formOf(d.text)?.same && isWord(formOf(d.text).target, accepted))) return { kind: 'variant', why: 'the same word (Wiktionary)' }
    const labels = unique(person.flatMap(d => d.labels))
    if (person.every(d => d.labels.some(l => NOT_A_WORD.test(l)))) return { kind: 'other', why: `Wiktionary: ${labels.filter(l => NOT_A_WORD.test(l)).join(', ')}` }
    if (person.every(d => d.labels.some(l => NICK.test(l)))) return { kind: 'nickname', why: `Wiktionary: ${labels.filter(l => NICK.test(l)).join(', ')}` }
    if (person.every(d => d.labels.some(l => OLD.test(l)))) return { kind: oneLetter ? 'variant' : 'alternative', why: `Wiktionary: ${labels.filter(l => OLD.test(l)).join(', ')}` }
    // A current dictionary word for the place's people (rare or not) that Wikidata or the infobox gives too: a second standard demonym.
    if (strong) return { kind: 'coequal', why: `${[...o.by].join(', ')} and Wiktionary${labels.length ? ` (${labels.join(', ')})` : ''}` }
    return { kind: 'alternative', why: `Wiktionary${labels.length ? `: ${labels.join(', ')}` : ''}` }
  }
  if (oneLetter) return { kind: 'variant', why: 'the same word, one letter different (no dictionary entry of its own)' }
  if (defs.length) return { kind: 'other', why: defs.every(d => d.pos === 'Adjective') ? 'an adjective (Wiktionary)' : `Wiktionary: not a word for everyone from ${p.place} ("${plain(defs.find(d => d.pos !== 'Adjective').text).slice(0, 60)}")` }
  const all = unique([f, f.toLowerCase(), deaccent(f)]).map(t => cache.wiktionary[t]).filter(e => e && Object.keys(e).length)
  const en = all.flatMap(e => e.English?.defs ?? [])
  const elsewhere = en.filter(d => isPersonDef(d))
  if (elsewhere.length) return { kind: 'other', why: `Wiktionary gives it for somewhere else: "${plain(elsewhere[0].text).slice(0, 70)}"` }
  if (adj.some(a => isWord(a, [f])) && !dem.some(d => isWord(d, [f])) && !o.by.has('Wikidata')) return { kind: 'other', why: 'the adjective (Wikipedia list)' }
  const other = all.flatMap(e => Object.entries(e).filter(([l]) => l !== 'English').map(([l]) => l))
  const foreignDefs = all.flatMap(e => Object.entries(e).filter(([l]) => l !== 'English').flatMap(([, v]) => v.defs)).filter(d => mentions(d.text, names))
  if (!en.length && foreignDefs.some(d => d.labels.some(l => NICK.test(l)))) return { kind: 'nickname', why: `Wiktionary (${unique(other).join(', ')}): informal` }
  if (!en.length && other.length) return { kind: 'alternative', why: `Wiktionary has it only in ${unique(other).join(', ')}` }
  if (en.length && !o.by.has('Wikidata') && !o.by.has('infobox')) return { kind: 'other', why: `Wiktionary knows it only as "${plain(en[0].text).slice(0, 50)}"` }
  return { kind: 'alternative', why: `no dictionary entry; ${[...o.by].join(', ')} only` }
}

function check(p, all) {
  const title = titleOf(p)
  const t = cache.titles[title]
  const log = { place: p.place, notes: [], minor: [], fakesReplaced: [] }
  if (!t) return { ok: false, why: `no Wikipedia article "${title}"`, log }
  const names = unique([p.place, baseName(t.title), ...(p.also ?? [])])
  const accepted = [p.answer, ...(p.variants ?? [])]

  // 1. The answer, from at least two sources.
  const sources = sourcesFor(p.answer, title, names)
  const kinds = unique(sources.map(s => s.split(/[ :]/)[0]))
  log.sources = sources
  if (kinds.length < 2) return { ok: false, why: `only ${sources.length ? sources.join(', ') : 'no source'} gives ${p.answer}`, log }

  // 2. Every other form any source gives for the place's people, and where
  // it comes from. Each must be explained (a nickname, an adjective, rare,
  // another language's word, another place's word) or the place is debated.
  const wdForms = (cache.wikidata[t.qid] ?? []).map(x => x.split('@')[0])
  const rows = listRows(t.title, names)
  const adj = rows.flatMap(r => formsIn(r[1]).forms)
  const wk = wiktionary(p.answer)?.entry?.English
  const offeredBy = new Map() // folded form → { form, by: Set, notes: [] }
  const offer = (form, by, notes = []) => {
    const k = fold(form)
    if (!k) return
    const o = offeredBy.get(k) ?? { form, by: new Set(), notes: [] }
    o.by.add(by); o.notes.push(...notes)
    offeredBy.set(k, o)
  }
  for (const f of wdForms) offer(f, 'Wikidata')
  for (const v of cache.infobox[t.title] ?? []) for (const i of itemsIn(v)) offer(i.form, 'infobox', i.notes)
  for (const r of rows) for (const i of itemsIn(r[2])) offer(i.form, r[0].replace(/^List of adjectivals? and demonym(?:ic forms|s) (?:of|for) /, 'list: '), i.notes)
  const placeSense = d => mentions(d.text, names)
  for (const a of wk?.alt ?? []) offer(a.w, 'Wiktionary alternative form', a.labels)
  for (const sy of wk?.syn ?? []) {
    const def = sy.def !== undefined ? wk.defs[sy.def] : null
    const personSense = d => placeSense(d) && isPersonDef(d, accepted)
    const relevant = def ? personSense(def) : sy.sense ? mentions(sy.sense, names) && PERSON.test(sy.sense) || /inhabitant|person|people|native/.test(sy.sense) && mentions(sy.sense, names) : wk.defs.filter(d => d.pos === sy.pos).every(personSense)
    if (relevant) offer(sy.w, 'Wiktionary synonym', sy.labels)
  }
  for (const r of p.rivals ?? []) offer(r, 'known rival (places.mjs)')
  // Every fake tried (hand-written and generated) is also a probe: if Wiktionary
  // defines it as a word for someone from this place, it's another demonym.
  const trapWords = new Set(Object.keys(p.traps ?? {}))
  for (const c of unique([...p.fakes, ...generateFakes(p.place, p.answer, [p.answer], p.also)])) {
    if (trapWords.has(c) || isWord(c, accepted)) continue
    if (placeDefs(c, names, accepted).some(d => isPersonDef(d, accepted))) offer(c, 'Wiktionary entry')
  }
  const offered = [...offeredBy.values()].map(o => o.form)
  const others = []   // { form, kind, why }: every other form, for the report and the data
  const coequal = []
  const dem = rows.flatMap(r => formsIn(r[2]).forms)
  for (const o of offeredBy.values()) {
    const f = o.form
    if (isWord(f, accepted) || names.some(n => fold(n) === fold(f))) continue
    if (/\s(peoples?|persons?|residents?|citizens?)$/i.test(f) || /^(demographics|people|list|history) of\b/i.test(f) || /[{}|]/.test(f) || f.split(/\s+/).length > 3) continue // "Macau people": a description, not a word
    if (others.some(x => fold(x.form) === fold(f))) continue
    const c = classify(f, o, p, names, accepted, adj, dem)
    if (c.kind === 'coequal') coequal.push(`${f} (${c.why})`)
    else others.push({ form: f, kind: c.kind, why: `${c.why}; from ${[...o.by].join(', ')}` })
  }
  log.minor = others
  if (coequal.length) return { ok: false, why: `two standard words: ${p.answer} and ${coequal.join(', ')}`, log }
  const variants = others.filter(x => x.kind === 'variant' || x.kind === 'alternative').map(x => x.form)

  // 3. Fakes: none a word for this place; a word for somewhere else only as a declared trap.
  const traps = {}
  const otherAnswers = new Map(all.filter(o => o !== p).flatMap(o => [o.answer, ...(o.variants ?? [])].map(a => [fold(a), o])))
  const judgeFake = fake => {
    if (fold(fake) === fold(p.place) || isWord(fake, accepted)) return 'is the answer'
    if (offered.some(f => isWord(f, [fake])) || others.some(o => isWord(o.form, [fake]))) return 'a source gives it for this place'
    const fw = wiktionary(fake)
    const spec = p.traps?.[fake] ? trapSpec(p.traps[fake]) : null
    const elsewhere = [
      ...(cache.reverse[fake] ?? []).map(([q, label]) => ({ q, label })),
      ...(otherAnswers.has(fold(fake)) ? [{ label: otherAnswers.get(fold(fake)).place }] : []),
    ]
    const forHere = () => {
      if (fw) for (const [lang, e] of Object.entries(fw.entry)) if (e.defs.some(d => mentions(d.text, names))) return `Wiktionary (${lang}) defines it for ${p.place}`
      if (placeDefs(fake, names, accepted).length) return 'Wiktionary points it to this place or its answer'
      return null
    }
    if (spec?.means) {
      const defs = (fw?.entry?.English?.defs ?? []).filter(d => mentions(d.text, spec.keys ?? [spec.means.replace(/^an? /, '').replace(/ fan$/, '')]))
      if (!defs.length) return `trap "${spec.means}" not found on Wiktionary`
      if (placeDefs(fake, names, accepted).some(d => isPersonDef(d, accepted) && !defs.includes(d))) return 'Wiktionary gives it for this place\'s people'
      traps[fake] = { note: `${fake} is ${spec.means}.`, source: `Wiktionary: ${fw.title}` }
      return null
    }
    if (spec) {
      const tt = cache.titles[spec.wiki]
      if (!tt) return `trap place "${spec.wiki}" not found`
      const trapNames = unique([baseName(tt.title), ...(spec.also ?? [])])
      const src = sourcesFor(fake, spec.wiki, trapNames)
      if (!src.length) return `no source gives ${fake} for ${tt.title}`
      // A trap for a place with the same name (São Paulo the state) may name this one too; any other may not.
      if (!trapNames.some(n => names.some(m => fold(m) === fold(n))) && forHere()) return forHere()
      const english = src.find(x => !/\((?!P1549|infobox)[A-Z][a-z]+\)$/.test(x))
      const label = spec.label ?? baseName(tt.title)
      const lang = !english && src[0].match(/\(([A-Z][a-z]+)\)$/)?.[1]
      const wkDefs = Object.values(fw?.entry ?? {}).flatMap(e => e.defs)
      const forPeople = src.some(x => !x.startsWith('Wiktionary')) || wkDefs.some(d => isPersonDef(d) && (mentions(d.text, trapNames) || PERSON.test(plain(d.text)) && !/supporter|member of|follower/i.test(d.text))) || wkDefs.some(d => /^\s*(an?\s+)?(native|inhabitant)/i.test(plain(d.text)))
      const note = lang ? `${fake} is ${lang} for someone from ${label}.` : forPeople ? `${fake} is someone from ${label}.` : `${fake} means “of ${label}”.`
      traps[fake] = { note, source: src.join('; ') }
      return null
    }
    if (forHere()) return forHere()
    if (elsewhere.length) return `a real word for ${elsewhere.map(e => e.label).join(', ')} (not marked as a trap)`
    if (fw?.entry?.English?.defs?.some(d => isPersonDef(d))) return `Wiktionary defines it as a word for people: "${plain(fw.entry.English.defs.find(d => isPersonDef(d)).text).slice(0, 80)}"`
    return null
  }
  const fakes = []
  for (const f of p.fakes) {
    const why = judgeFake(f)
    if (why) log.fakesReplaced.push(`${f}: ${why}`)
    else if (fakes.length < 3) fakes.push(f)
  }
  if (fakes.length < 3) {
    for (const g of generateFakes(p.place, p.answer, [...accepted, ...offered], p.also)) {
      if (fakes.length >= 3) break
      if (fakes.some(f => fold(f) === fold(g)) || p.fakes.includes(g)) continue
      const why = judgeFake(g)
      if (!why) { fakes.push(g); log.notes.push(`generated fake ${g}`) }
    }
  }
  if (fakes.length < 3) return { ok: false, why: `only ${fakes.length} fakes pass`, log }

  // 4. The origin note, only when the etymology says so.
  let origin = null
  if (p.origin) {
    const [note, ...must] = p.origin
    const raw = deaccent(wk?.ety ?? '').toLowerCase(), text = deaccent(plain(wk?.ety ?? '')).toLowerCase()
    const has = m => { const t = deaccent(m).toLowerCase(); return /[|:]/.test(t) ? raw.includes(t) : nameRe(t).test(text) || nameRe(t).test(raw) }
    // A word borrowed from another language: that language's own etymology counts too ("porteño" ← "puerto").
    const borrowed = (wk?.ety ?? '').match(/\{\{(?:bor\+?|ubor|der|uder|inh)\|en\|([a-z-]+)\|([^|}]+)/)
    const theirs = borrowed ? Object.values(wiktionary(borrowed[2])?.entry ?? {}).map(e => e.ety ?? '').join(' ') : ''
    const theirsRaw = deaccent(theirs).toLowerCase()
    const missing = must.filter(m => !has(m) && !(theirs && (nameRe(deaccent(m).toLowerCase()).test(deaccent(plain(theirs)).toLowerCase()) || theirsRaw.includes(`|${deaccent(m).toLowerCase()}|`))))
    if (missing.length) log.notes.push(`origin note dropped: etymology lacks ${missing.join(', ')}`)
    else origin = { note, source: `Wiktionary: ${wiktionary(p.answer).title} (etymology)${borrowed && must.some(m => !has(m)) ? `; Wiktionary: ${borrowed[2]} (etymology)` : ''}` }
  }

  // 5. Nicknames, only when Wiktionary defines them for the place.
  const aka = []
  for (const n of p.aka ?? []) {
    const e = wiktionary(n)?.entry?.English
    const d = e?.defs.find(x => mentions(x.text, names) && !x.labels.some(l => ['derogatory', 'pejorative', 'offensive', 'ethnic slur'].includes(l)))
    if (d) aka.push({ word: n, labels: d.labels.filter(isMinorLabel), source: `Wiktionary: ${wiktionary(n).title}` })
    else log.notes.push(`nickname ${n} dropped: no Wiktionary definition for ${p.place}`)
  }

  return { ok: true, entry: { ...p, variants: unique([...(p.variants ?? []), ...variants]), fakes, traps, origin, aka, sources, others: others.filter(x => x.kind === 'nickname' || x.kind === 'other'), title: t.title, qid: t.qid }, log }
}

// ── Run ────────────────────────────────────────────────────────────────────

const editDistance = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}
const slug = s => deaccent(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function main() {
  const trapTitles = PLACES.flatMap(p => Object.values(p.traps ?? {}).map(trapSpec).filter(t => t.wiki && !t.means).map(t => t.wiki))
  console.log(`[demonyms] ${PLACES.length} candidates${OFFLINE ? ' (offline)' : ''}`)
  track(['titles', 'wikidata', 'reverse', 'infobox', 'wiktionary'])
  await resolveTitles([...PLACES.map(titleOf), ...trapTitles])
  const resolved = Object.values(cache.titles).filter(Boolean)
  await fetchWikidata(resolved.map(t => t.qid))
  await fetchInfoboxes(resolved.map(t => t.title))
  await fetchLists()
  track(['lists'])
  saveCache()
  const words = PLACES.flatMap(p => {
    const t = cache.titles[titleOf(p)]
    const wd = t ? (cache.wikidata[t.qid] ?? []).map(x => x.split('@')[0]) : []
    const ib = t ? (cache.infobox[t.title] ?? []).flatMap(v => formsIn(v).forms) : []
    const names = t ? unique([p.place, baseName(t.title), ...(p.also ?? [])]) : [p.place]
    const ls = t ? listRows(t.title, names).flatMap(r => formsIn(r[2]).forms) : []
    return [p.answer, ...(p.variants ?? []), ...p.fakes, ...(p.aka ?? []), ...(p.rivals ?? []), ...Object.keys(p.ignore ?? {}), ...wd, ...ib, ...ls,
      ...generateFakes(p.place, p.answer, [p.answer], p.also)]
  })
  await fetchWiktionary(words)
  saveCache()
  // Alternative forms and synonyms Wiktionary gives for each answer.
  const more = PLACES.flatMap(p => { const e = wiktionary(p.answer)?.entry?.English; return [...(e?.alt ?? []), ...(e?.syn ?? [])].map(x => x.w) })
  await fetchWiktionary(more)
  await fetchReverse(unique(PLACES.flatMap(p => [...p.fakes, ...generateFakes(p.place, p.answer, [p.answer], p.also)])))
  saveCache()

  const results = PLACES.map(p => check(p, PLACES))
  const kept = results.filter(r => r.ok).map(r => r.entry)
  const dropped = results.filter(r => !r.ok)
  // No two places may share an answer.
  const seen = new Map()
  for (const e of kept) {
    const k = fold(e.answer)
    if (seen.has(k)) throw new Error(`${e.place} and ${seen.get(k)} share ${e.answer}`)
    seen.set(k, e.place)
  }

  const tierValue = { easy: 10, medium: 20, hard: 30 }
  const data = kept.map(e => {
    const a = fold(e.answer), n = fold(e.place)
    const rank = Math.round(Math.min(1, editDistance(a, n) / Math.max(a.length, n.length)) * 100) / 100
    const out = {
      id: slug(e.place), place: e.place, where: e.where, kind: e.kind, tier: e.tier, value: tierValue[e.tier], rank,
      answer: e.answer, ...(e.variants?.length ? { variants: e.variants } : {}), fakes: e.fakes,
      ...(Object.keys(e.traps).length ? { traps: Object.fromEntries(Object.entries(e.traps).map(([k, v]) => [k, v.note])) } : {}),
      ...(e.origin ? { origin: e.origin.note } : {}),
      ...(e.aka.length ? { aka: e.aka.map(a => a.word) } : {}),
      ...(e.others.length ? { notAnswers: e.others.map(o => o.form) } : {}),
      sources: e.sources,
      ...(e.origin ? { originSource: e.origin.source } : {}),
      ...(e.aka.length ? { akaSources: e.aka.map(a => a.source) } : {}),
      ...(Object.keys(e.traps).length ? { trapSources: Object.fromEntries(Object.entries(e.traps).map(([k, v]) => [k, v.source])) } : {}),
    }
    return out
  })

  const date = new Date().toISOString().slice(0, 10)
  const ts = `// GENERATED by scripts/demonyms/verify.mjs (${date}). Do not edit by hand: change
// scripts/demonyms/places.mjs and run \`node scripts/demonyms/verify.mjs\` again.
// Every answer is given by at least two of Wikidata (P1549), the English Wikipedia
// (the place's infobox or a "List of adjectival and demonymic forms" page) and
// Wiktionary. Places where Wikidata or the infobox gives a second standard word
// beside it (Monégasque/Monacan) are left out. \`sources\` are the answer's;
// \`originSource\`, \`akaSources\` and \`trapSources\` those of the notes after it.
// \`variants\`: other spellings and less usual words the sources give (Angelino,
// Liverpolitan): right when typed, never a fake. \`notAnswers\`: nicknames,
// adjectives and other words the sources mention that aren't a word for everyone
// from the place: never right, never a fake.
import type { Demonym } from "../utils/demonyms"

export const DEMONYMS: Demonym[] = [
${data.map(d => `  ${JSON.stringify(d)},`).join('\n')}
]
`
  fs.writeFileSync(OUT, ts)
  if (!OFFLINE) saveCache(pruned())

  // The report.
  const tiers = ['easy', 'medium', 'hard']
  const lines = [`# Demonyms verification (${date})`, '',
    `${PLACES.length} candidates, ${kept.length} kept, ${dropped.length} dropped.`, '',
    `Per tier: ${tiers.map(t => `${t} ${kept.filter(e => e.tier === t).length}`).join(', ')}.`,
    `Kinds: ${['city', 'region', 'island', 'country'].map(k => `${k} ${kept.filter(e => e.kind === k).length}`).join(', ')}.`, '',
    '## Dropped', '', ...dropped.map(r => `- **${r.log.place}**: ${r.why}${r.log.sources?.length ? ` (sources for the answer: ${r.log.sources.join('; ')})` : ''}`), '',
    '## Other forms the sources give (variant/alternative: accepted when typed; nickname/other: never an answer; none can be a fake)', '',
    ...results.filter(r => r.ok && r.log.minor.length).map(r => `- **${r.log.place}**: ${r.log.minor.map(m => `${m.form} [${m.kind}] (${m.why})`).join('; ')}`), '',
    '## Fakes replaced', '', ...results.filter(r => r.log.fakesReplaced.length).map(r => `- **${r.log.place}**: ${r.log.fakesReplaced.join('; ')}`), '',
    '## Other notes', '', ...results.filter(r => r.log.notes.length).map(r => `- **${r.log.place}**: ${r.log.notes.join('; ')}`), '',
    '## Kept, with sources', '', ...kept.map(e => `- **${e.place}** → ${e.answer} (${e.tier}): ${e.sources.join('; ')}`), '']
  fs.writeFileSync(REPORT, lines.join('\n'))
  if (TABLE) {
    const cell = s => String(s ?? '').replace(/\|/g, '\\|')
    const rows = data.slice().sort((a, b) => tiers.indexOf(a.tier) - tiers.indexOf(b.tier) || a.place.localeCompare(b.place))
    fs.writeFileSync(TABLE, [`# Demonyms dataset (${data.length} places, generated ${date})`, '',
      `Easy ${data.filter(d => d.tier === 'easy').length} · Medium ${data.filter(d => d.tier === 'medium').length} · Hard ${data.filter(d => d.tier === 'hard').length}`, '',
      '| Place | Where | Kind | Tier | Answer | Also accepted | Fakes | Traps | Origin | Also called | Not answers | Sources |',
      '|---|---|---|---|---|---|---|---|---|---|---|---|',
      ...rows.map(d => `| ${cell(d.place)} | ${cell(d.where)} | ${d.kind} | ${d.tier} | **${cell(d.answer)}** | ${cell((d.variants ?? []).join(', '))} | ${cell(d.fakes.join(', '))} | ${cell(Object.values(d.traps ?? {}).join(' '))} | ${cell(d.origin)} | ${cell((d.aka ?? []).join(', '))} | ${cell((d.notAnswers ?? []).join(', '))} | ${cell(d.sources.join('; '))} |`),
      '', '## Dropped candidates', '', ...dropped.map(r => `- **${r.log.place}**: ${r.why}`), ''].join('\n'))
  }
  console.log(`[demonyms] kept ${kept.length} (${tiers.map(t => `${t} ${kept.filter(e => e.tier === t).length}`).join(', ')}), dropped ${dropped.length}`)
  console.log(`[demonyms] wrote ${path.relative(ROOT, OUT)} and ${REPORT}`)
}

await main()
