// Flag Fusion: one made-up flag that takes its STRUCTURE (layout) from one
// country, its EMBLEM from a second and its COLOURS from a third. The player
// names all three. This file builds the rounds and judges the answers; the
// screen, the test and the contact-sheet script all share it.
//
// Fairness rules, each checked by scripts/flagfusion.test.mjs:
// - A structure counts for every country with the same layout
//   (STRUCTURE_FAMILIES); an emblem only for its own country.
// - Colours are named ("red", "light blue"…) and a country counts when its
//   flag uses the same set of named colours; shades on the edge of two names
//   count for both. Only colour sets few countries share are dealt.
// - The three parts come from three different countries, and no country
//   counts for two parts, so one answer never gives away another.
// - The fused flag never looks like the structure country's own flag, and
//   the emblem always stands out from what is behind it.
import { FUSION_STRUCTURES } from "../data/flagFusionStructures"
import type { FusionStructure } from "../data/flagFusionStructures"
import { FUSION_EMBLEMS } from "../data/flagFusionEmblems"
import { FLAG_PALETTES } from "../data/flagPalettes"
import { FLAGS } from "../data/flags"
import { STRUCTURE_FAMILIES, EMBLEM_FAME, COLOUR_FAME } from "../data/flagFusionSetup"
import type { Fame } from "../data/flagFusionSetup"

export type Tier = "easy" | "medium" | "hard"
export const TIERS: Tier[] = ["easy", "medium", "hard"]
export type Part = "structure" | "emblem" | "colours"
export const PARTS: Part[] = ["structure", "emblem", "colours"]
export const PART_LABEL: Record<Part, string> = { structure: "Structure", emblem: "Emblem", colours: "Colours" }

export const ROUNDS = 5          // fused flags per game
export const WRONG_GUESSES = 5   // shared by the three boxes, per flag
export const PART_POINTS = 100   // per box named
export const SPARE_POINTS = 20   // per wrong guess left, when all three are named

const NAMES: Record<string, string> = Object.fromEntries(FLAGS.map(f => [f.code, f.name]))
export const countryName = (code: string) => NAMES[code] ?? code

// ── Colours ───────────────────────────────────────────────────────────────

export type ColourName = "white" | "grey" | "black" | "red" | "maroon" | "orange" | "yellow" | "green" | "light blue" | "blue" | "brown"

const rgbOf = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
const linear = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
/** Relative luminance (WCAG). */
export const luminance = (hex: string) => { const [r, g, b] = rgbOf(hex).map(linear); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
/** WCAG contrast ratio, 1 to 21. */
export const contrast = (a: string, b: string) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

/** The plain names a colour goes by. A shade on the edge of two names
 *  (sky blue or blue, gold or orange, crimson or maroon) gets both. */
export function colourNames(hex: string): ColourName[] {
  const [r, g, b] = rgbOf(hex)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), v = max, s = max ? (max - min) / max : 0
  let h = 0
  if (max !== min) {
    const d = max - min
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h = (h * 60 + 360) % 360
  }
  const L = 116 * Math.cbrt(luminance(hex)) - 16 // CIE lightness, 0–100
  const out = new Set<ColourName>()
  if (v < 0.22 || (v < 0.32 && s < 0.35)) out.add("black")
  else if (s < 0.16) out.add(v > 0.8 ? "white" : "grey")
  else {
    if (h < 14 || h >= 325) { out.add("red"); if (v < 0.63) out.add("maroon") }
    if (h >= 10 && h < 20) out.add(v < 0.6 ? "brown" : "orange")
    if (h >= 18 && h < 38) out.add(v < 0.6 ? "brown" : "orange")
    if (h >= 34 && h < 72) out.add(v < 0.5 ? "brown" : "yellow")
    if (h >= 34 && h < 46 && v >= 0.6) out.add("orange")
    if (h >= 66 && h < 195) out.add("green")
    if (h >= 175 && h < 270) {
      if (L >= 50) out.add("light blue")
      if (L < 62) out.add("blue")
    }
    if (h >= 270 && h < 325) out.add(L < 40 ? "blue" : "red")
  }
  return [...out]
}
const sameName = (a: string, b: string) => { const x = colourNames(a); return colourNames(b).some(n => x.includes(n)) }

// A flag's colours, largest first, as [hex, % of the flag] (data/flagPalettes.ts).
const paletteOf = (code: string): [string, number][] => FLAG_PALETTES[code] ?? []

/** The colours a round paints with: every colour covering at least 4% of the
 *  flag, one per name (the largest shade). */
