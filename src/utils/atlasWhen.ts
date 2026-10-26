import { ROWS, STRINGS } from "../data/atlasWhen"

/* Atlas, When? — decode the map table and the game rules that decide the
   score and the daily map. Kept free of React so scripts/atlaswhen.test.mjs
   can check it under plain Node. */

export interface AtlasClue { text: string; source?: string }
export interface AtlasDetail {
  /** IIIF image service for the original scan */
  service: string
  /** the part of the full-resolution scan the game shows: x, y, w, h */
  region: number[]
  /** the same area in the game's own coordinate space (4,500px on the long side) */
  base: number[]
}
export interface AtlasMap {
  id: string
  year: number
  title: string
  source: string
  hint: string
  clues: AtlasClue[]
  /** true: the clues are general dating reference points, not read off this exact scan */
  referenceClues: boolean
  rightsLink?: string
  maker: string
  publisher: string
  collectionName: string
  collectionURL: string
  credit: string
  detail: AtlasDetail
  /** boxes (x1, y1, x2, y2 in base coordinates) painted over printed years */
  redactions: number[][]
}

const IIIF_HOSTS = ["https://tile.loc.gov/image-services/iiif/", "https://www.davidrumsey.com/luna/servlet/iiif/"]
const SOURCE_HOSTS = ["https://www.loc.gov/item/", "https://www.davidrumsey.com/luna/servlet/detail/"]
const RIGHTS = [undefined, "https://www.davidrumsey.com/about/copyright-and-permissions", "https://www.loc.gov/collections/general-maps/about-this-collection/"]
const COLLECTIONS = [
  { name: "Library of Congress · Geography and Map Division", url: "https://www.loc.gov/collections/general-maps/" },
  { name: "David Rumsey Map Collection · Stanford University Libraries", url: "https://www.davidrumsey.com/" },
]
const CREDITS = [
  "Library of Congress, Geography and Map Division",
  "David Rumsey Map Collection, David Rumsey Map Center, Stanford University Libraries",
]

// A few catalogue titles carry escaped quotes or \u escapes as literal text.
const tidy = (s: string) => s
  .replace(/\\"/g, "\"")
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
const names = (v: string | string[] | null) => tidy(Array.isArray(v) ? v.join("; ") : v ?? "")

export const ATLAS_MAPS: AtlasMap[] = ROWS.map(r => {
  const [id, year, title, [srcHost, srcPath], hint, clues, ref, rights, maker, publisher, coll, credit, [iiifHost, svc, region, base], redactions] = r
  return {
    id, year,
    title: tidy(title),
    source: SOURCE_HOSTS[srcHost] + srcPath,
    hint: STRINGS[hint],
    clues: clues.map(c => c.length > 1 ? { text: STRINGS[c[0]], source: STRINGS[c[1] as number] } : { text: STRINGS[c[0]] }),
    referenceClues: ref === 1,
    rightsLink: RIGHTS[rights],
    maker: names(maker),
    publisher: names(publisher),
    collectionName: COLLECTIONS[coll].name,
    collectionURL: COLLECTIONS[coll].url,
    credit: CREDITS[credit],
    detail: { service: IIIF_HOSTS[iiifHost] + (svc === 0 ? id : svc), region, base },
    redactions,
  }
})

export const MIN_YEAR = 1700
export const MAX_YEAR = 2020

/** 1,000 for the exact year, falling off smoothly: 10 years away is 923, 42 is 715. */
export const atlasScore = (guess: number, year: number) => Math.round(1000 * Math.exp(-Math.abs(guess - year) / 125))

export function verdict(delta: number) {
  if (delta === 0) return "Right on the year!"
  if (delta <= 15) return "A very good eye."
  if (delta <= 50) return "A good historical read."
  return "A new date to discover."
}

/** Today's date in the UK, where the daily map changes at midnight. */
export const ukToday = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)

// Same daily sequence as the original game, so its players keep their place:
// day 0 (24 Oct 2026) was the map at index 3, then one map per day in order.
const EPOCH = Date.parse("2026-10-24T12:00:00Z")
export function dailyIndex(ukDate: string) {
  const day = Math.floor((Date.parse(ukDate + "T12:00:00Z") - EPOCH) / 86400000)
  const n = ATLAS_MAPS.length
  return (((day + 3) % n) + n) % n
}

/** The whole visible scan at `width` pixels wide, from the archive's IIIF server. */
export const scanUrl = (d: AtlasDetail, width: number) =>
  `${d.service}/${d.region.join(",")}/${Math.round(width)},/0/default.jpg`

/** One piece of the original scan: x, y, w, h in full-resolution pixels, delivered at ow × oh. */
export const tileUrl = (d: AtlasDetail, x: number, y: number, w: number, h: number, ow: number, oh: number) =>
  `${d.service}/${[d.region[0] + x, d.region[1] + y, w, h].join(",")}/${ow},${oh}/0/default.jpg`
