// Profile links: globalio.app/?u=<username> opens that player's profile (on
// the test site too: the page's own path is kept, so /Global/?u=… works), and
// ?demo=1 opens the You tab on the sample profile "Bob" (./demo.ts), which is
// labelled, read-only and never stored. This file is in the first-load bundle.
import { USERNAME_RE } from "./text"

/** The username in a page address's query (?u=…), or null when there isn't a
 *  valid one. Case is kept as typed; usernames match case-insensitively. */
export function profileLinkUser(search: string): string | null {
  try {
    const u = new URLSearchParams(search).get("u")?.trim().replace(/^@/, "") ?? ""
    return USERNAME_RE.test(u) && /[A-Za-z0-9]/.test(u) ? u : null
  } catch { return null }
}

/** The link to share for a username, from this page's own address. */
export function profileLink(username: string, origin: string, pathname: string): string {
  return `${origin}${pathname || "/"}?u=${encodeURIComponent(username)}`
}

/** ?demo=1 in an address. */
export function demoParam(search: string): boolean {
  try { return new URLSearchParams(search).get("demo") === "1" } catch { return false }
}

/** This page was opened with ?demo=1 (never remembered). */
export function demoOn(): boolean {
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
