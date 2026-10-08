// Flag Studio: the design model, the flag templates, the symbol shapes, and
// how a design turns into a finished SVG (for the editor, thumbnails, PNG/SVG
// export and share links).
//
// Every flag template is one of our own self-hosted SVGs (real flags use the
// Wikimedia Commons artwork at official proportions). Nothing is redrawn:
// each shape inside the file (path, rect, circle…) is a "part" numbered in
// document order, and a design stores only the colours it changed by part
// number. Blank layouts (tricolour, Nordic cross…) are generated SVGs that go
// through exactly the same path.

import { STUDIO_FLAGS } from "../data/studioFlags"

export type SymbolKind =
  | "star5" | "star6" | "star7" | "sun" | "disc" | "ring" | "crescent"
  | "cross" | "triangle" | "diamond" | "square" | "stripe" | "heart"
  | "star4" | "maple" | "shamrock" | "laurel" | "chevron" | "nordic" | "saltire" | "crescentstar" | "wheel"
  | "mountains" | "waves"
  | "shield" | "shieldround" | "shieldfrench" | "shieldcurved" | "cartouche" | "shieldborder"
  | "crown" | "muralcrown" | "scroll" | "fleur" | "tower" | "anchor" | "sword" | "pattee"

export interface Overlay {
  id: string
  kind: SymbolKind | "emblem" | "image"
  emblem?: string // emblem code when kind is "emblem"
  src?: string    // an uploaded picture (data URL) when kind is "image"
  ratio?: number  // the uploaded picture's width / height
  x: number     // centre, in flag units (the flag is always 1000 wide)
  y: number
  size: number  // diameter in flag units
  rot: number   // degrees
  color: string // for an emblem or image, "" keeps its own colours
}

export interface PartColor { f?: string; s?: string } // fill / stroke override

/** An editable striped field. Band colours live in `parts` like any other
 *  shape (band i is part i); `w` holds each band's share of the flag. */
export interface StripeSpec { dir: "h" | "v"; w: number[] }

export interface Design {
  id: string
  name: string
  base: string // "real:<code>" (official artwork), "flag:<code>" (quiz artwork), "layout:<id>" or "stripes"
  ratio?: number // width / height; unset keeps the template's own shape
  stripes?: StripeSpec // when base is "stripes"
  motto?: string
  parts: Record<string, PartColor>
  overlays: Overlay[]
  updated: number
  edited?: boolean // only edited designs are kept in My flags
}

export const FLAG_W = 1000

export const newId = () => Math.random().toString(36).slice(2, 10)

export function newDesign(base: string, name: string): Design {
  return { id: newId(), name, base, parts: {}, overlays: [], updated: Date.now() }
}

// ── Blank layouts ──────────────────────────────────────────────────────────
// Drawn 900 wide; the height follows the chosen ratio (600 for 2:3), so a
// disc stays round and a cross stays square at any shape.

const B = "#0B3D91", Wt = "#FFFFFF", R = "#C8102E", Y = "#FCD116", G = "#007A3D"
const rect = (x: number, y: number, w: number, h: number, c: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`
const poly = (pts: string, c: string) => `<polygon points="${pts}" fill="${c}"/>`
const LW = 900

export const LAYOUTS: { id: string; name: string; body: (h: number) => string; stripes?: { dir: "h" | "v"; colors: string[] } }[] = [
  { id: "plain", name: "Plain field", body: h => rect(0, 0, LW, h, B) },
  { id: "bicolour", name: "Bicolour", body: h => rect(0, 0, LW, h / 2, Wt) + rect(0, h / 2, LW, h / 2, R), stripes: { dir: "h", colors: [Wt, R] } },
  { id: "tricolour-h", name: "Horizontal tricolour", body: h => rect(0, 0, LW, h / 3, R) + rect(0, h / 3, LW, h / 3, Wt) + rect(0, 2 * h / 3, LW, h / 3, G), stripes: { dir: "h", colors: [R, Wt, G] } },
  { id: "tricolour-v", name: "Vertical tricolour", body: h => rect(0, 0, 300, h, B) + rect(300, 0, 300, h, Wt) + rect(600, 0, 300, h, R), stripes: { dir: "v", colors: [B, Wt, R] } },
  { id: "nordic", name: "Nordic cross", body: h => rect(0, 0, LW, h, B) + rect(h * 5 / 12, 0, h / 6, h, Y) + rect(0, h * 5 / 12, LW, h / 6, Y) },
  { id: "cross", name: "Centred cross", body: h => rect(0, 0, LW, h, Wt) + rect(LW / 2 - h / 10, 0, h / 5, h, R) + rect(0, h * 2 / 5, LW, h / 5, R) },
  { id: "saltire", name: "Saltire", body: h => rect(0, 0, LW, h, B) + poly(`0,0 75,0 ${LW},${h - 50} ${LW},${h} ${LW - 75},${h} 0,50`, Wt) + poly(`${LW},0 ${LW},50 75,${h} 0,${h} 0,${h - 50} ${LW - 75},0`, Wt) },
  { id: "canton", name: "Canton", body: h => rect(0, 0, LW, h, R) + rect(0, 0, 400, h / 2, B) },
  { id: "triangle", name: "Hoist triangle", body: h => rect(0, 0, LW, h / 2, Wt) + rect(0, h / 2, LW, h / 2, R) + poly(`0,0 ${h * 0.75},${h / 2} 0,${h}`, B) },
  { id: "diagonal", name: "Diagonal split", body: h => poly(`0,0 ${LW},0 0,${h}`, G) + poly(`${LW},0 ${LW},${h} 0,${h}`, Y) },
  { id: "quartered", name: "Quartered", body: h => rect(0, 0, LW / 2, h / 2, R) + rect(LW / 2, 0, LW / 2, h / 2, Wt) + rect(0, h / 2, LW / 2, h / 2, Wt) + rect(LW / 2, h / 2, LW / 2, h / 2, R) },
  { id: "disc", name: "Disc", body: h => rect(0, 0, LW, h, Wt) + `<circle cx="${LW / 2}" cy="${h / 2}" r="${h * 0.3}" fill="${R}"/>` },
  { id: "border", name: "Bordered", body: h => rect(0, 0, LW, h, Y) + rect(h / 10, h / 10, LW - h / 5, h * 0.8, G) },
  { id: "stripes", name: "Five stripes", body: h => [0, 1, 2, 3, 4].map(i => rect(0, i * h / 5, LW, h / 5, i % 2 ? Wt : B)).join(""), stripes: { dir: "h", colors: [B, Wt, B, Wt, B] } },
]

// Colours new bands start with, in order.
export const STRIPE_COLORS = [R, Wt, B, Y, G, "#000000", "#F77F00", "#75AADB", "#7A1F3D"]

export function stripesSvg(spec: StripeSpec, ratio = 1.5): string {
  const h = Math.round(LW / ratio)
  const total = spec.w.reduce((a, b) => a + b, 0) || 1
  const len = spec.dir === "h" ? h : LW
  let at = 0
  const bands = spec.w.map((w, i) => {
    const size = (w / total) * len
    const r = spec.dir === "h" ? rect(0, +at.toFixed(2), LW, +size.toFixed(2), STRIPE_COLORS[i % STRIPE_COLORS.length])
      : rect(+at.toFixed(2), 0, +size.toFixed(2), h, STRIPE_COLORS[i % STRIPE_COLORS.length])
    at += size
    return r
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LW} ${h}">${bands.join("")}</svg>`
}

