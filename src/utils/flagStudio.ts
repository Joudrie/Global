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
  kind: SymbolKind | "emblem"
  emblem?: string // emblem code when kind is "emblem"
  x: number     // centre, in flag units (the flag is always 1000 wide)
  y: number
  size: number  // diameter in flag units
  rot: number   // degrees
  color: string // for an emblem, "" keeps its own colours
}

export interface PartColor { f?: string; s?: string } // fill / stroke override

export interface Design {
  id: string
  name: string
  base: string // "flag:<code>" or "layout:<id>"
  ratio?: number // width / height; unset keeps the template's own shape
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

export const LAYOUTS: { id: string; name: string; body: (h: number) => string }[] = [
  { id: "plain", name: "Plain field", body: h => rect(0, 0, LW, h, B) },
  { id: "bicolour", name: "Bicolour", body: h => rect(0, 0, LW, h / 2, Wt) + rect(0, h / 2, LW, h / 2, R) },
  { id: "tricolour-h", name: "Horizontal tricolour", body: h => rect(0, 0, LW, h / 3, R) + rect(0, h / 3, LW, h / 3, Wt) + rect(0, 2 * h / 3, LW, h / 3, G) },
  { id: "tricolour-v", name: "Vertical tricolour", body: h => rect(0, 0, 300, h, B) + rect(300, 0, 300, h, Wt) + rect(600, 0, 300, h, R) },
  { id: "nordic", name: "Nordic cross", body: h => rect(0, 0, LW, h, B) + rect(h * 5 / 12, 0, h / 6, h, Y) + rect(0, h * 5 / 12, LW, h / 6, Y) },
  { id: "cross", name: "Centred cross", body: h => rect(0, 0, LW, h, Wt) + rect(LW / 2 - h / 10, 0, h / 5, h, R) + rect(0, h * 2 / 5, LW, h / 5, R) },
  { id: "saltire", name: "Saltire", body: h => rect(0, 0, LW, h, B) + poly(`0,0 75,0 ${LW},${h - 50} ${LW},${h} ${LW - 75},${h} 0,50`, Wt) + poly(`${LW},0 ${LW},50 75,${h} 0,${h} 0,${h - 50} ${LW - 75},0`, Wt) },
  { id: "canton", name: "Canton", body: h => rect(0, 0, LW, h, R) + rect(0, 0, 400, h / 2, B) },
  { id: "triangle", name: "Hoist triangle", body: h => rect(0, 0, LW, h / 2, Wt) + rect(0, h / 2, LW, h / 2, R) + poly(`0,0 ${h * 0.75},${h / 2} 0,${h}`, B) },
  { id: "diagonal", name: "Diagonal split", body: h => poly(`0,0 ${LW},0 0,${h}`, G) + poly(`${LW},0 ${LW},${h} 0,${h}`, Y) },
  { id: "quartered", name: "Quartered", body: h => rect(0, 0, LW / 2, h / 2, R) + rect(LW / 2, 0, LW / 2, h / 2, Wt) + rect(0, h / 2, LW / 2, h / 2, Wt) + rect(LW / 2, h / 2, LW / 2, h / 2, R) },
  { id: "disc", name: "Disc", body: h => rect(0, 0, LW, h, Wt) + `<circle cx="${LW / 2}" cy="${h / 2}" r="${h * 0.3}" fill="${R}"/>` },
  { id: "border", name: "Bordered", body: h => rect(0, 0, LW, h, Y) + rect(h / 10, h / 10, LW - h / 5, h * 0.8, G) },
  { id: "stripes", name: "Five stripes", body: h => [0, 1, 2, 3, 4].map(i => rect(0, i * h / 5, LW, h / 5, i % 2 ? Wt : B)).join("") },
]

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
export const symbolOf = (k: SymbolKind | "emblem") => SYMBOLS.find(s => s.kind === k) ?? SYMBOLS[0]

export const overlayTransform = (o: Overlay, scaled = true) =>
  `translate(${o.x.toFixed(1)} ${o.y.toFixed(1)}) rotate(${o.rot})${scaled ? ` scale(${(o.size / 2).toFixed(2)})` : ""}`

export function overlayMarkup(o: Overlay): string {
  if (o.kind === "emblem") return `<g transform="${overlayTransform(o, false)}">${emblemInner(o)}</g>`
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
  if (!o.color) return body
  const fid = `tint-${o.id}`
  return `<filter id="${fid}" x="-5%" y="-5%" width="110%" height="110%"><feFlood flood-color="${o.color}"/><feComposite in2="SourceAlpha" operator="in"/></filter><g filter="url(#${fid})">${body}</g>`
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
export function loadBase(base: string, ratio?: number): Promise<string> {
  if (base.startsWith("layout:")) {
    const l = LAYOUTS.find(x => x.id === base.slice(7)) ?? LAYOUTS[0]
    return Promise.resolve(layoutSvg(l.body, ratio))
  }
  let p = baseCache.get(base)
  if (p) return p
  {
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
export function composeBase(text: string, parts: Record<string, PartColor>, ratio?: number): { svg: string; h: number } {
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
  // A chosen ratio stretches the artwork to fit, the way flags are resized.
  const h = Math.round(ratio ? FLAG_W / ratio : FLAG_W * vb[3] / vb[2])
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
    o: d.overlays.map(o => [o.kind, Math.round(o.x), Math.round(o.y), Math.round(o.size), Math.round(o.rot), o.color, ...(o.emblem ? [o.emblem] : [])]),
    ...(d.ratio ? { r: +d.ratio.toFixed(4) } : {}),
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
      const [kind, x, y, size, rot, color, emblem] = raw
      const isEmblem = kind === "emblem"
      if (!(SYMBOL_KINDS.has(kind as SymbolKind) || isEmblem) || ![x, y, size, rot].every(n => typeof n === "number" && isFinite(n))) return []
      if (typeof color !== "string" || !(HEX.test(color) || (isEmblem && color === ""))) return []
      if (isEmblem && !(typeof emblem === "string" && /^[a-z-]{2,10}$/.test(emblem))) return []
      return [{ id: newId(), kind, x, y, size: Math.max(4, Math.min(3000, size)), rot: ((rot % 360) + 360) % 360, color, ...(isEmblem ? { emblem } : {}) }]
    }) : []
    const name = typeof json.n === "string" && json.n.trim() ? json.n.slice(0, 60) : "Shared flag"
    const ratio = typeof json.r === "number" && json.r >= 0.5 && json.r <= 3 ? json.r : undefined
    return { id: newId(), name, base, parts, overlays, updated: Date.now(), ...(ratio ? { ratio } : {}) }
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
