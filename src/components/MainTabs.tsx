import { useState, useRef, lazy, Suspense } from "react"
import { LAST_UPDATED, formatDate } from "../data/changelog"
import type { ReactNode } from "react"
import { FLAGS } from "../data/flags"
import type { AppState } from "../utils/storage"
import { todayString } from "../utils/prng"
import { openSupporter } from "../utils/supporterNav"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { groupsFor, REGISTRY, GAME_COUNT, recommendFor, discoverGames, trendingGames, topGames } from "../ui/registry"
import type { Entry, TabKey } from "../ui/registry"
import { TabBar, ModuleCard, FlagTile, StatPill, SectionHeader, ProgressRing } from "./ui"
import { LineIcon, FlameIcon, ChevronDownIcon, SearchIcon, ShuffleIcon, CompassIcon, HistoryIcon, TrendingUpIcon, CrownIcon, PencilIcon, MailIcon, HeartIcon } from "./icons"
import FlagImage from "./FlagImage"
import EarthLogo from "./EarthLogo"
import { GamePoster } from "./GamePoster"
import AdBox from "./AdBox"
import { AD_SLOTS, SUPPORTER_LIVE } from "../ads"

// The Codex tab renders the real Codex directly (no launcher page between).
// Lazy so the dashboard bundle stays lean — same chunk App.tsx already splits.
const CodexScreenLazy = lazy(() => import("./CodexScreen"))

interface Props {
  state: AppState
  tab: TabKey
  onTab: (t: TabKey) => void
  onNavigate: (screen: string) => void
  onQuickPlay: () => void
  onStartDaily: () => void
  onReverseQuiz: () => void
  onSetUsername: (name: string) => void
  /** First-run welcome card, shown at the top of Today until dismissed. */
  intro?: ReactNode
}

const dayIdx = Math.floor(Date.now() / 86400000)
const weekIdx = Math.floor(Date.now() / (7 * 86400000))

// Lightweight recently-played memory (ids only) so a favourite game is one tap
// away instead of a re-swipe through the shelves. Separate key from AppState —
// purely presentational, safe to lose.
const RECENT_KEY = "globalio_recent_games"
const PLAYS_KEY = "globalio_total_plays"
function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as string[] } catch { return [] }
}
// Total games ever launched — "Jump back in" stays hidden until you've played a
// few, so a fresh user never sees a half-empty recents shelf.
function loadPlayCount(): number {
  try { return parseInt(localStorage.getItem(PLAYS_KEY) || "0", 10) || 0 } catch { return 0 }
}
function pushRecent(id: string) {
  try {
    const next = [id, ...loadRecent().filter(x => x !== id)].slice(0, 8)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    localStorage.setItem(PLAYS_KEY, String(loadPlayCount() + 1))
  } catch { /* ignore */ }
}

