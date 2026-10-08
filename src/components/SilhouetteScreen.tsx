import { useState, useRef, useMemo } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import FlagImage from "./FlagImage"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, ResultDots, PrimaryButton, SecondaryButton, HeaderStat } from "./gameUi"
import { matchNames, pickOnEnter } from "../utils/pickOnEnter"

const ACC = ACCENT.play

interface Props { onBack: () => void }

// Each wrong guess lifts the flag one stage. brightness() scales luminance, so
// blacks stay black and whites only reach true white at the end — preserving
// the real contrast. grayscale starts at 1 (no colour tell) and fades to a
// faint hint near the end before the full-colour reveal.
const STAGES = [
  { filter: "grayscale(1) brightness(0.04)",   label: "Barely visible", pts: 1000 },
  { filter: "grayscale(1) brightness(0.12)",   label: "Very dark",      pts: 800  },
  { filter: "grayscale(1) brightness(0.30)",   label: "Dark grey",      pts: 600  },
  { filter: "grayscale(0.7) brightness(0.55)", label: "Grey",           pts: 400  },
  { filter: "grayscale(0.3) brightness(0.82)", label: "Faint colour",   pts: 200  },
]

const ROUNDS = 5

function buildRounds(): FlagRecord[] {
  return [...FLAGS].sort(() => Math.random() - 0.5).slice(0, ROUNDS)
}

interface RoundResult { correct: boolean; pts: number }

function SilhouetteGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [rounds] = useState(buildRounds)
  const [idx, setIdx] = useState(0)
  const [stage, setStage] = useState(0)        // 0..STAGES.length-1
  const [revealed, setRevealed] = useState(false)
  const [solved, setSolved] = useState(false)
  const [results, setResults] = useState<RoundResult[]>([])
  const [done, setDone] = useState(false)

  const [input, setInput] = useState("")
  const [showDrop, setShowDrop] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const guessedCodes = useRef<Set<string>>(new Set())

  const target = rounds[idx]
  const currentStage = STAGES[stage]
  const filter = revealed ? "none" : currentStage.filter

  const matches = useMemo(() => {
    return matchNames(FLAGS.filter(f => !guessedCodes.current.has(f.code)), input, 6)
  }, [input])

  const nextRound = (result: RoundResult) => {
    setResults(prev => [...prev, result])
    // brief reveal pause, then advance
    setRevealed(true)
    setTimeout(() => {
      if (idx + 1 >= rounds.length) { setDone(true); return }
      setIdx(i => i + 1)
      setStage(0)
      setRevealed(false)
      setSolved(false)
      setInput("")
      setShowDrop(false)
      guessedCodes.current = new Set()
    }, 1100)
  }

  const submitGuess = (flag: FlagRecord) => {
    if (revealed) return
    guessedCodes.current.add(flag.code)
    setInput("")
    setShowDrop(false)

    if (flag.code === target.code) {
      setSolved(true)
      nextRound({ correct: true, pts: currentStage.pts })
      return
    }
    // wrong: lighten one stage, or fail if already at the lightest pre-reveal stage
    if (stage < STAGES.length - 1) {
      setStage(s => s + 1)
      inputRef.current?.focus()
    } else {
      setSolved(false)
      nextRound({ correct: false, pts: 0 })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { const pick = pickOnEnter(matches, input); if (pick) submitGuess(pick) }
    if (e.key === "Escape") { setInput(""); setShowDrop(false) }
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (done) {
    const totalPts = results.reduce((s, r) => s + r.pts, 0)
    const maxPts = ROUNDS * STAGES[0].pts
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, minHeight: "100vh", color: T.text }}>
        <ScreenHeader title="Silhouette" subtitle="Results" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3">
          <ResultCard>
            <ResultHeader icon={totalPts >= maxPts * 0.8 ? "trophy" : totalPts >= maxPts * 0.4 ? "moon" : "codex"}
              accent={totalPts >= maxPts * 0.8 ? T.gold : totalPts >= maxPts * 0.4 ? ACC : T.muted}
              title={`${totalPts.toLocaleString()} pts`} score={`${results.filter(r => r.correct).length} of ${ROUNDS} named · max ${maxPts.toLocaleString()}`} />
            <ResultDots results={results.map(r => r.correct)} />
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={ACC}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, minHeight: "100vh", color: T.text }}>
      <ScreenHeader title="Silhouette" subtitle={`${results.filter(r => r.correct).length} named so far`} onBack={onBack}
        right={<HeaderStat accent={ACC}>{idx + 1} / {ROUNDS}</HeaderStat>} />

      <div className="flex flex-col items-center px-5 gap-4">
        {/* Stage / points indicator */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: tint(ACC, 0.12), color: ACC, border: `1px solid ${tint(ACC, 0.35)}` }}>
            {revealed ? (solved ? "Revealed" : target.name) : currentStage.label}
          </div>
          {!revealed && (
            <div className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: tint(T.green, 0.12), color: T.green, border: `1px solid ${tint(T.green, 0.35)}` }}>
              {currentStage.pts} pts
            </div>
          )}
        </div>

        {/* The darkened flag */}
        <div style={{
          width: 300, height: 200, borderRadius: 12, overflow: "hidden",
          border: revealed ? `2px solid ${solved ? T.green : T.danger}` : `2px solid ${T.line}`,
          // Dark reveal surface is game content — keep an ink-dark fill so the
          // near-black silhouette stages still read against it.
          background: T.text, position: "relative",
          boxShadow: `0 12px 32px -14px ${tint(T.text, 0.5)}`,
        }}>
          {/* key by round so a fresh, already-dark image mounts each round —
              otherwise the filter transition animates the new flag up from the
              previous round's fully-revealed state (a flash of the answer). */}
          <FlagImage
            key={idx}
            code={target.code}
            style={{
              width: "100%", height: "100%", objectFit: "cover", display: "block",
              filter, transition: revealed ? "none" : "filter 0.5s ease",
            }}
          />
          {revealed && !solved && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(transparent,rgba(0,0,0,0.6))", padding: "20px 12px 8px", textAlign: "center",
            }}>
              <span style={{ color: "#fff", fontWeight: 700 }}>{target.name}</span>
            </div>
          )}
        </div>

        {/* Reveal-progress pips */}
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 11, color: T.dim }}>reveal</span>
          {STAGES.map((_s, i) => (
            <div key={i} style={{
              width: 18, height: 4, borderRadius: 2,
              background: i <= stage ? ACC : T.line, transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* Type-in */}
        {!revealed && (
          <div className="w-full max-w-sm relative">
            <input
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); setShowDrop(true) }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              placeholder="Type the country name…"
              autoComplete="off"
              className="w-full px-4 py-3.5 rounded-xl outline-none font-semibold"
              style={{ background: T.surface, border: `1.5px solid ${T.line}`, color: T.text, fontSize: 15 }}
            />
            {showDrop && matches.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-10"
                style={{ background: T.surface, border: `1px solid ${T.line}`, boxShadow: `0 8px 32px ${tint(T.text, 0.25)}` }}>
                {matches.map(flag => (
                  <button key={flag.code} onMouseDown={() => submitGuess(flag)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:brightness-125 transition-all"
                    style={{ background: "transparent", borderBottom: `1px solid ${T.line}` }}>
                    <FlagImage code={flag.code} style={{ width: 32, height: 21, objectFit: "cover", borderRadius: 3 }} />
                    <span style={{ color: T.text, fontWeight: 600 }}>{flag.name}</span>
                    <span style={{ color: T.dim, fontSize: 11, marginLeft: "auto" }}>{flag.code}</span>
                  </button>
                ))}
              </div>
            )}
            {guessedCodes.current.size > 0 && (
              <p className="text-xs mt-2 text-center" style={{ color: T.danger }}>
                {guessedCodes.current.size} wrong · it lightens with each miss
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SilhouetteScreen({ onBack }: Props) {
  const [replayKey, setReplayKey] = useState(0)
  return <SilhouetteGame key={replayKey} onBack={onBack} onReplay={() => setReplayKey(k => k + 1)} />
}
