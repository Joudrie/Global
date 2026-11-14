// Countries Abroad and Native Names: the country side of the Abroad engine
// (src/utils/abroad.ts).
//
// Countries Abroad shows a country's name as another language writes it
// ("Allemagne", French) and the player names the country in English
// ("Germany"). Native Names shows what a country calls itself in its own
// official language ("Suomi", Finnish). Both run on the same rules as Cities
// Abroad: ten right before three strikes. The names come from Wikidata
// (scripts/country-names/fetch.mjs → src/data/countriesAbroad.ts and
// src/data/nativeNames.ts); this file is the logic the screen, the fetch
// script and the tests share.
import { FLAGS } from "../data/flags"
import {
  acceptedSet, editDistance, foldName, judgeTyped, looksLikeAny, nameWords, nearlySame, pickChoices, pickEntries,
  soundFold, typoAllowance, MAX_OTHER_SCRIPT, MAX_ROUNDS,
} from "./abroad"
import type { AbroadEntry, AbroadRound, GuessField, Tier, Verdict } from "./abroad"

/** One country: the English answer and its region. */
export interface AbroadCountry {
  id: string          // ISO code, as in FLAGS ("DE")
  country: string     // the English name ("Germany")
  region: string      // the region in FLAGS ("Europe")
}

/** One name for a country, in one or more languages that write it the same way. */
export interface CountryName extends AbroadEntry {
  country: string     // AbroadCountry id
}

// English names to show instead of the site's short form ("UAE" reads badly
// in "It's UAE"); the short form is still a right answer.
const DISPLAY: Record<string, string> = { AE: "United Arab Emirates" }

/** Every country in FLAGS: the 193 UN members, Kosovo, Taiwan, Palestine and Vatican City. */
export const COUNTRIES: Record<string, AbroadCountry> = Object.fromEntries(
  FLAGS.map(f => [f.code, { id: f.code, country: DISPLAY[f.code] ?? f.name, region: f.region }]))
const COUNTRY_LIST = Object.values(COUNTRIES)

// ── Answers ────────────────────────────────────────────────────────────────

// Other English names people type for a country, by code. Accents, hyphens,
// "the" and "St" for "Saint" are handled by foldName, so they need no entry
// here. A country's name in another language never counts ("Deutschland" is
// not "Germany"), nor does one that fits two countries (VAGUE).
export const COUNTRY_ALIASES: Record<string, string[]> = {
  US: ["USA", "US", "America", "United States of America"],
  GB: ["UK", "Britain", "Great Britain", "United Kingdom of Great Britain and Northern Ireland"],
  AE: ["UAE", "Emirates"],
  CZ: ["Czechia"],
  NL: ["Holland"],
  CI: ["Ivory Coast", "Cote d'Ivoire"],
  MM: ["Burma"],
  SZ: ["Swaziland"],
  TL: ["East Timor"],
  TR: ["Türkiye"],
  CV: ["Cabo Verde"],
  CD: ["DRC", "Democratic Republic of the Congo", "DR of the Congo", "Congo-Kinshasa"],
  CG: ["Congo-Brazzaville", "Congo Republic"],
  KR: ["Republic of Korea", "S Korea"],
  KP: ["DPRK", "Democratic People's Republic of Korea", "N Korea"],
  MK: ["Macedonia"],
  VA: ["Vatican", "Holy See"],
  BA: ["Bosnia", "Bosnia-Herzegovina"],
  CN: ["People's Republic of China", "PRC"],
  TW: ["Republic of China", "ROC"],
  PS: ["State of Palestine", "Palestinian Territories"],
  RU: ["Russian Federation"],
  MD: ["Republic of Moldova"],
  LA: ["Lao", "Lao PDR"],
  VN: ["Viet Nam"],
  KN: ["Saint Kitts"],
  VC: ["Saint Vincent"],
  TT: ["Trinidad"],
  AG: ["Antigua"],
  ST: ["Sao Tome"],
  FM: ["Federated States of Micronesia"],
  PG: ["PNG"],
  CF: ["CAR"],
  SA: ["Saudi", "KSA"],
  BN: ["Brunei Darussalam"],
  KG: ["Kyrgyz Republic"],
  IE: ["Republic of Ireland"],
}

/** Short names that fit two countries: never a right answer for either
 *  (typing one asks which), and a card that reads as one alone is never shown. */
export const VAGUE: Record<string, string[]> = {
  CG: ["Congo"], CD: ["Congo"],
  KR: ["Korea"], KP: ["Korea"],
}

