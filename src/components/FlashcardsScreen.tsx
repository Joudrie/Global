import { useState, useRef, useMemo } from 'react'
import { FLAGS, REGIONS, getFlagsByRegion } from '../data/flags'
import type { Region } from '../data/flags'
import { CHALLENGE_CONTINENTS } from '../data/challenges'
import { HISTORICAL_FLAGS } from '../data/historicalFlags'
import { LGBTQ_FLAGS, OTHER_IDENTITY_FLAGS } from '../data/identityFlags'
import { shuffleWithSeed } from '../utils/prng'
import { T, ACCENT, FONT, tint } from '../ui/tokens'
import { ScreenHeader } from "./ui"
import { PrimaryButton, SecondaryButton } from "./gameUi"
import { LineIcon } from './icons'
import { Brain, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  onBack: () => void
  onQuizSet: (flags: typeof FLAGS) => void
}

type Mode = 'menu' | 'learn'
type DeckType = 'countries' | 'subdivisions' | 'historical' | 'lgbtq' | 'identity'

// Decks built from a flat list (no region/continent filtering).
const SIMPLE_DECKS: { id: DeckType; label: string; glyph: string; blurb: string }[] = [
  { id: 'historical', label: 'Historical', glyph: 'historical', blurb: 'Flags of vanished states & empires' },
  { id: 'lgbtq',      label: 'LGBTQ+',     glyph: 'identity',   blurb: 'Pride & identity flags' },
  { id: 'identity',   label: 'Identity',   glyph: 'flags',      blurb: 'Civic, ethnic & movement flags' },
]

const DECK_TABS: { id: DeckType; label: string; glyph: string }[] = [
  { id: 'countries',    label: 'Countries',    glyph: 'flags' },
  { id: 'subdivisions', label: 'Subdivisions', glyph: 'substumper' },
  { id: 'historical',   label: 'Historical',   glyph: 'historical' },
  { id: 'lgbtq',        label: 'LGBTQ+',       glyph: 'identity' },
  { id: 'identity',     label: 'Identity',     glyph: 'flags' },
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
  const [cardIdx, setCardIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null)
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

  const historicalCards: StudyCard[] = (() => {
    if (deckType !== 'historical') return []
    return shuffleWithSeed(HISTORICAL_FLAGS, sessionSeed + 'hist').map(h => ({
      key: h.id, flagUrl: h.flagUrl, name: h.name,
      subtitle: `${h.era} · ${h.region}`, funFact: h.note,
    }))
  })()

  const lgbtqCards: StudyCard[] = (() => {
    if (deckType !== 'lgbtq') return []
    return shuffleWithSeed(LGBTQ_FLAGS.filter(f => f.flagUrl && !f.noFlag), sessionSeed + 'lgbtq').map(f => ({
      key: f.id, flagUrl: f.flagUrl, name: f.name, subtitle: f.category, funFact: f.note,
    }))
  })()

  const identityCards: StudyCard[] = (() => {
    if (deckType !== 'identity') return []
    return shuffleWithSeed(OTHER_IDENTITY_FLAGS.filter(f => f.flagUrl && !f.noFlag), sessionSeed + 'ident').map(f => ({
      key: f.id, flagUrl: f.flagUrl, name: f.name, subtitle: f.category, funFact: f.note,
    }))
  })()

  const cards =
    deckType === 'countries'    ? countryCards :
    deckType === 'subdivisions' ? subdivisionCards :
    deckType === 'historical'   ? historicalCards :
    deckType === 'lgbtq'        ? lgbtqCards :
                                  identityCards
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
          /* ── Simple decks: historical / lgbtq / identity ── */
          <div className="flex-1 flex flex-col items-center justify-center px-5 gap-5" style={{ zIndex: 1, position: 'relative' }}>
            {(() => {
              const d = SIMPLE_DECKS.find(x => x.id === deckType)!
              return (
                <>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={{
                        width: 72, height: 72, borderRadius: 18,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: tint(ACCENT.learn, 0.12), border: `1px solid ${tint(ACCENT.learn, 0.28)}`,
                      }}>
                        <LineIcon name={d.glyph} size={36} color={ACCENT.learn} />
                      </span>
                    </div>
                    <div className="geo-display font-black text-xl mt-2" style={{ color: T.text }}>{d.label}</div>
                    <div className="text-xs mt-1" style={{ color: T.muted }}>{d.blurb}</div>
                    <div className="text-xs mt-2" style={{ color: ACCENT.learn, fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums' }}>{cards.length} cards</div>
                  </div>
                  <PrimaryButton onClick={startLearn} accent={ACCENT.learn} style={{ maxWidth: 384 }}>
                    <LineIcon name="codex" size={19} color={T.onAccent} /> Learn
                  </PrimaryButton>
                  <div className="text-xs" style={{ color: T.muted, marginTop: -12 }}>Swipe through flags &amp; facts</div>
                </>
              )
            })()}
          </div>
        )}
      </div>
    )
  }

  // ── LEARN ──────────────────────────────────────────────────────────────────
  if (!card) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 gap-4"
        style={{ background: T.bg, color: T.text }}>
        <p style={{ color: T.muted }}>No flags to study here yet.</p>
        <SecondaryButton onClick={() => setMode('menu')} style={{ maxWidth: 240 }}>Back</SecondaryButton>
      </div>
    )
  }

  const simpleDeck = SIMPLE_DECKS.find(d => d.id === deckType)
  const headerSub = deckType === 'countries'
    ? (selectedRegion === 'all' ? 'World' : selectedRegion)
    : simpleDeck
    ? simpleDeck.label
    : (subCountry?.name ?? '')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader
        title={deckType === 'subdivisions' ? `${headerSub} Subdivisions` : simpleDeck ? simpleDeck.label : 'Flashcards'}
        subtitle={`#${relIdx + 1} / ${cards.length} · ${deckType === 'subdivisions' ? 'subdivision flags' : headerSub}`}
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
                <img src={card.flagUrl} alt="flag"
                  style={{ width: '100%', height: 180, objectFit: 'contain', background: T.surfaceHi, borderRadius: 12, border: `2px solid ${T.line}` }}
                  onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
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
                  <img src={card.flagUrl} alt={card.name}
                    style={{ width: 56, height: 36, objectFit: 'contain', background: T.surfaceHi, borderRadius: 6, border: `1.5px solid ${T.line}`, flexShrink: 0 }}
                    onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                  <div>
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
