// The engine behind Cities Abroad, Countries Abroad and Native Names: a place's
// name as some language writes it, and the player names the place in English.
// Ten right before three strikes wins.
//
// This file is the part the three games share: folding names for comparison,
// the "spelled like the English" test, the forgiving answer check, picking a
// game's rounds and its four choices, and scoring. Each game's own file
// (citiesAbroad.ts, countryNames.ts) says what counts as a right answer, what
// the hint says and which names look too much like the answer to show.
import { shuffleWithRng } from "./prng"

export type Tier = "easy" | "medium" | "hard"
export type AnswerMode = "type" | "choice"

export const TIERS: Tier[] = ["easy", "medium", "hard"]
/** Right answers that win a game. */
export const TARGET = 10
/** Wrong answers that end it. */
export const STRIKES = 3
/** The most rounds a game can take: nine right and two wrong, then one more. */
export const MAX_ROUNDS = TARGET + STRIKES - 1
/** What a name is worth before typing doubles it or a hint halves it. */
export type Value = 10 | 20 | 30

/** One name as a round shows it, in one or more languages that write it the same way. */
export interface AbroadEntry {
  name: string        // as written in the language(s), e.g. "Benetke", "Москва"
  roman?: string      // Latin-letter spelling, only for non-Latin scripts ("Moskva")
  langs: string[]     // language codes, most familiar first ("es", "ca")
  tier: Tier
  value: Value        // how far from the English and how unexpected: 10, 20 or 30
  rank: number        // difficulty inside the tier, 0 (gentlest) – 1; a game plays its rounds in this order
}

// ── Folding ────────────────────────────────────────────────────────────────

/** Fold a typed or shown name for comparison: no accents, case, punctuation,
 *  spaces or hyphens; "St" reads as "Saint"; the words "city" and "the" are
 *  dropped ("Kuwait" = "Kuwait City", "Hague" = "The Hague"). */
