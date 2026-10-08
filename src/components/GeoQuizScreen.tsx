import { useState, useEffect, useMemo } from 'react'
import { Lightbulb, Clipboard } from 'lucide-react'
import { FLAGS } from '../data/flags'
import type { FlagRecord } from '../data/flags'
import { shuffleWithSeed, seededRandom, todayString } from '../utils/prng'
import { scorePhrase } from '../utils/quiz'
import { shareOrCopy } from '../utils/share'
import { matchNames, pickOnEnter } from '../utils/pickOnEnter'
import CountryOutline from './CountryOutline'
import { T, ACCENT, tint } from '../ui/tokens'
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, ResultDots, PrimaryButton, SecondaryButton } from "./gameUi"


interface Props { onBack: () => void }

interface GeoQuestion {
  target: FlagRecord
  choices: FlagRecord[]
}

const ACC = ACCENT.learn

function buildChoices(target: FlagRecord, seed: string): FlagRecord[] {
  const rng = seededRandom(seed + target.code)
  // Prefer same-region distractors
  const sameRegion = FLAGS
    .filter(f => f.region === target.region && f.code !== target.code)
    .sort(() => rng() - 0.5).slice(0, 3)
  const picks = [...sameRegion]
  if (picks.length < 3) {
    const rest = FLAGS.filter(f => f.code !== target.code && !picks.find(p => p.code === f.code))
      .sort(() => rng() - 0.5)
    picks.push(...rest.slice(0, 3 - picks.length))
  }
  return [target, ...picks.slice(0, 3)].sort(() => rng() - 0.5)
}

// Island nations whose outline is unreadable: scattered specks (Micronesia,
// Tuvalu) or, for Kiribati, a shape split across the 180° line.
const TOO_SMALL = new Set(["KI", "FM", "MH", "TV", "PW", "TO", "MV"])

function buildQuiz(seed: string, count = 10): GeoQuestion[] {
  const shuffled = shuffleWithSeed(FLAGS.filter(f => !TOO_SMALL.has(f.code)), seed).slice(0, count)
  return shuffled.map(target => ({
    target,
    choices: buildChoices(target, seed),
  }))
}

