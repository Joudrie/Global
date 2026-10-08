import worldMap from "@svg-maps/world"
import { FLAGS, REGIONS } from "../data/flags"
import type { AppState } from "../utils/storage"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { Lightbulb } from "lucide-react"

interface Props {
  state: AppState
  onBack: () => void
}

const LIT = T.amber        // learned country (ochre on parchment)
const UNLIT = T.line       // not yet learned
const OCEAN = T.bg

export default function ProgressMapScreen({ state, onBack }: Props) {
  const learned = new Set(state.learnedFlags)
  const litCount = state.learnedFlags.length
  const worldPct = FLAGS.length ? litCount / FLAGS.length : 0

  const stats = REGIONS.map(region => {
    const inRegion = FLAGS.filter(f => f.region === region)
    const got = inRegion.filter(f => learned.has(f.code)).length
    return { region, total: inRegion.length, got, pct: inRegion.length ? got / inRegion.length : 0 }
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text, position: "relative", zIndex: 1 }}>
      <ScreenHeader title="Progress Map" subtitle="Learn a flag and its country lights up — forever" onBack={onBack} />

      {/* Real world map — each learned country fills ochre */}
      <div className="px-4 pt-2">
        <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${T.line}`, background: OCEAN }}>
          <svg viewBox={worldMap.viewBox} width="100%" style={{ display: "block" }}>
            {worldMap.locations.map(loc => {
              const lit = learned.has(loc.id.toUpperCase())
              return (
                <path
                  key={loc.id}
                  d={loc.path}
                  fill={lit ? LIT : UNLIT}
                  stroke={OCEAN}
                  strokeWidth={0.4}
                  style={lit ? { filter: `drop-shadow(0 0 1.2px ${tint(LIT, 0.9)})` } : undefined}
                />
              )
            })}
          </svg>
        </div>
        <div className="text-center mt-3 mb-1">
          <span className="text-2xl font-black" style={{ color: LIT, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" }}>{litCount}</span>
          <span className="text-sm" style={{ color: T.muted }}> / {FLAGS.length} countries lit up</span>
        </div>
        <div className="text-center text-xs mb-4" style={{ color: ACCENT.codex, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" }}>{Math.round(worldPct * 100)}% of the world</div>
      </div>

      {/* Region progress */}
      <div className="px-5 pb-10 space-y-2">
        {stats.slice().sort((a, b) => b.pct - a.pct).map(s => {
          const done = s.got === s.total
          return (
            <div key={s.region} className="px-4 py-2.5 rounded-xl" style={{ background: T.surface, border: `1px solid ${done ? tint(T.amber, 0.45) : T.line}` }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold" style={{ color: T.text }}>
                  {s.region} {done && (
                    <span className="text-xs" style={{ color: LIT, display: "inline-flex", alignItems: "center", gap: 3, verticalAlign: "middle" }}>
                      <Lightbulb size={12} color={LIT} strokeWidth={1.6} absoluteStrokeWidth /> lit
                    </span>
                  )}
                </span>
                <span className="text-xs font-semibold" style={{ color: done ? LIT : ACCENT.codex, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" }}>{s.got} / {s.total}</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: T.line }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${s.pct * 100}%`, background: T.amber, boxShadow: s.pct > 0 ? `0 0 8px ${tint(T.amber, 0.4)}` : "none" }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
