// Accounts: an optional sign-in that keeps a player's progress the same on
// every device they play on.
//
// This file is in the first-load bundle, so it stays tiny and imports nothing.
// The Supabase client and the sync engine (src/account/) load only when the
// player opens the account card, or when a signed-in player starts the app.

/** Switch accounts on for everyone. Until then the account card only shows on
 *  a device that has opened the site with ?accounts=1 (it remembers; ?accounts=0
 *  forgets), so they can be tried on globalio.app and the test site. */
export const ACCOUNTS_LIVE = false

export const SUPABASE_URL = "https://usksolhvjjpesshorxiv.supabase.co"

/** The project's PUBLISHABLE key: Supabase → Project Settings → API Keys →
 *  "Publishable key" (starts with sb_publishable_). It is meant to be public;
 *  row level security keeps each player's data to themselves. Never put the
 *  secret or service_role key here, or anywhere in this repo.
 *  Empty = sign-in isn't available yet: the account card says so and nothing
 *  else changes. */
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lNr6wne3XmTURc5MBVKJyw_TLNfiVhU"

/** localStorage keys that belong to the account on this device (the sign-in
 *  session, sync bookkeeping, the ?accounts=1 preview). They are never synced
 *  or put in a backup, and a restore leaves them alone. */
export const ACCOUNT_KEY_PREFIX = "globalio_account"
export const isAccountKey = (key: string) => key.startsWith(ACCOUNT_KEY_PREFIX)
/** Where the Supabase client keeps the session. */
export const SESSION_KEY = "globalio_account_session"
const PREVIEW_KEY = "globalio_account_preview"

export const accountsConfigured = (key: string = SUPABASE_PUBLISHABLE_KEY) => key.trim() !== ""

/** Whether to show the account card on this device. */
export function accountsVisible(): boolean {
  if (ACCOUNTS_LIVE) return true
  try {
    const flag = new URLSearchParams(window.location.search).get("accounts")
    if (flag === "1") localStorage.setItem(PREVIEW_KEY, "1")
    if (flag === "0") localStorage.removeItem(PREVIEW_KEY)
    return localStorage.getItem(PREVIEW_KEY) === "1"
  } catch { return false }
}

export function hasStoredSession(): boolean {
  try { return localStorage.getItem(SESSION_KEY) != null } catch { return false }
}

/** The page was opened from a sign-in (a Google redirect or an email link):
 *  the result is in the address, after #. Read once, at load, before the
 *  Supabase client tidies the address. */
export const SIGN_IN_RETURN: boolean = (() => {
  try { return /(^#|&)(access_token|error_description|error_code)=/.test(window.location.hash) } catch { return false }
})()

/** Why a sign-in that came back failed (an expired or already-used email
 *  link, a cancelled Google sign-in), in words for the player; or null. */
export const SIGN_IN_ERROR: string | null = (() => {
  try {
    if (!SIGN_IN_RETURN) return null
    const p = new URLSearchParams(window.location.hash.slice(1))
    const code = p.get("error_code") ?? "", error = p.get("error") ?? ""
    if (!code && !error && !p.get("error_description")) return null
    if (code === "otp_expired") return "That sign-in link has expired or was already used. Ask for a new one."
    if (error === "access_denied") return "Sign-in was cancelled or didn’t finish. Try again."
    return "Sign-in didn’t work. Try again."
  } catch { return null }
})()

type Service = typeof import("./account/service")
let service: Promise<Service> | null = null

/** Load the account service (and with it the Supabase client) once. A failed
 *  load (a connection blip) can be tried again. */
export function loadAccountService(): Promise<Service> {
  if (!accountsConfigured()) return Promise.reject(new Error("Accounts are not configured"))
  service ??= import("./account/service").then(async m => { await m.start(); return m })
  service.catch(() => { service = null })
  return service
}

/** At app start: if this device is signed in, or just came back from signing
 *  in, start syncing in the background. Does nothing (and loads nothing) for
 *  everyone else. */
export function startAccountSync(): boolean {
  if (!accountsConfigured() || !(hasStoredSession() || SIGN_IN_RETURN)) return false
  loadAccountService().catch(() => { /* offline: the next start tries again */ })
  return true
}
