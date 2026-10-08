import { useEffect, useRef, useState } from 'react'
import { Swords, Castle, Sun, Mountain, Landmark, MoonStar, Sailboat, Globe } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FLAGS, REGIONS, getFlagsByRegion } from '../data/flags'
import type { FlagRecord, Region } from '../data/flags'
import { shuffleWithSeed } from '../utils/prng'
import { buildQuestion } from '../utils/quiz'
import { T, ACCENT, FONT, tint } from '../ui/tokens'
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"

interface Props { onBack: () => void }

type Phase = 'menu' | 'run' | 'dead' | 'win'

const ACC = ACCENT.challenge

interface GauntletConfig {
  label: string
  Icon: LucideIcon
  flags: FlagRecord[]
  id: string
}

function buildConfigs(): GauntletConfig[] {
  return [
    { id: 'world', label: 'World', Icon: Globe, flags: FLAGS },
    ...REGIONS.map(r => ({
      id: r,
      label: r,
      Icon: regionIcon(r),
      flags: getFlagsByRegion(r as Region),
    })),
  ]
}

// Etched line icon per region — the same set the Codex uses.
function regionIcon(r: string): LucideIcon {
  const map: Record<string, LucideIcon> = {
    Europe: Castle, Africa: Sun, Asia: Mountain, Americas: Landmark, Oceania: Sailboat, 'Middle East': MoonStar,
  }
  return map[r] ?? Globe
}

export default function GauntletScreen({ onBack }: Props) {
  const configs = buildConfigs()
  const [phase, setPhase] = useState<Phase>('menu')
  const [config, setConfig] = useState<GauntletConfig | null>(null)
  const [questions, setQuestions] = useState<ReturnType<typeof buildQuestion>[]>([])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  // The pause after an answer; cleared on leaving a run so it can't act on the next screen.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearTimer = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }
  useEffect(() => clearTimer, [])
  const toMenu = () => { clearTimer(); setPhase('menu') }

  const q = questions[idx]

  const startRun = (cfg: GauntletConfig) => {
    clearTimer()
    const seed = Date.now().toString()
    const shuffled = shuffleWithSeed(cfg.flags, seed)
    const qs = shuffled.map(f => buildQuestion(f, seed))
    setConfig(cfg)
    setQuestions(qs)
    setIdx(0)
    setScore(0)
    setSelected(null)
    setPhase('run')
  }

  const handleAnswer = (i: number) => {
    if (selected !== null) return
    setSelected(i)
    const correct = q.choices[i].code === q.target.code
    if (correct) {
      setScore(s => s + 1)
      timer.current = setTimeout(() => {
        if (idx + 1 >= questions.length) { setPhase('win') }
        else { setIdx(ix => ix + 1); setSelected(null) }
      }, 700)
    } else {
      // One strike = dead
      timer.current = setTimeout(() => setPhase('dead'), 900)
    }
  }

  if (phase === 'menu') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text, position: 'relative', zIndex: 1 }}>
        <ScreenHeader title="Gauntlet" subtitle="One wrong answer — game over" onBack={onBack} />

        <div className="px-5 pb-8 space-y-3">
          <div className="px-4 py-3 rounded-xl mb-2" style={{ background: tint(ACC, 0.1), border: `1px solid ${tint(ACC, 0.3)}` }}>
            <p className="text-sm flex items-center gap-2" style={{ color: ACC }}>
              <Swords size={15} strokeWidth={1.6} absoluteStrokeWidth />
              <span><strong>Survival mode</strong> — get through every flag without a single mistake</span>
            </p>
          </div>
          {configs.map(cfg => (
            <button
              key={cfg.id}
              onClick={() => startRun(cfg)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all active:scale-[0.98]"
              style={{ background: T.surface, border: `1px solid ${T.line}` }}
            >
              <div className="flex items-center gap-3">
                <span style={{ width: 40, height: 40, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tint(ACC, 0.12), border: `1px solid ${tint(ACC, 0.28)}` }}>
                  <cfg.Icon size={20} color={ACC} strokeWidth={1.6} absoluteStrokeWidth />
                </span>
                <div className="text-left">
                  <div className="font-bold" style={{ color: T.text, fontFamily: FONT.display }}>{cfg.label}</div>
                  <div className="text-xs" style={{ color: T.muted }}>{cfg.flags.length} flags to survive</div>
                </div>
              </div>
              <span style={{ color: ACC }}>›</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'dead') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text, position: 'relative', zIndex: 1 }}>
        <ScreenHeader title={`${config?.label ?? ''} Gauntlet`} subtitle="Game over" onBack={toMenu} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3">
          <ResultCard>
            <ResultHeader icon="skull" accent={T.danger} eyebrow="Game over"
              title={`You survived ${score} flag${score !== 1 ? 's' : ''}`}
              score={q ? <>The answer was <strong style={{ color: T.text }}>{q.target.name}</strong></> : undefined} />
          </ResultCard>
          {config && <PrimaryButton onClick={() => startRun(config)} accent={ACC}>Try again</PrimaryButton>}
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  if (phase === 'win') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text, position: 'relative', zIndex: 1 }}>
        <ScreenHeader title={`${config?.label ?? ''} Gauntlet`} subtitle="Complete" onBack={toMenu} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3">
          <ResultCard>
            <ResultHeader icon="trophy" accent={T.gold} eyebrow="Flawless"
              title={`All ${score} flags named`} score="Not a single mistake." />
          </ResultCard>
          <PrimaryButton onClick={onBack} accent={T.green}>Back to home</PrimaryButton>
        </div>
      </div>
    )
  }

  // Run phase
  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text, position: 'relative', zIndex: 1 }}>
      <ScreenHeader title={`${config?.label} Gauntlet`} subtitle={`${idx + 1} / ${questions.length} · ${score} survived`}
        onBack={toMenu}
        right={<HeaderStat label="Lives" accent={T.danger}>1</HeaderStat>} />

      <div className="flex-1 flex flex-col items-center px-5 pb-8 gap-5">
        {/* Survival progress */}
        <div style={{ width: '100%', height: 4, borderRadius: 999, background: T.line, overflow: 'hidden' }}>
          <div style={{
            width: `${((idx + (selected !== null ? 1 : 0)) / questions.length) * 100}%`, height: '100%',
            background: ACC,
            borderRadius: 999, transition: 'width 0.3s',
          }} />
        </div>

        {/* Flag */}
        <div style={{
          width: '100%', maxWidth: 340, borderRadius: 20, overflow: 'hidden',
          border: `1px solid ${T.line}`, background: T.surface,
        }}>
          <img
            key={q.target.code}
            src={q.target.flagUrl}
            alt="flag"
            style={{ width: '100%', height: 200, objectFit: 'contain', background: T.surfaceHi, display: 'block' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        {/* Choices */}
        <div style={{ width: '100%', maxWidth: 340, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {q.choices.map((choice, i) => {
            const isCorrect = choice.code === q.target.code
            const isSelected = selected === i
            let bg = T.surface
            let border = `1px solid ${T.line}`
            let textColor = T.text
            if (selected !== null) {
              if (isCorrect) { bg = tint(T.green, 0.13); border = `1px solid ${T.green}`; textColor = T.green }
              else if (isSelected) { bg = tint(T.danger, 0.13); border = `1px solid ${T.danger}`; textColor = T.danger }
            }
            return (
              <button
                key={choice.code}
                onClick={() => handleAnswer(i)}
                className="py-4 px-4 rounded-2xl font-semibold text-sm text-left transition-all active:scale-95"
                style={{ background: bg, border, color: textColor }}
              >
                {choice.name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
