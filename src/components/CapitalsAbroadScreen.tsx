import { useEffect, useRef, useState } from "react"
import type { CSSProperties, FormEvent } from "react"
import { flushSync } from "react-dom"
import { Check, Lightbulb, X } from "lucide-react"
import { ABROAD_CAPITALS, ABROAD_LANGUAGES, ABROAD_NAMES } from "../data/capitalsAbroad"
import { TIERS, hintFor, isCorrectAnswer, isNearMiss, listLanguages, maxScore, pickRounds, roundPoints } from "../utils/capitalsAbroad"
import type { AbroadName, AnswerMode, Round, Tier } from "../utils/capitalsAbroad"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, PrimaryButton, ResultCard, ResultDots, ResultHeader, SecondaryButton } from "./gameUi"
import { GamePoster } from "./GamePoster"

/* Capitals Abroad — a capital's name as another language writes it
   ("Varsovia", Spanish); type the English name ("Warsaw"), or pick it from
   four. The names come from Wikidata (src/data/capitalsAbroad.ts).

   The start screen is one tap: the answer switch keeps its last setting, and
   tapping a difficulty starts the game. Category tabs (countries in other
   languages, native names) can sit above the answer switch once they exist. */

interface Props { onBack: () => void; onFinish?: () => void }

const ACC = ACCENT.drill
const PREFS_KEY = "globalio_capitalsabroad_prefs" // { mode, tier } last chosen
const BEST_KEY = "globalio_capitalsabroad_best"   // { "easy-type": 180, … }
const PRESS_MS = 240 // how long a tapped difficulty shows its fill before round 1

const TIER_META: Record<Tier, { label: string; color: string; sample: string; sampleLang: string }> = {
  easy:   { label: "Easy",   color: T.green,  sample: "Roma",    sampleLang: "it" },
  medium: { label: "Medium", color: T.gold,   sample: "Londres", sampleLang: "es" },
  hard:   { label: "Hard",   color: T.danger, sample: "Москва",  sampleLang: "ru" },
}
const MODE_LABEL: Record<AnswerMode, string> = { type: "Type it", choice: "4 choices" }

// Storage can be missing or throw (private windows); the game works without it.
const read = <V,>(key: string, fallback: V): V => { try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback } catch { return fallback } }
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* not saved */ } }
type Prefs = { mode: AnswerMode; tier: Tier | null }
const loadPrefs = (): Prefs => {
  const p = read<{ mode?: unknown; tier?: unknown }>(PREFS_KEY, {})
  return { mode: p.mode === "choice" ? "choice" : "type", tier: TIERS.includes(p.tier as Tier) ? p.tier as Tier : null }
}
const bestKey = (tier: Tier, mode: AnswerMode) => `${tier}-${mode}`
const loadBest = (): Record<string, number> => {
  const b = read<Record<string, unknown>>(BEST_KEY, {})
  return Object.fromEntries(Object.entries(b).filter(([, v]) => typeof v === "number")) as Record<string, number>
}

const langsOf = (n: AbroadName) => listLanguages(n.langs, ABROAD_LANGUAGES)
// "Varsovia — Spanish for Warsaw, Poland"; "Москва (Moskva) — Russian and Ukrainian for Moscow, Russia"
const learnLine = (r: Round) => `${r.entry.name}${r.entry.roman ? ` (${r.entry.roman})` : ""} — ${langsOf(r.entry)} for ${r.capital.capital}, ${r.capital.country}`
const scoreOf = (mode: AnswerMode, answers: Answer[]) => answers.reduce((s, a) => s + roundPoints(mode, a.correct, a.hinted), 0)

// Visually hidden, still read aloud.
const srOnly: CSSProperties = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }

interface Answer { correct: boolean; hinted: boolean; given: string }
interface Game { id: number; tier: Tier; mode: AnswerMode; rounds: Round[] }
interface Outcome { answers: Answer[]; best: number; beat: boolean }

// Motion: every animation answers a tap (difficulty fill, feedback, the next
// card); all are short and ease out, and none run under reduced motion.
const STYLES = `
  .ca-tap { transition: background-color 200ms ease-out, border-color 200ms ease-out, color 200ms ease-out; }
  .ca-tap:focus-visible, .ca-input:focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 2px; }
  @media (hover: hover) {
    .ca-tier:not([data-on]):not(:disabled):hover, .ca-choice:not(:disabled):hover { border-color: ${T.lineHi}; background: ${T.surfaceHi}; }
    .ca-seg:not([aria-checked="true"]):not(:disabled):hover { color: ${T.text}; }
    .ca-hint:not(:disabled):hover { border-color: ${tint(ACC, 0.7)}; }
  }
  .ca-input { outline: none; transition: border-color 150ms ease-out; }
  .ca-bar { transition: width 200ms ease-out; }
  @keyframes caIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @keyframes caFade { from { opacity: 0; } to { opacity: 1; } }
  .ca-in { animation: caIn 200ms ease-out both; }
  .ca-fade { animation: caFade 160ms ease-out both; }
  @media (prefers-reduced-motion: reduce) {
    .ca-tap, .ca-input, .ca-bar { transition: none; }
    .ca-in, .ca-fade { animation: none; }
  }
`

