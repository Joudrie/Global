import { useState, useEffect } from 'react'
import { FLAGS, REGIONS, getFlagsByRegion } from '../data/flags'
import type { Region } from '../data/flags'
import { OTHER_IDENTITY_FLAGS } from '../data/identityFlags'
import { T, ACCENT, FONT, tint } from '../ui/tokens'
import { ScreenHeader } from './ui'

interface Props { onBack: () => void }

interface Chip { code: string; flagUrl: string; name: string }

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

type RegionChoice = 'World' | 'Other' | Region
const REGION_OPTS: RegionChoice[] = ['World', ...REGIONS, 'Other']

// Identity / non-country flags, normalised to the chip shape (keyed by id).
const OTHER_CHIPS: Chip[] = OTHER_IDENTITY_FLAGS.map(f => ({ code: f.id, flagUrl: f.flagUrl, name: f.name }))

const keyFor = (r: RegionChoice) => `globalio_tierlist_${r}`
function loadPlacement(r: RegionChoice): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(keyFor(r)) ?? '{}') } catch { return {} }
}

export default function TierListScreen({ onBack }: Props) {
  const [region, setRegion] = useState<RegionChoice>('Europe')
  const [placement, setPlacement] = useState<Record<string, string>>(() => loadPlacement('Europe'))
  const [selected, setSelected] = useState<string | null>(null)
  const [dragged, setDragged] = useState<string | null>(null)

  const flags: Chip[] = region === 'Other' ? OTHER_CHIPS
    : (region === 'World' ? FLAGS : getFlagsByRegion(region as Region)).map(f => ({ code: f.code, flagUrl: f.flagUrl, name: f.name }))

  // Load this region's saved list whenever the region changes.
  useEffect(() => { setPlacement(loadPlacement(region)); setSelected(null) }, [region])
  // Persist on every change.
  useEffect(() => { try { localStorage.setItem(keyFor(region), JSON.stringify(placement)) } catch { /* not saved */ } }, [placement, region])

  const place = (code: string, tier: string) => {
    setPlacement(p => ({ ...p, [code]: tier }))
    setSelected(null)
  }

  // When a tier (or the pool) is tapped while a flag is selected, move it there.
  const tapZone = (tier: string) => { if (selected) place(selected, tier) }

  const flagsIn = (tier: string) =>
    flags.filter(f => (placement[f.code] ?? POOL) === tier)

  // Reset wipes this region's saved list, so it takes a second tap to confirm.
  const [confirmReset, setConfirmReset] = useState(false)
  useEffect(() => {
    if (!confirmReset) return
    const t = window.setTimeout(() => setConfirmReset(false), 3000)
    return () => window.clearTimeout(t)
  }, [confirmReset])
  const resetAll = () => {
    if (!confirmReset) { setConfirmReset(true); return }
    setPlacement({}); setSelected(null); setConfirmReset(false)
  }

  const FlagChip = ({ code, url, name }: { code: string; url: string; name: string }) => (
    <div
      draggable
      onDragStart={() => setDragged(code)}
      onDragEnd={() => setDragged(null)}
      onClick={e => {
        // Handle the tap here so it doesn't also reach the tier behind the chip
        // (that moved the previously selected flag instead of selecting this one).
        e.stopPropagation()
        const zone = placement[code] ?? POOL
        if (selected && selected !== code && (placement[selected] ?? POOL) !== zone) place(selected, zone)
        else setSelected(s => (s === code ? null : code))
      }}
      title={name}
      style={{
        position: 'relative', cursor: 'grab', borderRadius: 5, overflow: 'hidden',
        outline: selected === code ? `2px solid ${ACCENT.play}` : `1px solid ${T.line}`,
        boxShadow: selected === code ? `0 0 10px ${tint(ACCENT.play, 0.6)}` : 'none',
        flexShrink: 0, lineHeight: 0,
      }}
    >
      <img src={url} alt={name} width={42} height={28}
        style={{ display: 'block', objectFit: 'cover', width: 42, height: 28 }}
        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.25' }} />
    </div>
  )

  const dropProps = (tier: string) => ({
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: () => { if (dragged) place(dragged, tier) },
    onClick: () => tapZone(tier),
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text, position: 'relative', zIndex: 1 }}>
      <ScreenHeader title="Tier List Maker"
        subtitle="Drag flags into tiers — or tap a flag, then tap a tier"
        onBack={onBack}
        right={
          <button onClick={resetAll} className="px-3 h-9 rounded-full text-xs font-bold geo-tap"
            style={{ background: confirmReset ? T.danger : T.surface, border: `1px solid ${tint(T.danger, 0.35)}`, color: confirmReset ? T.onAccent : T.danger, cursor: 'pointer', minHeight: 44 }}>{confirmReset ? "Tap again to clear" : "Reset"}</button>
        } />

      {/* Region selector */}
      <div className="px-5 pb-2" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {REGION_OPTS.map(r => (
          <button key={r} onClick={() => setRegion(r)}
            style={{
              padding: '4px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              border: `1px solid ${region === r ? ACCENT.play : T.line}`,
              background: region === r ? tint(ACCENT.play, 0.15) : 'transparent',
              color: region === r ? ACCENT.play : T.muted, cursor: 'pointer',
            }}>{r}</button>
        ))}
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
              style={{
                flex: 1, background: T.surface, display: 'flex', flexWrap: 'wrap', gap: 4,
                alignContent: 'flex-start', padding: 5, minHeight: 46,
              }}>
              {flagsIn(t.id).map(f => <FlagChip key={f.code} code={f.code} url={f.flagUrl} name={f.name} />)}
            </div>
          </div>
        ))}

        {/* Unranked pool */}
        <div style={{ marginTop: 14 }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: T.muted }}>
            Unranked {selected ? '· tap a tier to place the selected flag' : `· ${flagsIn(POOL).length} left`}
          </div>
          <div {...dropProps(POOL)}
            style={{
              background: T.surfaceHi, borderRadius: 12, border: `1px dashed ${T.lineHi}`,
              display: 'flex', flexWrap: 'wrap', gap: 5, padding: 8, minHeight: 70,
            }}>
            {flagsIn(POOL).map(f => <FlagChip key={f.code} code={f.code} url={f.flagUrl} name={f.name} />)}
            {flagsIn(POOL).length === 0 && (
              <div style={{ color: T.dim, fontSize: 13, padding: 8 }}>Every flag has been ranked.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
