import { useState, useEffect, useRef } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { T, ACCENT, FONT, tint, IS_CARTO } from "../ui/tokens"
import FlagImage from "./FlagImage"

interface Props { onBack: () => void }

const SECONDS = 60
const REGIONS: FlagRecord["region"][] = ["Europe", "Africa", "Asia", "Americas", "Oceania", "Middle East"]
const randomFlag = (prev?: FlagRecord): FlagRecord => {
  let f: FlagRecord
  do { f = FLAGS[Math.floor(Math.random() * FLAGS.length)] } while (prev && f.code === prev.code)
  return f
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
      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: T.bg }}>
        <div className="w-full max-w-sm" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ borderRadius: 16, padding: 24, textAlign: "center", background: T.surface, border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 40 }}>⏱️</div>
            <div style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 44, color: ACCENT.learn }}>{correct}</div>
            <div style={{ color: T.muted, fontSize: 12 }}>sorted correctly in {SECONDS}s · {attempts} attempted</div>
          </div>
          <button onClick={onReplay} className="geo-tap" style={{ padding: "14px 0", borderRadius: 12, fontWeight: 700, fontFamily: FONT.display, background: ACCENT.learn, color: T.onAccent }}>Play again</button>
          <button onClick={onBack} className="geo-tap" style={{ padding: "12px 0", borderRadius: 12, fontWeight: 600, background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>← Home</button>
        </div>
      </div>
    )
  }

  const low = timeLeft <= 10
  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 6px" }}>
        <button onClick={onBack} className="geo-tap" style={{ width: 34, height: 34, borderRadius: 9, background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>‹</button>
        <div style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 18, color: low ? T.danger : T.text, fontVariantNumeric: "tabular-nums" }}>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 13, color: ACCENT.learn, fontWeight: 700 }}>{correct}<span style={{ color: T.dim }}> ✓</span></div>
      </header>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px 18px 22px", gap: 16, alignItems: "center" }}>
        <div style={{ width: 220, height: 146, borderRadius: 14, overflow: "hidden", border: `1px solid ${T.lineHi}`, background: T.surfaceHi, boxShadow: IS_CARTO ? "0 12px 28px -14px rgba(31,58,60,0.45)" : "0 0 30px rgba(0,0,0,0.4)" }}>
          <FlagImage code={flag.code} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", padding: 8 }} />
        </div>
        <div className="geo-display" style={{ fontWeight: 700, fontSize: 18, color: T.text, marginTop: -6 }}>{flag.name}</div>
        <div className="geo-micro" style={{ fontSize: 9, color: T.muted, marginTop: -10 }}>Which region?</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 360 }}>
          {REGIONS.map(r => {
            const isCorrect = r === flag.region
            const isPick = picked === r
            let bg = T.surface, border = `2px solid ${T.line}`
            if (answered) {
              if (isCorrect) { bg = tint(ACCENT.learn, IS_CARTO ? 0.12 : 0.16); border = `2px solid ${ACCENT.learn}` }
              else if (isPick) { bg = tint(T.warm, IS_CARTO ? 0.1 : 0.14); border = `2px solid ${T.warm}` }
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
