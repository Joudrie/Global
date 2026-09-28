import { useEffect } from 'react'
import { Trophy, Star, ThumbsUp, BookOpen, RotateCcw } from 'lucide-react'
import { todayString } from '../utils/prng'
import ShareCard from './ShareCard'
import AdBox from './AdBox'
import { AD_SLOTS } from '../ads'
import type { ShareResult } from '../utils/storage'
import { T, ACCENT, FONT, tint } from '../ui/tokens'

interface Props {
  score: number
  total: number
  answers: ('correct' | 'wrong')[]
  isDaily: boolean
  setLabel: string
  streak?: number
  onHome: () => void
  onRetry?: () => void
  onSaveShare?: (result: ShareResult) => void
}

export default function ResultScreen({ score, total, answers, setLabel, streak, onHome, onRetry, onSaveShare }: Props) {
  const pct = Math.round((score / total) * 100)
  const accent = ACCENT.play

  const getMessage = () => {
    if (pct === 100) return { Icon: Trophy, iconColor: T.gold, text: 'Perfect score! Incredible!' }
    if (pct >= 80)  return { Icon: Star, iconColor: T.gold, text: 'Fantastic! You really know your flags.' }
    if (pct >= 60)  return { Icon: ThumbsUp, iconColor: T.green, text: 'Solid! A few sneaky ones tripped you up.' }
    if (pct >= 40)  return { Icon: BookOpen, iconColor: accent, text: "Room to grow — but that's the fun part!" }
    return { Icon: RotateCcw, iconColor: T.muted, text: "Flags are hard! You'll get them next time." }
  }

  const { Icon, iconColor, text } = getMessage()

  const shareResult: ShareResult = {
    game: setLabel,
    score: `${score}/${total}`,
    emojiGrid: answers.map(a => a === 'correct' ? '🟩' : '🟥'),
    date: todayString(),
    streak,
  }

  // Save the share result as soon as the result screen shows, so it persists no
  // matter how the user leaves (Home, Play Again, or navigating away).
  useEffect(() => {
    if (onSaveShare) onSaveShare(shareResult)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center px-5 py-8"
      style={{ background: T.bg, minHeight: '100vh', color: T.text, overflowY: 'auto' }}>

      <div className="w-full max-w-sm flex flex-col gap-4">

        {/* Score summary */}
        <div className="rounded-2xl p-5 text-center carto-card"
          style={{ ['--wash' as string]: tint(accent, 0.4) }}>
          <div className="mb-2 flex justify-center">
            <Icon size={44} color={iconColor} strokeWidth={1.6} absoluteStrokeWidth />
          </div>
          <div className="text-6xl font-black mb-1" style={{ color: T.text, fontFamily: FONT.mono, letterSpacing: '-0.04em' }}>{score}/{total}</div>
          <div className="text-sm mb-2" style={{ color: T.muted }}>{setLabel}</div>
          <p className="text-base font-semibold mb-3" style={{ color: accent, fontFamily: FONT.display }}>{text}</p>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: T.line }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: pct === 100 ? T.gold : T.green }} />
          </div>
          <div className="text-xs mt-1" style={{ color: T.muted }}>{pct}% correct</div>
        </div>

        {/* Shareable card */}
        <ShareCard result={shareResult} showCopyButton />

        {/* Ad — a natural break shown after each game (renders only once
            AdSense is configured in ads.ts; otherwise nothing appears). */}
        <AdBox slot={AD_SLOTS.resultFooter} />

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          {onRetry && (
            <button onClick={onRetry}
              className="w-full py-3.5 rounded-xl font-bold text-base transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background: T.surface, border: `1px solid ${tint(accent, 0.3)}`, color: accent }}>
              <RotateCcw size={16} color={accent} strokeWidth={1.6} absoluteStrokeWidth />
              Play Again
            </button>
          )}
          <button onClick={onHome}
            className="w-full py-3.5 rounded-xl font-bold text-base transition-all active:scale-95"
            style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>
            ← Home
          </button>
        </div>
      </div>
    </div>
  )
}
