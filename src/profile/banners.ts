// Profile banners: the site's tan paper with at most ONE other colour from the
// palette, drawn in code after a flag element (no uploads), or any country's
// flag. Stored by id: a preset ("nordic") or "flag:<code>" ("flag:JP").
//
// A preset is an SVG 1200×400 that is cropped to fill (cover), so the same art
// fills the profile header and the saved card. Motifs sit a little left of
// centre and inside the middle band, clear of the picture (bottom left) and
// the Edit pill (top right), and still whole when a wide screen crops the top
// and bottom. A flag banner shows the flag cropped to fit under a light tan
// wash, so it sits on the page like the presets do.
//
// Ids from the first banner set (Nov 2026) still read: each maps to the
// closest preset (LEGACY), and anything unknown is plain tan.
import { T, tint } from "../ui/tokens"
import { FLAGS } from "../data/flags"

export interface Banner {
  id: string
  name: string
  /** The one colour it adds to the tan, or null (plain). */
  accent: string | null
  body: string
}

export const W = 1200, H = 400
/** The tan paper every banner is drawn on. */
export const BANNER_TAN = T.void
/** A lighter tan, for gaps and edges inside a motif. */
const PAPER = T.bg
const INK = T.text, AMBER = T.amber, BLUE = T.cyan, GREEN = T.green, RED = T.warm

const CX = 480, CY = 200
const n = (v: number) => +v.toFixed(1)

/** A five-pointed star, point up. */
function star(cx: number, cy: number, r: number, fill: string, opacity = 1): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.4 : r
    return `${n(cx + Math.cos(a) * rr)},${n(cy + Math.sin(a) * rr)}`
  })
  return `<path d="M${pts.join("L")}Z" fill="${fill}"${opacity < 1 ? ` fill-opacity="${opacity}"` : ""}/>`
}

// Kiribati: rolling waves across the middle.
function waves(): string {
  const rows = [[132, 0.3], [178, 0.55], [224, 0.8], [270, 0.55]] as const
  return rows.map(([y, o], row) => {
    let d = `M-60 ${y}`
    for (let x = -60; x < W + 60; x += 120) d += " q30 -22 60 0 t60 0"
    return `<path d="${d}" fill="none" stroke="${BLUE}" stroke-opacity="${o}" stroke-width="9" stroke-linecap="round" transform="translate(${row % 2 ? 60 : 0} 0)"/>`
  }).join("")
}

// Norway, Sweden, Finland: the cross set towards the hoist.
const nordic = () =>
  `<rect x="${CX - 72}" width="44" height="${H}" fill="${INK}" fill-opacity="0.62"/>` +
  `<rect y="${CY - 22}" width="${W}" height="44" fill="${INK}" fill-opacity="0.62"/>`

// Japan, Bangladesh, Palau: one disc.
const disc = () => `<circle cx="${CX}" cy="${CY}" r="104" fill="${RED}" fill-opacity="0.9"/>`

// Czechia, Cuba, the Philippines: a triangle from the hoist, with a fine line
// beside it. The picture sits over its lower corner, like Cuba's star.
const chevron = () =>
  `<path d="M0 0L300 ${CY}L0 ${H}Z" fill="${GREEN}" fill-opacity="0.75"/>` +
  `<path d="M0 -44L366 ${CY}L0 ${H + 44}" fill="none" stroke="${GREEN}" stroke-opacity="0.45" stroke-width="7"/>`

// Trinidad and Tobago, Tanzania: a band from the top of the hoist, between two fine lines.
function band(): string {
  const along = (off: number) => `M-20 ${n(-20 / 3 + off)}L${W + 20} ${n(H + 20 / 3 + off)}`
  return `<path d="${along(0)}" stroke="${AMBER}" stroke-opacity="0.85" stroke-width="96"/>` +
    `<path d="${along(-86)}" stroke="${AMBER}" stroke-opacity="0.4" stroke-width="6"/>` +
    `<path d="${along(86)}" stroke="${AMBER}" stroke-opacity="0.4" stroke-width="6"/>`
}

// Scotland, Jamaica, Alabama: a saltire, corner to corner.
const saltire = () =>
  `<path d="M0 0L${W} ${H}M${W} 0L0 ${H}" stroke="${RED}" stroke-opacity="0.5" stroke-width="40"/>`

