import type { CSSProperties, ReactNode } from "react"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import type { TabKey } from "../ui/registry"
import { LineIcon, ChevronLeftIcon, CrownIcon } from "./icons"
import { GamePoster } from "./GamePoster"

/* ── Screen chrome: the ONE back button + header used by every destination
   screen. 44px touch target, token colours, serif display title. ─────────── */
export function BackButton({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="geo-tap"
      style={{
        width: 44, height: 44, borderRadius: 999, flexShrink: 0,
        background: T.surface, border: `1px solid ${T.line}`, color: T.muted,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
      <ChevronLeftIcon size={22} color={T.muted} strokeWidth={1.8} />
    </button>
  )
}

export function ScreenHeader({ title, subtitle, onBack, right }:
  { title: ReactNode; subtitle?: ReactNode; onBack: () => void; right?: ReactNode }) {
  return (
    <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px 10px", position: "relative" }}>
      <BackButton onClick={onBack} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 className="geo-display" style={{ color: T.text, fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em", lineHeight: 1.1, margin: 0 }}>{title}</h1>
        {subtitle && <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right}
    </header>
  )
}

// Render an etched line icon (never an emoji; unknown names fall back to a compass).
function Glyph({ glyph, size, color }: { glyph?: string; size: number; color: string }) {
  return <LineIcon name={glyph ?? "compass"} size={size} color={color} />
}

/* ── Circular progress ring with monospaced % readout ───────────────────── */
export function ProgressRing({ done, total, accent, size = 40, stroke = 3.5, label = true }:
  { done: number; total: number; accent: string; size?: number; stroke?: number; label?: boolean }) {
  const pct = total ? Math.min(1, done / total) : 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const mid = size / 2
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={mid} cy={mid} r={r} fill="none" stroke={T.line} strokeWidth={stroke} />
      <circle cx={mid} cy={mid} r={r} fill="none" stroke={accent} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${mid} ${mid})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      {label && (
        <text x={mid} y={mid} dominantBaseline="central" textAnchor="middle"
          fill={accent} fontSize={size * 0.27} fontWeight={700}
          style={{ fontFamily: FONT.mono, letterSpacing: "-0.04em" }}>
          {Math.round(pct * 100)}
        </text>
      )}
    </svg>
  )
}

/* ── Stat pill: mono metric + uppercase micro label ─────────────────────── */
export function StatPill({ icon, value, label, accent = T.amber, big = false }:
  { icon?: ReactNode; value: ReactNode; label: string; accent?: string; big?: boolean }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 2, padding: big ? "14px 16px" : "8px 12px",
      borderRadius: 10, background: T.surface, border: `1px solid ${T.line}`, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: accent }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon && <span style={{ fontSize: big ? 15 : 12 }}>{icon}</span>}
        <span style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: big ? 26 : 16, color: accent, letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</span>
      </div>
      <span className="geo-micro" style={{ fontSize: 8.5, color: T.muted }}>{label}</span>
    </div>
  )
}

/* ── Section header: high-tracking uppercase micro-copy + optional action ── */
export function SectionHeader({ title, accent = T.muted, action }:
  { title: string; accent?: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 12, height: 1.5, background: accent, opacity: 0.7 }} />
        <span className="geo-micro" style={{ fontSize: 10, color: accent }}>{title}</span>
      </div>
      {action}
    </div>
  )
}

