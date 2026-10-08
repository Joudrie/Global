import { useState, useMemo, useEffect } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { flagSources } from "./FlagImage"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"
import { LineIcon } from "./icons"
import { Flame, Thermometer, Snowflake } from "lucide-react"
import { matchNames, pickOnEnter } from "../utils/pickOnEnter"

const ACC = ACCENT.play

interface Props { onBack: () => void }

// One tile of the 3×3 puzzle. Uses CSS background slicing (backgroundSize +
// backgroundPosition) rather than an offset <img>, which renders the correct
// slice reliably in every browser. Falls back through the source chain on error.
function FlagSlice({ code, col, row, w, h }: { code: string; col: number; row: number; w: number; h: number }) {
  const sources = useMemo(() => flagSources(code), [code])
  const [i, setI] = useState(0)
  useEffect(() => { setI(0) }, [code])
  const url = sources[Math.min(i, sources.length - 1)]
  useEffect(() => {
    const img = new Image()
    img.onerror = () => setI(x => (x < sources.length - 1 ? x + 1 : x))
    img.src = url
  }, [url, sources.length])
  return (
    <div style={{
      position: "absolute", inset: 0,
      backgroundColor: T.surfaceHi,
      backgroundImage: `url(${url})`,
      backgroundSize: `${w * 3}px ${h * 3}px`,
      backgroundPosition: `${-col * w}px ${-row * h}px`,
      backgroundRepeat: "no-repeat",
    }} />
  )
}

// ── Tile layout ──────────────────────────────────────────────────────────────
// 3×3 grid positions, labelled by warmth slot allocation:
//  corners  = indices 0,2,6,8  (cold guess = different region)
//  edges    = indices 1,3,5,7  (warm guess = same region)
//  center   = index   4        (hot  guess = confusable / same sub-region)
const CORNER_IDX = [0, 2, 6, 8]
const EDGE_IDX   = [1, 3, 5, 7]
const CENTER_IDX = [4]

function warmth(guess: FlagRecord, target: FlagRecord): 'hot' | 'warm' | 'cold' {
  if (guess.code === target.code) return 'hot'
  if (target.confusableWith?.includes(guess.code)) return 'hot'
  if (guess.region === target.region) return 'warm'
  return 'cold'
}

function pickFrom(pool: number[], flipped: Set<number>): number | null {
  const avail = pool.filter(i => !flipped.has(i))
  if (avail.length === 0) return null
  return avail[Math.floor(Math.random() * avail.length)]
}

function nextTile(level: 'hot' | 'warm' | 'cold', flipped: Set<number>): number {
  if (level === 'hot')  return pickFrom(CENTER_IDX, flipped) ?? pickFrom(EDGE_IDX, flipped) ?? pickFrom(CORNER_IDX, flipped) ?? 0
  if (level === 'warm') return pickFrom(EDGE_IDX, flipped)   ?? pickFrom(CORNER_IDX, flipped) ?? pickFrom(CENTER_IDX, flipped) ?? 0
  return                       pickFrom(CORNER_IDX, flipped) ?? pickFrom(EDGE_IDX, flipped)   ?? pickFrom(CENTER_IDX, flipped) ?? 0
}

// ── Game state ───────────────────────────────────────────────────────────────
interface GameState {
  target: FlagRecord
  flipped: Set<number>  // tile indices 0-8 that have been revealed
  guesses: { flag: FlagRecord; level: 'hot' | 'warm' | 'cold' }[]
  solved: boolean
  gaveUp: boolean
}

function freshGame(): GameState {
  return {
    target: FLAGS[Math.floor(Math.random() * FLAGS.length)],
    flipped: new Set(),
    guesses: [],
    solved: false,
    gaveUp: false,
  }
}

const TILE_W = 90
const TILE_H = 60