export function foldName(s: string): string {
  const t = s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss").replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/[øǿ]/g, "o")
    .replace(/[łŀ]/g, "l").replace(/đ/g, "d").replace(/ı/g, "i").replace(/þ/g, "th").replace(/ð/g, "d")
    .replace(/['ʻʼ’‘`´]/g, "")          // N'Djamena = Ndjamena, Nuku'alofa = Nukualofa
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ").trim()
  return t.split(" ")
    .map(w => (w === "st" ? "saint" : w === "ste" ? "sainte" : w))
    .filter(w => w && w !== "city" && w !== "the")
    .join("")
}

/** foldName with doubled letters made single ("Havanna" and "Havana" both "havana"). */
export const squash = (s: string) => foldName(s).replace(/(.)\1+/g, "$1")

/** squash, plus the spellings that say the same sound: č, š, ž are ch, sh,
 *  zh, and so are German tsch and sch; a hard c is k ("Kopenhaga",
 *  "Copenhagen"); ph is f, qu is k, x is ks and y is i. */
export const soundFold = (s: string) => squash(s.replace(/[čćČĆ]/g, "ch").replace(/[šśşșŠŚŞȘ]/g, "sh").replace(/[žźŽŹ]/g, "zh"))
  .replace(/dsch|dzh/g, "j").replace(/tsch|tch/g, "ch").replace(/sch/g, "sh")
  .replace(/ph/g, "f").replace(/qu/g, "k").replace(/ck/g, "k").replace(/c(?![eiyh])/g, "k").replace(/x/g, "ks").replace(/y/g, "i")
  .replace(/(.)\1+/g, "$1")

/** Edit distance with swapped neighbours counting as one edit (optimal
 *  string alignment): "Olso" is one slip from "Oslo", not two. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

/** True when two already-folded names are spelled the same or nearly so:
 *  one slip apart, at most `ratio` of the letters changed (a quarter by
 *  default: "Bukarest", "Bucharest"), or the same word with a short ending
 *  added or swapped ("Prag", "Prague"; "Berlino", "Berlin"). */
export function nearlySame(a: string, b: string, ratio = 0.25): boolean {
  if (a === b) return true
  const d = editDistance(a, b)
  const long = Math.max(a.length, b.length), short = Math.min(a.length, b.length)
  if (d <= 1 || d / long <= ratio) return true
  let p = 0
  while (p < short && a[p] === b[p]) p++
  return p >= 4 && p >= short - 1 && long - p <= 2
}

// Little words that don't carry a name: articles, "of", and the words for
// "city" ("La Meca" is Mecca, "Ciudad de México" is Mexico City).
const FILLER = new Set(["la", "le", "les", "el", "il", "l", "lo", "al", "de", "del", "della", "do", "da", "di", "du", "des", "of", "the",
  "den", "het", "an", "a", "na", "ar", "y", "i",
  "ciudad", "ciutat", "citta", "cidade", "ville", "stadt", "stad", "staden", "varos", "orasul", "sehri", "grad", "mesto", "miasto", "kaupunki", "city", "kota", "bandar", "thanh", "pho", "mji"])
/** The words of a name, folded ("Ciudad de México" → ciudad, de, mexico). */
export const nameWords = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "")
  .split(/[\s\-–,.()'’ʼ]+/).map(foldName).filter(Boolean)
/** The words of a name that carry it: no articles or words for "city". */
export const contentWords = (s: string) => nameWords(s).filter(w => !FILLER.has(w))
/** A name without its articles and words for "city", folded. */
export const coreOf = (s: string) => contentWords(s).join("") || foldName(s)

/** An id from an English name: lower case, hyphens for spaces ("Xi'an" → "xian"). */
export const slugOf = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/ß/g, "ss").replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/[øǿ]/g, "o").replace(/[łŀ]/g, "l").replace(/đ/g, "d").replace(/ı/g, "i")
  .replace(/['ʻʼ’‘`´.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

/** The folded forms of a place's English name and its accepted alternatives. */
export const acceptedSet = (answers: string[]) => new Set(answers.map(foldName).filter(Boolean))

// ── Spelled like the answer ────────────────────────────────────────────────

/** True when a shown name is spelled the same as, or nearly the same as, one
 *  of the English answers, on the plain spelling and on the sound-alike one
 *  (doubled letters single, c as k, y as i...), with and without its
 *  articles. `ratio` is passed on to nearlySame. */
export function looksLikeAny(answers: string[], shown: string, ratio = 0.25): boolean {
  const forms = (s: string) => [squash(s), soundFold(s), squash(coreOf(s)), soundFold(coreOf(s))].filter(Boolean)
  const mine = forms(shown)
  return answers.some(a => {
    const theirs = forms(a)
    return mine.some(m => theirs.some(t => nearlySame(m, t, ratio)))
  })
}

// ── Typed answers ──────────────────────────────────────────────────────────

/** How many slips a typed answer may have and still count: none up to three
 *  letters, one up to five, two up to nine, three beyond. */
export const typoAllowance = (len: number) => (len <= 3 ? 0 : len <= 5 ? 1 : len <= 9 ? 2 : 3)

export interface Verdict {
  correct: boolean
  /** Right, but not spelled the way the game spells it: show the spelling. */
  misspelt: boolean
  /** Wrong, but only just: the feedback shows how it's spelled. */
  near: boolean
  /** Wrong because it fits more than one place ("Congo", "Korea"): the feedback asks which. */
  vague?: boolean
}

/** Judge a typed answer against the folded right answers. Exact (after
 *  folding) is right. A few slips (typoAllowance) are right too, unless the
 *  guess is just as close to another place's answers, or no further from the
 *  name on the card than from the answer (copying "Lontoo" isn't "London").
 *  `others` holds every other place's folded answers. */
export function judgeTyped(answers: Set<string>, typed: string, shown: string, others: Iterable<Set<string>>): Verdict {
  const q = foldName(typed)
  if (!q) return { correct: false, misspelt: false, near: false }
  if (answers.has(q)) return { correct: true, misspelt: false, near: false }
  const card = foldName(shown)
  let best = Infinity, allowed = false
  for (const a of answers) {
    const d = editDistance(q, a)
    if (d < best) best = d
    if (d <= typoAllowance(a.length)) allowed = true
  }
  if (q === card || squash(typed) === squash(shown)) return { correct: false, misspelt: false, near: false }
  // The closest other place: a guess at least as close to it isn't a slip for this one.
  let other = Infinity
  for (const set of others) for (const b of set) other = Math.min(other, editDistance(q, b))
  if (allowed && editDistance(q, card) > best && other > best) return { correct: true, misspelt: true, near: false }
  const near = q.length >= 3 && other > 0 && [...answers].some(a => editDistance(q, a) <= typoAllowance(a.length) + 1)
  return { correct: false, misspelt: false, near }
}

// ── The answer box ─────────────────────────────────────────────────────────

/** The answer box's attributes. iOS offers contacts ("AutoFill Contact", the
 *  owner's first name) for a field whose placeholder, label, id or name
 *  mentions a name, so none of them may. */
export interface GuessField {
  id: string
  placeholder: string
  label: string
  autoComplete: "off"
  autoCorrect: "off"
  autoCapitalize: "words"
  spellCheck: false
  enterKeyHint: "go"
}

// ── Rounds ─────────────────────────────────────────────────────────────────

/** One round as the screen plays it, whichever game it comes from. */
export interface AbroadRound {
  entry: AbroadEntry
  answer: string                        // the English name ("Venice")
  where: string                         // under the answer in the results ("Italy", "Europe")
  learnAs: string                       // after "Slovenian for …" ("Venice, Italy")
  hint: string
  choices: string[]                     // four English names, one of them right
  judge: (typed: string) => Verdict
  isRight: (picked: string) => boolean
}

/** At most this many rounds of a game are in another script while the pool
 *  allows, so most of it is names that take reasoning (Benetke, Bécs). */
export const MAX_OTHER_SCRIPT = 5

// A weighted draw: a name worth 30 comes up three times as often as one worth 10.
const weightKey = (n: AbroadEntry, rng: () => number) => Math.pow(rng(), 10 / n.value)

/** The names of one game in a tier: up to `count` different places, at most
 *  two from one language where the pool allows (then three, then any), and
 *  at most `maxOtherScript` in another script, played gentlest first. Every
 *  place has the same chance however many names it has; odder names come up
 *  more often. `placeOf` gives the place a name belongs to; names whose place
 *  `known` rejects are left out. */
export function pickEntries<E extends AbroadEntry>(names: E[], placeOf: (n: E) => string, known: (place: string) => boolean,
  tier: Tier, rng: () => number, count = MAX_ROUNDS, maxOtherScript = MAX_OTHER_SCRIPT): E[] {
  const byPlace = new Map<string, E[]>()
  for (const n of names) if (n.tier === tier && known(placeOf(n))) byPlace.set(placeOf(n), [...(byPlace.get(placeOf(n)) ?? []), n])
  // One name per place, then the places in a weighted random order.
  const pool = [...byPlace.values()]
    .map(list => list.map(n => ({ n, key: weightKey(n, rng) })).sort((a, b) => b.key - a.key)[0].n)
    .map(n => ({ n, key: weightKey(n, rng) })).sort((a, b) => b.key - a.key).map(x => x.n)
  const picked: E[] = []
  const used = new Set<string>()
  for (const maxPerLang of [2, 3, Infinity]) {
    const perLang = new Map<string, number>()
    for (const p of picked) perLang.set(p.langs[0], (perLang.get(p.langs[0]) ?? 0) + 1)
    let other = picked.filter(p => p.roman).length
    for (const n of pool) {
      if (picked.length >= count) break
      if (used.has(placeOf(n)) || (perLang.get(n.langs[0]) ?? 0) >= maxPerLang) continue
      if (n.roman && other >= maxOtherScript && maxPerLang !== Infinity) continue
      picked.push(n); used.add(placeOf(n))
      perLang.set(n.langs[0], (perLang.get(n.langs[0]) ?? 0) + 1)
      if (n.roman) other++
    }
    if (picked.length >= count) break
  }
  return picked.sort((a, b) => a.rank - b.rank)
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

/** A place a choice can name: its English name, its country code and region. */
export interface ChoicePlace { id: string; answer: string; code: string; region: string }

/** The right answer and three wrong ones: places in the same country (worth
 *  `sameCode`) or region (`sameRegion`) and ones whose spelling looks like
 *  the name on the card, never a second right answer. `right` holds the
 *  folded right answers; `shown` is the name on the card (its Latin spelling
 *  for other scripts). */
export function pickChoices(shown: string, answer: ChoicePlace, right: Set<string>, all: ChoicePlace[], rng: () => number,
  weights: { sameCode: number; sameRegion: number } = { sameCode: 0.8, sameRegion: 0.8 }): string[] {
  const f0 = foldName(shown)
  const seen = new Set([foldName(answer.answer)])
  const scored = all
    .filter(c => c.id !== answer.id && !right.has(foldName(c.answer)))
    .map(c => {
      const f = foldName(c.answer)
      const score = (c.code === answer.code ? weights.sameCode : 0) + (c.region === answer.region ? weights.sameRegion : 0)
        + dice(f0, f) * 2.5 + (f[0] === f0[0] ? 0.4 : 0) + rng() * 1.2
      return { c, score }
    })
    .sort((a, b) => b.score - a.score)
  const wrong: string[] = []
  for (const { c } of scored) {
    const f = foldName(c.answer)
    if (seen.has(f)) continue
    seen.add(f)
    wrong.push(c.answer)
    if (wrong.length === 3) break
  }
  return shuffleWithRng([answer.answer, ...wrong], rng)
}

// ── Scoring ────────────────────────────────────────────────────────────────

/** Points for one round: the name's value, doubled for typing, halved by a hint. */
export function roundPoints(value: Value, mode: AnswerMode, correct: boolean, hinted: boolean): number {
  if (!correct) return 0
  const base = mode === "type" ? value * 2 : value
  return hinted ? base / 2 : base
}

export type GameState = "playing" | "won" | "out"
/** Where a game stands after these answers. */
export function gameState(answers: { correct: boolean }[]): GameState {
  const right = answers.filter(a => a.correct).length
  if (right >= TARGET) return "won"
  if (answers.length - right >= STRIKES) return "out"
  return "playing"
}

/** "Spanish", "Spanish and Catalan", "German, Dutch and Swedish"; past `max`
 *  languages, "Swedish, Danish, Czech and 4 more". */
export function listLanguages(codes: string[], names: Record<string, string>, max = Infinity): string {
  const n = codes.map(c => names[c] ?? c)
  if (n.length <= 1) return n[0] ?? ""
  if (n.length > max) return `${n.slice(0, max).join(", ")} and ${n.length - max} more`
  return `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`
}
