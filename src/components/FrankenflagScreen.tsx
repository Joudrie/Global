import { useState, useMemo, useEffect, useId } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, ResultStats, PrimaryButton, SecondaryButton, DidYouMean } from "./gameUi"

import { didYouMean, matchNames, pickOnEnter } from "../utils/pickOnEnter"
import { CUTS, CUT_NAME, ROUND_CUTS, TOTAL_PIECES, cutForRound, isPlainPiece, samePiece } from "../utils/flagHalves"
import type { Cut, PieceDef, Pt } from "../utils/flagHalves"

interface Props { onBack: () => void }

const ACC = ACCENT.play
const ROUNDS = ROUND_CUTS.length

// Best pieces named in one game (out of TOTAL_PIECES). The "max" rule in
// utils/mergeProgress.ts keeps the higher of two devices'.
const BEST_KEY = "globalio_frankenflag_best"
const loadBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 } }
const saveBest = (n: number) => { try { localStorage.setItem(BEST_KEY, String(n)) } catch { /* private mode: the game still plays */ } }

interface Round { cut: Cut; flags: FlagRecord[] }   // one flag per piece, in CUTS order

const HOW: Record<Cut, string> = {
  h2: "Two flags stitched together. Name the top and bottom halves.",
  v2: "Two flags side by side. Name the left and right halves.",
  diag: "Cut corner to corner. Name both triangles.",
  h3: "Three flags, a third each. Name the top, middle and bottom.",
  v3: "Three flags, a third each. Name the left, middle and right.",
  quad: "Four flags, a quarter each. Name all four.",
}

function shuffle<X>(a: X[]): X[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}

// A flag for one piece, never one already in this game. Its piece must show
// more than one plain colour: a piece that's only red would fit dozens of
// flags. Three candidates load at once; plain ones go back for other pieces.
async function dealFlag(piece: PieceDef, taken: Set<string>): Promise<FlagRecord> {
  const tried = new Set<string>()
  let fallback: FlagRecord | undefined
  for (let batch = 0; batch < 5; batch++) {
    const picks = shuffle(FLAGS.filter(f => !taken.has(f.code) && !tried.has(f.code))).slice(0, 3)
    if (!picks.length) break
    for (const f of picks) { taken.add(f.code); tried.add(f.code) }
    const plain = await Promise.all(picks.map(f => isPlainPiece(f.flagUrl, piece)))
    const good = plain.indexOf(false)
    picks.forEach((f, i) => { if (i !== good) taken.delete(f.code) })
    if (good >= 0) return picks[good]
    fallback ??= picks.find((_, i) => plain[i] === null) ?? picks[0]
  }
  // Offline, or nothing suitable: any unused flag still makes a round.
  const f = fallback && !taken.has(fallback.code) ? fallback : FLAGS.find(x => !taken.has(x.code))!
  taken.add(f.code)
  return f
}

const buildRound = async (cut: Cut, taken: Set<string>): Promise<Round> =>
  ({ cut, flags: await Promise.all(CUTS[cut].map(pc => dealFlag(pc, taken))) })

// ── The stitched flag ───────────────────────────────────────────────────────
const VW = 640, VH = 480    // the flag artwork's own size (4:3)
const pts = (poly: Pt[], w = VW, h = VH) => poly.map(([x, y]) => `${x * w},${y * h}`).join(" ")
const centre = (poly: Pt[]): Pt => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length]

// The first flag is drawn whole and the others clipped on top of it, so
// where two pieces meet there's flag on both sides of the edge, never a gap.
function Composite({ round, focus, results }: { round: Round; focus: number | null; results: boolean[] | null }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const pieces = CUTS[round.cut]
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%" style={{ display: "block" }}
      role="img" aria-label={`${pieces.length} flags stitched together: ${pieces.map(p => p.label.toLowerCase()).join(", ")}`}>
      <defs>
        {pieces.map((pc, i) => i > 0 && (
          <clipPath key={pc.id} id={`${id}-${i}`} clipPathUnits="userSpaceOnUse"><polygon points={pts(pc.poly)} /></clipPath>
        ))}
      </defs>
      <rect width={VW} height={VH} fill="#fff" />
      {pieces.map((pc, i) => (
        <image key={pc.id} href={round.flags[i].flagUrl} x={0} y={0} width={VW} height={VH} preserveAspectRatio="none"
          clipPath={i > 0 ? `url(#${id}-${i})` : undefined} />
      ))}
      {/* The piece whose box has the focus, so it's clear which part is which. */}
      {focus !== null && !results && (
        <polygon points={pts(pieces[focus].poly)} fill="none" stroke={T.text} strokeWidth={3} strokeDasharray="8 6"
          vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      )}
      {results && pieces.map((pc, i) => {
        const [cx, cy] = centre(pc.poly)
        const ok = results[i]
        return (
          <g key={pc.id} transform={`translate(${cx * VW} ${cy * VH})`}>
            <circle r={34} fill={ok ? T.green : T.danger} stroke="#fff" strokeWidth={5} />
            <text textAnchor="middle" dominantBaseline="central" fontSize={40} fontWeight={800} fill="#fff">{ok ? "✓" : "✗"}</text>
          </g>
        )
      })}
    </svg>
  )
}

