import { useState, useMemo, useRef, useEffect, useLayoutEffect, useReducer, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { FLAGS } from '../data/flags'
import { CAPITALS } from '../data/capitals'
import { CODEX_COUNTS } from '../data/codexCounts'
import type { GRegion, GRow } from '../data/codexGalleries'
import type { MegaFlag } from '../data/megaCodex'
import { T, ACCENT, FONT, tint } from '../ui/tokens'
import { normName, matchNames } from '../utils/pickOnEnter'
import { commonsSource } from '../utils/commons'
import { ScreenHeader } from './ui'
import AdBox from './AdBox'
import { AD_SLOTS } from '../ads'
import { LineIcon } from './icons'
import { Search, Anchor, ChevronDown, Castle, Sun, Mountain, Landmark, MoonStar, Sailboat, Rainbow, Users, Feather, MapPin, Crown, Vote, Building2 } from 'lucide-react'

// The list opens on FLAGS alone. Everything else loads on demand, once: a
// country's entry (its own chunk) when a region opens, a gallery's data when
// its section opens, every flag when the reader searches or opens the Mega
// Codex. The closed sections show CODEX_COUNTS meanwhile.
interface LazyData<V> { get: () => V | undefined; load: () => Promise<V> }
function lazyData<V>(load: () => Promise<V>): LazyData<V> {
  let value: V | undefined
  let pending: Promise<V> | undefined
  // A failed fetch (a connection blip) is forgotten, so opening again retries.
  return { get: () => value, load: () => (pending ??= load().then(v => (value = v), e => { pending = undefined; throw e })) }
}
const quietly = (p: Promise<unknown>) => { p.catch(() => {}) }
/** The data once loaded; starts loading when `when` turns true. */
function useData<V>(data: LazyData<V>, when: boolean): V | undefined {
  const [, loaded] = useReducer((n: number) => n + 1, 0)
  useEffect(() => { if (when && data.get() === undefined) quietly(data.load().then(loaded)) }, [data, when])
  return data.get()
}
const loadCountry = () => import('./CodexCountry')
const CountryDetail = lazy(loadCountry)
const IDENTITY = lazyData(() => import('../data/identityFlags'))
const US_CITIES = lazyData(() => import('../data/usCityFlags').then(m => [...m.US_CITY_FLAGS].sort((a, b) => a.name.localeCompare(b.name))))
const PEOPLES = lazyData(() => Promise.all([import('../data/codexGalleries'), import('../data/ethnicFlags'), import('../data/identityFlags')])
  .then(([g, e, i]) => g.peoplesRegions(e.ETHNIC_FLAGS, i.IDENTITY_FLAGS)))
const EXTINCT = lazyData(() => Promise.all([import('../data/codexGalleries'), import('../data/extinctStates'), import('../data/historicalFlags')])
  .then(([g, e, h]) => g.extinctRegions(e.EXTINCT_STATES, h.HISTORICAL_FLAGS)))
const ORGS = lazyData(() => Promise.all([import('../data/codexGalleries'), import('../data/orgFlags')]).then(([g, o]) => g.orgRegions(o.ORG_FLAGS)))
const ALL_FLAGS = lazyData(() => import('../data/megaCodex').then(m => m.ALL_FLAGS_AZ))

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

// The Codex tab remembers where the reader was for this browser session
// (search, open regions, open country, scroll), so leaving the tab or opening
// a game and coming back picks up there instead of on a fresh list.
const VIEW_KEY = 'globalio_codex_view'
interface CodexView { search: string; regions: string[]; code: string | null; scroll: number }
function loadView(): CodexView | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(VIEW_KEY) || 'null')
    return v && typeof v.search === 'string' && Array.isArray(v.regions) ? v : null
  } catch { return null }
}
function saveView(v: CodexView) {
  try { sessionStorage.setItem(VIEW_KEY, JSON.stringify(v)) } catch { /* ignore */ }
}
// Nearest scrolling ancestor: the dashboard's <main> when embedded.
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(p).overflowY)) return p
  }
  return null
}
const rowId = (code: string) => `codex-${code}`

