import type { GRegion } from "./codexGalleries"
import type { IdentityCategory, IdentityFlag } from "./identityFlags"
import type { CityFlag } from "./usCityFlags"
import type { MegaFlag } from "./megaCodex"

// The Codex's "Beyond countries" sections as flashcard decks (Flashcards →
// Codex). Each deck is built from the same data and the same rows as its Codex
// section, in the section's regions, with the section's line on the back of
// the card. Rows with no image (a micronation that never had a flag, a dead
// Commons link) are left out: a card needs a flag.
//
// Only types are imported up here: a deck's data loads when the deck opens
// (loadCodexDeck), so the Flashcards screen stays small.

export type CodexDeckId =
  | "mega" | "peoples" | "pride" | "separatist" | "civic" | "micronations"
  | "extinct" | "uscities" | "orgs" | "signal"

export interface DeckCard { key: string; flagUrl: string; name: string; subtitle: string; note?: string }
/** One of a deck's regions, as the Codex section splits it. A deck with no regions has one, labelled "". */
export interface DeckGroup { label: string; cards: DeckCard[] }

/** Cards in each deck, shown before its data loads. scripts/bundle.test.mjs
 *  checks these match the decks: update them when the Codex galleries change. */
export const DECK_COUNTS: Record<CodexDeckId, number> = {
  mega: 4573,
  peoples: 1148,
  pride: 44,
  separatist: 142,
  civic: 42,
  micronations: 50,
  extinct: 570,
  uscities: 124,
  orgs: 65,
  signal: 27,
}

/** Decks split into regions, like their Codex sections: pick one, or all. */
export const DECK_REGIONS: CodexDeckId[] = ["peoples", "extinct", "orgs"]

/** The Mega Codex holds every flag in the app; a session draws this many at random. */
export const MEGA_SESSION = 50

const IDENTITY_DECKS: Partial<Record<CodexDeckId, IdentityCategory>> = {
  pride: "Pride & LGBTQ+",
  separatist: "Separatist & Autonomous",
  civic: "Civic & Ideological",
  micronations: "Micronations",
}

// Full-size Commons SVGs can be megabytes: ask Commons for a raster the size of the card.
const cardImage = (u: string) => (u.includes("Special:FilePath") && !u.includes("?") ? `${u}?width=640` : u)
// A few gallery names still carry wiki markup ("Eastern Andalusians<sup>''''</sup>").
const plain = (s: string) => s.replace(/<[^>]*>/g, "").replace(/'{2,}/g, "").trim()
// "the Middle East" → "Middle East", "multiethnic/…" → "Multiethnic/…"
const regionLabel = (s: string) => {
  const t = s.replace(/^the /, "")
  return t ? t[0].toUpperCase() + t.slice(1) : t
}

export function identityDeck(flags: IdentityFlag[], category: IdentityCategory, subtitle: string = category): DeckGroup[] {
  const cards = flags
    .filter(f => f.category === category && f.flagUrl && !f.noFlag)
    .map(f => ({ key: f.id, flagUrl: f.flagUrl, name: f.name, subtitle, note: f.note }))
  return [{ label: "", cards }]
}

/** A Codex gallery (Peoples & Cultures, Extinct & Former States, International
 *  Organizations): one group per region. `subtitle` replaces the region name on the cards. */
export function galleryDeck(regions: GRegion[], id: CodexDeckId, subtitle?: string): DeckGroup[] {
  return regions.map((r, ri) => {
    const label = regionLabel(r.label)
    const cards = r.groups.flatMap((g, gi) => g.items.filter(it => it.file).map((it, ii) => ({
      key: `${id}-${ri}-${gi}-${ii}`, flagUrl: cardImage(it.file), name: plain(it.title),
      subtitle: subtitle ?? label, note: it.detail || undefined,
    })))
    return { label, cards }
  }).filter(g => g.cards.length > 0)
}

export function cityDeck(cities: CityFlag[]): DeckGroup[] {
  return [{ label: "", cards: cities.map(f => ({ key: f.id, flagUrl: f.flagUrl, name: f.name, subtitle: f.state, note: f.note })) }]
}

export function megaDeck(all: MegaFlag[]): DeckGroup[] {
  return [{ label: "", cards: all.map((f, i) => ({ key: `mega-${i}`, flagUrl: cardImage(f.url), name: plain(f.title), subtitle: "Mega Codex", note: f.fact })) }]
}

/** A deck's cards, from the data its Codex section loads. */
export function loadCodexDeck(id: CodexDeckId): Promise<DeckGroup[]> {
  switch (id) {
    case "mega":
      return import("./megaCodex").then(m => megaDeck(m.ALL_FLAGS_AZ))
    case "peoples":
      return Promise.all([import("./codexGalleries"), import("./ethnicFlags"), import("./identityFlags")])
        .then(([g, e, i]) => galleryDeck(g.peoplesRegions(e.ETHNIC_FLAGS, i.IDENTITY_FLAGS), id))
    case "extinct":
      return Promise.all([import("./codexGalleries"), import("./extinctStates"), import("./historicalFlags")])
        .then(([g, e, h]) => galleryDeck(g.extinctRegions(e.EXTINCT_STATES, h.HISTORICAL_FLAGS), id))
    case "orgs":
      return Promise.all([import("./codexGalleries"), import("./orgFlags")])
        .then(([g, o]) => galleryDeck(g.orgRegions(o.ORG_FLAGS), id, "International Organizations"))
    case "uscities":
      return import("./usCityFlags").then(m => cityDeck([...m.US_CITY_FLAGS].sort((a, b) => a.name.localeCompare(b.name))))
    case "signal":
      return import("./identityFlags").then(m => identityDeck(m.IDENTITY_FLAGS, "Maritime & Signal", "Signal & Maritime Flags"))
    default:
      return import("./identityFlags").then(m => identityDeck(m.IDENTITY_FLAGS, IDENTITY_DECKS[id]!))
  }
}