export default function TheComposerScreen({ onBack }: Props) {
  const [game, setGame] = useState<GameState>(freshGame)

  // Type-in
  const [input, setInput]       = useState("")
  const [showDrop, setShowDrop] = useState(false)

  const matches = useMemo(() => {
    return matchNames(FLAGS, input, 6)
  }, [input])

  const handleGuess = (flag: FlagRecord) => {
    setInput("")
    setShowDrop(false)

    if (flag.code === game.target.code) {
      const allFlipped = new Set([0,1,2,3,4,5,6,7,8])
      setGame(g => ({
        ...g,
        flipped: allFlipped,
        guesses: [...g.guesses, { flag, level: 'hot' }],
        solved: true,
      }))
      return
    }

    const level = warmth(flag, game.target)
    const tile  = nextTile(level, game.flipped)
    setGame(g => {
      const newFlipped = new Set(g.flipped)
      newFlipped.add(tile)
      return { ...g, flipped: newFlipped, guesses: [...g.guesses, { flag, level }] }
    })
  }

  const handleGiveUp = () => {
    setGame(g => ({ ...g, flipped: new Set([0,1,2,3,4,5,6,7,8]), gaveUp: true }))
  }

  const handleNewGame = () => {
    setGame(freshGame())
    setInput("")
    setShowDrop(false)
  }

  const { target, flipped, guesses, solved, gaveUp } = game
  const done = solved || gaveUp
  const pts  = solved ? Math.max(1000 - (guesses.length - 1) * 100, 100) : 0

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: T.bg, minHeight: "100vh", color: T.text }}>

      <ScreenHeader title="Tile Flipper" onBack={onBack}
        subtitle={
          <span style={{ color: ACC }}>
            {done
              ? (solved ? `Solved in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'} · ${pts} pts` : target.name)
              : `${flipped.size}/9 tiles revealed`}
          </span>
        } />

      <div className="flex flex-col items-center px-5 gap-4">

        {/* 3×3 tile grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: 3, borderRadius: 14, overflow: 'hidden',
          border: done
            ? `2px solid ${solved ? T.green : T.danger}`
            : `2px solid ${T.line}`,
          boxShadow: `0 12px 32px -14px ${tint(T.text, 0.5)}`,
          width: TILE_W * 3 + 3 * 2 + 2,
        }}>
          {Array.from({ length: 9 }).map((_, i) => {
            const row = Math.floor(i / 3)
            const col = i % 3
            const revealed = flipped.has(i)
            return (
              <div key={i} style={{ width: TILE_W, height: TILE_H, position: 'relative', overflow: 'hidden', perspective: 620 }}>
                {/* the correct flag slice for this tile (always mounted) */}
                <FlagSlice code={target.code} col={col} row={row} w={TILE_W} h={TILE_H} />
                {/* face-down cover that flips away when the tile is revealed */}
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  // Face-down cover is game content: it must stay opaque so the slice
                  // underneath is hidden — ink-dark fill instead of the old purple.
                  background: T.text,
                  transformOrigin: 'left center',
                  backfaceVisibility: 'hidden',
                  transform: revealed ? 'rotateY(-92deg)' : 'rotateY(0deg)',
                  opacity: revealed ? 0 : 1,
                  transition: `transform 0.5s ${(row + col) * 45}ms cubic-bezier(0.2,0.7,0.2,1), opacity 0.2s ${(row + col) * 45 + 280}ms ease`,
                  pointerEvents: 'none',
                }}>
                  <span style={{ display: 'flex', opacity: 0.4 }}><LineIcon name="composer" size={18} color={T.bg} /></span>
                </div>
              </div>
            )
          })}
        </div>

        {!done && guesses.length === 0 && (
          <p className="text-xs text-center" style={{ color: T.muted, maxWidth: 280 }}>
            Guess the flag. Each guess flips a tile — closer guesses flip better tiles!
          </p>
        )}

        {/* Guess history */}
        {guesses.length > 0 && !done && (
          <div className="w-full max-w-sm flex flex-col gap-1.5">
            {[...guesses].reverse().slice(0, 4).map((g, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                <img src={g.flag.flagUrl} alt="" style={{ width: 28, height: 18, objectFit: 'cover', borderRadius: 3 }} />
                <span style={{ color: T.text, fontSize: 13, fontWeight: 600, flex: 1 }}>{g.flag.name}</span>
                <span style={{ display: 'flex' }}>
                  {g.level === 'hot' ? <Flame size={15} color={T.warm} strokeWidth={1.6} absoluteStrokeWidth />
                    : g.level === 'warm' ? <Thermometer size={15} color={T.gold} strokeWidth={1.6} absoluteStrokeWidth />
                    : <Snowflake size={15} color={ACCENT.learn} strokeWidth={1.6} absoluteStrokeWidth />}
                </span>
                <span style={{ fontSize: 11, color: T.muted }}>
                  {g.level === 'hot' ? 'Hot' : g.level === 'warm' ? 'Warm' : 'Cold'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Result card */}
        {done && (
          <ResultCard style={{ width: "100%", maxWidth: 384 }}>
            <ResultHeader icon={solved ? (guesses.length <= 3 ? "trophy" : "check") : "x"}
              accent={solved ? (guesses.length <= 3 ? T.gold : T.green) : T.danger}
              eyebrow={solved ? `${pts} pts` : "Gave up"}
              title={target.name}
              score={<>{guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}{target.distinguishingTip && <><br /><i>{target.distinguishingTip}</i></>}</>} />
          </ResultCard>
        )}

        {/* Type-in */}
        {!done && (
          <div className="w-full max-w-sm relative">
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setShowDrop(true) }}
              onKeyDown={e => {
                if (e.key === "Enter") { const pick = pickOnEnter(matches, input); if (pick) handleGuess(pick) }
                if (e.key === "Escape") { setInput(""); setShowDrop(false) }
              }}
              onFocus={() => setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              placeholder="Type a country name or code…"
              autoComplete="off"
              className="w-full px-4 py-3.5 rounded-xl outline-none font-semibold"
              style={{ background: T.surface, border: `1.5px solid ${T.line}`, color: T.text, fontSize: 15 }}
            />
            {showDrop && matches.length > 0 && (
              <div className="absolute left-0 right-0 bottom-full mb-1 rounded-xl overflow-hidden z-10"
                style={{ background: T.surface, border: `1px solid ${T.line}`, boxShadow: `0 -8px 32px ${tint(T.text, 0.25)}` }}>
                {matches.map(flag => (
                  <button key={flag.code}
                    onMouseDown={() => handleGuess(flag)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:brightness-125 transition-all"
                    style={{ background: "transparent", borderBottom: `1px solid ${T.line}` }}>
                    <img src={flag.flagUrl} alt="" style={{ width: 32, height: 21, objectFit: "cover", borderRadius: 3 }} />
                    <span style={{ color: T.text, fontWeight: 600 }}>{flag.name}</span>
                    <span style={{ color: T.dim, fontSize: 11, marginLeft: "auto" }}>{flag.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!done && guesses.length >= 3 && (
          <button onClick={handleGiveUp}
            className="text-xs px-4 py-2 rounded-full font-semibold transition-all active:scale-95"
            style={{ background: T.surface, border: `1px solid ${tint(T.danger, 0.3)}`, color: T.danger }}>
            Give up
          </button>
        )}

        {done && (
          <div className="w-full max-w-sm flex flex-col gap-3">
            <PrimaryButton onClick={handleNewGame} accent={ACC}>New flag</PrimaryButton>
            <SecondaryButton onClick={onBack}>Home</SecondaryButton>
          </div>
        )}
      </div>
    </div>
  )
}
