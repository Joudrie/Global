import { useRef, useState, useEffect, useCallback } from "react"
import { PAINT_PUZZLES } from "../data/paintPuzzles"
import type { ReactNode } from "react"
import { colorAccuracy, colorName, hexToRgb } from "../utils/color"
import type { RGB } from "../utils/color"
import { floodRuns } from "../utils/floodFill"
import type { Runs } from "../utils/floodFill"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"
import { LineIcon } from "./icons"
import { Undo2, Eraser, Trash2 } from "lucide-react"

const ACC = ACCENT.play
// Drawing space (strokes are kept in these units). The canvas itself is
// W·dpr × H·dpr device pixels, so lines stay sharp on 2x/3x phones.
const W = 300, H = 200
const ERASER = "#FFFFFF"

// Simple, well-known flags are the fun ones to draw from memory.
const TARGETS = PAINT_PUZZLES.map(p => ({ code: p.code, name: p.name }))

const PAINTS = ["#C8102E", "#FF7A00", "#FCD116", "#1EA84A", "#0055A4", "#2B2D77", "#111111", "#FFFFFF"]

// The sketch is a list of steps, replayed after an undo. A stroke keeps its
// points (drawing space); a fill keeps the device pixels it painted as runs,
// so replaying it paints exactly the same pixels again.
type Op =
  | { kind: "stroke"; color: string; size: number; pts: { x: number; y: number }[] }
  | { kind: "fill"; color: string; runs: Runs }
type Tool = "brush" | "fill"

const pixelRatio = () =>
  typeof window === "undefined" ? 1 : Math.min(3, Math.max(1, Math.ceil(window.devicePixelRatio || 1)))

