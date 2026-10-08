import { useState } from "react"
import { US_CITY_FLAGS } from "../data/usCityFlags"
import type { CityFlag } from "../data/usCityFlags"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { FlagLoadFailed, MAX_FLAG_RETRIES, HeaderStat, ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"

interface Props { onBack: () => void }

const ROUNDS = 8
const shuffle = <X,>(a: X[]): X[] => [...a].sort(() => Math.random() - 0.5)

interface Round { target: CityFlag; choices: CityFlag[] }

function buildRound(target: CityFlag): Round {
  const others = shuffle(US_CITY_FLAGS.filter(c => c.id !== target.id)).slice(0, 3)
  return { target, choices: shuffle([target, ...others]) }
}

function buildRounds(): Round[] {
  return shuffle(US_CITY_FLAGS).slice(0, ROUNDS).map(buildRound)
}

function USCityFlagGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [rounds, setRounds] = useState(buildRounds)
  const [fails, setFails] = useState(0)
  const [broken, setBroken] = useState<Set<string>>(() => new Set())
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [scores, setScores] = useState<boolean[]>([])
  const [done, setDone] = useState(false)

  const round = rounds[idx]
  const answered = picked !== null

  const choose = (id: string) => {
    if (answered) return
    setPicked(id)
    setScores(s => [...s, id === round.target.id])
  }

  // A flag that won't load makes the round unwinnable: swap in a different
  // city (not counted as a guess). Give up after MAX_FLAG_RETRIES.
  const reroll = (failed?: string) => {
    const bad = new Set(broken)
    if (failed) bad.add(failed)
    setBroken(bad)
    const used = new Set(rounds.map(r => r.target.id))
    const pool = US_CITY_FLAGS.filter(c => !bad.has(c.id) && !used.has(c.id))
    const fresh = pool.length ? pool : US_CITY_FLAGS.filter(c => c.id !== rounds[idx].target.id)
    const target = fresh[Math.floor(Math.random() * fresh.length)]
    setRounds(rs => rs.map((r, i) => (i === idx ? buildRound(target) : r)))
  }
  const onFlagError = () => {
    if (answered) return
    setFails(f => f + 1)
    reroll(round.target.id)
  }
  const retry = () => { setFails(0); reroll() }

  const next = () => {
    if (idx + 1 >= rounds.length) { setDone(true); return }
    setIdx(i => i + 1); setPicked(null)
  }

  if (done) {
    const correct = scores.filter(Boolean).length
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
        <ScreenHeader title="US City Flags" subtitle="Round complete" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ResultCard>
            <ResultHeader icon={correct >= ROUNDS * 0.75 ? "trophy" : correct >= ROUNDS * 0.4 ? "building" : "compass"} accent={ACCENT.play}
              title={`${correct} of ${ROUNDS} city flags named`}
              score={correct >= ROUNDS * 0.75 ? "You know your city flags." : "City flags are a deep cut. Try another round."} />
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={ACCENT.play}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <ScreenHeader title="US City Flags" subtitle={`${scores.filter(Boolean).length} correct so far`} onBack={onBack}
        right={<HeaderStat accent={ACCENT.play}>{idx + 1} / {ROUNDS}</HeaderStat>} />

      {fails >= MAX_FLAG_RETRIES ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 18px 24px" }}>
          <FlagLoadFailed onRetry={retry} onBack={onBack} accent={ACCENT.play} />
        </div>
      ) : (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 18px 24px", gap: 16 }}>
        <div className="geo-micro" style={{ fontSize: 11, color: T.muted }}>Which U.S. city flies this flag?</div>

        {/* flag — contain so nothing's cropped */}
        <div style={{ width: 260, height: 173, borderRadius: 14, overflow: "hidden", border: `1px solid ${T.lineHi}`, background: "#fff", boxShadow: "0 12px 28px -14px rgba(31,58,60,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
          <img key={round.target.id} src={round.target.flagUrl} alt="city flag"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
            onLoad={() => setFails(0)} onError={onFlagError} />
        </div>

        {answered && (
          <div className="w-full max-w-sm" style={{ padding: "12px 14px", borderRadius: 12, background: T.surface, border: `1px solid ${T.line}` }}>
            <div className="geo-display" style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{round.target.name}, {round.target.state}</div>
            <p style={{ color: T.muted, fontSize: 11.5, lineHeight: 1.5, marginTop: 4 }}>{round.target.note}</p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, width: "100%", maxWidth: 360 }}>
          {round.choices.map(c => {
            const isAnswer = c.id === round.target.id
            const isChosen = picked === c.id
            let border = `2px solid ${T.line}`, bg = T.surface
            if (answered) {
              if (isAnswer) { border = `2px solid ${ACCENT.codex}`; bg = tint(ACCENT.codex, 0.1) }
              else if (isChosen) { border = `2px solid ${T.warm}`; bg = tint(T.warm, 0.1) }
            }
            return (
              <button key={c.id} onClick={() => choose(c.id)} disabled={answered} className="geo-tap"
                style={{ padding: "12px 10px", borderRadius: 12, background: bg, border, color: T.text, fontSize: 13.5, fontWeight: 600, textAlign: "center", transition: "background 0.2s ease, border-color 0.2s ease" }}>
                {c.name}
              </button>
            )
          })}
        </div>

        {answered && (
          <PrimaryButton onClick={next} accent={ACCENT.play} style={{ marginTop: "auto", maxWidth: 360 }}>
            {idx + 1 >= ROUNDS ? "See result →" : "Next →"}
          </PrimaryButton>
        )}
      </div>
      )}
    </div>
  )
}

export default function USCityFlagScreen({ onBack }: Props) {
  const [k, setK] = useState(0)
  return <USCityFlagGame key={k} onBack={onBack} onReplay={() => setK(n => n + 1)} />
}
