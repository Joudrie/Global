import { useState, useMemo, useEffect } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { flagSources } from "./FlagImage"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, ResultStats, PrimaryButton, SecondaryButton, DidYouMean } from "./gameUi"
import { LineIcon } from "./icons"
import { Flame, Thermometer, Snowflake } from "lucide-react"
import { didYouMean, matchNames, pickOnEnter } from "../utils/pickOnEnter"
import {
  BEST_KEY, BOARD_BORDER, BOARD_MAX, TILE_GAP, betterBest, gridFor, levelPoints, nextTile, parseBest, pickFlag, tileBands,
} from "../utils/tileFlipper"
import type { Best, Warmth } from "../utils/tileFlipper"

const ACC = ACCENT.play

interface Props { onBack: () => void }

const calm = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches

function loadBest(): Best {
  try { return parseBest(localStorage.getItem(BEST_KEY)) } catch { return { level: 0, score: 0 } }
}
function saveBest(b: Best) {
  try { localStorage.setItem(BEST_KEY, JSON.stringify(b)) } catch { /* private mode: keep it for this visit */ }
}

// The flag image for a round, falling back through the source chain on error.
function useFlagUrl(code: string): string {
  const sources = useMemo(() => flagSources(code), [code])
  const [fail, setFail] = useState({ code, i: 0 })
  const i = fail.code === code ? fail.i : 0
  const url = sources[Math.min(i, sources.length - 1)]
  useEffect(() => {
    const img = new Image()
    img.onerror = () => setFail(f => {
      const at = f.code === code ? f.i : 0
      return { code, i: at < sources.length - 1 ? at + 1 : at }
    })
    img.src = url
  }, [url, code, sources.length])
  return url
}

// One tile: its slice of the flag by CSS background slicing (the image is
// cols × rows tiles big and shifted so this tile's part shows), which renders
// the right slice in every browser.
function FlagSlice({ url, col, row, cols, rows }: { url: string; col: number; row: number; cols: number; rows: number }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      backgroundColor: T.surfaceHi,
      backgroundImage: `url(${url})`,
      backgroundSize: `${cols * 100}% ${rows * 100}%`,
      backgroundPosition: `${cols > 1 ? (col / (cols - 1)) * 100 : 0}% ${rows > 1 ? (row / (rows - 1)) * 100 : 0}%`,
      backgroundRepeat: "no-repeat",
    }} />
  )
}

function warmth(guess: FlagRecord, target: FlagRecord): Warmth {
  if (guess.code === target.code) return "hot"
  if (target.confusableWith?.includes(guess.code)) return "hot"
  if (guess.region === target.region) return "warm"
  return "cold"
}

// ── Game state: a run of levels, each a bigger grid ─────────────────────────
interface GameState {
  level: number
  /** Points banked in this run so far. */
  runScore: number
  /** Flags already shown in this run. */
  used: string[]
  /** Bumped every round, so the board remounts face down (no flip-back animation that would show the next flag). */
  round: number
  target: FlagRecord
  flipped: Set<number>
  guesses: { flag: FlagRecord; level: Warmth }[]
  solved: boolean
  gaveUp: boolean
  /** Points for this level, once solved. */
  pts: number
}

function roundAt(level: number, runScore: number, used: string[], round: number): GameState {
  const target = pickFlag(FLAGS, level, new Set(used))
  return { level, runScore, used: [...used, target.code], round, target, flipped: new Set(), guesses: [], solved: false, gaveUp: false, pts: 0 }
}

const allTiles = (n: number) => new Set(Array.from({ length: n }, (_, i) => i))