function paintOp(ctx: CanvasRenderingContext2D, op: Op, dpr: number) {
  ctx.fillStyle = op.color
  if (op.kind === "fill") {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const path = new Path2D()
    const r = op.runs
    for (let i = 0; i < r.length; i += 3) path.rect(r[i], r[i + 1], r[i + 2], 1)
    ctx.fill(path)
    return
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.lineJoin = ctx.lineCap = "round"
  ctx.strokeStyle = op.color; ctx.lineWidth = op.size
  if (op.pts.length === 1) { ctx.beginPath(); ctx.arc(op.pts[0].x, op.pts[0].y, op.size / 2, 0, 7); ctx.fill(); return }
  ctx.beginPath(); ctx.moveTo(op.pts[0].x, op.pts[0].y)
  for (const p of op.pts.slice(1)) ctx.lineTo(p.x, p.y)
  ctx.stroke()
}

// One toolbar button: 44px square, tinted with a border in the accent when selected.
function ToolButton({ label, on, disabled, onClick, children }:
  { label: string; on?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={on}
      className="flex items-center justify-center transition-colors duration-150 motion-reduce:transition-none"
      style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: on ? tint(ACC, 0.18) : T.surface, border: `1px solid ${on ? ACC : T.line}`,
        opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
      {children}
    </button>
  )
}

function shuffle<X>(a: X[]): X[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}
function makeDealer() {
  let bag: typeof TARGETS = []
  return () => { if (!bag.length) bag = shuffle(TARGETS); return bag.pop()! }
}
const deal = makeDealer()

const WHITE: RGB = [255, 255, 255]

// Average colour of each cell in a GX×GY grid over an ImageData.
function grid(data: ImageData, gx: number, gy: number): RGB[] {
  const out: RGB[] = []
  const cw = data.width / gx, ch = data.height / gy
  for (let cy = 0; cy < gy; cy++) for (let cx = 0; cx < gx; cx++) {
    let r = 0, g = 0, b = 0, n = 0
    for (let y = Math.floor(cy * ch); y < (cy + 1) * ch; y += 2)
      for (let x = Math.floor(cx * cw); x < (cx + 1) * cw; x += 2) {
        const i = (y * data.width + x) * 4
        r += data.data[i]; g += data.data[i + 1]; b += data.data[i + 2]; n++
      }
    out.push(n ? [r / n, g / n, b / n] : [255, 255, 255])
  }
  return out
}

// Bands for the score above a blank canvas (0 = blank, 100 = the real flag).
function gradeOf(a: number) {
  if (a >= 80) return { t: "Spot on!", c: T.green }
  if (a >= 60) return { t: "Great likeness", c: T.green }
  if (a >= 40) return { t: "Recognisable", c: ACC }
  if (a >= 20) return { t: "Rough sketch", c: T.amber }
  return { t: "Abstract art", c: T.danger }
}

export default function SketchFlagScreen({ onBack }: { onBack: () => void }) {
  const [target, setTarget] = useState(deal)
  const [color, setColor] = useState(PAINTS[0])
  const [size, setSize] = useState(10)
  const [tool, setTool] = useState<Tool>("brush")
  const [dpr] = useState(pixelRatio)
  const [phase, setPhase] = useState<"draw" | "result">("draw")
  const [accuracy, setAccuracy] = useState(0)
  const [, force] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const opsRef = useRef<Op[]>([])
  const drawingRef = useRef(false)
  const realDataRef = useRef<RGB[] | null>(null)

  // The paint bucket reads pixels back, so the canvas is kept CPU-side.
  const ctxOf = () => canvasRef.current?.getContext("2d", { willReadFrequently: true }) ?? null

  // Paint the whole sketch (white ground + every step) onto the canvas.
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d", { willReadFrequently: true })
    if (!canvas || !ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (const op of opsRef.current) paintOp(ctx, op, dpr)
  }, [dpr])

  useEffect(() => { redraw() }, [redraw, target])

  // Load the real flag (same-origin SVG → readable) into a grid for scoring.
  useEffect(() => {
    realDataRef.current = null
    const img = new Image()
    img.src = `/flags/${target.code.toLowerCase()}.svg`
    img.onload = () => {
      const off = document.createElement("canvas"); off.width = W; off.height = H
      const c = off.getContext("2d"); if (!c) return
      c.fillStyle = "#FFFFFF"; c.fillRect(0, 0, W, H)
      c.drawImage(img, 0, 0, W, H)
      try { realDataRef.current = grid(c.getImageData(0, 0, W, H), 30, 20) } catch { /* tainted — skip score */ }
    }
  }, [target])

  const toCanvas = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }
  }

  // Paint bucket: flood the tapped region (in device pixels) with the colour.
  const fillAt = (e: React.PointerEvent) => {
    const canvas = canvasRef.current, ctx = ctxOf()
    if (!canvas || !ctx) return
    const r = canvas.getBoundingClientRect()
    const px = Math.min(canvas.width - 1, Math.max(0, Math.floor((e.clientX - r.left) * (canvas.width / r.width))))
    const py = Math.min(canvas.height - 1, Math.max(0, Math.floor((e.clientY - r.top) * (canvas.height / r.height))))
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const runs = floodRuns(img.data, canvas.width, canvas.height, px, py, hexToRgb(color))
    if (!runs) return // already that colour
    const op: Op = { kind: "fill", color, runs }
    opsRef.current.push(op)
    paintOp(ctx, op, dpr)
    force(n => n + 1)
  }

  const down = (e: React.PointerEvent) => {
    if (phase !== "draw") return
    if (tool === "fill") { fillAt(e); return }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    drawingRef.current = true
    const op: Op = { kind: "stroke", color, size, pts: [toCanvas(e)] }
    opsRef.current.push(op)
    const ctx = ctxOf()
    if (ctx) paintOp(ctx, op, dpr)
    force(n => n + 1)
  }
  // While drawing, only the new segment is painted; the stroke is redrawn whole when the finger lifts.
  const move = (e: React.PointerEvent) => {
    if (!drawingRef.current) return
    const op = opsRef.current[opsRef.current.length - 1]
    if (op?.kind !== "stroke") return
    const a = op.pts[op.pts.length - 1], b = toCanvas(e)
    op.pts.push(b)
    const ctx = ctxOf()
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineJoin = ctx.lineCap = "round"
    ctx.strokeStyle = op.color; ctx.lineWidth = op.size
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  }
  const up = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    redraw()
  }

  const undo = () => { opsRef.current.pop(); redraw(); force(n => n + 1) }
  const clear = () => { opsRef.current = []; redraw(); force(n => n + 1) }

  const reveal = () => {
    const canvas = canvasRef.current, ctx = ctxOf()
    const real = realDataRef.current
    if (canvas && ctx && real) {
      // Fills and strokes are both just pixels here, so they score alike.
      const mine = grid(ctx.getImageData(0, 0, canvas.width, canvas.height), 30, 20)
      const avg = mine.reduce((s, c, i) => s + colorAccuracy(c, real[i]), 0) / mine.length
      // Score only what the drawing adds over a blank white canvas, so a dot
      // on Japan's white field isn't "83%".
      const blank = real.reduce((s, c) => s + colorAccuracy(WHITE, c), 0) / real.length
      setAccuracy(blank >= 100 ? Math.round(avg) : Math.max(0, Math.round((avg - blank) / (100 - blank) * 100)))
    } else setAccuracy(0)
    setPhase("result")
  }
  const next = () => { opsRef.current = []; setTarget(deal()); setPhase("draw"); force(n => n + 1) }

  const grade = gradeOf(accuracy)
  const hasStrokes = opsRef.current.length > 0

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Sketch the Flag" subtitle={phase === "draw" ? "Draw from memory" : target.name} onBack={onBack} />

      <div className="flex-1 flex flex-col items-center px-5 pt-2 pb-10 gap-4">
        {phase === "draw" && (
          <p className="text-sm text-center" style={{ color: T.muted }}>
            Draw the <span style={{ color: ACC, fontWeight: 800, fontFamily: FONT.display }}>{target.name}</span> flag from memory.
          </p>
        )}

        {/* Canvas (+ real-flag overlay on reveal) */}
        <div style={{ position: "relative", width: "100%", maxWidth: 340, aspectRatio: "3 / 2", borderRadius: 10, overflow: "hidden", border: `1px solid ${T.line}`, boxShadow: `0 8px 24px -12px ${tint(T.text, 0.5)}` }}>
          <canvas ref={canvasRef} width={W * dpr} height={H * dpr}
            aria-label={`Drawing canvas for the ${target.name} flag`}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: tool === "fill" ? "cell" : "crosshair" }} />
          {phase === "result" && (
            <img src={`/flags/${target.code.toLowerCase()}.svg`} alt={target.name}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.5, pointerEvents: "none" }} />
          )}
        </div>

        {phase === "draw" ? (
          <>
            {/* Paints */}
            <div className="flex flex-wrap gap-1 min-[360px]:gap-2 justify-center" style={{ maxWidth: 340 }}>
              {PAINTS.map(c => (
                <button key={c} onClick={() => setColor(c)} aria-label={`${colorName(c)} paint`} aria-pressed={color === c}
                  style={{ width: 30, height: 30, borderRadius: 8, background: c,
                    border: color === c ? `3px solid ${ACC}` : `1px solid ${T.line}` }} />
              ))}
            </div>
            {/* Tools: three brushes, the eraser and the paint bucket, then undo and clear.
                The two groups wrap onto two rows on narrow phones. */}
            <div className="flex items-center gap-2 justify-center flex-wrap">
              <div className="flex items-center gap-1" role="group" aria-label="Tools">
                {[6, 10, 18].map(sz => (
                  <ToolButton key={sz} label={`Brush ${sz}`} on={tool === "brush" && size === sz}
                    onClick={() => { setTool("brush"); setSize(sz) }}>
                    <span style={{ width: sz, height: sz, borderRadius: 999, background: T.text }} />
                  </ToolButton>
                ))}
                <ToolButton label="Eraser" on={tool === "brush" && color === ERASER}
                  onClick={() => { setTool("brush"); setColor(ERASER) }}>
                  <Eraser size={18} color={T.text} strokeWidth={1.6} absoluteStrokeWidth />
                </ToolButton>
                <ToolButton label="Fill" on={tool === "fill"} onClick={() => setTool("fill")}>
                  <LineIcon name="bucket" size={18} color={T.text} />
                </ToolButton>
              </div>
              <div className="flex items-center gap-1">
                <ToolButton label="Undo" disabled={!hasStrokes} onClick={undo}>
                  <Undo2 size={18} color={T.text} strokeWidth={1.6} absoluteStrokeWidth />
                </ToolButton>
                <ToolButton label="Clear" disabled={!hasStrokes} onClick={clear}>
                  <Trash2 size={18} color={T.danger} strokeWidth={1.6} absoluteStrokeWidth />
                </ToolButton>
              </div>
            </div>
            {/* Two lines reserved, so switching tools doesn't move the button below. */}
            <p className="text-xs text-center" aria-live="polite" style={{ color: T.muted, maxWidth: 300, minHeight: 32, margin: 0 }}>
              {tool === "fill"
                ? "Tap an area to fill it. Tap the blank canvas to paint the background."
                : "Draw with a brush, or pick the bucket to fill an area."}
            </p>

            <PrimaryButton onClick={reveal} disabled={!hasStrokes} accent={ACC} style={{ maxWidth: 384 }}>
              {hasStrokes ? "Reveal the real flag →" : "Draw something first"}
            </PrimaryButton>
          </>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-3">
            <ResultCard>
              <ResultHeader icon="sketchflag" accent={grade.c} eyebrow={grade.t}
                title={`${accuracy}% match`} score={`The real ${target.name} flag is laid over your sketch.`} />
            </ResultCard>
            <PrimaryButton onClick={next} accent={ACC}>Next flag →</PrimaryButton>
            <SecondaryButton onClick={onBack}>Home</SecondaryButton>
          </div>
        )}
      </div>
    </div>
  )
}
