import { useEffect, useRef, useState } from "react"
import { ExternalLink, Lightbulb, ChevronLeft, ChevronRight, Shuffle } from "lucide-react"
import { ATLAS_MAPS, MIN_YEAR, MAX_YEAR, atlasScore, dailyIndex, scanUrl, ukToday, verdict } from "../utils/atlasWhen"
import type { AtlasMap } from "../utils/atlasWhen"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, PrimaryButton, SecondaryButton } from "./gameUi"
import AtlasMapViewer from "./AtlasMapViewer"

/* Atlas, When? — a real world map from 1784 to 2015, its printed date masked.
   Pan and zoom, read the borders and names, guess the publication year.
   One shared daily map (it changes at midnight UK time) plus the full archive
   of 197 maps for unlimited practice. Rebuilt from the original standalone
   game; the maps, hints and clues are its own. */

interface Props { onBack: () => void; onFinish?: () => void }

const ACC = ACCENT.codex
const DAILY_KEY = "globalio_atlas_daily"     // { day, id, guess } for today's map
const PLAYED_KEY = "globalio_atlas_played"   // { [mapId]: guess } for archive practice
const PAGE = 24

const read = <V,>(key: string, fallback: V): V => { try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback } catch { return fallback } }
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode */ } }

type View = { mode: "daily" } | { mode: "archive" } | { mode: "practice"; index: number }

export default function AtlasWhenScreen({ onBack, onFinish }: Props) {
  const [view, setView] = useState<View>({ mode: "daily" })
  const [day, setDay] = useState(ukToday)
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState<"all" | "unplayed" | "played">("all")
  const [showHelp, setShowHelp] = useState(false)

  // The daily map rolls over at UK midnight even if the screen stays open.
  useEffect(() => {
    const id = window.setInterval(() => setDay(d => { const t = ukToday(); return t === d ? d : t }), 30000)
    return () => clearInterval(id)
  }, [])

  const open = (v: View) => { setView(v); window.scrollTo({ top: 0 }) }
  const playRandom = () => open({ mode: "practice", index: Math.floor(Math.random() * ATLAS_MAPS.length) })

  const tabs = (
    <div role="tablist" aria-label="Game mode" style={{ display: "flex", gap: 6, padding: 4, borderRadius: 12, background: T.surfaceHi, border: `1px solid ${T.line}` }}>
      {([["daily", "Today’s map"], ["archive", "The archive"]] as const).map(([m, label]) => {
        const on = view.mode === m || (m === "archive" && view.mode === "practice")
        return (
          <button key={m} role="tab" aria-selected={on} type="button" onClick={() => open(m === "daily" ? { mode: "daily" } : { mode: "archive" })}
            style={{ flex: 1, height: 38, borderRadius: 9, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer",
              background: on ? T.surface : "transparent", color: on ? T.text : T.muted, boxShadow: on ? `0 1px 4px -2px ${tint(T.text, 0.5)}` : "none" }}>
            {label}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg }}>
      <ScreenHeader title="Atlas, When?" subtitle="Date a real world map" onBack={onBack}
        right={<button type="button" onClick={() => setShowHelp(h => !h)} aria-expanded={showHelp}
          style={{ fontSize: 13, fontWeight: 600, color: ACC, background: "none", border: "none", cursor: "pointer", padding: 6 }}>How to play</button>} />

      <div className="w-full mx-auto px-4 pb-10" style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 14 }}>
        {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
        {tabs}
        {view.mode === "daily" && (
          <Round key={`daily-${day}`} map={ATLAS_MAPS[dailyIndex(day)]} label={formatDay(day)} daily day={day}
            onFinish={onFinish} onArchive={() => open({ mode: "archive" })} onRandom={playRandom} />
        )}
        {view.mode === "practice" && (
          <Round key={`practice-${view.index}`} map={ATLAS_MAPS[view.index]} label={`Archive specimen ${String(view.index + 1).padStart(3, "0")}`}
            onFinish={onFinish} onArchive={() => open({ mode: "archive" })} onRandom={playRandom} />
        )}
        {view.mode === "archive" && (
          <Archive page={page} setPage={setPage} filter={filter} setFilter={setFilter}
            onPick={index => open({ mode: "practice", index })} onRandom={playRandom} />
        )}
      </div>
    </div>
  )
}

const formatDay = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })

