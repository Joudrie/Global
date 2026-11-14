import { useEffect, useRef, useState } from "react"
import type { CSSProperties, FormEvent } from "react"
import { flushSync } from "react-dom"
import { Check, Lightbulb, X } from "lucide-react"
import { STRIKES, TARGET, TIERS, gameState, listLanguages, roundPoints } from "../utils/abroad"
import type { AbroadEntry, AbroadRound, AnswerMode, GameState, GuessField, Tier, Verdict } from "../utils/abroad"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { PrimaryButton, ResultCard, ResultDots, ResultHeader, SecondaryButton } from "./gameUi"
import { GamePoster } from "./GamePoster"

/* The screen of the three Abroad games: Cities Abroad, Countries Abroad and
   Native Names. A place's name as some language writes it ("Benetke",
   Slovenian; "Suomi", Finnish); type the English name ("Venice", "Finland"),
   or pick it from four. Ten right before three strikes wins; the further a
   name strays from English, the more it's worth. Each game's file
   (CitiesAbroadScreen, CountriesAbroadScreen, NativeNamesScreen) hands this
   screen its names, copy and rules as an AbroadGame.

   The start screen is one tap: the answer switch keeps its last setting, and
   tapping a difficulty starts the game. */

/** What makes one Abroad game itself. */
export interface AbroadGame {
  id: string                            // registry id: the poster and the saved settings and bests
  title: string                         // "Cities Abroad"
  headline: string                      // "Name the city from its name in another language."
  blurb: string
  noun: string                          // "city"
  plural: string                        // "cities"
  field: GuessField                     // the answer box: nothing in it may mention a name (iOS AutoFill)
  samples: Record<Tier, { name: string; lang: string }>
  languages: Record<string, string>
  rounds: (tier: Tier, rng: () => number) => AbroadRound[]
}
export type { AbroadRound }

interface Props { game: AbroadGame; onBack: () => void; onFinish?: () => void }

const ACC = ACCENT.drill
const PRESS_MS = 240 // how long a tapped difficulty shows its fill before round 1

const TIER_META: Record<Tier, { label: string; color: string }> = {
  easy:   { label: "Easy",   color: T.green },
  medium: { label: "Medium", color: T.gold },
  hard:   { label: "Hard",   color: T.danger },
}
const MODE_LABEL: Record<AnswerMode, string> = { type: "Type it", choice: "4 choices" }

// Storage can be missing or throw (private windows); the game works without it.
// Each game keeps its own: globalio_<id>_prefs ({ mode, tier } last chosen) and
// globalio_<id>_best ({ "easy-type": 340, … }).
const read = <V,>(key: string, fallback: V): V => { try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback } catch { return fallback } }
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* not saved */ } }
const prefsKey = (g: AbroadGame) => `globalio_${g.id}_prefs`
const bestsKey = (g: AbroadGame) => `globalio_${g.id}_best`
type Prefs = { mode: AnswerMode; tier: Tier | null }
const loadPrefs = (g: AbroadGame): Prefs => {
  const p = read<{ mode?: unknown; tier?: unknown }>(prefsKey(g), {})
  return { mode: p.mode === "choice" ? "choice" : "type", tier: TIERS.includes(p.tier as Tier) ? p.tier as Tier : null }
}
const bestKey = (tier: Tier, mode: AnswerMode) => `${tier}-${mode}`
const loadBest = (g: AbroadGame): Record<string, number> => {
  const b = read<Record<string, unknown>>(bestsKey(g), {})
  return Object.fromEntries(Object.entries(b).filter(([, v]) => typeof v === "number")) as Record<string, number>
}

const langsOf = (g: AbroadGame, n: AbroadEntry, max = 3) => listLanguages(n.langs, g.languages, max)
// "Benetke — Slovenian for Venice, Italy"; "Москва (Moskva) — Russian for Moscow, Russia"
const learnLine = (g: AbroadGame, r: AbroadRound) => `${r.entry.name}${r.entry.roman ? ` (${r.entry.roman})` : ""} — ${langsOf(g, r.entry)} for ${r.learnAs}`

