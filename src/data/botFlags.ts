import { seededRandom } from "../utils/prng"
import { randomDesign, drawnFills, drawnSvg, familyOf } from "../utils/flagStudio"
import type { Design } from "../utils/flagStudio"
import { FLAGS } from "./flags"
import type { FlagRecord } from "./flags"

// ── Real or Bot: synthetic "bot" flags + the real-flag pool ─────────────────
// BOT_FLAGS: 900 fixed, procedurally drawn flags (plus 600 from Flag Studio's
// Random button, below) in the same flat-vector style
// as the real ones, built from ~35 layouts real flags actually use (tricolours,
// Nordic crosses, saltires, hoist triangles, cantons, diagonal bands, borders,
// stars, crescents, suns). Every flag is seeded, so the pool is identical on
// every device. Colours come in families (red, orange, yellow, green, blue,
// white, black) with a few real-world shades each; touching colours must be
// different families with enough contrast, the way real flags are designed.
//
// No bot flag may copy a real one. Each layout reports a structural signature
// (layout + colour families in order) and anything that matches REAL_SIGS —
// the same signatures written out for real national flags — is thrown away.
// Banded layouts are checked on their bands alone, even when they carry an
// emblem, so "Hungary with a star" (≈ Tajikistan) can't slip through.

type Fam = "r" | "o" | "y" | "g" | "b" | "w" | "k"
interface C { f: Fam; h: string }

const SHADES: Record<Fam, string[]> = {
  r: ["#CE1126", "#D52B1E", "#C8102E", "#E70013", "#DA291C", "#BF0A30", "#8D1B3D", "#9E1B32"],
  o: ["#FF7900", "#F77F00", "#FF8200", "#EE7203"],
  y: ["#FCD116", "#FFD100", "#F1BF00", "#FFCE00", "#FFC726"],
  g: ["#007A3D", "#009A44", "#006233", "#00843D", "#1EB53A", "#046A38", "#008751", "#00A651"],
  b: ["#003893", "#0038A8", "#002868", "#0055A4", "#012169", "#1E4B9C", "#0072C6", "#75AADB", "#4189DD", "#00A3DD", "#3A75C4"],
  w: ["#FFFFFF"],
  k: ["#000000", "#141414"],
}
// Rough frequency of each colour family on real national flags.
const FAM_W: [Fam, number][] = [["r", 27], ["w", 22], ["b", 19], ["g", 16], ["y", 11], ["k", 6], ["o", 2]]
const FAM_TOTAL = FAM_W.reduce((s, [, w]) => s + w, 0)
// Neighbours real designers avoid: red on orange, orange on yellow, yellow on white.
const CLASH = new Set(["ro", "or", "oy", "yo", "yw", "wy"])

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}
function dist(a: string, b: string): number {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b)
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function starPts(cx: number, cy: number, R: number, rot = 0): string {
  const p: string[] = []
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + rot + (i * Math.PI) / 5
    const r = i % 2 ? R * 0.38 : R
    p.push(`${(cx + r * Math.cos(ang)).toFixed(1)},${(cy + r * Math.sin(ang)).toFixed(1)}`)
  }
  return p.join(" ")
}
const star = (cx: number, cy: number, R: number, fill: string, rot = 0) => `<polygon points='${starPts(cx, cy, R, rot)}' fill='${fill}'/>`

// ── Drawing: clean single shapes ────────────────────────────────────────────
// Real flag files draw each colour as one clean shape. A fake built from
// overlapping or abutting rectangles gives itself away up close: a hairline
// where two bars meet (a browser anti-aliases each shape on its own, so two
// edges on the same line let the colour underneath show through), or a bar
// laid over the wrong arm. So every bot's base design follows three rules,
// checked by scripts/realorbot.test.mjs:
// - The field is one shape over the whole flag, so nothing shows through.
// - Each colour is one <path>, the union of its bars (a cross is one outline,
//   a saltire one outline), and colours are layered: every edge lies over a
//   colour drawn earlier. A fimbriated cross is a larger cross under a
//   smaller one; a band reaches a little way under the band drawn after it.
// - No two shapes share an edge inside the flag.
// Straight edges sit on a 0.2-unit grid: whole pixels on the 300×200 card at
// 1×, 2× and 3×. Charges (stars, crescents, suns, shields) come after the
// base, in one <g>.

type Pt = [number, number]
export const BOT_W = 60, BOT_H = 40
const W = BOT_W, H = BOT_H
const snap = (v: number) => Math.round(v * 5) / 5
const num = (v: number) => String(+v.toFixed(2))
const shape = (d: string, fill: string) => `<path d='${d}' fill='${fill}'/>`
const ptsD = (pts: Pt[]) => "M" + pts.map(([x, y]) => `${num(x)} ${num(y)}`).join("L") + "Z"
const boxD = (x0: number, y0: number, x1: number, y1: number) => `M${num(x0)} ${num(y0)}H${num(x1)}V${num(y1)}H${num(x0)}Z`
const field = (fill: string, w = W, h = H) => shape(boxD(0, 0, w, h), fill)
const circle = (cx: number, cy: number, r: number, fill: string) => `<circle cx='${num(cx)}' cy='${num(cy)}' r='${num(r)}' fill='${fill}'/>`

