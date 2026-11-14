// What the Abroad data scripts share: the languages, the Wikidata query
// helper, the other spellings of a shown name and the closeness measures.
// Used by scripts/cities-abroad/fetch.mjs (Cities Abroad) and
// scripts/country-names/fetch.mjs (Countries Abroad and Native Names).
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isKatakana } from './romanise.mjs'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const { soundFold, coreOf, editDistance } = await import(path.join(ROOT, 'src/utils/abroad.ts'))

const UA = 'GlobalioBuild/1.0 (https://globalio.app)'

// Latin-script languages, most familiar to an English speaker first. `fam`
// (0–1) feeds the tier and the value.
export const LATIN = [
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
export const NON_LATIN = [
  ['ru', 'Russian'], ['uk', 'Ukrainian'], ['be', 'Belarusian'], ['bg', 'Bulgarian'], ['sr', 'Serbian'], ['mk', 'Macedonian'],
  ['el', 'Greek'], ['ka', 'Georgian'], ['hy', 'Armenian'], ['ko', 'Korean'], ['ja', 'Japanese'],
]
export const LANG_NAME = Object.fromEntries([...LATIN, ...NON_LATIN].map(([c, n]) => [c, n]))
export const FAM = Object.fromEntries(LATIN.map(([c, , f]) => [c, f]))
export const ORDER = [...LATIN, ...NON_LATIN].map(([c]) => c)
export const NON_LATIN_FAM = 0.2

// ── Wikidata ──────────────────────────────────────────────────────────────
export async function sparql(query) {
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
export const qid = uri => uri.replace('http://www.wikidata.org/entity/', '')
export const pause = () => new Promise(r => setTimeout(r, 1500)) // be polite between queries
export const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n))
export const wikiOf = lang => `https://${lang === 'nb' ? 'no' : lang}.wikipedia.org/`
// The Wikipedia title without its disambiguation: "Victoria (Seychelles)" → "Victoria".
export const bareTitle = t => t.replace(/\s*\(.*\)\s*$/, '').replace(/,.*$/, '').trim()

// ── Scripts ───────────────────────────────────────────────────────────────
export const LATIN_RE = /^[\p{Script=Latin}\s\-–'’ʻʼ.,()·]+$/u // · for Catalan l·l
const CYRILLIC = /^[\p{Script=Cyrillic}\s\-–'’ʼ.]+$/u
export const SCRIPT_OK = {
  ru: CYRILLIC, uk: CYRILLIC, be: CYRILLIC, bg: CYRILLIC, sr: CYRILLIC, mk: CYRILLIC,
  el: /^[\p{Script=Greek}\s\-–'’.]+$/u, ka: /^[\p{Script=Georgian}\s\-–]+$/u, hy: /^[\p{Script=Armenian}\s\-–]+$/u,
  ko: /^[\p{Script=Hangul}\s\-–·]+$/u, ja: { test: isKatakana },
}

// Other spellings of a shown name to hold up against the English: without a
// Xhosa or Zulu noun prefix (iKapa → Kapa, eRoma → Roma), without a
// Lithuanian or Latvian ending (Berlynas → Berlyn), and Korean and Japanese
// without the vowels they put between consonants, with r for l
// (Bereullin → bellin, Berurin → bellin).
export function variants(lang, shown) {
  const out = [shown]
  const prefix = shown.match(/^[iueao]-?(?=\p{Lu})/iu)
  if ((lang === 'xh' || lang === 'zu') && prefix) out.push(shown.slice(prefix[0].length))
  if (lang === 'lt') out.push(shown.replace(/(ius|ias|as|is|ys|us|a|ė|e|ai|os)$/u, ''))
  if (lang === 'lv') out.push(shown.replace(/(is|us|s|a|e)$/u, ''))
  const plain = shown.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (lang === 'ko') {
    // 시 after a name is "city" (상하이시, Sanghaisi).
    const city = plain.replace(/[\s-]*si$/, '')
    out.push(city, city.replace(/eu(?=[^aeiouy]|$)/g, '').replace(/r/g, 'l'))
  }
  if (lang === 'ja') out.push(plain.replace(/([^aeiouyn'])u(?=[^aeiouy]|$)/g, '$1').replace(/([td])o(?=[^aeiouy]|$)/g, '$1').replace(/r/g, 'l'))
  return out.filter(v => v.length >= 2)
}

// ── Closeness ─────────────────────────────────────────────────────────────
// Closeness to the English, 0–1, on the sound-alike spelling without articles:
// edit distance, plus credit for a shared start (the first letters are what a
// reader recognises). `answers` are the English name and its alternatives.
export function closeness(answers, foreign) {
  let best = 0
  for (const e of answers) {
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
export function skeleton(s) {
  return soundFold(s)
    .replace(/dzh|dsh|dj|tsh|ch|sh|zh|j/g, 'J').replace(/th/g, 'T').replace(/kh|gh/g, 'K').replace(/ng/g, 'N')
    .replace(/ts|tz|z|s|c/g, 'S').replace(/[bp]/g, 'P').replace(/[fvw]/g, 'F').replace(/[kgq]/g, 'K')
    .replace(/[dt]/g, 'T').replace(/[lr]/g, 'L').replace(/[mn]/g, 'N').replace(/[a-z0-9]/g, '').replace(/(.)\1+/g, '$1')
}
export function soundCloseness(answers, foreign) {
  let best = 0
  for (const e of answers) {
    const a = skeleton(coreOf(e)), b = skeleton(coreOf(foreign))
    best = Math.max(best, 1 - editDistance(a, b) / Math.max(1, a.length, b.length))
  }
  return best
}
