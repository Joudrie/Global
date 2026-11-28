import { useEffect, useRef, useState } from "react"
import type { SubFlag } from "../data/subdivisions"
import { shuffleWithRng } from "../utils/prng"
import { ADVANCE_MS, advanceTimer } from "../utils/autoAdvance"
import {
  ROULETTE_LIVES, STEP_LABEL, poolFlags, poolFromKey, poolKey, poolLabel, poolRegion, spinSteps, stepKinds,
} from "../utils/subdivisionQuiz"
import type { Pool, Step } from "../utils/subdivisionQuiz"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { FlagLoadFailed, MAX_FLAG_RETRIES, ResultCard, ResultHeader, ResultStats, PrimaryButton, SecondaryButton } from "./gameUi"
import { GamePoster } from "./GamePoster"
import { Choices, FlagFrame, PoolPicker, Reveal, Review, SUB_STYLES, readBests, readJson, writeJson } from "./subdivisionUi"

/* Province Roulette: where is this flag from? Pick where the spins come from
   (the whole world, a continent or one country). Each spin is a state or
   province flag, traced down from there: its continent, its country, then its
   name. A right answer moves on by itself; three misses end the run. The
   steps and choices are in utils/subdivisionQuiz.ts.

   Saved on this device: globalio_provinceroulette_prefs (the last pool picked)
   and globalio_provinceroulette_best ({ world: 14, europe: 9, US: 30 }, the
   most right answers in one run from each pool). */

interface Props { onBack: () => void; onSubLearned: (code: string) => void }

const A = ACCENT.learn
const PREFS_KEY = "globalio_provinceroulette_prefs"
const BEST_KEY = "globalio_provinceroulette_best"
const STEP_MS = 700 // a right answer, before the next step of the same flag

type Prefs = { region: string; pool: string | null }
const loadPrefs = (): Prefs => {
  const p = readJson<{ region?: unknown; pool?: unknown }>(PREFS_KEY, {})
  const pool = poolFromKey(p.pool)
  return { region: pool ? poolRegion(pool) : typeof p.region === "string" ? p.region : "world", pool: pool ? poolKey(pool) : null }
}

interface Spin { flag: SubFlag; marks: boolean[] }
interface Outcome { pool: Pool; spins: Spin[]; score: number; cleared: boolean; best: number; beat: boolean }

export default function ProvinceRouletteScreen({ onBack, onSubLearned }: Props) {
  const [prefs, setPrefs] = useState(loadPrefs)
  const [run, setRun] = useState<{ id: number; pool: Pool } | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const savePrefs = (p: Prefs) => { setPrefs(p); writeJson(PREFS_KEY, p) }
  const start = (pool: Pool) => {
    savePrefs({ region: poolRegion(pool), pool: poolKey(pool) })
    setOutcome(null)
    setRun(r => ({ id: (r?.id ?? 0) + 1, pool }))
    window.scrollTo({ top: 0 })
  }
  const finish = (pool: Pool, spins: Spin[], cleared: boolean) => {
    const score = spins.reduce((n, s) => n + s.marks.filter(Boolean).length, 0)
    const bests = readBests(BEST_KEY)
    const key = poolKey(pool)
    const prev = bests[key]
    if (prev === undefined || score > prev) writeJson(BEST_KEY, { ...bests, [key]: score })
    setOutcome({ pool, spins, score, cleared, best: Math.max(prev ?? 0, score), beat: prev !== undefined && score > prev })
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <style>{SUB_STYLES}</style>
      {!run && <Start prefs={prefs} onRegion={region => savePrefs({ ...prefs, region })} onPick={start} onBack={onBack} />}
      {run && !outcome && <Run key={run.id} pool={run.pool} onBack={onBack} onSubLearned={onSubLearned}
        onDone={(spins, cleared) => finish(run.pool, spins, cleared)} />}
      {run && outcome && <Result outcome={outcome} onBack={onBack} onAgain={() => start(run.pool)}
        onChange={() => { setRun(null); setOutcome(null); window.scrollTo({ top: 0 }) }} />}
    </div>
  )
}

