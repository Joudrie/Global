import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react"
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react"
import { Undo2, Redo2, Shuffle, Download, Link2, Trash2, Copy, ArrowUp, ArrowDown, Search, Dices, Minus, Plus, ImagePlus } from "lucide-react"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { BackButton } from "./ui"
import FlagImage from "./FlagImage"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import {
  FLAG_W, LAYOUTS, SYMBOLS, FLAG_PALETTE, RATIOS, layoutSvg, symbolOf, overlayTransform,
  newDesign, newId, loadBase, composeBase, composeFull, svgDataUri, svgToPng, downloadBlob,
  fileSlug, encodeDesign, decodeDesign, loadStore, saveStore, toHex,
  loadEmblem, ensureEmblems, emblemInner, emblemPng, imageInner, overlaySize, prepareUpload,
  countryBase, stripesDesign, randomDesign, baseTextSync, svgOwnRatio, FULL_WIDTH_SYMBOLS, refitOverlays,
} from "../utils/flagStudio"
import { nationCard, canvasBlob } from "../utils/nationCard"
import { STUDIO_FLAGS } from "../data/studioFlags"
import { EMBLEMS } from "../data/emblems"
import type { Design, Overlay, SymbolKind } from "../utils/flagStudio"

const ACC = ACCENT.play

// A colour selection keeps the parts and symbols it was made from, so
// recolouring them (even dragging the custom picker past another flag
// colour) never loses track of which ones they are.
type Sel =
  | { k: "part"; i: number; prop: "f" | "s" }
  | { k: "color"; hex: string; f: number[]; s: number[]; ov: string[] }
  | { k: "ov"; id: string }
  | null

type Tab = "templates" | "symbols" | "emblems" | "edit" | "export" | "mine"

const REGIONS: ("All" | FlagRecord["region"])[] = ["All", "Europe", "Africa", "Asia", "Middle East", "Americas", "Oceania"]
const EXPORT_SIZES = [600, 1200, 2400, 3840]

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

const colorDistance = (a: string, b: string) => {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16)
  return Math.abs((x >> 16) - (y >> 16)) + Math.abs(((x >> 8) & 255) - ((y >> 8) & 255)) + Math.abs((x & 255) - (y & 255))
}

// A symbol's real outline in its own unit coordinates, measured once by the
// browser, so the selection box hugs a scroll or a crown instead of a square.
const symbolBoxes = new Map<string, { x: number; y: number; w: number; h: number }>()
function symbolBox(kind: string, d: string) {
  let b = symbolBoxes.get(kind)
  if (b) return b
  b = { x: -1, y: -1, w: 2, h: 2 }
  try {
    const ns = "http://www.w3.org/2000/svg"
    const svg = document.createElementNS(ns, "svg")
    svg.setAttribute("style", "position:absolute;width:0;height:0;visibility:hidden")
    const path = document.createElementNS(ns, "path")
    path.setAttribute("d", d)
    svg.appendChild(path)
    document.body.appendChild(svg)
    const bb = path.getBBox()
    svg.remove()
    if (bb.width > 0 && bb.height > 0) b = { x: bb.x, y: bb.y, w: bb.width, h: bb.height }
  } catch { /* keep the square */ }
  symbolBoxes.set(kind, b)
  return b
}

/** An overlay's box in its own (unrotated) frame, centred on its position. */
function overlayBox(o: Overlay) {
  if (o.kind === "emblem" || o.kind === "image") {
    const { w, h } = overlaySize(o)
    return { x: -w / 2, y: -h / 2, w, h }
  }
  const b = symbolBox(o.kind, symbolOf(o.kind).d), k = o.size / 2
  return { x: b.x * k, y: b.y * k, w: b.w * k, h: b.h * k }
}

// What a part really paints. A stroke-only line (the US's white stripes, the
// UK's diagonals) sets no fill, so the browser reports a default black it
// never shows. A <use> paints its target's own fill when the target sets one
// (Nepal's crimson behind its blue border, Brazil's stars), whatever the
// <use> itself inherits.
const setsFill = (el: Element) => el.hasAttribute("fill") || !!(el as SVGElement).style?.fill

/** Whether a part, or a group around it inside `host`, sets a fill. */
function fillSet(el: Element, host: Element) {
  for (let x: Element | null = el; x && x !== host; x = x.parentElement) if (setsFill(x)) return true
  return false
}

type FillMemo = Map<Element, string | null | undefined>

/** The fill a <use>'s target sets for itself (or a shape inside it does): a
 *  colour, null for none or a gradient, undefined when the <use>'s own shows. */
function targetFill(el: Element, host: Element, memo: FillMemo = new Map(), hops = 0): string | null | undefined {
  const id = (el.getAttribute("href") || el.getAttribute("xlink:href") || "").replace(/^#/, "")
  const t = id && hops < 8 ? host.querySelector(`[id="${window.CSS.escape(id)}"]`) : null
  if (!t) return undefined
  if (!memo.has(t)) memo.set(t, ownFill(t, host, memo, hops + 1))
  return memo.get(t)
}
function ownFill(t: Element, host: Element, memo: FillMemo, hops: number): string | null | undefined {
  if (setsFill(t)) return toHex(getComputedStyle(t).fill)
  if (t.tagName === "use") return targetFill(t, host, memo, hops)
  for (const c of Array.from(t.children)) {
    if (c.tagName === "clipPath" || c.tagName === "mask") continue
    const f = ownFill(c, host, memo, hops)
    if (f !== undefined) return f
  }
  return undefined
}

const SHIELDS = new Set(["shield", "shieldround", "shieldfrench", "shieldcurved", "cartouche", "shieldborder"])

function useWide() {
  const q = "(min-width: 1000px)"
  const [wide, setWide] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(q).matches)
  useEffect(() => {
    const m = window.matchMedia?.(q)
    if (!m) return
    const on = () => setWide(m.matches)
    m.addEventListener("change", on)
    return () => m.removeEventListener("change", on)
  }, [])
  return wide
}

interface Props {
  onBack: () => void
  /** A design from a share link (?design=…), opened instead of the last one. */
  initialDesign?: string | null
}