/** A design whose field is editable stripes, starting from the given colours. */
export function stripesDesign(dir: "h" | "v", colors: string[], name: string): Design {
  const d = newDesign("stripes", name)
  d.stripes = { dir, w: colors.map(() => 1) }
  colors.forEach((c, i) => { if (c.toLowerCase() !== STRIPE_COLORS[i % STRIPE_COLORS.length].toLowerCase()) d.parts[i] = { f: c.toLowerCase() } })
  return d
}

export const layoutSvg = (body: (h: number) => string, ratio = 1.5) => {
  const h = Math.round(LW / ratio)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LW} ${h}">${body(h)}</svg>`
}

export const RATIOS: { label: string; value?: number }[] = [
  { label: "Original" }, { label: "1:1", value: 1 }, { label: "2:3", value: 1.5 },
  { label: "3:5", value: 5 / 3 }, { label: "1:2", value: 2 },
]

// ── Symbols ────────────────────────────────────────────────────────────────
// Unit shapes centred on 0,0 with radius 1, placed with translate/rotate/scale.

function starPath(points: number, inner: number): string {
  const pts: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points
    const r = i % 2 ? inner : 1
    pts.push(`${(r * Math.cos(a)).toFixed(4)} ${(r * Math.sin(a)).toFixed(4)}`)
  }
  return `M${pts.join("L")}Z`
}
const CIRCLE = (r: number) => `M${-r} 0A${r} ${r} 0 1 0 ${r} 0A${r} ${r} 0 1 0 ${-r} 0Z`
const f3 = (n: number) => +n.toFixed(4)
const circleAt = (cx: number, cy: number, r: number, cw = false) =>
  `M${f3(cx - r)} ${f3(cy)}A${r} ${r} 0 1 ${cw ? 1 : 0} ${f3(cx + r)} ${f3(cy)}A${r} ${r} 0 1 ${cw ? 1 : 0} ${f3(cx - r)} ${f3(cy)}Z`
function starAt(points: number, inner: number, cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points
    const rr = (i % 2 ? inner : 1) * r
    pts.push(`${f3(cx + rr * Math.cos(a))} ${f3(cy + rr * Math.sin(a))}`)
  }
  return `M${pts.join("L")}Z`
}
const polyPath = (pts: [number, number][]) => `M${pts.map(([x, y]) => `${f3(x)} ${f3(y)}`).join("L")}Z`

// A stylised maple leaf: the right half, mirrored.
const MAPLE_RIGHT: [number, number][] = [[0, -1], [0.13, -0.74], [0.28, -0.82], [0.23, -0.4], [0.44, -0.62], [0.5, -0.5], [0.74, -0.56], [0.66, -0.33], [0.8, -0.27], [0.46, 0.02], [0.53, 0.15], [0.06, 0.1], [0.06, 0.66]]
const MAPLE = polyPath([...MAPLE_RIGHT, ...MAPLE_RIGHT.slice(1).reverse().map(([x, y]) => [-x, y] as [number, number])])

// Laurel wreath: two arcs of leaves meeting at the bottom.
function laurel(): string {
  const leaf = (cx: number, cy: number, ang: number) => {
    const a = 0.16, b = 0.065, c = Math.cos(ang), s = Math.sin(ang), deg = f3(ang * 180 / Math.PI)
    return `M${f3(cx + a * c)} ${f3(cy + a * s)}A${a} ${b} ${deg} 1 0 ${f3(cx - a * c)} ${f3(cy - a * s)}A${a} ${b} ${deg} 1 0 ${f3(cx + a * c)} ${f3(cy + a * s)}Z`
  }
  const out: string[] = []
  for (let i = 0; i < 9; i++) {
    const t = (100 + i * 17) * Math.PI / 180 // left side, from the bottom up
    for (const side of [1, -1]) {
      const ang = side === 1 ? t : Math.PI - t
      const cx = 0.78 * Math.cos(ang), cy = 0.78 * Math.sin(ang)
      out.push(leaf(cx, cy, ang + (side === 1 ? Math.PI / 2 - 0.5 : -Math.PI / 2 + 0.5)))
    }
  }
  return out.join("")
}

