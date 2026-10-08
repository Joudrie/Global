import { useState, useMemo } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"
import { isExactName, normName } from "../utils/pickOnEnter"

const ACC = ACCENT.codex
const MAX = 6


function shuffle<X>(a: X[]): X[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}
function makeDealer() {
  let bag: FlagRecord[] = []
  return () => { if (!bag.length) bag = shuffle(FLAGS); return bag.pop()! }
}
const deal = makeDealer()

// The country a guess names: its name, another name ("USA", "Ivory Coast") or its code.
const countryNamed = (input: string): FlagRecord | undefined =>
  FLAGS.find(f => isExactName(f, input)) ?? FLAGS.find(f => f.code.toLowerCase() === normName(input))

export default function FlagOutlineScreen({ onBack }: { onBack: () => void }) {
  const [answer, setAnswer] = useState(deal)
  const [guesses, setGuesses] = useState<string[]>([])
  const [input, setInput] = useState("")
  const [status, setStatus] = useState<"play" | "won" | "lost">("play")
  const [wins, setWins] = useState(0)
  const [note, setNote] = useState("")

  const names = useMemo(() => FLAGS.map(f => f.name).sort(), [])
  const wrong = guesses.length
  // Start barely visible (mostly outline), bleed colour in with each miss.
  const reveal = status === "play" ? Math.min(1, 0.1 + wrong * (0.9 / MAX)) : 1
  const src = `/flags/${answer.code.toLowerCase()}.svg`
  const fid = `fo-edge-${answer.code}`

  const submit = () => {
    if (status !== "play" || !input.trim()) return
    // Only a real country costs a guess, and only once.
    const country = countryNamed(input)
    if (!country) { setNote("That's not a country on the list"); return }
    if (country.code === answer.code) { setStatus("won"); setWins(w => w + 1); setNote(""); return }
    if (guesses.includes(country.name)) { setNote(`Already guessed ${country.name}`); return }
    setNote("")
    const g = [...guesses, country.name]
    setGuesses(g); setInput("")
    if (g.length >= MAX) setStatus("lost")
  }
  const giveUp = () => setStatus("lost")
  const giveUpNote = status === "lost" && wrong < MAX
  const next = () => { setAnswer(deal()); setGuesses([]); setInput(""); setNote(""); setStatus("play") }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Flag Outline" subtitle={status === "play" ? `${MAX - wrong} guesses left` : answer.name} onBack={onBack}
        right={<HeaderStat label="Solved" accent={ACC}>{wins}</HeaderStat>} />

      <div className="flex-1 flex flex-col items-center px-5 pt-2 pb-10 gap-4">
        <p className="text-sm text-center" style={{ color: T.muted }}>
          Only the flag's <span style={{ color: ACC, fontWeight: 700 }}>outlines</span> show. Guess the country — each miss reveals more colour.
        </p>

        {/* The flag: edge-filtered outline layer + a colour layer that fades in */}
        <div style={{ width: "100%", maxWidth: 340, aspectRatio: "3 / 2", borderRadius: 10, overflow: "hidden", border: `1px solid ${T.line}`, boxShadow: `0 8px 24px -12px ${tint(T.text, 0.5)}`, background: "#0b0b10" }}>
          <svg viewBox="0 0 300 200" width="100%" height="100%" style={{ display: "block" }}>
            <defs>
              <filter id={fid} x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
                <feColorMatrix type="saturate" values="0" result="g" />
                <feConvolveMatrix in="g" order="3" preserveAlpha="true" kernelMatrix="1 1 1 1 -8 1 1 1 1" result="e" />
                <feComponentTransfer in="e">
                  <feFuncR type="linear" slope="3" /><feFuncG type="linear" slope="3" /><feFuncB type="linear" slope="3" />
                </feComponentTransfer>
              </filter>
            </defs>
            {status === "play" && (
              <image href={src} x="0" y="0" width="300" height="200" preserveAspectRatio="xMidYMid slice" filter={`url(#${fid})`} />
            )}
            <image href={src} x="0" y="0" width="300" height="200" preserveAspectRatio="xMidYMid slice" opacity={reveal} />
          </svg>
        </div>

        {status === "play" ? (
          <>
            {/* Guess input with autocomplete */}
            <div className="w-full max-w-sm flex gap-2">
              <input list="flag-names" value={input}
                onChange={e => { setInput(e.target.value); setNote("") }}
                onKeyDown={e => { if (e.key === "Enter") submit() }}
                placeholder="Type a country…" aria-label="Guess the country"
                style={{ flex: 1, padding: "0 14px", height: 46, borderRadius: 12, background: T.surface, border: `1px solid ${T.line}`, color: T.text, fontSize: 15, outline: "none" }} />
              <datalist id="flag-names">{names.map(n => <option key={n} value={n} />)}</datalist>
              <button onClick={submit} disabled={!input.trim()}
                className="px-5 rounded-xl font-bold transition-all active:scale-95"
                style={{ background: input.trim() ? ACC : T.surface, border: input.trim() ? "none" : `1px solid ${T.line}`, color: input.trim() ? T.onAccent : T.dim, fontFamily: FONT.display }}>
                Guess
              </button>
            </div>

            {note && <p role="status" className="w-full max-w-sm text-xs" style={{ color: T.muted, marginTop: -8 }}>{note}</p>}

            {/* Past wrong guesses */}
            {guesses.length > 0 && (
              <div className="w-full max-w-sm flex flex-col gap-1.5">
                {guesses.map((g, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: T.surface, border: `1px solid ${tint(T.danger, 0.3)}` }}>
                    <span style={{ color: T.danger, fontWeight: 800 }}>✗</span>
                    <span className="text-sm" style={{ color: T.muted }}>{g}</span>
                  </div>
                ))}
              </div>
            )}

            <SecondaryButton onClick={giveUp} style={{ maxWidth: 384 }}>Give up</SecondaryButton>
          </>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-3">
            <ResultCard>
              <ResultHeader icon={status === "won" ? "trophy" : "flagoutline"} accent={status === "won" ? T.green : T.danger}
                eyebrow={status === "won" ? `Got it in ${wrong + 1}` : giveUpNote ? "The answer" : "Out of guesses"}
                title={answer.name} score={answer.funFact} />
            </ResultCard>
            <PrimaryButton onClick={next} accent={ACC}>Next flag →</PrimaryButton>
            <SecondaryButton onClick={onBack}>Home</SecondaryButton>
          </div>
        )}
      </div>
    </div>
  )
}