// Visually hidden, still read aloud.
const srOnly: CSSProperties = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }

interface Answer extends Verdict { hinted: boolean; given: string; points: number }
interface Game { id: number; tier: Tier; mode: AnswerMode; rounds: AbroadRound[] }
interface Outcome { answers: Answer[]; state: GameState; best: number; beat: boolean }
const scoreOf = (answers: Answer[]) => answers.reduce((s, a) => s + a.points, 0)

// Motion: every animation answers a tap (difficulty fill, feedback, the next
// card, a strike); all are short and ease out, and none run under reduced motion.
const STYLES = `
  .ca-tap { transition: background-color 200ms ease-out, border-color 200ms ease-out, color 200ms ease-out; }
  .ca-tap:focus-visible, .ca-input:focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 2px; }
  @media (hover: hover) {
    .ca-tier:not([data-on]):not(:disabled):hover, .ca-choice:not(:disabled):hover { border-color: ${T.lineHi}; background: ${T.surfaceHi}; }
    .ca-seg:not([aria-checked="true"]):not(:disabled):hover { color: ${T.text}; }
    .ca-hint:not(:disabled):hover { border-color: ${tint(ACC, 0.7)}; }
  }
  .ca-input { outline: none; transition: border-color 150ms ease-out; }
  .ca-bar, .ca-strike { transition: width 200ms ease-out, background-color 200ms ease-out, border-color 200ms ease-out; }
  @keyframes caIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @keyframes caFade { from { opacity: 0; } to { opacity: 1; } }
  .ca-in { animation: caIn 200ms ease-out both; }
  .ca-fade { animation: caFade 160ms ease-out both; }
  @media (prefers-reduced-motion: reduce) {
    .ca-tap, .ca-input, .ca-bar, .ca-strike { transition: none; }
    .ca-in, .ca-fade { animation: none; }
  }
`

export default function AbroadScreen({ game: abroad, onBack, onFinish }: Props) {
  const [prefs, setPrefs] = useState(() => loadPrefs(abroad))
  const [game, setGame] = useState<Game | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const begin = (tier: Tier, mode: AnswerMode) => {
    setOutcome(null)
    setGame(g => ({ id: (g?.id ?? 0) + 1, tier, mode, rounds: abroad.rounds(tier, Math.random) }))
    window.scrollTo({ top: 0 })
  }
  const choose = (next: Partial<Prefs>) => {
    const p = { ...prefs, ...next }
    setPrefs(p)
    write(prefsKey(abroad), p)
  }
  const finish = (g: Game, answers: Answer[]) => {
    const all = loadBest(abroad)
    const key = bestKey(g.tier, g.mode)
    const prev = all[key]
    const score = scoreOf(answers)
    if (prev === undefined || score > prev) write(bestsKey(abroad), { ...all, [key]: score })
    setOutcome({ answers, state: gameState(answers), best: Math.max(prev ?? 0, score), beat: prev !== undefined && score > prev })
    onFinish?.()
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <style>{STYLES}</style>
      {!game && <Start abroad={abroad} prefs={prefs} onMode={mode => choose({ mode })} onBack={onBack}
        onStart={tier => { choose({ tier }); begin(tier, prefs.mode) }} />}
      {game && !outcome && <Play key={game.id} abroad={abroad} game={game} onBack={onBack} onDone={a => finish(game, a)} />}
      {game && outcome && <Result abroad={abroad} game={game} outcome={outcome} onBack={onBack}
        onAgain={() => begin(game.tier, game.mode)} onChange={() => { setGame(null); setOutcome(null) }} />}
    </div>
  )
}

