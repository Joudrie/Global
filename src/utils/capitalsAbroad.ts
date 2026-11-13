// Capitals Abroad: answer matching, round building and scoring.
//
// A round shows a capital's name in another language ("Varsovia", Spanish)
// and the player names the capital in English ("Warsaw"). The names come from
// Wikidata (scripts/capitals-abroad/fetch.mjs → src/data/capitalsAbroad.ts);
// this file is the plain logic the screen, the fetch script and the tests share.
import { shuffleWithRng } from "./prng"

export type Tier = "easy" | "medium" | "hard"
export type AnswerMode = "type" | "choice"

export const TIERS: Tier[] = ["easy", "medium", "hard"]
export const ROUNDS = 10

/** One capital: the English answer and its country. */
export interface AbroadCapital { code: string; capital: string; country: string; region: string }

/** One foreign name for a capital, in one or more languages that write it the same way. */
export interface AbroadName {
  code: string        // country (ISO code in FLAGS)
  name: string        // as written in the language(s), e.g. "Varsovia", "Москва"
  roman?: string      // Latin-letter spelling, only for non-Latin scripts ("Moskva")
  langs: string[]     // language codes, most familiar first ("es", "ca")
  tier: Tier
}

// ── Matching ───────────────────────────────────────────────────────────────

/** Fold a typed or shown name for comparison: no accents, case, punctuation,
 *  spaces or hyphens; "St" reads as "Saint"; the words "city" and "the" are
 *  dropped ("Kuwait" = "Kuwait City", "Washington DC" = "Washington, D.C."). */
export function foldName(s: string): string {
  const t = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss").replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/[øǿ]/g, "o")
    .replace(/[łŀ]/g, "l").replace(/đ/g, "d").replace(/ı/g, "i").replace(/þ/g, "th")
    .replace(/['ʻʼ’‘`´]/g, "")          // N'Djamena = Ndjamena, Nuku'alofa = Nukualofa
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ").trim()
  return t.split(" ")
    .map(w => (w === "st" ? "saint" : w === "ste" ? "sainte" : w))
    .filter(w => w && w !== "city" && w !== "the")
    .join("")
}

// Other English names people type for a capital, by country code. Dropping
// "City" and "the", "St" for "Saint", accents and punctuation are handled by
// foldName, so they need no entry here.
export const CAPITAL_ALIASES: Record<string, string[]> = {
  US: ["Washington", "Washington DC"],
  UA: ["Kiev"],
  MN: ["Ulan Bator"],
  MM: ["Naypyitaw", "Nay Pyi Taw"],
  KZ: ["Nur-Sultan"],
  TM: ["Ashkhabad"],
  XK: ["Prishtina"],
  NP: ["Katmandu"],
  KI: ["Tarawa"],
  YE: ["Sana"],
}

/** Every folded answer that counts as right for this capital. */
export function acceptedAnswers(c: Pick<AbroadCapital, "code" | "capital">): Set<string> {
  return new Set([c.capital, ...(CAPITAL_ALIASES[c.code] ?? [])].map(foldName).filter(Boolean))
}

/** True when `typed` names this capital in English. */
export function isCorrectAnswer(c: Pick<AbroadCapital, "code" | "capital">, typed: string): boolean {
  const q = foldName(typed)
  return !!q && acceptedAnswers(c).has(q)
}

/** Edit distance (Levenshtein) between two strings. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

/** A wrong answer that is only a letter or two off ("Copenhagan"). It still
 *  counts as wrong; the feedback says how it's spelled. */
export function isNearMiss(c: Pick<AbroadCapital, "code" | "capital">, typed: string): boolean {
  const q = foldName(typed)
  if (q.length < 4 || isCorrectAnswer(c, typed)) return false
  return [...acceptedAnswers(c)].some(a => editDistance(q, a) <= (a.length >= 8 ? 2 : 1))
}

// ── Rounds ─────────────────────────────────────────────────────────────────

export interface Round {
  entry: AbroadName
  capital: AbroadCapital
  choices: string[]   // four English capitals for "4 choices" mode, one of them right
}

/** Ten rounds for a tier: ten different capitals, languages spread out (no
 *  more than two rounds from the same language when the pool allows). */
export function pickRounds(names: AbroadName[], capitals: Record<string, AbroadCapital>, tier: Tier, rng: () => number, count = ROUNDS): Round[] {
  const pool = shuffleWithRng(names.filter(n => n.tier === tier && capitals[n.code]), rng)
  const picked: AbroadName[] = []
  const usedCodes = new Set<string>()
  for (const maxPerLang of [2, 3, Infinity]) {
    const perLang = new Map<string, number>()
    for (const p of picked) perLang.set(p.langs[0], (perLang.get(p.langs[0]) ?? 0) + 1)
    for (const n of pool) {
      if (picked.length >= count) break
      if (usedCodes.has(n.code) || (perLang.get(n.langs[0]) ?? 0) >= maxPerLang) continue
      picked.push(n); usedCodes.add(n.code)
      perLang.set(n.langs[0], (perLang.get(n.langs[0]) ?? 0) + 1)
    }
    if (picked.length >= count) break
  }
  const all = Object.values(capitals)
  return picked.map(entry => ({ entry, capital: capitals[entry.code], choices: choicesFor(entry, capitals[entry.code], all, rng) }))
}

// Letter pairs, for "looks a bit like it" distractors.
const bigrams = (s: string) => { const out = new Set<string>(); for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2)); return out }
function dice(a: string, b: string): number {
  const A = bigrams(a), B = bigrams(b)
  if (!A.size || !B.size) return 0
  let n = 0
  for (const x of A) if (B.has(x)) n++
  return (2 * n) / (A.size + B.size)
}

