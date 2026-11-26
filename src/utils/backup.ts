// Progress backup — no backend, so the code IS the backup. We serialise every
// localStorage key (streaks, scores, learned flags, settings, Supporter status)
// into one portable string the player can save and paste into "Restore" on any
// device. Guards against pasting unrelated text with a version marker.
//
// Restoring either combines the backup with this device (utils/mergeProgress.ts
// keeps the best of both) or replaces this device's progress with it.
//
// The account's own keys (the sign-in session; see src/accounts.ts) are never
// put in a backup, and a restore leaves them as they are.
import { MAIN_KEY, mergeSnapshots } from "./mergeProgress"
import type { Snapshot } from "./mergeProgress"
import { isAccountKey } from "../accounts"

const MARK = "GLOBALIO1:"

function readStorage(keep: (key: string) => boolean): Snapshot {
  const data: Snapshot = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k != null && keep(k)) data[k] = localStorage.getItem(k) ?? ""
  }
  return data
}

/** Everything this site keeps on this device, except the account's keys. */
export function snapshot(): Snapshot {
  return readStorage(k => !isAccountKey(k))
}

/** The game's own keys: what account sync sends. Other scripts' storage (ads,
 *  consent) stays on the device. */
export const isGameKey = (k: string) => (k === MAIN_KEY || k.startsWith("globalio_")) && !isAccountKey(k)
export function gameSnapshot(): Snapshot {
  return readStorage(isGameKey)
}

// Tell the open app its saved state changed, so it re-reads it instead of
// writing its old copy back over the new one.
function notifyApp() {
  try { window.dispatchEvent(new StorageEvent("storage", { key: null })) } catch { /* not a browser */ }
}

export function exportProgress(): string {
  // UTF-8 safe base64 (btoa chokes on multi-byte chars otherwise).
  return MARK + btoa(unescape(encodeURIComponent(JSON.stringify(snapshot()))))
}

// A backup is a plain object of string values that includes the main save.
// Anything else (an array, a number, some other app's JSON) is not one.
function isBackup(data: unknown): data is Snapshot {
  if (Object.prototype.toString.call(data) !== "[object Object]") return false
  const entries = Object.entries(data as object)
  return entries.every(([, v]) => typeof v === "string") && entries.some(([k]) => k === MAIN_KEY)
}

/** The save inside a backup code (pasted, or read from a backup file), or
 *  null when it isn't a valid Globalio backup. Touches nothing. */
export function readBackup(code: string): Snapshot | null {
  // Whitespace never belongs in a code; a line-wrapped paste (an email, a
  // notes app) still restores.
  const compact = (typeof code === "string" ? code : "").replace(/\s+/g, "")
  if (!compact.startsWith(MARK)) return null
  let data: unknown
  try {
    data = JSON.parse(decodeURIComponent(escape(atob(compact.slice(MARK.length)))))
  } catch {
    return null
  }
  return isBackup(data) ? data : null
}

// Write `next` as the whole of localStorage. If storage fills up or is blocked
// part-way through, put `before` back so nothing is half-written.
function writeAll(next: Snapshot, before: Snapshot): boolean {
  // The account's keys stay as they are (a backup never holds them).
  let account: Snapshot
  try { account = readStorage(isAccountKey) } catch { return false }
  const write = (save: Snapshot) => {
    // A restore must fully *replace* local state — otherwise stale keys not in
    // `next` survive and mix in. (A combined save already holds every key.)
    localStorage.clear()
    Object.entries(account).forEach(([k, v]) => localStorage.setItem(k, v))
    Object.entries(save).forEach(([k, v]) => { if (!isAccountKey(k)) localStorage.setItem(k, v) })
  }
  try {
    write(next)
    return true
  } catch {
    try { write(before) } catch { /* ignore */ }
    return false
  }
}

export type RestoreMode = "combine" | "replace"
export interface RestoreResult { before: Snapshot; after: Snapshot }

/** Combine a backup with this device, or replace this device with it.
 *  Null when it couldn't be saved; this device's progress is then unchanged. */
export function restoreBackup(backup: Snapshot, mode: RestoreMode): RestoreResult | null {
  // Check everything before clearing anything: a bad backup must never wipe
  // the progress already on this device.
  if (!isBackup(backup)) return null
  let before: Snapshot
  try { before = snapshot() } catch { return null }
  const after = mode === "combine" ? mergeSnapshots(before, backup) : { ...backup }
  if (!writeAll(after, before)) return null
  notifyApp()
  return { before, after }
}

/** Account sync: combine the account's save into this device, writing only the
 *  keys that change (nothing is cleared, so a game open right now never sees
 *  its save vanish). Returns this device's game save after the merge, or null
 *  when it couldn't be written; this device is then unchanged. */
export function mergeIntoDevice(incoming: Snapshot): Snapshot | null {
  let before: Snapshot
  try { before = gameSnapshot() } catch { return null }
  const clean: Snapshot = {}
  if (Object.prototype.toString.call(incoming) === "[object Object]") {
    for (const [k, v] of Object.entries(incoming)) if (isGameKey(k) && typeof v === "string") clean[k] = v
  }
  const after = mergeSnapshots(before, clean)
  const changed = Object.keys(after).filter(k => after[k] !== before[k])
  if (!changed.length) return after
  try {
    changed.forEach(k => localStorage.setItem(k, after[k]))
  } catch {
    try { changed.forEach(k => (Object.hasOwn(before, k) ? localStorage.setItem(k, before[k]) : localStorage.removeItem(k))) } catch { /* ignore */ }
    return null
  }
  notifyApp()
  return after
}

/** Replace this device's progress with a backup code. */
export function importProgress(code: string): boolean {
  const data = readBackup(code)
  return data != null && restoreBackup(data, "replace") != null
}
