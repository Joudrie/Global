import { useRef, useState, useEffect, useCallback } from "react"
import { PAINT_PUZZLES } from "../data/paintPuzzles"
import { colorAccuracy } from "../utils/color"
import type { RGB } from "../utils/color"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"
import { Undo2, Eraser, Trash2 } from "lucide-react"

const ACC = ACCENT.play
const W = 300, H = 200

// Simple, well-known flags are the fun ones to draw from memory.
const TARGETS = PAINT_PUZZLES.map(p => ({ code: p.code, name: p.name }))

const PAINTS = ["#C8102E", "#FF7A00", "#FCD116", "#1EA84A", "#0055A4", "#2B2D77", "#111111", "#FFFFFF"]

interface Stroke { color: string; size: number; pts: { x: number; y: number }[] }

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
  const [phase, setPhase] = useState<"draw" | "result">("draw")
  const [accuracy, setAccuracy] = useState(0)
  const [, force] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<Stroke[]>([])
  const drawingRef = useRef(false)
  const realDataRef = useRef<RGB[] | null>(null)

  // Paint the whole sketch (white ground + strokes) onto the canvas.
  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, W, H)
    ctx.lineJoin = ctx.lineCap = "round"
    for (const s of strokesRef.current) {
      ctx.strokeStyle = s.color; ctx.lineWidth = s.size; ctx.fillStyle = s.color
      if (s.pts.length === 1) { ctx.beginPath(); ctx.arc(s.pts[0].x, s.pts[0].y, s.size / 2, 0, 7); ctx.fill(); continue }
      ctx.beginPath(); ctx.moveTo(s.pts[0].x, s.pts[0].y)
      for (const p of s.pts.slice(1)) ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
  }, [])

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
  const down = (e: React.PointerEvent) => {
    if (phase !== "draw") return
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    drawingRef.current = true
    strokesRef.current.push({ color, size, pts: [toCanvas(e)] })
    redraw(); force(n => n + 1)
  }
  const move = (e: React.PointerEvent) => {
    if (!drawingRef.current) return
    strokesRef.current[strokesRef.current.length - 1].pts.push(toCanvas(e))
    redraw()
  }
  const up = () => { drawingRef.current = false }

  const undo = () => { strokesRef.current.pop(); redraw(); force(n => n + 1) }
  const clear = () => { strokesRef.current = []; redraw(); force(n => n + 1) }

  const reveal = () => {
    const ctx = canvasRef.current?.getContext("2d")
    const real = realDataRef.current
    if (ctx && real) {
      const mine = grid(ctx.getImageData(0, 0, W, H), 30, 20)
      const avg = mine.reduce((s, c, i) => s + colorAccuracy(c, real[i]), 0) / mine.length
      // Score only what the drawing adds over a blank white canvas, so a dot
      // on Japan's white field isn't "83%".
      const blank = real.reduce((s, c) => s + colorAccuracy(WHITE, c), 0) / real.length
      setAccuracy(blank >= 100 ? Math.round(avg) : Math.max(0, Math.round((avg - blank) / (100 - blank) * 100)))
    } else setAccuracy(0)
    setPhase("result")
  }
  const next = () => { strokesRef.current = []; setTarget(deal()); setPhase("draw"); force(n => n + 1) }

  const grade = gradeOf(accuracy)
  const hasStrokes = strokesRef.current.length > 0

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
          <canvas ref={canvasRef} width={W} height={H}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "crosshair" }} />
          {phase === "result" && (
            <img src={`/flags/${target.code.toLowerCase()}.svg`} alt={target.name}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.5, pointerEvents: "none" }} />
          )}
        </div>

        {phase === "draw" ? (
          <>
            {/* Paints */}
            <div className="flex flex-wrap gap-2 justify-center" style={{ maxWidth: 340 }}>
              {PAINTS.map(c => (
                <button key={c} onClick={() => setColor(c)} aria-label={`paint ${c}`}
                  style={{ width: 30, height: 30, borderRadius: 8, background: c,
                    border: color === c ? `3px solid ${ACC}` : `1px solid ${T.line}`,
                    boxShadow: color === c ? `0 0 10px ${tint(ACC, 0.6)}` : "none" }} />
              ))}
            </div>
            {/* Tools */}
            <div className="flex items-center gap-2 justify-center flex-wrap">
              {[6, 10, 18].map(sz => (
                <button key={sz} onClick={() => setSize(sz)}
                  className="flex items-center justify-center" aria-label={`brush ${sz}`}
                  style={{ width: 38, height: 34, borderRadius: 9, background: size === sz ? tint(ACC, 0.18) : T.surface, border: `1px solid ${size === sz ? ACC : T.line}` }}>
                  <span style={{ width: sz, height: sz, borderRadius: 999, background: T.text }} />
                </button>
              ))}
              <button onClick={() => setColor("#FFFFFF")} className="flex items-center justify-center" aria-label="eraser"
                style={{ width: 38, height: 34, borderRadius: 9, background: color === "#FFFFFF" ? tint(ACC, 0.18) : T.surface, border: `1px solid ${color === "#FFFFFF" ? ACC : T.line}` }}>
                <Eraser size={17} color={T.text} strokeWidth={1.7} />
              </button>
              <button onClick={undo} disabled={!hasStrokes} className="flex items-center justify-center" aria-label="undo"
                style={{ width: 38, height: 34, borderRadius: 9, background: T.surface, border: `1px solid ${T.line}`, opacity: hasStrokes ? 1 : 0.4 }}>
                <Undo2 size={17} color={T.text} strokeWidth={1.7} />
              </button>
              <button onClick={clear} disabled={!hasStrokes} className="flex items-center justify-center" aria-label="clear"
                style={{ width: 38, height: 34, borderRadius: 9, background: T.surface, border: `1px solid ${T.line}`, opacity: hasStrokes ? 1 : 0.4 }}>
                <Trash2 size={17} color={T.danger} strokeWidth={1.7} />
              </button>
            </div>

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
