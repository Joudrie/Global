import { useState } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { FLAG_ATTRIBS } from "../data/flagAttribs"
import type { FlagAttribs } from "../data/flagAttribs"
import { FACTS, OFFICIAL } from "../data/countryFacts"
import type { Fact } from "../data/countryFacts"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, ResultDots, PrimaryButton, SecondaryButton, choiceLabel } from "./gameUi"

const FEATURES = ['stripes', 'cross', 'star', 'crescent', 'emblem'] as const

const ACC = ACCENT.play

// How visually similar `oddCode` is to the in-group of three flags. Higher =
// blends in better. We reward shared colours and matching the group's majority
// feature profile, and heavily penalise a distinctive "tell" the group lacks
// (e.g. a Nordic cross among Middle-Eastern flags), so the answer can't be
// spotted by look alone. Colours are compared as an overlap ratio (shared
// colours over all colours of the pair), so a many-coloured flag like South
// Africa's doesn't blend in with everything just by having more colours.
function visualScore(oddCode: string, three: FlagRecord[]): number {
  const oa = FLAG_ATTRIBS[oddCode]
  if (!oa) return -Infinity
  const inAttrs = three.map(t => FLAG_ATTRIBS[t.code]).filter(Boolean) as FlagAttribs[]
  if (inAttrs.length === 0) return 0
  let overlap = 0
  for (const a of inAttrs) {
    const shared = oa.colors.filter(c => a.colors.includes(c)).length
    overlap += shared / new Set([...oa.colors, ...a.colors]).size
  }
  let s = (overlap / inAttrs.length) * 6
  for (const f of FEATURES) {
    const inCount = inAttrs.filter(a => a[f]).length
    if (oa[f] && inCount === 0) s -= 3
    else if (oa[f] === (inCount >= 2)) s += 1
  }
  return s
}

function pickBlendingOutlier(three: FlagRecord[], outPool: FlagRecord[]): FlagRecord {
  const scored = outPool
    .map(f => ({ f, s: visualScore(f.code, three) }))
    .sort((a, b) => b.s - a.s)
  // Randomise among the top blending candidates so rounds still vary.
  const top = scored.slice(0, Math.min(4, scored.length))
  return (top[Math.floor(Math.random() * top.length)] ?? scored[0]).f
}

interface Props { onBack: () => void }

interface Round {
  question: string
  themeLabel: string
  flags: FlagRecord[]
  oddIndex: number
}

// ── Category definitions ─────────────────────────────────────────────────────

interface Category {
  id: string
  question: string    // "Which does NOT..."
  themeLabel: string  // "The other 3 are all..."
  codes: Set<string>
  // Countries a player could fairly argue either way (a `maybe` in
  // countryFacts, a transcontinental country for a region, a speck of red in a
  // coat of arms). They never appear in this category's rounds, neither in
  // the group nor as the odd one out.
  unsure: Set<string>
}

// Country facts come from the hand-checked lists in countryFacts.ts (shared
// with Connections), so `yes` countries form the group and `maybe` ones sit out.
const fromFact = (f: Fact) => ({ codes: new Set(f.yes), unsure: new Set(f.maybe ?? []) })

// These two categories ask about a VISUAL property, so they must be derived from
// the same FLAG_ATTRIBS that the answer reveal trusts — not a hand-curated list.
// Otherwise the complement (outPool) contains flags that still have the property,
// and pickBlendingOutlier (which rewards shared palette/symbols) can hand back an
// "odd one" that is itself red / has a star — an unsolvable round.
const RED_FLAG      = new Set(FLAGS.filter(f => FLAG_ATTRIBS[f.code]?.colors.includes('red')).map(f => f.code))
const CRESCENT_STAR = new Set(FLAGS.filter(f => { const a = FLAG_ATTRIBS[f.code]; return a?.crescent || a?.star }).map(f => f.code))
// Red only in a small detail of the emblem (a cap, a cord, a bird's breast, a jewel).
const RED_DETAIL    = new Set(['SV', 'NI', 'GT', 'VA', 'SM', 'BT'])
// Stars or crescents some players see and others don't (in a coat of arms, a stylised moon).
const STAR_DETAIL   = new Set([...(FACTS.flagStar.maybe ?? []), ...(FACTS.flagCrescent.maybe ?? [])])

function regionCat(region: FlagRecord['region'], from: string, label: string, also: string[] = [], unsure: string[] = []): Category {
  const codes = new Set(FLAGS.filter(f => f.region === region || also.includes(f.code)).map(f => f.code))
  for (const c of unsure) codes.delete(c)
  return {
    id: `region-${region}`,
    question: `Which flag is NOT from ${from}?`,
    themeLabel: label,
    codes,
    unsure: new Set(unsure),
  }
}

const MIDDLE_EAST = FLAGS.filter(f => f.region === 'Middle East').map(f => f.code)

