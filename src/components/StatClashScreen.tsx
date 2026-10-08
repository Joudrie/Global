import { useState } from "react"
import { FLAGS } from "../data/flags"
import { STATS, STAT_CODES } from "../data/countryStats"
import { neighborsOf } from "../data/borders"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import FlagImage from "./FlagImage"
import { LineIcon } from "./icons"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, ResultStats, PrimaryButton, SecondaryButton } from "./gameUi"

interface Props { onBack: () => void }

const BEST_KEY = "globalio_statclash_best"
const loadBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 } }
const saveBest = (n: number) => { try { localStorage.setItem(BEST_KEY, String(n)) } catch { /* ignore */ } }
const NAME = (c: string) => FLAGS.find(f => f.code === c)?.name ?? c
const rand = () => STAT_CODES[Math.floor(Math.random() * STAT_CODES.length)]

type Metric = "pop" | "area" | "density" | "borders"
interface Q { metric: Metric; a: string; b: string }
const METRICS: Metric[] = ["pop", "area", "density", "borders"]

// Raw value for a metric. Density (people per km²) is derived from pop & area;
// borders is the land-neighbour count — both give extra question categories
// from data we already have.
const val = (metric: Metric, code: string) => {
  const s = STATS[code]
  if (metric === "density") return (s.pop * 1000) / s.area
  if (metric === "borders") return neighborsOf(code).length
  return s[metric]
}

// Only ask when the two values differ comfortably, so there's always a clear
// right answer and rounding can't mislead. Borders are small integers, so they
// get a wider absolute gap instead of a ratio.
function nextQ(): Q {
  for (let i = 0; i < 120; i++) {
    const metric = METRICS[Math.floor(Math.random() * METRICS.length)]
    const a = rand(), b = rand()
    if (a === b) continue
    const va = val(metric, a), vb = val(metric, b)
    const hi = Math.max(va, vb), lo = Math.min(va, vb)
    if (metric === "borders") {
      if (lo >= 1 && hi - lo >= 2) return { metric, a, b }
    } else if (lo > 0 && hi / lo >= 1.25) {
      return { metric, a, b }
    }
  }
  return { metric: "pop", a: "CN", b: "TV" }
}

const fmt = (metric: Metric, code: string) => {
  if (metric === "density") return `${Math.round(val("density", code)).toLocaleString()} /km²`
  if (metric === "borders") { const n = neighborsOf(code).length; return `${n} land border${n === 1 ? "" : "s"}` }
  const v = STATS[code][metric]
  if (metric === "pop") return v >= 1 ? `${v % 1 ? v.toFixed(1) : v} M people` : `${Math.round(v * 1e6).toLocaleString()} people`
  const km2 = v * 1000
  return `${km2 >= 1000 ? Math.round(km2).toLocaleString() : km2.toLocaleString()} km²`
}

function StatClashGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [q, setQ] = useState<Q>(nextQ)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(loadBest)
  const [reveal, setReveal] = useState<null | { correct: boolean; pick: string }>(null)

  const prompt = q.metric === "pop" ? "more people?" : q.metric === "area" ? "the bigger area?" : q.metric === "borders" ? "more land neighbours?" : "more people per km²?"
  const winner = val(q.metric, q.a) >= val(q.metric, q.b) ? q.a : q.b

  const choose = (code: string) => {
    if (reveal) return
    const correct = code === winner
    setReveal({ correct, pick: code })
    if (correct) {
      const ns = streak + 1
      setTimeout(() => {
        setStreak(ns)
        if (ns > best) { setBest(ns); saveBest(ns) }
        setQ(nextQ()); setReveal(null)
      }, 900)
    } else {
      if (streak > best) { setBest(streak); saveBest(streak) }
    }
  }

  if (reveal && !reveal.correct) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
        <ScreenHeader title="Stat Clash" subtitle="Run over" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ResultCard>
            <ResultHeader icon="trending-down" accent={ACCENT.play}
              title={`${NAME(winner)} had ${q.metric === "pop" ? "more people" : q.metric === "area" ? "more land" : q.metric === "borders" ? "more neighbours" : "higher density"}`}
              score={<>{NAME(q.a)}: {fmt(q.metric, q.a)}<br />{NAME(q.b)}: {fmt(q.metric, q.b)}</>} />
            <ResultStats stats={[
              { label: "Streak", value: streak, accent: ACCENT.play },
              { label: "Best", value: best, accent: T.amber },
            ]} />
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={ACCENT.play}>Go again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  const card = (code: string) => {
    const isPick = reveal?.pick === code
    const isWinner = code === winner
    // Constant 2px border + an animated box-shadow ring for the reveal emphasis,
    // so the highlight eases in instead of snapping the border width (reflow).
    let borderColor = T.lineHi
    let ring = "none"
    if (reveal) {
      if (isWinner) { borderColor = ACCENT.codex; ring = `0 0 0 3px ${tint(ACCENT.codex, 0.4)}` }
      else if (isPick) { borderColor = T.warm; ring = `0 0 0 3px ${tint(T.warm, 0.35)}` }
    }
    return (
      <button onClick={() => choose(code)} disabled={!!reveal} className="geo-tap"
        style={{ flex: 1, borderRadius: 14, overflow: "hidden", border: `2px solid ${borderColor}`, boxShadow: ring, background: T.surface, padding: 0, position: "relative", transition: "border-color 0.2s ease, box-shadow 0.2s ease" }}>
        <div style={{ aspectRatio: "3/2", background: "#fff" }}>
          <FlagImage code={code} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
        <div style={{ padding: "9px 8px" }}>
          <div className="geo-display" style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{NAME(code)}</div>
          {reveal && <div className="geo-mono" style={{ fontSize: 11, color: isWinner ? ACCENT.codex : T.muted, marginTop: 2 }}>{fmt(q.metric, code)}</div>}
        </div>
      </button>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <ScreenHeader title="Stat Clash" subtitle={`Best ${best}`} onBack={onBack}
        right={<HeaderStat label="Streak" accent={ACCENT.play}>{streak}</HeaderStat>} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 18px 30px", gap: 16 }}>
        <div style={{ textAlign: "center" }}>
          <div className="geo-micro" style={{ fontSize: 11, color: q.metric === "pop" ? ACCENT.learn : ACCENT.codex, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <LineIcon name={q.metric === "pop" ? "users" : q.metric === "area" ? "map" : q.metric === "borders" ? "compass" : "building"} size={14} />
            {q.metric === "pop" ? "Population" : q.metric === "area" ? "Land area" : q.metric === "borders" ? "Land borders" : "Density"}
          </div>
          <div className="geo-display" style={{ fontWeight: 700, fontSize: 21, color: T.text, marginTop: 2 }}>Which has {prompt}</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
          {card(q.a)}
          <div style={{ display: "flex", alignItems: "center", fontFamily: FONT.display, fontWeight: 700, color: T.dim, fontSize: 13 }}>vs</div>
          {card(q.b)}
        </div>
      </div>
    </div>
  )
}

export default function StatClashScreen({ onBack }: Props) {
  const [k, setK] = useState(0)
  return <StatClashGame key={k} onBack={onBack} onReplay={() => setK(n => n + 1)} />
}