export default function MainTabs({ state, tab, onTab, onNavigate, onQuickPlay, onStartDaily, onReverseQuiz, onSetUsername, intro }: Props) {
  const today = todayString()
  const dailyDone = state.lastDailyDate === today
  // Deep-link target for the embedded Codex (e.g. Flag of the Day → its entry).
  // Cleared when the user leaves the Codex so a plain tab tap opens the list.
  const [codexCode, setCodexCode] = useState<string | null>(null)
  const goCodex = (code?: string) => { setCodexCode(code ?? null); onTab("codex") }
  const handleTab = (t: TabKey) => { if (tab === "codex") setCodexCode(null); onTab(t) }

  const launch = (e: Entry) => {
    pushRecent(e.id)
    if (e.action === "quickplay") return onQuickPlay()
    if (e.action === "reverse") return onReverseQuiz()
    if (e.action === "daily") return onStartDaily()
    onNavigate(e.id)
  }

  const learned = state.learnedFlags.length

  return (
    <div className="carto-paper" style={{ position: "fixed", inset: 0, maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", zIndex: 1, background: T.bg }}>

      {/* ── Shared header: wordmark · live streak · system actions ── */}
      <header style={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <EarthLogo size={26} />
          <h1 className="geo-display" style={{ color: T.text, fontWeight: 700, fontSize: 22, letterSpacing: "0.01em", margin: 0 }}>
            Globalio<span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>: learn every flag in the world</span>
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* The streak, small and always on top — Today's big celebration is gone */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999, background: T.surface, border: `1px solid ${tint(T.amber, 0.45)}` }}>
            <FlameIcon size={13} color={T.amber} strokeWidth={1.7} />
            <span style={{ fontFamily: FONT.mono, fontWeight: 600, fontSize: 14, color: T.amber, letterSpacing: "-0.02em" }}>{state.currentStreak}</span>
          </div>
          <button onClick={() => onNavigate("settings")} aria-label="Settings" className="geo-tap"
            style={{ width: 44, height: 44, borderRadius: 999, background: T.surface, border: `1px solid ${T.line}`, color: T.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LineIcon name="settings" size={18} color={T.muted} />
          </button>
        </div>
      </header>

      <main style={{ position: "relative", flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: tab === "codex" ? "0 0 24px" : "8px 16px 24px" }}>
        {tab === "today" && (
          <TodayTab state={state} dailyDone={dailyDone} launch={launch}
            onNavigate={onNavigate} onGoCodex={goCodex} onGoPlay={() => onTab("play")}
            onStartDaily={onStartDaily} intro={intro} />
        )}
        {tab === "play" && <PlayTab launch={launch} state={state} />}
        {tab === "codex" && (
          <Suspense fallback={<div style={{ padding: 48, textAlign: "center", color: T.dim, fontSize: 13 }}>Opening the codex…</div>}>
            <CodexScreenLazy embedded initialCode={codexCode} />
          </Suspense>
        )}
        {tab === "you" && <YouTab state={state} learned={learned} onNavigate={onNavigate} onSetUsername={onSetUsername} />}
      </main>

      <TabBar active={tab} onChange={handleTab} />
    </div>
  )
}

/* ── TODAY — the launchpad. The streak lives small in the shared header; the
   page opens straight onto a hero deck of four image-led slides (Expedition ·
   Flag of the Day · the Arcade · a daily fact), then a charged-up Quick Play,
   the two daily rituals as poster tiles, jump-back-in, and the learning
   resume. Every road leads to Play — or the Codex. ───────────────────────── */
function TodayTab({ state, dailyDone, launch, onNavigate, onGoCodex, onGoPlay, onStartDaily, intro }: {
  state: AppState; dailyDone: boolean; launch: (e: Entry) => void
  onNavigate: (s: string) => void; onGoCodex: (code?: string) => void; onGoPlay: () => void; onStartDaily: () => void
  intro?: ReactNode
}) {
  const fotd = FLAGS[dayIdx % FLAGS.length]
  const dyk = FLAGS[(dayIdx * 7 + 3) % FLAGS.length]
  const gameCount = GAME_COUNT
  const todayResult = state.dailyHistory[todayString()]
  const dailyRituals = ["gacha", "funfact"].map(id => REGISTRY.find(r => r.id === id)).filter((e): e is Entry => !!e)
  const connections = REGISTRY.find(r => r.id === "connections")

  // A small fan of flags — the arcade slide's poster art.
  const flagFan = (
    <div style={{ position: "relative", width: 88, height: 64, flexShrink: 0 }}>
      {["jp", "br", "fr"].map((c, i) => (
        <div key={c} style={{ position: "absolute", inset: 0, borderRadius: 6, overflow: "hidden", border: `1.5px solid ${T.surface}`,
          transform: `translate(${(i - 1) * 9}px, ${(i - 1) * 5}px) rotate(${(i - 1) * 6}deg)`,
          boxShadow: `0 3px 8px -4px ${tint(T.text, 0.6)}`, zIndex: i }}>
          <FlagImage code={c} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      ))}
    </div>
  )

  return (
    <div className="carto-slide-up" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {intro}

      {/* Hero deck opens the page (the streak chip lives in the header above).
          Ordered to funnel into Play first, then the Codex, World Cup, Flag of
          the Day, an advertise slot and a daily fact. Swipe; it loops. */}
      <HeroDeck slides={[
        { accent: ACCENT.challenge, eyebrow: "The Arcade", title: `${gameCount} games await`,
          body: "A swipeable trending deck, fresh picks daily, every shelf one tap from play.",
          cta: "Open the Arcade", onClick: onGoPlay, art: flagFan },
        { accent: T.cyan, eyebrow: "The Codex", title: "Explore 4,500+ flags",
          body: "Every country, region, historical and identity flag — tap any one to dig into its story.",
          cta: "Open the Codex", onClick: () => onGoCodex(),
          art: (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, width: 84, height: 60, flexShrink: 0 }}>
              {["za", "jp", "ch", "br"].map(c => (
                <div key={c} style={{ borderRadius: 4, overflow: "hidden", border: `1px solid ${T.surface}`, boxShadow: `0 2px 5px -3px ${tint(T.text, 0.6)}` }}>
                  <FlagImage code={c} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
              ))}
            </div>
          ) },
        { accent: ACCENT.today, eyebrow: "World Cup 2026", title: "48 nations, one summer",
          body: "Flip through every team's flag, story and historical flags before kickoff.",
          cta: "Explore the field", onClick: () => onNavigate("worldcup"),
          art: (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, width: 108, flexShrink: 0 }}>
              {/* The three hosts fanned out in a rainbow arc — each flag whole, none cropped. */}
              <div style={{ position: "relative", width: 108, height: 42 }}>
                {[
                  { c: "us", x: 0, y: 13, r: -15 },
                  { c: "mx", x: 37, y: 0, r: 0 },
                  { c: "ca", x: 74, y: 13, r: 15 },
                ].map(({ c, x, y, r }) => (
                  <div key={c} style={{ position: "absolute", left: x, top: y, width: 34, height: 23,
                    borderRadius: 4, overflow: "hidden", transform: `rotate(${r}deg)`,
                    border: `1.5px solid ${T.surface}`, background: T.surfaceHi,
                    boxShadow: `0 2px 6px -3px ${tint(T.text, 0.6)}` }}>
                    <FlagImage code={c} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                  </div>
                ))}
              </div>
              {/* Soccer ball + trophy — the tournament, in two etched symbols. */}
              <div style={{ display: "flex", alignItems: "center", gap: 11, color: ACCENT.today }}>
                <SoccerBall size={19} color={ACCENT.today} />
                <LineIcon name="worldcup" size={19} color={ACCENT.today} />
              </div>
            </div>
          ) },
        { accent: ACCENT.codex, eyebrow: `Flag of the Day · ${fotd.region}`, title: fotd.name,
          body: fotd.funFact, cta: "Read in the Codex", onClick: () => onGoCodex(fotd.code),
          cover: fotd.code },
        { accent: ACCENT.learn, eyebrow: "Did you know?", title: dyk.name,
          body: dyk.funFact, cta: "More fun facts", onClick: () => onNavigate("funfact"),
          cover: dyk.code },
      ]} />

      {/* Quick Play — instant fun, charged up */}
      <button onClick={dailyDone ? undefined : onStartDaily} className="geo-tap carto-card"
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 16px", borderRadius: 16, textAlign: "left",
          border: `1px solid ${tint(ACCENT.today, 0.4)}`,
          background: `linear-gradient(150deg, ${tint(ACCENT.today, 0.16)}, ${T.surface} 72%)`,
          ["--wash" as string]: tint(ACCENT.today, 0.45) }}>
        <span style={{ position: "relative", width: 56, height: 42, flexShrink: 0 }}>
          {["ke", "in", "br"].map((c, k) => (
            <span key={c} style={{ position: "absolute", top: 6, left: 10, width: 36, height: 26, borderRadius: 5, overflow: "hidden",
              border: `1.5px solid ${T.surface}`, transform: `translateX(${(k - 1) * 7}px) rotate(${(k - 1) * 7}deg)`,
              boxShadow: `0 2px 6px -3px ${tint(T.text, 0.6)}`, zIndex: k }}>
              <FlagImage code={c} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </span>
          ))}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="geo-display" style={{ fontWeight: 800, fontSize: 19, letterSpacing: "-0.01em", color: T.text }}>Daily Expedition</div>
          <div style={{ color: T.muted, fontSize: 11.5, marginTop: 2 }}>{dailyDone ? "Logged for today — back tomorrow" : "Ten flags from around the world · once a day"}</div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 999, flexShrink: 0, background: dailyDone ? T.green : ACCENT.today, color: T.onAccent }}>
          {dailyDone
            ? <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14 }}>{todayResult ? `✓ ${todayResult.score}/${todayResult.total}` : "✓ Done"}</span>
            : <><span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14 }}>Go</span><span style={{ fontSize: 14 }}>→</span></>}
        </span>
      </button>

      {/* Daily rituals — Flag Gacha & Fun Fact, each given a bespoke, eye-catching
          card with its own accent, a faded watermark glyph and a clear CTA. */}
      <div>
        <SectionHeader title="Daily rituals" accent={ACCENT.today} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {dailyRituals.map(e => {
            const isGacha = e.id === "gacha"
            const accent = isGacha ? ACCENT.codex : ACCENT.learn
            return (
              <button key={e.id} onClick={() => launch(e)} className="geo-tap carto-card"
                style={{ position: "relative", overflow: "hidden", textAlign: "left", padding: "13px 14px", borderRadius: 16, minHeight: 104,
                  display: "flex", flexDirection: "column",
                  border: `1px solid ${tint(accent, 0.42)}`, background: `linear-gradient(155deg, ${tint(accent, 0.2)}, ${T.surface} 78%)`,
                  ["--wash" as string]: tint(accent, 0.5) }}>
                <span aria-hidden style={{ position: "absolute", top: -12, right: -10, opacity: 0.15, transform: "rotate(-12deg)", pointerEvents: "none" }}>
                  <LineIcon name={e.id} size={66} color={accent} strokeWidth={1.1} />
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10,
                  background: tint(accent, 0.16), border: `1px solid ${tint(accent, 0.34)}`, marginBottom: 9 }}>
                  <LineIcon name={e.id} size={18} color={accent} />
                </span>
                <div className="geo-display" style={{ fontWeight: 800, fontSize: 15, color: T.text, letterSpacing: "-0.01em" }}>{e.title}</div>
                <div style={{ color: T.muted, fontSize: 11, marginTop: 2, lineHeight: 1.35 }}>{e.subtitle}</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: "auto", paddingTop: 9, fontFamily: FONT.display, fontWeight: 700, fontSize: 11.5, color: accent }}>
                  {isGacha ? "Pull now" : "Today's fact"} <span>→</span>
                </div>
              </button>
            )
          })}
        </div>
        {connections && (
          <button onClick={() => launch(connections)} className="geo-tap carto-card"
            style={{ marginTop: 10, width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 8, paddingRight: 14, borderRadius: 16, textAlign: "left",
              border: `1px solid ${tint(ACCENT.today, 0.42)}`, background: T.surface, ["--wash" as string]: tint(ACCENT.today, 0.45) }}>
            <span style={{ position: "relative", width: 112, aspectRatio: "140 / 72", flexShrink: 0, borderRadius: 10, overflow: "hidden", border: `1px solid ${T.line}` }}>
              <GamePoster id="connections" accent={ACCENT.today} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="geo-display" style={{ display: "block", fontWeight: 800, fontSize: 15, color: T.text, letterSpacing: "-0.01em" }}>{connections.title}</span>
              <span style={{ display: "block", color: T.muted, fontSize: 11, marginTop: 2, lineHeight: 1.35 }}>Sort 16 countries into four groups</span>
              <span style={{ display: "inline-flex", gap: 4, marginTop: 6, fontFamily: FONT.display, fontWeight: 700, fontSize: 11.5, color: ACCENT.today }}>
                Today's puzzle <span>→</span>
              </span>
            </span>
          </button>
        )}
      </div>

      <AboutGlobalio />

      {/* Scroll-to-see ad at the very bottom of Today (never on first view) */}
      <AdBox slot={AD_SLOTS.todayFooter} />

      <SiteLinks />
    </div>
  )
}

