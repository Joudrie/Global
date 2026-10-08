import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react"
import { X, Timer, TrendingDown, Scissors, Star, Plus, Shield, Rows3, Columns3, Hourglass, Anchor } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { T, FONT, tint } from "../ui/tokens"
import { LineIcon } from "./icons"

/* Shared chrome for game screens: header stat pill, action buttons, the result
   layout and the flag-load failure panel. It lives apart from ui.tsx so the
   home screen's first-load bundle doesn't carry it; every game screen is
   code-split and pulls this in on demand. ScreenHeader stays in ui.tsx. */

/* ── Line icons only games use (the rest come from LineIcon's map). ──────── */
const GAME_ICONS: Record<string, LucideIcon> = {
  x: X, timer: Timer, hourglass: Hourglass, "trending-down": TrendingDown, scissors: Scissors,
  star: Star, plus: Plus, shield: Shield, rows: Rows3, columns: Columns3, anchor: Anchor,
}

export function GameIcon({ name, size = 21, strokeWidth = 1.6, color = "currentColor" }:
  { name: string; size?: number; strokeWidth?: number; color?: string }) {
  const Icon = GAME_ICONS[name]
  if (!Icon) return <LineIcon name={name} size={size} strokeWidth={strokeWidth} color={color} />
  return <Icon size={size} strokeWidth={strokeWidth} color={color} absoluteStrokeWidth />
}

/* ── The one pill for a ScreenHeader's right slot: round counter, score,
   streak. Same mono type and tinted pill in every game. ───────────────── */
export function HeaderStat({ children, label, accent = T.muted }:
  { children: ReactNode; label?: string; accent?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "baseline", gap: 4, flexShrink: 0, whiteSpace: "nowrap",
      fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 14, color: accent,
      padding: "4px 12px", borderRadius: 999, background: tint(accent, 0.1), border: `1px solid ${tint(accent, 0.3)}`,
    }}>
      {label && <span style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>{label}</span>}
      {children}
    </span>
  )
}

/* ── Action buttons: the main call to action in every game (Next, Submit,
   Play again…). Fixed 52px height, one radius, token colours, and the only
   press feedback is a slight scale (skipped under reduced motion). ────── */
export const BUTTON_RADIUS = 12
const BUTTON_PRESS = "transition-transform duration-100 motion-reduce:transition-none motion-safe:enabled:active:scale-[0.97]"
type ActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> & { accent?: string; style?: CSSProperties }

export function PrimaryButton({ accent = T.text, disabled, className = "", style, type = "button", children, ...rest }: ActionButtonProps) {
  return (
    <button type={type} disabled={disabled} className={`${BUTTON_PRESS} ${className}`} {...rest}
      style={{
        height: 52, width: "100%", padding: "0 20px", borderRadius: BUTTON_RADIUS, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        fontFamily: FONT.display, fontWeight: 700, fontSize: 16,
        background: disabled ? T.surfaceHi : accent, color: disabled ? T.dim : T.onAccent,
        border: `1px solid ${disabled ? T.line : accent}`, cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}>
      {children}
    </button>
  )
}

export function SecondaryButton({ disabled, className = "", style, type = "button", children, ...rest }: Omit<ActionButtonProps, "accent">) {
  return (
    <button type={type} disabled={disabled} className={`${BUTTON_PRESS} ${className}`} {...rest}
      style={{
        height: 52, width: "100%", padding: "0 20px", borderRadius: BUTTON_RADIUS, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        fontWeight: 600, fontSize: 15,
        background: T.surface, color: disabled ? T.dim : T.text,
        border: `1px solid ${T.line}`, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1,
        ...style,
      }}>
      {children}
    </button>
  )
}

/* ── Result screens: one header for every game's end screen. A line icon in
   a small tinted circle, an optional eyebrow, the title and a score line. ── */
export function ResultHeader({ icon, title, eyebrow, score, accent = T.amber, titleId }:
  { icon: string; title: ReactNode; eyebrow?: ReactNode; score?: ReactNode; accent?: string; titleId?: string }) {
  return (
    <div data-result-header style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8 }}>
      <span aria-hidden style={{
        width: 40, height: 40, borderRadius: 999, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: tint(accent, 0.14), border: `1px solid ${tint(accent, 0.3)}`,
      }}><GameIcon name={icon} size={20} color={accent} /></span>
      {eyebrow && <div className="geo-micro" style={{ fontSize: 11, color: accent }}>{eyebrow}</div>}
      <h2 id={titleId} className="geo-display" style={{ color: T.text, fontWeight: 700, fontSize: 22, lineHeight: 1.2, letterSpacing: "-0.01em", margin: 0 }}>{title}</h2>
      {score && <div style={{ color: T.muted, fontSize: 14, lineHeight: 1.4, fontVariantNumeric: "tabular-nums" }}>{score}</div>}
    </div>
  )
}

/* ── Big-number row under a ResultHeader (score, streak, best). ─────────── */
export function ResultStats({ stats }: { stats: { label: string; value: ReactNode; accent?: string }[] }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 32 }}>
      {stats.map(s => (
        <div key={s.label} style={{ textAlign: "center" }}>
          <div style={{ fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: 28, lineHeight: 1.1, color: s.accent ?? T.text }}>{s.value}</div>
          <div className="geo-micro" style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}

/* ── Round-by-round marks under a result (right / wrong per round). ─────── */
export function ResultDots({ results }: { results: boolean[] }) {
  return (
    <div role="img" aria-label={`${results.filter(Boolean).length} of ${results.length} right`}
      style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 4 }}>
      {results.map((ok, i) => (
        <span key={i} style={{ width: 12, height: 12, borderRadius: 3, background: ok ? T.green : T.danger }} />
      ))}
    </div>
  )
}

/* ── The card a result screen's header and stats sit in. ────────────────── */
export function ResultCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ borderRadius: 16, padding: 24, background: T.surface, border: `1px solid ${T.line}`, display: "flex", flexDirection: "column", gap: 16, ...style }}>
      {children}
    </div>
  )
}

/* ── Flag load failure: games re-roll a round whose flag image fails to load
   (so no round is unwinnable). After MAX_FLAG_RETRIES failures in a row they
   show this panel instead of a blank flag. ─────────────────────────────── */
export const MAX_FLAG_RETRIES = 5

export function FlagLoadFailed({ onRetry, onBack, accent = T.green }:
  { onRetry: () => void; onBack: () => void; accent?: string }) {
  return (
    <div role="alert" className="w-full max-w-sm" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ padding: 20, borderRadius: 16, background: T.surface, border: `1px solid ${T.line}`, textAlign: "center" }}>
        <div className="geo-display" style={{ fontWeight: 700, fontSize: 17, color: T.text }}>Couldn't load flags</div>
        <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>
          The flag images didn't load. Check your connection and try again.
        </p>
      </div>
      <PrimaryButton onClick={onRetry} accent={accent}>Try again</PrimaryButton>
      <SecondaryButton onClick={onBack}>Home</SecondaryButton>
    </div>
  )
}