/* ── Start: how to answer, then one tap on a difficulty starts the game. ── */
function Start({ abroad, prefs, onMode, onStart, onBack }:
  { abroad: AbroadGame; prefs: Prefs; onMode: (m: AnswerMode) => void; onStart: (t: Tier) => void; onBack: () => void }) {
  const [pressed, setPressed] = useState<Tier | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // iOS opens the keyboard only for a focus inside the tap itself, and round 1
  // appears PRESS_MS later. So the tap focuses this stand-in box, and the
  // keyboard stays up while round 1's answer box takes the focus from it.
  // Like the answer box, it says nothing about names, so iOS offers no contacts.
  const keyProxy = useRef<HTMLInputElement>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const best = loadBest(abroad)
  const field = abroad.field

  const press = (t: Tier) => {
    if (pressed) return
    setPressed(t)
    if (prefs.mode === "type") keyProxy.current?.focus({ preventScroll: true })
    timer.current = setTimeout(() => onStart(t), PRESS_MS)
  }

  return (
    <>
      <ScreenHeader title={abroad.title} onBack={onBack} />
      <main className="w-full mx-auto flex flex-col" style={{ maxWidth: 720, padding: "4px 16px 32px", gap: 20 }}>
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div aria-hidden style={{ position: "relative", height: 112, borderRadius: 16, overflow: "hidden", border: `1px solid ${T.line}` }}>
            <GamePoster id={abroad.id} accent={ACC} />
          </div>
          <div>
            <h2 className="geo-display" style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: T.text }}>{abroad.headline}</h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.5, color: T.muted }}>{abroad.blurb}</p>
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div id="ca-mode" className="geo-micro" style={{ fontSize: 11, color: T.muted }}>Answer</div>
          <div role="radiogroup" aria-labelledby="ca-mode" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: T.surfaceHi, border: `1px solid ${T.line}` }}>
            {(["type", "choice"] as AnswerMode[]).map(m => {
              const on = prefs.mode === m
              return (
                <button key={m} type="button" role="radio" aria-checked={on} onClick={() => onMode(m)} disabled={!!pressed}
                  className="ca-tap ca-seg"
                  style={{ flex: 1, height: 40, borderRadius: 8, border: "none", fontSize: 15, fontWeight: 700, cursor: pressed ? "default" : "pointer",
                    background: on ? T.surface : "transparent", color: on ? T.text : T.muted,
                    boxShadow: on ? `0 1px 4px -2px ${tint(T.text, 0.5)}` : "none" }}>
                  {MODE_LABEL[m]}
                </button>
              )
            })}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Typing scores double. Small slips in spelling still count.</p>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="geo-micro" style={{ fontSize: 11, color: T.muted }}>Difficulty · tap to start</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {TIERS.map(t => {
              const m = TIER_META[t]
              const on = pressed === t
              const b = best[bestKey(t, prefs.mode)]
              const last = prefs.tier === t
              return (
                <div key={t} style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <button type="button" onClick={() => press(t)} disabled={!!pressed && !on} data-on={on || undefined}
                    aria-label={`Start ${m.label}${last ? ", last played" : ""}${b !== undefined ? `, best ${b}` : ""}`}
                    className="ca-tap ca-tier"
                    style={{ minHeight: 96, padding: "12px 8px", borderRadius: 12, cursor: pressed ? "default" : "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, textAlign: "center",
                      background: on ? m.color : T.surface, border: `1px solid ${on ? m.color : T.line}`, color: on ? T.onAccent : T.text }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: on ? T.onAccent : m.color }} />
                      <span className="geo-display" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.1 }}>{m.label}</span>
                    </span>
                    <span lang={abroad.samples[t].lang} style={{ fontSize: 13, color: on ? T.onAccent : T.muted, fontFamily: FONT.display, overflowWrap: "anywhere" }}>{abroad.samples[t].name}</span>
                    <span className="geo-mono" style={{ fontSize: 12, color: on ? T.onAccent : T.dim }}>{b !== undefined ? `Best ${b}` : "Best —"}</span>
                  </button>
                  <span aria-hidden className="geo-micro" style={{ fontSize: 10, textAlign: "center", color: last ? T.muted : "transparent" }}>Last played</span>
                </div>
              )
            })}
          </div>
        </section>
        <input ref={keyProxy} aria-hidden tabIndex={-1} autoComplete={field.autoComplete} autoCorrect={field.autoCorrect}
          autoCapitalize={field.autoCapitalize} spellCheck={field.spellCheck}
          style={{ position: "fixed", top: 0, left: 0, width: 1, height: 1, padding: 0, border: 0, opacity: 0, fontSize: 16, pointerEvents: "none" }} />
      </main>
    </>
  )
}

