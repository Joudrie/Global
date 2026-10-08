// Machine-checkable rules behind each Connections group. The game itself only
// needs names; these exist so scripts/check-connections.mjs can prove every
// puzzle has exactly one answer. Each rule answers yes / maybe / no for a
// tile (see countryFacts.ts for what "maybe" means).
//
// Most rules are about the country behind the tile (its borders, its flag,
// its capital), whatever the tile shows. Text rules (name*, sameEnds,
// containsCountry, doubleLetter) read the words on the tile itself, so they
// suit wordplay groups; a flag tile has no words and never matches them.
import { FLAGS } from "../data/flags"
import { CAPITALS } from "../data/capitals"
import { STATS } from "../data/countryStats"
import { neighborsOf } from "../data/borders"
import { ENDONYMS } from "../data/endonyms"
import { FACTS, OFFICIAL, DISPUTED_BORDERS, OTHER_CAPITALS } from "../data/countryFacts"
import type { FactId } from "../data/countryFacts"
import type { Tile } from "./connections"
import { tileText } from "./connectionsTiles"

type Texts = string | string[]

export type Rule =
  | { type: "fact"; id: FactId }
  | { type: "official"; lang: keyof typeof OFFICIAL }
  | { type: "borders"; code: string }
  | { type: "neighbours"; n: number }            // exactly n land neighbours
  | { type: "capitalStarts"; letter: string }    // the capital (shown, or every claimant) starts with it
  | { type: "capitalSameLetter" }                // capital starts with the country's first letter
  | { type: "capitalInName" }                    // the country's English name contains its capital
  | { type: "popAbove"; m: number }              // population above m million
  | { type: "areaTop"; n: number }               // among the n largest by area
  | { type: "nameStarts"; text: Texts }          // tile text starts with (any of) these
  | { type: "nameEnds"; text: Texts }            // tile text ends with (any of) these
  | { type: "nameContains"; text: Texts }        // tile text contains (any of) these
  | { type: "nameLength"; n: number }            // letters only
  | { type: "containsCountry" }                  // tile text contains another country's name
  | { type: "sameEnds" }                         // first letter = last letter
  | { type: "nameStartsEnds"; letter: string }   // starts and ends with this letter
  | { type: "doubleLetter" }                     // the same letter twice in a row
  | { type: "nativeDiffLetter" }                 // local name starts with a different letter from the English
  | { type: "nativeLang"; lang: string }         // local name is in this language (ENDONYMS lang)
  | { type: "manual" }                           // wordplay/trivia checked by eye

export type Verdict = "yes" | "maybe" | "no"

const NAME = new Map(FLAGS.map(f => [f.code, f.name]))
const CAPITAL = new Map(CAPITALS.map(c => [c.code, c.capital]))
const letters = (s: string) => s.normalize("NFD").replace(/[^A-Za-z]/g, "").toLowerCase()
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
const list = (t: Texts) => (Array.isArray(t) ? t : [t]).map(x => plain(x))

const fromFact = (yes: string[], maybe: string[] | undefined, code: string): Verdict =>
  yes.includes(code) ? "yes" : maybe?.includes(code) ? "maybe" : "no"

const disputed = (a: string, b: string) =>
  DISPUTED_BORDERS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))

const AREA_RANK = Object.entries(STATS).sort((a, b) => b[1].area - a[1].area).map(([c]) => c)

// Capital rules on a capital tile read the city on the tile; on any other
// tile, every city with a claim to be the capital, so a split capital is
// "maybe" when only some of them fit.
function capitalTest(t: Tile, test: (city: string) => boolean): Verdict {
  if (t.kind === "capital") return test(tileText(t)) ? "yes" : "no"
  const main = test(CAPITAL.get(t.code) ?? "")
  const others = (OTHER_CAPITALS[t.code] ?? []).map(test)
  if (main) return others.some(o => !o) ? "maybe" : "yes"
  return others.some(o => o) ? "maybe" : "no"
}

export function evaluate(rule: Rule, t: Tile): Verdict {
  const code = t.code
  const name = NAME.get(code) ?? ""
  const text = tileText(t)
  const ptext = plain(text)
  switch (rule.type) {
    case "fact": { const f = FACTS[rule.id]; return fromFact(f.yes, (f as { maybe?: string[] }).maybe, code) }
    case "official": { const f = OFFICIAL[rule.lang]; return fromFact(f.yes, f.maybe, code) }
    case "borders":
      if (code === rule.code) return "no"
      if (neighborsOf(rule.code).includes(code)) return "yes"
      return disputed(rule.code, code) ? "maybe" : "no"
    case "neighbours": {
      // Fewest and most neighbours, depending on whether disputed or
      // overseas-territory borders count.
      const min = neighborsOf(code).length
      const max = min + DISPUTED_BORDERS.filter(p => p.includes(code)).length
      if (min === rule.n && max === rule.n) return "yes"
      return min <= rule.n && rule.n <= max ? "maybe" : "no"
    }
    case "capitalStarts": {
      const l = plain(rule.letter)
      return capitalTest(t, c => plain(c).startsWith(l))
    }
    case "capitalSameLetter": {
      const l = letters(name)[0]
      return capitalTest(t, c => letters(c)[0] === l)
    }
    case "capitalInName": return capitalTest(t, c => !!c && plain(name).includes(plain(c)))
    case "popAbove": {
      const p = STATS[code]?.pop
      if (p == null) return "maybe"
      if (p > rule.m * 1.05) return "yes"
      return p > rule.m * 0.95 ? "maybe" : "no"
    }
    case "areaTop": {
      const r = AREA_RANK.indexOf(code) + 1
      if (r === 0) return "maybe"
      if (r <= rule.n) return "yes"
      return r <= rule.n + 2 ? "maybe" : "no"
    }
    case "nameStarts": return text && list(rule.text).some(x => ptext.startsWith(x)) ? "yes" : "no"
    case "nameEnds": return text && list(rule.text).some(x => ptext.endsWith(x)) ? "yes" : "no"
    case "nameContains": return text && list(rule.text).some(x => ptext.includes(x)) ? "yes" : "no"
    case "nameLength": return text && letters(text).length === rule.n ? "yes" : "no"
    case "containsCountry": {
      if (!text) return "no"
      return FLAGS.some(f => f.code !== code && ptext.includes(plain(f.name))) ? "yes" : "no"
    }
    case "sameEnds": {
      const l = letters(text)
      return l.length > 1 && l[0] === l[l.length - 1] ? "yes" : "no"
    }
    case "nameStartsEnds": {
      const l = letters(text), x = rule.letter.toLowerCase()
      return l.startsWith(x) && l.endsWith(x) ? "yes" : "no"
    }
    case "doubleLetter": return /([a-z])\1/.test(letters(text)) ? "yes" : "no"
    case "nativeDiffLetter":
      if (t.kind !== "native" || !text) return "no"
      return letters(text)[0] !== letters(name)[0] ? "yes" : "no"
    case "nativeLang":
      if (t.kind !== "native") return "no"
      return ENDONYMS[code]?.language === rule.lang ? "yes" : "no"
    case "manual": return "no"
  }
}

/** Rules that read the words on a tile (so they can't apply to flag tiles). */
export const TEXT_RULES = new Set<Rule["type"]>([
  "nameStarts", "nameEnds", "nameContains", "nameLength", "containsCountry", "sameEnds", "nameStartsEnds",
  "doubleLetter", "nativeDiffLetter", "nativeLang",
])
