import { useState, useRef, useMemo } from 'react'
import { FLAGS, REGIONS, getFlagsByRegion } from '../data/flags'
import type { Region } from '../data/flags'
import { CHALLENGE_CONTINENTS } from '../data/challenges'
import { DECK_COUNTS, DECK_REGIONS, MEGA_SESSION, loadCodexDeck } from '../data/codexDecks'
import type { CodexDeckId, DeckGroup } from '../data/codexDecks'
import { shuffleWithSeed } from '../utils/prng'
import { T, ACCENT, FONT, tint } from '../ui/tokens'
import { ScreenHeader } from "./ui"
import { PrimaryButton, SecondaryButton } from "./gameUi"
import { LineIcon } from './icons'
import { Brain, ChevronLeft, ChevronRight, Search, Users, Rainbow, MapPin, Vote, Crown, Landmark, Building2, Anchor } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Props {
  onBack: () => void
  onQuizSet: (flags: typeof FLAGS) => void
}

type Mode = 'menu' | 'learn'
type DeckType = 'countries' | 'subdivisions' | 'codex'

const DECK_TABS: { id: DeckType; label: string; glyph: string }[] = [
  { id: 'countries',    label: 'Countries',    glyph: 'flags' },
  { id: 'subdivisions', label: 'Subdivisions', glyph: 'substumper' },
  { id: 'codex',        label: 'Codex',        glyph: 'codex' },
]

// One deck for each "Beyond countries" section of the Codex, in the Codex's
// order, with the section's icon and colour there. The cards come from
// data/codexDecks.ts, which builds them from the section's own rows.
const CODEX_DECKS: { id: CodexDeckId; title: string; beta?: boolean; icon: LucideIcon; color: string; blurb: string }[] = [
  { id: 'mega',         title: 'Mega Codex',                  icon: Search,    color: T.danger,     blurb: `Every flag, ${MEGA_SESSION} at random each time` },
  { id: 'peoples',      title: 'Peoples & Cultures',          icon: Users,     color: T.warm,       blurb: 'Peoples and nations, by region' },
  { id: 'pride',        title: 'Pride & LGBTQ+',              icon: Rainbow,   color: T.violet,     blurb: 'Pride and identity flags' },
  { id: 'separatist',   title: 'Separatist & Autonomous',     icon: MapPin,    color: T.gold,       blurb: 'Independence movements' },
  { id: 'civic',        title: 'Civic & Ideological',         icon: Vote,      color: T.chartreuse, blurb: 'Causes, faiths and world bodies' },
  { id: 'micronations', title: 'Micronations',                icon: Crown,     color: T.green,      blurb: 'Self-declared nations' },
  { id: 'extinct',      title: 'Extinct & Former States',     icon: Landmark,  color: T.cyan,       blurb: 'Vanished states, by continent' },
  { id: 'uscities',     title: 'American Cities', beta: true, icon: Building2, color: T.chartreuse, blurb: 'U.S. city flags' },
  { id: 'orgs',         title: 'International Organizations', icon: Building2, color: T.green,      blurb: 'UN, NATO, the Olympics, FIFA…' },
  { id: 'signal',       title: 'Signal & Maritime Flags',     icon: Anchor,    color: T.cyan,       blurb: 'Code flags, Alpha to Zulu' },
]

// A unified card used by the flip view, built from either a country flag or a subdivision flag.
interface StudyCard {
  key: string
  flagUrl: string
  name: string
  subtitle: string
  funFact?: string
  tip?: string
}

const REGION_OPTS: { label: string; value: 'all' | Region }[] = [
  { label: 'World', value: 'all' },
  ...REGIONS.map(r => ({ label: r, value: r as Region })),
]

const RECENT_KEY = 'globalio_flashcard_recent'
const MAX_RECENT = 5

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}
function saveRecent(codes: string[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(codes.slice(0, MAX_RECENT)))
}
function addToRecent(code: string) {
  const prev = loadRecent().filter(c => c !== code)
  saveRecent([code, ...prev])
}

