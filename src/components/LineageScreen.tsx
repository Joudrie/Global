import { useEffect, useRef, useState } from "react"
import type { CSSProperties, FormEvent } from "react"
import { flushSync } from "react-dom"
import { Check, Eye, X } from "lucide-react"
import { CODEX } from "../data/codex"
import type { HistoricalFlag } from "../data/codex"
import { FLAGS } from "../data/flags"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, ResultDots, PrimaryButton, SecondaryButton } from "./gameUi"
import { ROUNDS, TYPE_MULTIPLIER, LINEAGE_FIELD, judgeLineage, lineageChain, loadBest, loadMode, recordScore, roundPoints, roundWorth, saveMode } from "../utils/lineage"
import type { LineageMode } from "../utils/lineage"

interface Props { onBack: () => void }

const A = ACCENT.play
const field = LINEAGE_FIELD
function shuffle<X>(a: X[]): X[] { return [...a].sort(() => Math.random() - 0.5) }
const nameOf = (code: string) => FLAGS.find(f => f.code === code)?.name ?? code

// Countries with a deep enough flag history to form a lineage. The chain
// reads oldest → … → modern, capped to keep the board readable (lineageChain).
const ELIGIBLE = Object.entries(CODEX)
  .filter(([code]) => FLAGS.some(f => f.code === code))
  .map(([code, e]) => ({ code, name: nameOf(code), timeline: lineageChain(e.flagHistory) }))
  .filter(e => e.timeline.length >= 3)

interface Round { code: string; name: string; timeline: HistoricalFlag[]; choices: string[] }

function buildRounds(): Round[] {
  return shuffle(ELIGIBLE).slice(0, ROUNDS).map(c => {
    const others = shuffle(ELIGIBLE.filter(e => e.code !== c.code)).slice(0, 3).map(e => e.name)
    return { code: c.code, name: c.name, timeline: c.timeline, choices: shuffle([c.name, ...others]) }
  })
}

/** One answered round. `mode` is how it was answered (typed scores double). */
interface RoundResult { correct: boolean; pts: number; mode: LineageMode; given: string; misspelt: boolean; near: boolean; gaveUp: boolean }

const yearOf = (h: HistoricalFlag) => h.fromYear ?? "?"
const MODE_LABEL: Record<LineageMode, string> = { choice: "Choices", type: "Type-in" }

// Visually hidden, still read aloud.
const srOnly: CSSProperties = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }

// Hover is colour/border only; the answer card fades in after a tap; nothing
// moves under reduced motion.
const STYLES = `
  .ln-tap { transition: background-color 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out; }
  .ln-tap:focus-visible, .ln-input:focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 2px; }
  @media (hover: hover) {
    .ln-choice:not(:disabled):hover { border-color: ${T.lineHi}; background: ${T.surfaceHi}; }
    .ln-seg:not([aria-checked="true"]):hover { color: ${T.text}; }
    .ln-reveal:hover { border-color: ${A}; }
  }
  .ln-input { outline: none; transition: border-color 150ms ease-out; }
  @keyframes lnFade { from { opacity: 0; } to { opacity: 1; } }
  .ln-fade { animation: lnFade 160ms ease-out both; }
  @media (prefers-reduced-motion: reduce) {
    .ln-tap, .ln-input { transition: none; }
    .ln-fade { animation: none; }
  }
`

function MiniFlag({ src, w = 72 }: { src: string; w?: number }) {
  return (
    <img src={src} alt="" style={{ width: w, height: w * 0.62, objectFit: "cover", borderRadius: 4, border: `1px solid ${T.line}`, flexShrink: 0, background: T.surfaceHi }}
      onError={e => { (e.target as HTMLImageElement).style.opacity = "0.25" }} />
  )
}

/** The quiet "×2 typed" tag on a round that was typed. */
function TypedTag() {
  return (
    <span className="geo-mono" style={{ display: "inline-block", padding: "0 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, lineHeight: "20px",
      color: A, background: tint(A, 0.1), border: `1px solid ${tint(A, 0.3)}`, whiteSpace: "nowrap" }}>
      ×{TYPE_MULTIPLIER} typed
    </span>
  )
}

function LineageGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [rounds] = useState(buildRounds)
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(1)   // how many flags (oldest-first) are shown
  const [picked, setPicked] = useState<string | null>(null)
  const [results, setResults] = useState<RoundResult[]>([])
  const [outcome, setOutcome] = useState<{ best: number; beat: boolean } | null>(null)
  const [mode, setModeState] = useState<LineageMode>(loadMode)
  const [typed, setTyped] = useState("")
  const [vague, setVague] = useState(false)
  const [best] = useState(loadBest)
  const inputRef = useRef<HTMLInputElement>(null)
  const nextWrap = useRef<HTMLDivElement>(null)
  const locked = useRef(false) // one answer per round, however fast the taps

  const round = rounds[idx]
  const total = round.timeline.length
  const result = results[idx] as RoundResult | undefined
  const answered = !!result
  const worth = roundWorth(revealed, total, mode)
  const traced = results.filter(r => r.correct).length

  // After an answer, Next takes focus so Enter moves on.
  useEffect(() => { if (answered) nextWrap.current?.querySelector("button")?.focus({ preventScroll: true }) }, [answered])

  // Switching to Type-in focuses the box inside the tap, so phones open the keyboard.
  const setMode = (m: LineageMode) => {
    if (m === mode) return
    flushSync(() => { setModeState(m); setVague(false) })
    saveMode(m)
    if (m === "type") inputRef.current?.focus({ preventScroll: true })
  }

  const revealNext = () => {
    if (answered) return
    setRevealed(r => Math.min(total, r + 1))
  }

  const answer = (r: Omit<RoundResult, "pts">) => {
    if (answered || locked.current) return
    locked.current = true
    setResults(rs => [...rs, { ...r, pts: roundPoints(revealed, total, r.mode, r.correct) }])
    setRevealed(total) // reveal the full chain so the player sees the lineage
    setVague(false)
  }

  const choose = (name: string) => {
    if (answered) return
    setPicked(name)
    answer({ correct: name === round.name, mode: "choice", given: name, misspelt: false, near: false, gaveUp: false })
  }

  const submitTyped = (e: FormEvent) => {
    e.preventDefault()
    const given = typed.trim()
    if (answered || !given) return
    const v = judgeLineage(round.code, given)
    // "Congo", "Korea": fits two countries, so ask which instead of taking the round.
    if (v.vague && !v.correct) { setVague(true); inputRef.current?.focus({ preventScroll: true }); return }
    answer({ correct: v.correct, mode: "type", given, misspelt: v.misspelt, near: v.near, gaveUp: false })
  }

  const giveUp = () => {
    if (answered) return
    answer({ correct: false, mode, given: "", misspelt: false, near: false, gaveUp: true })
  }

  const next = () => {
    if (!answered) return
    if (idx + 1 >= rounds.length) {
      setOutcome(recordScore(results.reduce((s, r) => s + r.pts, 0)))
      window.scrollTo({ top: 0 })
      return
    }
    locked.current = false
    // Render the next round now and focus the box inside this tap, so phones
    // open the keyboard for it.
    flushSync(() => { setIdx(i => i + 1); setRevealed(1); setPicked(null); setTyped(""); setVague(false) })
    if (mode === "type") inputRef.current?.focus({ preventScroll: true })
  }

  if (outcome) {
    const totalPts = results.reduce((s, r) => s + r.pts, 0)
    const choiceMax = ROUNDS * 1000
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title="Lineage" subtitle="Results" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-4 pb-8 flex flex-col gap-3">
          <ResultCard>
            <ResultHeader icon={totalPts >= choiceMax * 0.7 ? "tree" : traced >= ROUNDS * 0.5 ? "scroll" : "dna"} accent={A}
              eyebrow={outcome.beat ? "New best" : undefined}
              title={`${totalPts.toLocaleString()} pts`}
              score={`${traced} of ${ROUNDS} traced · Best ${outcome.best.toLocaleString()}`} />
            <ResultDots results={results.map(r => r.correct)} />
          </ResultCard>

          <ol aria-label="Your rounds" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {rounds.map((r, i) => {
              const res = results[i]
              if (!res) return null
              return (
                <li key={r.code} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 12, background: T.surface, border: `1px solid ${T.line}` }}>
                  <MiniFlag src={r.timeline[0].flagUrl} w={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, overflowWrap: "anywhere" }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>from {yearOf(r.timeline[0])}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <span className="geo-mono" style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: res.correct ? T.green : T.danger }}>
                      {res.correct ? `+${res.pts.toLocaleString()}` : res.gaveUp ? "gave up" : "0"}
                    </span>
                    {res.correct && res.mode === "type" && <TypedTag />}
                  </div>
                </li>
              )
            })}
          </ol>

          <PrimaryButton onClick={onReplay} accent={A}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  // What the answer card says.
  const headline = !result ? "" : result.correct
    ? `${round.name} · +${result.pts.toLocaleString()} pts`
    : result.near ? `Almost — it's spelled ${round.name}` : `It was ${round.name}`
  const subline = !result ? "" : result.correct
    ? (result.misspelt ? `Right — it's spelled ${round.name}` : "")
    : (result.mode === "type" && !result.gaveUp && !result.near ? `You typed “${result.given}”` : "")
  const showTyped = mode === "type" && !(answered && (result.mode === "choice" || result.gaveUp))
  const showChoices = !showTyped && !(answered && result.mode === "type" && !result.gaveUp)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <style>{STYLES}</style>
      <ScreenHeader title="Lineage" subtitle={`${traced} traced so far · Best ${best.toLocaleString()}`} onBack={onBack}
        right={<HeaderStat accent={A}>{idx + 1} / {ROUNDS}</HeaderStat>} />
      <div aria-live="polite" style={srOnly}>
        {result ? `${result.correct ? "Right" : "Wrong"}. ${headline}.` : `Worth ${worth} points.`}
      </div>

      <div className="flex flex-col items-center px-4 gap-4 pb-8">
        <div className="text-sm font-semibold text-center" style={{ color: A }}>
          Trace this flag's lineage — which modern country is it?
        </div>
        {!answered && (
          <div className="text-xs px-3 py-1 rounded-full text-center" style={{ background: tint(T.green, 0.13), color: T.green, border: `1px solid ${tint(T.green, 0.3)}` }}>
            Guess now for {worth.toLocaleString()} pts · reveal a newer flag to lower it
          </div>
        )}

        {/* Oldest → newest chain */}
        <div data-chain={total} className="flex items-center gap-2 flex-wrap justify-center px-2 py-4 rounded-2xl w-full max-w-sm"
          style={{ background: T.surface, border: `1px solid ${tint(A, 0.27)}` }}>
          {round.timeline.map((h, i) => {
            const shown = i < revealed
            const isNextToReveal = i === revealed && !answered
            return (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden style={{ color: tint(A, 0.55), fontSize: 15 }}>→</span>}
                {shown ? (
                  <div className="flex flex-col items-center gap-1">
                    <MiniFlag src={h.flagUrl} w={i === 0 ? 84 : 70} />
                    <span style={{ fontSize: 9, color: A, fontFamily: FONT.mono }}>{yearOf(h)}</span>
                  </div>
                ) : isNextToReveal ? (
                  <button type="button" onClick={revealNext} aria-label="Reveal the next flag, for fewer points" className="ln-tap ln-reveal flex flex-col items-center justify-center gap-0.5"
                    style={{ width: 70, height: 70 * 0.62, borderRadius: 4, background: T.surfaceHi, border: `1px dashed ${tint(A, 0.45)}`, color: A, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                    <Eye size={13} color={A} strokeWidth={1.6} absoluteStrokeWidth />
                    reveal
                  </button>
                ) : (
                  <div aria-hidden style={{ width: 70, height: 70 * 0.62, borderRadius: 4, background: T.surfaceHi, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.dim, fontSize: 16 }}>?</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Answer-mode toggle: typing scores double */}
        {!answered && (
          <div className="flex flex-col items-center gap-2">
            <div role="radiogroup" aria-label="How to answer" className="inline-flex p-0.5 rounded-full" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              {(["choice", "type"] as const).map(m => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                  className="ln-tap ln-seg px-4 py-1 rounded-full text-xs font-bold"
                  style={{ minHeight: 32, background: mode === m ? A : "transparent", color: mode === m ? T.onAccent : T.muted, border: "none", cursor: "pointer" }}>
                  {MODE_LABEL[m]}{m === "type" && <span className="geo-mono" style={{ marginLeft: 4 }}>×{TYPE_MULTIPLIER}</span>}
                </button>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: T.muted, textAlign: "center" }}>
              {mode === "choice" ? "Type it in for double points" : "Double points · small spelling slips still count"}
            </p>
          </div>
        )}

        {/* Country choices, or the typed answer */}
        {showChoices && (
          <div className="grid grid-cols-1 gap-2.5 w-full max-w-sm">
            {round.choices.map(c => {
              const isAnswer = c === round.name
              const isChosen = picked === c
              const color = !answered ? null : isAnswer ? T.green : isChosen ? T.danger : null
              return (
                <button key={c} type="button" onClick={() => choose(c)} disabled={answered}
                  className="ln-tap ln-choice py-3 px-4 rounded-xl font-semibold text-sm"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: T.surface,
                    border: color ? `2px solid ${color}` : `1.5px solid ${T.line}`, color: T.text, textAlign: "left", cursor: answered ? "default" : "pointer" }}>
                  {c}
                  {answered && isAnswer && <Check size={16} strokeWidth={2.4} color={T.green} aria-label="the answer" />}
                  {answered && isChosen && !isAnswer && <X size={16} strokeWidth={2.4} color={T.danger} aria-label="your answer" />}
                </button>
              )
            })}
          </div>
        )}
        {showTyped && (
          <form onSubmit={submitTyped} className="w-full max-w-sm" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor={field.id} style={srOnly}>{field.label}</label>
            <input id={field.id} ref={inputRef} className="ln-input" value={answered ? result.given : typed} readOnly={answered}
              onChange={e => { setTyped(e.target.value); setVague(false) }} placeholder={field.placeholder}
              autoComplete={field.autoComplete} autoCorrect={field.autoCorrect} autoCapitalize={field.autoCapitalize}
              spellCheck={field.spellCheck} enterKeyHint={field.enterKeyHint} aria-invalid={answered && !result.correct ? true : undefined}
              style={{ width: "100%", height: 52, padding: "0 16px", borderRadius: 12, fontSize: 16, fontWeight: 600, color: T.text, background: T.surface,
                border: `1.5px solid ${answered ? (result.correct ? T.green : T.danger) : vague ? T.gold : tint(A, 0.4)}` }} />
            {vague && !answered && (
              <p className="ln-fade" role="status" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: T.gold }}>That fits two countries. Which one?</p>
            )}
            {!answered && <PrimaryButton type="submit" accent={A} disabled={!typed.trim()}>Check</PrimaryButton>}
          </form>
        )}

        {/* Give up — reveals the answer, no points */}
        {!answered && (
          <button type="button" onClick={giveUp}
            className="ln-tap text-xs px-4 py-1.5 rounded-full font-semibold"
            style={{ minHeight: 32, background: T.surface, border: `1px solid ${tint(T.danger, 0.25)}`, color: tint(T.danger, 0.8), cursor: "pointer" }}>
            Give up &amp; reveal
          </button>
        )}

        {result && (
          <div className="ln-fade w-full max-w-sm flex flex-col gap-3">
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderRadius: 12, background: T.surface,
              border: `1px solid ${tint(result.correct ? T.green : T.danger, 0.35)}` }}>
              <span aria-hidden style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center",
                background: tint(result.correct ? T.green : T.danger, 0.14), color: result.correct ? T.green : T.danger }}>
                {result.correct ? <Check size={14} strokeWidth={2.4} /> : <X size={14} strokeWidth={2.4} />}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <p className="text-sm font-bold" style={{ margin: 0, color: result.correct ? T.green : T.danger }}>{headline}</p>
                  {result.correct && result.mode === "type" && <TypedTag />}
                </div>
                {subline && <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: T.muted, overflowWrap: "anywhere" }}>{subline}</p>}
                <p className="text-xs" style={{ margin: "4px 0 0", color: T.muted, lineHeight: 1.6 }}>{round.timeline[round.timeline.length - 1].note}</p>
              </div>
            </div>
            <div ref={nextWrap}>
              <PrimaryButton onClick={next} accent={A}>
                {idx + 1 >= ROUNDS ? "See results →" : "Next →"}
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LineageScreen({ onBack }: Props) {
  const [replayKey, setReplayKey] = useState(0)
  return <LineageGame key={replayKey} onBack={onBack} onReplay={() => setReplayKey(k => k + 1)} />
}
