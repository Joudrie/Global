import { useState } from "react"
import { FLAGS } from "../data/flags"
import { SYMBOLS, SAFE_DECOY_IDS } from "../data/flagSymbols"
import type { SymbolDef } from "../data/flagSymbols"
import { OTHER_IDENTITY_FLAGS } from "../data/identityFlags"
import { T, ACCENT } from "../ui/tokens"
import FlagImage from "./FlagImage"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, PrimaryButton, SecondaryButton, choiceLabel } from "./gameUi"

interface Props { onBack: () => void }

const ROUNDS = 5
const GRID = 15
const shuffle = <X,>(a: X[]): X[] => [...a].sort(() => Math.random() - 0.5)
const SAFE_DECOYS = OTHER_IDENTITY_FLAGS.filter(f => SAFE_DECOY_IDS.includes(f.id) && !f.noFlag)

// A grid tile is either a real country flag (by code) or a non-country
// "identity" flag (rendered from a URL). Identity tiles are never a match —
// they're sprinkled in so players get exposed to them.
interface Cell { key: string; code?: string; url?: string; name?: string; match: boolean }
interface Round { sym: SymbolDef; grid: Cell[]; matchCount: number }

function buildRounds(): Round[] {
  return shuffle(SYMBOLS).slice(0, ROUNDS).map(sym => {
    const pool = [...sym.codes]
    const nMatch = Math.min(pool.length, 4 + Math.floor(Math.random() * 4)) // 4–7 present
    const matches = shuffle(pool).slice(0, nMatch)
    const matchCells: Cell[] = matches.map(code => ({ key: "c:" + code, code, name: FLAGS.find(f => f.code === code)?.name, match: true }))
    // 0–2 identity flags as decoys to introduce them. Only ones checked to
    // carry none of the hunt's symbols, so a decoy never has the round's symbol.
    const nIdentity = matchCells.length < GRID - 4 ? Math.floor(Math.random() * 3) : 0
    const idCells: Cell[] = shuffle(SAFE_DECOYS).slice(0, nIdentity)
      .map(f => ({ key: "i:" + f.id, url: f.flagUrl, name: f.name, match: false }))
    const need = GRID - matchCells.length - idCells.length
    // Wrong answers skip flags where the symbol is there but arguable (sym.also).
    const fillers: Cell[] = shuffle(FLAGS.filter(f => !sym.codes.has(f.code) && !sym.also.has(f.code))).slice(0, need)
      .map(f => ({ key: "c:" + f.code, code: f.code, name: f.name, match: false }))
    return { sym, grid: shuffle([...matchCells, ...idCells, ...fillers]), matchCount: matchCells.length }
  })
}

function SymbolHuntGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [rounds] = useState(buildRounds)
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [checked, setChecked] = useState(false)
  const [scores, setScores] = useState<{ hit: number; miss: number; total: number }[]>([])
  const [done, setDone] = useState(false)

  const round = rounds[idx]
  const matchKeys = new Set(round.grid.filter(c => c.match).map(c => c.key))

  const toggle = (key: string) => {
    if (checked) return
    setPicked(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  const check = () => {
    let hit = 0, miss = 0
    picked.forEach(k => matchKeys.has(k) ? hit++ : miss++)
    setScores(s => [...s, { hit, miss, total: round.matchCount }])
    setChecked(true)
  }

  const next = () => {
    if (idx + 1 >= rounds.length) { setDone(true); return }
    setIdx(i => i + 1); setPicked(new Set()); setChecked(false)
  }

  if (done) {
    const hits = scores.reduce((a, s) => a + s.hit, 0)
    const total = scores.reduce((a, s) => a + s.total, 0)
    const misses = scores.reduce((a, s) => a + s.miss, 0)
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
        <ScreenHeader title="Symbol Hunt" subtitle="Round complete" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ResultCard>
            <ResultHeader icon="symbolhunt" accent={ACCENT.play}
              title={`${hits} of ${total} symbols found`}
              score={misses ? `${misses} wrong pick${misses === 1 ? "" : "s"}` : hits ? "Flawless, no wrong picks" : "No flags picked"} />
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={ACCENT.play}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <ScreenHeader title="Symbol Hunt" subtitle="Find every flag with the symbol" onBack={onBack}
        right={<HeaderStat accent={ACCENT.play}>{idx + 1} / {ROUNDS}</HeaderStat>} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 16px 20px", gap: 14 }}>
        <div style={{ textAlign: "center" }}>
          <div className="geo-micro" style={{ fontSize: 11, color: T.muted }}>Tap every flag with</div>
          <div className="geo-display" style={{ fontWeight: 700, fontSize: 24, color: T.text }}>{round.sym.label}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9 }}>
          {round.grid.map((cell, i) => {
            const isPicked = picked.has(cell.key)
            const isMatch = cell.match
            let border = `1.5px solid ${isPicked ? ACCENT.play : T.line}`
            if (checked) {
              if (isMatch) border = `2.5px solid ${ACCENT.codex}`           // should have been picked
              else if (isPicked) border = `2.5px solid ${T.warm}`           // wrong pick
            }
            return (
              <button key={cell.key} onClick={() => toggle(cell.key)} className="geo-tap"
                aria-label={checked ? `${choiceLabel(i, round.grid.length)}: ${cell.name ?? ""}` : choiceLabel(i, round.grid.length)} aria-pressed={isPicked}
                style={{ position: "relative", aspectRatio: "3/2", borderRadius: 8, overflow: "hidden", border, background: "#fff", opacity: checked && !isMatch && !isPicked ? 0.5 : 1 }}>
                {cell.code
                  ? <FlagImage code={cell.code} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <img src={cell.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3" }} />}
                {isPicked && !checked && <span style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: ACCENT.play, color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>}
                {checked && isMatch && <span style={{ position: "absolute", bottom: 2, right: 3, fontSize: 13, color: ACCENT.codex }}>✓</span>}
                {checked && isPicked && !isMatch && <span style={{ position: "absolute", bottom: 2, right: 3, fontSize: 13, color: T.warm }}>✗</span>}
                {checked && !cell.code && <span style={{ position: "absolute", top: 2, left: 3, fontSize: 11, fontWeight: 700, color: T.warm, background: T.bg, padding: "0 4px", borderRadius: 4 }}>not a country</span>}
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: "auto" }}>
          {!checked
            ? <PrimaryButton onClick={check} accent={ACCENT.play}>Submit{picked.size ? ` (${picked.size})` : ""}</PrimaryButton>
            : <PrimaryButton onClick={next} accent={ACCENT.play}>{idx + 1 >= ROUNDS ? "See result →" : "Next →"}</PrimaryButton>}
        </div>
      </div>
    </div>
  )
}

export default function SymbolHuntScreen({ onBack }: Props) {
  const [k, setK] = useState(0)
  return <SymbolHuntGame key={k} onBack={onBack} onReplay={() => setK(n => n + 1)} />
}