// Countries (per continent) that actually have at least one subdivision flag to study.
function countriesWithSubFlags(continentId: string) {
  const cont = CHALLENGE_CONTINENTS.find(c => c.id === continentId)
  if (!cont) return []
  return cont.countries.filter(c => c.subRegions.some(s => s.flagUrl))
}

export default function FlashcardsScreen({ onBack, onQuizSet }: Props) {
  const [mode, setMode] = useState<Mode>('menu')
  const [deckType, setDeckType] = useState<DeckType>('countries')
  const [selectedRegion, setSelectedRegion] = useState<'all' | Region>('all')
  const [subContinent, setSubContinent] = useState<string | null>(null)
  const [subCountry, setSubCountry] = useState<{ code: string; name: string } | null>(null)
  // Codex decks: the one being learned, its region (null = all of them), the
  // region list that's open in the menu, and each deck's cards once loaded.
  const [codexDeck, setCodexDeck] = useState<CodexDeckId | null>(null)
  const [codexGroup, setCodexGroup] = useState<number | null>(null)
  const [openDeck, setOpenDeck] = useState<CodexDeckId | null>(null)
  const [decks, setDecks] = useState<Partial<Record<CodexDeckId, DeckGroup[]>>>({})
  const [failed, setFailed] = useState<CodexDeckId | null>(null)
  const loadingDecks = useRef(new Set<CodexDeckId>())
  // A new shuffle (and a new Mega Codex draw) each time a deck starts.
  const [round, setRound] = useState(0)
  const [cardIdx, setCardIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null)
  // The flag image that failed to load, so its card says so instead of showing a blank.
  const [brokenImg, setBrokenImg] = useState<string | null>(null)
  const [sessionSeed] = useState(() => Date.now().toString())
  const dragStartX = useRef<number | null>(null)
  const isDragging = useRef(false)

  // ── Build the active deck of StudyCards ────────────────────────────────────
  const sourceFlags = selectedRegion === 'all' ? FLAGS : getFlagsByRegion(selectedRegion)

  // Build the country deck ONCE per (region, session). It reads loadRecent() to
  // prioritise recently-studied flags, but flipping a card calls addToRecent(),
  // which mutates that storage — so recomputing every render would reorder the
  // deck under the user mid-session. Memoising freezes the order; "recent" only
  // shapes the *next* session's deck.
  const countryCards: StudyCard[] = useMemo(() => {
    const recentCodes = loadRecent()
    const recent = recentCodes.map(c => sourceFlags.find(f => f.code === c)).filter(Boolean) as typeof FLAGS
    const rest = shuffleWithSeed(
      sourceFlags.filter(f => !recentCodes.includes(f.code)),
      sessionSeed + selectedRegion
    )
    return [...recent, ...rest].map(f => ({
      key: f.code, flagUrl: f.flagUrl, name: f.name, subtitle: f.region,
      funFact: f.funFact, tip: f.distinguishingTip,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion, sessionSeed])

  const subdivisionCards: StudyCard[] = (() => {
    if (!subContinent || !subCountry) return []
    const cont = CHALLENGE_CONTINENTS.find(c => c.id === subContinent)
    const country = cont?.countries.find(c => c.code === subCountry.code)
    if (!country) return []
    const withFlags = country.subRegions.filter(s => s.flagUrl)
    return shuffleWithSeed(withFlags, sessionSeed + subCountry.code).map(s => ({
      key: s.code, flagUrl: s.flagUrl!, name: s.name,
      subtitle: s.group ? `${country.name} · ${s.group}` : country.name,
    }))
  })()

  const codexCards: StudyCard[] = useMemo(() => {
    const groups = codexDeck ? decks[codexDeck] : undefined
    if (deckType !== 'codex' || !codexDeck || !groups) return []
    const picked = codexGroup == null ? groups : groups.slice(codexGroup, codexGroup + 1)
    const shuffled = shuffleWithSeed(picked.flatMap(g => g.cards), `${sessionSeed}${codexDeck}${codexGroup}${round}`)
    return (codexDeck === 'mega' ? shuffled.slice(0, MEGA_SESSION) : shuffled)
      .map(c => ({ key: c.key, flagUrl: c.flagUrl, name: c.name, subtitle: c.subtitle, funFact: c.note }))
  }, [deckType, codexDeck, codexGroup, decks, round, sessionSeed])

  const cards =
    deckType === 'countries'    ? countryCards :
    deckType === 'subdivisions' ? subdivisionCards :
                                  codexCards
  const card = cards.length > 0 ? cards[cardIdx % cards.length] : undefined
  const relIdx = cards.length > 0 ? cardIdx % cards.length : 0

  const advance = (dir: 'left' | 'right') => {
    if (exiting || cards.length === 0) return
    setExiting(dir)
    setTimeout(() => { setCardIdx(i => i + 1); setFlipped(false); setExiting(null) }, 230)
  }
  const goPrev = () => {
    if (exiting || cards.length === 0) return
    setExiting('right')
    setTimeout(() => { setCardIdx(i => (i <= 0 ? cards.length - 1 : i - 1)); setFlipped(false); setExiting(null) }, 230)
  }

  const handleFlip = () => {
    if (!card) return
    if (!flipped && deckType === 'countries') addToRecent(card.key)
    setFlipped(f => !f)
  }

  const handleDragStart = (clientX: number) => { dragStartX.current = clientX; isDragging.current = true }
  const handleDragEnd = (clientX: number) => {
    if (!isDragging.current || dragStartX.current === null) return
    const delta = clientX - dragStartX.current
    isDragging.current = false
    dragStartX.current = null
    // Swipe left → next card; swipe right → go back to the previous one.
    if (Math.abs(delta) > 50) {
      if (delta < 0) advance('left')
      else goPrev()
    }
  }

  const cardStyle = (): React.CSSProperties => {
    if (exiting === 'left') return { transform: 'translateX(-120%) rotate(-12deg)', opacity: 0, transition: 'transform 0.23s ease-in, opacity 0.2s' }
    if (exiting === 'right') return { transform: 'translateX(120%) rotate(12deg)', opacity: 0, transition: 'transform 0.23s ease-in, opacity 0.2s' }
    return { transform: 'translateX(0) rotate(0)', opacity: 1, transition: 'transform 0.15s ease-out' }
  }

  const startLearn = () => { setCardIdx(0); setFlipped(false); setMode('learn') }

  // A deck's cards load the first time it's opened (the galleries are big).
  const loadDeck = (id: CodexDeckId) => {
    if (decks[id] || loadingDecks.current.has(id)) return
    loadingDecks.current.add(id)
    setFailed(f => (f === id ? null : f))
    loadCodexDeck(id)
      .then(groups => setDecks(d => ({ ...d, [id]: groups })), () => setFailed(id))
      .finally(() => loadingDecks.current.delete(id))
  }
  const startCodex = (id: CodexDeckId, group: number | null) => {
    loadDeck(id)
    setCodexDeck(id); setCodexGroup(group); setRound(r => r + 1)
    startLearn()
  }
  const toggleDeck = (id: CodexDeckId) => {
    if (openDeck === id) { setOpenDeck(null); return }
    setOpenDeck(id); loadDeck(id)
  }

  // ── MENU ───────────────────────────────────────────────────────────────────
  if (mode === 'menu') {
    const recentCodes = loadRecent()
    const recent = recentCodes.map(c => sourceFlags.find(f => f.code === c)).filter(Boolean) as typeof FLAGS

    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title="Flashcards" subtitle="Swipe through flags & facts" onBack={onBack} />

        {/* Deck type tabs */}
        <div className="px-5 mb-4" style={{ zIndex: 1, position: 'relative' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, background: T.surface, border: `1px solid ${T.line}`, padding: 4, borderRadius: 14 }}>
            {DECK_TABS.map(t => (
              <button key={t.id} onClick={() => setDeckType(t.id)}
                style={{
                  flex: '1 0 28%', padding: '8px 4px', borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  background: deckType === t.id ? ACCENT.learn : 'transparent',
                  color: deckType === t.id ? T.onAccent : T.muted,
                }}>
                <LineIcon name={t.glyph} size={14} color={deckType === t.id ? T.onAccent : T.muted} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {deckType === 'countries' ? (
          <>
            {/* Region filter */}
            <div className="px-5 mb-4" style={{ zIndex: 1, position: 'relative' }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: T.muted }}>Region</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {REGION_OPTS.map(opt => (
                  <button key={opt.value} onClick={() => setSelectedRegion(opt.value)}
                    style={{
                      padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                      border: `1px solid ${selectedRegion === opt.value ? ACCENT.learn : T.line}`,
                      background: selectedRegion === opt.value ? ACCENT.learn : 'transparent',
                      color: selectedRegion === opt.value ? T.onAccent : T.muted, cursor: 'pointer',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="text-xs mt-2" style={{ color: T.dim }}>
                {countryCards.length} flag{countryCards.length !== 1 ? 's' : ''}{recent.length > 0 ? ` · ${recent.length} recently studied` : ''}
              </div>
            </div>

            {recent.length > 0 && (
              <div className="px-5 mb-4" style={{ zIndex: 1, position: 'relative' }}>
                <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: T.muted }}>Recently Studied</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {recent.map(f => (
                    <div key={f.code} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <img src={f.flagUrl} alt={f.name}
                        style={{ width: 44, height: 30, objectFit: 'cover', borderRadius: 6, border: `1px solid ${T.line}` }}
                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }} />
                      <span style={{ fontSize: 8, color: T.muted, textAlign: 'center', maxWidth: 44, lineHeight: 1.2 }}>{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center px-5 gap-5" style={{ zIndex: 1, position: 'relative' }}>
              <PrimaryButton onClick={startLearn} accent={ACCENT.learn} style={{ maxWidth: 384 }}>
                <LineIcon name="codex" size={19} color={T.onAccent} /> Learn
              </PrimaryButton>
              <div className="text-xs" style={{ color: T.muted, marginTop: -12 }}>Swipe through flags &amp; facts</div>
              <button onClick={() => onQuizSet(sourceFlags)}
                className="geo-tap w-full max-w-sm py-4 rounded-2xl font-bold text-lg transition-all active:scale-95"
                style={{ background: T.surface, border: `1px solid ${tint(ACCENT.learn, 0.3)}`, color: ACCENT.learn, fontFamily: FONT.display }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Brain size={19} color={ACCENT.learn} strokeWidth={1.6} absoluteStrokeWidth /> Quiz Me
                </span>
                <div className="text-xs font-normal mt-0.5 opacity-75">Test yourself on {countryCards.length} flags</div>
              </button>
            </div>
          </>
        ) : deckType === 'subdivisions' ? (
          /* ── Subdivisions browser: continent → country ── */
          <div className="flex-1 px-5 overflow-y-auto" style={{ zIndex: 1, position: 'relative' }}>
            <div className="text-xs mb-3" style={{ color: T.dim }}>
              Pick a continent, then a country to study its subdivision flags. Only countries with subdivision flags are shown.
            </div>
            <div className="space-y-2 pb-10">
              {CHALLENGE_CONTINENTS.map(cont => {
                const eligible = countriesWithSubFlags(cont.id)
                if (eligible.length === 0) return null
                const open = subContinent === cont.id
                return (
                  <div key={cont.id} style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.line}`, overflow: 'hidden' }}>
                    <button onClick={() => setSubContinent(open ? null : cont.id)}
                      className="w-full flex items-center justify-between px-4 py-3"
                      style={{ background: 'transparent', cursor: 'pointer' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="geo-display" style={{ fontWeight: 800, color: T.text }}>{cont.name}</span>
                        <span style={{ fontSize: 11, color: T.muted }}>{eligible.length} countries</span>
                      </span>
                      <span style={{ color: ACCENT.learn, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
                    </button>
                    {open && (
                      <div style={{ padding: '0 10px 10px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {eligible.map(c => {
                          const n = c.subRegions.filter(s => s.flagUrl).length
                          return (
                            <button key={c.code}
                              onClick={() => { setSubCountry({ code: c.code, name: c.name }); setCardIdx(0); setFlipped(false); setMode('learn') }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999,
                                background: T.surfaceHi, border: `1px solid ${T.line}`, color: T.text,
                                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                              }}>
                              <span>{c.emoji}</span>{c.name}
                              <span style={{ fontSize: 10, fontFamily: FONT.mono, color: ACCENT.learn }}>{n}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ── Codex decks: one per Codex section; the big ones split by region ── */
          <div className="flex-1 px-5 overflow-y-auto" style={{ zIndex: 1, position: 'relative' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: T.muted }}>Codex decks</div>
            <div className="text-xs mb-3" style={{ color: T.dim }}>
              A deck for each section of the Codex. The big ones split by region, as in the Codex: pick one, or all.
            </div>
            <div className="space-y-2 pb-10">
              {CODEX_DECKS.map(d => {
                const byRegion = DECK_REGIONS.includes(d.id)
                const open = openDeck === d.id
                const groups = decks[d.id]
                const Icon = d.icon
                return (
                  <div key={d.id} style={{ background: T.surface, borderRadius: 14, border: `1px solid ${open ? tint(d.color, 0.45) : T.line}`, overflow: 'hidden' }}>
                    <button onClick={() => (byRegion ? toggleDeck(d.id) : startCodex(d.id, null))}
                      aria-expanded={byRegion ? open : undefined}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      style={{ background: 'transparent', cursor: 'pointer', minHeight: 64 }}>
                      <span style={{
                        width: 36, height: 36, borderRadius: 999, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: tint(d.color, 0.12), border: `1px solid ${tint(d.color, 0.3)}`,
                      }}>
                        <Icon size={17} color={d.color} strokeWidth={1.6} absoluteStrokeWidth />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="geo-display" style={{ display: 'block', fontWeight: 700, fontSize: 16, color: T.text, lineHeight: 1.2 }}>
                          {d.title}{d.beta && <span style={{ fontFamily: FONT.mono, fontSize: 10, fontWeight: 600, color: T.muted, marginLeft: 6 }}>Beta</span>}
                        </span>
                        <span style={{ display: 'block', fontSize: 12, color: T.muted, marginTop: 2, lineHeight: 1.35 }}>
                          <span style={{ fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums', color: ACCENT.learn, fontWeight: 600 }}>{DECK_COUNTS[d.id].toLocaleString('en-US')}</span> · {d.blurb}
                        </span>
                      </span>
                      <span aria-hidden style={{ color: ACCENT.learn, fontSize: 18, flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
                    </button>
                    {byRegion && open && (
                      <div style={{ padding: '0 12px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {groups ? (
                          [{ label: 'All', group: null as number | null, n: DECK_COUNTS[d.id] },
                            ...groups.map((g, i) => ({ label: g.label, group: i as number | null, n: g.cards.length }))].map(c => (
                            <button key={c.label} onClick={() => startCodex(d.id, c.group)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, minHeight: 36,
                                background: c.group == null ? tint(ACCENT.learn, 0.1) : T.surfaceHi,
                                border: `1px solid ${c.group == null ? tint(ACCENT.learn, 0.4) : T.line}`, color: T.text,
                                fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                              }}>
                              {c.label}
                              <span style={{ fontSize: 10, fontFamily: FONT.mono, color: ACCENT.learn }}>{c.n.toLocaleString('en-US')}</span>
                            </button>
                          ))
                        ) : failed === d.id ? (
                          <span className="text-xs" style={{ color: T.muted, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            These flags didn't load.
                            <button onClick={() => loadDeck(d.id)} style={{ color: ACCENT.learn, fontWeight: 700, fontSize: 12, minHeight: 36, cursor: 'pointer' }}>Try again</button>
                          </span>
                        ) : (
                          <span className="text-xs" role="status" style={{ color: T.dim, padding: '8px 0' }}>Loading regions…</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── LEARN ──────────────────────────────────────────────────────────────────
  const codexMeta = deckType === 'codex' ? CODEX_DECKS.find(d => d.id === codexDeck) : undefined
  const codexGroups = codexDeck ? decks[codexDeck] : undefined
  if (codexMeta && !codexGroups) {
    const didFail = failed === codexMeta.id
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title={codexMeta.title} subtitle="Codex deck" onBack={() => setMode('menu')} />
        <div className="flex-1 flex flex-col items-center justify-center px-5 gap-4">
          <p role="status" style={{ color: T.muted, fontSize: 14, margin: 0 }}>{didFail ? "These flags didn't load." : 'Loading flags…'}</p>
          {didFail && <SecondaryButton onClick={() => loadDeck(codexMeta.id)} style={{ maxWidth: 240 }}>Try again</SecondaryButton>}
        </div>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 gap-4"
        style={{ background: T.bg, color: T.text }}>
        <p style={{ color: T.muted }}>No flags to study here yet.</p>
        <SecondaryButton onClick={() => setMode('menu')} style={{ maxWidth: 240 }}>Back</SecondaryButton>
      </div>
    )
  }

  const headerTitle =
    deckType === 'countries'    ? 'Flashcards' :
    deckType === 'subdivisions' ? `${subCountry?.name ?? ''} Subdivisions` :
                                  (codexMeta?.title ?? 'Flashcards')
  const headerSub =
    deckType === 'countries'    ? (selectedRegion === 'all' ? 'World' : selectedRegion) :
    deckType === 'subdivisions' ? 'subdivision flags' :
    codexDeck === 'mega'        ? `drawn from ${DECK_COUNTS.mega.toLocaleString('en-US')} flags` :
    codexGroup != null          ? (codexGroups?.[codexGroup]?.label ?? '') :
    codexDeck && DECK_REGIONS.includes(codexDeck) ? 'All regions' : ''

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader
        title={headerTitle}
        subtitle={`#${relIdx + 1} / ${cards.length}${headerSub ? ` · ${headerSub}` : ''}`}
        onBack={() => setMode('menu')} />

      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-10" style={{ zIndex: 1, position: 'relative' }}>
        <div style={{ width: '100%', maxWidth: 360, position: 'relative' }}>
          {/* Desktop-only navigation arrows (mobile uses swipe) */}
          <button onClick={e => { e.stopPropagation(); goPrev() }} aria-label="Previous card"
            className="hidden sm:flex items-center justify-center active:scale-90 transition-transform"
            style={{ position: 'absolute', left: -64, top: '50%', transform: 'translateY(-50%)', zIndex: 5,
              width: 44, height: 44, borderRadius: 999,
              background: T.surface, border: `1px solid ${tint(ACCENT.learn, 0.3)}`, color: ACCENT.learn, cursor: 'pointer' }}>
            <ChevronLeft size={22} color={ACCENT.learn} strokeWidth={1.6} absoluteStrokeWidth />
          </button>
          <button onClick={e => { e.stopPropagation(); advance('left') }} aria-label="Next card"
            className="hidden sm:flex items-center justify-center active:scale-90 transition-transform"
            style={{ position: 'absolute', right: -64, top: '50%', transform: 'translateY(-50%)', zIndex: 5,
              width: 44, height: 44, borderRadius: 999,
              background: T.surface, border: `1px solid ${tint(ACCENT.learn, 0.3)}`, color: ACCENT.learn, cursor: 'pointer' }}>
            <ChevronRight size={22} color={ACCENT.learn} strokeWidth={1.6} absoluteStrokeWidth />
          </button>

          <div className="absolute inset-0 rounded-2xl" style={{ background: T.surface, border: `1px solid ${T.line}`, transform: 'rotate(3deg) scale(0.97) translateY(8px)', opacity: 0.4 }} />
          <div className="absolute inset-0 rounded-2xl" style={{ background: T.surface, border: `1px solid ${T.line}`, transform: 'rotate(-1.5deg) scale(0.985) translateY(4px)', opacity: 0.65 }} />

          <div
            style={{ perspective: 1000, ...cardStyle() }}
            onMouseDown={e => handleDragStart(e.clientX)}
            onMouseUp={e => handleDragEnd(e.clientX)}
            onMouseLeave={() => { isDragging.current = false; dragStartX.current = null }}
            onTouchStart={e => handleDragStart(e.touches[0].clientX)}
            onTouchEnd={e => handleDragEnd(e.changedTouches[0].clientX)}
            onClick={() => !isDragging.current && handleFlip()}
            role="button" tabIndex={0} aria-label={flipped ? "Show the flag" : "Reveal the answer"}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleFlip() } }}
          >
            <div style={{
              position: 'relative', transformStyle: 'preserve-3d',
              transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              cursor: 'pointer', borderRadius: 16, minHeight: 300,
            }}>
              {/* FRONT */}
              <div style={{
                backfaceVisibility: 'hidden', position: flipped ? 'absolute' : 'relative',
                inset: 0, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16,
                boxShadow: `0 8px 30px ${tint(T.text, 0.16)}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 24, gap: 16, minHeight: 300,
              }}>
                {brokenImg === card.flagUrl ? (
                  <div style={{ width: '100%', height: 180, background: T.surfaceHi, borderRadius: 12, border: `2px dashed ${T.line}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <LineIcon name="flag" size={28} color={T.dim} />
                    <span style={{ color: T.dim, fontSize: 12 }}>This flag's image didn't load</span>
                  </div>
                ) : (
                  <img key={card.key} src={card.flagUrl} alt="flag"
                    style={{ width: '100%', height: 180, objectFit: 'contain', background: T.surfaceHi, borderRadius: 12, border: `2px solid ${T.line}` }}
                    onError={() => setBrokenImg(card.flagUrl)} />
                )}
                <p style={{ color: ACCENT.learn, fontSize: 14, margin: 0 }}>Tap to reveal · Swipe to skip</p>
              </div>

              {/* BACK */}
              <div style={{
                backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
                position: flipped ? 'relative' : 'absolute', inset: 0,
                background: T.surface, border: `1px solid ${tint(ACCENT.learn, 0.3)}`, borderRadius: 16,
                boxShadow: `0 8px 30px ${tint(T.text, 0.16)}`, padding: 24, minHeight: 300,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <img key={card.key} src={card.flagUrl} alt={card.name}
                    style={{ width: 56, height: 36, objectFit: 'contain', background: T.surfaceHi, borderRadius: 6, border: `1.5px solid ${T.line}`, flexShrink: 0,
                      visibility: brokenImg === card.flagUrl ? 'hidden' : 'visible' }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="geo-display" style={{ color: T.text, fontWeight: 800, fontSize: 20 }}>{card.name}</div>
                    <div style={{ color: ACCENT.learn, fontSize: 12 }}>{card.subtitle}</div>
                  </div>
                </div>
                {card.funFact && <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{card.funFact}</p>}
                {card.tip && (
                  <div style={{ background: tint(T.gold, 0.08), border: `1px solid ${tint(T.gold, 0.25)}`, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ color: T.gold, fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <LineIcon name="funfact" size={13} color={T.gold} /> How to recognise it
                    </div>
                    <p style={{ color: T.text, fontSize: 13, margin: 0 }}>{card.tip}</p>
                  </div>
                )}
                <p style={{ color: T.dim, fontSize: 12, marginTop: 16, textAlign: 'center' }}>Swipe to next</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginTop: 24 }}>
          {Array.from({ length: Math.min(7, cards.length) }).map((_, i) => (
            <div key={i} style={{ width: i === relIdx % 7 ? 16 : 6, height: 6, borderRadius: 999,
              background: i === relIdx % 7 ? ACCENT.learn : tint(ACCENT.learn, 0.25), transition: 'all 0.2s' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