const answersOf = (c: Pick<AbroadCountry, "id" | "country">) => [c.country, ...(COUNTRY_ALIASES[c.id] ?? [])]

/** Every folded answer that counts as right for this country. */
export function acceptedAnswers(c: Pick<AbroadCountry, "id" | "country">): Set<string> {
  return acceptedSet(answersOf(c))
}
const ACCEPTED = new Map(COUNTRY_LIST.map(c => [c.id, acceptedAnswers(c)]))

/** True when `picked` (a 4-choices button, always an English name) is this country. */
export const isCountry = (c: Pick<AbroadCountry, "id" | "country">, picked: string) => acceptedAnswers(c).has(foldName(picked))

/** Judge a typed answer. Exact (after folding) or an accepted alternative is
 *  right. A name that fits two countries ("Congo", "Korea") is vague, so
 *  wrong. A few slips are right too, unless the guess is just as close to
 *  another country's name ("Nigera" is as near Niger as Nigeria, "Austria" is
 *  never Australia) or no further from the card than from the answer. Every
 *  country in FLAGS counts as another, not only those in the game. */
export function judgeCountry(c: Pick<AbroadCountry, "id" | "country">, typed: string, shown: string): Verdict {
  const q = foldName(typed)
  const mine = acceptedAnswers(c)
  if (q && !mine.has(q) && (VAGUE[c.id] ?? []).some(v => editDistance(q, foldName(v)) <= typoAllowance(foldName(v).length)))
    return { correct: false, misspelt: false, near: false, vague: true }
  const others: Set<string>[] = []
  for (const [id, set] of ACCEPTED) if (id !== c.id) others.push(set)
  return judgeTyped(mine, typed, shown, others)
}

// ── Never a free round ─────────────────────────────────────────────────────

// Letters foldName doesn't know, as the nearest plain letter: the Azerbaijani
// schwa (Azərbaycan) and the Pan-Nigerian hooked letters. (Cities Abroad
// keeps foldName as it is, so its names don't change.)
const latinOf = (s: string) => s.replace(/[əɛ]/g, "e").replace(/[ƏƐ]/g, "E").replace(/ɔ/g, "o").replace(/Ɔ/g, "O").replace(/ɣ/g, "gh")

// Words of an English name that don't tell a country apart: a card that
// shows every other word of the name gives it away ("Îles Marshall").
const GENERIC = new Set(["and", "of", "the", "islands", "island", "republic", "saint"])
const telling = (s: string) => nameWords(s).filter(w => w.length >= 3 && !GENERIC.has(w))

/** True when a shown name holds a country's name: every telling word of the
 *  English name or an alternative ("Bosna i Hercegovina", "Îles Marshall",
 *  "Santa Lucía"), or the one telling word inside a longer word
 *  ("Marshallinseln", "Vatikanstadt"). `fold` is soundFold for Countries
 *  Abroad and foldName for Native Names. */
export function holdsAnswer(c: Pick<AbroadCountry, "id" | "country">, shown: string, fold: (s: string) => string = soundFold): boolean {
  const words = nameWords(latinOf(shown)).map(fold)
  const whole = fold(latinOf(shown))
  return answersOf(c).some(a => {
    const need = telling(a).map(fold)
    if (!need.length) return false
    if (need.every(x => words.some(w => nearlySame(w, x)))) return true
    return need.length === 1 && need[0].length >= 5 && whole.includes(need[0])
  })
}

/** Countries Abroad: true when a shown name is spelled the same or nearly the
 *  same as the English name, an alternative or a name that fits two
 *  countries, on the plain and the sound-alike spelling ("Rusia", "Kenia",
 *  "Mexiko", "Marokko"), or holds the answer. Country names share their
 *  roots more than city names, so the bar is a little higher than Cities
 *  Abroad's: up to 3 letters in 10 changed ("Irlanda", "Ireland").
 *  `shown` is the name, or its Latin spelling for a non-Latin script. */
export function looksLikeCountry(c: Pick<AbroadCountry, "id" | "country">, shown: string): boolean {
  return looksLikeAbroad(c, shown) || holdsAnswer(c, shown, soundFold)
}
export const ABROAD_RATIO = 0.3
/** looksLikeCountry without the "holds the answer" part. */
export const looksLikeAbroad = (c: Pick<AbroadCountry, "id" | "country">, shown: string) =>
  looksLikeAny([...answersOf(c), ...(VAGUE[c.id] ?? [])], latinOf(shown), ABROAD_RATIO)

