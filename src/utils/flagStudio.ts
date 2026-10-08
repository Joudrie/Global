// Flag Studio: the design model, the flag templates, the symbol shapes, and
// how a design turns into a finished SVG (for the editor, thumbnails, PNG/SVG
// export and share links).
//
// Every flag template is one of our own self-hosted SVGs. Nothing is redrawn:
// each shape inside the file (path, rect, circle…) is a "part" numbered in
// document order, and a design stores only the colours it changed by part
// number. Blank layouts (tricolour, Nordic cross…) are generated SVGs that go
// through exactly the same path.

export type SymbolKind =
  | "star5" | "star6" | "star7" | "sun" | "disc" | "ring" | "crescent"
  | "cross" | "triangle" | "diamond" | "square" | "stripe" | "heart"

export interface Overlay {
  id: string
  kind: SymbolKind
  x: number     // centre, in flag units (the flag is always 1000 wide)
  y: number
  size: number  // diameter in flag units
  rot: number   // degrees
  color: string
}

export interface PartColor { f?: string; s?: string } // fill / stroke override

export interface Design {
  id: string
  name: string
  base: string // "flag:<code>" or "layout:<id>"
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
// Drawn on a 900×600 (2:3) field so they share proportions with most flags.

const B = "#0B3D91", Wt = "#FFFFFF", R = "#C8102E", Y = "#FCD116", G = "#007A3D"
const rect = (x: number, y: number, w: number, h: number, c: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`
const poly = (pts: string, c: string) => `<polygon points="${pts}" fill="${c}"/>`

export const LAYOUTS: { id: string; name: string; body: string }[] = [
  { id: "plain", name: "Plain field", body: rect(0, 0, 900, 600, B) },
  { id: "bicolour", name: "Bicolour", body: rect(0, 0, 900, 300, Wt) + rect(0, 300, 900, 300, R) },
  { id: "tricolour-h", name: "Horizontal tricolour", body: rect(0, 0, 900, 200, R) + rect(0, 200, 900, 200, Wt) + rect(0, 400, 900, 200, G) },
  { id: "tricolour-v", name: "Vertical tricolour", body: rect(0, 0, 300, 600, B) + rect(300, 0, 300, 600, Wt) + rect(600, 0, 300, 600, R) },
  { id: "nordic", name: "Nordic cross", body: rect(0, 0, 900, 600, B) + rect(250, 0, 100, 600, Y) + rect(0, 250, 900, 100, Y) },
  { id: "cross", name: "Centred cross", body: rect(0, 0, 900, 600, Wt) + rect(390, 0, 120, 600, R) + rect(0, 240, 900, 120, R) },
  { id: "saltire", name: "Saltire", body: rect(0, 0, 900, 600, B) + poly("0,0 75,0 900,550 900,600 825,600 0,50", Wt) + poly("900,0 900,50 75,600 0,600 0,550 825,0", Wt) },
  { id: "canton", name: "Canton", body: rect(0, 0, 900, 600, R) + rect(0, 0, 400, 300, B) },
  { id: "triangle", name: "Hoist triangle", body: rect(0, 0, 900, 300, Wt) + rect(0, 300, 900, 300, R) + poly("0,0 450,300 0,600", B) },
  { id: "diagonal", name: "Diagonal split", body: poly("0,0 900,0 0,600", G) + poly("900,0 900,600 0,600", Y) },
  { id: "quartered", name: "Quartered", body: rect(0, 0, 450, 300, R) + rect(450, 0, 450, 300, Wt) + rect(0, 300, 450, 300, Wt) + rect(450, 300, 450, 300, R) },
  { id: "disc", name: "Disc", body: rect(0, 0, 900, 600, Wt) + `<circle cx="450" cy="300" r="180" fill="${R}"/>` },
  { id: "border", name: "Bordered", body: rect(0, 0, 900, 600, Y) + rect(60, 60, 780, 480, G) },
  { id: "stripes", name: "Five stripes", body: [0, 1, 2, 3, 4].map(i => rect(0, i * 120, 900, 120, i % 2 ? Wt : B)).join("") },
]

export const layoutSvg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">${body}</svg>`

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

export const SYMBOLS: { kind: SymbolKind; name: string; d: string; evenOdd?: boolean }[] = [
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
]
export const symbolOf = (k: SymbolKind) => SYMBOLS.find(s => s.kind === k) ?? SYMBOLS[0]

export const overlayTransform = (o: Overlay) =>
  `translate(${o.x.toFixed(1)} ${o.y.toFixed(1)}) rotate(${o.rot}) scale(${(o.size / 2).toFixed(2)})`

export function overlayMarkup(o: Overlay): string {
  const s = symbolOf(o.kind)
  return `<path d="${s.d}" fill="${o.color}"${s.evenOdd ? ' fill-rule="evenodd"' : ""} transform="${overlayTransform(o)}"/>`
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
export function loadBase(base: string): Promise<string> {
  let p = baseCache.get(base)
  if (p) return p
  if (base.startsWith("layout:")) {
    const l = LAYOUTS.find(x => x.id === base.slice(7)) ?? LAYOUTS[0]
    p = Promise.resolve(layoutSvg(l.body))
  } else {
    const code = base.replace(/^flag:/, "").toLowerCase().replace(/[^a-z-]/g, "")
    const get = (url: string) => fetch(url).then(r => {
      if (!r.ok) throw new Error(String(r.status))
      return r.text()
    }).then(t => { if (!t.includes("<svg")) throw new Error("not svg"); return t })
    p = get(`/flags/${code}.svg`).catch(() => get(`https://flagcdn.com/${code}.svg`))
  }
  p.catch(() => baseCache.delete(base))
  baseCache.set(base, p)
  return p
}

// ── Composing ──────────────────────────────────────────────────────────────

const PART_SELECTOR = "path, rect, circle, ellipse, polygon, polyline, line, use, text"

/** Shapes a player can recolour, in document order. Shapes that only define a
 *  clip or mask are skipped: they're never painted. */
export function partElements(root: Element | Document): Element[] {
  return Array.from(root.querySelectorAll(PART_SELECTOR)).filter(el => !el.closest("clipPath, mask"))
}

/** The base flag as an SVG string sized FLAG_W wide, with every part numbered
 *  (data-p) and the design's colour changes applied. */
export function composeBase(text: string, parts: Record<string, PartColor>): { svg: string; h: number } {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml")
  const root = doc.documentElement
  if (!root || root.nodeName !== "svg") return { svg: "", h: Math.round(FLAG_W * 2 / 3) }
  let vb = (root.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number)
  if (vb.length !== 4 || vb.some(n => !isFinite(n)) || vb[2] <= 0 || vb[3] <= 0) {
    const w = parseFloat(root.getAttribute("width") || "") || 900
    const h = parseFloat(root.getAttribute("height") || "") || 600
    vb = [0, 0, w, h]
    root.setAttribute("viewBox", vb.join(" "))
  }
  const h = Math.round(FLAG_W * vb[3] / vb[2])
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
export function composeFull(text: string, d: Pick<Design, "parts" | "overlays">): { svg: string; h: number } {
  const { svg, h } = composeBase(text, d.parts)
  const out = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${FLAG_W} ${h}" width="${FLAG_W}" height="${h}">${svg}${d.overlays.map(overlayMarkup).join("")}</svg>`
  return { svg: out, h }
}

export const svgDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

/** Rasterise a finished SVG to a PNG blob, `width` pixels wide. */
export function svgToPng(svg: string, width: number, h: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = Math.round(width * h / FLAG_W)
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
    o: d.overlays.map(o => [o.kind, Math.round(o.x), Math.round(o.y), Math.round(o.size), Math.round(o.rot), o.color]),
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
    const base = typeof json.b === "string" && /^(flag|layout):[a-z0-9-]{1,24}$/.test(json.b) ? json.b : null
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
      const [kind, x, y, size, rot, color] = raw
      if (!SYMBOL_KINDS.has(kind) || ![x, y, size, rot].every(n => typeof n === "number" && isFinite(n)) || typeof color !== "string" || !HEX.test(color)) return []
      return [{ id: newId(), kind, x, y, size: Math.max(4, Math.min(3000, size)), rot: ((rot % 360) + 360) % 360, color }]
    }) : []
    const name = typeof json.n === "string" && json.n.trim() ? json.n.slice(0, 60) : "Shared flag"
    return { id: newId(), name, base, parts, overlays, updated: Date.now() }
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

export function saveStore(s: Store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ current: s.current, saved: s.saved.slice(0, MAX_SAVED) }))
  } catch { /* storage full or blocked: the design still works for this visit */ }
}
