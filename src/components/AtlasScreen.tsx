import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { ExternalLink, Lightbulb, ChevronLeft, ChevronRight, ChevronDown, Shuffle, HelpCircle } from "lucide-react"
import { ATLAS_MAPS, MIN_YEAR, MAX_YEAR, atlasScore, dailyIndex, scanUrl, ukToday, verdict } from "../utils/atlasWhen"
import type { AtlasMap } from "../utils/atlasWhen"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { HeaderStat, PrimaryButton, SecondaryButton } from "./gameUi"
import AtlasMapViewer from "./AtlasMapViewer"

/* Atlas — a real world map from 1784 to 2015, its printed date masked.
   Explore it, read the borders and names, guess the publication year.
   One shared daily map (it changes at midnight UK time) plus an archive of
   197 maps for practice.

   Layout: the map fills the screen and the guess sits in a fixed tray under
   it, so the map and the controls are always both in view, one-handed. After
   the guess the tray becomes the reveal. */

interface Props { onBack: () => void; onFinish?: () => void }

const ACC = ACCENT.codex
const DAILY_KEY = "globalio_atlas_daily"     // { day, id, guess } for today's map
const PLAYED_KEY = "globalio_atlas_played"   // { [mapId]: guess } for archive practice
const PAGE = 24

const read = <V,>(key: string, fallback: V): V => { try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback } catch { return fallback } }
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode */ } }
const clampYear = (n: number) => Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.round(n)))
const shortDay = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" })
const mapNo = (i: number) => String(i + 1).padStart(3, "0")

type View = { mode: "daily" } | { mode: "archive" } | { mode: "practice"; index: number }

export default function AtlasScreen({ onBack, onFinish }: Props) {
  const [view, setView] = useState<View>({ mode: "daily" })
  const [day, setDay] = useState(ukToday)
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState<Filter>("all")
  const [help, setHelp] = useState(false)

  // The daily map rolls over at UK midnight even if the screen stays open.
  useEffect(() => {
    const id = window.setInterval(() => setDay(d => { const t = ukToday(); return t === d ? d : t }), 30000)
    return () => clearInterval(id)
  }, [])

  const open = (v: View) => { setView(v); window.scrollTo({ top: 0 }) }
  const playRandom = () => open({ mode: "practice", index: Math.floor(Math.random() * ATLAS_MAPS.length) })
  const playing = view.mode !== "archive"

  const subtitle = view.mode === "daily" ? `Daily map · ${shortDay(day)}` : view.mode === "practice" ? `Archive · map ${mapNo(view.index)} of ${ATLAS_MAPS.length}` : `${ATLAS_MAPS.length} maps, 1784–2015`

  return (
    // While a map is open the screen is exactly one viewport tall: header,
    // map, tray. The archive scrolls like any other page.
    <div className="flex flex-col" style={{ background: T.bg, height: playing ? "100dvh" : undefined, minHeight: "100dvh" }}>
      <ScreenHeader title="Atlas" subtitle={subtitle} onBack={onBack}
        right={<button type="button" aria-label="How to play" aria-expanded={help} onClick={() => setHelp(h => !h)}
          style={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 999, border: `1px solid ${T.line}`, background: help ? tint(ACC, 0.12) : T.surface, color: help ? ACC : T.muted, cursor: "pointer" }}>
          <HelpCircle size={19} />
        </button>} />

      <div className="w-full mx-auto" style={{ maxWidth: 760, padding: "0 16px 10px" }}>
        <ModeSwitch mode={view.mode === "daily" ? "daily" : "archive"} onDaily={() => open({ mode: "daily" })} onArchive={() => open({ mode: "archive" })} />
        {help && <HowToPlay onClose={() => setHelp(false)} />}
      </div>

      {view.mode === "daily" && (
        <Round key={`daily-${day}`} map={ATLAS_MAPS[dailyIndex(day)]} daily day={day}
          onFinish={onFinish} onNext={() => open({ mode: "archive" })} />
      )}
      {view.mode === "practice" && (
        <Round key={`practice-${view.index}`} map={ATLAS_MAPS[view.index]}
          onFinish={onFinish} onNext={playRandom} onArchive={() => open({ mode: "archive" })} />
      )}
      {view.mode === "archive" && (
        <Archive page={page} setPage={setPage} filter={filter} setFilter={setFilter}
          onPick={index => open({ mode: "practice", index })} onRandom={playRandom} />
      )}
    </div>
  )
}