// Heraldic pieces: blank shields to fill, crowns, a scroll and classic charges.
const heater = (k: number) => `M${f3(-.8 * k)} ${f3(-.95 * k)}H${f3(.8 * k)}V${f3(-.1 * k)}C${f3(.8 * k)} ${f3(.45 * k)} ${f3(.38 * k)} ${f3(.8 * k)} 0 ${f3(k)}C${f3(-.38 * k)} ${f3(.8 * k)} ${f3(-.8 * k)} ${f3(.45 * k)} ${f3(-.8 * k)} ${f3(-.1 * k)}Z`
function mural(): string {
  // A band of battlements: five merlons on a wall.
  let d = "M-.9 .55V-.15"
  const xs = [-.9, -.54, -.18, .18, .54]
  xs.forEach(x => { d += `H${f3(x)}V-.5H${f3(x + .2)}V-.15` })
  return d + "H.9V.55Z" + "M-.9 .62H.9V.8H-.9Z"
}
function pattee(): string {
  const arm: [number, number][] = [[-.1, -.12], [-.36, -1], [.36, -1], [.1, -.12]]
  return [0, 1, 2, 3].map(q => {
    const a = q * Math.PI / 2, c = Math.cos(a), s = Math.sin(a)
    return polyPath(arm.map(([x, y]) => [x * c - y * s, x * s + y * c] as [number, number]))
  }).join("") + "M-.14 -.14H.14V.14H-.14Z"
}
function waves(): string {
  // Three wavy bands, like the sea on a coat of arms.
  const band = (y: number) => {
    const top: string[] = [], bot: string[] = []
    for (let i = 0; i <= 24; i++) {
      const x = -1 + i / 12, w = Math.sin(i / 24 * Math.PI * 6) * .09
      top.push(`${f3(x)} ${f3(y + w)}`); bot.push(`${f3(x)} ${f3(y + w + .16)}`)
    }
    return `M${top.join("L")}L${bot.reverse().join("L")}Z`
  }
  return band(-.5) + band(-.08) + band(.34)
}

// A wheel with 24 spokes (12 bars through the hub) inside a ring.
function wheel(): string {
  const bars: string[] = []
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 12, c = Math.cos(a), s = Math.sin(a), w = 0.025
    bars.push(polyPath([[-0.9 * c - w * s, -0.9 * s + w * c], [0.9 * c - w * s, 0.9 * s + w * c], [0.9 * c + w * s, 0.9 * s - w * c], [-0.9 * c + w * s, -0.9 * s - w * c]]))
  }
  return circleAt(0, 0, 1) + circleAt(0, 0, 0.88, true) + bars.join("") + circleAt(0, 0, 0.16)
}

