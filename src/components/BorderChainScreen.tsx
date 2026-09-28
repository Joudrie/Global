import { useState, useRef, useMemo } from "react"
import { FLAGS } from "../data/flags"
import { neighborsOf, countriesWithBorders, bfsDistances, shortestPath } from "../data/borders"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import FlagImage from "./FlagImage"

interface Props { onBack: () => void }

const NAME = (code: string) => FLAGS.find(f => f.code === code)?.name ?? code
const rand = <X,>(a: X[]): X => a[Math.floor(Math.random() * a.length)]

// Start on a well-connected country (islands are absent from the graph, so they
// can never be chosen as endpoints) and find a target 3–5 land-hops away.
interface Puzzle { start: string; target: string; par: number }
function buildPuzzle(): Puzzle {
  const starters = countriesWithBorders(2)
  for (let i = 0; i < 200; i++) {
    const start = rand(starters)
    const dist = bfsDistances(start)
    const candidates = [...dist.entries()].filter(([, d]) => d >= 3 && d <= 5).map(([c]) => c)
    if (candidates.length) {
      const target = rand(candidates)
      return { start, target, par: dist.get(target)! }
    }
  }
  return { start: "PT", target: "DE", par: shortestPath("PT", "DE")!.length - 1 }
}

function ChainGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [puzzle] = useState(buildPuzzle)
  const [chain, setChain] = useState<string[]>(() => [puzzle.start])
  const used = useMemo(() => new Set(chain), [chain])
  const [input, setInput] = useState("")
  const [showDrop, setShowDrop] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<null | "win" | "gaveup">(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const current = chain[chain.length - 1]
  const hops = chain.length - 1
  const optimal = useMemo(() => shortestPath(puzzle.start, puzzle.target) ?? [], [puzzle])

  const matches = input.trim().length
    ? FLAGS.filter(f => f.name.toLowerCase().includes(input.trim().toLowerCase())).slice(0, 6)
    : []

  const submit = (code: string) => {
    if (outcome) return
    setInput(""); setShowDrop(false); setErr(null)
    if (used.has(code)) { setErr(`${NAME(code)} is already in your route.`); return }
    if (!neighborsOf(current).includes(code)) { setErr(`${NAME(code)} doesn't border ${NAME(current)}.`); return }
    const next = [...chain, code]
    setChain(next)
    if (code === puzzle.target) setOutcome("win")
    inputRef.current?.focus()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && matches.length >= 1) submit(matches[0].code)
    if (e.key === "Escape") { setInput(""); setShowDrop(false) }
  }

  const Endpoint = ({ code, label, glow }: { code: string; label: string; glow: string }) => (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div className="geo-micro" style={{ fontSize: 8, color: T.dim, marginBottom: 4 }}>{label}</div>
      <div style={{ width: 84, height: 56, margin: "0 auto", borderRadius: 10, overflow: "hidden", border: `2px solid ${glow}`, boxShadow: `0 0 14px ${tint(glow, 0.5)}` }}>
        <FlagImage code={code} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
      <div className="geo-display" style={{ fontWeight: 700, fontSize: 13, color: T.text, marginTop: 5 }}>{NAME(code)}</div>
    </div>
  )

  // ── win / give-up summary ──
  if (outcome) {
    const win = outcome === "win"
    const perfect = win && hops === puzzle.par
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: T.bg }}>
        <div className="w-full max-w-sm" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ borderRadius: 16, padding: 22, textAlign: "center", background: T.surface, border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 40 }}>{perfect ? "🏆" : win ? "🧭" : "🛑"}</div>
            <div className="geo-display" style={{ fontWeight: 700, fontSize: 19, color: T.text, marginTop: 6 }}>
              {win ? (perfect ? "Perfect route!" : "Connected!") : "Gave up"}
            </div>
            <div style={{ color: T.muted, fontSize: 12, marginTop: 6 }}>
              {NAME(puzzle.start)} → {NAME(puzzle.target)}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 16 }}>
              <div><div style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 28, color: ACCENT.learn }}>{win ? hops : "—"}</div><div className="geo-micro" style={{ fontSize: 8, color: T.muted }}>your hops</div></div>
              <div><div style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 28, color: T.amber }}>{puzzle.par}</div><div className="geo-micro" style={{ fontSize: 8, color: T.muted }}>best route</div></div>
            </div>
            {/* show the optimal route */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center", alignItems: "center", marginTop: 16 }}>
              {optimal.map((c, i) => (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {i > 0 && <span style={{ color: T.dim, fontSize: 11 }}>→</span>}
                  <div style={{ width: 30, height: 20, borderRadius: 3, overflow: "hidden", border: `1px solid ${T.line}` }}>
                    <FlagImage code={c} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="geo-micro" style={{ fontSize: 8, color: T.dim, marginTop: 6 }}>the shortest path</div>
          </div>
          <button onClick={onReplay} className="geo-tap" style={{ padding: "14px 0", borderRadius: 12, fontWeight: 700, fontFamily: FONT.display, background: ACCENT.learn, color: T.onAccent }}>New pair</button>
          <button onClick={onBack} className="geo-tap" style={{ padding: "12px 0", borderRadius: 12, fontWeight: 600, background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>← Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 6px" }}>
        <button onClick={onBack} className="geo-tap" style={{ width: 34, height: 34, borderRadius: 9, background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div className="geo-micro" style={{ fontSize: 9, color: T.muted }}>Border Path</div>
          <div style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 16, color: ACCENT.learn }}>{hops}<span style={{ color: T.dim, fontSize: 11 }}> / {puzzle.par} best</span></div>
        </div>
        <button onClick={() => setOutcome("gaveup")} className="geo-tap" style={{ fontSize: 10, fontWeight: 600, padding: "6px 10px", borderRadius: 9, background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>give up</button>
      </header>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 18px 22px", gap: 14 }}>
        {/* the two endpoints to connect */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 8px", borderRadius: 14, background: T.surface, border: `1px solid ${T.line}` }}>
          <Endpoint code={puzzle.start} label="FROM" glow={ACCENT.learn} />
          <span style={{ color: T.dim, fontSize: 20 }}>⇢</span>
          <Endpoint code={puzzle.target} label="TO" glow={T.amber} />
        </div>

        <div className="geo-micro" style={{ textAlign: "center", fontSize: 9, color: T.muted }}>
          Hop border-to-border to connect them. Match the best route for a perfect score.
        </div>

        {/* chain so far */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", alignItems: "center", paddingBottom: 4 }}>
          {chain.map((c, i) => (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {i > 0 && <span style={{ color: T.dim }}>→</span>}
              <div style={{ width: 46, height: 31, borderRadius: 5, overflow: "hidden", border: `1px solid ${i === chain.length - 1 ? ACCENT.learn : T.line}`, boxShadow: i === chain.length - 1 ? `0 0 10px ${tint(ACCENT.learn, 0.6)}` : "none" }}>
                <FlagImage code={c} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            </div>
          ))}
        </div>

        {/* current */}
        <div style={{ textAlign: "center" }}>
          <div className="geo-micro" style={{ fontSize: 9, color: T.muted, marginBottom: 6 }}>Name a country bordering</div>
          <div style={{ width: 160, height: 107, margin: "0 auto", borderRadius: 14, overflow: "hidden", border: `1px solid ${T.lineHi}`, boxShadow: "0 12px 28px -14px rgba(31,58,60,0.45)" }}>
            <FlagImage code={current} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
          <div className="geo-display" style={{ fontWeight: 700, fontSize: 18, color: T.text, marginTop: 8 }}>{NAME(current)}</div>
          {err && <div className="geo-mono" style={{ fontSize: 11, color: T.warm, marginTop: 4 }}>{err}</div>}
        </div>

        <div style={{ position: "relative", marginTop: "auto" }}>
          <input ref={inputRef} value={input}
            onChange={e => { setInput(e.target.value); setShowDrop(true) }} onKeyDown={onKey}
            onFocus={() => setShowDrop(true)} onBlur={() => setTimeout(() => setShowDrop(false), 150)}
            placeholder={`Borders ${NAME(current)}…`} autoComplete="off"
            style={{ width: "100%", padding: "13px 14px", borderRadius: 12, outline: "none", fontWeight: 600, fontSize: 15, fontFamily: FONT.display, background: T.surface, border: `1.5px solid ${T.lineHi}`, color: T.text }} />
          {showDrop && matches.length > 0 && (
            <div style={{ position: "absolute", left: 0, right: 0, bottom: "100%", marginBottom: 6, borderRadius: 12, overflow: "hidden", background: T.surface, border: `1px solid ${T.line}`, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", zIndex: 5 }}>
              {matches.map(f => (
                <button key={f.code} onMouseDown={() => submit(f.code)} className="geo-tap"
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "9px 13px", borderBottom: `1px solid ${T.line}`, color: T.text, fontWeight: 600, fontSize: 13.5, background: "transparent" }}>
                  <FlagImage code={f.code} style={{ width: 26, height: 17, objectFit: "cover", borderRadius: 3 }} />
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BorderChainScreen({ onBack }: Props) {
  const [k, setK] = useState(0)
  return <ChainGame key={k} onBack={onBack} onReplay={() => setK(n => n + 1)} />
}
