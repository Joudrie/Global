import { useState } from "react"
import { LGBTQ_FLAGS, OTHER_IDENTITY_FLAGS, SIGNAL_FLAGS } from "../data/identityFlags"
import type { IdentityFlag } from "../data/identityFlags"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"

interface Props { onBack: () => void }

const ROUNDS = 6
const A = ACCENT.learn

// Each play mode keeps its pool separate so a round never mixes types — pride,
// movements/identity, and the maritime signal alphabet are all their own thing.
// The pride rainbow and maritime blue gradients are content (they evoke the
// flags themselves); the movements deck uses the screen accent.
type ModeId = "lgbtq" | "identity" | "signal"
// Entries with no flag (noFlag, or an empty flagUrl) can't be shown — keep them out of every pool.
const withFlag = (pool: IdentityFlag[]) => pool.filter(f => f.flagUrl && !f.noFlag)
const MODES: { id: ModeId; label: string; emoji: string; pool: IdentityFlag[]; gradient: string }[] = [
  { id: "lgbtq",    label: "Pride & LGBTQ+",      emoji: "🏳️‍🌈", pool: withFlag(LGBTQ_FLAGS),
    gradient: "linear-gradient(90deg,#FF5E5E,#FFD93D,#6BCB77,#4D96FF,#B66DFF)" },
  { id: "identity", label: "Movements & Identity", emoji: "🏴", pool: withFlag(OTHER_IDENTITY_FLAGS),
    gradient: A },
  { id: "signal",   label: "Maritime Signal Flags", emoji: "⚓", pool: withFlag(SIGNAL_FLAGS),
    gradient: "linear-gradient(90deg,#1C6DD0,#3CC4D0)" },
]

