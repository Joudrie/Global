import { useState, useRef, useMemo } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { FAKE_FLAGS, FAKE_CODES } from "../data/fakeFlags"
import type { FakeFlag } from "../data/fakeFlags"
import { T, ACCENT, tint } from "../ui/tokens"
import FlagImage from "./FlagImage"
import { LineIcon } from "./icons"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, ResultStats, PrimaryButton, SecondaryButton, GameIcon } from "./gameUi"

interface Props { onBack: () => void }

const BEST_KEY = "globalio_forgery_best"
const loadBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 } }
const saveBest = (n: number) => { try { localStorage.setItem(BEST_KEY, String(n)) } catch { /* ignore */ } }

// A card is either a genuine country flag or one of the doctored forgeries.
type Card = { fake: false; flag: FlagRecord } | { fake: true; forgery: FakeFlag }

// The forgery library keeps growing, so each round draws a fresh hand of
// fakes rather than dealing every one — rounds stay varied and the real:fake
// ratio stays honest.
const REAL_COUNT = 11  // + FAKE_COUNT forgeries = a 20-card round
const FAKE_COUNT = 9   // forgeries drawn per round from the larger pool

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Each round draws a fresh handful of forgeries from the pool plus genuine flags
// drawn fresh too. No forged country ever appears as a real card in the same
// deck — seeing the real Spain next to the doctored one would give it away.
function buildDeck(): Card[] {
  const forgeries = shuffle(FAKE_FLAGS).slice(0, FAKE_COUNT)
  const reals = shuffle(FLAGS.filter(f => !FAKE_CODES.has(f.code))).slice(0, REAL_COUNT)
  return shuffle([
    ...reals.map((flag): Card => ({ fake: false, flag })),
    ...forgeries.map((forgery): Card => ({ fake: true, forgery })),
  ])
}

