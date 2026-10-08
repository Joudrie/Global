import { useState } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { CAPITALS } from "../data/capitals"
import { neighborsOf } from "../data/borders"
import { STATS } from "../data/countryStats"
import { T, ACCENT, tint } from "../ui/tokens"
import FlagImage from "./FlagImage"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"

interface Props { onBack: () => void }

const ROUNDS = 6
const shuffle = <X,>(a: X[]): X[] => [...a].sort(() => Math.random() - 0.5)
const rand = <X,>(a: X[]): X => a[Math.floor(Math.random() * a.length)]
const NAME = (code: string) => FLAGS.find(f => f.code === code)?.name ?? code

const ALL_REGIONS = ["Europe", "Africa", "Asia", "Americas", "Oceania", "Middle East"]
const inRegion = (r: string) => r === "Middle East" || r === "Americas" ? `the ${r}` : r
// Countries in two continents: "It lies in Asia" is true of Turkey, so their
// region is never the lie.
const TRANSCONTINENTAL = new Set(["RU", "TR", "CY", "GE", "AM", "AZ", "KZ", "EG", "ID", "TL"])
// Countries with land borders overseas (France and Brazil via French Guiana,
// Spain and Morocco via Ceuta): our border data leaves those out, so a border
// count could be "wrong" and still true.
const OVERSEAS_BORDERS = new Set(["FR", "BR", "SR", "ES", "MA", "NL", "GB", "CY"])
const CAP = new Map(CAPITALS.map(c => [c.code, c]))

// Countries we can build statements for (need a capital). We avoid colour claims
// entirely — you can just look at the flag — and lean on capital, region and
// (plausible) border facts that actually require knowledge.
const POOL = FLAGS.filter(f => CAP.has(f.code))

interface Stmt { text: string; type: string }

// A comparison country with stats and a CLEAR gap on `metric` — preferring a
// neighbour (most relatable), then a near-miss, then anyone in the region — so
// size/population statements are never a near-tie.
function comparatorFor(f: FlagRecord, metric: "area" | "pop"): string | null {
  if (!STATS[f.code]) return null
  const clear = (c: string) => {
    if (!STATS[c] || c === f.code) return false
    const a = STATS[f.code][metric], b = STATS[c][metric]
    const hi = Math.max(a, b), lo = Math.min(a, b)
    return lo > 0 && hi / lo >= 1.25
  }
  const direct = neighborsOf(f.code).filter(clear)
  if (direct.length) return rand(direct)
  const near = nearButNotNeighbour(f.code).filter(clear)
  if (near.length) return rand(near)
  const region = FLAGS.filter(x => x.region === f.region && clear(x.code)).map(x => x.code)
  return region.length ? rand(region) : null
}

function trueStmt(type: string, f: FlagRecord): Stmt {
  const cap = CAP.get(f.code)!
  if (type === "capital") return { text: `Its capital is ${cap.capital.replace(/\.$/, "")}.`, type }
  if (type === "region") return { text: `It lies in ${inRegion(f.region)}.`, type }
  if (type === "borderCount") {
    const n = neighborsOf(f.code).length
    return { text: n === 0 ? `It has no land borders.` : `It has ${n} land neighbour${n === 1 ? "" : "s"}.`, type }
  }
  if (type === "areaCmp") {
    const c = comparatorFor(f, "area")!
    return { text: `It is ${STATS[f.code].area >= STATS[c].area ? "larger" : "smaller"} in area than ${NAME(c)}.`, type }
  }
  if (type === "popCmp") {
    const c = comparatorFor(f, "pop")!
    return { text: `It has ${STATS[f.code].pop >= STATS[c].pop ? "more" : "fewer"} people than ${NAME(c)}.`, type }
  }
  // border (true)
  const ns = neighborsOf(f.code)
  if (!ns.length) return { text: `It has no land borders.`, type }
  return { text: `It shares a land border with ${NAME(rand(ns))}.`, type }
}

// Regions that are easy to mix up with each other — used to make a region lie
// tempting rather than absurd (a Middle East country "in Africa", not "in
// Oceania"). Never "Asia" for the Middle East: it is in Asia.
const REGION_NEAR: Record<string, string[]> = {
  "Middle East": ["Africa", "Europe"],
  "Europe": ["Asia", "Middle East", "Africa"],
  "Asia": ["Middle East", "Europe", "Oceania"],
  "Africa": ["Middle East", "Europe", "Asia"],
  "Americas": ["Oceania", "Europe"],
  "Oceania": ["Asia", "Americas"],
}

