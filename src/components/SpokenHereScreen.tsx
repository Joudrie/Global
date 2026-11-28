import { useEffect, useId, useMemo, useRef, useState } from "react"
import type { CSSProperties, FormEvent } from "react"
import { flushSync } from "react-dom"
import { Check, ExternalLink, Lightbulb, X } from "lucide-react"
import { STRIKES, TARGET, TIERS, gameState, roundPoints } from "../utils/abroad"
import type { AnswerMode, GameState, Tier } from "../utils/abroad"
import { VALUE, ageLine, countryOf, fineprint, judgeTyped, lookalikes, measureLine, pickChoices, pickRounds, sliceColors, viewFor } from "../utils/spokenHere"
import type { PieView } from "../utils/spokenHere"
import { LANGUAGE_GROUPS } from "../data/languageShares"
import type { LanguageShare, LanguageSlice } from "../data/languageShares"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { didYouMean, matchNames, pickOnEnter } from "../utils/pickOnEnter"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { DidYouMean, PrimaryButton, ResultCard, ResultDots, ResultHeader, SecondaryButton } from "./gameUi"
import { ABROAD_STYLES, Segmented, Strikes } from "./AbroadScreen"
import { GamePoster } from "./GamePoster"
import FlagImage from "./FlagImage"

/* Spoken Here: one country's languages as a pie, from its latest census or
   survey (the year and the question are under it), and the player names the
   country: pick from four, or type it for double points. Easy and medium name
   the languages; hard shows only their families. Ten right before three
   strikes wins, as in the Abroad games, whose start screen, strikes and
   switches this one shares (AbroadScreen). After each answer: the flag, every
   language the source names, and the source with its year.

   Logic and data: utils/spokenHere.ts, data/languageShares.ts (built by
   scripts/languagepie/build.mjs). */

const ID = "spoken"
const ACC = ACCENT.codex
const PRESS_MS = 240

const TIER_META: Record<Tier, { label: string; color: string; sample: string }> = {
  easy:   { label: "Easy",   color: T.green,  sample: "Czech 95%" },
  medium: { label: "Medium", color: T.gold,   sample: "German 90%" },
  hard:   { label: "Hard",   color: T.danger, sample: "Families only" },
}
const MODE_LABEL: Record<AnswerMode, string> = { type: "Type it", choice: "4 choices" }
const REGION_IN: Record<FlagRecord["region"], string> = {
  Europe: "in Europe", Africa: "in Africa", Asia: "in Asia", Americas: "in the Americas", Oceania: "in Oceania", "Middle East": "in the Middle East",
}

const read = <V,>(key: string, fallback: V): V => { try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback } catch { return fallback } }
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* not saved */ } }
const PREFS_KEY = "globalio_spoken_prefs"
const BEST_KEY = "globalio_spoken_best"
type Prefs = { mode: AnswerMode; tier: Tier | null }
const loadPrefs = (): Prefs => {
  const p = read<{ mode?: unknown; tier?: unknown }>(PREFS_KEY, {})
  return { mode: p.mode === "type" ? "type" : "choice", tier: TIERS.includes(p.tier as Tier) ? p.tier as Tier : null }
}
const bestKey = (tier: Tier, mode: AnswerMode) => `${tier}-${mode}`
const loadBest = (): Record<string, number> => {
  const b = read<Record<string, unknown>>(BEST_KEY, {})
  return Object.fromEntries(Object.entries(b).filter(([, v]) => typeof v === "number")) as Record<string, number>
}

const srOnly: CSSProperties = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }
const pctText = (n: number) => `${n % 1 === 0 ? n : n.toFixed(1)}%`

interface Round { share: LanguageShare; choices: string[] }
interface Answer { correct: boolean; lookalike: boolean; hinted: boolean; given: string; givenCode: string | null; points: number }
interface Game { id: number; tier: Tier; mode: AnswerMode; rounds: Round[] }
interface Outcome { answers: Answer[]; state: GameState; best: number; beat: boolean }
const scoreOf = (answers: Answer[]) => answers.reduce((s, a) => s + a.points, 0)

const STYLES = `
  .sh-row { transition: background-color 150ms ease-out; }
  .sh-slice { transition: opacity 150ms ease-out; }
  .sh-drop button:hover, .sh-drop button:focus-visible { background: ${T.surfaceHi}; }
  .sh-link:focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 2px; border-radius: 4px; }
  @media (prefers-reduced-motion: reduce) { .sh-row, .sh-slice { transition: none; } }
`

