import { useState, useRef, useMemo } from "react"
import type { CSSProperties, ReactNode } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { T, ACCENT, FONT, GROUP_TONES, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, ResultStats, PrimaryButton, SecondaryButton, DidYouMean } from "./gameUi"
import { LineIcon } from "./icons"
import { didYouMean, matchNames, pickOnEnter } from "../utils/pickOnEnter"
import { DNA, TRAIT, SWATCH, compare, isColour, knownSoFar, warmth } from "../utils/flagDna"
import type { GuessResult, Mark, Region, TraitId } from "../utils/flagDna"
import { loadRecord, raiseRecord, saveRecord } from "../utils/records"

/* Flag DNA: guess a country and its flag's colours, pattern and symbols are
   checked against the mystery flag, Wordle style (rules in utils/flagDna.ts).
   Only what the guessed flag has is listed: green when the mystery flag has
   it too (listed first), yellow when its stripes or cross run the other way,
   grey when it doesn't. "Known so far" adds the guesses up. The best win
   streak is kept in globalio_flagdna_best ({ streak }). */

interface Props { onBack: () => void }

const ACC = ACCENT.play
const MAX_GUESSES = 6
const POOL = FLAGS.filter(f => DNA[f.code])
const BEST_KEY = "globalio_flagdna_best"
const BEST_FIELDS = ["streak"]

const MARK_STYLE: Record<Mark | "plain", { bg: string; border: string; color: string }> = {
  hit:   { bg: tint(T.green, 0.26), border: T.green, color: T.text },
  near:  { bg: tint(GROUP_TONES[0], 0.7), border: T.gold, color: T.text },
  miss:  { bg: "transparent", border: T.line, color: T.dim },
  plain: { bg: T.surfaceHi, border: T.line, color: T.text },
}
const MARK_WORD: Record<Mark, string> = { hit: "it has this too", near: "turned the other way", miss: "it doesn't have this" }
const LEGEND: Record<Mark, string> = { hit: "Has it", near: "Other way round", miss: "Doesn't have it" }

const pillBase: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, minHeight: 26, padding: "2px 10px",
  borderRadius: 999, fontSize: 12, fontWeight: 600, lineHeight: 1.2, whiteSpace: "nowrap",
}

function Dot({ colour }: { colour: keyof typeof SWATCH }) {
  return <span aria-hidden style={{ width: 9, height: 9, borderRadius: 999, flexShrink: 0, background: SWATCH[colour],
    boxShadow: `inset 0 0 0 1px ${tint(T.text, colour === "white" || colour === "yellow" ? 0.35 : 0.12)}` }} />
}

// A ruled-out trait in "Known so far": smaller, thinner, struck through.
const struckPill: CSSProperties = { minHeight: 22, padding: "1px 8px", fontSize: 11, gap: 4 }
const struckText: CSSProperties = { textDecoration: "line-through", textDecorationColor: tint(T.dim, 0.7) }
const edge = (colour: string, struck?: boolean) => `${struck ? 1 : 1.5}px solid ${colour}`

/** One trait as a pill: a colour keeps its swatch dot inside. */
function TraitPill({ trait, mark, struck }: { trait: TraitId; mark: Mark | "plain"; struck?: boolean }) {
  const s = MARK_STYLE[mark]
  const label = TRAIT[trait].label
  return (
    <span data-mark={mark} aria-label={mark === "plain" ? label : `${label}: ${MARK_WORD[mark]}`}
      style={{ ...pillBase, background: s.bg, border: edge(s.border, struck), color: s.color, ...(struck ? struckPill : null) }}>
      {isColour(trait) && <Dot colour={trait} />}
      <span style={struck ? struckText : undefined}>{label}</span>
    </span>
  )
}