/* ── Three strikes in the header: hollow until used. ────────────────────── */
function Strikes({ used }: { used: number }) {
  return (
    <span role="img" aria-label={`${used} of ${STRIKES} strikes`} style={{ display: "inline-flex", gap: 4, flexShrink: 0 }}>
      {Array.from({ length: STRIKES }, (_, i) => {
        const on = i < used
        return (
          <span key={i} className="ca-strike" style={{ width: 24, height: 24, borderRadius: 8, display: "grid", placeItems: "center",
            background: on ? T.danger : "transparent", border: `1.5px solid ${on ? T.danger : T.line}`, color: on ? T.onAccent : "transparent" }}>
            <X size={14} strokeWidth={2.6} aria-hidden />
          </span>
        )
      })}
    </span>
  )
}

/* ── A game: rounds until ten right or three strikes, then the result. ──── */
function Play({ abroad, game, onBack, onDone }: { abroad: AbroadGame; game: Game; onBack: () => void; onDone: (a: Answer[]) => void }) {
  const { tier, mode, rounds } = game
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [typed, setTyped] = useState("")
  const [hinted, setHinted] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const nextWrap = useRef<HTMLDivElement>(null)
  const locked = useRef(false) // one answer per round, however fast the taps

  const r = rounds[idx]
  const answer = answers[idx] as Answer | undefined
  const answered = !!answer
  const score = scoreOf(answers)
  const right = answers.filter(a => a.correct).length
  const strikes = answers.length - right
  const state = gameState(answers)
  const over = state !== "playing" || idx + 1 >= rounds.length
  const m = TIER_META[tier]
  const worth = roundPoints(r.entry.value, mode, true, hinted)
  const field = abroad.field

  // Typing: the box takes focus each round (the start screen has none, so the
  // keyboard never opens there). After an answer, Next takes focus so Enter
  // moves on.
  useEffect(() => { if (mode === "type" && !answered) inputRef.current?.focus({ preventScroll: true }) }, [idx, mode, answered])
  useEffect(() => { if (answered) nextWrap.current?.querySelector("button")?.focus({ preventScroll: true }) }, [answered])

  const submit = (given: string, verdict: Verdict) => {
    if (answered || locked.current || !given.trim()) return
    locked.current = true
    setAnswers(a => [...a, { ...verdict, hinted, given: given.trim(), points: roundPoints(r.entry.value, mode, verdict.correct, hinted) }])
  }
  const next = () => {
    if (!answered) return
    if (over) { onDone(answers); return }
    locked.current = false
    // Render the next round now and focus the box inside this tap, so phones
    // open the keyboard for it.
    flushSync(() => { setIdx(i => i + 1); setTyped(""); setHinted(false); setPicked(null) })
    if (mode === "type") inputRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }
  const pick = (c: string) => {
    if (answered || locked.current) return
    setPicked(c)
    submit(c, { correct: r.isRight(c), misspelt: false, near: false })
  }

  // 1–4 pick a choice from the keyboard.
  useEffect(() => {
    if (mode !== "choice" || answered) return
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= 4 && !e.metaKey && !e.ctrlKey && !e.altKey) pick(r.choices[n - 1])
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const onSubmit = (e: FormEvent) => { e.preventDefault(); submit(typed, r.judge(typed)) }
  const verdict = !answer ? "" : answer.correct
    ? (answer.misspelt ? `Right — it's spelled ${r.answer} · +${answer.points}` : `Right · +${answer.points}`)
    : answer.vague ? `Which one? It's ${r.answer}` : answer.near ? `Almost — it's spelled ${r.answer}` : `It's ${r.answer}`
  const strikeLine = answer && !answer.correct ? (strikes >= STRIKES ? "Third strike: game over." : `Strike ${strikes} of ${STRIKES}.`) : ""

  return (
    <>
      <ScreenHeader title={abroad.title} subtitle={`${m.label} · ${right}/${TARGET} right · ${score} pts`} onBack={onBack}
        right={<Strikes used={strikes} />} />
      <div role="progressbar" aria-label="Right answers" aria-valuemin={0} aria-valuemax={TARGET} aria-valuenow={right}
        aria-valuetext={`${right} of ${TARGET} right`}
        style={{ margin: "0 16px", height: 4, borderRadius: 999, background: T.line, overflow: "hidden" }}>
        <div className="ca-bar" style={{ height: "100%", width: `${(right / TARGET) * 100}%`, background: m.color }} />
      </div>
      {/* One live region for the round and its result, so both are read aloud. */}
      <div aria-live="polite" style={srOnly}>
        {answer ? `${verdict}. ${strikeLine} ${learnLine(abroad, r)}.` : `${r.entry.name}, in ${langsOf(abroad, r.entry)}. Worth ${worth} points.`}
      </div>

      <main className="w-full mx-auto flex flex-col" style={{ maxWidth: 720, padding: "12px 16px 32px", gap: 12 }}>
        <NameCard key={idx} abroad={abroad} round={r} hinted={hinted} worth={answered ? null : worth} />

        {mode === "type" ? (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor={field.id} style={srOnly}>{field.label}</label>
            <input id={field.id} ref={inputRef} className="ca-input" value={answered ? answer.given : typed} readOnly={answered}
              onChange={e => setTyped(e.target.value)} placeholder={field.placeholder} autoComplete={field.autoComplete}
              autoCorrect={field.autoCorrect} autoCapitalize={field.autoCapitalize} spellCheck={field.spellCheck}
              enterKeyHint={field.enterKeyHint} aria-invalid={answered && !answer.correct ? true : undefined}
              style={{ width: "100%", height: 52, padding: "0 16px", borderRadius: 12, fontSize: 17, fontWeight: 600, color: T.text, background: T.surface,
                border: `1.5px solid ${answered ? (answer.correct ? T.green : T.danger) : T.line}` }} />
            {!answered && (
              <div style={{ display: "flex", gap: 8 }}>
                <HintButton used={hinted} onClick={() => { setHinted(true); inputRef.current?.focus({ preventScroll: true }) }} />
                <PrimaryButton type="submit" accent={ACC} disabled={!typed.trim()} style={{ flex: 1, width: "auto" }}>Check</PrimaryButton>
              </div>
            )}
          </form>
        ) : (
          <>
            <div role="group" aria-label={`Choose the ${abroad.noun} in English`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {r.choices.map((c, i) => {
                const isRight = r.isRight(c)
                const look = !answered ? "idle" : isRight ? "right" : picked === c ? "wrong" : "off"
                const color = look === "right" ? T.green : look === "wrong" ? T.danger : null
                return (
                  <button key={c} type="button" disabled={answered} onClick={() => pick(c)}
                    aria-label={`${c}${look === "right" ? ", the answer" : look === "wrong" ? ", your answer" : ""}`}
                    aria-keyshortcuts={String(i + 1)}
                    className="ca-tap ca-choice"
                    style={{ minHeight: 56, padding: "8px 12px", borderRadius: 12, fontSize: 15, fontWeight: 600, lineHeight: 1.25,
                      cursor: answered ? "default" : "pointer", textAlign: "center", overflowWrap: "anywhere",
                      background: color ? tint(color, 0.12) : T.surface, border: `1.5px solid ${color ?? T.line}`,
                      color: color ?? (look === "off" ? T.muted : T.text) }}>
                    {c}
                  </button>
                )
              })}
            </div>
            {!answered && <HintButton used={hinted} onClick={() => setHinted(true)} wide />}
          </>
        )}

        {answer && (
          <div className="ca-fade" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 16, borderRadius: 12, background: T.surface,
              border: `1px solid ${tint(answer.correct ? T.green : T.danger, 0.45)}` }}>
              <span aria-hidden style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center",
                background: tint(answer.correct ? T.green : T.danger, 0.14), color: answer.correct ? T.green : T.danger }}>
                {answer.correct ? <Check size={16} strokeWidth={2.4} /> : <X size={16} strokeWidth={2.4} />}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: answer.correct ? T.green : T.danger }}>{verdict}</div>
                {strikeLine && <div style={{ marginTop: 2, fontSize: 13, fontWeight: 600, color: T.muted }}>{strikeLine}</div>}
                <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.45, color: T.text, overflowWrap: "anywhere" }}>{learnLine(abroad, r)}.</p>
              </div>
            </div>
            <div ref={nextWrap}>
              <PrimaryButton accent={ACC} onClick={next}>{over ? "See results" : "Next"}</PrimaryButton>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