export const SYMBOLS: { kind: SymbolKind; name: string; d: string; evenOdd?: boolean; group?: "basic" | "crest" }[] = [
  { kind: "star5", name: "Star", d: starPath(5, 0.382) },
  { kind: "star6", name: "Six-point star", d: starPath(6, 0.577) },
  { kind: "star7", name: "Seven-point star", d: starPath(7, 0.45) },
  { kind: "sun", name: "Sun", d: starPath(16, 0.72) },
  { kind: "disc", name: "Disc", d: CIRCLE(1) },
  { kind: "ring", name: "Ring", d: CIRCLE(1) + CIRCLE(0.72), evenOdd: true },
  { kind: "crescent", name: "Crescent", d: "M.6893 -.7245A1 1 0 1 0 .6893 .7245A.8 .8 0 1 1 .6893 -.7245Z" },
  { kind: "cross", name: "Cross", d: "M-.2 -1H.2V-.2H1V.2H.2V1H-.2V.2H-1V-.2H-.2Z" },
  { kind: "triangle", name: "Triangle", d: "M0 -1L.866 .5L-.866 .5Z" },
  { kind: "diamond", name: "Diamond", d: "M0 -1L.7 0L0 1L-.7 0Z" },
  { kind: "square", name: "Square", d: "M-1 -1H1V1H-1Z" },
  { kind: "stripe", name: "Stripe", d: "M-1 -.12H1V.12H-1Z" },
  { kind: "heart", name: "Heart", d: "M0 .9C-1.2 0 -.7 -1 0 -.45C.7 -1 1.2 0 0 .9Z" },
  { kind: "star4", name: "Four-point star", d: starPath(4, 0.35) },
  { kind: "maple", name: "Maple leaf", d: MAPLE },
  { kind: "shamrock", name: "Shamrock", d: circleAt(0, -0.42, 0.36) + circleAt(-0.4, 0.02, 0.36) + circleAt(0.4, 0.02, 0.36) + "M-.05 .1L.05 .1L.16 .95L.06 .97Z" },
  { kind: "laurel", name: "Laurel wreath", d: laurel() },
  { kind: "crescentstar", name: "Crescent and star", d: "M.317 -.5434A.75 .75 0 1 0 .317 .5434A.6 .6 0 1 1 .317 -.5434Z" + starAt(5, 0.382, 0.52, 0, 0.3) },
  { kind: "wheel", name: "Wheel", d: wheel() },
  { kind: "chevron", name: "Chevron", d: "M-1 -1L.3 0L-1 1L-1 .62L-.2 0L-1 -.62Z" },
  { kind: "nordic", name: "Nordic cross", d: "M-1 -.1H1V.1H-1Z" + "M-.44 -.6667H-.24V.6667H-.44Z" },
  { kind: "saltire", name: "Saltire", d: "M-1 -.6667L-.86 -.6667L1 .5733L1 .6667L.86 .6667L-1 -.5733Z" + "M1 -.6667L.86 -.6667L-1 .5733L-1 .6667L-.86 .6667L1 -.5733Z" },
]
for (const s of SYMBOLS) s.group = "basic"
SYMBOLS.push(
  { kind: "mountains", name: "Mountains", d: "M-1 .6L-.42 -.45L-.12 .02L.25 -.68L1 .6Z", group: "basic" },
  { kind: "waves", name: "Waves", d: waves(), group: "basic" },
  { kind: "shield", name: "Shield", d: heater(1), group: "crest" },
  { kind: "shieldround", name: "Round shield", d: "M-.8 -.95H.8V.2A.8 .8 0 0 1 -.8 .2Z", group: "crest" },
  { kind: "shieldfrench", name: "French shield", d: "M-.8 -.95H.8V.62Q.8 .82 .58 .82H.16L0 1L-.16 .82H-.58Q-.8 .82 -.8 .62Z", group: "crest" },
  { kind: "shieldcurved", name: "Curved shield", d: "M-.8 -.82Q0 -1.05 .8 -.82V.05C.8 .55 .38 .85 0 1C-.38 .85 -.8 .55 -.8 .05Z", group: "crest" },
  { kind: "cartouche", name: "Oval", d: "M-.7 0A.7 1 0 1 0 .7 0A.7 1 0 1 0 -.7 0Z", group: "crest" },
  { kind: "shieldborder", name: "Shield border", d: heater(1) + heater(.84), evenOdd: true, group: "crest" },
  { kind: "crown", name: "Crown", d: "M-.88 .5L-.95 -.32L-.5 .06L-.25 -.58L0 -.08L.25 -.58L.5 .06L.95 -.32L.88 .5Z" + "M-.9 .58H.9V.82H-.9Z" + circleAt(-.95, -.42, .11) + circleAt(-.25, -.68, .11) + circleAt(.25, -.68, .11) + circleAt(.95, -.42, .11) + circleAt(0, -.18, .1), group: "crest" },
  { kind: "muralcrown", name: "Mural crown", d: mural(), group: "crest" },
  { kind: "scroll", name: "Scroll", d: "M-1 -.16H-.72V-.3H.72V-.16H1L.86 .06L1 .28H.72V.14H-.72V.28H-1L-.86 .06Z", group: "crest" },
  { kind: "fleur", name: "Fleur-de-lis", d: "M0 -1C.24 -.72 .26 -.36 0 -.04C-.26 -.36 -.24 -.72 0 -1Z" + "M.08 -.04C.24 -.46 .74 -.58 .86 -.22C.94 .04 .66 .2 .54 .04C.7 0 .72 -.2 .6 -.25C.44 -.3 .26 -.12 .16 .1Z" + "M-.08 -.04C-.24 -.46 -.74 -.58 -.86 -.22C-.94 .04 -.66 .2 -.54 .04C-.7 0 -.72 -.2 -.6 -.25C-.44 -.3 -.26 -.12 -.16 .1Z" + "M-.46 .06H.46V.22H-.46Z" + "M-.1 .22H.1L.2 .7C.08 .58 -.08 .58 -.2 .7Z" + "M-.2 .7C-.3 .9 -.46 .9 -.5 .78C-.38 .82 -.3 .72 -.24 .6Z" + "M.2 .7C.3 .9 .46 .9 .5 .78C.38 .82 .3 .72 .24 .6Z", group: "crest" },
  { kind: "tower", name: "Tower", d: "M-.55 1V-.45H-.72V-.88H-.44V-.68H-.14V-.88H.14V-.68H.44V-.88H.72V-.45H.55V1Z" + "M-.18 1V.56A.18 .18 0 0 1 .18 .56V1Z" + "M-.32 -.22H-.16V.04H-.32Z" + "M.16 -.22H.32V.04H.16Z", evenOdd: true, group: "crest" },
  { kind: "anchor", name: "Anchor", d: circleAt(0, -.82, .17) + circleAt(0, -.82, .08, true) + "M-.07 -.66H.07V.86H-.07Z" + "M-.44 -.52H.44V-.39H-.44Z" + "M-.78 .25A.8 .8 0 0 0 .78 .25L.64 .27A.66 .66 0 0 1 -.64 .27Z" + "M-.94 .08L-.6 .2L-.84 .44Z" + "M.94 .08L.6 .2L.84 .44Z", group: "crest" },
  { kind: "sword", name: "Sword", d: "M0 -1L.07 -.86V.44H-.07V-.86Z" + "M-.36 .44H.36V.56H-.36Z" + "M-.05 .56H.05V.86H-.05Z" + circleAt(0, .92, .08), group: "crest" },
  { kind: "pattee", name: "Cross pattée", d: pattee(), group: "crest" },
)

/** Symbols that span the whole flag start at full width. */
export const FULL_WIDTH_SYMBOLS = new Set<SymbolKind>(["stripe", "nordic", "saltire"])
export const symbolOf = (k: Overlay["kind"]) => SYMBOLS.find(s => s.kind === k) ?? SYMBOLS[0]

export const overlayTransform = (o: Overlay, scaled = true) =>
  `translate(${o.x.toFixed(1)} ${o.y.toFixed(1)}) rotate(${o.rot})${scaled ? ` scale(${(o.size / 2).toFixed(2)})` : ""}`

export function overlayMarkup(o: Overlay): string {
  if (o.kind === "emblem") return `<g transform="${overlayTransform(o, false)}">${emblemInner(o)}</g>`
  if (o.kind === "image") return `<g transform="${overlayTransform(o, false)}">${imageInner(o)}</g>`
  const s = symbolOf(o.kind)
  return `<path d="${s.d}" fill="${o.color}"${s.evenOdd ? ' fill-rule="evenodd"' : ""} transform="${overlayTransform(o)}"/>`
}

// ── Emblems ────────────────────────────────────────────────────────────────
// Cut from our own flag files by scripts/flags/emblems.mjs. Each one sits in a
// nested <svg> sized to the overlay; a tinted emblem is drawn as a one-colour
// silhouette with an SVG filter.

const emblemCache = new Map<string, Promise<string>>()
const emblemText = new Map<string, string>()

export function loadEmblem(code: string): Promise<string> {
  let p = emblemCache.get(code)
  if (p) return p
  const c = code.toLowerCase().replace(/[^a-z-]/g, "")
  p = fetch(`/emblems/${c}.svg`).then(r => {
    if (!r.ok) throw new Error(String(r.status))
    return r.text()
  }).then(t => { emblemText.set(code, t); return t })
  p.catch(() => emblemCache.delete(code))
  emblemCache.set(code, p)
  return p
}

