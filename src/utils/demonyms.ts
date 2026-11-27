// Demonyms: "What do you call someone from Naples?" Neapolitan, not Nepalese.
//
// The places come from scripts/demonyms/verify.mjs (src/data/demonyms.ts):
// every answer is given by at least two of Wikidata, the English Wikipedia and
// Wiktionary. This file is the game's side of the Abroad engine
// (src/utils/abroad.ts): the typed-answer check, the hint, picking a game's
// rounds and its four choices. Spelling is the point of the game, so a typed
// answer may have one slip only when the word has eight letters or more, and
// never matches a fake or another place's word.
import { editDistance } from "./abroad"
import type { AbroadEntry, GuessField, Tier, Value, Verdict } from "./abroad"
import { shuffleWithRng } from "./prng"

export type DemonymKind = "city" | "region" | "island" | "country"

/** One place, as verify.mjs writes it. */
export interface Demonym {
  id: string
  place: string            // "Naples"
  where: string            // shown small under the place: "Italy", "Ontario, Canada"
  kind: DemonymKind
  tier: Tier
  value: Value
  rank: number             // 0 (the answer looks like the place) – 1 (nothing alike); a game plays gentlest first
  answer: string           // the usual word, as shown: "Neapolitan"
  variants?: string[]      // other spellings and less usual words the sources give: right when typed
  fakes: string[]          // three wrong answers
  traps?: Record<string, string>   // fakes that are real words elsewhere: "Nepalese is someone from Nepal."
  origin?: string          // one sourced line on where the word comes from
  aka?: string[]           // sourced nicknames, never answers ("Scouser")
  notAnswers?: string[]    // nicknames, adjectives and other places' words the sources mention: never right
  sources: string[]        // where the answer comes from: at least two of Wikidata, Wikipedia and Wiktionary
  originSource?: string
  akaSources?: string[]
  trapSources?: Record<string, string>
}

// ── Matching ───────────────────────────────────────────────────────────────

/** Fold a word for comparison: no case, accents, spaces, hyphens or
 *  punctuation ("I-Kiribati" = "i kiribati", "Burkinabé" = "burkinabe"). */
export function foldDemonym(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/ß/g, "ss").replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/ø/g, "o")
    .replace(/\bst\b\.?/g, "saint")
    .replace(/[^a-z]/g, "")
}

/** Letters a typed answer may get wrong: one in a word of eight letters or more, none in a shorter one. */
export const slipsAllowed = (folded: string) => (folded.length >= 8 ? 1 : 0)

/** Every folded form that counts as right for a place. */
export const acceptedForms = (d: Pick<Demonym, "answer" | "variants">) =>
  new Set([d.answer, ...(d.variants ?? [])].map(foldDemonym).filter(Boolean))

/** Words that are never right for this place: its fakes, its nicknames and
 *  other non-answers, and every other place's words. */
const forbiddenMemo = new WeakMap<Demonym[], Map<string, Set<string>>>()
export function forbiddenForms(d: Demonym, all: Demonym[]): Set<string> {
  const memo = forbiddenMemo.get(all) ?? new Map<string, Set<string>>()
  forbiddenMemo.set(all, memo)
  const known = memo.get(d.id)
  if (known) return known
  const out = new Set<string>()
  const right = acceptedForms(d)
  const add = (w: string) => { const f = foldDemonym(w); if (f && !right.has(f)) out.add(f) }
  for (const w of [...d.fakes, ...(d.notAnswers ?? []), ...(d.aka ?? []), ...Object.keys(d.traps ?? {})]) add(w)
  for (const o of all) if (o.id !== d.id) for (const w of [o.answer, ...(o.variants ?? [])]) add(w)
  memo.set(d.id, out)
  return out
}

/** Judge a typed answer. Right: the answer or a listed variant, ignoring case,
 *  accents and punctuation; or one slip from one of them when it has eight
 *  letters or more, unless the guess is a fake, a nickname, another place's
 *  word, or as close to one of those as to the answer. */
export function judgeDemonym(d: Demonym, typed: string, all: Demonym[]): Verdict {
  const q = foldDemonym(typed)
  const none = { correct: false, misspelt: false, near: false }
  if (!q) return none
  const right = acceptedForms(d)
  if (right.has(q)) return { correct: true, misspelt: false, near: false }
  const wrong = forbiddenForms(d, all)
  if (wrong.has(q)) return none
  let best = Infinity, slip = false
  for (const a of right) {
    const dist = editDistance(q, a)
    best = Math.min(best, dist)
    if (dist <= slipsAllowed(a)) slip = true
  }
  let other = Infinity
  for (const w of wrong) other = Math.min(other, editDistance(q, w))
  if (slip && other > best) return { correct: true, misspelt: true, near: false }
  return { correct: false, misspelt: false, near: best <= 2 && other > best }
}

/** True when a picked choice (always spelled as shown) is this place's answer. */
export const isDemonym = (d: Demonym, picked: string) => acceptedForms(d).has(foldDemonym(picked))

// ── The hint ───────────────────────────────────────────────────────────────

