import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { flushSync } from "react-dom"
import { PUZZLES, PUZZLE_COUNT } from "../data/connectionsPuzzles"
import { SIZE, MISTAKES, HINTS, check, state, rows, shareText, groupOf, puzzleIndex, shuffle, nextHint, validHints, validHistory, ids, tileById } from "../utils/connections"
import type { Hint, Puzzle, Tile } from "../utils/connections"
import { tileText, tileAnswer, tileLabel, endonymOf } from "../utils/connectionsTiles"
import { todayString, shuffleWithSeed } from "../utils/prng"
import { shareOrCopy } from "../utils/share"
import { T, FONT, GROUP_TONES, GROUP_TONE_NAMES, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { ResultCard, ResultHeader, PrimaryButton, HeaderStat } from "./gameUi"
import { LineIcon } from "./icons"
import FlagImage from "./FlagImage"

interface Props { onBack: () => void; onFinish?: () => void }

// Motion (ms). Every animation answers a Submit; none run under reduced motion.
const M = { hop: 240, stagger: 100, shake: 360, move: 360, pop: 360 }
const EASE = "cubic-bezier(.2,.8,.2,1)"
const SHARE_URL = "https://globalio.app/?play=connections"
// v2: tiles are ids ("capital:AT"), not country names. Progress saved by the
// old all-country-names game (globalio_connections_v1) is simply ignored.
const STORE_KEY = "globalio_connections_v2"

interface Saved { date: string; n: number; history: string[][]; hints?: Hint[] }
interface Progress { history: string[][]; hints: Hint[] }

// Storage can be missing or throw (private windows); the game works without it.
// Anything that doesn't fit today's puzzle is dropped rather than trusted.
function load(date: string, n: number, p: Puzzle): Progress {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null") as Saved | null
    if (!s || s.date !== date || s.n !== n) return { history: [], hints: [] }
    return { history: validHistory(p, s.history), hints: validHints(p, s.hints) }
  } catch { return { history: [], hints: [] } }
}
function save(v: Saved) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(v)) } catch { /* not saved */ }
}

const calm = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches

// The local-name tiles are set in Playfair italic, which the app's main font
// link leaves out; load just that face, only here.
const ITALIC_FONT = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,600&display=swap"
function loadItalic() {
  if (typeof document === "undefined" || document.querySelector(`link[href="${ITALIC_FONT}"]`)) return
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = ITALIC_FONT
  document.head.appendChild(link)
}

// A soft hyphen in the middle of long words, used only at the last fit step
// (hyphens: none ignores it before that), so MAGYARORSZÁG splits evenly.
const halve = (w: string) => w.replace(/[\p{L}]{9,}/gu, s => s.slice(0, Math.ceil(s.length / 2)) + "­" + s.slice(Math.ceil(s.length / 2)))

// Step each tile's type down until its longest word fits on one line; only a
// word too long even at the smallest size breaks mid-word.
const FITS: { size: number; spacing: string; pad: number; hyphens: "none" | "manual" }[] = [
  { size: 15, spacing: "normal", pad: 4, hyphens: "none" },
  { size: 13, spacing: "normal", pad: 4, hyphens: "none" },
  { size: 12, spacing: "normal", pad: 2, hyphens: "none" },
  { size: 11, spacing: "-0.02em", pad: 0, hyphens: "none" },
  { size: 11, spacing: "-0.02em", pad: 0, hyphens: "manual" },
]
function fitTiles(words: Iterable<HTMLElement>) {
  for (const t of words) {
    for (const f of FITS) {
      t.style.fontSize = `${f.size}px`
      t.style.letterSpacing = f.spacing
      t.style.paddingInline = `${f.pad}px`
      t.style.hyphens = f.hyphens
      if (t.scrollWidth <= t.clientWidth) break
    }
  }
}

function untilMidnight(): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const mins = Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 60000))
  const h = Math.floor(mins / 60), m = mins % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

