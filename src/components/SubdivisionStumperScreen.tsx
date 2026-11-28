import { useState } from "react"
import type { SubFlag } from "../data/subdivisions"
import {
  NAMEABLE_COUNTRIES, PICK_CONTINENTS, WORLD, poolFromKey, poolKey, poolLabel, poolRegion,
  stumperBestKey, stumperFlags, stumperLength, stumperRound, stumperRounds,
} from "../utils/subdivisionQuiz"
import type { Pool, StumperMode, StumperRound } from "../utils/subdivisionQuiz"
import { T, ACCENT } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { FlagLoadFailed, MAX_FLAG_RETRIES, HeaderStat, ResultCard, ResultHeader, ResultDots, PrimaryButton, SecondaryButton } from "./gameUi"
import { GamePoster } from "./GamePoster"
import { Choices, FlagFrame, Micro, PoolPicker, Reveal, Review, SUB_STYLES, Segmented, readBests, readJson, writeJson } from "./subdivisionUi"

/* Subdivision Stumper: two ways to play, ten flags a game.
   - Whose is it? A state or province flag from anywhere; pick its country.
   - Name it. Pick a country or a continent, then name each flag. All four
     answers come from the flag's own country (Oregon, Florida, Texas,
     Massachusetts), so the spelling gives nothing away.
   The rounds and choices are in utils/subdivisionQuiz.ts.

   Saved on this device: globalio_substumper_prefs (the mode and continent
   last chosen) and globalio_substumper_best ({ whose: 8, "name-US": 10 }, the
   most right in one game per mode and pool). */

interface Props { onBack: () => void; onSubLearned: (code: string) => void }

const A = ACCENT.learn
const PREFS_KEY = "globalio_substumper_prefs"
const BEST_KEY = "globalio_substumper_best"
const DEFAULT_REGION = "north-america"

const MODES: { value: StumperMode; label: string }[] = [
  { value: "whose", label: "Whose is it?" },
  { value: "name", label: "Name it" },
]

type Prefs = { mode: StumperMode; region: string; pool: string | null }
const loadPrefs = (): Prefs => {
  const p = readJson<{ mode?: unknown; region?: unknown; pool?: unknown }>(PREFS_KEY, {})
  const pool = poolFromKey(p.pool)
  const region = pool && pool.kind !== "world" ? poolRegion(pool)
    : PICK_CONTINENTS.some(c => c.id === p.region) ? p.region as string : DEFAULT_REGION
  return { mode: p.mode === "name" ? "name" : "whose", region, pool: pool ? poolKey(pool) : null }
}

interface Game { id: number; mode: StumperMode; pool: Pool; rounds: StumperRound[] }
interface Outcome { rounds: StumperRound[]; results: boolean[]; best: number; beat: boolean }

export default function SubdivisionStumperScreen({ onBack, onSubLearned }: Props) {
  const [prefs, setPrefs] = useState(loadPrefs)
  const [game, setGame] = useState<Game | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const savePrefs = (p: Prefs) => { setPrefs(p); writeJson(PREFS_KEY, p) }
  const start = (mode: StumperMode, pool: Pool) => {
    if (mode === "name") savePrefs({ mode, region: poolRegion(pool), pool: poolKey(pool) })
    setOutcome(null)
    setGame(g => ({ id: (g?.id ?? 0) + 1, mode, pool, rounds: stumperRounds(mode, pool, Math.random) }))
    window.scrollTo({ top: 0 })
  }
  const finish = (g: Game, rounds: StumperRound[], results: boolean[]) => {
    const bests = readBests(BEST_KEY)
    const key = stumperBestKey(g.mode, g.pool)
    const prev = bests[key]
    const score = results.filter(Boolean).length
    if (prev === undefined || score > prev) writeJson(BEST_KEY, { ...bests, [key]: score })
    setOutcome({ rounds, results, best: Math.max(prev ?? 0, score), beat: prev !== undefined && score > prev })
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <style>{SUB_STYLES}</style>
      {!game && <Start prefs={prefs} onPrefs={p => savePrefs({ ...prefs, ...p })} onStart={start} onBack={onBack} />}
      {game && !outcome && <Play key={game.id} game={game} onBack={onBack} onSubLearned={onSubLearned} onDone={(rounds, r) => finish(game, rounds, r)} />}
      {game && outcome && <Result game={game} outcome={outcome} onBack={onBack}
        onAgain={() => start(game.mode, game.pool)} onChange={() => {
          // After "Whose is it?" the button reads "Other way to play": open on Name it.
          if (game.mode === "whose") savePrefs({ ...prefs, mode: "name" })
          setGame(null); setOutcome(null); window.scrollTo({ top: 0 })
        }} />}
    </div>
  )
}