export function mainColours(code: string): string[] {
  const out: string[] = []
  for (const [hex, pct] of paletteOf(code)) {
    if (pct < 4) continue
    if (out.some(o => colourNames(o)[0] === colourNames(hex)[0])) continue
    out.push(hex)
  }
  return out
}

/** Every country whose flag is in these colours: each shown colour is on its
 *  flag, and each of its big colours (6% or more) is shown. Generous on
 *  purpose, so nobody loses a guess on a shade. */
export function coloursAccept(shown: string[]): string[] {
  return FLAGS.map(f => f.code).filter(code => {
    const all = paletteOf(code).map(([hex]) => hex)
    const big = paletteOf(code).filter(([, pct]) => pct >= 6).map(([hex]) => hex)
    return all.length > 0 && shown.every(s => all.some(c => sameName(s, c))) && big.every(c => shown.some(s => sameName(s, c)))
  })
}

/** Colour sets shared by at most this many countries can dress a round. */
export const MAX_COLOUR_TWINS = 7

export interface ColourSource { code: string; colours: string[]; accept: string[]; fame: Fame }
export const COLOUR_POOL: ColourSource[] = Object.entries(COLOUR_FAME).flatMap(([code, fame]) => {
  const colours = mainColours(code)
  const accept = coloursAccept(colours)
  if (colours.length < 2 || colours.length > 5 || !accept.includes(code) || accept.length > MAX_COLOUR_TWINS) return []
  return [{ code, colours, accept, fame }]
})

// ── Structures and emblems ────────────────────────────────────────────────

const STRUCTURE_BY_CODE = new Map(FUSION_STRUCTURES.map(s => [s.code, s]))
export interface StructureSource { code: string; structure: FusionStructure; accept: string[]; fame: Fame }
export const STRUCTURE_POOL: StructureSource[] = STRUCTURE_FAMILIES.flatMap(f =>
  Object.entries(f.show).flatMap(([code, fame]) => {
    const structure = STRUCTURE_BY_CODE.get(code)
    return structure && fame ? [{ code, structure, accept: [...f.members], fame }] : []
  }))

export interface EmblemSource { code: string; ratio: number; accept: string[]; fame: Fame }
export const EMBLEM_POOL: EmblemSource[] = FUSION_EMBLEMS.flatMap(e => {
  const fame = EMBLEM_FAME[e.code.toLowerCase()]
  return fame ? [{ code: e.code, ratio: e.ratio, accept: [e.code], fame }] : []
})
export const emblemUrl = (code: string) => `/fusion/emblems/${code.toLowerCase()}.svg`

// ── Building one fused flag ───────────────────────────────────────────────

export const FLAG_W = 640, FLAG_H = 480
/** The emblem's box inside its slot, keeping its proportions. */
export function emblemBox(slot: [number, number, number, number], ratio: number): [number, number, number, number] {
  const [x, y, w, h] = slot
  const ew = ratio > w / h ? w : h * ratio
  const eh = ratio > w / h ? w / ratio : h
  return [x + (w - ew) / 2, y + (h - eh) / 2, ew, eh]
}

/** Which structure slots lie behind the emblem, with their share. */
export function behindEmblem(s: FusionStructure, ratio: number): Map<number, number> {
  const [x, y, w, h] = s.slot
  const [ex, ey, ew, eh] = emblemBox(s.slot, ratio)
  const seen = new Map<number, number>()
  let n = 0
  for (let gy = 0; gy < 12; gy++) for (let gx = 0; gx < 12; gx++) {
    const px = x + (gx + 0.5) * w / 12, py = y + (gy + 0.5) * h / 12
    if (px < ex || px > ex + ew || py < ey || py > ey + eh) continue
    n++
    const c = s.grid[gy * 12 + gx]
    if (c === ".") continue
    seen.set(+c, (seen.get(+c) ?? 0) + 1)
  }
  for (const [k, v] of seen) seen.set(k, v / Math.max(1, n))
  return seen
}

/** The least contrast an emblem may have with any colour behind it: a light
 *  emblem on a darker ground reads at less contrast than a dark one on a
 *  lighter ground (black on dark green), so the bar is higher for the latter. */
export const MIN_EMBLEM_CONTRAST = { lighter: 2.35, darker: 2.8 }
/** How well an emblem colour stands out from a ground colour: 1 or more passes. */
export const standsOut = (emblem: string, ground: string) =>
  contrast(emblem, ground) / (luminance(emblem) >= luminance(ground) ? MIN_EMBLEM_CONTRAST.lighter : MIN_EMBLEM_CONTRAST.darker)

