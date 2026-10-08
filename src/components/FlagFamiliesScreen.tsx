import { useState } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { FLAG_ATTRIBS } from "../data/flagAttribs"
import type { FlagAttribs } from "../data/flagAttribs"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, ResultDots, PrimaryButton, SecondaryButton } from "./gameUi"

interface Props { onBack: () => void }

// A family is a sorting rule. Its codes must list EVERY flag that fits the
// rule; flags a player could fairly argue fit go in `maybe`. In a round, a
// flag is only shown for one family if it is neither a member nor a maybe of
// the other, so each round has exactly one right sort.
//
// `kin` groups families about the same kind of feature (crosses, stars,
// circles, emblems). Against a family of another kin, any flag with that
// feature at all (a cross, a star or crescent, a disc or sun, an emblem or
// bird) is held back too: a Greek cross among "Blue & White" flags facing the
// Nordic crosses could be sorted either way. Between kin the round is about
// telling the styles apart, so only the other family's codes and maybes count.
interface Family {
  id: string
  label: string
  codes: string[]
  maybe?: string[]
  kin?: 'cross' | 'star' | 'disc' | 'emblem'
}

const FAMILY_DEFS: Family[] = [
  // ── Structure / layout ───────────────────────────────────────────────────
  { id: 'nordic',     label: 'Nordic Cross',        kin: 'cross', codes: ['DK','NO','SE','FI','IS'] },
  { id: 'cross-mid',  label: 'Centered Cross',      kin: 'cross', codes: ['CH','GE','DO','DM'],
    maybe: ['GB','JM','BI','TO','GR','MT','SK'] },
  { id: 'uk-ensign',  label: 'Union Jack Canton',   kin: 'cross', codes: ['AU','NZ','FJ','TV'], maybe: ['GB'] },
  { id: 'v-tricolor', label: 'Vertical Tricolor',   codes: ['FR','IT','IE','BE','RO','MD','AD','TD','ML','GN','CI','SN','CM','MX','VC','AF'],
    maybe: ['NG','PE','CA','GT','BB','MN'] },
  { id: 'h-tricolor', label: 'Horizontal Tricolor', codes: ['DE','NL','RU','HU','BG','LT','EE','AM','GA','SL','LU','YE','IQ','EG','SY','IN','NE','IR','TJ',
    'BO','CO','EC','VE','MM','ET','GH','LS','MW','AZ','SI','SK','RS','HR','PY'],
    maybe: ['AT','LV','LB','ES','KH','LA','BW','HN','SV','NI','AR','GM','KE','UZ','SD','KW','JO','PS','AE','SS','GQ','OM','CR','TH','MU','CF','KM'] },
  { id: 'bicolor',    label: 'Two-Band Bicolor',    codes: ['ID','MC','PL','UA','SM','LI','HT','SG'],
    maybe: ['BY','CL','CZ','PH','DJ','MG','BJ','GW','VU','MT','VA','PT','DZ','BH','QA'] },
  { id: 'hoist-tri',  label: 'Hoist Triangle',      codes: ['CZ','PH','ER','DJ','BS','GY','MZ','ZA','SS','JO','PS','SD','VU','CU','GQ','KM','ST','TL','ZW'],
    maybe: ['KW','BA','LC','AG','GD'] },
  { id: 'diagonal',   label: 'Diagonal Band',       codes: ['CD','CG','TZ','NA','TT','BN','SB','KN'],
    maybe: ['SC','MH','PG','BT','JM','BI'] },
  { id: 'white-mid',  label: 'White Center Band',   codes: ['AT','LV','LB','IR','TJ','HU','NE','IN','SL','NL','LU','YE','IQ','SY','EG','SD','KW','JO','PS','AE',
    'HR','PY','AR','SV','HN','NI','LS','GQ','UZ','NG','PE','CA','MX','FR','IT','IE','CI','GT'],
    maybe: ['BW','GM','KE','SS','KP','TH','CR','IL','SR','MZ','TT','ZA','DO'] },
  // ── Colour palette ───────────────────────────────────────────────────────
  { id: 'rwb',        label: 'Red, White & Blue',   codes: ['US','GB','FR','NL','RU','NO','IS','CZ','LU','TH','CL','CU','CR','PA','SK','KH','LA','NP','KP','TW','LR','AU','NZ','WS'],
    maybe: ['BZ','DO','FJ','SI','RS','HR','PY','AG','AZ','MY','PH','KR','UZ','CV','CF','KM','DJ','GQ','GM','NA','SC','ZA','SS','KI','TV','SZ'] },
  { id: 'red-white',  label: 'Red & White Only',    codes: ['AT','PL','MC','ID','BH','QA','CA','PE','MT','SG','DK','CH','GE','TO','TR','TN','JP','LV'],
    maybe: ['LB'] },
  { id: 'blue-white', label: 'Blue & White Only',   codes: ['GR','FI','IL','SO','HN','FM'],
    maybe: ['AR','UY','GT','SV','NI','SM'] },
  { id: 'pan-african',label: 'Pan-African Colours', codes: ['ET','GH','ML','GN','BJ','BF','CG','CM','GW','TG','ZW','SN','ST','KE','MW','ZM','MR'],
    maybe: ['TZ','UG','AO','MZ','SS','ER','CF','KM','MU','NA','SC','ZA','GQ','LY','SD','LT','BO','MM','GD','SR','GY','DM','KN','VU','LK','JM','AF','PT','TJ',
      'JO','KW','PS','SY','AE'] },
  { id: 'pan-arab',   label: 'Pan-Arab Colours',    codes: ['EG','IQ','SY','YE','JO','KW','AE','PS','SD','LY'],
    maybe: ['OM','SA','AF','KE','MW','SS','DM','GY','KN','GH','GW','MZ','ST','ZA','ZM','ZW','VU'] },
  { id: 'green-dom',  label: 'Green-Dominant',      codes: ['SA','PK','NG','BD','TM','MR','ZM','BR','DM','GY'],
    maybe: ['DZ','ST','MV','SB','JM','PT','ER'] },
  { id: 'yellow-dom', label: 'Yellow-Dominant',     codes: ['BN','CO','EC','BT'],
    maybe: ['VE','UA','VA','ES','VC','BB','AD','LK','MK','BR'] },
  { id: 'has-black',  label: 'Contains Black',      codes: ['AL','BE','EE','DE','AG','BB','BS','DM','GY','JM','KN','LC','TT','IQ','JO','KW','PS','SY','AE','YE','AF','BN',
    'KR','TL','AO','BW','EG','GH','GW','KE','LS','LY','MW','MZ','ST','SZ','ZA','SS','SD','TZ','UG','ZM','ZW','PG','VU'],
    // a coat of arms or emblem drawn with black detail
    maybe: ['HR','LI','MT','PT','SM','RS','ES','VA','BZ','BO','DO','EC','SV','GT','HT','MX','PY','UY','BT','KH','KP','LK','GQ','FJ'] },
  // ── Emblems ──────────────────────────────────────────────────────────────
  { id: 'crescent',   label: 'Crescent & Star',     kin: 'star', codes: ['TR','PK','MY','TN','DZ','AZ','TM','MR','LY','KM','SG','UZ'],
    maybe: ['MV','BN','NP','IR','MN'] },
  { id: 'one-star',   label: 'Single Star',         kin: 'star', codes: ['VN','MA','SO','GH','SN','BF','CM','LR','TG','SS','CL','CU','DJ','MZ','AO','GW','CD',
    'TL','ET','MM','KP','ZW','IL','JO','NR','MH','SR','CF'] },
  { id: 'south-cross',label: 'Southern Cross',      kin: 'star', codes: ['AU','NZ','PG','WS'], maybe: ['BR','SB'] },
  { id: 'disc',       label: 'Disc / Circle',       kin: 'disc', codes: ['JP','BD','LA','PW','NE','KR'],
    maybe: ['TN','ET','UG','BZ','KP','GD','DM','BR','IN','CV'] },
  { id: 'sun',        label: 'Sun Emblem',          kin: 'disc', codes: ['AR','UY','MK','TW','PH','KI','AG','RW','NP','KZ','KG','MW','NA'],
    maybe: ['NE','JP','BD','EC','BO','MN','SV','NI','MH'] },
  { id: 'arms',       label: 'Coat of Arms',        kin: 'emblem', codes: ['ES','PT','ME','MX','EC','BO','HR','AD','MD','GT','FJ','SZ','BZ','RS','SK','SI','SM','VA',
    'DO','SV','HT','NI','PY','OM','AF','BN','EG','GQ','KE'],
    maybe: ['AL','LK','IR','TJ','LI','MN'] },
  { id: 'eagle2',     label: 'Double-Headed Eagle', kin: 'emblem', codes: ['AL','ME','RS'] },
  { id: 'eagle1',     label: 'Single Eagle',        kin: 'emblem', codes: ['EG','MX','ZM','KZ','MD'],
    maybe: ['ZW'] }, // the Zimbabwe Bird is thought to be a fish eagle
  { id: 'bird',       label: 'Bird (not eagle)',    kin: 'emblem', codes: ['UG','PG','KI','DM','GT'],
    maybe: ['ZW','EC','BO','FJ'] },
  { id: 'map',        label: 'Map of the Country',  kin: 'emblem', codes: ['CY','XK'] },
]

