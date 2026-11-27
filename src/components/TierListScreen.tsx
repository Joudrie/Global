import { useState, useEffect, useMemo } from 'react'
import { FLAGS, REGIONS, getFlagsByRegion } from '../data/flags'
import type { Region } from '../data/flags'
import { T, ACCENT, FONT, tint } from '../ui/tokens'
import { ScreenHeader } from './ui'
import { SUBCATEGORIES, migrateOther, tierKey } from '../utils/tierList'
import type { Placement, SubId, TierChip } from '../utils/tierList'

interface Props { onBack: () => void }

type TierId = 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
// Rank colours are game content (the classic S→F rainbow) — kept distinct,
// dark ink label on top works on every hue.
const TIERS: { id: TierId; color: string }[] = [
  { id: 'S', color: '#F43F5E' },
  { id: 'A', color: '#FB923C' },
  { id: 'B', color: '#FBBF24' },
  { id: 'C', color: '#34D399' },
  { id: 'D', color: '#38BDF8' },
  { id: 'F', color: '#8B6CFF' },
]
const TIER_LABEL_INK = '#1F2430'
const POOL = 'pool'
const A = ACCENT.play

// A list: the world, a region, or one of the lists beyond countries
// (src/utils/tierList.ts). Each is saved as globalio_tierlist_<id>.
type Choice = 'World' | Region | SubId
interface ListOption { id: Choice; label: string; title: string; flags: () => TierChip[] }
const countryChips = (list: typeof FLAGS): TierChip[] => list.map(f => ({ code: f.code, flagUrl: f.flagUrl, name: f.name }))
const OPTIONS: ListOption[] = [
  { id: 'World', label: 'World', title: 'Every country', flags: () => countryChips(FLAGS) },
  ...REGIONS.map((r): ListOption => ({ id: r, label: r, title: r, flags: () => countryChips(getFlagsByRegion(r)) })),
  ...SUBCATEGORIES.map((s): ListOption => ({ id: s.id, label: s.label, title: s.title, flags: () => s.flags })),
]
const optionOf = (c: Choice) => OPTIONS.find(o => o.id === c) ?? OPTIONS[0]

function loadPlacement(c: Choice): Placement {
  try {
    const v = JSON.parse(localStorage.getItem(tierKey(c)) ?? '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch { return {} }
}
function savePlacement(c: Choice, p: Placement) {
  try { localStorage.setItem(tierKey(c), JSON.stringify(p)) } catch { /* not saved */ }
}
function openStorage() {
  // The old mixed list, from before the subcategories, moves into them.
  try { migrateOther(localStorage) } catch { /* storage unavailable */ }
}

const STYLES = `
  .tl-chip { transition: background-color 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out; }
  .tl-chip:focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 2px; }
  @media (hover: hover) { .tl-chip[aria-pressed="false"]:hover { border-color: ${T.lineHi}; color: ${T.text}; } }
  @media (prefers-reduced-motion: reduce) { .tl-chip { transition: none; } }
`

function FlagChip({ chip, selected, onPick, onDragStart, onDragEnd }:
  { chip: TierChip; selected: boolean; onPick: (code: string) => void; onDragStart: (code: string) => void; onDragEnd: () => void }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(chip.code)}
      onDragEnd={onDragEnd}
      onClick={e => {
        // Handle the tap here so it doesn't also reach the tier behind the chip
        // (that moved the previously selected flag instead of selecting this one).
        e.stopPropagation()
        onPick(chip.code)
      }}
      title={chip.name}
      data-flag={chip.code}
      style={{
        position: 'relative', cursor: 'grab', borderRadius: 4, overflow: 'hidden',
        outline: selected ? `2px solid ${A}` : `1px solid ${T.line}`, outlineOffset: selected ? 1 : 0,
        flexShrink: 0, lineHeight: 0,
      }}
    >
      <img src={chip.flagUrl} alt={chip.name} width={42} height={28} loading="lazy" decoding="async"
        style={{ display: 'block', objectFit: 'cover', width: 42, height: 28 }}
        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.25' }} />
    </div>
  )
}