/* ── Start: pick where the spins come from; a tap starts the run. ───────── */
function Start({ prefs, onRegion, onPick, onBack }:
  { prefs: Prefs; onRegion: (r: string) => void; onPick: (p: Pool) => void; onBack: () => void }) {
  const bests = readBests(BEST_KEY)
  const last = prefs.pool
  return (
    <>
      <ScreenHeader title="Province Roulette" onBack={onBack} />
      <main className="w-full mx-auto flex flex-col" style={{ maxWidth: 720, padding: "4px 16px 32px", gap: 20 }}>
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Wider than a phone, the banner's middle is all of Quebec's white
              cross bar: show the top, with the fleurs-de-lis, instead. */}
          <style>{`@media (min-width: 520px) { .pr-poster img { object-position: 50% 0%; } }`}</style>
          <div aria-hidden className="pr-poster" style={{ position: "relative", height: 112, borderRadius: 16, overflow: "hidden", border: `1px solid ${T.line}` }}>
            <GamePoster id="provinceroulette" accent={A} />
          </div>
          <div>
            <h2 className="geo-display" style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: T.text }}>Spin a flag, then say where it's from.</h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.5, color: T.muted }}>
              Each spin is the flag of a state or province. Name its continent, then its country, then the place itself.
              Three misses and the wheel stops.
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.5, color: T.muted }}>
              Spin a continent to skip straight to the country, or one country to name its flags.
            </p>
          </div>
        </section>
        <PoolPicker label="Spin from · tap to start" allowWorld region={prefs.region} onRegion={onRegion} onPick={onPick} accent={A}
          bestFor={p => {
            const b = bests[poolKey(p)]
            const tag = poolKey(p) === last ? "Last played" : null
            return b !== undefined ? `Best ${b}` : tag
          }} />
      </main>
    </>
  )
}

/* ── Misses left, as three marks that fill as they're used. ─────────────── */
function Lives({ used }: { used: number }) {
  return (
    <span role="img" aria-label={`${used} of ${ROULETTE_LIVES} misses`} style={{ display: "inline-flex", gap: 4, flexShrink: 0 }}>
      {Array.from({ length: ROULETTE_LIVES }, (_, i) => {
        const on = i < used
        return <span key={i} style={{ width: 20, height: 20, borderRadius: 6, background: on ? T.danger : "transparent", border: `1.5px solid ${on ? T.danger : T.line}` }} />
      })}
    </span>
  )
}

