import { useState } from "react"
import { CAPITALS } from "../data/capitals"
import type { CapitalRecord } from "../data/capitals"
import { FLAGS } from "../data/flags"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import FlagImage from "./FlagImage"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"

interface Props { onBack: () => void }

const ROUNDS = 4
const PER = 5
const shuffle = <X,>(a: X[]): X[] => [...a].sort(() => Math.random() - 0.5)
const POOL = CAPITALS.filter(c => FLAGS.some(f => f.code === c.code))

interface Round { left: CapitalRecord[]; right: CapitalRecord[] }
function buildRounds(): Round[] {
  const picks = shuffle(POOL)
  const rounds: Round[] = []
  for (let i = 0; i < ROUNDS; i++) {
    const set = picks.slice(i * PER, i * PER + PER)
    rounds.push({ left: set, right: shuffle(set) })
  }
  return rounds
}

function CapitalMatchGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [rounds] = useState(buildRounds)
  const [idx, setIdx] = useState(0)
  const [sel, setSel] = useState<string | null>(null)        // selected flag code
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [wrong, setWrong] = useState<string | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [done, setDone] = useState(false)

  const round = rounds[idx]

  const pickCapital = (code: string) => {
    if (matched.has(code)) return
    if (!sel) return
    if (sel === code) {
      const next = new Set(matched).add(code)
      setMatched(next); setSel(null)
      if (next.size === round.left.length) {
        setTimeout(() => {
          if (idx + 1 >= rounds.length) { setDone(true); return }
          setIdx(i => i + 1); setMatched(new Set()); setSel(null)
        }, 350)
      }
    } else {
      if (wrong === code) return   // a double tap is one mistake
      setWrong(code); setMistakes(m => m + 1)
      setTimeout(() => setWrong(null), 600)
    }
  }

  if (done) {
    const total = ROUNDS * PER
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
        <ScreenHeader title="Capital Match" subtitle="Round complete" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ResultCard>
            <ResultHeader icon="capitalmatch" accent={ACCENT.learn}
              title={`All ${total} capitals matched`}
              score={mistakes === 0 ? "Flawless, no mistakes." : `${mistakes} mistake${mistakes === 1 ? "" : "s"}`} />
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={ACCENT.learn}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <ScreenHeader title="Capital Match" subtitle="Tap a flag, then its capital city" onBack={onBack}
        right={<div style={{ display: "flex", gap: 6 }}>
          {mistakes > 0 && <HeaderStat label="Mistakes" accent={T.danger}>{mistakes}</HeaderStat>}
          <HeaderStat accent={ACCENT.learn}>{idx + 1} / {ROUNDS}</HeaderStat>
        </div>} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 16px 22px", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 10, flex: 1 }}>
          {/* flags */}
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {round.left.map(c => {
              const isMatched = matched.has(c.code)
              const isSel = sel === c.code
              return (
                <button key={c.code} onClick={() => !isMatched && setSel(isSel ? null : c.code)} className="geo-tap"
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: 7, borderRadius: 10, flex: 1,
                    background: isMatched ? tint(ACCENT.learn, 0.12) : T.surface,
                    border: `2px solid ${isMatched ? ACCENT.learn : isSel ? ACCENT.codex : T.line}`,
                    opacity: isMatched ? 0.55 : 1, transition: "border-color 0.15s, background 0.15s, opacity 0.2s" }}>
                  <div style={{ width: 58, height: 39, borderRadius: 5, overflow: "hidden", flexShrink: 0, border: `1px solid ${T.line}` }}>
                    <FlagImage code={c.code} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <span style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 12, color: T.text, textAlign: "left", lineHeight: 1.1 }}>{c.country}</span>
                </button>
              )
            })}
          </div>
          {/* capitals */}
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {round.right.map(c => {
              const isMatched = matched.has(c.code)
              const isWrong = wrong === c.code
              return (
                <button key={c.code} onClick={() => pickCapital(c.code)} disabled={isMatched} className={`geo-tap ${isWrong ? "animate-wrong-shake" : ""}`}
                  style={{ display: "flex", alignItems: "center", padding: "8px 12px", borderRadius: 10, flex: 1,
                    background: isMatched ? tint(ACCENT.learn, 0.12) : isWrong ? tint(T.danger, 0.12) : T.surface,
                    border: `2px solid ${isMatched ? ACCENT.learn : isWrong ? T.danger : sel ? tint(ACCENT.codex, 0.5) : T.line}`,
                    opacity: isMatched ? 0.55 : 1, transition: "border-color 0.15s" }}>
                  <span style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 13, color: T.text, textAlign: "left" }}>{c.capital}</span>
                  {isMatched && <span style={{ marginLeft: "auto", color: ACCENT.learn }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CapitalMatchScreen({ onBack }: Props) {
  const [k, setK] = useState(0)
  return <CapitalMatchGame key={k} onBack={onBack} onReplay={() => setK(n => n + 1)} />
}
