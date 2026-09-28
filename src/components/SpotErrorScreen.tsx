import { useState } from "react"
import { PAINT_PUZZLES } from "../data/paintPuzzles"
import type { PaintPuzzle, PaintLayout } from "../data/paintPuzzles"
import { colorName } from "../utils/color"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"

const ACC = ACCENT.play

interface Props { onBack: () => void }

// A palette of believable, vivid flag colours used to corrupt one region.
const WRONG = ["#D52B1E", "#FF7A00", "#FFD500", "#1EA84A", "#0A7E8C", "#0047AB", "#6B2FB3", "#E84393", "#111111", "#FFFFFF"]

// Clickable flag renderer — each region is a hit target. `bad`/`reveal` drive the
// result highlight (red ring on the error, green ring once revealed).
function ClickFlag({ layout, colors, onPick, picked, errorSlot, revealed }: {
  layout: PaintLayout
  colors: Record<string, string>
  onPick?: (slot: string) => void
  picked?: string | null
  errorSlot?: string
  revealed?: boolean
}) {
  const W = 300, H = 200
  const ringOf = (slot: string): string | undefined => {
    if (!revealed) return picked === slot ? tint(T.text, 0.5) : undefined
    if (slot === errorSlot) return T.green
    if (slot === picked && picked !== errorSlot) return T.danger
    return undefined
  }
  const Region = ({ slot, x, y, w, h, circle }: { slot: string; x: number; y: number; w: number; h: number; circle?: boolean }) => {
    const ring = ringOf(slot)
    return (
      <g onClick={() => onPick?.(slot)} style={{ cursor: onPick ? "pointer" : "default" }}>
        {circle
          ? <circle cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) / 2} fill={colors[slot]} />
          : <rect x={x} y={y} width={w} height={h} fill={colors[slot]} />}
        {ring && (circle
          ? <circle cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) / 2 - 3} fill="none" stroke={ring} strokeWidth={5} />
          : <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} fill="none" stroke={ring} strokeWidth={5} />)}
      </g>
    )
  }
  let regions: React.ReactNode
  if (layout === "nordic") {
    const t = 34, vx = 70
    regions = <>
      <Region slot="field" x={0} y={0} w={W} h={H} />
      <Region slot="cross" x={vx} y={0} w={t} h={H} />
      <Region slot="cross" x={0} y={(H - t) / 2} w={W} h={t} />
    </>
  } else if (layout === "v3") {
    regions = <>
      <Region slot="left" x={0} y={0} w={W / 3} h={H} />
      <Region slot="center" x={W / 3} y={0} w={W / 3} h={H} />
      <Region slot="right" x={2 * W / 3} y={0} w={W / 3} h={H} />
    </>
  } else if (layout === "h3") {
    regions = <>
      <Region slot="top" x={0} y={0} w={W} h={H / 3} />
      <Region slot="middle" x={0} y={H / 3} w={W} h={H / 3} />
      <Region slot="bottom" x={0} y={2 * H / 3} w={W} h={H / 3} />
    </>
  } else if (layout === "h2") {
    regions = <>
      <Region slot="top" x={0} y={0} w={W} h={H / 2} />
      <Region slot="bottom" x={0} y={H / 2} w={W} h={H / 2} />
    </>
  } else {
    regions = <>
      <Region slot="field" x={0} y={0} w={W} h={H} />
      <Region slot="disc" x={W / 2 - H * 0.28} y={H / 2 - H * 0.28} w={H * 0.56} h={H * 0.56} circle />
    </>
  }
  return (
    <div style={{ width: "100%", aspectRatio: "3 / 2", borderRadius: 10, overflow: "hidden", border: `1px solid ${T.line}`, boxShadow: `0 8px 24px -12px ${tint(T.text, 0.5)}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" shapeRendering="crispEdges" style={{ display: "block" }}>{regions}</svg>
    </div>
  )
}

// Build a round: pick a puzzle, corrupt one region with a clearly-wrong colour.
function makeRound(pz: PaintPuzzle) {
  const slots = Object.keys(pz.colors)
  const errorSlot = slots[Math.floor(Math.random() * slots.length)]
  // Exclude every region's colour, not just the corrupted slot's own — otherwise
  // the "wrong" colour can match a neighbouring band, leaving no spottable error.
  const usedNames = new Set(slots.map(s => colorName(pz.colors[s])))
  const choices = WRONG.filter(c => !usedNames.has(colorName(c)))
  const wrongHex = choices[Math.floor(Math.random() * choices.length)]
  return { pz, errorSlot, wrongHex, shown: { ...pz.colors, [errorSlot]: wrongHex } }
}

function shuffle<X>(arr: X[]): X[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
function makeDealer() {
  let bag: PaintPuzzle[] = []
  return () => { if (!bag.length) bag = shuffle(PAINT_PUZZLES); return makeRound(bag.pop() as PaintPuzzle) }
}
const deal = makeDealer()

export default function SpotErrorScreen({ onBack }: Props) {
  const [round, setRound] = useState(deal)
  const [picked, setPicked] = useState<string | null>(null)
  const [phase, setPhase] = useState<"play" | "result">("play")
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)

  const { pz, errorSlot, shown } = round
  const correct = picked === errorSlot
  // Striped flags have bands; Nordic crosses and discs (Japan, Bangladesh) don't.
  const part = pz.layout === "v3" || pz.layout === "h3" || pz.layout === "h2" ? "band" : "part"

  const pick = (slot: string) => { if (phase === "play") setPicked(slot) }
  const submit = () => {
    if (!picked) return
    setPhase("result")
    if (picked === errorSlot) { setScore(s => s + 1); setStreak(s => s + 1) } else setStreak(0)
  }
  const next = () => { setRound(deal()); setPicked(null); setPhase("play") }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Spot the Error" subtitle={`streak ${streak} · ${score} correct`} onBack={onBack} />

      <div className="flex-1 flex flex-col items-center px-5 pt-2 pb-10 gap-5">
        <p className="text-sm text-center" style={{ color: T.muted }}>
          One {part} of the <span style={{ color: ACC, fontWeight: 800, fontFamily: FONT.display }}>{pz.name}</span> flag is the{" "}
          <span style={{ color: T.text, fontWeight: 700 }}>wrong colour</span>. Tap it.
        </p>

        <div style={{ width: "100%", maxWidth: 320 }}>
          <ClickFlag layout={pz.layout} colors={phase === "result" ? pz.colors : shown}
            onPick={phase === "play" ? pick : undefined}
            picked={picked} errorSlot={errorSlot} revealed={phase === "result"} />
        </div>

        {phase === "play" ? (
          <button onClick={submit} disabled={!picked}
            className="w-full max-w-sm py-3.5 rounded-xl font-bold transition-all active:scale-95"
            style={{ background: picked ? ACC : T.surface, border: picked ? "none" : `1px solid ${T.line}`,
              color: picked ? T.onAccent : T.dim, cursor: picked ? "pointer" : "not-allowed", fontFamily: FONT.display }}>
            {picked ? "Lock it in →" : `Tap the wrong ${part}`}
          </button>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-3">
            <div className="rounded-2xl p-4 text-center" style={{ background: T.surface, border: `1px solid ${tint(correct ? T.green : T.danger, 0.4)}` }}>
              <div className="text-lg font-black" style={{ color: correct ? T.green : T.danger, fontFamily: FONT.display }}>
                {correct ? "Correct!" : "Not quite"}
              </div>
              <div className="text-xs mt-1" style={{ color: T.muted }}>
                The flag is now corrected. That {part} should be{" "}
                <span style={{ color: T.text, fontWeight: 700 }}>{colorName(pz.colors[errorSlot])}</span>.
              </div>
            </div>
            <button onClick={next}
              className="w-full py-3.5 rounded-xl font-bold transition-all active:scale-95"
              style={{ background: ACC, color: T.onAccent, fontFamily: FONT.display }}>
              Next flag →
            </button>
            <button onClick={onBack}
              className="w-full py-3.5 rounded-xl font-bold transition-all active:scale-95"
              style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>
              ← Home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
