import { useState } from "react"
import { FLAGS } from "../data/flags"
import { FLAG_ATTRIBS, STRIPES_V } from "../data/flagAttribs"
import { T, ACCENT, FONT, tint } from "../ui/tokens"

import { ScreenHeader } from "./ui"
import { HeaderStat, PrimaryButton, ResultCard, ResultHeader, GameIcon } from "./gameUi"

interface Props { onBack: () => void }

// ── Build a table of countable flag traits ───────────────────────────────────
// icon: a LineIcon name
interface Trait { label: string; icon: string; count: number }

function buildTraits(): Trait[] {
  const withAttr = FLAGS.filter(f => FLAG_ATTRIBS[f.code])
  const countColor = (c: string) => withAttr.filter(f => FLAG_ATTRIBS[f.code].colors.includes(c)).length
  const countFeat  = (k: 'stripes' | 'cross' | 'star' | 'crescent' | 'emblem') =>
    withAttr.filter(f => FLAG_ATTRIBS[f.code][k]).length
  const countRegion = (r: string) => FLAGS.filter(f => f.region === r).length

  return [
    { label: "Flags with red",      icon: "palette", count: countColor("red") },
    { label: "Flags with blue",     icon: "palette", count: countColor("blue") },
    { label: "Flags with green",    icon: "palette", count: countColor("green") },
    { label: "Flags with yellow",   icon: "palette", count: countColor("yellow") },
    { label: "Flags with white",    icon: "palette", count: countColor("white") },
    { label: "Flags with black",    icon: "palette", count: countColor("black") },
    { label: "Flags with orange",   icon: "palette", count: countColor("orange") },
    { label: "Flags with a star",            icon: "star", count: countFeat("star") },
    { label: "Flags with a crescent",        icon: "moon", count: countFeat("crescent") },
    { label: "Flags with a cross",           icon: "plus", count: countFeat("cross") },
    { label: "Flags with a coat of arms",    icon: "shield", count: countFeat("emblem") },
    { label: "Flags with horizontal stripes",icon: "rows", count: countFeat("stripes") },
    { label: "Flags with vertical stripes",  icon: "columns", count: withAttr.filter(f => STRIPES_V.has(f.code)).length },
    { label: "Flags from Europe",      icon: "globe", count: countRegion("Europe") },
    { label: "Flags from Africa",      icon: "globe", count: countRegion("Africa") },
    // The Middle East is part of Asia, so it is counted in (it is its own region elsewhere in the app).
    { label: "Flags from Asia and the Middle East", icon: "globe", count: countRegion("Asia") + countRegion("Middle East") },
    { label: "Flags from the Americas",icon: "globe", count: countRegion("Americas") },
  ]
}

const TRAITS = buildTraits()

interface Q { a: Trait; b: Trait; answer: boolean } // answer: is a's count > b's count?

function nextQuestion(): Q {
  for (let tries = 0; tries < 40; tries++) {
    const a = TRAITS[Math.floor(Math.random() * TRAITS.length)]
    const b = TRAITS[Math.floor(Math.random() * TRAITS.length)]
    if (a.label === b.label) continue
    if (Math.abs(a.count - b.count) < 3) continue // avoid near-ties
    return { a, b, answer: a.count > b.count }
  }
  return { a: TRAITS[0], b: TRAITS[1], answer: TRAITS[0].count > TRAITS[1].count }
}

// localStorage can throw (private mode, blocked storage) — the best streak is a nicety.
const BEST_KEY = "globalio_hl_best"
function loadBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY) ?? 0) || 0 } catch { return 0 }
}
function saveBest(n: number) {
  try { localStorage.setItem(BEST_KEY, String(n)) } catch { /* ignore */ }
}

export default function HigherLowerScreen({ onBack }: Props) {
  const [q, setQ] = useState<Q>(nextQuestion)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(loadBest)
  const [reveal, setReveal] = useState<null | { correct: boolean }>(null)

  const answer = (guessMoreA: boolean) => {
    if (reveal) return
    const correct = guessMoreA === q.answer
    setReveal({ correct })
    if (correct) {
      const s = streak + 1
      setStreak(s)
      if (s > best) { setBest(s); saveBest(s) }
    }
  }

  const cont = () => {
    if (reveal?.correct) { setQ(nextQuestion()); setReveal(null) }
    else { setStreak(0); setQ(nextQuestion()); setReveal(null) }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <ScreenHeader title="Higher or Lower" subtitle={`Best ${best}`} onBack={onBack}
        right={<HeaderStat label="Streak" accent={ACCENT.play}>{streak}</HeaderStat>} />

      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-5">
        <div className="text-center">
          <h2 className="geo-display" style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Which is more common?</h2>
          <p style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Tap the one you think covers more countries, or use the buttons.</p>
        </div>

        {/* Trait A — tap it to say "this one has more" */}
        <button onClick={() => answer(true)} disabled={!!reveal}
          className="geo-tap w-full max-w-sm rounded-2xl px-5 py-6 text-center"
          style={{ background: reveal && q.answer ? tint(T.green, 0.18) : T.surface, border: `1.5px solid ${reveal && q.answer ? T.green : tint(ACCENT.play, 0.4)}`, cursor: reveal ? "default" : "pointer", transition: "background 0.2s ease, border-color 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "center", color: ACCENT.play }}><GameIcon name={q.a.icon} size={28} /></div>
          <div className="geo-display" style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: T.text }}>{q.a.label}</div>
          {reveal && <div style={{ fontFamily: FONT.mono, fontSize: 24, fontWeight: 800, marginTop: 4, color: ACCENT.play }}>{q.a.count}</div>}
        </button>

        <div className="geo-micro" style={{ fontSize: 11, color: T.muted }}>or</div>

        {/* Trait B — tap it to say "this one has more" */}
        <button onClick={() => answer(false)} disabled={!!reveal}
          className="geo-tap w-full max-w-sm rounded-2xl px-5 py-6 text-center"
          style={{ background: reveal && !q.answer ? tint(T.green, 0.18) : T.surface, border: `1.5px solid ${reveal && !q.answer ? T.green : tint(ACCENT.play, 0.4)}`, cursor: reveal ? "default" : "pointer", transition: "background 0.2s ease, border-color 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "center", color: ACCENT.play }}><GameIcon name={q.b.icon} size={28} /></div>
          <div className="geo-display" style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: T.text }}>{q.b.label}</div>
          {reveal && <div style={{ fontFamily: FONT.mono, fontSize: 24, fontWeight: 800, marginTop: 4, color: ACCENT.play }}>{q.b.count}</div>}
        </button>

        {!reveal ? (
          <div className="flex gap-3 w-full max-w-sm">
            <button onClick={() => answer(true)} className="geo-tap flex-1 py-3.5 rounded-xl"
              style={{ background: T.green, color: T.onAccent, fontFamily: FONT.display, fontWeight: 700 }}>
              More ↑ (top)
            </button>
            <button onClick={() => answer(false)} className="geo-tap flex-1 py-3.5 rounded-xl"
              style={{ background: T.warm, color: T.onAccent, fontFamily: FONT.display, fontWeight: 700 }}>
              More ↓ (bottom)
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-3">
            {reveal.correct
              ? <div className="geo-display" style={{ fontSize: 17, fontWeight: 700, color: T.green, textAlign: "center" }}>✓ Correct!</div>
              : <ResultCard>
                  <ResultHeader icon="trending-down" accent={T.warm} eyebrow="Run over"
                    title={`Streak ended at ${streak}`} score={`Best streak: ${best}`} />
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