/* ── About Globalio: a short written introduction at the bottom of Today, so
   first-time visitors (and reviewers) read what the site is and where the
   flag archive lives, not only game tiles. ─────────────────────────────── */
function AboutGlobalio() {
  const link = { color: ACCENT.today, fontWeight: 600, textDecoration: "underline" } as const
  const p = { color: T.muted, fontSize: 12.5, lineHeight: 1.6, margin: "8px 0 0" } as const
  return (
    <details style={{ marginTop: 24, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
      <summary style={{ cursor: "pointer", listStyle: "revert", color: T.text, fontSize: 13, fontWeight: 700 }}>
        <h2 style={{ display: "inline", fontSize: 13, fontWeight: 700, margin: 0 }}>About Globalio</h2>
        <span style={{ fontWeight: 400, color: T.muted }}> · free flag games and a hand-researched flag archive</span>
      </summary>
      <p style={p}>
        Globalio is a free flag and geography game made by one person who loves flags. Learn the flags of all
        197 countries through quick daily games: quizzes, a daily Connections puzzle, drawing and colouring
        games, lookalike spotting, map and border puzzles, and Real or Bot, where you tell real flags from
        computer-made ones.
      </p>
      <p style={p}>
        Behind the games is a hand-researched flag archive. Every <a href="/flags/" style={link}>country page</a> tells
        the story of its flag through history, the <a href="/historical/" style={link}>historical archive</a> covers
        hundreds of vanished states and empires, and the <a href="/identity/" style={link}>identity archive</a> covers
        pride, indigenous, regional and micronation flags. No account or sign-up; your progress stays on your device.
      </p>
    </details>
  )
}

/* ── Site links: plain links to the static flag archive and site pages, so
   visitors (and search engines rendering the app) can reach them. ─────────── */
const SITE_LINKS: [string, string][] = [
  ["/flags/", "Country flags"], ["/historical/", "Historical flags"], ["/identity/", "Identity flags"],
  ["/games/", "All games"], ["/whats-new/", "What's new"], ["/about/", "About"], ["/contact/", "Contact"],
  ["/privacy.html", "Privacy"], ["/terms.html", "Terms"],
]
function SiteLinks() {
  return (
    <>
      <nav style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "2px 10px", padding: "10px 0 2px", fontSize: 11 }}>
        {SITE_LINKS.map(([href, label]) => (
          <a key={href} href={href} style={{ color: T.dim, textDecoration: "none" }}>{label}</a>
        ))}
      </nav>
      <p style={{ textAlign: "center", fontSize: 10.5, color: T.dim, margin: "2px 0 8px" }}>
        Last updated {formatDate(LAST_UPDATED)} · New games every month
      </p>
    </>
  )
}

/* ── Hero deck: a looping, swipeable carousel of image-led slides. Pointer-drag
   is axis-locked (vertical page scrolls pass straight through), wraps past
   either end, and every slide shares one fixed height so the carousel never
   jumps as you swipe. ──────────────────────────────────────────────────────── */
interface SlideData {
  accent: string; eyebrow: string; title: string; body: string; cta: string
  onClick?: () => void; art?: ReactNode; watermark?: string
  /** A flag code — renders the slide as a full-bleed flag poster instead of the
   *  paper-card layout, so the deck mixes two visual formats as you swipe. */
  cover?: string
}
const HERO_H = 238

// Desktop (fine-pointer) detection — gates the click arrows on the carousels
// and other mouse affordances. Evaluated once; a device doesn't change class.
const HAS_MOUSE = typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(pointer: fine)").matches

// Etched-line soccer ball to match the LineIcon family (lucide has no ball glyph).
function SoccerBall({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 6.4 L16 9.3 L14.5 14 L9.5 14 L8 9.3 Z" />
      <path d="M12 6.4 V2.6 M16 9.3 L19.6 8 M14.5 14 L17 17 M9.5 14 L7 17 M8 9.3 L4.4 8" />
    </svg>
  )
}

function DeckArrow({ dir, onClick }: { dir: -1 | 1; onClick: () => void }) {
  return (
    <button aria-label={dir < 0 ? "Previous" : "Next"} onClick={onClick} className="geo-tap"
      style={{ width: 28, height: 28, margin: dir < 0 ? "0 8px 0 0" : "0 0 0 8px", borderRadius: 999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: T.surface, border: `1px solid ${T.line}`, color: T.muted, fontSize: 16, lineHeight: 1, cursor: "pointer" }}>
      {dir < 0 ? "‹" : "›"}
    </button>
  )
}

function HeroDeck({ slides }: { slides: SlideData[] }) {
  const n = slides.length
  const [idx, setIdx] = useState(0)
  const [dx, setDx] = useState(0)
  const startX = useRef(0)
  const startY = useRef(0)
  const axis = useRef<null | "h" | "v">(null)
  const moved = useRef(false)
  const dragging = useRef(false)
  const [reduce] = useState(() =>
    typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  if (!n) return null

  const go = (d: number) => { setIdx(i => (i + d + n) % n); setDx(0) }
  const commit = (dir: number) => {
    if (reduce) { go(dir); return }
    setDx(-dir * (typeof window !== "undefined" ? window.innerWidth : 400))
    window.setTimeout(() => go(dir), 200)
  }
  const cur = slides[idx]

  return (
    <div>
      <div style={{ position: "relative", height: HERO_H, touchAction: "pan-y" }}
        onPointerDown={e => { dragging.current = true; axis.current = null; moved.current = false; startX.current = e.clientX; startY.current = e.clientY; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ } }}
        onPointerMove={e => {
          if (!dragging.current) return
          const ax = e.clientX - startX.current, ay = e.clientY - startY.current
          if (axis.current === null) {
            if (Math.abs(ax) < 8 && Math.abs(ay) < 8) return
            axis.current = Math.abs(ax) > Math.abs(ay) ? "h" : "v"
          }
          if (axis.current === "v") { dragging.current = false; setDx(0); return }
          moved.current = true; setDx(ax)
        }}
        onPointerUp={() => {
          if (!dragging.current) { axis.current = null; return }
          dragging.current = false
          const horiz = axis.current === "h"; axis.current = null
          if (horiz && Math.abs(dx) > 48) commit(dx < 0 ? 1 : -1)
          else { if (!moved.current) cur.onClick?.(); setDx(0) }
        }}
        onPointerCancel={() => { dragging.current = false; axis.current = null; setDx(0) }}>
        <div style={{
          position: "absolute", inset: 0,
          transform: `translateX(${dx}px)`,
          transition: dragging.current ? "none" : "transform 0.22s cubic-bezier(0.2,0.7,0.2,1)",
          opacity: Math.max(0, 1 - Math.abs(dx) / 520),
        }}>
          <DeckSlide {...cur} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 12 }}>
        {/* Mouse users can't swipe naturally: arrows sit beside the dots, never over the slide text. */}
        {HAS_MOUSE && <DeckArrow dir={-1} onClick={() => commit(-1)} />}
        {slides.map((_, i) => (
          <span key={i} aria-hidden style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 3, background: i === idx ? cur.accent : T.line, transition: "width 0.25s, background 0.2s" }} />
        ))}
        {HAS_MOUSE && <DeckArrow dir={1} onClick={() => commit(1)} />}
      </div>
    </div>
  )
}

