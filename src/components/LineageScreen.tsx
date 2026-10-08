import { useState, useMemo } from "react"
import { Eye } from "lucide-react"
import { CODEX } from "../data/codex"
import type { HistoricalFlag } from "../data/codex"
import { FLAGS } from "../data/flags"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, ResultDots, PrimaryButton, SecondaryButton } from "./gameUi"
import { matchNames, pickOnEnter } from "../utils/pickOnEnter"

interface Props { onBack: () => void }

const ROUNDS = 6
const A = ACCENT.play
function shuffle<X>(a: X[]): X[] { return [...a].sort(() => Math.random() - 0.5) }
const nameOf = (code: string) => FLAGS.find(f => f.code === code)?.name ?? code

// Countries with a deep enough flag history to form a lineage.
const ELIGIBLE = Object.entries(CODEX)
  .filter(([code, e]) => e.flagHistory.length >= 3 && FLAGS.some(f => f.code === code))
  .map(([code, e]) => ({ code, name: nameOf(code), history: e.flagHistory }))

interface Round { code: string; name: string; timeline: HistoricalFlag[]; choices: string[] }

function buildRounds(): Round[] {
  return shuffle(ELIGIBLE).slice(0, ROUNDS).map(c => {
    // Stored newest-first → reverse to oldest-first so the chain reads
    // oldest → … → modern. Cap to keep the board readable.
    const full = [...c.history].reverse()
    const timeline = full.length > 6 ? [full[0], ...full.slice(-5)] : full
    const others = shuffle(ELIGIBLE.filter(e => e.code !== c.code)).slice(0, 3).map(e => e.name)
    return { code: c.code, name: c.name, timeline, choices: shuffle([c.name, ...others]) }
  })
}

// More points the OLDER the flag you commit at: full points if you nail it from
// the oldest alone, sliding down toward a floor as you reveal newer flags.
function scoreFor(revealed: number, total: number): number {
  if (total <= 1) return 1000
  const frac = (total - revealed) / (total - 1) // 1 at the oldest, 0 once all shown
  return 150 + Math.round(frac * 850)
}

const yearOf = (h: HistoricalFlag) => h.fromYear ?? "?"

function MiniFlag({ src, w = 72 }: { src: string; w?: number }) {
  return (
    <img src={src} alt="" style={{ width: w, height: w * 0.62, objectFit: "cover", borderRadius: 4, border: `1px solid ${T.line}`, flexShrink: 0, background: T.surfaceHi }}
      onError={e => { (e.target as HTMLImageElement).style.opacity = "0.25" }} />
  )
}

function LineageGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [rounds] = useState(buildRounds)
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(1)   // how many flags (oldest-first) are shown
  const [picked, setPicked] = useState<string | null>(null)
  const [results, setResults] = useState<{ correct: boolean; pts: number }[]>([])
  const [done, setDone] = useState(false)
  const [mode, setMode] = useState<"mc" | "type">("mc")
  const [input, setInput] = useState("")
  const [showDrop, setShowDrop] = useState(false)

  const round = rounds[idx]
  const total = round.timeline.length
  const answered = picked !== null
  const potential = scoreFor(revealed, total)

  const matches = useMemo(() => {
    return matchNames(FLAGS, input, 6)
  }, [input])

  const revealNext = () => {
    if (answered) return
    setRevealed(r => Math.min(total, r + 1))
  }

  const choose = (name: string) => {
    if (answered) return
    setPicked(name)
    const correct = name === round.name
    setResults(r => [...r, { correct, pts: correct ? potential : 0 }])
    setRevealed(total) // reveal the full chain so the player sees the lineage
    setInput(""); setShowDrop(false)
  }

  const giveUp = () => {
    if (answered) return
    setPicked(" ")              // sentinel: not the answer
    setResults(r => [...r, { correct: false, pts: 0 }])
    setRevealed(total)
  }

  const next = () => {
    if (idx + 1 >= rounds.length) { setDone(true); return }
    setIdx(i => i + 1)
    setRevealed(1)
    setPicked(null)
    setInput("")
  }

  if (done) {
    const totalPts = results.reduce((s, r) => s + r.pts, 0)
    const maxPts = ROUNDS * 1000
    const correct = results.filter(r => r.correct).length
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title="Lineage" subtitle="Results" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3">
          <ResultCard>
            <ResultHeader icon={totalPts >= maxPts * 0.7 ? "tree" : correct >= ROUNDS * 0.5 ? "scroll" : "dna"} accent={A}
              title={`${totalPts.toLocaleString()} pts`}
              score={`${correct} of ${ROUNDS} traced · max ${maxPts.toLocaleString()}`} />
            <ResultDots results={results.map(r => r.correct)} />
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={A}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Lineage" subtitle={`${results.filter(r => r.correct).length} traced so far`} onBack={onBack}
        right={<HeaderStat accent={A}>{idx + 1} / {ROUNDS}</HeaderStat>} />

      <div className="flex flex-col items-center px-5 gap-4">
        <div className="text-sm font-semibold text-center" style={{ color: A }}>
          Trace this flag's lineage — which modern country is it?
        </div>
        {!answered && (
          <div className="text-xs px-3 py-1 rounded-full" style={{ background: tint(T.green, 0.13), color: T.green, border: `1px solid ${tint(T.green, 0.3)}` }}>
            Guess now for {potential} pts · reveal a newer flag to lower it
          </div>
        )}

        {/* Oldest → newest chain */}
        <div className="flex items-center gap-2 flex-wrap justify-center px-2 py-4 rounded-2xl w-full max-w-sm"
          style={{ background: T.surface, border: `1px solid ${tint(A, 0.27)}` }}>
          {round.timeline.map((h, i) => {
            const shown = i < revealed
            const isNextToReveal = i === revealed && !answered
            return (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && <span style={{ color: tint(A, 0.55), fontSize: 15 }}>→</span>}
                {shown ? (
                  <div className="flex flex-col items-center gap-1">
                    <MiniFlag src={h.flagUrl} w={i === 0 ? 84 : 70} />
                    <span style={{ fontSize: 9, color: A, fontFamily: FONT.mono }}>{yearOf(h)}</span>
                  </div>
                ) : isNextToReveal ? (
                  <button onClick={revealNext} className="flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95"
                    style={{ width: 70, height: 70 * 0.62, borderRadius: 4, background: T.surfaceHi, border: `1px dashed ${tint(A, 0.45)}`, color: A, fontSize: 10, fontWeight: 700 }}>
                    <Eye size={13} color={A} strokeWidth={1.6} absoluteStrokeWidth />
                    reveal
                  </button>
                ) : (
                  <div style={{ width: 70, height: 70 * 0.62, borderRadius: 4, background: T.surfaceHi, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.dim, fontSize: 16 }}>?</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Answer-mode toggle */}
        {!answered && (
          <div className="inline-flex p-0.5 rounded-full" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            {(["mc", "type"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="px-4 py-1 rounded-full text-xs font-bold transition-all"
                style={{ background: mode === m ? A : "transparent", color: mode === m ? T.onAccent : T.muted }}>
                {m === "mc" ? "Choices" : "Type-in"}
              </button>
            ))}
          </div>
        )}

        {/* Country choices (MC) or type-in */}
        {mode === "mc" || answered ? (
          <div className="grid grid-cols-1 gap-2.5 w-full max-w-sm">
            {round.choices.map(c => {
              const isAnswer = c === round.name
              const isChosen = picked === c
              let border = `1.5px solid ${T.line}`
              if (answered) { if (isAnswer) border = `2px solid ${T.green}`; else if (isChosen) border = `2px solid ${T.danger}` }
              return (
                <button key={c} onClick={() => choose(c)} disabled={answered}
                  className="py-3 px-4 rounded-xl font-semibold text-sm transition-all active:scale-95"
                  style={{ background: T.surface, border, color: T.text, textAlign: "left" }}>
                  {c}
                  {answered && isAnswer && <span style={{ float: "right", color: T.green }}>✓</span>}
                  {answered && isChosen && !isAnswer && <span style={{ float: "right", color: T.danger }}>✗</span>}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="w-full max-w-sm relative">
            <input value={input} autoFocus autoComplete="off"
              onChange={e => { setInput(e.target.value); setShowDrop(true) }}
              onFocus={() => setShowDrop(true)} onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              onKeyDown={e => { if (e.key === "Enter" && matches.length >= 1) { const pick = pickOnEnter(matches, input); if (pick) choose(pick.name) } }}
              placeholder="Name the modern country…"
              className="w-full px-4 py-3.5 rounded-xl outline-none font-semibold"
              style={{ background: T.surface, border: `1.5px solid ${tint(A, 0.4)}`, color: T.text, fontSize: 15 }} />
            {showDrop && matches.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20"
                style={{ background: T.surface, border: `1px solid ${T.line}`, boxShadow: `0 8px 24px -10px ${tint(T.text, 0.5)}` }}>
                {matches.map(f => (
                  <button key={f.code} onMouseDown={() => choose(f.name)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:brightness-95"
                    style={{ background: "transparent", borderBottom: `1px solid ${T.line}`, color: T.text }}>
                    <span className="font-semibold text-sm">{f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Give up — reveals the answer, no points */}
        {!answered && (
          <button onClick={giveUp}
            className="text-xs px-4 py-1.5 rounded-full font-semibold transition-all active:scale-95"
            style={{ background: T.surface, border: `1px solid ${tint(T.danger, 0.25)}`, color: tint(T.danger, 0.65) }}>
            Give up &amp; reveal
          </button>
        )}

        {answered && (
          <>
            <div className="w-full max-w-sm px-4 py-3 rounded-xl" style={{ background: T.surface, border: `1px solid ${tint(results[idx].correct ? T.green : T.danger, 0.35)}` }}>
              <p className="text-sm font-bold mb-1" style={{ color: results[idx].correct ? T.green : T.danger }}>
                {results[idx].correct ? `✓ ${round.name} — +${results[idx].pts} pts` : `✗ That was ${round.name}`}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: T.muted, lineHeight: 1.6 }}>{round.timeline[round.timeline.length - 1].note}</p>
            </div>
            <PrimaryButton onClick={next} accent={A} style={{ maxWidth: 384 }}>
              {idx + 1 >= ROUNDS ? "See results →" : "Next →"}
            </PrimaryButton>
          </>
        )}
      </div>
    </div>
  )
}

export default function LineageScreen({ onBack }: Props) {
  const [replayKey, setReplayKey] = useState(0)
  return <LineageGame key={replayKey} onBack={onBack} onReplay={() => setReplayKey(k => k + 1)} />
}
