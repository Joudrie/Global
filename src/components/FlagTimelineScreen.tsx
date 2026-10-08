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
      style={{ position: "relative", width: 60, height: 40, borderRadius: 6, overflow: "hidden", border: `1px solid ${T.line}`, background: "#fff", flexShrink: 0, cursor: onDragStart ? "grab" : undefined }}>
      <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: dim ? 0.32 : 1 }}
        onError={e => { (e.target as HTMLImageElement).style.opacity = "0.2" }} />
      {badge && <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 20, height: 20, borderRadius: "50%", background: ACCENT.learn, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.mono }}>{badge}</span>}
    </button>
  )
}

function TimelineGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [rounds] = useState(buildRounds)
  const [idx, setIdx] = useState(0)
  // The board, oldest→newest: each slot holds an index into round.shuffled, or
  // null while empty. Tapping a placed flag takes it back out and leaves a gap
  // that the next flag fills, so any flag can be swapped without undoing the rest.
  const [slots, setSlots] = useState<(number | null)[]>(() => rounds[0].chrono.map(() => null))
  const [history, setHistory] = useState<number[]>([])   // placement order, for Undo
  const [locked, setLocked] = useState(false)
  const [scores, setScores] = useState<number[]>([])
  const [done, setDone] = useState(false)

  const round = rounds[idx]
  const placed = new Set(slots.filter((i): i is number => i !== null))
  const slotOf = (i: number) => slots.indexOf(i)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  // Put flag i in slot `pos` (the first gap when none is given). A flag already
  // on the board moves, swapping with whatever was in that slot.
  const placeAt = (i: number, pos?: number) => {
    if (locked) return
    setSlots(sl => {
      const at = pos ?? sl.indexOf(null)
      if (at < 0) return sl
      const next = [...sl]
      const from = next.indexOf(i)
      if (from >= 0) next[from] = next[at]
      next[at] = i
      return next
    })
    setHistory(h => [...h.filter(x => x !== i), i])
  }
  const remove = (i: number) => {
    if (locked) return
    setSlots(sl => sl.map(x => (x === i ? null : x)))
    setHistory(h => h.filter(x => x !== i))
  }
  const tap = (i: number) => (placed.has(i) ? remove(i) : placeAt(i))
  // Undo takes back the most recently placed flag still on the board.
  const undo = () => { const last = [...history].reverse().find(x => placed.has(x)); if (last !== undefined) remove(last) }
  const dropAt = (pos?: number) => { if (dragIdx !== null) { placeAt(dragIdx, pos); setDragIdx(null) } }

  const lockIn = () => {
    if (locked || slots.some(x => x === null)) return
    const correct = timelineScore(round.chrono, slots.map(i => round.shuffled[i!]))
    setScores(s => [...s, correct])
    setLocked(true)
  }

  const next = () => {
    if (idx + 1 >= rounds.length) { setDone(true); return }
    setSlots(rounds[idx + 1].chrono.map(() => null)); setHistory([])
    setIdx(i => i + 1); setLocked(false)
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

  const allPlaced = slots.every(x => x !== null)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <ScreenHeader title="Flag Timeline" subtitle={round.name} onBack={onBack}
        right={<HeaderStat accent={ACCENT.learn}>{idx + 1} / {ROUNDS}</HeaderStat>} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 18px 24px", gap: 18 }}>
        <p style={{ color: T.muted, fontSize: 12.5, textAlign: "center", maxWidth: 300 }}>
          Tap <i>or drag</i> the flags in order — <b style={{ color: ACCENT.learn }}>oldest → newest</b>.
          {placed.size > 0 && !locked && <> Tap a placed flag to take it back.</>}
        </p>

        {/* ordered slots */}
        <div onDragOver={e => { if (!locked) e.preventDefault() }} onDrop={() => dropAt()}
          style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center", minHeight: 52, padding: "4px 8px", borderRadius: 10, outline: dragIdx !== null ? `1.5px dashed ${tint(ACCENT.learn, 0.5)}` : "none" }}>
          {round.chrono.map((_, pos) => {
            const shufIdx = slots[pos]
            const filled = shufIdx !== null
            const correct = locked && filled && round.shuffled[shufIdx].fromYear === round.chrono[pos].fromYear
            const canRemove = filled && !locked
            return (
              <div key={pos} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {pos > 0 && <span style={{ color: T.dim, fontSize: 13 }}>→</span>}
                {/* A placed flag is a button: tap it to send it back. Drop a flag on
                    any slot to put it exactly there. */}
                <button type="button" disabled={!canRemove} onClick={() => canRemove && remove(shufIdx)}
                  className={canRemove ? "geo-tap" : ""}
                  aria-label={filled ? `Slot ${pos + 1}: ${choiceLabel(shufIdx, round.shuffled.length)}${canRemove ? ", tap to take it back" : ""}` : `Slot ${pos + 1}, empty`}
                  draggable={canRemove} onDragStart={canRemove ? () => setDragIdx(shufIdx) : undefined}
                  onDragOver={e => { if (!locked) e.preventDefault() }}
                  onDrop={e => { e.stopPropagation(); dropAt(pos) }}
                  style={{ position: "relative", width: 60, height: 40, padding: 0, borderRadius: 6, border: `1.5px ${filled ? "solid" : "dashed"} ${locked ? (correct ? ACCENT.learn : T.warm) : filled ? T.lineHi : T.line}`, overflow: "hidden", background: filled ? "#fff" : tint(ACCENT.learn, 0.05), display: "flex", alignItems: "center", justifyContent: "center", cursor: canRemove ? "pointer" : "default" }}>
                  {filled
                    ? <img src={round.shuffled[shufIdx].flagUrl} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.opacity = "0.2" }} />
                    : <span style={{ color: T.dim, fontSize: 11, fontFamily: FONT.mono }}>{pos + 1}</span>}
                  {locked && filled && <span style={{ position: "absolute", bottom: 1, right: 2, fontSize: 13, fontWeight: 800, color: correct ? ACCENT.learn : T.warm }}>{correct ? "✓" : "✗"}</span>}
                </button>
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
              <FlagTile key={i} src={h.flagUrl} dim={placed.has(i)} badge={placed.has(i) ? String(slotOf(i) + 1) : undefined}
                label={placed.has(i) ? `${choiceLabel(i, round.shuffled.length)}, in slot ${slotOf(i) + 1}, tap to take it back` : choiceLabel(i, round.shuffled.length)}
                onClick={() => tap(i)}
                onDragStart={() => setDragIdx(i)} />
            ))}
          </div>
        )}

        <div style={{ marginTop: "auto", width: "100%", maxWidth: 340, display: "flex", gap: 10 }}>
          {!locked && placed.size > 0 && (
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