/* One deck slide — fills the deck's fixed height, text on the left, optional
   poster art on the right (or a big etched watermark behind). The whole card is
   tappable (handled by HeroDeck); the CTA stays a real button for keyboard. */
function DeckSlide({ accent, eyebrow, title, body, cta, onClick, art, watermark, cover }: SlideData) {
  const disabled = !onClick
  if (cover) {
    // Flag-poster format: the flag fills the TOP of the card, fully visible with
    // nothing over it, and the text lives in a solid caption panel below.
    // The caption sizes itself and the flag takes whatever height is left —
    // the old fixed 44%/56% split let flexbox squash the title and body when
    // the content ran tall, chopping text mid-glyph. Every caption row is
    // flexShrink:0 so nothing can ever be vertically crushed again.
    return (
      <div className="carto-card"
        style={{ height: "100%", overflow: "hidden", borderRadius: 16, border: `1px solid ${tint(accent, 0.4)}`, background: T.surface, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, minHeight: 56, overflow: "hidden", background: T.surfaceHi, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* contain (not cover) so the whole flag reads — no cropped edges/emblems. */}
          <FlagImage code={cover} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
        </div>
        <div style={{ flexShrink: 0, background: T.surface, borderTop: `1px solid ${tint(accent, 0.35)}`, padding: "10px 16px 13px", display: "flex", flexDirection: "column" }}>
          <div className="geo-micro" style={{ flexShrink: 0, fontSize: 9, color: accent, marginBottom: 5 }}>◦ {eyebrow}</div>
          <div className="geo-display" style={{ flexShrink: 0, fontWeight: 800, fontSize: 20, lineHeight: 1.15, letterSpacing: "-0.02em", color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </div>
          <div style={{ flexShrink: 0, color: T.muted, fontSize: 12, marginTop: 4, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {body}
          </div>
          <button onClick={onClick} onPointerDown={e => e.stopPropagation()} disabled={disabled} className={disabled ? "" : "geo-tap"}
            style={{ flexShrink: 0, alignSelf: "flex-start", marginTop: 9, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999, minHeight: 36, background: accent, color: T.onAccent, cursor: disabled ? "default" : "pointer" }}>
            <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13.5 }}>{cta}</span>
            {!disabled && <span style={{ fontSize: 13.5 }}>→</span>}
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="carto-card"
      style={{
        height: "100%", position: "relative", overflow: "hidden", padding: 18, borderRadius: 16, textAlign: "left",
        border: `1px solid ${tint(accent, 0.36)}`,
        background: `linear-gradient(150deg, ${tint(accent, 0.16)}, ${T.surface} 70%)`,
        ["--wash" as string]: tint(accent, 0.42),
      }}>
      {watermark && (
        <div style={{ position: "absolute", right: -18, bottom: -22, opacity: 0.12, color: accent, pointerEvents: "none" }}>
          <LineIcon name={watermark} size={130} color={accent} strokeWidth={1.1} />
        </div>
      )}
      <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="geo-micro" style={{ flexShrink: 0, fontSize: 9, color: accent, marginBottom: 7 }}>◦ {eyebrow}</div>
          <div className="geo-display" style={{ flexShrink: 0, fontWeight: 800, fontSize: 25, lineHeight: 1.06, letterSpacing: "-0.02em", color: T.text, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {title}
          </div>
          <div style={{
            flexShrink: 0, color: T.muted, fontSize: 12.5, marginTop: 6, lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>{body}</div>
          <button onClick={onClick} onPointerDown={e => e.stopPropagation()} disabled={disabled}
            className={disabled ? "" : "geo-tap"}
            style={{ flexShrink: 0, alignSelf: "flex-start", marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 999, minHeight: 44, background: accent, color: T.onAccent, cursor: disabled ? "default" : "pointer" }}>
            <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14.5 }}>{cta}</span>
            {!disabled && <span style={{ fontSize: 15 }}>→</span>}
          </button>
        </div>
        {art}
      </div>
    </div>
  )
}

/* ── PLAY — the game browser. A flag-forward Game-of-the-Day hero sits above
   the fold (one tap to play), then locally-derived personal rails (jump back
   in · because-you-played · most loved), the learning spine, the full
   catalogue by category, and a daily discovery rail. The rough/niche games
   live in the collapsible Beta Sandbox at the very bottom — nothing is ever
   deleted, only re-ranked. ─────────────────────────────────────────────── */
function PlayTab({ launch, state }: { launch: (e: Entry) => void; state: AppState }) {
  const [sandboxOpen, setSandboxOpen] = useState(false)
  const [q, setQ] = useState("")
  const [activeGroup, setActiveGroup] = useState<string | null>(null)

  const all = REGISTRY.filter(r => r.tab === "play")
  const playable = all.filter(r => !r.sandbox)
  const sandbox = all.filter(r => r.sandbox)
  const featured = playable.filter(r => r.featured)
  const categoryGroups = groupsFor("play").filter(g => !g.entries[0].sandbox)

  // Local personalization, all derived on-device from recently-played ids.
  const recentIds = loadRecent()
  const recents = recentIds.map(id => all.find(r => r.id === id)).filter((e): e is Entry => !!e)
  const enoughPlays = loadPlayCount() >= 4
  const rec = recommendFor(recentIds)
  const discover = discoverGames(recentIds, dayIdx)
  // Trending deck — featured A-tier games lead, then a stable weekly rotation.
  // Real or Bot is pinned to the opening card and GeoPaint to the second, both
  // by request — the weekly shuffle only reorders everything behind them.
  const trending = (() => {
    const list = trendingGames(weekIdx)
    const pin = (id: string, pos: number) => {
      const at = list.findIndex(e => e.id === id)
      const it = at >= 0 ? list.splice(at, 1)[0] : REGISTRY.find(e => e.id === id)
      if (it) list.splice(Math.min(pos, list.length), 0, it)
    }
    pin("geopaint", 0)
    pin("flagstudio", 0)
    pin("realorbot", 0) // last pin wins the front: Real or Bot, Flag Studio, GeoPaint
    return list
  })()
  const top = topGames(dayIdx)

  const shuffle = () => launch(playable[Math.floor(Math.random() * playable.length)])

  const learned = state.learnedFlags.length
  const learnPct = FLAGS.length ? Math.round((learned / FLAGS.length) * 100) : 0

  // Browse vs. filter: a search query or a non-"All" chip collapses the shelves
  // into a flat result grid. Search spans the *whole* catalogue (sandbox too)
  // so every game stays findable by name. "Popular" is the hand-picked set.
  const POPULAR = "__popular"
  const query = q.trim().toLowerCase()
  const filtering = !!query || activeGroup !== null
  const filtered = query
    ? all.filter(r => `${r.title} ${r.subtitle}`.toLowerCase().includes(query))
    : activeGroup === POPULAR
      ? featured
      : activeGroup
        ? all.filter(r => r.group === activeGroup)
        : []

  const chips: { label: string; group: string | null }[] = [
    { label: "All", group: null },
    { label: "Popular", group: POPULAR },
    ...categoryGroups.map(g => ({ label: g.group, group: g.group })),
  ]
  const selectChip = (group: string | null) => { setActiveGroup(group); setQ("") }

  return (
    <div className="carto-slide-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Title + Surprise me (variable-reward shuffle across the whole catalogue) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="geo-display" style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em", color: T.text }}>Play</div>
          <div style={{ color: T.muted, fontSize: 12.5, marginTop: 3 }}>
            <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: ACCENT.play }}>{GAME_COUNT}</span> games · one tap to dive in
          </div>
        </div>
        <button onClick={shuffle} className="geo-tap" aria-label="Surprise me — play a random game"
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 16px", borderRadius: 999, flexShrink: 0,
            background: ACCENT.play, border: `1px solid ${ACCENT.play}`, color: T.onAccent,
            boxShadow: `0 6px 16px -8px ${tint(ACCENT.play, 0.9)}` }}>
          <ShuffleIcon size={15} color={T.onAccent} strokeWidth={1.9} />
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13 }}>Surprise me</span>
        </button>
      </div>

      {/* Find any game by name — including everything buried in the sandbox */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 44, borderRadius: 12, background: T.surface, border: `1px solid ${T.line}` }}>
        <SearchIcon size={16} color={T.dim} strokeWidth={1.6} />
        <input value={q} onChange={e => { setQ(e.target.value); if (e.target.value) setActiveGroup(null) }} placeholder="Find a game…" aria-label="Search games"
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: T.text, fontSize: 14 }} />
        {q && (
          <button onClick={() => setQ("")} aria-label="Clear search"
            style={{ color: T.dim, background: "transparent", fontSize: 18, lineHeight: 1, padding: "4px 2px" }}>×</button>
        )}
      </div>

      {/* Category chips — fast filter across the whole catalogue */}
      <div className="carto-rail" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "-8px -16px 0", padding: "0 16px 2px" }}>
        {chips.map(c => {
          const on = c.group === null ? activeGroup === null && !query : activeGroup === c.group
          return (
            <button key={c.label} onClick={() => selectChip(c.group)} aria-pressed={on} className="geo-tap"
              style={{ flexShrink: 0, padding: "4px 11px", minHeight: 28, borderRadius: 999, whiteSpace: "nowrap",
                fontFamily: FONT.display, fontWeight: 600, fontSize: 11.5,
                background: on ? ACCENT.play : T.surface, color: on ? T.onAccent : T.muted,
                border: `1px solid ${on ? ACCENT.play : T.line}` }}>
              {c.label}
            </button>
          )
        })}
      </div>

      {filtering ? (
        filtered.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {filtered.map(e => (
              <FlagTile key={e.id} id={e.id} title={e.title} subtitle={e.subtitle}
                accent={e.sandbox ? T.muted : ACCENT[e.accent]} onClick={() => launch(e)} style={{ width: "100%" }} />
            ))}
          </div>
        ) : (
          <div style={{ padding: 18, borderRadius: 12, border: `1px dashed ${T.line}`, textAlign: "center", color: T.dim, fontSize: 12 }}>
            No game matches "{q.trim()}".
          </div>
        )
      ) : (
      <>
        {/* Trending this week — the swipeable flag-card deck (showpiece) */}
        <TrendingDeck games={trending} launch={launch} />

        {/* Jump back in — your recent rotation, one tap away (only after a few
            plays, so it never shows up half-empty for a new user) */}
        {enoughPlays && recents.length > 0 && (
          <div>
            <ShelfHead icon={<HistoryIcon size={15} color={ACCENT.play} strokeWidth={1.7} />} accent={ACCENT.play}
              title="Jump back in" reason="Pick up a recent game" />
            <Rail>
              {recents.map(e => (
                <FlagTile key={e.id} id={e.id} title={e.title} subtitle={e.subtitle}
                  accent={e.sandbox ? T.muted : ACCENT[e.accent]} onClick={() => launch(e)} />
              ))}
            </Rail>
          </div>
        )}

        {/* Because you played … — locally-derived affinity recommendations */}
        {rec && (
          <div>
            <ShelfHead icon={<LineIcon name="lightbulb" size={15} color={ACCENT.codex} strokeWidth={1.7} />} accent={ACCENT.codex}
              title="Recommended for you" reason={`Because you played ${rec.seed.title}`} />
            <Rail>
              {rec.entries.map(e => (
                <FlagTile key={e.id} id={e.id} title={e.title} subtitle={e.subtitle} accent={ACCENT[e.accent]} onClick={() => launch(e)} />
              ))}
            </Rail>
          </div>
        )}

        {/* Top games — the hand-picked hit list, order reshuffled daily. These
            also live in their own category shelves below; repetition is fine. */}
        <div>
          <ShelfHead icon={<LineIcon name="tierlist" size={15} color={T.amber} />} accent={T.amber}
            title="Top games" reason="The all-star lineup · shuffled daily" />
          <Rail>
            {top.map(e => (
              <FlagTile key={e.id} id={e.id} title={e.title} subtitle={e.subtitle} accent={ACCENT[e.accent]} onClick={() => launch(e)} />
            ))}
          </Rail>
        </div>

        {/* The collections — every game, filed by appetite. Each shelf swipes.
            Learn the World leads with its live mastery line; the curriculum is
            fully integrated as poster tiles like every other game. */}
        {categoryGroups.map(g => (
          <div key={g.group}>
            {g.group === "Learn the World" ? (
              <ShelfHead icon={<LineIcon name="learn" size={15} color={ACCENT.learn} />} accent={ACCENT.learn}
                title="Learn the World"
                reason={learned > 0 ? `${learned} of ${FLAGS.length} flags learned · ${learnPct}%` : "Structured sets with mastery tracking"} />
            ) : (
              <SectionHeader title={g.group} accent={ACCENT[g.entries[0].accent]} />
            )}
            <Rail>
              {g.entries.map(e => (
                <FlagTile key={e.id} id={e.id} title={e.title} subtitle={e.subtitle} accent={ACCENT[e.accent]} onClick={() => launch(e)} />
              ))}
            </Rail>
          </div>
        ))}

        {/* Discover something new — fresh picks rotated daily, weighted away from
            your recent rotation so the long tail of the catalogue surfaces */}
        {discover.length > 0 && (
          <div>
            <ShelfHead icon={<CompassIcon size={15} color={ACCENT.today} strokeWidth={1.7} />} accent={ACCENT.today}
              title="Discover something new" reason="Fresh picks, rotated daily"
              action={
                <button onClick={shuffle} aria-label="Surprise me — play a random game" className="geo-tap"
                  style={{ width: 40, height: 40, borderRadius: 999, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: tint(ACCENT.today, 0.12), border: `1px solid ${tint(ACCENT.today, 0.3)}`, color: ACCENT.today }}>
                  <ShuffleIcon size={15} color={ACCENT.today} strokeWidth={1.7} />
                </button>
              } />
            <Rail>
              {discover.map(e => (
                <FlagTile key={e.id} id={e.id} title={e.title} subtitle={e.subtitle} accent={ACCENT[e.accent]} onClick={() => launch(e)} />
              ))}
            </Rail>
          </div>
        )}

        {/* Beta Sandbox — progressively disclosed, nothing deleted */}
        <div style={{ marginTop: 4 }}>
          <button onClick={() => setSandboxOpen(o => !o)} className="geo-tap" aria-expanded={sandboxOpen}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
              borderRadius: 12, background: T.surfaceHi, border: `1px dashed ${T.lineHi}`, textAlign: "left" }}>
            <span style={{ display: "flex", color: T.muted }}><ShuffleIcon size={18} color={T.muted} strokeWidth={1.6} /></span>
            <div style={{ flex: 1 }}>
              <div className="geo-display" style={{ fontWeight: 600, fontSize: 14, color: T.text }}>More games</div>
              <div style={{ color: T.muted, fontSize: 10.5, marginTop: 1 }}>{sandbox.length} more quick games</div>
            </div>
            <span style={{ display: "flex", color: T.muted, transform: sandboxOpen ? "rotate(180deg)" : "none", transition: "transform 0.28s cubic-bezier(0.2,0.7,0.2,1)" }}>
              <ChevronDownIcon size={18} color={T.muted} strokeWidth={1.6} />
            </span>
          </button>

          {sandboxOpen && (
            <div className="carto-slide-up" style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
              {sandbox.map(e => (
                <FlagTile key={e.id} id={e.id} title={e.title} subtitle={e.subtitle} accent={ACCENT[e.accent]} onClick={() => launch(e)} style={{ width: "100%" }} />
              ))}
            </div>
          )}
        </div>

        {/* Scroll-to-see ad under Beta Sandbox */}
        <AdBox slot={AD_SLOTS.playFooter} />
      </>
      )}
    </div>
  )
}