/** A cross as one outline: the upright x0–x1 from Y0 to Y1, the bar y0–y1 from X0 to X1. Clockwise. */
export function crossD(x0: number, x1: number, y0: number, y1: number, X0 = 0, Y0 = 0, X1 = W, Y1 = H): string {
  const [a, b, c, d, e, f, g, h] = [x0, x1, y0, y1, X0, Y0, X1, Y1].map(num)
  return `M${a} ${f}H${b}V${c}H${g}V${d}H${b}V${h}H${a}V${d}H${e}V${c}H${a}Z`
}

/** A disc as a clockwise subpath, to join a cross's outline in one path. */
const discD = (cx: number, cy: number, r: number) =>
  `M${num(cx - r)} ${num(cy)}A${num(r)} ${num(r)} 0 1 1 ${num(cx + r)} ${num(cy)}A${num(r)} ${num(r)} 0 1 1 ${num(cx - r)} ${num(cy)}Z`

const meet = ([x1, y1]: Pt, [x2, y2]: Pt, [x3, y3]: Pt, [x4, y4]: Pt): Pt => {
  const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  const a = x1 * y2 - y1 * x2, b = x3 * y4 - y3 * x4
  return [(a * (x3 - x4) - (x1 - x2) * b) / d, (a * (y3 - y4) - (y1 - y2) * b) / d]
}

/** The two corner-to-corner bands of a saltire as one outline. Each band
 *  meets the top and bottom edges `t` in from a corner and the sides `s` in. */
export function saltireD(t: number, s: number, w = W, h = H): string {
  const top = meet([t, 0], [w, h - s], [w - t, 0], [0, h - s])
  const right = meet([w, s], [t, h], [t, 0], [w, h - s])
  const bottom = meet([w - t, h], [0, s], [w, s], [t, h])
  const left = meet([0, h - s], [w - t, 0], [w - t, h], [0, s])
  return ptsD([[0, 0], [t, 0], top, [w - t, 0], [w, 0], [w, s], right, [w, h - s], [w, h], [w - t, h], bottom, [t, h], [0, h], [0, h - s], left, [0, s]])
}

/** Bands across ("h", top to bottom) or along ("v", hoist to fly), split at
 *  `edges` (one more than the colours). The first colour is the field; each
 *  other colour is one path. Where a band meets a band drawn later, it reaches
 *  a quarter of the way under it, so every boundary is drawn once, by the
 *  later colour, over the earlier one. */
export function bands(dir: "h" | "v", fills: string[], edges: number[], w = W, h = H, grid = true): string {
  const e = grid ? edges.map(snap) : edges
  const q = (v: number) => (grid ? snap(v) : v)
  const order = [...new Set(fills)]
  let out = field(fills[0], w, h)
  for (const c of order.slice(1)) {
    const spans: [number, number][] = []
    fills.forEach((f, i) => {
      if (f !== c) return
      let a = e[i], b = e[i + 1]
      if (i > 0 && order.indexOf(fills[i - 1]) > order.indexOf(c)) a = q(a - (e[i] - e[i - 1]) / 4)
      if (i < fills.length - 1 && order.indexOf(fills[i + 1]) > order.indexOf(c)) b = q(b + (e[i + 2] - e[i + 1]) / 4)
      const last = spans[spans.length - 1]
      if (last && last[1] >= a) last[1] = b
      else spans.push([a, b])
    })
    out += shape(spans.map(([a, b]) => (dir === "h" ? boxD(0, a, w, b) : boxD(a, 0, b, h))).join(""), c)
  }
  return out
}

// Crescent opening to the fly: the disc minus a disc 0.36R toward the fly
// with 0.82 of its radius, drawn as the one shape that's left.
function crescent(cx: number, cy: number, R: number, color: string): string {
  const d = 0.36 * R, r2 = 0.82 * R
  const ix = (d * d + R * R - r2 * r2) / (2 * d), iy = Math.sqrt(R * R - ix * ix)
  const p1 = `${num(cx + ix)} ${num(cy - iy)}`, p2 = `${num(cx + ix)} ${num(cy + iy)}`
  return shape(`M${p1}A${num(R)} ${num(R)} 0 1 0 ${p2}A${num(r2)} ${num(r2)} 0 1 1 ${p1}Z`, color)
}
// A sun: rays and disc as one outline.
function sun(cx: number, cy: number, R: number, color: string, rays = 12): string {
  const at = (a: number, r: number) => `${num(cx + Math.cos(a) * r)} ${num(cy + Math.sin(a) * r)}`
  const step = (2 * Math.PI) / rays
  // Each ray's base starts where the arc from the ray before ends.
  let d = `M${at(-0.17, R)}`
  for (let i = 0; i < rays; i++) {
    const a = i * step
    d += `L${at(a, R * 1.75)}L${at(a + 0.17, R)}A${num(R)} ${num(R)} 0 0 1 ${at(a + step - 0.17, R)}`
  }
  return shape(d + "Z", color)
}
function ringStars(cx: number, cy: number, R: number, n: number, color: string, size: number): string {
  let s = ""
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    s += star(cx + Math.cos(a) * R, cy + Math.sin(a) * R, size, color)
  }
  return s
}
function shield(cx: number, cy: number, w: number, h: number, fill: string, mark: string): string {
  const path = `M${cx - w},${cy - h} L${cx + w},${cy - h} L${cx + w},${(cy + h * 0.25).toFixed(1)} Q${cx + w},${cy + h} ${cx},${cy + h} Q${cx - w},${cy + h} ${cx - w},${(cy + h * 0.25).toFixed(1)} Z`
  return `<path d='${path}' fill='${fill}'/>` + star(cx, cy, w * 0.55, mark)
}