/** The right capital and three wrong ones: capitals from the same region and
 *  ones whose spelling looks like the foreign name, never a second right answer. */
export function choicesFor(entry: AbroadName, answer: AbroadCapital, all: AbroadCapital[], rng: () => number): string[] {
  const shown = foldName(entry.roman ?? entry.name)
  const right = acceptedAnswers(answer)
  const seen = new Set([foldName(answer.capital)])
  const scored = all
    .filter(c => c.code !== answer.code && !right.has(foldName(c.capital)))
    .map(c => {
      const f = foldName(c.capital)
      const score = (c.region === answer.region ? 1 : 0) + dice(shown, f) * 2.5 + (f[0] === shown[0] ? 0.4 : 0) + rng() * 0.9
      return { c, score }
    })
    .sort((a, b) => b.score - a.score)
  const wrong: string[] = []
  for (const { c } of scored) {
    const f = foldName(c.capital)
    if (seen.has(f)) continue
    seen.add(f)
    wrong.push(c.capital)
    if (wrong.length === 3) break
  }
  return shuffleWithRng([answer.capital, ...wrong], rng)
}

// ── Scoring ────────────────────────────────────────────────────────────────

/** Points for one round. Typing scores double; a hint halves the round. */
export function roundPoints(mode: AnswerMode, correct: boolean, hinted: boolean): number {
  if (!correct) return 0
  const base = mode === "type" ? 20 : 10
  return hinted ? base / 2 : base
}
export const maxScore = (mode: AnswerMode) => roundPoints(mode, true, false) * ROUNDS

/** The hint: the country, unless the country's name gives the capital away
 *  (Singapore, Kuwait City, Luxembourg), then the region and first letter. */
export function hintFor(c: AbroadCapital): string {
  const cap = foldName(c.capital), country = foldName(c.country)
  if (cap.includes(country) || country.includes(cap)) return `A capital in ${c.region}, starting with ${c.capital[0]}`
  return `The capital of ${c.country}`
}

/** "Spanish", "Spanish and Catalan", "German, Dutch and Swedish". */
export function listLanguages(codes: string[], names: Record<string, string>): string {
  const n = codes.map(c => names[c] ?? c)
  if (n.length <= 1) return n[0] ?? ""
  return `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`
}
