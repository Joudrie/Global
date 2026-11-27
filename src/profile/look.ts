// Profile layouts on trial: ?look=a, ?look=b or ?look=c shows the profile in
// one of three compact layouts (src/components/ProfileLooks.tsx), for your own
// profile and other players' alike, and tidies the rest of the You tab. The
// device remembers the choice (?look=0 forgets it). With no look chosen the
// profile stays as it is, so nothing changes for players until one is picked.
//
// ?demo=1 (only with a look chosen) shows a sample profile, "Bob", at the top
// of the You tab so the layouts can be judged with a full profile. It is never
// saved: see src/profile/demo.ts.
//
// This file is in the first-load bundle, so it stays tiny and imports nothing.

export type Look = "a" | "b" | "c"
export const LOOKS: readonly Look[] = ["a", "b", "c"]
/** This device's chosen layout. Merge rule "device" (src/utils/mergeProgress.ts). */
export const LOOK_KEY = "globalio_profile_look"

export const LOOK_NAMES: Record<Look, string> = { a: "His sketch", b: "Tabs", c: "Grid" }

const isLook = (v: unknown): v is Look => typeof v === "string" && (LOOKS as readonly string[]).includes(v)

/** What an address asks for: a look, "forget" (?look=0), or null (nothing). */
export function lookParam(search: string): Look | "forget" | null {
  try {
    const v = new URLSearchParams(search).get("look")?.trim().toLowerCase()
    if (v == null || v === "") return null
    if (v === "0" || v === "off" || v === "none") return "forget"
    return isLook(v) ? v : null
  } catch { return null }
}

/** The layout this device shows: from ?look= (and remembered), else the
 *  remembered one, else null (the current profile). */
export function profileLook(): Look | null {
  try {
    const asked = lookParam(window.location.search)
    if (asked === "forget") { localStorage.removeItem(LOOK_KEY); return null }
    if (asked) { localStorage.setItem(LOOK_KEY, asked); return asked }
    const kept = localStorage.getItem(LOOK_KEY)
    return isLook(kept) ? kept : null
  } catch { return null }
}

/** ?demo=1 in an address. */
export function demoParam(search: string): boolean {
  try { return new URLSearchParams(search).get("demo") === "1" } catch { return false }
}

/** Show the sample profile: only with a look chosen, never remembered. */
export function demoOn(look: Look | null): boolean {
  if (!look) return false
  try { return demoParam(window.location.search) } catch { return false }
}

/** Leave the sample profile: drop ?demo from the address (nothing is stored). */
export function leaveDemo(): void {
  try {
    const p = new URLSearchParams(window.location.search)
    p.delete("demo")
    const q = p.toString()
    window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash}`)
  } catch { /* the address stays; nothing else changes */ }
}

/** Switch this device to another layout (null: back to the current profile),
 *  keeping a ?look= in the address in step so a reload shows the same. */
export function setLook(look: Look | null): void {
  try { if (look) localStorage.setItem(LOOK_KEY, look); else localStorage.removeItem(LOOK_KEY) } catch { /* storage blocked: this visit only */ }
  try {
    const p = new URLSearchParams(window.location.search)
    if (!p.has("look") && !(look === null && p.has("demo"))) return
    if (look) p.set("look", look); else { p.delete("look"); p.delete("demo") }
    const q = p.toString()
    window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash}`)
  } catch { /* the address stays */ }
}
