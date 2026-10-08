import { useState, useEffect, useRef } from "react"
import { CAPITALS } from "../data/capitals"
import type { CapitalRecord } from "../data/capitals"
import { CITIES } from "../data/cities"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, ResultDots, PrimaryButton, SecondaryButton, HeaderStat } from "./gameUi"
import { LineIcon } from "./icons"

interface Props { onBack: () => void }

type Phase = "menu" | "quiz" | "result"

interface CapQ {
  target: CapitalRecord
  choices: string[]
  correctIndex: number
}

const ACC = ACCENT.drill

const shuffle = <X,>(a: X[]): X[] => [...a].sort(() => Math.random() - 0.5)

function buildCapitalQuiz(count = 10): CapQ[] {
  const shuffled = shuffle([...CAPITALS]).slice(0, count)
  return shuffled.map(target => {
    const distractors: string[] = []
    // Up to 2 real *non-capital* cities from the same country — the sneaky part:
    // they're genuinely in that country, so you can't answer on vibes alone.
    const cities = shuffle((CITIES[target.code] ?? []).filter(c => c !== target.capital))
    for (const c of cities.slice(0, 2)) if (!distractors.includes(c)) distractors.push(c)
    // Fill the rest with other countries' capitals (prefer same region).
    const otherCaps = shuffle([
      ...CAPITALS.filter(c => c.region === target.region && c.code !== target.code),
      ...CAPITALS.filter(c => c.region !== target.region && c.code !== target.code),
    ])
    for (const c of otherCaps) {
      if (distractors.length >= 3) break
      if (c.capital !== target.capital && !distractors.includes(c.capital)) distractors.push(c.capital)
    }
    const allChoices = shuffle([target.capital, ...distractors])
    const correctIndex = allChoices.indexOf(target.capital)
    return { target, choices: allChoices, correctIndex }
  })
}

export default function CapitalQuizScreen({ onBack }: Props) {
  // Skip the intro/example screen — picking a capital is intuitive, so start
  // straight into the quiz.
  const [phase, setPhase] = useState<Phase>("quiz")
  const [questions, setQuestions] = useState<CapQ[]>(() => buildCapitalQuiz(10))
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<("correct" | "wrong")[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [animating, setAnimating] = useState<number | null>(null)

  const TOTAL = 10

  const startQuiz = () => {
    setQuestions(buildCapitalQuiz(TOTAL))
    setIdx(0)
    setAnswers([])
    setSelected(null)
    setAnimating(null)
    setPhase("quiz")
  }

  const q = questions[idx]
  const answered = selected !== null
  const score = answers.filter(a => a === "correct").length

  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (animTimer.current) clearTimeout(animTimer.current) }, [])

  const handleAnswer = (i: number) => {
    if (answered) return
    const isCorrect = i === q.correctIndex
    setSelected(i)
    setAnimating(i)
    if (animTimer.current) clearTimeout(animTimer.current)
    animTimer.current = setTimeout(() => setAnimating(null), 500)
    setAnswers(prev => [...prev, isCorrect ? "correct" : "wrong"])
  }

  const handleNext = () => {
    if (idx + 1 >= questions.length) { setPhase("result"); return }
    setIdx(i => i + 1)
    setSelected(null)
    setAnimating(null)
  }

  const bgColor = (i: number) => {
    if (!answered) return T.surface
    if (i === q.correctIndex) return tint(T.green, 0.13)
    if (i === selected && i !== q.correctIndex) return tint(T.danger, 0.13)
    return T.surface
  }

  const borderColor = (i: number) => {
    if (!answered) return T.line
    if (i === q.correctIndex) return T.green
    if (i === selected && i !== q.correctIndex) return T.danger
    return T.line
  }

  const textColor = (i: number) => {
    if (!answered) return T.text
    if (i === q.correctIndex) return T.green
    if (i === selected && i !== q.correctIndex) return T.danger
    return T.muted
  }

  const animClass = (i: number) => {
    if (animating !== i) return ""
    return i === q.correctIndex ? "animate-correct-bounce" : "animate-wrong-shake"
  }

  if (phase === "result") {
    const pct = Math.round((score / TOTAL) * 100)
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title="Capital Cities" subtitle="Results" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3" style={{ zIndex: 1, position: "relative" }}>
          <ResultCard>
            <ResultHeader icon={pct >= 80 ? "trophy" : pct >= 50 ? "check" : "codex"} accent={pct >= 80 ? T.gold : ACC}
              title={`${score} of ${TOTAL} capitals`} score={`${pct}% correct`} />
            <ResultDots results={answers.map(a => a === "correct")} />
          </ResultCard>
          <PrimaryButton onClick={startQuiz} accent={ACC}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  if (!q) return null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Capital Cities" subtitle={`${score} correct so far`} onBack={onBack}
        right={<HeaderStat accent={ACC}>{idx + 1} / {TOTAL}</HeaderStat>} />

      <div className="mx-5 mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: T.line, zIndex: 1 }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(answers.length / TOTAL) * 100}%`, background: ACC }} />
      </div>

      <div className="flex-1 flex flex-col items-center px-5 py-4" style={{ zIndex: 1 }}>
        <div className="w-full max-w-sm mb-5 rounded-2xl p-5 text-center"
          style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5" style={{ color: ACC }}>
            <LineIcon name="capitalquiz" size={13} color={ACC} /> Capital of...
          </div>
          <div className="text-3xl mb-1" style={{ color: T.text, fontFamily: FONT.display, fontWeight: 800 }}>{q.target.country}</div>
          <div className="text-sm" style={{ color: T.muted }}>{q.target.region}</div>
        </div>

        <div className="w-full max-w-sm grid grid-cols-2 gap-3 mb-4">
          {q.choices.map((choice, i) => (
            <button key={i} onClick={() => handleAnswer(i)} disabled={answered}
              className={`py-4 px-3 rounded-xl font-semibold text-sm text-center transition-colors active:scale-95 ${animClass(i)}`}
              style={{
                background: bgColor(i),
                border: `1.5px solid ${borderColor(i)}`,
                color: textColor(i),
                cursor: answered ? "default" : "pointer",
              }}>
              {choice}
            </button>
          ))}
        </div>

        {answered && (
          <div className="w-full max-w-sm mb-3 px-4 py-3 rounded-xl animate-slide-up"
            style={{ background: T.surface, border: `1px solid ${tint(selected === q.correctIndex ? T.green : T.danger, 0.4)}` }}>
            <div className="text-xs font-semibold" style={{ color: selected === q.correctIndex ? T.green : T.danger }}>
              {selected === q.correctIndex
                ? `✓ Correct! ${q.target.capital} is the capital of ${q.target.country}.`
                : `✗ The capital of ${q.target.country} is ${q.target.capital}.`}
            </div>
          </div>
        )}

        {answered && (
          <PrimaryButton onClick={handleNext} accent={ACC} style={{ maxWidth: 384 }}>
            {idx + 1 >= questions.length ? "See results →" : "Next →"}
          </PrimaryButton>
        )}
      </div>
    </div>
  )
}
