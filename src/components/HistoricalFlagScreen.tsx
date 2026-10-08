import { useState } from "react"
import { HISTORICAL_FLAGS } from "../data/historicalFlags"
import type { HistoricalEntity, HistoricalRegion } from "../data/historicalFlags"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, ResultDots, PrimaryButton, SecondaryButton } from "./gameUi"
import { LineIcon } from "./icons"

interface Props { onBack: () => void; region?: HistoricalRegion }

const ROUNDS = 6
const PTS = 1000
const A = ACCENT.learn

function pickChoices(target: HistoricalEntity): HistoricalEntity[] {
  const sameRegion = HISTORICAL_FLAGS.filter(h => h.id !== target.id && h.region === target.region)
  const shuffled = [...sameRegion].sort(() => Math.random() - 0.5)
  const distractors = shuffled.slice(0, 3)
  if (distractors.length < 3) {
    const extra = HISTORICAL_FLAGS
      .filter(h => h.id !== target.id && !distractors.some(d => d.id === h.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3 - distractors.length)
    distractors.push(...extra)
  }
  return [target, ...distractors].sort(() => Math.random() - 0.5)
}

interface Round { target: HistoricalEntity; choices: HistoricalEntity[] }

function buildRounds(region?: HistoricalRegion): Round[] {
  const pool = region ? HISTORICAL_FLAGS.filter(h => h.region === region) : HISTORICAL_FLAGS
  const usePool = pool.length >= 4 ? pool : HISTORICAL_FLAGS
  return [...usePool].sort(() => Math.random() - 0.5)
    .slice(0, ROUNDS)
    .map(target => ({ target, choices: pickChoices(target) }))
}

function FlagImg({ src, alt }: { src: string; alt: string }) {
  return (
    <div style={{ width: 300, height: 200, borderRadius: 12, overflow: "hidden", border: `2px solid ${tint(A, 0.3)}`, position: "relative", background: T.surfaceHi }}>
      <img src={src} alt={alt}
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        onError={e => {
          const el = e.target as HTMLImageElement
          el.style.display = "none"
          const ph = el.parentElement?.querySelector(".ph") as HTMLElement
          if (ph) ph.style.display = "flex"
        }} />
      <div className="ph" style={{ display: "none", position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
        <span style={{ opacity: 0.4, display: "flex" }}><LineIcon name="flag" size={48} color={T.dim} /></span>
      </div>
    </div>
  )
}

function HistoricalFlagScreenGame({ onBack, onReplay, region }: Props & { onReplay: () => void }) {
  const [rounds] = useState(() => buildRounds(region))
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [scores, setScores] = useState<{ correct: boolean }[]>([])
  const [done, setDone] = useState(false)

  const round = rounds[idx]
  const answered = selected !== null

  const handlePick = (id: string) => {
    if (answered) return
    setSelected(id)
    setScores(prev => [...prev, { correct: id === round.target.id }])
  }

  const handleNext = () => {
    if (idx + 1 >= rounds.length) { setDone(true); return }
    setIdx(i => i + 1)
    setSelected(null)
  }

  if (done) {
    const correct = scores.filter(s => s.correct).length
    const totalPts = correct * PTS
    const maxPts = ROUNDS * PTS
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title="Historical Flag" subtitle="Results" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3">
          <ResultCard>
            <ResultHeader icon={correct >= ROUNDS * 0.8 ? "crown" : correct >= ROUNDS * 0.5 ? "scroll" : "landmark"} accent={A}
              title={`${correct} of ${ROUNDS} correct`}
              score={`${totalPts.toLocaleString()} pts · max ${maxPts.toLocaleString()}`} />
            <ResultDots results={scores.map(s => s.correct)} />
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={A}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: T.bg, color: T.text }}>

      <ScreenHeader title="Historical Flag" subtitle={`${scores.filter(s => s.correct).length} correct so far`} onBack={onBack}
        right={<HeaderStat accent={A}>{idx + 1} / {ROUNDS}</HeaderStat>} />

      <div className="mx-5 h-1.5 rounded-full overflow-hidden mb-4" style={{ background: T.line }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(scores.length / ROUNDS) * 100}%`, background: A }} />
      </div>

      <div className="flex flex-col items-center px-5 gap-4">
        <div className="text-sm font-semibold" style={{ color: A }}>Which vanished state flew this flag?</div>

        <FlagImg src={round.target.flagUrl} alt="mystery historical flag" />

        <div className="grid grid-cols-1 gap-2.5 w-full max-w-sm">
          {round.choices.map(ent => {
            const isTarget = ent.id === round.target.id
            const isChosen = selected === ent.id
            let border = `1.5px solid ${T.line}`
            if (answered) {
              if (isTarget) border = `2px solid ${A}`
              else if (isChosen) border = `2px solid ${T.danger}`
            }
            return (
              <button key={ent.id} onClick={() => handlePick(ent.id)}
                disabled={answered}
                className="py-3 px-4 rounded-xl font-semibold text-sm transition-all active:scale-95"
                style={{ background: T.surface, border, color: T.text, textAlign: "left" }}>
                {ent.name}
                {answered && isTarget && <span style={{ float: "right", color: A }}>✓</span>}
                {answered && isChosen && !isTarget && <span style={{ float: "right", color: T.danger }}>✗</span>}
              </button>
            )
          })}
        </div>

        {answered && (
          <>
            <div className="w-full max-w-sm px-4 py-3 rounded-xl"
              style={{ background: T.surface, border: `1px solid ${tint(selected === round.target.id ? A : T.danger, 0.35)}` }}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-bold" style={{ color: selected === round.target.id ? A : T.danger }}>
                  {selected === round.target.id ? "✓ " : "✗ "}{round.target.name}
                </p>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: tint(A, 0.13), color: A, border: `1px solid ${tint(A, 0.3)}`, whiteSpace: "nowrap" }}>
                  {round.target.era}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: T.muted, lineHeight: 1.6 }}>{round.target.note}</p>
            </div>
            <PrimaryButton onClick={handleNext} accent={A} style={{ maxWidth: 384 }}>
              {idx + 1 >= ROUNDS ? "See results →" : "Next →"}
            </PrimaryButton>
          </>
        )}
      </div>
    </div>
  )
}

export default function HistoricalFlagScreen({ onBack, region }: Props) {
  const [replayKey, setReplayKey] = useState(0)
  return <HistoricalFlagScreenGame key={replayKey} onBack={onBack} region={region} onReplay={() => setReplayKey(k => k + 1)} />
}