/** Paint the structure in these colours, by rank: its largest area takes the
 *  first colour, the next the second, and so on. With more areas than
 *  colours, the extra areas reuse a colour none of their neighbours has.
 *  Null when that can't be done or when a colour would go unseen. */
export function recolour(s: FusionStructure, colours: string[]): string[] | null {
  const k = s.areas.length, n = colours.length
  if (n > k + 1) return null
  const fill: string[] = []
  for (let i = 0; i < k; i++) {
    if (i < n) { fill.push(colours[i]); continue }
    const near = s.touch.filter(p => p.includes(i)).map(p => (p[0] === i ? p[1] : p[0])).filter(j => j < i).map(j => fill[j])
    const free = colours.filter(c => !near.includes(c))
    if (!free.length) return null
    // The colour used least so far, so the flag stays balanced.
    const used = (c: string) => fill.reduce((a, f, j) => a + (f === c ? s.areas[j] : 0), 0)
    fill.push(free.sort((a, b) => used(a) - used(b))[0])
  }
  // Touching areas never share a colour.
  if (s.touch.some(([a, b]) => fill[a] === fill[b])) return null
  return fill
}

/** The emblem's colour: the one that stands out most from what is behind it.
 *  When the structure leaves one colour unused, the emblem must wear it. */
export function emblemTint(s: FusionStructure, fill: string[], colours: string[], ratio: number): string | null {
  const behind = [...behindEmblem(s, ratio).entries()].filter(([, share]) => share >= 0.04).map(([i]) => fill[i])
  const unused = colours.filter(c => !fill.includes(c))
  const options = unused.length ? unused : colours
  if (unused.length > 1) return null
  let best: string | null = null, bestScore = 0
  for (const c of options) {
    const worst = Math.min(...behind.map(b => standsOut(c, b)), 9)
    if (worst > bestScore) { bestScore = worst; best = c }
  }
  return bestScore >= 1 ? best : null
}

/** Share of the flag whose colour changed name from the structure's own flag. */
export function changedShare(s: FusionStructure, fill: string[]): number {
  return s.areas.reduce((a, area, i) => a + (sameName(fill[i], s.from[i]) ? 0 : area), 0) / s.areas.reduce((a, b) => a + b, 0)
}

/** The smallest box an emblem may get, in the 640×480 frame (about 100×90):
 *  a wide emblem in a small slot (Eswatini's shield in a hoist triangle) is
 *  too small to make out. */
export const MIN_EMBLEM_AREA = 9000

export interface Fusion {
  structure: StructureSource
  emblem: EmblemSource
  colours: ColourSource
  fill: string[]                                  // colour per structure slot
  tint: string                                    // the emblem's colour
  box: [number, number, number, number]           // the emblem's box in the 640×480 frame
}

/** The fused flag for these three, or null when it breaks a rule. */
export function fuse(structure: StructureSource, emblem: EmblemSource, colours: ColourSource): Fusion | null {
  const codes = [structure.code, emblem.code, colours.code]
  if (new Set(codes).size < 3) return null
  const box = emblemBox(structure.structure.slot, emblem.ratio)
  if (box[2] * box[3] < MIN_EMBLEM_AREA) return null
  // No country counts for two parts.
  const sets = [structure.accept, emblem.accept, colours.accept]
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (sets[i].some(c => sets[j].includes(c))) return null
  const fill = recolour(structure.structure, colours.colours)
  if (!fill) return null
  if (changedShare(structure.structure, fill) < 0.5) return null
  const tint = emblemTint(structure.structure, fill, colours.colours, emblem.ratio)
  if (!tint) return null
  // Every colour of the set shows somewhere.
  if (!colours.colours.every(c => fill.includes(c) || c === tint)) return null
  return { structure, emblem, colours, fill, tint, box }
}

/** The structure SVG painted in the round's colours. */
export const structureSvg = (f: Pick<Fusion, "structure" | "fill">) =>
  f.structure.structure.svg.replace(/\{(\d+)\}/g, (_, i) => f.fill[+i])

// ── Dealing a game ────────────────────────────────────────────────────────

const fameOk: Record<Tier, (f: Fame[]) => boolean> = {
  easy: f => f.every(x => x === 1),
  medium: f => f.every(x => x <= 2) && f.some(x => x === 2),
  hard: f => f.every(x => x >= 2) && f.filter(x => x === 3).length >= 2,
}

/** True when these three parts belong in a game of this tier. */
export const inTier = (tier: Tier, s: StructureSource, e: EmblemSource, c: ColourSource) => fameOk[tier]([s.fame, e.fame, c.fame])