function ModeSwitch({ mode, onDaily, onArchive }: { mode: "daily" | "archive"; onDaily: () => void; onArchive: () => void }) {
  const tab = (on: boolean, label: string, onClick: () => void) => (
    <button role="tab" aria-selected={on} type="button" onClick={onClick}
      style={{ flex: 1, height: 36, borderRadius: 9, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer",
        background: on ? T.surface : "transparent", color: on ? T.text : T.muted, boxShadow: on ? `0 1px 4px -2px ${tint(T.text, 0.5)}` : "none" }}>
      {label}
    </button>
  )
  return (
    <div role="tablist" aria-label="Game mode" style={{ display: "flex", gap: 4, padding: 3, borderRadius: 12, background: T.surfaceHi, border: `1px solid ${T.line}` }}>
      {tab(mode === "daily", "Today", onDaily)}
      {tab(mode === "archive", "Archive", onArchive)}
    </div>
  )
}

function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ marginTop: 10, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: "14px 16px", fontSize: 14, color: T.text, lineHeight: 1.5 }}>
      <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
        <li><b>Explore.</b> Drag the map and pinch or scroll to zoom. Country names, borders and colonies are your clues.</li>
        <li><b>Guess the year</b> it was published, with the slider or the − / + buttons.</li>
        <li><b>Score up to 1,000.</b> The exact year scores 1,000, ten years off 923, 42 years off 715.</li>
      </ol>
      <p style={{ margin: "8px 0 0", color: T.muted, fontSize: 13 }}>Printed years are masked. Today’s map is the same for everyone and changes at midnight UK time; the archive is for unlimited practice. Old maps carry outdated borders and their makers’ language.</p>
      <button type="button" onClick={onClose} style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: ACC, background: "none", border: "none", padding: 0, cursor: "pointer" }}>Got it</button>
    </div>
  )
}

