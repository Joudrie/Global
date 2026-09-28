import { useState } from "react"
import { SUB_FLAGS } from "../data/subdivisions"
import type { SubFlag } from "../data/subdivisions"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader, FlagLoadFailed, MAX_FLAG_RETRIES } from "./ui"

interface Props { onBack: () => void; onSubLearned: (code: string) => void }

const ROUNDS = 6
const A = ACCENT.learn
function shuffle<X>(a: X[]): X[] { return [...a].sort(() => Math.random() - 0.5) }

interface Round { target: SubFlag; choices: string[] }

function buildRound(target: SubFlag): Round {
    const sameCont = Array.from(new Set(
      SUB_FLAGS.filter(s => s.continent === target.continent && s.countryName !== target.countryName).map(s => s.countryName)
    ))
    let distract = shuffle(sameCont).slice(0, 3)
    if (distract.length < 3) {
      const extra = Array.from(new Set(SUB_FLAGS.filter(s => s.countryName !== target.countryName).map(s => s.countryName)))
      distract = shuffle([...distract, ...extra.filter(c => !distract.includes(c))]).slice(0, 3)
    }
    return { target, choices: shuffle([target.countryName, ...distract]) }
}

function buildRounds(): Round[] {
  return shuffle(SUB_FLAGS).slice(0, ROUNDS).map(buildRound)
}

function SubdivisionStumperScreenGame({ onBack, onSubLearned , onReplay }: Props & { onReplay: () => void }) {
  const [rounds, setRounds] = useState(buildRounds)
  const [fails, setFails] = useState(0)
  const [broken, setBroken] = useState<Set<string>>(() => new Set())
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [scores, setScores] = useState<boolean[]>([])
  const [done, setDone] = useState(false)

  const round = rounds[idx]
  const answered = picked !== null

  const choose = (c: string) => {
    if (answered) return
    setPicked(c)
    const ok = c === round.target.countryName
    if (ok) onSubLearned(round.target.code)
    setScores(s => [...s, ok])
  }

  // A flag that won't load makes the round unwinnable: swap in a different
  // subdivision (not counted as a guess). Give up after MAX_FLAG_RETRIES.
  const reroll = (failed?: string) => {
    const bad = new Set(broken)
    if (failed) bad.add(failed)
    setBroken(bad)
    const used = new Set(rounds.map(r => r.target.code))
    const pool = SUB_FLAGS.filter(s => !bad.has(s.code) && !used.has(s.code))
    const fresh = pool.length ? pool : SUB_FLAGS.filter(s => s.code !== rounds[idx].target.code)
    const target = fresh[Math.floor(Math.random() * fresh.length)]
    setRounds(rs => rs.map((r, i) => (i === idx ? buildRound(target) : r)))
  }
  const onFlagError = () => {
    if (answered) return
    setFails(f => f + 1)
    reroll(round.target.code)
  }
  const retry = () => { setFails(0); reroll() }

  const next = () => {
    if (idx + 1 >= rounds.length) { setDone(true); return }
    setIdx(i => i + 1)
    setPicked(null)
  }

  if (done) {
    const correct = scores.filter(Boolean).length
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: T.bg, color: T.text }}>
        <div className="w-full max-w-sm">
          <div className="rounded-2xl p-6 text-center mb-4" style={{ background: T.surface, border: `1px solid ${tint(T.green, 0.3)}` }}>
            <div className="text-5xl mb-3">{correct >= ROUNDS * 0.8 ? "🗺️" : correct >= ROUNDS * 0.5 ? "📍" : "🧭"}</div>
            <div className="text-5xl font-black mb-1" style={{ color: T.text, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" }}>{correct} / {ROUNDS}</div>
            <div className="text-sm mb-3" style={{ color: T.muted }}>subdivisions placed</div>
            <div className="flex justify-center gap-2 flex-wrap">{scores.map((s, i) => <span key={i} style={{ fontSize: 22 }}>{s ? "🟩" : "🟥"}</span>)}</div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={onReplay} className="w-full py-3.5 rounded-xl font-bold transition-all active:scale-95" style={{ background: T.green, color: T.onAccent, fontFamily: FONT.display }}>Play Again</button>
            <button onClick={onBack} className="w-full py-3.5 rounded-xl font-bold transition-all active:scale-95" style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>← Home</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Subdivision Stumper" subtitle={`Round ${idx + 1} / ${ROUNDS}`} onBack={onBack}
        right={
          <div className="flex gap-1.5">
            {rounds.map((_, i) => (<div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i < scores.length ? (scores[i] ? T.green : T.danger) : T.line }} />))}
          </div>
        } />

      {fails >= MAX_FLAG_RETRIES ? (
        <div className="flex flex-col items-center px-5 gap-4">
          <FlagLoadFailed onRetry={retry} onBack={onBack} />
        </div>
      ) : (
      <div className="flex flex-col items-center px-5 gap-4">
        <div style={{ width: 280, height: 186, borderRadius: 14, overflow: "hidden", border: `2px solid ${tint(A, 0.3)}`, boxShadow: `0 6px 18px -10px ${tint(T.text, 0.5)}`, background: T.surfaceHi }}>
          <img key={round.target.code} src={round.target.flagUrl} alt="subdivision flag" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            onLoad={() => setFails(0)} onError={onFlagError} />
        </div>
        {/* answer sits right under the flag once you've guessed */}
        {answered
          ? <div className="w-full max-w-sm px-4 py-2.5 rounded-xl text-sm text-center" style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>
              {round.target.countryEmoji} <span style={{ color: T.text, fontWeight: 600 }}>{round.target.name}</span> — {round.target.countryName}
            </div>
          : <div className="text-sm font-semibold" style={{ color: T.green }}>This is a subdivision of which country?</div>}

        <div className="grid grid-cols-1 gap-2.5 w-full max-w-sm">
          {round.choices.map(c => {
            const isAnswer = c === round.target.countryName
            const isChosen = picked === c
            let border = `2px solid ${T.line}`
            if (answered) { if (isAnswer) border = `2px solid ${T.green}`; else if (isChosen) border = `2px solid ${T.danger}` }
            return (
              <button key={c} onClick={() => choose(c)} disabled={answered}
                className="py-3 px-4 rounded-xl font-semibold text-sm transition-all active:scale-95"
                style={{ background: T.surface, border, color: T.text, textAlign: "left" }}>
                {c}
                {answered && isAnswer && <span style={{ float: "right", color: T.green }}>✓</span>}
                {answered && isChosen && !isAnswer && <span style={{ float: "right", color: T.danger }}>✗</span>}
              </button>
            )
          })}
        </div>

        {answered && (
          <button onClick={next} className="w-full max-w-sm py-3.5 rounded-xl font-bold transition-all active:scale-95" style={{ background: T.green, color: T.onAccent, fontFamily: FONT.display }}>
            {idx + 1 >= ROUNDS ? "See Results →" : "Next →"}
          </button>
        )}
      </div>
      )}
    </div>
  )
}

export default function SubdivisionStumperScreen({ onBack, onSubLearned }: Props) {
  const [replayKey, setReplayKey] = useState(0)
  return <SubdivisionStumperScreenGame key={replayKey} onBack={onBack} onSubLearned={onSubLearned} onReplay={() => setReplayKey(k => k + 1)} />
}