export default function CapitalsAbroadScreen({ onBack, onFinish }: Props) {
  const [prefs, setPrefs] = useState(loadPrefs)
  const [game, setGame] = useState<Game | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const begin = (tier: Tier, mode: AnswerMode) => {
    setOutcome(null)
    setGame(g => ({ id: (g?.id ?? 0) + 1, tier, mode, rounds: pickRounds(ABROAD_NAMES, ABROAD_CAPITALS, tier, Math.random) }))
    window.scrollTo({ top: 0 })
  }
  const choose = (next: Partial<Prefs>) => {
    const p = { ...prefs, ...next }
    setPrefs(p)
    write(PREFS_KEY, p)
  }
  const finish = (g: Game, answers: Answer[]) => {
    const all = loadBest()
    const key = bestKey(g.tier, g.mode)
    const prev = all[key]
    const score = scoreOf(g.mode, answers)
    if (prev === undefined || score > prev) write(BEST_KEY, { ...all, [key]: score })
    setOutcome({ answers, best: Math.max(prev ?? 0, score), beat: prev !== undefined && score > prev })
    onFinish?.()
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <style>{STYLES}</style>
      {!game && <Start prefs={prefs} onMode={mode => choose({ mode })} onBack={onBack}
        onStart={tier => { choose({ tier }); begin(tier, prefs.mode) }} />}
      {game && !outcome && <Play key={game.id} game={game} onBack={onBack} onDone={a => finish(game, a)} />}
      {game && outcome && <Result game={game} outcome={outcome} onBack={onBack}
        onAgain={() => begin(game.tier, game.mode)} onChange={() => { setGame(null); setOutcome(null) }} />}
    </div>
  )
}

/* ── Start: how to answer, then one tap on a difficulty starts the game. ── */
function Start({ prefs, onMode, onStart, onBack }:
  { prefs: Prefs; onMode: (m: AnswerMode) => void; onStart: (t: Tier) => void; onBack: () => void }) {
  const [pressed, setPressed] = useState<Tier | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // iOS opens the keyboard only for a focus inside the tap itself, and round 1
  // appears PRESS_MS later. So the tap focuses this stand-in box, and the
  // keyboard stays up while round 1's answer box takes the focus from it.
  const keyProxy = useRef<HTMLInputElement>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const best = loadBest()

  const press = (t: Tier) => {
    if (pressed) return
    setPressed(t)
    if (prefs.mode === "type") keyProxy.current?.focus({ preventScroll: true })
    timer.current = setTimeout(() => onStart(t), PRESS_MS)
  }

  return (
    <>
      <ScreenHeader title="Capitals Abroad" onBack={onBack} />
      <main className="w-full mx-auto flex flex-col" style={{ maxWidth: 720, padding: "4px 16px 32px", gap: 20 }}>
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div aria-hidden style={{ position: "relative", height: 112, borderRadius: 16, overflow: "hidden", border: `1px solid ${T.line}` }}>
            <GamePoster id="capitalsabroad" accent={ACC} />
          </div>
          <div>
            <h2 className="geo-display" style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: T.text }}>Name the capital, written in another language</h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.5, color: T.muted }}>
              Ten capitals the way Spanish, German, Russian or Greek speakers write them. Answer with the English name.
            </p>
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
          <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Typing scores double.</p>
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
                    <span lang={m.sampleLang} style={{ fontSize: 13, color: on ? T.onAccent : T.muted, fontFamily: FONT.display }}>{m.sample}</span>
                    <span className="geo-mono" style={{ fontSize: 12, color: on ? T.onAccent : T.dim }}>{b !== undefined ? `Best ${b}` : "Best —"}</span>
                  </button>
                  <span aria-hidden className="geo-micro" style={{ fontSize: 10, textAlign: "center", color: last ? T.muted : "transparent" }}>Last played</span>
                </div>
              )
            })}
          </div>
        </section>
        <input ref={keyProxy} aria-hidden tabIndex={-1} autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck={false}
          style={{ position: "fixed", top: 0, left: 0, width: 1, height: 1, padding: 0, border: 0, opacity: 0, fontSize: 16, pointerEvents: "none" }} />
      </main>
    </>
  )
}

