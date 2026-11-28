import { useState, useRef } from "react"
import { Eraser } from "lucide-react"
import { PUZZLES } from "../data/buildFlagPuzzles"
import type { BuildPuzzle, Piece } from "../data/buildFlagPuzzles"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"
import { hexToRgb } from "../utils/color"

const ACC = ACCENT.play

interface Props { onBack: () => void }

const FLAG_W = 270
const FLAG_H = 170

// The palette's eraser: pick it (or drag it) onto a part of the flag to empty it.
const CLEAR = "clear"

// What each part of the flag is called, for the labels under it and screen readers.
const SLOT_NAME: Record<string, string> = {
  left: "Left", center: "Centre", right: "Right",
  top: "Top", middle: "Middle", bottom: "Bottom", upper: "Upper middle", lower: "Lower middle",
  bg: "Background", disc: "Disc", star: "Star",
}
const slotName = (s: string) => SLOT_NAME[s] ?? s

// A slot is correct if the COLOUR placed matches the colour the solution wants —
// not the specific piece id (Latvia's two maroon bands are the same colour).
const colorOfPiece = (puzzle: BuildPuzzle, pieceId?: string) =>
  puzzle.pieces.find(p => p.id === pieceId)?.color
const slotIsCorrect = (puzzle: BuildPuzzle, placed: Record<string, string>, slotId: string) =>
  !!placed[slotId] && colorOfPiece(puzzle, placed[slotId]) === colorOfPiece(puzzle, puzzle.solution[slotId])

// The part of the flag under a point (the star sits inside the background,
// so this asks the page what's on top rather than comparing boxes).
const slotAt = (x: number, y: number): string | null => {
  const el = document.elementFromPoint(x, y) as HTMLElement | null
  return el?.closest<HTMLElement>("[data-slot]")?.dataset.slot ?? null
}