export default function TheComposerScreen({ onBack }: Props) {
  const [game, setGame] = useState<GameState>(() => roundAt(1, 0, [], 0))
  const [best, setBest] = useState<Best>(loadBest)

  // Type-in
  const [input, setInput]       = useState("")
  const [showDrop, setShowDrop] = useState(false)
  const [maybe, setMaybe] = useState<FlagRecord[]>([])

  const { level, runScore, target, flipped, guesses, solved, gaveUp, pts, round } = game
  const { cols, rows, tiles } = gridFor(level)
  const bands = useMemo(() => tileBands(cols, rows), [cols, rows])
  const url = useFlagUrl(target.code)
  const done = solved || gaveUp
  const nextGrid = gridFor(level + 1)
  const reduce = useMemo(calm, [])

  // A country can only be guessed once: a repeat would flip another tile and cost points.
  const matches = useMemo(() => {
    const guessed = new Set(guesses.map(g => g.flag.code))
    return matchNames(FLAGS.filter(f => !guessed.has(f.code)), input, 6)
  }, [input, guesses])

  const record = (b: Best) => {
    const merged = betterBest(best, b)
    if (merged.level !== best.level || merged.score !== best.score) { setBest(merged); saveBest(merged) }
  }

  const handleGuess = (flag: FlagRecord) => {
    setInput("")
    setShowDrop(false)
    setMaybe([])
    if (done) return

    if (flag.code === target.code) {
      const won = levelPoints(level, guesses.length, tiles)
      // Solving level N reaches level N+1.
      record({ level: level + 1, score: runScore + won })
      setGame(g => ({
        ...g, flipped: allTiles(tiles), guesses: [...g.guesses, { flag, level: "hot" }],
        solved: true, pts: won, runScore: g.runScore + won,
      }))
      return
    }

    const heat = warmth(flag, target)
    const tile = nextTile(bands, heat, flipped)
    const nowFlipped = new Set(flipped)
    if (tile !== null) nowFlipped.add(tile)
    // Every tile open: the round is lost and the run is over.
    const out = nowFlipped.size >= tiles
    if (out) record({ level, score: runScore })
    setGame(g => ({ ...g, flipped: nowFlipped, guesses: [...g.guesses, { flag, level: heat }], gaveUp: out }))
  }

  const handleGiveUp = () => {
    record({ level, score: runScore })
    setGame(g => ({ ...g, flipped: allTiles(tiles), gaveUp: true }))
  }

  const reset = (g: GameState) => { setGame(g); setInput(""); setShowDrop(false); setMaybe([]) }
  const handleNextLevel = () => reset(roundAt(level + 1, runScore, game.used, round + 1))
  const handleNewRun = () => reset(roundAt(1, 0, [], round + 1))

  // Reveal-all after a round sweeps from the top-left corner; a single flip doesn't wait.
  const step = Math.min(45, 270 / Math.max(1, cols + rows - 2))
  const iconSize = cols <= 4 ? 18 : 15
  const newBest = gaveUp && runScore > 0 && runScore >= best.score

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: T.bg, minHeight: "100vh", color: T.text }}>

      <ScreenHeader title="Tile Flipper" onBack={onBack}
        subtitle={
          <span>
            <span style={{ color: ACC, fontWeight: 600 }}>Level {level} · {cols}×{rows}</span>
            {best.level > 0 && <> · <span style={{ whiteSpace: "nowrap" }}>Best level {best.level}</span></>}
          </span>
        }
        right={<HeaderStat accent={ACC}>{runScore.toLocaleString()} pts</HeaderStat>} />

      <div className="flex flex-col items-center px-5 pb-10 gap-4">

        {/* The board: the flag's 4:3 shape (content box) at every level; only the
            tiles shrink. Tiles meet edge to edge; the gap lines are drawn on top. */}
        <div key={round} role="img"
          aria-label={done ? `${target.name} flag` : `Hidden flag, ${flipped.size} of ${tiles} tiles turned`}
          style={{
            position: "relative", display: "grid", boxSizing: "content-box",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            borderRadius: 14, overflow: "hidden",
            border: `${BOARD_BORDER}px solid ${done ? (solved ? T.green : T.danger) : T.line}`,
            boxShadow: `0 12px 32px -14px ${tint(T.text, 0.5)}`,
            width: `calc(100% - ${2 * BOARD_BORDER}px)`, maxWidth: BOARD_MAX - 2 * BOARD_BORDER, aspectRatio: "4 / 3",
          }}>
          {Array.from({ length: tiles }).map((_, i) => {
            const row = Math.floor(i / cols)
            const col = i % cols
            const revealed = flipped.has(i)
            const delay = done ? (row + col) * step : 0
            return (
              <div key={i} style={{ position: "relative", overflow: "hidden", perspective: 620, minWidth: 0, minHeight: 0 }}>
                {/* the correct flag slice for this tile (always mounted) */}
                <FlagSlice url={url} col={col} row={row} cols={cols} rows={rows} />
                {/* face-down cover that flips away when the tile is revealed */}
                <div style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  // Face-down cover is game content: it must stay opaque so the slice
                  // underneath is hidden.
                  background: T.text,
                  transformOrigin: "left center",
                  backfaceVisibility: "hidden",
                  transform: revealed ? "rotateY(-92deg)" : "rotateY(0deg)",
                  opacity: revealed ? 0 : 1,
                  transition: reduce ? "none" : `transform 0.5s ${delay}ms cubic-bezier(0.2,0.7,0.2,1), opacity 0.2s ${delay + 280}ms ease`,
                  pointerEvents: "none",
                }}>
                  <span style={{ display: "flex", opacity: 0.4 }}><LineIcon name="composer" size={iconSize} color={T.bg} /></span>
                </div>
              </div>
            )
          })}
          {Array.from({ length: cols - 1 }, (_, c) => (
            <span key={`c${c}`} aria-hidden style={{ position: "absolute", zIndex: 1, top: 0, bottom: 0, width: TILE_GAP,
              left: `calc(${((c + 1) / cols) * 100}% - ${TILE_GAP / 2}px)`, background: T.bg, pointerEvents: "none" }} />
          ))}
          {Array.from({ length: rows - 1 }, (_, r) => (
            <span key={`r${r}`} aria-hidden style={{ position: "absolute", zIndex: 1, left: 0, right: 0, height: TILE_GAP,
              top: `calc(${((r + 1) / rows) * 100}% - ${TILE_GAP / 2}px)`, background: T.bg, pointerEvents: "none" }} />
          ))}
        </div>

        {!done && guesses.length === 0 && (
          <div className="text-xs text-center flex flex-col gap-1" style={{ color: T.muted, maxWidth: 300 }}>
            <p>
              {level === 1
                ? "Guess the flag. Each guess flips a tile — closer guesses flip better tiles!"
                : `Level ${level}: ${tiles} tiles. Guess the flag before every tile is turned.`}
            </p>
            {level === 1 && best.level > 0 && (
              <p style={{ color: T.text, fontWeight: 600 }}>Best: level {best.level} · {best.score.toLocaleString()} pts</p>
            )}
          </div>
        )}

        {/* Guess history */}
        {guesses.length > 0 && !done && (
          <div className="w-full max-w-sm flex flex-col gap-1.5">
            <p className="text-xs text-center" style={{ color: T.muted }}>{flipped.size} of {tiles} tiles turned</p>
            {[...guesses].reverse().slice(0, 4).map((g, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                <img src={g.flag.flagUrl} alt="" style={{ width: 28, height: 18, objectFit: "cover", borderRadius: 3 }} />
                <span style={{ color: T.text, fontSize: 13, fontWeight: 600, flex: 1 }}>{g.flag.name}</span>
                <span style={{ display: "flex" }}>
                  {g.level === "hot" ? <Flame size={15} color={T.warm} strokeWidth={1.6} absoluteStrokeWidth />
                    : g.level === "warm" ? <Thermometer size={15} color={T.gold} strokeWidth={1.6} absoluteStrokeWidth />
                    : <Snowflake size={15} color={ACCENT.learn} strokeWidth={1.6} absoluteStrokeWidth />}
                </span>
                <span style={{ fontSize: 11, color: T.muted }}>
                  {g.level === "hot" ? "Hot" : g.level === "warm" ? "Warm" : "Cold"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Result card */}
        {solved && (
          <ResultCard style={{ width: "100%", maxWidth: 384 }}>
            <ResultHeader icon={guesses.length <= 3 ? "trophy" : "check"}
              accent={guesses.length <= 3 ? T.gold : T.green}
              eyebrow={`Level ${level} cleared · +${pts.toLocaleString()} pts`}
              title={target.name}
              score={<>{guesses.length} {guesses.length === 1 ? "guess" : "guesses"}{target.distinguishingTip && <><br /><i>{target.distinguishingTip}</i></>}</>} />
          </ResultCard>
        )}
        {gaveUp && (
          <ResultCard style={{ width: "100%", maxWidth: 384 }}>
            <ResultHeader icon="x" accent={T.danger}
              eyebrow="Run over"
              title={target.name}
              score={<>{target.distinguishingTip ? <i>{target.distinguishingTip}</i> : `It was ${target.name}.`}</>} />
            <ResultStats stats={[
              { label: "Level reached", value: level },
              { label: "Run score", value: runScore.toLocaleString(), accent: ACC },
            ]} />
            <p className="text-sm text-center" style={{ color: newBest ? T.gold : T.muted, fontWeight: newBest ? 700 : 400 }}>
              {newBest ? "New best: " : "Best: "}level {best.level} · {best.score.toLocaleString()} pts
            </p>
          </ResultCard>
        )}

        {/* Type-in */}
        {!done && (
          <div className="w-full max-w-sm relative">
            <input aria-label="Type a country"
              value={input}
              onChange={e => { setInput(e.target.value); setShowDrop(true); setMaybe([]) }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const pick = pickOnEnter(matches, input)
                  if (pick) handleGuess(pick)
                  else if (!matches.length) setMaybe(didYouMean(FLAGS, input).filter(f => !guesses.some(g => g.flag.code === f.code)))
                }
                if (e.key === "Escape") { setInput(""); setShowDrop(false); setMaybe([]) }
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
                    <span style={{ color: T.text, fontWeight: 600 }}>{flag.name}</span>
                    <span style={{ color: T.dim, fontSize: 11, marginLeft: "auto" }}>{flag.code}</span>
                  </button>
                ))}
              </div>
            )}
            <DidYouMean options={maybe} onPick={handleGuess} accent={ACC} />
          </div>
        )}

        {!done && guesses.length >= 3 && (
          <button onClick={handleGiveUp}
            className="text-xs px-4 py-2 rounded-full font-semibold transition-transform motion-reduce:transition-none motion-safe:active:scale-95"
            style={{ background: T.surface, border: `1px solid ${tint(T.danger, 0.3)}`, color: T.danger }}>
            Give up
          </button>
        )}

        {done && (
          <div className="w-full max-w-sm flex flex-col gap-3">
            {solved
              ? <PrimaryButton onClick={handleNextLevel} accent={ACC}>Next level · {nextGrid.cols}×{nextGrid.rows} →</PrimaryButton>
              : <PrimaryButton onClick={handleNewRun} accent={ACC}>New run</PrimaryButton>}
            <SecondaryButton onClick={onBack}>Home</SecondaryButton>
          </div>
        )}
      </div>
    </div>
  )
}
