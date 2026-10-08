// Type-a-country boxes: which countries match what was typed, and what Enter
// should submit. Matching ignores case, accents and punctuation, and knows the
// other names people type ("USA", "Ivory Coast", "Holland", "Burma").

/** Lowercase, strip accents and punctuation, collapse spaces. */
export const normName = (s: string) => s
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim()

// Other names for countries, by code. Short forms ("us", "uk") count as exact
// names, so Enter on "uk" submits the United Kingdom and never Ukraine.
export const COUNTRY_ALIASES: Record<string, string[]> = {
  US: ["usa", "us", "united states of america", "america"],
  GB: ["uk", "britain", "great britain", "england"],
  AE: ["united arab emirates", "emirates"],
  CZ: ["czechia"],
  CI: ["ivory coast", "cote divoire"],
  NL: ["holland", "the netherlands"],
  MM: ["burma"],
  TL: ["east timor"],
  SZ: ["swaziland"],
  TR: ["turkiye"],
  CV: ["cabo verde"],
  CD: ["drc", "congo kinshasa", "democratic republic of the congo"],
  CG: ["congo", "congo brazzaville"],
  KR: ["korea", "republic of korea"],
  KP: ["dprk"],
  MK: ["macedonia"],
  VA: ["vatican", "holy see"],
  ST: ["sao tome"],
  FM: ["federated states of micronesia"],
  BS: ["the bahamas"],
  GM: ["the gambia"],
  PS: ["palestinian territories"],
  LA: ["lao"],
  RU: ["russian federation"],
  BA: ["bosnia"],
  KN: ["st kitts", "st kitts and nevis"],
  LC: ["st lucia"],
  VC: ["st vincent", "st vincent and the grenadines"],
  TT: ["trinidad"],
  AG: ["antigua"],
  PG: ["papua"],
}

interface Named { name: string; code?: string }

const namesOf = (x: Named) => [normName(x.name), ...((x.code && COUNTRY_ALIASES[x.code]) || [])]

/** True when `typed` is this country's name or one of its other names. */
export const isExactName = (x: Named, typed: string) => {
  const q = normName(typed)
  return !!q && namesOf(x).includes(q)
}

/**
 * The options matching `typed`, best first: exact names, then the code, then
 * names with a word starting with it, then names containing it.
 */
export function matchNames<X extends Named>(list: X[], typed: string, limit = 6): X[] {
  const q = normName(typed)
  if (!q) return []
  const ranked: [number, X][] = []
  for (const x of list) {
    const names = namesOf(x)
    const rank = names.includes(q) ? 0
      : x.code?.toLowerCase() === q ? 1
      : names.some(n => n.split(" ").some((_, i, w) => w.slice(i).join(" ").startsWith(q))) ? 2
      : names.some(n => n.includes(q)) ? 3 : -1
    if (rank >= 0) ranked.push([rank, x])
  }
  return ranked.sort((a, b) => a[0] - b[0]).slice(0, limit).map(r => r[1])
}

// What Enter should submit: the option whose name is exactly what was typed,
// so "Niger" submits Niger even though "Nigeria" also matches; otherwise only
// a single unambiguous match.
export function pickOnEnter<X extends Named>(matches: X[], typed: string): X | undefined {
  if (!normName(typed)) return undefined
  return matches.find(m => isExactName(m, typed)) ?? (matches.length === 1 ? matches[0] : undefined)
}