// ── Flag canvas renderer ─────────────────────────────────────────────────────
function FlagCanvas({ puzzle, placed, phase, over, onSlotClick }: {
  puzzle: BuildPuzzle
  placed: Record<string, string>
  phase: 'playing' | 'result'
  over?: string | null            // the part a dragged colour would land on
  onSlotClick: (slotId: string) => void
}) {
  const getPiece = (slotId: string): Piece | undefined =>
    puzzle.pieces.find(p => p.id === placed[slotId])

  // Every part is a button: tap (or Enter) paints it with the picked colour.
  const slotProps = (slotId: string) => phase === 'playing' ? {
    'data-slot': slotId,
    role: 'button',
    tabIndex: 0,
    'aria-label': `${slotName(slotId)}: ${getPiece(slotId)?.label ?? 'empty'}`,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onSlotClick(slotId) } },
  } : {}

  const border = (slotId: string, dashedWhenEmpty = true) => {
    if (phase === 'result') return slotIsCorrect(puzzle, placed, slotId) ? `2.5px solid ${T.green}` : `2.5px solid ${T.danger}`
    if (over === slotId) return `3px solid ${ACC}`
    return !placed[slotId] && dashedWhenEmpty ? `2px dashed ${tint(ACC, 0.4)}` : `2px solid ${tint(ACC, 0.55)}`
  }

  const slotStyle = (slotId: string): React.CSSProperties => {
    const piece = getPiece(slotId)
    return {
      background: piece ? piece.color : tint(ACC, 0.08),
      border: border(slotId),
      cursor: phase === 'playing' ? 'pointer' : 'default',
      transition: 'background 0.2s',
      position: 'relative',
      boxSizing: 'border-box',
    }
  }

  // On a light disc, so a green tick still shows on a green band.
  const mark = (slotId: string, size = 18) => {
    if (phase !== 'result') return null
    const ok = slotIsCorrect(puzzle, placed, slotId)
    return <span style={{
      width: size + 10, height: size + 10, borderRadius: 999, background: T.surface, boxShadow: `0 1px 3px ${tint(T.text, 0.3)}`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
      fontSize: size, fontWeight: 800, color: ok ? T.green : T.danger,
    }}>{ok ? '✓' : '✗'}</span>
  }
  // Horizontal bands are named inside each band (a row of names under stacked bands reads left to right).
  const bandLabel = (slotId: string) => {
    if (phase !== 'playing') return null
    const piece = getPiece(slotId)
    return <span aria-hidden style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      fontSize: 10, fontWeight: piece ? 700 : 400,
      color: piece ? (isLight(piece.color) ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.92)') : T.dim,
    }}>{piece ? piece.label : slotName(slotId)}</span>
  }
  const centredMark = (slotId: string) => phase === 'result'
    ? <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{mark(slotId)}</span>
    : null

  const frame: React.CSSProperties = { width: FLAG_W, height: FLAG_H, borderRadius: 8, overflow: 'hidden', boxShadow: `0 8px 24px -10px ${tint(T.text, 0.45)}` }

  if (puzzle.layout === 'v3' || puzzle.layout === 'v2') {
    return (
      <div style={{ ...frame, display: 'flex' }}>
        {puzzle.slots.map(s => (
          <div key={s} {...slotProps(s)} style={{ ...slotStyle(s), flex: 1, height: '100%' }} onClick={() => onSlotClick(s)}>
            {centredMark(s)}
          </div>
        ))}
      </div>
    )
  }

  if (puzzle.layout === 'h3' || puzzle.layout === 'h2' || puzzle.layout === 'h4') {
    return (
      <div style={{ ...frame, display: 'flex', flexDirection: 'column' }}>
        {puzzle.slots.map(s => (
          <div key={s} {...slotProps(s)} style={{ ...slotStyle(s), flex: 1, width: '100%' }} onClick={() => onSlotClick(s)}>
            {centredMark(s)}
            {bandLabel(s)}
          </div>
        ))}
      </div>
    )
  }

  if (puzzle.layout === 'star' || puzzle.layout === 'disc') {
    const inner = puzzle.layout
    const bg = getPiece('bg')
    const fg = getPiece(inner)
    const STAR_CLIP = 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)'
    return (
      <div {...slotProps('bg')} onClick={() => onSlotClick('bg')}
        style={{
          ...frame, background: bg ? bg.color : tint(ACC, 0.08), border: border('bg'),
          position: 'relative', cursor: phase === 'playing' ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
        }}>
        <div {...slotProps(inner)} onClick={e => { e.stopPropagation(); onSlotClick(inner) }}
          style={inner === 'star' ? {
            width: 86, height: 86, clipPath: STAR_CLIP, WebkitClipPath: STAR_CLIP,
            // A clipped shape can't show a border, so the star brightens while a colour hovers it.
            background: fg ? fg.color : tint(ACC, over === 'star' ? 0.5 : 0.25),
            cursor: phase === 'playing' ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          } : {
            width: 80, height: 80, borderRadius: '50%', boxSizing: 'border-box',
            background: fg ? fg.color : tint(ACC, 0.12), border: border('disc'),
            cursor: phase === 'playing' ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {mark(inner, inner === 'star' ? 16 : 20)}
        </div>
        {phase === 'result' && <div style={{ position: 'absolute', top: 4, right: 6 }}>{mark('bg', 16)}</div>}
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

// A press only becomes a drag once the finger moves this far, so a tap stays a tap.
const DRAG_PX = 6

export default function BuildFlagScreen({ onBack }: Props) {
  const [puzzle, setPuzzle]  = useState<BuildPuzzle>(dealPuzzle)
  const [placed, setPlaced]   = useState<Record<string, string>>({})
  // The picked colour (or CLEAR). It stays picked after painting, since a
  // colour never runs out: pick red, tap the top, tap the bottom.
  const [selected, setSelected] = useState<string | null>(null)
  const [ghost, setGhost]     = useState<{ pieceId: string; x: number; y: number } | null>(null)
  const [over, setOver]       = useState<string | null>(null)
  const [phase, setPhase]     = useState<'playing' | 'result'>('playing')
  const press = useRef<{ pieceId: string; pointerId: number; x0: number; y0: number; moved: boolean } | null>(null)
  // A drag ends with a click on the piece it started from; that click mustn't pick it.
  const skipClick = useRef(false)

  const startNewGame = () => {
    setPuzzle(dealPuzzle())
    setPlaced({})
    setSelected(null)
    setGhost(null)
    setOver(null)
    setPhase('playing')
  }

  const remaining = puzzle.slots.filter(s => !placed[s]).length
  const allSlotsFilled = remaining === 0
  const labelOf = (id: string | null) => id === CLEAR ? "Clear" : puzzle.pieces.find(p => p.id === id)?.label ?? ""

  // Paint one part of the flag. The colour stays in the palette.
  const paint = (slotId: string, pieceId: string) => setPlaced(prev => {
    const next = { ...prev }
    if (pieceId === CLEAR) delete next[slotId]
    else next[slotId] = pieceId
    return next
  })

  // Tap a part: paint it with the picked colour, or with nothing picked, empty it.
  const handleSlotClick = (slotId: string) => {
    if (phase !== 'playing') return
    if (selected) paint(slotId, selected)
    else if (placed[slotId]) paint(slotId, CLEAR)
  }

  const togglePick = (pieceId: string) => setSelected(s => s === pieceId ? null : pieceId)

  // ── Drag from the palette (pointer events, so mouse, pen and touch alike) ──
  const onPointerDown = (e: React.PointerEvent, pieceId: string) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    skipClick.current = false
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    press.current = { pieceId, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const p = press.current
    if (!p || p.pointerId !== e.pointerId) return
    if (!p.moved && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < DRAG_PX) return
    p.moved = true
    setGhost({ pieceId: p.pieceId, x: e.clientX, y: e.clientY })
    setOver(slotAt(e.clientX, e.clientY))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const p = press.current
    if (!p || p.pointerId !== e.pointerId) return
    press.current = null
    if (!p.moved) return
    skipClick.current = true
    const slot = slotAt(e.clientX, e.clientY)
    if (slot) paint(slot, p.pieceId)
    setGhost(null); setOver(null)
  }
  const onPointerCancel = () => { press.current = null; setGhost(null); setOver(null) }
  const onPieceClick = (pieceId: string) => {
    if (skipClick.current) { skipClick.current = false; return }
    togglePick(pieceId)
  }

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
          <FlagCanvas puzzle={puzzle} placed={placed} phase="result" onSlotClick={() => {}} />

          {/* Score */}
          <ResultCard style={{ width: "100%" }}>
            <ResultHeader icon={perfect ? "palette" : "buildflag"} accent={perfect ? T.green : ACC}
              title={`${correct} of ${total} bands`}
              score={<>
                {perfect ? `Perfect! That's ${puzzle.name}!` : `${correct} of ${total} bands correct for ${puzzle.name}`}
                {!perfect && <><br /><span style={{ color: ACC }}>Correct order: {puzzle.slots.map(s => {
                  const piece = puzzle.pieces.find(p => p.id === puzzle.solution[s])
                  return piece?.label
                }).join(' · ')}</span></>}
              </>} />
          </ResultCard>

          <div className="flex flex-col gap-3 w-full">
            <PrimaryButton onClick={startNewGame} accent={ACC}>New flag</PrimaryButton>
            <SecondaryButton onClick={onBack}>Home</SecondaryButton>
          </div>
        </div>
      </div>
    )
  }

  // ── Playing ────────────────────────────────────────────────────────────────
  const swatch = (id: string, piece?: Piece) => {
    const isSelected = selected === id
    const eraser = id === CLEAR
    return (
      <div key={id}
        onPointerDown={e => onPointerDown(e, id)} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
        onClick={() => onPieceClick(id)}
        role="button" tabIndex={0} aria-pressed={isSelected}
        aria-label={eraser ? "Clear: empties the part of the flag you tap" : piece!.label}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePick(id) } }}
        style={{
          width: 64, height: 44, borderRadius: 10, boxSizing: 'border-box',
          background: eraser ? T.surface : piece!.color,
          border: isSelected ? `3px solid ${ACC}` : eraser ? `2px dashed ${T.lineHi}` : `2px solid ${T.line}`,
          cursor: 'grab',
          touchAction: 'none',
          transform: isSelected ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform 0.15s',
          display: 'flex', flexDirection: eraser ? 'column' : 'row', alignItems: eraser ? 'center' : 'flex-end', justifyContent: 'center',
          paddingBottom: eraser ? 0 : 4, gap: 2,
          userSelect: 'none', WebkitUserSelect: 'none',
        }}>
        {eraser && <Eraser size={15} strokeWidth={1.8} color={T.muted} aria-hidden />}
        <span style={{ fontSize: 9, fontWeight: 700, color: eraser ? T.muted : isLight(piece!.color) ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.92)' }}>
          {eraser ? "Clear" : piece!.label}
        </span>
      </div>
    )
  }

  const ghostPiece = ghost && ghost.pieceId !== CLEAR ? puzzle.pieces.find(p => p.id === ghost.pieceId) : undefined

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: T.bg, minHeight: "100vh", color: T.text }}>

      <ScreenHeader title="Build the Flag" subtitle={puzzle.name} onBack={onBack} />

      <div className="flex flex-col items-center gap-6 px-5" style={{ zIndex: 1 }}>
        {/* Instruction */}
        <p role="status" className="text-xs text-center" style={{ color: T.muted, maxWidth: 340, minHeight: 32 }}>
          {selected === CLEAR ? "Clear picked: tap a part of the flag to empty it"
            : selected ? `${labelOf(selected)} picked: tap any part of the flag to paint it. Tap ${labelOf(selected)} again to put it down.`
            : "Drag a colour onto the flag, or tap a colour, then the flag. Each colour can go in as many places as you like."}
        </p>

        {/* Flag canvas */}
        <FlagCanvas puzzle={puzzle} placed={placed} phase="playing" over={over} onSlotClick={handleSlotClick} />

        {/* Slot labels (horizontal bands carry theirs inside the band) */}
        {!['h2', 'h3', 'h4'].includes(puzzle.layout) && <div className="flex justify-center gap-1" style={{ width: FLAG_W, marginTop: -12 }}>
          {puzzle.slots.map(s => {
            const piece = puzzle.pieces.find(p => p.id === placed[s])
            return (
              <div key={s} className="flex-1 text-center text-xs py-1 rounded"
                style={{ color: piece ? ACC : T.dim, fontSize: 10, fontWeight: piece ? 700 : 400 }}>
                {piece ? piece.label : slotName(s)}
              </div>
            )
          })}
        </div>}

        {/* Palette: every colour once, and it never runs out */}
        <div>
          <div className="text-xs mb-3 text-center font-semibold uppercase tracking-widest"
            style={{ color: T.muted }}>
            Colours
          </div>
          <div className="flex flex-wrap gap-3 justify-center" style={{ maxWidth: 340 }}>
            {puzzle.pieces.map(piece => swatch(piece.id, piece))}
            {swatch(CLEAR)}
          </div>
        </div>

        {/* Confirm */}
        <PrimaryButton onClick={() => setPhase('result')} disabled={!allSlotsFilled} accent={ACC} style={{ maxWidth: 384 }}>
          {allSlotsFilled ? "Confirm →" : remaining === 1 ? "Fill the last slot" : `Fill all ${remaining} remaining slots`}
        </PrimaryButton>
      </div>

      {/* Drag ghost */}
      {ghost && (
        <div aria-hidden style={{
          position: 'fixed',
          left: ghost.x - 32,
          top:  ghost.y - 22,
          width: 64, height: 44, boxSizing: 'border-box',
          background: ghostPiece ? ghostPiece.color : T.surface,
          borderRadius: 10,
          border: ghostPiece ? `2px solid ${T.line}` : `2px dashed ${T.lineHi}`,
          pointerEvents: 'none',
          zIndex: 9999,
          opacity: 0.92,
          boxShadow: `0 8px 24px -6px ${tint(T.text, 0.45)}`,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4,
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: !ghostPiece ? T.muted : isLight(ghostPiece.color) ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.92)' }}>
            {ghostPiece ? ghostPiece.label : "Clear"}
          </span>
        </div>
      )}
    </div>
  )
}