/* ── A run: spin after spin until three misses (or every flag is done). ─── */
function Run({ pool, onBack, onSubLearned, onDone }:
  { pool: Pool; onBack: () => void; onSubLearned: (code: string) => void; onDone: (spins: Spin[], cleared: boolean) => void }) {
  const [deck, setDeck] = useState<SubFlag[]>(() => shuffleWithRng(poolFlags(pool), Math.random))
  const [pos, setPos] = useState(0)
  const [steps, setSteps] = useState<Step[]>(() => spinSteps(pool, deck[0], Math.random))
  const [stepIdx, setStepIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [marks, setMarks] = useState<boolean[]>([])
  const [spins, setSpins] = useState<Spin[]>([])
  const [misses, setMisses] = useState(0)
  const [fails, setFails] = useState(0)
  // The answer waiting to move on; cleared the moment it does, so the timer
  // and the Next button can't both move it on.
  const pending = useRef(false)
  // A tap meant for Next can land on an answer as the next step appears.
  const readyAt = useRef(0)

  const flag = deck[pos]
  const step = steps[stepIdx]
  const answered = picked !== null
  const score = spins.reduce((n, s) => n + s.marks.filter(Boolean).length, 0) + marks.filter(Boolean).length
  const out = misses >= ROULETTE_LIVES
  const lastStep = stepIdx + 1 >= steps.length
  const kinds = stepKinds(pool)

  // Load the next flag while this one is answered.
  useEffect(() => {
    const n = deck[pos + 1]
    if (n) try { new Image().src = n.flagUrl } catch { /* not a browser */ }
  }, [deck, pos])

  const choose = (c: string) => {
    if (answered || performance.now() < readyAt.current) return
    const ok = c === step.answer
    setPicked(c)
    setMarks(m => [...m, ok])
    if (!ok) setMisses(n => n + 1)
    pending.current = true
  }

  const next = () => {
    if (!pending.current) return
    pending.current = false
    readyAt.current = performance.now() + 300
    if (!out && !lastStep) {
      setStepIdx(i => i + 1)
      setPicked(null)
      return
    }
    const done = [...spins, { flag, marks }]
    if (marks.length === steps.length && marks.every(Boolean)) onSubLearned(flag.code)
    if (out || pos + 1 >= deck.length) { onDone(done, !out); return }
    setSpins(done)
    setPos(pos + 1)
    setSteps(spinSteps(pool, deck[pos + 1], Math.random))
    setStepIdx(0)
    setPicked(null)
    setMarks([])
  }
  const nextRef = useRef(next)
  nextRef.current = next

  // A right answer moves on by itself; a wrong one waits for Next, so the
  // right answer can be read. Paused while the tab is hidden.
  const rightAnswer = answered && picked === step.answer
  useEffect(() => {
    if (!rightAnswer) return
    const t = advanceTimer(() => nextRef.current(), lastStep ? ADVANCE_MS.correct : STEP_MS)
    const onVisibility = () => (document.hidden ? t.pause() : t.resume())
    if (document.hidden) t.pause()
    document.addEventListener("visibilitychange", onVisibility)
    return () => { t.cancel(); document.removeEventListener("visibilitychange", onVisibility) }
  }, [rightAnswer, lastStep, pos, stepIdx])

  // A flag that won't load can't be answered: swap in another from the pool
  // (nothing is scored). Give up after MAX_FLAG_RETRIES in a row.
  const swapFlag = () => {
    const rest = deck.filter((_, i) => i !== pos)
    if (pos >= rest.length) { onDone(spins, false); return }
    setDeck(rest)
    setSteps(spinSteps(pool, rest[pos], Math.random))
    setStepIdx(0)
    setPicked(null)
    setMarks([])
  }
  const onFlagError = () => {
    if (marks.length > 0 || answered) return
    setFails(f => f + 1)
    swapFlag()
  }

  const nextLabel = out ? "See results" : !lastStep ? "Next" : pos + 1 >= deck.length ? "See results" : "Next spin"

  return (
    <>
      <ScreenHeader title="Province Roulette" subtitle={`${poolLabel(pool)} · ${score} right`} onBack={onBack}
        right={<Lives used={misses} />} />
      {fails >= MAX_FLAG_RETRIES ? (
        <div className="flex flex-col items-center px-4">
          <FlagLoadFailed onRetry={() => { setFails(0); swapFlag() }} onBack={onBack} accent={A} />
        </div>
      ) : (
        <div className="flex flex-col items-center px-4 pb-8" style={{ gap: 16 }}>
          <div className="w-full max-w-sm" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span className="geo-micro" style={{ fontSize: 11, color: T.muted }}>Spin {spins.length + 1}</span>
            {kinds.length > 1 && (
              <span style={{ display: "flex", gap: 4 }}>
                {kinds.map((k, i) => {
                  const m = marks[i]
                  const now = i === stepIdx
                  const color = m === undefined ? (now ? A : T.muted) : m ? T.green : T.danger
                  return (
                    <span key={k} style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: now ? 700 : 600, color,
                      background: m === undefined && !now ? "transparent" : tint(color, 0.1), border: `1px solid ${m === undefined && !now ? T.line : tint(color, 0.4)}` }}>
                      {STEP_LABEL[k]}
                    </span>
                  )
                })}
              </span>
            )}
          </div>
          <FlagFrame flag={flag} accent={A} onLoad={() => setFails(0)} onError={onFlagError} />
          {answered && (lastStep || out)
            ? <Reveal flag={flag} />
            : <div className="text-sm font-semibold" style={{ color: A, textAlign: "center" }}>{step.label}</div>}
          <Choices choices={step.choices} answer={step.answer} picked={picked} onPick={choose} columns={step.kind === "continent" ? 2 : 1} />
          {answered && (
            <PrimaryButton onClick={next} accent={out ? T.danger : A} style={{ maxWidth: 384 }}>{nextLabel}</PrimaryButton>
          )}
        </div>
      )}
    </>
  )
}

/* ── Result: the score, the best from this pool and every flag spun. ────── */
function Result({ outcome, onBack, onAgain, onChange }:
  { outcome: Outcome; onBack: () => void; onAgain: () => void; onChange: () => void }) {
  const { pool, spins, score, cleared, best, beat } = outcome
  const kinds = stepKinds(pool)
  return (
    <>
      <ScreenHeader title="Province Roulette" subtitle="Results" onBack={onBack} />
      <main className="w-full max-w-sm mx-auto flex flex-col" style={{ padding: "4px 16px 32px", gap: 12 }}>
        <ResultCard>
          <ResultHeader icon={cleared ? "trophy" : score >= 10 ? "target" : "compass"} accent={cleared ? T.gold : A}
            eyebrow={poolLabel(pool)}
            title={cleared ? `All ${spins.length} flags spun` : `${score} right`}
            score={cleared ? `${score} right, and never three misses.` : beat ? "A new best from here." : `Three misses after ${spins.length} ${spins.length === 1 ? "spin" : "spins"}.`} />
          <ResultStats stats={[
            { label: "Right", value: score, accent: A },
            { label: "Spins", value: spins.length },
            { label: "Best", value: best, accent: beat ? T.green : undefined },
          ]} />
        </ResultCard>
        <PrimaryButton onClick={onAgain} accent={A}>Spin again</PrimaryButton>
        <SecondaryButton onClick={onChange}>Spin somewhere else</SecondaryButton>
        <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        <div style={{ height: 8 }} />
        <Review title="This run" items={spins.map(s => ({ flag: s.flag, marks: s.marks.map((ok, i) => ({ label: STEP_LABEL[kinds[i]], ok })) }))} />
      </main>
    </>
  )
}