// Every flag that shows a kin's feature at all: the kin's own families plus
// the flags FLAG_ATTRIBS marks with a cross, a star or crescent, or an emblem.
const KIN_ATTR: Record<NonNullable<Family['kin']>, (a: FlagAttribs) => boolean> = {
  cross: a => a.cross,
  star: a => a.star || a.crescent,
  disc: () => false,
  emblem: a => a.emblem,
}
const KIN_FLAGS: Record<string, Set<string>> = {}
for (const [kin, has] of Object.entries(KIN_ATTR)) {
  const fams = FAMILY_DEFS.filter(d => d.kin === kin)
  KIN_FLAGS[kin] = new Set([
    ...fams.flatMap(d => [...d.codes, ...(d.maybe ?? [])]),
    ...FLAGS.filter(f => FLAG_ATTRIBS[f.code] && has(FLAG_ATTRIBS[f.code])).map(f => f.code),
  ])
}

// The flags that must not be shown for `other` when it is paired with `fam`.
function heldBack(fam: Family, other: Family): Set<string> {
  if (fam.kin && fam.kin !== other.kin) return KIN_FLAGS[fam.kin]
  return new Set([...fam.codes, ...(fam.maybe ?? [])])
}

interface Round {
  familyA: Family
  familyB: Family
  flags: { flag: FlagRecord; family: 'A' | 'B' }[]
}