/* ── Horizontal swipe rail — the Netflix-style shelf used across Play. ────── */
function Rail({ children }: { children: ReactNode }) {
  return (
    <div className="carto-rail" style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -16px", padding: "2px 16px 6px" }}>
      {children}
    </div>
  )
}

/* ── Premium shelf header — etched icon chip + serif title + a one-line reason
   (e.g. "Because you played Flagle"), with an optional trailing action. Used
   for the curated/personal shelves; the plain catalogue shelves keep the
   quieter uppercase SectionHeader so the good stuff reads louder. ─────────── */
function ShelfHead({ icon, title, reason, accent, action }: {
  icon: ReactNode; title: string; reason?: string; accent: string; action?: ReactNode
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: tint(accent, 0.12), border: `1px solid ${tint(accent, 0.28)}`, color: accent }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <div className="geo-display" style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em", color: T.text, lineHeight: 1.12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
          {reason && <div style={{ color: T.muted, fontSize: 11, marginTop: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{reason}</div>}
        </div>
      </div>
      {action}
    </div>
  )
}

/* ── Trending this week — the showpiece. A swipeable stack of bold, full-colour
   flag cards: flick through games like a deck of postcards, one tap to play.
   Pointer-drag is an enhancement; explicit Play + Skip buttons and a position
   counter keep every game reachable without dragging, and it honours
   prefers-reduced-motion (instant swap, no fly-out). ─────────────────────── */
function TrendingDeck({ games, launch }: { games: Entry[]; launch: (e: Entry) => void }) {
  const [idx, setIdx] = useState(0)
  const [dx, setDx] = useState(0)
  const startX = useRef(0)
  const startY = useRef(0)
  // Axis lock: a touch only becomes a card-drag once it moves clearly more
  // horizontally than vertically — otherwise the page scroll owns it. Without
  // this, vertical scrolls that *started* on the card froze mid-gesture.
  const axis = useRef<null | "h" | "v">(null)
  const dragging = useRef(false)
  const [reduce] = useState(() =>
    typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)

  if (!games.length) return null
  const n = games.length
  // Direction-aware: swiping right (dir > 0) goes to the PREVIOUS card, swiping
  // left (dir < 0) advances to the NEXT — so the deck scrolls both ways.
  const go = (delta: number) => { setIdx(i => (i + delta + n) % n); setDx(0) }
  const commit = (dir: number) => {
    if (reduce) { go(-dir); return }
    setDx(dir * 540)
    window.setTimeout(() => go(-dir), 230)
  }

  const top = games[idx]
  const accent = ACCENT[top.accent]
  const CARD_H = 236

  // Framed poster + caption, shared by the live card and the depth cards behind
  // it. The flag sits inset with parchment around it (calm, not loud) and the
  // title is the loudest element.
  const face = (g: Entry, gAccent: string) => (
    <>
      <div style={{ position: "relative", margin: "12px 12px 0", height: 98, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.line}`, background: tint(gAccent, 0.08) }}>
        <GamePoster id={g.id} accent={gAccent} variant="hero" />
        <div style={{ position: "absolute", top: 9, left: 9, display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: `${T.surface}F0`, border: `1px solid ${tint(gAccent, 0.4)}` }}>
          <TrendingUpIcon size={12} color={gAccent} strokeWidth={2} />
          <span className="geo-micro" style={{ fontSize: 8.5, color: gAccent }}>Trending this week</span>
        </div>
      </div>
      <div style={{ padding: "11px 16px 0" }}>
        <div className="geo-display" style={{ color: T.text, fontWeight: 800, fontSize: 25, letterSpacing: "-0.02em", lineHeight: 1.02, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{g.title}</div>
        <div style={{ color: T.muted, fontSize: 12.5, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.subtitle}</div>
      </div>
    </>
  )

  return (
    <div>
      <div style={{ position: "relative", height: CARD_H + 18 }}>
        {/* Depth cards — the next games peek out (now with art that actually
            represents them), so you can see what's coming and want to swipe. */}
        {[2, 1].filter(off => off < n).map(off => {
          const g = games[(idx + off) % n]
          return (
            <div key={off} aria-hidden style={{
              position: "absolute", left: 0, right: 0, top: 0, height: CARD_H, borderRadius: 18, overflow: "hidden",
              background: T.surface, border: `1px solid ${T.line}`,
              transform: `translate(${off * 7}px, ${off * 8}px) scale(${1 - off * 0.03})`,
              opacity: 1 - off * 0.12, boxShadow: "0 8px 20px -16px rgba(31,58,60,0.4)",
            }}>
              {face(g, ACCENT[g.accent])}
              <div style={{ position: "absolute", inset: 0, background: tint(T.surface, off === 1 ? 0.22 : 0.4) }} />
            </div>
          )
        })}

        {/* Live top card — drag surface */}
        <div
          onPointerDown={e => { dragging.current = true; axis.current = null; startX.current = e.clientX; startY.current = e.clientY; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ } }}
          onPointerMove={e => {
            if (!dragging.current) return
            const ax = e.clientX - startX.current, ay = e.clientY - startY.current
            if (axis.current === null) {
              if (Math.abs(ax) < 8 && Math.abs(ay) < 8) return
              axis.current = Math.abs(ax) > Math.abs(ay) ? "h" : "v"
              // Hand a vertical gesture back to the page so it scrolls smoothly
              // instead of stuttering under the card's pointer capture.
              if (axis.current === "v") { try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* ignore */ } }
            }
            if (axis.current === "v") { dragging.current = false; setDx(0); return }
            setDx(ax)
          }}
          onPointerUp={() => {
            if (!dragging.current) { axis.current = null; return }
            dragging.current = false
            const horizontal = axis.current === "h"
            axis.current = null
            if (horizontal && Math.abs(dx) > 80) commit(dx > 0 ? 1 : -1); else setDx(0)
          }}
          onPointerCancel={() => { dragging.current = false; axis.current = null; setDx(0) }}
          style={{
            position: "absolute", left: 0, right: 0, top: 0, height: CARD_H, borderRadius: 18, overflow: "hidden", touchAction: "pan-y", cursor: "grab",
            background: T.surface, border: `1px solid ${tint(accent, 0.5)}`,
            boxShadow: `0 2px 6px rgba(31,58,60,0.08), 0 22px 42px -22px ${tint(accent, 0.85)}`,
            transform: `translateX(${dx}px) rotate(${dx * 0.022}deg)`,
            transition: dragging.current ? "none" : "transform 0.26s cubic-bezier(0.2,0.7,0.2,1)",
            opacity: Math.max(0, 1 - Math.abs(dx) / 620),
          }}>
          {face(top, accent)}
          {/* Actions */}
          <div style={{ position: "absolute", left: 16, right: 16, bottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => launch(top)} onPointerDown={e => e.stopPropagation()}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 22px", borderRadius: 999, minHeight: 44, background: accent, color: T.onAccent }}>
              <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15 }}>Play</span><span style={{ fontSize: 15 }}>→</span>
            </button>
            <button onClick={() => commit(-1)} onPointerDown={e => e.stopPropagation()} aria-label="Skip to next game"
              style={{ display: "inline-flex", alignItems: "center", padding: "11px 18px", borderRadius: 999, minHeight: 44, background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>
              <span style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 13 }}>Skip</span>
            </button>
          </div>
        </div>
      </div>

      {/* Position dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 13 }} aria-hidden>
        {games.map((_, i) => (
          <span key={i} style={{ width: i === idx ? 16 : 5, height: 5, borderRadius: 3, background: i === idx ? accent : T.line, transition: "width 0.25s, background 0.2s" }} />
        ))}
      </div>
    </div>
  )
}

/* ── YOU — the explorer's logbook. One page, everything that used to be split
   across You / Full Profile / Achievements: identity (editable name), world
   mastery with the regional breakdown, the field record, a compact trophy
   shelf of the seven set-crowns, the daily log, and the Collection tools.
   No Settings / Full Profile links — the gear lives in the header and the
   profile IS this page now. ──────────────────────────────────────────────── */
const CROWN_SETS = [
  { id: "world", label: "World" },
  { id: "europe", label: "Europe" },
  { id: "africa", label: "Africa" },
  { id: "asia", label: "Asia" },
  { id: "americas", label: "Americas" },
  { id: "oceania", label: "Oceania" },
  { id: "middle-east", label: "Mid-East" },
]
const REGIONS = ["Europe", "Africa", "Asia", "Americas", "Middle East", "Oceania"] as const

// Explorer titles — purely for funsies, earned by flags learned. Chill, not
// gamified: no nags, no locks, just a nicer word under your name as you grow.
const RANKS: { min: number; title: string }[] = [
  { min: 195, title: "Atlas Incarnate" },
  { min: 130, title: "Master Cartographer" },
  { min: 80, title: "Seasoned Navigator" },
  { min: 40, title: "Wayfinder" },
  { min: 10, title: "Apprentice Cartographer" },
  { min: 0, title: "Armchair Traveller" },
]
const rankFor = (learned: number) => RANKS.find(r => learned >= r.min)!.title

function YouTab({ state, learned, onNavigate, onSetUsername }: {
  state: AppState; learned: number; onNavigate: (s: string) => void; onSetUsername: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(state.username)
  const name = state.username.trim() || "Explorer"
  const pct = FLAGS.length ? Math.round((learned / FLAGS.length) * 100) : 0
  const saveName = () => { onSetUsername(draft.trim().slice(0, 24)); setEditing(false) }

  const regionStats = REGIONS.map(region => {
    const inRegion = FLAGS.filter(f => f.region === region)
    const got = inRegion.filter(f => state.learnedFlags.includes(f.code)).length
    return { region, got, total: inRegion.length, done: inRegion.length > 0 && got >= inRegion.length }
  })
  const dailyDates = Object.keys(state.dailyHistory).sort().slice(-7)

  return (
    <div className="carto-slide-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Identity — tap the name to edit it (saved locally) */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "4px 2px" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: tint(ACCENT.learn, 0.13), border: `1px solid ${tint(ACCENT.learn, 0.32)}` }}>
          <LineIcon name="geo" size={26} color={ACCENT.learn} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input autoFocus value={draft} maxLength={24} placeholder="Your name"
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditing(false) }}
                style={{ flex: 1, minWidth: 0, padding: "7px 10px", borderRadius: 10, fontSize: 17, fontWeight: 700,
                  fontFamily: FONT.display, background: T.surfaceHi, border: `1px solid ${tint(ACCENT.learn, 0.4)}`, color: T.text, outline: "none" }} />
              <button onClick={saveName} className="geo-tap"
                style={{ padding: "9px 16px", borderRadius: 999, flexShrink: 0, background: ACCENT.learn, color: T.onAccent, fontFamily: FONT.display, fontWeight: 700, fontSize: 13 }}>
                Save
              </button>
            </div>
          ) : (
            <button onClick={() => { setDraft(state.username); setEditing(true) }} aria-label="Edit your name"
              style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", padding: 0, textAlign: "left" }}>
              <span className="geo-display" style={{ color: T.text, fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em", lineHeight: 1.05 }}>{name}</span>
              <PencilIcon size={14} color={ACCENT.learn} strokeWidth={1.6} />
            </button>
          )}
          <div style={{ color: T.muted, fontSize: 12, marginTop: 3 }}>
            <span style={{ color: ACCENT.learn, fontWeight: 600 }}>{rankFor(learned)}</span>
            {" "}· {learned} flags · {state.crowns.length} {state.crowns.length === 1 ? "crown" : "crowns"}
          </div>
        </div>
      </div>

      {/* World mastery — the ring plus the regional breakdown, one card */}
      <div className="carto-card" style={{ padding: 18, borderRadius: 16, ["--wash" as string]: tint(ACCENT.learn, 0.35) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <ProgressRing done={learned} total={FLAGS.length} accent={ACCENT.learn} size={72} stroke={6} />
          <div>
            <div className="geo-micro" style={{ fontSize: 9, color: ACCENT.learn, marginBottom: 4 }}>◦ World Mastery</div>
            <div className="geo-display" style={{ color: T.text, fontWeight: 700, fontSize: 22 }}>
              <span className="geo-mono">{pct}</span><span style={{ color: T.dim, fontSize: 15 }}>%</span>
            </div>
            <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>{learned} of {FLAGS.length} flags mastered</div>
          </div>
        </div>
        <div style={{ height: 1, background: T.line, margin: "14px 0 12px" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {regionStats.map(rs => (
            <div key={rs.region} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="geo-display" style={{ width: 86, flexShrink: 0, fontSize: 12.5, fontWeight: 600, color: T.text }}>
                {rs.region}{rs.done && <span style={{ marginLeft: 4, display: "inline-flex", verticalAlign: "-1px" }} aria-label="complete"><CrownIcon size={12} color={T.gold} strokeWidth={1.7} /></span>}
              </span>
              <div style={{ flex: 1, height: 5, borderRadius: 3, overflow: "hidden", background: tint(T.text, 0.08) }}>
                <div style={{ width: `${rs.total ? (rs.got / rs.total) * 100 : 0}%`, height: "100%", borderRadius: 3,
                  background: rs.done ? T.gold : ACCENT.learn, transition: "width 0.7s ease" }} />
              </div>
              <span style={{ width: 52, flexShrink: 0, textAlign: "right", fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontSize: 10.5, color: T.muted }}>
                {rs.got}/{rs.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Field record */}
      <div>
        <SectionHeader title="Field Record" accent={T.amber} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <StatPill icon={<FlameIcon size={15} color={T.amber} strokeWidth={1.7} />} value={state.currentStreak} label="Day streak" accent={T.amber} big />
          <StatPill icon={<LineIcon name="quickplay" size={15} color={T.chartreuse} />} value={state.longestStreak} label="Best streak" accent={T.chartreuse} big />
          <StatPill icon={<CrownIcon size={15} color={T.gold} strokeWidth={1.7} />} value={state.crowns.length} label="Crowns" accent={T.gold} big />
        </div>
      </div>

      {/* Trophy shelf — all seven set-crowns, earned and waiting */}
      <div>
        <SectionHeader title={`Trophy Shelf · ${state.crowns.length}/${CROWN_SETS.length}`} accent={T.gold} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
          {CROWN_SETS.map(c => {
            const earned = state.crowns.includes(c.id)
            return (
              <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1, minWidth: 0 }}>
                <div className={earned ? "geo-foil" : undefined} style={{
                  width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  ...(earned
                    ? { background: tint(T.gold, 0.14), border: `1px solid ${tint(T.gold, 0.5)}` }
                    : { border: `1.5px dashed ${T.line}`, opacity: 0.65 }),
                }}>
                  {earned ? <CrownIcon size={17} color={T.gold} strokeWidth={1.7} /> : <CrownIcon size={15} color={T.dim} strokeWidth={1.5} />}
                </div>
                <span className="geo-micro" style={{ fontSize: 8, letterSpacing: "0.02em", color: earned ? T.gold : T.dim, whiteSpace: "nowrap" }}>{c.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Daily log — the last week of expeditions */}
      {dailyDates.length > 0 && (
        <div>
          <SectionHeader title="Daily Log" accent={ACCENT.today} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {dailyDates.map(date => {
              const r = state.dailyHistory[date]
              const ratio = r ? r.score / r.total : 0
              const c = ratio >= 0.8 ? T.green : ratio >= 0.5 ? T.amber : T.danger
              return (
                <div key={date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ minWidth: 44, padding: "9px 6px", borderRadius: 11, textAlign: "center",
                    background: tint(c, 0.12), border: `1.5px solid ${tint(c, 0.4)}`,
                    color: c, fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 12 }}>
                    {r.score}/{r.total}
                  </div>
                  <span style={{ color: T.muted, fontSize: 9.5, fontFamily: FONT.mono }}>{date.slice(5)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Collection — the codex's companion reference tools */}
      <div>
        <SectionHeader title="Collection" accent={ACCENT.codex} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groupsFor("you").flatMap(g => g.entries).map(e => (
            <ModuleCard key={e.id} icon={e.icon} glyph={e.id} title={e.title} subtitle={e.subtitle} accent={ACCENT[e.accent]}
              progress={e.progress?.(state)} onClick={() => onNavigate(e.id)} />
          ))}
        </div>
      </div>

      {/* Gacha collection — its own block, just beneath the explorer's tools */}
      <GachaInline onOpen={() => onNavigate("gacha")} />

      {/* Support Globalio — a gentle, non-naggy CTA shown only to non-supporters */}
      {SUPPORTER_LIVE && !state.premium && (
        <button onClick={openSupporter}
          style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", borderRadius: 18, padding: 16,
            border: `1px solid ${tint(T.gold, 0.45)}`,
            background: `linear-gradient(150deg, ${tint(T.gold, 0.16)}, ${T.surface} 78%)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ display: "flex", flexShrink: 0 }}><HeartIcon size={24} color={T.gold} strokeWidth={1.7} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.gold, fontWeight: 800, fontSize: 15 }}>Support Globalio</div>
              <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>One-time $2 — remove ads & back a one-person project.</div>
            </div>
            <span style={{ color: T.gold, fontSize: 18, flexShrink: 0 }}>›</span>
          </div>
        </button>
      )}

      {/* Feedback — a one-man operation that reads every message */}
      <FeedbackCard />

      {/* Scroll-to-see ad at the very bottom of the You tab */}
      <AdBox slot={AD_SLOTS.youFooter} />
    </div>
  )
}

