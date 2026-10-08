import { useRef, useState } from "react"
import { FLAGS, REGIONS, getFlagsByRegion } from "../data/flags"
import type { FlagRecord, Region } from "../data/flags"
import { T, ACCENT, FONT } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"
import { LineIcon } from "./icons"

interface Props { onBack: () => void }

type Scope = "World" | Region
const SCOPES: Scope[] = ["World", ...REGIONS]

// Largest power of two ≤ n, capped at 16.
function fieldSize(n: number): number {
  let s = 2
  while (s * 2 <= n && s < 16) s *= 2
  return s
}

interface Match { a: FlagRecord; b: FlagRecord; winnerCode: string; roundSize: number }

const shuffle = <X,>(a: X[]): X[] => {
  const c = [...a]
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]]
  }
  return c
}
const roundName = (n: number) =>
  n === 2 ? "Final" : n === 4 ? "Semi-finals" : n === 8 ? "Quarter-finals" : n === 16 ? "Round of 16" : `Round of ${n}`

function FlagChoice({ flag, onPick }: { flag: FlagRecord; onPick: (f: FlagRecord) => void }) {
  return (
    <button onClick={() => onPick(flag)}
      className="w-full max-w-sm rounded-2xl overflow-hidden transition-all active:scale-95 geo-tap"
      style={{ border: `2px solid ${T.line}`, background: T.surface }}>
      {/* contain (not cover) so no flag edges get cropped off */}
      <img src={flag.flagUrl} alt={flag.name}
        style={{ width: "100%", height: 150, objectFit: "contain", display: "block", background: T.void }}
        onError={e => { (e.target as HTMLImageElement).style.opacity = "0.2" }} />
      <div className="py-3 font-bold text-lg" style={{ color: T.text, fontFamily: FONT.display }}>{flag.name}</div>
    </button>
  )
}

function MiniFlag({ src, dim }: { src: string; dim?: boolean }) {
  return (
    <img src={src} alt="" style={{ width: 34, height: 22, objectFit: "cover", borderRadius: 3, opacity: dim ? 0.3 : 1, border: `1px solid ${T.line}` }}
      onError={e => { (e.target as HTMLImageElement).style.opacity = "0.2" }} />
  )
}

function BracketGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [scope, setScope] = useState<Scope | null>(null)
  const [full, setFull] = useState(false)   // false = top 16, true = whole pool
  const [field, setField] = useState<FlagRecord[]>([])
  const [pair, setPair] = useState(0)
  const lastPick = useRef(0)
  const [winners, setWinners] = useState<FlagRecord[]>([])
  const [champion, setChampion] = useState<FlagRecord | null>(null)
  const [history, setHistory] = useState<Match[]>([])

  const start = (s: Scope) => {
    const pool = s === "World" ? FLAGS : getFlagsByRegion(s)
    // "full" = everyone in the pool (odd counts get a bye each round); otherwise
    // the classic 16-flag bracket.
    const size = full ? pool.length : fieldSize(pool.length)
    setScope(s)
    setField(shuffle(pool).slice(0, size))
    setPair(0); setWinners([]); setChampion(null); setHistory([])
  }

  // ── scope picker ──
  if (!scope) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title="Flag Bracket" onBack={onBack} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
          <LineIcon name="flagbracket" size={48} color={ACCENT.play} />
          <p className="text-base font-bold text-center" style={{ color: T.text, fontFamily: FONT.display }}>Crown the coolest flag</p>
          <p className="text-xs text-center" style={{ color: T.muted, maxWidth: 280 }}>Pick a pool — a fresh random bracket is drawn every run.</p>

          {/* size toggle: classic 16 vs everyone in the pool */}
          <div className="inline-flex p-0.5 rounded-full" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            {([["16", false], ["Everyone", true]] as const).map(([label, v]) => (
              <button key={label} onClick={() => setFull(v)}
                className="px-4 py-1 rounded-full text-xs font-bold transition-all"
                style={{ background: full === v ? ACCENT.play : "transparent", color: full === v ? T.onAccent : T.muted }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 340 }}>
            {SCOPES.map(s => (
              <button key={s} onClick={() => start(s)}
                className="py-3.5 px-3 rounded-xl font-bold text-sm transition-all active:scale-95 geo-tap"
                style={{ background: s === "World" ? ACCENT.play : T.surface, border: s === "World" ? "none" : `1px solid ${T.line}`, color: s === "World" ? T.onAccent : T.text, gridColumn: s === "World" ? "1 / -1" : undefined }}>
                {s === "World"
                  ? <span className="inline-flex items-center justify-center gap-2"><LineIcon name="geo" size={16} color={T.onAccent} /> Random (World)</span>
                  : s}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const pick = (f: FlagRecord) => {
    // A double tap's second tap would land on the next pair as it fades in.
    const now = performance.now()
    if (now - lastPick.current < 350) return
    lastPick.current = now
    const a = field[pair * 2], b = field[pair * 2 + 1]
    setHistory(h => [...h, { a, b, winnerCode: f.code, roundSize: field.length }])
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
              <ResultHeader icon="crown" accent={T.gold} eyebrow="Your champion" title={champion.name} score={`Your coolest flag · ${scope}`} />
              <img src={champion.flagUrl} alt={champion.name}
                style={{ width: 200, height: 133, objectFit: "contain", background: T.void, borderRadius: 12, margin: "0 auto", border: `2px solid ${T.gold}` }} />
            </ResultCard>

            {/* Bracket recap */}
            <div className="rounded-2xl p-4 mb-4 text-left" style={{ background: T.surfaceHi, border: `1px solid ${T.line}` }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: T.muted }}>The Bracket</div>
              {rounds.map(rs => (
                <div key={rs} style={{ marginBottom: 12 }}>
                  <div className="text-xs font-bold mb-1.5" style={{ color: ACCENT.play }}>{roundName(rs)}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {history.filter(m => m.roundSize === rs).map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs" style={{ color: T.text }}>
                        <MiniFlag src={m.a.flagUrl} dim={m.winnerCode !== m.a.code} />
                        <span style={{ flex: 1, opacity: m.winnerCode === m.a.code ? 1 : 0.4, fontWeight: m.winnerCode === m.a.code ? 700 : 400 }}>{m.a.name}</span>
                        <span style={{ color: T.dim }}>vs</span>
                        <span style={{ flex: 1, textAlign: "right", opacity: m.winnerCode === m.b.code ? 1 : 0.4, fontWeight: m.winnerCode === m.b.code ? 700 : 400 }}>{m.b.name}</span>
                        <MiniFlag src={m.b.flagUrl} dim={m.winnerCode !== m.b.code} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <PrimaryButton onClick={onReplay} accent={ACCENT.play}>New bracket</PrimaryButton>
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
        subtitle={<span>{scope} · {roundName(field.length)} · <span style={{ fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" }}>{pair + 1}/{totalPairs}</span></span>}
        onBack={onBack} />

      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-4">
        <p className="text-sm font-semibold" style={{ color: T.muted }}>Which flag is cooler?</p>
        {/* Key by the matchup so each new pair fades in instead of hard-cutting. */}
        <div key={`${field.length}-${pair}`} className="w-full flex flex-col items-center gap-4 animate-fade-in">
          <FlagChoice flag={a} onPick={pick} />
          <div className="text-sm font-black" style={{ color: ACCENT.play, fontFamily: FONT.display }}>VS</div>
          <FlagChoice flag={b} onPick={pick} />
        </div>
      </div>
    </div>
  )
}

export default function FlagBracketScreen({ onBack }: Props) {
  const [k, setK] = useState(0)
  return <BracketGame key={k} onBack={onBack} onReplay={() => setK(n => n + 1)} />
}