function RegionPill({ region, mark, struck }: { region: Region; mark: Mark | "plain"; struck?: boolean }) {
  const s = MARK_STYLE[mark]
  return (
    <span data-mark={mark} aria-label={mark === "plain" || mark === "near" ? region : `${region}: ${MARK_WORD[mark]}`}
      style={{ ...pillBase, background: s.bg, border: edge(s.border, struck), color: s.color, gap: 4, ...(struck ? struckPill : null) }}>
      <LineIcon name="pin" size={struck ? 11 : 12} color={mark === "miss" ? T.dim : T.muted} />
      <span style={struck ? struckText : undefined}>{region}</span>
    </span>
  )
}

/** A line of pills led by a small label, wrapping under it to use the full width. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <span className="geo-micro" style={{ fontSize: 11, color: T.muted, marginRight: 2 }}>{label}</span>
      {children}
    </div>
  )
}

/** The "Known so far" strip: what the guesses add up to. */
function KnownStrip({ results, colourCount }: { results: GuessResult[]; colourCount: number }) {
  const k = knownSoFar(results, colourCount)
  const open = Math.max(0, colourCount - k.colours.length)
  // Once every colour is found the other colours are ruled out anyway.
  const not = open === 0 ? k.not.filter(t => !isColour(t)) : k.not
  const anyHas = k.has.length > 0 || k.region
  const anyNot = not.length > 0 || k.notRegions.length > 0
  return (
    <section aria-label="Known so far" data-known
      style={{ borderRadius: 14, padding: "12px 12px 10px", background: T.surface, border: `1px solid ${T.line}`, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span className="geo-micro" style={{ fontSize: 11, color: ACC }}>Known so far</span>
        <span style={{ fontSize: 12, color: T.muted, fontVariantNumeric: "tabular-nums" }}>
          {open === 0 ? `All ${colourCount} colours found` : `${k.colours.length} of ${colourCount} colours found`}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {k.colours.map(c => <TraitPill key={c} trait={c} mark="hit" />)}
        {Array.from({ length: open }, (_, i) => (
          <span key={`open-${i}`} aria-label="a colour not found yet"
            style={{ ...pillBase, minWidth: 44, justifyContent: "center", border: `1.5px dashed ${T.lineHi}`, color: T.dim }}>?</span>
        ))}
      </div>
      {anyHas && (
        <Row label="Has">
          {k.region && <RegionPill region={k.region} mark="hit" />}
          {k.has.map(t => <TraitPill key={t} trait={t} mark="hit" />)}
        </Row>
      )}
      {anyNot && (
        <Row label="Not">
          {not.map(t => <TraitPill key={t} trait={t} mark="miss" struck />)}
          {k.notRegions.map(r => <RegionPill key={r} region={r} mark="miss" struck />)}
        </Row>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", paddingTop: 8, borderTop: `1px solid ${T.line}`, fontSize: 12, color: T.muted }}>
        {(["hit", "near", "miss"] as const).map(m => (
          <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span aria-hidden style={{ width: 12, height: 12, borderRadius: 999, background: MARK_STYLE[m].bg, border: `1.5px solid ${MARK_STYLE[m].border}` }} />
            {LEGEND[m]}
          </span>
        ))}
      </div>
    </section>
  )
}

/** One guess: the guessed flag, its region, the match %, then its own traits. */
function GuessRow({ r, latest }: { r: GuessResult; latest: boolean }) {
  const flag = DNA[r.code]
  const record = POOL.find(f => f.code === r.code)!
  const label = r.solved ? "Solved" : r.lookalike ? "Lookalike" : warmth(r.match)
  // Every trait green and the same region, yet not the flag: say why.
  const allMatch = !r.solved && r.region && r.clues.every(c => c.mark === "hit")
  const note = r.lookalike ? "Same DNA as the mystery flag: it's a lookalike."
    : allMatch ? "All of this matches. The mystery flag has more." : null
  return (
    <article data-guess={r.code} aria-label={`${flag.name}, ${r.solved ? "the mystery flag" : `${r.match}% match`}`}
      style={{ borderRadius: 14, background: T.surface, border: `1px solid ${r.solved ? T.green : latest ? T.lineHi : T.line}`, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px 8px", background: r.solved ? tint(T.green, 0.08) : "transparent" }}>
        <img src={record.flagUrl} alt="" width={48} height={32}
          style={{ width: 48, height: 32, objectFit: "cover", borderRadius: 4, flexShrink: 0, border: `1px solid ${T.line}` }} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: T.text, lineHeight: 1.2, overflowWrap: "anywhere" }}>{flag.name}</span>
          <RegionPill region={flag.region} mark={r.region ? "hit" : "miss"} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
          {r.solved
            ? <LineIcon name="target" size={22} color={T.green} />
            : <span style={{ fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: 18, color: T.text, lineHeight: 1.1 }}>{r.match}%</span>}
          <span style={{ fontSize: 11, fontWeight: 600, color: r.solved ? T.green : T.muted }}>{label}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 12px 12px" }}>
        {r.clues.map(c => <TraitPill key={c.trait} trait={c.trait} mark={r.solved ? "hit" : c.mark} />)}
      </div>
      {note && <p style={{ margin: 0, padding: "0 12px 12px", fontSize: 12, lineHeight: 1.4, color: T.muted }}>{note}</p>}
    </article>
  )
}

function FlagDNAGame({ onBack, onReplay, streak, onFinish }:
  Props & { onReplay: () => void; streak: number; onFinish: (won: boolean) => { streak: number; best: number } }) {
  const [target] = useState<FlagRecord>(() => POOL[Math.floor(Math.random() * POOL.length)])
  const [input, setInput] = useState("")
  const [guesses, setGuesses] = useState<GuessResult[]>([])
  const [phase, setPhase] = useState<"playing" | "won" | "lost" | "gaveup">("playing")
  const [showDrop, setShowDrop] = useState(false)
  const [maybe, setMaybe] = useState<FlagRecord[]>([])
  const [after, setAfter] = useState<{ streak: number; best: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const dna = DNA[target.code]
  const guessedCodes = useMemo(() => new Set(guesses.map(g => g.code)), [guesses])
  const left = useMemo(() => POOL.filter(f => !guessedCodes.has(f.code)), [guessedCodes])
  const matches = useMemo(() => matchNames(left, input, 6), [left, input])

  const finish = (p: "won" | "lost" | "gaveup") => {
    setPhase(p)
    setAfter(onFinish(p === "won"))
  }

  const submitGuess = (flag: FlagRecord) => {
    if (phase !== "playing" || guessedCodes.has(flag.code) || !DNA[flag.code]) return
    const next = [...guesses, compare(flag.code, target.code)]
    setGuesses(next)
    setInput("")
    setShowDrop(false)
    setMaybe([])
    if (flag.code === target.code) { finish("won"); return }
    if (next.length >= MAX_GUESSES) { finish("lost"); return }
    inputRef.current?.focus()
  }

  const finished = phase !== "playing"
  const won = phase === "won"
  const bestMatch = guesses.length ? Math.max(...guesses.map(g => g.match)) : null
  const newestFirst = [...guesses].reverse()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Flag DNA" onBack={onBack}
        subtitle={
          finished ? (won ? "Solved" : `It was ${target.name}`)
          : [bestMatch !== null ? `Best match ${bestMatch}%` : "Find the mystery flag", streak > 0 ? `Streak ${streak}` : ""].filter(Boolean).join(" · ")
        }
        right={<HeaderStat accent={ACC}>{Math.min(guesses.length + (finished ? 0 : 1), MAX_GUESSES)} / {MAX_GUESSES}</HeaderStat>} />

      <div className="w-full max-w-md mx-auto px-4 pb-8 flex flex-col gap-3" style={{ zIndex: 1 }}>
        {finished && (
          <>
            <ResultCard>
              <ResultHeader icon={won ? "trophy" : "flagdna"} accent={won ? T.green : T.danger}
                eyebrow={won ? (guesses.length === 1 ? "First guess!" : `Solved in ${guesses.length}`) : phase === "gaveup" ? "Gave up" : "Out of guesses"}
                title={target.name} />
              <img src={target.flagUrl} alt={`Flag of ${target.name}`} width={180} height={120}
                style={{ width: 180, height: 120, objectFit: "contain", display: "block", margin: "0 auto", borderRadius: 6 }} />
              <div aria-label={`${target.name}'s flag DNA`} style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
                <RegionPill region={dna.region} mark="plain" />
                {dna.traits.map(t => <TraitPill key={t} trait={t} mark="plain" />)}
              </div>
              {after && (
                <ResultStats stats={[
                  { label: "Streak", value: after.streak, accent: after.streak > 0 ? T.green : T.muted },
                  { label: "Best streak", value: after.best },
                ]} />
              )}
            </ResultCard>
            <PrimaryButton onClick={onReplay} accent={ACC}>New flag</PrimaryButton>
            <SecondaryButton onClick={onBack}>Home</SecondaryButton>
          </>
        )}

        {!finished && (
          <div className="relative" style={{ zIndex: 10 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); setShowDrop(true); setMaybe([]) }}
              onFocus={() => setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 200)}
              onKeyDown={e => {
                if (e.key !== "Enter") return
                const pick = pickOnEnter(matches, input)
                if (pick) submitGuess(pick)
                else if (!matches.length) setMaybe(didYouMean(left, input))
              }}
              enterKeyHint="go" aria-label="Guess a country"
              placeholder={guesses.length ? "Guess another country…" : "Guess any country…"}
              autoComplete="off" autoCorrect="off" spellCheck={false}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium"
              style={{ background: T.surface, border: `1.5px solid ${T.line}`, color: T.text, outline: "none" }}
            />
            {showDrop && matches.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden"
                style={{ background: T.surface, border: `1px solid ${T.line}`, zIndex: 20, boxShadow: `0 8px 24px ${tint(T.text, 0.2)}` }}>
                {matches.map(f => (
                  <button key={f.code} type="button"
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:brightness-95"
                    onMouseDown={e => { e.preventDefault(); submitGuess(f) }}
                    style={{ color: T.text, background: T.surface }}>
                    <img src={f.flagUrl} alt="" style={{ width: 28, height: 18, objectFit: "cover", borderRadius: 3 }} />
                    {f.name}
                    <span style={{ marginLeft: "auto", fontSize: 11, color: T.dim, fontFamily: FONT.mono }}>{f.code}</span>
                  </button>
                ))}
              </div>
            )}
            <DidYouMean options={maybe} onPick={submitGuess} accent={ACC} />
          </div>
        )}

        {!finished && <KnownStrip results={guesses} colourCount={dna.colours} />}

        {!finished && guesses.length === 0 && (
          <p data-howto style={{ margin: 0, padding: "0 4px", fontSize: 13, lineHeight: 1.5, color: T.muted }}>
            Each guess lists its own flag's colours, pattern and symbols. Green: the mystery flag has it too.
            Yellow: its stripes or cross run the other way. Grey: it doesn't.
          </p>
        )}

        {newestFirst.map((g, i) => <GuessRow key={g.code} r={g} latest={i === 0 && !finished} />)}

        {!finished && guesses.length >= 3 && (
          <button type="button" onClick={() => finish("gaveup")}
            className="self-center text-xs px-4 rounded-full font-semibold"
            style={{ minHeight: 36, marginTop: 4, background: T.surface, border: `1px solid ${tint(T.danger, 0.35)}`, color: T.danger }}>
            Give up
          </button>
        )}
      </div>
    </div>
  )
}

export default function FlagDNAScreen({ onBack }: Props) {
  const [replayKey, setReplayKey] = useState(0)
  const [streak, setStreak] = useState(0)

  // A win adds to the streak and saves a new best; a loss or giving up ends it.
  const onFinish = (won: boolean) => {
    const next = won ? streak + 1 : 0
    setStreak(next)
    const r = raiseRecord(loadRecord(BEST_KEY, BEST_FIELDS), { streak: next })
    if (r.raised.length) saveRecord(BEST_KEY, r.next)
    return { streak: next, best: r.next.streak }
  }

  return <FlagDNAGame key={replayKey} onBack={onBack} streak={streak} onFinish={onFinish} onReplay={() => setReplayKey(k => k + 1)} />
}