// Pre-addressed mail to the dev. A static-site-friendly way to collect feedback
// with zero backend — opens the user's mail app with subject + body filled.
const FEEDBACK_HREF =
  "mailto:sjoudrie@gmail.com" +
  "?subject=" + encodeURIComponent("Globalio feedback") +
  "&body=" + encodeURIComponent("What I love / what I'd change / an idea:\n\n")

function FeedbackCard() {
  return (
    <a href={FEEDBACK_HREF} className="geo-tap carto-card"
      style={{ display: "block", textDecoration: "none", borderRadius: 16, padding: 16, position: "relative", overflow: "hidden",
        border: `1px solid ${tint(ACCENT.learn, 0.36)}`,
        background: `linear-gradient(150deg, ${tint(ACCENT.learn, 0.14)}, ${T.surface} 75%)`,
        ["--wash" as string]: tint(ACCENT.learn, 0.42) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: tint(ACCENT.learn, 0.14), border: `1px solid ${tint(ACCENT.learn, 0.3)}`, color: ACCENT.learn }}>
          <MailIcon size={20} color={ACCENT.learn} strokeWidth={1.6} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="geo-display" style={{ fontWeight: 700, fontSize: 16, color: T.text }}>Send feedback or ideas</div>
          <div style={{ color: T.muted, fontSize: 11.5, marginTop: 2, lineHeight: 1.4 }}>Globalio is made by one person, and I read every message. Thanks for playing.</div>
        </div>
        <span style={{ color: ACCENT.learn, fontSize: 18, opacity: 0.7 }}>→</span>
      </div>
    </a>
  )
}

