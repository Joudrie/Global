import { useState, useRef, useLayoutEffect, useMemo } from "react"
import worldMap from "@svg-maps/world"
import { FLAGS } from "../data/flags"
import { neighborsOf, countriesWithBorders } from "../data/borders"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import FlagImage from "./FlagImage"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"
import { matchNames, pickOnEnter } from "../utils/pickOnEnter"

interface Props { onBack: () => void }

const PATHS = new Map<string, string>(
  (worldMap as { locations: { id: string; path: string }[] }).locations.map(l => [l.id, l.path])
)
const FULL_VB = (worldMap as { viewBox: string }).viewBox
const hasPath = (code: string) => PATHS.has(code.toLowerCase())
const NAME = (code: string) => FLAGS.find(f => f.code === code)?.name ?? code

const SEA = () => "#E6E9DD"
const PRIMARY_FILL = "#F4B740"
const NEIGHBOR_FILL = "#F7D060"
const MISS_FILL = "#C2735A"

// Eligible primaries: have a drawable shape + at least 2 nameable, drawable neighbours.
const ELIGIBLE = countriesWithBorders(2).filter(c =>
  hasPath(c) && neighborsOf(c).filter(hasPath).length >= 2
)

function BorderMapGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const primary = useMemo(() => ELIGIBLE[Math.floor(Math.random() * ELIGIBLE.length)], [])
  const targets = useMemo(() => neighborsOf(primary).filter(hasPath), [primary])
  const targetSet = useMemo(() => new Set(targets), [targets])

  const [found, setFound] = useState<Set<string>>(new Set())
  const [input, setInput] = useState("")
  const [showDrop, setShowDrop] = useState(false)
  const [misses, setMisses] = useState(0)
  const [flash, setFlash] = useState<null | "ok" | "no">(null)
  const [revealed, setRevealed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the camera on the primary country's bounding box (neighbours spill
  // past the edges and get clipped — exactly the intended effect).
  const primRef = useRef<SVGPathElement>(null)
  const [vb, setVb] = useState<string | null>(null)
  useLayoutEffect(() => {
    if (!primRef.current) return
    const b = primRef.current.getBBox()
    // Frame the country with generous breathing room so it isn't over-zoomed
    // (especially on wide desktop screens) and neighbours stay visible.
    const pad = Math.max(b.width, b.height) * 0.95
    setVb(`${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`)
  }, [primary])

  const done = found.size === targets.length
  // Giving up ends the round too: the rest are drawn and the result shows.
  const over = done || revealed
  const matches = input.trim().length
    ? matchNames(FLAGS, input, 6)
    : []

  const submit = (code: string) => {
    if (over) return
    setInput(""); setShowDrop(false)
    if (targetSet.has(code) && !found.has(code)) {
      setFound(s => new Set(s).add(code))
      setFlash("ok")
    } else if (!targetSet.has(code)) {
      setMisses(m => m + 1)
      setFlash("no")
    }
    setTimeout(() => setFlash(null), 500)
    inputRef.current?.focus()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && matches.length >= 1) { const pick = pickOnEnter(matches, input); if (pick) submit(pick.code) }
    if (e.key === "Escape") { setInput(""); setShowDrop(false) }
  }

  // What to draw: primary + found (+ remaining in red if revealed).
  const drawn: { code: string; fill: string; isPrimary?: boolean }[] = [
    { code: primary, fill: PRIMARY_FILL, isPrimary: true },
    ...[...found].map(c => ({ code: c, fill: NEIGHBOR_FILL })),
    ...(revealed ? targets.filter(c => !found.has(c)).map(c => ({ code: c, fill: MISS_FILL })) : []),
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <ScreenHeader title="Border Map" subtitle={done ? "All neighbours found" : revealed ? "Revealed" : "Name every neighbour"} onBack={onBack}
        right={<HeaderStat accent={ACCENT.codex}>{found.size} / {targets.length}</HeaderStat>} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "0 16px 4px" }}>
        <div style={{ width: 38, height: 26, borderRadius: 4, overflow: "hidden", border: `1px solid ${T.line}`, flexShrink: 0 }}>
          <FlagImage code={primary} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
        <div className="geo-display" style={{ fontWeight: 800, fontSize: 28, letterSpacing: "-0.01em", color: T.text }}>{NAME(primary)}</div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 16px 20px", gap: 12 }}>
        {/* Map */}
        <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: `1px solid ${T.line}`, background: SEA(), flex: 1, minHeight: 300 }}>
          <svg viewBox={vb ?? FULL_VB} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block", opacity: vb ? 1 : 0, transition: "opacity 0.25s" }}>
            {/* hidden measuring path (also the primary fill) */}
            <path ref={primRef} d={PATHS.get(primary.toLowerCase())!} fill={PRIMARY_FILL} stroke="#B98A2E" strokeWidth={0.4} />
            {drawn.filter(d => !d.isPrimary).map(d => (
              <path key={d.code} d={PATHS.get(d.code.toLowerCase())!} fill={d.fill}
                stroke="#00000022" strokeWidth={0.4} />
            ))}
          </svg>

          {/* found / done overlay */}
          {done && <Confetti />}
          {flash && (
            <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: FONT.display,
              background: flash === "ok" ? tint(ACCENT.codex, 0.95) : tint(MISS_FILL, 0.95), color: "#fff" }}>
              {flash === "ok" ? "✓ Got it" : "✗ Not a neighbour"}
            </div>
          )}
        </div>

        {/* Found chips */}
        {found.size > 0 && !over && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[...found].map(c => (
              <span key={c} className="geo-mono" style={{ fontSize: 11, padding: "4px 8px", borderRadius: 999, background: tint(ACCENT.codex, 0.14), color: ACCENT.codex, border: `1px solid ${tint(ACCENT.codex, 0.35)}` }}>{NAME(c)}</span>
            ))}
          </div>
        )}

        {over && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ResultCard>
              <ResultHeader icon="bordermap" accent={ACCENT.codex}
                title={done ? `All ${targets.length} neighbours!` : `${found.size} of ${targets.length} neighbours`}
                score={!done ? `The ${targets.length - found.size} you missed are shown in red.`
                  : misses === 0 ? "Flawless, no wrong guesses." : `${misses} wrong guess${misses === 1 ? "" : "es"}`} />
            </ResultCard>
            <PrimaryButton onClick={onReplay} accent={ACCENT.codex}>New country</PrimaryButton>
            <SecondaryButton onClick={onBack}>Home</SecondaryButton>
          </div>
        )}

        {/* Input */}
        {!over && (
          <div style={{ position: "relative" }}>
            <input ref={inputRef} value={input}
              onChange={e => { setInput(e.target.value); setShowDrop(true) }} onKeyDown={onKey}
              onFocus={() => setShowDrop(true)} onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              placeholder="Type a bordering country…" autoComplete="off"
              style={{ width: "100%", padding: "13px 14px", borderRadius: 12, outline: "none", fontWeight: 600, fontSize: 15, fontFamily: FONT.display, background: T.surface, border: `1.5px solid ${T.lineHi}`, color: T.text }} />
            {showDrop && matches.length > 0 && (
              <div style={{ position: "absolute", left: 0, right: 0, bottom: "100%", marginBottom: 6, borderRadius: 12, overflow: "hidden", background: T.surface, border: `1px solid ${T.line}`, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", zIndex: 5 }}>
                {matches.map(f => (
                  <button key={f.code} onMouseDown={() => submit(f.code)} className="geo-tap"
                    style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: found.has(f.code) ? tint(ACCENT.codex, 0.1) : "transparent", borderBottom: `1px solid ${T.line}`, color: T.text, fontWeight: 600, fontSize: 13.5 }}>
                    {f.name}{found.has(f.code) && <span style={{ color: ACCENT.codex, marginLeft: 6 }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setRevealed(true)} className="geo-micro geo-tap"
              style={{ marginTop: 8, fontSize: 11, color: T.muted, background: "transparent", minHeight: 32 }}>give up · reveal the rest</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 16 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.4, dur: 1 + Math.random(),
    color: [T.gold, T.cyan, T.chartreuse, T.green, T.warm][i % 5],
  })), [])
  // No falling confetti for people who ask for reduced motion.
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return null
  return (
    <>
      <style>{`@keyframes bmConfetti{0%{transform:translateY(-20px) rotate(0);opacity:1}100%{transform:translateY(220px) rotate(360deg);opacity:0}}`}</style>
      {bits.map((b, i) => (
        <span key={i} style={{ position: "absolute", top: 0, left: `${b.left}%`, width: 7, height: 11, background: b.color, borderRadius: 1, animation: `bmConfetti ${b.dur}s ${b.delay}s ease-in forwards` }} />
      ))}
    </>
  )
}

export default function BorderMapScreen({ onBack }: Props) {
  const [k, setK] = useState(0)
  return <BorderMapGame key={k} onBack={onBack} onReplay={() => setK(n => n + 1)} />
}
