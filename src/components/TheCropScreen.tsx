import { useState, useMemo, useRef } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import FlagImage from "./FlagImage"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, PrimaryButton, SecondaryButton, HeaderStat } from "./gameUi"
import { pickOnEnter } from "../utils/pickOnEnter"

interface Props { onBack: () => void }

const ACC = ACCENT.play

// Scale = CSS transform scale factor. We zoom from 6× down to 1×.
const SCALES = [6, 4, 2.8, 2, 1.4, 1]

function TheCropScreenGame({ onBack , onReplay }: Props & { onReplay: () => void }) {
  const [target]  = useState<FlagRecord>(() => FLAGS[Math.floor(Math.random() * FLAGS.length)])
  // Random focal point as percentages (transform-origin)
  const [originX] = useState(() => 20 + Math.random() * 60)  // 20–80%
  const [originY] = useState(() => 20 + Math.random() * 60)

  const [wrongGuesses, setWrongGuesses] = useState(0)
  const [phase, setPhase] = useState<"playing" | "result">("playing")
  const [solved, setSolved] = useState(false)

  // Type-in state
  const [input, setInput]       = useState("")
  const [showDrop, setShowDrop] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const guessedCodes = useRef<Set<string>>(new Set())
  // Set once the final miss is reached, to reject further guesses during the
  // 800ms reveal delay (phase is still "playing" then).
  const locked = useRef(false)

  const scaleIdx = Math.min(wrongGuesses, SCALES.length - 1)
  // On the reveal, zoom all the way out to 1× so the whole flag is visible.
  const scale    = phase === "result" ? 1 : SCALES[scaleIdx]

  const matches = useMemo(() => {
    const q = input.trim().toLowerCase()
    if (q.length < 1) return []
    return FLAGS.filter(f =>
      (f.name.toLowerCase().includes(q) || f.code.toLowerCase() === q) &&
      !guessedCodes.current.has(f.code)
    ).slice(0, 6)
  }, [input])

  const submitGuess = (flag: FlagRecord) => {
    if (phase !== "playing" || locked.current) return
    guessedCodes.current.add(flag.code)
    setInput("")
    setShowDrop(false)

    if (flag.code === target.code) {
      setSolved(true)
      setPhase("result")
      return
    }
    const next = wrongGuesses + 1
    setWrongGuesses(next)
    if (next >= SCALES.length - 1) {
      locked.current = true
      setTimeout(() => setPhase("result"), 800)
    }
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { const pick = pickOnEnter(matches, input); if (pick) submitGuess(pick) }
    if (e.key === "Escape") { setInput(""); setShowDrop(false) }
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: T.bg, color: T.text }}>

      <ScreenHeader title="The Crop" onBack={onBack}
        subtitle={
          <span style={{ color: ACC }}>
            {phase === "playing"
              ? `${SCALES.length - 1 - wrongGuesses} reveal${SCALES.length - 1 - wrongGuesses !== 1 ? "s" : ""} left`
              : solved ? "Identified!" : "Better luck next time"}
          </span>
        }
        right={<HeaderStat label="Misses" accent={ACC}>{wrongGuesses} / {SCALES.length - 1}</HeaderStat>} />

      <div className="flex flex-col items-center px-5 gap-4">

        {/* Cropped flag — transform-based zoom */}
        <div style={{
          width: 300, height: 200,
          overflow: "hidden",
          borderRadius: 14,
          border: phase === "result"
            ? `2px solid ${solved ? T.green : T.danger}`
            : `2px solid ${tint(ACC, 0.4)}`,
          boxShadow: `0 8px 24px -10px ${tint(T.text, 0.35)}`,
          position: "relative",
          background: T.surface,
        }}>
          <FlagImage
            code={target.code}
            alt="flag"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${scale})`,
              transformOrigin: `${originX}% ${originY}%`,
              transition: "transform 0.65s cubic-bezier(0.22,1,0.36,1)",
              display: "block",
            }}
          />
          {phase === "result" && !solved && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: `linear-gradient(transparent,${tint(T.text, 0.55)})`,
              padding: "20px 12px 10px", textAlign: "center",
            }}>
              <span style={{ color: T.bg, fontWeight: 700, fontFamily: FONT.display }}>{target.name}</span>
            </div>
          )}
        </div>

        {/* Zoom indicator */}
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 11, color: T.dim }}>zoom</span>
          {SCALES.map((_s, i) => (
            <div key={i} style={{
              width: 18, height: 4, borderRadius: 2,
              background: i === scaleIdx ? ACC : T.line,
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* Result card */}
        {phase === "result" ? (
          <div className="w-full max-w-sm flex flex-col gap-3">
            <ResultCard>
              <ResultHeader icon={solved ? "target" : "x"} accent={solved ? T.green : T.danger}
                title={target.name}
                score={solved ? `Found in ${wrongGuesses + 1} guess${wrongGuesses + 1 !== 1 ? "es" : ""}!` : "Fully revealed. Better luck next time."} />
            </ResultCard>
            <PrimaryButton onClick={onReplay} accent={ACC}>New flag</PrimaryButton>
            <SecondaryButton onClick={onBack}>Home</SecondaryButton>
          </div>
        ) : (
          /* Type-in */
          <div className="w-full max-w-sm relative">
            <input
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); setShowDrop(true) }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              placeholder="Type a country name or code…"
              autoComplete="off"
              className="w-full px-4 py-3.5 rounded-xl outline-none font-semibold"
              style={{
                background: T.surface, border: `1.5px solid ${T.line}`,
                color: T.text, fontSize: 15,
              }}
            />
            {showDrop && matches.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-10"
                style={{ background: T.surface, border: `1px solid ${T.line}`, boxShadow: `0 8px 32px ${tint(T.text, 0.18)}` }}>
                {matches.map(flag => (
                  <button key={flag.code}
                    onMouseDown={() => submitGuess(flag)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:brightness-95 transition-all"
                    style={{ background: "transparent", borderBottom: `1px solid ${T.line}` }}>
                    <img src={flag.flagUrl} alt="" style={{ width: 32, height: 21, objectFit: "cover", borderRadius: 3 }} />
                    <span style={{ color: T.text, fontWeight: 600 }}>{flag.name}</span>
                    <span style={{ color: T.dim, fontSize: 11, marginLeft: "auto", fontFamily: FONT.mono }}>{flag.code}</span>
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

export default function TheCropScreen({ onBack }: Props) {
  const [replayKey, setReplayKey] = useState(0)
  return <TheCropScreenGame key={replayKey} onBack={onBack} onReplay={() => setReplayKey(k => k + 1)} />
}
