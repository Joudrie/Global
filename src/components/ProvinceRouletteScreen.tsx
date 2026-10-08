import { useState } from "react"
import { SUB_FLAGS, SUB_CONTINENTS } from "../data/subdivisions"
import type { SubFlag } from "../data/subdivisions"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { FlagLoadFailed, MAX_FLAG_RETRIES, HeaderStat, ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"

interface Props { onBack: () => void; onSubLearned: (code: string) => void }

const A = ACCENT.learn

function shuffle<X>(a: X[]): X[] { return [...a].sort(() => Math.random() - 0.5) }
function pick<X>(a: X[]): X { return a[Math.floor(Math.random() * a.length)] }

interface Step { label: string; choices: string[]; answer: string }

// Always returns exactly 4 distinct options: the answer + 3 distractors,
// preferring `primary`, then backfilling from `fallback` so it's never short.
function fourChoices(answer: string, primary: string[], fallback: string[]): string[] {
  const seen = new Set<string>([answer])
  const out = [answer]
  for (const list of [primary, fallback]) {
    for (const x of shuffle(list)) {
      if (out.length >= 4) break
      if (!seen.has(x)) { seen.add(x); out.push(x) }
    }
  }
  return shuffle(out)
}

const ALL_COUNTRIES = Array.from(new Set(SUB_FLAGS.map(s => s.countryName)))
const ALL_REGIONS = Array.from(new Set(SUB_FLAGS.map(s => s.name)))

function buildSteps(target: SubFlag): Step[] {
  const sameContCountries = SUB_FLAGS
    .filter(s => s.continent === target.continent && s.countryName !== target.countryName)
    .map(s => s.countryName)
  const sameCountryRegions = SUB_FLAGS
    .filter(s => s.countryCode === target.countryCode && s.name !== target.name)
    .map(s => s.name)

  return [
    { label: "Which continent?", choices: shuffle(SUB_CONTINENTS.map(c => c.name)), answer: target.continent },
    { label: "Which country?", choices: fourChoices(target.countryName, sameContCountries, ALL_COUNTRIES), answer: target.countryName },
    { label: "Which subdivision?", choices: fourChoices(target.name, sameCountryRegions, ALL_REGIONS), answer: target.name },
  ]
}

function ProvinceRouletteScreenGame({ onBack, onSubLearned , onReplay }: Props & { onReplay: () => void }) {
  const [target, setTarget] = useState<SubFlag>(() => pick(SUB_FLAGS))
  const [steps, setSteps] = useState<Step[]>(() => buildSteps(target))
  const [fails, setFails] = useState(0)
  const [broken, setBroken] = useState<Set<string>>(() => new Set())
  const [stepIdx, setStepIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [done, setDone] = useState(false)

  const step = steps[stepIdx]
  const answered = picked !== null

  const choose = (c: string) => {
    if (answered) return
    setPicked(c)
    setResults(r => [...r, c === step.answer])
  }

  // A flag that won't load makes the round unwinnable: swap in a different
  // subdivision and start over (nothing is scored). Give up after MAX_FLAG_RETRIES.
  const reroll = (failed?: string) => {
    const bad = new Set(broken)
    if (failed) bad.add(failed)
    setBroken(bad)
    const pool = SUB_FLAGS.filter(s => !bad.has(s.code) && s.code !== target.code)
    const t = pick(pool.length ? pool : SUB_FLAGS.filter(s => s.code !== target.code))
    setTarget(t)
    setSteps(buildSteps(t))
    setStepIdx(0)
    setPicked(null)
    setResults([])
  }
  const onFlagError = () => {
    if (results.length > 0 || answered) return
    setFails(f => f + 1)
    reroll(target.code)
  }
  const retry = () => { setFails(0); reroll() }

  const next = () => {
    if (stepIdx + 1 >= steps.length) {
      if (results.every(Boolean)) onSubLearned(target.code)
      setDone(true)
      return
    }
    setStepIdx(i => i + 1)
    setPicked(null)
  }

  if (done) {
    const correct = results.filter(Boolean).length
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title="Province Roulette" subtitle="Results" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3">
          <ResultCard>
            <ResultHeader icon={correct === 3 ? "target" : correct >= 1 ? "compass" : "globe"} accent={A}
              title={`${correct} of 3 steps right`}
              score={`${target.countryEmoji} ${target.name}, ${target.countryName}`} />
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.line}` }}>
              <img src={target.flagUrl} alt={target.name} style={{ width: "100%", height: 150, objectFit: "contain", display: "block", background: T.surfaceHi, padding: 6 }}
                onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3" }} />
            </div>
            <div className="flex justify-center gap-2">
              {["Continent", "Country", "Region"].map((l, i) => (
                <span key={l} className="px-2 py-1 rounded-full" style={{ fontSize: 12,
                  background: tint(results[i] ? T.green : T.danger, 0.13), color: results[i] ? T.green : T.danger, border: `1px solid ${tint(results[i] ? T.green : T.danger, 0.3)}` }}>
                  {results[i] ? "✓" : "✗"} {l}
                </span>
              ))}
            </div>
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={A}>New flag</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Province Roulette" subtitle="Continent, country, then region" onBack={onBack}
        right={<HeaderStat accent={A}>{stepIdx + 1} / 3</HeaderStat>} />

      {fails >= MAX_FLAG_RETRIES ? (
        <div className="flex flex-col items-center px-5 gap-4">
          <FlagLoadFailed onRetry={retry} onBack={onBack} accent={A} />
        </div>
      ) : (
      <div className="flex flex-col items-center px-5 gap-4">
        <div style={{ width: 280, height: 186, borderRadius: 14, overflow: "hidden", border: `2px solid ${tint(A, 0.3)}`, boxShadow: `0 6px 18px -10px ${tint(T.text, 0.5)}`, background: T.surfaceHi }}>
          <img key={target.code} src={target.flagUrl} alt="subdivision flag"
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", padding: 8 }}
            onLoad={() => setFails(0)} onError={onFlagError} />
        </div>
        <div className="text-sm font-semibold" style={{ color: A }}>{step.label}</div>

        <div className="grid grid-cols-1 gap-2.5 w-full max-w-sm">
          {step.choices.map(c => {
            const isAnswer = c === step.answer
            const isChosen = picked === c
            let border = `2px solid ${T.line}`
            if (answered) { if (isAnswer) border = `2px solid ${T.green}`; else if (isChosen) border = `2px solid ${T.danger}` }
            return (
              <button key={c} onClick={() => choose(c)} disabled={answered}
                className="py-3 px-4 rounded-xl font-semibold text-sm transition-all active:scale-95"
                style={{ background: T.surface, border, color: T.text, textAlign: "left" }}>
                {c}
                {answered && isAnswer && <span style={{ float: "right", color: T.green }}>✓</span>}
                {answered && isChosen && !isAnswer && <span style={{ float: "right", color: T.danger }}>✗</span>}
              </button>
            )
          })}
        </div>

        {answered && (
          <PrimaryButton onClick={next} accent={A} style={{ maxWidth: 384 }}>
            {stepIdx + 1 >= steps.length ? "See Result →" : "Next →"}
          </PrimaryButton>
        )}
      </div>
      )}
    </div>
  )
}

export default function ProvinceRouletteScreen({ onBack, onSubLearned }: Props) {
  const [replayKey, setReplayKey] = useState(0)
  return <ProvinceRouletteScreenGame key={replayKey} onBack={onBack} onSubLearned={onSubLearned} onReplay={() => setReplayKey(k => k + 1)} />
}
