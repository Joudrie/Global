import { useState, useMemo } from "react"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { FLAG_ATTRIBS, STRIPES_V } from "../data/flagAttribs"
import { todayString, shuffleWithSeed } from "../utils/prng"
import { shareOrCopy } from "../utils/share"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, ResultCard, ResultHeader, PrimaryButton, SecondaryButton, GameIcon } from "./gameUi"

import { Share2 } from "lucide-react"
import { pickOnEnter } from "../utils/pickOnEnter"

interface Props { onBack: () => void }

const ACC = ACCENT.today

const ELIGIBLE = FLAGS.filter(f => FLAG_ATTRIBS[f.code])
const MAX_GUESSES = 6

type Tile = "hit" | "near" | "miss"
// Wordle-style semantics kept, remapped so they read on the token palette.
const TILE_BG: Record<Tile, string> = { hit: T.green, near: T.gold, miss: T.line }
const TILE_EMOJI: Record<Tile, string> = { hit: "🟩", near: "🟨", miss: "⬛" }

const swatch = (c: string) => ({ width: 10, height: 10, borderRadius: 3, display: "inline-block", background: c })

// Attribute columns shown per guess. icon: a LineIcon name; label: what it means.
const COLS: { key: string; icon: string; label: string }[] = [
  { key: "colors",   icon: "palette", label: "Colours" },
  { key: "stripesH", icon: "rows",    label: "Horizontal stripes" },
  { key: "stripesV", icon: "columns", label: "Vertical stripes" },
  { key: "cross",    icon: "plus",    label: "Cross" },
  { key: "star",     icon: "star",    label: "Star" },
  { key: "crescent", icon: "moon",    label: "Crescent" },
  { key: "emblem",   icon: "shield",  label: "Emblem" },
  { key: "region",   icon: "globe",   label: "Region" },
]

function compare(guess: FlagRecord, target: FlagRecord): Record<string, Tile> {
  const ga = FLAG_ATTRIBS[guess.code], ta = FLAG_ATTRIBS[target.code]
  const shared = ga.colors.filter(c => ta.colors.includes(c)).length
  const colorTile: Tile =
    shared === ta.colors.length && ga.colors.length === ta.colors.length ? "hit"
    : shared > 0 ? "near" : "miss"
  const bin = (a: boolean, b: boolean): Tile => a === b ? "hit" : "miss"
  return {
    colors: colorTile,
    stripesH: bin(ga.stripes, ta.stripes),
    stripesV: bin(STRIPES_V.has(guess.code), STRIPES_V.has(target.code)),
    cross: bin(ga.cross, ta.cross),
    star: bin(ga.star, ta.star),
    crescent: bin(ga.crescent, ta.crescent),
    emblem: bin(ga.emblem, ta.emblem),
    region: guess.region === target.region ? "hit" : "miss",
  }
}

const TILE_GRID = `repeat(${COLS.length}, 1fr)`

interface Guess { flag: FlagRecord; tiles: Record<string, Tile> }