export default function CodexScreen({ onBack, initialCode, embedded = false }: Props) {
  // A deep link (Flag of the Day → its entry) opens on that country; otherwise
  // the embedded Codex restores the reader's last view.
  const [saved] = useState(() => (embedded && initialCode == null ? loadView() : null))
  // A tapped country expands inline beneath its row — browsing never leaves
  // the page, so there's nothing to "go back" from.
  const [selectedCode, setSelectedCode] = useState<string | null>(initialCode ?? saved?.code ?? null)
  const [search, setSearch] = useState(saved?.search ?? '')
  // Regions start collapsed; store which are expanded
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(() => {
    if (saved) return new Set(saved.regions)
    const f = initialCode != null ? FLAGS.find(x => x.code === initialCode) : null
    return new Set(f ? [f.region] : [])
  })

  const rootRef = useRef<HTMLDivElement>(null)
  const scrollTop = useRef(saved?.scroll ?? 0)
  const viewRef = useRef({ search, regions: [...expandedRegions], code: selectedCode })
  useEffect(() => {
    if (!embedded) return
    viewRef.current = { search, regions: [...expandedRegions], code: selectedCode }
    saveView({ ...viewRef.current, scroll: scrollTop.current })
  }, [embedded, search, expandedRegions, selectedCode])
  // On mount: a deep-linked entry scrolls to the top of the screen; otherwise
  // the embedded list goes back to where it was. initialCode is read once,
  // like the state above.
  useLayoutEffect(() => {
    if (initialCode) document.getElementById(rowId(initialCode))?.scrollIntoView({ block: 'start' })
    if (!embedded) return
    const scroller = scrollParent(rootRef.current)
    if (!scroller) return
    if (!initialCode) scroller.scrollTop = scrollTop.current
    const onScroll = () => { scrollTop.current = scroller.scrollTop }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      saveView({ ...viewRef.current, scroll: scrollTop.current })
    }
  }, [])

  // Search ignores case, accents and punctuation and knows other names
  // ("uk", "usa", "holland", "ivory coast"), like the typed-answer boxes.
  const q = normName(search)
  const filteredFlags = useMemo(() => {
    if (!q) return FLAGS
    const hits = new Set(matchNames(FLAGS, q, FLAGS.length))
    return FLAGS.filter(f => hits.has(f) || normName(f.region).includes(q))
  }, [q])
  const allFlags = useData(ALL_FLAGS, !!q)
  const otherFlags = useMemo(() => (allFlags ? otherFlagMatches(allFlags, q) : []), [allFlags, q])
  // Fetch a country's entry once the reader is heading for one.
  useEffect(() => { if (expandedRegions.size || q || selectedCode) quietly(loadCountry()) }, [expandedRegions, q, selectedCode])

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
  const isSearching = !!q

  return (
    // No rise-in on a deep link: the animation's offset would throw off the
    // scroll to the opened entry.
    <div ref={rootRef} className={embedded ? (initialCode ? undefined : 'carto-rise') : 'min-h-screen flex flex-col'} style={{ background: T.bg, color: T.text, position: 'relative', zIndex: 1 }}>
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
            aria-label="Search every flag"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => quietly(ALL_FLAGS.load())}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: T.text }}
          />
          {search && (
            // 44px target; the negative margins keep the search bar its size.
            <button onClick={() => setSearch('')} aria-label="Clear search" className="flex items-center justify-center"
              style={{ width: 44, height: 44, margin: '-12px -14px -12px 0', flexShrink: 0, color: T.dim, fontSize: 16 }}>✕</button>
          )}
        </div>
      </div>

      <div className={embedded ? 'px-5 pb-12' : 'flex-1 overflow-y-auto px-5 pb-12'}>
        {grouped.length === 0 ? (
          // Only when nothing at all matches; other flags may match below.
          otherFlags.length === 0 && <div className="text-center py-12" style={{ color: T.muted }}>No flags match "{search.trim()}"</div>
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
                        <div key={f.code} id={rowId(f.code)}>
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
                          {open && <Suspense fallback={null}><CountryDetail flag={f} /></Suspense>}
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
        {isSearching && <OtherFlagsResults matches={otherFlags} />}

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


// Universal search results — every non-country flag (peoples, historical states,
// organisations, subdivisions, cities…) matching the query, shown beneath the
// country matches behind a divider so anything in the app is findable (G1).
// `q` is already normName()d; titles are compared the same way.
let azNames: string[] | null = null
function otherFlagMatches(all: MegaFlag[], q: string): MegaFlag[] {
  if (!q) return []
  const names = azNames ??= all.map(f => normName(f.title))
  const countryNames = new Set(FLAGS.map(f => normName(f.name)))
  return all.filter((_, i) => names[i].includes(q) && !countryNames.has(names[i])).slice(0, 60)
}

function OtherFlagsResults({ matches }: { matches: MegaFlag[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null)
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

// A single Identity category as its own flat, collapsible section (one row's
// description open at a time). Used for the standalone Micronations &
// Pan-National sections.
function IdentityFlatSection({ title, blurb, color, icon: Icon, category }: { title: string; blurb: string; color: string; icon: IconType; category: string }) {
  const [open, setOpen] = useState(false)
  const [openFlag, setOpenFlag] = useState<string | null>(null)
  const flags = useData(IDENTITY, open)?.IDENTITY_FLAGS.filter(f => f.category === category)
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
      {open && flags && (
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
  if (!CODEX_COUNTS.micronations) return null
  return <IdentityFlatSection title="Micronations" blurb={`${CODEX_COUNTS.micronations} self-declared nations`} color={T.green} icon={Crown} category="Micronations" />
}

// ── Identity / cause flags (E10) ──
// No "Movements & Identity" wrapper any more: Pride, Separatist & Autonomous and
// Civic & Ideological each stand as their own top-level section, like
// Micronations — one row's description open at a time (see isIdentityMain in
// data/codexGalleries.ts for which categories).
function IdentityCodexSection() {
  return (
    <>
      {CODEX_COUNTS.identity.map(([cat, count]) => {
        if (!count) return null
        return (
          <IdentityFlatSection key={cat} title={cat} blurb={`${count} flags`}
            color={CAT_COLORS[cat] ?? T.amber} icon={CAT_ICONS[cat] ?? Users} category={cat} />
        )
      })}
    </>
  )
}

// ── American city flags (Beta) — lots of municipal flags ──
function AmericanCitiesCodexSection() {
  const [open, setOpen] = useState(false)
  const [openFlag, setOpenFlag] = useState<string | null>(null)
  const cities = useData(US_CITIES, open)
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
          <p className="text-xs" style={{ color: T.dim }}>{CODEX_COUNTS.usCities} U.S. municipal flags</p>
        </div>
        <ChevronDown size={17} color={T.chartreuse} strokeWidth={1.6} absoluteStrokeWidth
        style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
      </button>
      {open && cities && (
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
  const flags = useData(IDENTITY, open)?.SIGNAL_FLAGS
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
          <p className="text-xs" style={{ color: T.dim }}>{CODEX_COUNTS.signal} international code / phonetic flags</p>
        </div>
        <ChevronDown size={17} color={T.cyan} strokeWidth={1.6} absoluteStrokeWidth
        style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
      </button>
      {open && flags && (
        <div className="mt-2 space-y-1.5">
          {flags.map(f => {
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
// The rows are built in data/codexGalleries.ts.
type IconType = typeof Castle

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
function GalleryRegionBlock({ region, icon: Icon, color, open, onToggle, keyPrefix, openRow, setOpenRow }: {
  region: GRegion; icon?: IconType; color: string; open: boolean; onToggle: () => void
  keyPrefix: string; openRow: string | null; setOpenRow: (k: string | null) => void
}) {
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
// start closed; an "Open all" toggle expands every one at once. Its rows load
// when it first opens; iconOf turns a region's icon name into its icon.
function GallerySection({ title, icon: Icon, color, blurb, data, iconOf }: {
  title: string; icon: IconType; color: string; blurb: string
  data: LazyData<GRegion[]>; iconOf: (name?: string) => IconType | undefined
}) {
  const [open, setOpen] = useState(false)
  const [openRegions, setOpenRegions] = useState<Set<number>>(new Set())
  const [openRow, setOpenRow] = useState<string | null>(null)
  const regions = useData(data, open)
  const allOpen = openRegions.size === regions?.length
  const toggleAll = () => setOpenRegions(allOpen ? new Set() : new Set(regions?.map((_, i) => i)))
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
      {open && regions && (
        <div className="mt-2">
          <div className="flex justify-end mb-1.5">
            <button onClick={toggleAll}
              className="geo-tap active:scale-95"
              style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color, background: tint(color, 0.1), border: `1px solid ${tint(color, 0.4)}`, borderRadius: 999, padding: '4px 12px', cursor: 'pointer' }}>
              {allOpen ? 'Collapse all' : 'Open all'}
            </button>
          </div>
          {regions.map((r, i) => <GalleryRegionBlock key={i} region={r} icon={iconOf(r.icon)} color={color} open={openRegions.has(i)} onToggle={() => toggleRegion(i)} keyPrefix={String(i)} openRow={openRow} setOpenRow={setOpenRow} />)}
        </div>
      )}
    </div>
  )
}

// "Peoples & Cultures" — ethnic/cultural regions take a continent icon; the
// Pan-National & Ethnic and Indigenous Peoples identity groups their own.
function EthnicCodexSection() {
  return <GallerySection title="Peoples &amp; Cultures" icon={Users} color={T.warm} blurb={`${CODEX_COUNTS.peoples} flags of peoples, cultures & nations · by region`}
    data={PEOPLES} iconOf={name => (name ? CAT_ICONS[name] ?? galleryIcon(name) : undefined)} />
}

function ExtinctStatesCodexSection() {
  return <GallerySection title="Extinct &amp; Former States" icon={Landmark} color={T.cyan} blurb={`${CODEX_COUNTS.extinct} flags of vanished & predecessor states · by continent`}
    data={EXTINCT} iconOf={name => (name ? galleryIcon(name) : undefined)} />
}

function OrgCodexSection() {
  return <GallerySection title="International Organizations" icon={Building2} color={T.green} blurb={`${CODEX_COUNTS.orgs} flags · UN, NATO, EU, AU, FIFA, the Olympics…`}
    data={ORGS} iconOf={() => Building2} />
}

// The overwhelmingly-massive full-page wall. Virtualised: only the rows on
// screen are mounted, so thousands of flags scroll smoothly and actually load.
const MEGA_PAD = 8
const MEGA_GAP = 8
const MEGA_MIN_TILE = 74
const MEGA_LABEL_H = 22
const MEGA_BAR_H = 58

function MegaCodexWall({ all, onClose, initialSort = 'az' }: { all: MegaFlag[]; onClose: () => void; initialSort?: 'az' | 'za' | 'rand' }) {
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
    const a = [...all]
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
          <div style={{ fontSize: 11, color: T.muted }}>Every flag · {all.length}</div>
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
  const all = useData(ALL_FLAGS, open)
  return (
    <div className="mt-5">
      <button onClick={() => setOpen(true)}
        className="geo-tap w-full flex items-center justify-between px-1 py-3 transition-all active:scale-[0.99]"
        style={{ background: 'transparent', borderBottom: `1px solid ${T.line}` }}>
        <div className="text-left">
          <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: T.danger }}>
            <Search size={15} color={T.danger} strokeWidth={1.6} absoluteStrokeWidth /> Mega Codex A–Z
          </h3>
          <p className="text-xs" style={{ color: T.dim }}>Every flag in the app · {CODEX_COUNTS.mega} · tap to open the wall</p>
        </div>
        <span style={{ color: T.danger, fontSize: 18, flexShrink: 0 }}>›</span>
      </button>
      {open && all && <MegaCodexWall all={all} onClose={() => setOpen(false)} />}
    </div>
  )
}