export default function GeoQuizScreen({ onBack }: Props) {
  const [seed, setSeed] = useState(() => Date.now().toString())
  // A new seed on "Play again" deals a fresh set of countries.
  const questions = useMemo<GeoQuestion[]>(() => buildQuiz(seed), [seed])
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<('correct' | 'wrong')[]>([])
  const [phase, setPhase] = useState<'quiz' | 'result'>('quiz')
  // One hint per game: reveals the continent of whichever question it's used on.
  const [hintUsed, setHintUsed] = useState(false)
  const [hintShownFor, setHintShownFor] = useState<number | null>(null)
  // Answer mode — multiple choice or free type-in.
  const [mode, setMode] = useState<'mc' | 'type'>('mc')
  const [input, setInput] = useState('')
  const [showDrop, setShowDrop] = useState(false)
  const [copied, setCopied] = useState(false)

  const q = questions[idx]
  useEffect(() => { setSelected(null); setInput('') }, [idx, seed])

  const matches = useMemo(() => matchNames(FLAGS, input, 6), [input])
  const [typeHint, setTypeHint] = useState(false)

  const resetGame = () => {
    setSeed(Date.now().toString())
    setIdx(0); setScore(0); setAnswers([]); setSelected(null)
    setHintUsed(false); setHintShownFor(null); setPhase('quiz'); setInput('')
  }

  const useHint = () => {
    if (hintUsed) return
    setHintUsed(true)
    setHintShownFor(idx)
  }

  const handleShare = async () => {
    const grid = answers.map(a => a === 'correct' ? '🟩' : '🟥').join('')
    const phrase = scorePhrase(score, questions.length)
    const text = `Globalio Geography ${todayString()}\n${score}/${questions.length} 🌍${phrase ? ` ${phrase}` : ''}\n${grid}\nPlay at globalio.app`
    // On desktop this copies silently; say so, or the button seems to do nothing.
    if (await shareOrCopy(text) === 'copied') { setCopied(true); setTimeout(() => setCopied(false), 1800) }
  }

  const advance = (correct: boolean) => {
    if (correct) setScore(s => s + 1)
    setAnswers(prev => [...prev, correct ? 'correct' : 'wrong'])
    setTimeout(() => {
      if (idx + 1 >= questions.length) { setPhase('result') }
      else setIdx(i => i + 1)
    }, 1000)
  }

  const handleAnswer = (i: number) => {
    // One answer per question: switching between Choices and Type-in during
    // the reveal must not allow a second answer (it skipped a question and
    // crashed on the last one).
    if (selected !== null || typedGuess) return
    setSelected(i)
    advance(q.choices[i].code === q.target.code)
  }

  const [typedGuess, setTypedGuess] = useState<FlagRecord | null>(null)
  useEffect(() => { setTypedGuess(null) }, [idx, seed])

  const handleType = (f: FlagRecord) => {
    if (typedGuess || selected !== null) return
    setTypedGuess(f); setInput(''); setShowDrop(false)
    advance(f.code === q.target.code)
  }

  if (phase === 'result') {
    const pct = score / questions.length
    const color = pct >= 0.8 ? T.green : pct >= 0.5 ? T.gold : T.danger
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title="Geography" subtitle="Results" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3">
          <ResultCard>
            <ResultHeader icon="geo" accent={color}
              title={`${score} of ${questions.length} countries`}
              score={pct >= 0.8 ? 'Geography master!' : pct >= 0.5 ? 'Not bad!' : 'Keep exploring!'} />
            <ResultDots results={answers.map(a => a === 'correct')} />
          </ResultCard>
          <PrimaryButton onClick={handleShare} accent={ACC}>
            <Clipboard size={16} strokeWidth={1.6} absoluteStrokeWidth /> {copied ? 'Copied' : 'Share result'}
          </PrimaryButton>
          <SecondaryButton onClick={resetGame}>Play again</SecondaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text, position: 'relative', zIndex: 1 }}>
      <ScreenHeader title="Geography" subtitle={`${idx + 1} / ${questions.length} · ${score} correct`} onBack={onBack}
        right={
          <button
            onClick={useHint}
            disabled={hintUsed}
            title={hintUsed ? 'Hint used' : 'Use your one hint (reveals the continent)'}
            className="px-3 h-9 flex items-center gap-1.5 rounded-full text-sm font-bold transition-all active:scale-95"
            style={{
              background: T.surface,
              border: `1px solid ${hintUsed ? T.line : tint(T.gold, 0.5)}`,
              color: hintUsed ? T.dim : T.gold,
              cursor: hintUsed ? 'default' : 'pointer',
            }}
          ><Lightbulb size={14} strokeWidth={1.6} absoluteStrokeWidth /> {hintUsed ? 'Used' : '1'}</button>
        } />

      {/* Full-width progress bar */}
      <div className="mx-5 mb-3 h-1.5 rounded-full overflow-hidden" style={{ background: T.line }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(answers.length / questions.length) * 100}%`, background: ACC }} />
      </div>

      {/* Answer-mode toggle */}
      <div className="mx-5 mb-2 flex justify-center">
        <div className="inline-flex p-0.5 rounded-full" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          {(['mc', 'type'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className="px-4 py-1 rounded-full text-xs font-bold transition-all"
              style={{ background: mode === m ? ACC : 'transparent', color: mode === m ? T.onAccent : T.muted }}>
              {m === 'mc' ? 'Choices' : 'Type-in'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-5 pb-8 gap-6">
        {/* Shape */}
        <div style={{
          width: '100%', maxWidth: 340, height: 220, borderRadius: 20,
          background: T.surface, border: `1px solid ${T.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <CountryOutline
            key={q.target.code}
            code={q.target.code}
            fill={T.text}
            style={{ width: '80%', height: '80%', objectFit: 'contain' }}
          />
        </div>

        {/* Continent is hidden by default — only revealed if the player spends their hint */}
        {hintShownFor === idx ? (
          <div style={{
            padding: '4px 14px', borderRadius: 999,
            background: tint(T.gold, 0.13), border: `1px solid ${tint(T.gold, 0.4)}`,
            fontSize: 11, color: T.gold, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 5,
          }}><Lightbulb size={12} strokeWidth={1.6} absoluteStrokeWidth /> {q.target.region}</div>
        ) : (
          <div style={{ height: 25 }} />
        )}

        {/* Choices (MC) or type-in */}
        {mode === 'mc' ? (
          <div style={{ width: '100%', maxWidth: 340, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {q.choices.map((choice, i) => {
              const isCorrect = choice.code === q.target.code
              const isSelected = selected === i
              let bg = T.surface
              let border = `1px solid ${T.line}`
              let color = T.text
              if (selected !== null) {
                if (isCorrect) { bg = tint(T.green, 0.13); border = `1px solid ${T.green}`; color = T.green }
                else if (isSelected) { bg = tint(T.danger, 0.13); border = `1px solid ${T.danger}`; color = T.danger }
              }
              return (
                <button
                  key={choice.code}
                  onClick={() => handleAnswer(i)}
                  className="py-3 px-4 rounded-2xl font-semibold text-sm text-left transition-all active:scale-95"
                  style={{ background: bg, border, color }}
                >
                  {choice.name}
                </button>
              )
            })}
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 340 }} className="relative">
            {typedGuess ? (
              <div className="w-full px-4 py-3.5 rounded-2xl font-semibold text-sm text-center"
                style={{
                  background: tint(typedGuess.code === q.target.code ? T.green : T.danger, 0.13),
                  border: `1px solid ${typedGuess.code === q.target.code ? T.green : T.danger}`,
                  color: T.text,
                }}>
                {typedGuess.code === q.target.code ? `✓ ${q.target.name}` : `✗ ${typedGuess.name} — it was ${q.target.name}`}
              </div>
            ) : (
              <>
                <input
                  value={input} autoFocus autoComplete="off"
                  onChange={e => { setInput(e.target.value); setShowDrop(true); setTypeHint(false) }}
                  onFocus={() => setShowDrop(true)}
                  onBlur={() => setTimeout(() => setShowDrop(false), 150)}
                  onKeyDown={e => {
                    if (e.key !== 'Enter' || !input.trim()) return
                    // An exact name ("Niger", "UK") or the only match; never a guess.
                    const pick = pickOnEnter(matches, input)
                    if (pick) handleType(pick); else setTypeHint(true)
                  }}
                  aria-label="Name the country"
                  placeholder="Name the country…"
                  className="w-full px-4 py-3.5 rounded-2xl outline-none font-semibold"
                  style={{ background: T.surface, border: `1.5px solid ${T.line}`, color: T.text, fontSize: 15 }} />
                {typeHint && (
                  <p role="status" className="text-xs mt-1.5" style={{ color: T.muted }}>
                    {matches.length ? "Pick one from the list" : "No country matches that"}
                  </p>
                )}
                {showDrop && matches.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20"
                    style={{ background: T.surface, border: `1px solid ${T.line}`, boxShadow: `0 8px 32px ${tint(T.text, 0.18)}` }}>
                    {matches.map(f => (
                      <button key={f.code} onMouseDown={() => handleType(f)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:brightness-95"
                        style={{ background: 'transparent', borderBottom: `1px solid ${T.line}`, color: T.text }}>
                        <span className="font-semibold text-sm">{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
