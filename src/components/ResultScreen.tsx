import { useEffect } from 'react'
import { todayString } from '../utils/prng'
import ShareCard from './ShareCard'
import AdBox from './AdBox'
import { AD_SLOTS } from '../ads'
import type { ShareResult } from '../utils/storage'
import { T, ACCENT } from '../ui/tokens'
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"

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
    if (pct === 100) return { icon: 'trophy', iconColor: T.gold, text: 'Perfect score! Incredible!' }
    if (pct >= 80)  return { icon: 'star', iconColor: T.gold, text: 'Fantastic! You really know your flags.' }
    if (pct >= 60)  return { icon: 'check', iconColor: T.green, text: 'Solid! A few sneaky ones tripped you up.' }
    if (pct >= 40)  return { icon: 'codex', iconColor: accent, text: "Room to grow — but that's the fun part!" }
    return { icon: 'target', iconColor: T.muted, text: "Flags are hard! You'll get them next time." }
  }

  const { icon, iconColor, text } = getMessage()

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
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, minHeight: '100vh', color: T.text, overflowY: 'auto' }}>
      <ScreenHeader title={setLabel} subtitle="Results" onBack={onHome} />

      <div className="w-full max-w-sm mx-auto flex flex-col gap-4 px-5 pb-8">

        {/* Score summary */}
        <ResultCard>
          <ResultHeader icon={icon} accent={iconColor} title={text} score={`${score} / ${total} correct · ${pct}%`} />
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: T.line }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: pct === 100 ? T.gold : T.green }} />
          </div>
        </ResultCard>

        {/* Shareable card */}
        <ShareCard result={shareResult} showCopyButton />

        {/* Ad — a natural break shown after each game (renders only once
            AdSense is configured in ads.ts; otherwise nothing appears). */}
        <AdBox slot={AD_SLOTS.resultFooter} />

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          {onRetry && <PrimaryButton onClick={onRetry} accent={accent}>Play again</PrimaryButton>}
          <SecondaryButton onClick={onHome}>Home</SecondaryButton>
        </div>
      </div>
    </div>
  )
}