function pickChoices(target: IdentityFlag, pool: IdentityFlag[]): IdentityFlag[] {
  const sameCat = pool.filter(f => f.id !== target.id && f.category === target.category)
  const shuffled = [...sameCat].sort(() => Math.random() - 0.5)
  const distractors = shuffled.slice(0, 3)
  if (distractors.length < 3) {
    const extra = pool
      .filter(f => f.id !== target.id && !distractors.some(d => d.id === f.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3 - distractors.length)
    distractors.push(...extra)
  }
  return [target, ...distractors].sort(() => Math.random() - 0.5)
}

interface Round { target: IdentityFlag; choices: IdentityFlag[] }

function buildRounds(pool: IdentityFlag[]): Round[] {
  return [...pool].sort(() => Math.random() - 0.5)
    .slice(0, ROUNDS)
    .map(target => ({ target, choices: pickChoices(target, pool) }))
}

function FlagImg({ src, alt }: { src: string; alt: string }) {
  return (
    <div style={{ width: 300, height: 200, borderRadius: 12, overflow: "hidden", border: `2px solid ${tint(A, 0.3)}`, position: "relative", background: T.surfaceHi }}>
      <img src={src} alt={alt}
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", padding: 8 }}
        onError={e => {
          const el = e.target as HTMLImageElement
          el.style.display = "none"
          const ph = el.parentElement?.querySelector(".ph") as HTMLElement
          if (ph) ph.style.display = "flex"
        }} />
      <div className="ph" style={{ display: "none", position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 52, opacity: 0.4 }}>🏳️‍🌈</span>
      </div>
    </div>
  )
}

export default function IdentityFlagScreen({ onBack }: Props) {
  const [mode, setMode] = useState<ModeId | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [scores, setScores] = useState<{ correct: boolean }[]>([])
  const [done, setDone] = useState(false)

  const startMode = (m: ModeId) => {
    const pool = MODES.find(x => x.id === m)!.pool
    setMode(m)
    setRounds(buildRounds(pool))
    setIdx(0); setSelected(null); setScores([]); setDone(false)
  }

  const activeMode = MODES.find(m => m.id === mode)

  // ── Mode picker ─────────────────────────────────────────────────────────────
  if (!mode) {
    return (
      <div className="min-h-screen flex flex-col"
        style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title="Identity Flags" onBack={onBack} />
        <div className="flex-1 flex flex-col items-center justify-center px-5 gap-4">
          <p className="text-sm text-center mb-1" style={{ color: T.muted, maxWidth: 320 }}>
            Pick a deck — Pride &amp; LGBTQ+ flags and civic/cultural movement flags are kept separate.
          </p>
          {MODES.map(m => (
            <button key={m.id} onClick={() => startMode(m.id)}
              className="w-full max-w-sm py-5 rounded-2xl font-bold text-lg transition-all active:scale-95"
              style={{ background: m.gradient, color: "#fff", textShadow: "0 1px 2px #0006", boxShadow: `0 4px 16px -8px ${tint(T.text, 0.55)}`, fontFamily: FONT.display }}>
              <span style={{ fontSize: 26, marginRight: 8 }}>{m.emoji}</span>{m.label}
              <div className="text-xs font-normal mt-0.5 opacity-90">{m.pool.length} flags</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const round = rounds[idx]
  const answered = selected !== null

  const handlePick = (id: string) => {
    if (answered) return
    setSelected(id)
    setScores(prev => [...prev, { correct: id === round.target.id }])
  }

  const handleNext = () => {
    if (idx + 1 >= rounds.length) { setDone(true); return }
    setIdx(i => i + 1)
    setSelected(null)
  }

  if (done) {
    const correct = scores.filter(s => s.correct).length
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5"
        style={{ background: T.bg, color: T.text }}>
        <div className="w-full max-w-sm">
          <div className="rounded-2xl p-6 text-center mb-4"
            style={{ background: T.surface, border: `1px solid ${tint(A, 0.3)}` }}>
            <div className="text-5xl mb-3">{correct >= ROUNDS * 0.8 ? "🏳️‍🌈" : correct >= ROUNDS * 0.5 ? "✊" : "🌈"}</div>
            <div className="text-5xl font-black mb-1" style={{ color: T.text, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" }}>{correct} / {ROUNDS}</div>
            <div className="text-sm mb-3" style={{ color: T.muted }}>identities identified</div>
            <div className="flex justify-center gap-2 flex-wrap">
              {scores.map((s, i) => <span key={i} style={{ fontSize: 22 }}>{s.correct ? "🟩" : "🟥"}</span>)}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => setMode(null)}
              className="w-full py-3.5 rounded-xl font-bold transition-all active:scale-95"
              style={{ background: activeMode?.gradient ?? A, color: "#fff", textShadow: "0 1px 2px #0006", fontFamily: FONT.display }}>
              Play Again
            </button>
            <button onClick={onBack}
              className="w-full py-3.5 rounded-xl font-bold transition-all active:scale-95"
              style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>
              ← Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: T.bg, color: T.text }}>

      <ScreenHeader title={activeMode?.label ?? "Identity Flag"} subtitle={`Round ${idx + 1} / ${ROUNDS}`} onBack={onBack}
        right={
          <div className="flex gap-1.5">
            {Array.from({ length: ROUNDS }).map((_, i) => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: "50%",
                background: i < scores.length ? (scores[i].correct ? T.green : T.danger) : T.line,
              }} />
            ))}
          </div>
        } />

      <div className="mx-5 h-1.5 rounded-full overflow-hidden mb-4" style={{ background: T.line }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(scores.length / ROUNDS) * 100}%`, background: activeMode?.gradient ?? A }} />
      </div>

      <div className="flex flex-col items-center px-5 gap-4">
        <div className="px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: tint(A, 0.13), color: A, border: `1px solid ${tint(A, 0.3)}` }}>
          {round.target.category}
        </div>

        <FlagImg src={round.target.flagUrl} alt="mystery identity flag" />

        <div className="grid grid-cols-1 gap-2.5 w-full max-w-sm">
          {round.choices.map(f => {
            const isTarget = f.id === round.target.id
            const isChosen = selected === f.id
            let border = `1.5px solid ${T.line}`
            if (answered) {
              if (isTarget) border = `2px solid ${T.green}`
              else if (isChosen) border = `2px solid ${T.danger}`
            }
            return (
              <button key={f.id} onClick={() => handlePick(f.id)}
                disabled={answered}
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
          <>
            <div className="w-full max-w-sm px-4 py-3 rounded-xl"
              style={{ background: T.surface, border: `1px solid ${tint(selected === round.target.id ? T.green : T.danger, 0.35)}` }}>
              <p className="text-sm font-bold mb-1" style={{ color: selected === round.target.id ? T.green : T.danger }}>
                {selected === round.target.id ? "✓ " : "✗ "}{round.target.name}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: T.muted, lineHeight: 1.6 }}>{round.target.note}</p>
            </div>
            <button onClick={handleNext}
              className="w-full max-w-sm py-3.5 rounded-xl font-bold transition-all active:scale-95"
              style={{ background: activeMode?.gradient ?? A, color: "#fff", textShadow: "0 1px 2px #0006", fontFamily: FONT.display }}>
              {idx + 1 >= ROUNDS ? "See Results →" : "Next →"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