function NameCard({ abroad, round, hinted, worth }: { abroad: AbroadGame; round: AbroadRound; hinted: boolean; worth: number | null }) {
  const { entry } = round
  const lang = entry.langs[0]
  // Sized by the longest word, so a long one (Kaupmannahöfn) fits a phone
  // without breaking, and by the whole name, so a long one stays on two lines.
  const longest = Math.max(...entry.name.split(/[\s-]+/).map(w => w.length))
  const size = Math.min(entry.name.length > 22 ? 26 : entry.name.length > 14 ? 32 : 40,
    longest > 17 ? 22 : longest > 14 ? 26 : longest > 11 ? 30 : longest > 9 ? 34 : 40)
  return (
    <section className="ca-in" aria-label={`The ${abroad.noun} to name`}
      style={{ padding: "16px 16px 20px", borderRadius: 16, background: T.surface, border: `1px solid ${T.line}`, textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ alignSelf: "stretch", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <span className="geo-micro" style={{ fontSize: 11, color: T.muted, textAlign: "left", minWidth: 0 }}>in {langsOf(abroad, entry)}</span>
        <span className="geo-mono" aria-hidden style={{ flexShrink: 0, fontSize: 12, color: T.muted, fontVariantNumeric: "tabular-nums" }}>
          {worth !== null ? `${worth} pts` : ""}
        </span>
      </div>
      <p lang={lang} className="geo-display" style={{ margin: 0, fontSize: size, fontWeight: 700, lineHeight: 1.15, color: T.text, overflowWrap: "anywhere", hyphens: "auto" }}>
        {entry.name}
      </p>
      {entry.roman && (
        <p style={{ margin: 0, fontSize: 17, color: T.muted, fontWeight: 500, overflowWrap: "anywhere" }}>
          <span style={srOnly}>In Latin letters: </span><span lang={`${lang}-Latn`}>{entry.roman}</span>
        </p>
      )}
      {hinted && <p className="ca-fade" style={{ margin: 0, fontSize: 14, color: ACC, fontWeight: 600 }}>{round.hint}</p>}
    </section>
  )
}

function HintButton({ used, onClick, wide = false }: { used: boolean; onClick: () => void; wide?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={used} className="ca-tap ca-hint"
      aria-label={used ? "Hint used" : "Hint, for half points"}
      style={{ height: 52, padding: "0 16px", borderRadius: 12, flexShrink: 0, width: wide ? "100%" : "auto",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 14, fontWeight: 600,
        background: used ? T.surfaceHi : T.surface, border: `1px solid ${used ? T.line : tint(ACC, 0.4)}`, color: used ? T.dim : ACC,
        cursor: used ? "default" : "pointer" }}>
      <Lightbulb size={16} strokeWidth={1.8} aria-hidden /> {used ? "Hint used" : "Hint · half points"}
    </button>
  )
}

/* ── Result: won or out, the score, and every name played. ──────────────── */
function Result({ abroad, game, outcome, onBack, onAgain, onChange }:
  { abroad: AbroadGame; game: Game; outcome: Outcome; onBack: () => void; onAgain: () => void; onChange: () => void }) {
  const { tier, mode, rounds } = game
  const { answers, state, best, beat } = outcome
  const score = scoreOf(answers)
  const right = answers.filter(a => a.correct).length
  const strikes = answers.length - right
  const won = state === "won"
  const played = rounds.slice(0, answers.length)

  return (
    <>
      <ScreenHeader title={abroad.title} subtitle={`Results · ${TIER_META[tier].label} · ${MODE_LABEL[mode]}`} onBack={onBack} />
      <main className="w-full mx-auto flex flex-col" style={{ maxWidth: 720, padding: "4px 16px 32px", gap: 12 }}>
        <ResultCard>
          <ResultHeader icon={won ? "trophy" : "x"} accent={won ? T.gold : T.danger}
            eyebrow={beat ? "New best" : won ? "Ten right" : strikes >= STRIKES ? "Three strikes" : `Out of ${abroad.plural}`}
            title={won ? `You made it: ${score} points` : `Out with ${right} right`}
            score={won
              ? `${strikes === 0 ? "No strikes" : `${strikes} ${strikes === 1 ? "strike" : "strikes"}`} · best ${best}`
              : `${score} points · best ${best}`} />
          <ResultDots results={answers.map(a => a.correct)} />
        </ResultCard>

        <section aria-labelledby="ca-learned" style={{ borderRadius: 16, background: T.surface, border: `1px solid ${T.line}`, padding: "16px 16px 8px" }}>
          <h3 id="ca-learned" className="geo-micro" style={{ margin: "0 0 4px", fontSize: 11, color: T.muted }}>You learned</h3>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {played.map((r, i) => {
              const a = answers[i]
              return (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? `1px solid ${T.line}` : "none" }}>
                  <span style={{ flexShrink: 0, display: "flex", color: a.correct ? T.green : T.danger }}>
                    {a.correct ? <Check size={16} strokeWidth={2.4} aria-hidden /> : <X size={16} strokeWidth={2.4} aria-hidden />}
                    <span style={srOnly}>{a.correct ? "Right:" : "Missed:"}</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span lang={r.entry.langs[0]} className="geo-display" style={{ display: "block", fontSize: 16, fontWeight: 700, color: T.text, overflowWrap: "anywhere" }}>{r.entry.name}</span>
                    <span style={{ display: "block", fontSize: 12, color: T.muted, marginTop: 2 }}>
                      {r.entry.roman && <><span lang={`${r.entry.langs[0]}-Latn`}>{r.entry.roman}</span> · </>}{langsOf(abroad, r.entry)}
                    </span>
                  </span>
                  <span style={{ flexShrink: 0, maxWidth: "45%", textAlign: "right", fontSize: 15, fontWeight: 700, color: T.text }}>
                    <span style={srOnly}>is </span>{r.answer}
                    <span style={{ display: "block", fontSize: 12, fontWeight: 400, color: T.muted }}>{r.where}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        </section>

        <PrimaryButton accent={ACC} onClick={onAgain}>Play again</PrimaryButton>
        <SecondaryButton onClick={onChange}>Change difficulty</SecondaryButton>
      </main>
    </>
  )
}
