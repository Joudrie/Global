// Creator preview: a small module on its own so Settings can switch it
// without loading the achievement list.
// A creator tool (Settings, behind ?creator): show every achievement as
// unlocked on this device, to look them all over. Display only: nothing is
// written to globalio_achievements, so the account, friends and the public
// profile keep the real unlocks, and switching it off puts everything back.
export const PREVIEW_ALL_KEY = "globalio_preview_all"

export function previewAll(): boolean {
  try { return localStorage.getItem(PREVIEW_ALL_KEY) === "1" } catch { return false }
}

export function setPreviewAll(on: boolean): void {
  try { if (on) localStorage.setItem(PREVIEW_ALL_KEY, "1"); else localStorage.removeItem(PREVIEW_ALL_KEY) } catch { /* storage blocked */ }
}