/* ── One map: the map on top, the guess tray (then the reveal) under it. ── */
function Round({ map, daily = false, day, onFinish, onNext, onArchive }:
  { map: AtlasMap; daily?: boolean; day?: string; onFinish?: () => void; onNext: () => void; onArchive?: () => void }) {
  const saved = daily ? read<{ day?: string; id?: string; guess?: number }>(DAILY_KEY, {}) : {}
  const already = daily && saved.day === day && saved.id === map.id && typeof saved.guess === "number" ? saved.guess : null
  const [guess, setGuess] = useState<number | null>(already)
  const [year, setYear] = useState(1900)
  const [typed, setTyped] = useState<string | null>(null)   // while the year is being typed
  const [ready, setReady] = useState(false)
  const [hint, setHint] = useState(false)

  const nudge = (d: number) => { setTyped(null); setYear(y => clampYear(y + d)) }
  const submit = () => {
    if (guess !== null || !ready) return
    const n = typed === null ? year : clampYear(Number(typed) || year)
    if (daily) write(DAILY_KEY, { day, id: map.id, guess: n })
    else write(PLAYED_KEY, { ...read<Record<string, number>>(PLAYED_KEY, {}), [map.id]: n })
    setYear(n); setTyped(null); setGuess(n)
    onFinish?.()
  }

  return (
    <div className="w-full mx-auto" style={{ maxWidth: 760, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "0 16px 16px", gap: 10 }}>
      <div style={{ flex: 1, minHeight: 200, borderRadius: 16, overflow: "hidden", border: `1px solid ${T.line}` }}>
        <AtlasMapViewer map={map} onReady={setReady} />
      </div>

      {guess === null ? (
        <Tray>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, minHeight: 32 }}>
            {hint
              ? <p style={{ margin: 0, fontSize: 13, color: T.text, display: "flex", gap: 6, lineHeight: 1.4 }}><Lightbulb size={16} color={ACC} style={{ flexShrink: 0, marginTop: 1 }} />{map.hint}</p>
              : <>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>What year was this map made?</span>
                <button type="button" onClick={() => setHint(true)}
                  style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, height: 32, padding: "0 12px", borderRadius: 999, border: `1px solid ${tint(ACC, 0.4)}`, background: tint(ACC, 0.08), color: ACC, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  <Lightbulb size={14} /> Hint
                </button>
              </>}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Step label="10 years earlier" onClick={() => nudge(-10)} disabled={year <= MIN_YEAR}>−10</Step>
            <Step label="1 year earlier" onClick={() => nudge(-1)} disabled={year <= MIN_YEAR}>−1</Step>
            <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} aria-label="Your guess, as a year"
              value={typed ?? String(year)}
              onFocus={e => { setTyped(String(year)); e.currentTarget.select() }}
              onChange={e => setTyped(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onBlur={() => { if (typed !== null) { const n = Number(typed); if (n >= 1000) setYear(clampYear(n)); setTyped(null) } }}
              onKeyDown={e => { if (e.key === "Enter") { e.currentTarget.blur(); submit() } }}
              style={{ flex: 1, minWidth: 0, textAlign: "center", fontFamily: FONT.display, fontSize: 40, fontWeight: 700, lineHeight: 1, color: T.text, background: "transparent", border: "none", borderRadius: 10, padding: "4px 0", outline: "none" }} />
            <Step label="1 year later" onClick={() => nudge(1)} disabled={year >= MAX_YEAR}>+1</Step>
            <Step label="10 years later" onClick={() => nudge(10)} disabled={year >= MAX_YEAR}>+10</Step>
          </div>

          <div>
            <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={year} aria-label="Choose a year"
              onChange={e => { setTyped(null); setYear(Number(e.target.value)) }}
              style={{ width: "100%", accentColor: ACC, margin: 0, height: 28 }} />
            {/* Century marks sit where those years fall on the slider. */}
            <div className="geo-mono" style={{ position: "relative", height: 14, fontSize: 11, color: T.dim, margin: "0 10px" }}>
              {[MIN_YEAR, 1800, 1900, MAX_YEAR].map(y => (
                <span key={y} style={{ position: "absolute", left: `${((y - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%`, transform: "translateX(-50%)" }}>{y}</span>
              ))}
            </div>
          </div>

          <PrimaryButton accent={ACC} disabled={!ready} onClick={submit}>{ready ? `Guess ${typed && Number(typed) >= 1000 ? clampYear(Number(typed)) : year}` : "Loading the map…"}</PrimaryButton>
        </Tray>
      ) : (
        <Reveal map={map} guess={guess} daily={daily} onNext={onNext} onArchive={onArchive} />
      )}
    </div>
  )
}

function Tray({ children }: { children: ReactNode }) {
  return (
    <div style={{ flexShrink: 0, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 10, boxShadow: `0 -4px 18px -12px ${tint(T.text, 0.5)}` }}>
      {children}
    </div>
  )
}

function Step({ children, label, onClick, disabled }: { children: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className="geo-mono"
      style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 12, border: `1px solid ${T.line}`, background: T.surfaceHi, color: T.text,
        fontSize: 14, fontWeight: 700, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, touchAction: "manipulation" }}>
      {children}
    </button>
  )
}

/* The guess and the answer on one 1700–2020 line: the clearest way to see
   how far off a guess was. */
function YearLine({ guess, year }: { guess: number; year: number }) {
  const at = (y: number) => `${((y - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%`
  const lo = Math.min(guess, year), hi = Math.max(guess, year)
  return (
    <div aria-hidden style={{ position: "relative", height: 34, margin: "2px 8px 0" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 14, height: 4, borderRadius: 2, background: T.line }} />
      <div style={{ position: "absolute", left: at(lo), width: `calc(${at(hi)} - ${at(lo)})`, top: 14, height: 4, background: tint(ACC, 0.45) }} />
      <span style={{ position: "absolute", left: at(guess), top: 9, width: 14, height: 14, marginLeft: -7, borderRadius: 999, background: T.surface, border: `3px solid ${T.muted}` }} />
      <span style={{ position: "absolute", left: at(year), top: 7, width: 18, height: 18, marginLeft: -9, borderRadius: 999, background: ACC, border: `3px solid ${T.surface}`, boxShadow: `0 0 0 1px ${ACC}` }} />
      <div className="geo-mono" style={{ position: "absolute", left: 0, right: 0, top: 24, display: "flex", justifyContent: "space-between", fontSize: 10, color: T.dim }}>
        <span>{MIN_YEAR}</span><span>{MAX_YEAR}</span>
      </div>
    </div>
  )
}