const modeLine = (mode: StumperMode, pool: Pool) => mode === "whose" ? "Whose is it?" : `Name it · ${poolLabel(pool)}`

/* ── Start: the two ways to play. ───────────────────────────────────────── */
function Start({ prefs, onPrefs, onStart, onBack }:
  { prefs: Prefs; onPrefs: (p: Partial<Prefs>) => void; onStart: (m: StumperMode, p: Pool) => void; onBack: () => void }) {
  const bests = readBests(BEST_KEY)
  const whoseBest = bests[stumperBestKey("whose", WORLD)]
  return (
    <>
      <ScreenHeader title="Subdivision Stumper" onBack={onBack} />
      <main className="w-full mx-auto flex flex-col" style={{ maxWidth: 720, padding: "4px 16px 32px", gap: 20 }}>
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div aria-hidden style={{ position: "relative", height: 112, borderRadius: 16, overflow: "hidden", border: `1px solid ${T.line}` }}>
            <GamePoster id="substumper" accent={A} />
          </div>
          <h2 className="geo-display" style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: T.text }}>Two ways to play, ten flags a game.</h2>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Micro id="ss-mode">How to play</Micro>
          <Segmented labelId="ss-mode" options={MODES} value={prefs.mode} onChange={mode => onPrefs({ mode })} />
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: T.muted }}>
            {prefs.mode === "whose"
              ? "See the flag of a state or province from anywhere in the world, and pick the country it belongs to."
              : "Pick a country or a continent, then name each flag. All four answers come from the same country, like Oregon, Florida, Texas and Massachusetts, so you have to know the flag, not guess from the spelling."}
          </p>
        </section>

        {prefs.mode === "whose" ? (
          <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <PrimaryButton onClick={() => onStart("whose", WORLD)} accent={A}>Play ten flags</PrimaryButton>
            <p className="geo-mono" style={{ margin: 0, fontSize: 12, color: T.muted, textAlign: "center" }}>
              {whoseBest !== undefined ? `Best ${whoseBest} of 10` : "Best —"}
            </p>
          </section>
        ) : (
          <PoolPicker label="Name flags from · tap to start" allowWorld={false} region={prefs.region} onRegion={region => onPrefs({ region })}
            onPick={pool => onStart("name", pool)} accent={A}
            bestFor={p => {
              const b = bests[stumperBestKey("name", p)]
              return b !== undefined ? `Best ${b}/${stumperLength("name", p)}` : poolKey(p) === prefs.pool ? "Last played" : null
            }} />
        )}
        {prefs.mode === "name" && (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: T.muted }}>
            {NAMEABLE_COUNTRIES.length} countries have enough flags to name from four of their own. Flags with the name written on them, like Kansas, never come up to name.
          </p>
        )}
      </main>
    </>
  )
}