interface Props { onBack: () => void; onFinish?: () => void }

export default function SpokenHereScreen({ onBack, onFinish }: Props) {
  const [prefs, setPrefs] = useState(loadPrefs)
  const [run, setRun] = useState<Game | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const begin = (tier: Tier, mode: AnswerMode) => {
    setOutcome(null)
    const view = viewFor(tier)
    const rounds = pickRounds(tier, Math.random).map(share => ({ share, choices: pickChoices(share, view, Math.random) }))
    setRun(g => ({ id: (g?.id ?? 0) + 1, tier, mode, rounds }))
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
    const score = scoreOf(answers)
    if (prev === undefined || score > prev) write(BEST_KEY, { ...all, [key]: score })
    setOutcome({ answers, state: gameState(answers), best: Math.max(prev ?? 0, score), beat: prev !== undefined && score > prev })
    onFinish?.()
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <style>{ABROAD_STYLES}{STYLES}</style>
      {!run && <Start prefs={prefs} onMode={mode => choose({ mode })} onBack={onBack}
        onStart={tier => { choose({ tier }); begin(tier, prefs.mode) }} />}
      {run && !outcome && <Play key={run.id} game={run} onBack={onBack} onDone={a => finish(run, a)} />}
      {run && outcome && <Result game={run} outcome={outcome} onBack={onBack}
        onAgain={() => begin(run.tier, run.mode)} onChange={() => { setRun(null); setOutcome(null) }} />}
    </div>
  )
}

/* ── Start: how to answer, then one tap on a difficulty starts the game. ── */
function Start({ prefs, onMode, onStart, onBack }: { prefs: Prefs; onMode: (m: AnswerMode) => void; onStart: (t: Tier) => void; onBack: () => void }) {
  const [pressed, setPressed] = useState<Tier | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
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
      <ScreenHeader title="Spoken Here" onBack={onBack} />
      <main className="w-full mx-auto flex flex-col" style={{ maxWidth: 720, padding: "4px 16px 32px", gap: 20 }}>
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div aria-hidden style={{ position: "relative", height: 112, borderRadius: 16, overflow: "hidden", border: `1px solid ${T.line}` }}>
            <GamePoster id={ID} accent={ACC} variant="hero" />
          </div>
          <div>
            <h2 className="geo-display" style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: T.text }}>Name the country from the languages it speaks.</h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.5, color: T.muted }}>
              Each pie is one country's languages, from its latest census or survey, and says what year it's from. Easy and medium name the languages; hard shows only their families.
            </p>
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Segmented id="sh-mode" label="Answer" value={prefs.mode} onChange={m => onMode(m as AnswerMode)} disabled={!!pressed}
            options={(["choice", "type"] as AnswerMode[]).map(m => ({ id: m, label: MODE_LABEL[m] }))} />
          <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Typing scores double. Ten right before three strikes wins.</p>
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
                    aria-label={`Start ${m.label}${t === "hard" ? ", only the families are shown" : ""}${last ? ", last played" : ""}${b !== undefined ? `, best ${b}` : ""}`}
                    className="ca-tap ca-tier"
                    style={{ minHeight: 96, padding: "12px 8px", borderRadius: 12, cursor: pressed ? "default" : "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, textAlign: "center",
                      background: on ? m.color : T.surface, border: `1px solid ${on ? m.color : T.line}`, color: on ? T.onAccent : T.text }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: on ? T.onAccent : m.color }} />
                      <span className="geo-display" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.1 }}>{m.label}</span>
                    </span>
                    <span style={{ fontSize: 13, color: on ? T.onAccent : T.muted, fontFamily: FONT.display }}>{m.sample}</span>
                    <span className="geo-mono" style={{ fontSize: 12, color: on ? T.onAccent : T.dim }}>{b !== undefined ? `Best ${b}` : "Best —"}</span>
                  </button>
                  <span aria-hidden className="geo-micro" style={{ fontSize: 10, textAlign: "center", color: last ? T.muted : "transparent" }}>Last played</span>
                </div>
              )
            })}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Hard: only the families are shown.</p>
        </section>
        <input ref={keyProxy} aria-hidden tabIndex={-1} autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck={false}
          style={{ position: "fixed", top: 0, left: 0, width: 1, height: 1, padding: 0, border: 0, opacity: 0, fontSize: 16, pointerEvents: "none" }} />
      </main>
    </>
  )
}

