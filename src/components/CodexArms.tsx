import { useState } from 'react'
import type { CountryArms, ArmsCredit } from '../data/coatsOfArms'
import type { HistoricalFlag } from '../data/codex'
import { T, ACCENT, FONT, tint } from '../ui/tokens'
import { HistoryBrowser } from './CodexHistory'

// One country's coat of arms (or emblem, or seal), opened beneath its row in
// the Codex's "Coats of arms" section: the current one large, then its former
// ones in the same history browser as the flags. Its own chunk, loaded when a
// row first opens (the section's data loads when the section opens).

const FORMER_HEADING: Record<CountryArms['kind'], string> = {
  arms: 'Former coats of arms', emblem: 'Former emblems', seal: 'Former seals', crest: 'Former crests',
}

/** "Image: Wikimedia Commons · Heralder · CC BY-SA 3.0", each part linked. */
function Credit({ c, color }: { c: ArmsCredit; color: string }) {
  const link = { color: tint(color, 0.9), fontWeight: 600 }
  return (
    <p className="text-xs" style={{ color: T.dim, lineHeight: 1.6, marginTop: 8, overflowWrap: 'anywhere' }}>
      Image: <a href={c.commons} target="_blank" rel="noopener noreferrer" style={link}>Wikimedia Commons ↗</a>
      {c.author && <> · {c.author}</>}
      {' · '}
      {c.licenceUrl ? <a href={c.licenceUrl} target="_blank" rel="noopener noreferrer" style={link}>{c.licence}</a> : c.licence}
    </p>
  )
}

export default function ArmsDetail({ arms, color }: { arms: CountryArms; color: string }) {
  const [formerOpen, setFormerOpen] = useState(false)
  const [idx, setIdx] = useState(0)
  const heading = FORMER_HEADING[arms.kind]
  const history: HistoricalFlag[] = arms.former.map(f => ({ fromYear: f.from, toYear: f.to, flagUrl: f.src, label: f.name, note: '' }))
  return (
    <div className="carto-slide-up" style={{ margin: '6px 0 10px', padding: 14, borderRadius: 14, background: T.surfaceHi, border: `1px solid ${tint(color, 0.22)}` }}>
      {/* The emblem */}
      <div className="rounded-xl overflow-hidden mb-3" style={{ border: `1px solid ${T.line}`, background: T.surface }}>
        <img src={arms.src} alt={arms.name}
          style={{ width: '100%', height: 180, objectFit: 'contain', display: 'block', padding: '12px 0' }}
          onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
      </div>

      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="geo-display font-bold text-sm" style={{ color: T.text, margin: 0 }}>{arms.name}</h3>
        {arms.adopted && (
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: tint(ACCENT.codex, 0.12), color: ACCENT.codex, border: `1px solid ${tint(ACCENT.codex, 0.25)}`, whiteSpace: 'nowrap', fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums' }}>
            Adopted {arms.adopted}
          </span>
        )}
      </div>
      {arms.note && <p className="text-xs leading-relaxed mb-1.5" style={{ color: T.text, lineHeight: 1.6 }}>{arms.note}</p>}
      {arms.description && <p className="text-xs leading-relaxed" style={{ color: T.muted, lineHeight: 1.65 }}>{arms.description}</p>}
      {arms.article && (
        <a href={arms.article} target="_blank" rel="noopener noreferrer"
          className="text-xs inline-block mt-1.5" style={{ color: tint(color, 0.9), fontWeight: 600 }}>
          Source: Wikipedia ↗
        </a>
      )}
      <Credit c={arms} color={color} />

      {/* Former ones — the flag history's browser, or "coming soon" */}
      <div className="mt-3">
        {history.length > 0 ? (
          <>
            <button onClick={() => setFormerOpen(v => !v)} aria-expanded={formerOpen}
              className="geo-tap w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
              style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT.codex, margin: 0 }}>{heading}</h4>
                <span className="text-xs" style={{ color: T.muted, fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums' }}>{history.length}</span>
              </div>
              <span className="codex-chev" style={{ color: ACCENT.codex, transform: formerOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
            </button>
            {formerOpen && (
              <div className="mt-3">
                <HistoryBrowser history={history} idx={idx} onIdx={setIdx} unit="emblem" currentLabel={null}
                  footer={i => <Credit c={arms.former[i]} color={color} />} />
              </div>
            )}
          </>
        ) : (
          // Not a button: there's nothing to open yet.
          <div className="w-full flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: T.surface, border: `1px dashed ${T.line}` }}>
            <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: T.dim, margin: 0 }}>{heading}</h4>
            <span className="text-xs" style={{ color: T.dim }}>Coming soon</span>
          </div>
        )}
      </div>
    </div>
  )
}
