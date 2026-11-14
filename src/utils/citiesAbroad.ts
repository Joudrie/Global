// Cities Abroad: answer matching, round building and scoring.
//
// A round shows a city's name in another language ("Benetke", Slovenian) and
// the player names the city in English ("Venice"). Ten right before three
// strikes wins. The names come from Wikidata (scripts/cities-abroad/fetch.mjs
// → src/data/citiesAbroad.ts); this file is the plain logic the screen, the
// fetch script and the tests share.
import { shuffleWithRng } from "./prng"

export type Tier = "easy" | "medium" | "hard"
export type AnswerMode = "type" | "choice"

export const TIERS: Tier[] = ["easy", "medium", "hard"]
/** The example on each difficulty button: a real name from that tier (tested). */
export const TIER_SAMPLES: Record<Tier, { name: string; lang: string }> = {
  easy: { name: "Wien", lang: "de" },
  medium: { name: "Mailand", lang: "de" },
  hard: { name: "Pietari", lang: "fi" },
}
/** Right answers that win a game. */
export const TARGET = 10
/** Wrong answers that end it. */
export const STRIKES = 3
/** The most rounds a game can take: nine right and two wrong, then one more. */
export const MAX_ROUNDS = TARGET + STRIKES - 1
/** What a name is worth before typing doubles it or a hint halves it. */
export type Value = 10 | 20 | 30

/** One city: the English answer and its country. */
export interface AbroadCity {
  id: string          // a slug of the English name ("saint-petersburg")
  city: string        // the English name ("Saint Petersburg")
  country: string     // as in FLAGS ("Russia"); a few disputed cities say so ("Israel / Palestine")
  code: string        // ISO code of the country in FLAGS ("RU")
  region: string      // the country's region in FLAGS
  capital: boolean    // the country's capital (never for split or disputed capitals)
}

