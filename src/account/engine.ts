// The account sync engine: keeps this device's save and the player's account
// row the same, without either side ever overwriting the other.
//
// It knows nothing about Supabase or the page. The service (./service.ts) hands
// it a Backend (the account row) and a Device (this browser's save), and calls
// tick() on an interval and pull()/flush() when the tab is shown or hidden.
// Tests drive it with a fake backend and an in-memory device.
//
// Rules:
// - Every write to the account is a merge: this device's save combined with the
//   last version read from the account (mergeSnapshots keeps the best of both).
// - A write names the version it was merged with, and is refused if another
//   device saved in between; the engine then reads the new version, merges
//   again and retries. So two devices converge instead of overwriting.
// - The account's progress is merged into this device the same way, so nothing
//   on this device is ever replaced by an older or emptier copy.
// - A failed request changes nothing; the engine retries quietly, later.
import { mergeSnapshots } from "../utils/mergeProgress"
import type { Snapshot } from "../utils/mergeProgress"

export interface RemoteSave { data: Snapshot; version: string }
export interface Entitlements { supporter: boolean; badge: string | null }

/** The player's account row. Methods throw a SyncError when the request fails. */
export interface Backend {
  pull(): Promise<RemoteSave | null>
  /** Create the row: its new version, or "conflict" if another device created it first. */
  create(data: Snapshot): Promise<string | "conflict">
  /** Replace the row if it is still at `version`: the new version, or "conflict". */
  update(data: Snapshot, version: string): Promise<string | "conflict">
  entitlements(): Promise<Entitlements | null>
}

/** This device's save. */
export interface Device {
  /** The game's saved keys (no account keys). */
  read(): Snapshot
  /** Merge `incoming` into this device's save and tell the app. The merged
   *  save, or null when it couldn't be written (storage full or blocked). */
  merge(incoming: Snapshot): Snapshot | null
  /** Turn Supporter (no ads) on for this device. */
  grantSupporter(): void
}

export class SyncError extends Error {
  /** offline: no connection. rejected: the server said no (too big, not allowed). */
  kind: "offline" | "rejected"
  constructor(kind: "offline" | "rejected", message: string) {
    super(message)
    this.kind = kind
  }
}

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error"

export interface SyncState {
  status: SyncStatus
  /** When this device and the account last matched (ms since epoch). */
  lastSynced: number | null
  supporter: boolean
  badge: string | null
}

type Cancel = () => void
export type Schedule = (fn: () => void, ms: number) => Cancel

export interface EngineOptions {
  backend: Backend
  device: Device
  /** setTimeout by default; tests pass a manual clock. */
  schedule?: Schedule
  now?: () => number
  /** Push this long after the save last changed… */
  debounceMs?: number
  /** …but never later than this after the first unsynced change. */
  maxWaitMs?: number
  /** Waits between retries after a failure (the last one repeats). */
  retryMs?: number[]
  onChange?: (state: SyncState) => void
  /** What this device remembered from last time (shown until the first sync). */
  initial?: Partial<SyncState>
}

const defaultSchedule: Schedule = (fn, ms) => { const t = setTimeout(fn, ms); return () => clearTimeout(t) }

/** A cheap fingerprint of a save (keys sorted), to notice changes on an interval. */
export function fingerprint(save: Snapshot): string {
  let h = 0x811c9dc5, n = 0
  for (const k of Object.keys(save).sort()) {
    const s = k + "\u0000" + save[k] + "\u0001"
    n += s.length
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  }
  return `${n}:${(h >>> 0).toString(36)}`
}

/** Two saves hold the same keys and values (key order doesn't matter). */
export function sameSave(a: Snapshot, b: Snapshot): boolean {
  const ka = Object.keys(a), kb = Object.keys(b)
  return ka.length === kb.length && ka.every(k => Object.hasOwn(b, k) && a[k] === b[k])
}

const MAX_ATTEMPTS = 5 // conflicts in a row before giving up until the next retry

export class SyncEngine {
  state: SyncState
  private o: Required<Omit<EngineOptions, "onChange" | "initial">> & Pick<EngineOptions, "onChange">
  private remote: RemoteSave | null = null // the account row as last read or written
  private synced: string | null = null // fingerprint of the save last known to match the account
  private pending: string | null = null // fingerprint waiting for a push
  private refused: string | null = null // fingerprint of a save the server refused (too big): not retried until it changes
  private firstPending = 0
  private debounce: Cancel | null = null
  private retry: Cancel | null = null
  private failures = 0
  private running: Promise<void> | null = null
  private queued: { full: boolean; entitlements: boolean } | null = null
  private stopped = false

  constructor(options: EngineOptions) {
    this.o = {
      schedule: defaultSchedule, now: () => Date.now(), debounceMs: 5000, maxWaitMs: 30000,
      retryMs: [5000, 15000, 30000, 60000, 120000], ...options,
    }
    this.state = { status: "idle", lastSynced: null, supporter: false, badge: null, ...options.initial }
  }

