import { useState } from "react"
import { Pencil } from "lucide-react"
import { FLAGS } from "../data/flags"
import type { AppState } from "../utils/storage"
import { displayStreak } from "../utils/storage"
import { todayString } from "../utils/prng"
import ShareCard from "./ShareCard"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { LineIcon, FlameIcon, CrownIcon } from "./icons"

interface Props {
  state: AppState
  onBack: () => void
  onSetUsername: (name: string) => void
}

const REGIONS = ["Europe", "Africa", "Asia", "Americas", "Middle East", "Oceania"]
const A = ACCENT.learn

export default function ProfileScreen({ state, onBack, onSetUsername }: Props) {
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(state.username)
  const displayName = state.username.trim() || "Explorer"

  const saveName = () => {
    onSetUsername(draftName.trim().slice(0, 24))
    setEditingName(false)
  }
  const regionStats = REGIONS.map(region => {
    const regionFlags = FLAGS.filter(f => f.region === region)
    const learned = regionFlags.filter(f => state.learnedFlags.includes(f.code)).length
    return { region, total: regionFlags.length, learned, pct: regionFlags.length > 0 ? learned / regionFlags.length : 0 }
  })

  const worldPct = FLAGS.length > 0 ? state.learnedFlags.length / FLAGS.length : 0

  const dailyDates = Object.keys(state.dailyHistory).sort().slice(-7)

  const track = tint(T.text, 0.08)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text, position: "relative", zIndex: 1 }}>
      <ScreenHeader title="Profile" onBack={onBack} />

      {/* Profile banner */}
      <div className="mx-5 mb-4 flex items-center gap-4 px-5 py-4 rounded-2xl"
        style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: tint(A, 0.13), border: `1px solid ${tint(A, 0.3)}` }}>
          <LineIcon name="geo" size={26} color={A} />
        </div>
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false) }}
                placeholder="Your name"
                maxLength={24}
                className="min-w-0 flex-1 px-2 py-1 rounded-lg text-lg font-black outline-none"
                style={{ background: T.surfaceHi, border: `1px solid ${tint(A, 0.4)}`, color: T.text }}
              />
              <button onClick={saveName} className="px-3 py-1.5 rounded-lg text-sm font-bold flex-shrink-0"
                style={{ background: A, color: T.onAccent }}>Save</button>
            </div>
          ) : (
            <button onClick={() => { setDraftName(state.username); setEditingName(true) }}
              className="flex items-center gap-2 group">
              <span className="text-xl font-black" style={{ color: T.text, fontFamily: FONT.display }}>{displayName}</span>
              <Pencil size={13} color={A} strokeWidth={1.6} absoluteStrokeWidth />
            </button>
          )}
          <div className="text-xs mt-0.5" style={{ color: T.muted }}>
            {state.learnedFlags.length} flags learned · {state.crowns.length} crowns earned
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mx-5 mb-4 grid grid-cols-3 gap-3">
        {[
          { label: "Learned", value: state.learnedFlags.length, sub: <span style={{ color: A }}>/ {FLAGS.length}</span> },
          { label: "Day Streak", value: displayStreak(state, todayString()), sub: <FlameIcon size={13} color={T.amber} strokeWidth={1.7} /> },
          { label: "Best", value: state.longestStreak, sub: <span style={{ color: A }}>days</span> },
        ].map(({ label, value, sub }) => (
          <div key={label} className="flex flex-col items-center py-3 rounded-xl" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <span className="text-xl font-black" style={{ color: T.text, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" }}>{value}</span>
            <span className="text-xs flex items-center" style={{ minHeight: 16 }}>{sub}</span>
            <span className="text-xs mt-0.5" style={{ color: T.muted }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Progress bars */}
      <div className="mx-5 mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: T.muted }}>Progress</h3>
        <div className="space-y-3">

          {/* World Flags */}
          <div className="px-4 py-3 rounded-xl" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <LineIcon name="geo" size={15} color={A} />
                <span className="font-semibold text-sm" style={{ color: T.text }}>World Flags</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: A, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" }}>
                {state.learnedFlags.length} / {FLAGS.length}
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: track }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${worldPct * 100}%`, background: A }} />
            </div>
            <div className="text-xs mt-1 text-right" style={{ color: T.muted }}>
              {Math.round(worldPct * 100)}%
            </div>
          </div>

          {/* Regional bars */}
          {regionStats.map(rs => (
            <div key={rs.region} className="px-4 py-3 rounded-xl" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <LineIcon name="geo" size={15} color={T.muted} />
                  <span className="font-semibold text-sm" style={{ color: T.text }}>{rs.region}</span>
                </div>
                <span className="text-xs font-semibold" style={{ color: A, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" }}>
                  {rs.learned} / {rs.total}
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: track }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${rs.pct * 100}%`, background: rs.pct >= 1 ? T.gold : A }} />
              </div>
              {rs.pct >= 1 && <div className="text-xs mt-1" style={{ color: T.gold, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}><CrownIcon size={12} color={T.gold} strokeWidth={1.7} /> Complete</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Last result share card */}
      {state.lastShareResult && (
        <div className="mx-5 mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: T.muted }}>Last Result</h3>
          <ShareCard result={state.lastShareResult} showCopyButton />
        </div>
      )}

      {/* Daily history */}
      {dailyDates.length > 0 && (
        <div className="mx-5 mb-8">
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: T.muted }}>Daily History</h3>
          <div className="flex gap-2 flex-wrap">
            {dailyDates.map(date => {
              const result = state.dailyHistory[date]
              const pct = result ? result.score / result.total : 0
              const color = pct >= 0.8 ? T.green : pct >= 0.5 ? T.amber : T.danger
              return (
                <div key={date} className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold"
                    style={{ background: tint(color, 0.13), border: `1.5px solid ${tint(color, 0.4)}`, color, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" }}>
                    {result ? `${result.score}/${result.total}` : "-"}
                  </div>
                  <div className="text-xs" style={{ color: T.muted }}>{date.slice(5)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
