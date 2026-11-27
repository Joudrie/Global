// Accounts: an optional sign-in that keeps a player's progress the same on
// every device they play on.
//
// This file is in the first-load bundle, so it stays tiny and imports nothing.
// The Supabase client and the sync engine (src/account/) load only when the
// player opens the account card, or when a signed-in player starts the app.

/** Switch accounts on for everyone. Until then the account card only shows on
 *  a device that has opened the site with ?accounts=1 (it remembers; ?accounts=0
 *  forgets), so they can be tried on globalio.app and the test site. */
export const ACCOUNTS_LIVE = true

export const SUPABASE_URL = "https://usksolhvjjpesshorxiv.supabase.co"

/** The project's PUBLISHABLE key: Supabase → Project Settings → API Keys →
 *  "Publishable key" (starts with sb_publishable_). It is meant to be public;
 *  row level security keeps each player's data to themselves. Never put the
 *  secret or service_role key here, or anywhere in this repo.
 *  Empty = sign-in isn't available yet: the account card says so and nothing
 *  else changes. */
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lNr6wne3XmTURc5MBVKJyw_TLNfiVhU"

/** The Google OAuth client ("Globalio web" in Google Cloud → Google Auth
 *  Platform → Clients). Public by design. Google's own sign-in button uses it
 *  in the page, so Google's screen names globalio.app (not the Supabase
 *  address) and no client secret is involved. Empty = only the redirect flow. */
/** Offer "Email me a sign-in link". On since 2026-11-27: the project sends
 *  through Resend (Supabase → Authentication → Emails → SMTP Settings) from
 *  noreply@globalio.app, verified for globalio.app. */
export const EMAIL_SIGNIN = true

/** Offer "Or enter the code from the email". Only works when the Supabase
 *  email templates (Magic Link and Confirm signup) include {{ .Token }}; the
 *  current ones carry just the link, so the box stays hidden. */
export const EMAIL_CODE = false

export const GOOGLE_CLIENT_ID = "321526074184-hae4hb7101k8l64958bb1ur04422628j.apps.googleusercontent.com"

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

/** Public profiles: usernames, "Find a player" and other players' profiles
 *  (a player's own profile, stats, achievements and card work without it).
 *  Off until the owner has run supabase/profiles-setup.sql. Until then they
 *  show only on a device that opened the site with ?profiles=1 (it remembers;
 *  ?profiles=0 forgets), the way accounts were tried before they went live. */
export const PROFILES_LIVE = true
const PROFILES_PREVIEW_KEY = "globalio_account_profiles_preview"

/** Whether to show the public parts of profiles on this device. */
export function profilesVisible(): boolean {
  if (!accountsConfigured()) return false
  if (PROFILES_LIVE) return true
  try {
    const flag = new URLSearchParams(window.location.search).get("profiles")
    if (flag === "1") localStorage.setItem(PROFILES_PREVIEW_KEY, "1")
    if (flag === "0") localStorage.removeItem(PROFILES_PREVIEW_KEY)
    return localStorage.getItem(PROFILES_PREVIEW_KEY) === "1"
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
    // Keep Supabase's reason (short) so a setup problem can be told apart.
    const why = (p.get("error_description") ?? "").replace(/\+/g, " ").slice(0, 90)
    return why ? `Sign-in didn’t work (${why}). Try again.` : "Sign-in didn’t work. Try again."
  } catch { return null }
})()

type Service = typeof import("./account/service")
let service: Promise<Service> | null = null
let loaded: Service | null = null
const onLoad = new Set<() => void>()

/** Load the account service (and with it the Supabase client) once. A failed
 *  load (a connection blip) can be tried again. */
export function loadAccountService(): Promise<Service> {
  if (!accountsConfigured()) return Promise.reject(new Error("Accounts are not configured"))
  service ??= import("./account/service").then(async m => {
    await m.start()
    loaded = m
    onLoad.forEach(fn => fn())
    return m
  })
  service.catch(() => { service = null })
  return service
}

/** The account service if it has loaded already (nothing is loaded by asking). */
export const loadedAccountService = () => loaded
/** Run `fn` once the account service has loaded (by anything on the page). */
export function onAccountServiceLoad(fn: () => void): () => void {
  onLoad.add(fn)
  return () => { onLoad.delete(fn) }
}

/** At app start: if this device is signed in, or just came back from signing
 *  in, start syncing in the background. Does nothing (and loads nothing) for
 *  everyone else. */
export function startAccountSync(): boolean {
  if (!accountsConfigured() || !(hasStoredSession() || SIGN_IN_RETURN)) return false
  loadAccountService().catch(() => { /* offline: the next start tries again */ })
  return true
}