export default function FlagStudioScreen({ onBack, initialDesign }: Props) {
  const wide = useWide()
  const store = useMemo(loadStore, [])
  const shared = useMemo(() => (initialDesign ? decodeDesign(initialDesign) : null), [initialDesign])
  const [design, setDesign] = useState<Design>(() => shared ?? store.current ?? stripesDesign("v", ["#0b3d91", "#ffffff", "#c8102e"], "My flag"))
  const [saved, setSaved] = useState<Design[]>(store.saved)
  const [past, setPast] = useState<Design[]>([])
  const [future, setFuture] = useState<Design[]>([])
  const [fetched, setFetched] = useState<{ base: string; text: string } | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [sel, setSel] = useState<Sel>(null)
  const [tab, setTab] = useState<Tab>(() => (shared || store.current ? "edit" : "templates"))
  const [strip, setStrip] = useState<{ hex: string; count: number }[]>([])
  const [notice, setNotice] = useState<string | null>(shared ? "You opened a shared flag. Change anything to make it yours."
    : initialDesign ? "That flag link didn't work." : null)
  const [exportSize, setExportSize] = useState(1200)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const baseRef = useRef<HTMLDivElement>(null)
  const ovRef = useRef<SVGSVGElement>(null)
  const eff = useRef<{ f: (string | null)[]; s: (string | null)[]; group: Map<string, string> }>({ f: [], s: [], group: new Map() })
  const inGroup = (c: string | null | undefined, rep: string) => !!c && (eff.current.group.get(c) ?? c) === rep
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({})
  const [partBox, setPartBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  // sx, sy: where the pointer went down, on screen. A drag only starts once
  // it has moved a few pixels, so a tap never records an undo step.
  type Drag = (
    | { mode: "move"; id: string; dx: number; dy: number }
    | { mode: "resize"; id: string; d0: number; size0: number }
    | { mode: "rotate"; id: string }
    | { mode: "border"; i: number }
  ) & { started: boolean; sx: number; sy: number }
  const drag = useRef<Drag | null>(null)
  // Two-finger pinch on a selected symbol: resize and rotate together.
  const touches = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ id: string; d0: number; a0: number; size0: number; rot0: number } | null>(null)
  // Where the last finger went down. A tap's click arrives where the
  // browser's tap targeting moved it, often onto a small shape nearby (a star
  // instead of the US canton around it), so taps go by where the finger was.
  const lastTouch = useRef<{ x: number; y: number; t: number } | null>(null)
  const liveStarted = useRef(false)
  const liveFrom = useRef<Design | null>(null)

  // The studio is the one screen that uses the full width of a desktop window.
  useEffect(() => {
    document.documentElement.classList.add("fs-wide")
    return () => document.documentElement.classList.remove("fs-wide")
  }, [])

  // The desktop panels fill the window under the header, whatever its height.
  const rootRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const head = headRef.current, root = rootRef.current
    if (!head || !root || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => root.style.setProperty("--fs-head", `${head.offsetHeight}px`))
    ro.observe(head)
    return () => ro.disconnect()
  }, [])

  // Load the template behind the design. Layouts and stripes are drawn in
  // code, so editing them (dragging a stripe border) never waits on a fetch.
  const syncText = useMemo(() => baseTextSync(design), [design.base, design.ratio, design.stripes]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (syncText) return
    let live = true
    setLoadFailed(false)
    loadBase(design).then(t => { if (live) setFetched({ base: design.base, text: t }) }).catch(() => { if (live) setLoadFailed(true) })
    return () => { live = false }
  }, [design.base, syncText]) // eslint-disable-line react-hooks/exhaustive-deps
  const baseText = syncText ?? (fetched?.base === design.base ? fetched.text : null)

  const composed = useMemo(() => (baseText ? composeBase(baseText, design.parts, design.ratio) : null), [baseText, design.parts, design.ratio])
  const flagH = composed?.h ?? Math.round(FLAG_W * 2 / 3)
  // React 19 re-sets innerHTML whenever the {__html} object is new, which
  // rebuilt the whole flag (and dropped the selection pulse) on every pointer
  // move. The markup objects only change when the markup does.
  const baseHtml = useMemo(() => (composed ? { __html: composed.svg } : undefined), [composed])

  // Emblem artwork loads on demand; re-render once it arrives.
  const [emblemTick, setEmblemTick] = useState(0)
  const emblemKey = design.overlays.map(o => o.emblem ?? "").join()
  useEffect(() => {
    let live = true
    ensureEmblems(design).then(() => { if (live) setEmblemTick(t => t + 1) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emblemKey])
  const innerCache = useRef(new Map<string, { o: Overlay; tick: number; html: { __html: string } }>())
  const innerHtml = (o: Overlay) => {
    const c = innerCache.current.get(o.id)
    if (c && c.tick === emblemTick && c.o.size === o.size && c.o.color === o.color && c.o.emblem === o.emblem && c.o.src === o.src && c.o.ratio === o.ratio) return c.html
    const html = { __html: o.kind === "emblem" ? emblemInner(o) : imageInner(o) }
    innerCache.current.set(o.id, { o, tick: emblemTick, html })
    return html
  }

  // Read back the colours the browser actually paints, so the colour strip
  // and "every part in this colour" work for any flag file. The strip is
  // ordered by how much of the flag each colour covers, so a crest's hundred
  // tiny shades never push the main stripes out of view, and near-identical
  // shades (#000000 and #010101) count as one colour. It only runs when the
  // flag or a symbol's colour changes, not while a symbol is dragged.
  const ovColours = design.overlays.map(o => o.color.toLowerCase()).filter(Boolean).join()
  useLayoutEffect(() => {
    const host = baseRef.current
    if (!host || !composed) return
    const f: (string | null)[] = []
    const s: (string | null)[] = []
    const area = new Map<string, number>()
    const add = (c: string | null, a: number) => { if (c) area.set(c, (area.get(c) ?? 0) + a) }
    const memo: FillMemo = new Map()
    host.querySelectorAll("[data-p]").forEach(el => {
      const i = Number(el.getAttribute("data-p"))
      const cs = getComputedStyle(el)
      s[i] = cs.strokeWidth && parseFloat(cs.strokeWidth) > 0 ? toHex(cs.stroke) : null
      const own = el.tagName === "use" ? targetFill(el, host, memo) : undefined
      f[i] = own !== undefined ? own
        // An outline with no fill set anywhere: the default black never shows.
        : s[i] && toHex(cs.fill) === "#000000" && !fillSet(el, host) ? null
          : toHex(cs.fill)
      const r = el.getBoundingClientRect()
      const a = r.width * r.height
      add(f[i], a)
      add(s[i], a * 0.3)
    })
    for (const c of ovColours ? ovColours.split(",") : []) add(c, 1)
    const ranked = [...area.entries()].filter(([, a]) => a > 0).sort((a, b) => b[1] - a[1])
    const group = new Map<string, string>()
    const reps: { hex: string; area: number }[] = []
    for (const [hex, a] of ranked) {
      const rep = reps.find(r => colorDistance(r.hex, hex) <= 24)
      if (rep) { rep.area += a; group.set(hex, rep.hex) } else { reps.push({ hex, area: a }); group.set(hex, hex) }
    }
    eff.current = { f, s, group }
    const next = reps.slice(0, 10).map(r => ({ hex: r.hex, count: Math.round(r.area) }))
    setStrip(prev => (prev.map(x => x.hex + x.count).join() === next.map(x => x.hex + x.count).join() ? prev : next))
  }, [composed, ovColours])

  // Pulse whatever is selected on the flag itself.
  useLayoutEffect(() => {
    const host = baseRef.current
    if (!host) return
    host.querySelectorAll(".fs-sel").forEach(el => el.classList.remove("fs-sel"))
    let box: { x: number; y: number; w: number; h: number } | null = null
    if (sel?.k === "part") {
      const el = host.querySelector(`[data-p="${sel.i}"]`)
      el?.classList.add("fs-sel")
      // A lasting dashed outline around the selected shape, in flag units.
      const svg = host.querySelector("svg")
      if (el && svg) {
        const a = svg.getBoundingClientRect(), b = el.getBoundingClientRect()
        const k = FLAG_W / Math.max(1, a.width)
        if (b.width > 0 && b.height > 0) box = { x: (b.left - a.left) * k, y: (b.top - a.top) * k, w: b.width * k, h: b.height * k }
      }
    }
    setPartBox(prev => (JSON.stringify(prev) === JSON.stringify(box) ? prev : box))
    if (sel?.k === "color") {
      const on = new Set([...sel.f, ...sel.s])
      host.querySelectorAll("[data-p]").forEach(el => { if (on.has(Number(el.getAttribute("data-p")))) el.classList.add("fs-sel") })
    }
  }, [composed, sel])

  // My flags: edited designs, newest first, with the current one on top.
  const library = useMemo(
    () => (design.edited ? [design, ...saved.filter(d => d.id !== design.id)] : saved),
    [design, saved],
  )

  const storageWarned = useRef(false)
  // Autosave, lightly debounced so dragging doesn't hammer storage, and
  // flushed when the page is hidden or closed or the studio is left, so the
  // last change is never lost.
  const pendingSave = useRef<(() => void) | null>(null)
  useEffect(() => {
    const save = () => {
      pendingSave.current = null
      if (!saveStore({ current: design, saved: library }) && !storageWarned.current) {
        storageWarned.current = true
        setNotice("Your device's storage is full, so changes aren't being saved. Delete a few flags in My flags, or use smaller pictures.")
      }
    }
    pendingSave.current = save
    const t = window.setTimeout(save, 250)
    return () => window.clearTimeout(t)
  }, [design, library])
  useEffect(() => {
    const flush = () => pendingSave.current?.()
    const onHide = () => { if (document.visibilityState === "hidden") flush() }
    window.addEventListener("pagehide", flush)
    document.addEventListener("visibilitychange", onHide)
    return () => {
      window.removeEventListener("pagehide", flush)
      document.removeEventListener("visibilitychange", onHide)
      flush()
    }
  }, [])

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(t)
  }, [notice])

  // ── Editing ──────────────────────────────────────────────────────────────

  const commit = useCallback((next: Design) => {
    setPast(p => [...p.slice(-99), design])
    setFuture([])
    setDesign({ ...next, edited: true, updated: Date.now() })
    setShareUrl(null)
  }, [design])

  // Continuous edits (dragging, sliders) record one undo step, not hundreds,
  // and only once something changes: tapping a slider records nothing.
  const beginLive = () => {
    if (liveStarted.current) return
    liveStarted.current = true
    liveFrom.current = design
  }
  const live = (fn: (d: Design) => Design) => {
    // Outside a gesture (a screen reader nudging a slider) each change is a step.
    const from = liveStarted.current ? liveFrom.current : design
    if (from) {
      liveFrom.current = null
      setPast(p => [...p.slice(-99), from])
      setFuture([])
      setShareUrl(null)
    }
    setDesign(d => ({ ...fn(d), edited: true, updated: Date.now() }))
  }
  const endLive = () => { liveStarted.current = false; liveFrom.current = null }

  // Naming a flag (even an untouched template) keeps it in My flags.
  const setWords = (patch: Pick<Design, "name"> | Pick<Design, "motto">) =>
    setDesign(d => ({ ...d, ...patch, edited: true, updated: Date.now() }))

  // The name and motto aren't undo steps, so undo and redo carry them along.
  const keepWords = useCallback((d: Design): Design => ({
    ...d, name: design.name, motto: design.motto,
    edited: d.edited || d.name !== design.name || (d.motto ?? "") !== (design.motto ?? ""),
  }), [design])
  const undo = useCallback(() => {
    if (!past.length) return
    setFuture(f => [design, ...f])
    setDesign(keepWords(past[past.length - 1]))
    setPast(p => p.slice(0, -1))
  }, [past, design, keepWords])
  const redo = useCallback(() => {
    if (!future.length) return
    setPast(p => [...p, design])
    setDesign(keepWords(future[0]))
    setFuture(f => f.slice(1))
  }, [future, design, keepWords])

  const switchTo = (next: Design) => {
    setSaved(library)
    setDesign(next)
    setPast([])
    setFuture([])
    setSel(null)
    setShareUrl(null)
    if (!wide) setTab("edit")
  }

  const randomize = () => switchTo(randomDesign(EMBLEMS.map(e => e.code)))

  // Dragging around the custom colour picker fires many changes a second;
  // changes to the same target close together count as one undo step.
  const lastColor = useRef<{ key: string; at: number }>({ key: "", at: 0 })
  const applyColor = (hex: string) => {
    hex = hex.toLowerCase()
    if (!sel) { setNotice("Tap part of the flag, or a colour in the strip, first."); return }
    const key = sel.k === "part" ? `p${sel.i}${sel.prop}` : sel.k === "ov" ? `o${sel.id}` : `c${sel.f.join()}|${sel.s.join()}|${sel.ov.join()}`
    const now = Date.now()
    const merge = key === lastColor.current.key && now - lastColor.current.at < 700
    lastColor.current = { key, at: now }
    const put = (next: Design) => (merge ? setDesign({ ...next, edited: true, updated: now }) : commit(next))
    if (sel.k === "part") {
      const prev = design.parts[sel.i] ?? {}
      put({ ...design, parts: { ...design.parts, [sel.i]: { ...prev, [sel.prop]: hex } } })
    } else if (sel.k === "ov") {
      put({ ...design, overlays: design.overlays.map(o => (o.id === sel.id ? { ...o, color: hex } : o)) })
    } else {
      const parts = { ...design.parts }
      for (const i of sel.f) parts[i] = { ...parts[i], f: hex }
      for (const i of sel.s) parts[i] = { ...parts[i], s: hex }
      const overlays = design.overlays.map(o => (sel.ov.includes(o.id) ? { ...o, color: hex } : o))
      put({ ...design, parts, overlays })
      setSel({ ...sel, hex })
    }
  }

  // Tapping a colour in the strip selects every part and symbol in it.
  const selectColor = (hex: string) => {
    const ids = (cs: (string | null)[]) => cs.flatMap((c, i) => (inGroup(c, hex) ? [i] : []))
    setSel({ k: "color", hex, f: ids(eff.current.f), s: ids(eff.current.s), ov: design.overlays.filter(o => inGroup(o.color.toLowerCase(), hex)).map(o => o.id) })
    if (!wide) setTab("edit")
  }

  const shuffleColors = () => {
    if (!strip.length) return
    const pool = [...FLAG_PALETTE].sort(() => Math.random() - 0.5)
    const map = new Map(strip.map((s, i) => [s.hex, pool[i % pool.length].toLowerCase()]))
    const parts = { ...design.parts }
    const pick = (c: string | null) => (c ? map.get(eff.current.group.get(c) ?? c) : undefined)
    eff.current.f.forEach((c, i) => { const n = pick(c); if (n) parts[i] = { ...parts[i], f: n } })
    eff.current.s.forEach((c, i) => { const n = pick(c); if (n) parts[i] = { ...parts[i], s: n } })
    const overlays = design.overlays.map(o => ({ ...o, color: pick(o.color.toLowerCase()) ?? o.color }))
    commit({ ...design, parts, overlays })
    setSel(null)
  }

  const addSymbol = (kind: SymbolKind) => {
    // The colour that stands out most from everything already on the flag.
    const candidates = ["#ffffff", "#fcd116", "#c8102e", "#0b3d91", "#000000", "#007a3d"]
    const color = strip.length
      ? candidates.map(c => ({ c, d: Math.min(...strip.map(x => colorDistance(c, x.hex))) })).sort((a, b) => b.d - a.d)[0].c
      : "#ffffff"
    let o: Overlay = {
      id: newId(), kind, x: FLAG_W / 2, y: flagH / 2,
      size: FULL_WIDTH_SYMBOLS.has(kind) ? FLAG_W : kind === "scroll" || kind === "waves" || kind === "mountains" ? Math.round(FLAG_W * 0.6)
        : Math.round(flagH * (kind === "square" ? 0.5 : SYMBOLS.find(x => x.kind === kind)?.group === "crest" ? 0.5 : 0.4)),
      rot: 0, color,
    }
    // Building a crest: pieces added after a shield fit around it. A crown
    // sits on top, a scroll underneath, a laurel around, a charge inside.
    const sh = [...design.overlays].reverse().find(x => SHIELDS.has(x.kind))
    if (sh && !SHIELDS.has(kind) && !FULL_WIDTH_SYMBOLS.has(kind)) {
      const sb = overlayBox(sh)
      const top = sh.y + sb.y, bottom = sh.y + sb.y + sb.h
      const contrast = (bg: string) => candidates.map(c => ({ c, d: colorDistance(c, bg) })).sort((a, b) => b.d - a.d)[0].c
      if (kind === "crown" || kind === "muralcrown") {
        const size = sb.w * 0.62
        const cb = symbolBox(kind, symbolOf(kind).d)
        o = { ...o, x: sh.x, size: Math.round(size), y: top - (cb.y + cb.h) * size / 2 + size * 0.06, color: o.color === sh.color ? contrast(sh.color) : o.color }
      } else if (kind === "scroll") {
        const size = sb.w * 1.35
        o = { ...o, x: sh.x, size: Math.round(size), y: bottom + size * 0.1 }
      } else if (kind === "laurel") {
        o = { ...o, x: sh.x, y: sh.y + sb.y + sb.h * 0.55, size: Math.round(Math.max(sb.w, sb.h) * 1.3) }
      } else {
        o = { ...o, x: sh.x, y: sh.y + sb.y + sb.h * 0.45, size: Math.round(Math.min(sb.w, sb.h) * 0.55), color: contrast(sh.color) }
      }
      o.y = Math.max(0, Math.min(flagH, o.y)) // a crown or scroll never lands off a short flag
    }
    const list = [...design.overlays]
    const at = sh && kind === "laurel" ? list.indexOf(sh) : list.length
    list.splice(at, 0, o) // a wreath goes behind the shield it wraps
    commit({ ...design, overlays: list })
    setSel({ k: "ov", id: o.id })
    if (!wide) setTab("edit")
  }

  const fileRef = useRef<HTMLInputElement>(null)
  const addImage = async (file: File | undefined) => {
    if (!file) return
    try {
      const { src, ratio } = await prepareUpload(file)
      const h = flagH * 0.5
      const o: Overlay = { id: newId(), kind: "image", src, ratio, x: FLAG_W / 2, y: flagH / 2, size: Math.round(ratio > 1 ? h * ratio : h), rot: 0, color: "" }
      commit({ ...design, overlays: [...design.overlays, o] })
      setSel({ k: "ov", id: o.id })
      if (!wide) setTab("edit")
    } catch (e) {
      setNotice((e as Error).message === "type" ? "That file isn't a picture. Try a PNG, JPG, WebP or SVG."
        : (e as Error).message === "size" ? "That picture is too big. Try one under 20 MB." : "That picture couldn't be read. Try a PNG or JPG.")
    }
  }

  const addEmblem = (code: string) => {
    const e = EMBLEMS.find(x => x.code === code)
    const h = flagH * 0.6
    const o: Overlay = {
      id: newId(), kind: "emblem", emblem: code, x: FLAG_W / 2, y: flagH / 2,
      size: Math.round(e && e.ratio > 1 ? h * e.ratio : h), rot: 0, color: "",
    }
    loadEmblem(code).catch(() => setNotice("That emblem didn't load. Check your connection and try again."))
    commit({ ...design, overlays: [...design.overlays, o] })
    setSel({ k: "ov", id: o.id })
    if (!wide) setTab("edit")
  }

  // The template's own shape, for the "Original" ratio.
  const originalRatio = useMemo(() => {
    if (design.base === "stripes" || design.base.startsWith("layout:")) return 1.5
    return baseText && !design.ratio ? svgOwnRatio(baseText) : fetched ? svgOwnRatio(fetched.text) : 1.5
  }, [baseText, fetched, design.base, design.ratio])

  const setRatio = (value?: number) => {
    if (value === design.ratio) return
    const newH = Math.round(FLAG_W / (value ?? originalRatio))
    commit({ ...design, ratio: value, overlays: refitOverlays(design.overlays, flagH, newH) })
  }

  // ── Stripes ──
  const spec = design.base === "stripes" ? design.stripes ?? { dir: "h" as const, w: [1, 1, 1] } : null
  const setStripeCount = (n: number) => {
    if (!spec || n < 2 || n > 9 || n === spec.w.length) return
    const avg = spec.w.reduce((a, b) => a + b, 0) / spec.w.length
    const w = n < spec.w.length ? spec.w.slice(0, n) : [...spec.w, ...Array(n - spec.w.length).fill(avg)]
    const parts = Object.fromEntries(Object.entries(design.parts).filter(([k]) => Number(k) < n))
    commit({ ...design, stripes: { ...spec, w }, parts })
    setSel(null)
  }
  const stripeBorders = (sp: { dir: "h" | "v"; w: number[] }) => {
    const total = sp.w.reduce((a, b) => a + b, 0)
    const len = sp.dir === "h" ? flagH : FLAG_W
    let acc = 0
    return sp.w.slice(0, -1).map(w => { acc += w; return (acc / total) * len })
  }

  const selOverlay = sel?.k === "ov" ? design.overlays.find(o => o.id === sel.id) : undefined
  const overlayName = (o: Overlay) =>
    o.kind === "emblem" ? `${EMBLEMS.find(e => e.code === o.emblem)?.name ?? "Emblem"} emblem` : o.kind === "image" ? "Your picture" : symbolOf(o.kind).name

  const updateOverlay = (id: string, patch: Partial<Overlay>) =>
    live(d => ({ ...d, overlays: d.overlays.map(o => (o.id === id ? { ...o, ...patch } : o)) }))

  const removeOverlay = useCallback((id: string) => {
    commit({ ...design, overlays: design.overlays.filter(o => o.id !== id) })
    setSel(null)
  }, [commit, design])

  const duplicateOverlay = (o: Overlay) => {
    const copy = { ...o, id: newId(), x: Math.min(FLAG_W, o.x + 40), y: Math.min(flagH, o.y + 40) }
    commit({ ...design, overlays: [...design.overlays, copy] })
    setSel({ k: "ov", id: copy.id })
  }

  const moveOverlay = (id: string, dir: 1 | -1) => {
    const list = [...design.overlays]
    const i = list.findIndex(o => o.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    commit({ ...design, overlays: list })
  }

  // ── Pointer input ────────────────────────────────────────────────────────

  /** The flag's own shape painted at a screen point, under any symbols. */
  const partAt = (x: number, y: number) => {
    const host = baseRef.current
    return host ? document.elementsFromPoint(x, y).find(el => el.hasAttribute("data-p") && host.contains(el)) ?? null : null
  }
  const selectPart = (el: Element, x: number, y: number) => {
    const host = baseRef.current
    const i = Number(el.getAttribute("data-p"))
    const f = eff.current.f[i], s = eff.current.s[i]
    let prop: "f" | "s" = f || !s ? "f" : "s"
    // A shape with a fill and an outline (the UK's white-edged red cross):
    // whichever is under the pointer, the outline being drawn on top. A <use>
    // can't recolour a fill its target sets itself (Nepal's border), so it
    // offers its outline.
    if (f && s) {
      if (el instanceof SVGGeometryElement) {
        const m = el.getScreenCTM()
        if (m && el.isPointInStroke(new DOMPoint(x, y).matrixTransform(m.inverse()))) prop = "s"
      } else if (host && el.tagName === "use" && targetFill(el, host) !== undefined) prop = "s"
    }
    setSel({ k: "part", i, prop })
    if (!wide) setTab("edit")
  }
  const onBaseClick = (e: ReactMouseEvent) => {
    const t = lastTouch.current
    const p = t && e.timeStamp - t.t < 1000 && Math.hypot(t.x - e.clientX, t.y - e.clientY) < 60 ? t : { x: e.clientX, y: e.clientY }
    const el = partAt(p.x, p.y) ?? (e.target as Element).closest?.("[data-p]")
    if (el) selectPart(el, p.x, p.y)
  }

  const svgPoint = (e: ReactPointerEvent) => {
    const svg = ovRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  // A second finger joining a pinch (see onFlagPointerDown) never starts a
  // drag or selects another symbol.
  const onOverlayDown = (e: ReactPointerEvent, o: Overlay) => {
    e.stopPropagation()
    if (pinch.current) return
    setSel({ k: "ov", id: o.id })
    const p = svgPoint(e)
    drag.current = { mode: "move", id: o.id, dx: p.x - o.x, dy: p.y - o.y, started: false, sx: e.clientX, sy: e.clientY }
    ovRef.current?.setPointerCapture(e.pointerId)
  }
  const onHandleDown = (e: ReactPointerEvent, o: Overlay, mode: "resize" | "rotate") => {
    e.stopPropagation()
    if (pinch.current) return
    const p = svgPoint(e)
    const at = { started: false, sx: e.clientX, sy: e.clientY }
    drag.current = mode === "resize"
      ? { mode, id: o.id, d0: Math.max(1, Math.hypot(p.x - o.x, p.y - o.y)), size0: o.size, ...at }
      : { mode, id: o.id, ...at }
    ovRef.current?.setPointerCapture(e.pointerId)
  }
  const onBorderDown = (e: ReactPointerEvent, i: number) => {
    e.stopPropagation()
    if (pinch.current) return
    drag.current = { mode: "border", i, started: false, sx: e.clientX, sy: e.clientY }
    ovRef.current?.setPointerCapture(e.pointerId)
  }
  const onOverlayMove = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d || pinch.current) return
    const p = svgPoint(e)
    if (!d.started) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 3) return
      d.started = true
      beginLive()
      if (d.mode === "border") setSel(null)
    }
    if (d.mode === "border") {
      if (!spec) return
      const total = spec.w.reduce((a, b) => a + b, 0)
      const len = spec.dir === "h" ? flagH : FLAG_W
      const at = (spec.dir === "h" ? p.y : p.x) / len * total
      const before = spec.w.slice(0, d.i).reduce((a, b) => a + b, 0)
      const pair = spec.w[d.i] + spec.w[d.i + 1]
      const min = total * 0.04
      const a = Math.max(min, Math.min(pair - min, at - before))
      const w = [...spec.w]
      w[d.i] = a
      w[d.i + 1] = pair - a
      live(x => ({ ...x, stripes: { ...spec, w } }))
      return
    }
    const o = design.overlays.find(x => x.id === d.id)
    if (!o) return
    if (d.mode === "resize") {
      updateOverlay(o.id, { size: Math.round(Math.max(10, Math.min(3000, d.size0 * Math.hypot(p.x - o.x, p.y - o.y) / d.d0))) })
      return
    }
    if (d.mode === "rotate") {
      let a = Math.atan2(p.y - o.y, p.x - o.x) * 180 / Math.PI + 90
      a = ((Math.round(a) % 360) + 360) % 360
      const snap = Math.round(a / 45) * 45
      if (Math.abs(a - snap) < 5) a = snap % 360 // snap to 0, 45, 90…
      updateOverlay(o.id, { rot: a })
      return
    }
    let x = Math.max(0, Math.min(FLAG_W, p.x - d.dx))
    let y = Math.max(0, Math.min(flagH, p.y - d.dy))
    // Snap to the centre lines, and to the middle of the hoist (where
    // emblems usually sit on a flag with a canton or triangle).
    const SNAP = 14
    const gx = [FLAG_W / 2, FLAG_W / 4].find(v => Math.abs(x - v) < SNAP)
    const gy = Math.abs(y - flagH / 2) < SNAP ? flagH / 2 : undefined
    if (gx !== undefined) x = gx
    if (gy !== undefined) y = gy
    setGuides({ x: gx, y: gy })
    updateOverlay(d.id, { x, y })
  }
  const onOverlayUp = (e?: ReactPointerEvent) => {
    const d = drag.current
    if (d?.started) endLive()
    // A tap on a stripe border, without dragging it, picks the stripe there.
    else if (e && d?.mode === "border") {
      const el = partAt(e.clientX, e.clientY)
      if (el) selectPart(el, e.clientX, e.clientY)
    }
    drag.current = null
    setGuides({})
  }

  // Pinch: watch every finger on the flag. With two down and a symbol
  // selected, the spread resizes it and the twist rotates it. Fingers are
  // counted on the way down (capture), before a symbol or handle under them
  // keeps the event to itself, so a pinch can start on the symbol.
  const fingerPoint = (x: number, y: number) => {
    const ctm = ovRef.current?.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const q = new DOMPoint(x, y).matrixTransform(ctm.inverse())
    return { x: q.x, y: q.y }
  }
  const onFlagPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType !== "touch") return
    lastTouch.current = { x: e.clientX, y: e.clientY, t: e.timeStamp }
    touches.current.set(e.pointerId, fingerPoint(e.clientX, e.clientY))
    const o = selOverlay
    if (touches.current.size === 2 && o) {
      const [a, b] = [...touches.current.values()]
      if (drag.current?.started) endLive()
      drag.current = null
      pinch.current = { id: o.id, d0: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)), a0: Math.atan2(b.y - a.y, b.x - a.x), size0: o.size, rot0: o.rot }
      beginLive()
    }
  }
  const onFlagPointerMove = (e: ReactPointerEvent) => {
    if (e.pointerType !== "touch" || !touches.current.has(e.pointerId)) return
    touches.current.set(e.pointerId, fingerPoint(e.clientX, e.clientY))
    const pc = pinch.current
    if (!pc || touches.current.size < 2) return
    const [a, b] = [...touches.current.values()]
    const size = Math.round(Math.max(10, Math.min(3000, pc.size0 * Math.hypot(b.x - a.x, b.y - a.y) / pc.d0)))
    const rot = ((Math.round(pc.rot0 + (Math.atan2(b.y - a.y, b.x - a.x) - pc.a0) * 180 / Math.PI) % 360) + 360) % 360
    updateOverlay(pc.id, { size, rot })
  }
  const onFlagPointerUp = (e: ReactPointerEvent) => {
    touches.current.delete(e.pointerId)
    if (pinch.current && touches.current.size < 2) { pinch.current = null; endLive() }
  }

  const nudge = useCallback((id: string, dx: number, dy: number) => {
    commit({ ...design, overlays: design.overlays.map(o => (o.id === id ? { ...o, x: Math.max(0, Math.min(FLAG_W, o.x + dx)), y: Math.max(0, Math.min(flagH, o.y + dy)) } : o)) })
  }, [commit, design, flagH])

  // Keyboard: undo/redo, delete a symbol, Escape to deselect.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      // Escape always lets go of the selection, even from a slider or a box.
      if (e.key === "Escape") { setSel(null); if (t && t.tagName === "INPUT") t.blur(); return }
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo() }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo() }
      else if ((e.key === "Delete" || e.key === "Backspace") && sel?.k === "ov") { e.preventDefault(); removeOverlay(sel.id) }
      else if (e.key.startsWith("Arrow") && sel?.k === "ov") {
        e.preventDefault()
        const step = e.shiftKey ? 25 : 5
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0
        nudge(sel.id, dx, dy)
      }
      else if (e.key === "Escape") setSel(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [undo, redo, sel, removeOverlay, nudge])

  // ── Export & share ───────────────────────────────────────────────────────

  const [busy, setBusy] = useState(false)
  const exportPng = async () => {
    if (!baseText || busy) return
    setBusy(true)
    try {
      await ensureEmblems(design) // an emblem still loading would be left out
      const { svg, h } = composeFull(baseText, design)
      downloadBlob(await svgToPng(svg, exportSize, h), `${fileSlug(design.name)}.png`)
    } catch {
      setNotice("That export didn't work. Try a smaller size, or download the SVG instead.")
    } finally { setBusy(false) }
  }
  const exportSvg = async () => {
    if (!baseText) return
    await ensureEmblems(design)
    const { svg } = composeFull(baseText, design)
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${fileSlug(design.name)}.svg`)
  }
  const share = async () => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}?play=flagstudio&design=${encodeDesign(design)}`
    setShareUrl(url)
    try {
      await navigator.clipboard.writeText(url)
      setNotice(design.overlays.some(o => o.kind === "image")
        ? "Link copied. Uploaded pictures stay on your device, so they aren't in the link."
        : "Link copied. Anyone who opens it sees your flag and can remix it.")
    } catch {
      setNotice("Copy the link below to share your flag.")
    }
  }

  // Nation card: a live preview (debounced) and a full-size download.
  const [cardPreview, setCardPreview] = useState<string | null>(null)
  const exportVisible = wide || tab === "export"
  useEffect(() => {
    if (!baseText || !exportVisible) return
    let live = true
    const t = window.setTimeout(() => {
      ensureEmblems(design).then(() => nationCard(baseText, design)).then(c => { if (live) setCardPreview(c.toDataURL("image/jpeg", 0.8)) }).catch(() => {})
    }, 500)
    return () => { live = false; window.clearTimeout(t) }
  }, [baseText, design, exportVisible])
  const downloadCard = async () => {
    if (!baseText) return
    try {
      await ensureEmblems(design)
      downloadBlob(await canvasBlob(await nationCard(baseText, design)), `${fileSlug(design.name)}-card.png`)
    } catch { setNotice("The nation card didn't download. Try again.") }
  }

  // ── Render pieces ────────────────────────────────────────────────────────

  const selectedHex =
    sel?.k === "part" ? (sel.prop === "f" ? eff.current.f[sel.i] : eff.current.s[sel.i]) ?? null
      : sel?.k === "color" ? sel.hex
        : selOverlay?.color ? selOverlay.color.toLowerCase() : null

  const header = (
    <header ref={headRef} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${T.line}`, background: T.surface, flexWrap: "wrap" }}>
      <BackButton onClick={onBack} />
      <div style={{ flex: "1 1 180px", minWidth: 0, display: "grid" }}>
        <span style={{ color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Flag Studio</span>
        <input
          id="fs-name" aria-label="Flag name" value={design.name} maxLength={60}
          onChange={e => setWords({ name: e.target.value })}
          className="fs-name"
          style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: T.text }}
        />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <IconBtn label="Undo" onClick={undo} disabled={!past.length}><Undo2 size={17} /></IconBtn>
        <IconBtn label="Redo" onClick={redo} disabled={!future.length}><Redo2 size={17} /></IconBtn>
        <IconBtn label="Random flag" onClick={randomize} text="Random"><Dices size={16} /></IconBtn>
        <IconBtn label="Shuffle colours" onClick={shuffleColors} disabled={!strip.length} text="Shuffle"><Shuffle size={16} /></IconBtn>
        {wide && <IconBtn label="Copy share link" onClick={share} text="Share"><Link2 size={16} /></IconBtn>}
      </div>
    </header>
  )

  // Flag units per screen pixel, so handles stay finger-sized at any zoom.
  const upp = FLAG_W / Math.max(200, ovRef.current?.getBoundingClientRect().width || 760)

  const stage = (
    <div className="fs-stage">
      <div className="fs-table" onClick={e => { if (e.target === e.currentTarget) setSel(null) }}>
        <div className="fs-flag" style={{ aspectRatio: `${FLAG_W} / ${flagH}`, width: `min(100%, 760px, calc(68vh * ${(FLAG_W / flagH).toFixed(4)}))`, touchAction: selOverlay ? "none" : undefined }}
          onPointerDownCapture={onFlagPointerDown} onPointerMove={onFlagPointerMove} onPointerUp={onFlagPointerUp} onPointerCancel={onFlagPointerUp}>
          {composed ? (
            <>
              <div ref={baseRef} className="fs-base" onClick={onBaseClick} dangerouslySetInnerHTML={baseHtml} />
              <svg
                ref={ovRef} className="fs-ov" viewBox={`0 0 ${FLAG_W} ${flagH}`}
                onPointerMove={onOverlayMove} onPointerUp={onOverlayUp} onPointerCancel={() => onOverlayUp()}
              >
                {/* Stripe borders: a band 28 screen pixels across to grab. */}
                {spec && stripeBorders(spec).map((pos, i) => (
                  spec.dir === "h" ? (
                    <g key={`b${i}`} className="fs-border h" onPointerDown={e => onBorderDown(e, i)}>
                      <rect x={0} y={pos - 14 * upp} width={FLAG_W} height={28 * upp} fill="rgba(0,0,0,0)" />
                      <rect className="fs-grip" x={FLAG_W - 40 * upp} y={pos - 6 * upp} width={32 * upp} height={12 * upp} rx={6 * upp} />
                    </g>
                  ) : (
                    <g key={`b${i}`} className="fs-border v" onPointerDown={e => onBorderDown(e, i)}>
                      <rect x={pos - 14 * upp} y={0} width={28 * upp} height={flagH} fill="rgba(0,0,0,0)" />
                      <rect className="fs-grip" x={pos - 6 * upp} y={flagH - 40 * upp} width={12 * upp} height={32 * upp} rx={6 * upp} />
                    </g>
                  )
                ))}
                {design.overlays.map(o => {
                  const s = symbolOf(o.kind)
                  const on = (sel?.k === "ov" && sel.id === o.id) || (sel?.k === "color" && sel.ov.includes(o.id))
                  if (o.kind === "emblem" || o.kind === "image") return (
                    <g key={o.id} data-ov={o.id} transform={overlayTransform(o, false)} className={on ? "fs-sel" : undefined}
                      onPointerDown={e => onOverlayDown(e, o)} dangerouslySetInnerHTML={innerHtml(o)} />
                  )
                  return (
                    <path key={o.id} data-ov={o.id} d={s.d} fill={o.color} fillRule={s.evenOdd ? "evenodd" : undefined}
                      transform={overlayTransform(o)} className={on ? "fs-sel" : undefined}
                      onPointerDown={e => onOverlayDown(e, o)} />
                  )
                })}
                {guides.x !== undefined && <line className="fs-guide" x1={guides.x} x2={guides.x} y1={0} y2={flagH} />}
                {guides.y !== undefined && <line className="fs-guide" x1={0} x2={FLAG_W} y1={guides.y} y2={guides.y} />}
                {partBox && sel?.k === "part" && (
                  <rect className="fs-box" x={Math.max(1, partBox.x)} y={Math.max(1, partBox.y)}
                    width={Math.min(FLAG_W - 2, partBox.w)} height={Math.min(flagH - 2, partBox.h)} />
                )}
                {selOverlay && (() => {
                  const o = selOverlay
                  const b = overlayBox(o)
                  const r = 8 * upp, hit = 18 * upp
                  const x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h, cx = b.x + b.w / 2
                  return (
                    <g transform={`translate(${o.x} ${o.y}) rotate(${o.rot})`}>
                      <rect className="fs-box" x={x0} y={y0} width={b.w} height={b.h} />
                      <line className="fs-box" x1={cx} y1={y0} x2={cx} y2={y0 - 30 * upp} />
                      <g className="fs-handle" onPointerDown={e => onHandleDown(e, o, "rotate")}>
                        <circle cx={cx} cy={y0 - 30 * upp} r={hit} fill="rgba(0,0,0,0)" />
                        <circle cx={cx} cy={y0 - 30 * upp} r={r} className="fs-knob round" />
                      </g>
                      <g className="fs-handle del" role="button" aria-label={`Delete ${overlayName(o)}`}
                        onPointerDown={e => { e.stopPropagation(); if (!pinch.current) removeOverlay(o.id) }}>
                        <circle cx={x0} cy={y0} r={hit} fill="rgba(0,0,0,0)" />
                        <circle cx={x0} cy={y0} r={r * 1.25} className="fs-del" />
                        <path d={`M${x0 - r * 0.5} ${y0 - r * 0.5}L${x0 + r * 0.5} ${y0 + r * 0.5}M${x0 + r * 0.5} ${y0 - r * 0.5}L${x0 - r * 0.5} ${y0 + r * 0.5}`} className="fs-del-x" />
                      </g>
                      <g className="fs-handle resize" onPointerDown={e => onHandleDown(e, o, "resize")}>
                        <circle cx={x1} cy={y1} r={hit} fill="rgba(0,0,0,0)" />
                        <rect x={x1 - r} y={y1 - r} width={2 * r} height={2 * r} rx={2 * upp} className="fs-knob" />
                      </g>
                    </g>
                  )
                })()}
              </svg>
            </>
          ) : (
            <div className="fs-loading">{loadFailed ? "This flag didn't load. Check your connection, or pick another template." : "Loading flag…"}</div>
          )}
        </div>
      </div>
      <div className="fs-strip" aria-label="Colours in this flag">
        <span className="fs-label">In this flag</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {strip.map(c => (
            <button key={c.hex} className={`fs-chip${sel?.k === "color" && sel.hex === c.hex ? " on" : ""}`}
              title={`Every part in ${c.hex.toUpperCase()}`} aria-label={`Select every part in ${c.hex}`}
              style={{ background: c.hex }} onClick={() => selectColor(c.hex)} />
          ))}
        </div>
        <span style={{ color: T.muted, fontSize: 12 }}>Tap a colour to change it everywhere</span>
      </div>
      {notice && <div className="fs-notice" role="status">{notice}</div>}
    </div>
  )

  const editPanel = (
    <div className="fs-panel">
      <h2 className="fs-h">Colour</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 34 }}>
        {sel ? (
          <>
            <span className="fs-swatch" style={{ background: selectedHex ?? "transparent" }} />
            <div style={{ display: "grid", lineHeight: 1.3 }}>
              <b style={{ fontSize: 14, color: T.text }}>
                {sel.k === "part" ? "This shape" : sel.k === "color" ? `Every part in this colour` : selOverlay ? overlayName(selOverlay) : ""}
              </b>
              <span style={{ fontSize: 12, color: T.muted }}>{selectedHex?.toUpperCase() ?? (selOverlay?.kind === "emblem" || selOverlay?.kind === "image" ? "Its own colours" : "Pattern")}</span>
            </div>
          </>
        ) : (
          <span style={{ fontSize: 13, color: T.muted }}>Tap any part of the flag, or a colour in the strip, to change it.</span>
        )}
      </div>
      <div className="fs-palette">
        {FLAG_PALETTE.map(c => (
          <button key={c} className={`fs-chip big${selectedHex === c.toLowerCase() ? " on" : ""}`} style={{ background: c }}
            aria-label={`Colour ${c}`} title={c} onClick={() => applyColor(c)} />
        ))}
        <label className="fs-chip big fs-custom" title="Pick any colour">
          <input type="color" id="fs-custom" aria-label="Pick any colour" value={selectedHex ?? "#888888"}
            onChange={e => applyColor(e.target.value)} />
        </label>
      </div>

      {selOverlay && (
        <div style={{ display: "grid", gap: 12, borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
          <h2 className="fs-h">{overlayName(selOverlay)}</h2>
          {(selOverlay.kind === "emblem" || selOverlay.kind === "image") && selOverlay.color && (
            <button className="fs-secondary" onClick={() => commit({ ...design, overlays: design.overlays.map(o => (o.id === selOverlay.id ? { ...o, color: "" } : o)) })}>
              Back to its own colours
            </button>
          )}
          <Slider id="fs-size" label="Size" min={20} max={1200} value={Math.round(selOverlay.size)}
            onStart={beginLive} onEnd={endLive} onChange={v => updateOverlay(selOverlay.id, { size: v })} />
          <Slider id="fs-rot" label="Rotate" min={0} max={359} value={Math.round(selOverlay.rot)} suffix="°"
            onStart={beginLive} onEnd={endLive} onChange={v => updateOverlay(selOverlay.id, { rot: v })} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <IconBtn label="Duplicate" text="Duplicate" onClick={() => duplicateOverlay(selOverlay)}><Copy size={15} /></IconBtn>
            <IconBtn label="Bring forward" onClick={() => moveOverlay(selOverlay.id, 1)}><ArrowUp size={15} /></IconBtn>
            <IconBtn label="Send backward" onClick={() => moveOverlay(selOverlay.id, -1)}><ArrowDown size={15} /></IconBtn>
            <IconBtn label="Delete" text="Delete" onClick={() => removeOverlay(selOverlay.id)}><Trash2 size={15} /></IconBtn>
          </div>
          <span style={{ fontSize: 12, color: T.muted }}>
            {selOverlay.kind === "emblem" || selOverlay.kind === "image" ? "Drag it to move it. Pick a colour to make it one colour." : "Drag the symbol on the flag to move it."}
          </span>
        </div>
      )}

      {spec && (
        <div style={{ display: "grid", gap: 10, borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
          <h2 className="fs-h">Stripes</h2>
          <div className="fs-seg" role="radiogroup" aria-label="Stripe direction">
            {(["h", "v"] as const).map(dir => (
              <button key={dir} role="radio" aria-checked={spec.dir === dir} className={spec.dir === dir ? "on" : ""}
                onClick={() => spec.dir !== dir && commit({ ...design, stripes: { ...spec, dir } })}>
                {dir === "h" ? "Horizontal" : "Vertical"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IconBtn label="Fewer stripes" onClick={() => setStripeCount(spec.w.length - 1)} disabled={spec.w.length <= 2}><Minus size={16} /></IconBtn>
            <span style={{ fontSize: 14, fontWeight: 600, minWidth: 74, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{spec.w.length} stripes</span>
            <IconBtn label="More stripes" onClick={() => setStripeCount(spec.w.length + 1)} disabled={spec.w.length >= 9}><Plus size={16} /></IconBtn>
            <button className="fs-mini" style={{ marginLeft: "auto" }} disabled={spec.w.every(w => Math.abs(w - spec.w[0]) < 1e-6)}
              onClick={() => commit({ ...design, stripes: { ...spec, w: spec.w.map(() => 1) } })}>Even widths</button>
          </div>
          <span style={{ fontSize: 12, color: T.muted }}>Drag the grips on the flag's edge to make a stripe wider or narrower.</span>
        </div>
      )}

      {design.overlays.length > 0 && (
        <div style={{ display: "grid", gap: 8, borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
          <h2 className="fs-h">Layers · top first</h2>
          <div style={{ display: "grid", gap: 2 }}>
            {[...design.overlays].reverse().map(o => (
              <button key={o.id} className={`fs-layer${sel?.k === "ov" && sel.id === o.id ? " on" : ""}`} onClick={() => setSel({ k: "ov", id: o.id })}>
                <span className="fs-swatch small" style={{ background: o.color || "transparent" }} />
                <span>{overlayName(o)}</span>
              </button>
            ))}
            <div className="fs-layer base"><span className="fs-swatch small" style={{ background: strip[0]?.hex ?? "transparent" }} /><span>The flag</span></div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 8, borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
        <h2 className="fs-h">Flag shape</h2>
        <div className="fs-seg" role="radiogroup" aria-label="Flag shape">
          {RATIOS.map(r => (
            <button key={r.label} role="radio" aria-checked={design.ratio === r.value} className={design.ratio === r.value ? "on" : ""} onClick={() => setRatio(r.value)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <DesignCheck design={design} colours={strip.length} parts={eff.current.f.length} hasText={!!baseText?.includes("<text")} />
    </div>
  )

  const exportPanel = (
    <div className="fs-panel">
      <h2 className="fs-h">Download</h2>
      <div className="fs-seg" role="radiogroup" aria-label="PNG width">
        {EXPORT_SIZES.map(s => (
          <button key={s} role="radio" aria-checked={exportSize === s} className={exportSize === s ? "on" : ""} onClick={() => setExportSize(s)}>
            {s === 3840 ? "4K" : `${s}px`}
          </button>
        ))}
      </div>
      <button className="fs-primary" onClick={exportPng} disabled={!baseText || busy}>
        <Download size={17} /> {busy ? "Making PNG…" : "Download PNG"}
      </button>
      <button className="fs-secondary" onClick={exportSvg} disabled={!baseText}>Download SVG</button>
      <h2 className="fs-h" style={{ marginTop: 6 }}>Share</h2>
      <button className="fs-secondary" onClick={share}><Link2 size={16} /> Copy share link</button>
      {shareUrl && (
        <input id="fs-share" readOnly value={shareUrl} aria-label="Share link" onFocus={e => e.currentTarget.select()} className="fs-search" />
      )}
      <span style={{ fontSize: 12, color: T.muted }}>The link holds the whole design. No account needed.</span>

      <h2 className="fs-h" style={{ marginTop: 6 }}>Nation card</h2>
      <input id="fs-motto" className="fs-search" placeholder="Motto (optional)" maxLength={80} value={design.motto ?? ""}
        aria-label="Motto" onChange={e => setWords({ motto: e.target.value })} />
      {cardPreview && <img src={cardPreview} alt={`Nation card for ${design.name}`} className="fs-card-preview" />}
      <button className="fs-secondary" onClick={downloadCard} disabled={!baseText}><Download size={16} /> Download nation card</button>
      <span style={{ fontSize: 12, color: T.muted }}>Your flag, name and motto in one image, sized for posting.</span>
    </div>
  )

  const symbolGrid = (group: "basic" | "crest") => (
    <div className="fs-symbols">
      {SYMBOLS.filter(x => x.group === group).map(x => (
        <button key={x.kind} className="fs-card fs-sym" onClick={() => addSymbol(x.kind)} aria-label={`Add ${x.name}`}>
          <svg viewBox="-1.15 -1.15 2.3 2.3" aria-hidden="true"><path d={x.d} fill={T.text} fillRule={x.evenOdd ? "evenodd" : undefined} /></svg>
          <span>{x.name}</span>
        </button>
      ))}
    </div>
  )
  const symbolsPanel = (
    <div className="fs-panel">
      <h2 className="fs-h">Your own picture</h2>
      <button className="fs-secondary" onClick={() => fileRef.current?.click()}><ImagePlus size={17} /> Upload a picture</button>
      <input ref={fileRef} id="fs-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden
        onChange={e => { void addImage(e.target.files?.[0]); e.target.value = "" }} />
      <span style={{ fontSize: 12, color: T.muted }}>A logo, a drawing or a crest you made. Transparent PNGs work best. Pictures stay on your device.</span>
      <h2 className="fs-h" style={{ marginTop: 4 }}>Symbols</h2>
      {symbolGrid("basic")}
      <h2 className="fs-h" style={{ marginTop: 4 }}>Build a crest</h2>
      <span style={{ fontSize: 12, color: T.muted, marginTop: -4 }}>Start with a shield. Add a crown and it sits on top, a scroll goes underneath, a laurel goes around, and any symbol goes inside.</span>
      {symbolGrid("crest")}
      <span style={{ fontSize: 12, color: T.muted }}>Everything lands in the middle of the flag. Drag it anywhere, then resize, rotate or recolour.</span>
    </div>
  )

  const content: Record<Tab, ReactNode> = {
    templates: <TemplatesPanel onPick={switchTo} current={design.base} />,
    symbols: symbolsPanel,
    emblems: <EmblemsPanel onAdd={addEmblem} onError={setNotice} />,
    edit: editPanel,
    export: exportPanel,
    mine: <MinePanel library={library} currentId={design.id} onOpen={d => switchTo(d)} onDelete={id => setSaved(library.filter(d => d.id !== id))} />,
  }

  const leftTabs: [Tab, string][] = [["templates", "Templates"], ["symbols", "Symbols"], ["emblems", "Emblems"], ["mine", "My flags"]]
  const phoneTabs: [Tab, string][] = [["edit", "Edit"], ["templates", "Templates"], ["symbols", "Symbols"], ["emblems", "Emblems"], ["export", "Export"], ["mine", "My flags"]]
  const leftTab: Tab = leftTabs.some(([t]) => t === tab) ? tab : "templates"

  return (
    <div className="fs-root" ref={rootRef}>
      <style>{CSS}</style>
      {header}
      {wide ? (
        <div className="fs-grid">
          <aside className="fs-left">
            <TabBar tabs={leftTabs} tab={leftTab} onTab={setTab} />
            {content[leftTab]}
          </aside>
          {stage}
          <aside className="fs-right">
            {editPanel}
            {exportPanel}
          </aside>
        </div>
      ) : (
        <div>
          {stage}
          <TabBar tabs={phoneTabs} tab={tab} onTab={setTab} />
          {content[tab]}
        </div>
      )}
    </div>
  )
}

// ── Panels ─────────────────────────────────────────────────────────────────

function TemplatesPanel({ onPick, current }: { onPick: (d: Design) => void; current: string }) {
  const [q, setQ] = useState("")
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("All")
  const flags = useMemo(() => {
    const fq = fold(q.trim())
    return [...FLAGS]
      .filter(f => (region === "All" || f.region === region) && (!fq || fold(f.name).includes(fq)))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [q, region])
  const layouts = useMemo(() => LAYOUTS.map(l => ({ ...l, uri: svgDataUri(layoutSvg(l.body)) })), [])
  const showLayouts = !q.trim() && region === "All"

  return (
    <div className="fs-panel">
      <label className="fs-searchbox">
        <Search size={16} color={T.muted} aria-hidden="true" />
        <input id="fs-search" className="fs-search bare" placeholder={`Search ${FLAGS.length} flags`} value={q}
          onChange={e => setQ(e.target.value)} aria-label="Search flags" />
      </label>
      <div className="fs-chips" role="radiogroup" aria-label="Region">
        {REGIONS.map(r => (
          <button key={r} role="radio" aria-checked={region === r} className={`fs-pill${region === r ? " on" : ""}`} onClick={() => setRegion(r)}>{r}</button>
        ))}
      </div>
      {showLayouts && (
        <>
          <h2 className="fs-h">Start from a layout</h2>
          <div className="fs-tgrid">
            {layouts.map(l => (
              <button key={l.id} className={`fs-card${current === `layout:${l.id}` ? " on" : ""}`}
                onClick={() => onPick(l.stripes ? stripesDesign(l.stripes.dir, l.stripes.colors, "My flag") : newDesign(`layout:${l.id}`, "My flag"))}>
                <img src={l.uri} alt="" className="fs-thumb" />
                <span>{l.name}</span>
              </button>
            ))}
          </div>
          <h2 className="fs-h">Start from a real flag</h2>
        </>
      )}
      <div className="fs-tgrid">
        {flags.map(f => (
          <button key={f.code} className={`fs-card${current === countryBase(f.code) ? " on" : ""}`}
            onClick={() => onPick(newDesign(countryBase(f.code), `New ${f.name}`))}>
            {STUDIO_FLAGS[f.code.toLowerCase()]
              ? <img src={STUDIO_FLAGS[f.code.toLowerCase()][0]} alt="" loading="lazy" decoding="async" className="fs-thumb" />
              : <FlagImage code={f.code} alt="" className="fs-thumb" />}
            <span>{f.name}</span>
          </button>
        ))}
      </div>
      {!flags.length && <span style={{ fontSize: 13, color: T.muted }}>No flag matches "{q}". Try another name.</span>}
    </div>
  )
}

function MinePanel({ library, currentId, onOpen, onDelete }:
  { library: Design[]; currentId: string; onOpen: (d: Design) => void; onDelete: (id: string) => void }) {
  const [confirm, setConfirm] = useState<string | null>(null)
  if (!library.length) {
    return (
      <div className="fs-panel">
        <h2 className="fs-h">My flags</h2>
        <span style={{ fontSize: 13, color: T.muted }}>Every flag you change is saved on this device automatically. Your first one will show up here.</span>
      </div>
    )
  }
  return (
    <div className="fs-panel">
      <h2 className="fs-h">My flags · {library.length}</h2>
      <div className="fs-tgrid">
        {library.map(d => (
          <div key={d.id} className={`fs-card${d.id === currentId ? " on" : ""}`} style={{ cursor: "default" }}>
            <button onClick={() => onOpen(d)} className="fs-mine-open" aria-label={`Open ${d.name}`}>
              <DesignThumb design={d} />
              <span>{d.name || "Untitled"}</span>
            </button>
            {d.id === currentId ? (
              <span style={{ fontSize: 11, color: ACC, fontWeight: 600 }}>Editing now</span>
            ) : confirm === d.id ? (
              <div style={{ display: "flex", gap: 4 }}>
                <button className="fs-mini danger" onClick={() => { onDelete(d.id); setConfirm(null) }}>Delete</button>
                <button className="fs-mini" onClick={() => setConfirm(null)}>Keep</button>
              </div>
            ) : (
              <button className="fs-mini" onClick={() => setConfirm(d.id)} aria-label={`Delete ${d.name}`}><Trash2 size={12} /> Delete</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EmblemsPanel({ onAdd, onError }: { onAdd: (code: string) => void; onError: (msg: string) => void }) {
  const [q, setQ] = useState("")
  const list = useMemo(() => {
    const fq = fold(q.trim())
    return EMBLEMS.filter(e => !fq || fold(e.name).includes(fq))
  }, [q])
  const download = async (code: string) => {
    try {
      const { blob } = await emblemPng(code, 1024)
      downloadBlob(blob, `${code}-emblem.png`)
    } catch { onError("That emblem didn't download. Check your connection and try again.") }
  }
  return (
    <div className="fs-panel">
      <label className="fs-searchbox">
        <Search size={16} color={T.muted} aria-hidden="true" />
        <input id="fs-emblem-search" className="fs-search bare" placeholder={`Search ${EMBLEMS.length} emblems`} value={q}
          onChange={e => setQ(e.target.value)} aria-label="Search emblems" />
      </label>
      <div className="fs-egrid">
        {list.map(e => (
          <div key={e.code} className="fs-card fs-emb">
            <button className="fs-mine-open" onClick={() => onAdd(e.code)} aria-label={`Add the ${e.name} emblem`}>
              <img src={`/emblems/${e.code}.svg`} alt="" loading="lazy" className="fs-emb-img" />
              <span>{e.name}</span>
            </button>
            <button className="fs-mini" onClick={() => download(e.code)} aria-label={`Download the ${e.name} emblem as PNG`}>
              <Download size={12} /> PNG
            </button>
          </div>
        ))}
      </div>
      {!list.length && <span style={{ fontSize: 13, color: T.muted }}>No emblem matches "{q}".</span>}
      <span style={{ fontSize: 12, color: T.muted }}>
        Tap an emblem to put it on your flag. Emblems are cut from the flags in Globalio (flag-icons artwork, MIT licence). Real national emblems can have legal limits on use, so keep them to creative and fictional flags.
      </span>
    </div>
  )
}

// A friendly score against the classic rules of flag design. Advice, never a block.
function DesignCheck({ design, colours, parts, hasText }: { design: Design; colours: number; parts: number; hasText: boolean }) {
  const total = parts + design.overlays.length
  const detailed = hasText || design.overlays.some(o => o.kind === "emblem") || parts > 40
  const untouched = /^(flag|real):/.test(design.base) && !Object.keys(design.parts).length && !design.overlays.length && !design.ratio
  const checks = [
    total <= 14
      ? { ok: true, text: "Simple enough to draw from memory" }
      : { ok: false, warn: total <= 40, text: total <= 40 ? "Getting busy. Fewer parts read better from far away" : "Very detailed. Simple flags are easier to remember" },
    colours >= 2 && colours <= 3
      ? { ok: true, text: `${colours} colours. Two or three is the sweet spot` }
      : colours < 2
        ? { ok: false, warn: true, text: "One colour. Add a second so it stands out" }
        : { ok: false, warn: colours === 4, text: `${colours} colours. Try cutting back to three` },
    detailed
      ? { ok: false, warn: true, text: hasText ? "Lettering is hard to read on a flag in the wind" : "A detailed crest looks great up close but blurs from far away" }
      : { ok: true, text: "No lettering or seals" },
    untouched
      ? { ok: false, warn: true, text: "Still the original flag. Change something to make it yours" }
      : { ok: true, text: "Your own design" },
  ]
  const score = Math.round(checks.reduce((n, c) => n + (c.ok ? 1 : c.warn ? 0.5 : 0), 0) / checks.length * 100)
  return (
    <div className="fs-check">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 className="fs-h">Design check</h2>
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 24, color: T.text, fontVariantNumeric: "tabular-nums" }}>{score}</span>
      </div>
      <ul>
        {checks.map(c => (
          <li key={c.text}><span className="fs-dot" style={{ background: c.ok ? T.green : c.warn ? T.amber : T.danger }} />{c.text}</li>
        ))}
      </ul>
      <span style={{ fontSize: 12, color: T.muted }}>Bonus rule: give every colour and symbol a meaning.</span>
    </div>
  )
}

function DesignThumb({ design }: { design: Design }) {
  const [uri, setUri] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    Promise.all([loadBase(design), ensureEmblems(design)])
      .then(([t]) => { if (live) setUri(svgDataUri(composeFull(t, design).svg)) }).catch(() => {})
    return () => { live = false }
  }, [design])
  return uri ? <img src={uri} alt="" className="fs-thumb" /> : <div className="fs-thumb" style={{ background: T.surfaceHi }} />
}

// ── Small controls ─────────────────────────────────────────────────────────

function TabBar({ tabs, tab, onTab }: { tabs: [Tab, string][]; tab: Tab; onTab: (t: Tab) => void }) {
  // Keep the active tab in view when the studio switches tabs by itself
  // (adding a symbol jumps to Edit), scrolling only the tab row sideways.
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const row = ref.current
    const on = row?.querySelector<HTMLElement>("[aria-selected='true']")
    if (!row || !on) return
    const left = on.offsetLeft - row.offsetLeft, right = left + on.offsetWidth
    if (left < row.scrollLeft) row.scrollTo({ left: left - 8, behavior: "smooth" })
    else if (right > row.scrollLeft + row.clientWidth) row.scrollTo({ left: right - row.clientWidth + 8, behavior: "smooth" })
  }, [tab])
  return (
    <div className="fs-tabs" role="tablist" ref={ref}>
      {tabs.map(([t, label]) => (
        <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => onTab(t)}>{label}</button>
      ))}
    </div>
  )
}

function IconBtn({ label, text, onClick, disabled, children }:
  { label: string; text?: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button className="fs-btn" onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      {children}{text && <span>{text}</span>}
    </button>
  )
}

function Slider({ id, label, min, max, value, suffix = "", onChange, onStart, onEnd }:
  { id: string; label: string; min: number; max: number; value: number; suffix?: string; onChange: (v: number) => void; onStart: () => void; onEnd: () => void }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <label htmlFor={id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: T.muted }}>
        <span>{label}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{value}{suffix}</span>
      </label>
      <input id={id} type="range" min={min} max={max} value={value}
        onPointerDown={onStart} onPointerUp={onEnd} onKeyUp={onEnd} onBlur={onEnd}
        onKeyDown={e => { if (/^(Arrow|Page|Home$|End$)/.test(e.key)) onStart() }}
        onChange={e => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: ACC }} />
    </div>
  )
}

const CSS = `
.fs-root { min-height: 100vh; background: ${T.bg}; color: ${T.text}; }
.fs-name { border: 1px dashed transparent; background: transparent; border-radius: 8px; padding: 2px 6px; margin-left: -6px; min-width: 0; width: 100%; outline: none; }
.fs-name:hover, .fs-name:focus { border-color: ${T.lineHi}; background: ${T.bg}; }
.fs-btn { display: inline-flex; align-items: center; gap: 6px; height: 38px; min-width: 38px; justify-content: center; padding: 0 10px; border-radius: 10px; border: 1px solid ${T.line}; background: ${T.surface}; color: ${T.text}; font-size: 13px; font-weight: 600; cursor: pointer; }
.fs-btn:hover:not(:disabled) { border-color: ${T.lineHi}; }
.fs-btn:disabled { opacity: .4; cursor: default; }
.fs-grid { display: grid; grid-template-columns: 340px minmax(0, 1fr) 300px; min-height: calc(100vh - var(--fs-head, 78px)); }
.fs-left { border-right: 1px solid ${T.line}; background: ${T.surface}; max-height: calc(100vh - var(--fs-head, 78px)); overflow: auto; position: sticky; top: 0; }
.fs-right { border-left: 1px solid ${T.line}; background: ${T.surface}; display: grid; align-content: start; }
.fs-right .fs-panel + .fs-panel { border-top: 1px solid ${T.line}; }
.fs-stage { background: ${T.void}; display: flex; flex-direction: column; min-width: 0; position: relative; }
.fs-grid > .fs-stage { position: sticky; top: 0; height: calc(100vh - var(--fs-head, 78px)); align-self: start; }
.fs-table { flex: 1; display: grid; place-items: center; padding: 28px 16px; overflow: hidden;
  background-image: linear-gradient(${tint(T.text, 0.06)} 1px, transparent 1px), linear-gradient(90deg, ${tint(T.text, 0.06)} 1px, transparent 1px);
  background-size: 24px 24px; }
.fs-flag { position: relative; box-shadow: 0 12px 30px -14px rgba(31,58,60,.55); background: ${T.surfaceHi}; }
.fs-base, .fs-base svg { display: block; width: 100%; height: 100%; }
.fs-base [data-p] { cursor: pointer; }
.fs-ov { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.fs-ov > path, .fs-ov > g { pointer-events: visiblePainted; cursor: grab; touch-action: none; }
.fs-ov > path:active, .fs-ov > g:active { cursor: grabbing; }
.fs-ov > .fs-border, .fs-ov .fs-handle { pointer-events: visiblePainted; touch-action: none; }
.fs-border.h { cursor: ns-resize; } .fs-border.v { cursor: ew-resize; }
.fs-grip { fill: ${T.surface}; stroke: ${T.text}; stroke-width: 1.5; vector-effect: non-scaling-stroke; opacity: .85; }
.fs-border:hover .fs-grip { opacity: 1; fill: ${T.cyan}; }
.fs-box { fill: none; stroke: ${T.cyan}; stroke-width: 1.5; stroke-dasharray: 5 4; vector-effect: non-scaling-stroke; pointer-events: none; }
.fs-knob { fill: ${T.surface}; stroke: ${T.cyan}; stroke-width: 2; vector-effect: non-scaling-stroke; }
.fs-handle { cursor: grab; } .fs-handle.resize { cursor: nwse-resize; } .fs-handle.del { cursor: pointer; }
.fs-del { fill: ${T.danger}; stroke: ${T.surface}; stroke-width: 2; vector-effect: non-scaling-stroke; }
.fs-del-x { stroke: ${T.surface}; stroke-width: 2; stroke-linecap: round; vector-effect: non-scaling-stroke; fill: none; }
.fs-layer { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: ${T.text}; font-size: 13px; text-align: left; cursor: pointer; }
.fs-layer:hover { background: ${T.surfaceHi}; }
.fs-layer.on { border-color: ${ACC}; background: ${T.surfaceHi}; }
.fs-layer.base { color: ${T.muted}; cursor: default; }
.fs-layer.base:hover { background: transparent; }
.fs-swatch.small { width: 16px; height: 16px; border-radius: 4px; }
.fs-card-preview { width: 100%; border-radius: 8px; box-shadow: 0 0 0 1px ${T.line}; display: block; }
.fs-mini:disabled { opacity: .45; cursor: default; }
.fs-guide { stroke: ${T.cyan}; stroke-width: 2; stroke-dasharray: 8 6; pointer-events: none; vector-effect: non-scaling-stroke; }
.fs-egrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
.fs-emb { justify-items: stretch; }
.fs-emb-img { width: 100%; aspect-ratio: 1; object-fit: contain; padding: 6px; background: ${tint(T.text, 0.1)}; border-radius: 6px; display: block; }
.fs-check { border: 1px solid ${T.line}; border-radius: 12px; padding: 12px; display: grid; gap: 8px; background: ${T.bg}; }
.fs-check ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: 13px; color: ${T.text}; }
.fs-check li { display: flex; gap: 8px; align-items: flex-start; line-height: 1.35; }
.fs-dot { width: 9px; height: 9px; border-radius: 50%; margin-top: 4px; flex: none; }
.fs-sel { animation: fsPulse .9s ease-in-out 2; }
@keyframes fsPulse { 0%, 100% { opacity: 1 } 50% { opacity: .45 } }
@media (prefers-reduced-motion: reduce) { .fs-sel { animation: none; } }
.fs-loading { position: absolute; inset: 0; display: grid; place-items: center; padding: 16px; text-align: center; color: ${T.muted}; font-size: 14px; }
.fs-strip { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 16px; background: ${T.surface}; border-top: 1px solid ${T.line}; }
.fs-label { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: ${T.muted}; }
.fs-chip { width: 30px; height: 30px; border-radius: 8px; border: 2px solid ${T.surface}; box-shadow: 0 0 0 1px ${tint(T.text, 0.25)}; cursor: pointer; padding: 0; }
.fs-chip.big { width: 100%; height: auto; aspect-ratio: 1; border-radius: 50%; }
.fs-chip.on { box-shadow: 0 0 0 2px ${T.text}; }
.fs-chip:focus-visible, .fs-btn:focus-visible, .fs-card:focus-visible, .fs-tabs button:focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 2px; }
.fs-custom { position: relative; overflow: hidden; background: conic-gradient(#e4002b, #fcd116, #009639, #00a3e0, #5b2c83, #e4002b); display: block; }
.fs-custom input { position: absolute; inset: 0; opacity: 0; width: 100%; height: 100%; cursor: pointer; border: 0; padding: 0; }
.fs-notice { position: absolute; left: 50%; top: 14px; transform: translateX(-50%); max-width: calc(100% - 32px); background: ${T.text}; color: ${T.surface}; font-size: 13px; font-weight: 500; padding: 9px 14px; border-radius: 10px; box-shadow: 0 8px 20px -10px rgba(0,0,0,.4); z-index: 5; }
.fs-panel { padding: 16px; display: grid; gap: 12px; align-content: start; }
.fs-h { margin: 0; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: ${T.muted}; }
.fs-swatch { width: 30px; height: 30px; border-radius: 8px; box-shadow: 0 0 0 1px ${tint(T.text, 0.25)}; flex: none; }
.fs-palette { display: grid; grid-template-columns: repeat(auto-fill, minmax(32px, 1fr)); gap: 8px; }
.fs-tabs { display: flex; gap: 2px; padding: 6px; background: ${T.surface}; border-bottom: 1px solid ${T.line}; overflow-x: auto; scrollbar-width: none; }
.fs-tabs button { flex: 1 0 auto; padding: 9px 10px; border-radius: 9px; border: 0; background: transparent; color: ${T.muted}; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.fs-tabs button.on { background: ${T.text}; color: ${T.surface}; }
.fs-searchbox { display: flex; align-items: center; gap: 8px; border: 1px solid ${T.line}; border-radius: 10px; padding: 0 10px; background: ${T.bg}; }
.fs-search { border: 1px solid ${T.line}; border-radius: 10px; padding: 9px 10px; font-size: 14px; background: ${T.bg}; color: ${T.text}; width: 100%; min-width: 0; }
.fs-search.bare { border: 0; padding: 9px 0; background: transparent; outline: none; }
.fs-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.fs-pill { padding: 6px 11px; border-radius: 999px; border: 1px solid ${T.line}; background: ${T.surface}; color: ${T.muted}; font-size: 12px; font-weight: 600; cursor: pointer; }
.fs-pill.on { background: ${T.text}; border-color: ${T.text}; color: ${T.surface}; }
.fs-tgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 10px; }
.fs-card { display: grid; gap: 6px; align-content: start; padding: 6px; border-radius: 10px; border: 1px solid ${T.line}; background: ${T.surface}; color: ${T.text}; font-size: 12px; font-weight: 500; text-align: left; cursor: pointer; line-height: 1.25; min-width: 0; }
.fs-card:hover { border-color: ${T.lineHi}; }
.fs-card.on { border-color: ${ACC}; box-shadow: 0 0 0 1px ${ACC}; }
.fs-card span { overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.fs-thumb { width: 100%; aspect-ratio: 3 / 2; object-fit: contain; background: ${T.surfaceHi}; border-radius: 4px; display: block; box-shadow: 0 0 0 1px ${tint(T.text, 0.08)}; }
.fs-mine-open { display: grid; gap: 6px; border: 0; background: transparent; padding: 0; text-align: left; color: inherit; font: inherit; cursor: pointer; min-width: 0; }
.fs-mini { display: inline-flex; align-items: center; gap: 4px; justify-self: start; border: 1px solid ${T.line}; background: ${T.surface}; color: ${T.muted}; border-radius: 7px; padding: 4px 7px; font-size: 11px; font-weight: 600; cursor: pointer; }
.fs-mini.danger { background: ${T.danger}; border-color: ${T.danger}; color: ${T.onAccent}; }
.fs-symbols { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 8px; }
.fs-sym { justify-items: center; text-align: center; padding: 10px 6px; }
.fs-sym svg { width: 40px; height: 40px; }
.fs-seg { display: flex; border: 1px solid ${T.line}; border-radius: 10px; overflow: hidden; }
.fs-seg button { flex: 1; border: 0; background: transparent; padding: 8px 0; font-size: 12px; font-weight: 600; color: ${T.muted}; cursor: pointer; font-variant-numeric: tabular-nums; }
.fs-seg button.on { background: ${T.text}; color: ${T.surface}; }
.fs-primary, .fs-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; }
.fs-primary { background: ${ACC}; border: 1px solid ${ACC}; color: ${T.onAccent}; }
.fs-secondary { background: ${T.surface}; border: 1px solid ${T.line}; color: ${T.text}; }
.fs-primary:disabled, .fs-secondary:disabled { opacity: .5; cursor: default; }
@media (max-width: 999px) {
  .fs-table { padding: 20px 16px; }
  .fs-tabs { position: sticky; top: 0; z-index: 4; }
}
`

