// The account service: the Supabase client, sign-in, and the sync engine wired
// to this page. Loaded on demand (src/accounts.ts → loadAccountService), so
// players who never open the account card never download it.
import { createClient } from "@supabase/supabase-js"
import type { Session, SupabaseClient } from "@supabase/supabase-js"
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SESSION_KEY, ACCOUNT_KEY_PREFIX } from "../accounts"
import { SyncEngine, SyncError } from "./engine"
import type { Backend, SyncState, SyncStatus } from "./engine"
import { browserDevice as device } from "./device"
import type { Snapshot } from "../utils/mergeProgress"

export interface AccountView {
  /** The stored session has been checked. */
  ready: boolean
  email: string | null
  signedIn: boolean
  status: SyncStatus
  lastSynced: number | null
  supporter: boolean
  badge: string | null
}

const META_KEY = `${ACCOUNT_KEY_PREFIX}_meta` // { uid, badge, supporter, lastSynced }: shown before the first sync
const TICK_MS = 2000

let client: SupabaseClient | null = null
let engine: SyncEngine | null = null
let uid: string | null = null
let view: AccountView = { ready: false, email: null, signedIn: false, status: "idle", lastSynced: null, supporter: false, badge: null }
const listeners = new Set<() => void>()

function publish(patch: Partial<AccountView>) {
  view = { ...view, ...patch }
  listeners.forEach(fn => fn())
}

export const getView = () => view
export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

// ── This device ─────────────────────────────────────────────────────────────

interface Meta { uid: string; badge: string | null; supporter: boolean; lastSynced: number | null }
function readMeta(id: string): Partial<Meta> {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) ?? "null") as Meta | null
    return m && m.uid === id ? m : {}
  } catch { return {} }
}
function writeMeta(m: Meta | null) {
  try { if (m) localStorage.setItem(META_KEY, JSON.stringify(m)); else localStorage.removeItem(META_KEY) } catch { /* ignore */ }
}

// ── The account row ─────────────────────────────────────────────────────────

/** Turn a Supabase result into data, or throw: status 0 means no connection. */
function check<T>(res: { data: T; error: { message: string; code?: string } | null; status: number }): T {
  if (res.error) throw new SyncError(res.status === 0 || res.status >= 500 ? "offline" : "rejected", res.error.message)
  return res.data
}

/** The row's data as a save: only string values (anything else is ignored). */
function asSave(data: unknown): Snapshot {
  const out: Snapshot = {}
  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const [k, v] of Object.entries(data)) if (typeof v === "string") out[k] = v
  }
  return out
}

function backendFor(c: SupabaseClient, id: string): Backend {
  return {
    async pull() {
      const row = check(await c.from("progress").select("data, updated_at").eq("user_id", id).maybeSingle())
      return row ? { data: asSave(row.data), version: String(row.updated_at) } : null
    },
    async create(data) {
      const res = await c.from("progress").insert({ user_id: id, data }).select("updated_at").single()
      if (res.error?.code === "23505") return "conflict" // another device made the row first
      const row = check(res)
      if (!row) throw new SyncError("rejected", "The new row wasn’t returned")
      return String(row.updated_at)
    },
    async update(data, version) {
      // Only if nobody saved since `version` (the server sets updated_at on every write).
      const rows = check(await c.from("progress").update({ data }).eq("user_id", id).eq("updated_at", version).select("updated_at")) ?? []
      return rows.length ? String(rows[0].updated_at) : "conflict"
    },
    async entitlements() {
      const row = check(await c.from("entitlements").select("supporter, badge").eq("user_id", id).maybeSingle())
      return row ? { supporter: row.supporter === true, badge: typeof row.badge === "string" && row.badge.trim() ? row.badge : null } : null
    },
  }
}

// ── Wiring the engine to the page ───────────────────────────────────────────

let unwire: (() => void) | null = null

function wire(e: SyncEngine) {
  // A hidden tab can't be played, so it has nothing new to notice.
  const timer = window.setInterval(() => { if (document.visibilityState === "visible") e.tick() }, TICK_MS)
  const onVisibility = () => { if (document.visibilityState === "visible") void e.pull(); else void e.flush() }
  const onHide = () => { void e.flush() }
  const onOnline = () => e.retryNow()
  document.addEventListener("visibilitychange", onVisibility)
  window.addEventListener("pagehide", onHide)
  window.addEventListener("online", onOnline)
  unwire = () => {
    window.clearInterval(timer)
    document.removeEventListener("visibilitychange", onVisibility)
    window.removeEventListener("pagehide", onHide)
    window.removeEventListener("online", onOnline)
  }
}

function stopEngine() {
  engine?.stop(); engine = null
  unwire?.(); unwire = null
}

