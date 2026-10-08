import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FLAGS } from '../data/flags'
import type { FlagRecord } from '../data/flags'
import { CAPITALS } from '../data/capitals'
import { CODEX, fp } from '../data/codex'
import type { HistoricalFlag } from '../data/codex'
import { UK_NATIONS } from '../data/ukNations'
import type { UKNation } from '../data/ukNations'
import { TERRITORIES } from '../data/territories'
import type { Territory } from '../data/territories'
import { ETHNIC_FLAGS } from '../data/ethnicFlags'
import { EXTINCT_STATES } from '../data/extinctStates'
import { ORG_FLAGS } from '../data/orgFlags'
import { historicalFor, HISTORICAL_FLAGS } from '../data/historicalFlags'
import { IDENTITY_FLAGS, IDENTITY_CATEGORIES, SIGNAL_FLAGS } from '../data/identityFlags'
import { US_CITY_FLAGS } from '../data/usCityFlags'
import { SUB_FLAGS } from '../data/subdivisions'
import { CHALLENGE_CONTINENTS } from '../data/challenges'
import type { SubRegion } from '../data/challenges'
import { T, ACCENT, FONT, tint } from '../ui/tokens'
import { ScreenHeader } from './ui'
import AdBox from './AdBox'
import { AD_SLOTS } from '../ads'
import { LineIcon } from './icons'
import { Search, Anchor, ChevronDown, Castle, Sun, Mountain, Landmark, MoonStar, Sailboat, Rainbow, Users, Feather, MapPin, Crown, Vote, Building2 } from 'lucide-react'

// Etched line icon per continent — cartographer style, never emoji.
const REGION_ICONS: Record<string, typeof Castle> = {
  Europe: Castle, Africa: Sun, Asia: Mountain, Americas: Landmark,
  'Middle East': MoonStar, Oceania: Sailboat,
}

// Same etched treatment for the identity collections.
const CAT_ICONS: Record<string, typeof Castle> = {
  'Pride & LGBTQ+': Rainbow, 'Pan-National & Ethnic': Users, 'Indigenous Peoples': Feather,
  'Separatist & Autonomous': MapPin, Micronations: Crown, 'Civic & Ideological': Vote,
}

interface Props {
  onBack?: () => void
  initialCode?: string | null
  /** Rendered inside the dashboard's Codex tab: no back button on the list
   *  view (the bottom tab bar is the navigation). */
  embedded?: boolean
}

const CAPITAL_BY_CODE = new Map(CAPITALS.map(c => [c.code, c.capital]))

const REGION_ORDER = ['Europe', 'Africa', 'Asia', 'Americas', 'Middle East', 'Oceania'] as const

// Look up sub-regions for a country code across all challenge continents
function getSubRegions(code: string) {
  for (const cont of CHALLENGE_CONTINENTS) {
    const country = cont.countries.find(c => c.code === code)
    if (country && country.subRegions.length > 0) return country.subRegions
  }
  return []
}

