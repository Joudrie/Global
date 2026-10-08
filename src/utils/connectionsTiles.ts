// What a Connections tile shows, and what it means in plain English.
//
// A tile is { kind, code, label? }: one country (ISO code from FLAGS) shown
// four ways. `label` overrides the shown text (rarely needed).
//   country  the English short name         "Austria"
//   capital  the capital city               "Vienna"
//   native   what the country calls itself  "Österreich"
//   flag     the flag image, no text
import { FLAGS } from "../data/flags"
import { CAPITALS } from "../data/capitals"
import { ENDONYMS } from "../data/endonyms"
import type { Tile, TileKind } from "./connections"

export const KINDS: TileKind[] = ["country", "capital", "flag", "native"]

const NAME = new Map(FLAGS.map(f => [f.code, f.name]))

// Capitals as shown on tiles, with the accents capitals.ts leaves out.
const CAPITAL_LABEL: Record<string, string> = {
  CO: "Bogotá", BR: "Brasília", PY: "Asunción", IS: "Reykjavík", CM: "Yaoundé", TG: "Lomé", MV: "Malé",
  MD: "Chișinău", YE: "Sana'a", TO: "Nukuʻalofa", CR: "San José", ST: "São Tomé",
}
const CAPITAL = new Map(CAPITALS.map(c => [c.code, CAPITAL_LABEL[c.code] ?? c.capital]))

// No capital tile for countries whose capital is split, disputed or best
// known by another city's name: Bolivia (Sucre / La Paz), South Africa (three),
// Sri Lanka (Kotte / Colombo), Benin (Porto-Novo / Cotonou), Eswatini
// (Mbabane / Lobamba), Israel and Palestine (disputed), Palau (Ngerulmud,
// almost unknown) and the Netherlands (Amsterdam by law, The Hague in practice).
export const NO_CAPITAL_TILE = new Set(["BO", "ZA", "LK", "BJ", "SZ", "IL", "PS", "PW", "NL"])

export const countryName = (code: string) => NAME.get(code) ?? code
export const capitalName = (code: string) => CAPITAL.get(code) ?? ""
export const endonymOf = (code: string) => ENDONYMS[code]

/** Whether this country can be shown as this kind of tile. */
export function available(kind: TileKind, code: string): boolean {
  if (!NAME.has(code)) return false
  if (kind === "capital") return CAPITAL.has(code) && !NO_CAPITAL_TILE.has(code)
  if (kind === "native") return !!ENDONYMS[code]
  return true
}

/** The text on the tile ("" for a flag). */
export function tileText(t: Tile): string {
  if (t.label) return t.label
  switch (t.kind) {
    case "country": return countryName(t.code)
    case "capital": return capitalName(t.code)
    case "native": return ENDONYMS[t.code]?.name ?? ""
    case "flag": return ""
  }
}

/** The answer in plain English, for the solved bar: "Vienna (Austria)". */
export function tileAnswer(t: Tile): string {
  const name = countryName(t.code)
  if (t.kind === "country" || t.kind === "flag") return name
  return `${tileText(t)} (${name})`
}

/** What a screen reader says for the tile. */
export function tileLabel(t: Tile): string {
  switch (t.kind) {
    case "country": return `${tileText(t)}, country`
    case "capital": return `${tileText(t)}, capital city`
    case "native": return `${tileText(t)}, local name`
    case "flag": return `Flag of ${countryName(t.code)}`
  }
}

// Shown text, folded so "Mexico" and "México" count as the same.
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase()

// Problems with a board that need the country data: unknown countries,
// tiles that can't be shown, and two tiles that read the same.
export function tileProblems(tiles: Tile[]): string[] {
  const out: string[] = []
  const seen = new Map<string, Tile>()
  for (const t of tiles) {
    if (!NAME.has(t.code)) { out.push(`${t.code} is not a country in FLAGS.`); continue }
    if (!KINDS.includes(t.kind)) { out.push(`${t.code} has an unknown kind "${t.kind}".`); continue }
    if (!available(t.kind, t.code)) out.push(`${countryName(t.code)} has no ${t.kind} tile.`)
    const text = tileText(t)
    if (t.kind !== "flag") {
      const k = fold(text)
      const other = seen.get(k)
      if (other) out.push(`"${text}" (${t.kind}) reads the same as "${tileText(other)}" (${other.kind}).`)
      seen.set(k, t)
    }
  }
  return out
}
