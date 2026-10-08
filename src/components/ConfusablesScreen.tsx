import { useState } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, ResultDots, PrimaryButton, SecondaryButton, choiceLabel } from "./gameUi"

const ACC = ACCENT.play

interface Props { onBack: () => void }

interface Round {
  target: FlagRecord
  choices: FlagRecord[]   // 4 visually similar flags, 1 is correct
  correctIndex: number
}

function buildRounds(count: number): Round[] {
  // Only flags with at least 3 GENUINE look-alikes — so every distractor really
  // does resemble the answer (no padding with random same-region flags, which
  // produced nonsense like "Estonia vs Belgium/Germany/UK").
  const eligible = FLAGS.filter(f => f.confusableWith.length >= 3)
  const shuffled  = [...eligible].sort(() => Math.random() - 0.5)
  const rounds: Round[] = []

  for (const target of shuffled) {
    if (rounds.length >= count) break

    const confusables = target.confusableWith
      .map(code => FLAGS.find(f => f.code === code))
      .filter((f): f is FlagRecord => !!f)

    if (confusables.length < 3) continue

    // Distractors are exclusively real look-alikes.
    const distractors = [...confusables].sort(() => Math.random() - 0.5).slice(0, 3)

    const all = [target, ...distractors].sort(() => Math.random() - 0.5)
    rounds.push({ target, choices: all, correctIndex: all.indexOf(target) })
  }

  return rounds
}

const TOTAL = 5

function ConfusablesScreenGame({ onBack , onReplay }: Props & { onReplay: () => void }) {
  const [rounds]    = useState(() => buildRounds(TOTAL))
  const [idx, setIdx]       = useState(0)
  const [selected, setSelected]  = useState<number | null>(null)
  const [scores, setScores] = useState<boolean[]>([])
  const [done, setDone]     = useState(false)

  const round    = rounds[idx]
  const answered = selected !== null
  const isRight  = answered && selected === round?.correctIndex

  const handlePick = (i: number) => {
    if (answered) return
    setSelected(i)
    setScores(prev => [...prev, i === round.correctIndex])
  }

  const handleNext = () => {
    if (idx + 1 >= rounds.length) { setDone(true); return }
    setIdx(i => i + 1)
    setSelected(null)
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  if (done || rounds.length === 0) {
    const correct = scores.filter(Boolean).length
    const total   = rounds.length
    const pct     = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, minHeight: "100vh", color: T.text }}>
        <ScreenHeader title="Lookalikes" subtitle="Results" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3">
          <ResultCard>
            <ResultHeader icon={pct === 100 ? "trophy" : pct >= 60 ? "target" : "codex"} accent={pct === 100 ? T.gold : pct >= 60 ? T.green : ACC}
              title={`${correct} of ${total} spotted`}
              score={pct === 100 ? "Unbeatable! You know your lookalikes." : "These are the trickiest flags in the world. Don't feel bad."} />
            <ResultDots results={scores} />
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={ACC}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  // ── Quiz ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: T.bg, minHeight: "100vh", color: T.text }}>

      <ScreenHeader title="Lookalikes" subtitle={`${scores.filter(Boolean).length} correct so far`} onBack={onBack}
        right={<HeaderStat accent={ACC}>{idx + 1} / {rounds.length}</HeaderStat>} />

      {/* Progress */}
      <div className="mx-5 h-1.5 rounded-full overflow-hidden mb-5" style={{ background: T.line, zIndex: 1 }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(idx / rounds.length) * 100}%`, background: ACC }} />
      </div>

      <div className="flex-1 flex flex-col items-center px-5" style={{ zIndex: 1 }}>
        {/* Prompt */}
        <div className="w-full max-w-sm mb-5 rounded-2xl px-5 py-4 text-center"
          style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: T.muted }}>Which flag is…</p>
          <p className="text-2xl font-black" style={{ color: T.text, fontFamily: FONT.display, fontWeight: 800 }}>{round.target.name}</p>
          {answered && (
            <p className="text-xs mt-1.5" style={{ color: T.muted }}>
              {round.target.distinguishingTip}
            </p>
          )}
        </div>

        {/* 2×2 flag grid */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-4">
          {round.choices.map((flag, i) => {
            const isCorrect = i === round.correctIndex
            const isChosen  = selected === i
            let border = `1.5px solid ${T.line}`
            if (answered) {
              if (isCorrect)          border = `2px solid ${T.green}`
              else if (isChosen)      border = `2px solid ${T.danger}`
            } else if (isChosen) {
              border = `2px solid ${ACC}`
            }

            return (
              <button key={flag.code} onClick={() => handlePick(i)}
                disabled={answered}
                aria-label={answered ? `${choiceLabel(i, round.choices.length)}: ${flag.name}` : choiceLabel(i, round.choices.length)}
                className="relative rounded-xl overflow-hidden transition-all active:scale-95"
                style={{ border, background: T.surface, aspectRatio: "3/2" }}>
                <img src={flag.flagUrl} alt="" className="w-full h-full object-cover" />
                {answered && (isCorrect || isChosen) && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: isCorrect ? tint(T.green, 0.15) : tint(T.danger, 0.15),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 28, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.55)" }}>{isCorrect ? '✓' : '✗'}</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {answered && (
          <div className="w-full max-w-sm mb-3 px-4 py-3 rounded-xl"
            style={{ background: T.surface, border: `1px solid ${tint(isRight ? T.green : T.danger, 0.35)}` }}>
            <p className="text-sm font-semibold" style={{ color: isRight ? T.green : T.danger }}>
              {isRight ? `✓ Correct — ${round.target.name}` : `✗ That was ${round.choices[selected!].name}`}
            </p>
            {!isRight && (
              <p className="text-xs mt-1" style={{ color: T.muted }}>
                {round.target.name}: {round.target.distinguishingTip}
              </p>
            )}
          </div>
        )}

        {answered && (
          <PrimaryButton onClick={handleNext} accent={ACC} style={{ maxWidth: 384 }}>
            {idx + 1 >= rounds.length ? "See results →" : "Next →"}
          </PrimaryButton>
        )}
      </div>
    </div>
  )
}

export default function ConfusablesScreen({ onBack }: Props) {
  const [replayKey, setReplayKey] = useState(0)
  return <ConfusablesScreenGame key={replayKey} onBack={onBack} onReplay={() => setReplayKey(k => k + 1)} />
}
