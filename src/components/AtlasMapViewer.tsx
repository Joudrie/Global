import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { Plus, Minus, Maximize, Hand } from "lucide-react"
import type { AtlasMap } from "../utils/atlasWhen"
import { scanUrl, tileUrl } from "../utils/atlasWhen"
import { T, ACCENT, tint } from "../ui/tokens"

/* The pan-and-zoom map table for Atlas. A canvas draws a whole-map
   image from the archive's IIIF server, then, as the player zooms in, swaps
   in sharper 512px tiles cut from the original scan for just the visible
   area. Printed years are painted over (the map's `redactions`) on every
   frame, before and after the reveal, so a sharp tile can never leak them. */

const BASE_WIDTH = 1600   // pixels across for the first, whole-map image
const MASK = "#e7dfc8"    // paper tone the original game used for redactions
const MAX_TILES = 4       // tiles loading at once

type TileState = { state: "queued" | "loading" | "loaded" | "error"; image?: HTMLImageElement }
interface Tile { key: string; base: [number, number, number, number]; url: string }

export default function AtlasMapViewer({ map, onReady }: { map: AtlasMap; onReady?: (ready: boolean) => void }) {
  const vpRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [zoomPct, setZoomPct] = useState(100)
  const [detail, setDetail] = useState<"none" | "loading" | "loaded" | "error">("none")
  const [atMax, setAtMax] = useState(false)
  const [touched, setTouched] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // Imperative handles the buttons call into the drawing loop below.
  const api = useRef({ zoom: (_f: number) => {}, fit: () => {}, retryDetail: () => {} })
  const readyRef = useRef(onReady)
  readyRef.current = onReady

  useEffect(() => {
    const vp = vpRef.current!, canvas = canvasRef.current!, ctx = canvas.getContext("2d")!
    const [, , rw, rh] = map.detail.region
    const [bx, by, bw, bh] = map.detail.base
    const ratio = rw / bw            // full-resolution pixels per base pixel
    const baseRes = BASE_WIDTH / bw  // base image pixels per base pixel
    let W = 0, H = 0, scale = 1, fitScale = 1, tx = 0, ty = 0
    let img: HTMLImageElement | null = null
    let ready = false, gen = 0, active = 0, timer = 0, disposed = false
    const cache = new Map<string, TileState>()
    let queue: Tile[] = []
    let visible: Tile[] = []
    const dpr = () => window.devicePixelRatio || 1
    // Deepest zoom: two screen pixels per pixel of the original scan.
    const limit = () => Math.max(fitScale * 1.5, ratio * 2)

    const report = () => {
      if (!ready) return
      const failed = visible.some(t => cache.get(t.key)?.state === "error")
      const loading = visible.some(t => !["loaded", "error"].includes(cache.get(t.key)?.state ?? ""))
      setDetail(failed ? "error" : loading ? "loading" : visible.length ? "loaded" : "none")
      setZoomPct(Math.round((scale / fitScale) * 100))
      setAtMax(scale >= limit() * 0.999)
    }

    const frame = () => {
      ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0)
      ctx.clearRect(0, 0, W, H)
      if (!ready || !img) return
      ctx.save()
      ctx.translate(tx, ty)
      ctx.scale(scale, scale)
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, bx, by, bw, bh)
      if (scale * dpr() > baseRes * 1.15) for (const t of visible) {
        const c = cache.get(t.key)
        if (c?.state === "loaded" && c.image) ctx.drawImage(c.image, ...t.base)
      }
      ctx.fillStyle = MASK
      for (const [x1, y1, x2, y2] of map.redactions) ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
      ctx.restore()
      report()
    }

    const pump = () => {
      while (active < MAX_TILES && queue.length) {
        const t = queue.shift()!, entry = cache.get(t.key)
        if (!entry || entry.state !== "queued") continue
        entry.state = "loading"
        active++
        const myGen = gen, image = new Image()
        image.referrerPolicy = "no-referrer"
        let done = false
        const finish = (ok: boolean) => {
          if (done) return
          done = true
          clearTimeout(to)
          active--
          if (myGen === gen && !disposed) {
            entry.state = ok ? "loaded" : "error"
            if (ok) entry.image = image
            frame()
          }
          pump()
        }
        const to = window.setTimeout(() => finish(false), 25000)
        image.onload = () => finish(true)
        image.onerror = () => finish(false)
        image.src = t.url
      }
    }

    const updateDetail = () => {
      if (!ready) return
      // The whole-map image is already sharp enough until the screen shows
      // more pixels than it has; only then fetch tiles of the original scan.
      if (scale * dpr() <= baseRes * 1.15) { visible = []; queue = []; frame(); return }
      let level = Math.floor(Math.log2(ratio / (scale * dpr())))
      level = Math.min(8, Math.max(0, level))
      const step = 512 * 2 ** level
      const left = Math.max(0, Math.floor(((-tx / scale - bx) * ratio) / step))
      const right = Math.min(Math.ceil(rw / step) - 1, Math.floor((((W - tx) / scale - bx) * ratio) / step))
      const top = Math.max(0, Math.floor(((-ty / scale - by) * (rh / bh)) / step))
      const bottom = Math.min(Math.ceil(rh / step) - 1, Math.floor((((H - ty) / scale - by) * (rh / bh)) / step))
      const next: Tile[] = []
      for (let col = left; col <= right; col++) for (let row = top; row <= bottom; row++) {
        const x = col * step, y = row * step, w = Math.min(step, rw - x), h = Math.min(step, rh - y)
        const ow = Math.max(1, Math.ceil(w / 2 ** level)), oh = Math.max(1, Math.ceil(h / 2 ** level))
        const key = `${level}:${col}:${row}`
        next.push({ key, base: [bx + (x * bw) / rw, by + (y * bh) / rh, (w * bw) / rw, (h * bh) / rh], url: tileUrl(map.detail, x, y, w, h, ow, oh) })
        if (!cache.has(key)) cache.set(key, { state: "queued" })
      }
      visible = next
      const keep = new Set(next.map(t => t.key))
      if (cache.size > 48) for (const key of cache.keys()) {
        if (!keep.has(key) && cache.get(key)?.state !== "loading") cache.delete(key)
        if (cache.size <= 36) break
      }
      queue = next.filter(t => cache.get(t.key)?.state === "queued")
      pump()
      frame()
    }

    const draw = () => { frame(); clearTimeout(timer); timer = window.setTimeout(updateDetail, 120) }

    const fit = () => {
      if (!ready) return
      fitScale = Math.min(W / bw, H / bh) * 0.95
      scale = fitScale
      tx = (W - bw * scale) / 2
      ty = (H - bh * scale) / 2
      draw()
    }
    const resize = () => {
      W = vp.clientWidth; H = vp.clientHeight
      canvas.width = Math.round(W * dpr()); canvas.height = Math.round(H * dpr())
      if (ready) fit(); else frame()
    }
    const zoom = (f: number, x = W / 2, y = H / 2) => {
      if (!ready) return
      const nextScale = Math.max(fitScale * 0.7, Math.min(limit(), scale * f))
      f = nextScale / scale
      tx = x - (x - tx) * f
      ty = y - (y - ty) * f
      scale = nextScale
      draw()
    }
    api.current = {
      zoom: f => zoom(f), fit,
      retryDetail: () => { for (const [k, v] of cache) if (v.state === "error") cache.delete(k); updateDetail() },
    }

    const ro = new ResizeObserver(resize)
    ro.observe(vp)

    // ── pointer gestures: one finger pans, two pinch-zoom ──
    const pointers = new Map<number, { x: number; y: number }>()
    let gesture: { type: "pan"; x: number; y: number; tx: number; ty: number } | { type: "pinch"; d: number; x: number; y: number } | null = null
    const local = (e: { clientX: number; clientY: number }) => { const r = vp.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
    const resetGesture = () => {
      const a = [...pointers.values()]
      gesture = a.length === 1 ? { type: "pan", x: a[0].x, y: a[0].y, tx, ty }
        : a.length >= 2 ? { type: "pinch", d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }
        : null
    }
    // Only the map itself starts a drag; capturing presses on the zoom buttons
    // would swallow their clicks.
    const onDown = (e: PointerEvent) => { if (!ready || e.target !== canvas) return; setTouched(true); vp.setPointerCapture(e.pointerId); pointers.set(e.pointerId, local(e)); resetGesture() }
    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, local(e))
      const a = [...pointers.values()]
      if (gesture?.type === "pan" && a.length === 1) {
        tx = gesture.tx + a[0].x - gesture.x; ty = gesture.ty + a[0].y - gesture.y; draw()
      } else if (gesture?.type === "pinch" && a.length >= 2) {
        const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), x = (a[0].x + a[1].x) / 2, y = (a[0].y + a[1].y) / 2
        if (gesture.d > 0) zoom(d / gesture.d, gesture.x, gesture.y)
        tx += x - gesture.x; ty += y - gesture.y
        draw(); resetGesture()
      }
    }
    const onUp = (e: PointerEvent) => { pointers.delete(e.pointerId); resetGesture() }
    const onWheel = (e: WheelEvent) => { e.preventDefault(); setTouched(true); const p = local(e); zoom(Math.exp(-e.deltaY * 0.0017), p.x, p.y) }
    const onDbl = (e: MouseEvent) => { const p = local(e); zoom(2, p.x, p.y) }
    const onKey = (e: KeyboardEvent) => {
      const k = e.key
      if (!["+", "=", "-", "0", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(k)) return
      e.preventDefault()
      if (k === "+" || k === "=") zoom(1.3)
      else if (k === "-") zoom(1 / 1.3)
      else if (k === "0") fit()
      else { if (k === "ArrowLeft") tx += 70; if (k === "ArrowRight") tx -= 70; if (k === "ArrowUp") ty += 70; if (k === "ArrowDown") ty -= 70; draw() }
    }
    vp.addEventListener("pointerdown", onDown)
    vp.addEventListener("pointermove", onMove)
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"] as const) vp.addEventListener(ev, onUp)
    vp.addEventListener("wheel", onWheel, { passive: false })
    vp.addEventListener("dblclick", onDbl)
    canvas.addEventListener("keydown", onKey)

    // ── the whole-map image ──
    setStatus("loading"); setDetail("none"); readyRef.current?.(false)
    const loading = new Image()
    loading.referrerPolicy = "no-referrer"
    loading.onload = () => {
      if (disposed) return
      img = loading; ready = true
      setStatus("ready"); readyRef.current?.(true)
      resize()
    }
    loading.onerror = () => { if (!disposed) setStatus("error") }
    loading.src = scanUrl(map.detail, Math.min(BASE_WIDTH, rw))

    return () => {
      disposed = true; gen++
      clearTimeout(timer)
      ro.disconnect()
      vp.removeEventListener("pointerdown", onDown)
      vp.removeEventListener("pointermove", onMove)
      for (const ev of ["pointerup", "pointercancel", "lostpointercapture"] as const) vp.removeEventListener(ev, onUp)
      vp.removeEventListener("wheel", onWheel)
      vp.removeEventListener("dblclick", onDbl)
      canvas.removeEventListener("keydown", onKey)
      loading.onload = loading.onerror = null
    }
  }, [map, attempt])

  const tool = (label: string, onClick: () => void, icon: ReactNode, disabled = false) => (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled || status !== "ready"}
      style={{ width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: 12, background: tint(T.surface, 0.94), color: T.text,
        border: `1px solid ${T.line}`, boxShadow: `0 3px 10px -4px ${tint(T.text, 0.45)}`, opacity: disabled || status !== "ready" ? 0.45 : 1, cursor: "pointer" }}>
      {icon}
    </button>
  )

  const chip = (children: ReactNode) => (
    <div role="status" aria-live="polite" style={{ position: "absolute", left: 10, bottom: 10, display: "inline-flex", alignItems: "center", gap: 8,
      fontSize: 12, fontWeight: 600, color: T.text, background: tint(T.surface, 0.92), border: `1px solid ${T.line}`, borderRadius: 999, padding: "6px 12px",
      boxShadow: `0 3px 10px -4px ${tint(T.text, 0.45)}`, pointerEvents: "auto" }}>{children}</div>
  )

  return (
    <div ref={vpRef} style={{ position: "relative", height: "100%", minHeight: 260, overflow: "hidden", touchAction: "none", cursor: "grab",
      background: "radial-gradient(#aebbad 1px, transparent 1px) 0 0 / 20px 20px #d9dfd4" }}>
      <canvas ref={canvasRef} tabIndex={0} aria-label="Historical world map. Drag to pan, pinch or scroll to zoom, or use plus, minus and the arrow keys."
        style={{ display: "block", width: "100%", height: "100%", outlineOffset: -3 }} />
      {status !== "ready" && (
        <div role="status" style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center", gap: 10, background: tint("#e7e9df", 0.85), padding: 24, color: T.text }}>
          {status === "loading" ? "Unfolding your map…" : <>
            <span>This scan couldn’t be loaded.</span>
            <button type="button" onClick={() => setAttempt(a => a + 1)} style={{ padding: "10px 18px", borderRadius: 12, border: `1px solid ${T.lineHi}`, background: T.surface, color: T.text, cursor: "pointer", fontWeight: 600 }}>Try again</button>
          </>}
        </div>
      )}
      <div style={{ position: "absolute", right: 10, bottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {tool("Zoom in", () => api.current.zoom(1.6), <Plus size={20} />, atMax)}
        {tool("Zoom out", () => api.current.zoom(1 / 1.6), <Minus size={20} />, zoomPct <= 100)}
        {zoomPct > 100 && tool("Show the whole map", () => api.current.fit(), <Maximize size={18} />)}
      </div>
      {status === "ready" && (
        !touched ? chip(<><Hand size={14} /> Drag to explore · pinch or scroll to zoom</>)
        : detail === "loading" ? chip("Sharpening the scan…")
        : detail === "error" ? chip(<>Some detail didn’t load <button type="button" onClick={() => api.current.retryDetail()} style={{ fontSize: 12, fontWeight: 700, color: ACCENT.codex, background: "none", border: "none", padding: 0, cursor: "pointer" }}>Retry</button></>)
        : null
      )}
    </div>
  )
}
