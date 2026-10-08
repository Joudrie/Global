import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react"
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react"
import { Undo2, Redo2, Shuffle, Download, Link2, Trash2, Copy, ArrowUp, ArrowDown, Search } from "lucide-react"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { BackButton } from "./ui"
import FlagImage from "./FlagImage"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import {
  FLAG_W, LAYOUTS, SYMBOLS, FLAG_PALETTE, layoutSvg, symbolOf, overlayTransform,
  newDesign, newId, loadBase, composeBase, composeFull, svgDataUri, svgToPng, downloadBlob,
  fileSlug, encodeDesign, decodeDesign, loadStore, saveStore, toHex,
} from "../utils/flagStudio"
import type { Design, Overlay, SymbolKind } from "../utils/flagStudio"

const ACC = ACCENT.play

type Sel =
  | { k: "part"; i: number; prop: "f" | "s" }
  | { k: "color"; hex: string }
  | { k: "ov"; id: string }
  | null

type Tab = "templates" | "symbols" | "edit" | "export" | "mine"

const REGIONS: ("All" | FlagRecord["region"])[] = ["All", "Europe", "Africa", "Asia", "Middle East", "Americas", "Oceania"]
const EXPORT_SIZES = [600, 1200, 2400, 3840]

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.6
}

const colorDistance = (a: string, b: string) => {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16)
  return Math.abs((x >> 16) - (y >> 16)) + Math.abs(((x >> 8) & 255) - ((y >> 8) & 255)) + Math.abs((x & 255) - (y & 255))
}

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
  const [design, setDesign] = useState<Design>(() => shared ?? store.current ?? newDesign("layout:tricolour-v", "My flag"))
  const [saved, setSaved] = useState<Design[]>(store.saved)
  const [past, setPast] = useState<Design[]>([])
  const [future, setFuture] = useState<Design[]>([])
  const [baseText, setBaseText] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [sel, setSel] = useState<Sel>(null)
  const [tab, setTab] = useState<Tab>(() => (shared || store.current ? "edit" : "templates"))
  const [strip, setStrip] = useState<{ hex: string; count: number }[]>([])
  const [notice, setNotice] = useState<string | null>(shared ? "You opened a shared flag. Change anything to make it yours." : null)
  const [exportSize, setExportSize] = useState(1200)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const baseRef = useRef<HTMLDivElement>(null)
  const ovRef = useRef<SVGSVGElement>(null)
  const eff = useRef<{ f: (string | null)[]; s: (string | null)[]; group: Map<string, string> }>({ f: [], s: [], group: new Map() })
  const inGroup = (c: string | null | undefined, rep: string) => !!c && (eff.current.group.get(c) ?? c) === rep
  const drag = useRef<{ id: string; dx: number; dy: number; started: boolean } | null>(null)
  const liveStarted = useRef(false)

  // The studio is the one screen that uses the full width of a desktop window.
  useEffect(() => {
    document.documentElement.classList.add("fs-wide")
    return () => document.documentElement.classList.remove("fs-wide")
  }, [])

  // Load the template behind the design.
  useEffect(() => {
    let live = true
    setBaseText(null)
    setLoadFailed(false)
    loadBase(design.base).then(t => { if (live) setBaseText(t) }).catch(() => { if (live) setLoadFailed(true) })
    return () => { live = false }
  }, [design.base])

  const composed = useMemo(() => (baseText ? composeBase(baseText, design.parts) : null), [baseText, design.parts])
  const flagH = composed?.h ?? Math.round(FLAG_W * 2 / 3)

  // Read back the colours the browser actually paints, so the colour strip
  // and "every part in this colour" work for any flag file. The strip is
  // ordered by how much of the flag each colour covers, so a crest's hundred
  // tiny shades never push the main stripes out of view, and near-identical
  // shades (#000000 and #010101) count as one colour.
  useLayoutEffect(() => {
    const host = baseRef.current
    if (!host || !composed) return
    const f: (string | null)[] = []
    const s: (string | null)[] = []
    const area = new Map<string, number>()
    const add = (c: string | null, a: number) => { if (c) area.set(c, (area.get(c) ?? 0) + a) }
    host.querySelectorAll("[data-p]").forEach(el => {
      const i = Number(el.getAttribute("data-p"))
      const cs = getComputedStyle(el)
      f[i] = toHex(cs.fill)
      s[i] = cs.strokeWidth && parseFloat(cs.strokeWidth) > 0 ? toHex(cs.stroke) : null
      const r = el.getBoundingClientRect()
      const a = r.width * r.height
      add(f[i], a)
      add(s[i], a * 0.3)
    })
    for (const o of design.overlays) add(o.color.toLowerCase(), 1)
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
  }, [composed, design.overlays])

  // Pulse whatever is selected on the flag itself.
  useLayoutEffect(() => {
    const host = baseRef.current
    if (!host) return
    host.querySelectorAll(".fs-sel").forEach(el => el.classList.remove("fs-sel"))
    if (sel?.k === "part") host.querySelector(`[data-p="${sel.i}"]`)?.classList.add("fs-sel")
    if (sel?.k === "color") {
      host.querySelectorAll("[data-p]").forEach(el => {
        const i = Number(el.getAttribute("data-p"))
        if (inGroup(eff.current.f[i], sel.hex) || inGroup(eff.current.s[i], sel.hex)) el.classList.add("fs-sel")
      })
    }
  }, [composed, sel])

  // My flags: edited designs, newest first, with the current one on top.
  const library = useMemo(
    () => (design.edited ? [design, ...saved.filter(d => d.id !== design.id)] : saved),
    [design, saved],
  )

  // Autosave, lightly debounced so dragging doesn't hammer storage.
  useEffect(() => {
    const t = window.setTimeout(() => saveStore({ current: design, saved: library }), 250)
    return () => window.clearTimeout(t)
  }, [design, library])

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

  // Continuous edits (dragging, sliders) record one undo step, not hundreds.
  const beginLive = () => {
    if (liveStarted.current) return
    liveStarted.current = true
    setPast(p => [...p.slice(-99), design])
    setFuture([])
    setShareUrl(null)
  }
  const live = (fn: (d: Design) => Design) =>
    setDesign(d => ({ ...fn(d), edited: true, updated: Date.now() }))
  const endLive = () => { liveStarted.current = false }

  const undo = useCallback(() => {
    if (!past.length) return
    setFuture(f => [design, ...f])
    setDesign(past[past.length - 1])
    setPast(p => p.slice(0, -1))
  }, [past, design])
  const redo = useCallback(() => {
    if (!future.length) return
    setPast(p => [...p, design])
    setDesign(future[0])
    setFuture(f => f.slice(1))
  }, [future, design])

  const switchTo = (next: Design) => {
    setSaved(library)
    setDesign(next)
    setPast([])
    setFuture([])
    setSel(null)
    setShareUrl(null)
    if (!wide) setTab("edit")
  }

  const openTemplate = (base: string, name: string) => switchTo(newDesign(base, name))

  const applyColor = (hex: string) => {
    hex = hex.toLowerCase()
    if (!sel) { setNotice("Tap part of the flag, or a colour in the strip, first."); return }
    if (sel.k === "part") {
      const prev = design.parts[sel.i] ?? {}
      commit({ ...design, parts: { ...design.parts, [sel.i]: { ...prev, [sel.prop]: hex } } })
    } else if (sel.k === "ov") {
      commit({ ...design, overlays: design.overlays.map(o => (o.id === sel.id ? { ...o, color: hex } : o)) })
    } else {
      const from = sel.hex
      const parts = { ...design.parts }
      eff.current.f.forEach((c, i) => { if (inGroup(c, from)) parts[i] = { ...parts[i], f: hex } })
      eff.current.s.forEach((c, i) => { if (inGroup(c, from)) parts[i] = { ...parts[i], s: hex } })
      const overlays = design.overlays.map(o => (inGroup(o.color.toLowerCase(), from) ? { ...o, color: hex } : o))
      commit({ ...design, parts, overlays })
      setSel({ k: "color", hex })
    }
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
    const dominant = strip[0]?.hex
    const color = dominant && isLight(dominant) ? "#c8102e" : "#ffffff"
    const o: Overlay = {
      id: newId(), kind, x: FLAG_W / 2, y: flagH / 2,
      size: kind === "stripe" ? FLAG_W : Math.round(flagH * (kind === "square" ? 0.5 : 0.4)),
      rot: 0, color,
    }
    commit({ ...design, overlays: [...design.overlays, o] })
    setSel({ k: "ov", id: o.id })
    if (!wide) setTab("edit")
  }

  const selOverlay = sel?.k === "ov" ? design.overlays.find(o => o.id === sel.id) : undefined

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

  const onBaseClick = (e: ReactMouseEvent) => {
    const el = (e.target as Element).closest?.("[data-p]")
    if (!el) return
    const i = Number(el.getAttribute("data-p"))
    const prop = eff.current.f[i] ? "f" : eff.current.s[i] ? "s" : "f"
    setSel({ k: "part", i, prop })
    if (!wide) setTab("edit")
  }

  const svgPoint = (e: ReactPointerEvent) => {
    const svg = ovRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  const onOverlayDown = (e: ReactPointerEvent, o: Overlay) => {
    e.stopPropagation()
    setSel({ k: "ov", id: o.id })
    const p = svgPoint(e)
    drag.current = { id: o.id, dx: p.x - o.x, dy: p.y - o.y, started: false }
    ovRef.current?.setPointerCapture(e.pointerId)
  }
  const onOverlayMove = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = svgPoint(e)
    if (!d.started) { d.started = true; beginLive() }
    const x = Math.max(0, Math.min(FLAG_W, p.x - d.dx))
    const y = Math.max(0, Math.min(flagH, p.y - d.dy))
    updateOverlay(d.id, { x, y })
  }
  const onOverlayUp = () => {
    if (drag.current?.started) endLive()
    drag.current = null
  }

  // Keyboard: undo/redo, delete a symbol, Escape to deselect.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo() }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo() }
      else if ((e.key === "Delete" || e.key === "Backspace") && sel?.k === "ov") { e.preventDefault(); removeOverlay(sel.id) }
      else if (e.key === "Escape") setSel(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [undo, redo, sel, removeOverlay])

  // ── Export & share ───────────────────────────────────────────────────────

  const [busy, setBusy] = useState(false)
  const exportPng = async () => {
    if (!baseText || busy) return
    setBusy(true)
    try {
      const { svg, h } = composeFull(baseText, design)
      downloadBlob(await svgToPng(svg, exportSize, h), `${fileSlug(design.name)}.png`)
    } catch {
      setNotice("That export didn't work. Try a smaller size, or download the SVG instead.")
    } finally { setBusy(false) }
  }
  const exportSvg = () => {
    if (!baseText) return
    const { svg } = composeFull(baseText, design)
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${fileSlug(design.name)}.svg`)
  }
  const share = async () => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}?play=flagstudio&design=${encodeDesign(design)}`
    setShareUrl(url)
    try {
      await navigator.clipboard.writeText(url)
      setNotice("Link copied. Anyone who opens it sees your flag and can remix it.")
    } catch {
      setNotice("Copy the link below to share your flag.")
    }
  }

  // ── Render pieces ────────────────────────────────────────────────────────

  const selectedHex =
    sel?.k === "part" ? (sel.prop === "f" ? eff.current.f[sel.i] : eff.current.s[sel.i]) ?? null
      : sel?.k === "color" ? sel.hex
        : selOverlay ? selOverlay.color.toLowerCase() : null

  const header = (
    <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${T.line}`, background: T.surface, flexWrap: "wrap" }}>
      <BackButton onClick={onBack} />
      <div style={{ flex: "1 1 180px", minWidth: 0, display: "grid" }}>
        <span style={{ color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Flag Studio</span>
        <input
          id="fs-name" aria-label="Flag name" value={design.name} maxLength={60}
          onChange={e => setDesign(d => ({ ...d, name: e.target.value }))}
          className="fs-name"
          style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: T.text }}
        />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <IconBtn label="Undo" onClick={undo} disabled={!past.length}><Undo2 size={17} /></IconBtn>
        <IconBtn label="Redo" onClick={redo} disabled={!future.length}><Redo2 size={17} /></IconBtn>
        <IconBtn label="Shuffle colours" onClick={shuffleColors} disabled={!strip.length} text="Shuffle"><Shuffle size={16} /></IconBtn>
        {wide && <IconBtn label="Copy share link" onClick={share} text="Share"><Link2 size={16} /></IconBtn>}
      </div>
    </header>
  )

  const stage = (
    <div className="fs-stage">
      <div className="fs-table">
        <div className="fs-flag" style={{ aspectRatio: `${FLAG_W} / ${flagH}` }}>
          {composed ? (
            <>
              <div ref={baseRef} className="fs-base" onClick={onBaseClick} dangerouslySetInnerHTML={{ __html: composed.svg }} />
              <svg
                ref={ovRef} className="fs-ov" viewBox={`0 0 ${FLAG_W} ${flagH}`}
                onPointerMove={onOverlayMove} onPointerUp={onOverlayUp} onPointerCancel={onOverlayUp}
              >
                {design.overlays.map(o => {
                  const s = symbolOf(o.kind)
                  const on = (sel?.k === "ov" && sel.id === o.id) || (sel?.k === "color" && inGroup(o.color.toLowerCase(), sel.hex))
                  return (
                    <path key={o.id} d={s.d} fill={o.color} fillRule={s.evenOdd ? "evenodd" : undefined}
                      transform={overlayTransform(o)} className={on ? "fs-sel" : undefined}
                      onPointerDown={e => onOverlayDown(e, o)} />
                  )
                })}
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
              style={{ background: c.hex }} onClick={() => { setSel({ k: "color", hex: c.hex }); if (!wide) setTab("edit") }} />
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
                {sel.k === "part" ? "This shape" : sel.k === "color" ? `Every part in this colour` : symbolOf(selOverlay?.kind ?? "star5").name}
              </b>
              <span style={{ fontSize: 12, color: T.muted }}>{selectedHex?.toUpperCase() ?? "Pattern"}</span>
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
          <h2 className="fs-h">{symbolOf(selOverlay.kind).name}</h2>
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
          <span style={{ fontSize: 12, color: T.muted }}>Drag the symbol on the flag to move it.</span>
        </div>
      )}
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
    </div>
  )

  const symbolsPanel = (
    <div className="fs-panel">
      <h2 className="fs-h">Add a symbol</h2>
      <div className="fs-symbols">
        {SYMBOLS.map(s => (
          <button key={s.kind} className="fs-card fs-sym" onClick={() => addSymbol(s.kind)} aria-label={`Add ${s.name}`}>
            <svg viewBox="-1.15 -1.15 2.3 2.3" aria-hidden="true"><path d={s.d} fill={T.text} fillRule={s.evenOdd ? "evenodd" : undefined} /></svg>
            <span>{s.name}</span>
          </button>
        ))}
      </div>
      <span style={{ fontSize: 12, color: T.muted }}>Symbols land in the middle of the flag. Drag them anywhere, then resize, rotate or recolour.</span>
    </div>
  )

  const content: Record<Tab, ReactNode> = {
    templates: <TemplatesPanel onPick={openTemplate} current={design.base} />,
    symbols: symbolsPanel,
    edit: editPanel,
    export: exportPanel,
    mine: <MinePanel library={library} currentId={design.id} onOpen={d => switchTo(d)} onDelete={id => setSaved(library.filter(d => d.id !== id))} />,
  }

  const leftTabs: [Tab, string][] = [["templates", "Templates"], ["symbols", "Symbols"], ["mine", "My flags"]]
  const phoneTabs: [Tab, string][] = [["edit", "Colour"], ["templates", "Templates"], ["symbols", "Symbols"], ["export", "Export"], ["mine", "My flags"]]
  const leftTab: Tab = leftTabs.some(([t]) => t === tab) ? tab : "templates"

  return (
    <div className="fs-root">
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

function TemplatesPanel({ onPick, current }: { onPick: (base: string, name: string) => void; current: string }) {
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
              <button key={l.id} className={`fs-card${current === `layout:${l.id}` ? " on" : ""}`} onClick={() => onPick(`layout:${l.id}`, "My flag")}>
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
          <button key={f.code} className={`fs-card${current === `flag:${f.code.toLowerCase()}` ? " on" : ""}`}
            onClick={() => onPick(`flag:${f.code.toLowerCase()}`, `New ${f.name}`)}>
            <FlagImage code={f.code} alt="" className="fs-thumb" />
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

function DesignThumb({ design }: { design: Design }) {
  const [uri, setUri] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    loadBase(design.base).then(t => { if (live) setUri(svgDataUri(composeFull(t, design).svg)) }).catch(() => {})
    return () => { live = false }
  }, [design])
  return uri ? <img src={uri} alt="" className="fs-thumb" /> : <div className="fs-thumb" style={{ background: T.surfaceHi }} />
}

// ── Small controls ─────────────────────────────────────────────────────────

function TabBar({ tabs, tab, onTab }: { tabs: [Tab, string][]; tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <div className="fs-tabs" role="tablist">
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
        onPointerDown={onStart} onPointerUp={onEnd} onKeyDown={onStart} onKeyUp={onEnd} onBlur={onEnd}
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
.fs-grid { display: grid; grid-template-columns: 320px minmax(0, 1fr) 300px; min-height: calc(100vh - 70px); }
.fs-left { border-right: 1px solid ${T.line}; background: ${T.surface}; max-height: calc(100vh - 70px); overflow: auto; position: sticky; top: 0; }
.fs-right { border-left: 1px solid ${T.line}; background: ${T.surface}; display: grid; align-content: start; }
.fs-right .fs-panel + .fs-panel { border-top: 1px solid ${T.line}; }
.fs-stage { background: ${T.void}; display: flex; flex-direction: column; min-width: 0; position: relative; }
.fs-table { flex: 1; display: grid; place-items: center; padding: 28px 16px;
  background-image: linear-gradient(${tint(T.text, 0.06)} 1px, transparent 1px), linear-gradient(90deg, ${tint(T.text, 0.06)} 1px, transparent 1px);
  background-size: 24px 24px; }
.fs-flag { position: relative; width: min(100%, 760px); max-height: 70vh; box-shadow: 0 12px 30px -14px rgba(31,58,60,.55); background: ${T.surfaceHi}; }
.fs-base, .fs-base svg { display: block; width: 100%; height: 100%; }
.fs-base [data-p] { cursor: pointer; }
.fs-ov { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.fs-ov path { pointer-events: visiblePainted; cursor: grab; touch-action: none; }
.fs-ov path:active { cursor: grabbing; }
.fs-sel { animation: fsPulse 1.1s ease-in-out infinite; }
@keyframes fsPulse { 0%, 100% { opacity: 1 } 50% { opacity: .55 } }
@media (prefers-reduced-motion: reduce) { .fs-sel { animation: none; opacity: .7; } }
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
.fs-tabs button { flex: 1 0 auto; padding: 9px 12px; border-radius: 9px; border: 0; background: transparent; color: ${T.muted}; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
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