// Inline Gacha collection for the You tab — reads the gacha save directly so
// players see what they've pulled without hopping to another screen.
function GachaInline({ onOpen }: { onOpen: () => void }) {
  let collected: string[] = []
  try { const raw = localStorage.getItem("globalio_gacha"); collected = raw ? (JSON.parse(raw).collected ?? []) : [] } catch { /* ignore */ }
  const flags = collected
    .map(c => FLAGS.find(f => f.code === c))
    .filter((f): f is typeof FLAGS[number] => !!f)
  return (
    // The whole card is one tap straight to the collection — no secondary
    // "open" button to hunt for.
    <button onClick={onOpen} className="geo-tap carto-card"
      style={{ width: "100%", textAlign: "left", cursor: "pointer", padding: 11, borderRadius: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: flags.length ? 7 : 0 }}>
        <div className="geo-display" style={{ fontWeight: 700, fontSize: 13, color: T.text }}>
          Gacha Collection{flags.length ? <span style={{ color: T.dim, fontWeight: 600 }}> · {flags.length}/{FLAGS.length}</span> : null}
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: ACCENT.today, fontFamily: FONT.display }}>
          {flags.length ? "Open →" : "Daily pull →"}
        </span>
      </div>
      {flags.length === 0 ? (
        <div style={{ color: T.muted, fontSize: 11.5, marginTop: 4 }}>No pulls yet — grab your free daily pull.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(30px, 1fr))", gap: 5 }}>
          {flags.map(f => (
            <div key={f.code} title={f.name}
              style={{ aspectRatio: "3 / 2", borderRadius: 4, overflow: "hidden", border: `1px solid ${T.line}` }}>
              <FlagImage code={f.code} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          ))}
        </div>
      )}
    </button>
  )
}
