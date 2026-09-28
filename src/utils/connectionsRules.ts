// Machine-checkable rules behind each Connections group. The game itself only
// needs names; these exist so scripts/check-connections.mjs can prove every
// puzzle has exactly one answer. Each rule answers yes / maybe / no for a
// country (see countryFacts.ts for what "maybe" means).
import { FLAGS } from "../data/flags"
import { CAPITALS } from "../data/capitals"
import { STATS } from "../data/countryStats"
import { neighborsOf } from "../data/borders"
import { FACTS, OFFICIAL, DISPUTED_BORDERS, OTHER_CAPITALS } from "../data/countryFacts"
import type { FactId } from "../data/countryFacts"

export type Rule =
  | { type: "fact"; id: FactId }
  | { type: "official"; lang: keyof typeof OFFICIAL }
  | { type: "borders"; code: string }
  | { type: "neighbours"; n: number }            // exactly n land neighbours
  | { type: "capitalStarts"; letter: string }
  | { type: "popAbove"; m: number }              // population above m million
  | { type: "areaTop"; n: number }               // among the n largest by area
  | { type: "nameStarts"; text: string }
  | { type: "nameEnds"; text: string }
  | { type: "nameContains"; text: string }
  | { type: "nameLength"; n: number }            // letters only
  | { type: "containsCountry" }                  // name contains another country's name
  | { type: "sameEnds" }                         // first letter = last letter
  | { type: "manual" }                           // wordplay/trivia checked by eye

export type Verdict = "yes" | "maybe" | "no"

const NAME = new Map(FLAGS.map(f => [f.code, f.name]))
const CAPITAL = new Map(CAPITALS.map(c => [c.code, c.capital]))
const letters = (s: string) => s.normalize("NFD").replace(/[^A-Za-z]/g, "").toLowerCase()
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

const fromFact = (yes: string[], maybe: string[] | undefined, code: string): Verdict =>
  yes.includes(code) ? "yes" : maybe?.includes(code) ? "maybe" : "no"

const disputed = (a: string, b: string) =>
  DISPUTED_BORDERS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))

const AREA_RANK = Object.entries(STATS).sort((a, b) => b[1].area - a[1].area).map(([c]) => c)

export function evaluate(rule: Rule, code: string): Verdict {
  const name = NAME.get(code) ?? ""
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
      const l = rule.letter.toLowerCase()
      const main = plain(CAPITAL.get(code) ?? "")
      const others = (OTHER_CAPITALS[code] ?? []).map(plain)
      if (main.startsWith(l)) return others.some(o => !o.startsWith(l)) ? "maybe" : "yes"
      return others.some(o => o.startsWith(l)) ? "maybe" : "no"
    }
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
    case "nameStarts": return plain(name).startsWith(rule.text.toLowerCase()) ? "yes" : "no"
    case "nameEnds": return plain(name).endsWith(rule.text.toLowerCase()) ? "yes" : "no"
    case "nameContains": return plain(name).includes(rule.text.toLowerCase()) ? "yes" : "no"
    case "nameLength": return letters(name).length === rule.n ? "yes" : "no"
    case "containsCountry": {
      const me = plain(name)
      return FLAGS.some(f => f.code !== code && me.includes(plain(f.name))) ? "yes" : "no"
    }
    case "sameEnds": {
      const l = letters(name)
      return l.length > 1 && l[0] === l[l.length - 1] ? "yes" : "no"
    }
    case "manual": return "no"
  }
}
