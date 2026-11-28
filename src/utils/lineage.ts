// Lineage: the rules the screen (src/components/LineageScreen.tsx) and the
// tests share. An old flag is shown; the player names the modern country it
// led to. Naming it from the oldest flag alone is worth the most; each newer
// flag revealed lowers the round's worth. Typing the country instead of
// picking it from four doubles the round, so the incentive is to learn the
// name. The best score is one number for the game, whichever way it was played.
import { COUNTRIES, judgeCountry } from "./countryNames"
import type { Verdict } from "./abroad"
import type { HistoricalFlag } from "../data/codex"

export type LineageMode = "choice" | "type"

/** Rounds in a game. */
export const ROUNDS = 6
/** A typed answer scores this many times a picked one. */
export const TYPE_MULTIPLIER = 2

/** What a choice answer is worth with `revealed` of `total` flags shown:
 *  1000 from the oldest flag alone, sliding to 150 once the whole chain shows. */
export function scoreFor(revealed: number, total: number): number {
  if (total <= 1) return 1000
  const shown = Math.min(Math.max(revealed, 1), total)
  const frac = (total - shown) / (total - 1) // 1 at the oldest, 0 once all shown
  return 150 + Math.round(frac * 850)
}

/** What a right answer is worth in this mode: typed scores double. */
export const roundWorth = (revealed: number, total: number, mode: LineageMode) =>
  scoreFor(revealed, total) * (mode === "type" ? TYPE_MULTIPLIER : 1)

/** The points a round earns: its worth when right, nothing when wrong. The
 *  mode is the one in use at the moment of answering. */
export const roundPoints = (revealed: number, total: number, mode: LineageMode, correct: boolean) =>
  correct ? roundWorth(revealed, total, mode) : 0

/** The flags a round shows, oldest first, ending on today's flag. Codex
 *  histories aren't all in year order, so sort rather than trust the order.
 *  Flags that only began after today's flag was adopted (a breakaway state, a
 *  wartime occupation) aren't on the way to it, so they're left out, as are
 *  entries with no picture (Sudan's Makuria). One entry per picture (a repeat
 *  would waste a reveal); past `max`, the oldest flag and the newest `max - 1`. */
export function lineageChain(history: HistoricalFlag[], max = 6): HistoricalFlag[] {
  const current = history.filter(h => h.toYear === null).map(h => h.fromYear)
  const since = current.length ? Math.max(...current) : Infinity
  const sorted = history.filter(h => h.flagUrl && h.fromYear <= since)
    .sort((a, b) => a.fromYear - b.fromYear || (a.toYear ?? Infinity) - (b.toYear ?? Infinity))
  const seen = new Set<string>()
  const unique: HistoricalFlag[] = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (seen.has(sorted[i].flagUrl)) continue
    seen.add(sorted[i].flagUrl)
    unique.unshift(sorted[i])
  }
  return unique.length > max ? [unique[0], ...unique.slice(-(max - 1))] : unique
}

/** The most a game can score: every round typed from the oldest flag. */
export const MAX_SCORE = ROUNDS * 1000 * TYPE_MULTIPLIER

/** Judge a typed country: case, accents, punctuation and other names
 *  ("USA", "Czechia", "Ivory Coast") are fine, and so are small slips scaled
 *  to the name's length, but never another country's name ("Austria" is not
 *  Australia, "Niger" is not Nigeria). A name that fits two countries
 *  ("Congo", "Korea") is `vague`. `code` is the country's ISO code in FLAGS. */
export function judgeLineage(code: string, typed: string): Verdict {
  const c = COUNTRIES[code]
  if (!c) return { correct: false, misspelt: false, near: false }
  return judgeCountry(c, typed, "")
}

/** The answer box: nothing in it may mention a name, or iOS offers contacts. */
export const LINEAGE_FIELD = {
  id: "lineage-guess",
  placeholder: "Modern country in English",
  label: "The modern country in English",
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "words",
  spellCheck: false,
  enterKeyHint: "go",
} as const

// ── Saved on this device ──────────────────────────────────────────────────
// globalio_lineage_prefs: { mode } last chosen (mergeProgress: this device's).
// globalio_lineage_best: the best score, one number for both modes (the higher).
export const PREFS_KEY = "globalio_lineage_prefs"
export const BEST_KEY = "globalio_lineage_best"

type Store = Pick<Storage, "getItem" | "setItem">
const storage = (): Store | null => { try { return typeof localStorage === "undefined" ? null : localStorage } catch { return null } }

export function loadMode(store: Store | null = storage()): LineageMode {
  try {
    const p = JSON.parse(store?.getItem(PREFS_KEY) ?? "null") as { mode?: unknown } | null
    return p?.mode === "type" ? "type" : "choice"
  } catch { return "choice" }
}
export function saveMode(mode: LineageMode, store: Store | null = storage()) {
  try { store?.setItem(PREFS_KEY, JSON.stringify({ mode })) } catch { /* not saved */ }
}

export function loadBest(store: Store | null = storage()): number {
  try { const n = Number(store?.getItem(BEST_KEY)); return Number.isFinite(n) && n > 0 ? n : 0 } catch { return 0 }
}
/** Record a finished game's score: returns the best after it, and whether it beat the one before. */
export function recordScore(score: number, store: Store | null = storage()): { best: number; beat: boolean } {
  const prev = loadBest(store)
  if (score > prev) {
    try { store?.setItem(BEST_KEY, String(score)) } catch { /* not saved */ }
    return { best: score, beat: prev > 0 }
  }
  return { best: prev, beat: false }
}
