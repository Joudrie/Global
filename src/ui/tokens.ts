// The one shipped look: "Modern Cartographer".

interface Palette {
  void: string; bg: string; surface: string; surfaceHi: string
  line: string; lineHi: string
  text: string; muted: string; dim: string
  onAccent: string // text colour to place on an accent-filled button
  amber: string; chartreuse: string; cyan: string; warm: string; gold: string; green: string
  violet: string // reserved accent — e.g. the UK constituent-nations drill-down
  danger: string // wrong answers / destructive actions
}

// "Modern Cartographer" — warm parchment paper, midnight-teal ink, muted
// watercolour accents (terracotta / sky blue / ochre).
const CARTOGRAPHER: Palette = {
  void: "#EFE3C8", bg: "#FBF4E4", surface: "#FFFCF4", surfaceHi: "#FCF6E7",
  line: "#DDCEAF", lineHi: "#C8B58C",
  text: "#1F3A3C", muted: "#5F726D", dim: "#7A6C56", onAccent: "#FFFCF4",
  amber: "#946620", chartreuse: "#C2735A" /* play=terracotta */, cyan: "#5C8CA8" /* learn=sky */,
  warm: "#A85440" /* challenge=clay */, gold: "#946620", green: "#5C8A6B",
  violet: "#7A5C86" /* muted plum, fits parchment */,
  danger: "#B4452F" /* rust */,
}

export const T: Palette = CARTOGRAPHER

export type AccentKey = "learn" | "play" | "codex" | "challenge" | "today" | "drill"

// Electric/watercolour accents reserved strictly for interaction & progress.
export const ACCENT: Record<AccentKey, string> = {
  learn: T.cyan,
  play: T.chartreuse,
  codex: T.amber,
  challenge: T.warm,
  today: T.amber,
  drill: T.green, // Quick Drills shelf — keeps it visually distinct from Daily Puzzles (both were ochre)
}

export const FONT = { display: "'Playfair Display', Georgia, serif", mono: "'Inter', system-ui, sans-serif" }

// translucent tint of an accent, for fills/borders
export const tint = (hex: string, alpha: number) => {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0")
  return `${hex}${a}`
}

// Connections group colours, easiest → hardest: ochre, sage, slate teal and
// muted plum. Flat watercolour tones from the parchment palette (not the
// newspaper's bright yellow/green/blue/purple); ink text reads at 6:1 or
// better on each.
export const GROUP_TONES = ["#E3C27A", "#AFC49A", "#A3BDC8", "#C4A6C0"] as const
export const GROUP_TONE_NAMES = ["ochre", "sage", "slate", "plum"] as const