// Countries adjacent to our neighbours but NOT to us — the "near-miss" that a
// knowledgeable player actually confuses (Denmark doesn't border Finland, but
// its neighbour Sweden does).
function nearButNotNeighbour(code: string): string[] {
  const direct = new Set(neighborsOf(code))
  const near = new Set<string>()
  for (const n of direct) for (const nn of neighborsOf(n)) if (nn !== code && !direct.has(nn)) near.add(nn)
  return [...near]
}

function falseStmt(type: string, f: FlagRecord): Stmt {
  const cap = CAP.get(f.code)!
  if (type === "capital") {
    // Tempting: the capital of a *nearby* country — a neighbour first, then a
    // neighbour-of-a-neighbour — the kind of mix-up someone who knows the region
    // might make, not a random far-flung capital.
    const direct = neighborsOf(f.code).filter(c => CAP.has(c))
    const near = nearButNotNeighbour(f.code).filter(c => CAP.has(c))
    const sameRegion = FLAGS.filter(x => x.region === f.region && CAP.has(x.code) && x.code !== f.code).map(x => x.code)
    const pool = (direct.length ? direct : near.length ? near : sameRegion).filter(c => CAP.get(c)!.capital !== cap.capital)
    const otherCap = pool.length ? CAP.get(rand(pool))!.capital : rand(CAPITALS.filter(c => c.capital !== cap.capital)).capital
    return { text: `Its capital is ${otherCap.replace(/\.$/, "")}.`, type }
  }
  if (type === "region") {
    const near = (REGION_NEAR[f.region] ?? ALL_REGIONS).filter(r => r !== f.region)
    return { text: `It lies in ${inRegion(rand(near.length ? near : ALL_REGIONS.filter(r => r !== f.region)))}.`, type }
  }
  if (type === "borderCount") {
    // Off by one or two — close enough that you have to actually know the count.
    const n = neighborsOf(f.code).length
    // Never "no land borders" for a country that has some: another statement
    // naming a neighbour would give the lie away.
    const opts = [n - 2, n - 1, n + 1, n + 2].filter(x => x >= (n > 0 ? 1 : 0) && x !== n)
    const fake = opts.length ? rand(opts) : n + 2
    return { text: fake === 0 ? `It has no land borders.` : `It has ${fake} land neighbour${fake === 1 ? "" : "s"}.`, type }
  }
  if (type === "areaCmp") {
    const c = comparatorFor(f, "area")!  // wrong relation
    return { text: `It is ${STATS[f.code].area >= STATS[c].area ? "smaller" : "larger"} in area than ${NAME(c)}.`, type }
  }
  if (type === "popCmp") {
    const c = comparatorFor(f, "pop")!  // wrong relation
    return { text: `It has ${STATS[f.code].pop >= STATS[c].pop ? "fewer" : "more"} people than ${NAME(c)}.`, type }
  }
  // border (false): prefer a near-miss (adjacent to a neighbour but not to us),
  // then any same-region non-neighbour, so the lie is genuinely confusable.
  const direct = new Set([f.code, ...neighborsOf(f.code)])
  const near = nearButNotNeighbour(f.code)
  const sameRegion = FLAGS.filter(x => x.region === f.region && !direct.has(x.code)).map(x => x.code)
  const pool = near.length ? near : sameRegion.length ? sameRegion : FLAGS.filter(x => !direct.has(x.code)).map(x => x.code)
  return { text: `It shares a land border with ${NAME(rand(pool))}.`, type }
}

interface Round { flag: FlagRecord; stmts: Stmt[]; falseIdx: number }

// The fact types we can build for this country, given the data we have. region
// + borderCount always work; capital needs a capital; border needs a neighbour;
// the size/population comparisons need a stat comparator with a clear gap.
function availableTypes(f: FlagRecord): string[] {
  const t = ["region"]
  if (!OVERSEAS_BORDERS.has(f.code)) t.push("borderCount")
  if (CAP.has(f.code)) t.push("capital")
  if (neighborsOf(f.code).length) t.push("border")
  if (comparatorFor(f, "area")) t.push("areaCmp")
  if (comparatorFor(f, "pop")) t.push("popCmp")
  return t
}

