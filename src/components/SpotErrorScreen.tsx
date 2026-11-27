import { useEffect, useId, useState } from "react"
import type { KeyboardEvent, MouseEvent } from "react"
import { makeDealer, isHit, LEVEL_NAME, VIEW_W, VIEW_H } from "../utils/spotError"
import type { HitBox, SpotRound } from "../utils/spotError"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { FlagLoadFailed, HeaderStat, MAX_FLAG_RETRIES, ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"

const ACC = ACCENT.play

interface Props { onBack: () => void }

// Best streak. A number, so mergeProgress's best-score rule keeps the higher one.
const BEST_KEY = "globalio_spoterror_best"
const loadBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 } }
const saveBest = (n: number) => { try { localStorage.setItem(BEST_KEY, String(n)) } catch { /* ignore */ } }

type Point = { x: number; y: number }

// Rounded corners only where the box stands clear of the flag's edges.
const inside = (h: HitBox) => h.x > 0 && h.y > 0 && h.x + h.w < VIEW_W && h.y + h.h < VIEW_H

type Paint = { fill?: string; stroke?: string; strokeWidth?: number; vectorEffect?: "non-scaling-stroke" }

// The shape of a hit box, drawn in viewBox units.
function Shape({ h, ...paint }: { h: HitBox } & Paint) {
  return h.round
    ? <ellipse cx={h.x + h.w / 2} cy={h.y + h.h / 2} rx={h.w / 2} ry={h.h / 2} {...paint} />
    : <rect x={h.x} y={h.y} width={h.w} height={h.h} rx={inside(h) ? 8 : 0} {...paint} />
}

// The error, circled: a rust outline with a white halo around the region. Only
// the outside edge is drawn, so overlapping boxes (a cross's two arms) read as
// one shape, and nothing covers the flag, so its colours stay true.
function ErrorMark({ hits }: { hits: HitBox[] }) {
  const id = useId().replace(/:/g, "")
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <defs>
        <mask id={`out-${id}`} maskUnits="userSpaceOnUse" x={0} y={0} width={VIEW_W} height={VIEW_H}>
          <rect width={VIEW_W} height={VIEW_H} fill="#fff" />
          {hits.map((h, i) => <Shape key={i} h={h} fill="#000" />)}
        </mask>
      </defs>
      <g mask={`url(#out-${id})`} fill="none">
        {hits.map((h, i) => <Shape key={`w${i}`} h={h} stroke="#fff" strokeWidth={13} vectorEffect="non-scaling-stroke" />)}
        {hits.map((h, i) => <Shape key={`r${i}`} h={h} stroke={T.danger} strokeWidth={7} vectorEffect="non-scaling-stroke" />)}
      </g>
    </svg>
  )
}

// Where the player tapped: a fixed-size ring, whatever size the flag is drawn,
// kept whole inside the frame even for a tap right at the edge.
function TapMark({ at }: { at: Point }) {
  return (
    <span aria-hidden style={{
      position: "absolute",
      left: `clamp(10px, ${(at.x / VIEW_W) * 100}%, calc(100% - 10px))`,
      top: `clamp(10px, ${(at.y / VIEW_H) * 100}%, calc(100% - 10px))`,
      width: 20, height: 20, marginLeft: -10, marginTop: -10, borderRadius: 999, pointerEvents: "none",
      border: "3px solid #fff", boxShadow: `0 0 0 2px ${T.text}, inset 0 0 0 2px ${T.text}`,
    }} />
  )
}

// A flag in the artwork's 4:3 frame, so viewBox units map straight onto it.
function FlagFrame({ src, paint, hits, tap, onLoad, onError }: {
  src: string
  paint?: SpotRound["paint"]
  hits?: HitBox[]
  tap?: Point | null
  onLoad?: () => void
  onError?: () => void
}) {
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: `${VIEW_W} / ${VIEW_H}`, borderRadius: 10, overflow: "hidden",
      border: `1px solid ${T.line}`, background: T.surfaceHi }}>
      <img src={src} alt="" draggable={false} onLoad={onLoad} onError={onError}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      {paint && (
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" aria-hidden
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {/* half a unit of overlap so no sliver of the real colour shows at the edges */}
          {paint.flatMap(({ color, boxes }, i) => boxes.map((b, j) =>
            <rect key={`${i}-${j}`} x={b.x - 0.5} y={b.y - 0.5} width={b.w + 1} height={b.h + 1} fill={color} />))}
        </svg>
      )}
      {hits && <ErrorMark hits={hits} />}
      {tap && <TapMark at={tap} />}
    </div>
  )
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const KEY_STEP = 20

