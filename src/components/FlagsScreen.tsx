import { useState } from 'react'
import { FLAGS, REGIONS, getFlagsByRegion } from '../data/flags'
import type { Region } from '../data/flags'
import type { AppState } from '../utils/storage'
import type { HistoricalRegion } from '../data/historicalFlags'
import { T, ACCENT, tint } from '../ui/tokens'
import { ScreenHeader } from './ui'
import { LineIcon, CrownIcon } from './icons'
import { Globe2, Castle, Sun, Mountain, Landmark, Sailboat, MoonStar, ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Props {
  state: AppState
  onBack: () => void
  onStartSet: (setId: string, flags: typeof FLAGS) => void
  onStartHistorical: (region?: HistoricalRegion) => void
  onGoIdentity: () => void
}

interface FlagSet {
  id: string
  label: string
  Icon: LucideIcon
  flags: typeof FLAGS
}

// Map each continent to its broad historical region + a display label.
const HIST: Record<string, { region: HistoricalRegion; label: string }> = {
  Europe:        { region: 'Europe',              label: 'Europe' },
  Africa:        { region: 'Africa & Middle East', label: 'Africa & the Middle East' },
  'Middle East': { region: 'Africa & Middle East', label: 'Africa & the Middle East' },
  Asia:          { region: 'Asia & Oceania',       label: 'Asia & Oceania' },
  Oceania:       { region: 'Asia & Oceania',       label: 'Asia & Oceania' },
  Americas:      { region: 'Americas',             label: 'the Americas' },
}

function buildSets(): FlagSet[] {
  return [
    { id: 'world', label: 'World', Icon: Globe2, flags: FLAGS },
    ...REGIONS.map((r): FlagSet => ({
      id: r.toLowerCase().replace(/\s+/g, '-'),
      label: r,
      Icon: regionIcon(r),
      flags: getFlagsByRegion(r as Region),
    })),
  ]
}

function regionIcon(r: string): LucideIcon {
  const map: Record<string, LucideIcon> = {
    Europe: Castle, Africa: Sun, Asia: Mountain, Americas: Landmark, Oceania: Sailboat, 'Middle East': MoonStar,
  }
  return map[r] ?? Globe2
}

export default function FlagsScreen({ state, onBack, onStartSet, onStartHistorical, onGoIdentity }: Props) {
  const sets = buildSets()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const progressFor = (flags: typeof FLAGS) => {
    const learned = flags.filter(f => state.learnedFlags.includes(f.code)).length
    return { learned, total: flags.length, pct: flags.length ? Math.round((learned / flags.length) * 100) : 0 }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Flag Sets" subtitle="Country, historical & identity sets" onBack={onBack} />

      <div className="flex-1 px-5 pb-8 pt-2 space-y-3">
        {/* Dedicated Identity Flags section — pride, ethnic/pan-national,
            separatist, micronations and maritime/signal flags all live here. */}
        <button onClick={onGoIdentity}
          className="geo-tap w-full flex items-center justify-between px-5 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
          style={{ background: T.surface, border: `1px solid ${tint(ACCENT.learn, 0.3)}` }}>
          <div className="flex items-center gap-3">
            <span style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: tint(ACCENT.learn, 0.12), border: `1px solid ${tint(ACCENT.learn, 0.28)}`,
            }}>
              <LineIcon name="identity" size={20} color={ACCENT.learn} />
            </span>
            <div>
              <div className="geo-display font-bold text-base" style={{ color: T.text }}>Identity Flags</div>
              <div className="text-xs" style={{ color: T.muted }}>Pride · ethnic · separatist · micronations · signal</div>
            </div>
          </div>
          <span style={{ color: ACCENT.learn }}>›</span>
        </button>

        {sets.map(({ id, label, Icon, flags: setFlags }) => {
          const { learned, total, pct } = progressFor(setFlags)
          const hasCrown = state.crowns.includes(id)
          const isOpen = expanded.has(id)
          const hist = HIST[label]

          return (
            <div key={id} className="rounded-2xl overflow-hidden"
              style={{ background: T.surface, border: `1px solid ${hasCrown ? tint(T.gold, 0.45) : T.line}` }}>
              {/* Header — taps straight into the modern-flags set, as usual */}
              <button onClick={() => onStartSet(id, setFlags)}
                className="geo-tap w-full flex flex-col gap-3 px-5 py-4 text-left transition-all active:scale-[0.98]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: tint(ACCENT.learn, 0.12), border: `1px solid ${tint(ACCENT.learn, 0.28)}`,
                    }}>
                      <Icon size={20} color={ACCENT.learn} strokeWidth={1.6} absoluteStrokeWidth />
                    </span>
                    <div>
                      <div className="geo-display font-bold text-base" style={{ color: T.text }}>{label}</div>
                      <div className="text-xs" style={{ color: T.muted }}>{learned}/{total} flags</div>
                    </div>
                  </div>
                  {hasCrown ? <span className="animate-crown-pop" aria-label="Crown earned" style={{ display: 'flex' }}><CrownIcon size={22} color={T.gold} strokeWidth={1.6} /></span> : <span style={{ color: ACCENT.learn }}>›</span>}
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: T.line }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: hasCrown ? T.gold : ACCENT.learn }} />
                </div>
              </button>

              {/* Dashed divider → reveals more sets to learn */}
              <button onClick={() => toggle(id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all"
                style={{ borderTop: `1px dashed ${T.line}`, color: ACCENT.learn }}>
                <span>{isOpen ? 'Hide sets' : 'More sets'}</span>
                <span style={{ display: 'inline-flex', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                  <ChevronDown size={14} color={ACCENT.learn} strokeWidth={1.6} absoluteStrokeWidth />
                </span>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 pt-1 space-y-2">
                  <button onClick={() => onStartSet(id, setFlags)}
                    className="geo-tap w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.98]"
                    style={{ background: T.surfaceHi, border: `1px solid ${T.line}` }}>
                    <LineIcon name="capitalquiz" size={20} color={ACCENT.learn} />
                    <div>
                      <div className="text-sm font-bold" style={{ color: T.text }}>Modern political flags</div>
                      <div className="text-xs" style={{ color: T.muted }}>{total} current national flags</div>
                    </div>
                  </button>
                  <button onClick={() => onStartHistorical(hist?.region)}
                    className="geo-tap w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.98]"
                    style={{ background: T.surfaceHi, border: `1px solid ${tint(T.gold, 0.3)}` }}>
                    <LineIcon name="historical" size={20} color={T.gold} />
                    <div>
                      <div className="text-sm font-bold" style={{ color: T.text }}>
                        Historical Flags{hist ? ` of ${hist.label}` : ''}
                      </div>
                      <div className="text-xs" style={{ color: T.muted }}>Vanished states &amp; past regimes</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
