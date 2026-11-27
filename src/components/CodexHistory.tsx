import type { ReactNode } from 'react'
import type { HistoricalFlag } from '../data/codex'
import { T, ACCENT, FONT, tint } from '../ui/tokens'
import { LineIcon } from './icons'
import { GitBranch } from 'lucide-react'

// The Codex's history browser: a card for the chosen entry, ‹ › to step
// through, and a strip of thumbnails to jump. Shared by a country's Flag
// History (CodexCountry) and its former coats of arms (CodexArms); kept out of
// both so neither pulls in the other's data.

/** A history entry: a flag, or a former coat of arms (which may be undated,
 *  or pale enough to need a backing). */
export type HistoryItem = Omit<HistoricalFlag, 'fromYear' | 'parallel'> & {
  fromYear: number | null
  parallel?: HistoricalFlag[]
  /** Pale and colourless (Afghanistan's white emblem): shown on a slate backing. */
  light?: boolean
}

/** The slate tile behind a pale emblem, so white doesn't vanish into the parchment. */
export const PALE_BACKING = tint(T.text, 0.32)

/** An image that shows a placeholder icon instead of a broken image. */
export function FlagImg({ src, alt, height, pale = false }: { src: string; alt: string; height: number; pale?: boolean }) {
  return (
    <div style={{ width: '100%', height, position: 'relative', overflow: 'hidden', background: T.surfaceHi }}>
      <img
        src={src}
        alt={alt}
        style={pale
          ? { maxWidth: '100%', height: height - 16, margin: '8px auto', objectFit: 'contain', display: 'block', background: PALE_BACKING, borderRadius: 10, padding: 8, boxSizing: 'border-box' }
          : { width: '100%', height, objectFit: 'contain', display: 'block', background: T.surfaceHi }}
        onError={e => {
          const el = e.target as HTMLImageElement
          el.style.display = 'none'
          const placeholder = el.parentElement?.querySelector('.flag-placeholder') as HTMLElement
          if (placeholder) (placeholder as HTMLElement).style.display = 'flex'
        }}
      />
      <div className="flag-placeholder" style={{ display: 'none', position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', background: T.surfaceHi }}>
        <LineIcon name="flag" size={40} color={T.dim} />
      </div>
    </div>
  )
}

/** "1949 — 1956", "1912 — Present", "1826" (a one-year design), "Date unknown". */
export function yearRange(hf: { fromYear: number | null; toYear: number | null }) {
  if (hf.fromYear === null) return 'Date unknown'
  if (hf.toYear === hf.fromYear) return `${hf.fromYear}`
  return hf.toYear === null ? `${hf.fromYear} — Present` : `${hf.fromYear} — ${hf.toYear}`
}

export function FlagHistoryCard({ hf, isFirst, currentLabel = '↑ Current flag', footer }: {
  hf: HistoryItem; isFirst: boolean
  /** The banner over the newest entry. */
  currentLabel?: string
  /** Under the note: a credit line, say. */
  footer?: ReactNode
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${isFirst ? tint(ACCENT.codex, 0.35) : T.line}` }}>
      {isFirst && (
        <div className="flex items-center justify-center gap-1.5 py-1.5"
          style={{ background: tint(ACCENT.codex, 0.1), borderBottom: `1px solid ${tint(ACCENT.codex, 0.2)}` }}>
          <span style={{ color: ACCENT.codex, fontSize: 11, fontWeight: 600 }}>{currentLabel}</span>
        </div>
      )}
      <FlagImg src={hf.flagUrl} alt={hf.label} height={160} pale={hf.light} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="geo-display font-bold text-sm" style={{ color: T.text }}>{hf.label}</div>
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: tint(ACCENT.codex, 0.12), color: ACCENT.codex, border: `1px solid ${tint(ACCENT.codex, 0.25)}`, whiteSpace: 'nowrap', fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums' }}>
            {yearRange(hf)}
          </span>
        </div>
        {hf.note && <p className="text-xs leading-relaxed" style={{ color: T.muted, lineHeight: 1.65 }}>{hf.note}</p>}
        {footer}

        {/* Branch — flags that existed at the same time (e.g. East/West Germany) */}
        {hf.parallel && hf.parallel.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: `1px dashed ${T.lineHi}` }}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <GitBranch size={13} color={T.gold} strokeWidth={1.6} absoluteStrokeWidth />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.gold }}>
                {hf.parallelCaption ?? 'Flown at the same time'}
              </span>
            </div>
            <div className={`grid gap-2.5 ${hf.parallel.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {hf.parallel.map((p, i) => (
                <div key={i} className="rounded-xl overflow-hidden" style={{ background: T.surfaceHi, border: `1px solid ${T.line}` }}>
                  <FlagImg src={p.flagUrl} alt={p.label} height={90} />
                  <div className="p-2.5">
                    <div className="font-semibold mb-0.5" style={{ color: T.text, fontSize: 12 }}>{p.label}</div>
                    <div className="mb-1" style={{ color: ACCENT.codex, fontSize: 10, fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums' }}>{yearRange(p)}</div>
                    <p style={{ color: T.muted, fontSize: 10.5, lineHeight: 1.5 }}>{p.note}</p>
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

/** Card + ‹ › + "Timeline — tap to jump", newest first. The parent owns the
 *  index so it survives the section being closed and opened again. */
export function HistoryBrowser({ history, idx, onIdx, unit = 'flag', currentLabel, footer }: {
  history: HistoryItem[]; idx: number; onIdx: (i: number) => void
  /** For the ‹ › buttons' labels: "Previous flag". */
  unit?: string
  /** The newest entry's banner; null for a list of former ones only. */
  currentLabel?: string | null
  footer?: (i: number) => ReactNode
}) {
  const last = history.length - 1
  const step = (label: string, to: number, disabled: boolean, glyph: string) => (
    <button
      onClick={() => onIdx(to)}
      disabled={disabled}
      aria-label={label}
      className="w-11 h-11 flex items-center justify-center transition-all active:scale-90">
      <span className="w-8 h-8 flex items-center justify-center rounded-full" style={{
        background: T.surface,
        border: `1px solid ${disabled ? T.line : tint(ACCENT.codex, 0.4)}`,
        color: disabled ? T.dim : ACCENT.codex,
        opacity: disabled ? 0.5 : 1,
        fontSize: 18,
      }}>{glyph}</span>
    </button>
  )
  return (
    <div>
      {/* Navigation row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs" style={{ color: T.dim, fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums' }}>
          {idx + 1} / {history.length} · newest → oldest
        </span>
        {/* 44px tap targets around 32px circles; the negative margin
            keeps the row its old height. */}
        <div className="flex" style={{ margin: '-6px -6px -6px 0' }}>
          {step(`Previous ${unit}`, Math.max(0, idx - 1), idx === 0, '‹')}
          {step(`Next ${unit}`, Math.min(last, idx + 1), idx === last, '›')}
        </div>
      </div>

      {/* Main card */}
      <FlagHistoryCard hf={history[idx]} isFirst={idx === 0 && currentLabel !== null}
        currentLabel={currentLabel ?? undefined} footer={footer?.(idx)} />

      {/* Timeline strip */}
      <div className="mt-4">
        <p className="text-xs mb-2" style={{ color: T.dim }}>Timeline — tap to jump</p>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
          {history.map((hf, i) => (
            <button key={i} onClick={() => onIdx(i)}
              style={{
                flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                border: `2px solid ${i === idx ? ACCENT.codex : T.line}`,
                opacity: i === idx ? 1 : 0.55,
                transition: 'opacity 0.2s, border-color 0.2s',
                background: T.surfaceHi,
              }}>
              <img src={hf.flagUrl} alt={hf.label}
                style={{ width: 72, height: 46, objectFit: 'contain', display: 'block', background: hf.light ? PALE_BACKING : T.surfaceHi, padding: hf.light ? 3 : 0, boxSizing: 'border-box' }}
                onError={e => { (e.target as HTMLImageElement).style.opacity = '0.15' }}
              />
              <div style={{ padding: '3px 5px', textAlign: 'center', background: T.surface }}>
                <span style={{ fontSize: 9, fontFamily: FONT.mono, color: i === idx ? ACCENT.codex : T.dim, fontWeight: 600 }}>
                  {hf.fromYear ?? '—'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