function SpotErrorGame({ onBack }: Props) {
  const [deal] = useState(() => makeDealer())
  const [round, setRound] = useState<SpotRound>(() => deal(0))
  const [tap, setTap] = useState<Point | null>(null)
  const [phase, setPhase] = useState<"play" | "result">("play")
  const [loaded, setLoaded] = useState(false)
  const [fails, setFails] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(loadBest)

  // Have the genuine flag ready for the reveal.
  useEffect(() => { const img = new Image(); img.src = round.real }, [round.real])

  const found = tap !== null && isHit(round, tap.x, tap.y)

  const place = (p: Point) => { if (phase === "play" && loaded) setTap({ x: clamp(p.x, 0, VIEW_W), y: clamp(p.y, 0, VIEW_H) }) }
  const onFlagClick = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    place({ x: ((e.clientX - r.left) / r.width) * VIEW_W, y: ((e.clientY - r.top) / r.height) * VIEW_H })
  }
  // Keyboard: arrows move the marker (it starts in the middle), Enter locks it in.
  const onFlagKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (d) {
      e.preventDefault()
      const at = tap ?? { x: VIEW_W / 2, y: VIEW_H / 2 }
      place(tap ? { x: at.x + d[0] * KEY_STEP, y: at.y + d[1] * KEY_STEP } : at)
    } else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); submit() }
  }

  const submit = () => {
    if (!tap || phase !== "play") return
    setPhase("result")
    if (isHit(round, tap.x, tap.y)) {
      const s = streak + 1
      setScore(n => n + 1); setStreak(s)
      if (s > best) { setBest(s); saveBest(s) }
    } else setStreak(0)
  }
  const newRound = (r: SpotRound) => { setRound(r); setTap(null); setPhase("play"); setLoaded(false) }
  const next = () => newRound(deal(streak))
  // A flag that won't load is swapped for another (nothing is scored).
  const onError = () => { setFails(f => f + 1); newRound(deal(streak)) }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Spot the Error" subtitle={`${score} found · best streak ${best}`} onBack={onBack}
        right={<HeaderStat label="Streak" accent={ACC}>{streak}</HeaderStat>} />

      <div className="flex-1 flex flex-col items-center px-5 pt-2 pb-10 gap-4">
        {fails >= MAX_FLAG_RETRIES ? (
          <FlagLoadFailed accent={ACC} onBack={onBack} onRetry={() => { setFails(0); newRound(deal(streak)) }} />
        ) : (
          <>
            {/* Room for a two-line name, so the flag sits at the same height every round. */}
            <div className="w-full max-w-sm text-center" style={{ minHeight: 64 }}>
              <div className="geo-micro" style={{ fontSize: 11, color: ACC }}>{LEVEL_NAME[round.level]}</div>
              <p className="text-sm" style={{ color: T.muted, marginTop: 4, lineHeight: 1.45 }}>
                One detail of the <span style={{ color: T.text, fontWeight: 800, fontFamily: FONT.display }}>{round.name}</span> flag is wrong.
              </p>
            </div>

            {phase === "play" ? (
              <>
                <div className="w-full max-w-sm" style={{ position: "relative" }}>
                  <div role="application" tabIndex={0} aria-label={`The ${round.name} flag. Tap where it's wrong, or use the arrow keys and Enter.`}
                    onClick={onFlagClick} onKeyDown={onFlagKey} data-flag
                    style={{ cursor: loaded ? "crosshair" : "progress", borderRadius: 10, boxShadow: `0 8px 24px -12px ${tint(T.text, 0.5)}`, touchAction: "manipulation" }}>
                    <FlagFrame key={round.id} src={round.src} paint={loaded ? round.paint : undefined} tap={tap}
                      onLoad={() => { setLoaded(true); setFails(0) }} onError={onError} />
                  </div>
                  {!loaded && (
                    <div role="status" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontSize: 13, pointerEvents: "none" }}>
                      Loading flag…
                    </div>
                  )}
                </div>
                <PrimaryButton onClick={submit} disabled={!tap} accent={ACC} style={{ maxWidth: 384 }}>
                  {tap ? "Lock it in →" : "Tap the flag where it's wrong"}
                </PrimaryButton>
              </>
            ) : (
              <div className="w-full max-w-sm flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3" data-reveal>
                  {[{ label: "Doctored", src: round.src, paint: round.paint, tap }, { label: "Real", src: round.real, paint: undefined, tap: null }].map(f => (
                    <figure key={f.label} style={{ margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                      <figcaption className="geo-micro" style={{ fontSize: 11, color: T.muted }}>{f.label}</figcaption>
                      <FlagFrame src={f.src} paint={f.paint} hits={round.hits} tap={f.tap} />
                    </figure>
                  ))}
                </div>
                <ResultCard>
                  <ResultHeader icon={found ? "check" : "spoterror"} accent={found ? T.green : T.danger}
                    title={found ? "Found it" : "Not quite"} score={round.reason} />
                </ResultCard>
                <PrimaryButton onClick={next} accent={ACC}>Next flag →</PrimaryButton>
                <SecondaryButton onClick={onBack}>Home</SecondaryButton>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function SpotErrorScreen({ onBack }: Props) {
  return <SpotErrorGame onBack={onBack} />
}