function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: "16px 18px", fontSize: 14, color: T.text, lineHeight: 1.5 }}>
      <div className="geo-micro" style={{ fontSize: 10, color: ACC }}>Field notes</div>
      <h2 className="geo-display" style={{ fontSize: 20, fontWeight: 700, margin: "4px 0 8px" }}>A world map. A missing date.</h2>
      <p style={{ margin: "6px 0" }}>Pan and zoom to read country names, borders, colonies and how much of the world was known. Type a year or use the slider, then lock it in.</p>
      <p style={{ margin: "6px 0" }}>Everyone gets the same daily map, changing at midnight UK time; your answer is saved on this device. The archive holds every map for unlimited practice and doesn’t touch your daily guess.</p>
      <p style={{ margin: "6px 0" }}>You’re guessing the map’s recorded publication year. Printed years on the scans are masked and some maps are cropped; the reveal links to the untouched original.</p>
      <p style={{ margin: "6px 0" }}><b>Scoring:</b> 1,000 × e<sup>−years away ÷ 125</sup>. The exact year scores 1,000, ten years away 923, 42 years away 715.</p>
      <p style={{ margin: "6px 0", color: T.muted, fontSize: 13 }}>Old maps carry outdated borders, disputed claims and the language of their makers. A border can suggest an era without proving a single year.</p>
      <button type="button" onClick={onClose} style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: ACC, background: "none", border: "none", padding: 0, cursor: "pointer" }}>Got it</button>
    </div>
  )
}

/* ── One map: the viewer, then the guess panel or the reveal. ─────────── */
function Round({ map, label, daily = false, day, onFinish, onArchive, onRandom }:
  { map: AtlasMap; label: string; daily?: boolean; day?: string; onFinish?: () => void; onArchive: () => void; onRandom: () => void }) {
  const saved = daily ? read<{ day?: string; id?: string; guess?: number }>(DAILY_KEY, {}) : {}
  const already = daily && saved.day === day && saved.id === map.id && typeof saved.guess === "number" ? saved.guess : null
  const [guess, setGuess] = useState<number | null>(already)
  const [value, setValue] = useState("1900")
  const [error, setError] = useState("")
  const [ready, setReady] = useState(false)
  const [hint, setHint] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)

  const submit = () => {
    if (guess !== null || !ready) return
    const n = Number(value)
    if (!Number.isInteger(n) || n < MIN_YEAR || n > MAX_YEAR) { setError(`Choose a whole year from ${MIN_YEAR} to ${MAX_YEAR}.`); return }
    if (daily) write(DAILY_KEY, { day, id: map.id, guess: n })
    else write(PLAYED_KEY, { ...read<Record<string, number>>(PLAYED_KEY, {}), [map.id]: n })
    setGuess(n)
    onFinish?.()
    // The reveal sits under the map; bring it into view.
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60)
  }

  const points = guess === null ? 0 : atlasScore(guess, map.year)

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span className="geo-micro" style={{ fontSize: 10, color: T.muted }}>{daily ? `Today’s map · ${label}` : label}</span>
          <HeaderStat label="Score" accent={ACC}>{guess === null ? "—" : points.toLocaleString()}</HeaderStat>
        </div>
        <AtlasMapViewer map={map} onReady={setReady} />
        <div style={{ fontSize: 12, color: T.muted }}>
          Scan courtesy of <a href={map.collectionURL} target="_blank" rel="noopener" style={{ color: ACC }}>{map.collectionName}</a>. Full citation after your guess.
        </div>
      </div>

      <div ref={resultRef} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 14, scrollMarginTop: 12 }}>
        {guess === null ? (
          <>
            <div>
              <div className="geo-micro" style={{ fontSize: 10, color: ACC }}>Read between the borders</div>
              <h2 className="geo-display" style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "4px 0 2px" }}>What year is this map?</h2>
              <div style={{ fontSize: 13, color: T.muted }}>Guess its publication year.</div>
            </div>
            <form onSubmit={e => { e.preventDefault(); submit() }} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <input type="number" inputMode="numeric" min={MIN_YEAR} max={MAX_YEAR} value={value} aria-label="Your guess, as a year"
                onChange={e => { setValue(e.target.value); setError("") }}
                style={{ width: "100%", fontFamily: FONT.display, fontSize: 44, fontWeight: 700, color: T.text, background: "transparent", border: "none", borderBottom: `2px solid ${T.text}`, padding: "2px 0", outline: "none" }} />
              <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={Math.min(MAX_YEAR, Math.max(MIN_YEAR, Number(value) || 1900))} aria-label="Choose a year"
                onChange={e => { setValue(e.target.value); setError("") }} style={{ width: "100%", accentColor: ACC, margin: "14px 0 0" }} />
              <div className="geo-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.dim }}><span>{MIN_YEAR}</span><span>{MAX_YEAR}</span></div>
              {error && <div role="alert" style={{ fontSize: 13, color: T.danger, marginTop: 4 }}>{error}</div>}
              <PrimaryButton type="submit" accent={ACC} disabled={!ready} style={{ marginTop: 12 }}>Lock in my guess →</PrimaryButton>
            </form>
            <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
              {hint
                ? <p style={{ margin: 0, fontSize: 14, color: T.text, display: "flex", gap: 8 }}><Lightbulb size={17} color={ACC} style={{ flexShrink: 0, marginTop: 2 }} />{map.hint}</p>
                : <SecondaryButton onClick={() => setHint(true)} style={{ height: 44 }}><Lightbulb size={16} /> A nudge in the right direction</SecondaryButton>}
              <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>Optional hint · no score penalty</div>
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>{daily ? "One daily map · up to 1,000 points. New map at midnight, UK time." : "Archive practice · up to 1,000 points. Play as often as you like."}</div>
          </>
        ) : (
          <Reveal map={map} guess={guess} points={points} daily={daily} onArchive={onArchive} onRandom={onRandom} />
        )}
      </div>
    </div>
  )
}