function applySession(session: Session | null) {
  const id = session?.user?.id ?? null
  if (!id) {
    stopEngine(); uid = null
    publish({ ready: true, signedIn: false, email: null, status: "idle", lastSynced: null, supporter: false, badge: null })
    return
  }
  publish({ ready: true, signedIn: true, email: session?.user?.email ?? null })
  if (id === uid && engine) return
  stopEngine()
  uid = id
  const meta = readMeta(id)
  const initial: Partial<SyncState> = { badge: meta.badge ?? null, supporter: !!meta.supporter, lastSynced: meta.lastSynced ?? null }
  publish({ ...initial, status: "syncing" })
  const e = new SyncEngine({
    backend: backendFor(client!, id),
    device,
    initial,
    onChange: s => {
      if (engine !== e) return
      publish({ status: s.status, lastSynced: s.lastSynced, supporter: s.supporter, badge: s.badge })
      writeMeta({ uid: id, badge: s.badge, supporter: s.supporter, lastSynced: s.lastSynced })
    },
  })
  engine = e
  wire(e)
  void e.start()
}

let started: Promise<void> | null = null

/** Create the client and pick up the stored session (or the one in the
 *  address after a sign-in). Safe to call more than once. */
export function start(): Promise<void> {
  started ??= new Promise<void>(resolve => {
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storageKey: SESSION_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // The session comes back in the address (#access_token=…), so an email
        // link works even when it opens in a different browser from the one
        // that asked for it (a mail app's own browser, another device).
        flowType: "implicit",
      },
    })
    client.auth.onAuthStateChange((event, session) => {
      // Supabase calls must not run inside this callback; defer them.
      setTimeout(() => {
        applySession(session)
        if (event === "INITIAL_SESSION") {
          // A failed sign-in leaves its error in the address; tidy it away (the
          // card has already read it, see SIGN_IN_ERROR).
          if (/(^#|&)error/.test(window.location.hash)) {
            try { window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search) } catch { /* ignore */ }
          }
          resolve()
        }
      }, 0)
    })
    // Checking a stored session can wait on the network; never hold sign-in up for long.
    setTimeout(resolve, 8000)
  })
  return started
}

// ── Sign-in and the account itself ──────────────────────────────────────────

/** Where sign-in comes back to: this page (globalio.app/ or the test site's /Global/). */
const here = () => window.location.origin + window.location.pathname

/** Supabase's error, in words for a player. `invalid` is what "invalid" means here. */
const friendly = (message: string | undefined, fallback: string, invalid = fallback) => {
  const m = (message ?? "").toLowerCase()
  if (m.includes("rate limit") || m.includes("security purposes") || m.includes("too many")) return "Too many tries. Wait a minute, then try again."
  if (m.includes("fetch") || m.includes("network")) return "Couldn’t reach the server. Check your connection and try again."
  if (m.includes("expired") || m.includes("invalid")) return invalid
  return fallback
}

let googleReady: boolean | null = null

/** Whether Google sign-in is switched on in the project (so the button never
 *  leads to an error page). */
async function googleEnabled(): Promise<boolean> {
  if (googleReady != null) return googleReady
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } })
    if (!res.ok) return true // can't tell: let Supabase answer
    const s = await res.json() as { external?: Record<string, boolean> }
    googleReady = s.external?.google === true
    return googleReady
  } catch { return true }
}

/** Off to Google; the page comes back here signed in. An error message, or null. */
export async function signInWithGoogle(): Promise<string | null> {
  await start()
  if (!(await googleEnabled())) return "Google sign-in isn’t set up yet. Use the email link instead."
  const { error } = await client!.auth.signInWithOAuth({ provider: "google", options: { redirectTo: here() } })
  return error ? friendly(error.message, "Couldn’t open Google sign-in. Try again.") : null
}

/** Email a sign-in link (and code). An error message, or null when sent. */
export async function sendSignInLink(email: string): Promise<string | null> {
  await start()
  const { error } = await client!.auth.signInWithOtp({ email, options: { emailRedirectTo: here(), shouldCreateUser: true } })
  return error ? friendly(error.message, "Couldn’t send the email. Try again in a minute.", "That email address doesn’t look right. Check it and try again.") : null
}

/** Sign in with the code from the email (for when the link opens in another browser). */
export async function verifyCode(email: string, code: string): Promise<string | null> {
  await start()
  const { error } = await client!.auth.verifyOtp({ email, token: code, type: "email" })
  return error ? friendly(error.message, "That code didn’t work. Check it, or ask for a new email.", "That code didn’t work or has expired. Check it, or ask for a new email.") : null
}

const within = (p: Promise<unknown>, ms: number) => Promise.race([p, new Promise(r => setTimeout(r, ms))])

/** Sign out on this device. Progress stays on the device. */
export async function signOut(): Promise<void> {
  await start()
  // Send the last few seconds of play first (briefly: never hold up signing out).
  if (engine) await within(engine.flush(), 4000)
  stopEngine()
  writeMeta(null)
  await client!.auth.signOut({ scope: "local" }).catch(() => undefined)
  applySession(null)
}

/** Delete the account and its saved progress. This device keeps its progress.
 *  An error message, or null when deleted. */
export async function deleteAccount(): Promise<string | null> {
  await start()
  stopEngine() // no more writes to an account that's going away
  const { error } = await client!.rpc("delete_account")
  if (error) {
    // Still signed in: carry on syncing.
    const { data } = await client!.auth.getSession()
    uid = null
    applySession(data.session)
    return friendly(error.message, "Couldn’t delete your account. Check your connection and try again.")
  }
  writeMeta(null)
  await client!.auth.signOut({ scope: "local" }).catch(() => undefined)
  applySession(null)
  return null
}