// Build a single round from two families. A flag is only used for one family
// if the other family doesn't claim it (see heldBack), so no flag fits both
// and a round has one right sort. Returns null if either side can't field at
// least two such flags.
function tryPair(famA: Family, famB: Family): Round | null {
  const notA = heldBack(famA, famB), notB = heldBack(famB, famA)
  const flagsA = FLAGS.filter(f => famA.codes.includes(f.code) && !notB.has(f.code)).sort(() => Math.random() - 0.5).slice(0, 3)
  const flagsB = FLAGS.filter(f => famB.codes.includes(f.code) && !notA.has(f.code)).sort(() => Math.random() - 0.5).slice(0, 3)
  if (flagsA.length < 2 || flagsB.length < 2) return null
  const combined = [
    ...flagsA.map(flag => ({ flag, family: 'A' as const })),
    ...flagsB.map(flag => ({ flag, family: 'B' as const })),
  ].sort(() => Math.random() - 0.5)
  return { familyA: famA, familyB: famB, flags: combined }
}

function buildRounds(count: number): Round[] {
  const defs = [...FAMILY_DEFS].sort(() => Math.random() - 0.5)
  const used = new Set<string>()
  const rounds: Round[] = []
  // Greedily pair each unused family with the first partner that yields a valid
  // round — robust even when families overlap heavily.
  for (let i = 0; i < defs.length && rounds.length < count; i++) {
    if (used.has(defs[i].id)) continue
    for (let j = i + 1; j < defs.length; j++) {
      if (used.has(defs[j].id)) continue
      const r = tryPair(defs[i], defs[j])
      if (r) { rounds.push(r); used.add(defs[i].id); used.add(defs[j].id); break }
    }
  }
  return rounds
}