function Reveal({ map, guess, points, daily, onArchive, onRandom }:
  { map: AtlasMap; guess: number; points: number; daily: boolean; onArchive: () => void; onRandom: () => void }) {
  const delta = Math.abs(guess - map.year)
  const report = `mailto:sjoudrie@gmail.com?subject=${encodeURIComponent(`Atlas, When? map ${map.id}`)}&body=${encodeURIComponent(`Map: ${map.id} (${map.title})\nMy guess: ${guess}\n\nWhat went wrong:\n`)}`
  return (
    <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: `3px solid ${ACC}`, paddingTop: 10, margin: "-4px 0 0" }}>
      <div className="geo-micro" style={{ fontSize: 10, color: ACC }}>{verdict(delta)}</div>
      <div className="geo-display" style={{ fontSize: 58, lineHeight: 1, fontWeight: 700, color: ACC }}>{map.year}</div>
      <div style={{ fontSize: 14, color: T.text }}>
        You guessed <b>{guess}</b> · {delta === 0 ? "exact match" : `${delta} year${delta === 1 ? "" : "s"} ${guess < map.year ? "too early" : "too late"}`}
      </div>
      <div className="geo-mono" style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{points.toLocaleString()} / 1,000 points</div>

      <h3 className="geo-display" style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: "6px 0 0" }}>{map.referenceClues ? "Dating reference points" : "The clues in the ink"}</h3>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: T.text, display: "flex", flexDirection: "column", gap: 8, lineHeight: 1.45 }}>
        {map.clues.map((c, i) => (
          <li key={i}>{c.text}{c.source && <> <a href={c.source} target="_blank" rel="noopener" aria-label="Historical source" style={{ color: ACC }}><ExternalLink size={12} style={{ display: "inline", verticalAlign: "-1px" }} /></a></>}</li>
        ))}
      </ul>

      <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
        <div style={{ color: T.text }}>{map.title}</div>
        {map.maker && <div>{map.maker}</div>}
        {map.publisher && <div>{map.publisher}</div>}
      </div>
      <a href={map.source} target="_blank" rel="noopener" style={{ fontSize: 14, fontWeight: 600, color: ACC }}>View the original and its date record ↗</a>
      <div style={{ fontSize: 12, color: T.muted }}>
        {map.credit}. The game view masks printed years; some scans are cropped.{" "}
        {map.rightsLink && <a href={map.rightsLink} target="_blank" rel="noopener" style={{ color: ACC }}>Reuse terms ↗</a>}
      </div>

      {daily && <div style={{ fontSize: 14, color: T.text }}><b>Today’s map is done.</b> A new one arrives at midnight UK time.</div>}
      <PrimaryButton accent={ACC} onClick={daily ? onArchive : onRandom}>{daily ? "Explore the archive →" : <><Shuffle size={16} /> Another random map</>}</PrimaryButton>
      {!daily && <SecondaryButton onClick={onArchive}>Back to the archive</SecondaryButton>}
      <a href={report} style={{ fontSize: 12, color: T.muted, alignSelf: "flex-start" }}>Report a problem with this map</a>
    </div>
  )
}

