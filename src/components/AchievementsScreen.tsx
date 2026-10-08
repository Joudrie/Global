import { Flag, Flame, Star } from 'lucide-react'
import type { AppState } from '../utils/storage'
import { displayStreak } from '../utils/storage'
import { todayString } from '../utils/prng'
import { FLAGS } from '../data/flags'
import { T, ACCENT, FONT, tint } from '../ui/tokens'
import { ScreenHeader } from './ui'
import { CrownIcon } from './icons'

interface Props {
  state: AppState
  onBack: () => void
}

const A = ACCENT.codex

const SET_IDS = [
  { id: 'world', label: 'World' },
  { id: 'europe', label: 'Europe' },
  { id: 'africa', label: 'Africa' },
  { id: 'asia', label: 'Asia' },
  { id: 'americas', label: 'Americas' },
  { id: 'oceania', label: 'Oceania' },
  { id: 'middle-east', label: 'Middle East' },
]

export default function AchievementsScreen({ state, onBack }: Props) {
  const totalFlags = FLAGS.length
  const learned = state.learnedFlags.length
  const pct = totalFlags ? Math.round((learned / totalFlags) * 100) : 0

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Trophy Case" onBack={onBack} />

      <div className="flex-1 px-5 pb-8 space-y-4">
        {/* Overall stats */}
        <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${tint(A, 0.3)}` }}>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Flags Learned', value: learned, icon: <Flag size={22} color={A} strokeWidth={1.6} absoluteStrokeWidth /> },
              { label: 'Day Streak', value: displayStreak(state, todayString()), icon: <Flame size={22} color={T.amber} strokeWidth={1.6} absoluteStrokeWidth /> },
              { label: 'Best Streak', value: state.longestStreak, icon: <Star size={22} color={T.gold} strokeWidth={1.6} absoluteStrokeWidth /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="text-center py-2">
                <div className="mb-1 flex justify-center">{icon}</div>
                <div className="text-2xl font-black" style={{ color: T.text, fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                <div className="text-xs" style={{ color: T.muted }}>{label}</div>
              </div>
            ))}
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: tint(T.text, 0.08) }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: A }}
            />
          </div>
          <div className="text-xs mt-1 text-right" style={{ color: T.muted }}>{pct}% of all flags mastered</div>
        </div>

        {/* Crowns */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: T.muted }}>
            Crowns ({SET_IDS.filter(s => state.crowns.includes(s.id)).length}/{SET_IDS.length})
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {SET_IDS.map(({ id, label }) => {
              const earned = state.crowns.includes(id)
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{
                    background: T.surface,
                    border: `1px solid ${earned ? tint(T.gold, 0.45) : T.line}`,
                    opacity: earned ? 1 : 0.45,
                  }}
                >
                  <span style={{ display: 'flex', flexShrink: 0 }}><CrownIcon size={22} color={earned ? T.gold : T.dim} strokeWidth={1.6} /></span>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: earned ? T.gold : T.muted }}>{label}</div>
                    <div className="text-xs" style={{ color: T.muted }}>{earned ? 'Crown earned' : 'Crown'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Daily history */}
        {Object.keys(state.dailyHistory).length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: T.muted }}>Daily History</h2>
            <div className="space-y-2">
              {Object.entries(state.dailyHistory)
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 7)
                .map(([date, result]) => (
                  <div key={date} className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                    <div className="text-sm" style={{ color: T.muted }}>{date}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {(result.answers ?? []).map((a, i) => (
                          <span key={i} style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', background: a === 'correct' ? T.green : T.danger }} />
                        ))}
                      </div>
                      <span className="font-bold text-sm" style={{ color: T.text, fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums' }}>{result.score}/{result.total}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