/** Every valid fusion of a tier (for the counts in tests and reports). */
export function allFusions(tier: Tier): Fusion[] {
  const out: Fusion[] = []
  for (const s of STRUCTURE_POOL) for (const e of EMBLEM_POOL) for (const c of COLOUR_POOL) {
    if (!inTier(tier, s, e, c)) continue
    const f = fuse(s, e, c)
    if (f) out.push(f)
  }
  return out
}

/** A game: ROUNDS fused flags. No flag lends a part twice, and no layout
 *  family or colour set comes up twice. */
export function dealGame(tier: Tier, rng: () => number = Math.random): Fusion[] {
  const pick = <X,>(xs: X[]) => xs[Math.floor(rng() * xs.length)]
  const key = (accept: string[]) => accept.slice().sort().join()
  let best: Fusion[] = []
  // Random picks can paint themselves into a corner on the small easy pool,
  // so start over a few times rather than deal a short game.
  for (let attempt = 0; attempt < 40 && best.length < ROUNDS; attempt++) {
    const out: Fusion[] = []
    const used = new Set<string>()
    for (let tries = 0; out.length < ROUNDS && tries < 1500; tries++) {
      const s = pick(STRUCTURE_POOL), e = pick(EMBLEM_POOL), c = pick(COLOUR_POOL)
      if (!inTier(tier, s, e, c)) continue
      const marks = [s.code, e.code, c.code, `S:${key(s.accept)}`, `C:${key(c.accept)}`]
      if (marks.some(m => used.has(m))) continue
      const f = fuse(s, e, c)
      if (!f) continue
      out.push(f)
      for (const m of marks) used.add(m)
    }
    if (out.length > best.length) best = out
  }
  return best
}

/** True when `code` is a right answer for this part of the fused flag. */
export const isRight = (f: Fusion, part: Part, code: string) => f[part].accept.includes(code)

/** Points for one fused flag: PART_POINTS per part named, and SPARE_POINTS
 *  per wrong guess left when all three are named. */
export function fusionPoints(solved: number, wrongLeft: number): number {
  return solved * PART_POINTS + (solved === PARTS.length ? wrongLeft * SPARE_POINTS : 0)
}
export const MAX_POINTS = ROUNDS * fusionPoints(PARTS.length, WRONG_GUESSES)

/** The whole fused flag as one SVG: the painted structure with the emblem
 *  stencil (public/fusion/emblems/<code>.svg, as text) in its box, inked in
 *  the round's colour. */
export function fusionSvg(f: Pick<Fusion, "structure" | "fill" | "tint" | "box">, stencil: string): string {
  const vb = stencil.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 100 100"
  const inner = stencil.trim()
    .replace(/^[\s\S]*?<svg\b[^>]*>/, "").replace(/<\/svg>$/, "")
    .replace('mask="url(#ff-stencil)"', `mask="url(#ff-stencil)" fill="${f.tint}"`)
  const [x, y, w, h] = f.box.map(n => +n.toFixed(2))
  const emblem = `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`
  return structureSvg(f)
    .replace(/^<svg\b/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"')
    .replace(/<\/svg>$/, `${emblem}</svg>`)
}
export const svgUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

/** The fused SVG for drawing straight into the page, the fallback when a
 *  browser won't decode it as an image (seen on an iPhone). Its ids get a
 *  suffix so two flags on one screen can't share a mask, and it fills its box. */
export function inlineSvg(svg: string, suffix: string): string {
  const ids = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]))
  let out = svg.replace(/\bid="([^"]+)"/g, (_, id) => `id="${id}-${suffix}"`)
  out = out.replace(/url\(#([^)]+)\)/g, (m, id) => (ids.has(id) ? `url(#${id}-${suffix})` : m))
  out = out.replace(/((?:xlink:)?href)="#([^"]+)"/g, (m, attr, id) => (ids.has(id) ? `${attr}="#${id}-${suffix}"` : m))
  return out.replace(/^<svg\b/, '<svg width="100%" height="100%" aria-hidden="true" focusable="false"')
}

/** The fusion in the owner's sketch, used for the poster and How it works:
 *  Brazil's layout, Afghanistan's emblem, Bhutan's colours. */
export function exampleFusion(): Fusion {
  const s = STRUCTURE_POOL.find(x => x.code === "BR"), e = EMBLEM_POOL.find(x => x.code === "AF"), c = COLOUR_POOL.find(x => x.code === "BT")
  const f = s && e && c && fuse(s, e, c)
  if (!f) throw new Error("The Brazil + Afghanistan + Bhutan example no longer fuses")
  return f
}
