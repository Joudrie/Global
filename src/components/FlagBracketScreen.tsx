import { useEffect, useMemo, useReducer, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { Check, ChevronDown } from "lucide-react"
import { REGIONS } from "../data/flags"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"
import FlagImage from "./FlagImage"
import { commonsThumb } from "../utils/commons"
import {
  EXTRA_SETS, PREFS_KEY, SIZES, buildPool, drawField, extrasSummary, fitSize, isRegion, loadSet, orderSets, poolEstimate,
  readPrefs, selectionLabel, setCount, setFlags, setLabel,
} from "../utils/bracket"
import type { Entrant, ExtraId, SetId, Size } from "../utils/bracket"

interface Props { onBack: () => void }

const A = ACCENT.play

interface Match { a: Entrant; b: Entrant; winner: string; roundSize: number }

const roundName = (n: number) =>
  n === 2 ? "Final" : n === 4 ? "Semi-finals" : n === 8 ? "Quarter-finals" : n === 16 ? "Round of 16" : `Round of ${n}`

// Storage can be missing or throw (private windows); the game works without it.
const readSaved = () => { try { return readPrefs(localStorage.getItem(PREFS_KEY)) } catch { return readPrefs(null) } }
const save = (v: unknown) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(v)) } catch { /* not saved */ } }

// Motion: colour and border only, after a tap; none under reduced motion.
const STYLES = `
  .fb-tap { transition: background-color 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out; }
  .fb-tap:focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 2px; }
  @media (hover: hover) {
    .fb-opt[aria-pressed="false"]:hover, .fb-size[aria-pressed="false"]:not(:disabled):hover { border-color: ${T.lineHi}; }
    .fb-row[aria-pressed="false"]:hover, .fb-more:hover { background: ${T.surfaceHi}; }
    .fb-link:hover { color: ${T.text}; }
  }
  .fb-chev { transition: transform 200ms ease-out; }
  @media (prefers-reduced-motion: reduce) { .fb-tap, .fb-chev { transition: none; } }
`

/** A flag in any set: countries get FlagImage's fallback sources; the rest
 *  use the Codex's image (a light raster for a Commons hotlink, then the file). */
function FlagPic({ flag, width, style }: { flag: Entrant; width: number; style: CSSProperties }) {
  if (flag.code) return <FlagImage code={flag.code} style={style} />
  const thumb = commonsThumb(flag.flagUrl, width)
  return (
    <img src={thumb} alt="" style={style}
      onError={e => {
        const img = e.currentTarget
        if (thumb !== flag.flagUrl && img.dataset.full !== "1") { img.dataset.full = "1"; img.src = flag.flagUrl }
        else img.style.opacity = "0.2"
      }} />
  )
}

function FlagChoice({ flag, detail, onPick }: { flag: Entrant; detail?: string; onPick: (f: Entrant) => void }) {
  return (
    <button onClick={() => onPick(flag)}
      className="w-full max-w-sm rounded-2xl overflow-hidden transition-all active:scale-95 geo-tap"
      style={{ border: `2px solid ${T.line}`, background: T.surface }}>
      {/* contain (not cover) so no flag edges get cropped off */}
      <FlagPic flag={flag} width={640} style={{ width: "100%", height: 150, objectFit: "contain", display: "block", background: T.void }} />
      <div className="py-3 px-3">
        <div className="font-bold text-lg" style={{ color: T.text, fontFamily: FONT.display, lineHeight: 1.25 }}>{flag.name}</div>
        {detail && <div className="text-xs" style={{ color: T.muted, marginTop: 2 }}>{detail}</div>}
      </div>
    </button>
  )
}

function MiniFlag({ flag, dim }: { flag: Entrant; dim?: boolean }) {
  return <FlagPic flag={flag} width={120} style={{ width: 34, height: 22, objectFit: "contain", flexShrink: 0, borderRadius: 3, opacity: dim ? 0.3 : 1, border: `1px solid ${T.line}`, background: T.surfaceHi }} />
}

/** The tick on a set's toggle. */
function Tick({ on }: { on: boolean }) {
  return (
    <span aria-hidden style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: on ? A : "transparent", border: `1.5px solid ${on ? A : T.lineHi}` }}>
      {on && <Check size={13} strokeWidth={3} color={T.onAccent} />}
    </span>
  )
}

const countStyle: CSSProperties = { fontSize: 12, color: T.muted, fontVariantNumeric: "tabular-nums", flexShrink: 0 }