// ── Real flags written as signatures (colour families, in order) ────────────
// Bands are canonicalised (a sequence and its reverse match), and horizontal
// vs vertical is ignored, so a bot can't be a real flag turned on its side.
const canon = (s: string) => { const r = [...s].reverse().join(""); return r < s ? r : s }
const pair = (a: string, b: string) => [a, b].sort().join("")

const REAL_BANDS = [
  // three bands
  "rwr", "wgr", "bkw", "kry", "kyr", "rwg", "ygr", "ryg", "gry", "rwb", "wbr", "rbw", "rbo", "rwk", "gyb",
  "gwb", "ybr", "byr", "owg", "gwo", "bwb", "wbw", "gwg", "rbr", "brb", "rkg", "krg", "bwg", "rbg", "gwk",
  "kwg", "ryr", "gyg", "byb", "ybg", "bgy", "rgy", "ykg", "ryb", "wrw",
  // two bands
  "wr", "by", "br", "wb", "rg", "yw", "gw", "rk", "gr", "ry", "wk",
  // four to six bands
  "rbyg", "bwrwb", "rwbwr", "bwkwb", "gwrwg", "kwrwg", "rwbwg", "gwkwy", "kyrkyr", "gwbwr",
].map(canon)

export const REAL_SIGS = new Set<string>([
  ...REAL_BANDS.map(b => "bands:" + b),
  // Nordic cross (field + cross): DK, NO, SE, FI, IS, Faroe, Åland, Scania, Shetland
  ...["rw", "by", "wb", "bw", "wr", "ry", "br"].map(p => "nordic:" + p),
  // centred cross: Switzerland, Georgia/England, Tonga's canton
  ...["rw", "wr"].map(p => "cross:" + p),
  // saltires: Scotland, Russian navy jack, St Patrick / Jersey / Alabama
  ...["bw", "wb", "wr", "rw"].map(p => "saltire:" + p),
  // saltire with four coloured fields (top+bottom, hoist+fly, saltire): Jamaica, Burundi
  "saltire4:gky", "saltire4:kgy", "saltire4:rgw", "saltire4:grw",
  // plain field + disc: Japan, Bangladesh, Palau, Greenland-ish
  ...["wr", "gr", "by", "rw"].map(p => "disc:" + p),
  // plain field + single star: Vietnam, Somalia, Morocco
  ...["ry", "bw", "rg"].map(p => "star:" + p),
  // plain field + crescent & star: Turkey, Tunisia, Mauritania, Pakistan/Algeria/Comoros
  ...["rw", "gw", "gy", "bw"].map(p => "crescent:" + p),
  // ring of stars: Europe
  "ring:by",
  // plain field + sun: North Macedonia, Kyrgyzstan, Kazakhstan, Kiribati
  ...["ry", "by", "rw"].map(p => "sun:" + p),
  // striped field + canton: USA, Liberia, Malaysia, Uruguay, Greece, Togo, Chile
  "canton:rw:b", "canton:bw:w", "canton:bw:b", "canton:gy:r", "canton:rw:w",
  // plain field + solid canton: Taiwan, Samoa, Tonga
  "canton1:rb", "canton1:rw",
  // bands + hoist triangle: Czechia, Philippines, Eritrea, Jordan/Palestine/Sudan/W. Sahara,
  // São Tomé, Bahamas, Equatorial Guinea, Cuba/Puerto Rico, Mozambique, South Sudan, Kuwait (trapezoid)
  ...["wr:b", "br:w", "gb:r", "kwg:r", "rwk:g", "gyg:r", "byb:k", "gwr:b", "bwbwb:r", "rwrwr:b",
    "gkkg:r", "kwrwg:b", "gwr:k", "rwg:k", "gwkwy:r"].map(s => { const [b, t] = s.split(":"); return `tri:${canon(b)}:${t}` }),
  // plain field + hoist triangle: Timor-Leste, Guyana-ish
  "tri:r:k", "tri:g:r", "tri:g:y",
  // two triangles + diagonal band: Tanzania, DR Congo, Namibia, Congo, Trinidad, St Kitts, Solomons
  ...[["g", "b", "k"], ["b", "b", "r"], ["b", "g", "r"], ["g", "r", "y"], ["r", "r", "k"], ["g", "r", "k"], ["b", "g", "y"]]
    .map(([a, b, c]) => `diag:${pair(a, b)}:${c}`),
  // diagonal split: Papua New Guinea, Bhutan
  "split:kr", "split:oy",
  // serrated hoist: Qatar, Bahrain
  "serrated:wr",
  // hoist pale + two/three bands: Madagascar, Benin, Guinea-Bissau, UAE
  `hoist:w:${canon("rg")}`, `hoist:g:${canon("yr")}`, `hoist:r:${canon("yg")}`, `hoist:r:${canon("gwk")}`,
  // bordered field: Montenegro, Sri Lanka, Grenada
  "border:yr", "border:ry",
  // quartered: Dominican Republic, Panama
  "quart:br", "quart:rb", "quart:wr", "quart:rw",
  // canton cross: Tonga
  "tonga:rwr",
  // hoist rays: Seychelles
  "rays:" + canon("byrwg"),
])

interface Built { src: string; sig: string[] }

