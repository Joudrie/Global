// Cities Abroad: answer matching, round building and scoring.
//
// A round shows a city's name in another language ("Benetke", Slovenian) and
// the player names the city in English ("Venice"). Ten right before three
// strikes wins. The names come from Wikidata (scripts/cities-abroad/fetch.mjs
// → src/data/citiesAbroad.ts); this file is the city side of the engine the
// three Abroad games share (src/utils/abroad.ts), used by the screen, the
// fetch script and the tests.
import { acceptedSet, foldName, judgeTyped, looksLikeAny, pickChoices, pickEntries, MAX_ROUNDS } from "./abroad"
import type { AbroadEntry, GuessField, Tier, Verdict } from "./abroad"

// The engine's shared pieces, under the names this game has always used.
export {
  TIERS, TARGET, STRIKES, MAX_ROUNDS, MAX_OTHER_SCRIPT, foldName, squash, soundFold, editDistance, nearlySame,
  nameWords, contentWords, coreOf, slugOf, typoAllowance, roundPoints, gameState, listLanguages,
} from "./abroad"
export type { Tier, AnswerMode, Value, Verdict, GameState } from "./abroad"

/** The example on each difficulty button: a real name from that tier (tested). */
export const TIER_SAMPLES: Record<Tier, { name: string; lang: string }> = {
  easy: { name: "Wien", lang: "de" },
  medium: { name: "Mailand", lang: "de" },
  hard: { name: "Pietari", lang: "fi" },
}

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
export interface AbroadName extends AbroadEntry {
  city: string        // AbroadCity id
}

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
  return acceptedSet([c.city, ...(CITY_ALIASES[c.id] ?? [])])
}

/** True when a shown name is spelled the same as, or nearly the same as, the
 *  city's English name or an accepted alternative: those rounds are a copying
 *  exercise ("Havanna", "Berlino", "Prag"), so the game never shows them.
 *  `shown` is the name, or its Latin spelling for a non-Latin script. */
export function looksLikeAnswer(c: Pick<AbroadCity, "id" | "city">, shown: string): boolean {
  return looksLikeAny([c.city, ...(CITY_ALIASES[c.id] ?? [])], shown)
}

/** Judge a typed answer. Exact (after folding) or an accepted alternative is
 *  right. A few slips (typoAllowance) are right too, unless the guess is just
 *  as close to another city's English name, or no further from the name on
 *  the card than from the answer (copying "Lontoo" isn't "London"). */
export function judgeAnswer(c: Pick<AbroadCity, "id" | "city">, typed: string, shown: string, others: Pick<AbroadCity, "id" | "city">[]): Verdict {
  return judgeTyped(acceptedAnswers(c), typed, shown, others.filter(o => o.id !== c.id).map(acceptedAnswers))
}

/** True when `picked` (a 4-choices button, always an English name) is this city. */
export const isCity = (c: Pick<AbroadCity, "id" | "city">, picked: string) => acceptedAnswers(c).has(foldName(picked))

// ── The answer box ─────────────────────────────────────────────────────────

/** The answer box's attributes: none mentions a name, or iOS offers contacts. */
export const GUESS_FIELD = {
  id: "ca-guess",
  placeholder: "City in English",
  label: "The city in English",
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "words",
  spellCheck: false,
  enterKeyHint: "go",
} as const satisfies GuessField

// ── Rounds ─────────────────────────────────────────────────────────────────

export interface Round {
  entry: AbroadName
  city: AbroadCity
  choices: string[]   // four English city names for "4 choices" mode, one of them right
}

/** The rounds of one game in a tier: up to MAX_ROUNDS different cities, at
 *  most two from one language where the pool allows (then three, then any),
 *  played gentlest first, the way the paper game built up. Every city has the
 *  same chance however many names it has; odder names come up more often. */
export function pickRounds(names: AbroadName[], cities: Record<string, AbroadCity>, tier: Tier, rng: () => number, count = MAX_ROUNDS): Round[] {
  const picked = pickEntries(names, n => n.city, id => !!cities[id], tier, rng, count)
  const all = Object.values(cities)
  return picked.map(entry => ({ entry, city: cities[entry.city], choices: choicesFor(entry, cities[entry.city], all, rng) }))
}

const asChoice = (c: AbroadCity) => ({ id: c.id, answer: c.city, code: c.code, region: c.region })

/** The right city and three wrong ones: cities in the same country or region
 *  and ones whose spelling looks like the foreign name, never a second right answer. */
export function choicesFor(entry: AbroadName, answer: AbroadCity, all: AbroadCity[], rng: () => number): string[] {
  return pickChoices(entry.roman ?? entry.name, asChoice(answer), acceptedAnswers(answer), all.map(asChoice), rng)
}

/** The hint: the country, unless the country's name gives the city away
 *  (Singapore, Kuwait City, Tunis), then the region and first letter. */
export function hintFor(c: AbroadCity): string {
  const city = foldName(c.city), country = foldName(c.country)
  const what = c.capital ? "A capital" : "A city"
  if (city.includes(country) || country.includes(city) || c.country.includes("/")) return `${what} in ${c.region}, starting with ${c.city[0]}`
  return c.capital ? `The capital of ${c.country}` : `A city in ${c.country}`
}