// ── Setup: any mix of continents and Codex sections ──
function Setup({ onBack, onStart }: Props & { onStart: (field: Entrant[], sets: SetId[]) => void }) {
  const [saved] = useState(readSaved)
  const [sets, setSets] = useState<SetId[]>(saved.sets)
  const [size, setSize] = useState<Size>(saved.size)
  const [moreOpen, setMoreOpen] = useState(false)
  const [failed, setFailed] = useState<ExtraId[]>([])
  const [loads, loaded] = useReducer((n: number) => n + 1, 0)
  useEffect(() => save({ sets, size }), [sets, size])

  // Load each extra set the first time it's switched on.
  const extrasOn = sets.filter((id): id is ExtraId => !isRegion(id))
  const extrasKey = extrasOn.join(",")
  useEffect(() => {
    let live = true
    for (const id of extrasOn) {
      if (setFlags(id) || failed.includes(id)) continue
      loadSet(id).then(() => { if (live) loaded() }, () => { if (live) setFailed(f => (f.includes(id) ? f : [...f, id])) })
    }
    return () => { live = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extrasKey, failed])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pool = useMemo(() => buildPool(sets), [sets, loads])
  const waiting = pool.waiting.length > 0
  const someFailed = pool.waiting.some(id => failed.includes(id))
  const poolSize = waiting ? poolEstimate(sets) : pool.flags.length
  // With nothing picked, the chosen size stays lit and nothing is greyed out.
  const playing = sets.length ? fitSize(size, poolSize) : size
  const canStart = sets.length > 0 && !waiting && pool.flags.length >= 2

  const toggle = (id: SetId) => setSets(s => (s.includes(id) ? s.filter(x => x !== id) : orderSets([...s, id])))
  const allContinents = REGIONS.every(r => sets.includes(r))
  const toggleContinents = () => setSets(s => (allContinents ? s.filter(id => !isRegion(id)) : orderSets([...s, ...REGIONS])))

  const n = pool.flags.length
  const poolLine = sets.length === 0 ? "Pick at least one set of flags."
    : someFailed ? "Some flags didn't load."
    : waiting ? "Loading flags…"
    : `${n.toLocaleString()} flags in the pool. ${playing === "all" || playing === n ? `All ${playing === "all" ? n.toLocaleString() : playing} play.` : `${playing} are drawn at random.`}`

  const moreSummary = extrasOn.length ? extrasSummary(extrasOn) : "Pride, separatist, micronations and more"

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <style>{STYLES}</style>
      <ScreenHeader title="Flag Bracket" onBack={onBack} />

      <div className="flex-1 w-full max-w-md mx-auto" style={{ padding: "4px 16px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h2 className="geo-display" style={{ margin: 0, fontWeight: 700, fontSize: 22, lineHeight: 1.2, color: T.text }}>Crown the coolest flag</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.5, color: T.muted }}>
            Mix any sets of flags. Every run draws a fresh random bracket with an even share from each set.
          </p>
        </div>

        {/* Continents: any combination */}
        <section aria-labelledby="fb-continents">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 44 }}>
            <h3 id="fb-continents" className="geo-micro" style={{ margin: 0, fontSize: 11, color: T.muted }}>Continents</h3>
            <button type="button" onClick={toggleContinents} className="fb-tap fb-link"
              style={{ minHeight: 44, padding: "0 4px", marginRight: -4, fontSize: 13, fontWeight: 600, color: A, background: "transparent", border: "none", cursor: "pointer" }}>
              {allContinents ? "Clear" : "Select all"}
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            {REGIONS.map(r => {
              const on = sets.includes(r)
              return (
                <button key={r} type="button" onClick={() => toggle(r)} aria-pressed={on} className="fb-tap fb-opt"
                  style={{ minHeight: 48, padding: "0 12px", borderRadius: 12, display: "flex", alignItems: "center", gap: 8, textAlign: "left", cursor: "pointer",
                    background: on ? tint(A, 0.1) : T.surface, border: `1px solid ${on ? A : T.line}` }}>
                  <Tick on={on} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: on ? 700 : 600, color: T.text, lineHeight: 1.2 }}>{r}</span>
                  <span style={countStyle}>{setCount(r)}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* More flags: the Codex's other sections */}
        <section style={{ borderRadius: 12, border: `1px solid ${T.line}`, background: T.surface, overflow: "hidden" }}>
          <button type="button" onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen} aria-controls="fb-more" className="fb-tap fb-more"
            style={{ width: "100%", minHeight: 56, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, textAlign: "left", background: "transparent", border: "none", cursor: "pointer" }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: T.text }}>More flags</span>
              <span style={{ display: "block", fontSize: 12, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>{moreSummary}</span>
            </span>
            {extrasOn.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: A, background: tint(A, 0.12), borderRadius: 999, padding: "2px 8px", flexShrink: 0 }}>{extrasOn.length} on</span>
            )}
            <ChevronDown size={18} color={T.muted} strokeWidth={1.8} aria-hidden className="fb-chev"
              style={{ flexShrink: 0, transform: moreOpen ? "rotate(180deg)" : "none" }} />
          </button>
          {moreOpen && (
            <div id="fb-more" role="group" aria-label="More flags" style={{ borderTop: `1px solid ${T.line}` }}>
              {EXTRA_SETS.map((s, i) => {
                const on = sets.includes(s.id)
                const state = !on || setFlags(s.id) ? null : failed.includes(s.id) ? "Didn't load" : "Loading…"
                return (
                  <button key={s.id} type="button" onClick={() => toggle(s.id)} aria-pressed={on} className="fb-tap fb-row"
                    style={{ width: "100%", minHeight: 48, padding: "0 12px", display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer",
                      background: on ? tint(A, 0.08) : "transparent", border: "none", borderTop: i ? `1px solid ${tint(T.line, 0.6)}` : "none" }}>
                    <Tick on={on} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: on ? 700 : 500, color: T.text, lineHeight: 1.25 }}>{s.label}</span>
                    <span style={{ ...countStyle, color: state === "Didn't load" ? T.danger : T.muted }}>{state ?? s.count.toLocaleString()}</span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Always in reach: the bracket size, the pool and Start. */}
      <div style={{ position: "sticky", bottom: 0, background: T.bg, borderTop: `1px solid ${T.line}` }}>
        <div className="w-full max-w-md mx-auto" style={{ padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", gap: 10 }}>
          <div role="group" aria-label="Bracket size" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="geo-micro" style={{ fontSize: 11, color: T.muted, flexShrink: 0, marginRight: 4 }}>Size</span>
            {[...SIZES, "all" as const].map(s => {
              const on = playing === s
              const fits = !sets.length || s === "all" || poolSize >= s
              return (
                <button key={s} type="button" onClick={() => setSize(s)} aria-pressed={on} disabled={!fits} className="fb-tap fb-size"
                  aria-label={s === "all" ? "Everyone in the pool" : `${s} flags`}
                  style={{ flex: 1, minWidth: 0, minHeight: 44, borderRadius: 10, fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                    cursor: fits ? "pointer" : "not-allowed", opacity: fits ? 1 : 0.45,
                    background: on ? A : T.surface, color: on ? T.onAccent : fits ? T.text : T.dim, border: `1px solid ${on ? A : T.line}` }}>
                  {s === "all" ? "All" : s}
                </button>
              )
            })}
          </div>
          <div aria-live="polite" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 20 }}>
            <span style={{ fontSize: 13, color: someFailed ? T.danger : T.muted }}>{poolLine}</span>
            {someFailed && (
              <button type="button" onClick={() => setFailed([])} className="fb-tap fb-link"
                style={{ minHeight: 44, margin: "-12px -4px", padding: "0 4px", fontSize: 13, fontWeight: 600, color: A, background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}>Try again</button>
            )}
          </div>
          <PrimaryButton accent={A} disabled={!canStart} onClick={() => onStart(drawField(pool.flags, playing), sets)}>Start bracket</PrimaryButton>
        </div>
      </div>
    </div>
  )
}

function BracketGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [label, setLabelText] = useState<string | null>(null)
  // More than one set in the bracket: each flag says which it's from.
  const [mixed, setMixed] = useState(false)
  const [field, setField] = useState<Entrant[]>([])
  const [pair, setPair] = useState(0)
  const lastPick = useRef(0)
  const [winners, setWinners] = useState<Entrant[]>([])
  const [champion, setChampion] = useState<Entrant | null>(null)
  const [history, setHistory] = useState<Match[]>([])
  // The bracket before each pick, so a mis-tapped vote can be taken back.
  const [undoStack, setUndoStack] = useState<{ field: Entrant[]; pair: number; winners: Entrant[]; history: Match[] }[]>([])
  const undo = () => {
    const prev = undoStack[undoStack.length - 1]
    if (!prev) return
    setField(prev.field); setPair(prev.pair); setWinners(prev.winners); setHistory(prev.history)
    setChampion(null); setUndoStack(u => u.slice(0, -1))
  }

  // An odd-sized field (All) gives a bye each round.
  const start = (drawn: Entrant[], sets: SetId[]) => {
    setLabelText(selectionLabel(sets))
    setMixed(new Set(drawn.map(f => f.set)).size > 1)
    setField(drawn)
    setPair(0); setWinners([]); setChampion(null); setHistory([]); setUndoStack([])
  }

  if (label === null) return <Setup onBack={onBack} onStart={start} />

  const detailOf = (f: Entrant) => f.detail ?? (mixed ? setLabel(f.set) : undefined)

  const pick = (f: Entrant) => {
    // A double tap's second tap would land on the next pair as it fades in.
    const now = performance.now()
    if (now - lastPick.current < 350) return
    lastPick.current = now
    const a = field[pair * 2], b = field[pair * 2 + 1]
    setUndoStack(u => [...u, { field, pair, winners, history }])
    setHistory(h => [...h, { a, b, winner: f.key, roundSize: field.length }])
    const nextWinners = [...winners, f]
    const pairs = Math.floor(field.length / 2)
    if (pair + 1 < pairs) {
      setWinners(nextWinners); setPair(pair + 1)
    } else {
      // round over — an odd flag out gets a bye into the next round, and plays
      // first there, so the same flag can't ride byes all the way to the final
      const bye = field.length % 2 === 1 ? [field[field.length - 1]] : []
      const advanced = [...bye, ...nextWinners]
      if (advanced.length === 1) { setChampion(advanced[0]); return }
      setField(advanced); setWinners([]); setPair(0)
    }
  }

  // ── champion + bracket recap ──
  if (champion) {
    const rounds = Array.from(new Set(history.map(m => m.roundSize))).sort((a, b) => b - a)
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title="Flag Bracket" subtitle="Your champion" onBack={onBack} />
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <div className="w-full max-w-sm mx-auto text-center">
            <ResultCard style={{ marginBottom: 16 }}>
              <ResultHeader icon="crown" accent={T.gold} eyebrow="Your champion" title={champion.name} score={`Your coolest flag · ${label}`} />
              <FlagPic flag={champion} width={480}
                style={{ width: 200, height: 133, objectFit: "contain", background: T.void, borderRadius: 12, margin: "0 auto", border: `2px solid ${T.gold}`, display: "block" }} />
            </ResultCard>

            {/* Bracket recap */}
            <div className="rounded-2xl p-4 mb-4 text-left" style={{ background: T.surfaceHi, border: `1px solid ${T.line}` }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: T.muted }}>The Bracket</div>
              {rounds.map(rs => (
                <div key={rs} style={{ marginBottom: 12 }}>
                  <div className="text-xs font-bold mb-1.5" style={{ color: A }}>{roundName(rs)}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {history.filter(m => m.roundSize === rs).map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs" style={{ color: T.text }}>
                        <MiniFlag flag={m.a} dim={m.winner !== m.a.key} />
                        <span style={{ flex: 1, minWidth: 0, opacity: m.winner === m.a.key ? 1 : 0.4, fontWeight: m.winner === m.a.key ? 700 : 400 }}>{m.a.name}</span>
                        <span style={{ color: T.dim }}>vs</span>
                        <span style={{ flex: 1, minWidth: 0, textAlign: "right", opacity: m.winner === m.b.key ? 1 : 0.4, fontWeight: m.winner === m.b.key ? 700 : 400 }}>{m.b.name}</span>
                        <MiniFlag flag={m.b} dim={m.winner !== m.b.key} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <PrimaryButton onClick={onReplay} accent={A}>New bracket</PrimaryButton>
              <SecondaryButton onClick={undo}>Change the final pick</SecondaryButton>
              <SecondaryButton onClick={onBack}>Home</SecondaryButton>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const a = field[pair * 2], b = field[pair * 2 + 1]
  const totalPairs = Math.floor(field.length / 2)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Flag Bracket"
        subtitle={<span>{label} · {roundName(field.length)} · <span style={{ fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" }}>{pair + 1}/{totalPairs}</span></span>}
        onBack={onBack} />

      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-4">
        <p className="text-sm font-semibold" style={{ color: T.muted }}>Which flag is cooler?</p>
        {/* Key by the matchup so each new pair fades in instead of hard-cutting. */}
        <div key={`${field.length}-${pair}`} className="w-full flex flex-col items-center gap-4 animate-fade-in">
          <FlagChoice flag={a} detail={detailOf(a)} onPick={pick} />
          <div className="text-sm font-black" style={{ color: A, fontFamily: FONT.display }}>VS</div>
          <FlagChoice flag={b} detail={detailOf(b)} onPick={pick} />
        </div>
        {undoStack.length > 0 && (
          <button onClick={undo} className="geo-micro geo-tap"
            style={{ fontSize: 11, color: T.muted, background: "transparent", minHeight: 44 }}>undo last pick</button>
        )}
      </div>
    </div>
  )
}

export default function FlagBracketScreen({ onBack }: Props) {
  const [k, setK] = useState(0)
  return <BracketGame key={k} onBack={onBack} onReplay={() => setK(n => n + 1)} />
}