// The small line under a capital or local-name tile, so the four kinds read
// apart at a glance: country names stand alone in bold, flags are pictures.
function Caption({ tile, on }: { tile: Tile; on: boolean }) {
  if (tile.kind !== "capital" && tile.kind !== "native") return null
  return (
    <span aria-hidden className="cx-cap" style={{
      display: "inline-flex", alignItems: "center", gap: 2, marginTop: 4, fontFamily: FONT.mono, fontStyle: "normal",
      fontWeight: 600, fontSize: 9, lineHeight: 1, letterSpacing: "0.06em", textTransform: "uppercase",
      color: on ? tint(T.surface, 0.8) : T.muted,
    }}>
      {tile.kind === "capital" && <LineIcon name="landmark" size={10} strokeWidth={1.6} />}
      {tile.kind === "capital" ? "capital" : "local name"}
    </span>
  )
}

function Game({ date, onBack, onFinish, onNewDay }: Props & { date: string; onNewDay: () => void }) {
  const idx = puzzleIndex(date, PUZZLE_COUNT)
  const n = idx + 1
  const P = PUZZLES[idx]

  const [saved] = useState(() => load(date, n, P))
  const [history, setHistory] = useState<string[][]>(saved.history)
  const [hints, setHints] = useState<Hint[]>(saved.hints)
  const s = useMemo(() => state(P, history), [P, history])
  const [order, setOrder] = useState<string[]>(() => shuffleWithSeed(ids(P), `connections-${date}`))
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState("")
  const [fresh, setFresh] = useState<number[]>([])
  const [shareMsg, setShareMsg] = useState("")
  const [countdown, setCountdown] = useState(untilMidnight)
  const tileRefs = useRef(new Map<string, HTMLButtonElement>())
  const wordRefs = useRef(new Map<string, HTMLSpanElement>())
  const toastTimer = useRef(0)

  const unsolved = order.filter(w => !s.solved.includes(groupOf(P, w)))
  // What the hints have shown so far, for groups still on the board.
  const hintedGroup = [...hints].reverse().find(h => !h.word && !s.solved.includes(h.group))?.group
  const hintedWords = new Set(hints.filter(h => h.word && !s.solved.includes(h.group)).map(h => h.word!))
  const hint = nextHint(P, history, hints)
  const hintsLeft = HINTS - hints.length
  // Found groups in the order found; on a loss, the rest follow, easiest first.
  const shown = s.lost ? [...s.solved, ...[0, 1, 2, 3].filter(g => !s.solved.includes(g))] : s.solved

  const say = useCallback((text: string) => {
    window.clearTimeout(toastTimer.current)
    setToast(text)
    if (text) toastTimer.current = window.setTimeout(() => setToast(""), 2500)
  }, [])
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])
  useEffect(loadItalic, [])

  // Fit tile text after every layout change and on resize.
  useLayoutEffect(() => { fitTiles(wordRefs.current.values()) })
  useEffect(() => {
    const onResize = () => fitTiles(wordRefs.current.values())
    window.addEventListener("resize", onResize)
    document.fonts?.ready.then(onResize).catch(() => {})
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // The countdown only matters once the day's puzzle is done.
  useEffect(() => {
    if (!s.over) return
    const id = window.setInterval(() => {
      setCountdown(untilMidnight())
      if (todayString() !== date) onNewDay()
    }, 30_000)
    return () => window.clearInterval(id)
  }, [s.over, date, onNewDay])

  const els = (words: string[]) => words.map(w => tileRefs.current.get(w)).filter((e): e is HTMLButtonElement => !!e)

  // The picked tiles hop one after another, in board order.
  async function hop(words: string[]) {
    if (calm()) return
    const inOrder = unsolved.filter(w => words.includes(w))
    const anims = els(inOrder).map((el, i) => el.animate(
      [{ transform: "none" }, { transform: "translateY(-8px)", offset: 0.5 }, { transform: "none" }],
      { duration: M.hop, delay: i * M.stagger, easing: EASE }))
    await Promise.all(anims.map(a => a.finished.catch(() => {})))
  }

  // A correct four slide into the top row (FLIP) before becoming the group bar.
  // Swap, don't reorder: each picked tile below the top row trades places
  // with an unpicked one in it, so only those tiles move.
  async function gather(words: string[]) {
    const next = unsolved.slice()
    const out = next.map((_, i) => i).filter(i => i >= SIZE && words.includes(next[i]))
    const into = next.map((_, i) => i).filter(i => i < SIZE && !words.includes(next[i]))
    out.forEach((i, k) => { [next[i], next[into[k]]] = [next[into[k]], next[i]] })
    if (calm() || out.length === 0) { setOrder(next); return }
    const before = new Map(next.map(w => [w, tileRefs.current.get(w)?.getBoundingClientRect()]))
    flushSync(() => setOrder(next))
    const anims = next.flatMap(w => {
      const el = tileRefs.current.get(w), a = before.get(w)
      if (!el || !a) return []
      const b = el.getBoundingClientRect()
      const dx = a.left - b.left, dy = a.top - b.top
      if (!dx && !dy) return []
      el.style.zIndex = words.includes(w) ? "1" : ""
      return [el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: M.move, easing: EASE })]
    })
    await Promise.all(anims.map(a => a.finished.catch(() => {})))
    els(next).forEach(el => { el.style.zIndex = "" })
  }

  function shake(words: string[]) {
    if (calm()) return
    for (const el of els(words)) {
      el.animate(
        [{ transform: "none" }, { transform: "translateX(-4px)", offset: 0.2 }, { transform: "translateX(4px)", offset: 0.4 },
          { transform: "translateX(-4px)", offset: 0.6 }, { transform: "translateX(4px)", offset: 0.8 }, { transform: "none" }],
        { duration: M.shake, easing: EASE })
    }
  }

  const toggle = (w: string) => {
    if (busy || s.over) return
    setPicked(p => p.includes(w) ? p.filter(x => x !== w) : p.length < SIZE ? [...p, w] : p)
  }

  async function submit() {
    if (busy || s.over || picked.length !== SIZE) return
    const pick = picked
    const r = check(P, pick, history)
    if (r.result === "repeat") { say("Already guessed."); return }
    const nextHistory = [...history, pick]
    const after = state(P, nextHistory)
    save({ date, n, history: nextHistory, hints })
    say("")
    setBusy(true)
    await hop(pick)
    if (r.result === "correct") {
      await gather(pick)
      setPicked([])
      setFresh([r.group])
      setHistory(nextHistory)
    } else {
      say(r.result === "one-away" ? "One away." : "Not a group.")
      if (after.over) {
        setPicked([])
        setFresh([0, 1, 2, 3].filter(g => !s.solved.includes(g)))
        setHistory(nextHistory)
      } else {
        setHistory(nextHistory)
        shake(pick)
      }
    }
    setBusy(false)
    if (after.over) onFinish?.()
  }

  function takeHint() {
    if (busy || !hint) return
    const next = [...hints, hint]
    setHints(next)
    save({ date, n, history, hints: next })
    const t = hint.word ? tileById(P, hint.word) : undefined
    say(!t ? "" : t.kind === "flag" ? "The marked flag is in that group." : `${tileText(t)} is in that group.`)
  }

  async function share() {
    const text = shareText(P, history, `Globalio Connections #${n}`, SHARE_URL, hints.length)
    const how = await shareOrCopy(text)
    setShareMsg(how === "copied" ? "Copied. Paste it anywhere." : how === "shared" ? "Shared." : "")
  }

  const pill = (primary: boolean, enabled: boolean): CSSProperties => ({
    minHeight: 44, padding: "0 16px", borderRadius: 999, fontFamily: FONT.mono, fontWeight: 600, fontSize: 14,
    border: `1px solid ${enabled ? T.text : T.line}`,
    background: primary && enabled ? T.text : "transparent",
    color: !enabled ? T.dim : primary ? T.surface : T.text,
    cursor: enabled ? "pointer" : "default",
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <style>{`
        .cx-tile { transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease; }
        @media (hover: hover) {
          .cx-tile:not([aria-pressed="true"]):not(:disabled):hover { border-color: ${T.lineHi}; background: ${T.void}; }
          .cx-btn:not(:disabled):hover { border-color: ${T.text}; background: ${T.surfaceHi}; }
          .cx-btn.cx-primary:not(:disabled):hover { background: ${T.text}; color: ${T.surface}; border-color: ${T.text}; opacity: 0.9; }
        }
        .cx-tile:focus-visible, .cx-btn:focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 2px; }
        @keyframes cxPop { from { opacity: 0; transform: scale(0.96); } 60% { opacity: 1; transform: scale(1.02); } to { transform: none; } }
        .cx-pop { animation: cxPop ${M.pop}ms ${EASE} both; }
        @media (prefers-reduced-motion: reduce) {
          .cx-tile, .cx-btn { transition: none; }
          .cx-pop { animation: none; }
        }
      `}</style>

      <ScreenHeader title="Connections" subtitle="A new puzzle every day" onBack={onBack}
        right={<HeaderStat label="No.">{n}</HeaderStat>} />

      <main className="w-full mx-auto flex flex-col" style={{ maxWidth: 480, padding: "4px 16px 32px", gap: 12 }}>
        <p style={{ margin: 0, fontSize: 14, color: T.muted, textAlign: "center", lineHeight: 1.4 }}>
          Find four groups of four. A tile shows a country, its capital, its flag or its own name for itself, and each group is all one kind.
        </p>

        {shown.length > 0 && (
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {shown.map(g => {
              const grp = P.groups[g]
              const isNew = fresh.includes(g)
              const flags = grp.tiles[0].kind === "flag"
              const answers = grp.tiles.map(tileAnswer)
              return (
                <li key={g} className={isNew ? "cx-pop" : undefined}
                  style={{ background: GROUP_TONES[g], borderRadius: 8, padding: "12px 16px", minHeight: 72, display: "grid", gap: 4, alignContent: "center", textAlign: "center",
                    animationDelay: isNew ? `${fresh.indexOf(g) * M.stagger * 4}ms` : undefined }}
                  aria-label={`${GROUP_TONE_NAMES[g]} group: ${grp.name}. ${flags ? "Flags of " : ""}${answers.join(", ")}. ${grp.why}`}>
                  <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "0.04em", textTransform: "uppercase" }}>{grp.name}</span>
                  {flags ? (
                    <span style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 12px", fontSize: 14 }}>
                      {grp.tiles.map(t => (
                        <span key={t.code} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <FlagImage code={t.code} style={{ width: 20, height: 15, objectFit: "cover", borderRadius: 2, boxShadow: `0 0 0 1px ${tint(T.text, 0.2)}` }} />
                          {tileAnswer(t)}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span style={{ fontSize: 14, lineHeight: 1.4 }}>{answers.join(", ")}</span>
                  )}
                  <span style={{ fontSize: 13, lineHeight: 1.4 }}>{grp.why}</span>
                </li>
              )
            })}
          </ol>
        )}

        {!s.over && hintedGroup !== undefined && (
          <p role="note" style={{ margin: 0, padding: "8px 12px", borderRadius: 8, fontSize: 14, textAlign: "center",
            background: T.surface, border: `1px solid ${T.line}`, borderLeft: `4px solid ${GROUP_TONES[hintedGroup]}` }}>
            <span style={{ color: T.muted }}>Hint: one group is </span>
            <strong style={{ fontWeight: 700 }}>{P.groups[hintedGroup].name}</strong>
          </p>
        )}

        {!s.over && (
          <div role="group" aria-label="Tiles" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
            {unsolved.map(w => {
              const t = tileById(P, w)!
              const on = picked.includes(w)
              const marked = hintedWords.has(w)
              const tone = GROUP_TONES[groupOf(P, w)]
              const flag = t.kind === "flag"
              const native = t.kind === "native"
              return (
                <button key={w} type="button" className="cx-tile" aria-pressed={on} disabled={busy}
                  aria-label={tileLabel(t) + (marked ? " (hinted)" : "")} data-hinted={marked || undefined} data-kind={t.kind} data-tile={w}
                  ref={el => { if (el) tileRefs.current.set(w, el); else tileRefs.current.delete(w) }}
                  onClick={() => toggle(w)}
                  style={{
                    position: "relative", minHeight: 76, minWidth: 0, borderRadius: 8, overflow: "hidden",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
                    padding: flag ? 6 : "6px 2px",
                    // Flags keep their picture when picked, so the frame thickens and darkens instead.
                    border: `${(flag ? on || marked : marked && !on) ? 2 : 1}px solid ${on || marked ? T.text : T.line}`,
                    background: on ? (flag ? tint(T.text, 0.85) : T.text) : marked ? tint(tone, 0.55) : T.surfaceHi,
                    color: on ? T.surface : T.text,
                    cursor: busy ? "default" : "pointer",
                  }}>
                  {flag ? (
                    <FlagImage code={t.code} alt="" style={{
                      display: "block", width: "100%", maxWidth: 84, aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 2,
                      boxShadow: `0 0 0 1px ${on ? T.surface : tint(T.text, 0.2)}`, pointerEvents: "none",
                    }} />
                  ) : (
                    <>
                      <span lang={native ? endonymOf(t.code)?.lang : undefined}
                        ref={el => { if (el) wordRefs.current.set(w, el); else wordRefs.current.delete(w) }}
                        style={{
                          display: "block", width: "100%", lineHeight: 1.15, overflowWrap: "normal", wordBreak: "normal",
                          fontFamily: native ? FONT.display : FONT.mono, fontStyle: native ? "italic" : "normal",
                          fontWeight: t.kind === "country" ? 700 : 600,
                        }}>
                        {halve(tileText(t))}
                      </span>
                      <Caption tile={t} on={on} />
                    </>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <div role="status" aria-live="polite" style={{ minHeight: s.over ? 0 : 24, textAlign: "center", fontWeight: 600, fontSize: 15 }}>{toast}</div>

        {!s.over && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <span style={{ fontSize: 14, color: T.muted }}>Mistakes left:</span>
              <span aria-hidden style={{ display: "inline-flex", gap: 8 }}>
                {Array.from({ length: MISTAKES }, (_, i) => (
                  <span key={i} style={{ width: 12, height: 12, borderRadius: 999, background: i < s.left ? T.text : "transparent", border: `1px solid ${i < s.left ? T.text : T.line}` }} />
                ))}
              </span>
              <span className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{s.left} of {MISTAKES}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
              <button type="button" className="cx-btn" style={pill(false, !busy)} disabled={busy}
                onClick={() => setOrder(o => shuffle(o))}>Shuffle</button>
              <button type="button" className="cx-btn" style={pill(false, !busy && picked.length > 0)} disabled={busy || picked.length === 0}
                onClick={() => setPicked([])}>Deselect all</button>
              <button type="button" className="cx-btn cx-primary" style={pill(true, !busy && picked.length === SIZE)} disabled={busy || picked.length !== SIZE}
                onClick={submit}>Submit</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button type="button" className="cx-btn" disabled={busy || !hint} onClick={takeHint}
                style={{ ...pill(false, !busy && !!hint), ...(hint ? {} : { borderStyle: "dashed", background: T.surfaceHi }) }}>
                {hint ? `Hint (${hintsLeft} left)` : "No hints left"}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: T.muted, textAlign: "center" }}>
              Hints are free: the first names a group, the next two each mark one of its tiles.
            </p>
          </>
        )}

        {s.over && (
          <section aria-labelledby="cx-end" style={{ display: "grid" }}>
            <ResultCard style={{ alignItems: "center", textAlign: "center" }}>
            <ResultHeader icon={s.won ? "connections" : "x"} accent={s.won ? T.green : T.danger}
              titleId="cx-end" title={s.won ? (s.mistakes === 0 && hints.length === 0 ? "Perfect" : "Solved") : "Out of mistakes"}
              score={<>
                {s.won
                  ? `All four groups with ${s.mistakes} ${s.mistakes === 1 ? "mistake" : "mistakes"}`
                  : `You found ${s.solved.length} of 4 groups`}
                {hints.length ? `${s.won ? " and" : ", using"} ${hints.length} ${hints.length === 1 ? "hint" : "hints"}.` : s.won ? " and no hints." : "."}
                {s.lost && " The rest are shown above."}
              </>} />
            <div aria-label="Your guesses, one row each" role="img" style={{ display: "grid", gap: 4 }}>
              {rows(P, history).map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 4 }}>
                  {r.map((g, j) => <span key={j} style={{ width: 20, height: 20, borderRadius: 4, background: GROUP_TONES[g] }} />)}
                </div>
              ))}
            </div>
            <PrimaryButton onClick={share}>Share result</PrimaryButton>
            <div role="status" aria-live="polite" style={{ minHeight: 20, fontSize: 13, color: T.muted }}>{shareMsg}</div>
            <p style={{ margin: 0, fontSize: 14 }}>
              Puzzle #{n + 1 > PUZZLE_COUNT ? 1 : n + 1} arrives tomorrow, in {countdown}.
            </p>
            </ResultCard>
          </section>
        )}
      </main>
    </div>
  )
}

export default function ConnectionsScreen(props: Props) {
  // Read the date once per mount; remount at midnight if the page stays open.
  const [date, setDate] = useState(todayString)
  const onNewDay = useCallback(() => setDate(todayString()), [])
  return <Game key={date} date={date} {...props} onNewDay={onNewDay} />
}
