// A game's best record when it keeps more than one number, stored as
// { field: number } under globalio_<game>_best (The Peel: { streak, points }).
// The "max" rule in utils/mergeProgress.ts combines two devices field by
// field, keeping the higher of each. Pure apart from load/save.

export type BestRecord = Record<string, number>

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0)

/** The record in a stored value, with every field in `fields` (0 when missing). */
export function readRecord(text: string | null | undefined, fields: string[]): BestRecord {
  let raw: unknown
  try { raw = JSON.parse(text ?? "null") } catch { raw = null }
  const o = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
  return Object.fromEntries(fields.map(f => [f, num(o[f])]))
}

/** The record after a run: each field the higher of the two, and which fields went up. */
export function raiseRecord(prev: BestRecord, run: BestRecord): { next: BestRecord; raised: string[] } {
  const next: BestRecord = { ...prev }
  const raised: string[] = []
  for (const [f, v] of Object.entries(run)) {
    if (num(v) > num(prev[f])) { next[f] = v; raised.push(f) }
  }
  return { next, raised }
}

export function loadRecord(key: string, fields: string[]): BestRecord {
  try { return readRecord(localStorage.getItem(key), fields) } catch { return readRecord(null, fields) }
}

export function saveRecord(key: string, rec: BestRecord): void {
  try { localStorage.setItem(key, JSON.stringify(rec)) } catch { /* private mode: the game still plays */ }
}