/* ── A game: ten rounds (fewer for a small country), one question each. ── */
function Play({ game, onBack, onSubLearned, onDone }:
  { game: Game; onBack: () => void; onSubLearned: (code: string) => void; onDone: (rounds: StumperRound[], results: boolean[]) => void }) {
  const [rounds, setRounds] = useState(game.rounds)
  const [fails, setFails] = useState(0)
  const [broken, setBroken] = useState<Set<string>>(() => new Set())
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [results, setResults] = useState<boolean[]>([])

  const round = rounds[idx]
  const answered = picked !== null
  const total = rounds.length

  const choose = (c: string) => {
    if (answered) return
    setPicked(c)
    const ok = c === round.answer
    if (ok) onSubLearned(round.target.code)
    setResults(r => [...r, ok])
  }

  // A flag that won't load makes the round unwinnable: swap in another flag
  // from the same pool (not counted as a guess). Give up after MAX_FLAG_RETRIES.
  const reroll = (failed?: string) => {
    const bad = new Set(broken)
    if (failed) bad.add(failed)
    setBroken(bad)
    const used = new Set(rounds.map(r => r.target.code))
    const flags = stumperFlags(game.mode, game.pool)
    const pool = flags.filter(s => !bad.has(s.code) && !used.has(s.code))
    const fresh: SubFlag[] = pool.length ? pool : flags.filter(s => s.code !== round.target.code)
    if (!fresh.length) return
    const target = fresh[Math.floor(Math.random() * fresh.length)]
    setRounds(rs => rs.map((r, i) => (i === idx ? stumperRound(game.mode, target, Math.random) : r)))
  }
  const onFlagError = () => {
    if (answered) return
    setFails(f => f + 1)
    reroll(round.target.code)
  }

  const next = () => {
    if (idx + 1 >= total) { onDone(rounds, results); return }
    setIdx(i => i + 1)
    setPicked(null)
  }

  return (
    <>
      <ScreenHeader title="Subdivision Stumper" subtitle={`${modeLine(game.mode, game.pool)} · ${results.filter(Boolean).length} right`} onBack={onBack}
        right={<HeaderStat accent={A}>{idx + 1} / {total}</HeaderStat>} />
      {fails >= MAX_FLAG_RETRIES ? (
        <div className="flex flex-col items-center px-4">
          <FlagLoadFailed onRetry={() => { setFails(0); reroll() }} onBack={onBack} accent={A} />
        </div>
      ) : (
        <div className="flex flex-col items-center px-4 pb-8" style={{ gap: 16 }}>
          <FlagFrame flag={round.target} accent={A} onLoad={() => setFails(0)} onError={onFlagError} />
          {answered
            ? <Reveal flag={round.target} />
            : <div className="text-sm font-semibold" style={{ color: A, textAlign: "center" }}>{round.label}</div>}
          <Choices choices={round.choices} answer={round.answer} picked={picked} onPick={choose} />
          {answered && (
            <PrimaryButton onClick={next} accent={A} style={{ maxWidth: 384 }}>
              {idx + 1 >= total ? "See results" : "Next"}
            </PrimaryButton>
          )}
        </div>
      )}
    </>
  )
}

/* ── Result: the score, the best for this mode and every flag shown. ────── */
function Result({ game, outcome, onBack, onAgain, onChange }:
  { game: Game; outcome: Outcome; onBack: () => void; onAgain: () => void; onChange: () => void }) {
  const { rounds, results, best, beat } = outcome
  const total = results.length
  const correct = results.filter(Boolean).length
  const verb = game.mode === "whose" ? "placed" : "named"
  return (
    <>
      <ScreenHeader title="Subdivision Stumper" subtitle="Results" onBack={onBack} />
      <main className="w-full max-w-sm mx-auto flex flex-col" style={{ padding: "4px 16px 32px", gap: 12 }}>
        <ResultCard>
          <ResultHeader icon={correct >= total * 0.8 ? "map" : correct >= total * 0.5 ? "pin" : "compass"} accent={correct === total ? T.gold : T.green}
            eyebrow={modeLine(game.mode, game.pool)}
            title={`${correct} of ${total} ${verb}`}
            score={beat ? "A new best." : `Best ${best} of ${total}`} />
          <ResultDots results={results} />
        </ResultCard>
        <PrimaryButton onClick={onAgain} accent={A}>Play again</PrimaryButton>
        <SecondaryButton onClick={onChange}>{game.mode === "whose" ? "Other way to play" : "Pick somewhere else"}</SecondaryButton>
        <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        <div style={{ height: 8 }} />
        <Review title="This game" items={rounds.slice(0, total).map((r, i) => ({ flag: r.target, marks: [{ label: game.mode === "whose" ? "Country" : "Name", ok: results[i] }] }))} />
      </main>
    </>
  )
}