/** Load every emblem a design uses, so it can be composed synchronously. */
export const ensureEmblems = (d: Pick<Design, "overlays">) =>
  Promise.all(d.overlays.filter(o => o.kind === "emblem" && o.emblem).map(o => loadEmblem(o.emblem!).catch(() => "")))

const emblemBox = (text: string) => {
  const m = text.match(/viewBox="([^"]+)"/)
  const vb = m ? m[1].trim().split(/[\s,]+/).map(Number) : [0, 0, 1, 1]
  return { vb, ratio: vb[2] > 0 && vb[3] > 0 ? vb[2] / vb[3] : 1 }
}

/** One emblem on its own as a transparent PNG, `width` pixels across its longer side. */
export async function emblemPng(code: string, width: number): Promise<{ blob: Blob }> {
  const text = await loadEmblem(code)
  const { ratio } = emblemBox(text)
  const w = ratio >= 1 ? width : Math.round(width * ratio)
  const h = Math.round(w / ratio)
  const svg = text.replace(/<svg([^>]*)>/, (_m, attrs: string) => `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, "")} width="${w}" height="${h}">`)
  return { blob: await svgToPng(svg, w, h, w) }
}

/** Width and height of an emblem overlay in flag units (size is its longer side). */
export function emblemSize(o: Overlay): { w: number; h: number } {
  const t = o.emblem ? emblemText.get(o.emblem) : undefined
  const r = t ? emblemBox(t).ratio : 1
  return r >= 1 ? { w: o.size, h: o.size / r } : { w: o.size * r, h: o.size }
}

/** The emblem's own SVG, positioned around 0,0 and tinted if the overlay has a colour. */
export function emblemInner(o: Overlay): string {
  const t = o.emblem ? emblemText.get(o.emblem) : undefined
  if (!t) return ""
  const { w, h } = emblemSize(o)
  const body = t.replace(/^[\s\S]*?<svg/, "<svg").replace(/<svg([^>]*)>/, (_m, attrs: string) => {
    const kept = attrs.replace(/\s(width|height|x|y|preserveAspectRatio)="[^"]*"/g, "")
    return `<svg${kept} x="${(-w / 2).toFixed(1)}" y="${(-h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}">`
  })
  return tinted(o, body)
}

// A one-colour silhouette of any artwork, for emblems and uploaded pictures.
const tinted = (o: Overlay, body: string) => {
  if (!o.color) return body
  const fid = `tint-${o.id}`
  return `<filter id="${fid}" x="-5%" y="-5%" width="110%" height="110%"><feFlood flood-color="${o.color}"/><feComposite in2="SourceAlpha" operator="in"/></filter><g filter="url(#${fid})">${body}</g>`
}

// ── Uploaded pictures ──────────────────────────────────────────────────────

/** Width and height of any overlay's artwork in flag units. */
export function overlaySize(o: Overlay): { w: number; h: number } {
  if (o.kind === "emblem") return emblemSize(o)
  if (o.kind === "image") {
    const r = o.ratio && o.ratio > 0 ? o.ratio : 1
    return r >= 1 ? { w: o.size, h: o.size / r } : { w: o.size * r, h: o.size }
  }
  return { w: o.size, h: o.size }
}

const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")

export function imageInner(o: Overlay): string {
  if (!o.src || !/^data:image\/(png|jpeg|webp|gif);base64,/.test(o.src)) return ""
  const { w, h } = overlaySize(o)
  return tinted(o, `<image href="${escAttr(o.src)}" x="${(-w / 2).toFixed(1)}" y="${(-h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" preserveAspectRatio="none"/>`)
}

/** Shrink an uploaded picture to at most `max` pixels and turn it into a
 *  data URL, so it fits in the device's storage alongside the design. */
export async function prepareUpload(file: File, max = 640): Promise<{ src: string; ratio: number }> {
  if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(file.type)) throw new Error("type")
  if (file.size > 20 * 1024 * 1024) throw new Error("size")
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error("load"))
      i.src = url
    })
    const w0 = img.naturalWidth || 512, h0 = img.naturalHeight || 512
    const encode = (limit: number) => {
      const k = Math.min(1, limit / Math.max(w0, h0))
      const c = document.createElement("canvas")
      c.width = Math.max(1, Math.round(w0 * k))
      c.height = Math.max(1, Math.round(h0 * k))
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height)
      const png = c.toDataURL("image/png")
      if (png.length < 450_000) return png
      const webp = c.toDataURL("image/webp", 0.85)
      return webp.startsWith("data:image/webp") && webp.length < png.length ? webp : png
    }
    let src = encode(max)
    if (src.length > 700_000) src = encode(Math.round(max * 0.6))
    return { src, ratio: w0 / h0 }
  } finally { URL.revokeObjectURL(url) }
}

// ── Colours ────────────────────────────────────────────────────────────────

// A palette of real flag colours: the reds, blues, greens and golds that
// national flags actually use, plus white and black.
export const FLAG_PALETTE = [
  "#C8102E", "#E4002B", "#9E1B32", "#F77F00", "#FCD116", "#FFC72C",
  "#007A3D", "#009639", "#00A3E0", "#75AADB", "#0072CE", "#0B3D91",
  "#002868", "#7A1F3D", "#5B2C83", "#8B5A2B", "#FFFFFF", "#000000",
]