/** One foreign name for a city, in one or more languages that write it the same way. */
export interface AbroadName {
  city: string        // AbroadCity id
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
 *  one slip apart, a quarter or less of the letters changed ("Bukarest",
 *  "Bucharest"), or the same word with a short ending added or swapped
 *  ("Prag", "Prague"; "Berlino", "Berlin"). */
export function nearlySame(a: string, b: string): boolean {
  if (a === b) return true
  const d = editDistance(a, b)
  const long = Math.max(a.length, b.length), short = Math.min(a.length, b.length)
  if (d <= 1 || d / long <= 0.25) return true
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

/** A city's id: its English name in lower case, hyphens for spaces ("Xi'an" → "xian"). */
export const slugOf = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/ß/g, "ss").replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/[øǿ]/g, "o").replace(/[łŀ]/g, "l").replace(/đ/g, "d").replace(/ı/g, "i")
  .replace(/['ʻʼ’‘`´.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

// ── Answers ────────────────────────────────────────────────────────────────

// Other English names people type for a city, by city id. Accents, hyphens,
// "City", "The" and "St" for "Saint" are handled by foldName, so they need
// no entry here. Old English names that are still in use count; a city's
// name in another language never does.
export const CITY_ALIASES: Record<string, string[]> = {
  "washington-dc": ["Washington", "Washington DC", "DC"],
  "new-york": ["New York City", "NYC", "NY"],
  "los-angeles": ["LA", "L.A."],
  "san-francisco": ["SF"],
  "mexico-city": ["Mexico"],
  "rio-de-janeiro": ["Rio"],
  "kuala-lumpur": ["KL"],
  "hong-kong": ["HK"],
  "ho-chi-minh-city": ["Ho Chi Minh", "HCMC", "Saigon"],
  "kyiv": ["Kiev"],
  "istanbul": ["Constantinople"],
  "beijing": ["Peking"],
  "mumbai": ["Bombay"],
  "kolkata": ["Calcutta"],
  "chennai": ["Madras"],
  "bengaluru": ["Bangalore"],
  "yangon": ["Rangoon"],
  "guangzhou": ["Canton"],
  "chongqing": ["Chungking"],
  "nanjing": ["Nanking"],
  "xian": ["Sian"],
  "thessaloniki": ["Saloniki", "Salonica", "Salonika", "Thessalonica"],
  "saint-petersburg": ["Petersburg"],
  "the-hague": ["Hague"],
  "almaty": ["Alma-Ata"],
  "south-tarawa": ["Tarawa"],
  "kharkiv": ["Kharkov"],
  "odesa": ["Odessa"],
  "varanasi": ["Benares"],
  "tianjin": ["Tientsin"],
  "izmir": ["Smyrna"],
  "antalya": ["Adalia"],
  "szczecin": ["Stettin"],
  "poznan": ["Posen"],
  "veliky-novgorod": ["Novgorod"],
  "astana": ["Nur-Sultan"],
  "ulaanbaatar": ["Ulan Bator"],
  "naypyidaw": ["Naypyitaw", "Nay Pyi Taw"],
  "ashgabat": ["Ashkhabad"],
  "pristina": ["Prishtina"],
  "kathmandu": ["Katmandu"],
  "sanaa": ["Sana"],
  "chisinau": ["Kishinev"],
  "tbilisi": ["Tiflis"],
  "lviv": ["Lvov", "Lemberg"],
  "gdansk": ["Danzig"],
  "wroclaw": ["Breslau"],
  "krakow": ["Cracow"],
  "zaragoza": ["Saragossa"],
  "frankfurt": ["Frankfurt am Main"],
  "freiburg": ["Freiburg im Breisgau"],
  "hanover": ["Hannover"],
  "basel": ["Basle"],
  "bern": ["Berne"],
  "tehran": ["Teheran"],
  "marrakesh": ["Marrakech"],
  "fez": ["Fes"],
  "tangier": ["Tangiers"],
  "jeddah": ["Jidda", "Jiddah"],
  "mecca": ["Makkah"],
  "medina": ["Madinah"],
  "quebec-city": ["Quebec"],
}

/** Every folded answer that counts as right for this city. */
export function acceptedAnswers(c: Pick<AbroadCity, "id" | "city">): Set<string> {
  return new Set([c.city, ...(CITY_ALIASES[c.id] ?? [])].map(foldName).filter(Boolean))
}

/** True when a shown name is spelled the same as, or nearly the same as, the
 *  city's English name or an accepted alternative: those rounds are a copying
 *  exercise ("Havanna", "Berlino", "Prag"), so the game never shows them.
 *  `shown` is the name, or its Latin spelling for a non-Latin script. */
export function looksLikeAnswer(c: Pick<AbroadCity, "id" | "city">, shown: string): boolean {
  const answers = [c.city, ...(CITY_ALIASES[c.id] ?? [])]
  const forms = (s: string) => [squash(s), soundFold(s), squash(coreOf(s)), soundFold(coreOf(s))].filter(Boolean)
  const mine = forms(shown)
  return answers.some(a => {
    const theirs = forms(a)
    return mine.some(m => theirs.some(t => nearlySame(m, t)))
  })
}

/** How many slips a typed answer may have and still count: none up to three
 *  letters, one up to five, two up to nine, three beyond. */
export const typoAllowance = (len: number) => (len <= 3 ? 0 : len <= 5 ? 1 : len <= 9 ? 2 : 3)

export interface Verdict {
  correct: boolean
  /** Right, but not spelled the way the game spells it: show the spelling. */
  misspelt: boolean
  /** Wrong, but only just: the feedback shows how it's spelled. */
  near: boolean
}

/** Judge a typed answer. Exact (after folding) or an accepted alternative is
 *  right. A few slips (typoAllowance) are right too, unless the guess is just
 *  as close to another city's English name, or no further from the name on
 *  the card than from the answer (copying "Lontoo" isn't "London"). */
export function judgeAnswer(c: Pick<AbroadCity, "id" | "city">, typed: string, shown: string, others: Pick<AbroadCity, "id" | "city">[]): Verdict {
  const q = foldName(typed)
  if (!q) return { correct: false, misspelt: false, near: false }
  const answers = acceptedAnswers(c)
  if (answers.has(q)) return { correct: true, misspelt: false, near: false }
  const card = foldName(shown)
  let best = Infinity, allowed = false
  for (const a of answers) {
    const d = editDistance(q, a)
    if (d < best) best = d
    if (d <= typoAllowance(a.length)) allowed = true
  }
  if (q === card || squash(typed) === squash(shown)) return { correct: false, misspelt: false, near: false }
  // The closest other city: a guess at least as close to it isn't a slip for this one.
  let other = Infinity
  for (const o of others) if (o.id !== c.id) for (const b of acceptedAnswers(o)) other = Math.min(other, editDistance(q, b))
  if (allowed && editDistance(q, card) > best && other > best) return { correct: true, misspelt: true, near: false }
  const near = q.length >= 3 && other > 0 && [...answers].some(a => editDistance(q, a) <= typoAllowance(a.length) + 1)
  return { correct: false, misspelt: false, near }
}

/** True when `picked` (a 4-choices button, always an English name) is this city. */
export const isCity = (c: Pick<AbroadCity, "id" | "city">, picked: string) => acceptedAnswers(c).has(foldName(picked))

// ── The answer box ─────────────────────────────────────────────────────────

/** The answer box's attributes. iOS offers contacts ("AutoFill Contact", the
 *  owner's first name) for a field whose placeholder, label, id or name
 *  mentions a name, so none of them does. */
export const GUESS_FIELD = {
  id: "ca-guess",
  placeholder: "City in English",
  label: "The city in English",
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "words",
  spellCheck: false,
  enterKeyHint: "go",
} as const

// ── Rounds ─────────────────────────────────────────────────────────────────

export interface Round {
  entry: AbroadName
  city: AbroadCity
  choices: string[]   // four English city names for "4 choices" mode, one of them right
}

/** At most this many rounds of a hard game are in another script, so most
 *  of it is the Latin-letter names that take reasoning (Benetke, Bécs). */
export const MAX_OTHER_SCRIPT = 5

// A weighted draw: a name worth 30 comes up three times as often as one worth 10.
const weightKey = (n: AbroadName, rng: () => number) => Math.pow(rng(), 10 / n.value)

/** The rounds of one game in a tier: up to MAX_ROUNDS different cities, at
 *  most two from one language where the pool allows (then three, then any),
 *  played gentlest first, the way the paper game built up. Every city has the
 *  same chance however many names it has; odder names come up more often. */
export function pickRounds(names: AbroadName[], cities: Record<string, AbroadCity>, tier: Tier, rng: () => number, count = MAX_ROUNDS): Round[] {
  const byCity = new Map<string, AbroadName[]>()
  for (const n of names) if (n.tier === tier && cities[n.city]) byCity.set(n.city, [...(byCity.get(n.city) ?? []), n])
  // One name per city, then the cities in a weighted random order.
  const pool = [...byCity.values()]
    .map(list => list.map(n => ({ n, key: weightKey(n, rng) })).sort((a, b) => b.key - a.key)[0].n)
    .map(n => ({ n, key: weightKey(n, rng) })).sort((a, b) => b.key - a.key).map(x => x.n)
  const picked: AbroadName[] = []
  const used = new Set<string>()
  for (const maxPerLang of [2, 3, Infinity]) {
    const perLang = new Map<string, number>()
    for (const p of picked) perLang.set(p.langs[0], (perLang.get(p.langs[0]) ?? 0) + 1)
    let other = picked.filter(p => p.roman).length
    for (const n of pool) {
      if (picked.length >= count) break
      if (used.has(n.city) || (perLang.get(n.langs[0]) ?? 0) >= maxPerLang) continue
      if (n.roman && other >= MAX_OTHER_SCRIPT && maxPerLang !== Infinity) continue
      picked.push(n); used.add(n.city)
      perLang.set(n.langs[0], (perLang.get(n.langs[0]) ?? 0) + 1)
      if (n.roman) other++
    }
    if (picked.length >= count) break
  }
  picked.sort((a, b) => a.rank - b.rank)
  const all = Object.values(cities)
  return picked.map(entry => ({ entry, city: cities[entry.city], choices: choicesFor(entry, cities[entry.city], all, rng) }))
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

/** The right city and three wrong ones: cities in the same country or region
 *  and ones whose spelling looks like the foreign name, never a second right answer. */
export function choicesFor(entry: AbroadName, answer: AbroadCity, all: AbroadCity[], rng: () => number): string[] {
  const shown = foldName(entry.roman ?? entry.name)
  const right = acceptedAnswers(answer)
  const seen = new Set([foldName(answer.city)])
  const scored = all
    .filter(c => c.id !== answer.id && !right.has(foldName(c.city)))
    .map(c => {
      const f = foldName(c.city)
      const score = (c.code === answer.code ? 0.8 : 0) + (c.region === answer.region ? 0.8 : 0) + dice(shown, f) * 2.5 + (f[0] === shown[0] ? 0.4 : 0) + rng() * 1.2
      return { c, score }
    })
    .sort((a, b) => b.score - a.score)
  const wrong: string[] = []
  for (const { c } of scored) {
    const f = foldName(c.city)
    if (seen.has(f)) continue
    seen.add(f)
    wrong.push(c.city)
    if (wrong.length === 3) break
  }
  return shuffleWithRng([answer.city, ...wrong], rng)
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

/** The hint: the country, unless the country's name gives the city away
 *  (Singapore, Kuwait City, Tunis), then the region and first letter. */
export function hintFor(c: AbroadCity): string {
  const city = foldName(c.city), country = foldName(c.country)
  const what = c.capital ? "A capital" : "A city"
  if (city.includes(country) || country.includes(city) || c.country.includes("/")) return `${what} in ${c.region}, starting with ${c.city[0]}`
  return c.capital ? `The capital of ${c.country}` : `A city in ${c.country}`
}

/** "Spanish", "Spanish and Catalan", "German, Dutch and Swedish"; past `max`
 *  languages, "Swedish, Danish, Czech and 4 more". */
export function listLanguages(codes: string[], names: Record<string, string>, max = Infinity): string {
  const n = codes.map(c => names[c] ?? c)
  if (n.length <= 1) return n[0] ?? ""
  if (n.length > max) return `${n.slice(0, max).join(", ")} and ${n.length - max} more`
  return `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`
}