function Reveal({ map, guess, daily, onNext, onArchive }:
  { map: AtlasMap; guess: number; daily: boolean; onNext: () => void; onArchive?: () => void }) {
  const delta = Math.abs(guess - map.year)
  const points = atlasScore(guess, map.year)
  const [about, setAbout] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.focus({ preventScroll: true }) }, [])
  const report = `mailto:sjoudrie@gmail.com?subject=${encodeURIComponent(`Atlas map ${map.id}`)}&body=${encodeURIComponent(`Map: ${map.id} (${map.title})\nMy guess: ${guess}\n\nWhat went wrong:\n`)}`

  return (
    <div ref={ref} tabIndex={-1} aria-live="polite" style={{ flexShrink: 0, maxHeight: "50dvh", overflowY: "auto", background: T.surface, border: `1px solid ${T.line}`, borderTop: `3px solid ${ACC}`, borderRadius: 16, padding: "14px 16px 16px", display: "grid", alignContent: "start", gap: 12, outline: "none", boxShadow: `0 -4px 18px -12px ${tint(T.text, 0.5)}` }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="geo-micro" style={{ fontSize: 10, color: ACC }}>{verdict(delta)}</div>
          <div className="geo-display" style={{ fontSize: 48, lineHeight: 1, fontWeight: 700, color: ACC, marginTop: 4 }}>{map.year}</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
            You said <b style={{ color: T.text }}>{guess}</b> · {delta === 0 ? "exact!" : `${delta} year${delta === 1 ? "" : "s"} ${guess < map.year ? "early" : "late"}`}
          </div>
        </div>
        <HeaderStat accent={ACC}>{points.toLocaleString()} pts</HeaderStat>
      </div>
      <YearLine guess={guess} year={map.year} />

      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 }}>{map.referenceClues ? "How to date it" : "The clues in the ink"}</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: T.text, display: "flex", flexDirection: "column", gap: 7, lineHeight: 1.45 }}>
          {map.clues.map((c, i) => (
            <li key={i}>{c.text}{c.source && <> <a href={c.source} target="_blank" rel="noopener" aria-label="Historical source" style={{ color: ACC }}><ExternalLink size={12} style={{ display: "inline", verticalAlign: "-1px" }} /></a></>}</li>
          ))}
        </ul>
      </div>

      <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 10 }}>
        <button type="button" aria-expanded={about} onClick={() => setAbout(a => !a)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: 0, fontSize: 13, fontWeight: 700, color: T.text, cursor: "pointer" }}>
          About this map <ChevronDown size={16} style={{ transform: about ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>
        {about && (
          <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ color: T.text }}>{map.title}</div>
            {(map.maker || map.publisher) && <div>{[map.maker, map.publisher].filter(Boolean).join(" · ")}</div>}
            <div>{map.credit}. The game masks printed years; some scans are cropped.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              <a href={map.source} target="_blank" rel="noopener" style={{ color: ACC, fontWeight: 600 }}>Original and date record ↗</a>
              {map.rightsLink && <a href={map.rightsLink} target="_blank" rel="noopener" style={{ color: ACC }}>Reuse terms ↗</a>}
              <a href={report} style={{ color: T.muted }}>Report a problem</a>
            </div>
          </div>
        )}
      </div>

      {daily && <div style={{ fontSize: 13, color: T.muted }}>That’s today’s map. A new one arrives at midnight UK time.</div>}
      {/* The next step stays in reach while the clues scroll above it. */}
      <div style={{ position: "sticky", bottom: -16, margin: "0 -16px -16px", padding: "10px 16px 16px", background: T.surface, borderTop: `1px solid ${T.line}`, display: "flex", gap: 8 }}>
        {onArchive && <SecondaryButton onClick={onArchive} style={{ flex: 1, width: "auto" }}>Archive</SecondaryButton>}
        <PrimaryButton accent={ACC} onClick={onNext} style={{ flex: 2, width: "auto" }}>{daily ? "Practise on the archive →" : <><Shuffle size={16} /> Next map</>}</PrimaryButton>
      </div>
    </div>
  )
}

