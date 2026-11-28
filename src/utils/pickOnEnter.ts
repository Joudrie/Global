// Type-a-country boxes: which countries match what was typed, and what Enter
// should submit. Matching ignores case, accents and punctuation, and knows the
// other names people type ("USA", "Ivory Coast", "Holland", "Burma").

/** Lowercase, strip accents and punctuation, collapse spaces. */
export const normName = (s: string) => s
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim()

// Other names for countries, by code. Short forms ("us", "uk") count as exact
// names, so Enter on "uk" submits the United Kingdom and never Ukraine. Old
// names are here only when they meant one of today's countries and nothing
// else ("Zaire", "Siam"), and never when they'd crowd another country's list
// ("Gold Coast" would join Ivory Coast under "coast").
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
  CD: ["drc", "congo kinshasa", "democratic republic of the congo", "zaire"],
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
  // Former names
  LK: ["ceylon"],
  IR: ["persia"],
  TH: ["siam"],
  ZW: ["rhodesia"],
  ET: ["abyssinia"],
  BJ: ["dahomey"],
  BF: ["upper volta"],
  KH: ["kampuchea"],
  BY: ["byelorussia", "belorussia"],
  MD: ["moldavia"],
  TW: ["formosa"],
  WS: ["western samoa"],
  MW: ["nyasaland"],
  BW: ["bechuanaland"],
  LS: ["basutoland"],
  VU: ["new hebrides"],
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
// so "Niger" submits Niger even though "Nigeria" also matches; then the one
// whose code it is ("bh" is Bahrain, though Bhutan also matches); otherwise
// only a single unambiguous match.
export function pickOnEnter<X extends Named>(matches: X[], typed: string): X | undefined {
  const q = normName(typed)
  if (!q) return undefined
  return matches.find(m => isExactName(m, typed))
    ?? matches.find(m => m.code?.toLowerCase() === q)
    ?? (matches.length === 1 ? matches[0] : undefined)
}

/**
 * Edits between two strings (insert, delete, change a letter, or swap two
 * neighbours, so "guinae" is one edit from "guinea"). Gives up and returns
 * `max + 1` as soon as the answer must be over `max`.
 */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev2: number[] = [], prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      let d = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2] + 1)
      cur.push(d)
      if (d < rowMin) rowMin = d
    }
    if (rowMin > max) return max + 1
    prev2 = prev; prev = cur
  }
  return prev[b.length]
}

// How many edits a typo may be: one in a short name, three in a long one.
const allowedEdits = (len: number) => len <= 5 ? 1 : len <= 9 ? 2 : 3

/**
 * "Did you mean …?" for a name that isn't on the list: up to `limit`
 * countries, best first. Empty when what was typed already names a country
 * (so "Niger" never suggests Nigeria), or nothing is close enough.
 *
 * First the names that contain what was typed ("saint vinc"), when there are
 * few enough to list; then the names a typo or two away ("Papua New Guinae",
 * "Turky"). Ties all come back ("Nigera": Niger and Nigeria).
 */
export function didYouMean<X extends Named>(list: X[], typed: string, limit = 3): X[] {
  const q = normName(typed)
  if (q.length < 3 || list.some(x => isExactName(x, typed) || x.code?.toLowerCase() === q)) return []
  const partial = matchNames(list, typed, limit + 1)
  if (partial.length) return partial.length <= limit ? partial : []
  if (q.length < 4) return []
  const max = allowedEdits(q.length)
  let best = max + 1
  let out: X[] = []
  for (const x of list) {
    const d = Math.min(...namesOf(x).map(n => editDistance(q, n, best)))
    if (d < best) { best = d; out = [x] }
    else if (d === best && d <= max) out.push(x)
  }
  return best <= max ? out.slice(0, limit) : []
}
