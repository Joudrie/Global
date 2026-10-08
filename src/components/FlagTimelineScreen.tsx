import { useState } from "react"
import { CODEX } from "../data/codex"
import type { HistoricalFlag } from "../data/codex"
import { FLAGS } from "../data/flags"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, PrimaryButton, SecondaryButton, choiceLabel } from "./gameUi"
import { timelineFlags, timelineScore } from "../utils/timeline"

interface Props { onBack: () => void }

const ROUNDS = 5
const shuffle = <X,>(a: X[]): X[] => [...a].sort(() => Math.random() - 0.5)
const nameOf = (code: string) => FLAGS.find(f => f.code === code)?.name ?? code

// Countries with a deep enough flag history to order.
const ELIGIBLE = Object.entries(CODEX)
  .map(([code, e]) => ({ code, name: nameOf(code), chrono: timelineFlags(e.flagHistory) }))
  .filter(e => e.chrono.length >= 3 && FLAGS.some(f => f.code === e.code))

interface Round { name: string; chrono: HistoricalFlag[]; shuffled: HistoricalFlag[] }

function buildRounds(): Round[] {
  return shuffle(ELIGIBLE).slice(0, ROUNDS).map(c => ({ name: c.name, chrono: c.chrono, shuffled: shuffle(c.chrono) }))
}

function FlagTile({ src, label, dim, badge, onClick, onDragStart }: { src: string; label?: string; dim?: boolean; badge?: string; onClick?: () => void; onDragStart?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className={onClick ? "geo-tap" : ""} aria-label={label} aria-hidden={label ? undefined : true}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      style={{ position: "relative", width: 60, height: 40, borderRadius: 6, overflow: "hidden", border: `1px solid ${T.line}`, background: "#fff", opacity: dim ? 0.32 : 1, flexShrink: 0, cursor: onDragStart ? "grab" : undefined }}>
      <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={e => { (e.target as HTMLImageElement).style.opacity = "0.2" }} />
      {badge && <span style={{ position: "absolute", top: -6, left: -6, width: 16, height: 16, borderRadius: "50%", background: ACCENT.learn, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.mono }}>{badge}</span>}
    </button>
  )
}

function TimelineGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [rounds] = useState(buildRounds)
  const [idx, setIdx] = useState(0)
  const [order, setOrder] = useState<number[]>([])   // indices into round.shuffled, in tap order (oldest→newest)
  const [locked, setLocked] = useState(false)
  const [scores, setScores] = useState<number[]>([])
  const [done, setDone] = useState(false)

  const round = rounds[idx]
  const placed = new Set(order)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const tap = (i: number) => { if (locked || placed.has(i)) return; setOrder(o => [...o, i]) }
  const undo = () => { if (locked) return; setOrder(o => o.slice(0, -1)) }
  const dropToStrip = () => { if (dragIdx !== null) { tap(dragIdx); setDragIdx(null) } }

  const lockIn = () => {
    if (locked) return
    const correct = timelineScore(round.chrono, order.map(i => round.shuffled[i]))
    setScores(s => [...s, correct])
    setLocked(true)
  }

  const next = () => {
    if (idx + 1 >= rounds.length) { setDone(true); return }
    setIdx(i => i + 1); setOrder([]); setLocked(false)
  }

  if (done) {
    const total = scores.reduce((a, b) => a + b, 0)
    const max = rounds.reduce((a, r) => a + r.chrono.length, 0)
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
        <ScreenHeader title="Flag Timeline" subtitle="Round complete" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ResultCard>
            <ResultHeader icon="hourglass" accent={ACCENT.learn}
              title={`${total} of ${max} in the right era`}
              score="Flags placed in the correct order" />
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={ACCENT.learn}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  const allPlaced = order.length === round.chrono.length

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <ScreenHeader title="Flag Timeline" subtitle={round.name} onBack={onBack}
        right={<HeaderStat accent={ACCENT.learn}>{idx + 1} / {ROUNDS}</HeaderStat>} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 18px 24px", gap: 18 }}>
        <p style={{ color: T.muted, fontSize: 12.5, textAlign: "center", maxWidth: 300 }}>
          Tap <i>or drag</i> the flags in order — <b style={{ color: ACCENT.learn }}>oldest → newest</b>.
        </p>

        {/* ordered slots */}
        <div onDragOver={e => { if (!locked) e.preventDefault() }} onDrop={dropToStrip}
          style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center", minHeight: 52, padding: "4px 8px", borderRadius: 10, outline: dragIdx !== null ? `1.5px dashed ${tint(ACCENT.learn, 0.5)}` : "none" }}>
          {round.chrono.map((_, pos) => {
            const shufIdx = order[pos]
            const filled = shufIdx !== undefined
            const correct = locked && filled && round.shuffled[shufIdx].fromYear === round.chrono[pos].fromYear
            return (
              <div key={pos} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {pos > 0 && <span style={{ color: T.dim, fontSize: 13 }}>→</span>}
                <div style={{ position: "relative", width: 60, height: 40, borderRadius: 6, border: `1.5px ${filled ? "solid" : "dashed"} ${locked ? (correct ? ACCENT.learn : T.warm) : filled ? T.lineHi : T.line}`, overflow: "hidden", background: filled ? "#fff" : tint(ACCENT.learn, 0.05), display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {filled
                    ? <img src={round.shuffled[shufIdx].flagUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.opacity = "0.2" }} />
                    : <span style={{ color: T.dim, fontSize: 11, fontFamily: FONT.mono }}>{pos + 1}</span>}
                  {locked && filled && <span style={{ position: "absolute", bottom: 1, right: 2, fontSize: 13, fontWeight: 800, color: correct ? ACCENT.learn : T.warm }}>{correct ? "✓" : "✗"}</span>}
                </div>
              </div>
            )
          })}
        </div>

        {locked && (
          <div className="geo-micro" style={{ fontSize: 11, color: T.muted }}>Correct order with years</div>
        )}
        {locked && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 340 }}>
            {round.chrono.map((h, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 10, background: T.surface, border: `1px solid ${T.line}` }}>
                <FlagTile src={h.flagUrl} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: FONT.mono, fontSize: 11, color: ACCENT.learn }}>{h.fromYear ?? "?"}{h.toYear ? `–${h.toYear}` : "–now"}</div>
                  <div style={{ color: T.muted, fontSize: 10.5, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{h.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* pickable flags */}
        {!locked && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
            {round.shuffled.map((h, i) => (
              <FlagTile key={i} src={h.flagUrl} dim={placed.has(i)} badge={placed.has(i) ? String(order.indexOf(i) + 1) : undefined}
                label={placed.has(i) ? `${choiceLabel(i, round.shuffled.length)}, placed ${order.indexOf(i) + 1}` : choiceLabel(i, round.shuffled.length)}
                onClick={placed.has(i) ? undefined : () => tap(i)}
                onDragStart={placed.has(i) ? undefined : () => setDragIdx(i)} />
            ))}
          </div>
        )}

        <div style={{ marginTop: "auto", width: "100%", maxWidth: 340, display: "flex", gap: 10 }}>
          {!locked && order.length > 0 && (
            <SecondaryButton onClick={undo} style={{ flex: 1, width: "auto" }}>Undo</SecondaryButton>
          )}
          {!locked
            ? <PrimaryButton onClick={lockIn} disabled={!allPlaced} accent={ACCENT.learn} style={{ flex: 2, width: "auto" }}>{allPlaced ? "Lock in" : `Place all ${round.chrono.length}`}</PrimaryButton>
            : <PrimaryButton onClick={next} accent={ACCENT.learn} style={{ flex: 1, width: "auto" }}>{idx + 1 >= ROUNDS ? "See result →" : "Next →"}</PrimaryButton>}
        </div>
      </div>
    </div>
  )
}

export default function FlagTimelineScreen({ onBack }: Props) {
  const [k, setK] = useState(0)
  return <TimelineGame key={k} onBack={onBack} onReplay={() => setK(n => n + 1)} />
}
