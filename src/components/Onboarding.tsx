import { useState, useRef } from "react"
import type { ReactNode, CSSProperties } from "react"
import { Compass, BookOpen } from "lucide-react"
import { T, ACCENT, tint, FONT } from "../ui/tokens"
import EarthLogo from "./EarthLogo"
import FlagImage from "./FlagImage"

export const ONBOARDED_KEY = "globalio_onboarded"

// The welcome card sits inside the page instead of over it, so crawlers and
// people get exactly the same page; there is no special case for bots.
export function hasOnboarded(): boolean {
  try { return localStorage.getItem(ONBOARDED_KEY) === "1" } catch { return true }
}
function markOnboarded() {
  try { localStorage.setItem(ONBOARDED_KEY, "1") } catch { /* ignore */ }
}

// Two visually-distinct "vanity" flags flank the Codex slide — the Estelada
// Blava (Catalan independence) and the Kanaka Maoli (Native Hawaiian) flag.
// Our self-hosted copies (what fp() resolves Estelada_blava.svg and
// Kanaka_Maoli_flag.svg to), written out so no flag table is pulled into the
// first-run path. scripts/bundle.test.mjs checks they match fp().
const ESTELADA = "/flags/wm/estelada-blava.svg"
const KANAKA = "/cf/cd525d0600b2308d.svg"

const FLANK: CSSProperties = {
  width: 36, height: 24, objectFit: "cover", borderRadius: 4,
  border: `1px solid ${tint(T.text, 0.18)}`, boxShadow: `0 5px 12px -7px ${tint(T.text, 0.55)}`,
}

type Slide = { center: ReactNode; left?: ReactNode; right?: ReactNode; title: string; body: string }

const SLIDES: Slide[] = [
  {
    center: <EarthLogo size={64} />,
    left: <FlagImage code="br" style={FLANK} />,
    right: <FlagImage code="vu" style={FLANK} />,
    title: "Welcome to Globalio",
    body: "Learn every flag in the world through 50 quick games, and a flag codex that doubles as a real reference tool.",
  },
  {
    center: <Compass size={44} strokeWidth={1.5} color={ACCENT.codex} absoluteStrokeWidth />,
    title: "A new challenge daily",
    body: "Daily quizzes and Flagle-style puzzles. Build a streak, beat your best, and share your score with one tap.",
  },
  {
    center: <BookOpen size={42} strokeWidth={1.5} color={ACCENT.codex} absoluteStrokeWidth />,
    left: <img src={ESTELADA} alt="" style={FLANK} />,
    right: <img src={KANAKA} alt="" style={FLANK} />,
    title: "Explore the Codex",
    body: "Search 4,500+ flags — countries, historical states, regions, peoples and more. Tap any flag to learn its story.",
  },
]

// Lightweight first-run intro, shown as a card at the top of Today on a first
// visit; skippable instantly, and dismissing (Skip or Start) sets the onboarded flag for good.
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const last = i === SLIDES.length - 1
  const finish = () => { markOnboarded(); onDone() }
  const next = () => { if (last) finish(); else setI(i + 1) }
  const prev = () => setI(p => Math.max(0, p - 1))
  const s = SLIDES[i]

  // Swipe to advance / go back — threshold-based so taps on Skip/Next still
  // register. Swipe left = next, swipe right = previous.
  const touchX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 45) return
    if (dx < 0) next(); else prev()
  }

  // An inline welcome card at the top of Today, not an overlay: the page
  // underneath stays readable and scrollable the whole time.
  return (
    <section aria-label="Welcome to Globalio" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      style={{ position: "relative", padding: 16, borderRadius: 16, background: T.surface, border: `1px solid ${T.line}`,
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", touchAction: "pan-y" }}>
      <button onClick={finish}
        style={{ position: "absolute", top: 8, right: 8, padding: "8px 12px", background: "transparent", border: "none", color: T.muted, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
        Skip
      </button>

      <div key={i} className="carto-onb-slide" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, minHeight: 64, marginBottom: 12 }}>
          {s.left && <div style={{ transform: "rotate(-8deg)" }}>{s.left}</div>}
          <div style={{ lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.center}</div>
          {s.right && <div style={{ transform: "rotate(8deg)" }}>{s.right}</div>}
        </div>
        <h2 className="geo-display" style={{ color: T.text, fontWeight: 800, fontSize: 20, margin: 0, marginBottom: 8, fontFamily: FONT.display }}>{s.title}</h2>
        <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.55, margin: 0, marginBottom: 16, maxWidth: 360 }}>{s.body}</p>
      </div>
      <style>{`.carto-onb-slide{animation:onbSlide .28s ease}@keyframes onbSlide{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}@media (prefers-reduced-motion:reduce){.carto-onb-slide{animation:none}}`}</style>

      {/* progress dots */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {SLIDES.map((_, k) => (
          <span key={k} style={{ width: k === i ? 20 : 8, height: 8, borderRadius: 999,
            background: k === i ? ACCENT.codex : tint(T.muted, 0.4) }} />
        ))}
      </div>

      <button onClick={next}
        style={{ width: "100%", maxWidth: 360, padding: 12, borderRadius: 12, border: "none", cursor: "pointer",
          background: ACCENT.codex, color: T.onAccent, fontWeight: 800, fontSize: 15 }}>
        {last ? "Start playing" : "Next"}
      </button>
    </section>
  )
}
