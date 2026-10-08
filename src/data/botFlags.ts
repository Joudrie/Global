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
const rect = (x: number, y: number, w: number, h: number, fill: string) =>
  `<rect x='${+x.toFixed(2)}' y='${+y.toFixed(2)}' width='${+w.toFixed(2)}' height='${+h.toFixed(2)}' fill='${fill}'/>`
const poly = (pts: string, fill: string) => `<polygon points='${pts}' fill='${fill}'/>`

// Crescent opening to the fly; the carve disc is painted in the background
// colour, so it must sit over a solid region.
function crescent(cx: number, cy: number, R: number, color: string, bg: string): string {
  return `<circle cx='${cx}' cy='${cy}' r='${R}' fill='${color}'/><circle cx='${(cx + R * 0.36).toFixed(1)}' cy='${cy}' r='${(R * 0.82).toFixed(1)}' fill='${bg}'/>`
}
function sun(cx: number, cy: number, R: number, color: string, rays = 12): string {
  let s = ""
  for (let i = 0; i < rays; i++) {
    const a = (i * 2 * Math.PI) / rays
    const tip = `${(cx + Math.cos(a) * R * 1.75).toFixed(1)},${(cy + Math.sin(a) * R * 1.75).toFixed(1)}`
    const b1 = `${(cx + Math.cos(a - 0.17) * R).toFixed(1)},${(cy + Math.sin(a - 0.17) * R).toFixed(1)}`
    const b2 = `${(cx + Math.cos(a + 0.17) * R).toFixed(1)},${(cy + Math.sin(a + 0.17) * R).toFixed(1)}`
    s += poly(`${tip} ${b1} ${b2}`, color)
  }
  return s + `<circle cx='${cx}' cy='${cy}' r='${R}' fill='${color}'/>`
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
    if (k === "d") return `<circle cx='${cx}' cy='${cy}' r='${(R * 0.8).toFixed(1)}' fill='${col(bg).h}'/>`
    if (k === "n") return crescent(cx - R * 0.2, cy, R * 0.8, c.h, bg.h) + star(cx + R * 0.55, cy, R * 0.32, c.h)
    if (k === "c") return [-1, 0, 1].map(i => star(cx + i * R * 0.95, cy, R * 0.42, c.h)).join("")
    if (k === "u") return sun(cx, cy, R * 0.5, c.h)
    if (k === "h") { const f = col(bg); return shield(cx, cy, R * 0.62, R * 0.8, f.h, light(f).h) }
    return ringStars(cx, cy, R * 0.8, 10, c.h, R * 0.17)
  }

  const W = 60, H = 40
  let inner = ""
  let sig: string[] = []
  const layout = Math.floor(r() * 35)

  switch (layout) {
    case 0: case 1: case 2: { // plain horizontal tricolour (the commonest real layout)
      const a = col(), b = col(a), c = col(b)
      inner = rect(0, 0, W, 13.34, a.h) + rect(0, 13.33, W, 13.34, b.h) + rect(0, 26.66, W, 13.34, c.h)
      sig = [bandsSig([a, b, c])]
      break
    }
    case 3: case 4: { // plain vertical tricolour
      const a = col(), b = col(a), c = col(b)
      inner = rect(0, 0, 20.01, H, a.h) + rect(20, 0, 20.01, H, b.h) + rect(40, 0, 20, H, c.h)
      sig = [bandsSig([a, b, c])]
      break
    }
    case 5: case 6: { // horizontal tricolour with an emblem in the centre band
      const a = col(), b = col(a), c = col(b)
      inner = rect(0, 0, W, 13.34, a.h) + rect(0, 13.33, W, 13.34, b.h) + rect(0, 26.66, W, 13.34, c.h) + emblem(30, 20, 5.4, b, "sssddncuh")
      sig = [bandsSig([a, b, c])]
      break
    }
    case 7: { // vertical tricolour with an emblem in the centre band
      const a = col(), b = col(a), c = col(b)
      inner = rect(0, 0, 20.01, H, a.h) + rect(20, 0, 20.01, H, b.h) + rect(40, 0, 20, H, c.h) + emblem(30, 20, 7, b)
      sig = [bandsSig([a, b, c])]
      break
    }
    case 8: { // unequal triband, 2:1:1 or 1:2:1
      const a = col(), b = col(a), c = col(b)
      const [h1, h2] = chance(0.5) ? [20, 10] : [10, 20]
      inner = rect(0, 0, W, h1 + 0.01, a.h) + rect(0, h1, W, h2 + 0.01, b.h) + rect(0, h1 + h2, W, H - h1 - h2, c.h)
      if (h2 === 20 && chance(0.5)) inner += emblem(30, 20, 7, b)
      sig = [bandsSig([a, b, c])]
      break
    }
    case 9: { // horizontal bicolour with an emblem in the upper hoist
      const a = col(), b = col(a)
      inner = rect(0, 0, W, 20.01, a.h) + rect(0, 20, W, 20, b.h) + emblem(12, 10, 6, a, "ssncu")
      sig = [bandsSig([a, b])]
      break
    }
    case 10: { // vertical bicolour, hoist third or half, emblem in the fly
      const a = col(), b = col(a)
      const x = chance(0.5) ? 20 : 30
      inner = rect(0, 0, x + 0.01, H, a.h) + rect(x, 0, W - x, H, b.h) + emblem(x + (W - x) / 2, 20, 8, b, "ssnduh")
      sig = [bandsSig([a, b])]
      break
    }
    case 11: case 12: { // three bands + hoist triangle, optional star in the triangle
      const a = col(), b = col(a), c = col(b), t = col(a, b, c)
      const depth = chance(0.5) ? 22 : 30
      inner = rect(0, 0, W, 13.34, a.h) + rect(0, 13.33, W, 13.34, b.h) + rect(0, 26.66, W, 13.34, c.h) + poly(`0,0 ${depth},20 0,40`, t.h)
      if (chance(0.6)) inner += star(depth * 0.3, 20, 4.2, light(t).h)
      sig = [`tri:${canon(a.f + b.f + c.f)}:${t.f}`]
      break
    }
    case 13: { // two bands + hoist triangle + star
      const a = col(), b = col(a), t = col(a, b)
      const depth = chance(0.5) ? 26 : 30
      inner = rect(0, 0, W, 20.01, a.h) + rect(0, 20, W, 20, b.h) + poly(`0,0 ${depth},20 0,40`, t.h)
      if (chance(0.7)) inner += emblem(depth * 0.32, 20, 4.4, t, "sssnu")
      sig = [`tri:${canon(a.f + b.f)}:${t.f}`]
      break
    }
    case 14: case 15: { // Nordic cross, sometimes fimbriated
      const f = col(), c = col(f)
      inner = rect(0, 0, W, H, f.h)
      if (chance(0.4)) { const inn = col(c, f); inner += rect(15, 0, 12, H, c.h) + rect(0, 14, W, 12, c.h) + rect(18, 0, 6, H, inn.h) + rect(0, 17, W, 6, inn.h) }
      else inner += rect(17, 0, 8, H, c.h) + rect(0, 16, W, 8, c.h)
      sig = ["nordic:" + f.f + c.f]
      break
    }
    case 16: { // centred cross, sometimes with a disc at the crossing
      const f = col(), c = col(f)
      inner = rect(0, 0, W, H, f.h) + rect(26, 0, 8, H, c.h) + rect(0, 16, W, 8, c.h)
      if (chance(0.4)) inner += `<circle cx='30' cy='20' r='7' fill='${c.h}'/>` + emblem(30, 20, 5, c, "ssd")
      sig = ["cross:" + f.f + c.f]
      break
    }
    case 17: { // plain saltire
      const f = col(), c = col(f)
      inner = rect(0, 0, W, H, f.h) + poly("0,0 7,0 60,35 60,40 53,40 0,5", c.h) + poly("60,0 60,5 7,40 0,40 0,35 53,0", c.h)
      sig = ["saltire:" + f.f + c.f]
      break
    }
    case 18: { // saltire over four coloured fields
      const tb = col(), side = col(tb), s = col(tb, side)
      inner = rect(0, 0, W, H, tb.h) + poly("0,0 30,20 0,40", side.h) + poly("60,0 30,20 60,40", side.h) +
        poly("0,0 6,0 60,36 60,40 54,40 0,4", s.h) + poly("60,0 60,4 6,40 0,40 0,36 54,0", s.h)
      if (chance(0.4)) { const dc = col(s); inner += `<circle cx='30' cy='20' r='8' fill='${s.h}'/><circle cx='30' cy='20' r='6.6' fill='${dc.h}'/>` + star(30, 20, 4, light(dc).h) }
      sig = [`saltire4:${tb.f}${side.f}${s.f}`]
      break
    }
    case 19: { // plain field + disc, centred or toward the hoist
      const f = col(), d = col(f), cx = chance(0.5) ? 27 : 30
      inner = rect(0, 0, W, H, f.h) + `<circle cx='${cx}' cy='20' r='${chance(0.5) ? 11 : 9}' fill='${d.h}'/>`
      if (chance(0.35)) inner += star(cx, 20, 5.5, col(d).h)
      sig = ["disc:" + f.f + d.f]
      break
    }
    case 20: { // plain field + large star (centre or hoist)
      const f = col(), s = light(f)
      inner = rect(0, 0, W, H, f.h) + (chance(0.6) ? star(30, 20, 11, s.h) : star(15, 12, 7, s.h))
      sig = ["star:" + f.f + s.f]
      break
    }
    case 21: case 22: { // plain field + crescent and star(s)
      const f = col(), c = light(f)
      inner = rect(0, 0, W, H, f.h)
      const mode = Math.floor(r() * 3)
      if (mode === 0) inner += crescent(25, 20, 10, c.h, f.h) + star(36, 20, 4, c.h)
      else if (mode === 1) inner += crescent(16, 13, 7, c.h, f.h) + star(24, 13, 2.8, c.h)
      else inner += crescent(24, 20, 10, c.h, f.h) + [14, 20, 26].map(y => star(34, y, 2.4, c.h)).join("")
      if (chance(0.3)) { const p = col(f); inner += rect(0, 0, 12, H, p.h); sig.push(bandsSig([p, f])) }
      sig.push("crescent:" + f.f + c.f)
      break
    }
    case 23: { // plain field + ring of stars
      const f = col(), c = light(f)
      inner = rect(0, 0, W, H, f.h) + ringStars(30, 20, 12, [8, 10, 12, 14][Math.floor(r() * 4)], c.h, 2.3)
      sig = ["ring:" + f.f + c.f]
      break
    }
    case 24: { // plain field + sun, centred or in the canton
      const f = col(), c = light(f)
      inner = rect(0, 0, W, H, f.h) + (chance(0.5) ? sun(30, 20, 6, c.h, 16) : sun(14, 11, 4, c.h, 12))
      sig = ["sun:" + f.f + c.f]
      break
    }
    case 25: { // hoist pale + two horizontal bands, optional stars in the pale
      const p = col(), a = col(p), b = col(p, a)
      const x = chance(0.5) ? 20 : 15
      inner = rect(0, 0, W, 20.01, a.h) + rect(0, 20, W, 20, b.h) + rect(0, 0, x, H, p.h)
      const sm = Math.floor(r() * 3)
      if (sm === 1) inner += star(x / 2, 20, 5, light(p).h)
      else if (sm === 2) inner += [10, 20, 30].map(y => star(x / 2, y, 3.2, light(p).h)).join("")
      sig = [`hoist:${p.f}:${canon(a.f + b.f)}`, bandsSig([a, b])]
      break
    }
    case 26: { // two triangles split by a fimbriated diagonal band
      const a = col(), b = col(a), fim = light(a, b), band = col(fim, a, b)
      inner = rect(0, 0, W, H, a.h) + poly("60,0 60,40 0,40", b.h) +
        poly("0,40 0,31 46,0 60,0 60,9 14,40", fim.h) + poly("0,40 0,36 52,0 60,0 60,4 8,40", band.h)
      if (chance(0.5)) inner += star(11, 10, 5, light(a).h)
      sig = [`diag:${pair(a.f, b.f)}:${band.f}`]
      break
    }
    case 27: { // bordered field with a central emblem
      const f = col(), b = col(f)
      inner = rect(0, 0, W, H, b.h) + rect(4, 4, 52, 32, f.h) + emblem(30, 20, 9, f, "sshuc")
      sig = [`border:${b.f}${f.f}`]
      break
    }
    case 28: { // five bands, a-b-c-b-a, wide centre
      const a = col(), b = col(a), c = col(b)
      inner = rect(0, 0, W, 7.01, a.h) + rect(0, 7, W, 5.01, b.h) + rect(0, 12, W, 16.01, c.h) + rect(0, 28, W, 5.01, b.h) + rect(0, 33, W, 7, a.h)
      if (chance(0.45)) inner += emblem(30, 20, 6.5, c)
      sig = [bandsSig([a, b, c, b, a]), bandsSig([a, c, a])]
      break
    }
    case 29: { // many stripes + canton with stars, a sun or one star
      const f = col(), s = col(f), cn = col(f, s)
      const n = [7, 9, 11, 13][Math.floor(r() * 4)]
      const h = H / n
      inner = rect(0, 0, W, H, f.h)
      for (let i = 1; i < n; i += 2) inner += rect(0, i * h, W, h + 0.01, s.h)
      const ch = h * Math.ceil(n / 2)
      inner += rect(0, 0, 26, ch, cn.h)
      const sc = light(cn), m = Math.floor(r() * 3)
      if (m === 0) for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) inner += star(26 * (k + 0.5) / 4, ch * (row + 0.5) / 3, ch * 0.1, sc.h)
      else if (m === 1) inner += sun(13, ch / 2, ch * 0.16, sc.h)
      else inner += star(13, ch / 2, ch * 0.3, sc.h)
      sig = [`canton:${pair(f.f, s.f)}:${cn.f}`]
      break
    }
    case 30: { // plain field + solid canton with a star or sun
      const f = col(), cn = col(f), sc = light(cn)
      inner = rect(0, 0, W, H, f.h) + rect(0, 0, 30, 20, cn.h) + (chance(0.5) ? star(15, 10, 6, sc.h) : sun(15, 10, 3.6, sc.h))
      sig = [`canton1:${f.f}${cn.f}`]
      break
    }
    case 31: { // quartered field with a disc or star at the centre
      const a = col(), b = col(a)
      inner = rect(0, 0, 30.01, 20.01, a.h) + rect(30, 0, 30, 20.01, b.h) + rect(0, 20, 30.01, 20, b.h) + rect(30, 20, 30, 20, a.h)
      const d = col(a, b)
      inner += `<circle cx='30' cy='20' r='8' fill='${d.h}'/>` + (chance(0.5) ? star(30, 20, 5, light(d).h) : "")
      sig = [`quart:${a.f}${b.f}`]
      break
    }
    case 32: { // chevron from the hoist over a bicolour
      const a = col(), b = col(a), ch = col(a, b)
      inner = rect(0, 0, W, 20.01, a.h) + rect(0, 20, W, 20, b.h) + poly("0,0 12,0 36,20 12,40 0,40 24,20", ch.h)
      if (chance(0.5)) inner += star(9, 20, 4, ch.h)
      sig = [`tri:${canon(a.f + b.f)}:${ch.f}`, bandsSig([a, b])]
      break
    }
    case 33: { // diagonal split into two triangles, emblem in the upper hoist
      const a = col(), b = col(a)
      inner = rect(0, 0, W, H, a.h) + poly("60,0 60,40 0,40", b.h) + emblem(15, 11, 6, a, "sscu")
      sig = [`split:${pair(a.f, b.f)}`]
      break
    }
    default: { // 34: serrated hoist band, or a canton cross, or hoist rays
      const m = Math.floor(r() * 3)
      if (m === 0) {
        const hb = col(), f = col(hb), pts: string[] = ["0,0", "16,0"]
        const teeth = [5, 7, 9][Math.floor(r() * 3)]
        for (let i = 0; i < teeth; i++) pts.push(`24,${((i + 0.5) * H / teeth).toFixed(1)}`, `16,${((i + 1) * H / teeth).toFixed(1)}`)
        pts.push("0,40")
        inner = rect(0, 0, W, H, f.h) + poly(pts.join(" "), hb.h)
        sig = [`serrated:${hb.f}${f.f}`]
      } else if (m === 1) {
        const f = col(), cn = col(f), cr = col(cn)
        inner = rect(0, 0, W, H, f.h) + rect(0, 0, 24, 18, cn.h) + rect(10, 3, 4, 12, cr.h) + rect(6, 7, 12, 4, cr.h)
        sig = [`tonga:${f.f}${cn.f}${cr.f}`]
      } else {
        const cs: C[] = [col()]
        for (let i = 1; i < 4; i++) cs.push(col(cs[i - 1]))
        inner = rect(0, 0, W, H, cs[0].h) + poly("0,40 60,0 60,40", cs[1].h) + poly("0,40 60,16 60,40", cs[2].h) + poly("0,40 60,30 60,40", cs[3].h)
        sig = ["rays:" + canon(cs.map(c => c.f).join(""))]
      }
    }
  }

  if (sig.some(s => REAL_SIGS.has(s))) return null
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 40' preserveAspectRatio='none'>${inner}</svg>`
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

function generateStudio(): Built[] {
  const out: Built[] = []
  const seen = new Set<string>()
  for (let i = 0; out.length < STUDIO_BOT_COUNT && i < STUDIO_BOT_COUNT * 4; i++) {
    const d = randomDesign([], seededRandom("studiobot-" + i))
    const sig = studioSig(d)
    if (!sig || sig.some(x => REAL_SIGS.has(x))) continue
    const src = "data:image/svg+xml;utf8," + encodeURIComponent(drawnSvg(d))
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
