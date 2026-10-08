import { useState, useEffect, useRef } from 'react'
import { Lightbulb } from 'lucide-react'
import type { Question } from '../utils/quiz'
import { T, ACCENT, tint } from '../ui/tokens'
import { ScreenHeader } from "./ui"
import { PrimaryButton } from "./gameUi"
import { LineIcon } from './icons'

interface Props {
  questions: Question[]
  title: string
  onFinish: (answers: ('correct' | 'wrong')[]) => void
  /** Called with the flag's code as soon as it's answered right. */
  onCorrect?: (code: string) => void
  onBack: () => void
}

type AnswerState = 'idle' | 'correct' | 'wrong'

export default function QuizScreen({ questions, title, onFinish, onCorrect, onBack }: Props) {
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<('correct' | 'wrong')[]>([])
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [animatingIdx, setAnimatingIdx] = useState<number | null>(null)
  const [showLightbulb, setShowLightbulb] = useState(false)
  const [imgError, setImgError] = useState(false)

  const q = questions[idx]
  const accent = ACCENT.play

  // Track the answer-feedback animation timer so it can be cleared on unmount.
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (animTimer.current) clearTimeout(animTimer.current) }, [])

  // Set once the last answer is handed over, so a double click can't finish twice.
  const finished = useRef(false)

  const handleChoice = (choiceIdx: number) => {
    if (answerState !== 'idle') return
    const isCorrect = choiceIdx === q.correctIndex
    setSelectedIdx(choiceIdx)
    setAnswerState(isCorrect ? 'correct' : 'wrong')
    setAnimatingIdx(choiceIdx)
    if (animTimer.current) clearTimeout(animTimer.current)
    animTimer.current = setTimeout(() => setAnimatingIdx(null), 500)
    if (!isCorrect) setShowLightbulb(true)
    setAnswers(prev => [...prev, isCorrect ? 'correct' : 'wrong'])
    if (isCorrect) onCorrect?.(q.target.code)
  }

  // Resets the round here, not in an effect, so the Next button is gone by the
  // time a double click's second click lands; setIdx(idx + 1) (not i => i + 1)
  // keeps a repeated call on the same question from skipping the next one.
  const handleNext = () => {
    if (answerState === 'idle' || finished.current) return
    if (idx + 1 >= questions.length) {
      finished.current = true
      onFinish(answers)
      return
    }
    setAnswerState('idle')
    setSelectedIdx(null)
    setAnimatingIdx(null)
    setShowLightbulb(false)
    setImgError(false)
    setIdx(idx + 1)
  }

  const choiceBg = (i: number) => {
    if (answerState === 'idle') return T.surface
    if (i === q.correctIndex) return tint(T.green, 0.13)
    if (i === selectedIdx && answerState === 'wrong') return tint(T.danger, 0.13)
    return T.surface
  }

  const choiceBorder = (i: number) => {
    if (answerState === 'idle') return T.line
    if (i === q.correctIndex) return T.green
    if (i === selectedIdx && answerState === 'wrong') return T.danger
    return T.line
  }

  const choiceTextColor = (i: number) => {
    if (answerState === 'idle') return T.text
    if (i === q.correctIndex) return T.green
    if (i === selectedIdx && answerState === 'wrong') return T.danger
    return T.muted
  }

  const choiceAnimClass = (i: number) => {
    if (animatingIdx !== i) return ''
    return i === q.correctIndex ? 'animate-correct-bounce' : 'animate-wrong-shake'
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, minHeight: '100vh', color: T.text }}>
      <ScreenHeader title={title} subtitle={`${idx + 1} / ${questions.length}`} onBack={onBack} />

      <div className="mx-5 mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: T.line, zIndex: 1 }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(answers.length / questions.length) * 100}%`, background: accent }} />
      </div>

      <div className="flex-1 flex flex-col items-center px-5 py-4" style={{ zIndex: 1 }}>
        <div className="mb-4 relative">
          <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ border: `2px solid ${tint(accent, 0.3)}` }}>
            {imgError ? (
              <div className="flex items-center justify-center"
                style={{ width: 280, height: 175, background: T.surface, color: T.muted }}>
                <LineIcon name="flags" size={48} color={T.muted} />
              </div>
            ) : (
              <img src={q.target.flagUrl} alt="mystery flag" width={280} height={175}
                className="object-contain" style={{ display: 'block', background: T.surfaceHi }} onError={() => setImgError(true)} />
            )}
          </div>

          {answerState !== 'idle' && (
            <button
              onClick={() => setShowLightbulb(s => !s)}
              aria-label="How to tell them apart" aria-pressed={showLightbulb}
              className="absolute -bottom-3 -right-3 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 animate-fade-in"
              style={{ background: T.surface, border: `1px solid ${tint(T.gold, 0.4)}`, boxShadow: `0 2px 8px ${tint(T.text, 0.18)}` }}
            ><Lightbulb size={17} color={T.gold} strokeWidth={1.6} absoluteStrokeWidth /></button>
          )}
        </div>

        {answerState === 'correct' && (
          <div className="w-full max-w-sm mb-3 px-4 py-3 rounded-xl animate-slide-up"
            style={{ background: T.surface, border: `1px solid ${tint(T.green, 0.27)}` }}>
            <div className="text-xs font-semibold mb-1" style={{ color: T.green }}>✓ Correct — {q.target.name}</div>
            <p className="text-sm" style={{ color: T.text }}>{q.target.funFact}</p>
          </div>
        )}

        {answerState === 'wrong' && (
          // On a wrong answer we deliberately show ONLY the "how to tell them apart" tip
          // below — no answer/fun-fact box — so it's a calmer moment to learn. The fun
          // fact is the reward for getting it right.
          <div className="w-full max-w-sm mb-1 text-center animate-fade-in">
            <span className="text-xs font-semibold" style={{ color: T.danger }}>✗ The answer was {q.target.name}</span>
          </div>
        )}

        {showLightbulb && answerState !== 'idle' && (
          <div className="w-full max-w-sm mb-3 px-4 py-3 rounded-xl animate-slide-up"
            style={{ background: T.surface, border: `1px solid ${tint(T.gold, 0.27)}` }}>
            <div className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: T.gold }}>
              <Lightbulb size={13} color={T.gold} strokeWidth={1.6} absoluteStrokeWidth />
              How to tell them apart
            </div>
            <p className="text-sm" style={{ color: T.text }}>{q.target.distinguishingTip}</p>
          </div>
        )}

        <div className="w-full max-w-sm grid grid-cols-2 gap-3 mb-4">
          {q.choices.map((choice, i) => (
            <button
              key={choice.code}
              onClick={() => handleChoice(i)}
              disabled={answerState !== 'idle'}
              className={`py-3.5 px-3 rounded-xl font-semibold text-sm transition-colors active:scale-95 ${choiceAnimClass(i)}`}
              style={{
                background: choiceBg(i),
                border: `1.5px solid ${choiceBorder(i)}`,
                color: choiceTextColor(i),
                cursor: answerState !== 'idle' ? 'default' : 'pointer',
              }}
            >
              {choice.name}
            </button>
          ))}
        </div>

        {answerState !== 'idle' && (
          <PrimaryButton onClick={handleNext} accent={accent} style={{ maxWidth: 384 }}>
            {idx + 1 >= questions.length ? 'See results →' : 'Next →'}
          </PrimaryButton>
        )}
      </div>
    </div>
  )
}