function makeRound(f: FlagRecord): Round {
  // Three DIFFERENT fact types per round, drawn from whatever's available — so
  // it's not always capital / region / border.
  const chosen = shuffle(availableTypes(f)).slice(0, 3)
  const canLie = chosen.filter(t => !(t === "region" && TRANSCONTINENTAL.has(f.code)))
  const falseType = rand(canLie)
  const built = chosen.map(t => ({ stmt: t === falseType ? falseStmt(t, f) : trueStmt(t, f), isFalse: t === falseType }))
  const ordered = shuffle(built)
  return { flag: f, stmts: ordered.map(b => b.stmt), falseIdx: ordered.findIndex(b => b.isFalse) }
}

function buildRounds(): Round[] {
  return shuffle(POOL).slice(0, ROUNDS).map(makeRound)
}

function TwoTruthsGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [rounds] = useState(buildRounds)
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [scores, setScores] = useState<boolean[]>([])
  const [done, setDone] = useState(false)

  const round = rounds[idx]
  const answered = picked !== null

  const choose = (i: number) => {
    if (answered) return
    setPicked(i)
    setScores(s => [...s, i === round.falseIdx])
  }
  const next = () => {
    if (idx + 1 >= rounds.length) { setDone(true); return }
    setIdx(i => i + 1); setPicked(null)
  }

  if (done) {
    const correct = scores.filter(Boolean).length
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
        <ScreenHeader title="Two Truths" subtitle="Round complete" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ResultCard>
            <ResultHeader icon={correct >= ROUNDS * 0.7 ? "twotruths" : "codex"} accent={ACCENT.codex}
              title={`${correct} of ${ROUNDS} lies spotted`}
              score={correct >= ROUNDS * 0.7 ? "A sharp eye for a fib." : "Every round teaches a new fact."} />
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={ACCENT.codex}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <ScreenHeader title="Two Truths" subtitle="Spot the lie about a country" onBack={onBack}
        right={<HeaderStat accent={ACCENT.codex}>{idx + 1} / {ROUNDS}</HeaderStat>} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px 18px 22px", gap: 16 }}>
        <div style={{ width: 220, height: 146, margin: "0 auto", borderRadius: 14, overflow: "hidden", border: `1px solid ${T.lineHi}`, boxShadow: "0 12px 28px -14px rgba(31,58,60,0.45)" }}>
          <FlagImage code={round.flag.code} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
        <p className="geo-display" style={{ textAlign: "center", color: T.text, fontWeight: 700, fontSize: 18 }}>{round.flag.name}</p>
        <div style={{ textAlign: "center", fontSize: 12, color: T.muted, marginTop: -8 }}>One of these is a lie. Tap it.</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {round.stmts.map((s, i) => {
            const isLie = i === round.falseIdx
            let border = `2px solid ${T.line}`, bg = T.surface
            if (answered) {
              if (isLie) { border = `2px solid ${T.warm}`; bg = tint(T.warm, 0.1) }
              else if (i === picked) { border = `2px solid ${T.danger}` }
            }
            return (
              <button key={i} onClick={() => choose(i)} disabled={answered} className="geo-tap"
                style={{ textAlign: "left", padding: "13px 15px", borderRadius: 12, background: bg, border, color: T.text, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 10, transition: "background 0.2s ease, border-color 0.2s ease" }}>
                <span style={{ flex: 1 }}>{s.text}</span>
                {answered && isLie && <span style={{ color: T.warm, fontWeight: 700, fontSize: 12 }}>LIE</span>}
                {answered && !isLie && <span style={{ color: i === picked ? T.danger : ACCENT.codex, fontWeight: 700, fontSize: 12 }}>TRUE</span>}
              </button>
            )
          })}
        </div>

        {answered && (
          <p role="status" style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: picked === round.falseIdx ? ACCENT.codex : T.danger }}>
            {picked === round.falseIdx ? "✓ You caught the lie" : "✗ That one's true. The lie is marked."}
          </p>
        )}
        {answered && (
          <PrimaryButton onClick={next} accent={ACCENT.codex} style={{ marginTop: "auto" }}>
            {idx + 1 >= ROUNDS ? "See result →" : "Next →"}
          </PrimaryButton>
        )}
      </div>
    </div>
  )
}

export default function TwoTruthsScreen({ onBack }: Props) {
  const [k, setK] = useState(0)
  return <TwoTruthsGame key={k} onBack={onBack} onReplay={() => setK(n => n + 1)} />
}
