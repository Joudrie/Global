import { useState } from "react"
import { FLAGS } from "../data/flags"
import { fp } from "../data/flagUrl"
import { ETHNIC_FLAGS } from "../data/ethnicFlags"
import { HISTORICAL_FLAGS } from "../data/historicalFlags"
import { IDENTITY_FLAGS } from "../data/identityFlags"
import { US_CITY_FLAGS } from "../data/usCityFlags"
import type { AppState } from "../utils/storage"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { PrimaryButton, SecondaryButton } from "./gameUi"

interface Props {
  state: AppState
  onBack: () => void
  onStateChange: (state: AppState) => void
}

const A = ACCENT.today

// A normalised fun-fact card, drawn from any of the codex's flag collections.
interface FactCard { name: string; sub: string; flagUrl: string; fact: string; tip?: string }

// Each "segment" is a pool of facts you can browse. A segment with no written
// facts simply shows an empty state — that's fine, they fill in over time.
const SEGMENTS: { label: string; cards: FactCard[] }[] = [
  {
    label: "Countries",
    cards: FLAGS.map(f => ({ name: f.name, sub: f.region, flagUrl: f.flagUrl, fact: f.funFact, tip: f.distinguishingTip })),
  },
  {
    label: "Peoples & Cultures",
    cards: ETHNIC_FLAGS.flatMap(r => r.groups.flatMap(g => g.items
      .filter(it => it.note)
      .map(it => ({ name: it.name, sub: r.region.replace(/^Peoples of /, ""), flagUrl: fp(it.file), fact: it.note as string })))),
  },
  {
    label: "Micronations",
    cards: IDENTITY_FLAGS.filter(f => f.category === "Micronations" && f.flagUrl && !f.noFlag && f.note)
      .map(f => ({ name: f.name, sub: "Micronation", flagUrl: f.flagUrl as string, fact: f.note })),
  },
  {
    label: "Movements & Identity",
    // Maritime/signal flags live in their own segment below — keep them out here.
    cards: IDENTITY_FLAGS.filter(f => f.category !== "Micronations" && f.category !== "Maritime & Signal" && f.flagUrl && !f.noFlag && f.note)
      .map(f => ({ name: f.name, sub: f.category, flagUrl: f.flagUrl as string, fact: f.note })),
  },
  {
    label: "Maritime & Signal",
    cards: IDENTITY_FLAGS.filter(f => f.category === "Maritime & Signal" && f.flagUrl && !f.noFlag && f.note)
      .map(f => ({ name: f.name, sub: f.category, flagUrl: f.flagUrl as string, fact: f.note })),
  },
  {
    label: "Extinct & Former States",
    cards: HISTORICAL_FLAGS.filter(h => h.note).map(h => ({ name: h.name, sub: h.era, flagUrl: h.flagUrl, fact: h.note })),
  },
  {
    label: "U.S. Cities",
    cards: US_CITY_FLAGS.filter(c => c.note).map(c => ({ name: c.name, sub: c.state, flagUrl: c.flagUrl, fact: c.note })),
  },
]

