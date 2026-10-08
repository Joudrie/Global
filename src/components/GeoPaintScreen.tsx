import { useState } from "react"
import { PAINT_PUZZLES } from "../data/paintPuzzles"
import type { PaintPuzzle, PaintLayout } from "../data/paintPuzzles"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"
import FlagImage from "./FlagImage"

const ACC = ACCENT.challenge

interface Props { onBack: () => void }

// ── Colour maths ──────────────────────────────────────────────────────────────
type RGB = [number, number, number]

function hslToRgb(h: number, s: number, l: number): RGB {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))]
}
function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase()
}
function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "")
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
// Perceptual-ish "redmean" distance → 0–100 accuracy (100 = identical).
const MAX_DIST = Math.sqrt((2 + 255 / 256) * 255 * 255 + 4 * 255 * 255 + 2 * 255 * 255)
function accuracyOf(a: RGB, b: RGB): number {
  const rmean = (a[0] + b[0]) / 2
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2]
  const dist = Math.sqrt((2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db)
  return Math.max(0, Math.round(100 * (1 - dist / MAX_DIST)))
}
function gradeOf(a: number): { t: string; c: string } {
  if (a >= 96) return { t: "Perfect!", c: T.green }
  if (a >= 88) return { t: "Excellent", c: T.green }
  if (a >= 75) return { t: "Great", c: ACC }
  if (a >= 55) return { t: "Close", c: T.amber }
  return { t: "Way off", c: T.danger }
}