/** Native Names: the same test on the plain spelling only, so a native name
 *  whose sounds are close but whose spelling isn't stays in (Rossiya,
 *  Soomaaliya, Pilipinas, Ayiti, Ityop'iya), while Italia, Brasil, México,
 *  Türkiye or Nepal go. `shown` is the name, or its Latin spelling. */
export function looksLikeNative(c: Pick<AbroadCountry, "id" | "country">, shown: string): boolean {
  const forms = (s: string) => [foldName(s), coreFold(s)].filter(Boolean)
  const mine = forms(latinOf(shown))
  const close = [...answersOf(c), ...(VAGUE[c.id] ?? [])].some(a => forms(a).some(t => mine.some(m => nearlySame(m, t))))
  return close || holdsAnswer(c, shown, foldName)
}
// A name without the Arabic article (al-Maghrib → Maghrib, as-Sudan → Sudan).
const coreFold = (s: string) => foldName(s.replace(/^(?:a[lnrstdz]|ad-d|ash|ath|adh)-/i, ""))

// ── The answer box ─────────────────────────────────────────────────────────

/** The answer box's attributes: none mentions a name, or iOS offers contacts. */
export const GUESS_FIELD = {
  id: "cn-guess",
  placeholder: "Country in English",
  label: "The country in English",
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "words",
  spellCheck: false,
  enterKeyHint: "go",
} as const satisfies GuessField

// ── Rounds ─────────────────────────────────────────────────────────────────

export interface CountryRound {
  entry: CountryName
  country: AbroadCountry
  choices: string[]   // four English country names for "4 choices" mode, one of them right
}

/** The rounds of one game in a tier: up to MAX_ROUNDS different countries,
 *  languages spread out, gentlest first (pickEntries). Countries Abroad keeps
 *  other scripts to a few rounds, as Cities Abroad does; Native Names, where
 *  they are half the game, passes Infinity. */
export function pickCountryRounds(names: CountryName[], tier: Tier, rng: () => number,
  { count = MAX_ROUNDS, maxOtherScript = MAX_OTHER_SCRIPT }: { count?: number; maxOtherScript?: number } = {}): CountryRound[] {
  const picked = pickEntries(names, n => n.country, id => !!COUNTRIES[id], tier, rng, count, maxOtherScript)
  return picked.map(entry => ({ entry, country: COUNTRIES[entry.country], choices: countryChoices(entry, COUNTRIES[entry.country], rng) }))
}

const asChoice = (c: AbroadCountry) => ({ id: c.id, answer: c.country, code: c.id, region: c.region })
const CHOICES = COUNTRY_LIST.map(asChoice)

/** The right country and three wrong ones, from the same region where it can
 *  (Allemagne: Germany, Albania, Austria, Algeria), never a second right answer. */
export function countryChoices(entry: CountryName, answer: AbroadCountry, rng: () => number): string[] {
  return pickChoices(entry.roman ?? entry.name, asChoice(answer), acceptedAnswers(answer), CHOICES, rng, { sameCode: 0, sameRegion: 2 })
}

/** The screen's rounds for a list of names: Countries Abroad or Native Names. */
export function countryRounds(names: CountryName[], opts: { maxOtherScript?: number } = {}) {
  return {
    field: GUESS_FIELD,
    rounds: (tier: Tier, rng: () => number): AbroadRound[] => pickCountryRounds(names, tier, rng, opts).map(r => ({
      entry: r.entry,
      answer: r.country.country,
      where: r.country.region,
      learnAs: r.country.country,
      hint: countryHint(r.country),
      choices: r.choices,
      judge: (typed: string) => judgeCountry(r.country, typed, r.entry.roman ?? r.entry.name),
      isRight: (picked: string) => isCountry(r.country, picked),
    })),
  }
}

/** The example on each difficulty button: a real name from that tier (tested). */
export const COUNTRIES_ABROAD_SAMPLES: Record<Tier, { name: string; lang: string }> = {
  easy: { name: "Dinamarca", lang: "es" },
  medium: { name: "Allemagne", lang: "fr" },
  hard: { name: "Saksa", lang: "fi" },
}
export const NATIVE_NAMES_SAMPLES: Record<Tier, { name: string; lang: string }> = {
  easy: { name: "Deutschland", lang: "de" },
  medium: { name: "Suomi", lang: "fi" },
  hard: { name: "Magyarország", lang: "hu" },
}

const REGION_IN: Record<string, string> = { Americas: "the Americas", "Middle East": "the Middle East" }

/** The hint: the region and the first letter ("A country in Europe, starting with G"). */
export function countryHint(c: AbroadCountry): string {
  return `A country in ${REGION_IN[c.region] ?? c.region}, starting with ${c.country[0]}`
}