/** Normalise any CSS colour the browser reports (rgb(), #abc…) to #rrggbb, or null for none/gradients. */
export function toHex(c: string | null | undefined): string | null {
  if (!c) return null
  c = c.trim().toLowerCase()
  if (!c || c === "none" || c === "transparent" || c.startsWith("url")) return null
  const m = c.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)$/)
  if (m) {
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return null
    return "#" + [m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, "0")).join("")
  }
  if (/^#[0-9a-f]{6}$/.test(c)) return c
  if (/^#[0-9a-f]{3}$/.test(c)) return "#" + c.slice(1).split("").map(x => x + x).join("")
  return null
}

// ── Loading templates ──────────────────────────────────────────────────────

const baseCache = new Map<string, Promise<string>>()

/** The raw SVG text behind a design's base. Self-hosted first, flagcdn as backup. */
export function loadBase(d: Pick<Design, "base" | "ratio" | "stripes">): Promise<string> {
  const { base, ratio } = d
  if (base === "stripes") return Promise.resolve(stripesSvg(d.stripes ?? { dir: "h", w: [1, 1, 1] }, ratio))
  if (base.startsWith("layout:")) {
    const l = LAYOUTS.find(x => x.id === base.slice(7)) ?? LAYOUTS[0]
    return Promise.resolve(layoutSvg(l.body, ratio))
  }
  let p = baseCache.get(base)
  if (p) return p
  const code = base.replace(/^(flag|real):/, "").toLowerCase().replace(/[^a-z-]/g, "")
  const get = (url: string) => fetch(url).then(r => {
    if (!r.ok) throw new Error(String(r.status))
    return r.text()
  }).then(t => { if (!t.includes("<svg")) throw new Error("not svg"); return t })
  const quizArt = () => get(`/flags/${code}.svg`).catch(() => get(`https://flagcdn.com/${code}.svg`))
  const real = base.startsWith("real:") ? STUDIO_FLAGS[code] : undefined
  p = real ? get(real[0]).catch(quizArt) : quizArt()
  p.catch(() => baseCache.delete(base))
  baseCache.set(base, p)
  return p
}

/** Bases drawn in code (layouts, stripes) need no download. */
export function baseTextSync(d: Pick<Design, "base" | "ratio" | "stripes">): string | null {
  if (d.base === "stripes") return stripesSvg(d.stripes ?? { dir: "h", w: [1, 1, 1] }, d.ratio)
  if (d.base.startsWith("layout:")) return layoutSvg((LAYOUTS.find(x => x.id === d.base.slice(7)) ?? LAYOUTS[0]).body, d.ratio)
  return null
}

/** An SVG file's own width/height, the way a browser sizes it. */
export function svgOwnRatio(text: string): number {
  const tag = text.match(/<svg[^>]*>/)?.[0] ?? ""
  const num = (a: string) => { const m = tag.match(new RegExp(`\\s${a}="([\\d.]+(?:e\\d+)?)(px)?"`)); return m ? parseFloat(m[1]) : 0 }
  const w = num("width"), h = num("height")
  if (w > 0 && h > 0) return w / h
  const vb = tag.match(/viewBox="([^"]+)"/)?.[1].trim().split(/[\s,]+/).map(Number)
  return vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0 ? vb[2] / vb[3] : 1.5
}

/** The template base for a country: official artwork when we have it. */
export const countryBase = (code: string) => (STUDIO_FLAGS[code.toLowerCase()] ? "real:" : "flag:") + code.toLowerCase()

// ── Composing ──────────────────────────────────────────────────────────────

const PART_SELECTOR = "path, rect, circle, ellipse, polygon, polyline, line, use, text"

/** Shapes a player can recolour, in document order. Shapes that only define a
 *  clip or mask are skipped: they're never painted. */
export function partElements(root: Element | Document): Element[] {
  return Array.from(root.querySelectorAll(PART_SELECTOR)).filter(el => !el.closest("clipPath, mask"))
}

/** The base flag as an SVG string sized FLAG_W wide, with every part numbered
 *  (data-p) and the design's colour changes applied. */
export function composeBase(text: string, parts: Record<string, PartColor>, ratio?: number): { svg: string; h: number } {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml")
  const root = doc.documentElement
  if (!root || root.nodeName !== "svg") return { svg: "", h: Math.round(FLAG_W * 2 / 3) }
  let vb = (root.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number)
  // Like a browser: width/height set the shape when both are given in plain
  // units (Qatar stretches a 75×18 viewBox to 1400×550), else the viewBox.
  const attrW = /^[\d.]+(e\d+)?(px)?$/.test(root.getAttribute("width") || "") ? parseFloat(root.getAttribute("width")!) : 0
  const attrH = /^[\d.]+(e\d+)?(px)?$/.test(root.getAttribute("height") || "") ? parseFloat(root.getAttribute("height")!) : 0
  if (vb.length !== 4 || vb.some(n => !isFinite(n)) || vb[2] <= 0 || vb[3] <= 0) {
    vb = [0, 0, attrW || 900, attrH || 600]
    root.setAttribute("viewBox", vb.join(" "))
  }
  const own = attrW > 0 && attrH > 0 ? attrW / attrH : vb[2] / vb[3]
  // A chosen ratio stretches the artwork to fit, the way flags are resized.
  const h = Math.round(FLAG_W / (ratio ?? own))
  root.setAttribute("width", String(FLAG_W))
  root.setAttribute("height", String(h))
  root.setAttribute("x", "0")
  root.setAttribute("y", "0")
  root.setAttribute("preserveAspectRatio", "none")
  partElements(root).forEach((el, i) => {
    el.setAttribute("data-p", String(i))
    const o = parts[i]
    if (!o) return
    let style = el.getAttribute("style") || ""
    if (o.f) style += `;fill:${o.f}`
    if (o.s) style += `;stroke:${o.s}`
    el.setAttribute("style", style.replace(/^;/, ""))
  })
  return { svg: new XMLSerializer().serializeToString(root), h }
}

/** The finished flag (base plus symbols) as one standalone SVG document. */
export function composeFull(text: string, d: Pick<Design, "parts" | "overlays" | "ratio">): { svg: string; h: number } {
  const { svg, h } = composeBase(text, d.parts, d.ratio)
  const out = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${FLAG_W} ${h}" width="${FLAG_W}" height="${h}">${svg}${d.overlays.map(overlayMarkup).join("")}</svg>`
  return { svg: out, h }
}

