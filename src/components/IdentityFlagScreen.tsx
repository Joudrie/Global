import { useState } from "react"
import { LGBTQ_FLAGS, OTHER_IDENTITY_FLAGS, SIGNAL_FLAGS } from "../data/identityFlags"
import type { IdentityFlag } from "../data/identityFlags"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, ResultDots, PrimaryButton, SecondaryButton, GameIcon } from "./gameUi"
import { LineIcon } from "./icons"

interface Props { onBack: () => void }

const ROUNDS = 6
const A = ACCENT.learn

// Each play mode keeps its pool separate so a round never mixes types — pride,
// movements/identity, and the maritime signal alphabet are all their own thing.
// Each deck has a line icon and a palette accent (no rainbow gradients).
type ModeId = "lgbtq" | "identity" | "signal"
// Entries with no flag (noFlag, or an empty flagUrl) can't be shown — keep them out of every pool.
const withFlag = (pool: IdentityFlag[]) => pool.filter(f => f.flagUrl && !f.noFlag)
const MODES: { id: ModeId; label: string; icon: string; pool: IdentityFlag[]; accent: string }[] = [
  { id: "lgbtq",    label: "Pride & LGBTQ+",        icon: "heart",  pool: withFlag(LGBTQ_FLAGS),          accent: T.chartreuse },
  { id: "identity", label: "Movements & Identity",  icon: "flag",   pool: withFlag(OTHER_IDENTITY_FLAGS), accent: A },
  { id: "signal",   label: "Maritime Signal Flags", icon: "anchor", pool: withFlag(SIGNAL_FLAGS),         accent: T.green },
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
        <span style={{ opacity: 0.4, display: "flex" }}><LineIcon name="flag" size={48} color={T.dim} /></span>
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
              className="geo-tap carto-card w-full max-w-sm rounded-2xl text-left"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, ["--wash" as string]: tint(m.accent, 0.4) }}>
              <span style={{ width: 40, height: 40, borderRadius: 999, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: tint(m.accent, 0.14), border: `1px solid ${tint(m.accent, 0.3)}` }}>
                <GameIcon name={m.icon} size={20} color={m.accent} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="geo-display" style={{ display: "block", fontWeight: 700, fontSize: 17, color: T.text }}>{m.label}</span>
                <span style={{ display: "block", fontSize: 12, color: T.muted, marginTop: 2 }}>{m.pool.length} flags</span>
              </span>
              <span style={{ color: m.accent, fontSize: 18 }}>→</span>
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
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title={activeMode?.label ?? "Identity Flags"} subtitle="Results" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3">
          <ResultCard>
            <ResultHeader icon={activeMode?.icon ?? "flag"} accent={activeMode?.accent ?? A}
              title={`${correct} of ${ROUNDS} identified`}
              score={correct >= ROUNDS * 0.8 ? "You know your identity flags." : "Each round adds a few more to your memory."} />
            <ResultDots results={scores.map(s => s.correct)} />
          </ResultCard>
          <PrimaryButton onClick={() => setMode(null)} accent={activeMode?.accent ?? A}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: T.bg, color: T.text }}>

      <ScreenHeader title={activeMode?.label ?? "Identity Flag"} subtitle={`${scores.filter(s => s.correct).length} correct so far`} onBack={onBack}
        right={<HeaderStat accent={activeMode?.accent ?? A}>{idx + 1} / {ROUNDS}</HeaderStat>} />

      <div className="mx-5 h-1.5 rounded-full overflow-hidden mb-4" style={{ background: T.line }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(scores.length / ROUNDS) * 100}%`, background: activeMode?.accent ?? A }} />
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
            <PrimaryButton onClick={handleNext} accent={activeMode?.accent ?? A} style={{ maxWidth: 384 }}>
              {idx + 1 >= ROUNDS ? "See results →" : "Next →"}
            </PrimaryButton>
          </>
        )}
      </div>
    </div>
  )
}
