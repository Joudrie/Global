// Gauntlet records: each region's best run, kept for good.
//
// globalio_gauntlet_best holds { region: { best, completed, firstCompleted } }:
//   best            the most flags survived in one run (a run that ends on a
//                   wrong answer, or one left part-way, still counts)
//   completed       every flag in the region named without a mistake
//   firstCompleted  when that first happened (ms), or null
// Regions are "world" and the region names in lower case ("middle-east").
// Two devices combine with the "gauntlet" rule in utils/mergeProgress.ts:
// the higher best, passed on either, the earlier first pass.
// Pure apart from loadGauntlet/saveGauntlet, so Node tests can import it.

export const GAUNTLET_KEY = "globalio_gauntlet_best"

export interface GauntletRecord { best: number; completed: boolean; firstCompleted: number | null }
export type GauntletBests = Record<string, GauntletRecord>

/** "Middle East" → "middle-east". */
export const gauntletRegionKey = (label: string) => label.trim().toLowerCase().replace(/\s+/g, "-")

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)
const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0)

/** The records in a stored value. Anything that doesn't parse counts as nothing. */
export function readGauntlet(text: string | null | undefined): GauntletBests {
  const out: GauntletBests = {}
  let raw: unknown
  try { raw = JSON.parse(text ?? "null") } catch { return out }
  if (!isObj(raw)) return out
  for (const [region, r] of Object.entries(raw)) {
    if (!isObj(r) || region === "__proto__") continue
    const t = count(r.firstCompleted)
    out[region] = { best: count(r.best), completed: r.completed === true, firstCompleted: t || null }
  }
  return out
}

/** The records after a run in `region` that survived `survived` of `total` flags. */
export function recordRun(all: GauntletBests, region: string, survived: number, total: number, now: number): GauntletBests {
  const prev = all[region] ?? { best: 0, completed: false, firstCompleted: null }
  const passed = total > 0 && survived >= total
  const next: GauntletRecord = {
    best: Math.max(prev.best, count(survived)),
    completed: prev.completed || passed,
    firstCompleted: prev.firstCompleted ?? (passed ? now : null),
  }
  if (next.best === prev.best && next.completed === prev.completed && next.firstCompleted === prev.firstCompleted && all[region]) return all
  return { ...all, [region]: next }
}

/** Regions passed at least once. */
export const passedRegions = (all: GauntletBests): string[] =>
  Object.entries(all).filter(([, r]) => r.completed).map(([k]) => k).sort()

/** Best as a share of the region's flags, 0–1 (a pass is always 1). */
export const bestShare = (r: GauntletRecord | undefined, total: number): number =>
  !r ? 0 : r.completed ? 1 : total > 0 ? Math.min(1, r.best / total) : 0

export function loadGauntlet(): GauntletBests {
  try { return readGauntlet(localStorage.getItem(GAUNTLET_KEY)) } catch { return {} }
}

export function saveGauntlet(all: GauntletBests): void {
  try { localStorage.setItem(GAUNTLET_KEY, JSON.stringify(all)) } catch { /* private mode: the run still plays */ }
}