/* ── The archive: every map as a masked thumbnail, 24 to a page. ──────── */
function Archive({ page, setPage, filter, setFilter, onPick, onRandom }:
  { page: number; setPage: (n: number) => void; filter: "all" | "unplayed" | "played"; setFilter: (f: "all" | "unplayed" | "played") => void; onPick: (i: number) => void; onRandom: () => void }) {
  const played = read<Record<string, number>>(PLAYED_KEY, {})
  const items = ATLAS_MAPS.map((m, i) => ({ m, i })).filter(({ m }) => filter === "all" || (filter === "played") === (m.id in played))
  const pages = Math.max(1, Math.ceil(items.length / PAGE))
  const p = Math.min(page, pages - 1)
  const shown = items.slice(p * PAGE, (p + 1) * PAGE)
  const go = (n: number) => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }) }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div className="geo-micro" style={{ fontSize: 10, color: ACC }}>The complete collection</div>
        <h2 className="geo-display" style={{ fontSize: 24, fontWeight: 700, color: T.text, margin: "4px 0 4px" }}>Every map. Any time.</h2>
        <p style={{ margin: 0, fontSize: 14, color: T.muted }}>{ATLAS_MAPS.length} maps from the Library of Congress and the David Rumsey Map Collection, Stanford University Libraries. Dates stay hidden until you guess, and practice never touches your daily answer.</p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <PrimaryButton accent={ACC} onClick={onRandom} style={{ width: "auto", height: 44 }}><Shuffle size={16} /> Pick a random map</PrimaryButton>
        <label style={{ fontSize: 14, color: T.text, display: "inline-flex", alignItems: "center", gap: 8 }}>Show
          <select value={filter} onChange={e => { setFilter(e.target.value as typeof filter); setPage(0) }}
            style={{ height: 44, padding: "0 10px", borderRadius: 10, border: `1px solid ${T.line}`, background: T.surface, color: T.text, fontSize: 14 }}>
            <option value="all">All maps</option>
            <option value="unplayed">Unexplored</option>
            <option value="played">Played</option>
          </select>
        </label>
      </div>
      {shown.length === 0
        ? <p style={{ fontSize: 14, color: T.muted }}>No maps in this view yet.</p>
        : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            {shown.map(({ m, i }) => (
              <button key={m.id} type="button" onClick={() => onPick(i)} className="geo-tap"
                style={{ textAlign: "left", padding: 10, borderRadius: 12, border: `1px solid ${T.line}`, background: T.surface, cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}>
                <Thumb map={m} />
                <span className="geo-micro" style={{ fontSize: 9, color: T.muted }}>Specimen {String(i + 1).padStart(3, "0")}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: m.id in played ? T.muted : T.text }}>
                  {m.id in played ? `Played · ${atlasScore(played[m.id], m.year).toLocaleString()} pts` : "Unexplored →"}
                </span>
              </button>
            ))}
          </div>
        )}
      {pages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontSize: 14, color: T.text }}>
          <button type="button" aria-label="Previous page" disabled={p === 0} onClick={() => go(p - 1)} style={pagerBtn(p === 0)}><ChevronLeft size={18} /></button>
          <span className="geo-mono">Page {p + 1} of {pages}</span>
          <button type="button" aria-label="Next page" disabled={p === pages - 1} onClick={() => go(p + 1)} style={pagerBtn(p === pages - 1)}><ChevronRight size={18} /></button>
        </div>
      )}
    </div>
  )
}

const pagerBtn = (off: boolean) => ({
  width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 10, border: `1px solid ${T.line}`,
  background: T.surface, color: T.text, opacity: off ? 0.4 : 1, cursor: off ? "default" : "pointer",
}) as const

// A small preview drawn on a canvas so the printed year is masked here too.
function Thumb({ map }: { map: AtlasMap }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<"idle" | "loaded" | "error">("idle")
  useEffect(() => {
    const canvas = ref.current!
    let img: HTMLImageElement | null = null
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting) || img) return
      io.disconnect()
      img = new Image()
      img.referrerPolicy = "no-referrer"
      img.onload = () => {
        const [, , bw, bh] = map.detail.base
        const dpr = window.devicePixelRatio || 1
        const W = canvas.clientWidth, H = canvas.clientHeight
        canvas.width = W * dpr; canvas.height = H * dpr
        const ctx = canvas.getContext("2d")!
        const s = Math.min(W / bw, H / bh)
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (W - bw * s) / 2, dpr * (H - bh * s) / 2)
        ctx.drawImage(img!, 0, 0, bw, bh)
        ctx.fillStyle = "#e7dfc8"
        for (const [x1, y1, x2, y2] of map.redactions) ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
        setState("loaded")
      }
      img.onerror = () => setState("error")
      img.src = scanUrl(map.detail, 360)
    }, { rootMargin: "200px" })
    io.observe(canvas)
    return () => { io.disconnect(); if (img) img.onload = img.onerror = null }
  }, [map])
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 10", borderRadius: 8, overflow: "hidden", background: "#e7e9df" }}>
      <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block" }} />
      {state !== "loaded" && <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 11, color: T.dim }}>{state === "error" ? "Preview unavailable" : ""}</span>}
    </div>
  )
}