// Endings English demonyms use, longest first: the hint names the one the answer has.
const ENDINGS = ["itan", "udlian", "wegian", "egian", "onian", "unian", "sider", "ician", "enian", "orian", "anian", "inian",
  "asque", "ian", "ean", "ese", "ite", "eño", "eno", "ano", "ino", "ais", "ois", "ain", "ard", "ine", "ene", "iot", "ot", "man", "er", "an", "i", "x"]

/** The answer's ending as a hint: "-onian" for Haligonian, "-itan" for Neapolitan. */
export function endingOf(answer: string): string {
  const a = answer.toLowerCase()
  // About half the word at most, so the hint never spells most of it ("-itan", not "-politan", for Tripolitan).
  const e = ENDINGS.find(x => a.endsWith(x) && x.length <= Math.max(2, Math.ceil(a.length * 0.55))) ?? a.slice(-2)
  return answer.slice(answer.length - e.length)
}

/** Half points: the first two letters, or the ending, whichever rules out
 *  more of the fakes (the ending when it's a tie, since the first letters
 *  usually match the place). Never the whole answer. */
export function demonymHint(d: Pick<Demonym, "answer" | "fakes" | "place">): string {
  const a = d.answer
  const start = a.slice(0, 2)
  const end = endingOf(a)
  const f = (s: string) => foldDemonym(s)
  const outByStart = d.fakes.filter(x => !f(x).startsWith(f(start))).length
  const outByEnd = d.fakes.filter(x => !f(x).endsWith(f(end))).length
  const useStart = outByStart > outByEnd || (outByStart === outByEnd && f(d.place).slice(0, 2) !== f(start) && outByEnd === 0)
  return useStart ? `Starts with ${start}…` : `Ends in -${end}`
}

// ── Rounds ─────────────────────────────────────────────────────────────────

/** The answer box: nothing in it mentions a name, or iOS offers contacts. */
export const DEMONYM_FIELD = {
  id: "dm-guess",
  placeholder: "Type the word",
  label: "The word for someone from this place",
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "words",
  spellCheck: false,
  enterKeyHint: "go",
} as const satisfies GuessField

/** The example on each difficulty button: a place from that tier (tested). */
export const DEMONYM_SAMPLES: Record<Tier, { name: string; lang: string }> = {
  easy: { name: "Venice", lang: "en" },
  medium: { name: "Manchester", lang: "en" },
  hard: { name: "Halifax", lang: "en" },
}

/** A place as the shared engine shows it. */
export const entryOf = (d: Demonym): AbroadEntry => ({ name: d.place, langs: ["en"], tier: d.tier, value: d.value, rank: d.rank })

/** The country a place is in, for spreading a game across the world ("Ontario, Canada" → "Canada"). */
export const countryOf = (d: Pick<Demonym, "where">) => d.where.split(",").pop()!.trim()

/** One game's places in a tier: up to `count`, no more than three from one
 *  country while the tier has enough, a weighted draw (the less guessable,
 *  the likelier), played gentlest first. */
export function pickDemonyms(all: Demonym[], tier: Tier, rng: () => number, count = 12): Demonym[] {
  const pool = all.filter(d => d.tier === tier)
    .map(d => ({ d, key: Math.pow(rng(), 1 / (0.6 + d.rank)) }))
    .sort((a, b) => b.key - a.key).map(x => x.d)
  const picked: Demonym[] = []
  for (const cap of [3, Infinity]) {
    const per = new Map<string, number>()
    for (const p of picked) per.set(countryOf(p), (per.get(countryOf(p)) ?? 0) + 1)
    for (const d of pool) {
      if (picked.length >= count) break
      if (picked.includes(d) || (per.get(countryOf(d)) ?? 0) >= cap) continue
      picked.push(d)
      per.set(countryOf(d), (per.get(countryOf(d)) ?? 0) + 1)
    }
  }
  return picked.sort((a, b) => a.rank - b.rank)
}

/** The four choices: the answer and its three fakes, shuffled. */
export const demonymChoices = (d: Demonym, rng: () => number) => shuffleWithRng([d.answer, ...d.fakes], rng)

/** After the answer: whose word a picked or typed trap is ("Nepalese is
 *  someone from Nepal."), or that a less usual word counts too. */
export function afterAnswer(d: Demonym, given: string): string | null {
  const g = foldDemonym(given)
  const trap = Object.entries(d.traps ?? {}).find(([w]) => foldDemonym(w) === g)
  if (trap) return trap[1]
  const variant = (d.variants ?? []).find(v => foldDemonym(v) === g)
  if (variant && foldDemonym(variant) !== foldDemonym(d.answer)) return `${variant} counts too, but ${d.answer} is the usual word.`
  const nick = (d.aka ?? []).find(n => foldDemonym(n) === g)
  if (nick) return `${nick} is a nickname; the word is ${d.answer}.`
  return null
}

/** "Also called a Scouser." for a sourced nickname. */
export const akaLine = (d: Pick<Demonym, "aka">) => d.aka?.length
  ? `Also called ${d.aka.map(n => `${/^[aeiou]/i.test(n) ? "an" : "a"} ${n}`).join(" or ")}.` : null
