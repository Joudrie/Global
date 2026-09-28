import { useState, useMemo } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { FLAG_ATTRIBS, STRIPES_V } from "../data/flagAttribs"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { LineIcon } from "./icons"
import { pickOnEnter } from "../utils/pickOnEnter"

interface Props { onBack: () => void }

const ELIGIBLE = FLAGS.filter(f => FLAG_ATTRIBS[f.code])
const ROUNDS = 5

const COLOR_WORD: Record<string, string> = {
  red: "red", blue: "blue", green: "green", yellow: "gold",
  white: "white", black: "black", orange: "orange",
}

// Build the descriptive clue lines for a flag (visual only, no name).
function describe(f: FlagRecord): string[] {
  const a = FLAG_ATTRIBS[f.code]
  const lines: string[] = []
  const colors = a.colors.map(c => COLOR_WORD[c] ?? c)
  if (colors.length === 1) lines.push(`A solid ${colors[0]} field.`)
  else lines.push(`Colours: ${colors.join(", ")}.`)
  if (a.stripes) lines.push("It has horizontal stripes.")
  if (STRIPES_V.has(f.code)) lines.push("It has vertical stripes.")
  if (a.cross) lines.push("There is a cross.")
  if (a.star) lines.push("There is at least one star.")
  if (a.crescent) lines.push("There is a crescent moon.")
  if (a.emblem) lines.push("It carries a coat of arms or central emblem.")
  return lines
}

interface Round { target: FlagRecord; clues: string[] }

function buildRounds(): Round[] {
  return [...ELIGIBLE].sort(() => Math.random() - 0.5).slice(0, ROUNDS).map(target => {
    const clues = describe(target)
    // region + fun-fact as deeper hints
    clues.push(`Region: ${target.region}.`)
    if (target.distinguishingTip) clues.push(`Tip: ${target.distinguishingTip}`)
    return { target, clues }
  })
}

function DescribeItGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [rounds] = useState(buildRounds)
  const [idx, setIdx] = useState(0)
  const [shown, setShown] = useState(2)         // clue lines revealed
  const [input, setInput] = useState("")
  const [showDrop, setShowDrop] = useState(false)
  const [result, setResult] = useState<null | { correct: boolean }>(null)
  const [scores, setScores] = useState<number[]>([])
  const [done, setDone] = useState(false)

  const round = rounds[idx]

  const matches = useMemo(() => {
    const q = input.trim().toLowerCase()
    if (q.length < 1) return []
    return FLAGS.filter(f => f.name.toLowerCase().includes(q) || f.code.toLowerCase() === q).slice(0, 5)
  }, [input])

  const submit = (f: FlagRecord) => {
    if (result) return
    const correct = f.code === round.target.code
    setInput(""); setShowDrop(false)
    if (correct) {
      const pts = Math.max(100, 600 - (shown - 2) * 100)
      setScores(s => [...s, pts]); setResult({ correct: true })
    } else {
      // reveal one more clue; if out of clues, fail the round
      if (shown < round.clues.length) setShown(s => s + 1)
      else { setScores(s => [...s, 0]); setResult({ correct: false }) }
    }
  }

  const next = () => {
    if (idx + 1 >= ROUNDS) { setDone(true); return }
    setIdx(i => i + 1); setShown(2); setInput(""); setResult(null)
  }

  if (done) {
    const total = scores.reduce((a, b) => a + b, 0)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5"
        style={{ background: T.bg, color: T.text }}>
        <div className="w-full max-w-sm">
          <div className="rounded-2xl p-6 text-center mb-4"
            style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <div className="mb-3 flex justify-center"><LineIcon name="describeit" size={44} color={ACCENT.play} /></div>
            <div className="text-5xl font-black mb-1"
              style={{ color: T.text, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>
              {total.toLocaleString()}
            </div>
            <div className="text-sm mb-3" style={{ color: T.muted }}>pts · {scores.filter(s => s > 0).length}/{ROUNDS} solved</div>
            <div className="flex justify-center gap-2">
              {scores.map((s, i) => (
                <span key={i} style={{ width: 14, height: 14, borderRadius: 4, display: "inline-block", background: s > 0 ? T.green : T.danger }} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={onReplay}
              className="w-full py-3.5 rounded-xl font-bold transition-all active:scale-95 geo-tap"
              style={{ background: ACCENT.play, color: T.onAccent, fontFamily: FONT.display }}>Play Again</button>
            <button onClick={onBack}
              className="w-full py-3.5 rounded-xl font-bold transition-all active:scale-95 geo-tap"
              style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>← Home</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Describe-It" subtitle={`Round ${idx + 1} / ${ROUNDS}`} onBack={onBack} />

      <div className="flex flex-col items-center px-5 gap-4">
        <p className="text-xs text-center" style={{ color: T.muted }}>No image — name the flag from its description. Each wrong guess reveals another clue.</p>

        {/* Clue card */}
        <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          {round.clues.slice(0, shown).map((c, i) => (
            <p key={i} className="text-base leading-relaxed" style={{ color: i === 0 ? T.text : T.muted, marginBottom: 8 }}>
              <span style={{ color: ACCENT.play }}>•</span> {c}
            </p>
          ))}
          {!result && shown < round.clues.length && (
            <p className="text-xs mt-1" style={{ color: T.dim }}>{round.clues.length - shown} more clue(s) on a wrong guess</p>
          )}
        </div>

        {result ? (
          <>
            {/* reveal the flag now that the round is over */}
            <div style={{ width: 220, height: 147, borderRadius: 12, overflow: "hidden", border: `2px solid ${result.correct ? T.green : T.danger}`, boxShadow: `0 6px 18px ${tint(T.text, 0.18)}` }}>
              <img src={round.target.flagUrl} alt={round.target.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3" }} />
            </div>
            <div className="w-full max-w-sm px-4 py-3 rounded-xl"
              style={{ background: T.surface, border: `1px solid ${tint(result.correct ? T.green : T.danger, 0.4)}` }}>
              <p className="text-sm font-bold" style={{ color: result.correct ? T.green : T.danger }}>
                {result.correct ? `✓ ${round.target.name} — +${scores[scores.length - 1]}` : `✗ It was ${round.target.name}`}
              </p>
            </div>
            <button onClick={next}
              className="w-full max-w-sm py-3.5 rounded-xl font-bold transition-all active:scale-95 geo-tap"
              style={{ background: ACCENT.play, color: T.onAccent, fontFamily: FONT.display }}>
              {idx + 1 >= ROUNDS ? "See Results →" : "Next →"}
            </button>
          </>
        ) : (
          <div className="w-full max-w-sm relative">
            <input value={input} autoFocus autoComplete="off"
              onChange={e => { setInput(e.target.value); setShowDrop(true) }}
              onFocus={() => setShowDrop(true)} onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              onKeyDown={e => { if (e.key === "Enter") { const pick = pickOnEnter(matches, input); if (pick) submit(pick) } }}
              placeholder="Type a country name or code…"
              className="w-full px-4 py-3.5 rounded-xl outline-none font-semibold"
              style={{ background: T.surface, border: `1.5px solid ${T.line}`, color: T.text, fontSize: 15 }} />
            {showDrop && matches.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20"
                style={{ background: T.surface, border: `1px solid ${T.line}`, boxShadow: `0 8px 32px ${tint(T.text, 0.18)}` }}>
                {matches.map(f => (
                  <button key={f.code} onMouseDown={() => submit(f)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:brightness-95"
                    style={{ background: "transparent", borderBottom: `1px solid ${T.line}` }}>
                    <img src={f.flagUrl} alt="" style={{ width: 32, height: 21, objectFit: "cover", borderRadius: 3 }} />
                    <span style={{ color: T.text, fontWeight: 600 }}>{f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DescribeItScreen({ onBack }: Props) {
  const [replayKey, setReplayKey] = useState(0)
  return <DescribeItGame key={replayKey} onBack={onBack} onReplay={() => setReplayKey(k => k + 1)} />
}