export const svgDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

/** Rasterise a finished SVG to a PNG blob, `width` pixels wide. */
export function svgToPng(svg: string, width: number, h: number, srcW = FLAG_W): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = Math.round(width * h / srcW)
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("no canvas")
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error("export failed"))), "image/png")
      } catch (e) { reject(e) } finally { URL.revokeObjectURL(url) }
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("export failed")) }
    img.src = url
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const fileSlug = (name: string) =>
  (name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "my-flag").slice(0, 60)

// ── Random flags ───────────────────────────────────────────────────────────
// A fresh flag that follows the design rules: one structure, two or three
// colours from different families, and sometimes one symbol.

const FAMILIES = [
  ["#C8102E", "#E4002B", "#9E1B32", "#7A1F3D"],
  ["#0B3D91", "#002868", "#0072CE", "#00A3E0", "#75AADB"],
  ["#007A3D", "#009639", "#00843D"],
  ["#FCD116", "#FFC72C", "#F77F00"],
  ["#FFFFFF"], ["#000000"],
]
// Colour family letters, the way Real or Bot compares flags with real ones.
const FAMILY_LETTER: Record<string, string> = {}
FAMILIES.forEach((f, i) => f.forEach(c => { FAMILY_LETTER[c.toLowerCase()] = "rbgywk"[i] }))
FAMILY_LETTER["#f77f00"] = "o"
export const familyOf = (hex: string) => FAMILY_LETTER[hex.toLowerCase()] ?? "?"

type Rand = () => number
const pickR = <T,>(a: T[], r: Rand) => a[Math.floor(r() * a.length)]

function randomColours(n: number, r: Rand): string[] {
  const fams = [...FAMILIES].map(f => ({ f, k: r() })).sort((a, b) => a.k - b.k).map(x => x.f).slice(0, n)
  // Most flags have a light colour; make sure one is white or gold.
  if (!fams.some(f => f[0] === "#FFFFFF" || f[0] === "#FCD116")) fams[n - 1] = r() < 0.6 ? FAMILIES[4] : FAMILIES[3]
  return fams.map(f => pickR(f, r).toLowerCase())
}

const NAME_START = ["Val", "Mor", "Kar", "Lun", "Ost", "Bel", "Dra", "Sel", "Tor", "Ar", "Cal", "Ver", "Nor", "Zan", "El", "Mar", "Quel", "Ish", "Rav", "Tal"]
const NAME_MID = ["", "", "a", "e", "o", "an", "en", "or", "ir", "el"]
const NAME_END = ["ia", "ora", "ova", "land", "stan", "eria", "ania", "is", "aro", "enia", "ica", "mark"]
const NAME_FORM = ["Republic of", "Kingdom of", "Federation of", "Free State of", "Principality of", "Commonwealth of", "United Provinces of", "Grand Duchy of", ""]

export function randomNationName(r: Rand = Math.random): string {
  const core = pickR(NAME_START, r) + pickR(NAME_MID, r) + pickR(NAME_END, r)
  const form = pickR(NAME_FORM, r)
  return form ? `${form} ${core}` : core
}

/** A fresh flag that follows the design rules: one structure, two or three
 *  colours from different families, and sometimes one symbol or emblem.
 *  Pass a seeded `r` for a repeatable flag (Real or Bot does). */
export function randomDesign(emblemCodes: string[] = [], r: Rand = Math.random): Design {
  const name = randomNationName(r)
  let d: Design
  if (r() < 0.4) {
    const n = pickR([2, 3, 3, 3, 4, 5], r)
    const cols = randomColours(n === 2 ? 2 : Math.min(3, n), r)
    const bands = Array.from({ length: n }, (_, i) => (n === 5 ? cols[i % 2] : cols[i % cols.length]))
    d = stripesDesign(r() < 0.6 ? "h" : "v", bands, name)
    if (n === 3 && r() < 0.25) d.stripes!.w = [1, 2, 1] // a wide centre band, like Spain
  } else {
    const l = pickR(LAYOUTS.filter(x => !x.stripes && x.id !== "plain"), r)
    d = newDesign(`layout:${l.id}`, name)
    // Recolour the layout's shapes, keeping its own colour pattern.
    const fills = [...l.body(600).matchAll(/fill="([^"]+)"/g)].map(m => m[1].toLowerCase())
    const distinct = [...new Set(fills)]
    const cols = randomColours(Math.min(3, Math.max(2, distinct.length)), r)
    fills.forEach((f, i) => { d.parts[i] = { f: cols[distinct.indexOf(f) % cols.length] } })
  }
  const roll = r()
  if (roll < 0.55) {
    // A symbol colour from a family the flag doesn't use yet, so it stands out.
    const used = new Set(drawnFills(d).map(familyOf))
    const color = [...FAMILIES[4], ...FAMILIES[3], ...FAMILIES[0], ...FAMILIES[5]].map(c => c.toLowerCase()).find(c => !used.has(familyOf(c))) ?? "#ffffff"
    const useEmblem = emblemCodes.length > 0 && roll < 0.12
    const kind = pickR<SymbolKind>(["star5", "star5", "sun", "crescentstar", "star7", "disc", "maple", "star6", "wheel", "laurel"], r)
    const h = FLAG_W / 1.5
    const atHoist = r() < 0.4
    d.overlays.push(useEmblem
      ? { id: newId(), kind: "emblem", emblem: pickR(emblemCodes, r), x: FLAG_W / 2, y: h / 2, size: Math.round(h * 0.55), rot: 0, color: r() < 0.5 ? "" : color }
      : { id: newId(), kind, x: atHoist ? FLAG_W / 4 : FLAG_W / 2, y: h / 2, size: Math.round(h * (atHoist ? 0.35 : 0.42)), rot: 0, color })
  }
  return d
}