export default function FlagleScreen({ onBack }: Props) {
  const today = todayString()
  const target = useMemo(() => shuffleWithSeed(ELIGIBLE, "flagle-" + today)[0], [today])

  const [guesses, setGuesses] = useState<Guess[]>([])
  const [input, setInput] = useState("")
  const [showDrop, setShowDrop] = useState(false)
  const [copied, setCopied] = useState(false)

  const guessedCodes = useMemo(() => new Set(guesses.map(g => g.flag.code)), [guesses])
  const won = guesses.some(g => g.flag.code === target.code)
  const finished = won || guesses.length >= MAX_GUESSES

  const matches = useMemo(() => {
    const q = input.trim().toLowerCase()
    if (q.length < 1) return []
    return FLAGS.filter(f => (f.name.toLowerCase().includes(q) || f.code.toLowerCase() === q) && !guessedCodes.has(f.code)).slice(0, 6)
  }, [input, guessedCodes])

  const submit = (f: FlagRecord) => {
    if (finished || guessedCodes.has(f.code)) return
    if (!FLAG_ATTRIBS[f.code]) return
    setGuesses(g => [...g, { flag: f, tiles: compare(f, target) }])
    setInput(""); setShowDrop(false)
  }

  const shareText = () => {
    const head = `Flagle ${today} ${won ? guesses.length : "X"}/${MAX_GUESSES}`
    const grid = guesses.map(g => COLS.map(c => TILE_EMOJI[g.tiles[c.key]]).join("")).join("\n")
    return head + "\n" + grid + "\nglobalio.app"
  }
  const copyShare = async () => {
    await shareOrCopy(shareText())
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: T.bg, minHeight: "100vh", color: T.text }}>
      <ScreenHeader title="Flagle" onBack={onBack} subtitle="Daily flag puzzle"
        right={<HeaderStat accent={ACC}>{Math.min(guesses.length + (finished ? 0 : 1), MAX_GUESSES)} / {MAX_GUESSES}</HeaderStat>} />

      <div className="flex flex-col items-center px-4 gap-3">
        {/* Column legend */}
        <div className="grid w-full max-w-sm items-center" style={{ gridTemplateColumns: TILE_GRID, gap: 4 }}>
          {COLS.map(c => <div key={c.key} title={c.label} aria-label={c.label} style={{ display: "flex", justifyContent: "center", color: ACC }}><GameIcon name={c.icon} size={15} /></div>)}
        </div>

        {/* Guess rows */}
        {/* Guess rows: the name gets its own full-width line so it's never cut off on a phone */}
        {guesses.map((g, gi) => (
          <div key={gi} className="w-full max-w-sm flex flex-col" style={{ gap: 4 }}>
            <div className="flex items-center gap-2 min-w-0">
              <img src={g.flag.flagUrl} alt="" style={{ width: 22, height: 14, objectFit: "contain", borderRadius: 2, flexShrink: 0 }} />
              <span style={{ color: T.text, fontSize: 12, fontWeight: 600, lineHeight: 1.25, overflowWrap: "anywhere" }}>{g.flag.name}</span>
            </div>
            <div className="grid items-center" style={{ gridTemplateColumns: TILE_GRID, gap: 4 }}>
            {COLS.map(c => (
              <div key={c.key} style={{
                height: 28, borderRadius: 4, background: TILE_BG[g.tiles[c.key]],
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, color: T.onAccent, fontWeight: 700,
              }}>{g.tiles[c.key] === "hit" ? "" : g.tiles[c.key] === "near" ? "~" : ""}</div>
            ))}
            </div>
          </div>
        ))}

        {/* Empty rows */}
        {!finished && Array.from({ length: MAX_GUESSES - guesses.length }).map((_, i) => (
          <div key={i} className="grid w-full max-w-sm" style={{ gridTemplateColumns: TILE_GRID, gap: 4 }}>
            {COLS.map(c => <div key={c.key} style={{ height: 28, borderRadius: 4, background: T.surface, border: `1px solid ${T.line}` }} />)}
          </div>
        ))}

        {/* Input or result */}
        {!finished ? (
          <div className="w-full max-w-sm relative mt-1">
            <input value={input} autoComplete="off"
              onChange={e => { setInput(e.target.value); setShowDrop(true) }}
              onFocus={() => setShowDrop(true)} onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              onKeyDown={e => { if (e.key === "Enter") { const pick = pickOnEnter(matches, input); if (pick) submit(pick) } }}
              placeholder="Guess a country…"
              className="w-full px-4 py-3 rounded-xl outline-none font-semibold"
              style={{ background: T.surface, border: `1.5px solid ${T.line}`, color: T.text, fontSize: 15 }} />
            {showDrop && matches.length > 0 && (
              <div className="absolute left-0 right-0 bottom-full mb-1 rounded-xl overflow-hidden z-20"
                style={{ background: T.surface, border: `1px solid ${T.line}`, boxShadow: `0 -8px 32px ${tint(T.text, 0.25)}` }}>
                {matches.map(f => (
                  <button key={f.code} onMouseDown={() => submit(f)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:brightness-125"
                    style={{ background: "transparent", borderBottom: `1px solid ${T.line}` }}>
                    <img src={f.flagUrl} alt="" style={{ width: 30, height: 20, objectFit: "cover", borderRadius: 3 }} />
                    <span style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{f.name}</span>
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-center mt-2 flex items-center justify-center gap-3" style={{ color: T.muted }}>
              <span className="inline-flex items-center gap-1.5"><span style={swatch(T.green)} /> match</span>
              <span className="inline-flex items-center gap-1.5"><span style={swatch(T.gold)} /> partial colours</span>
              <span className="inline-flex items-center gap-1.5"><span style={swatch(T.line)} /> no match</span>
            </p>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center gap-3 mt-1">
            <ResultCard style={{ width: "100%" }}>
              <ResultHeader icon={won ? "trophy" : "flagle"} accent={won ? T.green : T.danger}
                eyebrow={won ? `Solved in ${guesses.length}` : "Out of guesses"}
                title={target.name} />
              <img src={target.flagUrl} alt={target.name}
                style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8, margin: "0 auto", border: `1px solid ${T.line}` }} />
            </ResultCard>
            <PrimaryButton onClick={copyShare} accent={ACC}>
              {copied ? "Copied! ✓" : <>Share result <Share2 size={16} strokeWidth={1.6} absoluteStrokeWidth /></>}
            </PrimaryButton>
            <SecondaryButton onClick={onBack}>Home</SecondaryButton>
            <p className="text-xs text-center" style={{ color: T.dim }}>New flag every day · come back tomorrow</p>
          </div>
        )}
      </div>
    </div>
  )
}
