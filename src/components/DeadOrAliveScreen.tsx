import { useState, useEffect } from "react"
import { FLAGS } from "../data/flags"
import { HISTORICAL_FLAGS } from "../data/historicalFlags"
import { T, ACCENT, FONT } from "../ui/tokens"
import { LineIcon } from "./icons"
import { ScreenHeader } from "./ui"
import { HeaderStat, PrimaryButton, ResultCard, ResultHeader } from "./gameUi"

interface Props { onBack: () => void }

interface Card { flagUrl: string; name: string; alive: boolean; sub: string }

const ALIVE: Card[] = FLAGS.map(f => ({ flagUrl: f.flagUrl, name: f.name, alive: true, sub: f.region }))
// Skip "dead" entries that would be misleading: flags identical to a modern
// country (Weimar = today's Germany), entities that actually STILL EXIST (the
// Order of Malta and the city of Gouda are "present"), or symbols still flown
// today (the Wiphala is an official flag of Bolivia).
const MISLEADING = new Set(["weimar", "smom", "gouda", "inca-wiphala"])
const DEAD: Card[]  = HISTORICAL_FLAGS.filter(h => !MISLEADING.has(h.id)).map(h => ({ flagUrl: h.flagUrl, name: h.name, alive: false, sub: h.era }))

function nextCard(): Card {
  // ~50/50 alive vs dead
  const pool = Math.random() < 0.5 ? ALIVE : DEAD
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function DeadOrAliveScreen({ onBack }: Props) {
  const [card, setCard] = useState<Card>(nextCard)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(() => {
    try { return Number(localStorage.getItem("globalio_doa_best") ?? 0) } catch { return 0 }
  })
  const [reveal, setReveal] = useState<null | { correct: boolean }>(null)

  const guess = (guessAlive: boolean) => {
    if (reveal) return
    const correct = guessAlive === card.alive
    setReveal({ correct })
    if (correct) {
      const s = streak + 1
      setStreak(s)
      if (s > best) { setBest(s); try { localStorage.setItem("globalio_doa_best", String(s)) } catch { /* ignore */ } }
    }
  }

  const cont = () => {
    if (!reveal?.correct) setStreak(0)
    setCard(nextCard())
    setReveal(null)
  }

  // After a reveal, auto-advance after 10s (the Next button still works too).
  useEffect(() => {
    if (!reveal) return
    const t = window.setTimeout(cont, 10000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal])

  const border = reveal ? (card.alive ? T.green : T.warm) : T.lineHi

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <ScreenHeader title="Dead or Alive" subtitle={`Best ${best}`} onBack={onBack}
        right={<HeaderStat label="Streak" accent={ACCENT.play}>{streak}</HeaderStat>} />

      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-5">
        <p style={{ fontSize: 13, color: T.muted }}>Is this a flag of a country that exists today?</p>

        <div style={{
          width: 300, height: 200, borderRadius: 14, overflow: "hidden",
          border: `2.5px solid ${border}`, background: "#fff", position: "relative",
          transition: "border-color 0.2s ease",
        }}>
          <img src={card.flagUrl} alt="mystery flag"
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            onError={e => { (e.target as HTMLImageElement).style.opacity = "0.15" }} />
          {reveal && (
            <div className="animate-slide-up" style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(transparent,rgba(0,0,0,0.82))", padding: "26px 12px 10px", textAlign: "center",
            }}>
              <div style={{ color: "#fff", fontWeight: 800 }}>{card.name}</div>
              <div style={{ color: card.alive ? T.green : T.warm, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                {card.alive ? "✓ Still flying today" : <><LineIcon name="skull" size={13} /> Vanished · {card.sub}</>}
              </div>
            </div>
          )}
        </div>

        {!reveal ? (
          <div className="flex gap-3 w-full max-w-sm">
            <button onClick={() => guess(false)} className="geo-tap flex-1 py-4 rounded-xl"
              style={{ background: T.warm, color: T.onAccent, fontFamily: FONT.display, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <LineIcon name="skull" size={18} /> Vanished
            </button>
            <button onClick={() => guess(true)} className="geo-tap flex-1 py-4 rounded-xl"
              style={{ background: T.green, color: T.onAccent, fontFamily: FONT.display, fontWeight: 700 }}>
              ✓ Current
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-3">
            {reveal.correct
              ? <div className="geo-display" style={{ fontSize: 17, fontWeight: 700, color: T.green, textAlign: "center" }}>✓ Correct!</div>
              : <ResultCard>
                  <ResultHeader icon="skull" accent={T.warm} eyebrow="Run over"
                    title={`You survived ${streak}`} score={`Best streak: ${best}`} />
                </ResultCard>}
            <PrimaryButton onClick={cont} accent={ACCENT.play}>
              {reveal.correct ? "Next →" : "Try again"}
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  )
}
