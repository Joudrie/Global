import { FLAGS } from "./flags"
import { FLAG_ATTRIBS } from "./flagAttribs"
import { FACTS } from "./countryFacts"

// Symbol taxonomy for Symbol Hunt. The first four are hand-tagged (verified
// against the actual flag designs); the last two are derived from the existing
// structural attributes so they stay in sync. Codes are filtered to FLAGS.
//
// codes: the flag shows the symbol, so it is a right pick.
// also:  the symbol is there but small or arguable (inside a coat of arms, a
//        disc that stands for the sun). These flags are never asked for and
//        never used as wrong answers, so spotting the symbol is never a mistake.
const RAW: { id: string; label: string; emoji: string; codes: string[]; also: string[] }[] = [
  { id: "sun", label: "a Sun", emoji: "☀️",
    codes: ["AR", "UY", "KZ", "NE", "BD", "JP", "TW", "PH", "KG", "MK", "AG", "RW", "MW", "KI", "NP", "NA", "EC", "BO"],
    also: FACTS.flagSun.maybe },
  { id: "bird", label: "a Bird", emoji: "🦅",
    codes: ["EG", "MX", "AL", "RS", "ME", "ZM", "ZW", "MD", "KZ", "UG", "PG", "KI", "DM", "GT", "EC", "BO"],
    also: ["FJ"] }, // a dove on Fiji's shield
  { id: "weapon", label: "a Weapon", emoji: "⚔️",
    codes: ["MZ", "KE", "SZ", "AO", "SA", "OM", "GT", "HT", "LK"],
    also: FACTS.flagWeapon.maybe },
  { id: "plant", label: "a Plant or Tree", emoji: "🌿",
    codes: ["LB", "CA", "CY", "ER", "GQ", "BZ", "MX", "VU", "GD", "HT", "FJ", "LK", "GT", "BO", "EC", "SV", "DO", "PY", "TM"],
    also: FACTS.flagPlant.maybe },
]

const CODES = new Set(FLAGS.map(f => f.code))
const attrCodes = (key: "cross" | "crescent") =>
  FLAGS.filter(f => FLAG_ATTRIBS[f.code]?.[key]).map(f => f.code)

export interface SymbolDef { id: string; label: string; emoji: string; codes: Set<string>; also: Set<string> }

const def = (id: string, label: string, emoji: string, codes: string[], also: string[]): SymbolDef => {
  const yes = new Set(codes.filter(c => CODES.has(c)))
  return { id, label, emoji, codes: yes, also: new Set(also.filter(c => CODES.has(c) && !yes.has(c))) }
}

export const SYMBOLS: SymbolDef[] = [
  ...RAW.map(s => def(s.id, s.label, s.emoji, s.codes, s.also)),
  def("cross", "a Cross", "✚", attrCodes("cross"), FACTS.flagCross.maybe),
  def("crescent", "a Crescent", "☾", attrCodes("crescent"), FACTS.flagCrescent.maybe),
].filter(s => s.codes.size >= 5)

// Non-country flags that Symbol Hunt may show as decoys (ids in
// OTHER_IDENTITY_FLAGS). Each one is checked to carry none of the symbols
// above: many identity flags do (Scotland's and the Red Cross's crosses, the
// Red Crescent, the suns of Kurdistan and Tibet, the Nishan Sahib's swords,
// the Nordic Council's swan, the Doug flag's fir tree), and a decoy that has
// the round's symbol would mark a correct pick wrong.
export const SAFE_DECOY_IDS: string[] = [
  "pan-african", "pan-slavic", "pan-arab", "wiphala-id", "amazigh", "cusco-inca", "garifuna", "metis",
  "estelada-blava", "estelada-vermella", "catalonia-senyera", "bavaria", "texas",
  "west-papua", "puerto-rico-ind", "somaliland", "tatarstan", "karelia", "tuva",
  "flag-of-europe", "esperanto", "olympic", "red-crystal", "peace-flag", "ancap", "ancom",
  "red-flag", "disability-pride", "buddhist", "christiania", "sealand", "earth-flag", "antarctica",
]
