import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, PrimaryButton, SecondaryButton, HeaderStat } from "./gameUi"
import { matchNames, pickOnEnter } from "../utils/pickOnEnter"

const ACC = ACCENT.play

interface Props { onBack: () => void }

const CANVAS_W = 300
const CANVAS_H = 190

const BRUSH_SIZES = { small: 5, medium: 22, large: 38 } as const
type BrushSize = keyof typeof BRUSH_SIZES

function scoreFromPct(pct: number): number {
  if (pct < 5)  return 1000
  if (pct < 12) return 900
  if (pct < 22) return 750
  if (pct < 35) return 600
  if (pct < 50) return 400
  if (pct < 70) return 200
  return 100
}

function ThePeelScreenGame({ onBack , onReplay }: Props & { onReplay: () => void }) {
  const [target]    = useState<FlagRecord>(() => FLAGS[Math.floor(Math.random() * FLAGS.length)])
  const [brushSize, setBrushSize] = useState<BrushSize>('medium')

  const canvasRef        = useRef<HTMLCanvasElement>(null)
  const [revealed, setRevealed]   = useState(0)
  const [phase, setPhase]         = useState<'scratch' | 'guess' | 'result'>('scratch')
  const [guess, setGuess]         = useState<FlagRecord | null>(null)
  const [score, setScore]         = useState(0)
  const isPointerDown             = useRef(false)

  // Type-in
  const [input, setInput]       = useState("")
  const [showDrop, setShowDrop] = useState(false)
  const inputRef                = useRef<HTMLInputElement>(null)

  const matches = useMemo(() => {
    return matchNames(FLAGS, input, 6)
  }, [input])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    // Opaque scratch cover — ink-dark (game content, must hide the flag)
    ctx.fillStyle = T.text
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  }, [])

  const scratch = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x    = (clientX - rect.left) * (CANVAS_W / rect.width)
    const y    = (clientY - rect.top)  * (CANVAS_H / rect.height)

    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, BRUSH_SIZES[brushSize], 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'

    const data  = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data
    const step  = 8
    let cleared = 0, total = 0
    for (let i = 3; i < data.length; i += 4 * step) {
      if (data[i] < 128) cleared++
      total++
    }
    setRevealed(Math.round((cleared / total) * 100))
  }, [brushSize])

  // Scratching only counts in the scratch phase; "keep scratching" goes back to it.
  const onMouseDown  = (e: React.MouseEvent)  => { if (phase !== 'scratch') return; isPointerDown.current = true;  scratch(e.clientX, e.clientY) }
  const onMouseMove  = (e: React.MouseEvent)  => { if (isPointerDown.current && phase === 'scratch') scratch(e.clientX, e.clientY) }
  const onMouseUp    = ()                     => { isPointerDown.current = false }
  // No preventDefault: React's touch listeners are passive, and the canvas's
  // touch-action: none already stops the page scrolling.
  const onTouchStart = (e: React.TouchEvent) => { if (phase !== 'scratch') return; isPointerDown.current = true; scratch(e.touches[0].clientX, e.touches[0].clientY) }
  const onTouchMove  = (e: React.TouchEvent) => { if (isPointerDown.current && phase === 'scratch') scratch(e.touches[0].clientX, e.touches[0].clientY) }
  const onTouchEnd   = ()                    => { isPointerDown.current = false }

  const handleGuess = (flag: FlagRecord) => {
    const s = flag.code === target.code ? scoreFromPct(revealed) : 0
    setGuess(flag)
    setScore(s)
    setPhase('result')
    setInput("")
    setShowDrop(false)
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: T.bg, minHeight: "100vh", color: T.text }}>

      <ScreenHeader title="The Peel" onBack={onBack}
        subtitle={
          phase === 'scratch'
            ? <span style={{ color: ACC }}>{revealed < 5 ? "Scratch to reveal" : `${revealed}% — guess for ${scoreFromPct(revealed)} pts`}</span>
            : phase === 'result'
              ? <span style={{ fontWeight: 700, color: guess?.code === target.code ? T.green : T.danger }}>
                  {guess?.code === target.code ? `✓ ${score} pts` : "✗ Wrong flag"}
                </span>
              : undefined
        }
        right={<HeaderStat label="Revealed" accent={revealed < 20 ? T.green : revealed < 50 ? T.gold : T.danger}>{revealed}%</HeaderStat>} />

      <div className="flex flex-col items-center gap-4 px-5">

        {/* Flag + canvas */}
        <div style={{
          width: CANVAS_W, height: CANVAS_H, position: 'relative', borderRadius: 12,
          overflow: 'hidden',
          border: phase === 'result'
            ? `2px solid ${guess?.code === target.code ? T.green : T.danger}`
            : `2px solid ${T.line}`,
          boxShadow: `0 10px 28px -12px ${tint(T.text, 0.5)}`, userSelect: 'none',
        }}>
          <img src={target.flagUrl} alt="hidden flag"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <canvas ref={canvasRef}
            width={CANVAS_W} height={CANVAS_H}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              cursor: 'crosshair', touchAction: 'none',
              display: phase === 'result' ? 'none' : 'block',
            }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove}
            onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          />
        </div>

        {/* Brush size + score legend */}
        {phase === 'scratch' && (
          <div className="w-full max-w-sm flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: T.muted }}>Brush:</span>
              {(Object.keys(BRUSH_SIZES) as BrushSize[]).map(sz => (
                <button key={sz} onClick={() => setBrushSize(sz)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                  style={{
                    background: brushSize === sz ? ACC : T.surface,
                    color: brushSize === sz ? T.onAccent : T.muted,
                    border: `1px solid ${brushSize === sz ? ACC : T.line}`,
                  }}>
                  {sz === 'small' ? '·' : sz === 'medium' ? '○' : '◯'} {sz}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '<5%', pts: '1000', color: T.green },
                { label: '5–22%', pts: '750–900', color: ACC },
                { label: '22–50%', pts: '400–600', color: T.gold },
                { label: '50%+', pts: '100–200', color: T.danger },
              ].map(({ label, pts, color }) => (
                <div key={label} className="rounded-lg text-center"
                  style={{ background: T.surface, border: `1px solid ${tint(color, 0.35)}`, color, padding: '5px 3px', lineHeight: 1.25 }}>
                  <div style={{ fontSize: 10, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 9.5, opacity: 0.85, fontFamily: FONT.mono }}>{pts}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'scratch' && (
          <PrimaryButton onClick={() => setPhase('guess')} accent={ACC} style={{ maxWidth: 384 }}>
            Make my guess →
          </PrimaryButton>
        )}

        {/* Guess phase — type-in */}
        {phase === 'guess' && (
          <div className="w-full max-w-sm relative">
            <p className="text-sm text-center mb-3 font-semibold" style={{ color: T.muted }}>
              Which flag did you reveal?{" "}
              <button onClick={() => { setPhase('scratch'); setInput(""); setShowDrop(false) }} className="geo-tap"
                style={{ color: ACC, fontWeight: 600, background: "transparent", minHeight: 32 }}>← keep scratching</button>
            </p>
            <input aria-label="Type a country"
              ref={inputRef}
              autoFocus
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
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-10"
                style={{ background: T.surface, border: `1px solid ${T.line}`, boxShadow: `0 8px 32px ${tint(T.text, 0.25)}` }}>
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
          </div>
        )}

        {/* Result */}
        {phase === 'result' && (
          <div className="w-full max-w-sm flex flex-col gap-3">
            <ResultCard>
              <ResultHeader icon={guess?.code === target.code ? "check" : "x"} accent={guess?.code === target.code ? T.green : T.danger}
                eyebrow={guess?.code === target.code && score === 1000 ? "Perfect peel, under 5%" : undefined}
                title={`${guess?.code === target.code ? score : 0} pts`}
                score={guess?.code === target.code
                  ? `${target.name}: you revealed ${revealed}%`
                  : `That was ${target.name}. You guessed ${guess?.name}.`} />
            </ResultCard>
            <PrimaryButton onClick={onReplay} accent={ACC}>New flag</PrimaryButton>
            <SecondaryButton onClick={onBack}>Home</SecondaryButton>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ThePeelScreen({ onBack }: Props) {
  const [replayKey, setReplayKey] = useState(0)
  return <ThePeelScreenGame key={replayKey} onBack={onBack} onReplay={() => setReplayKey(k => k + 1)} />
}