/* ── The pie: a donut, its slices in the legend's order from twelve o'clock.
   Slices of one family share a hue; every slice of 8% or more carries its
   share, and the legend beside it is real text (name or family, share), so
   nothing rests on colour. Pointing at a slice or a row picks out both. ── */
export function LanguagePie({ share, view, size = 200, revealNames = false }:
  { share: LanguageShare; view: PieView; size?: number; revealNames?: boolean }) {
  const [active, setActive] = useState<number | null>(null)
  const stripes = `sh-two-${useId().replace(/[^a-z0-9]/gi, "")}`
  const slices = share.slices
  const colors = useMemo(() => sliceColors(slices), [slices])
  const showNames = view === "names" || revealNames
  const total = slices.reduce((a, s) => a + s.pct, 0)
  const R = 96, r = 56, C = 100
  let at = 0
  const arcs = slices.map((s, i) => {
    const a0 = (at / total) * Math.PI * 2, a1 = ((at + s.pct) / total) * Math.PI * 2
    at += s.pct
    const mid = (a0 + a1) / 2
    return { s, i, a0, a1, mid }
  })
  const pt = (rad: number, a: number) => [C + rad * Math.sin(a), C - rad * Math.cos(a)]
  const path = (a0: number, a1: number) => {
    if (a1 - a0 >= Math.PI * 2 - 1e-6) a1 = a0 + Math.PI * 2 - 1e-4
    const big = a1 - a0 > Math.PI ? 1 : 0
    const [x0, y0] = pt(R, a0), [x1, y1] = pt(R, a1), [x2, y2] = pt(r, a1), [x3, y3] = pt(r, a0)
    return `M${x0} ${y0}A${R} ${R} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 ${big} 0 ${x3} ${y3}Z`
  }
  const label = (s: LanguageSlice) => (showNames ? s.name : s.family)
  const summary = slices.map(s => `${label(s)} ${pctText(s.pct)}`).join(", ")
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`Pie chart: ${summary}`} style={{ flexShrink: 0, maxWidth: "100%" }}>
        {/* "Two languages" slices are striped: people who use both. */}
        <defs>
          <pattern id={stripes} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill={LANGUAGE_GROUPS.two.color} />
            <rect width="3" height="8" fill="#8A7A60" />
          </pattern>
        </defs>
        {arcs.map(({ s, i, a0, a1, mid }) => {
          const [lx, ly] = pt((R + r) / 2, mid)
          const dim = active !== null && active !== i
          return (
            <g key={i} className="sh-slice" style={{ opacity: dim ? 0.4 : 1 }} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)}>
              <path d={path(a0, a1)} fill={colors[i].striped ? `url(#${stripes})` : colors[i].fill} stroke={T.surface} strokeWidth={2} strokeLinejoin="round" />
              {s.pct / total >= 0.08 && (
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill={colors[i].ink}
                  style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 13, fontVariantNumeric: "tabular-nums", pointerEvents: "none" }}>
                  {Math.round(s.pct)}%
                </text>
              )}
            </g>
          )
        })}
        <text x={C} y={C - 6} textAnchor="middle" dominantBaseline="central" fill={T.text} style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 24 }}>{share.year}</text>
        <text x={C} y={C + 16} textAnchor="middle" dominantBaseline="central" fill={T.muted} style={{ fontFamily: FONT.mono, fontSize: 11 }}>
          {share.kind === "register" ? "register" : share.kind}
        </text>
      </svg>
      <ol aria-label={showNames ? "Languages" : "Language families"} style={{ listStyle: "none", margin: 0, padding: 0, flex: "1 1 220px", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {slices.map((s, i) => (
          <li key={i} className="sh-row" onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", borderRadius: 8, background: active === i ? T.surfaceHi : "transparent" }}>
            <span aria-hidden style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, border: `1px solid ${tint(T.text, 0.15)}`,
              background: colors[i].striped ? `repeating-linear-gradient(45deg, ${LANGUAGE_GROUPS.two.color} 0 3px, #8A7A60 3px 6px)` : colors[i].fill }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: T.text, overflowWrap: "anywhere", lineHeight: 1.25 }}>
                {showNames ? s.name : s.group === "other" ? "Other" : s.family.split(" · ")[0]}
              </span>
              {s.group !== "other" && (
                <span style={{ display: "block", fontSize: 12, color: T.muted, lineHeight: 1.3 }}>
                  {s.group === "two" ? "People who use both" : showNames ? s.family : s.family.split(" · ")[1] ?? (s.group === "isolate" ? "No known relatives" : "Language family")}
                </span>
              )}
            </span>
            <span style={{ flexShrink: 0, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 15, color: T.text }}>{pctText(s.pct)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ── A game: rounds until ten right or three strikes, then the result. ──── */
function Play({ game, onBack, onDone }: { game: Game; onBack: () => void; onDone: (a: Answer[]) => void }) {
  const { tier, mode, rounds } = game
  const view = viewFor(tier)
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [typed, setTyped] = useState("")
  const [hinted, setHinted] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [drop, setDrop] = useState(false)
  const [maybe, setMaybe] = useState<FlagRecord[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const nextWrap = useRef<HTMLDivElement>(null)
  const locked = useRef(false)

  const round = rounds[idx]
  const share = round.share
  const country = countryOf(share.code)
  const answer = answers[idx] as Answer | undefined
  const answered = !!answer
  const score = scoreOf(answers)
  const right = answers.filter(a => a.correct).length
  const strikes = answers.length - right
  const state = gameState(answers)
  const over = state !== "playing" || idx + 1 >= rounds.length
  const m = TIER_META[tier]
  const worth = roundPoints(VALUE[tier], mode, true, hinted)
  const matches = useMemo(() => (typed.trim().length >= 2 ? matchNames(FLAGS, typed, 6) : []), [typed])

  useEffect(() => { if (mode === "type" && !answered) inputRef.current?.focus({ preventScroll: true }) }, [idx, mode, answered])
  useEffect(() => { if (answered) nextWrap.current?.querySelector("button")?.focus({ preventScroll: true }) }, [answered])

  const submit = (given: string, givenCode: string | null, correct: boolean, lookalike: boolean) => {
    if (answered || locked.current) return
    locked.current = true
    setDrop(false); setMaybe([])
    setAnswers(a => [...a, { correct, lookalike, hinted, given, givenCode, points: roundPoints(VALUE[tier], mode, correct, hinted) }])
  }
  const submitCountry = (c: FlagRecord) => {
    const j = judgeTyped(c.name, share, view)
    submit(c.name, c.code, j.correct, j.lookalike)
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (answered || !typed.trim()) return
    const pick = pickOnEnter(matches.length ? matches : matchNames(FLAGS, typed, 6), typed)
    if (pick) { submitCountry(pick); return }
    setMaybe(didYouMean(FLAGS, typed))
    setDrop(false)
  }
  const pick = (code: string) => {
    if (answered || locked.current) return
    setPicked(code)
    submit(countryOf(code).name, code, code === share.code, false)
  }
  const next = () => {
    if (!answered) return
    if (over) { onDone(answers); return }
    locked.current = false
    flushSync(() => { setIdx(i => i + 1); setTyped(""); setHinted(false); setPicked(null); setMaybe([]) })
    if (mode === "type") inputRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }

  // 1–4 pick a choice from the keyboard.
  useEffect(() => {
    if (mode !== "choice" || answered) return
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= 4 && !e.metaKey && !e.ctrlKey && !e.altKey) pick(round.choices[n - 1])
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const twin = answer?.lookalike && answer.givenCode ? countryOf(answer.givenCode).name : null
  const verdict = !answer ? "" : answer.correct
    ? (twin ? `Right · +${answer.points}. It's ${country.name}, but ${twin}'s pie looks the same.` : `Right · +${answer.points}`)
    : `It's ${country.name}`
  const strikeLine = answer && !answer.correct ? (strikes >= STRIKES ? "Third strike: game over." : `Strike ${strikes} of ${STRIKES}.`) : ""
  const hint = `It's ${REGION_IN[country.region]}.`
  const spoken = share.slices.map(s => `${view === "names" ? s.name : s.family} ${pctText(s.pct)}`).join(", ")

  return (
    <>
      <ScreenHeader title="Spoken Here" subtitle={`${m.label} · ${right}/${TARGET} right · ${score} pts`} onBack={onBack} right={<Strikes used={strikes} />} />
      <div role="progressbar" aria-label="Right answers" aria-valuemin={0} aria-valuemax={TARGET} aria-valuenow={right} aria-valuetext={`${right} of ${TARGET} right`}
        style={{ margin: "0 16px", height: 4, borderRadius: 999, background: T.line, overflow: "hidden" }}>
        <div className="ca-bar" style={{ height: "100%", width: `${(right / TARGET) * 100}%`, background: m.color }} />
      </div>
      <div aria-live="polite" style={srOnly}>
        {answer ? `${verdict}. ${strikeLine}` : `Which country? ${spoken}. ${measureLine(share)}. Worth ${worth} points.`}
      </div>

      <main className="w-full mx-auto flex flex-col" style={{ maxWidth: 720, padding: "12px 16px 32px", gap: 12 }}>
        <section key={idx} className="ca-in" aria-label="The country's languages"
          style={{ padding: 16, borderRadius: 16, background: T.surface, border: `1px solid ${T.line}`, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <span className="geo-micro" style={{ fontSize: 11, color: T.muted }}>{view === "names" ? "Which country speaks this?" : "Which country? Families only"}</span>
            <span className="geo-mono" aria-hidden style={{ flexShrink: 0, fontSize: 12, color: T.muted, fontVariantNumeric: "tabular-nums" }}>{answered ? "" : `${worth} pts`}</span>
          </div>
          <LanguagePie share={share} view={view} revealNames={answered} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, borderTop: `1px solid ${T.line}`, paddingTop: 8 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>{measureLine(share)}</p>
            {ageLine(share) && <p style={{ margin: 0, fontSize: 13, color: T.muted }}>{ageLine(share)}</p>}
            {fineprint(share).map(f => <p key={f} style={{ margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.4 }}>{f}</p>)}
          </div>
          {hinted && !answered && <p className="ca-fade" style={{ margin: 0, fontSize: 14, color: ACC, fontWeight: 600 }}>{hint}</p>}
        </section>

        {mode === "type" ? (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="sh-guess" style={srOnly}>Your answer: a country</label>
            <div style={{ position: "relative" }}>
              <input id="sh-guess" ref={inputRef} className="ca-input" value={answered ? answer.given : typed} readOnly={answered}
                onChange={e => { setTyped(e.target.value); setDrop(true); setMaybe([]) }}
                onFocus={() => setDrop(true)} onBlur={() => setTimeout(() => setDrop(false), 150)}
                onKeyDown={e => { if (e.key === "Escape") { setTyped(""); setDrop(false); setMaybe([]) } }}
                placeholder="Type a country" autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck={false} enterKeyHint="go"
                aria-invalid={answered && !answer.correct ? true : undefined} aria-autocomplete="list" aria-controls="sh-drop"
                style={{ width: "100%", height: 52, padding: "0 16px", borderRadius: 12, fontSize: 17, fontWeight: 600, color: T.text, background: T.surface,
                  border: `1.5px solid ${answered ? (answer.correct ? T.green : T.danger) : T.line}` }} />
              {!answered && drop && matches.length > 0 && (
                <div id="sh-drop" className="sh-drop" role="listbox" aria-label="Countries"
                  style={{ position: "absolute", left: 0, right: 0, top: "100%", marginTop: 4, zIndex: 10, borderRadius: 12, overflow: "hidden",
                    background: T.surface, border: `1px solid ${T.line}`, boxShadow: `0 8px 24px -8px ${tint(T.text, 0.35)}` }}>
                  {matches.map(c => (
                    <button key={c.code} type="button" role="option" aria-selected={false} onMouseDown={e => e.preventDefault()} onClick={() => submitCountry(c)}
                      style={{ display: "block", width: "100%", textAlign: "left", minHeight: 44, padding: "0 16px", fontSize: 15, fontWeight: 600, color: T.text,
                        background: "transparent", border: "none", borderBottom: `1px solid ${T.line}`, cursor: "pointer" }}>
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <DidYouMean options={maybe} onPick={submitCountry} accent={ACC} style={{ marginTop: 0 }} />
            {!answered && (
              <div style={{ display: "flex", gap: 8 }}>
                <HintButton used={hinted} onClick={() => { setHinted(true); inputRef.current?.focus({ preventScroll: true }) }} />
                <PrimaryButton type="submit" accent={ACC} disabled={!typed.trim()} style={{ flex: 1, width: "auto" }}>Check</PrimaryButton>
              </div>
            )}
          </form>
        ) : (
          <>
            <div role="group" aria-label="Choose the country" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {round.choices.map((code, i) => {
                const c = countryOf(code)
                const isRight = code === share.code
                const look = !answered ? "idle" : isRight ? "right" : picked === code ? "wrong" : "off"
                const color = look === "right" ? T.green : look === "wrong" ? T.danger : null
                return (
                  <button key={code} type="button" disabled={answered} onClick={() => pick(code)}
                    aria-label={`${c.name}${look === "right" ? ", the answer" : look === "wrong" ? ", your answer" : ""}`} aria-keyshortcuts={String(i + 1)}
                    className="ca-tap ca-choice"
                    style={{ minHeight: 56, padding: "8px 12px", borderRadius: 12, fontWeight: 600, lineHeight: 1.25, fontSize: c.name.length > 22 ? 14 : 15,
                      cursor: answered ? "default" : "pointer", textAlign: "center", overflowWrap: "anywhere",
                      background: color ? tint(color, 0.12) : T.surface, border: `1.5px solid ${color ?? T.line}`, color: color ?? (look === "off" ? T.muted : T.text) }}>
                    {c.name}
                  </button>
                )
              })}
            </div>
            {!answered && <HintButton used={hinted} onClick={() => setHinted(true)} wide />}
          </>
        )}

        {answer && (
          <div className="ca-fade" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Reveal share={share} answer={answer} verdict={verdict} strikeLine={strikeLine} view={view} />
            <div ref={nextWrap}>
              <PrimaryButton accent={ACC} onClick={next}>{over ? "See results" : "Next"}</PrimaryButton>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

/* ── After an answer: the verdict, the flag, every language the source
   names (small ones too), and the source with its year. ────────────────── */
function Reveal({ share, answer, verdict, strikeLine, view }:
  { share: LanguageShare; answer: Answer; verdict: string; strikeLine: string; view: PieView }) {
  const country = countryOf(share.code)
  const ok = answer.correct
  const twins = lookalikes(share, view).map(c => countryOf(c).name)
  return (
    <div style={{ padding: 16, borderRadius: 12, background: T.surface, border: `1px solid ${tint(ok ? T.green : T.danger, 0.45)}`, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span aria-hidden style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center",
          background: tint(ok ? T.green : T.danger, 0.14), color: ok ? T.green : T.danger }}>
          {ok ? <Check size={16} strokeWidth={2.4} /> : <X size={16} strokeWidth={2.4} />}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: ok ? T.green : T.danger }}>{verdict}</div>
          {strikeLine && <div style={{ marginTop: 2, fontSize: 13, fontWeight: 600, color: T.muted }}>{strikeLine}</div>}
          {!ok && answer.givenCode && <div style={{ marginTop: 2, fontSize: 13, color: T.muted }}>You said {countryOf(answer.givenCode).name}.</div>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <FlagImage code={share.code} alt={`Flag of ${country.name}`}
          style={{ width: 72, height: 48, objectFit: "contain", borderRadius: 6, background: T.surfaceHi, border: `1px solid ${T.line}`, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div className="geo-display" style={{ fontSize: 20, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{country.name}</div>
          <div style={{ fontSize: 13, color: T.muted }}>{measureLine(share)}</div>
        </div>
      </div>
      {twins.length > 0 && <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.45 }}>Looks the same as {twins.join(" and ")}, so typing {twins.length > 1 ? "those" : "that"} counts too.</p>}
      <div>
        <div className="geo-micro" style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Every language counted</div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {share.full.map((s, i) => (
            <li key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "4px 0", borderTop: i ? `1px solid ${T.line}` : "none" }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{s.name}</span>
                {s.group !== "other" && s.group !== "two" && <span style={{ fontSize: 12, color: T.muted }}> · {s.family}</span>}
              </span>
              <span style={{ flexShrink: 0, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontSize: 14, color: T.text }}>{pctText(s.pct)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 2 }}>
        {share.note && <p style={{ margin: 0, color: T.text }}>{share.note}</p>}
        <p style={{ margin: 0 }}>
          Source: <a className="sh-link" href={share.url} target="_blank" rel="noopener noreferrer" style={{ color: T.text, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 2 }}>
            {share.source}<ExternalLink size={12} strokeWidth={2} aria-hidden style={{ display: "inline", marginLeft: 4, verticalAlign: "-1px" }} />
          </a>{" "}({share.year}{ageLine(share) ? `, ${new Date().getFullYear() - share.year} years ago` : ""}).
        </p>
        {share.checks.length > 0 && <p style={{ margin: 0 }}>Matches {share.checks.join(" and ")}.</p>}
      </div>
    </div>
  )
}

function HintButton({ used, onClick, wide = false }: { used: boolean; onClick: () => void; wide?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={used} className="ca-tap ca-hint"
      aria-label={used ? "Hint used" : "Hint: where it is, for half points"}
      style={{ height: 52, padding: "0 16px", borderRadius: 12, flexShrink: 0, width: wide ? "100%" : "auto",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 14, fontWeight: 600,
        background: used ? T.surfaceHi : T.surface, border: `1px solid ${used ? T.line : tint(ACC, 0.4)}`, color: used ? T.dim : ACC,
        cursor: used ? "default" : "pointer" }}>
      <Lightbulb size={16} strokeWidth={1.8} aria-hidden /> {used ? "Hint used" : "Where? · half points"}
    </button>
  )
}

/* ── Result: won or out, the score, and every country played. ──────────── */
function Result({ game, outcome, onBack, onAgain, onChange }:
  { game: Game; outcome: Outcome; onBack: () => void; onAgain: () => void; onChange: () => void }) {
  const { tier, mode, rounds } = game
  const { answers, state, best, beat } = outcome
  const score = scoreOf(answers)
  const right = answers.filter(a => a.correct).length
  const strikes = answers.length - right
  const won = state === "won"
  const played = rounds.slice(0, answers.length)
  return (
    <>
      <ScreenHeader title="Spoken Here" subtitle={`Results · ${TIER_META[tier].label} · ${MODE_LABEL[mode]}`} onBack={onBack} />
      <main className="w-full mx-auto flex flex-col" style={{ maxWidth: 720, padding: "4px 16px 32px", gap: 12 }}>
        <ResultCard>
          <ResultHeader icon={won ? "trophy" : "x"} accent={won ? T.gold : T.danger}
            eyebrow={beat ? "New best" : won ? "Ten right" : strikes >= STRIKES ? "Three strikes" : "Out of countries"}
            title={won ? `You made it: ${score} points` : `Out with ${right} right`}
            score={won ? `${strikes === 0 ? "No strikes" : `${strikes} ${strikes === 1 ? "strike" : "strikes"}`} · best ${best}` : `${score} points · best ${best}`} />
          <ResultDots results={answers.map(a => a.correct)} />
        </ResultCard>
        <section aria-labelledby="sh-played" style={{ borderRadius: 16, background: T.surface, border: `1px solid ${T.line}`, padding: "16px 16px 8px" }}>
          <h3 id="sh-played" className="geo-micro" style={{ margin: "0 0 4px", fontSize: 11, color: T.muted }}>You played</h3>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {played.map((r, i) => {
              const a = answers[i]
              const c = countryOf(r.share.code)
              return (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? `1px solid ${T.line}` : "none" }}>
                  <span style={{ flexShrink: 0, display: "flex", color: a.correct ? T.green : T.danger }}>
                    {a.correct ? <Check size={16} strokeWidth={2.4} aria-hidden /> : <X size={16} strokeWidth={2.4} aria-hidden />}
                    <span style={srOnly}>{a.correct ? "Right:" : "Missed:"}</span>
                  </span>
                  <FlagImage code={c.code} alt="" style={{ width: 36, height: 24, objectFit: "contain", flexShrink: 0, borderRadius: 3, background: T.surfaceHi }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="geo-display" style={{ display: "block", fontSize: 16, fontWeight: 700, color: T.text }}>{c.name}</span>
                    <span style={{ display: "block", fontSize: 12, color: T.muted, marginTop: 2 }}>
                      {r.share.slices.filter(s => s.group !== "other").slice(0, 3).map(s => `${s.name} ${pctText(s.pct)}`).join(" · ")} · {r.share.year}
                    </span>
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
