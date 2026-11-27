// Profile links: globalio.app/?u=<username> opens that player's profile (on
// the test site too: the page's own path is kept, so /Global/?u=… works).
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