/* ── Module card: heavy learning tasks (icon, title, subtitle, progress) ── */
export function ModuleCard({ glyph, title, subtitle, accent, progress, onClick }:
  {
    icon?: ReactNode; glyph?: string; title: string; subtitle: string; accent: string
    progress?: { done: number; total: number }; onClick: () => void
  }) {
  const mastered = !!progress && progress.total > 0 && progress.done >= progress.total
  return (
    <button onClick={onClick}
      className={`geo-tap ${mastered ? "geo-foil" : "carto-card"}`}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 13, textAlign: "left",
        padding: "13px 14px", borderRadius: 12, position: "relative", overflow: "hidden",
        ["--wash" as string]: tint(accent, 0.45),
      }}>
      {/* accent spine */}
      <span style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 2.5, borderRadius: 2, background: accent }} />
      {/* icon chip */}
      <span style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: tint(accent, 0.12), border: `1px solid ${tint(accent, 0.28)}`,
        color: accent,
      }}><Glyph glyph={glyph} size={21} color={accent} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="geo-display" style={{ color: T.text, fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>
          {title}{mastered && <span style={{ marginLeft: 6, display: "inline-flex", verticalAlign: "-1px" }} aria-label="mastered"><CrownIcon size={13} color={T.gold} strokeWidth={1.7} /></span>}
        </div>
        <div style={{ color: T.muted, fontSize: 11.5, marginTop: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{subtitle}</div>
      </div>
      {progress
        ? <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
            <ProgressRing done={progress.done} total={progress.total} accent={accent} size={38} />
            <span style={{ fontFamily: FONT.mono, fontSize: 9, color: T.dim, letterSpacing: "-0.02em" }}>{progress.done}/{progress.total}</span>
          </div>
        : <span style={{ color: accent, fontSize: 18, opacity: 0.7 }}>→</span>}
    </button>
  )
}

/* ── Game tile: compact, casual minigames (carousel / grid) ─────────────── */
export function GameTile({ glyph, title, subtitle, accent, onClick, style }:
  { icon?: ReactNode; glyph?: string; title: string; subtitle: string; accent: string; onClick: () => void; style?: CSSProperties }) {
  return (
    <button onClick={onClick} className="geo-tap carto-card"
      style={{
        width: 124, flexShrink: 0, textAlign: "left", padding: "12px 12px 13px",
        borderRadius: 12, display: "flex", flexDirection: "column", gap: 8, position: "relative", overflow: "hidden",
        ["--wash" as string]: tint(accent, 0.4),
        ...style,
      }}>
      <span style={{
        width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
        background: tint(accent, 0.12), border: `1px solid ${tint(accent, 0.3)}`, color: accent,
      }}><Glyph glyph={glyph} size={18} color={accent} /></span>
      <div>
        <div className="geo-display" style={{ color: T.text, fontWeight: 600, fontSize: 12.5, lineHeight: 1.1 }}>{title}</div>
        <div style={{ color: T.muted, fontSize: 9.5, marginTop: 3, lineHeight: 1.2 }}>{subtitle}</div>
      </div>
    </button>
  )
}

/* ── Flag tile: the flag-forward catalogue card. A framed GamePoster up top
   (art that *demonstrates* the game — see GamePoster), serif title beneath.
   The flag is inset with parchment around it so it reads calm, not loud. ─── */
export function FlagTile({ id, title, subtitle, accent, onClick, style }:
  { id: string; title: string; subtitle: string; accent: string; onClick: () => void; style?: CSSProperties }) {
  return (
    <button onClick={onClick} className="geo-tap carto-card"
      style={{
        width: 140, flexShrink: 0, textAlign: "left", padding: 7, borderRadius: 14,
        display: "flex", flexDirection: "column", gap: 8, position: "relative",
        ["--wash" as string]: tint(accent, 0.4),
        ...style,
      }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "140 / 72", borderRadius: 9, overflow: "hidden", border: `1px solid ${T.line}`, background: tint(accent, 0.08) }}>
        <GamePoster id={id} accent={accent} />
      </div>
      <div style={{ padding: "0 3px 3px" }}>
        <div className="geo-display" style={{ color: T.text, fontWeight: 700, fontSize: 13, lineHeight: 1.14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.28em" }}>{title}</div>
        <div style={{ color: T.muted, fontSize: 10, marginTop: 2, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>
      </div>
    </button>
  )
}

/* ── Hero card: image-led, primary actions ──────────────────────────────── */
export function HeroCard({ eyebrow, title, subtitle, accent, image, onClick, tall = false }:
  { eyebrow: string; title: ReactNode; subtitle: string; accent: string; image?: ReactNode; onClick: () => void; tall?: boolean }) {
  return (
    <button onClick={onClick} className="geo-tap"
      style={{
        width: "100%", textAlign: "left", borderRadius: 16, overflow: "hidden", position: "relative",
        border: `1px solid ${T.line}`, background: T.surface, minHeight: tall ? 150 : 96,
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}>
      {image}
      <div className="geo-grid-soft" style={{ position: "absolute", inset: 0, opacity: 0.5 }} />
      <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: accent }} />
      <div style={{ position: "relative", padding: "14px 16px" }}>
        <div className="geo-micro" style={{ fontSize: 9, color: accent, marginBottom: 4 }}>{eyebrow}</div>
        <div className="geo-display" style={{ color: T.text, fontWeight: 700, fontSize: tall ? 24 : 18, letterSpacing: "-0.02em", lineHeight: 1.05 }}>{title}</div>
        <div style={{ color: T.muted, fontSize: 12, marginTop: 3 }}>{subtitle}</div>
      </div>
    </button>
  )
}

/* ── Bottom tab bar ─────────────────────────────────────────────────────── */
const TAB_META: { key: TabKey; label: string; glyph: string; accent: string }[] = [
  { key: "today", label: "Today", glyph: "today", accent: T.warm },
  { key: "play",  label: "Play",  glyph: "play",  accent: ACCENT.play },
  { key: "codex", label: "Codex", glyph: "codex", accent: T.amber },
  { key: "you",   label: "You",   glyph: "you",   accent: T.cyan },
]

export function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <nav style={{
      position: "relative", zIndex: 60, flexShrink: 0,
      display: "grid", gridTemplateColumns: "repeat(4,1fr)",
      background: "rgba(251,244,228,0.94)",
      backdropFilter: "blur(14px)",
      borderTop: `1px solid ${T.line}`, paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {TAB_META.map(t => {
        const on = active === t.key
        return (
          <button key={t.key} onClick={() => onChange(t.key)} aria-label={t.label} aria-current={on ? "page" : undefined}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "11px 0 10px", minHeight: 54, position: "relative", background: "transparent" }}>
            <span style={{
              position: "absolute", top: 0, height: 2, width: 26, borderRadius: 2,
              background: on ? t.accent : "transparent", boxShadow: "none",
            }} />
            <span style={{ display: "flex", color: on ? t.accent : T.dim, opacity: on ? 1 : 0.8, transition: "all 0.15s" }}>
              <Glyph glyph={t.glyph} size={19} color={on ? t.accent : T.dim} />
            </span>
            <span className="geo-micro" style={{ fontSize: 9.5, color: on ? t.accent : T.dim }}>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
