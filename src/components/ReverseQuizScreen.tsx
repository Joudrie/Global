import { useState, useEffect, useRef } from "react"
import type { Question } from "../utils/quiz"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { PrimaryButton, choiceLabel } from "./gameUi"

interface Props {
  questions: Question[]
  title: string
  onFinish: (answers: ("correct" | "wrong")[]) => void
  onBack: () => void
}

type AnswerState = "idle" | "correct" | "wrong"

export default function ReverseQuizScreen({ questions, title, onFinish, onBack }: Props) {
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<("correct" | "wrong")[]>([])
  const [answerState, setAnswerState] = useState<AnswerState>("idle")
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [animatingIdx, setAnimatingIdx] = useState<number | null>(null)

  const q = questions[idx]
  const accent = ACCENT.drill

  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (animTimer.current) clearTimeout(animTimer.current) }, [])

  const finished = useRef(false)

  const handleChoice = (choiceIdx: number) => {
    if (answerState !== "idle") return
    const isCorrect = choiceIdx === q.correctIndex
    setSelectedIdx(choiceIdx)
    setAnswerState(isCorrect ? "correct" : "wrong")
    setAnimatingIdx(choiceIdx)
    if (animTimer.current) clearTimeout(animTimer.current)
    animTimer.current = setTimeout(() => setAnimatingIdx(null), 500)
    setAnswers(prev => [...prev, isCorrect ? "correct" : "wrong"])
  }

  // Reset here rather than in an effect, so a double click's second click
  // finds no Next button; setIdx(idx + 1) makes a repeated call harmless.
  const handleNext = () => {
    if (answerState === "idle" || finished.current) return
    if (idx + 1 >= questions.length) {
      finished.current = true
      onFinish([...answers])
      return
    }
    setAnswerState("idle")
    setSelectedIdx(null)
    setAnimatingIdx(null)
    setIdx(idx + 1)
  }

  const borderColor = (i: number) => {
    if (answerState === "idle") return T.line
    if (i === q.correctIndex) return T.green
    if (i === selectedIdx && answerState === "wrong") return T.danger
    return T.line
  }

  const overlayColor = (i: number) => {
    if (answerState === "idle") return "transparent"
    if (i === q.correctIndex) return tint(T.green, 0.2)
    if (i === selectedIdx && answerState === "wrong") return tint(T.danger, 0.2)
    return "transparent"
  }

  const animClass = (i: number) => {
    if (animatingIdx !== i) return ""
    return i === q.correctIndex ? "animate-correct-bounce" : "animate-wrong-shake"
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, minHeight: "100vh", color: T.text }}>
      <ScreenHeader title={title} subtitle={`${idx + 1} / ${questions.length}`} onBack={onBack} />

      <div className="mx-5 mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: T.line, zIndex: 1 }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(answers.length / questions.length) * 100}%`, background: accent }} />
      </div>

      <div className="flex-1 flex flex-col items-center px-5 py-5" style={{ zIndex: 1 }}>
        <div className="w-full max-w-sm mb-5 rounded-2xl p-5 text-center"
          style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: accent }}>
            Which flag belongs to...
          </div>
          <div className="text-3xl font-black geo-display" style={{ color: T.text }}>{q.target.name}</div>
          <div className="text-sm mt-1" style={{ color: T.muted }}>{q.target.region}</div>
        </div>

        <div className="w-full max-w-sm grid grid-cols-2 gap-3 mb-4">
          {q.choices.map((choice, i) => (
            <button key={choice.code} onClick={() => handleChoice(i)} disabled={answerState !== "idle"}
              aria-label={answerState === "idle" ? choiceLabel(i, q.choices.length) : `${choiceLabel(i, q.choices.length)}: ${choice.name}`}
              className={`rounded-xl overflow-hidden transition-all active:scale-95 ${animClass(i)}`}
              style={{
                border: `2.5px solid ${borderColor(i)}`,
                cursor: answerState !== "idle" ? "default" : "pointer",
                position: "relative",
                boxShadow: answerState !== "idle" && i === q.correctIndex ? `0 0 16px ${tint(T.green, 0.27)}` : "none",
              }}>
              <img src={choice.flagUrl} alt=""
                style={{ width: "100%", height: 90, objectFit: "contain", display: "block", background: T.surfaceHi }}
                onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3" }} />
              <div style={{
                position: "absolute", inset: 0,
                background: overlayColor(i),
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s",
              }}>
                {answerState !== "idle" && i === q.correctIndex && (
                  <span style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", background: T.green, color: "#fff", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.35)" }}>✓</span>
                )}
                {answerState !== "idle" && i === selectedIdx && answerState === "wrong" && (
                  <span style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", background: T.danger, color: "#fff", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.35)" }}>✗</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {answerState !== "idle" && (
          <div className="w-full max-w-sm mb-3 px-4 py-3 rounded-xl animate-slide-up"
            style={{
              background: T.surface,
              border: `1px solid ${tint(answerState === "correct" ? T.green : T.danger, 0.27)}`,
            }}>
            <div className="text-xs font-semibold" style={{ color: answerState === "correct" ? T.green : T.danger }}>
              {answerState === "correct"
                ? `✓ Correct — ${q.target.name}`
                : `✗ That's ${selectedIdx !== null ? q.choices[selectedIdx].name : "not it"}. ${q.target.name} is marked ✓`}
            </div>
          </div>
        )}

        {answerState !== "idle" && (
          <PrimaryButton onClick={handleNext} accent={accent} style={{ maxWidth: 384 }}>
            {idx + 1 >= questions.length ? "See results →" : "Next →"}
          </PrimaryButton>
        )}
      </div>
    </div>
  )
}