const CATEGORIES: Category[] = [
  { id: 'english',     question: 'Which country does NOT have English as an official language?', themeLabel: 'official English-speaking countries', ...fromFact(OFFICIAL.en) },
  { id: 'landlocked',  question: 'Which country is NOT landlocked?',                             themeLabel: 'landlocked countries (no sea access)', ...fromFact(FACTS.landlocked) },
  { id: 'island',      question: 'Which country is NOT an island nation?',                       themeLabel: 'island nations',                        ...fromFact(FACTS.island) },
  { id: 'monarchy',    question: 'Which country is NOT a monarchy?',                             themeLabel: 'monarchies',                            ...fromFact(FACTS.monarchy) },
  { id: 'eu',          question: 'Which country is NOT in the EU?',                              themeLabel: 'EU member states',                      ...fromFact(FACTS.eu) },
  { id: 'mediterr',    question: 'Which country does NOT border the Mediterranean?',             themeLabel: 'Mediterranean countries',               ...fromFact(FACTS.mediterranean) },
  { id: 'g20',         question: 'Which country is NOT in the G20?',                             themeLabel: 'G20 nations',                           ...fromFact(FACTS.g20) },
  { id: 'nato',        question: 'Which country is NOT a NATO member?',                          themeLabel: 'NATO members',                          ...fromFact(FACTS.nato) },
  { id: 'red',         question: 'Which flag does NOT feature any red?',                          themeLabel: 'flags that feature red',                codes: RED_FLAG, unsure: RED_DETAIL },
  { id: 'crescent',    question: 'Which flag does NOT have a crescent or star symbol?',          themeLabel: 'crescent & star flags',                 codes: CRESCENT_STAR, unsure: STAR_DETAIL },
  // Countries in two continents (or counted in either) sit out of the region they could belong to.
  regionCat('Europe', 'Europe', 'European flags', [], ['TR', 'GE', 'AM', 'AZ', 'KZ']),
  regionCat('Africa', 'Africa', 'African flags'),
  // The Middle East is part of Asia, so its flags count as Asian here.
  regionCat('Asia', 'Asia', 'Asian flags', MIDDLE_EAST, ['TR', 'RU', 'EG', 'CY']),
  regionCat('Americas', 'the Americas', 'flags from the Americas'),
  regionCat('Oceania', 'Oceania', 'flags from Oceania', [], ['ID', 'TL']),
  regionCat('Middle East', 'the Middle East', 'Middle Eastern flags', [], ['EG', 'CY']),
]

// One round from one category, or null if it can't make a fair one. `usedOdd`
// holds this game's earlier answers so the same flag isn't the answer twice.
function buildRound(cat: Category, usedOdd: Set<string>): Round | null {
  const inPool  = FLAGS.filter(f => cat.codes.has(f.code) && !cat.unsure.has(f.code))
  const outPool = FLAGS.filter(f => !cat.codes.has(f.code) && !cat.unsure.has(f.code) && !usedOdd.has(f.code))
  if (inPool.length < 3 || outPool.length < 1) return null

  const three = [...inPool].sort(() => Math.random() - 0.5).slice(0, 3)
  // Make it HARD: choose an outlier that visually blends in with the in-group
  // (shared palette/symbols, no obvious tell), so you can't just spot the odd
  // flag — you have to actually know the fact.
  const odd = pickBlendingOutlier(three, outPool)
  usedOdd.add(odd.code)
  const all = [...three, odd].sort(() => Math.random() - 0.5)
  return { question: cat.question, themeLabel: cat.themeLabel, flags: all, oddIndex: all.indexOf(odd) }
}

function buildRounds(count: number): Round[] {
  const rounds: Round[] = []
  const usedOdd = new Set<string>()
  const shuffledCats = [...CATEGORIES].sort(() => Math.random() - 0.5)

  for (const cat of shuffledCats) {
    if (rounds.length >= count) break
    const r = buildRound(cat, usedOdd)
    if (r) rounds.push(r)
  }

  // Fallback: reuse any category that can actually produce a valid round. Guard
  // against degenerate pools so we never loop forever or push a malformed round.
  for (let tries = 0; rounds.length < count && tries < 50; tries++) {
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
    const r = buildRound(cat, usedOdd)
    if (r) rounds.push(r)
  }

  return rounds
}

const TOTAL_ROUNDS = 5

