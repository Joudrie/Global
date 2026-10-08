import { useState } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { FLAG_ATTRIBS } from "../data/flagAttribs"
import type { FlagAttribs } from "../data/flagAttribs"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, ResultDots, PrimaryButton, SecondaryButton } from "./gameUi"

const FEATURES = ['stripes', 'cross', 'star', 'crescent', 'emblem'] as const

const ACC = ACCENT.play

// How visually similar `oddCode` is to the in-group of three flags. Higher =
// blends in better. We reward shared colours and matching the group's majority
// feature profile, and heavily penalise a distinctive "tell" the group lacks
// (e.g. a Nordic cross among Middle-Eastern flags), so the answer can't be
// spotted by look alone.
function visualScore(oddCode: string, three: FlagRecord[]): number {
  const oa = FLAG_ATTRIBS[oddCode]
  if (!oa) return -Infinity
  const inAttrs = three.map(t => FLAG_ATTRIBS[t.code]).filter(Boolean) as FlagAttribs[]
  if (inAttrs.length === 0) return 0
  let s = 0
  const colorFreq: Record<string, number> = {}
  inAttrs.forEach(a => a.colors.forEach(c => { colorFreq[c] = (colorFreq[c] || 0) + 1 }))
  oa.colors.forEach(c => { s += (colorFreq[c] || 0) * 1.5 })
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
}

const ENGLISH_CODES = new Set(['GB','US','AU','NZ','CA','IE','ZA','NG','KE','GH','UG','ZM','ZW','JM','TT','BB','SG','IN','PK','MT','CY','PH','CM','ET'])
const LANDLOCKED    = new Set(['AT','CH','CZ','HU','SK','LI','LU','BY','MD','AM','KZ','KG','TJ','TM','UZ','MN','NP','BT','AF','ML','NE','BF','MR','CF','SS','BI','RW','UG','MW','ZM','ZW','BW','LS','SZ','BO','PY'])
const ISLANDS       = new Set(['GB','IE','IS','MT','CY','JP','PH','ID','LK','MV','SG','TL','CU','JM','HT','DO','TT','BB','LC','AG','DM','GD','KN','VC','BS','NZ','FJ','PG','SB','VU','WS','TO','KI','TV','NR','PW','FM','MH','MG','MU','SC','CV','ST','KM'])
const MONARCHIES    = new Set(['GB','SE','NO','DK','NL','BE','ES','LU','MC','LI','JP','TH','MY','BN','JO','SA','AE','KW','QA','BH','OM','MA','LS','SZ','AU','NZ','CA','JM','BB','TT'])
const EU_MEMBERS    = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'])
const MEDITERR      = new Set(['ES','FR','IT','HR','ME','AL','GR','TR','SY','LB','IL','EG','LY','TN','DZ','MA','MT','CY'])
const G20           = new Set(['AR','AU','BR','CA','CN','FR','DE','IN','ID','IT','JP','KR','MX','RU','SA','ZA','TR','GB','US'])
const NATO          = new Set(['AL','BE','BG','CA','HR','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IT','LV','LT','LU','ME','NL','MK','NO','PL','PT','RO','SK','SI','ES','TR','GB','US'])
// These two categories ask about a VISUAL property, so they must be derived from
// the same FLAG_ATTRIBS that the answer reveal trusts — not a hand-curated list.
// Otherwise the complement (outPool) contains flags that still have the property,
// and pickBlendingOutlier (which rewards shared palette/symbols) can hand back an
// "odd one" that is itself red / has a star — an unsolvable round.
const RED_FLAG      = new Set(FLAGS.filter(f => FLAG_ATTRIBS[f.code]?.colors.includes('red')).map(f => f.code))
const CRESCENT_STAR = new Set(FLAGS.filter(f => { const a = FLAG_ATTRIBS[f.code]; return a?.crescent || a?.star }).map(f => f.code))

function regionCat(region: FlagRecord['region'], label?: string): Category {
  const codes = new Set(FLAGS.filter(f => f.region === region).map(f => f.code))
  return {
    id: `region-${region}`,
    question: `Which flag is NOT from ${region}?`,
    themeLabel: `${label ?? region} flags`,
    codes,
  }
}