// ── Puzzle dealing (no-repeat bag) ────────────────────────────────────────────
function shuffle<X>(arr: X[]): X[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
function makeDealer() {
  let bag: PaintPuzzle[] = []
  return (): PaintPuzzle => { if (!bag.length) bag = shuffle(PAINT_PUZZLES); return bag.pop() as PaintPuzzle }
}
const deal = makeDealer()

function randomStart() {
  return { h: Math.floor(Math.random() * 360), s: 30 + Math.floor(Math.random() * 60), l: 30 + Math.floor(Math.random() * 45) }
}

// ── Flag renderer (plain SVG so we can paint a single region live) ─────────────
function FlagSVG({ layout, colors }: { layout: PaintLayout; colors: Record<string, string> }) {
  const W = 240, H = 160
  let body: React.ReactNode
  if (layout === "nordic") {
    const t = 27, vx = 58
    body = <>
      <rect width={W} height={H} fill={colors.field} />
      <rect x={vx} width={t} height={H} fill={colors.cross} />
      <rect y={(H - t) / 2} width={W} height={t} fill={colors.cross} />
    </>
  } else if (layout === "v3") {
    body = <>
      <rect width={W / 3} height={H} fill={colors.left} />
      <rect x={W / 3} width={W / 3} height={H} fill={colors.center} />
      <rect x={2 * W / 3} width={W / 3} height={H} fill={colors.right} />
    </>
  } else if (layout === "h3") {
    body = <>
      <rect width={W} height={H / 3} fill={colors.top} />
      <rect y={H / 3} width={W} height={H / 3} fill={colors.middle} />
      <rect y={2 * H / 3} width={W} height={H / 3} fill={colors.bottom} />
    </>
  } else if (layout === "h2") {
    body = <>
      <rect width={W} height={H / 2} fill={colors.top} />
      <rect y={H / 2} width={W} height={H / 2} fill={colors.bottom} />
    </>
  } else {
    body = <>
      <rect width={W} height={H} fill={colors.field} />
      <circle cx={W / 2} cy={H / 2} r={H * 0.28} fill={colors.disc} />
    </>
  }
  return <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" shapeRendering="crispEdges" style={{ display: "block" }}>{body}</svg>
}

function FlagFrame({ layout, colors }: { layout: PaintLayout; colors: Record<string, string> }) {
  return (
    <div style={{ width: "100%", aspectRatio: "3 / 2", borderRadius: 10, overflow: "hidden", border: `1px solid ${T.line}`, boxShadow: `0 8px 24px -12px ${tint(T.text, 0.5)}` }}>
      <FlagSVG layout={layout} colors={colors} />
    </div>
  )
}

// ── Slider ────────────────────────────────────────────────────────────────────
function Slider({ label, value, max, onChange, track, badge }: {
  label: string; value: number; max: number; onChange: (v: number) => void; track: string; badge: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: T.muted }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: T.text, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" }}>{Math.round(value)}{badge}</span>
      </div>
      <div style={{ height: 12, borderRadius: 999, background: track, border: `1px solid ${T.line}` }} />
      <input type="range" min={0} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: ACC, marginTop: 4 }} />
    </div>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function GeoPaintScreen({ onBack }: Props) {
  const [puzzle, setPuzzle] = useState<PaintPuzzle>(deal)
  const [hsl, setHSL] = useState(randomStart)
  const [phase, setPhase] = useState<"play" | "result">("play")
  const [rounds, setRounds] = useState(0)
  const [totalScore, setTotalScore] = useState(0)

  const { h, s, l } = hsl
  const playerRgb = hslToRgb(h, s, l)
  const playerHex = rgbToHex(playerRgb)
  const targetHex = puzzle.colors[puzzle.target]
  const accuracy = accuracyOf(playerRgb, hexToRgb(targetHex))
  const grade = gradeOf(accuracy)

  // The flag the player sees: target slot is their colour while playing.
  const liveColors = { ...puzzle.colors, [puzzle.target]: playerHex }

  const check = () => { setPhase("result"); setRounds(r => r + 1); setTotalScore(t => t + accuracy) }
  const next = () => { setPuzzle(deal()); setHSL(randomStart()); setPhase("play") }

  const avg = rounds ? Math.round(totalScore / rounds) : 0
  const hueTrack = "linear-gradient(to right,hsl(0,90%,55%),hsl(60,90%,55%),hsl(120,90%,55%),hsl(180,90%,55%),hsl(240,90%,55%),hsl(300,90%,55%),hsl(360,90%,55%))"
  const satTrack = `linear-gradient(to right,hsl(${h},0%,${l}%),hsl(${h},100%,${l}%))`
  const lightTrack = `linear-gradient(to right,#000,hsl(${h},${s}%,50%),#fff)`

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="GeoPaint" subtitle={rounds ? `avg ${avg}% · round ${rounds + (phase === "play" ? 1 : 0)}` : "Match the colour"} onBack={onBack} />

      {phase === "play" ? (
        <div className="flex-1 flex flex-col items-center px-5 pt-2 pb-10 gap-5">
          <p className="text-sm text-center" style={{ color: T.muted }}>
            Slide to paint <span style={{ color: T.text, fontWeight: 700 }}>{puzzle.targetLabel}</span> of the{" "}
            <span style={{ color: ACC, fontWeight: 800, fontFamily: FONT.display }}>{puzzle.name}</span> flag.
          </p>

          <div style={{ width: "100%", maxWidth: 260 }}>
            <FlagFrame layout={puzzle.layout} colors={liveColors} />
          </div>

          {/* Current colour chip */}
          <div className="flex items-center gap-3">
            <div style={{ width: 34, height: 34, borderRadius: 8, background: playerHex, border: `1px solid ${T.line}` }} />
            <span className="text-sm font-bold" style={{ color: T.muted, fontFamily: FONT.mono }}>{playerHex}</span>
          </div>

          {/* Sliders */}
          <div className="w-full max-w-sm flex flex-col gap-5">
            <Slider label="Hue" value={h} max={360} badge="°" track={hueTrack} onChange={v => setHSL(c => ({ ...c, h: v }))} />
            <Slider label="Saturation" value={s} max={100} badge="%" track={satTrack} onChange={v => setHSL(c => ({ ...c, s: v }))} />
            <Slider label="Lightness" value={l} max={100} badge="%" track={lightTrack} onChange={v => setHSL(c => ({ ...c, l: v }))} />
          </div>

          <PrimaryButton onClick={check} accent={ACC} style={{ maxWidth: 384 }}>Check my colour →</PrimaryButton>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center px-5 pt-2 pb-10 gap-4">
          {/* Score */}
          <ResultCard style={{ width: "100%", maxWidth: 384 }}>
            <ResultHeader icon="geopaint" accent={grade.c} eyebrow={grade.t}
              title={`${accuracy}% accurate`} score={`${puzzle.targetLabel} of ${puzzle.name}`} />
          </ResultCard>

          {/* Yours vs actual */}
          <div className="w-full max-w-sm flex gap-3">
            {[
              { lbl: "Your colour", hex: playerHex },
              { lbl: "Actual colour", hex: targetHex },
            ].map(sw => (
              <div key={sw.lbl} className="flex-1 rounded-xl overflow-hidden" style={{ border: `1px solid ${T.line}` }}>
                <div style={{ height: 52, background: sw.hex }} />
                <div style={{ background: T.surface, padding: "7px 10px" }}>
                  <div className="text-xs font-semibold" style={{ color: T.muted }}>{sw.lbl}</div>
                  <div className="text-xs font-bold" style={{ color: T.text, fontFamily: FONT.mono }}>{sw.hex}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Your paint vs the real flag */}
          <div className="w-full max-w-sm flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs font-semibold mb-1.5 text-center" style={{ color: T.muted }}>Your paint</div>
              <FlagFrame layout={puzzle.layout} colors={liveColors} />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold mb-1.5 text-center" style={{ color: T.muted }}>The real flag</div>
              <div style={{ aspectRatio: "3 / 2", borderRadius: 10, overflow: "hidden", border: `1px solid ${T.line}`, background: T.surfaceHi }}>
                <FlagImage code={puzzle.code} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-sm mt-1">
            <PrimaryButton onClick={next} accent={ACC}>Next flag →</PrimaryButton>
            <SecondaryButton onClick={onBack}>Home</SecondaryButton>
          </div>
        </div>
      )}
    </div>
  )
}