function build(seed: string): Built | null {
  const r = seededRandom(seed)
  const shade: Partial<Record<Fam, string>> = {}
  const pickFam = (): Fam => {
    let x = r() * FAM_TOTAL
    for (const [f, w] of FAM_W) { x -= w; if (x < 0) return f }
    return "r"
  }
  // A colour that differs in family (and clearly in tone) from every neighbour.
  // Within one flag each family keeps one shade, as real flags do.
  const col = (...avoid: (C | undefined)[]): C => {
    const av = avoid.filter(Boolean) as C[]
    for (let i = 0; i < 40; i++) {
      const f = pickFam()
      if (av.some(a => a.f === f || CLASH.has(a.f + f))) continue
      const h = shade[f] ?? SHADES[f][Math.floor(r() * SHADES[f].length)]
      if (av.some(a => dist(a.h, h) < 95)) continue
      shade[f] = h
      return { f, h }
    }
    return { f: "w", h: "#FFFFFF" }
  }
  // A "light" charge colour (white or yellow), falling back to any colour.
  const light = (...avoid: C[]): C => {
    const opts: C[] = [{ f: "w", h: "#FFFFFF" }, { f: "y", h: shade.y ?? SHADES.y[Math.floor(r() * SHADES.y.length)] }]
    const first = r() < 0.65 ? opts[0] : opts[1]
    for (const o of [first, ...opts]) if (!avoid.some(a => a.f === o.f || CLASH.has(a.f + o.f))) { if (o.f === "y") shade.y = o.h; return o }
    return col(...avoid)
  }
  const chance = (p: number) => r() < p
  const bandsSig = (cs: C[]) => "bands:" + canon(cs.map(c => c.f).join(""))

  // An emblem centred at (cx, cy) with radius R, drawn over a solid colour bg.
  const emblem = (cx: number, cy: number, R: number, bg: C, kinds = "sssddncuhr"): string => {
    const k = kinds[Math.floor(r() * kinds.length)]
    const c = light(bg)
    if (k === "s") return star(cx, cy, R, c.h)
    if (k === "d") return circle(cx, cy, R * 0.8, col(bg).h)
    if (k === "n") return crescent(cx - R * 0.2, cy, R * 0.8, c.h) + star(cx + R * 0.55, cy, R * 0.32, c.h)
    if (k === "c") return [-1, 0, 1].map(i => star(cx + i * R * 0.95, cy, R * 0.42, c.h)).join("")
    if (k === "u") return sun(cx, cy, R * 0.5, c.h)
    if (k === "h") { const f = col(bg); return shield(cx, cy, R * 0.62, R * 0.8, f.h, light(f).h) }
    return ringStars(cx, cy, R * 0.8, 10, c.h, R * 0.17)
  }

  // `base` is the design (field, bands, crosses), `charges` what sits on it.
  // The random draws below run in the same order as they always have, so the
  // pool holds the same designs; only the drawing changed.
  let base = ""
  let charges = ""
  let sig: string[] = []
  const layout = Math.floor(r() * 35)
  const thirds = [0, H / 3, (2 * H) / 3, H]
  const hoistTri = (depth: number): Pt[] => [[0, 0], [depth, 20], [0, 40]]

  switch (layout) {
    case 0: case 1: case 2: { // plain horizontal tricolour (the commonest real layout)
      const a = col(), b = col(a), c = col(b)
      base = bands("h", [a.h, b.h, c.h], thirds)
      sig = [bandsSig([a, b, c])]
      break
    }
    case 3: case 4: { // plain vertical tricolour
      const a = col(), b = col(a), c = col(b)
      base = bands("v", [a.h, b.h, c.h], [0, 20, 40, 60])
      sig = [bandsSig([a, b, c])]
      break
    }
    case 5: case 6: { // horizontal tricolour with an emblem in the centre band
      const a = col(), b = col(a), c = col(b)
      base = bands("h", [a.h, b.h, c.h], thirds)
      charges = emblem(30, 20, 5.4, b, "sssddncuh")
      sig = [bandsSig([a, b, c])]
      break
    }
    case 7: { // vertical tricolour with an emblem in the centre band
      const a = col(), b = col(a), c = col(b)
      base = bands("v", [a.h, b.h, c.h], [0, 20, 40, 60])
      charges = emblem(30, 20, 7, b)
      sig = [bandsSig([a, b, c])]
      break
    }
    case 8: { // unequal triband, 2:1:1 or 1:2:1
      const a = col(), b = col(a), c = col(b)
      const [h1, h2] = chance(0.5) ? [20, 10] : [10, 20]
      base = bands("h", [a.h, b.h, c.h], [0, h1, h1 + h2, H])
      if (h2 === 20 && chance(0.5)) charges = emblem(30, 20, 7, b)
      sig = [bandsSig([a, b, c])]
      break
    }
    case 9: { // horizontal bicolour with an emblem in the upper hoist
      const a = col(), b = col(a)
      base = bands("h", [a.h, b.h], [0, 20, 40])
      charges = emblem(12, 10, 6, a, "ssncu")
      sig = [bandsSig([a, b])]
      break
    }
    case 10: { // vertical bicolour, hoist third or half, emblem in the fly
      const a = col(), b = col(a)
      const x = chance(0.5) ? 20 : 30
      base = bands("v", [a.h, b.h], [0, x, W])
      charges = emblem(x + (W - x) / 2, 20, 8, b, "ssnduh")
      sig = [bandsSig([a, b])]
      break
    }
    case 11: case 12: { // three bands + hoist triangle, optional star in the triangle
      const a = col(), b = col(a), c = col(b), t = col(a, b, c)
      const depth = chance(0.5) ? 22 : 30
      base = bands("h", [a.h, b.h, c.h], thirds) + shape(ptsD(hoistTri(depth)), t.h)
      if (chance(0.6)) charges = star(depth * 0.3, 20, 4.2, light(t).h)
      sig = [`tri:${canon(a.f + b.f + c.f)}:${t.f}`]
      break
    }
    case 13: { // two bands + hoist triangle + star
      const a = col(), b = col(a), t = col(a, b)
      const depth = chance(0.5) ? 26 : 30
      base = bands("h", [a.h, b.h], [0, 20, 40]) + shape(ptsD(hoistTri(depth)), t.h)
      if (chance(0.7)) charges = emblem(depth * 0.32, 20, 4.4, t, "sssnu")
      sig = [`tri:${canon(a.f + b.f)}:${t.f}`]
      break
    }
    case 14: case 15: { // Nordic cross, sometimes fimbriated (a wide cross under a narrow one)
      const f = col(), c = col(f)
      base = field(f.h)
      if (chance(0.4)) { const inn = col(c, f); base += shape(crossD(15, 27, 14, 26), c.h) + shape(crossD(18, 24, 17, 23), inn.h) }
      else base += shape(crossD(17, 25, 16, 24), c.h)
      sig = ["nordic:" + f.f + c.f]
      break
    }
    case 16: { // centred cross, sometimes with a disc at the crossing (one shape with it)
      const f = col(), c = col(f)
      let d = crossD(26, 34, 16, 24)
      if (chance(0.4)) { d += discD(30, 20, 7); charges = emblem(30, 20, 5, c, "ssd") }
      base = field(f.h) + shape(d, c.h)
      sig = ["cross:" + f.f + c.f]
      break
    }
    case 17: { // plain saltire
      const f = col(), c = col(f)
      base = field(f.h) + shape(saltireD(7, 5), c.h)
      sig = ["saltire:" + f.f + c.f]
      break
    }
    case 18: { // saltire over four coloured fields
      const tb = col(), side = col(tb), s = col(tb, side)
      let d = saltireD(6, 4)
      if (chance(0.4)) { const dc = col(s); d += discD(30, 20, 8); charges = circle(30, 20, 6.6, dc.h) + star(30, 20, 4, light(dc).h) }
      base = field(tb.h) + shape(ptsD([[0, 0], [30, 20], [0, 40]]) + ptsD([[60, 0], [60, 40], [30, 20]]), side.h) + shape(d, s.h)
      sig = [`saltire4:${tb.f}${side.f}${s.f}`]
      break
    }
    case 19: { // plain field + disc, centred or toward the hoist
      const f = col(), d = col(f), cx = chance(0.5) ? 27 : 30
      base = field(f.h) + circle(cx, 20, chance(0.5) ? 11 : 9, d.h)
      if (chance(0.35)) charges = star(cx, 20, 5.5, col(d).h)
      sig = ["disc:" + f.f + d.f]
      break
    }
    case 20: { // plain field + large star (centre or hoist)
      const f = col(), s = light(f)
      base = field(f.h)
      charges = chance(0.6) ? star(30, 20, 11, s.h) : star(15, 12, 7, s.h)
      sig = ["star:" + f.f + s.f]
      break
    }
    case 21: case 22: { // plain field + crescent and star(s), sometimes a hoist pale
      const f = col(), c = light(f)
      base = field(f.h)
      const mode = Math.floor(r() * 3)
      const pale = chance(0.3)
      if (pale) { const p = col(f); base += shape(boxD(0, 0, 12, H), p.h); sig.push(bandsSig([p, f])) }
      // With a pale, the charge moves toward the fly so the pale never cuts it.
      const dx = pale ? 6 : 0
      if (mode === 0) charges = crescent(25 + dx, 20, 10, c.h) + star(36 + dx, 20, 4, c.h)
      else if (mode === 1) charges = crescent(16 + dx, 13, 7, c.h) + star(24 + dx, 13, 2.8, c.h)
      else charges = crescent(24 + dx, 20, 10, c.h) + [14, 20, 26].map(y => star(34 + dx, y, 2.4, c.h)).join("")
      sig.push("crescent:" + f.f + c.f)
      break
    }
    case 23: { // plain field + ring of stars
      const f = col(), c = light(f)
      base = field(f.h)
      charges = ringStars(30, 20, 12, [8, 10, 12, 14][Math.floor(r() * 4)], c.h, 2.3)
      sig = ["ring:" + f.f + c.f]
      break
    }
    case 24: { // plain field + sun, centred or in the canton
      const f = col(), c = light(f)
      base = field(f.h)
      charges = chance(0.5) ? sun(30, 20, 6, c.h, 16) : sun(14, 11, 4, c.h, 12)
      sig = ["sun:" + f.f + c.f]
      break
    }
    case 25: { // hoist pale + two horizontal bands, optional stars in the pale
      const p = col(), a = col(p), b = col(p, a)
      const x = chance(0.5) ? 20 : 15
      base = bands("h", [a.h, b.h], [0, 20, 40]) + shape(boxD(0, 0, x, H), p.h)
      const sm = Math.floor(r() * 3)
      if (sm === 1) charges = star(x / 2, 20, 5, light(p).h)
      else if (sm === 2) charges = [10, 20, 30].map(y => star(x / 2, y, 3.2, light(p).h)).join("")
      sig = [`hoist:${p.f}:${canon(a.f + b.f)}`, bandsSig([a, b])]
      break
    }
    case 26: { // two triangles split by a fimbriated diagonal band (wide band under narrow)
      const a = col(), b = col(a), fim = light(a, b), band = col(fim, a, b)
      base = field(a.h) + shape(ptsD([[60, 0], [60, 40], [0, 40]]), b.h) +
        shape(ptsD([[0, 40], [0, 31], [46, 0], [60, 0], [60, 9], [14, 40]]), fim.h) +
        shape(ptsD([[0, 40], [0, 36], [52, 0], [60, 0], [60, 4], [8, 40]]), band.h)
      if (chance(0.5)) charges = star(11, 10, 5, light(a).h)
      sig = [`diag:${pair(a.f, b.f)}:${band.f}`]
      break
    }
    case 27: { // bordered field with a central emblem
      const f = col(), b = col(f)
      base = field(b.h) + shape(boxD(4, 4, 56, 36), f.h)
      charges = emblem(30, 20, 9, f, "sshuc")
      sig = [`border:${b.f}${f.f}`]
      break
    }
    case 28: { // five bands, a-b-c-b-a, wide centre
      const a = col(), b = col(a), c = col(b)
      base = bands("h", [a.h, b.h, c.h, b.h, a.h], [0, 7, 12, 28, 33, 40])
      if (chance(0.45)) charges = emblem(30, 20, 6.5, c)
      sig = [bandsSig([a, b, c, b, a]), bandsSig([a, c, a])]
      break
    }
    case 29: { // many stripes + canton with stars, a sun or one star
      const f = col(), s = col(f), cn = col(f, s)
      const n = [7, 9, 11, 13][Math.floor(r() * 4)]
      const y = (i: number) => snap((i * H) / n)
      const k = Math.ceil(n / 2), ch = y(k), cw = 26
      // Stripes beside the canton reach 2 units under it, so its edge lies
      // over them. Where the canton's bottom edge meets a stripe's edge, the
      // stripe turns in under the canton on a slant, so the two never share
      // an edge (only the canton's corner point).
      const stripes: string[] = []
      for (let i = 1; i < n; i += 2) {
        if (i + 1 < k) stripes.push(boxD(cw - 2, y(i), W, y(i + 1)))
        else if (i + 1 === k) stripes.push(ptsD([[cw - 2, y(i)], [W, y(i)], [W, ch], [cw, ch], [cw - 2, ch - 1]]))
        else if (i === k) stripes.push(ptsD([[0, ch - 1], [cw - 2, ch - 1], [cw, ch], [W, ch], [W, y(i + 1)], [0, y(i + 1)]]))
        else stripes.push(boxD(0, y(i), W, y(i + 1)))
      }
      base = field(f.h) + shape(stripes.join(""), s.h) + shape(boxD(0, 0, cw, ch), cn.h)
      const sc = light(cn), m = Math.floor(r() * 3)
      if (m === 0) for (let row = 0; row < 3; row++) for (let j = 0; j < 4; j++) charges += star(cw * (j + 0.5) / 4, ch * (row + 0.5) / 3, ch * 0.1, sc.h)
      else if (m === 1) charges = sun(13, ch / 2, ch * 0.16, sc.h)
      else charges = star(13, ch / 2, ch * 0.3, sc.h)
      sig = [`canton:${pair(f.f, s.f)}:${cn.f}`]
      break
    }
    case 30: { // plain field + solid canton with a star or sun
      const f = col(), cn = col(f), sc = light(cn)
      base = field(f.h) + shape(boxD(0, 0, 30, 20), cn.h)
      charges = chance(0.5) ? star(15, 10, 6, sc.h) : sun(15, 10, 3.6, sc.h)
      sig = [`canton1:${f.f}${cn.f}`]
      break
    }
    case 31: { // quartered field with a disc or star at the centre
      const a = col(), b = col(a)
      const d = col(a, b)
      base = field(a.h) + shape(boxD(30, 0, 60, 20) + boxD(0, 20, 30, 40), b.h) + circle(30, 20, 8, d.h)
      if (chance(0.5)) charges = star(30, 20, 5, light(d).h)
      sig = [`quart:${a.f}${b.f}`]
      break
    }
    case 32: { // chevron from the hoist over a bicolour
      const a = col(), b = col(a), ch = col(a, b)
      base = bands("h", [a.h, b.h], [0, 20, 40]) + shape(ptsD([[0, 0], [12, 0], [36, 20], [12, 40], [0, 40], [24, 20]]), ch.h)
      if (chance(0.5)) charges = star(9, 20, 4, ch.h)
      sig = [`tri:${canon(a.f + b.f)}:${ch.f}`, bandsSig([a, b])]
      break
    }
    case 33: { // diagonal split into two triangles, emblem in the upper hoist
      const a = col(), b = col(a)
      base = field(a.h) + shape(ptsD([[60, 0], [60, 40], [0, 40]]), b.h)
      charges = emblem(15, 11, 6, a, "sscu")
      sig = [`split:${pair(a.f, b.f)}`]
      break
    }
    default: { // 34: serrated hoist band, or a canton cross, or hoist rays
      const m = Math.floor(r() * 3)
      if (m === 0) {
        const hb = col(), f = col(hb), pts: Pt[] = [[0, 0], [16, 0]]
        const teeth = [5, 7, 9][Math.floor(r() * 3)]
        for (let i = 0; i < teeth; i++) pts.push([24, +((i + 0.5) * H / teeth).toFixed(1)], [16, +((i + 1) * H / teeth).toFixed(1)])
        pts.push([0, 40])
        base = field(f.h) + shape(ptsD(pts), hb.h)
        sig = [`serrated:${hb.f}${f.f}`]
      } else if (m === 1) {
        const f = col(), cn = col(f), cr = col(cn)
        base = field(f.h) + shape(boxD(0, 0, 24, 18), cn.h) + shape(crossD(10, 14, 7, 11, 6, 3, 18, 15), cr.h)
        sig = [`tonga:${f.f}${cn.f}${cr.f}`]
      } else {
        const cs: C[] = [col()]
        for (let i = 1; i < 4; i++) cs.push(col(cs[i - 1]))
        base = field(cs[0].h) + shape(ptsD([[0, 40], [60, 0], [60, 40]]), cs[1].h) +
          shape(ptsD([[0, 40], [60, 16], [60, 40]]), cs[2].h) + shape(ptsD([[0, 40], [60, 30], [60, 40]]), cs[3].h)
        sig = ["rays:" + canon(cs.map(c => c.f).join(""))]
      }
    }
  }

  if (sig.some(s => REAL_SIGS.has(s))) return null
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='none'>${base}${charges ? `<g>${charges}</g>` : ""}</svg>`
  return { src: "data:image/svg+xml;utf8," + encodeURIComponent(svg), sig }
}

export const BOT_COUNT = 900

function generate(): Built[] {
  const out: Built[] = []
  const seen = new Set<string>()
  for (let i = 0; out.length < BOT_COUNT && i < BOT_COUNT * 4; i++) {
    const b = build("botflag2-" + i)
    if (!b || seen.has(b.src)) continue
    seen.add(b.src)
    out.push(b)
  }
  return out
}

// ── Flag Studio bots ─────────────────────────────────────────────────────────
// A second pool from Flag Studio's Random button: its layouts, stripes and
// symbols (maple leaves, laurels, wheels, crescent-and-stars), seeded so the
// pool is the same everywhere. Each one is checked against REAL_SIGS too.
export const STUDIO_BOT_COUNT = 600

function studioSig(d: Design): string[] | null {
  const f = drawnFills(d).map(familyOf).join("")
  if (f.includes("?")) return null
  // Same rule as the classic bots: no clashing neighbours (yellow on white…).
  const touching = d.base === "stripes" ? [...f].slice(1).map((c, i) => f[i] + c) : [...f].flatMap((a, i) => [...f].slice(i + 1).map(b => a + b))
  if (touching.some(p => CLASH.has(p) || p[0] === p[1] && d.base === "stripes")) return null
  if (d.base === "stripes") return ["bands:" + canon(f)]
  const kind = d.base.slice("layout:".length)
  switch (kind) {
    case "nordic": return [`nordic:${f[0]}${f[1]}`]
    case "cross": return [`cross:${f[0]}${f[1]}`]
    case "saltire": return [`saltire:${f[0]}${f[1]}`]
    case "canton": return [`canton1:${f[0]}${f[1]}`]
    case "triangle": return [`tri:${canon(f[0] + f[1])}:${f[2]}`]
    case "diagonal": return [`split:${pair(f[0], f[1])}`]
    case "quartered": return [`quart:${f[0]}${f[1]}`]
    case "disc": return [`disc:${f[0]}${f[1]}`]
    case "border": return [`border:${f[0]}${f[1]}`]
    default: return null
  }
}

// Flag Studio draws its layouts for editing: a cross is two bars, bands and
// quarters are rectangles that meet edge to edge, a diagonal split is two
// triangles along one line. In Real or Bot those seams would give a fake away,
// so each base is redrawn here under the rules above (same colours, same
// geometry, read from Flag Studio's own SVG). Symbols on top stay as they are.
// A base this doesn't recognise returns null and that flag is left out.
const attrsOf = (tag: string): Record<string, string> =>
  Object.fromEntries([...tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]))

export function cleanStudioSvg(d: Pick<Design, "base" | "stripes">, svg: string): string | null {
  const m = /^(<svg[^>]*>)(<svg[^>]*>)([\s\S]*?)<\/svg>([\s\S]*)<\/svg>$/.exec(svg)
  if (!m) return null
  const [, outer, inner, body, overlays] = m
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(inner)
  if (!vb) return null
  const w = +vb[1], h = +vb[2]
  const els = [...body.matchAll(/<(rect|polygon|circle) ([^>]*?)\/>/g)].map(x => ({ tag: x[1], a: attrsOf(x[2]) }))
  if (els.length !== (body.match(/</g) ?? []).length) return null
  const fills = els.map(e => (e.a.fill ?? "").toLowerCase()) // one colour may come in either case
  const box = (i: number) => { const a = els[i].a; return [+a.x, +a.y, +a.x + +a.width, +a.y + +a.height] as const }
  const pts = (i: number): Pt[] => els[i].a.points.trim().split(/\s+/).map(p => p.split(",").map(Number) as Pt)
  const is = (...tags: string[]) => els.length === tags.length && els.every((e, i) => e.tag === tags[i])
  const same = (a: Pt[], b: Pt[]) => a.length === b.length && a.every((p, i) => Math.abs(p[0] - b[i][0]) < 0.01 && Math.abs(p[1] - b[i][1]) < 0.01)
  const isField = (i: number) => els[i].tag === "rect" && box(i).every((v, k) => Math.abs(v - [0, 0, w, h][k]) < 0.01)
  const kind = d.base === "stripes" ? "stripes" : d.base.startsWith("layout:") ? d.base.slice(7) : ""
  let out: string
  switch (kind) {
    case "stripes": {
      if (!els.length || !els.every(e => e.tag === "rect")) return null
      const dir = d.stripes?.dir === "v" ? "v" : "h"
      const at = els.map((_, i) => box(i)[dir === "h" ? 1 : 0])
      out = bands(dir, fills, [...at, dir === "h" ? h : w], w, h, false)
      break
    }
    case "nordic": case "cross": {
      if (!is("rect", "rect", "rect") || !isField(0) || fills[1] !== fills[2]) return null
      const [x0, , x1] = box(1), [, y0, , y1] = box(2)
      out = field(fills[0], w, h) + shape(crossD(x0, x1, y0, y1, 0, 0, w, h), fills[1])
      break
    }
    case "saltire": {
      if (!is("rect", "polygon", "polygon") || !isField(0) || fills[1] !== fills[2]) return null
      const p = pts(1), t = p[1]?.[0], sd = p[5]?.[1]
      if (!same(p, [[0, 0], [t, 0], [w, h - sd], [w, h], [w - t, h], [0, sd]]) ||
        !same(pts(2), [[w, 0], [w, sd], [t, h], [0, h], [0, h - sd], [w - t, 0]])) return null
      out = field(fills[0], w, h) + shape(saltireD(t, sd, w, h), fills[1])
      break
    }
    case "triangle": { // two bands and a hoist triangle
      if (!is("rect", "rect", "polygon")) return null
      out = bands("h", [fills[0], fills[1]], [0, box(1)[1], h], w, h, false) + shape(ptsD(pts(2)), fills[2])
      break
    }
    case "diagonal": { // two triangles along one diagonal: the first becomes the field
      if (!is("polygon", "polygon") || !same(pts(0), [[0, 0], [w, 0], [0, h]])) return null
      out = field(fills[0], w, h) + shape(ptsD(pts(1)), fills[1])
      break
    }
    case "quartered": {
      if (!is("rect", "rect", "rect", "rect") || fills[0] !== fills[3] || fills[1] !== fills[2]) return null
      const [a0, a1, a2, a3] = box(1), [b0, b1, b2, b3] = box(2)
      out = field(fills[0], w, h) + shape(boxD(a0, a1, a2, a3) + boxD(b0, b1, b2, b3), fills[1])
      break
    }
    case "canton": case "border": { // a field with one rectangle on it
      if (!is("rect", "rect") || !isField(0)) return null
      const [x0, y0, x1, y1] = box(1)
      out = field(fills[0], w, h) + shape(boxD(x0, y0, x1, y1), fills[1])
      break
    }
    case "disc": {
      if (!is("rect", "circle") || !isField(0)) return null
      const a = els[1].a
      out = field(fills[0], w, h) + circle(+a.cx, +a.cy, +a.r, fills[1])
      break
    }
    default: return null
  }
  return `${outer}${inner}${out}</svg>${overlays}</svg>`
}

function generateStudio(): Built[] {
  const out: Built[] = []
  const seen = new Set<string>()
  for (let i = 0; out.length < STUDIO_BOT_COUNT && i < STUDIO_BOT_COUNT * 4; i++) {
    const d = randomDesign([], seededRandom("studiobot-" + i))
    const sig = studioSig(d)
    if (!sig || sig.some(x => REAL_SIGS.has(x))) continue
    const clean = cleanStudioSvg(d, drawnSvg(d))
    if (!clean) continue
    const src = "data:image/svg+xml;utf8," + encodeURIComponent(clean)
    if (seen.has(src)) continue
    seen.add(src)
    out.push({ src, sig })
  }
  return out
}

export const BOT_ENTRIES: Built[] = [...generate(), ...generateStudio()]
export const BOT_FLAGS: string[] = BOT_ENTRIES.map(b => b.src)

// ── Real flags in rotation ───────────────────────────────────────────────────
// A coat of arms, seal, lettering or a detailed animal is a giveaway: no bot
// ever draws one, so those flags are "obviously real". They're left out.
// A second tier with a simple-but-distinctive charge (Union Jack cantons, a
// cedar, a trident-free sun face) still shows up, but rarely.
export const REAL_EXCLUDED: string[] = [
  // Europe
  "AD", "AL", "CY", "HR", "MD", "ME", "PT", "RS", "SI", "SK", "SM", "ES", "VA", "XK",
  // Americas
  "BZ", "BO", "BR", "DM", "DO", "EC", "SV", "GT", "HT", "MX", "NI", "PY",
  // Asia & Middle East
  "AF", "BT", "BN", "KH", "IR", "IQ", "KZ", "LK", "NP", "OM", "SA", "TM",
  // Africa
  "AO", "EG", "ER", "GQ", "KE", "LS", "MZ", "SZ", "UG", "ZM", "ZW",
  // Oceania
  "FJ", "KI", "PG",
]
export const REAL_RARE: string[] = ["AR", "AU", "BY", "GB", "GD", "KG", "LB", "LI", "MN", "MT", "NZ", "TJ", "TV", "UY", "VE", "VU"]
export const RARE_WEIGHT = 0.2

const EXCL = new Set(REAL_EXCLUDED), RARE = new Set(REAL_RARE)
export const REAL_POOL: { flag: FlagRecord; w: number }[] = FLAGS
  .filter(f => !EXCL.has(f.code))
  .map(f => ({ flag: f, w: RARE.has(f.code) ? RARE_WEIGHT : 1 }))
const REAL_TOTAL = REAL_POOL.reduce((s, p) => s + p.w, 0)

export function pickRealFlag(rand: () => number = Math.random): FlagRecord {
  let x = rand() * REAL_TOTAL
  for (const p of REAL_POOL) { x -= p.w; if (x < 0) return p.flag }
  return REAL_POOL[REAL_POOL.length - 1].flag
}
