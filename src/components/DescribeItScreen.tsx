import { useState, useMemo } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { FLAG_ATTRIBS, STRIPES_V } from "../data/flagAttribs"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, ResultDots, PrimaryButton, SecondaryButton } from "./gameUi"

import { matchNames, pickOnEnter } from "../utils/pickOnEnter"

interface Props { onBack: () => void }

const ELIGIBLE = FLAGS.filter(f => FLAG_ATTRIBS[f.code])
const ROUNDS = 5

const COLOR_WORD: Record<string, string> = {
  red: "red", blue: "blue", green: "green", yellow: "gold",
  white: "white", black: "black", orange: "orange",
}

// Build the descriptive clue lines for a flag (visual only, no name).
function describe(f: FlagRecord): string[] {
  const a = FLAG_ATTRIBS[f.code]
  const lines: string[] = []
  const colors = a.colors.map(c => COLOR_WORD[c] ?? c)
  if (colors.length === 1) lines.push(`A solid ${colors[0]} field.`)
  else lines.push(`Colours: ${colors.join(", ")}.`)
  if (a.stripes) lines.push("It has horizontal stripes.")
  if (STRIPES_V.has(f.code)) lines.push("It has vertical stripes.")
  if (a.cross) lines.push("There is a cross.")
  if (a.star) lines.push("There is at least one star.")
  if (a.crescent) lines.push("There is a crescent moon.")
  if (a.emblem) lines.push("It carries a coat of arms or central emblem.")
  return lines
}

interface Round { target: FlagRecord; clues: string[] }

function buildRounds(): Round[] {
  return [...ELIGIBLE].sort(() => Math.random() - 0.5).slice(0, ROUNDS).map(target => {
    const clues = describe(target)
    // region + fun-fact as deeper hints
    clues.push(`Region: ${target.region}.`)
    if (target.distinguishingTip) clues.push(`Tip: ${target.distinguishingTip}`)
    return { target, clues }
  })
}

function DescribeItGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [rounds] = useState(buildRounds)
  const [idx, setIdx] = useState(0)
  const [shown, setShown] = useState(2)         // clue lines revealed
  const [input, setInput] = useState("")
  const [showDrop, setShowDrop] = useState(false)
  const [result, setResult] = useState<null | { correct: boolean }>(null)
  const [scores, setScores] = useState<number[]>([])
  const [done, setDone] = useState(false)

  const round = rounds[idx]

  const matches = useMemo(() => {
    return matchNames(FLAGS, input, 5)
  }, [input])

  const submit = (f: FlagRecord) => {
    if (result) return
    const correct = f.code === round.target.code
    setInput(""); setShowDrop(false)
    if (correct) {
      const pts = Math.max(100, 600 - (shown - 2) * 100)
      setScores(s => [...s, pts]); setResult({ correct: true })
    } else {
      // reveal one more clue; if out of clues, fail the round
      if (shown < round.clues.length) setShown(s => s + 1)
      else { setScores(s => [...s, 0]); setResult({ correct: false }) }
    }
  }

  const next = () => {
    if (idx + 1 >= ROUNDS) { setDone(true); return }
    setIdx(i => i + 1); setShown(2); setInput(""); setResult(null)
  }

  if (done) {
    const total = scores.reduce((a, b) => a + b, 0)
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title="Describe-It" subtitle="Results" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3">
          <ResultCard>
            <ResultHeader icon="describeit" accent={ACCENT.play}
              title={`${total.toLocaleString()} pts`}
              score={`${scores.filter(s => s > 0).length} of ${ROUNDS} solved`} />
            <ResultDots results={scores.map(s => s > 0)} />
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={ACCENT.play}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Describe-It" subtitle="Name the flag from its clues" onBack={onBack}
        right={<HeaderStat accent={ACCENT.play}>{idx + 1} / {ROUNDS}</HeaderStat>} />

      <div className="flex flex-col items-center px-5 gap-4">
        <p className="text-xs text-center" style={{ color: T.muted }}>No image — name the flag from its description. Each wrong guess reveals another clue.</p>

        {/* Clue card */}
        <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          {round.clues.slice(0, shown).map((c, i) => (
            <p key={i} className="text-base leading-relaxed" style={{ color: i === 0 ? T.text : T.muted, marginBottom: 8 }}>
              <span style={{ color: ACCENT.play }}>•</span> {c}
            </p>
          ))}
          {!result && shown < round.clues.length && (
            <p className="text-xs mt-1" style={{ color: T.dim }}>{round.clues.length - shown} more clue(s) on a wrong guess</p>
          )}
        </div>

        {result ? (
          <>
            {/* reveal the flag now that the round is over */}
            <div style={{ width: 220, height: 147, borderRadius: 12, overflow: "hidden", border: `2px solid ${result.correct ? T.green : T.danger}`, boxShadow: `0 6px 18px ${tint(T.text, 0.18)}` }}>
              <img src={round.target.flagUrl} alt={round.target.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3" }} />
            </div>
            <div className="w-full max-w-sm px-4 py-3 rounded-xl"
              style={{ background: T.surface, border: `1px solid ${tint(result.correct ? T.green : T.danger, 0.4)}` }}>
              <p className="text-sm font-bold" style={{ color: result.correct ? T.green : T.danger }}>
                {result.correct ? `✓ ${round.target.name} — +${scores[scores.length - 1]}` : `✗ It was ${round.target.name}`}
              </p>
            </div>
            <PrimaryButton onClick={next} accent={ACCENT.play} style={{ maxWidth: 384 }}>
              {idx + 1 >= ROUNDS ? "See results →" : "Next →"}
            </PrimaryButton>
          </>
        ) : (
          <div className="w-full max-w-sm relative">
            <input aria-label="Type a country" value={input} autoFocus autoComplete="off"
              onChange={e => { setInput(e.target.value); setShowDrop(true) }}
              onFocus={() => setShowDrop(true)} onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              onKeyDown={e => { if (e.key === "Enter") { const pick = pickOnEnter(matches, input); if (pick) submit(pick) } }}
              placeholder="Type a country name or code…"
              className="w-full px-4 py-3.5 rounded-xl outline-none font-semibold"
              style={{ background: T.surface, border: `1.5px solid ${T.line}`, color: T.text, fontSize: 15 }} />
            {showDrop && matches.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20"
                style={{ background: T.surface, border: `1px solid ${T.line}`, boxShadow: `0 8px 32px ${tint(T.text, 0.18)}` }}>
                {matches.map(f => (
                  <button key={f.code} onMouseDown={() => submit(f)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:brightness-95"
                    style={{ background: "transparent", borderBottom: `1px solid ${T.line}` }}>
                    <img src={f.flagUrl} alt="" style={{ width: 32, height: 21, objectFit: "cover", borderRadius: 3 }} />
                    <span style={{ color: T.text, fontWeight: 600 }}>{f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DescribeItScreen({ onBack }: Props) {
  const [replayKey, setReplayKey] = useState(0)
  return <DescribeItGame key={replayKey} onBack={onBack} onReplay={() => setReplayKey(k => k + 1)} />
}