// Where a piece sits, as a small diagram beside its box.
function PieceIcon({ cut, index }: { cut: Cut; index: number }) {
  return (
    <svg viewBox="0 0 40 30" width={28} height={21} aria-hidden style={{ flexShrink: 0, display: "block" }}>
      {CUTS[cut].map((pc, i) => (
        <polygon key={pc.id} points={pts(pc.poly, 40, 30)} fill={i === index ? ACC : T.surface} stroke={T.lineHi} strokeWidth={1} strokeLinejoin="round" />
      ))}
    </svg>
  )
}

// Once a piece is named, the input is replaced by this chip (name + clear ✕).
function SelectedChip({ flag, onClear }: { flag: FlagRecord; onClear: () => void }) {
  return (
    <div className="px-3 py-2.5 rounded-xl flex items-center gap-3"
      style={{ background: T.surface, border: `1.5px solid ${tint(ACC, 0.45)}` }}>
      <img src={flag.flagUrl} alt="" style={{ width: 38, height: 25, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
      <span style={{ color: T.text, fontWeight: 700, fontSize: 17, flex: 1, minWidth: 0, lineHeight: 1.1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{flag.name}</span>
      <button onClick={onClear} aria-label={`Clear ${flag.name}`}
        className="active:scale-90 transition-all"
        style={{ width: 36, height: 36, borderRadius: 999, background: T.surfaceHi, border: `1px solid ${T.line}`, color: T.muted, fontSize: 14, flexShrink: 0 }}>✕</button>
    </div>
  )
}

// Small inline autocomplete (same pattern as The Crop / The Peel)
function FlagInput({ placeholder, label, onPick, onFocus, onBlur }: {
  placeholder: string; label: string; onPick: (f: FlagRecord) => void; onFocus: () => void; onBlur: () => void
}) {
  const [input, setInput] = useState("")
  const [show, setShow] = useState(false)
  const [maybe, setMaybe] = useState<FlagRecord[]>([])
  const matches = useMemo(() => matchNames(FLAGS, input, 5), [input])
  const pick = (f: FlagRecord) => { onPick(f); setInput(""); setShow(false); setMaybe([]) }
  return (
    <div className="relative w-full">
      <input aria-label={label} value={input} autoComplete="off"
        onChange={e => { setInput(e.target.value); setShow(true); setMaybe([]) }}
        onFocus={() => { setShow(true); onFocus() }} onBlur={() => { setTimeout(() => setShow(false), 150); onBlur() }}
        onKeyDown={e => {
          if (e.key !== "Enter") return
          const p = pickOnEnter(matches, input)
          if (p) pick(p); else if (!matches.length) setMaybe(didYouMean(FLAGS, input))
        }}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl outline-none font-semibold"
        style={{ background: T.surface, border: `1.5px solid ${T.line}`, color: T.text, fontSize: 16 }} />
      {show && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20"
          style={{ background: T.surface, border: `1px solid ${T.line}`, boxShadow: `0 8px 32px ${tint(T.text, 0.18)}` }}>
          {matches.map(f => (
            <button key={f.code} onMouseDown={() => pick(f)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:brightness-95"
              style={{ background: "transparent", borderBottom: `1px solid ${T.line}` }}>
              <img src={f.flagUrl} alt="" style={{ width: 30, height: 20, objectFit: "cover", borderRadius: 3 }} />
              <span style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{f.name}</span>
            </button>
          ))}
        </div>
      )}
      <DidYouMean options={maybe} onPick={pick} accent={ACC} />
    </div>
  )
}

function FrankenflagGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  // Rounds are dealt one after another in the background: each needs its
  // flags' pixels to skip plain pieces. Only an unready current round waits.
  const [rounds, setRounds] = useState<(Round | undefined)[]>([])
  useEffect(() => {
    let live = true
    const taken = new Set<string>()
    ;(async () => {
      for (let i = 0; i < ROUNDS; i++) {
        const r = await buildRound(cutForRound(i), taken)
        if (!live) return
        setRounds(rs => { const n = [...rs]; n[i] = r; return n })
      }
    })()
    return () => { live = false }
  }, [])

  const [idx, setIdx] = useState(0)
  const [guesses, setGuesses] = useState<(FlagRecord | null)[]>([])
  const [focus, setFocus] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  // Which pieces were right: the exact flag, or one whose piece looks the same.
  const [ok, setOk] = useState<boolean[]>([])
  const [checking, setChecking] = useState(false)
  const [scores, setScores] = useState<number[]>([]) // pieces named per round
  const [done, setDone] = useState(false)
  const [best, setBest] = useState(loadBest)
  const [newBest, setNewBest] = useState(false)

  const round = rounds[idx]
  const pieces = round ? CUTS[round.cut] : []

  const setGuess = (i: number, f: FlagRecord | null) => setGuesses(g => { const n = [...g]; n[i] = f; return n })

  const check = async () => {
    if (!round || checking || checked) return
    setChecking(true)
    const res = await Promise.all(pieces.map((pc, i) => {
      const g = guesses[i]
      return g ? samePiece(g.flagUrl, round.flags[i].flagUrl, pc) : Promise.resolve(false)
    }))
    setOk(res)
    setScores(s => [...s, res.filter(Boolean).length])
    setChecked(true)
    setChecking(false)
  }
  const next = () => {
    if (idx + 1 >= ROUNDS) {
      const total = scores.reduce((a, b) => a + b, 0)
      if (total > best) { setBest(total); saveBest(total); setNewBest(true) }
      setDone(true)
      return
    }
    setIdx(i => i + 1); setGuesses([]); setOk([]); setFocus(null); setChecked(false)
  }

  if (done) {
    const total = scores.reduce((a, b) => a + b, 0)
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title="Frankenflag" subtitle="Results" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3">
          <ResultCard>
            <ResultHeader icon="frankenflag" accent={ACC} eyebrow={newBest ? "New best!" : undefined}
              title={`${total} of ${TOTAL_PIECES} pieces named`} score="Halves, a diagonal, thirds, then quarters" />
            <ResultStats stats={[
              { label: "This game", value: total, accent: ACC },
              { label: "Best", value: best, accent: newBest ? T.green : T.text },
            ]} />
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={ACC}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  const named = guesses.some(Boolean)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Frankenflag" subtitle={`Round ${idx + 1} / ${ROUNDS}${round ? ` · ${CUT_NAME[round.cut]}` : ""}`} onBack={onBack} />

      <div className="flex flex-col items-center px-5 gap-4 pb-8">
        <p className="text-xs text-center" style={{ color: T.muted, minHeight: 16 }}>{round ? HOW[round.cut] : ""}</p>

        {/* Composite flag */}
        <div style={{ width: 280, height: 210, borderRadius: 12, overflow: "hidden", border: `2px solid ${T.line}`, boxShadow: `0 6px 18px ${tint(T.text, 0.18)}`, background: T.surface }}>
          {round
            ? <Composite round={round} focus={focus} results={checked ? ok : null} />
            : <div role="status" className="w-full h-full flex items-center justify-center text-sm" style={{ color: T.muted }}>Stitching flags…</div>}
        </div>

        {/* Inputs / results */}
        {round && (
          <div className="w-full max-w-sm flex flex-col gap-3">
            {pieces.map((pc, i) => {
              const g = guesses[i] ?? null
              const answer = round.flags[i]
              const right = checked && ok[i]
              return (
                <div key={`${idx}-${pc.id}`}>
                  <div className="text-xs font-semibold mb-1 flex items-center gap-2" style={{ color: ACC }}>
                    <PieceIcon cut={round.cut} index={i} />{pc.label}
                  </div>
                  {checked
                    ? <div className="px-4 py-3 rounded-xl font-semibold flex items-center justify-between gap-3"
                        style={{ background: T.surface, border: `1.5px solid ${right ? T.green : T.danger}`, color: T.text }}>
                        <span>{answer.name}</span>
                        <span style={{ color: right ? T.green : T.danger, textAlign: "right" }}>
                          {right ? (g?.code === answer.code ? "✓" : `✓ (${g?.name} looks the same)`) : `✗ (you: ${g?.name ?? "—"})`}
                        </span>
                      </div>
                    : g
                      ? <SelectedChip flag={g} onClear={() => setGuess(i, null)} />
                      : <FlagInput placeholder={`Name the ${pc.label.toLowerCase()}…`} label={`${pc.label}: type a country`}
                          onPick={f => { setGuess(i, f); setFocus(null) }} onFocus={() => setFocus(i)} onBlur={() => setFocus(f => f === i ? null : f)} />}
                </div>
              )
            })}
          </div>
        )}

        {!checked ? (
          <PrimaryButton onClick={check} disabled={!round || !named || checking} accent={ACC} style={{ maxWidth: 384 }}>
            {checking ? "Checking…" : "Check →"}
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={next} accent={ACC} style={{ maxWidth: 384 }}>
            {idx + 1 >= ROUNDS ? "See results →" : "Next →"}
          </PrimaryButton>
        )}
      </div>
    </div>
  )
}

export default function FrankenflagScreen({ onBack }: Props) {
  const [replayKey, setReplayKey] = useState(0)
  return <FrankenflagGame key={replayKey} onBack={onBack} onReplay={() => setReplayKey(k => k + 1)} />
}
