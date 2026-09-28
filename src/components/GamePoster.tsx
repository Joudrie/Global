import { useEffect, useRef, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import worldMap from "@svg-maps/world"
import { Pointer, MousePointer2, Search, Speech, Check, X, ArrowUp, ArrowDown, Heart, Swords, Pencil } from "lucide-react"
import { SUB_FLAGS } from "../data/subdivisions"
import { T, tint, GROUP_TONES } from "../ui/tokens"
import { LineIcon } from "./icons"
import FlagImage from "./FlagImage"

/**
 * GamePoster — the art for a game card. Every poster *demonstrates* its game:
 * Silhouette is a black-and-white US flag, The Peel is a finger scratching a
 * dark coating off Brazil, Border Map is yellow Spain with its mystery
 * neighbours outlined, … All hand-curated per game id (no random flags),
 * composed from data we already ship plus CSS — so changing a poster is
 * editing this one file, not producing 40 image assets.
 *
 * Colours *inside* a poster are scene art (flag content, map paint), so
 * specific pigments (Spanish yellow, scratch-card grey) are allowed here;
 * chrome still uses tokens.
 *
 * Fills its parent; the caller owns size, radius and overflow:hidden.
 * variant="hero" (the Trending deck) insets full-bleed art in a framed stage
 * so the flag's edges are always visible.
 */

// Historical art lives on Wikimedia (same source the Historical screens use).
const WM = (file: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${file}`
const HOLY_ROMAN = WM("Banner_of_the_Holy_Roman_Emperor_with_haloes_(1430-1806).svg")
const SOVIET = WM("Flag_of_the_Soviet_Union.svg")
const RUSSIAN_EMPIRE = WM("Flag_of_the_Russian_Empire_(black-yellow-white).svg")
const DC_FLAG = "/flags/wm/flag-of-washington-d-c-388ae2.svg" // self-hosted

const SLATE = "#1c2e36" // deep slate backdrop for map/landmark scenes

const subUrl = (code: string) => SUB_FLAGS.find(s => s.code === code)?.flagUrl

const FILL: CSSProperties = { width: "100%", height: "100%", objectFit: "cover", display: "block" }
const flag = (code: string, style: CSSProperties = {}) =>
  <FlagImage code={code} style={{ ...FILL, ...style }} />
const urlImg = (src: string, style: CSSProperties = {}) =>
  <img src={src} alt="" loading="lazy" decoding="async" style={{ ...FILL, ...style }} />

// A small framed flag "card" used inside composed scenes.
function MiniFlag({ code, src, style }: { code?: string; src?: string; style?: CSSProperties }) {
  return (
    <div style={{ aspectRatio: "3 / 2", borderRadius: 4, overflow: "hidden", border: `1px solid ${T.line}`, boxShadow: `0 2px 6px -3px ${tint(T.text, 0.55)}`, background: T.surface, ...style }}>
      {src ? urlImg(src) : code ? flag(code) : null}
    </div>
  )
}

// A country shape from the world map, auto-zoomed to its own bounding box.
function MapShape({ loc, fill = "none", stroke, dashed = false }:
  { loc: string; fill?: string; stroke?: string; dashed?: boolean }) {
  const ref = useRef<SVGPathElement>(null)
  const [vb, setVb] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const map = worldMap as { viewBox: string; locations: { id: string; path: string }[] }
  const shape = map.locations.find(l => l.id === loc)
  useEffect(() => {
    if (!ref.current) return
    const b = ref.current.getBBox()
    const pad = Math.max(b.width, b.height) * 0.09
    setVb({ x: b.x - pad, y: b.y - pad, w: b.width + pad * 2, h: b.height + pad * 2 })
  }, [loc])
  if (!shape) return null
  const sw = vb ? vb.w * 0.014 : 1
  return (
    <svg viewBox={vb ? `${vb.x} ${vb.y} ${vb.w} ${vb.h}` : map.viewBox} preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block", opacity: vb ? 1 : 0 }}>
      <path ref={ref} d={shape.path} fill={fill} stroke={stroke} strokeWidth={stroke ? sw : 0}
        strokeDasharray={dashed ? `${sw * 2.6} ${sw * 1.8}` : undefined} strokeLinejoin="round" />
    </svg>
  )
}

// Border Map scene: solid-yellow Spain, its mystery neighbours (Portugal and
// southern France) outlined in white with question marks inside them.
// Framing is hardcoded to the *mainland* bounding boxes (Spain 449→484 ×
// 328→355, Portugal 448→458 × 333→352, France above from y≈296 in the world
// map's 1010×666 space) — Portugal's path includes the Azores far out in the
// Atlantic, so any auto-fit zooms out to open ocean.
function BordersScene() {
  const map = worldMap as { viewBox: string; locations: { id: string; path: string }[] }
  const path = (id: string) => map.locations.find(l => l.id === id)?.path
  const es = path("es"), pt = path("pt"), fr = path("fr")
  if (!es || !pt || !fr) return null
  return (
    <svg viewBox="444 312 44 46" preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}>
      <path d={fr} fill="none" stroke="#FFFFFF" strokeWidth={0.5} strokeLinejoin="round" />
      <path d={pt} fill="none" stroke="#FFFFFF" strokeWidth={0.5} strokeLinejoin="round" />
      <path d={es} fill="#F1BF00" stroke="none" />
      {/* ? inside Portugal, ? inside the visible south of France */}
      <text x={452.6} y={345} fill="#FFFFFF" fontSize={8} fontWeight={800}
        textAnchor="middle" fontFamily="'Playfair Display', Georgia, serif">?</text>
      <text x={477} y={326} fill="#FFFFFF" fontSize={8} fontWeight={800}
        textAnchor="middle" fontFamily="'Playfair Display', Georgia, serif">?</text>
    </svg>
  )
}

// 2×2 grid of curated flags; `ring` highlights one cell (the impostor).
function FourGrid({ codes, ring, badge }: { codes: string[]; ring?: number; badge?: ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 2, background: T.line }}>
        {codes.map((c, i) => (
          <div key={c} style={{ position: "relative", overflow: "hidden" }}>
            {flag(c)}
            {ring === i && <div style={{ position: "absolute", inset: 2, borderRadius: 4, border: `2px solid ${T.danger}` }} />}
          </div>
        ))}
      </div>
      {badge}
    </div>
  )
}

// Two flags head-to-head with a VS seal (plus optional higher/lower arrows).
function Versus({ a, b, accent, hero, arrows = false }: { a: string; b: string; accent: string; hero: boolean; arrows?: boolean }) {
  const badge: CSSProperties = { position: "absolute", top: "8%", borderRadius: 999, padding: hero ? 4 : 2, display: "flex", background: `${T.surface}F0`, boxShadow: `0 2px 6px -2px ${tint(T.text, 0.6)}` }
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", gap: 2, background: T.line }}>
      <div style={{ flex: 1, overflow: "hidden" }}>{flag(a)}</div>
      <div style={{ flex: 1, overflow: "hidden" }}>{flag(b)}</div>
      {arrows && (
        <>
          <span style={{ ...badge, left: "7%" }}><ArrowUp size={hero ? 16 : 12} color={T.green} strokeWidth={2.4} /></span>
          <span style={{ ...badge, right: "7%" }}><ArrowDown size={hero ? 16 : 12} color={T.danger} strokeWidth={2.4} /></span>
        </>
      )}
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: hero ? 34 : 24, height: hero ? 34 : 24, borderRadius: 999, background: accent, color: T.onAccent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: hero ? 13 : 9, boxShadow: `0 2px 8px -2px ${tint(T.text, 0.6)}` }}>VS</div>
    </div>
  )
}

// Three items in sequence with connectors (lineage / timeline).
function FlagRow({ items, accent, hero }: { items: { code?: string; src?: string }[]; accent: string; hero: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: hero ? 8 : 4, padding: hero ? "0 14px" : "0 7px", background: `radial-gradient(120% 120% at 50% 22%, ${tint(accent, 0.2)}, ${tint(accent, 0.06)})` }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: hero ? 8 : 4, minWidth: 0, flex: 1 }}>
          {i > 0 && <span style={{ flex: "0 0 auto", width: hero ? 12 : 7, height: 2, background: tint(accent, 0.6) }} />}
          <MiniFlag code={it.code} src={it.src} style={{ flex: 1, minWidth: 0 }} />
        </div>
      ))}
    </div>
  )
}

// id → scene. `bleed` scenes get the framed inset stage in the hero variant so
// the flag's edges always show; composed scenes already frame themselves.
function buildArt(id: string, accent: string, hero: boolean): { node: ReactNode; bleed: boolean } {
  const wash = `radial-gradient(120% 120% at 50% 22%, ${tint(accent, 0.22)}, ${tint(accent, 0.07)})`
  const box: CSSProperties = { position: "absolute", inset: 0 }

  switch (id) {
    // ── Featured explorer ──
    case "worldcup":
      // The three host nations behind a gleaming trophy.
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", display: "flex", gap: hero ? 5 : 3 }}>
            {["us", "mx", "ca"].map(c => (
              <MiniFlag key={c} code={c} style={{ width: hero ? 30 : 21, opacity: 0.85 }} />
            ))}
            <span style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", display: "flex",
              padding: hero ? 7 : 5, borderRadius: 999, background: `${T.surface}F2`, border: `1px solid ${tint(accent, 0.5)}`,
              boxShadow: `0 2px 10px -2px ${tint(T.text, 0.6)}` }}>
              <LineIcon name="worldcup" size={hero ? 24 : 16} color={accent} strokeWidth={1.6} />
            </span>
          </div>
        </div>
      ) }

    // ── Daily rituals ──
    case "funfact":
      // The daily fact: a small, tilted Polish flag with a glowing bulb beside
      // it — most of the warm wash stays visible so it reads calm.
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", alignItems: "center", justifyContent: "center", gap: hero ? 16 : 9 }}>
          <span style={{ display: "flex", filter: `drop-shadow(0 0 ${hero ? 8 : 5}px ${tint(T.gold, 0.85)})` }}>
            <LineIcon name="funfact" size={hero ? 34 : 22} color={T.gold} strokeWidth={1.5} />
          </span>
          <MiniFlag code="ph" style={{ width: hero ? "30%" : "38%", transform: "rotate(5deg)" }} />
        </div>
      ) }
    case "gacha":
      // A present, glowing faintly — "oh, a gift" is the whole pitch.
      return { bleed: false, node: (
        <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center", background: wash }}>
          <span style={{ display: "flex", filter: `drop-shadow(0 0 ${hero ? 9 : 6}px ${tint(accent, 0.75)})` }}>
            <LineIcon name="gacha" size={hero ? 52 : 30} color={accent} strokeWidth={1.4} />
          </span>
        </div>
      ) }
    case "flagbracket":
      // A four-flag bracket: Kazakhstan & Iceland vs Canada & Brazil.
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", alignItems: "stretch", padding: hero ? "12px 14px" : "7px 8px", gap: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "27%" }}>
            <MiniFlag code="kz" /><MiniFlag code="is" />
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ flex: 1, height: "100%" }}>
            {["M0 22 H30 V78 H0", "M30 50 H46", "M100 22 H70 V78 H100", "M70 50 H54"].map(d => (
              <path key={d} d={d} fill="none" stroke={tint(accent, 0.75)} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            ))}
            <circle cx="50" cy="50" r="5" fill={accent} />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "27%" }}>
            <MiniFlag code="ca" /><MiniFlag code="br" />
          </div>
        </div>
      ) }
    case "tierlist":
      // Zoomed S / A tier rows with a cursor dragging Poland into S.
      return { bleed: false, node: (
        <div style={{ ...box, display: "flex", flexDirection: "column", gap: 2, background: T.line }}>
          {[{ k: "S", c: T.gold }, { k: "A", c: T.green }].map(t => (
            <div key={t.k} style={{ flex: 1, display: "flex", background: T.surfaceHi }}>
              <div style={{ width: hero ? 36 : 24, display: "flex", alignItems: "center", justifyContent: "center", background: tint(t.c, 0.3), fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: hero ? 18 : 13, color: T.text }}>{t.k}</div>
            </div>
          ))}
          <div style={{ position: "absolute", left: "46%", top: "18%", width: hero ? "26%" : "32%", transform: "rotate(-7deg)" }}>
            <MiniFlag code="pl" />
            <MousePointer2 size={hero ? 20 : 14} color={T.text} fill={T.surface} strokeWidth={1.7} style={{ position: "absolute", right: -6, bottom: -7 }} />
          </div>
        </div>
      ) }

    // ── One Glance ──
    case "silhouette":
      // The American flag drained to pure black and white, on the normal wash.
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: hero ? "52%" : "64%", aspectRatio: "3 / 2", borderRadius: 4, overflow: "hidden", border: `1px solid ${T.line}`, boxShadow: `0 3px 10px -4px ${tint(T.text, 0.6)}` }}>
            {flag("us", { filter: "grayscale(1) contrast(1.6)" })}
          </div>
        </div>
      ) }
    case "thecrop":
      // Deep zoom into the Vatican flag, magnifier in the corner.
      return { bleed: true, node: (
        <div style={{ ...box, background: tint(accent, 0.1) }}>
          {flag("va", { transform: `scale(${hero ? 3.2 : 2.8})`, transformOrigin: "62% 58%" })}
          <div style={{ position: "absolute", right: hero ? 10 : 5, bottom: hero ? 8 : 4, color: accent, background: `${T.surface}F0`, borderRadius: 999, padding: hero ? 6 : 4, display: "flex", border: `1px solid ${tint(accent, 0.5)}` }}>
            <Search size={hero ? 20 : 13} color={accent} strokeWidth={1.8} />
          </div>
        </div>
      ) }
    case "thepeel":
      // A solid finger scratching a zigzag path of coating off Brazil.
      return { bleed: true, node: (
        <div style={{ ...box, background: "#22282b" }}>
          <div style={{ position: "absolute", inset: 0, clipPath: "polygon(8% 58%, 28% 42%, 50% 47%, 70% 27%, 90% 16%, 92% 40%, 72% 53%, 50% 73%, 30% 68%, 12% 82%)" }}>
            {flag("br")}
          </div>
          <Pointer size={hero ? 30 : 20} color="#22282b" fill="#F2EBDB" strokeWidth={1.4} style={{ position: "absolute", right: "5%", top: "10%", transform: "rotate(-18deg)" }} />
        </div>
      ) }
    case "composer":
      // The 3×3 tile board mid-game: centre + a corner flipped, Mexico beneath.
      return { bleed: true, node: (
        <div style={{ ...box }}>
          {flag("mx")}
          <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr 1fr", gap: 1 }}>
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} style={{ background: [2, 4].includes(i) ? "transparent" : T.surfaceHi, border: `1px solid ${T.line}` }} />
            ))}
          </div>
        </div>
      ) }
    case "buildflag":
      // The French tricolore being assembled — red band still to place.
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: hero ? "52%" : "66%", aspectRatio: "3 / 2", display: "flex", gap: 3 }}>
            <div style={{ flex: 1, background: "#0055A4", borderRadius: 3, boxShadow: `0 2px 6px -3px ${tint(T.text, 0.55)}` }} />
            <div style={{ flex: 1, background: "#FFFFFF", borderRadius: 3, border: `1px solid ${T.line}` }} />
            <div style={{ flex: 1, borderRadius: 3, border: `2px dashed ${tint(T.text, 0.45)}` }} />
          </div>
        </div>
      ) }
    case "frankenflag":
      // Top half of one flag stitched to the bottom half of another.
      return { bleed: true, node: (
        <div style={{ ...box }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "50%", overflow: "hidden" }}>
            {flag("de", { height: "200%" })}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "50%", overflow: "hidden" }}>
            {flag("br", { height: "200%", transform: "translateY(-50%)" })}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 2, marginTop: -1, background: T.surface, opacity: 0.9 }} />
        </div>
      ) }

    case "geopaint": {
      // The Stars & Stripes, recoloured with lime-green stripes — eye-catching,
      // and a literal hint at the game: take a flag and repaint its colours.
      const LIME = "#A3E635", NAVY = "#2B2D77"
      const sh = 53 / 13 // stripe height in a 100×53 (flag-ratio) viewBox
      return { bleed: true, node: (
        <svg viewBox="0 0 100 53" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
          {Array.from({ length: 13 }, (_, i) => (
            <rect key={i} x={0} y={i * sh} width={100} height={sh} fill={i % 2 === 0 ? LIME : "#FFFFFF"} />
          ))}
          <rect x={0} y={0} width={40} height={sh * 7} fill={NAVY} />
          {Array.from({ length: 4 }).flatMap((_, r) =>
            Array.from({ length: 5 }).map((_, c) => (
              <circle key={`${r}-${c}`} cx={5 + c * 7.5} cy={4.5 + r * 6.4} r={1.25} fill="#FFFFFF" />
            )))}
        </svg>
      ) }
    }

    case "sketchflag":
      // A half-drawn Japan: a dashed red circle on a white card, pencil in hand.
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: hero ? "52%" : "64%", aspectRatio: "3 / 2", borderRadius: 4, background: "#FFFFFF", border: `1px solid ${T.line}`, boxShadow: `0 3px 10px -4px ${tint(T.text, 0.6)}` }}>
            <svg viewBox="0 0 100 67" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <circle cx="50" cy="33" r="17" fill="none" stroke="#C8102E" strokeWidth="4" strokeDasharray="4 4" strokeLinecap="round" />
            </svg>
            <Pencil size={hero ? 26 : 18} color={T.text} fill={T.surface} strokeWidth={1.5} style={{ position: "absolute", right: -6, bottom: -7, transform: "rotate(8deg)" }} />
          </div>
        </div>
      ) }
    case "flagoutline":
      // A neon outline flag — vertical tricolour drawn as strokes only, with a ?.
      return { bleed: true, node: (
        <div style={{ ...box, background: "#0b0b10" }}>
          <svg viewBox="0 0 300 200" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
            {[6, 104, 202].map(x => (
              <rect key={x} x={x} y={6} width={92} height={188} fill="none" stroke={tint(accent, 0.85)} strokeWidth={3} rx={3} />
            ))}
            <text x="150" y="118" textAnchor="middle" fontSize="64" fontWeight="800" fill={tint(accent, 0.9)} fontFamily="'Playfair Display', Georgia, serif">?</text>
          </svg>
        </div>
      ) }

    // ── Spot It ──
    case "spoterror":
      // Italy with the wrong middle band (blue, not white), ringed in red.
      return { bleed: true, node: (
        <div style={{ ...box }}>
          <svg viewBox="0 0 300 200" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
            <rect x={0} y={0} width={100} height={200} fill="#008C45" />
            <rect x={100} y={0} width={100} height={200} fill="#0047AB" />
            <rect x={200} y={0} width={100} height={200} fill="#CD212A" />
            <rect x={104} y={6} width={92} height={188} fill="none" stroke={T.danger} strokeWidth={8} rx={4} />
          </svg>
        </div>
      ) }
    case "oddoneout":
      // Three Nordic crosses and one impostor, ringed.
      return { bleed: true, node: <FourGrid codes={["dk", "no", "se", "ch"]} ring={3} /> }
    case "lookalikes":
      // Four genuinely confusable tricolores.
      return { bleed: true, node: <FourGrid codes={["ro", "td", "ad", "md"]} /> }
    case "flagdna":
      // The helix and a white flag bearing a big red question mark.
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", alignItems: "center", justifyContent: "center", gap: hero ? 16 : 9 }}>
          <LineIcon name="flagdna" size={hero ? 42 : 27} color={accent} strokeWidth={1.5} />
          <div style={{ width: hero ? "30%" : "38%", aspectRatio: "3 / 2", borderRadius: 4, background: "#FFFFFF", border: `1px solid ${T.line}`, boxShadow: `0 2px 6px -3px ${tint(T.text, 0.55)}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: hero ? 26 : 18, color: "#C8102E" }}>?</div>
        </div>
      ) }
    case "symbolhunt":
      // Four star-bearing flags under the magnifier.
      return { bleed: true, node: (
        <FourGrid codes={["tr", "vn", "ma", "so"]} badge={
          <div style={{ position: "absolute", right: hero ? 10 : 5, bottom: hero ? 8 : 4, color: accent, background: `${T.surface}F0`, borderRadius: 999, padding: hero ? 6 : 4, display: "flex", border: `1px solid ${tint(accent, 0.5)}` }}>
            <LineIcon name="symbolhunt" size={hero ? 20 : 13} color={accent} />
          </div>
        } />
      ) }
    case "flagfamilies":
      // The Nordic cross family, together.
      return { bleed: true, node: <FourGrid codes={["dk", "se", "no", "is"]} /> }

    // ── Cartographer ──
    case "geo":
      // Italy's shape, bright white on deep slate.
      return { bleed: false, node: (
        <div style={{ ...box, background: SLATE, padding: hero ? 8 : 5 }}>
          <MapShape loc="it" fill="#FFFFFF" />
        </div>
      ) }
    case "bordermap":
      // Solid-yellow Spain; Portugal & southern France outlined with ?s.
      return { bleed: false, node: (
        <div style={{ ...box, background: SLATE, padding: hero ? 6 : 4 }}>
          <BordersScene />
        </div>
      ) }
    case "borderchain":
      // Greece to China, hop by hop along a dotted path.
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", alignItems: "center", padding: hero ? "0 14px" : "0 8px", gap: hero ? 8 : 5 }}>
          <MiniFlag code="gr" style={{ width: "24%" }} />
          <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ flex: 1, height: "60%" }}>
            <polyline points="2,44 26,18 50,42 74,16 98,34" fill="none" stroke={tint(accent, 0.8)} strokeWidth={2.5}
              strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
            {[[26, 18], [50, 42], [74, 16]].map(([x, y]) => (
              <circle key={`${x}`} cx={x} cy={y} r={4.5} fill={accent} stroke={T.surface} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          <MiniFlag code="cn" style={{ width: "24%" }} />
        </div>
      ) }
    case "continentsort":
      // One flag from each corner of the world.
      return { bleed: true, node: <FourGrid codes={["jp", "br", "fr", "za"]} /> }

    // ── Sharp Recall ──
    case "reversequiz":
      // Name in mind, flags on the table: a mystery mark and Nepal's
      // unmistakable shape to find.
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", alignItems: "center", justifyContent: "center", gap: hero ? 18 : 10 }}>
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: hero ? 40 : 26, color: accent }}>?</span>
          <div style={{ width: hero ? "26%" : "34%", aspectRatio: "4 / 3", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FlagImage code="np" style={{ maxWidth: "100%", maxHeight: "100%", display: "block", filter: `drop-shadow(0 2px 5px ${tint(T.text, 0.45)})` }} />
          </div>
        </div>
      ) }
    case "capitalquiz":
      // The Washington Monument and the Capitol dome — unmistakably a capital.
      return { bleed: false, node: (
        <div style={{ ...box, background: SLATE, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 130 100" preserveAspectRatio="xMidYMid meet" style={{ height: "84%" }}>
            {/* monument */}
            <polygon points="38,6 33.5,17 42.5,17" fill="#FFFFFF" />
            <polygon points="34,17 42,17 45.5,78 30.5,78" fill="#FFFFFF" />
            {/* capitol: steps, colonnade, dome, cupola */}
            <rect x="68" y="72" width="48" height="6" rx="1" fill="#FFFFFF" />
            <rect x="73" y="58" width="38" height="14" fill="#FFFFFF" />
            {[78, 84, 90, 96, 102].map(x => <rect key={x} x={x} y={60} width={2.4} height={10} fill={SLATE} />)}
            <path d="M76 58 Q92 34 108 58 Z" fill="#FFFFFF" />
            <rect x="90" y="26" width="4" height="9" fill="#FFFFFF" />
            <circle cx="92" cy="24" r="2.4" fill="#FFFFFF" />
            {/* ground */}
            <rect x="16" y="80" width="100" height="2.5" rx="1.2" fill="#FFFFFF" opacity="0.85" />
            <rect x="32" y="87" width="68" height="1.6" rx="0.8" fill="#FFFFFF" opacity="0.35" />
          </svg>
        </div>
      ) }
    case "statclash":
      // Largest country vs smallest.
      return { bleed: true, node: <Versus a="ru" b="va" accent={accent} hero={hero} /> }
    case "higherlower":
      return { bleed: true, node: <Versus a="cn" b="in" accent={accent} hero={hero} arrows /> }

    // ── Loremaster ──
    case "language":
      // Someone speaking; the bubble holds candidate flags and a mystery.
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", alignItems: "center", justifyContent: "center", gap: hero ? 12 : 7 }}>
          <Speech size={hero ? 36 : 24} color={accent} strokeWidth={1.5} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: hero ? 6 : 4, padding: hero ? "8px 12px" : "5px 8px", borderRadius: 12, background: T.surface, border: `1px solid ${T.line}`, boxShadow: `0 2px 6px -3px ${tint(T.text, 0.5)}` }}>
            <span style={{ position: "absolute", left: -5, top: "50%", width: 9, height: 9, transform: "translateY(-50%) rotate(45deg)", background: T.surface, borderLeft: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}` }} />
            <MiniFlag code="it" style={{ width: hero ? 26 : 18, boxShadow: "none" }} />
            <MiniFlag code="jp" style={{ width: hero ? 26 : 18, boxShadow: "none" }} />
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: hero ? 16 : 12, color: accent }}>?</span>
          </div>
        </div>
      ) }
    case "twotruths":
      // Three statements about a country — two check out, one is the lie.
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", flexDirection: "column", justifyContent: "center", gap: hero ? 6 : 4, padding: hero ? "0 22px" : "0 12px" }}>
          {[T.green, T.green, T.danger].map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: hero ? 8 : 5, padding: hero ? "5px 9px" : "3px 6px", borderRadius: 6, background: T.surface, border: `1px solid ${T.line}` }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ height: hero ? 3 : 2, width: "82%", borderRadius: 2, background: tint(T.text, 0.3) }} />
                <span style={{ height: hero ? 3 : 2, width: "55%", borderRadius: 2, background: tint(T.text, 0.18) }} />
              </div>
              {c === T.danger
                ? <X size={hero ? 15 : 11} color={c} strokeWidth={2.6} />
                : <Check size={hero ? 15 : 11} color={c} strokeWidth={2.6} />}
            </div>
          ))}
        </div>
      ) }
    case "forgery":
      // Two Italys side by side — one genuine, one mirrored so the red leads.
      // (Italy isn't one of the in-game forgeries, so nothing is spoiled.)
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", alignItems: "center", justifyContent: "center", gap: hero ? 12 : 7 }}>
          <div style={{ position: "relative", width: hero ? "28%" : "34%" }}>
            <MiniFlag code="it" />
            <div style={{ position: "absolute", right: -5, top: -5, width: hero ? 18 : 14, height: hero ? 18 : 14, borderRadius: 999, background: T.surface, border: `1.5px solid ${T.green}`, color: T.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check size={hero ? 11 : 8} strokeWidth={3} />
            </div>
          </div>
          <div style={{ position: "relative", width: hero ? "28%" : "34%" }}>
            <MiniFlag code="it" style={{ transform: "scaleX(-1)" }} />
            <div style={{ position: "absolute", right: -5, top: -5, width: hero ? 18 : 14, height: hero ? 18 : 14, borderRadius: 999, background: T.surface, border: `1.5px solid ${T.danger}`, color: T.danger, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={hero ? 11 : 8} strokeWidth={3} />
            </div>
          </div>
        </div>
      ) }
    case "realorbot":
      // A Canada that's the wrong colour — clearly a bot's work. Zoomed in a
      // touch so the maple leaf owns the left; the bot seal sits to the right.
      return { bleed: true, node: (
        <div style={{ ...box, background: tint(accent, 0.1) }}>
          {flag("ca", { filter: "hue-rotate(160deg) saturate(1.4)", transform: "scale(1.25)", transformOrigin: "42% 50%" })}
          <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,0.07) 3px 4px)" }} />
          <div style={{ position: "absolute", right: "7%", top: "50%", transform: "translateY(-50%)", width: hero ? 40 : 28, height: hero ? 40 : 28, borderRadius: 999, background: `${T.surface}F2`, border: `2px solid ${accent}`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 10px -2px ${tint(T.text, 0.6)}` }}>
            <LineIcon name="realorbot" size={hero ? 24 : 17} color={accent} strokeWidth={1.8} />
          </div>
        </div>
      ) }
    case "deadoralive": {
      // The Soviet flag — the canonical "vanished" flag.
      return { bleed: true, node: (
        <div style={{ ...box, background: "#8a1f1f" }}>
          {urlImg(SOVIET)}
          <div style={{ position: "absolute", right: hero ? 10 : 5, bottom: hero ? 8 : 4, color: T.muted, background: `${T.surface}F0`, borderRadius: 999, padding: hero ? 6 : 4, display: "flex", border: `1px solid ${T.line}` }}>
            <LineIcon name="deadoralive" size={hero ? 18 : 12} color={T.muted} />
          </div>
        </div>
      ) }
    }
    case "timeline":
      // One country, three eras: Russian Empire → Soviet Union → Russia.
      return { bleed: false, node: <FlagRow items={[{ src: RUSSIAN_EMPIRE }, { src: SOVIET }, { code: "ru" }]} accent={accent} hero={hero} /> }
    case "lineage":
      // A real family tree: the Union Jack and its descendants.
      return { bleed: false, node: <FlagRow items={[{ code: "gb" }, { code: "au" }, { code: "nz" }]} accent={accent} hero={hero} /> }

    // ── Challenge ──
    case "gauntlet":
      // Every flag, one life: crossed swords, the march of flags, one heart.
      return { bleed: false, node: (
        <div style={{ ...box, background: SLATE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: hero ? 8 : 5 }}>
          <Swords size={hero ? 30 : 20} color="#FFFFFF" strokeWidth={1.5} />
          <div style={{ display: "flex", gap: hero ? 6 : 4 }}>
            {["gr", "jp", "br"].map(c => <MiniFlag key={c} code={c} style={{ width: hero ? 30 : 21, border: "1px solid #36464e", boxShadow: "none" }} />)}
          </div>
          <Heart size={hero ? 16 : 11} color={T.danger} fill={T.danger} style={{ position: "absolute", right: "9%", top: "12%" }} />
        </div>
      ) }
    case "challenge":
      // States & provinces: Texas and Bavaria under the medal.
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", alignItems: "center", justifyContent: "center", gap: hero ? 12 : 7 }}>
          <LineIcon name="challenge" size={hero ? 32 : 21} color={accent} strokeWidth={1.5} />
          <MiniFlag src={subUrl("us-tx")} style={{ width: hero ? "24%" : "30%" }} />
          <MiniFlag src={subUrl("de-by")} style={{ width: hero ? "24%" : "30%" }} />
        </div>
      ) }

    // ── Curriculum & subdivisions ──
    case "historical":
      // The Holy Roman Empire's eagle banner, lightly aged.
      return { bleed: true, node: (
        <div style={{ ...box, background: "#cdbb93" }}>
          {urlImg(HOLY_ROMAN, { filter: "sepia(0.25)" })}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(130% 130% at 50% 40%, transparent 50%, rgba(60,40,15,0.35))" }} />
        </div>
      ) }
    case "provinceroulette": {
      const src = subUrl("ca-qc") // Quebec
      if (!src) break
      return { bleed: true, node: <div style={{ ...box, background: tint(accent, 0.1) }}>{urlImg(src)}</div> }
    }
    case "substumper": {
      const src = subUrl("us-az") // Arizona
      if (!src) break
      return { bleed: true, node: <div style={{ ...box, background: tint(accent, 0.1) }}>{urlImg(src)}</div> }
    }
    case "identity":
    case "prideroulette":
      return { bleed: true, node: (
        <div style={{ ...box, display: "flex", flexDirection: "column" }}>
          {["#E40303", "#FF8C00", "#FFED00", "#008026", "#004CFF", "#732982"].map(c => (
            <div key={c} style={{ flex: 1, background: c }} />
          ))}
        </div>
      ) }
    case "flags":
    case "flashcards": {
      // A fanned stack of cards to learn — each deck fans its own way with its
      // own flags so the two posters read differently at a glance.
      const deck = id === "flags" ? ["us", "jp", "br"] : ["de", "ar", "ke"]
      const dir = id === "flags" ? 1 : -1
      return { bleed: false, node: (
        <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center", background: wash }}>
          <div style={{ position: "relative", width: hero ? "42%" : "58%", aspectRatio: "3 / 2" }}>
            {deck.map((c, i) => (
              <div key={c} style={{ position: "absolute", inset: 0, borderRadius: 5, overflow: "hidden", border: `1px solid ${T.surface}`,
                transform: `translate(${(i - 1) * (hero ? 9 : 5) * dir}px, ${(i - 1) * (hero ? 7 : 4)}px) rotate(${(i - 1) * 5 * dir}deg)`,
                boxShadow: `0 3px 8px -4px ${tint(T.text, 0.6)}`, zIndex: i }}>{flag(c)}</div>
            ))}
          </div>
        </div>
      ) }
    }

    // ── Beta Sandbox ──
    case "flagle":
      // Wordle tiles closing in on the answer.
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: hero ? 5 : 3 }}>
          {[[tint(T.text, 0.22), T.gold, tint(T.text, 0.22), T.green, tint(T.text, 0.22)],
            [T.green, T.green, T.green, T.green, T.green]].map((row, r) => (
            <div key={r} style={{ display: "flex", gap: hero ? 5 : 3 }}>
              {row.map((c, i) => <span key={i} style={{ width: hero ? 16 : 11, height: hero ? 16 : 11, borderRadius: 3, background: c }} />)}
            </div>
          ))}
        </div>
      ) }
    case "connections":
      // The board: one solved row in each group tone, above plain tiles.
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: hero ? 5 : 3 }}>
          {[0, 1, 2].map(r => (
            <div key={r} style={{ display: "flex", gap: hero ? 5 : 3 }}>
              {[0, 1, 2, 3].map(i => <span key={i} style={{ width: hero ? 22 : 14, height: hero ? 14 : 9, borderRadius: 3, background: r === 0 ? GROUP_TONES[0] : r === 1 ? GROUP_TONES[3] : tint(T.text, 0.18) }} />)}
            </div>
          ))}
        </div>
      ) }
    case "uscityflags":
      // Washington, D.C. — the capital's own city flag.
      return { bleed: true, node: <div style={{ ...box, background: "#FFFFFF" }}>{urlImg(DC_FLAG)}</div> }
    case "capitalmatch":
      // Pair the flag with its capital.
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", alignItems: "center", justifyContent: "center", gap: hero ? 10 : 6 }}>
          <MiniFlag code="fr" style={{ width: hero ? "26%" : "32%" }} />
          <span style={{ width: hero ? 18 : 11, height: 2, background: tint(accent, 0.7) }} />
          <span style={{ display: "flex", padding: hero ? 8 : 5, borderRadius: 999, background: T.surface, border: `1px solid ${tint(accent, 0.45)}` }}>
            <LineIcon name="capitalquiz" size={hero ? 22 : 15} color={accent} strokeWidth={1.6} />
          </span>
        </div>
      ) }
    case "describeit":
      // Written clues pointing at a mystery flag.
      return { bleed: false, node: (
        <div style={{ ...box, background: wash, display: "flex", alignItems: "center", justifyContent: "center", gap: hero ? 12 : 7 }}>
          <div style={{ width: hero ? "32%" : "38%", display: "flex", flexDirection: "column", gap: hero ? 4 : 3, padding: hero ? 9 : 6, borderRadius: 6, background: T.surface, border: `1px solid ${T.line}` }}>
            {[0.85, 0.6, 0.72].map((w, i) => (
              <span key={i} style={{ height: 2, width: `${w * 100}%`, borderRadius: 2, background: tint(T.text, 0.3) }} />
            ))}
          </div>
          <div style={{ width: hero ? "24%" : "30%", aspectRatio: "3 / 2", borderRadius: 4, border: `1.5px dashed ${tint(accent, 0.6)}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: hero ? 18 : 13, color: accent }}>?</div>
        </div>
      ) }
    case "oddborder":
      // Three shapes that share borders, one ocean apart — ringed.
      return { bleed: false, node: (
        <div style={{ ...box, background: SLATE, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 2, padding: 3 }}>
          {["it", "ch", "at", "jp"].map((c, i) => (
            <div key={c} style={{ position: "relative", padding: 2 }}>
              <MapShape loc={c} fill="#FFFFFF" />
              {i === 3 && <div style={{ position: "absolute", inset: 0, borderRadius: 4, border: `2px solid ${T.danger}` }} />}
            </div>
          ))}
        </div>
      ) }
  }

  // Default — the game's own etched glyph on a soft accent wash. Relevant and
  // calm; never a random unrelated flag.
  return { bleed: false, node: (
    <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center", background: wash }}>
      <LineIcon name={id} size={hero ? 56 : 32} color={accent} strokeWidth={1.3} />
    </div>
  ) }
}

export function GamePoster({ id, accent, variant = "tile" }:
  { id: string; accent: string; variant?: "tile" | "hero" }) {
  const hero = variant === "hero"
  const { node, bleed } = buildArt(id, accent, hero)
  if (hero && bleed) {
    // Inset stage: the flag art floats framed on the wash, edges fully visible.
    return (
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 120% at 50% 22%, ${tint(accent, 0.18)}, ${tint(accent, 0.06)})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", height: "calc(100% - 18px)", aspectRatio: "3 / 2", borderRadius: 8, overflow: "hidden", border: `1px solid ${T.line}`, boxShadow: `0 4px 14px -6px ${tint(T.text, 0.5)}` }}>
          {node}
        </div>
      </div>
    )
  }
  return <>{node}</>
}
