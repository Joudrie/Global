import { useState } from "react"
import { US_CITY_FLAGS } from "../data/usCityFlags"
import type { CityFlag } from "../data/usCityFlags"
import { T, ACCENT, FONT, tint } from "../ui/tokens"

interface Props { onBack: () => void }

const ROUNDS = 8
const shuffle = <X,>(a: X[]): X[] => [...a].sort(() => Math.random() - 0.5)

interface Round { target: CityFlag; choices: CityFlag[] }

function buildRounds(): Round[] {
  return shuffle(US_CITY_FLAGS).slice(0, ROUNDS).map(target => {
    const others = shuffle(US_CITY_FLAGS.filter(c => c.id !== target.id)).slice(0, 3)
    return { target, choices: shuffle([target, ...others]) }
  })
}

function USCityFlagGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [rounds] = useState(buildRounds)
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

  const next = () => {
    if (idx + 1 >= rounds.length) { setDone(true); return }
    setIdx(i => i + 1); setPicked(null)
  }

  if (done) {
    const correct = scores.filter(Boolean).length
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: T.bg }}>
        <div className="w-full max-w-sm" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ borderRadius: 16, padding: 24, textAlign: "center", background: T.surface, border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 40 }}>{correct >= ROUNDS * 0.75 ? "🏙️" : correct >= ROUNDS * 0.4 ? "🗽" : "🧭"}</div>
            <div style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 38, color: ACCENT.play }}>{correct}<span style={{ color: T.dim, fontSize: 20 }}>/{ROUNDS}</span></div>
            <div style={{ color: T.muted, fontSize: 12 }}>U.S. city flags identified</div>
          </div>
          <button onClick={onReplay} className="geo-tap" style={{ padding: "14px 0", borderRadius: 12, fontWeight: 700, fontFamily: FONT.display, background: ACCENT.play, color: T.onAccent }}>Play again</button>
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
          <div className="geo-micro" style={{ fontSize: 9, color: T.muted }}>US City Flags</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 13, color: T.dim }}>{idx + 1}/{ROUNDS}</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {rounds.map((_, i) => (<div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i < scores.length ? (scores[i] ? ACCENT.codex : T.warm) : T.line }} />))}
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 18px 24px", gap: 16 }}>
        <div className="geo-micro" style={{ fontSize: 9, color: T.muted }}>Which U.S. city flies this flag?</div>

        {/* flag — contain so nothing's cropped */}
        <div style={{ width: 260, height: 173, borderRadius: 14, overflow: "hidden", border: `1px solid ${T.lineHi}`, background: "#fff", boxShadow: "0 12px 28px -14px rgba(31,58,60,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
          <img src={round.target.flagUrl} alt="city flag"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
            onError={e => { (e.target as HTMLImageElement).style.opacity = "0.25" }} />
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
          <button onClick={next} className="geo-tap" style={{ marginTop: "auto", width: "100%", maxWidth: 360, padding: "14px 0", borderRadius: 12, fontWeight: 700, fontFamily: FONT.display, background: ACCENT.play, color: T.onAccent }}>
            {idx + 1 >= ROUNDS ? "See result →" : "Next →"}
          </button>
        )}
      </div>
    </div>
  )
}

export default function USCityFlagScreen({ onBack }: Props) {
  const [k, setK] = useState(0)
  return <USCityFlagGame key={k} onBack={onBack} onReplay={() => setK(n => n + 1)} />
}