const cardName = (c: Card) => c.fake ? c.forgery.name : c.flag.name
const cardImg = (c: Card) => c.fake
  ? <img src={c.forgery.src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
  : <FlagImage code={c.flag.code} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />

interface Verdict { ok: boolean; text: string }

function ForgeryGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const deck = useMemo(buildDeck, [])
  const roundForgeries = useMemo(() => deck.flatMap(c => (c.fake ? [c.forgery] : [])), [deck])
  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(loadBest)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [caught, setCaught] = useState<Record<string, boolean>>({})   // forgery code → spotted?
  const [falseAlarms, setFalseAlarms] = useState<FlagRecord[]>([])    // real flags called fake
  const [done, setDone] = useState(false)
  const [exit, setExit] = useState<null | "left" | "right">(null)
  const startX = useRef<number | null>(null)
  const dragging = useRef(false)
  const [dx, setDx] = useState(0)
  const locked = useRef(false)

  const card = deck[i]
  const nextCard = deck[i + 1]

  // swipe right => "correct flag", swipe left => "doctored"
  const answer = (guessReal: boolean) => {
    if (done || locked.current) return
    locked.current = true
    const correct = guessReal !== card.fake
    const ns = correct ? score + 1 : score
    if (card.fake) {
      setCaught(m => ({ ...m, [card.forgery.code]: correct }))
      setVerdict(correct
        ? { ok: true, text: `Doctored! ${card.forgery.short}.` }
        : { ok: false, text: `Fooled — ${card.forgery.name} was doctored. ${card.forgery.short}.` })
    } else {
      if (!correct) setFalseAlarms(a => [...a, card.flag])
      setVerdict(correct
        ? { ok: true, text: `Correct — that's the real ${card.flag.name}.` }
        : { ok: false, text: `That was the genuine ${card.flag.name}.` })
    }
    setExit(guessReal ? "right" : "left")
    window.setTimeout(() => {
      setScore(ns)
      if (i + 1 >= deck.length) {
        if (ns > best) { setBest(ns); saveBest(ns) }
        setDone(true)
      } else {
        setI(i + 1)
      }
      setDx(0); setExit(null); locked.current = false
    }, 260)
  }

  // The underneath card rises toward full as you drag the top card away.
  const peek = Math.min(Math.abs(dx) / 120, 1)

  const onDown = (x: number) => { if (done) return; startX.current = x; dragging.current = true }
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

  if (done) {
    const spotted = roundForgeries.filter(f => caught[f.code]).length
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, overflowY: "auto" }}>
        <ScreenHeader title="Flag Forgery" subtitle="Round complete" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ResultCard>
            <ResultHeader icon="forgery" accent={ACCENT.play}
              eyebrow={score >= 18 ? "Eagle eyes" : score >= 14 ? "Sharp work" : "Good try"}
              title={`You spotted ${spotted} of ${roundForgeries.length} forgeries`} />
            <ResultStats stats={[
              { label: "Score", value: <>{score}<span style={{ fontSize: 15, color: T.muted }}>/{deck.length}</span></>, accent: ACCENT.play },
              { label: "Best", value: best, accent: T.amber },
            ]} />
          </ResultCard>

          {/* recap: every forgery, what was doctored, and whether it slipped past */}
          <div style={{ borderRadius: 16, padding: "14px 16px", background: T.surface, border: `1px solid ${T.line}`, display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="geo-micro" style={{ fontSize: 11, color: T.muted }}>The forgeries</div>
            {roundForgeries.map(f => (
              <div key={f.code} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <img src={f.src} alt="" style={{ width: 54, height: 36, objectFit: "cover", borderRadius: 5, border: `1px solid ${T.line}`, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: T.text, fontWeight: 700, fontSize: 13 }}>{f.name}</span>
                    <span className="geo-micro" style={{ fontSize: 11, color: caught[f.code] ? ACCENT.learn : T.warm }}>
                      {caught[f.code] ? "✓ caught" : "✗ fooled you"}
                    </span>
                  </div>
                  <div style={{ color: T.muted, fontSize: 11, marginTop: 2, lineHeight: 1.45 }}>{f.reason}</div>
                </div>
              </div>
            ))}
            {falseAlarms.length > 0 && (
              <div style={{ color: T.muted, fontSize: 11, borderTop: `1px solid ${T.line}`, paddingTop: 10 }}>
                False alarms — these were genuine: <b style={{ color: T.text }}>{falseAlarms.map(f => f.name).join(", ")}</b>
              </div>
            )}
          </div>

          <PrimaryButton onClick={onReplay} accent={ACCENT.play}>New round</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, overflowX: "clip" }}>
      <ScreenHeader title="Flag Forgery" subtitle={`Card ${i + 1} / ${deck.length} · Best ${best}`} onBack={onBack}
        right={<HeaderStat label="Score" accent={ACCENT.play}>{score}</HeaderStat>} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px 20px", position: "relative" }}>
        {/* swipe hints */}
        <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px", pointerEvents: "none" }}>
          <div style={{ opacity: dx < -30 ? 1 : 0.25, transition: "opacity 0.15s", textAlign: "center", color: T.warm }}>
            <div style={{ display: "flex", justifyContent: "center" }}><GameIcon name="scissors" size={26} /></div><div className="geo-micro" style={{ fontSize: 11, marginTop: 4 }}>Doctored</div>
          </div>
          <div style={{ opacity: dx > 30 ? 1 : 0.25, transition: "opacity 0.15s", textAlign: "center", color: ACCENT.learn }}>
            <div style={{ display: "flex", justifyContent: "center" }}><LineIcon name="check" size={26} /></div><div className="geo-micro" style={{ fontSize: 11, marginTop: 4 }}>Correct</div>
          </div>
        </div>

        {/* country name — you're judging the artwork, not guessing the country */}
        <div className="geo-display" style={{ color: T.text, fontWeight: 700, fontSize: 17, marginBottom: 14 }}>{cardName(card)}</div>

        {/* the flag card — the actual NEXT flag peeks through underneath */}
        <div style={{ position: "relative", width: 300, height: 200 }}>
          {nextCard && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 1,
              transform: `translateY(${10 - peek * 10}px) scale(${0.95 + peek * 0.05})`,
              borderRadius: 16, overflow: "hidden", border: `1px solid ${T.lineHi}`, background: "#fff",
              opacity: 0.45 + peek * 0.45,
            }}>
              {cardImg(nextCard)}
            </div>
          )}
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
            {cardImg(card)}
          </div>
        </div>

        {/* verdict from the previous card, or the how-to before the first swipe */}
        <p style={{ fontSize: 12, marginTop: 18, textAlign: "center", maxWidth: 300, minHeight: 34, lineHeight: 1.45, color: verdict ? (verdict.ok ? ACCENT.learn : T.warm) : T.muted }}>
          {verdict
            ? verdict.text
            : <>Swipe <b style={{ color: ACCENT.learn }}>right</b> if the flag is correct, <b style={{ color: T.warm }}>left</b> if it's been doctored.</>}
        </p>

        {/* tap fallbacks */}
        <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
          <button onClick={() => answer(false)} aria-label="Doctored" className="geo-tap" style={{ width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: tint(T.warm, 0.14), border: `1.5px solid ${tint(T.warm, 0.5)}`, color: T.warm }}><GameIcon name="scissors" size={26} /></button>
          <button onClick={() => answer(true)} aria-label="Correct flag" className="geo-tap" style={{ width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: tint(ACCENT.learn, 0.14), border: `1.5px solid ${tint(ACCENT.learn, 0.5)}`, color: ACCENT.learn }}><LineIcon name="check" size={26} /></button>
        </div>
      </div>
    </div>
  )
}

export default function ForgeryScreen({ onBack }: Props) {
  const [k, setK] = useState(0)
  return <ForgeryGame key={k} onBack={onBack} onReplay={() => setK(n => n + 1)} />
}