export default function TierListScreen({ onBack }: Props) {
  const [choice, setChoice] = useState<Choice>('Europe')
  const [placement, setPlacement] = useState<Placement>(() => { openStorage(); return loadPlacement('Europe') })
  const [selected, setSelected] = useState<string | null>(null)
  const [dragged, setDragged] = useState<string | null>(null)

  const option = optionOf(choice)
  // Only this list's flags are built and drawn.
  const flags = useMemo(() => option.flags(), [option])

  const switchTo = (c: Choice) => {
    if (c === choice) return
    setChoice(c)
    setPlacement(loadPlacement(c))
    setSelected(null)
    setConfirmReset(false)
  }

  const place = (code: string, tier: string) => {
    const next = { ...placement, [code]: tier }
    setPlacement(next)
    savePlacement(choice, next)
    setSelected(null)
  }

  // When a tier (or the pool) is tapped while a flag is selected, move it there.
  const tapZone = (tier: string) => { if (selected) place(selected, tier) }

  const pick = (code: string) => {
    const zone = placement[code] ?? POOL
    if (selected && selected !== code && (placement[selected] ?? POOL) !== zone) place(selected, zone)
    else setSelected(s => (s === code ? null : code))
  }

  const byZone = useMemo(() => {
    const m = new Map<string, TierChip[]>()
    for (const f of flags) {
      const z = placement[f.code] ?? POOL
      const list = m.get(z)
      if (list) list.push(f); else m.set(z, [f])
    }
    return m
  }, [flags, placement])
  const flagsIn = (tier: string) => byZone.get(tier) ?? []

  // Reset wipes this list, so it takes a second tap to confirm.
  const [confirmReset, setConfirmReset] = useState(false)
  useEffect(() => {
    if (!confirmReset) return
    const t = window.setTimeout(() => setConfirmReset(false), 3000)
    return () => window.clearTimeout(t)
  }, [confirmReset])
  const resetAll = () => {
    if (!confirmReset) { setConfirmReset(true); return }
    setPlacement({}); savePlacement(choice, {}); setSelected(null); setConfirmReset(false)
  }

  const chip = (f: TierChip) => (
    <FlagChip key={f.code} chip={f} selected={selected === f.code} onPick={pick}
      onDragStart={setDragged} onDragEnd={() => setDragged(null)} />
  )

  const dropProps = (tier: string) => ({
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: () => { if (dragged) place(dragged, tier) },
    onClick: () => tapZone(tier),
  })

  const left = flagsIn(POOL).length

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text, position: 'relative', zIndex: 1 }}>
      <style>{STYLES}</style>
      <ScreenHeader title="Tier List Maker"
        subtitle="Drag flags into tiers — or tap a flag, then tap a tier"
        onBack={onBack}
        right={
          <button onClick={resetAll} className="px-3 h-9 rounded-full text-xs font-bold geo-tap"
            style={{ background: confirmReset ? T.danger : T.surface, border: `1px solid ${tint(T.danger, 0.35)}`, color: confirmReset ? T.onAccent : T.danger, cursor: 'pointer', minHeight: 44 }}>{confirmReset ? "Tap again to clear" : "Reset"}</button>
        } />

      {/* Which list: countries by region, then the lists beyond countries */}
      <div className="px-4 pb-2" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div role="group" aria-label="Which flags" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {OPTIONS.map(o => {
            const on = choice === o.id
            return (
              <button key={o.id} type="button" onClick={() => switchTo(o.id)} aria-pressed={on} className="tl-chip"
                style={{
                  padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, minHeight: 28,
                  border: `1px solid ${on ? A : T.line}`,
                  background: on ? tint(A, 0.15) : 'transparent',
                  color: on ? A : T.muted, cursor: 'pointer',
                }}>{o.label}</button>
            )
          })}
        </div>
        <div style={{ fontSize: 12, color: T.muted }}>
          <span style={{ fontWeight: 700, color: T.text }}>{option.title}</span> · {flags.length} flags
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {/* Tier rows */}
        {TIERS.map(t => (
          <div key={t.id} style={{ display: 'flex', marginBottom: 6, minHeight: 46, borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.line}` }}>
            <div
              {...dropProps(t.id)}
              style={{
                width: 46, flexShrink: 0, background: t.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 22, fontFamily: FONT.display, color: TIER_LABEL_INK,
                cursor: selected ? 'pointer' : 'default',
              }}>{t.id}</div>
            <div
              {...dropProps(t.id)}
              data-tier={t.id}
              style={{
                flex: 1, minWidth: 0, background: T.surface, display: 'flex', flexWrap: 'wrap', gap: 4,
                alignContent: 'flex-start', padding: 5, minHeight: 46,
              }}>
              {flagsIn(t.id).map(chip)}
            </div>
          </div>
        ))}

        {/* Unranked pool */}
        <div style={{ marginTop: 14 }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: T.muted }}>
            Unranked {selected ? '· tap a tier to place the selected flag' : `· ${left} left`}
          </div>
          <div {...dropProps(POOL)} data-tier={POOL}
            style={{
              background: T.surfaceHi, borderRadius: 12, border: `1px dashed ${T.lineHi}`,
              display: 'flex', flexWrap: 'wrap', gap: 5, padding: 8, minHeight: 70,
            }}>
            {flagsIn(POOL).map(chip)}
            {left === 0 && (
              <div style={{ color: T.dim, fontSize: 13, padding: 8 }}>Every flag has been ranked.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
