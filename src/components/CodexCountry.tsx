import { useState, useEffect } from 'react'
import type { FlagRecord } from '../data/flags'
import { CODEX } from '../data/codex'
import type { HistoricalFlag } from '../data/codex'
import { UK_NATIONS } from '../data/ukNations'
import type { UKNation } from '../data/ukNations'
import { TERRITORIES } from '../data/territories'
import type { Territory } from '../data/territories'
import { historicalFor } from '../data/historicalFlags'
import { CHALLENGE_CONTINENTS } from '../data/challenges'
import type { SubRegion } from '../data/challenges'
import { commonsSource } from '../utils/commons'
type Facts = typeof import('../data/curatedFacts')
import { T, ACCENT, FONT, tint } from '../ui/tokens'
import { LineIcon } from './icons'
import { ChevronDown, GitBranch, Crown } from 'lucide-react'

// One country's Codex entry, opened beneath its row in the Codex list. Its own
// chunk: the codex, history and subdivision data load when a country opens
// (CodexScreen starts loading it as soon as a region is expanded).

// Look up sub-regions for a country code across all challenge continents
function getSubRegions(code: string) {
  for (const cont of CHALLENGE_CONTINENTS) {
    const country = cont.countries.find(c => c.code === code)
    if (country && country.subRegions.length > 0) return country.subRegions
  }
  return []
}