/* ── A game: ten rounds, then the result. ───────────────────────────────── */
function Play({ game, onBack, onDone }: { game: Game; onBack: () => void; onDone: (a: Answer[]) => void }) {
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
  const score = scoreOf(mode, answers)
  let streak = 0
  for (let i = answers.length - 1; i >= 0 && answers[i].correct; i--) streak++
  const last = idx + 1 >= rounds.length
  const m = TIER_META[tier]
  const near = !!answer && !answer.correct && mode === "type" && isNearMiss(r.capital, answer.given)

  // Typing: the box takes focus each round (the start screen has none, so the
  // keyboard never opens there). After an answer, Next takes focus so Enter
  // moves on.
  useEffect(() => { if (mode === "type" && !answered) inputRef.current?.focus({ preventScroll: true }) }, [idx, mode, answered])
  useEffect(() => { if (answered) nextWrap.current?.querySelector("button")?.focus({ preventScroll: true }) }, [answered])

  const submit = (given: string) => {
    if (answered || locked.current || !given.trim()) return
    locked.current = true
    setAnswers(a => [...a, { correct: isCorrectAnswer(r.capital, given), hinted, given: given.trim() }])
  }
  const next = () => {
    if (!answered) return
    if (last) { onDone(answers); return }
    locked.current = false
    // Render the next round now and focus the box inside this tap, so phones
    // open the keyboard for it.
    flushSync(() => { setIdx(i => i + 1); setTyped(""); setHinted(false); setPicked(null) })
    if (mode === "type") inputRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }
  const pick = (c: string) => { if (answered || locked.current) return; setPicked(c); submit(c) }

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

  const onSubmit = (e: FormEvent) => { e.preventDefault(); submit(typed) }
  const verdict = !answer ? "" : answer.correct
    ? `Right · +${roundPoints(mode, true, answer.hinted)}`
    : near ? `Almost · it's spelled ${r.capital.capital}` : `It's ${r.capital.capital}`

  return (
    <>
      <ScreenHeader title="Capitals Abroad" subtitle={`${m.label} · Round ${idx + 1} of ${rounds.length} · ${score} pts`} onBack={onBack}
        right={<HeaderStat label="Streak" accent={streak > 0 ? ACC : T.muted}>{streak}</HeaderStat>} />
      <div role="progressbar" aria-label="Rounds played" aria-valuemin={0} aria-valuemax={rounds.length} aria-valuenow={answers.length}
        style={{ margin: "0 16px", height: 4, borderRadius: 999, background: T.line, overflow: "hidden" }}>
        <div className="ca-bar" style={{ height: "100%", width: `${(answers.length / rounds.length) * 100}%`, background: m.color }} />
      </div>
      {/* One live region for the round and its result, so both are read aloud. */}
      <div aria-live="polite" style={srOnly}>
        {answer ? `${verdict}. ${learnLine(r)}.` : `Round ${idx + 1}: ${r.entry.name}, in ${langsOf(r.entry)}.`}
      </div>

      <main className="w-full mx-auto flex flex-col" style={{ maxWidth: 720, padding: "12px 16px 32px", gap: 12 }}>
        <NameCard key={idx} round={r} hinted={hinted} />

        {mode === "type" ? (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="ca-answer" style={srOnly}>The capital's English name</label>
            <input id="ca-answer" ref={inputRef} className="ca-input" value={answered ? answer.given : typed} readOnly={answered}
              onChange={e => setTyped(e.target.value)} placeholder="The English name" autoComplete="off" autoCorrect="off"
              autoCapitalize="words" spellCheck={false} enterKeyHint="go" aria-invalid={answered && !answer.correct ? true : undefined}
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
            <div role="group" aria-label="Choose the English name" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {r.choices.map((c, i) => {
                const isRight = isCorrectAnswer(r.capital, c)
                const state = !answered ? "idle" : isRight ? "right" : picked === c ? "wrong" : "off"
                const color = state === "right" ? T.green : state === "wrong" ? T.danger : null
                return (
                  <button key={c} type="button" disabled={answered} onClick={() => pick(c)}
                    aria-label={`${c}${state === "right" ? ", the answer" : state === "wrong" ? ", your answer" : ""}`}
                    aria-keyshortcuts={String(i + 1)}
                    className="ca-tap ca-choice"
                    style={{ minHeight: 56, padding: "8px 12px", borderRadius: 12, fontSize: 15, fontWeight: 600, lineHeight: 1.25,
                      cursor: answered ? "default" : "pointer", textAlign: "center", overflowWrap: "anywhere",
                      background: color ? tint(color, 0.12) : T.surface, border: `1.5px solid ${color ?? T.line}`,
                      color: color ?? (state === "off" ? T.muted : T.text) }}>
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
                <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.45, color: T.text }}>{learnLine(r)}.</p>
              </div>
            </div>
            <div ref={nextWrap}>
              <PrimaryButton accent={ACC} onClick={next}>{last ? "See results" : "Next"}</PrimaryButton>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

function NameCard({ round, hinted }: { round: Round; hinted: boolean }) {
  const { entry } = round
  const lang = entry.langs[0]
  const len = entry.name.length
  const size = len > 22 ? 26 : len > 14 ? 32 : 40
  return (
    <section className="ca-in" aria-label="The capital to name"
      style={{ padding: "20px 16px", borderRadius: 16, background: T.surface, border: `1px solid ${T.line}`, textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div className="geo-micro" style={{ fontSize: 11, color: T.muted }}>in {langsOf(entry)}</div>
      <p lang={lang} className="geo-display" style={{ margin: 0, fontSize: size, fontWeight: 700, lineHeight: 1.15, color: T.text, overflowWrap: "anywhere", hyphens: "auto" }}>
        {entry.name}
      </p>
      {entry.roman && (
        <p style={{ margin: 0, fontSize: 17, color: T.muted, fontWeight: 500 }}>
          <span style={srOnly}>In Latin letters: </span><span lang={`${lang}-Latn`}>{entry.roman}</span>
        </p>
      )}
      {hinted && <p className="ca-fade" style={{ margin: 0, fontSize: 14, color: ACC, fontWeight: 600 }}>{hintFor(round.capital)}</p>}
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

/* ── Result: score, right answers, and the ten names. ───────────────────── */
function Result({ game, outcome, onBack, onAgain, onChange }:
  { game: Game; outcome: Outcome; onBack: () => void; onAgain: () => void; onChange: () => void }) {
  const { tier, mode, rounds } = game
  const { answers, best, beat } = outcome
  const score = scoreOf(mode, answers)
  const right = answers.filter(a => a.correct).length
  const pct = score / maxScore(mode)

  return (
    <>
      <ScreenHeader title="Capitals Abroad" subtitle={`Results · ${TIER_META[tier].label} · ${MODE_LABEL[mode]}`} onBack={onBack} />
      <main className="w-full mx-auto flex flex-col" style={{ maxWidth: 720, padding: "4px 16px 32px", gap: 12 }}>
        <ResultCard>
          <ResultHeader icon={pct >= 0.8 ? "trophy" : pct >= 0.5 ? "check" : "codex"} accent={pct >= 0.8 ? T.gold : ACC}
            eyebrow={beat ? "New best" : undefined} title={`${score} of ${maxScore(mode)} points`}
            score={`${right} of ${rounds.length} right · best ${best}`} />
          <ResultDots results={answers.map(a => a.correct)} />
        </ResultCard>

        <section aria-labelledby="ca-learned" style={{ borderRadius: 16, background: T.surface, border: `1px solid ${T.line}`, padding: "16px 16px 8px" }}>
          <h3 id="ca-learned" className="geo-micro" style={{ margin: "0 0 4px", fontSize: 11, color: T.muted }}>You learned</h3>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {rounds.map((r, i) => {
              const ok = answers[i]?.correct
              return (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? `1px solid ${T.line}` : "none" }}>
                  <span style={{ flexShrink: 0, display: "flex", color: ok ? T.green : T.danger }}>
                    {ok ? <Check size={16} strokeWidth={2.4} aria-hidden /> : <X size={16} strokeWidth={2.4} aria-hidden />}
                    <span style={srOnly}>{ok ? "Right:" : "Missed:"}</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span lang={r.entry.langs[0]} className="geo-display" style={{ display: "block", fontSize: 16, fontWeight: 700, color: T.text, overflowWrap: "anywhere" }}>{r.entry.name}</span>
                    <span style={{ display: "block", fontSize: 12, color: T.muted, marginTop: 2 }}>
                      {r.entry.roman && <><span lang={`${r.entry.langs[0]}-Latn`}>{r.entry.roman}</span> · </>}{langsOf(r.entry)}
                    </span>
                  </span>
                  <span style={{ flexShrink: 0, maxWidth: "45%", textAlign: "right", fontSize: 15, fontWeight: 700, color: T.text }}>
                    <span style={srOnly}>is </span>{r.capital.capital}
                    <span style={{ display: "block", fontSize: 12, fontWeight: 400, color: T.muted }}>{r.capital.country}</span>
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
