import { useState, useMemo } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, PrimaryButton, SecondaryButton } from "./gameUi"

import { matchNames, pickOnEnter } from "../utils/pickOnEnter"
import { sameHalf } from "../utils/flagHalves"

interface Props { onBack: () => void }

const ROUNDS = 5

interface Round { top: FlagRecord; bottom: FlagRecord }

function rand() { return FLAGS[Math.floor(Math.random() * FLAGS.length)] }
function buildRounds(): Round[] {
  const rounds: Round[] = []
  for (let i = 0; i < ROUNDS; i++) {
    let a = rand(), b = rand()
    while (b.code === a.code) b = rand()
    rounds.push({ top: a, bottom: b })
  }
  return rounds
}

// Once a half is named, the input is replaced by this chip (name + clear ✕).
function SelectedChip({ flag, onClear }: { flag: FlagRecord; onClear: () => void }) {
  return (
    <div className="px-3 py-2.5 rounded-xl flex items-center gap-3"
      style={{ background: T.surface, border: `1.5px solid ${tint(ACCENT.play, 0.45)}` }}>
      <img src={flag.flagUrl} alt="" style={{ width: 38, height: 25, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
      <span style={{ color: T.text, fontWeight: 700, fontSize: 17, flex: 1, minWidth: 0, lineHeight: 1.1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{flag.name}</span>
      <button onClick={onClear} aria-label="Clear"
        className="active:scale-90 transition-all"
        style={{ width: 26, height: 26, borderRadius: 999, background: T.surfaceHi, border: `1px solid ${T.line}`, color: T.muted, fontSize: 13, flexShrink: 0 }}>✕</button>
    </div>
  )
}

// Small inline autocomplete (same pattern as The Crop / The Peel)
function FlagInput({ placeholder, onPick, disabled }: {
  placeholder: string; onPick: (f: FlagRecord) => void; disabled?: boolean
}) {
  const [input, setInput] = useState("")
  const [show, setShow] = useState(false)
  const matches = useMemo(() => {
    return matchNames(FLAGS, input, 5)
  }, [input])
  if (disabled) return null
  return (
    <div className="relative w-full">
      <input aria-label="Type a country" value={input} autoComplete="off"
        onChange={e => { setInput(e.target.value); setShow(true) }}
        onFocus={() => setShow(true)} onBlur={() => setTimeout(() => setShow(false), 150)}
        onKeyDown={e => { if (e.key === "Enter") { const pick = pickOnEnter(matches, input); if (pick) { onPick(pick); setInput("") } } }}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl outline-none font-semibold"
        style={{ background: T.surface, border: `1.5px solid ${T.line}`, color: T.text, fontSize: 14 }} />
      {show && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20"
          style={{ background: T.surface, border: `1px solid ${T.line}`, boxShadow: `0 8px 32px ${tint(T.text, 0.18)}` }}>
          {matches.map(f => (
            <button key={f.code} onMouseDown={() => { onPick(f); setInput(""); setShow(false) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:brightness-95"
              style={{ background: "transparent", borderBottom: `1px solid ${T.line}` }}>
              <img src={f.flagUrl} alt="" style={{ width: 30, height: 20, objectFit: "cover", borderRadius: 3 }} />
              <span style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{f.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FrankenflagGame({ onBack, onReplay }: Props & { onReplay: () => void }) {
  const [rounds] = useState(buildRounds)
  const [idx, setIdx] = useState(0)
  const [topGuess, setTopGuess] = useState<FlagRecord | null>(null)
  const [botGuess, setBotGuess] = useState<FlagRecord | null>(null)
  const [checked, setChecked] = useState(false)
  // Which halves were right: the exact flag, or one whose half looks the same.
  const [ok, setOk] = useState({ top: false, bot: false })
  const [checking, setChecking] = useState(false)
  const [scores, setScores] = useState<number[]>([]) // 0, 0.5, or 1 per round
  const [done, setDone] = useState(false)

  const round = rounds[idx]

  const check = async () => {
    if (checking || checked) return
    setChecking(true)
    const [top, bot] = await Promise.all([
      topGuess ? sameHalf(topGuess.flagUrl, round.top.flagUrl, "top") : false,
      botGuess ? sameHalf(botGuess.flagUrl, round.bottom.flagUrl, "bottom") : false,
    ])
    setOk({ top, bot })
    setScores(s => [...s, (top ? 0.5 : 0) + (bot ? 0.5 : 0)])
    setChecked(true)
    setChecking(false)
  }
  const next = () => {
    if (idx + 1 >= ROUNDS) { setDone(true); return }
    setIdx(i => i + 1); setTopGuess(null); setBotGuess(null); setChecked(false)
  }

  if (done) {
    const total = scores.reduce((a, b) => a + b, 0)
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
        <ScreenHeader title="Frankenflag" subtitle="Results" onBack={onBack} />
        <div className="w-full max-w-sm mx-auto px-5 pb-8 flex flex-col gap-3">
          <ResultCard>
            <ResultHeader icon="frankenflag" accent={ACCENT.play}
              title={`${total * 2} of ${ROUNDS * 2} halves named`} score="Two flags stitched together, one half at a time" />
          </ResultCard>
          <PrimaryButton onClick={onReplay} accent={ACCENT.play}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack}>Home</SecondaryButton>
        </div>
      </div>
    )
  }

  const topOK = checked && ok.top
  const botOK = checked && ok.bot

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Frankenflag" subtitle={`Round ${idx + 1} / ${ROUNDS}`} onBack={onBack} />

      <div className="flex flex-col items-center px-5 gap-4">
        <p className="text-xs text-center" style={{ color: T.muted }}>Two flags stitched together — name the top and bottom halves.</p>

        {/* Composite flag */}
        <div style={{ width: 280, height: 188, borderRadius: 12, overflow: "hidden", border: `2px solid ${T.line}`, boxShadow: `0 6px 18px ${tint(T.text, 0.18)}` }}>
          <div style={{ width: "100%", height: "50%", overflow: "hidden", position: "relative", borderBottom: `2px solid ${T.void}` }}>
            <img src={round.top.flagUrl} alt="top" style={{ width: "100%", height: 188, objectFit: "cover", display: "block" }} />
          </div>
          <div style={{ width: "100%", height: "50%", overflow: "hidden", position: "relative" }}>
            <img src={round.bottom.flagUrl} alt="bottom" style={{ width: "100%", height: 188, objectFit: "cover", display: "block", marginTop: -94 }} />
          </div>
        </div>

        {/* Inputs / results */}
        <div className="w-full max-w-sm flex flex-col gap-3">
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: ACCENT.play }}>Top half</div>
            {checked
              ? <div className="px-4 py-3 rounded-xl font-semibold flex items-center justify-between"
                  style={{ background: T.surface, border: `1.5px solid ${topOK ? T.green : T.danger}`, color: T.text }}>
                  <span>{round.top.name}</span><span style={{ color: topOK ? T.green : T.danger }}>{topOK ? (topGuess?.code === round.top.code ? "✓" : `✓ (${topGuess?.name} looks the same)`) : `✗ (you: ${topGuess?.name ?? "—"})`}</span>
                </div>
              : topGuess
                ? <SelectedChip flag={topGuess} onClear={() => setTopGuess(null)} />
                : <FlagInput placeholder="Name the top flag…" onPick={setTopGuess} />}
          </div>
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: ACCENT.play }}>Bottom half</div>
            {checked
              ? <div className="px-4 py-3 rounded-xl font-semibold flex items-center justify-between"
                  style={{ background: T.surface, border: `1.5px solid ${botOK ? T.green : T.danger}`, color: T.text }}>
                  <span>{round.bottom.name}</span><span style={{ color: botOK ? T.green : T.danger }}>{botOK ? (botGuess?.code === round.bottom.code ? "✓" : `✓ (${botGuess?.name} looks the same)`) : `✗ (you: ${botGuess?.name ?? "—"})`}</span>
                </div>
              : botGuess
                ? <SelectedChip flag={botGuess} onClear={() => setBotGuess(null)} />
                : <FlagInput placeholder="Name the bottom flag…" onPick={setBotGuess} />}
          </div>
        </div>

        {!checked ? (
          <PrimaryButton onClick={check} disabled={!topGuess && !botGuess} accent={ACCENT.play} style={{ maxWidth: 384 }}>
            Check →
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={next} accent={ACCENT.play} style={{ maxWidth: 384 }}>
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
