import type { HistoricalFlag } from "../data/codex"

// Flag Timeline's answer key. Most Codex histories run newest first, but not
// all of them, so sort by year rather than trusting the order.

/** A country's flags oldest first, one per image, keeping the newest `max`. */
export function timelineFlags(history: HistoricalFlag[], max = 5): HistoricalFlag[] {
  const sorted = [...history].sort((a, b) =>
    a.fromYear - b.fromYear || (a.toYear ?? Infinity) - (b.toYear ?? Infinity))
  // Two entries with the same picture can't be told apart: keep the later one.
  const seen = new Set<string>()
  const unique: HistoricalFlag[] = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (seen.has(sorted[i].flagUrl)) continue
    seen.add(sorted[i].flagUrl)
    unique.unshift(sorted[i])
  }
  return unique.slice(-max)
}

/** Slots holding a flag from the right year. Flags adopted in the same year can go either way round. */
export function timelineScore(chrono: HistoricalFlag[], placed: HistoricalFlag[]): number {
  return placed.filter((h, pos) => chrono[pos] !== undefined && h.fromYear === chrono[pos].fromYear).length
}