// Taiwan, Argentina, Kiribati: a sun with twelve rays.
function sun(): string {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2
    const tip = [CX + Math.cos(a) * 150, CY + Math.sin(a) * 150]
    const l = [CX + Math.cos(a - 0.17) * 70, CY + Math.sin(a - 0.17) * 70]
    const r = [CX + Math.cos(a + 0.17) * 70, CY + Math.sin(a + 0.17) * 70]
    return `${n(l[0])},${n(l[1])} ${n(tip[0])},${n(tip[1])} ${n(r[0])},${n(r[1])}`
  })
  return `<path d="M${rays.join("Z M")}Z" fill="${AMBER}" fill-opacity="0.75"/>` +
    `<circle cx="${CX}" cy="${CY}" r="64" fill="${PAPER}"/>` +
    `<circle cx="${CX}" cy="${CY}" r="52" fill="${AMBER}" fill-opacity="0.9"/>`
}

// Pakistan, Algeria, Mauritania: a crescent and a star.
function crescent(): string {
  // The outer circle (450, 200) r 100 less an inner one (485, 200) r 86.
  const x = 504.7, top = 116.3, bottom = 283.7
  return `<path d="M${x} ${top}A100 100 0 1 0 ${x} ${bottom}A86 86 0 1 1 ${x} ${top}Z" fill="${GREEN}" fill-opacity="0.9"/>` +
    star(548, CY, 36, GREEN, 0.9)
}

// Greece, Uruguay: even horizontal stripes, drawn fine.
const stripes = () =>
  Array.from({ length: 5 }, (_, i) => `<rect y="${n(36 + i * 76)}" width="${W}" height="24" fill="${BLUE}" fill-opacity="0.55"/>`).join("")

// The stars of a canton, in staggered rows.
function stars(): string {
  const out: string[] = []
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 11; col++) {
      const x = 50 + col * 112 + (row % 2 ? 56 : 0)
      out.push(star(x, 72 + row * 64, 12, INK, 0.34))
    }
  }
  return out.join("")
}

export const BANNERS: Banner[] = [
  { id: "plain", name: "Plain tan", accent: null, body: "" },
  { id: "waves", name: "Waves", accent: BLUE, body: waves() },
  { id: "nordic", name: "Nordic cross", accent: INK, body: nordic() },
  { id: "disc", name: "Disc", accent: RED, body: disc() },
  { id: "chevron", name: "Hoist triangle", accent: GREEN, body: chevron() },
  { id: "band", name: "Diagonal band", accent: AMBER, body: band() },
  { id: "saltire", name: "Saltire", accent: RED, body: saltire() },
  { id: "sun", name: "Sun", accent: AMBER, body: sun() },
  { id: "crescent", name: "Crescent", accent: GREEN, body: crescent() },
  { id: "stripes", name: "Stripes", accent: BLUE, body: stripes() },
  { id: "stars", name: "Star field", accent: INK, body: stars() },
]

export const DEFAULT_BANNER = BANNERS[0].id

/** The first set's ids, each read as the closest preset now. */
export const LEGACY: Record<string, string> = {
  parchment: "plain", contours: "plain", routes: "plain", graticule: "waves", compass: "sun",
  hills: "chevron", tricolour: "stripes", bands: "stripes",
}

const FLAG_PREFIX = "flag:"

/** The flag's code when the banner is a country flag ("flag:JP" → "JP"). */
export function bannerFlag(id: string | null | undefined): string | null {
  if (typeof id !== "string" || !id.startsWith(FLAG_PREFIX)) return null
  const code = id.slice(FLAG_PREFIX.length)
  return FLAGS.some(f => f.code === code) ? code : null
}

export const flagBanner = (code: string) => `${FLAG_PREFIX}${code}`

/** Any stored banner as one that can be shown: a preset id or "flag:<code>"
 *  (an old id becomes the closest preset; anything else, plain tan). */
export function bannerOf(v: unknown): string {
  if (typeof v !== "string") return DEFAULT_BANNER
  if (bannerFlag(v)) return v
  if (BANNERS.some(b => b.id === v)) return v
  return LEGACY[v] ?? DEFAULT_BANNER
}

export const bannerById = (id: string | null | undefined) => BANNERS.find(b => b.id === bannerOf(id)) ?? BANNERS[0]

/** The light tan over a flag banner. */
export const FLAG_WASH = tint(BANNER_TAN, 0.4)

/** A preset as a standalone SVG (a flag banner draws as plain tan here). */
export function bannerSvg(id: string | null | undefined): string {
  const b = bannerById(id)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"><rect width="${W}" height="${H}" fill="${BANNER_TAN}"/>${b.body}</svg>`
}

export const bannerUri = (id: string | null | undefined) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(bannerSvg(id))}`