function OddOneOutScreenGame({ onBack , onReplay }: Props & { onReplay: () => void }) {
  const [rounds]     = useState(() => buildRounds(TOTAL_ROUNDS))
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [scores, setScores]     = useState<boolean[]>([])
  const [done, setDone]         = useState(false)

  const round    = rounds[idx]
  const answered = selected !== null
  const isRight  = answered && selected === round.oddIndex

  const handlePick = (i: number) => {
    if (answered) return
    setSelected(i)
    setScores(prev => [...prev, i === round.oddIndex])
  }

  const handleNext = () => {
    if (idx + 1 >= TOTAL_ROUNDS) { setDone(true); return }
    setIdx(i => i + 1)
    setSelected(null)
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  if (done) {
    const correct = scores.filter(Boolean).length
    const pct = Math.round((correct / TOTAL_ROUNDS) * 100)
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title="Odd One Out" subtitle="Results" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3" style={{ position: "relative", zIndex: 1 }}>
          <ResultCard>
            <ResultHeader icon={pct === 100 ? "trophy" : pct >= 60 ? "check" : "codex"} accent={pct === 100 ? T.gold : ACC}
              title={`${correct} of ${TOTAL_ROUNDS} impostors found`}
              score={pct === 100 ? "Perfect round!" : pct >= 60 ? "Well played" : "Keep practising"} />
            <ResultDots results={scores} />
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={ACC}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: T.bg, color: T.text }}>

      <ScreenHeader title="Odd One Out" subtitle={`${scores.filter(Boolean).length} correct so far`} onBack={onBack}
        right={<HeaderStat accent={ACC}>{idx + 1} / {TOTAL_ROUNDS}</HeaderStat>} />

      <div className="mx-5 h-1.5 rounded-full overflow-hidden" style={{ background: T.line, zIndex: 1 }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(idx / TOTAL_ROUNDS) * 100}%`, background: ACC }} />
      </div>

      <div className="flex-1 flex flex-col items-center px-5 pt-5" style={{ zIndex: 1 }}>

        {/* Question */}
        <div className="w-full max-w-sm mb-4 px-4 py-3 rounded-xl"
          style={{ background: T.surface, border: `1px solid ${tint(ACC, 0.3)}` }}>
          <p className="text-sm font-semibold text-center" style={{ color: T.text, fontFamily: FONT.display }}>
            {round.question}
          </p>
        </div>

        {/* 2×2 grid */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {round.flags.map((flag, i) => {
            const isOdd    = i === round.oddIndex
            const isChosen = selected === i
            let border  = `1.5px solid ${T.line}`
            let overlay: string | null = null
            if (answered) {
              if (isOdd)         { border = `2px solid ${T.green}`; overlay = tint(T.green, 0.1) }
              else if (isChosen) { border = `2px solid ${T.danger}`; overlay = tint(T.danger, 0.1) }
            } else if (isChosen) {
              border = `2px solid ${ACC}`
            }
            return (
              <button key={flag.code} onClick={() => handlePick(i)}
                disabled={answered}
                aria-label={answered ? `${choiceLabel(i, round.flags.length)}: ${flag.name}` : choiceLabel(i, round.flags.length)}
                className="relative rounded-xl overflow-hidden transition-all active:scale-95"
                style={{ border, background: T.surface, aspectRatio: "3/2" }}>
                <img src={flag.flagUrl} alt="" className="w-full h-full object-cover"
                  onError={e => {
                    const el = e.target as HTMLImageElement
                    if (!el.dataset.fb) { el.dataset.fb = "1"; el.src = `https://cdn.jsdelivr.net/gh/lipis/flag-icons@main/flags/4x3/${flag.code.toLowerCase()}.svg` }
                  }} />
                {overlay && (
                  <div style={{ position: 'absolute', inset: 0, background: overlay,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: isOdd ? T.green : T.danger, textShadow: `0 1px 4px ${tint(T.text, 0.4)}` }}>{isOdd ? '✓' : '✗'}</span>
                  </div>
                )}
                {answered && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: tint(T.text, 0.65), padding: '3px 5px', textAlign: 'center',
                  }}>
                    <span style={{ fontSize: 10, color: T.bg, fontWeight: 600, lineHeight: 1.15, display: 'block' }}>{flag.name}</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {answered && (
          <div className="w-full max-w-sm mt-3 px-4 py-3 rounded-xl"
            style={{ background: T.surface, border: `1px solid ${tint(isRight ? T.green : T.danger, 0.4)}` }}>
            <p className="text-sm font-semibold" style={{ color: isRight ? T.green : T.danger }}>
              {isRight ? "✓ Correct!" : `✗ Wrong — ${round.flags[round.oddIndex].name} was the odd one out`}
            </p>
            <p className="text-xs mt-1" style={{ color: T.muted }}>
              The other three are all {round.themeLabel}.
            </p>
          </div>
        )}

        {answered && (
          <PrimaryButton onClick={handleNext} accent={ACC} style={{ maxWidth: 384, marginTop: 12 }}>
            {idx + 1 >= TOTAL_ROUNDS ? "See results →" : "Next →"}
          </PrimaryButton>
        )}
      </div>
    </div>
  )
}

export default function OddOneOutScreen({ onBack }: Props) {
  const [replayKey, setReplayKey] = useState(0)
  return <OddOneOutScreenGame key={replayKey} onBack={onBack} onReplay={() => setReplayKey(k => k + 1)} />
}