const TOTAL_ROUNDS = 5
const ACCENT_A = ACCENT.play
const ACCENT_B = T.green

const FLAG_W = 72
const FLAG_H = 48

function FlagFamiliesScreenGame({ onBack , onReplay }: Props & { onReplay: () => void }) {
  const [rounds]    = useState(() => buildRounds(TOTAL_ROUNDS))
  const [idx, setIdx]       = useState(0)
  // assignments: code → 'A' | 'B'
  const [assignments, setAssignments] = useState<Record<string, 'A' | 'B'>>({})
  const [selected, setSelected]       = useState<string | null>(null)
  const [dragged, setDragged]         = useState<string | null>(null)
  const [checked, setChecked]         = useState(false)
  const [revealSwap, setRevealSwap]   = useState(false)   // player's A actually = familyB
  const [hadWrong, setHadWrong]       = useState(false)   // any wrong attempt this round?
  const [tryAgain, setTryAgain]       = useState(false)   // show "try again" hint
  const [scores, setScores]           = useState<boolean[]>([])
  const [done, setDone]               = useState(false)

  const round = rounds[idx]

  // Tap a flag in the pool: select it; tap again to deselect
  const handleFlagTap = (code: string) => {
    if (checked) return
    setSelected(prev => prev === code ? null : code)
  }

  const assign = (code: string, row: 'A' | 'B') => {
    setAssignments(prev => ({ ...prev, [code]: row }))
    setSelected(null); setTryAgain(false)
  }

  // Tap a row (A or B) to assign the selected flag
  const handleRowTap = (row: 'A' | 'B') => {
    if (checked || !selected) return
    assign(selected, row)
  }

  // Tap a flag already in a row to move it back to pool
  const handleUnassign = (code: string) => {
    if (checked) return
    setAssignments(prev => {
      const next = { ...prev }
      delete next[code]
      return next
    })
    setSelected(null); setTryAgain(false)
  }

  const allAssigned = round?.flags.every(f => !!assignments[f.flag.code])

  const handleCheck = () => {
    if (!allAssigned) return
    // The groups are SECRET, so all that matters is the partition: every flag of
    // one family together, every flag of the other together. Either direction
    // (A=familyA or A=familyB) counts as correct.
    const direct  = round.flags.every(f => assignments[f.flag.code] === f.family)
    const swapped = round.flags.every(f => assignments[f.flag.code] !== f.family)
    if (!direct && !swapped) {
      // Don't lock — let them keep re-sorting. First wrong attempt costs the
      // "first try" point but they can still get it green.
      setHadWrong(true); setTryAgain(true); setSelected(null)
      return
    }
    setRevealSwap(swapped && !direct)   // their A maps to familyB
    setScores(prev => [...prev, !hadWrong])
    setChecked(true); setSelected(null); setTryAgain(false)
  }

  const handleNext = () => {
    if (idx + 1 >= rounds.length) { setDone(true); return }
    setIdx(i => i + 1)
    setAssignments({})
    setSelected(null); setDragged(null)
    setChecked(false); setRevealSwap(false); setHadWrong(false); setTryAgain(false)
  }

  // ── Result ──────────────────────────────────────────────────────────────────
  if (done || rounds.length === 0) {
    const correct = scores.filter(Boolean).length
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, minHeight: "100vh", color: T.text }}>
        <ScreenHeader title="Flag Families" subtitle="Results" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3">
          <ResultCard>
            <ResultHeader icon={correct === scores.length ? "trophy" : correct >= 2 ? "check" : "codex"} accent={correct === scores.length ? T.gold : correct >= 2 ? T.green : ACCENT_A}
              title={`${correct} of ${scores.length} sorted`} score="Rounds sorted into the right families" />
            <ResultDots results={scores} />
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={ACCENT_A}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  const flagsInA    = round.flags.filter(f => assignments[f.flag.code] === 'A')
  const flagsInB    = round.flags.filter(f => assignments[f.flag.code] === 'B')
  const unassigned  = round.flags.filter(f => !assignments[f.flag.code])
  const roundScore  = checked ? scores[scores.length - 1] : null

  const renderFlag = (
    { flag, family }: { flag: FlagRecord; family: 'A' | 'B' },
    inRow: 'A' | 'B' | null,
  ) => {
    const isSelected = selected === flag.code
    // Once checked we know it's a valid partition; honour the swap direction.
    const correctRow = inRow !== null ? (revealSwap ? inRow !== family : inRow === family) : null
    let border = `1.5px solid ${T.line}`
    if (checked && inRow !== null) {
      border = `2px solid ${correctRow ? T.green : T.danger}`
    } else if (isSelected) {
      border = `2px solid ${T.gold}`
    }

    return (
      <button key={flag.code}
        draggable={!checked}
        onDragStart={() => setDragged(flag.code)}
        onDragEnd={() => setDragged(null)}
        onClick={e => { e.stopPropagation(); if (inRow !== null) handleUnassign(flag.code); else handleFlagTap(flag.code) }}
        className="flex flex-col items-center rounded-xl overflow-hidden transition-all active:scale-95"
        style={{ border, background: isSelected ? tint(T.gold, 0.15) : T.surface, width: FLAG_W, cursor: checked ? 'default' : 'grab' }}>
        <img src={flag.flagUrl} alt={flag.name}
          style={{ width: FLAG_W, height: FLAG_H, objectFit: 'cover', display: 'block' }} />
        <div style={{ padding: '2px 4px', textAlign: 'center', width: '100%' }}>
          <span style={{ fontSize: 9, color: T.muted, fontWeight: 600, lineHeight: 1.05,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.1em' }}>
            {flag.name}
          </span>
          {checked && inRow !== null && (
            <span style={{ fontSize: 10, color: correctRow ? T.green : T.danger }}>{correctRow ? '✓' : '✗'}</span>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: T.bg, minHeight: "100vh", color: T.text }}>

      <ScreenHeader title="Flag Families" subtitle={`${scores.filter(Boolean).length} sorted so far`} onBack={onBack}
        right={<HeaderStat accent={ACCENT_A}>{idx + 1} / {rounds.length}</HeaderStat>} />

      <div className="mx-5 h-1.5 rounded-full overflow-hidden mb-4" style={{ background: T.line }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(idx / rounds.length) * 100}%`, background: ACCENT_A }} />
      </div>

      <div className="flex flex-col items-center px-5 gap-4">

        {/* Instruction — categories stay secret; sort by the visual pattern */}
        <p className="text-xs text-center" style={{ color: T.muted }}>
          {checked
            ? 'Revealed! Two hidden families:'
            : selected
              ? `"${round.flags.find(f => f.flag.code === selected)?.flag.name}" — tap a group to place it`
              : 'Two secret groups. Sort each flag by what it shares — tap or drag.'}
        </p>

        {/* Row A */}
        <div role="group" aria-label="Group A" tabIndex={selected && !checked ? 0 : -1}
          onClick={() => handleRowTap('A')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowTap('A') } }}
          onDragOver={e => { if (!checked) e.preventDefault() }}
          onDrop={() => { if (dragged && !checked) { assign(dragged, 'A'); setDragged(null) } }}
          className="w-full max-w-sm rounded-xl transition-all"
          style={{
            background: (selected || dragged) && !checked ? tint(ACCENT_A, 0.12) : T.surface,
            border: `2px solid ${(selected || dragged) && !checked ? ACCENT_A : tint(ACCENT_A, 0.3)}`,
            minHeight: 80, padding: '8px 10px',
            cursor: selected && !checked ? 'pointer' : 'default',
          }}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ width: 22, height: 22, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tint(ACCENT_A, 0.15), color: ACCENT_A, fontSize: 11, fontWeight: 800 }}>A</span>
            <span className="text-sm font-bold" style={{ color: checked ? T.text : ACCENT_A, fontFamily: FONT.display }}>{checked ? (revealSwap ? round.familyB : round.familyA).label : 'Group A'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {flagsInA.map(item => renderFlag(item, 'A'))}
            {flagsInA.length === 0 && (
              <span style={{ fontSize: 11, color: tint(ACCENT_A, 0.5), paddingLeft: 2 }}>drop here</span>
            )}
          </div>
        </div>

        {/* Row B */}
        <div role="group" aria-label="Group B" tabIndex={selected && !checked ? 0 : -1}
          onClick={() => handleRowTap('B')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowTap('B') } }}
          onDragOver={e => { if (!checked) e.preventDefault() }}
          onDrop={() => { if (dragged && !checked) { assign(dragged, 'B'); setDragged(null) } }}
          className="w-full max-w-sm rounded-xl transition-all"
          style={{
            background: (selected || dragged) && !checked ? tint(ACCENT_B, 0.12) : T.surface,
            border: `2px solid ${(selected || dragged) && !checked ? ACCENT_B : tint(ACCENT_B, 0.3)}`,
            minHeight: 80, padding: '8px 10px',
            cursor: selected && !checked ? 'pointer' : 'default',
          }}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ width: 22, height: 22, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tint(ACCENT_B, 0.15), color: ACCENT_B, fontSize: 11, fontWeight: 800 }}>B</span>
            <span className="text-sm font-bold" style={{ color: checked ? T.text : ACCENT_B, fontFamily: FONT.display }}>{checked ? (revealSwap ? round.familyA : round.familyB).label : 'Group B'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {flagsInB.map(item => renderFlag(item, 'B'))}
            {flagsInB.length === 0 && (
              <span style={{ fontSize: 11, color: tint(ACCENT_B, 0.5), paddingLeft: 2 }}>drop here</span>
            )}
          </div>
        </div>

        {/* Unassigned pool */}
        {unassigned.length > 0 && (
          <div className="w-full max-w-sm"
            onDragOver={e => { if (!checked) e.preventDefault() }}
            onDrop={() => { if (dragged && !checked) { handleUnassign(dragged); setDragged(null) } }}>
            <div className="text-xs mb-2 font-semibold" style={{ color: T.muted }}>Unsorted flags:</div>
            <div className="flex flex-wrap gap-3">
              {unassigned.map(item => renderFlag(item, null))}
            </div>
          </div>
        )}

        {/* "Try again" hint after a wrong check (round stays editable) */}
        {tryAgain && !checked && (
          <div className="w-full max-w-sm px-4 py-3 rounded-xl"
            style={{ background: T.surface, border: `1px solid ${tint(T.danger, 0.35)}` }}>
            <p className="text-sm font-semibold" style={{ color: T.danger }}>✗ Not quite — those aren't the groups. Try again.</p>
          </div>
        )}

        {/* Result feedback */}
        {checked && (
          <div className="w-full max-w-sm px-4 py-3 rounded-xl"
            style={{ background: T.surface, border: `1px solid ${tint(roundScore ? T.green : T.gold, 0.35)}` }}>
            {roundScore
              ? <p className="text-sm font-semibold" style={{ color: T.green }}>✓ Yes — these are the categories! Nailed it first try.</p>
              : <p className="text-sm font-semibold" style={{ color: T.gold }}>✓ Right groups — got there after a retry.</p>}
          </div>
        )}

        {!checked ? (
          <PrimaryButton onClick={handleCheck} disabled={!allAssigned} accent={ACCENT_A} style={{ maxWidth: 384 }}>
            Check →
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={handleNext} accent={ACCENT_A} style={{ maxWidth: 384 }}>
            {idx + 1 >= rounds.length ? "See results →" : "Next Round →"}
          </PrimaryButton>
        )}
      </div>
    </div>
  )
}

export default function FlagFamiliesScreen({ onBack }: Props) {
  const [replayKey, setReplayKey] = useState(0)
  return <FlagFamiliesScreenGame key={replayKey} onBack={onBack} onReplay={() => setReplayKey(k => k + 1)} />
}
