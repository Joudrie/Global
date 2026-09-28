import { useState, useRef } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { BOT_FLAGS } from "../data/botFlags"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import FlagImage from "./FlagImage"

interface Props { onBack: () => void }

const BEST_KEY = "globalio_realorbot_best"
const loadBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 } }
const saveBest = (n: number) => { try { localStorage.setItem(BEST_KEY, String(n)) } catch { /* ignore */ } }

// A card is either a real country flag or a synthetic "bot" flag.
interface Card { real: boolean; flag?: FlagRecord; botSrc?: string }

function makeCard(): Card {
  // ~52% real; the rest are bots. (Independent draws keep it unpredictable —
  // you can hit several real ones in a row.)
  if (Math.random() < 0.52) return { real: true, flag: FLAGS[Math.floor(Math.random() * FLAGS.length)] }
  return { real: false, botSrc: BOT_FLAGS[Math.floor(Math.random() * BOT_FLAGS.length)] }
}

function RealOrBotGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [card, setCard] = useState<Card>(makeCard)
  const [nextCard, setNextCard] = useState<Card>(makeCard)   // the card waiting underneath
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(loadBest)
  const [over, setOver] = useState<null | { wasReal: boolean }>(null)
  const [exit, setExit] = useState<null | "left" | "right">(null)
  const startX = useRef<number | null>(null)
  const dragging = useRef(false)
  const [dx, setDx] = useState(0)
  const locked = useRef(false)

  // swipe right => "real", swipe left => "bot"
  const answer = (guessReal: boolean) => {
    if (over || locked.current) return
    locked.current = true
    const correct = guessReal === card.real
    setExit(guessReal ? "right" : "left")
    if (correct) {
      const ns = streak + 1
      window.setTimeout(() => {
        setStreak(ns)
        if (ns > best) { setBest(ns); saveBest(ns) }
        // the card that was peeking underneath becomes the active card
        setCard(nextCard); setNextCard(makeCard()); setDx(0); setExit(null); locked.current = false
      }, 240)
    } else {
      window.setTimeout(() => {
        if (streak > best) { setBest(streak); saveBest(streak) }
        setOver({ wasReal: card.real })
      }, 240)
    }
  }

  // The underneath card rises toward full as you drag the top card away.
  const peek = Math.min(Math.abs(dx) / 120, 1)
  const nextFlag = (c: Card) => c.real && c.flag
    ? <FlagImage code={c.flag.code} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
    : <img src={c.botSrc} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />

  const onDown = (x: number) => { if (over) return; startX.current = x; dragging.current = true }
  const onMove = (x: number) => { if (!dragging.current || startX.current === null) return; setDx(x - startX.current) }
  const onUp = () => {
    if (!dragging.current) return
    dragging.current = false
    if (Math.abs(dx) > 70) answer(dx > 0)
    else setDx(0)
    startX.current = null
  }

  const cardTransform = exit === "right" ? "translateX(120%) rotate(14deg)" : exit === "left" ? "translateX(-120%) rotate(-14deg)"
    : `translateX(${dx}px) rotate(${dx * 0.03}deg)`

  if (over) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: T.bg }}>
        <div className="w-full max-w-sm" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ borderRadius: 16, padding: 22, textAlign: "center", background: T.surface, border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 40 }}>{over.wasReal ? "🚩" : "🤖"}</div>
            <div className="geo-micro" style={{ fontSize: 10, color: ACCENT.play, marginTop: 6 }}>
              {streak >= 8 ? "🔥 Great run!" : streak >= 3 ? "👏 Nice job!" : "Good try!"}
            </div>
            <div className="geo-display" style={{ color: T.text, fontWeight: 700, fontSize: 20, marginTop: 4 }}>
              That one was {over.wasReal ? "a real flag" : "an AI fake"}
            </div>
            <div style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>
              {over.wasReal ? "You called a genuine flag a bot." : "A fabricated flag slipped past you."}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 18 }}>
              <div><div style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 30, color: ACCENT.play }}>{streak}</div><div className="geo-micro" style={{ fontSize: 8, color: T.muted }}>streak</div></div>
              <div><div style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 30, color: T.amber }}>{best}</div><div className="geo-micro" style={{ fontSize: 8, color: T.muted }}>best</div></div>
            </div>
          </div>
          <button onClick={onReplay} className="geo-tap" style={{ padding: "14px 0", borderRadius: 12, fontWeight: 700, fontFamily: FONT.display, background: ACCENT.play, color: T.onAccent }}>Go again</button>
          <button onClick={onBack} className="geo-tap" style={{ padding: "12px 0", borderRadius: 12, fontWeight: 600, background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>← Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 6px" }}>
        <button onClick={onBack} className="geo-tap" style={{ width: 34, height: 34, borderRadius: 9, background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div className="geo-micro" style={{ fontSize: 9, color: T.muted }}>Real or Bot</div>
          <div style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 18, color: ACCENT.play }}>{streak}</div>
        </div>
        <div style={{ textAlign: "right" }}><div className="geo-micro" style={{ fontSize: 8, color: T.dim }}>best</div><div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 14, color: T.amber }}>{best}</div></div>
      </header>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px 20px", position: "relative" }}>
        {/* swipe hints */}
        <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px", pointerEvents: "none" }}>
          <div style={{ opacity: dx < -30 ? 1 : 0.25, transition: "opacity 0.15s", textAlign: "center", color: T.warm }}>
            <div style={{ fontSize: 26 }}>🤖</div><div className="geo-micro" style={{ fontSize: 8 }}>BOT</div>
          </div>
          <div style={{ opacity: dx > 30 ? 1 : 0.25, transition: "opacity 0.15s", textAlign: "center", color: ACCENT.learn }}>
            <div style={{ fontSize: 26 }}>✓</div><div className="geo-micro" style={{ fontSize: 8 }}>REAL</div>
          </div>
        </div>

        {/* the flag card — the actual NEXT flag peeks through underneath, rising
            toward full as you swipe the current one away */}
        <div style={{ position: "relative", width: 300, height: 200 }}>
          <div style={{
            position: "absolute", inset: 0, zIndex: 1,
            transform: `translateY(${10 - peek * 10}px) scale(${0.95 + peek * 0.05})`,
            borderRadius: 16, overflow: "hidden", border: `1px solid ${T.lineHi}`, background: "#fff",
            opacity: 0.45 + peek * 0.45,
          }}>
            {nextFlag(nextCard)}
          </div>
          <div
            onMouseDown={e => onDown(e.clientX)} onMouseMove={e => onMove(e.clientX)} onMouseUp={onUp} onMouseLeave={onUp}
            onTouchStart={e => onDown(e.touches[0].clientX)} onTouchMove={e => onMove(e.touches[0].clientX)} onTouchEnd={onUp}
            style={{
              position: "relative", zIndex: 2,
              width: 300, height: 200, borderRadius: 16, overflow: "hidden", border: `1px solid ${T.lineHi}`,
              boxShadow: "0 14px 34px -16px rgba(31,58,60,0.5)",
              background: "#fff", cursor: "grab", touchAction: "pan-y",
              transform: cardTransform, transition: exit || !dragging.current ? "transform 0.24s ease" : "none",
            }}>
            {card.real && card.flag
              ? <FlagImage code={card.flag.code} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
              : <img src={card.botSrc} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />}
          </div>
        </div>

        <p style={{ color: T.muted, fontSize: 12, marginTop: 18, textAlign: "center", maxWidth: 280 }}>
          Swipe <b style={{ color: ACCENT.learn }}>right</b> if it's a real flag, <b style={{ color: T.warm }}>left</b> if it's an AI fake.
        </p>

        {/* tap fallbacks */}
        <div style={{ display: "flex", gap: 14, marginTop: 16 }}>
          <button onClick={() => answer(false)} className="geo-tap" style={{ width: 64, height: 64, borderRadius: "50%", fontSize: 26, background: tint(T.warm, 0.14), border: `1.5px solid ${tint(T.warm, 0.5)}`, color: T.warm }}>🤖</button>
          <button onClick={() => answer(true)} className="geo-tap" style={{ width: 64, height: 64, borderRadius: "50%", fontSize: 26, background: tint(ACCENT.learn, 0.14), border: `1.5px solid ${tint(ACCENT.learn, 0.5)}`, color: ACCENT.learn }}>✓</button>
        </div>
      </div>
    </div>
  )
}

export default function RealOrBotScreen({ onBack }: Props) {
  const [k, setK] = useState(0)
  return <RealOrBotGame key={k} onBack={onBack} onReplay={() => setK(n => n + 1)} />
}
