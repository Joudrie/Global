import { useEffect, useState } from "react"
import { T, tint } from "../ui/tokens"
import { LineIcon } from "./icons"
import { ACHIEVEMENTS_EVENT } from "../profile/achievements"
import { achievementById } from "../data/achievements"

/* "Achievement unlocked": a small note at the top of the screen for a few
   seconds when one unlocks (several at once are one note). It covers nothing
   you need: tap it to close it. Fades in only when motion is welcome. */

const SHOW_MS = 4500

export default function AchievementToast() {
  const [ids, setIds] = useState<string[]>([])
  useEffect(() => {
    const on = (e: Event) => {
      const fresh = ((e as CustomEvent<{ ids?: string[] }>).detail?.ids ?? []).filter(id => achievementById(id))
      if (fresh.length) setIds(prev => [...new Set([...prev, ...fresh])])
    }
    window.addEventListener(ACHIEVEMENTS_EVENT, on)
    return () => window.removeEventListener(ACHIEVEMENTS_EVENT, on)
  }, [])
  useEffect(() => {
    if (!ids.length) return
    const t = window.setTimeout(() => setIds([]), SHOW_MS)
    return () => window.clearTimeout(t)
  }, [ids])

  const first = ids.length ? achievementById(ids[0]) : undefined
  return (
    <div role="status" aria-live="polite" style={{ position: "fixed", top: 8, left: 0, right: 0, zIndex: 80, display: "flex", justifyContent: "center", padding: "0 16px", pointerEvents: "none" }}>
      {first && (
        <button type="button" onClick={() => setIds([])} className="geo-toast" aria-label={`Achievement unlocked: ${ids.length > 1 ? `${ids.length} achievements` : first.title}. Close`}
          style={{ pointerEvents: "auto", maxWidth: 360, width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 12, textAlign: "left", cursor: "pointer",
            background: T.surface, border: `1px solid ${tint(T.gold, 0.5)}`, boxShadow: `0 1px 2px ${tint(T.text, 0.05)}, 0 8px 20px -14px ${tint(T.text, 0.25)}` }}>
          <span aria-hidden style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: tint(T.gold, 0.14), border: `1px solid ${tint(T.gold, 0.45)}` }}>
            <LineIcon name={first.icon} size={16} color={T.gold} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="geo-micro" style={{ display: "block", fontSize: 11, color: T.gold }}>Achievement unlocked</span>
            <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: T.text, overflowWrap: "anywhere" }}>
              {ids.length > 1 ? `${first.title} and ${ids.length - 1} more` : first.title}
            </span>
          </span>
          <LineIcon name="close" size={14} color={T.dim} />
        </button>
      )}
    </div>
  )
}
