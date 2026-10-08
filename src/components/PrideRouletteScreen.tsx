import { useEffect, useState, useMemo } from "react"
import { LGBTQ_FLAGS } from "../data/identityFlags"
import type { IdentityFlag } from "../data/identityFlags"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"


interface Props { onBack: () => void }

const DEFAULT_LEN = 10

// One best per deck length, so an "All" score can't sit on top of the 10-flag one.
const bestKey = (len: number) => len === DEFAULT_LEN ? "globalio_prideroulette_best" : `globalio_prideroulette_best_${len}`
const loadBest = (len: number) => { try { return Number(localStorage.getItem(bestKey(len))) || 0 } catch { return 0 } }
const saveBest = (len: number, n: number) => { try { localStorage.setItem(bestKey(len), String(n)) } catch { /* ignore */ } }


interface Round { target: IdentityFlag; choices: IdentityFlag[] }

// A fixed-length deck: `len` distinct targets, each with three distractors.
// Wrong answers no longer end the run — you play all the way through and get a
// score out of `len`. "All" runs the entire pride set.
function buildDeck(len: number): Round[] {
  const pool = [...LGBTQ_FLAGS].sort(() => Math.random() - 0.5)
  const targets = pool.slice(0, Math.min(len, pool.length))
  return targets.map(target => {
    const distractors = LGBTQ_FLAGS
      .filter(f => f.id !== target.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
    return { target, choices: [target, ...distractors].sort(() => Math.random() - 0.5) }
  })
}

export default function PrideRouletteScreen({ onBack }: Props) {
  const [len, setLen] = useState(DEFAULT_LEN)
  const total = Math.min(len, LGBTQ_FLAGS.length)
  const [seed, setSeed] = useState(0)
  const deck = useMemo(() => buildDeck(len), [len, seed])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [best, setBest] = useState(() => loadBest(len))
  useEffect(() => { setBest(loadBest(len)) }, [len])
  const [done, setDone] = useState(false)

  const round = deck[idx]
  const answered = picked !== null
  const isLast = idx === total - 1

  const restart = (newLen?: number) => {
    if (newLen !== undefined) setLen(newLen)
    setSeed(s => s + 1); setIdx(0); setScore(0); setPicked(null); setDone(false)
  }

  const pick = (id: string) => {
    if (answered) return
    setPicked(id)
    if (id === round.target.id) setScore(s => s + 1)
  }

  const next = () => {
    if (isLast) {
      const finalRight = score
      if (finalRight > best) { setBest(finalRight); saveBest(len, finalRight) }
      setDone(true)
    } else { setIdx(i => i + 1); setPicked(null) }
  }

  // ── Results ──────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, minHeight: "100vh", color: T.text }}>
        <ScreenHeader title="Pride Roulette" subtitle="Results" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3">
          <ResultCard>
            <ResultHeader icon="identity" accent={ACCENT.play} title={`${score} of ${total} pride flags`} score={`Best: ${best}`} />
          </ResultCard>
          <PrimaryButton onClick={() => restart()} accent={ACCENT.play}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: T.bg, minHeight: "100vh", color: T.text }}>
      <ScreenHeader title="Pride Roulette" subtitle={`${score} correct · Best ${best}`} onBack={onBack}
        right={<HeaderStat accent={ACCENT.play}>{idx + 1} / {total}</HeaderStat>} />

      {/* Length toggle — 10 (default) or the whole set */}
      <div className="flex justify-center mt-1 mb-2">
        <div style={{ display: "flex", gap: 3, background: T.surface, borderRadius: 999, padding: 3, border: `1px solid ${T.line}` }}>
          {[["10", DEFAULT_LEN], ["All", LGBTQ_FLAGS.length]].map(([label, n]) => {
            const on = len === n
            return (
              <button key={label} onClick={() => restart(n as number)}
                style={{ fontSize: 11.5, fontWeight: 700, padding: "5px 14px", borderRadius: 999, border: "none", cursor: "pointer", background: on ? ACCENT.play : "transparent", color: on ? T.onAccent : T.muted }}>{label}</button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-5 gap-4">
        <p className="text-sm" style={{ color: T.muted }}>Name that pride flag.</p>

        {/* Flag */}
        <div style={{
          width: 300, height: 200, borderRadius: 12, overflow: "hidden",
          border: `2px solid ${answered ? (picked === round.target.id ? T.green : T.danger) : T.line}`,
          background: T.surface, position: "relative",
          boxShadow: `0 10px 28px -12px ${tint(T.text, 0.45)}`,
        }}>
          <img src={round.target.flagUrl} alt="pride flag"
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", padding: 8 }}
            onError={e => { (e.target as HTMLImageElement).style.opacity = "0.15" }} />
        </div>

        {/* Choices */}
        <div className="grid grid-cols-1 gap-2.5 w-full max-w-sm">
          {round.choices.map(f => {
            const isTarget = f.id === round.target.id
            const isChosen = picked === f.id
            let border = `1.5px solid ${T.line}`
            if (answered) {
              if (isTarget) border = `2px solid ${T.green}`
              else if (isChosen) border = `2px solid ${T.danger}`
            }
            return (
              <button key={f.id} onClick={() => pick(f.id)} disabled={answered}
                className="py-3 px-4 rounded-xl font-semibold text-sm transition-all active:scale-95"
                style={{ background: T.surface, border, color: T.text, textAlign: "left" }}>
                {f.name}
                {answered && isTarget && <span style={{ float: "right", color: T.green }}>✓</span>}
                {answered && isChosen && !isTarget && <span style={{ float: "right", color: T.danger }}>✗</span>}
              </button>
            )
          })}
        </div>

        {answered && (
          <PrimaryButton onClick={next} accent={ACCENT.play} style={{ maxWidth: 384 }}>
            {isLast ? "See score →" : "Next →"}
          </PrimaryButton>
        )}
      </div>
    </div>
  )
}