export default function CodexScreen({ onBack, initialCode, embedded = false }: Props) {
  // A tapped country expands inline beneath its row — browsing never leaves
  // the page, so there's nothing to "go back" from.
  const [selectedCode, setSelectedCode] = useState<string | null>(initialCode ?? null)
  const [search, setSearch] = useState('')
  // Regions start collapsed; store which are expanded
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(() => {
    const f = initialCode != null ? FLAGS.find(x => x.code === initialCode) : null
    return new Set(f ? [f.region] : [])
  })

  const filteredFlags = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return FLAGS
    return FLAGS.filter(f => f.name.toLowerCase().includes(q) || f.region.toLowerCase().includes(q))
  }, [search])

  const grouped = useMemo(() => {
    return REGION_ORDER.map(region => ({
      region,
      flags: filteredFlags.filter(f => f.region === region),
    })).filter(g => g.flags.length > 0)
  }, [filteredFlags])

  const toggleRegion = (region: string) => {
    setExpandedRegions(prev => {
      const next = new Set(prev)
      if (next.has(region)) next.delete(region)
      else next.add(region)
      return next
    })
  }

  // Auto-expand all regions when searching
  const isSearching = search.trim().length > 0

  return (
    <div className={embedded ? 'carto-rise' : 'min-h-screen flex flex-col'} style={{ background: T.bg, color: T.text, position: 'relative', zIndex: 1 }}>
      {embedded || !onBack ? (
        <header style={{ padding: '14px 16px 10px' }}>
          <h2 className="geo-display" style={{ color: T.text, fontWeight: 700, fontSize: 20, letterSpacing: '-0.01em', lineHeight: 1.1, margin: 0 }}>Codex</h2>
          <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{FLAGS.length} countries · flags, facts and histories</div>
        </header>
      ) : (
        <ScreenHeader title="Codex" subtitle={`${FLAGS.length} countries · flags, facts and histories`} onBack={onBack} />
      )}

      {/* Search */}
      <div className="px-5 mb-3">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <Search size={16} color={T.dim} strokeWidth={1.6} absoluteStrokeWidth />
          <input
            type="text"
            placeholder="Search every flag…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: T.text }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: T.dim, fontSize: 16 }}>✕</button>
          )}
        </div>
      </div>

      <div className={embedded ? 'px-5 pb-12' : 'flex-1 overflow-y-auto px-5 pb-12'}>
        {grouped.length === 0 ? (
          <div className="text-center py-12" style={{ color: T.muted }}>No countries match "{search}"</div>
        ) : (
          grouped.map(({ region, flags }) => {
            const isExpanded = isSearching || expandedRegions.has(region)
            return (
              <div key={region} className="mb-3">
                {/* Region header — open underline row, no box */}
                <button
                  onClick={() => toggleRegion(region)}
                  aria-expanded={isExpanded}
                  className="geo-tap w-full flex items-center justify-between px-1 py-3 transition-all active:scale-[0.99]"
                  style={{
                    background: 'transparent',
                    borderBottom: `1px solid ${isExpanded ? tint(ACCENT.codex, 0.45) : T.line}`,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    {(() => { const Icon = REGION_ICONS[region] ?? Landmark; return <Icon size={15} color={ACCENT.codex} strokeWidth={1.6} absoluteStrokeWidth /> })()}
                    <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: ACCENT.codex }}>{region}</h3>
                    <span className="text-xs" style={{ color: T.dim, fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums' }}>{flags.length}</span>
                  </div>
                  <ChevronDown size={17} color={ACCENT.codex} strokeWidth={1.6} absoluteStrokeWidth
                    style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </button>

                {isExpanded && (
                  <div className="mt-1.5">
                    {flags.map(f => {
                      const open = selectedCode === f.code
                      const capital = CAPITAL_BY_CODE.get(f.code)
                      return (
                        <div key={f.code}>
                          <button
                            onClick={() => setSelectedCode(c => (c === f.code ? null : f.code))}
                            aria-expanded={open}
                            className="geo-tap w-full flex items-center gap-3 px-1.5 py-2.5 rounded-lg transition-all active:scale-[0.99] text-left"
                            style={{ background: open ? tint(ACCENT.codex, 0.07) : 'transparent', borderBottom: `1px solid ${tint(T.line, 0.55)}` }}>
                            {/* Flag thumbnail */}
                            <img
                              src={f.flagUrl}
                              alt={f.name}
                              style={{ width: 46, height: 30, objectFit: 'cover', borderRadius: 5, border: `1px solid ${T.line}`, flexShrink: 0 }}
                              onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate" style={{ color: T.text }}>{f.name}</div>
                              {capital && (
                                <div className="flex items-center gap-1 truncate" style={{ color: T.muted, marginTop: 2, fontSize: 11, opacity: 0.75 }}>
                                  <LineIcon name="capitalquiz" size={10} color={T.muted} />
                                  <span className="truncate">{capital}</span>
                                </div>
                              )}
                            </div>
                            <span style={{ color: ACCENT.codex, fontSize: 18, transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>›</span>
                          </button>
                          {open && <CountryDetail flag={f} />}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Universal search — every other matching flag, behind a divider (G1) */}
        {isSearching && <OtherFlagsResults query={search} />}

        {/* Soft divide: countries above, everything-else collections below */}
        {!isSearching && (
          <div aria-hidden className="flex items-center gap-3" style={{ margin: '28px 2px 6px' }}>
            <span style={{ flex: 1, height: 1, background: T.line }} />
            <span className="geo-micro" style={{ fontSize: 8.5, color: T.dim }}>Beyond countries</span>
            <span style={{ flex: 1, height: 1, background: T.line }} />
          </div>
        )}


        {/* Beyond-countries order: Mega Codex first (the "pick a random one"
            entry point), then the themed collections, signal flags last. */}
        {/* Beyond-countries, ordered by likely-to-click (E8): A–Z up top, the
            rich peoples/identity/micronation sets next, themed galleries, then
            organisations and signal flags last. */}
        {/* Mega Codex A–Z — every flag in the app, alphabetical, up top */}
        {!isSearching && <MegaCodexSection />}
        {/* Peoples & Cultures — ethnic/cultural + pan-national + indigenous */}
        {!isSearching && <EthnicCodexSection />}
        {/* Movements & Identity — pride, separatist & civic causes */}
        {!isSearching && <IdentityCodexSection />}
        {/* Micronations — its own standalone section */}
        {!isSearching && <MicronationsCodexSection />}
        {/* Extinct states — the Commons "Flags of extinct states" gallery */}
        {!isSearching && <ExtinctStatesCodexSection />}
        {/* American city flags — beta, lots of municipal flags */}
        {!isSearching && <AmericanCitiesCodexSection />}
        {/* International organizations — UN, NATO, EU, AU, FIFA, IOC… */}
        {!isSearching && <OrgCodexSection />}
        {/* Maritime / signal alphabet — last of the themed sections */}
        {!isSearching && <SignalCodexSection />}
        {/* Ad box — dormant until a publisher ID is set in src/ads.ts */}
        {!isSearching && <AdBox slot={AD_SLOTS.codexFooter} style={{ marginTop: 24 }} />}
      </div>
    </div>
  )
}

// ── Inline country overview — expands beneath the row so browsing never
// leaves the page. Quick-jot sized: short clamped overview up top, the deep
// dives (history · subdivisions · predecessors) as collapsibles, trivia last.
function CountryDetail({ flag }: { flag: FlagRecord }) {
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHistoryIdx(i => Math.max(0, i - 1))}
                      disabled={historyIdx === 0}
                      className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90"
                      style={{
                        background: T.surface,
                        border: `1px solid ${historyIdx === 0 ? T.line : tint(ACCENT.codex, 0.4)}`,
                        color: historyIdx === 0 ? T.dim : ACCENT.codex,
                        opacity: historyIdx === 0 ? 0.5 : 1,
                        fontSize: 18,
                      }}>‹</button>
                    <button
                      onClick={() => setHistoryIdx(i => Math.min(history.length - 1, i + 1))}
                      disabled={historyIdx === history.length - 1}
                      className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90"
                      style={{
                        background: T.surface,
                        border: `1px solid ${historyIdx === history.length - 1 ? T.line : tint(ACCENT.codex, 0.4)}`,
                        color: historyIdx === history.length - 1 ? T.dim : ACCENT.codex,
                        opacity: historyIdx === history.length - 1 ? 0.5 : 1,
                        fontSize: 18,
                      }}>›</button>
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

// Universal search results — every non-country flag (peoples, historical states,
// organisations, subdivisions, cities…) matching the query, shown beneath the
// country matches behind a divider so anything in the app is findable (G1).
function OtherFlagsResults({ query }: { query: string }) {
  const q = query.trim().toLowerCase()
  const [openKey, setOpenKey] = useState<string | null>(null)
  const matches = useMemo(() => {
    if (!q) return []
    const countryNames = new Set(FLAGS.map(f => f.name.toLowerCase()))
    return ALL_FLAGS_AZ.filter(f => f.title.toLowerCase().includes(q) && !countryNames.has(f.title.toLowerCase())).slice(0, 60)
  }, [q])
  if (!matches.length) return null
  return (
    <div className="mt-4">
      <div aria-hidden className="flex items-center gap-3" style={{ margin: '8px 2px 8px' }}>
        <span style={{ flex: 1, height: 1, background: T.line }} />
        <span className="geo-micro" style={{ fontSize: 8.5, color: T.dim }}>Former states &amp; other flags · {matches.length}</span>
        <span style={{ flex: 1, height: 1, background: T.line }} />
      </div>
      <div className="space-y-1.5">
        {matches.map(m => {
          const open = openKey === m.title
          return (
            <button key={m.title} onClick={() => setOpenKey(o => o === m.title ? null : m.title)}
              className="geo-tap w-full px-1.5 py-2.5 rounded-lg transition-all active:scale-[0.99] text-left"
              style={{ background: open ? tint(ACCENT.codex, 0.07) : 'transparent', borderBottom: `1px solid ${tint(T.line, 0.55)}` }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 46, height: 30, flexShrink: 0, borderRadius: 5, overflow: 'hidden', border: `1px solid ${T.line}`, background: T.surfaceHi }}>
                  <img src={galleryThumb(m.url)} alt={m.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: T.text }}>{m.title}</div>
                </div>
                <span style={{ color: ACCENT.codex, fontSize: 16, transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>›</span>
              </div>
              {open && <p className="text-xs leading-relaxed mt-2.5" style={{ color: T.muted, lineHeight: 1.6 }}>{m.fact}</p>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Per-category accent so each Identity subsection reads as its own colour —
// pride red, pan-ethnic clay, indigenous ochre, separatist blue, micronations
// green, civic plum. Palette tokens keep it legible (raw red/yellow would vanish
// on the light parchment skin).
// Descending warm→cool spectrum across the whole Beyond-Countries list so no two
// adjacent sections share a hue (and nothing repeats the orange of the country
// continents above). Mega Codex = red, Peoples = orange, then the causes step
// down through amber/gold/chartreuse.
const CAT_COLORS: Record<string, string> = {
  'Pride & LGBTQ+': T.violet, // muted plum: readable on parchment (the old lavender failed contrast)
  'Pan-National & Ethnic': T.warm,
  'Indigenous Peoples': T.amber,
  'Separatist & Autonomous': T.gold,
  Micronations: T.green,
  'Civic & Ideological': T.chartreuse,
}

// "Movements & Identity" holds flags that stand for a cause or stance: Pride,
// Separatist & Autonomous, Civic & Ideological. Pan-National & Ethnic and
// Indigenous Peoples moved into "Peoples & Cultures"; Micronations stands alone.
const IDENTITY_MAIN_CATEGORIES = IDENTITY_CATEGORIES.filter(c =>
  c !== 'Micronations' && c !== 'Pan-National & Ethnic' && c !== 'Indigenous Peoples')

// A single Identity category as its own flat, collapsible section (one row's
// description open at a time). Used for the standalone Micronations &
// Pan-National sections.
function IdentityFlatSection({ title, blurb, color, icon: Icon, flags }: { title: string; blurb: string; color: string; icon: IconType; flags: typeof IDENTITY_FLAGS }) {
  const [open, setOpen] = useState(false)
  const [openFlag, setOpenFlag] = useState<string | null>(null)
  if (!flags.length) return null
  return (
    <div className="mt-5">
      <button onClick={() => setOpen(o => !o)}
        className="geo-tap w-full flex items-center justify-between px-1 py-3 transition-all active:scale-[0.99]"
        style={{ background: 'transparent', borderBottom: `1px solid ${open ? tint(color, 0.45) : T.line}` }}>
        <div className="text-left">
          <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color }}>
            <Icon size={15} color={color} strokeWidth={1.6} absoluteStrokeWidth /> {title}
          </h3>
          <p className="text-xs" style={{ color: T.dim }}>{blurb}</p>
        </div>
        <ChevronDown size={17} color={color} strokeWidth={1.6} absoluteStrokeWidth
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
      </button>
      {open && (
        <div className="mt-1.5 space-y-1.5">
          {flags.map(f => {
            const showNote = openFlag === f.id
            return (
              <button key={f.id} onClick={() => setOpenFlag(o => o === f.id ? null : f.id)}
                className="geo-tap w-full px-1.5 py-2.5 rounded-lg transition-all active:scale-[0.99] text-left"
                style={{ background: showNote ? tint(color, 0.07) : 'transparent', borderBottom: `1px solid ${tint(T.line, 0.55)}` }}>
                <div className="flex items-center gap-3">
                  {f.noFlag ? (
                    <div style={{ width: 46, height: 30, borderRadius: 5, border: `1px dashed ${T.line}`, flexShrink: 0, background: T.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 7.5, fontWeight: 700, color: T.dim, textAlign: 'center', lineHeight: 1.1, textTransform: 'uppercase', letterSpacing: '0.03em' }}>No flag</span>
                    </div>
                  ) : (
                    <img src={f.flagUrl} alt={f.name}
                      style={{ width: 46, height: 30, objectFit: 'contain', borderRadius: 5, border: `1px solid ${T.line}`, flexShrink: 0, background: T.surfaceHi }}
                      onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: T.text }}>{f.name}</div>
                  </div>
                  <span style={{ color, fontSize: 16, transition: 'transform 0.2s', transform: showNote ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                </div>
                {showNote && <p className="text-xs leading-relaxed mt-2.5" style={{ color: T.muted, lineHeight: 1.65 }}>{f.note}</p>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MicronationsCodexSection() {
  const flags = IDENTITY_FLAGS.filter(f => f.category === 'Micronations')
  return <IdentityFlatSection title="Micronations" blurb={`${flags.length} self-declared nations`} color={T.green} icon={Crown} flags={flags} />
}

// ── Identity / cause flags (E10) ──
// No "Movements & Identity" wrapper any more: Pride, Separatist & Autonomous and
// Civic & Ideological each stand as their own top-level section, like
// Micronations — one row's description open at a time.
function IdentityCodexSection() {
  return (
    <>
      {IDENTITY_MAIN_CATEGORIES.map(cat => {
        const flags = IDENTITY_FLAGS.filter(f => f.category === cat)
        if (!flags.length) return null
        return (
          <IdentityFlatSection key={cat} title={cat} blurb={`${flags.length} flags`}
            color={CAT_COLORS[cat] ?? T.amber} icon={CAT_ICONS[cat] ?? Users} flags={flags} />
        )
      })}
    </>
  )
}

// ── American city flags (Beta) — lots of municipal flags ──
function AmericanCitiesCodexSection() {
  const [open, setOpen] = useState(false)
  const [openFlag, setOpenFlag] = useState<string | null>(null)
  const cities = [...US_CITY_FLAGS].sort((a, b) => a.name.localeCompare(b.name))
  return (
    <div className="mt-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="geo-tap w-full flex items-center justify-between px-1 py-3 transition-all active:scale-[0.99]"
        style={{ background: 'transparent', borderBottom: `1px solid ${open ? tint(T.chartreuse, 0.45) : T.line}` }}>
        <div className="text-left">
          <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: T.chartreuse }}>
            <Building2 size={15} color={T.chartreuse} strokeWidth={1.6} absoluteStrokeWidth /> American Cities <span style={{ color: tint(T.chartreuse, 0.6), fontSize: 10 }}>(Beta)</span>
          </h3>
          <p className="text-xs" style={{ color: T.dim }}>{cities.length} U.S. municipal flags</p>
        </div>
        <ChevronDown size={17} color={T.chartreuse} strokeWidth={1.6} absoluteStrokeWidth
        style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
      </button>
      {open && (
        <div className="mt-1.5 space-y-1.5">
          {cities.map(f => {
            const showNote = openFlag === f.id
            return (
              <button key={f.id} onClick={() => setOpenFlag(o => o === f.id ? null : f.id)}
                className="geo-tap w-full px-1.5 py-2.5 rounded-lg transition-all active:scale-[0.99] text-left"
                style={{ background: showNote ? tint(T.chartreuse, 0.07) : 'transparent', borderBottom: `1px solid ${tint(T.line, 0.55)}` }}>
                <div className="flex items-center gap-3">
                  <img src={f.flagUrl} alt={f.name}
                    style={{ width: 46, height: 30, objectFit: 'contain', borderRadius: 5, border: `1px solid ${T.line}`, flexShrink: 0, background: T.surfaceHi }}
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: T.text }}>{f.name}</div>
                    <div className="text-xs" style={{ color: T.dim }}>{f.state}</div>
                  </div>
                  <span style={{ color: T.chartreuse, fontSize: 16, transition: 'transform 0.2s', transform: showNote ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                </div>
                {showNote && (
                  <p className="text-xs leading-relaxed mt-2.5" style={{ color: T.muted, lineHeight: 1.65 }}>{f.note}</p>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Maritime / international signal flags (Alpha, Bravo, Charlie …) ──
function SignalCodexSection() {
  const [open, setOpen] = useState(false)
  const [openFlag, setOpenFlag] = useState<string | null>(null)
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="geo-tap w-full flex items-center justify-between px-1 py-3 transition-all active:scale-[0.99]"
        style={{ background: 'transparent', borderBottom: `1px solid ${open ? tint(T.cyan, 0.45) : T.line}` }}>
        <div className="text-left">
          <h3 className="text-sm font-bold uppercase tracking-widest"
            style={{ color: T.cyan, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Anchor size={14} color={T.cyan} strokeWidth={1.6} absoluteStrokeWidth /> Signal &amp; Maritime Flags
          </h3>
          <p className="text-xs" style={{ color: T.dim }}>{SIGNAL_FLAGS.length} international code / phonetic flags</p>
        </div>
        <ChevronDown size={17} color={T.cyan} strokeWidth={1.6} absoluteStrokeWidth
        style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {SIGNAL_FLAGS.map(f => {
            const showNote = openFlag === f.id
            return (
              <button key={f.id} onClick={() => setOpenFlag(o => o === f.id ? null : f.id)}
                className="geo-tap w-full px-1.5 py-2.5 rounded-lg transition-all active:scale-[0.99] text-left"
                style={{ background: showNote ? tint(T.cyan, 0.07) : 'transparent', borderBottom: `1px solid ${tint(T.line, 0.55)}` }}>
                <div className="flex items-center gap-3">
                  <img src={f.flagUrl} alt={f.name}
                    style={{ width: 46, height: 30, objectFit: 'contain', borderRadius: 5, border: `1px solid ${T.line}`, flexShrink: 0, background: T.surfaceHi }}
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: T.text }}>{f.name}</div>
                  </div>
                  <span style={{ color: T.cyan, fontSize: 16, transition: 'transform 0.2s', transform: showNote ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                </div>
                {showNote && (
                  <p className="text-xs leading-relaxed mt-2.5" style={{ color: T.muted, lineHeight: 1.65 }}>{f.note}</p>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Gallery sections (Ethnic & Cultural, Extinct States, Organizations) ──
// Uniform with the Identity/Cities/Signal browsers: a vertical list of flag
// rows you tap for a one-line description. Regions are sub-headers with a
// continent icon (matching the codex's top-level icons), open by default.
type IconType = typeof Castle
interface GRow { file: string; title: string; detail: string }
interface GRegion { label: string; icon?: IconType; groups: { label: string; items: GRow[] }[] }

// Match a region name to the codex's continent icons.
function galleryIcon(name: string): IconType {
  const n = name.toLowerCase()
  if (n.includes('europe')) return Castle
  if (n.includes('middle east')) return MoonStar
  if (n.includes('africa')) return Sun
  if (n.includes('america')) return Landmark
  if (n.includes('oceania') || n.includes('australia')) return Sailboat
  if (n.includes('asia') || n.includes('eurasia') || n.includes('indian')) return Mountain
  if (n.includes('historic')) return Castle
  return Users
}
// Commons full-size SVGs can be megabytes; FilePath ?width= renders a light
// raster. row.file is always a ready URL (resolved by each section via fp()).
const galleryThumb = (u: string) => (u.includes('Special:FilePath') && !u.includes('?') ? `${u}?width=240` : u)
// Per-entry citation (K2): the Wikimedia Commons file-description page for a
// flag, where its source and licence live. Only flags that resolve to Commons
// get a link; local and self-hosted copies have no Commons page, so they get
// none rather than a broken one.
const commonsSource = (url: string): string | null => {
  const m = url.match(/Special:FilePath\/([^?#]+)/)
  return m ? `https://commons.wikimedia.org/wiki/File:${m[1]}` : null
}
const stripFlagOf = (s: string) => s.replace(/^Flag of (the )?/i, '')
function splitParen(s: string): [string, string | null] {
  const m = s.match(/^(.*?)\s*\(([\s\S]*)\)\s*$/)
  return m ? [m[1].trim(), m[2].trim()] : [s.trim(), null]
}
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

// One flag row — thumbnail, name; tap to reveal a description if it has one.
// Open state is owned by the parent section so only one row shows at a time.
function GalleryRow({ row, color, open, onToggle }: { row: GRow; color: string; open: boolean; onToggle: () => void }) {
  const [err, setErr] = useState(false)
  const hasDetail = !!row.detail
  const source = commonsSource(row.file)
  return (
    <div className="w-full rounded-lg transition-all"
      style={{ background: open ? tint(color, 0.07) : 'transparent', borderBottom: `1px solid ${tint(T.line, 0.55)}` }}>
      <button onClick={() => hasDetail && onToggle()}
        className="geo-tap w-full px-1.5 py-2.5 text-left active:scale-[0.99]"
        style={{ background: 'transparent', border: 'none', cursor: hasDetail ? 'pointer' : 'default' }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 46, height: 30, flexShrink: 0, borderRadius: 5, overflow: 'hidden', border: `1px solid ${T.line}`, background: T.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {err
              ? <span style={{ fontSize: 7, color: T.dim }}>no img</span>
              : <img src={galleryThumb(row.file)} alt={row.title} loading="lazy" onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate" style={{ color: T.text }}>{row.title}</div>
          </div>
          {hasDetail && <span style={{ color, fontSize: 16, transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>›</span>}
        </div>
      </button>
      {open && hasDetail && (
        <div className="px-1.5 pb-2.5">
          <p className="text-xs leading-relaxed" style={{ color: T.muted, lineHeight: 1.6 }}>{row.detail}</p>
          {source && (
            <a href={source} target="_blank" rel="noopener noreferrer"
              className="text-xs inline-block mt-1.5" style={{ color: tint(color, 0.9), fontWeight: 600 }}>
              Source: Wikimedia Commons ↗
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// A region sub-section — controlled open state so a section's "All" can drive it.
function GalleryRegionBlock({ region, color, open, onToggle, keyPrefix, openRow, setOpenRow }: {
  region: GRegion; color: string; open: boolean; onToggle: () => void
  keyPrefix: string; openRow: string | null; setOpenRow: (k: string | null) => void
}) {
  const Icon = region.icon
  const count = region.groups.reduce((n, g) => n + g.items.length, 0)
  return (
    <div className="mb-0.5">
      <button onClick={onToggle} aria-expanded={open}
        className="geo-tap w-full flex items-center justify-between px-1 py-2.5 transition-all active:scale-[0.99]"
        style={{ background: 'transparent', borderBottom: `1px solid ${tint(T.line, 0.6)}` }}>
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon size={13} color={color} strokeWidth={1.6} absoluteStrokeWidth style={{ flexShrink: 0 }} />}
          <span className="text-xs font-bold uppercase tracking-wider truncate" style={{ color }}>{region.label}</span>
          <span className="text-xs" style={{ color: T.dim, fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{count}</span>
        </div>
        <ChevronDown size={15} color={color} strokeWidth={1.6} absoluteStrokeWidth
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
      </button>
      {open && (
        <div className="mt-1">
          {region.groups.map((g, gi) => (
            <div key={gi}>
              {g.label && <div style={{ fontSize: 8.5, fontWeight: 700, color: tint(color, 0.85), letterSpacing: '0.07em', textTransform: 'uppercase', margin: '9px 0 1px 4px' }}>{g.label}</div>}
              {g.items.map((row, ii) => {
                const k = `${keyPrefix}-${gi}-${ii}`
                return <GalleryRow key={ii} row={row} color={color} open={openRow === k} onToggle={() => setOpenRow(openRow === k ? null : k)} />
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// The collapsible top-level section (matches Identity/Cities/Signal). Regions
// start closed; an "Open all" toggle expands every one at once.
function GallerySection({ title, icon: Icon, color, blurb, regions }: { title: string; icon: IconType; color: string; blurb: string; regions: GRegion[] }) {
  const [open, setOpen] = useState(false)
  const [openRegions, setOpenRegions] = useState<Set<number>>(new Set())
  const [openRow, setOpenRow] = useState<string | null>(null)
  const allOpen = openRegions.size === regions.length
  const toggleAll = () => setOpenRegions(allOpen ? new Set() : new Set(regions.map((_, i) => i)))
  // Accordion: opening a continent closes the others, so only one is ever open
  // at a time (the "Open all" button is the explicit override).
  const toggleRegion = (i: number) => setOpenRegions(prev => prev.has(i) ? new Set() : new Set([i]))
  return (
    <div className="mt-5">
      <button onClick={() => setOpen(o => !o)}
        className="geo-tap w-full flex items-center justify-between px-1 py-3 transition-all active:scale-[0.99]"
        style={{ background: 'transparent', borderBottom: `1px solid ${open ? tint(color, 0.45) : T.line}` }}>
        <div className="text-left">
          <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color }}>
            <Icon size={15} color={color} strokeWidth={1.6} absoluteStrokeWidth /> {title}
          </h3>
          <p className="text-xs" style={{ color: T.dim }}>{blurb}</p>
        </div>
        <ChevronDown size={17} color={color} strokeWidth={1.6} absoluteStrokeWidth
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
      </button>
      {open && (
        <div className="mt-2">
          <div className="flex justify-end mb-1.5">
            <button onClick={toggleAll}
              className="geo-tap active:scale-95"
              style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color, background: tint(color, 0.1), border: `1px solid ${tint(color, 0.4)}`, borderRadius: 999, padding: '4px 12px', cursor: 'pointer' }}>
              {allOpen ? 'Collapse all' : 'Open all'}
            </button>
          </div>
          {regions.map((r, i) => <GalleryRegionBlock key={i} region={r} color={color} open={openRegions.has(i)} onToggle={() => toggleRegion(i)} keyPrefix={String(i)} openRow={openRow} setOpenRow={setOpenRow} />)}
        </div>
      )}
    </div>
  )
}

// "Peoples & Cultures" — the full Commons ethnic/cultural gallery, merged with
// the Pan-National & Ethnic and Indigenous Peoples identity flags (E2/E3): all
// "flags of a people" now live under one top-level section.
function EthnicCodexSection() {
  const idRegion = (cat: string, label: string): GRegion => ({
    label,
    icon: CAT_ICONS[cat],
    groups: [{ label: '', items: IDENTITY_FLAGS.filter(f => f.category === cat).map(f => ({ file: f.flagUrl, title: f.name, detail: f.note })) }],
  })
  const ethnicRegions: GRegion[] = ETHNIC_FLAGS.map(r => {
    const short = r.region.replace(/^Peoples of /, '')
    return {
      label: short,
      icon: galleryIcon(r.region),
      groups: r.groups.map(g => ({
        label: g.label,
        items: g.items.map(it => ({ file: fp(it.file), title: it.name, detail: it.note ?? g.note ?? (g.label ? `${g.label} — ${short}` : short) })),
      })),
    }
  })
  const regions: GRegion[] = [
    ...ethnicRegions,
    idRegion('Pan-National & Ethnic', 'Pan-National & Ethnic'),
    idRegion('Indigenous Peoples', 'Indigenous Peoples'),
  ]
  const total = regions.reduce((n, r) => n + r.groups.reduce((m, g) => m + g.items.length, 0), 0)
  return <GallerySection title="Peoples &amp; Cultures" icon={Users} color={T.warm} blurb={`${total} flags of peoples, cultures & nations · by region`} regions={regions} />
}

function ExtinctStatesCodexSection() {
  // The curated extinct-states gallery, merged with every predecessor/historical
  // flag — deduped against the gallery by name so a state that lives in both
  // datasets (Two Sicilies, Ottoman, USSR, Yugoslavia, Ashanti, Tibet…) shows
  // only once. Date-parentheses are stripped only when MATCHING the curated
  // names, so distinct historical variants (e.g. two Qing flags) are preserved.
  const norm = (s: string) => stripFlagOf(splitParen(s)[0]).toLowerCase().replace(/[^a-z0-9]+/g, '')
  const curatedNames = new Set<string>()
  const histBucket: Record<string, string> = {
    Europe: 'Europe', Americas: 'Americas',
    'Africa & Middle East': 'Africa', 'Asia & Oceania': 'Asia',
  }
  const regions: GRegion[] = EXTINCT_STATES.map(r => ({
    label: r.region,
    icon: galleryIcon(r.region),
    groups: [{ label: '', items: r.items.map(it => {
      const [pre, paren] = splitParen(it.name)
      curatedNames.add(norm(it.name))
      return { file: fp(it.file), title: stripFlagOf(pre), detail: paren ? cap(paren) + '.' : 'A former state.' }
    }) }],
  }))
  const byBucket: Record<string, GRow[]> = {}
  HISTORICAL_FLAGS.forEach(h => {
    if (curatedNames.has(norm(h.name))) return // already in the curated gallery — skip
    const bucket = histBucket[h.region] ?? 'Europe'
    const arr = byBucket[bucket] || (byBucket[bucket] = [])
    arr.push({ file: h.flagUrl, title: h.name, detail: `${h.era} — ${h.note}` })
  })
  regions.forEach(rg => {
    const extra = byBucket[rg.label]
    if (extra && extra.length) rg.groups.push({ label: 'Predecessor & former states', items: extra })
  })
  const total = regions.reduce((n, rg) => n + rg.groups.reduce((m, g) => m + g.items.length, 0), 0)
  return <GallerySection title="Extinct &amp; Former States" icon={Landmark} color={T.cyan} blurb={`${total} flags of vanished & predecessor states · by continent`} regions={regions} />
}

function OrgCodexSection() {
  const total = ORG_FLAGS.reduce((n, r) => n + r.groups.reduce((m, g) => m + g.items.length, 0), 0)
  const regions: GRegion[] = ORG_FLAGS.map(r => ({
    label: r.region,
    icon: Building2,
    groups: r.groups.map(g => ({
      label: g.label,
      items: g.items.map(it => ({ file: fp(it.file), title: stripFlagOf(it.name), detail: g.label ? `${g.label} — ${r.region}` : r.region })),
    })),
  }))
  return <GallerySection title="International Organizations" icon={Building2} color={T.green} blurb={`${total} flags · UN, NATO, EU, AU, FIFA, the Olympics…`} regions={regions} />
}

// ── Mega Codex — a full-screen wall of every flag in the app ──
// Aggregated once at module load: countries, identity, cities, ethnic, extinct,
// org and historical flags, deduped by display name.
// Hand-written facts for the well-known gallery entries (organisations, extinct
// states, peoples) that otherwise only get a generic descriptor. Matched by a
// keyword appearing in the title, most-specific first.
const CURATED_FACTS: [string, string][] = [
  // Organisations
  ["United Nations", "Founded in 1945 after WWII, the UN now unites 193 member states — nearly every country on Earth — under its pale-blue flag wrapped in olive branches of peace."],
  ["NATO", "A military alliance born in 1949: under Article 5, an armed attack on one member is treated as an attack on all of them."],
  ["European Union", "Its ring of twelve gold stars stands for unity and completeness — the count has never changed, even as the EU grew far past twelve members."],
  ["African Union", "Successor to the Organisation of African Unity, it represents all 55 African states; its gold stars ring a map of the whole continent."],
  ["Arab League", "Founded in 1945, the oldest pan-Arab body; the chain on its flag symbolises the unity of its member states."],
  ["FIFA", "World football's governing body since 1904 — its World Cup is the single most-watched sporting event on the planet."],
  ["International Olympic Committee", "The five interlocking rings represent the five inhabited continents; together their colours appear on every national flag on Earth."],
  ["Commonwealth of Nations", "A voluntary club of 56 mostly ex-British-Empire countries, spanning roughly a third of all humanity."],
  ["Islamic Cooperation", "With 57 member states, it is the largest inter-governmental organisation in the world after the UN itself."],
  ["League of Nations", "The UN's ill-fated forerunner (1920–46) — it couldn't stop WWII, but it invented modern international cooperation."],
  ["World Trade Organization", "Referee of global commerce: it sets the trade rules between 160-plus economies and settles their disputes."],
  ["Comecon", "The Soviet bloc's economic alliance — the communist East's answer to the Western common market."],
  // Extinct states
  ["Biafra", "A breakaway Igbo state in southeast Nigeria (1967–70); its rising-sun flag became a symbol of secession — and of a catastrophic famine."],
  ["Manchukuo", "A puppet state Japan carved out of Manchuria (1932–45), fronted by Puyi, China's last emperor."],
  ["Republic of Texas", "An independent nation for nearly a decade (1836–45) before joining the US — the root of Texas's 'Lone Star State' nickname."],
  ["Vermont", "Vermont governed itself as an independent republic for 14 years (1777–91) before becoming the 14th US state."],
  ["Two Sicilies", "The largest Italian state before unification, ruling the south and Sicily until Garibaldi's redshirts toppled it in 1861."],
  ["Byzantine", "The eastern Roman Empire outlived Rome itself by a thousand years, until Constantinople fell to the Ottomans in 1453."],
  ["Holy Roman", "A patchwork of hundreds of German states that, as Voltaire joked, was 'neither holy, nor Roman, nor an empire.'"],
  ["Republic of Venice", "A maritime superpower for a millennium (697–1797), ruled by elected doges, until Napoleon swept it away."],
  ["Ragusa", "Tiny Dubrovnik thrived as a merchant republic rivalling Venice — and abolished slavery in 1418, centuries ahead of its time."],
  ["Sikh Empire", "Ranjit Singh's mighty Punjab state (1799–1849) was the last major Indian power to fall to the British."],
  ["Tannu Tuva", "A near-forgotten state (1921–44) famous mainly for its triangular stamps, before the USSR quietly absorbed it."],
  ["Hawai", "A sovereign Polynesian monarchy until US-backed planters overthrew Queen Liliʻuokalani in 1893."],
  ["Orange Free State", "A Boer republic on the South African veld (1854–1902), until Britain annexed it after the Second Boer War."],
  ["Formosa", "Asia's first republic: Taiwan declared independence for five months in 1895 to resist a Japanese takeover."],
  ["Czechoslovakia", "United Czechs and Slovaks from 1918 until the amicable 'Velvet Divorce' peacefully split it in two in 1993."],
  ["East Germany", "The communist German state (1949–90), sealed off behind the Berlin Wall until reunification."],
  ["South Vietnam", "The US-backed republic that fell to the North in 1975 — the fall of Saigon ended the Vietnam War."],
  ["Rhodesia", "White-minority-ruled Zimbabwe, which broke from Britain in 1965 rather than accept Black majority rule."],
  ["Confederate", "The eleven secessionist Southern US states (1861–65) whose defeat in the Civil War ended American slavery."],
  ["U.S.S.R", "The communist superpower (1922–91) — its hammer-and-sickle flew over 15 republics across a sixth of the planet's land."],
  // Peoples
  ["Kurds", "The world's largest stateless nation — some 30 million people split across Turkey, Iraq, Iran and Syria, with no country of their own."],
  ["Basque", "A people of the western Pyrenees whose language, Euskara, is unrelated to any other tongue on Earth."],
  ["Sami", "The indigenous reindeer-herding people of Lapland, across northern Norway, Sweden, Finland and Russia."],
  ["Catalan", "The people of Catalonia in northeast Spain; their red-and-gold Senyera is among the oldest flags in Europe."],
  ["Breton", "A Celtic people of Brittany in northwest France, with a language closely related to Welsh and Cornish."],
  ["Cornish", "The Celtic people of Cornwall; St Piran's white-on-black cross is their banner."],
  ["Māori", "The indigenous Polynesian people of New Zealand; the Tino Rangatiratanga flag asserts Māori sovereignty."],
  ["Aboriginal Australian", "Carriers of the world's oldest continuous culture, over 60,000 years old; their flag's bands mean earth, people and sun."],
  ["Romani", "Europe's largest ethnic minority, with roots in northern India — the wheel on their flag echoes the Indian chakra."],
  ["Uyghur", "A Turkic Muslim people of China's far-western Xinjiang region."],
  ["Tamil", "A Dravidian people of southern India and Sri Lanka, with one of the world's oldest living literary traditions."],

  // ── More organisations ──
  ["UNESCO", "The UN's culture-and-science agency, famous for its World Heritage list of the planet's most precious places."],
  ["International Criminal Court", "The world's permanent war-crimes court in The Hague, set up in 2002 to try genocide and crimes against humanity."],
  ["Francophonie", "An alliance of 80-plus French-speaking governments — the linguistic cousin of the Commonwealth."],
  ["World Economic Forum", "The Swiss non-profit behind the annual Davos summit, where the global elite debate the world's economy."],
  ["Commonwealth of Independent States", "A loose alliance of former Soviet republics, formed as the USSR dissolved in 1991."],
  ["Eurasian Economic Union", "A Russia-led common market binding several post-Soviet economies."],
  ["Collective Security Treaty", "A Russia-led military alliance of post-Soviet states, the CSTO."],
  ["Security and Co-operation in Europe", "The OSCE — Europe's largest security body, spanning 57 states from Vancouver to Vladivostok."],
  ["Mercosur", "South America's biggest trade bloc, anchored by Brazil and Argentina."],
  ["Organization of American States", "The main political forum of the Americas, founded in 1948 and based in Washington."],
  ["Caribbean Community", "CARICOM unites the English-speaking Caribbean — and fields a shared cricket team."],
  ["Andean Community", "A trade bloc of the Andes — Bolivia, Colombia, Ecuador and Peru."],
  ["Latin American and Caribbean States", "CELAC gathers all 33 states of the Americas except the US and Canada."],
  ["South American Nations", "UNASUR briefly united the whole continent of South America in the 2000s."],
  ["Pacific Islands Forum", "The chief political body of the Pacific, led by Australia, New Zealand and the island states."],
  ["Pacific Community", "The oldest regional organisation in the Pacific, focused on island development."],
  ["West African States", "ECOWAS binds 15 West African nations and even shares a peacekeeping force."],
  ["Southern African Development", "SADC links 16 nations of southern Africa for trade and security."],
  ["East African Community", "An economic bloc reviving the dream of a united East Africa, with its own passport."],
  ["Council of Europe", "Europe's human-rights guardian and home of the European Court of Human Rights — and not part of the EU."],
  ["European Free Trade", "EFTA is the club of European non-EU traders: Norway, Switzerland, Iceland and Liechtenstein."],
  ["Nordic Council", "The cooperation forum of the five Nordic countries and their autonomous territories."],
  ["Benelux", "The pioneering union of Belgium, the Netherlands and Luxembourg that helped seed the EU."],
  ["Gulf Cooperation Council", "The political and economic union of six oil-rich Arab Gulf monarchies."],
  ["South Asian Association", "SAARC links the eight nations of South Asia — home to a quarter of humanity."],
  ["Turkic States", "An alliance promoting unity among the Turkic-speaking nations from Turkey to Central Asia."],
  ["Paralympic", "Governing body of the Paralympic Games; its three 'agitos' embody the motto 'Spirit in Motion'."],
  ["University Sport", "FISU runs the Universiade, a World Games for university athletes worldwide."],
  ["Commonwealth Games", "A multi-sport festival of the Commonwealth, fondly dubbed 'the Friendly Games'."],
  ["FIA", "Motorsport's world governing body — the rule-maker behind Formula 1."],
  ["Mediterranean Games", "A regional multi-sport games for the countries ringing the Mediterranean Sea."],
  ["Western European Union", "A Cold-War defence pact of Western Europe, folded into the EU by 2011."],
  ["Central Treaty Organization", "CENTO was a Cold-War Middle Eastern alliance, the southern flank against the USSR."],
  ["Southeast Asia Treaty", "SEATO was the US-led Cold-War alliance meant to contain communism in Southeast Asia."],
  ["Coal and Steel Community", "The 1951 pact pooling French and German coal and steel — the seed from which the EU grew."],
  ["North American Free Trade", "NAFTA created a free-trade zone across the US, Canada and Mexico in 1994."],

  // ── More empires & extinct states (listed before peoples so 'Kingdom of X' wins) ──
  ["Ottoman", "A Muslim empire that ruled the Middle East, North Africa and southeast Europe for 600 years, until 1922."],
  ["Mali Empire", "A fabulously rich West African empire; its ruler Mansa Musa may have been the wealthiest person in history."],
  ["Kongo", "A powerful central-African kingdom that traded with Portugal and adopted Christianity in the 1400s."],
  ["Ashanti", "A gold-rich West African empire that fiercely resisted the British in a series of wars."],
  ["Zanzibar", "An Indian Ocean spice-and-slave sultanate; its 1964 revolution merged it into Tanzania."],
  ["Transkei", "An apartheid-era 'Bantustan' — a nominally independent Black homeland recognised by no one but Pretoria."],
  ["Bophuthatswana", "An apartheid 'homeland' for the Tswana people, dissolved when apartheid ended in 1994."],
  ["Katanga", "The mineral-rich Congolese province that violently tried to break away in 1960."],
  ["Republic of the Rif", "A short-lived Berber republic that fought Spain and France in 1920s Morocco."],
  ["Khmer Empire", "The empire that built Angkor Wat, the largest religious monument on Earth."],
  ["Sulu", "A Muslim sultanate of the southern Philippines and Borneo, famed for its pearls."],
  ["Aceh", "A powerful Sumatran sultanate — the last part of Indonesia to fall to the Dutch."],
  ["Hyderabad", "A vast, wealthy princely state whose ruler, the Nizam, was once the richest man in the world."],
  ["Sikkim", "A Himalayan Buddhist kingdom that became India's 22nd state by referendum in 1975."],
  ["Korean Empire", "Korea's short-lived empire (1897–1910), before Japan annexed the peninsula."],
  ["Joseon", "The dynasty that ruled Korea for five centuries and gave it the Hangul alphabet."],
  ["Qing", "China's last imperial dynasty, the Manchu-led Qing, which fell to revolution in 1912."],
  ["Republic of Yucat", "Mexico's Yucatán peninsula declared itself independent twice in the 1840s."],
  ["California Republic", "The 'Bear Flag Republic' lasted just 25 days in 1846 before California joined the US."],
  ["West Florida", "A short-lived 1810 republic on the US Gulf Coast, swiftly annexed by the United States."],
  ["Yugoslavia", "The 20th-century union of South Slavs that broke apart in the 1990s Balkan wars."],
  ["Danzig", "A free city-state between the wars (1920–39); the quarrel over it helped trigger WWII."],
  ["Trieste", "A free territory disputed by Italy and Yugoslavia after WWII, before being split between them."],
  ["Kingdom of Saxony", "A German kingdom (1806–1918) centred on Dresden, famed for porcelain and music."],
  ["Kingdom of Bavaria", "A German kingdom (1806–1918); its blue-and-white lozenges still fly over the Free State of Bavaria."],
  ["Hanover", "A German kingdom once joined to Britain through a shared royal house."],
  ["Württemberg", "A southwest German kingdom (1806–1918) absorbed into modern Baden-Württemberg."],
  ["Grand Duchy of Tuscany", "A Renaissance Italian state ruled by the Medici, then the Habsburgs, until Italian unification."],
  ["Kingdom of Sardinia", "The Italian state whose House of Savoy led the unification of Italy in 1861."],
  ["Navarre", "A Basque kingdom straddling the Pyrenees, independent until Spain and France carved it up."],
  ["Aragon", "A medieval Mediterranean crown whose reach once stretched to Naples, Sicily and Athens."],
  ["Granada", "The last Muslim kingdom in Spain, whose fall in 1492 completed the Reconquista."],
  ["Serbian Krajina", "A breakaway Serb statelet in Croatia during the 1990s Yugoslav wars."],
  ["Ichkeria", "The separatist Chechen republic that fought two brutal wars against Russia."],
  ["Artsakh", "The Armenian-populated breakaway in Nagorno-Karabakh, dissolved in 2023 after Azerbaijan retook it."],
  ["Donetsk", "A Russian-backed breakaway in eastern Ukraine, central to the war that began in 2014."],
  ["Lugansk", "A Russian-backed separatist statelet in eastern Ukraine's Donbas."],
  ["Mengjiang", "A Japanese puppet state in Inner Mongolia during the Second World War."],
  ["South Yemen", "The Arab world's only Marxist state, which merged with the north to form Yemen in 1990."],
  ["United Arab Republic", "The short-lived 1958–61 union of Egypt and Syria into a single Arab state."],
  ["Riograndense", "A breakaway 'Ragamuffin' republic in southern Brazil (1836–45)."],
  ["Bora Bora", "A Polynesian island kingdom, independent until France annexed it in 1895."],
  ["Kingdom of Tahiti", "The Pomare dynasty ruled Tahiti until it became a French protectorate in 1880."],
  ["Natalia", "A short-lived Boer republic on the South African coast, annexed by Britain in 1843."],
  ["South African Republic", "Paul Kruger's Boer Transvaal republic, lost to Britain in the Boer War."],
  ["Far Eastern Republic", "A Soviet-created buffer state in Russia's Far East during the Civil War."],

  // ── More peoples ──
  ["Galician", "A people of Galicia in Spain's rainy northwest, whose language is close to Portuguese."],
  ["Venetian", "The people of Venice and its lagoon, heirs to a once-mighty maritime republic."],
  ["Sicilian", "Islanders of Sicily, the Mediterranean's crossroads, shaped by Greeks, Arabs and Normans alike."],
  ["Sardinian", "People of Sardinia, whose language is the closest living tongue to ancient Latin."],
  ["Corsican", "Islanders of Corsica, Napoleon's birthplace, with a language between Italian and French."],
  ["Lombard", "People of Italy's prosperous north around Milan, named for a Germanic tribe."],
  ["Frisian", "A coastal people of the Netherlands and Germany whose language is English's closest relative."],
  ["Fleming", "The Dutch-speaking people of northern Belgium — Flanders."],
  ["Walloon", "The French-speaking people of southern Belgium — Wallonia."],
  ["Bavarian", "People of Germany's largest state, known for lederhosen, beer halls and Oktoberfest."],
  ["Saxon", "An old Germanic people of eastern Germany; their name rode west with the Anglo-Saxons to England."],
  ["Sorb", "A small Slavic people of eastern Germany — the country's only indigenous national minority."],
  ["Silesian", "A people of the historic region split today between Poland, Czechia and Germany."],
  ["Kashub", "A Slavic people of northern Poland near Gdańsk, with their own distinct language."],
  ["Rusyn", "A stateless Slavic people of the Carpathian mountains, scattered across several countries."],
  ["Cossack", "Free horse-warrior communities of the Russian and Ukrainian steppe, famed for their cavalry."],
  ["Circassian", "A Caucasus people scattered worldwide after a 19th-century expulsion by the Russian Empire."],
  ["Ossetian", "A Caucasus people speaking an Iranian language, descended from the ancient Alans."],
  ["Abkhaz", "A Black Sea people of the Caucasus whose homeland broke from Georgia in the 1990s."],
  ["Crimean Tatar", "The Turkic Muslim people of Crimea, deported en masse by Stalin in 1944."],
  ["Volga Tatar", "A Turkic Muslim people centred on Tatarstan along Russia's Volga River."],
  ["Bashkir", "A Turkic people of the southern Urals, known for horseback culture and wild honey."],
  ["Chuvash", "A Turkic people of the Volga whose language is the most divergent of all Turkic tongues."],
  ["Sakha", "The Yakut people of Siberia, herders in one of the coldest inhabited places on Earth."],
  ["Buryat", "A Mongolic people of Siberia around Lake Baikal, the world's deepest lake."],
  ["Kalmyk", "Europe's only traditionally Buddhist people — Mongols who settled by the Caspian Sea."],
  ["Tuvan", "A Turkic people of southern Siberia, famous for their throat-singing."],
  ["Ainu", "The indigenous people of northern Japan, with their own language, religion and bear festivals."],
  ["Hmong", "A hill people of Southeast Asia and southern China, many resettled in the US after the Vietnam War."],
  ["Tibetan", "A Buddhist people of the high Himalayan plateau, led for centuries by the Dalai Lamas."],
  ["Manchu", "The people who conquered China and founded the Qing dynasty, now largely assimilated."],
  ["Mongol", "The steppe people who, under Genghis Khan, built the largest contiguous land empire in history."],
  ["Punjabi", "A people of the fertile Punjab, split between India and Pakistan by the 1947 partition."],
  ["Baloch", "A people of the arid mountains where Iran, Pakistan and Afghanistan meet."],
  ["Pashtun", "A proud tribal people straddling the Afghanistan–Pakistan frontier, with an ancient honour code."],
  ["Assyrian", "An ancient Christian people of Mesopotamia, heirs to one of the world's first empires."],
  ["Druze", "A secretive Middle Eastern religious community across Lebanon, Syria and Israel."],
  ["Yazidi", "A small Kurdish-speaking religious minority of Iraq, brutally targeted by ISIS."],
  ["Copt", "Egypt's native Christians — heirs of the pharaohs and one of the oldest churches on Earth."],
  ["Berber", "The indigenous peoples of North Africa, who call themselves the Imazighen — 'free people'."],
  ["Amazigh", "The Berber peoples of North Africa, whose name means 'free people'."],
  ["Tuareg", "The blue-veiled nomads of the Sahara, the 'free people' of the desert."],
  ["Oromo", "The largest ethnic group in Ethiopia, with their own ancient democratic 'gadaa' system."],
  ["Zulu", "South Africa's largest nation, whose 19th-century kingdom under Shaka was a fearsome military power."],
  ["Xhosa", "A South African people whose click-filled language Nelson Mandela spoke as his mother tongue."],
  ["Igbo", "A people of southeast Nigeria whose 1960s bid for the state of Biafra ended in tragedy."],
  ["Yoruba", "A West African people of southwest Nigeria with a rich tradition of art, gods and city-states."],
  ["Hausa", "One of Africa's largest ethnic groups — traders and herders across the West African Sahel."],
  ["Maasai", "The tall, red-robed cattle-herders of the East African savanna, icons of Kenya and Tanzania."],
  ["Quechua", "The largest indigenous people of the Americas, descendants of the Inca, across the Andes."],
  ["Aymara", "An Andean people of Bolivia and Peru around Lake Titicaca, the highest navigable lake on Earth."],
  ["Mapuche", "The indigenous people of southern Chile who resisted both the Inca and the Spanish for centuries."],
  ["Guaran", "An indigenous people of Paraguay, whose language is one of the country's two official tongues."],
  ["Cherokee", "One of the largest Native American nations, forced west on the deadly 'Trail of Tears'."],
  ["Navajo", "The largest Native American nation by land; their language served as an unbreakable WWII code."],
  ["Sioux", "The Plains nation of Sitting Bull and Crazy Horse, who defeated Custer at Little Bighorn."],

  // ── Batch 2: more empires & states ──
  ["Maratha", "A Hindu warrior confederacy that dominated 18th-century India before the British rose to power."],
  ["Mughal", "The Muslim dynasty that ruled most of India for three centuries and built the Taj Mahal."],
  ["Inca", "The largest empire in the pre-Columbian Americas, ruled from Cusco high in the Andes."],
  ["Aztec", "The Mexica empire centred on Tenochtitlan, conquered by Cortés and his native allies in 1521."],
  ["Republic of Genoa", "A medieval maritime superpower and Venice's great rival — home of Christopher Columbus."],
  ["Papal States", "The lands ruled directly by the Popes across central Italy for over a thousand years, until 1870."],
  ["Kingdom of Naples", "The southern Italian kingdom that, joined with Sicily, became the Two Sicilies."],
  ["East Turkestan", "Two short-lived republics that declared independence in China's Xinjiang in the 1930s and 40s."],
  ["Free State of Fiume", "A tiny Adriatic city-state (1920–24), seized for a time by the poet-adventurer D'Annunzio."],
  ["Republic of Sonora", "An American adventurer's filibuster 'republic' in northern Mexico that lasted months in 1854."],
  ["Republic of the Rio Grande", "A short-lived 1840 breakaway in northern Mexico, a cousin of the Texas revolt."],
  ["Muskogee", "An adventurer-led Native American state in Spanish Florida around 1800."],
  ["Septinsular", "The first modern Greek state — a short-lived republic of the Ionian Islands (1800–07)."],
  ["Cretan State", "An autonomous Crete (1898–1913), poised between Ottoman and Greek rule."],
  ["Banten", "A spice-trading sultanate on Java, a rival of the Dutch East India Company."],
  ["Mataram", "A powerful Javanese sultanate whose royal courts still shape Indonesian culture."],
  ["Majapahit", "A Hindu-Buddhist maritime empire that once ruled much of the Indonesian archipelago."],

  // ── Batch 2: more peoples ──
  ["Andalusian", "People of Andalucía in Spain's sunny south — the heartland of flamenco and Moorish heritage."],
  ["Asturian", "A people of Spain's green Atlantic north, proud their mountains were never taken by the Moors."],
  ["Valencian", "People of Valencia on Spain's east coast, home of paella and the fiery Fallas festival."],
  ["Canarian", "Islanders of the Canaries off Africa; their Guanche ancestors once whistled a language across the valleys."],
  ["Leonese", "A people of León in northwest Spain, with their own endangered Romance language."],
  ["Castilian", "The people of Castile in central Spain — their tongue became the Spanish spoken worldwide."],
  ["Occitan", "Speakers of Occitan across southern France — the language of the medieval troubadours."],
  ["Gascon", "A people of southwest France around Gascony, the homeland of the real-life d'Artagnan."],
  ["Norman", "People of Normandy, descendants of the Vikings who conquered England in 1066."],
  ["Savoyard", "An Alpine people of Savoy, French only since 1860 after centuries under their own dukes."],
  ["Alsatian", "A people of Alsace on the Franco-German border, with a Germanic dialect and a much-fought-over home."],
  ["Provençal", "People of sun-drenched Provence in southeast France, with their own Occitan tongue."],
  ["Picard", "A people of northern France and Belgium with their own regional language."],
  ["Burgundian", "People of Burgundy — once a powerful duchy, and a very famous wine."],
  ["Rhinelander", "People of Germany's Rhineland, famed for Carnival and the castle-lined Rhine valley."],
  ["Hessian", "People of Hesse in central Germany; their soldiers once fought for Britain in the American Revolution."],
  ["Swabian", "A thrifty, industrious people of southwest Germany around Stuttgart."],
  ["Franconian", "People of Franconia in northern Bavaria, with their own dialect and renowned beers."],
  ["Pomeranian", "A people of the Baltic coast split today between Germany and Poland."],
  ["Tyrolean", "An Alpine people of the Tyrol, split between Austria and Italy."],
  ["Transylvanian Saxon", "German settlers who built fortified churches across medieval Transylvania."],
  ["Danube Swabian", "Germans who over centuries settled the Danube basin of Hungary and the Balkans."],
  ["Volga German", "Germans invited by Catherine the Great to farm the Volga, later deported by Stalin."],
  ["Baltic German", "A German-speaking elite that ruled the Baltic coast for some 700 years."],
  ["Sudeten German", "German-speakers of Czechoslovakia's borderlands, whose 1938 plight Hitler used to dismember the country."],
  ["Hollander", "People of Holland, the coastal core that gave the whole Netherlands its nickname."],
  ["Brabant", "A people of Brabant, straddling the Dutch–Belgian border."],
  ["Limburg", "People of Limburg in the Dutch–Belgian south — and a famously pungent cheese."],
  ["Yorkshire", "Proud folk of England's largest county, with their white rose and broad dialect."],
  ["Northumbrian", "People of England's far northeast, heirs to a once-mighty Anglo-Saxon kingdom."],
  ["Cumbrian", "People of the Lake District in England's mountainous northwest."],
  ["Lancastrian", "People of Lancashire, the red-rose county at the heart of the Industrial Revolution."],
  ["Manx", "The Celtic people of the Isle of Man, with a three-legged emblem and a reviving language."],
  ["Gael", "The Gaelic-speaking peoples of Ireland and the Scottish Highlands and islands."],
  ["Ulster Scot", "Descendants of Scottish Protestants who settled Ulster, many later emigrating to America."],
  ["Moravian", "A people of the eastern Czech lands around Brno, with their own wine and folk traditions."],
  ["Goral", "Highlander folk of the Polish and Slovak Carpathians, famed for their music and dress."],
  ["Pomak", "Bulgarian-speaking Muslims of the Balkans — a community living between two cultures."],
  ["Lemko", "A Rusyn people of the Carpathians, many resettled after the Second World War."],
  ["Karelian", "A Finnic people split between Finland and Russia, keepers of the Kalevala epic's songs."],
  ["Veps", "A small Finnic people of northwest Russia, near Lake Onega."],
  ["Ingrian", "A Finnic people of the lands around St Petersburg, deported under Stalin."],
  ["Livonian", "An all-but-extinct Finnic people of Latvia's coast; the last native speaker died in 2013."],
  ["Seto", "A small Finnic Orthodox people on the Estonia–Russia border, with a UNESCO-listed singing tradition."],
  ["Mari people", "A Volga people of Russia who keep one of Europe's last living indigenous pagan faiths."],
  ["Mordvin", "A Volga Finnic people of Russia, split into the Erzya and Moksha."],
  ["Udmurt", "A red-haired Finnic people of Russia's Volga–Ural region."],
  ["Komi", "A Finnic people of Russia's far north — traditional reindeer herders and hunters."],
  ["Nenets", "Reindeer-herding nomads of the Russian Arctic tundra."],
  ["Khanty", "An indigenous people of western Siberia's forests and rivers."],
  ["Mansi", "A small Siberian people, distant linguistic cousins of the Hungarians."],
  ["Ingush", "A Muslim people of the North Caucasus, close kin of the Chechens."],
  ["Avar", "The largest of Dagestan's many mountain peoples in the North Caucasus."],
  ["Lezgin", "A North Caucasus people split by the Russia–Azerbaijan border."],
  ["Mingrelian", "A people of western Georgia speaking a language related to but distinct from Georgian."],
  ["Adjarian", "Muslim Georgians of the Black Sea coast around Batumi."],
  ["Pontic Greek", "Greeks of the Black Sea coast, uprooted from Anatolia in the 1920s population exchange."],
  ["Cretan", "Islanders of Crete, fiercely proud heirs of the Bronze-Age Minoan civilisation."],
  ["Arbëreshë", "Albanians who fled to southern Italy 500 years ago and still speak an archaic Albanian."],
  ["Gilak", "A people of Iran's lush Caspian coast, with their own language and rice paddies."],
  ["Talysh", "A people split between Iran and Azerbaijan, speaking an old northwestern Iranian tongue."],
  ["Qashqai", "Turkic-speaking nomadic herders of southern Iran, famous for their carpets."],
  ["Hazara", "A Persian-speaking, mostly Shia people of central Afghanistan, often harshly persecuted."],
  ["Pamiri", "Mountain peoples of the high Pamirs where Tajikistan, Afghanistan and China meet."],
  ["Alawite", "A secretive offshoot of Shia Islam in Syria — the community of the ruling Assad family."],
  ["Maronite", "An ancient Eastern Catholic church of Lebanon, central to the country's identity."],
  ["Bengali", "One of the world's largest peoples, of Bangladesh and India's West Bengal, with a Nobel-winning literature."],
  ["Gujarati", "A trading people of western India — Gandhi's homeland — found in business communities worldwide."],
  ["Marathi", "The people of Maharashtra and Mumbai in western India, heirs of the Maratha empire."],
  ["Sindhi", "A people of the Indus valley in Pakistan, with a large Hindu diaspora after the 1947 partition."],
  ["Kashmiri", "People of the beautiful, bitterly disputed Himalayan vale of Kashmir."],
  ["Sinhalese", "The Buddhist majority of Sri Lanka, with a 2,000-year written chronicle of their island."],
  ["Rohingya", "A stateless Muslim people of Myanmar, driven by the hundreds of thousands into exile."],
  ["Newar", "The indigenous people of Nepal's Kathmandu Valley, master builders of its pagoda temples."],
  ["Balti", "A Tibetan Buddhist-turned-Muslim people of the Karakoram mountains."],
  ["Ladakhi", "A Tibetan Buddhist people of India's high 'Little Tibet' in the Himalayas."],
  ["Burusho", "An isolated people of the Hunza valley speaking Burushaski, a language related to no other."],
  ["Cantonese", "The people of Guangdong and Hong Kong, whose food and language spread worldwide via emigration."],
  ["Zhuang", "China's largest ethnic minority — a Tai people of the southern Guangxi region."],
  ["Karen", "A people of Myanmar and Thailand, among the longest-running insurgents in the world."],
  ["Shan", "A Tai Buddhist people of eastern Myanmar's hills, kin to the Thai and Lao."],
  ["Chamorro", "The indigenous people of Guam and the Marianas in Micronesia."],
  ["Mon people", "An ancient people of Myanmar and Thailand who first spread Buddhism across the region."],
  ["Kachin", "A hill people of northern Myanmar, long at war with the central government."],
  ["Chin people", "A cluster of hill peoples on the Myanmar–India border, many of them Christian."],
  ["Rakhine", "A Buddhist people of Myanmar's western coast — the old kingdom of Arakan."],
  ["Acehnese", "A devoutly Muslim people of northern Sumatra, the first part of Indonesia to embrace Islam."],
  ["Balinese", "The Hindu islanders of Bali — an island of temples amid Muslim Indonesia."],
  ["Sundanese", "The second-largest people of Indonesia, of western Java."],
  ["Batak", "Peoples of highland Sumatra, known for their dramatic boat-shaped houses."],
  ["Minangkabau", "A West Sumatran people who run the world's largest matrilineal society."],
  ["Dayak", "The indigenous peoples of Borneo's rainforests, once feared as headhunters."],
  ["Bugis", "Seafaring people of Sulawesi whose traders ranged across all of maritime Asia."],
  ["Cham", "A formerly Hindu, now largely Muslim people — the remnant of the old kingdom of Champa."],
  ["Igorot", "The terrace-building highland peoples of the northern Philippines."],
  ["Bangsamoro", "The Muslim peoples of the southern Philippines, granted their own autonomous region."],
  ["Tahitian", "The Polynesian people of Tahiti, whose islands inspired Europe's dreams of paradise."],
  ["Samoan", "A Polynesian people of strong chiefly traditions, split between independent and American Samoa."],
  ["Rapa Nui", "The Polynesian people of remote Easter Island, who carved the giant moai statues."],
  ["West Papuan", "The Melanesian people of Indonesian-ruled western New Guinea, with a long independence struggle."],
  ["Bougainville", "Pacific islanders who voted overwhelmingly to leave Papua New Guinea in 2019."],
  ["Inuit", "The indigenous people of the Arctic, from Greenland across Canada to Alaska."],
  ["Métis", "A distinct people born of First Nations and French-Canadian unions on the Canadian plains."],
  ["Iroquois", "The Haudenosaunee confederacy, whose democratic league is said to have influenced the US founders."],
  ["Mohawk", "An Iroquois nation famed for the ironworkers who built New York's skyscrapers."],
  ["Apache", "Nomadic warriors of the American Southwest, led by Geronimo against the US Army."],
  ["Hopi", "A Pueblo people of Arizona living in some of North America's oldest inhabited villages."],
  ["Seminole", "A Florida nation that famously never signed a peace treaty with the United States."],
  ["Maya", "Heirs of a civilisation that built pyramids and tracked the stars across Mexico and Central America."],
  ["Nahua", "The people of the Aztec language, Nahuatl, still spoken by over a million Mexicans."],
  ["Zapotec", "An ancient people of Oaxaca who built the mountaintop city of Monte Albán."],
  ["Garifuna", "An Afro-Indigenous people of Central America's Caribbean coast, with their own language and drumming."],
  ["Guna", "An indigenous people of Panama's islands who run one of the Americas' most autonomous territories."],
  ["Wayuu", "The largest indigenous people of Colombia and Venezuela, of the arid Guajira desert."],
  ["Selk'nam", "An indigenous people of Tierra del Fuego, all but wiped out by settlers around 1900."],
  ["Charrúa", "The indigenous people of Uruguay, largely destroyed in a 19th-century massacre."],
  ["Afrikaner", "Descendants of Dutch settlers in South Africa, whose language Afrikaans grew out of old Dutch."],
  ["Cajun", "French Acadians exiled to Louisiana, where they created a unique music and cuisine."],
  ["Acadian", "French settlers of Canada's Maritimes, brutally deported by the British in the 1750s."],

  // ── Batch 3: more states ──
  ["Tanganyika", "Mainland Tanzania before it merged with Zanzibar in 1964 to form modern Tanzania."],
  ["Federation of Rhodesia and Nyasaland", "A short-lived British federation of today's Zimbabwe, Zambia and Malawi (1953–63)."],
  ["Zimbabwe Rhodesia", "A brief 1979 attempt at a moderate biracial Rhodesia, on the road to Zimbabwe's independence."],
  ["Union of South Africa", "The British dominion (1910–61) that became the Republic of South Africa."],
  ["South Kasai", "A diamond-rich region that, like Katanga, tried to break away from Congo in 1960."],
  ["State of Anjouan", "A small island that repeatedly tried to break away from the Comoros."],
  ["Mohéli", "A small Comoros island that briefly declared its own independence in 1997."],
  ["Kingdom of Merina", "The Madagascar kingdom that unified most of the island before the French conquest of 1896."],
  ["Ciskei", "An apartheid-era Xhosa 'homeland', recognised by no one but South Africa."],
  ["Venda", "An apartheid 'homeland' in northern South Africa, reabsorbed in 1994."],
  ["Republic of Maryland", "A colony of freed American slaves on the West African coast that merged into Liberia."],
  ["Acre", "A rubber-rich Amazon territory that broke from Bolivia and was bought by Brazil in 1903."],
  ["Republic of Anguilla", "The Caribbean island wanted to stay British so badly it 'declared independence' to escape St Kitts in 1967."],
  ["Araucanía and Patagonia", "A French lawyer had himself crowned king of a would-be Mapuche realm in 1860."],
  ["Federal Republic of Central America", "A union of today's Guatemala, Honduras, El Salvador, Nicaragua and Costa Rica (1823–38)."],
  ["Deseret", "The Mormons' proposed state in the 1850s American West, far larger than today's Utah."],
  ["Dominion of Newfoundland", "A self-governing British dominion that gave up independence to join Canada in 1949."],
  ["Peru-Bolivian Confederation", "A short-lived 1830s union of Peru and Bolivia, broken up by Chile."],
  ["Lower Canada", "French-speaking Quebec under British rule, before the provinces joined to form Canada."],
  ["Upper Canada", "English-speaking Ontario under British rule, the partner of Lower Canada."],
  ["West Indies Federation", "A 1958–62 attempt to unite Britain's Caribbean colonies into a single nation."],
  ["Republic of Ararat", "A short-lived Kurdish republic in eastern Turkey (1927–31)."],
  ["State of Burma", "A Japanese-sponsored Burmese state during the Second World War."],
  ["Republic of Ezo", "A breakaway samurai republic on Hokkaido (1869), Japan's very first attempt at a republic."],
  ["Goryeo", "The medieval Korean kingdom that gave Korea its English name."],
  ["Kingdom of Hejaz", "The Arabian kingdom of the holy cities Mecca and Medina, absorbed into Saudi Arabia in 1925."],
  ["Kingdom of Kurdistan", "A brief British-era Kurdish kingdom in northern Iraq (1922–24)."],
  ["Republic of Mahabad", "The only modern Kurdish state — a Soviet-backed republic in Iran that lasted under a year in 1946."],
  ["Sultanate of Nejd", "The desert heartland of the House of Saud, which grew into modern Saudi Arabia."],
  ["Federation of South Arabia", "A British-backed federation around Aden that became South Yemen."],
  ["South Moluccas", "A breakaway republic in eastern Indonesia (1950), crushed by the new Indonesian state."],
  ["Tagalog Republic", "A Filipino revolutionary government that fought on against US rule after 1898."],
  ["Empire of Vietnam", "A brief Japanese-sponsored Vietnamese empire in 1945, on the eve of independence."],
  ["Transcaucasian", "A short-lived 1918 federation of Georgia, Armenia and Azerbaijan."],
  ["Kingdom of Bau", "A Fijian island kingdom whose chief Cakobau united much of Fiji."],
  ["Franceville", "A tiny self-governing town in the New Hebrides (1889) — among the first to grant universal suffrage."],
  ["Republic of Alsace-Lorraine", "A council republic that flickered in Strasbourg for a few days in 1918."],
  ["Grand Duchy of Baden", "A southwest German state (1806–1918), now part of Baden-Württemberg."],
  ["Grand Duchy of Hesse", "A German state (1806–1918) along the Rhine, centred on Darmstadt."],
  ["Byelorussian", "Soviet Belarus — which, remarkably, held its own seat at the United Nations."],
  ["Ukrainian Soviet", "Soviet Ukraine — like Belarus, it held a separate UN seat from the USSR itself."],
  ["Kingdom of Castille", "The medieval Spanish kingdom whose crown, joined to Aragon, created Spain."],
  ["Catalan Republic", "Catalonia has declared a republic several times — in 1641, 1931 and 1934 — each time short-lived."],
  ["Independent State of Croatia", "A brutal Nazi-puppet Croatia (1941–45) run by the fascist Ustaše."],
  ["Eastern Rumelia", "An autonomous Ottoman province that swiftly merged into Bulgaria in 1885."],
  ["Kingdom of England", "England stood as its own kingdom for some 800 years, until the 1707 union with Scotland."],
  ["Kingdom of Scotland", "Scotland was an independent kingdom for over 800 years, until the 1707 union with England."],
  ["Free City of Hamburg", "The great German port governed itself as a sovereign city-state for centuries."],
  ["Second Spanish Republic", "Spain's democratic republic (1931–39), overthrown by Franco in the Civil War."],
  ["Tavolara", "A tiny Sardinian island once styled, half in jest, the smallest kingdom in the world."],
  ["West Ukrainian", "A short-lived Ukrainian republic in Galicia (1918–19) as Austria-Hungary collapsed."],
  ["Republic of Western Bosnia", "A renegade Bosniak statelet during the 1990s Bosnian War."],
  ["League of Lezhë", "The 15th-century Albanian alliance led by the hero Skanderbeg against the Ottomans."],
  ["Couto Misto", "A self-governing micro-republic on the Spain–Portugal border for 800 years, until 1868."],
  ["Cantonal Republic of Negros", "A short-lived sugar-island republic in the Philippines (1898–1901)."],

  // ── Batch 3: more peoples ──
  ["Amhara", "The historically dominant people of Ethiopia's highlands, long the language of its court."],
  ["Tigrayan", "A people of northern Ethiopia at the heart of a devastating recent war."],
  ["Tigrinya", "The main people of Eritrea and Ethiopia's Tigray, sharing an ancient Semitic language."],
  ["Afar", "Nomadic herders of the scorching Horn of Africa lowlands — one of the hottest places on Earth."],
  ["Beja", "Nomads of the deserts between the Nile and the Red Sea, herders since pharaonic times."],
  ["Sidama", "A people of southern Ethiopia who in 2020 voted to form their own region."],
  ["Fula", "Cattle-herding Muslims spread in a great belt right across the West African Sahel."],
  ["Kanuri", "A people of the Lake Chad basin, heirs of the thousand-year Kanem-Bornu empire."],
  ["Songhai", "Heirs of a great Sahel empire that ruled the Niger bend and the fabled city of Timbuktu."],
  ["Dinka", "The tall cattle-herding people of South Sudan's wetlands — its largest ethnic group."],
  ["Nuer", "A cattle-herding people of South Sudan, neighbours and rivals of the Dinka."],
  ["Shilluk", "A Nile people of South Sudan with a sacred divine kingship."],
  ["Nubian", "A people of the Nile in southern Egypt and Sudan, heirs of ancient Black-pharaoh kingdoms."],
  ["Fur people", "The people who give Darfur — 'land of the Fur' — its name, in western Sudan."],
  ["Toubou", "Desert nomads of the Sahara around the Tibesti mountains of Chad and Libya."],
  ["Acholi", "A people of northern Uganda and South Sudan, scarred by the Lord's Resistance Army war."],
  ["Twa people", "Forest-dwelling Pygmy peoples of the Great Lakes region of Central Africa."],
  ["Ewe people", "A people of Ghana, Togo and Benin, known for their intricate drumming and kente-style cloth."],
  ["Bamileke", "An enterprising people of Cameroon's western highlands, with grand chiefdoms."],
  ["Ijaw", "A people of Nigeria's oil-rich Niger Delta creeks and mangroves."],
  ["Nupe", "Famed metalworkers and glassmakers of central Nigeria, on the Niger River."],
  ["Ogoni", "A small Niger Delta people whose protests against oil pollution drew the world's attention."],
  ["Tiv people", "A large farming people of Nigeria's Benue valley, known for their striking black-and-white cloth."],
  ["Sotho", "The mountain people of Lesotho and South Africa, famed for their blankets and pony-trekking."],
  ["Tswana", "The main people of Botswana, spread also across northern South Africa."],
  ["Herero", "A cattle-herding people of Namibia who survived a German colonial genocide."],
  ["Lozi", "A people of the Zambezi floodplain in western Zambia, with a yearly royal boat migration."],
  ["Swazi", "The people of Eswatini — southern Africa's last absolute monarchy."],
  ["Kikuyu", "Kenya's largest ethnic group, farmers of the highlands around Mount Kenya."],
  ["Ganda", "The people of the Buganda kingdom in Uganda — the country's very name comes from theirs."],
  ["Bemba", "The largest people of Zambia, of its northern plateau."],
  ["Bubi", "The indigenous islanders of Bioko in Equatorial Guinea."],
  ["Chokwe", "A people of Angola and Congo renowned across Africa for their masks and sculpture."],
  ["Toro people", "A Bantu kingdom-people of western Uganda."],
  ["Nyoro", "Heirs of the Bunyoro kingdom, once one of the most powerful in East Africa."],
  ["Rashaida", "Arab camel-herding nomads who migrated into Eritrea and Sudan in the 19th century."],
  ["Hui people", "Chinese-speaking Muslims spread across China, descendants of Silk Road traders."],
  ["Naxi", "A people of China's Yunnan mountains who kept the world's last living pictographic script."],
  ["Lahu", "A hill people of the China–Myanmar–Thailand borderlands."],
  ["Akha", "A hill people of the Golden Triangle, famed for the silver headdresses of their women."],
  ["Kayah", "A people of eastern Myanmar, also called the Karenni or 'red Karen'."],
  ["Kayan", "A Myanmar people known for the brass neck-rings worn by their women."],
  ["Wa people", "A formerly headhunting people of the Myanmar–China border who now run an autonomous statelet."],
  ["Palaung", "A tea-growing hill people of northern Myanmar."],
  ["Mizo", "A Christian hill people of India's Mizoram, on the Myanmar border."],
  ["Meitei", "The majority people of India's Manipur, with their own ancient script and dance-drama."],
  ["Naga", "A cluster of formerly headhunting hill peoples of India and Myanmar, mostly Christian today."],
  ["Bodo", "A people of India's Assam with their own autonomous region."],
  ["Garo", "A matrilineal hill people of India's Meghalaya."],
  ["Tripuri", "The indigenous people of India's Tripura, descendants of its old royal line."],
  ["Muong", "A people of Vietnam's hills, close kin of the Vietnamese majority."],
  ["Degar", "The 'Montagnard' highland peoples of Vietnam, who fought alongside US forces in the war."],
  ["Khmer Krom", "Ethnic Khmer of southern Vietnam's Mekong Delta, a region once part of Cambodia."],
  ["Pattani", "Malay Muslims of southern Thailand, long in tension with the Thai state."],
  ["Malays", "The Muslim people of the Malay Peninsula and archipelago, across Malaysia, Indonesia and beyond."],
  ["Banjar", "A people of southern Borneo, great river traders of Indonesia."],
  ["Minahasan", "A largely Christian people of northern Sulawesi in Indonesia."],
  ["Moluccan", "Islanders of the Maluku 'Spice Islands' that Europe once fought wars to control."],
  ["Cebuano", "The people of Cebu and the central Philippines — the country's second-largest group."],
  ["Ilocano", "A hardy, thrifty people of the northern Philippines with a large overseas diaspora."],
  ["Hiligaynon", "A people of the western Visayas in the Philippines, also called Ilonggo."],
  ["Maguindanao", "A Muslim people of the southern Philippines, heirs of a once-powerful sultanate."],
  ["Amis people", "The largest indigenous people of Taiwan, of its lush eastern coast."],
  ["Tao people", "An Austronesian people of Taiwan's Orchid Island, famed for their flying-fish festival."],
  ["Sikh", "Followers of a faith founded in 15th-century Punjab; the turban and uncut hair are iconic of its men."],
  ["Jain", "An ancient Indian faith of radical non-violence — its monks sweep the path to avoid harming insects."],
  ["Muhajir", "Urdu-speaking Muslims who migrated from India to Pakistan at the 1947 partition."],
  ["Rajasthani", "People of India's desert state of Rajasthan — land of forts, palaces and the Thar."],
  ["Kutchi", "A trading people of the Kutch salt-marshes of western India."],
  ["Madhesi", "People of Nepal's southern plains, culturally close to neighbouring India."],
  ["Bihari", "People of India's populous Bihar — and the stranded Urdu-speakers of Bangladesh."],
  ["Siddi", "An African-descended people of India and Pakistan, brought over centuries ago as traders, sailors and slaves."],
  ["Kannadiga", "The people of Karnataka and Bangalore in southern India, speakers of ancient Kannada."],
  ["Chukchi", "Reindeer-herders and sea-mammal hunters of Russia's far northeastern tip, facing Alaska."],
  ["Koryak", "An indigenous people of Russia's Kamchatka peninsula."],
  ["Nivkh", "An isolated people of the Amur mouth and Sakhalin, with a language unrelated to any other."],
  ["Itelmen", "The indigenous people of Kamchatka in Russia's Far East."],
  ["Dolgan", "A Turkic-speaking reindeer people of Russia's Taymyr Arctic."],
  ["Altai", "A Turkic people of the Altai mountains where Russia, Mongolia, China and Kazakhstan meet."],
  ["Khakas", "A Turkic people of south-central Siberia."],
  ["Karakalpak", "A Turkic people with their own republic by the shrinking Aral Sea."],
  ["Karachay", "A Turkic people of the North Caucasus, deported wholesale by Stalin in 1943."],
  ["Balkar", "A Turkic mountain people of the North Caucasus, close kin of the Karachay."],
  ["Nogai", "A Turkic people of the southern Russian steppe, descendants of the Golden Horde."],
  ["Kumyk", "A Turkic people of the Dagestan plains by the Caspian Sea."],
  ["Meskhetian", "A Turkic people deported from Georgia by Stalin and scattered ever since."],
  ["Turkish Cypriot", "The Turkish-speaking community of northern Cyprus, divided from the Greek south since 1974."],
  ["Iraqi Turkmen", "A Turkic people of northern Iraq, around the oil city of Kirkuk."],
  ["Evenk", "Reindeer-herding hunters spread thinly across a vast swathe of Siberia."],
  ["Nanai", "A fishing people of the lower Amur River in the Russian Far East."],
  ["Evens", "Reindeer-herding nomads of northeastern Siberia, kin of the Evenks."],
  ["Oirat", "The western Mongols, whose Dzungar khanate was the last great steppe empire."],
  ["Dargin", "A people of the Dagestan mountains in the North Caucasus."],
  ["Tabasaran", "A Caucasus people of Dagestan, said to have one of the most grammatically complex languages on Earth."],
  ["Abazin", "A small Caucasus people, close kin of the Abkhaz."],
  ["Jeju", "Islanders of Korea's volcanic Jeju, famed for their female free-diving 'haenyeo'."],
  ["Ryukyu", "The indigenous people of Okinawa, once their own seafaring kingdom before Japan annexed it."],
  ["Burakumin", "A historically outcast group within Japan, descendants of 'unclean' trades, still facing quiet prejudice."],
  ["Aromanian", "A Latin-speaking people scattered across the southern Balkans, cousins of the Romanians."],
  ["Romansh", "Speakers of Switzerland's fourth national language — a Latin tongue of the Alpine valleys."],
  ["Ladin people", "A Latin-speaking people of the Italian Dolomites, related to Romansh and Friulian."],
  ["Friulian", "A people of Italy's northeast with their own Latin language, around Udine."],
  ["Jèrriais", "The Norman-French speakers of Jersey in the Channel Islands."],
  ["Guernésiais", "The Norman-French speakers of Guernsey in the Channel Islands."],
  ["Tuscan", "People of Tuscany, whose dialect — polished by Dante — became standard Italian."],
  ["Emilian", "A people of north-central Italy around Bologna, in the food-rich Emilia region."],
  ["Romagnol", "People of Romagna on Italy's Adriatic coast, around Rimini and Ravenna."],
  ["Ticinese", "Italian-speaking Swiss of the southern canton of Ticino."],
  ["Aostan", "The French-speaking people of Italy's Alpine Aosta Valley."],
  ["Scanian", "People of Scania, the southern tip of Sweden that was Danish until 1658."],
  ["Faroese", "The Norse-descended islanders of the windswept Faroes in the North Atlantic."],
  ["Gotlander", "Islanders of Gotland, the Baltic isle that was a great Viking-age trading hub."],
  ["Bohemian", "An old name for the Czechs of Bohemia, the western Czech lands around Prague."],
  ["Masovian", "A people of central Poland, around Warsaw."],
  ["Masurian", "A people of the lake-dotted northeast of Poland, historically Protestant."],
  ["Šokci", "A small Catholic South Slavic people of the Croatia–Serbia–Hungary borderlands."],
  ["Crimean Karaite", "A small Turkic-speaking Jewish community of Crimea that follows only the written Torah."],
  ["Bnei Menashe", "A community in northeast India who claim descent from a lost tribe of Israel."],
  ["Shabak", "A small, distinct religious people of northern Iraq, near Mosul."],
  ["Hadhrami", "Arabs of Yemen's Hadhramaut valley — famed seafarers and traders across the Indian Ocean."],

  // ── Batch 4: European regions ──
  ["Azorean", "Islanders of the mid-Atlantic Azores, Portugal's volcanic outpost halfway to America."],
  ["Madeiran", "Islanders of Madeira, Portugal's flower-and-wine island off the African coast."],
  ["Cantabrian", "A people of Spain's rugged green north coast, around Santander."],
  ["Murcian", "People of Murcia in Spain's hot, fertile southeast — 'the orchard of Europe'."],
  ["Extremaduran", "A people of Spain's western plains, homeland of many conquistadors of the Americas."],
  ["Mirandese", "Speakers of Mirandese, a second official language in a tiny corner of northeast Portugal."],
  ["Lyonnais", "People of Lyon, France's gastronomic capital at the meeting of two rivers."],
  ["Lorrain", "A people of Lorraine in northeast France, long fought over with Germany."],
  ["Champenois", "People of Champagne — the only region whose sparkling wine may legally bear the name."],
  ["Poitevin", "A people of west-central France around Poitiers, with their own old Romance speech."],
  ["Auvergnat", "A hardy people of France's volcanic Auvergne highlands."],
  ["Limousin", "People of the Limousin in central France — also a cattle breed, and the car."],
  ["Béarnese", "A people of Béarn in the French Pyrenees, homeland of King Henry IV of France."],
  ["Niçard", "People of Nice on the French Riviera, only French since 1860."],
  ["Arpitan", "Speakers of Arpitan (Franco-Provençal), an old language of the western Alps."],
  ["Ligurian", "People of the Italian Riviera around Genoa, with their own seafaring tongue."],
  ["Piedmontese", "People of Piedmont in Italy's northwest — the region that led Italian unification."],
  ["Umbrian", "People of Umbria, the green, hilly heart of Italy, around Assisi and Perugia."],
  ["Campanian", "People of Campania around Naples — the land of pizza, Pompeii and Vesuvius."],
  ["Lucanian", "People of Basilicata, ancient Lucania, Italy's remote southern interior."],
  ["Molisan", "People of Molise, Italy's tiny, often-overlooked southern region."],
  ["Mecklenburg", "A people of Germany's lake-strewn Baltic northeast."],
  ["Brandenburg", "A people of the German region surrounding Berlin."],
  ["Thuringian", "People of Thuringia, the forested 'green heart' of Germany."],
  ["Palatine", "A people of Germany's Palatinate wine country; many emigrated to America in the 1700s."],
  ["Vorarlberg", "The westernmost Austrians — Alemannic-speakers closer to the Swiss than to Vienna."],
  ["Cimbrian", "An old German-speaking 'language island' people in the mountains of northern Italy."],
  ["Walser", "Alpine German settlers scattered in high villages across Switzerland and northern Italy."],
  ["Zeelandic", "People of Zeeland, the Dutch province of islands wrested back from the sea."],
  ["Orcadian", "Islanders of Orkney off northern Scotland, with deep Norse roots."],
  ["Shetland", "Islanders of Shetland — Britain's far north, closer to Norway than to London."],
  ["Kven", "A Finnic-descended people of Arctic northern Norway."],
  ["Trønder", "People of the Trøndelag around Trondheim, Norway's medieval capital."],
  ["South Schleswig Dane", "The Danish-speaking minority in Germany's far north, near the border."],
  ["Carinthian Slovene", "The Slovene-speaking minority of southern Austria."],
  ["Greek Cypriot", "The Greek-speaking majority of Cyprus, divided from the Turkish north since 1974."],
  ["Cappadocian Greek", "Greeks of central Anatolia, uprooted to Greece in the 1923 population exchange."],
  ["Sarakatsani", "Traditionally nomadic shepherds of the Greek and Balkan mountains."],
  ["Gozitan", "Islanders of Gozo, Malta's quieter, greener sister island."],
  ["Székely", "A Hungarian people of Transylvania with their own old runic script and historic privileges."],
  ["Csángó", "An archaic Hungarian-speaking Catholic people of eastern Romania."],
  ["Yenish", "An itinerant people of Western Europe, sometimes called the 'white Gypsies'."],
  ["Irish Traveller", "A traditionally nomadic Irish ethnic group with their own cant, Shelta."],

  // ── Batch 4: Caucasus, Middle East & more ──
  ["Western Armenian", "Armenians of historic Anatolia, scattered worldwide after the 1915 genocide."],
  ["Svan", "A mountain people of northern Georgia's high Caucasus, with their own language and tower-houses."],
  ["Laz people", "A Kartvelian people of the eastern Black Sea coast, in Turkey and Georgia."],
  ["Lak people", "A people of the Dagestan mountains in the North Caucasus."],
  ["Tsakhur", "A tiny people of the high Caucasus on the Russia–Azerbaijan border."],
  ["Rutul", "A small people of the southern Dagestan mountains."],
  ["Tat people", "A Persian-speaking people of the eastern Caucasus, including a distinct Jewish branch."],
  ["Mehri", "Speakers of an ancient pre-Arabic South Arabian language in Yemen and Oman."],
  ["Soqotri", "Islanders of Yemen's Socotra — an Indian Ocean isle of dragon's-blood trees found nowhere else."],
  ["Lur people", "A pastoral people of Iran's western Zagros mountains."],

  // ── Batch 4: Africa ──
  ["Mossi", "The largest people of Burkina Faso, heirs of powerful warrior kingdoms."],
  ["Bambara", "The largest ethnic group of Mali, whose language is a Sahel lingua franca."],
  ["Mandinka", "A West African people, descendants of the Mali empire, found from Senegal to Guinea."],
  ["Wolof", "The largest people of Senegal, known for their elegant fashion and griot music."],
  ["Serer", "A people of Senegal and the Gambia with ancient traditions and a famed wrestling culture."],
  ["Dogon", "A people of Mali's cliffs, world-famous for their cosmology, masks and astronomy."],
  ["Ndebele", "A South African people celebrated for their dazzling geometric house-painting and beadwork."],
  ["Shona", "The largest people of Zimbabwe — builders of the medieval stone city of Great Zimbabwe."],
  ["Ovambo", "The largest people of Namibia, of the northern borderlands."],
  ["Mbunda", "A people of Angola and Zambia, keepers of a rich mask-and-dance tradition."],
  ["Lunda", "A people of an old Central African empire, spread across Congo, Angola and Zambia."],
  ["Mahoran", "The people of Mayotte — an Indian Ocean island that chose to stay French."],
  ["Swahili", "The coastal people of East Africa whose language, born of African and Arab trade, spans the region."],

  // ── Batch 4: South Asia ──
  ["Khasi", "A matrilineal hill people of India's Meghalaya, builders of living root bridges."],
  ["Sherpa", "A Himalayan people of Nepal, legendary as the mountaineers of Everest."],
  ["Limbu", "An indigenous people of eastern Nepal's hills."],
  ["Tharu", "An indigenous people of Nepal's southern lowlands, long resistant to malaria."],
  ["Chakma", "A Buddhist people of the Chittagong Hill Tracts in Bangladesh."],
  ["Kalash", "A tiny pagan people of Pakistan's Hindu Kush valleys, with a unique polytheistic faith."],
  ["Vedda", "The indigenous forest people of Sri Lanka, predating the Sinhalese and Tamils."],

  // ── Batch 4: East & Southeast Asia ──
  ["Dong people", "A people of southern China famed for their drum-towers and wind-and-rain bridges."],
  ["Bai people", "A people of China's Yunnan around Dali, with a long Buddhist heritage."],
  ["Tujia", "One of China's largest ethnic minorities, of the south-central mountains."],
  ["Lisu", "A hill people of the China–Myanmar borderlands, mostly Christian."],
  ["Toraja", "A people of Sulawesi in Indonesia, renowned for their elaborate funerals and cliff-tombs."],
  ["Madurese", "A people of the island of Madura off Java, with a reputation for hardiness."],
  ["Sasak", "The native Muslim people of the Indonesian island of Lombok."],
  ["Tausug", "A seafaring Muslim people of the Sulu islands in the Philippines."],
  ["Maranao", "A Muslim people of Lake Lanao in the southern Philippines, famed for the sarimanok bird motif."],
  ["Kapampangan", "A people of central Luzon in the Philippines, celebrated for their cuisine."],
  ["Atayal", "A formerly facial-tattooing indigenous people of Taiwan's northern mountains."],
  ["Paiwan", "An indigenous people of southern Taiwan, known for their carved chieftains' houses."],
  ["Bunun", "A mountain-dwelling indigenous people of Taiwan, famed for their polyphonic singing."],

  // ── Batch 4: Oceania ──
  ["Marquesan", "Polynesians of the remote Marquesas, whose art helped inspire the modern tattoo revival."],
  ["Cook Islander", "Polynesians of the Cook Islands, in free association with New Zealand."],
  ["Niuean", "Polynesians of Niue — one of the world's largest coral islands."],
  ["Yapese", "Micronesians of Yap, famous for their giant stone money discs."],
  ["Chuukese", "Micronesians of Chuuk lagoon, site of a vast sunken WWII Japanese fleet."],
  ["Rotuman", "A Polynesian people of an island within Fiji, with their own distinct culture."],
  ["Kanak", "The indigenous Melanesian people of New Caledonia, with a long independence movement."],
  ["Enga", "A highland people of one of Papua New Guinea's most populous provinces."],
  ["Yolngu", "An Aboriginal people of Arnhem Land, whose bark paintings and didgeridoo are world-famous."],
  ["Noongar", "The Aboriginal people of Australia's southwest, around Perth."],
  ["Larrakia", "The Aboriginal 'saltwater people' of the Darwin region in northern Australia."],
  ["Ngarrindjeri", "An Aboriginal people of the lower Murray River and lakes of South Australia."],
  ["Anangu", "The Aboriginal traditional owners of Uluru in Australia's red centre."],
  ["Meriam", "Torres Strait Islanders of Mer, whose land case overturned Australia's 'terra nullius' myth."],
  ["Wiradjuri", "One of the largest Aboriginal nations, of central New South Wales."],

  // ── Batch 4: the Americas ──
  ["Aleut", "The indigenous people of the Aleutian island chain stretching from Alaska toward Asia."],
  ["Tlingit", "An indigenous people of the Alaskan and Canadian Pacific coast — master totem-pole carvers."],
  ["Haida", "An indigenous people of Haida Gwaii off Canada's Pacific coast, renowned artists and canoe-builders."],
  ["Cree", "One of the largest First Nations of Canada, spread across its forests and plains."],
  ["Blackfoot", "A Plains confederacy of the US–Canada border, fearsome buffalo-hunting horsemen."],
  ["Cheyenne", "A Plains nation that, with the Lakota, defeated Custer at the Little Bighorn."],
  ["Arapaho", "A Plains people long allied with the Cheyenne across the American West."],
  ["Comanche", "The 'Lords of the Plains', whose horse-borne empire dominated the southern Plains."],
  ["Choctaw", "A southeastern US nation removed on the Trail of Tears — which once gave to Irish famine relief."],
  ["Muscogee", "The Creek nation of the American Southeast, removed to Oklahoma in the 1830s."],
  ["Mixtec", "An ancient people of southern Mexico, master goldsmiths of the pre-Aztec world."],
  ["Otomi", "An indigenous people of central Mexico, weavers of vivid embroidered cloth."],
  ["Rarámuri", "The 'running people' of Mexico's Copper Canyon, famed long-distance runners."],
  ["Wixárika", "The Huichol of western Mexico, known worldwide for their peyote-inspired yarn art."],
  ["Purépecha", "An indigenous people of Michoacán whose empire even the Aztecs failed to conquer."],
  ["Seri people", "A small indigenous people of Mexico's Sonoran desert coast."],
  ["Miskito", "An indigenous people of the Caribbean coast of Nicaragua and Honduras."],
  ["Lenca", "An indigenous people of Honduras and El Salvador; the activist Berta Cáceres was Lenca."],
  ["Ngäbe", "The largest indigenous people of Panama."],
  ["Yanomami", "A people of the deep Amazon on the Brazil–Venezuela border, among the last isolated groups."],
  ["Shuar", "An Amazonian people of Ecuador, once famed for shrinking the heads of their enemies."],
  ["Kogi", "An indigenous people of Colombia's Sierra Nevada who call themselves the Earth's 'elder brothers'."],
  ["Asháninka", "The largest indigenous people of the Peruvian Amazon."],
  ["Kawésqar", "A canoe people of the channels of southern Chilean Patagonia, now very few in number."],
  ["Tehuelche", "The tall nomads of Patagonia whose name may be the very root of 'Patagonia'."],
  ["Diaguita", "An Andean people of northwest Argentina and northern Chile — skilled potters."],
  ["Boer", "Dutch-descended farmers of South Africa, the rural root of the Afrikaners."],
  ["Pied-Noir", "French settlers of colonial Algeria, who fled to France at independence in 1962."],
  ["Newfoundlander", "The seafaring people of Canada's Atlantic island, with a brogue and slang all their own."],
  ["Welsh Argentine", "Descendants of Welsh settlers who founded a Patagonian colony in 1865 — still speaking Welsh."],
  ["Tejano", "Texans of Mexican descent, whose roots predate Texas's break from Mexico."],

  // ── Batch 5: historic peoples ──
  ["Romans", "The people of the city that built an empire ringing the whole Mediterranean for centuries."],
  ["Moors", "The Muslim peoples who ruled much of Spain and Portugal for nearly 800 years."],
  ["Norse", "The Vikings of medieval Scandinavia, whose longships reached from America to Baghdad."],
  ["Goths", "Germanic peoples whose migrations helped bring down the Western Roman Empire."],
  ["Wends", "The westernmost Slavs, who once lived across what is now eastern Germany."],
  ["Wallachian", "Romanians of the medieval principality of Wallachia, between the Carpathians and the Danube."],
  ["Prussian Germans", "The German people of old East Prussia, expelled westward after the Second World War."],
  ["Prussians (Baltic)", "The original Baltic Prussians — a pagan people conquered and absorbed by the Teutonic Knights."],
  ["Soviet people", "The 'new historical community' the USSR hoped to forge from its 100-plus nationalities."],
  ["Cilician Armenian", "Armenians who built a kingdom on the Mediterranean coast during the Crusades."],
  ["Meryans", "An extinct Finnic people of central Russia, absorbed into the Russians centuries ago."],

  // ── Batch 5: more peoples ──
  ["Santal", "One of India's largest tribal peoples, of the eastern forests, with their own script and dances."],
  ["Bhil", "One of India's largest tribal groups, of the western hills, famed for their Pithora paintings."],
  ["Munda", "An Adivasi people of eastern India, whose hero Birsa Munda led a revolt against the British."],
  ["Gond people", "A large Adivasi people of central India, heirs of their own medieval kingdoms."],
  ["Ho people", "An Adivasi people of eastern India's Jharkhand."],
  ["Yi people", "One of China's largest minorities, of the southwestern mountains, with their own syllabic script."],
  ["Bouyei", "A Tai people of China's Guizhou province."],
  ["Qiang", "An ancient people of the Sichuan mountains, said to be among China's oldest ethnic groups."],
  ["Jingpo", "A people of China's Yunnan — the same nation as Myanmar's Kachin."],
  ["Daur", "A Mongolic people of northeastern China and Inner Mongolia."],
  ["Oroqen", "A small hunting people of China's far-northeastern forests."],
  ["Salar", "A Turkic Muslim people of China's Qinghai, who migrated from Central Asia."],
  ["Dongxiang", "A Mongolic-speaking Muslim people of northwestern China."],
  ["Yugur", "A small Buddhist Turkic-Mongolic people of China's Gansu corridor."],
  ["Tay people", "The largest ethnic minority of Vietnam, a Tai people of the northern hills."],
  ["Nung people", "A Tai people of northern Vietnam, close kin of the Tay."],
  ["Yao people", "A people scattered across southern China and Southeast Asia — the same as the Vietnamese Dao."],
  ["Bahnar", "An indigenous Montagnard people of Vietnam's Central Highlands."],
  ["Jarai", "A matrilineal Montagnard people of Vietnam's Central Highlands."],
  ["Waray", "A people of the eastern Visayas in the Philippines, with a reputation for bravery."],
  ["Bicolano", "A people of the Bicol peninsula, famed for fiery chili-and-coconut cuisine."],
  ["Ifugao", "Builders of the spectacular Banaue rice terraces in the northern Philippines."],
  ["Aeta people", "Dark-skinned 'Negrito' peoples among the earliest inhabitants of the Philippines."],
  ["T'boli", "An indigenous people of the southern Philippines, weavers of dreamt t'nalak cloth."],
  ["Sama-Bajau", "Sea nomads of maritime Southeast Asia who live much of their lives afloat."],
  ["Yakan", "A Muslim people of the southern Philippines, known for their bright geometric weaving."],
  ["Betawi", "The native people of Jakarta — a creole mix at the heart of the Indonesian capital."],
  ["Ambonese", "Islanders of Ambon in the Moluccas, with a strong Christian and seafaring tradition."],
  ["Asmat", "A people of the swamps of Indonesian Papua, world-renowned woodcarvers."],
  ["Dani people", "A highland people of Indonesian Papua, famous for their pig feasts and elaborate dress."],
  ["Nias people", "Islanders off western Sumatra, famed for their megaliths and stone-jumping ritual."],
  ["Mentawai", "An indigenous people of islands off Sumatra, known for their full-body tattoos."],
  ["Gayo", "A highland people of Aceh in northern Sumatra."],
  ["Tokelauan", "Polynesians of three tiny atolls, a dependency of New Zealand."],
  ["Wallisian", "Polynesians of Wallis (ʻUvea), part of France's Wallis and Futuna."],
  ["Pohnpeian", "Micronesians of Pohnpei, home of the mysterious stone city of Nan Madol."],
  ["Kosraean", "Micronesians of Kosrae, the easternmost of the Federated States of Micronesia."],
  ["Banaban", "Pacific islanders relocated from phosphate-stripped Banaba to a Fijian island."],
  ["Tolai", "A people of New Britain in Papua New Guinea, who once used strings of shell money."],
  ["Manus Islander", "People of the Admiralty Islands in Papua New Guinea."],
  ["Mi'kmaq", "A First Nation of Canada's Atlantic Maritimes, among the first to meet European explorers."],
  ["Innu people", "An indigenous people of Quebec and Labrador's subarctic interior."],
  ["Dene people", "The Athabaskan peoples of Canada's vast northwestern subarctic."],
  ["Nez Perce", "A Plateau people of the US Northwest, whose 1877 fighting retreat under Chief Joseph became legendary."],
  ["Shoshone", "A Great Basin people of the US West; Sacagawea, who guided Lewis and Clark, was Shoshone."],
  ["Paiute", "A Great Basin people of the deserts of Nevada and the broader American West."],
  ["Ute people", "A people of the Rocky Mountains who gave the US state of Utah its name."],
  ["Shawnee", "An eastern woodlands nation whose leader Tecumseh forged a great confederacy against US expansion."],
  ["Ojibwe", "One of North America's largest indigenous nations of the Great Lakes — also called Anishinaabe or Chippewa."],
  ["Osage", "An Oklahoma nation that became, briefly, the richest people per head on Earth after striking oil."],
  ["Pawnee", "A Plains nation of Nebraska, once renowned as scouts for the US Army."],
  ["Kiowa", "A Plains nation of the southern US, long allied with the Comanche."],
  ["Pomo people", "A people of northern California, among the finest basket-weavers in the world."],
  ["Chumash", "A people of the southern California coast and its islands, skilled plank-canoe builders."],
  ["Yurok", "California's largest Native nation, of the redwood coast and the Klamath River."],
  ["Zuni", "A Pueblo people of New Mexico, famed for their inlaid silver-and-stone jewellery."],
  ["Tohono O'odham", "The 'desert people' of Arizona and Sonora, whose land straddles the US–Mexico border."],
  ["Yaqui", "An indigenous people of Sonora and Arizona, famed for their deer dance and fierce independence."],
  ["Mojave", "A people of the Colorado River in the US Southwest desert."],
  ["Totonac", "A people of Mexico's Gulf coast — performers of the dizzying 'flying men' (voladores) ritual."],
  ["Huastec", "A Maya-related people of Mexico's northeast Gulf coast."],
  ["Tzotzil", "A Maya people of the Chiapas highlands in southern Mexico."],
  ["Tzeltal", "A Maya people of Chiapas, neighbours of the Tzotzil."],
  ["Mazatec", "A people of Oaxaca, known for the healer María Sabina and their whistled speech."],
  ["Cora people", "An indigenous people of the western Sierra Madre in Mexico."],
  ["Mayo people", "An indigenous people of northwest Mexico, kin to the Yaqui."],
  ["Triqui", "An indigenous people of Oaxaca, weavers of distinctive red huipils."],
  ["Warao", "A people of Venezuela's Orinoco delta who build their stilt-houses out over the water."],
  ["Embera", "An indigenous people of the rainforests of Colombia and Panama."],
  ["Arhuaco", "An indigenous people of Colombia's Sierra Nevada, in their white robes and pointed hats."],
  ["Ticuna", "The most numerous indigenous people of the Brazilian Amazon."],
  ["Shipibo", "An Amazonian people of Peru, whose intricate geometric art mirrors their visionary traditions."],
  ["Awajún", "An Amazonian people of northern Peru, who resisted both Inca and Spanish conquest."],
  ["Waorani", "An Amazonian people of Ecuador, among the last to make contact with the outside world."],
  ["Wichí", "An indigenous people of the Gran Chaco of Argentina, Bolivia and Paraguay."],
  ["Xavante", "An indigenous people of the Brazilian cerrado, known for their log races and body paint."],
  ["Kayapó", "An Amazonian people of Brazil, famed for their feather headdresses and defence of the rainforest."],
  ["Munduruku", "An Amazonian people of Brazil's Tapajós River, once feared warriors."],
  ["Karajá", "An Amazonian people of Brazil's Araguaia River, makers of distinctive ceramic dolls."],
  ["Toba people", "An indigenous people of the Gran Chaco in northern Argentina, also called the Qom."],

  // ── Batch 5: more European regions ──
  ["Madrileño", "People of Madrid, Spain's lofty central capital."],
  ["Mancheguian", "People of La Mancha — Don Quixote's windmill plains, and a famous sheep's cheese."],
  ["Riojano", "People of La Rioja, the heart of Spain's most famous wine country."],
  ["Aranese", "Speakers of Aranese, an Occitan dialect official in a Pyrenean valley of Catalonia."],
  ["Berrichon", "A people of the Berry, in the rural centre of France."],
  ["Angevin", "People of Anjou in western France, around the Loire and the city of Angers."],
  ["Saintongeais", "People of Saintonge on France's Atlantic coast, with their own old Romance speech."],
  ["Dalmatian Italian", "The dwindling Italian community of Croatia's Dalmatian coast."],
  ["Istrian Italian", "The Italian community of the Istrian peninsula, mostly in Croatia and Slovenia."],
  ["German-speaking Belgian", "The small German-speaking community in Belgium's far east."],
  ["Carpathian German", "German settlers scattered through the mountains of Slovakia."],
  ["Bukovina German", "Germans who settled the Bukovina, today split between Romania and Ukraine."],
  ["Bessarabia German", "Germans who farmed Bessarabia (Moldova) until resettled to Germany during WWII."],
  ["Gronings", "A Low Saxon-speaking people of Groningen in the northern Netherlands."],
  ["Twents", "A Low Saxon people of Twente in the eastern Netherlands."],
  ["Halunder", "The Frisian people of the German island of Heligoland."],
  ["Bornholmer", "Islanders of Bornholm, the Danish isle far out in the Baltic Sea."],
  ["Saaremaa", "Islanders of Estonia's largest island, with deep Viking-age roots."],
  ["Võro", "A people of southeastern Estonia with their own distinct language."],
  ["Izhorian", "A nearly-extinct Finnic people near St Petersburg, close kin of the Karelians."],

  // ── Batch 6: more European regions ──
  ["Dauphinois", "People of the Dauphiné in the French Alps, around Grenoble."],
  ["Bourbonnais", "People of the Bourbonnais in central France, cradle of the Bourbon royal dynasty."],
  ["Tourangeau", "People of Touraine in the Loire valley — 'the garden of France'."],
  ["Bressan", "People of Bresse in eastern France, famed for their prize blue-footed chickens."],
  ["Romand", "The French-speaking Swiss of the country's western, Lake Geneva region."],
  ["Corfiot Italian", "The old Italian-speaking community of the Greek island of Corfu."],
  ["Brigasc", "A tiny Alpine people on the French–Italian border with their own old dialect."],
  ["Alemannic German", "Speakers of the Alemannic dialects of Switzerland, Alsace and southwest Germany."],
  ["North Schleswig German", "The German minority in Denmark's south, mirror of the Danes across the border."],
  ["Drents", "A Low Saxon people of Drenthe in the northeast Netherlands, land of prehistoric dolmens."],
  ["Veluws", "A Low Saxon people of the Veluwe forests in the central Netherlands."],
  ["Urkers", "The tight-knit fishing people of Urk, once an island in the old Zuiderzee."],
  ["Norrlander", "People of Norrland, the vast, sparsely-peopled northern two-thirds of Sweden."],
  ["Smålander", "People of Småland in southern Sweden — thrifty folk, and the home of IKEA's founder."],
  ["Ölander", "Islanders of Öland, Sweden's long, narrow Baltic island of windmills."],
  ["Vendsysselsk", "People of Vendsyssel, the northern tip of Denmark, almost an island of its own."],
  ["Savonian", "A people of the lake-filled Savonia region of eastern Finland."],
  ["Tavastian", "A people of the Tavastia region of southern Finland."],
  ["Kainuu people", "A people of the forested Kainuu region of eastern Finland."],
  ["Tornedalian", "Finnish-speakers of Sweden's far north along the Torne River."],
  ["Forest Finn", "Finns who cleared and farmed the forests of central Sweden and Norway in the 1600s."],
  ["Mulgi", "A people of southern Estonia, of the historic Mulgimaa region."],
  ["Votes", "An all-but-extinct Finnic people of northwestern Russia."],
  ["Chodové", "Border-guards of medieval Bohemia who kept their old privileges for centuries."],
  ["Warmian", "A people of Warmia in northern Poland, historically Catholic."],
  ["Kociewian", "A people of Kociewie in northern Poland, near Gdańsk."],
  ["Greater Pole", "People of Greater Poland (Wielkopolska), cradle of the Polish state around Poznań."],
  ["Lesser Pole", "People of Lesser Poland (Małopolska), around the old royal capital of Kraków."],
  ["Macedonians (ethnic)", "A South Slavic people of North Macedonia, distinct from their ancient Greek namesakes."],
  ["Mijak", "A small people of western North Macedonia, famed woodcarvers and icon-painters."],
  ["Sandžak Bosniak", "Bosniak Muslims of the Sandžak region, split between Serbia and Montenegro."],

  // ── Batch 6: Caucasus, Iran & Jewish communities ──
  ["Aghul", "A small people of the southern Dagestan mountains."],
  ["Tsez", "A tiny people of the high Dagestan mountains, with a famously complex language."],
  ["Mazandarani", "A Caspian people of northern Iran, with their own language and rice terraces."],
  ["Khorasani Turk", "A Turkic people of northeastern Iran's Khorasan."],
  ["Mountain Jews", "A Jewish people of the eastern Caucasus, also called Juhuro, speaking a Persian language."],
  ["Bukharan Jews", "An ancient Jewish community of Central Asia, from Bukhara and Samarkand."],
  ["Russian Jews", "The vast Jewish community of the former Russian Empire — source of much of the modern diaspora."],

  // ── Batch 6: South Asia ──
  ["Saraiki", "A people of southern Punjab in Pakistan, with their own language and Sufi heritage."],
  ["Hindkowan", "Hindko-speaking people of northwestern Pakistan, around Peshawar and Hazara."],
  ["Konkani", "A people of India's west coast around Goa, with their own language."],
  ["Tulu people", "A people of coastal Karnataka in southern India, with their own language and spirit-worship."],
  ["Kodava", "A martial people of the Coorg hills in southern India, known for coffee and soldiers."],
  ["Burgher people", "A Eurasian community of Sri Lanka, descended from Portuguese and Dutch colonists."],

  // ── Batch 6: China & SE Asia ──
  ["Tu people", "A Mongolic people of China's Qinghai, also called the Monguor."],
  ["Maonan", "A small minority of southern China's Guangxi."],
  ["Mulao", "A minority people of China's Guangxi."],
  ["Gelao", "An ancient people of southern China's Guizhou."],
  ["Pumi", "A small people of the Yunnan–Sichuan border in China."],
  ["Derung", "A tiny people of a remote Yunnan valley, the women once famed for facial tattoos."],
  ["Achang", "A small people of China's Yunnan, renowned forgers of fine knives."],
  ["Jino", "Among the last peoples to be officially recognised in China, of the Yunnan tea hills."],
  ["Bonan", "A small Muslim people of northwestern China."],
  ["Gaoshan", "China's collective name for the indigenous peoples of Taiwan."],
  ["Hani people", "A terrace-farming people of Yunnan, builders of the spectacular Honghe rice terraces."],
  ["Li people", "The indigenous people of China's tropical Hainan island."],
  ["She people", "A people scattered across the hills of southeastern China."],
  ["Lampung", "A people of southern Sumatra, with their own script and ship-cloth weavings."],
  ["Rejang", "A people of southern Sumatra with one of Indonesia's old indigenous scripts."],
  ["Sangir", "An island people of the seas between Sulawesi and the Philippines."],
  ["Pangasinan", "A people of the Lingayen Gulf in the northern Philippines."],
  ["Kalinga", "A people of the northern Philippine highlands — once headhunters, now famed tattoo artists."],
  ["Bontoc", "An Igorot people of the northern Philippine cordillera."],
  ["Mangyan", "Indigenous peoples of Mindoro island, keepers of an ancient syllabic script."],
  ["Subanen", "An indigenous people of the Zamboanga peninsula in the Philippines."],
  ["B'laan", "An indigenous people of the southern Philippines, known for their beadwork and brass."],
  ["Chavacano", "Speakers of Chavacano, a Spanish creole, in the southern Philippine city of Zamboanga."],

  // ── Batch 6: Taiwan & Pacific ──
  ["Truku", "An indigenous people of Taiwan's eastern mountains, around the Taroko gorge."],
  ["Puyuma", "An indigenous people of southeastern Taiwan."],
  ["Rukai", "An indigenous people of southern Taiwan, known for their slate houses and lily symbolism."],
  ["Tsou", "An indigenous people of Taiwan's central mountains."],
  ["Seediq", "An indigenous Taiwanese people whose 1930 uprising against Japan became a famous film."],
  ["Saisiyat", "A small indigenous people of northern Taiwan, keepers of the haunting Pas-ta'ai ritual."],
  ["Futunan", "Polynesians of Futuna, part of France's Wallis and Futuna."],
  ["Tuamotuan", "Polynesians of the vast Tuamotu atoll chain in French Polynesia."],
  ["Mangarevan", "Polynesians of the remote Gambier Islands in French Polynesia."],
  ["Austral Islander", "Polynesians of the southern Austral Islands of French Polynesia."],
  ["Sonsorolese", "A tiny Micronesian people of Palau's far-flung southwest islands."],

  // ── Batch 6: Aboriginal Australia ──
  ["Arrernte", "An Aboriginal people of central Australia, around Alice Springs."],
  ["Pitjantjatjara", "An Aboriginal people of the Western Desert, neighbours of the Anangu at Uluru."],
  ["Adnyamathanha", "An Aboriginal people of South Australia's Flinders Ranges."],
  ["Saibai", "Torres Strait Islanders of low-lying Saibai, close to Papua New Guinea."],
  ["Tiwi", "Aboriginal islanders of the Tiwi Islands off northern Australia, with a culture all their own."],
  ["Yidiny", "An Aboriginal people of the rainforest around Cairns in northeast Australia."],

  // ── Batch 6: the Americas ──
  ["Iñupiat", "The Inuit people of northern Alaska, whalers of the Arctic coast."],
  ["Yup'ik", "An indigenous people of western Alaska and Russia's Chukotka, of the Bering Sea coast."],
  ["Nunavummiut", "The Inuit of Nunavut, Canada's vast Arctic territory created in 1999."],
  ["Inuvialuit", "The western Canadian Inuit of the Mackenzie delta and Arctic coast."],
  ["Coast Salish", "Indigenous peoples of the Pacific Northwest around Puget Sound and Vancouver."],
  ["Nuu-chah-nulth", "An indigenous people of Vancouver Island's west coast, traditional whalers."],
  ["Heiltsuk", "An indigenous people of British Columbia's central coast."],
  ["Nisga'a", "A British Columbia nation whose 1998 treaty was a landmark in Canadian Indigenous rights."],
  ["Atikamekw", "An indigenous people of the forests of central Quebec."],
  ["Maliseet", "An indigenous people of the Saint John River valley in Canada's Maritimes and Maine."],
  ["Abenaki", "An indigenous people of New England and Quebec."],
  ["Wampanoag", "The New England nation who met the Pilgrims at the first Thanksgiving in 1621."],
  ["Lenape", "The original people of the New York–New Jersey area, also called the Delaware."],
  ["Powhatan", "The Virginia confederacy of Pocahontas, who met the first English colonists at Jamestown."],
  ["Potawatomi", "A Great Lakes nation of the Anishinaabe family."],
  ["Ho-Chunk", "A people of Wisconsin, also known as the Winnebago."],
  ["Yakama", "A Plateau nation of Washington State."],
  ["Modoc people", "A people of the California–Oregon border who fought a famous war from lava-bed fortresses."],
  ["Tongva", "The indigenous people of the Los Angeles basin."],
  ["Mixe people", "An indigenous people of Oaxaca who proudly say they were never conquered."],
  ["Tepehuan", "An indigenous people of Mexico's Sierra Madre."],
  ["Pipil", "The indigenous Nahua people of El Salvador — the Nawat."],
  ["Bribri", "An indigenous people of the mountains and Caribbean coast of Costa Rica."],
  ["Naso people", "An indigenous people of Panama and Costa Rica who keep their own monarchy."],
  ["Pemon", "An indigenous people of Venezuela's Gran Sabana, beneath the world's tallest waterfall."],
  ["Piaroa", "An indigenous people of Venezuela's Orinoco rainforests."],
  ["Kichwa", "The Quechua-speaking indigenous peoples of Ecuador's highlands and Amazon."],
  ["Cofán", "An Amazonian people of Ecuador and Colombia, defenders of their rainforest against oil drilling."],
  ["Sápara", "An Amazonian people of Ecuador, once thought extinct, now only a few hundred strong."],
  ["Matsés", "An Amazonian people of the Peru–Brazil border — the 'jaguar people', with facial tattoos."],
  ["Yaghan", "The southernmost people on Earth, canoe-folk of Tierra del Fuego's icy channels."],
  ["Pilagá", "An indigenous people of the Argentine Chaco."],
  ["Mocoví", "An indigenous people of the Argentine Chaco."],
  ["Mbyá", "A Guaraní people of the forests of Argentina, Brazil and Paraguay."],
  ["Bororo", "An indigenous people of the Brazilian Mato Grosso, famed for their elaborate funerary rites."],
  ["Terena", "An indigenous people of Brazil's Pantanal wetlands."],
  ["Pataxó", "An indigenous people of Brazil's Atlantic coast, near where the Portuguese first landed in 1500."],

  // ── Batch 7: Europe ──
  ["Sarthois", "People of the Sarthe in northwest France, around Le Mans of the famous 24-hour race."],
  ["Orléanais", "People of the Orléanais around Orléans — the city Joan of Arc relieved in 1429."],
  ["Mayennais", "People of the Mayenne in northwest France."],
  ["Monégasque", "The native people of Monaco, now a minority in their own glittering principality."],
  ["Sammarinese", "The people of San Marino, the world's oldest surviving republic, founded in AD 301."],
  ["Sallands", "A Low Saxon people of Salland in the eastern Netherlands."],
  ["Achterhooks", "A Low Saxon people of the Achterhoek in the eastern Netherlands."],
  ["Stellingwarfs", "A Low Saxon people of Stellingwerf, a corner of the northern Netherlands."],
  ["Czech Silesian", "Silesians of the Czech part of the historic region, around Opava and Ostrava."],
  ["Constantinople Greek", "The Greeks of Istanbul, once the heart of Greek Orthodoxy, now only a handful remain."],
  ["Kosovo Albanian", "The Albanian majority of Kosovo, which declared independence from Serbia in 2008."],
  ["Arvanites", "Albanians who settled in Greece centuries ago, now largely Greek in identity."],
  ["Merchero", "An itinerant people of Spain, sometimes called the Spanish Travellers."],

  // ── Batch 7: Middle East ──
  ["Ahwazi", "Arabs of Iran's oil-rich Khuzestan province, around the city of Ahvaz."],
  ["Bahrani", "The Shia Arab community indigenous to Bahrain."],
  ["Aramean", "A Christian people of the Middle East, heirs of the Aramaic language Jesus spoke."],
  ["Chaldean", "Iraqi Catholic Christians, a branch of the ancient Assyrian people."],
  ["Bakhtiari", "A nomadic Lur people of Iran's Zagros mountains, famed for vast seasonal migrations."],

  // ── Batch 7: Africa ──
  ["San people", "The hunter-gatherer 'Bushmen' of southern Africa — among the oldest human lineages on Earth."],
  ["Nama people", "A Khoikhoi people of Namibia and South Africa, herders of the arid south."],
  ["Griqua", "A mixed-heritage people of South Africa who built their own short-lived states in the 1800s."],
  ["Basters", "A mixed Afrikaans-speaking people of Namibia, descendants of Boers and Khoikhoi."],
  ["Kabyle", "A Berber people of the mountains of northern Algeria, fierce keepers of their language."],
  ["Chaoui", "A Berber people of Algeria's Aurès mountains."],
  ["Mozabite", "A Berber people of the Saharan oasis-towns of the Mzab valley in Algeria."],
  ["Siwi", "Berbers of Egypt's remote Siwa oasis — the only Berber-speakers in the country."],
  ["Bariba", "A people of northern Benin, heirs of the old kingdom of Borgu."],
  ["Senufo", "A farming people of Côte d'Ivoire, Mali and Burkina Faso, renowned woodcarvers."],
  ["Kalenjin", "A Kenyan people who have produced many of the world's greatest distance runners."],
  ["Luo people", "A Nilotic people around Lake Victoria — and Barack Obama's paternal kin."],
  ["Turkana", "Nomadic herders of the harsh deserts around Kenya's Lake Turkana, the 'cradle of mankind'."],
  ["Pedi people", "A people of northern South Africa, the northern Sotho."],
  ["Tsonga", "A people of southern Mozambique and South Africa's Limpopo."],
  ["Sakalava", "A people of western Madagascar, heirs of a powerful coastal kingdom."],
  ["Betsileo", "A highland people of Madagascar — master rice-terrace farmers."],

  // ── Batch 7: South Asia ──
  ["Lepcha", "The indigenous people of Sikkim and Darjeeling in the eastern Himalayas."],
  ["Bhutia", "A Tibetan-descended people of Sikkim and the eastern Himalayas."],
  ["Toda", "A small pastoral people of India's Nilgiri Hills, famed for their barrel-vaulted temples."],
  ["Apatani", "A people of India's Arunachal Pradesh, renowned for their sustainable valley farming."],
  ["Adi people", "A people of India's Arunachal Pradesh in the eastern Himalayas."],
  ["Konyak", "A Naga people of India's far northeast, once famed as headhunters and tattoo artists."],
  ["Angami", "A Naga people of Nagaland, hosts of the famous Hornbill Festival."],
  ["Marma", "A Buddhist people of the Chittagong Hill Tracts in Bangladesh, of Burmese descent."],

  // ── Batch 7: China & SE Asia ──
  ["Shui people", "A people of southern China's Guizhou, keepers of a rare pictographic script."],
  ["Lhoba", "One of China's smallest official minorities, of the southeastern Tibetan borderlands."],
  ["Monpa", "A Buddhist people of the eastern Himalayas, in India's Arunachal Pradesh and Bhutan."],
  ["Osing", "A people of eastern Java in Indonesia, around Banyuwangi."],
  ["Tengger", "A Hindu people of the highlands around Java's smoking Mount Bromo volcano."],
  ["Manggarai", "A people of western Flores in Indonesia, famed for their spider-web rice fields."],
  ["Sumbanese", "Islanders of Sumba in Indonesia, known for their ikat weaving and ritual horseback jousting."],
  ["Boholano", "A people of Bohol island in the central Philippines."],
  ["Ibanag", "A people of the Cagayan valley in the northern Philippines."],
  ["Manobo", "A cluster of indigenous peoples across the southern Philippine island of Mindanao."],
  ["Higaonon", "An indigenous people of the mountains of northern Mindanao in the Philippines."],
  ["Tagbanwa", "An indigenous people of Palawan, keepers of an ancient script."],
  ["Rade people", "A matrilineal Montagnard people of Vietnam's Central Highlands."],

  // ── Batch 7: Pacific & Aboriginal Australia ──
  ["Tanna", "Islanders of Tanna in Vanuatu, home of the John Frum cargo cult."],
  ["Pukapukan", "Polynesians of remote Pukapuka in the northern Cook Islands."],
  ["Bardi", "An Aboriginal saltwater people of the Kimberley coast in Western Australia."],
  ["Gamilaraay", "An Aboriginal people of inland New South Wales and Queensland."],
  ["Bundjalung", "An Aboriginal people of the northern New South Wales coast."],
  ["Wurundjeri", "The Aboriginal people of the land where Melbourne now stands."],
  ["Kaurna", "The Aboriginal people of the Adelaide plains in South Australia."],

  // ── Batch 7: the Americas ──
  ["Seneca", "The largest of the Six Nations of the Iroquois — the 'keepers of the western door'."],
  ["Oneida", "An Iroquois nation that allied with the Americans in the Revolutionary War."],
  ["Tuscarora", "The sixth nation to join the Iroquois confederacy, after migrating north from the Carolinas."],
  ["Crow Nation", "A Plains people of Montana, long scouts for the US Army against their Lakota rivals."],
  ["Mandan", "A Plains village people of the upper Missouri, nearly wiped out by smallpox in 1837."],
  ["Assiniboine", "A people of the northern plains of the US and Canada, kin of the Sioux."],
  ["Makah", "A whaling people of the far northwestern tip of Washington State."],
  ["Tsimshian", "An indigenous people of the British Columbia and Alaska coast."],
  ["Squamish", "A Coast Salish people of the Vancouver area in British Columbia."],
  ["Gwich'in", "An Athabaskan people of the Alaskan and Canadian Arctic, tied to the caribou herds."],
  ["Tlicho", "A Dene people of Canada's Northwest Territories, also called the Dogrib."],
  ["Meskwaki", "An eastern woodlands people of Iowa, also called the Fox."],
  ["Caddo", "A people of the US South-Central, mound-builders of the lower Mississippi world."],
  ["Havasupai", "'The people of the blue-green water', who live deep within the Grand Canyon."],
  ["Hualapai", "A people of the Grand Canyon's southern rim in Arizona."],
  ["Kumeyaay", "An indigenous people whose homeland straddles the US–Mexico border around San Diego."],
  ["Cahuilla", "An indigenous people of the deserts of inland southern California."],
  ["Ohlone", "The indigenous peoples of the San Francisco Bay Area."],
  ["Mazahua", "An indigenous people of central Mexico, near Mexico City."],
  ["Chinantec", "An indigenous people of Oaxaca, some of whom can converse by whistling across valleys."],
  ["Tojolabal", "A Maya people of the Chiapas highlands in Mexico."],
  ["Amuzgo", "An indigenous people of the Guerrero–Oaxaca border in Mexico — fine weavers."],
  ["Huave", "An indigenous fishing people of the Pacific lagoons of Oaxaca."],
  ["Maleku", "A tiny indigenous people of northern Costa Rica."],
  ["Boruca", "An indigenous people of Costa Rica, famed for their carved 'diablito' masks."],
  ["Mayangna", "An indigenous people of the rainforests of Nicaragua and Honduras, also called the Sumo."],
  ["Rama people", "A small indigenous people of Nicaragua's Caribbean coast."],
  ["Nasa people", "An indigenous people of Colombia's southwest, also called the Páez."],
  ["Misak", "An indigenous people of Colombia's Cauca, also called the Guambiano."],
  ["Muisca", "The people who built a golden civilisation in the Colombian highlands — root of the El Dorado legend."],
  ["Kankuamo", "An indigenous people of Colombia's Sierra Nevada de Santa Marta."],
  ["Witoto", "An Amazonian people of Colombia and Peru, devastated by the rubber boom."],
  ["Achuar", "An Amazonian people of Ecuador and Peru, kin of the Shuar."],
  ["Siona", "An Amazonian people of the Ecuador–Colombia border."],
  ["Wampís", "An Amazonian people of northern Peru, kin of the Awajún."],
  ["Uros", "A people of Lake Titicaca who live on floating islands woven from reeds."],
  ["Chipaya", "An ancient Andean people of the Bolivian altiplano, speakers of a rare isolate language."],
  ["Ayoreo", "An indigenous people of the Gran Chaco, among the last uncontacted groups outside the Amazon."],
  ["Nivaclé", "An indigenous people of the Paraguayan Chaco."],
  ["Kaingang", "An indigenous people of southern Brazil's forests."],
  ["Guajajara", "An Amazonian people of Brazil, known for their 'forest guardian' patrols against loggers."],
  ["Pehuenche", "A Mapuche people of the Andes — 'people of the pehuén', the monkey-puzzle pine."],
  ["Huilliche", "The southern Mapuche of Chile, the 'people of the south'."],
  ["African American", "The Black community of the United States, descended mostly from enslaved Africans, and central to American culture."],
  ["Black Nova Scotian", "A historic Black community in Canada's Maritimes, descended from Loyalists and refugees."],
  ["Raizal", "An English-speaking Afro-Caribbean people of Colombia's San Andrés islands."],
  ["Afro-Mexican", "The long-overlooked Black communities of Mexico's Pacific and Gulf coasts."],
  ["Mennonite", "A pacifist Anabaptist people whose Plautdietsch-speaking colonies dot the Americas."],
  ["Quebecois", "The French-speaking majority of Quebec, who nearly voted for independence from Canada in 1995."],

  // ── Batch 8: more Italy & Africa ──
  ["Pugliese", "People of Puglia, the sun-baked heel of Italy — land of olive groves and trulli houses."],
  ["Salentine", "People of the Salento, the tip of Italy's heel, with their own old Greek-influenced speech."],
  ["Calabrian", "People of Calabria, the rugged toe of Italy."],
  ["Abruzzese", "People of Abruzzo, a mountainous region east of Rome, rich in wildlife and national parks."],
  ["Fon people", "The people of the old kingdom of Dahomey in Benin, served by its famous all-female warriors."],
  ["Chewa", "The largest people of Malawi, keepers of the masked Nyau secret society."],
  ["Tumbuka", "A people of northern Malawi and Zambia, with a rich healing-dance tradition."],
  ["Makonde", "A people of Mozambique and Tanzania, world-famous for their intricate blackwood sculpture."],
  ["Luba people", "A people of an old Central African empire in the Congo's southeast."],
  ["Ovimbundu", "The largest ethnic group of Angola, of the central highlands."],
  ["Saho people", "A pastoral people of Eritrea's coastal hills."],
  ["Wolaytta", "A people of southern Ethiopia, once their own kingdom."],
  ["Karamojong", "Cattle-herding warriors of northeastern Uganda's dry plains."],
  ["Kabye", "A people of northern Togo, with iron-working and terraced-farming traditions."],
  ["Antemoro", "A people of southeastern Madagascar, keepers of Arabic-derived sacred manuscripts."],
  ["Sena people", "A people of the lower Zambezi in Mozambique and Malawi."],

  // ── Batch 8: Asia ──
  ["Hemshin", "Armenian-descended Muslims of Turkey's eastern Black Sea mountains."],
  ["Gujjar", "A pastoral people spread from Kashmir across northwestern India and Pakistan."],
  ["Wakhi", "An Ismaili people of the high Pamir and Karakoram, on the roof of the world."],
  ["Kuki", "A cluster of hill peoples of India's Manipur and the Myanmar border."],
  ["Dimasa", "An indigenous people of India's Assam, heirs of the old Kachari kingdom."],
  ["Iban", "The largest Dayak people of Sarawak in Borneo — once feared headhunters, famed for their longhouses."],
  ["Kenyah", "A Dayak people of the highlands of Borneo."],
  ["Ngaju", "A Dayak people of Indonesian Borneo, followers of the Kaharingan faith."],
  ["Makassar", "A seafaring people of southern Sulawesi, whose sailors reached northern Australia for centuries."],
  ["Gorontalo", "A predominantly Muslim people of northern Sulawesi in Indonesia."],
  ["Butonese", "An island people of southeastern Sulawesi, heirs of the Buton sultanate."],
  ["Mandailing", "A Batak people of northern Sumatra, mostly Muslim."],
  ["Kerinci", "A people of the highlands around Sumatra's tallest volcano in Indonesia."],
  ["Negrense", "A people of Negros island in the central Philippines, in the country's sugar heartland."],
  ["Kankanaey", "An Igorot people of the northern Philippine cordillera, builders of rice terraces."],
  ["Ibaloi", "An Igorot people of the Benguet highlands around Baguio in the Philippines."],

  // ── Batch 8: Pacific & Aboriginal ──
  ["Malaitan", "People of Malaita, the most populous island of the Solomons."],
  ["Warlpiri", "An Aboriginal people of Australia's Tanami Desert, famed for their dot paintings."],
  ["Yawuru", "An Aboriginal saltwater people of the Broome area in Western Australia."],
  ["Eora", "The Aboriginal people of the Sydney coast — the first to meet the British First Fleet."],
  ["Ngunnawal", "The Aboriginal people of the land where Canberra now stands."],

  // ── Batch 8: the Americas ──
  ["Lumbee", "The largest Native American tribe east of the Mississippi, of North Carolina."],
  ["Catawba", "A people of the Carolinas, long renowned for their pottery."],
  ["Houma", "A Louisiana people of the Mississippi delta bayous."],
  ["Tunica", "A people of the lower Mississippi, once famed traders in salt."],
  ["Flathead", "A Salish people of Montana's mountain valleys, of the Flathead reservation."],
  ["Umatilla", "A Plateau people of the Columbia River in Oregon."],
  ["Spokane", "A Plateau people of the Columbia plateau in Washington State."],
  ["Coeur d'Alene", "A Plateau people of the Idaho panhandle, named by French fur traders."],
  ["Quinault", "A people of the rainy Pacific coast of Washington State."],
  ["Quileute", "A small Pacific-coast people of Washington, thrust into pop culture by the 'Twilight' books."],
  ["Lummi", "A Coast Salish people of the islands and shores of northern Puget Sound."],
  ["Maidu", "An indigenous people of the Sierra Nevada foothills of northern California."],
  ["Yokuts", "An indigenous people of California's San Joaquin Valley."],
  ["Miwok", "An indigenous people of central California, from the coast up to the Sierra."],
  ["Hupa", "An indigenous people of the Trinity River in northwestern California."],
  ["Luiseño", "An indigenous people of southern California, named after a Spanish mission."],
  ["Zoque", "An indigenous people of Chiapas and Oaxaca in southern Mexico, of ancient Olmec country."],
  ["Tlapanec", "An indigenous people of Mexico's Guerrero highlands."],
  ["Chatino", "An indigenous people of Oaxaca, kin of the Zapotec."],
  ["Pame people", "An indigenous Chichimec people of central Mexico."],
  ["Wounaan", "An indigenous people of the rainforests of Panama and Colombia, kin of the Embera."],
  ["Tsáchila", "An indigenous people of Ecuador's western lowlands, known for their red-dyed hair."],
  ["Yagua", "An Amazonian people of Peru and Colombia, of the upper Amazon."],
  ["Matsigenka", "An Amazonian people of southeastern Peru, near the cloud forests of Machu Picchu."],
  ["Tacana", "An indigenous people of the Bolivian Amazon foothills."],
  ["Mojeño", "An indigenous people of the Bolivian Amazon, builders of vast earthworks long ago."],
  ["Guarayo", "An indigenous people of the eastern Bolivian lowlands."],
  ["Aché", "An Amazonian people of eastern Paraguay, hunter-gatherers until recent decades."],
  ["Maká", "An indigenous people of the Paraguayan Chaco, near Asunción."],
  ["Qulla", "An Andean people of northwestern Argentina and the Bolivian altiplano, also written Kolla."],
  ["Atacameño", "An Andean oasis people of Chile's Atacama, the driest desert on Earth."],
  ["Tupinambá", "A coastal Brazilian people who met — and sometimes ate — the first Europeans."],
  ["Potiguara", "An indigenous people of Brazil's northeast coast, around Paraíba."],
  ["Krenak", "An indigenous people of Brazil's Rio Doce valley."],
  ["Sateré-Mawé", "An Amazonian people of Brazil who first cultivated guaraná — and endure a fierce stinging-ant rite."],
  ["Ye'kuana", "An Amazonian people of Venezuela and Brazil, master canoe- and house-builders."],
  ["Wapishana", "An indigenous people of the Guyana–Brazil savannas."],
  ["Kalina", "The mainland Carib people of the Guianas and Venezuela, who gave the Caribbean its name."],
  ["Afro-Bolivian", "A small Black community in the Bolivian Andes who kept their own traditional king."],
  ["Pennsylvania German", "German-descended communities of Pennsylvania, including the Amish, speaking an old German dialect."],

  // ── Batch 9: final squeeze ──
  // Guatemalan & Mexican Maya
  ["K'iche'", "The largest Maya people of Guatemala, whose sacred book the Popol Vuh survives to this day."],
  ["Kaqchikel", "A Maya people of the Guatemalan highlands around Lake Atitlán."],
  ["Mam people", "A Maya people of western Guatemala and Chiapas, in the land of volcanoes."],
  ["Q'eqchi'", "A Maya people of northern Guatemala and Belize, one of the most widespread Maya groups."],
  ["Ixil", "A Maya people of the Guatemalan highlands, who suffered terribly in the country's civil war."],
  ["Tz'utujil", "A Maya people of the southern shore of Lake Atitlán in Guatemala."],
  ["Lacandon", "A small Maya people of the Chiapas rainforest, among the last to keep the old gods."],
  ["Chuj", "A Maya people of the Guatemala–Mexico highland border."],
  ["Tepehua", "An indigenous people of east-central Mexico, neighbours of the Totonac."],
  // East African peoples
  ["Sukuma", "The largest ethnic group of Tanzania, farmers and herders south of Lake Victoria."],
  ["Chaga", "A people of the fertile slopes of Mount Kilimanjaro in Tanzania, famed coffee growers."],
  ["Nyamwezi", "A people of western Tanzania, once great long-distance caravan traders."],
  ["Haya people", "A people of northwestern Tanzania who smelted high-grade steel long before Europe."],
  ["Kamba", "A Kenyan people of the dry plains east of Nairobi, known for their woodcarving."],
  ["Meru people", "A Kenyan people of the slopes of Mount Kenya."],
  ["Luhya", "One of Kenya's largest groups — a cluster of related peoples of the western highlands."],
  ["Gusii", "A people of southwestern Kenya, the Kisii — famed soapstone carvers."],
  ["Mijikenda", "Nine related coastal peoples of Kenya, keepers of the sacred kaya forests."],
  // West African peoples
  ["Temne", "One of the largest peoples of Sierra Leone, of the country's north and centre."],
  ["Mende", "One of the two largest peoples of Sierra Leone, known for the masked Sande society."],
  ["Kpelle", "The largest ethnic group of Liberia, of the country's forested interior."],
  ["Kru people", "A seafaring people of the Liberian and Ivorian coast, prized sailors in the colonial era."],
  ["Vai people", "A people of Liberia and Sierra Leone who invented their own syllabic script around 1830."],
  ["Krio people", "The Creole people of Sierra Leone, descendants of freed slaves who founded Freetown."],
  ["Dagomba", "A people of northern Ghana, heirs of the old kingdom of Dagbon."],
  ["Gonja", "A people of northern Ghana, founded by horse-borne conquerors centuries ago."],
  // Horn of Africa
  ["Gurage", "A people of central Ethiopia — hard-working farmers of the false-banana enset plant."],
  ["Hadiya", "A people of southern Ethiopia's highlands."],
  ["Agaw", "An ancient Cushitic people of Ethiopia and Eritrea, who once ruled as the Zagwe dynasty."],
  ["Konso", "A people of southern Ethiopia, builders of stone-terraced towns — a World Heritage site."],
  // South & Southeast Asia
  ["Tangkhul", "A Naga people of India's Manipur and the Myanmar border."],
  ["Lotha", "A Naga people of India's Nagaland."],
  ["Sumi", "A Naga people of central Nagaland in India."],
  ["Ao people", "A Naga people of India's Nagaland, among the first to become Christian."],
  ["Sora people", "An Adivasi people of eastern India, with a unique shamanic tradition."],
  ["Itneg", "An indigenous people of the northern Philippine cordillera, also called Tinguian."],
  ["Isnag", "An indigenous people of the far-northern Philippine mountains."],
  ["Mnong", "An indigenous Montagnard people of Vietnam's Central Highlands, traditional elephant-keepers."],
  ["Sedang", "An indigenous Montagnard people of Vietnam's Central Highlands."],
  ["Stieng", "An indigenous people of southern Vietnam and Cambodia."],
  // Aboriginal Australia
  ["Martu", "An Aboriginal people of Australia's Western Desert."],
  ["Pintupi", "An Aboriginal people of the Western Desert, among the last to leave a traditional desert life in the 1980s."],
  ["Warumungu", "An Aboriginal people of the Tennant Creek region in central Australia."],
  ["Gurindji", "An Aboriginal people whose 1966 walk-off helped spark the Australian land-rights movement."],
  ["Quandamooka", "An Aboriginal people of the islands of Moreton Bay near Brisbane."],
  ["Kalkadoon", "An Aboriginal people of northwest Queensland who fiercely resisted colonial settlers."],
  // North America
  ["Penobscot", "A people of Maine's Penobscot River, part of the Wabanaki confederacy."],
  ["Passamaquoddy", "A people of the Maine–New Brunswick border, part of the Wabanaki confederacy."],
  ["Mohican", "The people of New York's upper Hudson valley, immortalised by 'The Last of the Mohicans'."],
  ["Kickapoo", "A woodlands people now spread from Kansas to Texas and Mexico."],
  ["Menominee", "A people of Wisconsin who, almost uniquely, still live on part of their ancestral land."],
  ["Sauk people", "A Great Lakes people — the nation of the war leader Black Hawk."],
  ["Ponca", "A small Plains nation; an 1879 court case ruled that a Ponca chief was legally a 'person'."],
  ["Wichita people", "A Plains people of Oklahoma, once builders of grass-thatched lodges."],
  ["Jicarilla", "An Apache people of northern New Mexico."],
  ["Mescalero", "An Apache people of southern New Mexico's mountains."],
  ["Hidatsa", "A Plains village people of North Dakota, kin and neighbours of the Mandan."],
  ["Arikara", "A Plains village people of the upper Missouri, of the Caddoan family."],
  ["Akimel O'odham", "The 'river people' of central Arizona, master desert irrigators — also called the Pima."],
  ["Yavapai", "An indigenous people of central Arizona."],
  ["Quechan", "An indigenous people of the lower Colorado River, also called the Yuma."],
  ["Cocopah", "An indigenous people of the Colorado River delta in Arizona and Mexico."],
  ["Acoma", "A Pueblo people of New Mexico's 'Sky City', one of North America's oldest inhabited towns."],
  ["Wintun", "An indigenous people of California's northern Central Valley."],
  ["Tolowa", "An indigenous people of the far-northern California coast."],
  ["Wiyot", "An indigenous people of California's Humboldt Bay."],
  ["Cowlitz", "An indigenous people of southwestern Washington State."],
  ["Siletz", "A confederation of many western Oregon peoples on a single reservation."],
  ["Kootenai", "A Rocky Mountain people of Idaho, Montana and BC, with a language unlike any other."],
  // South America
  ["Wayampi", "An Amazonian people of French Guiana and Brazil."],
  ["Palikur", "An indigenous people of the coast of French Guiana and Brazil's Amapá."],
  ["Macushi", "An indigenous people of the savannas of Guyana, Venezuela and Brazil."],
  ["Akawaio", "An indigenous people of the highlands of Guyana and Venezuela."],
  ["Lokono", "The mainland Arawak people of the Guianas, who gave their language family its name."],
  ["Yine people", "An Amazonian Arawak people of southeastern Peru."],
  ["Yanesha", "An Amazonian people of the eastern slopes of the Peruvian Andes."],
  ["Ese Eja", "An Amazonian people of the rivers of the Peru–Bolivia border."],
  ["Kallawaya", "Andean travelling healers of Bolivia, whose herbal medicine is UNESCO-listed."],
  ["Secoya", "An Amazonian people of the Ecuador–Peru border, kin of the Siona."],
  ["Chachi", "An indigenous people of the rainforests of coastal Ecuador."],
]
const curatedFact = (title: string): string | undefined => {
  const t = title.toLowerCase()
  for (const [kw, fact] of CURATED_FACTS) if (t.includes(kw.toLowerCase())) return fact
  return undefined
}

// Deterministic phrasing picker: a given title always maps to the same variant
// (stable across renders), but neighbouring tiles land on different phrasings so
// the gallery reads naturally instead of one filled-in formula repeated en masse.
const pickPhrase = (key: string, variants: string[]): string => {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return variants[h % variants.length]
}

interface MegaFlag { title: string; url: string; fact: string }
function gatherAllFlags(): MegaFlag[] {
  const seen = new Set<string>()
  const all: MegaFlag[] = []
  // Reuse the rich facts we already have (country fun facts, identity-flag and
  // city notes, historical-flag notes); generate a brief descriptor for the
  // gallery imports that ship without one, so every tile says something.
  const push = (title: string, url: string, fact: string) => {
    const t = (title || '').trim()
    if (!t || !url) return
    const key = t.toLowerCase()
    if (seen.has(key)) return
    seen.add(key); all.push({ title: t, url, fact: (fact || '').trim() || `A flag in the Globalio Codex.` })
  }
  FLAGS.forEach(f => push(f.name, f.flagUrl, f.funFact))
  SUB_FLAGS.forEach(s => push(s.name, s.flagUrl, curatedFact(s.name) ?? pickPhrase(s.name, [
    `The flag of ${s.name}, a subdivision of ${s.countryName}.`,
    `${s.name}, one of the administrative divisions of ${s.countryName}.`,
    `A regional flag from ${s.countryName} — that of ${s.name}.`,
    `The banner of ${s.name}, a region of ${s.countryName}.`,
    `Flag of ${s.name}, part of ${s.countryName}.`,
  ])))
  IDENTITY_FLAGS.forEach(f => push(f.name, f.flagUrl, f.note))
  US_CITY_FLAGS.forEach(f => push(f.name, f.flagUrl, f.note))
  ETHNIC_FLAGS.forEach(r => r.groups.forEach(g => g.items.forEach(it => {
    // Use the most specific classification (deepest group segment), but never
    // when it just repeats the people's own name.
    const seg = (g.label || "").split(" · ").pop() || ""
    const overlaps = !!seg && (seg.toLowerCase().includes(it.name.toLowerCase()) || it.name.toLowerCase().includes(seg.toLowerCase()))
    const n = it.name
    const tmpl = seg && !overlaps
      ? pickPhrase(n, [
          `The ${n} are a people of the ${seg}.`,
          `A flag of the ${n}, an ethnic group of the ${seg}.`,
          `The ${n} — one of the peoples of the ${seg}.`,
          `Flag of the ${n}, an ethnic and cultural group of the ${seg}.`,
          `The ${n}, a people of the ${seg}.`,
        ])
      : pickPhrase(n, [
          `The flag of the ${n}, an ethnic and cultural group.`,
          `A banner of the ${n} people.`,
          `The ${n}, a distinct ethnic and cultural community.`,
          `Colours of the ${n}, an ethnic and cultural group.`,
        ])
    push(it.name, fp(it.file), curatedFact(it.name) ?? tmpl)
  })))
  EXTINCT_STATES.forEach(r => r.items.forEach(it => {
    const title = stripFlagOf(splitParen(it.name)[0])
    const [, paren] = splitParen(it.name)
    const p = paren ? paren.replace(/^(de facto |nominally )/i, "") : ""
    const tmpl = p
      ? pickPhrase(title, [
          `A state that no longer exists, ${p}.`,
          `A former state — ${p}.`,
          `Once a state in its own right, ${p}; now vanished.`,
          `A bygone state, ${p}.`,
        ])
      : pickPhrase(title, [
          `A vanished state of ${r.region}.`,
          `A former state of ${r.region}, now consigned to history.`,
          `A state of ${r.region} that no longer exists.`,
          `Once a sovereign entity in ${r.region}.`,
        ])
    push(title, fp(it.file), curatedFact(title) ?? tmpl)
  }))
  ORG_FLAGS.forEach(r => r.groups.forEach(g => g.items.forEach(it => {
    const title = stripFlagOf(it.name)
    const sports = /sport/i.test(r.region), former = /former/i.test(r.region)
    const scope = ["Africa", "Americas", "Asia", "Europe", "Oceania"].includes(g.label) ? ` operating across ${g.label}` : ""
    const tmpl = former
      ? pickPhrase(title, [
          `A now-defunct international organisation.`,
          `A former international body, since dissolved.`,
          `An international organisation that no longer operates.`,
        ])
      : sports
      ? pickPhrase(title, [
          `An international sports federation.`,
          `A governing body of international sport.`,
          `An international sporting organisation.`,
        ])
      : pickPhrase(title, [
          `An international organisation${scope}.`,
          `An international body${scope}.`,
          `A multinational organisation${scope}.`,
        ])
    push(title, fp(it.file), curatedFact(title) ?? tmpl)
  })))
  Object.values(CODEX).forEach(e => e.flagHistory.forEach(h => { push(h.label, h.flagUrl, h.note); h.parallel?.forEach(p => push(p.label, p.flagUrl, p.note)) }))
  // Standalone historical states (dedup-safe against the CODEX timelines above).
  HISTORICAL_FLAGS.forEach(h => push(h.name, h.flagUrl, h.note))
  // Present-day dependent territories (skip ones with no distinct flag).
  Object.values(TERRITORIES).forEach(list => list.forEach(t => { if (t.flagUrl && !t.noFlag) push(t.name, t.flagUrl, t.note) }))
  // UK constituent nations + their flag histories (England, Scotland, …).
  UK_NATIONS.forEach(n => { const first = n.flagHistory[0]; if (first) push(n.name, first.flagUrl, first.note); n.flagHistory.forEach(h => push(h.label, h.flagUrl, h.note)) })
  return all
}
const ALL_FLAGS_AZ = gatherAllFlags()

// The overwhelmingly-massive full-page wall. Virtualised: only the rows on
// screen are mounted, so thousands of flags scroll smoothly and actually load.
const MEGA_PAD = 8
const MEGA_GAP = 8
const MEGA_MIN_TILE = 74
const MEGA_LABEL_H = 22
const MEGA_BAR_H = 58

function MegaCodexWall({ onClose, initialSort = 'az' }: { onClose: () => void; initialSort?: 'az' | 'za' | 'rand' }) {
  const [sort, setSort] = useState<'az' | 'za' | 'rand'>(initialSort)
  const [shuffleKey, setShuffleKey] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const lastY = useRef(0)
  const [vw, setVw] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 390))
  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 800))
  const [scrollTop, setScrollTop] = useState(0)
  // Which tile's fun-fact overlay is open (keyed by title). Floats below the
  // tile without shifting the grid; scrolling dismisses it.
  const [openKey, setOpenKey] = useState<string | null>(null)

  useEffect(() => {
    const onResize = () => { setVw(window.innerWidth); setVh(window.innerHeight) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const flags = useMemo(() => {
    const a = [...ALL_FLAGS_AZ]
    if (sort === 'az') a.sort((x, y) => x.title.localeCompare(y.title))
    else if (sort === 'za') a.sort((x, y) => y.title.localeCompare(x.title))
    else for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
    return a
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, shuffleKey])

  // The wall portals to <body>, so it escapes the app column — cap its own
  // width to match (720) and never run wider than 6 tiles per row, or on a
  // desktop monitor the grid computes dozens of columns of giant tiles and
  // grinds the page down.
  const wallW = Math.min(vw, 720)
  const cols = Math.min(6, Math.max(3, Math.floor((wallW - MEGA_PAD * 2 + MEGA_GAP) / (MEGA_MIN_TILE + MEGA_GAP))))
  const tileW = (wallW - MEGA_PAD * 2 - MEGA_GAP * (cols - 1)) / cols
  const rowH = tileW * (2 / 3) + MEGA_LABEL_H + MEGA_GAP
  const totalRows = Math.ceil(flags.length / cols)
  const totalHeight = MEGA_PAD * 2 + MEGA_BAR_H + totalRows * rowH

  // Overscan a full screen of rows in each direction so images preload and
  // are already decoded before they scroll into view — no visible pop-in.
  const overscan = Math.ceil(vh / rowH) + 2
  const startRow = Math.max(0, Math.floor((scrollTop - MEGA_BAR_H - MEGA_PAD) / rowH) - overscan)
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + vh - MEGA_BAR_H) / rowH) + overscan)
  const startIdx = startRow * cols
  const endIdx = Math.min(flags.length, endRow * cols)
  const visible = flags.slice(startIdx, endIdx)
  const gridTop = MEGA_PAD + MEGA_BAR_H + startRow * rowH

  const onScroll = () => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const st = scrollRef.current ? scrollRef.current.scrollTop : 0
      setScrollTop(st)
      const dy = st - lastY.current
      if (Math.abs(dy) > 4) setOpenKey(null)  // scrolling dismisses the fact overlay
      lastY.current = st
    })
  }

  // Portal to <body>: the Codex lives inside the swipeable tab wrapper (which
  // has a translateX transform), and a CSS transform makes `position: fixed`
  // resolve against that ancestor instead of the viewport — so without the
  // portal the wall (and its top sort bar) wouldn't actually cover the screen.
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, maxWidth: 720, margin: '0 auto', zIndex: 2000, background: T.bg, color: T.text }}>
      <div ref={scrollRef} onScroll={onScroll}
        style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ position: 'absolute', left: MEGA_PAD, right: MEGA_PAD, top: gridTop, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: MEGA_GAP }}>
            {visible.map((f, k) => {
              const open = openKey === f.title
              const anchorRight = (startIdx + k) % cols >= cols / 2
              const factStyle: React.CSSProperties = {
                position: 'absolute', top: 'calc(100% + 2px)', zIndex: 40,
                width: 210, maxWidth: '66vw',
                background: T.surface, border: `3.5px solid ${ACCENT.codex}`, borderRadius: 12,
                padding: '10px 12px', boxShadow: `0 14px 34px -10px ${tint(T.text, 0.65)}`,
              }
              if (anchorRight) factStyle.right = 0; else factStyle.left = 0
              return (
                <div key={f.title} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <button onClick={() => setOpenKey(open ? null : f.title)}
                    style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, font: 'inherit', cursor: 'pointer', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: '100%', aspectRatio: '3/2', borderRadius: 4, overflow: 'hidden', border: `${open ? 2 : 1}px solid ${open ? ACCENT.codex : T.line}`, background: T.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={galleryThumb(f.url)} alt={f.title} loading="eager" decoding="async"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={e => {
                          const el = e.target as HTMLImageElement
                          const t = Number(el.dataset.t || '0')
                          if (t < 2) {
                            el.dataset.t = String(t + 1)
                            el.removeAttribute('src')
                            window.setTimeout(() => { el.src = t === 0 ? galleryThumb(f.url) : f.url }, 500 + t * 800 + Math.random() * 700)
                          } else { el.style.visibility = 'hidden' }
                        }} />
                    </div>
                    <span style={{ fontSize: 8, color: open ? ACCENT.codex : T.muted, fontWeight: open ? 700 : 400, textAlign: 'center', lineHeight: 1.15, height: MEGA_LABEL_H - 4, overflow: 'hidden', wordBreak: 'break-word' }}>{f.title}</span>
                  </button>
                  {open && (
                    <div style={factStyle} onClick={() => setOpenKey(null)}>
                      <div className="geo-display" style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 3, lineHeight: 1.2 }}>{f.title}</div>
                      <div style={{ fontSize: 10.5, color: T.muted, lineHeight: 1.45 }}>{f.fact}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top bar — slides away on fast downward scroll, returns on scroll up */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: MEGA_BAR_H, zIndex: 5,
        padding: '0 12px', display: 'flex', alignItems: 'center', gap: 10,
        background: tint(T.bg, 0.92), backdropFilter: 'blur(10px)', borderBottom: `1px solid ${T.line}`,
      }}>
        <button onClick={onClose} aria-label="Close" className="geo-tap"
          style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 999, background: T.surface, border: `1px solid ${T.line}`, color: T.muted, fontSize: 22, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="geo-display" style={{ fontWeight: 800, fontSize: 17, color: T.text, lineHeight: 1.1 }}>Mega Codex</div>
          <div style={{ fontSize: 11, color: T.muted }}>Every flag · {ALL_FLAGS_AZ.length}</div>
        </div>
        <div style={{ display: 'flex', gap: 3, background: T.surface, borderRadius: 999, padding: 3, border: `1px solid ${T.line}`, flexShrink: 0 }}>
          {([['az', 'A–Z'], ['za', 'Z–A'], ['rand', 'Shuffle']] as const).map(([k, label]) => (
            <button key={k} onClick={() => { setSort(k); if (k === 'rand') setShuffleKey(v => v + 1); scrollRef.current?.scrollTo({ top: 0 }) }}
              style={{ fontSize: 10.5, fontWeight: 700, padding: '5px 9px', borderRadius: 999, border: 'none', cursor: 'pointer', background: sort === k ? ACCENT.codex : 'transparent', color: sort === k ? T.onAccent : T.muted }}>{label}</button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

// Codex entry that opens the Mega Codex wall as a full page. Sorting lives in
// the wall's pinned top bar (A–Z / Z–A / Shuffle), always reachable above the
// flag grid.
function MegaCodexSection() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-5">
      <button onClick={() => setOpen(true)}
        className="geo-tap w-full flex items-center justify-between px-1 py-3 transition-all active:scale-[0.99]"
        style={{ background: 'transparent', borderBottom: `1px solid ${T.line}` }}>
        <div className="text-left">
          <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: T.danger }}>
            <Search size={15} color={T.danger} strokeWidth={1.6} absoluteStrokeWidth /> Mega Codex A–Z
          </h3>
          <p className="text-xs" style={{ color: T.dim }}>Every flag in the app · {ALL_FLAGS_AZ.length} · tap to open the wall</p>
        </div>
        <span style={{ color: T.danger, fontSize: 18, flexShrink: 0 }}>›</span>
      </button>
      {open && <MegaCodexWall onClose={() => setOpen(false)} />}
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
    <span style={{ fontSize: 16, lineHeight: 1 }}>🏳️</span>
  </div>
)
// HTML string version for the <img> onError fallback (a broken URL = unverified, not "no flag").
const UNKNOWN_FLAG_HTML = `width:100%;aspect-ratio:3/2;display:flex;align-items:center;justify-content:center;background:${tint(ACCENT.codex, 0.1)};border:1px dashed ${tint(ACCENT.codex, 0.3)};border-radius:4px`

// Countries whose first-level subdivisions are confirmed to have NO official flags —
// their flagless tiles read "No flag" rather than the ambiguous 🏳️ placeholder.
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
            onError={e => { (e.target as HTMLImageElement).replaceWith(Object.assign(document.createElement('div'), { style: UNKNOWN_FLAG_HTML, innerHTML: '<span style="font-size:16px;line-height:1">🏳️</span>' })) }}
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
function SubDetailPanel({ sr, onClose }: { sr: SubRegion; onClose: () => void }) {
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
            {curatedFact(sr.name) ?? pickPhrase(sr.name, [
              `The flag of ${sr.name}.`,
              `${sr.name} — one of this country's subdivisions.`,
              `The regional flag of ${sr.name}.`,
              `The banner of ${sr.name}.`,
            ])}
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
  const select = (sr: SubRegion) => setSel(p => (p?.code === sr.code ? null : sr))
  const tile = (sr: SubRegion) => <SubRegionTile key={sr.code} sr={sr} confirmedNoFlags={confirmedNoFlags} onSelect={select} selected={sel?.code === sr.code} />
  const panel = sel ? <SubDetailPanel sr={sel} onClose={() => setSel(null)} /> : null
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
        <span style={{ color: T.dim, fontSize: 40 }}>🏳️</span>
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
              <span style={{ color: T.gold, fontSize: 13 }}>⌥</span>
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