  private set(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch }
    this.o.onChange?.(this.state)
  }

  /** Sign-in and app start: read the account, merge both ways, check entitlements. */
  start(): Promise<void> { return this.run(true, true) }

  /** The tab came back: read the account and merge, in case another device played. */
  pull(): Promise<void> { return this.run(true, true) }

  /** Push now if this device has changes the account doesn't (tab hidden, page closing, sign-out). */
  flush(): Promise<void> {
    this.cancelDebounce()
    const fp = fingerprint(this.o.device.read())
    if ((this.remote && this.synced === fp) || fp === this.refused) return this.running ?? Promise.resolve()
    return this.run(false, false)
  }

  /** Called on an interval: notice a changed save and push it a few seconds later. */
  tick(): void {
    if (this.stopped || this.retry) return // a failed sync already has a retry waiting
    const fp = fingerprint(this.o.device.read())
    if (fp === this.synced) { this.pending = null; this.cancelDebounce(); return }
    if (fp === this.pending || fp === this.refused) return
    const now = this.o.now()
    if (this.pending == null) this.firstPending = now
    this.pending = fp
    this.cancelDebounce()
    const wait = Math.max(0, Math.min(this.o.debounceMs, this.firstPending + this.o.maxWaitMs - now))
    this.debounce = this.o.schedule(() => { this.debounce = null; void this.run(false, false) }, wait)
  }

  /** The connection is back: retry a failed sync now. */
  retryNow(): void {
    if (!this.retry) return
    this.retry(); this.retry = null
    void this.run(true, false)
  }

  stop(): void {
    this.stopped = true
    this.cancelDebounce()
    this.retry?.(); this.retry = null
    this.queued = null
  }

  private cancelDebounce() { this.debounce?.(); this.debounce = null }

  private run(full: boolean, entitlements: boolean): Promise<void> {
    if (this.stopped) return Promise.resolve()
    if (this.running) {
      // One sync at a time; whatever was asked for meanwhile runs once after it.
      this.queued = { full: full || !!this.queued?.full, entitlements: entitlements || !!this.queued?.entitlements }
      return this.running
    }
    this.running = this.sync(full, entitlements).finally(() => {
      this.running = null
      const next = this.queued
      this.queued = null
      if (next && !this.stopped) void this.run(next.full, next.entitlements)
    })
    return this.running
  }

  private async sync(full: boolean, entitlements: boolean): Promise<void> {
    const { backend, device } = this.o
    this.retry?.(); this.retry = null
    this.set({ status: "syncing" })
    try {
      let mustPull = full || !this.remote
      let done = false
      for (let attempt = 0; attempt < MAX_ATTEMPTS && !done; attempt++) {
        if (mustPull) {
          this.remote = await backend.pull()
          if (this.stopped) return
        }
        const base = this.remote?.data ?? {}
        // Merge the account into this device first, then send the result. If
        // this device's storage can't be written, still send the combined save
        // so the account never loses anything.
        const merged = device.merge(base) ?? mergeSnapshots(device.read(), base)
        if (this.remote && sameSave(merged, this.remote.data)) {
          this.synced = fingerprint(merged)
          done = true
          break
        }
        const version = this.remote ? await backend.update(merged, this.remote.version) : await backend.create(merged)
        if (this.stopped) return
        if (version === "conflict") { mustPull = true; continue } // another device saved first
        this.remote = { data: merged, version }
        this.synced = fingerprint(merged)
        done = true
      }
      if (!done) throw new SyncError("offline", "The account kept changing; trying again later")
      if (entitlements) {
        // Progress is already safe; if this read fails, keep what was known.
        const ent = await backend.entitlements().catch(() => undefined)
        if (this.stopped) return
        if (ent !== undefined) {
          if (ent?.supporter) device.grantSupporter()
          this.set({ supporter: !!ent?.supporter, badge: ent?.badge ?? null })
        }
      }
      this.failures = 0
      this.refused = null
      if (this.pending === this.synced) this.pending = null
      this.set({ status: "synced", lastSynced: this.o.now() })
      // The save changed while the request was out: push that too, soon.
      this.tick()
    } catch (err) {
      if (this.stopped) return
      const offline = !(err instanceof SyncError) || err.kind === "offline"
      this.set({ status: offline ? "offline" : "error" })
      this.pending = null
      this.cancelDebounce()
      if (!offline) {
        // The server said no (the save is too big, say). Sending the same save
        // again won't help: wait until it changes, or the tab is shown again.
        this.refused = fingerprint(device.read())
        return
      }
      const waits = this.o.retryMs
      const wait = waits[Math.min(this.failures, waits.length - 1)]
      this.failures++
      this.retry = this.o.schedule(() => { this.retry = null; void this.run(true, entitlements) }, wait)
    }
  }
}
