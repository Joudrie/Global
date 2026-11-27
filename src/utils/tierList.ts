// Tier List Maker: the lists beyond countries. The old "Other" list held
// every civic, ethnic, indigenous, separatist and micronation flag in one
// pool of about 300; it is now split into subcategories that follow the
// identity data's own categories (src/data/identityFlags.ts), with a few
// flags hand-placed where a category holds two kinds of flag (Civic &
// Ideological: organizations and movements; Separatist & Autonomous:
// independence movements and regions within countries). Pride, which the
// tier list never had, gets its own list.
//
// Each list is saved as globalio_tierlist_<id> ({ flag: tier }), the same
// prefix as the country lists (mergeProgress.ts: every flag placed, this
// device's tier on a clash). A saved "Other" list (globalio_tierlist_Other)
// moves into the new lists the first time the tier list opens.
import { IDENTITY_FLAGS } from "../data/identityFlags"
import type { IdentityCategory, IdentityFlag } from "../data/identityFlags"

export interface TierChip { code: string; flagUrl: string; name: string }

export type SubId = "pride" | "separatist" | "regions" | "peoples" | "indigenous" | "micronations" | "orgs" | "movements"

export interface SubCategory {
  id: SubId
  label: string   // on the chip
  title: string   // the line under the chips
  flags: TierChip[]
}

const SUBS: Omit<SubCategory, "flags">[] = [
  { id: "pride", label: "Pride", title: "Pride flags" },
  { id: "separatist", label: "Separatist", title: "Separatist & independence movements" },
  { id: "regions", label: "Regions", title: "Regions & nations within countries" },
  { id: "peoples", label: "Peoples", title: "Peoples & pan-national flags" },
  { id: "indigenous", label: "Indigenous", title: "Indigenous peoples" },
  { id: "micronations", label: "Micronations", title: "Micronations" },
  { id: "orgs", label: "Organizations", title: "International organizations" },
  { id: "movements", label: "Movements", title: "Movements & beliefs" },
]

// Each identity category's list. Maritime & Signal (the signal alphabet) has none.
const BY_CATEGORY: Record<IdentityCategory, SubId | null> = {
  "Pride & LGBTQ+": "pride",
  "Separatist & Autonomous": "regions",
  "Pan-National & Ethnic": "peoples",
  "Indigenous Peoples": "indigenous",
  "Micronations": "micronations",
  "Civic & Ideological": "movements",
  "Maritime & Signal": null,
}

// Flags placed by hand, where their category's list isn't the right one.
const HAND: Record<string, SubId> = {
  // Separatist & Autonomous that are independence movements, breakaway or
  // self-declared states (the rest are regions and nations within countries).
  ...Object.fromEntries([
    "estelada-blava", "estelada-vermella", "khalistan", "kurdistan", "trnc", "somaliland", "tamil-eelam", "tibet",
    "west-papua", "sadr", "abkhazia", "aceh", "ambazonia", "artsakh", "azawad", "balochistan", "biafra", "bougainville",
    "cabinda", "california-republic", "cascadia", "ichkeria", "donetsk-pr", "luhansk-pr", "novorossiya", "east-turkestan",
    "hong-kong-colonial", "kanaky", "katanga", "padania", "rif-republic", "rojava", "ryukyu-indep", "south-moluccas",
    "south-ossetia", "south-yemen", "texas", "transnistria", "zapatistas", "barotseland", "kachin", "karenni", "moro-milf",
    "pashtunistan", "sindh", "vermont-republic", "ahwaz", "anjouan", "bodoland", "caprivi", "casamance", "chin", "deseret",
    "ogaden", "south-azerbaijan", "wa-state", "western-togoland", "shan", "hawaii-kingdom", "puerto-rico-ind",
  ].map(id => [id, "separatist" as SubId])),
  // Civic & Ideological that are international organizations, and two from Pan-National.
  ...Object.fromEntries([
    "flag-of-europe", "nato", "olympic", "paralympic", "red-cross", "red-crescent", "red-crystal", "united-nations",
    "african-union", "arab-league", "asean", "caricom", "commonwealth", "eaeu", "francophonie", "mercosur", "oic", "oas",
    "unesco", "unicef", "who", "scouts", "nordic-council", "turkic-states",
  ].map(id => [id, "orgs" as SubId])),
  // Pan-National & Ethnic entries that are regions, not peoples.
  aragon: "regions", lombardy: "regions", moravia: "regions", tyrol: "regions", valencia: "regions",
  // Separatist & Autonomous entries that are peoples, not places.
  "crimean-tatar": "peoples", acadia: "peoples",
  // A pride flag filed under Civic.
  "disability-pride": "pride",
}

/** The hand placements, for the tests (each id must exist). */
export const HAND_PLACED: Readonly<Record<string, SubId>> = HAND

/** The list a flag belongs to, or null (signal flags; entries with no flag). */
export function subcategoryOf(f: Pick<IdentityFlag, "id" | "category" | "flagUrl" | "noFlag">): SubId | null {
  if (f.noFlag || !f.flagUrl) return null
  return HAND[f.id] ?? BY_CATEGORY[f.category] ?? null
}

const chipOf = (f: IdentityFlag): TierChip => ({ code: f.id, flagUrl: f.flagUrl, name: f.name })

/** The lists beyond countries, in chip order, each in the identity data's
 *  order (best-known first). */
export const SUBCATEGORIES: SubCategory[] = SUBS.map(s => ({
  ...s,
  flags: IDENTITY_FLAGS.filter(f => subcategoryOf(f) === s.id).map(chipOf),
}))
export const SUB_IDS = SUBS.map(s => s.id)
const SUB_OF = new Map<string, SubId>(SUBCATEGORIES.flatMap(s => s.flags.map(f => [f.code, s.id] as [string, SubId])))

// ── Saved lists ─────────────────────────────────────────────────────────────

export const TIERLIST_PREFIX = "globalio_tierlist_"
export const tierKey = (list: string) => `${TIERLIST_PREFIX}${list}`
/** The old mixed list, before the subcategories. */
export const OTHER_KEY = "globalio_tierlist_Other"

export type Placement = Record<string, string>

/** An old "Other" list split into the new lists: each flag keeps its tier in
 *  the list it moved to. Flags in no list (no flag image) are dropped. */
export function splitOther(other: Placement): Partial<Record<SubId, Placement>> {
  const out: Partial<Record<SubId, Placement>> = {}
  for (const [code, tier] of Object.entries(other)) {
    const sub = SUB_OF.get(code)
    if (!sub || typeof tier !== "string") continue
    ;(out[sub] ??= {})[code] = tier
  }
  return out
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">

const readPlacement = (store: Store, key: string): Placement | null => {
  try {
    const v = JSON.parse(store.getItem(key) ?? "null")
    return v && typeof v === "object" && !Array.isArray(v) ? v as Placement : null
  } catch { return null }
}

/** Move a saved "Other" list into the new lists, then remove it. A flag
 *  already placed in its new list keeps that tier (it's the newer choice).
 *  Runs again if a backup or another device brings the old list back; a list
 *  that won't parse is left alone. Returns true when it moved anything. */
export function migrateOther(store: Store): boolean {
  try {
    if (store.getItem(OTHER_KEY) === null) return false
    const old = readPlacement(store, OTHER_KEY)
    if (!old) return false
    for (const [sub, moved] of Object.entries(splitOther(old))) {
      const key = tierKey(sub)
      store.setItem(key, JSON.stringify({ ...moved, ...(readPlacement(store, key) ?? {}) }))
    }
    store.removeItem(OTHER_KEY)
    return true
  } catch { return false }
}
