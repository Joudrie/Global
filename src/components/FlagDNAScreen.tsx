import { useState, useRef, useMemo } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { FLAG_ATTRIBS, STRIPES_V } from "../data/flagAttribs"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"
import { LineIcon } from "./icons"
import { matchNames, pickOnEnter } from "../utils/pickOnEnter"

interface Props { onBack: () => void }

const ACC = ACCENT.play

const ELIGIBLE = FLAGS.filter(f => FLAG_ATTRIBS[f.code])
const MAX_GUESSES = 7

const ALL_COLORS = ["red","blue","green","yellow","white","black","orange"] as const
type Color = typeof ALL_COLORS[number]

// Swatches for the colour chips. On the light Cartographer parchment a near-white
// chip would vanish, so "white" gets a readable warm grey there.
const COLOR_HEX: Record<Color, string> = {
  red: "#F43F5E", blue: "#60A5FA", green: "#34D399",
  yellow: "#FBBF24", white: "#A89F8D", black: "#6B7280", orange: "#FB923C",
}

interface GuessResult {
  flag: FlagRecord
  regionMatch: boolean
  proximity: number            // 0–100 similarity %
  colors: { color: Color; match: boolean }[]
  stripesH: boolean | null
  stripesV: boolean | null
  cross:    boolean | null
  star:     boolean | null
  crescent: boolean | null
  emblem:   boolean | null
}

function buildResult(guess: FlagRecord, target: FlagRecord): GuessResult {
  const ga = FLAG_ATTRIBS[guess.code]
  const ta = FLAG_ATTRIBS[target.code]

  // Only ever show colours that belong to the *answer* — a ✓ means your guess
  // also has it, a ✗ means the answer has it and you missed it. We never surface
  // colours that aren't in the target (no "not called yet" middle ground).
  const relevantColors = ALL_COLORS.filter(c => ta.colors.includes(c))
  const colors = relevantColors.map(c => ({
    color: c,
    match: ga.colors.includes(c),
  }))

  const featMatch = (gv: boolean, tv: boolean) => (gv || tv) ? (gv === tv) : null

  // Proximity score: compare all attributes, weight region heavily
  let matched = 0, total = 0

  // Region (weight 2)
  total += 2; if (guess.region === target.region) matched += 2

  // Colors (weight 1 each)
  for (const c of ALL_COLORS) {
    total++
    if (ta.colors.includes(c) === ga.colors.includes(c)) matched++
  }

  // Features (weight 1 each)
  const feats: [boolean, boolean][] = [
    [ga.stripes, ta.stripes],
    [STRIPES_V.has(guess.code), STRIPES_V.has(target.code)],
    [ga.cross, ta.cross],
    [ga.star, ta.star],
    [ga.crescent, ta.crescent],
    [ga.emblem, ta.emblem],
  ]
  for (const [gv, tv] of feats) { total++; if (gv === tv) matched++ }

  const proximity = Math.round((matched / total) * 100)

  return {
    flag: guess,
    regionMatch: guess.region === target.region,
    proximity,
    colors,
    stripesH: featMatch(ga.stripes,            ta.stripes),
    stripesV: featMatch(STRIPES_V.has(guess.code), STRIPES_V.has(target.code)),
    cross:    featMatch(ga.cross,    ta.cross),
    star:     featMatch(ga.star,     ta.star),
    crescent: featMatch(ga.crescent, ta.crescent),
    emblem:   featMatch(ga.emblem,   ta.emblem),
  }
}

function proximityLabel(pct: number): { label: string; color: string } {
  if (pct >= 90) return { label: 'Burning hot', color: T.danger }
  if (pct >= 75) return { label: 'Very warm',   color: T.warm }
  if (pct >= 60) return { label: 'Warm',        color: T.gold }
  if (pct >= 45) return { label: 'Lukewarm',    color: ACC }
  return                { label: 'Cold',        color: T.cyan }
}

