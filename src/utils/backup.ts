// Progress backup — no backend, so the code IS the backup. We serialise every
// localStorage key (streaks, scores, learned flags, settings, Supporter status)
// into one portable string the player can save and paste into "Restore" on any
// device. Guards against pasting unrelated text with a version marker.
const MARK = "GLOBALIO1:"
// The main save (see utils/storage.ts). Every real backup contains it.
const MAIN_KEY = "dailyglobe_v1"

function snapshot(): Record<string, string> {
  const data: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k != null) data[k] = localStorage.getItem(k) ?? ""
  }
  return data
}

export function exportProgress(): string {
  // UTF-8 safe base64 (btoa chokes on multi-byte chars otherwise).
  return MARK + btoa(unescape(encodeURIComponent(JSON.stringify(snapshot()))))
}

// A backup is a plain object of string values that includes the main save.
// Anything else (an array, a number, some other app's JSON) is not one.
function isBackup(data: unknown): data is Record<string, string> {
  if (Object.prototype.toString.call(data) !== "[object Object]") return false
  const entries = Object.entries(data as object)
  return entries.every(([, v]) => typeof v === "string") && entries.some(([k]) => k === MAIN_KEY)
}

export function importProgress(code: string): boolean {
  const trimmed = (code || "").trim()
  if (!trimmed.startsWith(MARK)) return false
  let data: unknown
  try {
    data = JSON.parse(decodeURIComponent(escape(atob(trimmed.slice(MARK.length)))))
  } catch {
    return false
  }
  // Check everything before clearing anything: a bad paste must never wipe
  // the progress already on this device.
  if (!isBackup(data)) return false
  let before: Record<string, string>
  try { before = snapshot() } catch { return false }
  try {
    // A backup is a full snapshot of localStorage, so a restore must fully
    // *replace* local state — otherwise stale keys not present in the backup
    // survive and merge into an inconsistent mix.
    localStorage.clear()
    Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v))
    return true
  } catch {
    // Storage full or blocked part-way through: put the old progress back.
    try {
      localStorage.clear()
      Object.entries(before).forEach(([k, v]) => localStorage.setItem(k, v))
    } catch { /* ignore */ }
    return false
  }
}
