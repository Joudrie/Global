import { useState, useRef, useCallback, useEffect } from "react"
import { PUZZLES } from "../data/buildFlagPuzzles"
import type { BuildPuzzle, Piece } from "../data/buildFlagPuzzles"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { hexToRgb } from "../utils/color"
import { Palette as PaletteIcon, Brush } from "lucide-react"

const ACC = ACCENT.play

interface Props { onBack: () => void }

interface DragState {
  pieceId: string
  x: number
  y: number
}

const FLAG_W = 270
const FLAG_H = 170

// A slot is correct if the COLOUR placed matches the colour the solution wants —
// not the specific piece id. (Latvia is maroon-white-maroon: the two maroon
// pieces are interchangeable, so comparing ids would mark a valid build wrong.)
const colorOfPiece = (puzzle: BuildPuzzle, pieceId?: string) =>
  puzzle.pieces.find(p => p.id === pieceId)?.color
const slotIsCorrect = (puzzle: BuildPuzzle, placed: Record<string, string>, slotId: string) =>
  !!placed[slotId] && colorOfPiece(puzzle, placed[slotId]) === colorOfPiece(puzzle, puzzle.solution[slotId])

// ── Flag canvas renderer ─────────────────────────────────────────────────────
function FlagCanvas({
  puzzle, placed, phase, slotRefs,
  onSlotClick,
}: {
  puzzle: BuildPuzzle
  placed: Record<string, string>
  phase: 'playing' | 'result'
  slotRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
  onSlotClick: (slotId: string) => void
}) {
  const getPiece = (slotId: string): Piece | undefined =>
    puzzle.pieces.find(p => p.id === placed[slotId])

  const slotStyle = (slotId: string): React.CSSProperties => {
    const piece = getPiece(slotId)
    const isCorrect = phase === 'result' && slotIsCorrect(puzzle, placed, slotId)
    const isWrong   = phase === 'result' && !!placed[slotId] && !slotIsCorrect(puzzle, placed, slotId)
    const isEmpty   = !placed[slotId]
    return {
      background: piece ? piece.color : tint(ACC, 0.08),
      border: phase === 'playing'
        ? isEmpty ? `2px dashed ${tint(ACC, 0.4)}` : `2px solid ${tint(ACC, 0.55)}`
        : isCorrect ? `2.5px solid ${T.green}`
        : isWrong   ? `2.5px solid ${T.danger}`
        : `2px dashed ${tint(ACC, 0.25)}`,
      cursor: phase === 'playing' ? 'pointer' : 'default',
      transition: 'background 0.2s',
      position: 'relative',
      boxSizing: 'border-box',
    }
  }

  const resultOverlay = (slotId: string) => {
    if (phase !== 'result') return null
    if (!placed[slotId]) return <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color: T.danger }}>✗</span>
    const ok = slotIsCorrect(puzzle, placed, slotId)
    return <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color: ok ? T.green : T.danger }}>{ok ? '✓' : '✗'}</span>
  }

  if (puzzle.layout === 'v3') {
    return (
      <div style={{ display:'flex', width:FLAG_W, height:FLAG_H, borderRadius:8, overflow:'hidden', boxShadow:`0 8px 24px -10px ${tint(T.text, 0.45)}` }}>
        {puzzle.slots.map(s => (
          <div key={s} ref={el => { slotRefs.current[s] = el }}
            style={{ ...slotStyle(s), flex:1, height:'100%' }}
            onClick={() => onSlotClick(s)}>
            {resultOverlay(s)}
          </div>
        ))}
      </div>
    )
  }

  if (puzzle.layout === 'h3' || puzzle.layout === 'h2' || puzzle.layout === 'h4') {
    return (
      <div style={{ display:'flex', flexDirection:'column', width:FLAG_W, height:FLAG_H, borderRadius:8, overflow:'hidden', boxShadow:`0 8px 24px -10px ${tint(T.text, 0.45)}` }}>
        {puzzle.slots.map(s => (
          <div key={s} ref={el => { slotRefs.current[s] = el }}
            style={{ ...slotStyle(s), flex:1, width:'100%' }}
            onClick={() => onSlotClick(s)}>
            {resultOverlay(s)}
          </div>
        ))}
      </div>
    )
  }

  if (puzzle.layout === 'star') {
    const bg   = getPiece('bg')
    const star = getPiece('star')
    const bgOk   = phase === 'result' && slotIsCorrect(puzzle, placed, 'bg')
    const starOk = phase === 'result' && slotIsCorrect(puzzle, placed, 'star')
    const STAR_CLIP = 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)'
    return (
      <div ref={el => { slotRefs.current['bg'] = el }}
        onClick={() => onSlotClick('bg')}
        style={{
          width: FLAG_W, height: FLAG_H, borderRadius: 8,
          background: bg ? bg.color : tint(ACC, 0.08),
          border: phase === 'playing' ? `2px dashed ${tint(ACC, 0.4)}` : bgOk ? `2.5px solid ${T.green}` : `2.5px solid ${T.danger}`,
          position: 'relative', cursor: 'pointer', overflow: 'hidden',
          boxShadow: `0 8px 24px -10px ${tint(T.text, 0.45)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        {/* Star slot */}
        <div ref={el => { slotRefs.current['star'] = el }}
          onClick={e => { e.stopPropagation(); onSlotClick('star') }}
          style={{
            width: 86, height: 86,
            clipPath: STAR_CLIP, WebkitClipPath: STAR_CLIP,
            background: star ? star.color : tint(ACC, 0.25),
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {phase === 'result' && <span style={{ fontSize: 16, color: starOk ? T.green : T.danger, fontWeight: 800 }}>{starOk ? '✓' : '✗'}</span>}
        </div>
        {phase === 'result' && (
          <div style={{ position:'absolute', top:4, right:6, fontSize:16, color: bgOk ? T.green : T.danger }}>
            {bgOk ? '✓' : '✗'}
          </div>
        )}
      </div>
    )
  }

  if (puzzle.layout === 'disc') {
    const bg   = getPiece('bg')
    const disc = getPiece('disc')
    const bgOk   = phase === 'result' && slotIsCorrect(puzzle, placed, 'bg')
    const discOk = phase === 'result' && slotIsCorrect(puzzle, placed, 'disc')
    return (
      <div ref={el => { slotRefs.current['bg'] = el }}
        onClick={() => onSlotClick('bg')}
        style={{
          width: FLAG_W, height: FLAG_H, borderRadius: 8,
          background: bg ? bg.color : tint(ACC, 0.08),
          border: phase === 'playing' ? `2px dashed ${tint(ACC, 0.4)}` : bgOk ? `2.5px solid ${T.green}` : `2.5px solid ${T.danger}`,
          position: 'relative', cursor: 'pointer', overflow: 'hidden',
          boxShadow: `0 8px 24px -10px ${tint(T.text, 0.45)}`,
        }}>
        {/* Disc slot */}
        <div ref={el => { slotRefs.current['disc'] = el }}
          onClick={e => { e.stopPropagation(); onSlotClick('disc') }}
          style={{
            position: 'absolute',
            left: '50%', top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 80, height: 80, borderRadius: '50%',
            background: disc ? disc.color : tint(ACC, 0.12),
            border: phase === 'playing' ? `2px dashed ${tint(ACC, 0.4)}` : discOk ? `2.5px solid ${T.green}` : `2.5px solid ${T.danger}`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {phase === 'result' && <span style={{ fontSize:20, color: discOk ? T.green : T.danger }}>{discOk ? '✓' : '✗'}</span>}
        </div>
        {phase === 'result' && (
          <div style={{ position:'absolute', top:4, right:6, fontSize:16, color: bgOk ? T.green : T.danger }}>
            {bgOk ? '✓' : '✗'}
          </div>
        )}
      </div>
    )
  }

  return null
}

// ── Main screen ───────────────────────────────────────────────────────────────
// A puzzle's *visual identity*: layout + the colours its solution paints, in slot
// order. Different countries can share one — Romania/Chad (blue-yellow-red v3),
// Indonesia/Monaco (red-white h2) — so to the player they're the same picture.
function visualKey(pz: BuildPuzzle): string {
  const colors = pz.slots.map(s => pz.pieces.find(pc => pc.id === pz.solution[s])?.color ?? "")
  return `${pz.layout}:${colors.join(",")}`
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// Deal puzzles from a reshuffling bag: every puzzle appears once before any
// repeats, and never the same picture twice in a row. Module-level so the
// no-repeat guarantee holds across games for the whole session.
function makeDealer() {
  let bag: BuildPuzzle[] = []
  let lastKey = ""
  return (): BuildPuzzle => {
    if (bag.length === 0) bag = shuffleArr(PUZZLES)
    let next = bag.pop() as BuildPuzzle
    if (visualKey(next) === lastKey && bag.length > 0) {
      const alt = bag.pop() as BuildPuzzle
      bag.push(next)
      next = alt
    }
    lastKey = visualKey(next)
    return next
  }
}
const dealPuzzle = makeDealer()

// Piece labels sat in dark grey on every swatch, so "Red", "Blue" and "Black"
// were unreadable. Pick dark or light text from the swatch's luminance.
function isLight(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex)
  return 0.299 * r + 0.587 * g + 0.114 * b > 150
}

export default function BuildFlagScreen({ onBack }: Props) {
  const [puzzle, setPuzzle]  = useState<BuildPuzzle>(dealPuzzle)
  const [placed, setPlaced]   = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [dragging, setDragging] = useState<DragState | null>(null)
  const [phase, setPhase]     = useState<'playing' | 'result'>('playing')
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const startNewGame = () => {
    setPuzzle(dealPuzzle())
    setPlaced({})
    setSelected(null)
    setDragging(null)
    setPhase('playing')
    slotRefs.current = {}
  }

  const placedPieceIds  = new Set(Object.values(placed))
  const palette         = puzzle.pieces.filter(p => !placedPieceIds.has(p.id))
  const allSlotsFilled  = puzzle.slots.every(s => placed[s])

  const placePieceInSlot = useCallback((pieceId: string, slotId: string) => {
    setPlaced(prev => {
      const next = { ...prev }
      // Remove piece from any existing slot
      for (const k of Object.keys(next)) if (next[k] === pieceId) delete next[k]
      next[slotId] = pieceId
      return next
    })
    setSelected(null)
  }, [])

  const removeFromSlot = useCallback((slotId: string) => {
    setPlaced(prev => { const n = { ...prev }; delete n[slotId]; return n })
    setSelected(null)
  }, [])

  // Tap on palette piece
  const handlePaletteTap = (pieceId: string) => {
    setSelected(s => s === pieceId ? null : pieceId)
  }

  // Tap on a slot
  const handleSlotClick = (slotId: string) => {
    if (phase !== 'playing') return
    if (selected) {
      placePieceInSlot(selected, slotId)
    } else if (placed[slotId]) {
      removeFromSlot(slotId)
    }
  }

  // ── Drag ──────────────────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent, pieceId: string) => {
    e.preventDefault()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    setSelected(null)
    setDragging({ pieceId, x: e.clientX, y: e.clientY })
  }

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      setDragging(d => d ? { ...d, x: e.clientX, y: e.clientY } : null)
    }
    const onUp = (_e: PointerEvent) => {
      if (!dragging) return
      const { x, y, pieceId } = dragging
      for (const [slotId, ref] of Object.entries(slotRefs.current)) {
        if (!ref) continue
        const r = ref.getBoundingClientRect()
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          placePieceInSlot(pieceId, slotId)
          break
        }
      }
      setDragging(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
    }
  }, [dragging, placePieceInSlot])

  // ── Result ────────────────────────────────────────────────────────────────
  const correct = puzzle.slots.filter(s => slotIsCorrect(puzzle, placed, s)).length
  const total   = puzzle.slots.length
  const perfect = correct === total

  if (phase === 'result') {
    return (
      <div className="min-h-screen flex flex-col items-center"
        style={{ background: T.bg, minHeight: "100vh", color: T.text }}>
        <div className="w-full">
          <ScreenHeader title="Build the Flag" subtitle={puzzle.name} onBack={onBack} />
        </div>

        <div className="flex flex-col items-center px-5 gap-4 w-full max-w-sm">
          {/* Show their answer */}
          <FlagCanvas puzzle={puzzle} placed={placed} phase="result" slotRefs={slotRefs} onSlotClick={() => {}} />

          {/* Score */}
          <div className="w-full rounded-2xl p-5 text-center"
            style={{ background: T.surface, border: `1px solid ${tint(perfect ? T.green : T.danger, 0.35)}` }}>
            <div className="mb-2 flex justify-center" style={{ color: perfect ? T.green : ACC }}>
              {perfect
                ? <PaletteIcon size={36} strokeWidth={1.6} absoluteStrokeWidth />
                : <Brush size={36} strokeWidth={1.6} absoluteStrokeWidth />}
            </div>
            <div className="text-5xl font-black mb-1" style={{ color: T.text, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" }}>{correct}/{total}</div>
            <div className="text-sm" style={{ color: T.muted }}>
              {perfect ? `Perfect! That's ${puzzle.name}!` : `${correct} of ${total} bands correct for ${puzzle.name}`}
            </div>
            {/* Correct answer hint when wrong */}
            {!perfect && (
              <div className="mt-3 text-xs" style={{ color: ACC }}>
                Correct order: {puzzle.slots.map(s => {
                  const piece = puzzle.pieces.find(p => p.id === puzzle.solution[s])
                  return piece?.label
                }).join(' · ')}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button onClick={startNewGame}
              className="w-full py-3.5 rounded-xl font-bold transition-all active:scale-95"
              style={{ background: ACC, color: T.onAccent, fontFamily: FONT.display }}>
              New Flag
            </button>
            <button onClick={onBack}
              className="w-full py-3.5 rounded-xl font-bold transition-all active:scale-95"
              style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>
              ← Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Playing ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: T.bg, minHeight: "100vh", color: T.text }}
      // Prevent page scroll while dragging
      onTouchMove={dragging ? e => e.preventDefault() : undefined}>

      <ScreenHeader title="Build the Flag" subtitle={puzzle.name} onBack={onBack} />

      <div className="flex flex-col items-center gap-6 px-5" style={{ zIndex: 1 }}>
        {/* Instruction */}
        <p className="text-xs text-center" style={{ color: T.muted }}>
          {selected
            ? `"${puzzle.pieces.find(p => p.id === selected)?.label}" selected — tap a slot to place it`
            : 'Drag pieces onto the flag, or tap a piece then tap a slot'}
        </p>

        {/* Flag canvas */}
        <FlagCanvas
          puzzle={puzzle} placed={placed} phase="playing"
          slotRefs={slotRefs} onSlotClick={handleSlotClick}
        />

        {/* Slot labels */}
        <div className="flex justify-center gap-1" style={{ width: FLAG_W }}>
          {puzzle.slots.map(s => {
            const piece = puzzle.pieces.find(p => p.id === placed[s])
            return (
              <div key={s} className="flex-1 text-center text-xs py-1 rounded"
                style={{ color: piece ? ACC : T.dim, fontSize: 10 }}>
                {piece ? piece.label : s}
              </div>
            )
          })}
        </div>

        {/* Palette */}
        <div>
          <div className="text-xs mb-3 text-center font-semibold uppercase tracking-widest"
            style={{ color: T.muted }}>
            {palette.length > 0 ? "Pieces" : "All pieces placed"}
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {puzzle.pieces.map(piece => {
              const isPlaced   = placedPieceIds.has(piece.id)
              const isSelected = selected === piece.id
              return (
                <div key={piece.id}
                  onPointerDown={isPlaced ? undefined : e => handlePointerDown(e, piece.id)}
                  onClick={() => !isPlaced && handlePaletteTap(piece.id)}
                  style={{
                    width: 64, height: 44, borderRadius: 10,
                    background: isPlaced ? tint(ACC, 0.08) : piece.color,
                    border: isSelected ? `3px solid ${ACC}`
                      : isPlaced       ? `2px dashed ${tint(ACC, 0.25)}`
                      : `2px solid ${T.line}`,
                    cursor: isPlaced ? 'default' : 'grab',
                    touchAction: 'none',
                    opacity: isPlaced ? 0.25 : 1,
                    transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                    transition: 'transform 0.15s, opacity 0.2s',
                    boxShadow: isSelected ? `0 0 12px ${tint(ACC, 0.55)}` : 'none',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    paddingBottom: 4,
                    userSelect: 'none',
                  }}>
                  {!isPlaced && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: isLight(piece.color) ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.92)' }}>
                      {piece.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Confirm */}
        <button
          onClick={() => setPhase('result')}
          disabled={!allSlotsFilled}
          className="w-full max-w-sm py-3.5 rounded-xl font-bold transition-all active:scale-95"
          style={{
            background: allSlotsFilled ? ACC : T.surface,
            border: allSlotsFilled ? "none" : `1px solid ${T.line}`,
            color: allSlotsFilled ? T.onAccent : T.dim,
            cursor: allSlotsFilled ? "pointer" : "not-allowed",
            fontFamily: FONT.display,
          }}>
          {allSlotsFilled ? "Confirm →" : `Fill all ${total - Object.keys(placed).length} remaining slots`}
        </button>
      </div>

      {/* Drag ghost */}
      {dragging && (() => {
        const piece = puzzle.pieces.find(p => p.id === dragging.pieceId)
        return piece ? (
          <div style={{
            position: 'fixed',
            left: dragging.x - 32,
            top:  dragging.y - 22,
            width: 64, height: 44,
            background: piece.color,
            borderRadius: 10,
            border: '2px solid rgba(255,255,255,0.3)',
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: 0.9,
            boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
            transform: 'scale(1.12)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4,
          }}>
            <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.45)', fontWeight: 700 }}>{piece.label}</span>
          </div>
        ) : null
      })()}
    </div>
  )
}