/* ── The archive: every map as a masked thumbnail, 24 to a page. ──────── */
type Filter = "all" | "unplayed" | "played"

function Archive({ page, setPage, filter, setFilter, onPick, onRandom }:
  { page: number; setPage: (n: number) => void; filter: Filter; setFilter: (f: Filter) => void; onPick: (i: number) => void; onRandom: () => void }) {
  const played = read<Record<string, number>>(PLAYED_KEY, {})
  const items = ATLAS_MAPS.map((m, i) => ({ m, i })).filter(({ m }) => filter === "all" || (filter === "played") === (m.id in played))
  const pages = Math.max(1, Math.ceil(items.length / PAGE))
  const p = Math.min(page, pages - 1)
  const shown = items.slice(p * PAGE, (p + 1) * PAGE)
  const playedCount = ATLAS_MAPS.filter(m => m.id in played).length
  const go = (n: number) => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }) }
  const chip = (f: Filter, label: string) => (
    <button key={f} type="button" aria-pressed={filter === f} onClick={() => { setFilter(f); setPage(0) }}
      style={{ height: 34, padding: "0 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer",
        border: `1px solid ${filter === f ? ACC : T.line}`, background: filter === f ? tint(ACC, 0.12) : T.surface, color: filter === f ? ACC : T.muted }}>
      {label}
    </button>
  )

  return (
    <div className="w-full mx-auto" style={{ maxWidth: 760, padding: "4px 16px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
      <PrimaryButton accent={ACC} onClick={onRandom}><Shuffle size={17} /> Play a random map</PrimaryButton>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        {chip("all", "All")}{chip("unplayed", "New")}{chip("played", `Played · ${playedCount}`)}
      </div>
      {shown.length === 0
        ? <p style={{ fontSize: 14, color: T.muted, margin: "20px 0", textAlign: "center" }}>{filter === "played" ? "Maps you play show up here." : "You’ve played every map!"}</p>
        : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {shown.map(({ m, i }) => {
              const g = played[m.id]
              return (
                <button key={m.id} type="button" onClick={() => onPick(i)} className="geo-tap" aria-label={`Map ${mapNo(i)}${g !== undefined ? `, played, ${atlasScore(g, m.year)} points` : ""}`}
                  style={{ textAlign: "left", padding: 0, borderRadius: 12, border: `1px solid ${T.line}`, background: T.surface, cursor: "pointer", overflow: "hidden" }}>
                  <Thumb map={m} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px" }}>
                    <span className="geo-mono" style={{ fontSize: 12, fontWeight: 700, color: T.text }}>#{mapNo(i)}</span>
                    {g !== undefined
                      ? <span className="geo-mono" style={{ fontSize: 12, fontWeight: 700, color: ACC }}>{atlasScore(g, m.year)}</span>
                      : <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>NEW</span>}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      {pages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontSize: 14, color: T.text }}>
          <button type="button" aria-label="Previous page" disabled={p === 0} onClick={() => go(p - 1)} style={pagerBtn(p === 0)}><ChevronLeft size={20} /></button>
          <span className="geo-mono">{p + 1} / {pages}</span>
          <button type="button" aria-label="Next page" disabled={p === pages - 1} onClick={() => go(p + 1)} style={pagerBtn(p === pages - 1)}><ChevronRight size={20} /></button>
        </div>
      )}
      <p style={{ margin: 0, fontSize: 12, color: T.muted, textAlign: "center" }}>Scans courtesy of the Library of Congress and the David Rumsey Map Collection, Stanford University Libraries.</p>
    </div>
  )
}

const pagerBtn = (off: boolean) => ({
  width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: 12, border: `1px solid ${T.line}`,
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
    <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 10", background: "#e7e9df" }}>
      <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block" }} />
      {state !== "loaded" && (
        <span className={state === "idle" ? "animate-pulse" : undefined} style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 11, color: T.dim, background: state === "idle" ? tint(T.line, 0.35) : undefined }}>
          {state === "error" ? "Preview unavailable" : ""}
        </span>
      )}
    </div>
  )
}