const FEAT_LABEL: Record<string, string> = {
  stripesH: "H-Stripes", stripesV: "V-Stripes",
  cross: "Cross", star: "Star(s)", crescent: "Crescent", emblem: "Emblem",
}

function FlagDNAScreenGame({ onBack , onReplay }: Props & { onReplay: () => void }) {
  const [target]  = useState<FlagRecord>(() => ELIGIBLE[Math.floor(Math.random() * ELIGIBLE.length)])
  const [input,  setInput]  = useState("")
  const [guesses, setGuesses] = useState<GuessResult[]>([])
  const [phase,  setPhase]  = useState<"playing" | "won" | "lost" | "gaveup">("playing")
  const [showDrop, setShowDrop] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const guessedCodes = useMemo(() => new Set(guesses.map(g => g.flag.code)), [guesses])

  const matches = useMemo(() => matchNames(FLAGS.filter(f => !guessedCodes.has(f.code)), input, 6), [input, guessedCodes])

  const submitGuess = (flag: FlagRecord) => {
    if (phase !== "playing") return
    if (guessedCodes.has(flag.code)) return

    const result = buildResult(flag, target)
    const next   = [...guesses, result]
    setGuesses(next)
    setInput("")
    setShowDrop(false)
    inputRef.current?.focus()

    if (flag.code === target.code) { setPhase("won"); return }
    if (next.length >= MAX_GUESSES) { setPhase("lost"); return }
  }

  const handleGiveUp = () => setPhase("gaveup")

  const finished = phase !== "playing"
  const won      = phase === "won"

  // Best proximity so far (for display)
  const bestProx = guesses.length > 0
    ? Math.max(...guesses.map(g => g.proximity))
    : null

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: T.bg, color: T.text }}>

      <ScreenHeader title="Flag DNA" onBack={onBack}
        subtitle={
          <span style={{ color: ACC }}>
            {finished
              ? (won ? "Solved!" : `It was ${target.name}`)
              : bestProx !== null
                ? `Best match: ${bestProx}%`
                : `${MAX_GUESSES} guesses`}
          </span>
        }
        right={<HeaderStat accent={ACC}>{Math.min(guesses.length + (finished ? 0 : 1), MAX_GUESSES)} / {MAX_GUESSES}</HeaderStat>} />

      {finished && (
        <div className="w-full max-w-sm mx-auto px-5 mb-3" style={{ zIndex: 1 }}>
          <ResultCard>
            <ResultHeader icon={won ? "trophy" : "flagdna"} accent={won ? T.green : T.danger}
              eyebrow={won ? `Solved in ${guesses.length}` : phase === "gaveup" ? "Gave up" : "Out of guesses"}
              title={target.name} />
            <img src={target.flagUrl} alt={target.name} style={{ width: 180, height: 113, display: "block", margin: "0 auto", borderRadius: 8, border: `1px solid ${T.line}` }} />
          </ResultCard>
        </div>
      )}

      {!finished && (
        <div className="mx-5 mb-3 relative" style={{ zIndex: 10 }}>
          <div className="relative">
            <input
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); setShowDrop(true) }}
              onFocus={() => setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 200)}
              onKeyDown={e => { if (e.key === "Enter") { const pick = pickOnEnter(matches, input); if (pick) submitGuess(pick) } }}
              enterKeyHint="go" aria-label="Guess the country"
              placeholder="Type a country…"
              className="w-full px-4 py-3 rounded-xl text-sm font-medium"
              style={{ background: T.surface, border: `1.5px solid ${T.line}`, color: T.text, outline: "none" }}
            />
            {showDrop && matches.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden"
                style={{ background: T.surface, border: `1px solid ${T.line}`, zIndex: 20, boxShadow: `0 8px 24px ${tint(T.text, 0.2)}` }}>
                {matches.map(f => (
                  <button key={f.code}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-all hover:brightness-95"
                    onMouseDown={() => submitGuess(f)}
                    style={{ color: T.text }}>
                    <img src={f.flagUrl} alt="" style={{ width: 28, height: 18, objectFit: "cover", borderRadius: 3 }} />
                    {f.name}
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: T.dim, fontFamily: FONT.mono }}>{f.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Give up button after 3 guesses */}
          {guesses.length >= 3 && (
            <button onClick={handleGiveUp}
              className="mt-2 text-xs px-4 py-1.5 rounded-full font-semibold transition-all active:scale-95"
              style={{ background: T.surface, border: `1px solid ${tint(T.danger, 0.3)}`, color: tint(T.danger, 0.75) }}>
              Give up
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 space-y-3 pb-6" style={{ zIndex: 1 }}>
        {guesses.map((g, gi) => {
          const isSelf = g.flag.code === target.code
          const prox   = proximityLabel(g.proximity)
          return (
            <div key={gi} className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${isSelf ? tint(T.green, 0.4) : T.line}`, background: T.surface }}>

              {/* Flag row + proximity */}
              <div className="flex items-center gap-3 px-3 py-2.5"
                style={{ background: isSelf ? tint(T.green, 0.06) : "transparent" }}>
                <img src={g.flag.flagUrl} alt={g.flag.name}
                  style={{ width: 48, height: 30, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: T.text }}>{g.flag.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs" style={{ color: g.regionMatch ? T.green : T.danger }}>
                      {g.flag.region} {g.regionMatch ? "✓" : "✗"}
                    </span>
                  </div>
                </div>
                {/* Proximity badge */}
                {!isSelf && (
                  <div className="flex flex-col items-center">
                    <span style={{ fontSize: 14, fontWeight: 700, color: prox.color, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" }}>{g.proximity}%</span>
                    <span style={{ fontSize: 11, color: prox.color }}>{prox.label}</span>
                  </div>
                )}
                {isSelf && <span aria-label="Solved" style={{ display: "flex" }}><LineIcon name="target" size={20} color={T.green} /></span>}
              </div>

              {/* Color chips */}
              <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-1">
                {g.colors.map(({ color, match }) => (
                  <span key={color} className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                    style={{
                      background: match ? tint(COLOR_HEX[color], 0.13) : "transparent",
                      border: `1px solid ${match ? COLOR_HEX[color] : T.line}`,
                      color: match ? COLOR_HEX[color] : T.dim,
                    }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLOR_HEX[color], display: "inline-block" }} />
                    {color} {match ? "✓" : "✗"}
                  </span>
                ))}
              </div>

              {/* Feature chips — H/V stripes distinguished */}
              <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
                {(["stripesH","stripesV","cross","star","crescent","emblem"] as const).map(feat => {
                  const val = g[feat]
                  if (val === null) return null
                  return (
                    <span key={feat} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: val ? tint(T.green, 0.1) : tint(T.danger, 0.1),
                        border: `1px solid ${val ? tint(T.green, 0.4) : tint(T.danger, 0.4)}`,
                        color: val ? T.green : T.danger,
                      }}>
                      {FEAT_LABEL[feat]} {val ? "✓" : "✗"}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}

        {guesses.length === 0 && !finished && (
          <div className="text-center py-8" style={{ color: T.dim }}>
            <div className="flex justify-center">
              <LineIcon name="flagdna" size={40} color={T.dim} strokeWidth={1.3} />
            </div>
            <p className="text-sm mt-2" style={{ color: T.muted }}>Type a country to start decoding the flag</p>
            <p className="text-xs mt-1" style={{ color: T.dim }}>
              Each guess shows attribute matches and a proximity %
            </p>
          </div>
        )}

        {finished && (
          <div className="flex flex-col gap-3 mt-2">
            <PrimaryButton onClick={onReplay} accent={ACC}>New flag</PrimaryButton>
            <SecondaryButton onClick={onBack}>Home</SecondaryButton>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FlagDNAScreen({ onBack }: Props) {
  const [replayKey, setReplayKey] = useState(0)
  return <FlagDNAScreenGame key={replayKey} onBack={onBack} onReplay={() => setReplayKey(k => k + 1)} />
}
