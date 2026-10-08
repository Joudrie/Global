import { useState, useEffect, useRef } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import FlagImage from "./FlagImage"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"

interface Props { onBack: () => void }

const SECONDS = 60
const REGIONS: FlagRecord["region"][] = ["Europe", "Africa", "Asia", "Americas", "Oceania", "Middle East"]
// Deal from a shuffled deck so no flag repeats until all 197 have come up.
let deck: FlagRecord[] = []
const randomFlag = (prev?: FlagRecord): FlagRecord => {
  if (!deck.length) {
    deck = [...FLAGS]
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]] }
    if (prev && deck[deck.length - 1].code === prev.code) deck.unshift(deck.pop()!)
  }
  return deck.pop()!
}

// A one-minute sprint: sort as many flags into their region as you can before
// the timer runs out. Each pick auto-advances after a brief right/wrong flash.
function ContinentSortGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [flag, setFlag] = useState(() => randomFlag())
  const [picked, setPicked] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [timeLeft, setTimeLeft] = useState(SECONDS)
  const [done, setDone] = useState(false)

  // Countdown — ticks once a second, ends the run at zero.
  useEffect(() => {
    if (done) return
    if (timeLeft <= 0) { setDone(true); return }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, done])

  // Track the auto-advance timer so it can be cancelled on unmount (navigating
  // away mid-flash would otherwise setState on an unmounted component).
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (advanceRef.current) clearTimeout(advanceRef.current) }, [])

  const answered = picked !== null
  const choose = (r: string) => {
    if (answered || done) return
    setPicked(r)
    setAttempts(a => a + 1)
    if (r === flag.region) setCorrect(c => c + 1)
    advanceRef.current = setTimeout(() => { setFlag(f => randomFlag(f)); setPicked(null) }, 430)
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
        <ScreenHeader title="Continent Sort" subtitle="Time's up" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ResultCard>
            <ResultHeader icon="timer" accent={ACCENT.learn}
              title={`${correct} sorted correctly`}
              score={`in ${SECONDS}s · ${attempts} attempted`} />
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={ACCENT.learn}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  const low = timeLeft <= 10
  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <ScreenHeader title="Continent Sort" subtitle={<span style={{ color: low ? T.danger : T.muted, fontVariantNumeric: "tabular-nums" }}>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")} left</span>} onBack={onBack}
        right={<HeaderStat label="Sorted" accent={ACCENT.learn}>{correct}</HeaderStat>} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px 18px 22px", gap: 16, alignItems: "center" }}>
        <div style={{ width: 220, height: 146, borderRadius: 14, overflow: "hidden", border: `1px solid ${T.lineHi}`, background: T.surfaceHi, boxShadow: "0 12px 28px -14px rgba(31,58,60,0.45)" }}>
          <FlagImage code={flag.code} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", padding: 8 }} />
        </div>
        <div className="geo-display" style={{ fontWeight: 700, fontSize: 18, color: T.text, marginTop: -6 }}>{flag.name}</div>
        <div className="geo-micro" style={{ fontSize: 11, color: T.muted, marginTop: -8 }}>Which region?</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 360 }}>
          {REGIONS.map(r => {
            const isCorrect = r === flag.region
            const isPick = picked === r
            let bg = T.surface, border = `2px solid ${T.line}`
            if (answered) {
              if (isCorrect) { bg = tint(ACCENT.learn, 0.12); border = `2px solid ${ACCENT.learn}` }
              else if (isPick) { bg = tint(T.warm, 0.1); border = `2px solid ${T.warm}` }
            }
            return (
              <button key={r} onClick={() => choose(r)} disabled={answered} className="geo-tap"
                style={{ padding: "14px 10px", borderRadius: 12, background: bg, border, color: T.text, fontFamily: FONT.display, fontWeight: 600, fontSize: 14, transition: "background 0.2s ease, border-color 0.2s ease" }}>
                {r}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function ContinentSortScreen({ onBack }: Props) {
  const [k, setK] = useState(0)
  return <ContinentSortGame key={k} onBack={onBack} onReplay={() => setK(n => n + 1)} />
}