function shuffleIndices(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export default function FunFactScreen({ onBack }: Props) {
  const [segIdx, setSegIdx] = useState(0)
  const [order, setOrder] = useState<number[]>(() => shuffleIndices(SEGMENTS[0].cards.length))
  const [cardIdx, setCardIdx] = useState(0)
  const [showTip, setShowTip] = useState(false)

  const seg = SEGMENTS[segIdx]
  const cards = seg.cards
  const card: FactCard | null = cards.length ? cards[order[cardIdx % order.length]] : null

  const changeSeg = (i: number) => {
    setSegIdx(i)
    setOrder(shuffleIndices(SEGMENTS[i].cards.length))
    setCardIdx(0)
    setShowTip(false)
  }
  // Keep cardIdx within [0, cards.length) by wrapping both directions, so the
  // "X of N" counter is exact and Prev/Next stay in sync after wrapping.
  const handleNext = () => { setCardIdx(i => (i + 1) % cards.length); setShowTip(false) }
  const handlePrev = () => { setCardIdx(i => (i - 1 + cards.length) % cards.length); setShowTip(false) }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Fun Facts" subtitle={cards.length ? `${(cardIdx % cards.length) + 1} of ${cards.length}` : seg.label} onBack={onBack} />

      {/* Segment picker — choose which pool of flags the facts come from */}
      <div className="px-5 pt-1">
        <div className="carto-rail" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {SEGMENTS.map((s, i) => {
            const on = i === segIdx
            return (
              <button key={s.label} onClick={() => changeSeg(i)} aria-pressed={on}
                className="geo-tap" style={{ flexShrink: 0, padding: "6px 13px", borderRadius: 999, whiteSpace: "nowrap",
                  fontFamily: FONT.display, fontWeight: 700, fontSize: 12,
                  background: on ? A : T.surface, color: on ? T.onAccent : T.muted, border: `1px solid ${on ? A : T.line}` }}>
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Card area — vertically centred in the remaining space */}
      <div className="flex flex-col items-center justify-center px-5 gap-4 pb-10 flex-1">
        {card ? (
          <>
            <div className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ border: `1px solid ${T.line}`, boxShadow: `0 6px 20px -10px ${tint(T.text, 0.5)}` }}>
              {/* Flag image — show the whole flag (no zoom/crop, nothing covering it) */}
              <div style={{ aspectRatio: "3 / 2", background: T.surfaceHi }}>
                <img src={card.flagUrl} alt={card.name}
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                  onError={e => { (e.target as HTMLImageElement).style.opacity = "0.25" }} />
              </div>
              {/* Name sits in a solid caption bar below the flag, never over it. */}
              <div style={{ background: T.surfaceHi, borderTop: `1px solid ${T.line}`, padding: "10px 16px" }}>
                <div className="text-xl font-black" style={{ color: T.text, fontFamily: FONT.display }}>{card.name}</div>
                <div className="text-xs" style={{ color: T.muted }}>{card.sub}</div>
              </div>

              {/* Fact + optional tip toggle */}
              <div style={{ background: T.surface, padding: "18px 20px" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold uppercase tracking-widest" style={{ color: A }}>Did you know?</div>
                  {card.tip && (
                    <button onClick={() => setShowTip(v => !v)} aria-label="Show flag tip" aria-pressed={showTip}
                      className="geo-tap" style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontWeight: 800, fontSize: 13, fontStyle: "italic",
                        background: showTip ? A : tint(A, 0.12), color: showTip ? T.onAccent : A, border: `1px solid ${tint(A, 0.4)}` }}>
                      i
                    </button>
                  )}
                </div>
                <p className="text-base leading-relaxed font-medium" style={{ color: T.text }}>{card.fact}</p>
              </div>

              {/* Tip — only when the ⓘ is tapped */}
              {card.tip && showTip && (
                <div style={{ background: T.surfaceHi, padding: "12px 20px", borderTop: `1px solid ${T.line}` }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: A }}>Flag tip</div>
                  <p className="text-xs" style={{ color: T.muted }}>{card.tip}</p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex gap-3 w-full max-w-sm">
              <SecondaryButton onClick={handlePrev} disabled={cardIdx === 0} style={{ flex: 1, width: "auto" }}>
                ← Prev
              </SecondaryButton>
              <PrimaryButton onClick={handleNext} accent={A} style={{ flex: 1, width: "auto" }}>
                Next →
              </PrimaryButton>
            </div>
          </>
        ) : (
          <div className="w-full max-w-sm rounded-2xl text-center" style={{ background: T.surface, border: `1px dashed ${T.line}`, padding: "32px 20px", color: T.muted }}>
            <div className="text-sm font-semibold" style={{ color: T.text, marginBottom: 6 }}>No fun facts here yet</div>
            <div className="text-xs">We haven't written facts for {seg.label} yet — they'll show up here as we add them.</div>
          </div>
        )}
      </div>
    </div>
  )
}