// ── Inline country overview — expands beneath the row so browsing never
// leaves the page. Quick-jot sized: short clamped overview up top, the deep
// dives (history · subdivisions · predecessors) as collapsibles, trivia last.
export default function CountryDetail({ flag }: { flag: FlagRecord }) {
  const entry = CODEX[flag.code]
  const [sumExpanded, setSumExpanded] = useState(false)
  const [triviaExpanded, setTriviaExpanded] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [historyIdx, setHistoryIdx] = useState(0)
  const [subdivisionsExpanded, setSubdivisionsExpanded] = useState(false)
  const [predecessorsExpanded, setPredecessorsExpanded] = useState(false)
  const history = entry?.flagHistory ?? []
  const hasHistory = history.length > 0
  const subRegions = getSubRegions(flag.code)
  const hasSubdivisions = subRegions.length > 0
  const predecessors = historicalFor(flag.code)

  return (
    <div className="carto-slide-up" style={{ margin: '6px 0 10px', padding: 14, borderRadius: 14, background: T.surfaceHi, border: `1px solid ${tint(ACCENT.codex, 0.22)}` }}>
      {/* Flag */}
      <div className="rounded-xl overflow-hidden mb-3" style={{ border: `1px solid ${T.line}` }}>
        <img
          src={flag.flagUrl}
          alt={flag.name}
          style={{ width: '100%', height: 140, objectFit: 'contain', display: 'block', background: T.surface, padding: '8px 0' }}
          onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }}
        />
      </div>

      {/* Overview — short by default, tap for the full story */}
      {entry?.summary && (
        <div className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: ACCENT.codex }}>Overview</h2>
          <p className="text-xs leading-relaxed" style={{
            color: T.text, fontSize: 12.5, lineHeight: 1.6,
            ...(sumExpanded ? {} : { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }),
          }}>
            {entry.summary}
          </p>
          <button onClick={() => setSumExpanded(v => !v)} className="text-xs mt-1" style={{ color: ACCENT.codex, background: 'transparent', fontWeight: 600, padding: '2px 0' }}>
            {sumExpanded ? 'show less' : 'read more'}
          </button>
        </div>
      )}

      {/* Subdivisions — collapsible */}
      {hasSubdivisions && (
        <div className="mb-3">
          <button
            onClick={() => setSubdivisionsExpanded(v => !v)}
            aria-expanded={subdivisionsExpanded}
            className="geo-tap w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
            style={{ background: T.surface, border: `1px solid ${tint(T.green, 0.3)}` }}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: T.green }}>Subdivisions</h2>
              <span className="text-xs" style={{ color: T.muted }}>{subRegions.length} regions</span>
            </div>
            <span style={{ color: T.green, transition: 'transform 0.2s', transform: subdivisionsExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
          </button>

          {subdivisionsExpanded && (
            <SubdivisionGrid
              subRegions={subRegions}
              confirmedNoFlags={NO_SUBDIVISION_FLAG_COUNTRIES.has(flag.code)}
              headerLabel={flag.code === 'IE' ? 'Province' : flag.code === 'GB' ? 'Nation' : undefined}
              memberLabel={flag.code === 'IE' ? 'Counties' : flag.code === 'GB' ? 'Council areas' : undefined}
            />
          )}
        </div>
      )}

      {/* United Kingdom — drill down into its four constituent nations. The one
          country that gets this treatment. */}
      {flag.code === 'GB' && <UKNationsSection />}

      {/* Flag History — collapsible */}
      <div className="mb-3">
        <button
          onClick={() => setHistoryExpanded(v => !v)}
          aria-expanded={historyExpanded}
          className="geo-tap w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
          style={{ background: T.surface, border: `1px solid ${T.line}` }}
        >
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT.codex }}>Flag History</h2>
            {hasHistory && (
              <span className="text-xs" style={{ color: T.muted, fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums' }}>{history.length} flags</span>
            )}
          </div>
          <span style={{ color: ACCENT.codex, transition: 'transform 0.2s', transform: historyExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
        </button>

        {historyExpanded && (
          <div className="mt-3">
            {!hasHistory ? (
              <div className="rounded-2xl p-5 text-center"
                style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                <div className="mb-2 flex justify-center"><LineIcon name="flags" size={30} color={T.dim} /></div>
                <p className="text-sm" style={{ color: T.muted }}>No earlier national flags are recorded for {flag.name}.</p>
              </div>
            ) : (
              <div>
                {/* Navigation row */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs" style={{ color: T.dim, fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums' }}>
                    {historyIdx + 1} / {history.length} · newest → oldest
                  </span>
                  {/* 44px tap targets around 32px circles; the negative margin
                      keeps the row its old height. */}
                  <div className="flex" style={{ margin: '-6px -6px -6px 0' }}>
                    <button
                      onClick={() => setHistoryIdx(i => Math.max(0, i - 1))}
                      disabled={historyIdx === 0}
                      aria-label="Previous flag"
                      className="w-11 h-11 flex items-center justify-center transition-all active:scale-90">
                      <span className="w-8 h-8 flex items-center justify-center rounded-full" style={{
                        background: T.surface,
                        border: `1px solid ${historyIdx === 0 ? T.line : tint(ACCENT.codex, 0.4)}`,
                        color: historyIdx === 0 ? T.dim : ACCENT.codex,
                        opacity: historyIdx === 0 ? 0.5 : 1,
                        fontSize: 18,
                      }}>‹</span>
                    </button>
                    <button
                      onClick={() => setHistoryIdx(i => Math.min(history.length - 1, i + 1))}
                      disabled={historyIdx === history.length - 1}
                      aria-label="Next flag"
                      className="w-11 h-11 flex items-center justify-center transition-all active:scale-90">
                      <span className="w-8 h-8 flex items-center justify-center rounded-full" style={{
                        background: T.surface,
                        border: `1px solid ${historyIdx === history.length - 1 ? T.line : tint(ACCENT.codex, 0.4)}`,
                        color: historyIdx === history.length - 1 ? T.dim : ACCENT.codex,
                        opacity: historyIdx === history.length - 1 ? 0.5 : 1,
                        fontSize: 18,
                      }}>›</span>
                    </button>
                  </div>
                </div>

                {/* Main card */}
                <FlagHistoryCard hf={history[historyIdx]} isFirst={historyIdx === 0} />

                {/* Timeline strip */}
                <div className="mt-4">
                  <p className="text-xs mb-2" style={{ color: T.dim }}>Timeline — tap to jump</p>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                    {history.map((hf: HistoricalFlag, i: number) => (
                      <button key={i} onClick={() => setHistoryIdx(i)}
                        style={{
                          flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                          border: `2px solid ${i === historyIdx ? ACCENT.codex : T.line}`,
                          opacity: i === historyIdx ? 1 : 0.55,
                          transition: 'opacity 0.2s, border-color 0.2s',
                          background: T.surfaceHi,
                        }}>
                        <img src={hf.flagUrl} alt={hf.label}
                          style={{ width: 72, height: 46, objectFit: 'contain', display: 'block', background: T.surfaceHi }}
                          onError={e => { (e.target as HTMLImageElement).style.opacity = '0.15' }}
                        />
                        <div style={{ padding: '3px 5px', textAlign: 'center', background: T.surface }}>
                          <span style={{ fontSize: 9, fontFamily: FONT.mono, color: i === historyIdx ? ACCENT.codex : T.dim, fontWeight: 600 }}>
                            {hf.fromYear}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Territories & dependencies — present-day dependent territories */}
      {TERRITORIES[flag.code]?.length > 0 && <TerritoriesSection territories={TERRITORIES[flag.code]} />}

      {/* Predecessor & related states — collapsible */}
      {predecessors.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setPredecessorsExpanded(v => !v)}
            aria-expanded={predecessorsExpanded}
            className="geo-tap w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
            style={{ background: T.surface, border: `1px solid ${tint(T.warm, 0.3)}` }}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: T.warm }}>Predecessor & Related States</h2>
              <span className="text-xs" style={{ color: T.muted }}>{predecessors.length}</span>
            </div>
            <span style={{ color: T.warm, transition: 'transform 0.2s', transform: predecessorsExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
          </button>

          {predecessorsExpanded && (
            <div className="mt-3">
              <p className="text-xs mb-3" style={{ color: tint(T.warm, 0.7) }}>
                Vanished empires and states tied to this land's history — featured in the Historical Flag game.
              </p>
              <div className="space-y-2.5">
                {predecessors.map(h => (
                  <div key={h.id} className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${tint(T.warm, 0.2)}` }}>
                    <FlagImg src={h.flagUrl} alt={h.name} height={120} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="geo-display font-bold text-sm" style={{ color: T.text }}>{h.name}</div>
                        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: tint(T.warm, 0.12), color: T.warm, border: `1px solid ${tint(T.warm, 0.25)}`, whiteSpace: 'nowrap' }}>
                          {h.era}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: T.muted, lineHeight: 1.65 }}>{h.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trivia — quiet expandable; just the label and an arrow until opened */}
      {(flag.funFact || flag.distinguishingTip) && (
        <div>
          <button onClick={() => setTriviaExpanded(v => !v)} aria-expanded={triviaExpanded}
            className="geo-tap w-full flex items-center justify-between px-1 py-2"
            style={{ background: 'transparent' }}>
            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: T.gold }}>
              <LineIcon name="funfact" size={13} color={T.gold} /> Did you know?
            </span>
            <ChevronDown size={15} color={T.gold} strokeWidth={1.6} absoluteStrokeWidth
              style={{ transition: 'transform 0.2s', transform: triviaExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>
          {triviaExpanded && (
            <div className="carto-slide-up">
              {flag.funFact && (
                <p className="text-xs leading-relaxed px-1 pt-1" style={{ color: T.text, lineHeight: 1.6 }}>{flag.funFact}</p>
              )}
              {flag.distinguishingTip && (
                <div className="mt-2.5 rounded-xl" style={{ background: T.surface, border: `1px solid ${T.line}`, padding: '10px 12px' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: ACCENT.codex }}>How to tell it apart</div>
                  <p className="text-xs leading-relaxed" style={{ color: T.muted, lineHeight: 1.6 }}>{flag.distinguishingTip}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── United Kingdom drill-down — England · Scotland · Wales · N. Ireland ──
// The UK is effectively four nations; clicking it opens a purple-outlined
// section where each constituent country expands into its own flag history
// (Wessex, Mercia, the Lion Rampant, Glyndŵr's banner…).
function UKNationsSection() {
  const [open, setOpen] = useState(false)
  const [openNation, setOpenNation] = useState<string | null>(null)
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="geo-tap w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
        style={{ background: tint(T.violet, 0.08), border: `1px solid ${tint(T.violet, 0.5)}` }}
      >
        <div className="flex items-center gap-2 text-left">
          <Crown size={15} color={T.violet} strokeWidth={1.6} absoluteStrokeWidth />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: T.violet }}>Constituent Nations</h2>
            <span className="text-xs" style={{ color: tint(T.violet, 0.75) }}>
              {open ? 'England · Scotland · Wales · N. Ireland' : 'Click here to expand — 4 nations'}
            </span>
          </div>
        </div>
        <span style={{ color: T.violet, transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
      </button>

      {open && (
        <div className="mt-2.5 space-y-2">
          {UK_NATIONS.map(nation => {
            const isOpen = openNation === nation.key
            const current = nation.flagHistory[0]
            return (
              <div key={nation.key} className="rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${isOpen ? tint(T.violet, 0.45) : T.line}` }}>
                <button
                  onClick={() => setOpenNation(o => o === nation.key ? null : nation.key)}
                  aria-expanded={isOpen}
                  className="geo-tap w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all active:scale-[0.99]"
                  style={{ background: isOpen ? tint(T.violet, 0.06) : 'transparent' }}
                >
                  <img src={current.flagUrl} alt={nation.name}
                    style={{ width: 46, height: 30, objectFit: 'contain', borderRadius: 5, border: `1px solid ${T.line}`, flexShrink: 0, background: T.surfaceHi }}
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: T.text }}>{nation.name}</div>
                    <div className="text-xs truncate" style={{ color: T.muted, marginTop: 1 }}>{nation.emblem}</div>
                  </div>
                  <span className="text-xs" style={{ color: tint(T.violet, 0.8), fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{nation.flagHistory.length} flags</span>
                  <span style={{ color: T.violet, fontSize: 16, transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>›</span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 pt-1">
                    <NationHistory nation={nation} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// A compact flag-history browser for one UK nation — selected card + tappable
// timeline strip, reusing the same FlagHistoryCard as the country view.
function NationHistory({ nation }: { nation: UKNation }) {
  const [idx, setIdx] = useState(0)
  const history = nation.flagHistory
  return (
    <div>
      <FlagHistoryCard hf={history[idx]} isFirst={idx === 0} />
      <div className="mt-3">
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
          {history.map((hf, i) => (
            <button key={i} onClick={() => setIdx(i)}
              style={{
                flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                border: `2px solid ${i === idx ? T.violet : T.line}`,
                opacity: i === idx ? 1 : 0.55,
                transition: 'opacity 0.2s, border-color 0.2s',
                background: T.surfaceHi,
              }}>
              <img src={hf.flagUrl} alt={hf.label}
                style={{ width: 72, height: 46, objectFit: 'contain', display: 'block', background: T.surfaceHi }}
                onError={e => { (e.target as HTMLImageElement).style.opacity = '0.15' }} />
              <div style={{ padding: '3px 5px', textAlign: 'center', background: T.surface }}>
                <span style={{ fontSize: 9, fontFamily: FONT.mono, color: i === idx ? T.violet : T.dim, fontWeight: 600 }}>{hf.fromYear}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Territories & dependencies — present-day dependent territories ──
// Crown Dependencies & British Overseas Territories under the UK, the Caribbean
// constituent countries under the Netherlands, French overseas collectivities,
// US insular areas, etc. Grouped where the data carries a `group` label.
function TerritoriesSection({ territories }: { territories: Territory[] }) {
  const [open, setOpen] = useState(false)
  // Preserve insertion order while collecting groups.
  const groups: { label: string | undefined; items: Territory[] }[] = []
  for (const t of territories) {
    let g = groups.find(g => g.label === t.group)
    if (!g) { g = { label: t.group, items: [] }; groups.push(g) }
    g.items.push(t)
  }
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="geo-tap w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
        style={{ background: T.surface, border: `1px solid ${tint(T.cyan, 0.35)}` }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: T.cyan }}>Territories &amp; Dependencies</h2>
          <span className="text-xs" style={{ color: T.muted }}>{territories.length}</span>
        </div>
        <span style={{ color: T.cyan, transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
      </button>

      {open && (
        <div className="mt-3">
          <p className="text-xs mb-3" style={{ color: tint(T.cyan, 0.75) }}>
            Present-day territories and dependencies — self-governing or administered, but not sovereign countries of their own.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {groups.map((g, gi) => (
              <div key={gi}>
                {g.label && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.cyan, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>
                    {g.label}
                  </div>
                )}
                <div className="space-y-2.5">
                  {g.items.map((t, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${tint(T.cyan, 0.2)}` }}>
                      <div className="flex items-stretch gap-0">
                        <div style={{ width: 96, flexShrink: 0, background: T.surfaceHi, borderRight: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                          {t.noFlag ? (
                            <span style={{ fontSize: 9, fontWeight: 700, color: T.dim, textAlign: 'center', lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>No flag</span>
                          ) : (
                            <img src={t.flagUrl} alt={t.name}
                              style={{ width: '100%', maxHeight: 56, objectFit: 'contain', borderRadius: 3 }}
                              onError={e => { (e.target as HTMLImageElement).style.opacity = '0.25' }} />
                          )}
                        </div>
                        <div className="p-3 min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="geo-display font-bold text-sm" style={{ color: T.text }}>{t.name}</div>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full inline-block mb-1.5"
                            style={{ background: tint(T.cyan, 0.12), color: T.cyan, border: `1px solid ${tint(T.cyan, 0.25)}`, whiteSpace: 'nowrap' }}>
                            {t.status}
                          </span>
                          <p className="text-xs leading-relaxed" style={{ color: T.muted, lineHeight: 1.6 }}>{t.note}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Shown when a subdivision is positively confirmed to have no flag.
const NO_FLAG_PLACEHOLDER = (
  <div style={{ width: '100%', aspectRatio: '3/2', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.surfaceHi, border: `1px solid ${T.line}`, borderRadius: 4 }}>
    <span style={{ fontSize: 10, fontWeight: 600, color: T.dim, textAlign: 'center', lineHeight: 1.2 }}>No flag</span>
  </div>
)

// Shown when a flag may exist but hasn't been added yet (the default for unknowns).
const UNKNOWN_FLAG_PLACEHOLDER = (
  <div style={{ width: '100%', aspectRatio: '3/2', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tint(ACCENT.codex, 0.1), border: `1px dashed ${tint(ACCENT.codex, 0.3)}`, borderRadius: 4 }}>
    <LineIcon name="flag" size={16} color={T.dim} />
  </div>
)
// HTML string version for the <img> onError fallback (a broken URL = unverified, not "no flag").
const UNKNOWN_FLAG_HTML = `width:100%;aspect-ratio:3/2;display:flex;align-items:center;justify-content:center;background:${tint(ACCENT.codex, 0.1)};border:1px dashed ${tint(ACCENT.codex, 0.3)};border-radius:4px`

// Countries whose first-level subdivisions are confirmed to have NO official flags —
// their flagless tiles read "No flag" rather than the ambiguous flag-icon placeholder.
const NO_SUBDIVISION_FLAG_COUNTRIES = new Set<string>([
  // Africa — first-level subdivisions verified to have no official flags.
  'DZ', 'BJ', 'BW', 'BF', 'BI', 'CF', 'TD', 'CG', 'CD', 'CI', 'DJ', 'GQ', 'ER', 'SZ',
  'GH', 'MA', 'MZ', 'SN', 'GM', 'GN', 'GW', 'LS', 'LY', 'MW', 'ML', 'MR', 'NA', 'NE',
  'RW', 'TG', 'UG', 'ZM', 'MG', 'ZW', 'GA', 'SL', 'TN', 'SO', 'TZ', 'MU', 'ST',
  // Americas — subdivisions confirmed flagless (Cuba province flags were deleted as
  // fakes; Suriname/Haiti/DR have only a handful, handled individually).
  'CU', 'SR', 'HT', 'DO', 'BZ',
  // Caribbean island nations — parishes/districts have no flags (autonomous isles handled individually)
  'JM', 'BS', 'BB', 'LC', 'DM', 'VC', 'TT', 'KN', 'AG', 'GD',
  // Middle East — provinces/governorates with no official subdivision flags
  'TR', 'IR', 'SA', 'IL', 'JO', 'YE', 'SY', 'LB', 'OM', 'KW', 'QA', 'BH', 'PS',
  // Oceania — small island nations with no subdivision flags
  'KI', 'MH', 'NR', 'WS', 'TO', 'TV', 'NZ', 'FJ',
  // Asia — flagless subdivisions (countries with a few flagged ones keep those)
  'CN', 'IN', 'PH', 'MM', 'KH', 'LA', 'BN', 'SG', 'TL', 'KP',
  'VN', 'KZ', 'KG', 'TJ', 'TM', 'AF', 'AM', 'AZ', 'BT', 'NP', 'BD', 'MV', 'UZ', 'GE', 'PK',
  // Only unofficial/proposed designs exist for these — no official subdivision flags.
  // (Countries with SOME official flags keep their flagged tiles; only flagless ones show "No flag".)
  'AO', 'CM', 'ZA',
])

function SubRegionTile({ sr, confirmedNoFlags, onSelect, selected }: { sr: SubRegion; confirmedNoFlags?: boolean; onSelect?: (sr: SubRegion) => void; selected?: boolean }) {
  const tappable = !!sr.flagUrl && !!onSelect
  const inner = (
    <>
      {sr.flagUrl
        ? <img
            src={sr.flagUrl}
            alt={sr.name}
            style={{ width: '100%', aspectRatio: '3/2', objectFit: 'contain', borderRadius: 4, display: 'block' }}
            onError={e => { (e.target as HTMLImageElement).replaceWith(Object.assign(document.createElement('div'), { style: UNKNOWN_FLAG_HTML, innerHTML: `<span style="font-size:12px;line-height:1;color:${T.dim}">?</span>` })) }}
          />
        : (sr.noFlag || confirmedNoFlags) ? NO_FLAG_PLACEHOLDER : UNKNOWN_FLAG_PLACEHOLDER
      }
      <span style={{ fontSize: 8.5, color: selected ? T.green : T.muted, textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>{sr.name}</span>
    </>
  )
  const colStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }
  if (!tappable) return <div style={colStyle}>{inner}</div>
  return (
    <button onClick={() => onSelect!(sr)} aria-expanded={selected} className="geo-tap active:scale-95"
      style={{ ...colStyle, background: selected ? tint(T.green, 0.12) : 'transparent', border: `1px solid ${selected ? tint(T.green, 0.5) : 'transparent'}`, borderRadius: 6, padding: 3, cursor: 'pointer' }}>
      {inner}
    </button>
  )
}

const SUBLABEL_STYLE: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: ACCENT.codex, letterSpacing: '0.08em',
  textTransform: 'uppercase', margin: '0 0 6px 2px',
}
const GRID_STYLE: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px 6px' }

// Inline detail panel — a tapped subdivision shows a larger flag + a fact right
// above the grid, so detailed flags become legible without leaving the page.
function SubDetailPanel({ sr, facts, onClose }: { sr: SubRegion; facts: Facts | null; onClose: () => void }) {
  return (
    <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: T.surface, border: `1px solid ${tint(T.green, 0.4)}` }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {sr.flagUrl && (
          <img src={sr.flagUrl} alt={sr.name}
            style={{ width: 128, aspectRatio: '3/2', objectFit: 'contain', borderRadius: 6, border: `1px solid ${T.line}`, background: T.surfaceHi, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-semibold text-sm" style={{ color: T.text }}>{sr.name}</div>
          <p className="text-xs" style={{ color: T.muted, lineHeight: 1.6, marginTop: 5 }}>
            {facts && (facts.curatedFact(sr.name) ?? facts.pickPhrase(sr.name, [
              `The flag of ${sr.name}.`,
              `${sr.name} — one of this country's subdivisions.`,
              `The regional flag of ${sr.name}.`,
              `The banner of ${sr.name}.`,
            ]))}
          </p>
          {sr.flagUrl && commonsSource(sr.flagUrl) && (
            <a href={commonsSource(sr.flagUrl)!} target="_blank" rel="noopener noreferrer"
              className="text-xs inline-block" style={{ color: tint(T.green, 0.9), fontWeight: 600, marginTop: 6 }}>
              Source: Wikimedia Commons ↗
            </a>
          )}
        </div>
        <button onClick={onClose} aria-label="Close" className="geo-tap"
          style={{ flexShrink: 0, color: T.dim, fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
      </div>
    </div>
  )
}

function SubdivisionGrid({ subRegions, headerLabel, memberLabel, confirmedNoFlags }: { subRegions: SubRegion[]; headerLabel?: string; memberLabel?: string; confirmedNoFlags?: boolean }) {
  const [sel, setSel] = useState<SubRegion | null>(null)
  // The blurbs' hand-written facts are big; fetch them once the grid shows.
  const [facts, setFacts] = useState<Facts | null>(null)
  useEffect(() => { import('../data/curatedFacts').then(setFacts) }, [])
  const select = (sr: SubRegion) => setSel(p => (p?.code === sr.code ? null : sr))
  const tile = (sr: SubRegion) => <SubRegionTile key={sr.code} sr={sr} confirmedNoFlags={confirmedNoFlags} onSelect={select} selected={sel?.code === sr.code} />
  const panel = sel ? <SubDetailPanel sr={sel} facts={facts} onClose={() => setSel(null)} /> : null
  const hasGroups = subRegions.some(sr => sr.group)
  if (!hasGroups) {
    return <div className="mt-3">{panel}<div style={GRID_STYLE}>{subRegions.map(tile)}</div></div>
  }
  const groups: { label: string; items: SubRegion[] }[] = []
  for (const sr of subRegions) {
    const label = sr.group ?? 'Other'
    let g = groups.find(g => g.label === label)
    if (!g) { g = { label, items: [] }; groups.push(g) }
    g.items.push(sr)
  }
  return (
    <div className="mt-3" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {panel}
      {groups.map(g => {
        // A "header" tile is the province/nation flag itself, shown on its own row on top.
        const headers = g.items.filter(s => s.groupHeader)
        const members = g.items.filter(s => !s.groupHeader)
        return (
          <div key={g.label}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: T.green,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              marginBottom: 8, paddingLeft: 2, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {g.label}
              <span style={{ color: tint(T.green, 0.5), fontWeight: 400, fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums' }}>{members.length}</span>
            </div>
            {headers.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {headerLabel && <div style={SUBLABEL_STYLE}>{headerLabel}</div>}
                <div style={GRID_STYLE}>{headers.map(tile)}</div>
              </div>
            )}
            {headers.length > 0 && memberLabel && members.length > 0 && <div style={SUBLABEL_STYLE}>{memberLabel}</div>}
            <div style={GRID_STYLE}>{members.map(tile)}</div>
          </div>
        )
      })}
    </div>
  )
}

function FlagImg({ src, alt, height }: { src: string; alt: string; height: number }) {
  return (
    <div style={{ width: '100%', height, position: 'relative', overflow: 'hidden' }}>
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height, objectFit: 'contain', display: 'block', background: T.surfaceHi }}
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

function yearRange(hf: HistoricalFlag) {
  return hf.toYear === null ? `${hf.fromYear} — Present` : `${hf.fromYear} — ${hf.toYear}`
}

function FlagHistoryCard({ hf, isFirst }: { hf: HistoricalFlag; isFirst: boolean }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${isFirst ? tint(ACCENT.codex, 0.35) : T.line}` }}>
      {isFirst && (
        <div className="flex items-center justify-center gap-1.5 py-1.5"
          style={{ background: tint(ACCENT.codex, 0.1), borderBottom: `1px solid ${tint(ACCENT.codex, 0.2)}` }}>
          <span style={{ color: ACCENT.codex, fontSize: 11, fontWeight: 600 }}>↑ Current flag</span>
        </div>
      )}
      <FlagImg src={hf.flagUrl} alt={hf.label} height={160} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="geo-display font-bold text-sm" style={{ color: T.text }}>{hf.label}</div>
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: tint(ACCENT.codex, 0.12), color: ACCENT.codex, border: `1px solid ${tint(ACCENT.codex, 0.25)}`, whiteSpace: 'nowrap', fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums' }}>
            {yearRange(hf)}
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: T.muted, lineHeight: 1.65 }}>{hf.note}</p>

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

