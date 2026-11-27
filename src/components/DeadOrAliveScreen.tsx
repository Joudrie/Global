import { useState, useEffect, useRef } from "react"
import { FLAGS } from "../data/flags"
import { HISTORICAL_FLAGS } from "../data/historicalFlags"
import { T, ACCENT, FONT } from "../ui/tokens"
import { advanceDelay, advanceTimer } from "../utils/autoAdvance"
import type { AdvanceTimer } from "../utils/autoAdvance"
import { LineIcon } from "./icons"
import { ScreenHeader } from "./ui"
import { HeaderStat, PrimaryButton, ResultCard, ResultHeader } from "./gameUi"

interface Props { onBack: () => void }

interface Card { flagUrl: string; name: string; alive: boolean; sub: string }

const ALIVE: Card[] = FLAGS.map(f => ({ flagUrl: f.flagUrl, name: f.name, alive: true, sub: f.region }))
// Skip "dead" entries that would be misleading: flags identical to a modern
// country (Weimar = today's Germany), entities that actually STILL EXIST (the
// Order of Malta and the city of Gouda are "present"), or symbols still flown
// today (the Wiphala is an official flag of Bolivia; Czechoslovakia's flag is
// the Czech Republic's, the Kingdom of Libya's is Libya's again; the Ainu
// flag and Buganda's are flown now). Eras ending "present" are alive too.
const MISLEADING = new Set(["weimar", "smom", "gouda", "inca-wiphala", "czechoslovakia", "kingdom-libya", "ainu", "buganda"])
const DEAD: Card[]  = HISTORICAL_FLAGS.filter(h => !MISLEADING.has(h.id) && !/present/i.test(h.era))
  .map(h => ({ flagUrl: h.flagUrl, name: h.name, alive: false, sub: h.era }))

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
  // The answer on screen right now; cleared the moment the game moves on, so
  // the timer and the Next button can't both move it on.
  const shown = useRef<null | { correct: boolean }>(null)
  // The next flag, drawn and loading while the answer shows.
  const upcoming = useRef<Card | null>(null)
  const timer = useRef<AdvanceTimer | null>(null)
  // A tap meant for Next can land on an answer button as the next flag
  // appears; answers are ignored for a moment after it does.
  const readyAt = useRef(0)

  const guess = (guessAlive: boolean) => {
    if (shown.current || performance.now() < readyAt.current) return
    const correct = guessAlive === card.alive
    shown.current = { correct }
    setReveal({ correct })
    if (correct) {
      const s = streak + 1
      setStreak(s)
      if (s > best) { setBest(s); try { localStorage.setItem("globalio_doa_best", String(s)) } catch { /* ignore */ } }
      const n = nextCard()
      upcoming.current = n
      try { new Image().src = n.flagUrl } catch { /* not a browser */ }
    }
  }

  const cont = () => {
    const was = shown.current
    if (!was) return
    shown.current = null
    timer.current?.cancel()
    if (!was.correct) setStreak(0)
    setCard(upcoming.current ?? nextCard())
    upcoming.current = null
    setReveal(null)
    readyAt.current = performance.now() + 350
  }

  // After an answer, move on by itself (1.2 s after a right one). A wrong
  // answer ends the run, so its result stays. Paused while the tab is hidden;
  // Next skips the wait.
  useEffect(() => {
    if (!reveal) return
    const ms = advanceDelay({ correct: reveal.correct, ended: !reveal.correct })
    if (ms === null) return
    const t = advanceTimer(cont, ms)
    timer.current = t
    const onVisibility = () => (document.hidden ? t.pause() : t.resume())
    if (document.hidden) t.pause()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      t.cancel()
      document.removeEventListener("visibilitychange", onVisibility)
      if (timer.current === t) timer.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal])

  const border = reveal ? (card.alive ? T.green : T.warm) : T.lineHi

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <ScreenHeader title="Dead or Alive" subtitle={`Best ${best}`} onBack={onBack}
        right={<HeaderStat label="Streak" accent={ACCENT.play}>{streak}</HeaderStat>} />

      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-5">
        <p style={{ fontSize: 13, color: T.muted }}>Is this a flag of a country that exists today?</p>

        <div className="transition-[border-color] duration-200 motion-reduce:transition-none" style={{
          width: 300, maxWidth: "100%", aspectRatio: "3 / 2", borderRadius: 14, overflow: "hidden",
          border: `2.5px solid ${border}`, background: "#fff", position: "relative",
        }}>
          <img src={card.flagUrl} alt="mystery flag"
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            onError={e => { (e.target as HTMLImageElement).style.opacity = "0.15" }} />
          {reveal && (
            <div className="carto-slide-up" data-reveal style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: T.text, padding: "8px 12px", textAlign: "center",
            }}>
              <div style={{ color: "#fff", fontWeight: 800 }}>{card.name}</div>
              {/* the accent lightened so it reads on the dark band */}
              <div style={{ color: `color-mix(in srgb, ${card.alive ? T.green : T.warm} 45%, #fff)`, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                {card.alive
                  ? <><LineIcon name="check" size={13} strokeWidth={2} /> Still flying today</>
                  : <><LineIcon name="skull" size={13} /> Vanished · {card.sub}</>}
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
              style={{ background: T.green, color: T.onAccent, fontFamily: FONT.display, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <LineIcon name="check" size={18} strokeWidth={2} /> Current
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-3">
            {reveal.correct
              ? <div className="geo-display" style={{ fontSize: 17, fontWeight: 700, color: T.green, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <LineIcon name="check" size={18} strokeWidth={2} /> Correct!
                </div>
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