const CATEGORIES: Category[] = [
  { id: 'english',     question: 'Which country does NOT have English as an official language?', themeLabel: 'official English-speaking countries', codes: ENGLISH_CODES },
  { id: 'landlocked',  question: 'Which country is NOT landlocked?',                             themeLabel: 'landlocked countries (no sea access)', codes: LANDLOCKED    },
  { id: 'island',      question: 'Which country is NOT an island nation?',                       themeLabel: 'island nations',                        codes: ISLANDS       },
  { id: 'monarchy',    question: 'Which country is NOT a monarchy?',                             themeLabel: 'monarchies',                            codes: MONARCHIES    },
  { id: 'eu',          question: 'Which country is NOT in the EU?',                              themeLabel: 'EU member states',                      codes: EU_MEMBERS    },
  { id: 'mediterr',    question: 'Which country does NOT border the Mediterranean?',             themeLabel: 'Mediterranean countries',               codes: MEDITERR      },
  { id: 'g20',         question: 'Which country is NOT in the G20?',                             themeLabel: 'G20 nations',                           codes: G20           },
  { id: 'nato',        question: 'Which country is NOT a NATO member?',                          themeLabel: 'NATO members',                          codes: NATO          },
  { id: 'red',         question: 'Which flag does NOT feature any red?',                          themeLabel: 'flags that feature red',                codes: RED_FLAG      },
  { id: 'crescent',    question: 'Which flag does NOT have a crescent or star symbol?',          themeLabel: 'crescent & star flags',                 codes: CRESCENT_STAR },
  regionCat('Europe'),
  regionCat('Africa'),
  regionCat('Asia'),
  regionCat('Americas'),
  regionCat('Oceania'),
  regionCat('Middle East', 'Middle Eastern'),
]

function buildRounds(count: number): Round[] {
  const rounds: Round[] = []
  const shuffledCats = [...CATEGORIES].sort(() => Math.random() - 0.5)

  for (const cat of shuffledCats) {
    if (rounds.length >= count) break

    const inPool  = FLAGS.filter(f => cat.codes.has(f.code))
    const outPool = FLAGS.filter(f => !cat.codes.has(f.code))
    if (inPool.length < 3 || outPool.length < 1) continue

    const three = [...inPool].sort(() => Math.random() - 0.5).slice(0, 3)
    // Make it HARD: choose an outlier that visually blends in with the in-group
    // (shared palette/symbols, no obvious tell), so you can't just spot the odd
    // flag — you have to actually know the fact.
    const odd   = pickBlendingOutlier(three, outPool)
    const all   = [...three, odd].sort(() => Math.random() - 0.5)

    rounds.push({
      question: cat.question,
      themeLabel: cat.themeLabel,
      flags: all,
      oddIndex: all.indexOf(odd),
    })
  }

  // Fallback: reuse any category that can actually produce a valid round. Guard
  // against degenerate pools so we never loop forever or push a malformed round.
  while (rounds.length < count) {
    const valid = CATEGORIES.filter(c => {
      const inN = FLAGS.filter(f => c.codes.has(f.code)).length
      return inN >= 3 && inN < FLAGS.length
    })
    if (valid.length === 0) break
    const cat     = valid[Math.floor(Math.random() * valid.length)]
    const inPool  = FLAGS.filter(f => cat.codes.has(f.code))
    const outPool = FLAGS.filter(f => !cat.codes.has(f.code))
    const three   = [...inPool].sort(() => Math.random() - 0.5).slice(0, 3)
    const odd     = pickBlendingOutlier(three, outPool)
    const all     = [...three, odd].sort(() => Math.random() - 0.5)
    rounds.push({ question: cat.question, themeLabel: cat.themeLabel, flags: all, oddIndex: all.indexOf(odd) })
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
                className="relative rounded-xl overflow-hidden transition-all active:scale-95"
                style={{ border, background: T.surface, aspectRatio: "3/2" }}>
                <img src={flag.flagUrl} alt={flag.name} className="w-full h-full object-cover"
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