/** The colours of a drawn (layout or stripes) base, part by part, after the design's changes. */
export function drawnFills(d: Pick<Design, "base" | "ratio" | "stripes" | "parts">): string[] {
  const text = baseTextSync(d) ?? ""
  return [...text.matchAll(/fill="([^"]+)"/g)].map((m, i) => (d.parts[i]?.f ?? m[1]).toLowerCase())
}

/** A finished SVG for a drawn base (layouts and stripes) without the DOM, so
 *  it also runs in Node. Symbols only: emblems need their files loaded. */
export function drawnSvg(d: Design): string {
  const text = baseTextSync(d)
  if (!text) return ""
  let i = 0
  const body = text.replace(/fill="([^"]+)"/g, (m) => { const f = d.parts[i++]?.f; return f ? `fill="${f}"` : m })
  const vb = text.match(/viewBox="0 0 (\d+) (\d+)"/)
  const w = vb ? +vb[1] : 900, hh = vb ? +vb[2] : 600
  const H = Math.round(FLAG_W * hh / w)
  const inner = body.replace(/^<svg[^>]*>/, `<svg width="${FLAG_W}" height="${H}" viewBox="0 0 ${w} ${hh}" preserveAspectRatio="none">`)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FLAG_W} ${H}" preserveAspectRatio="none">${inner}${d.overlays.filter(o => o.kind !== "emblem").map(overlayMarkup).join("")}</svg>`
}

// ── Share links ────────────────────────────────────────────────────────────
// The whole design rides in the URL (?play=flagstudio&design=…), so sharing
// needs no account and no server.

const SYMBOL_KINDS = new Set(SYMBOLS.map(s => s.kind))
const HEX = /^#[0-9a-f]{6}$/i

export function encodeDesign(d: Design): string {
  const payload = {
    n: d.name.slice(0, 60),
    b: d.base,
    p: d.parts,
    o: d.overlays.filter(o => o.kind !== "image").map(o => [o.kind, Math.round(o.x), Math.round(o.y), Math.round(o.size), Math.round(o.rot), o.color, ...(o.emblem ? [o.emblem] : [])]),
    ...(d.ratio ? { r: +d.ratio.toFixed(4) } : {}),
    ...(d.stripes ? { s: { d: d.stripes.dir, w: d.stripes.w.map(n => +n.toFixed(3)) } } : {}),
    ...(d.motto ? { m: d.motto.slice(0, 80) } : {}),
  }
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  let bin = ""
  bytes.forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/** Parse a shared design, ignoring anything malformed. Null if unusable. */
export function decodeDesign(s: string): Design | null {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"))
    const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))))
    const base = typeof json.b === "string" && (/^(flag|real|layout):[a-z0-9-]{1,24}$/.test(json.b) || json.b === "stripes") ? json.b : null
    if (!base) return null
    const parts: Record<string, PartColor> = {}
    if (json.p && typeof json.p === "object") {
      for (const [k, v] of Object.entries(json.p as Record<string, PartColor>)) {
        if (!/^\d{1,5}$/.test(k) || !v || typeof v !== "object") continue
        const pc: PartColor = {}
        if (typeof v.f === "string" && HEX.test(v.f)) pc.f = v.f
        if (typeof v.s === "string" && HEX.test(v.s)) pc.s = v.s
        if (pc.f || pc.s) parts[k] = pc
      }
    }
    const overlays: Overlay[] = Array.isArray(json.o) ? (json.o as unknown[]).slice(0, 60).flatMap(raw => {
      if (!Array.isArray(raw)) return []
      const [kind, x, y, size, rot, color, emblem] = raw
      const isEmblem = kind === "emblem"
      if (!(SYMBOL_KINDS.has(kind as SymbolKind) || isEmblem) || ![x, y, size, rot].every(n => typeof n === "number" && isFinite(n))) return []
      if (typeof color !== "string" || !(HEX.test(color) || (isEmblem && color === ""))) return []
      if (isEmblem && !(typeof emblem === "string" && /^[a-z-]{2,10}$/.test(emblem))) return []
      return [{ id: newId(), kind, x, y, size: Math.max(4, Math.min(3000, size)), rot: ((rot % 360) + 360) % 360, color, ...(isEmblem ? { emblem } : {}) }]
    }) : []
    const name = typeof json.n === "string" && json.n.trim() ? json.n.slice(0, 60) : "Shared flag"
    const ratio = typeof json.r === "number" && json.r >= 0.5 && json.r <= 3 ? json.r : undefined
    const st = json.s
    const stripes: StripeSpec | undefined = base === "stripes" && st && (st.d === "h" || st.d === "v") && Array.isArray(st.w) && st.w.length >= 2 && st.w.length <= 9 && st.w.every((n: unknown) => typeof n === "number" && n > 0 && n < 100)
      ? { dir: st.d, w: st.w } : base === "stripes" ? { dir: "h", w: [1, 1, 1] } : undefined
    const motto = typeof json.m === "string" ? json.m.slice(0, 80) : undefined
    return { id: newId(), name, base, parts, overlays, updated: Date.now(), ...(ratio ? { ratio } : {}), ...(stripes ? { stripes } : {}), ...(motto ? { motto } : {}) }
  } catch { return null }
}

// ── Saving on this device ──────────────────────────────────────────────────

const STORE_KEY = "globalio_flagstudio_v1"
const MAX_SAVED = 60

interface Store { current: Design | null; saved: Design[] }

export function loadStore(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null")
    if (s && Array.isArray(s.saved)) return { current: s.current ?? null, saved: s.saved }
  } catch { /* ignore */ }
  return { current: null, saved: [] }
}

/** False when the device's storage is full or blocked. */
export function saveStore(s: Store): boolean {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ current: s.current, saved: s.saved.slice(0, MAX_SAVED) }))
    return true
  } catch { return false /* the design still works for this visit */ }
}
