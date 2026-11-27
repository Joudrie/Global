import { useEffect, useReducer, useRef, useState } from "react"
import type { FormEvent, ReactNode, Ref } from "react"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { PrimaryButton, SecondaryButton } from "./gameUi"
import { LineIcon } from "./icons"
import { accountsConfigured, EMAIL_CODE, EMAIL_SIGNIN, GOOGLE_CLIENT_ID, hasStoredSession, loadAccountService, SIGN_IN_ERROR, SIGN_IN_RETURN } from "../accounts"
import type { AccountView } from "../account/service"

/* "Keep your progress on every device": sign in with Google or an emailed
   link, then see the sync status, sign out or delete the account. Shown in
   Settings → Your progress and on the You tab (only while accounts are visible,
   see src/accounts.ts). The Supabase client loads when a button here is used,
   or straight away if this device is already signed in. */

const ACC = ACCENT.learn
type Service = Awaited<ReturnType<typeof loadAccountService>>

const Title = ({ children }: { children: ReactNode }) => (
  <h3 className="geo-display" style={{ margin: 0, fontSize: 17, fontWeight: 700, lineHeight: 1.3, color: T.text }}>{children}</h3>
)
const Note = ({ children, color = T.muted }: { children: ReactNode; color?: string }) => (
  <p className="text-xs" style={{ margin: 0, lineHeight: 1.6, color }}>{children}</p>
)
const Alert = ({ text }: { text: string }) => text ? <div role="alert"><Note color={T.danger}>{text}</Note></div> : null

/* ── Google's own sign-in button ──────────────────────────────────────────
   Google Identity Services draws the button and signs the player in inside
   this page (a popup on phones), then hands back an ID token that Supabase
   checks. Google's screen therefore names globalio.app, not the Supabase
   address. A nonce ties the token to this sign-in: Google gets its SHA-256,
   Supabase the raw value. If Google's script can't load (blocked, offline),
   the plain redirect button is shown instead. */
interface GoogleId {
  initialize(o: { client_id: string; nonce: string; callback: (r: { credential?: string }) => void; ux_mode?: "popup"; itp_support?: boolean; use_fedcm_for_button?: boolean }): void
  renderButton(el: HTMLElement, o: Record<string, string | number>): void
}
declare global { interface Window { google?: { accounts?: { id?: GoogleId } } } }

let gisScript: Promise<GoogleId> | null = null
function loadGoogleScript(): Promise<GoogleId> {
  gisScript ??= new Promise<GoogleId>((resolve, reject) => {
    const done = () => window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error("no google"))
    if (window.google?.accounts?.id) return done()
    const el = document.createElement("script")
    el.src = "https://accounts.google.com/gsi/client"
    el.async = true
    el.onload = done
    el.onerror = () => reject(new Error("blocked"))
    document.head.appendChild(el)
    window.setTimeout(() => reject(new Error("timeout")), 8000)
  })
  gisScript.catch(() => { gisScript = null })
  return gisScript
}

async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const raw = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))
  const hashed = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("")
  return { raw, hashed }
}

function GoogleButton({ busy, onToken, fallback }: { busy: boolean; onToken: (token: string, nonce: string) => void; fallback: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<"loading" | "ready" | "failed">(GOOGLE_CLIENT_ID ? "loading" : "failed")
  const [round, setRound] = useState(0) // a fresh nonce for every try
  const handler = useRef(onToken)
  handler.current = onToken

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    let live = true
    Promise.all([loadGoogleScript(), makeNonce()]).then(([gid, nonce]) => {
      if (!live || !box.current) return
      gid.initialize({
        client_id: GOOGLE_CLIENT_ID, nonce: nonce.hashed, ux_mode: "popup", itp_support: true,
        callback: r => { if (r.credential) { handler.current(r.credential, nonce.raw); setRound(n => n + 1) } },
      })
      box.current.innerHTML = ""
      gid.renderButton(box.current, {
        type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "pill",
        logo_alignment: "center", width: Math.max(200, Math.min(400, box.current.clientWidth || 320)),
      })
      setState("ready")
    }, () => { if (live) setState("failed") })
    return () => { live = false }
  }, [round])

  if (state === "failed") return <>{fallback}</>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: busy ? 0.5 : 1, pointerEvents: busy ? "none" : "auto" }}>
      <div ref={box} aria-busy={state === "loading" || busy} style={{ minHeight: 44, display: "flex", justifyContent: "center" }} />
      {state === "loading" && <Note color={T.dim}>Loading Google sign-in…</Note>}
      {busy && <div role="status"><Note>Signing in…</Note></div>}
    </div>
  )
}

const inputStyle = (bad: boolean) => ({
  width: "100%", height: 48, padding: "0 12px", borderRadius: 10, fontSize: 16, // 16px: iOS doesn't zoom in
  background: T.surfaceHi, border: `1px solid ${bad ? T.danger : T.line}`, color: T.text,
})

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Fine({ inSettings }: { inSettings: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Note>Free. We only use your email and your game progress.</Note>
      <Note>You must be 13 or older to make an account.</Note>
      <Note>
        <a href="/privacy.html#accounts" target="_blank" rel="noopener" style={{ color: T.muted, textDecoration: "underline" }}>How accounts use your data</a>
        {!inSettings && <> · Back up and Restore are in Settings.</>}
      </Note>
    </div>
  )
}

function ago(t: number | null, now: number): string {
  if (t == null) return "Synced"
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 60) return "Synced just now"
  const m = Math.round(s / 60)
  if (m < 60) return `Synced ${m} min ago`
  return `Synced at ${new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
}

function statusLine(v: AccountView, now: number): { text: string; color: string } {
  switch (v.status) {
    case "synced": return { text: ago(v.lastSynced, now), color: T.green }
    case "offline": return { text: "Offline — will sync later", color: T.amber }
    case "error": return { text: "Couldn’t sync — will try again", color: T.danger }
    default: return { text: "Syncing…", color: T.muted }
  }
}

function Card({ children, cardRef, compact = false }: { children: ReactNode; cardRef?: Ref<HTMLElement>; compact?: boolean }) {
  return (
    <section ref={cardRef} aria-label="Account" id="account"
      style={compact ? { display: "flex", flexDirection: "column", gap: 12 } : { borderRadius: 16, padding: 16, background: T.surface, border: `1px solid ${T.line}`, display: "flex", flexDirection: "column", gap: 12 }}>
      {children}
    </section>
  )
}

export default function AccountCard({ inSettings = false, compact = false }: { inSettings?: boolean; compact?: boolean }) {
  const configured = accountsConfigured()
  const [svc, setSvc] = useState<Service | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const [busy, setBusy] = useState<"" | "google" | "link" | "code" | "signout" | "delete">("")
  const [error, setError] = useState(SIGN_IN_ERROR ?? "")
  const [email, setEmail] = useState("")
  const [sentTo, setSentTo] = useState("")
  const [code, setCode] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const ref = useRef<HTMLElement>(null)
  // Signed in here already (or just back from signing in): load the client now.
  const [wanted, setWanted] = useState(() => configured && (hasStoredSession() || SIGN_IN_RETURN))

  useEffect(() => {
    if (!wanted || svc) return
    let live = true
    setLoadFailed(false)
    loadAccountService().then(m => { if (live) setSvc(m) }, () => { if (live) setLoadFailed(true) })
    return () => { live = false }
  }, [wanted, svc, attempt])
  useEffect(() => svc?.subscribe(rerender), [svc])

  const view = svc?.getView()
  const signedIn = !!view?.ready && view.signedIn

  // "Synced 3 min ago" stays true while the card is open.
  useEffect(() => {
    if (!signedIn) return
    const t = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(t)
  }, [signedIn])
  useEffect(() => { if (view?.lastSynced) setNow(Date.now()) }, [view?.lastSynced])

  // Back from signing in: bring the card into view, so the result is seen.
  const scrolled = useRef(false)
  useEffect(() => {
    if (!SIGN_IN_RETURN || inSettings || scrolled.current || !view?.ready) return
    scrolled.current = true
    ref.current?.scrollIntoView({ block: "center" })
  }, [view?.ready, inSettings])

  /** Load the client (once), then run `fn`; errors become a message. */
  const act = async (kind: typeof busy, fn: (s: Service) => Promise<string | null | void>) => {
    setError(""); setBusy(kind)
    try {
      const s = svc ?? await loadAccountService()
      if (!svc) { setSvc(s); setWanted(true) }
      const message = await fn(s)
      if (message) setError(message)
      return !message
    } catch {
      setError("Couldn’t reach the server. Check your connection and try again.")
      return false
    } finally {
      setBusy("")
    }
  }

  if (!configured) return (
    <Card compact={compact}>
      <Title>Keep your progress on every device</Title>
      <Note>Sign-in isn’t available yet. Until then, {inSettings ? "Back up and Restore below" : "Back up and Restore in Settings"} move your progress between devices.</Note>
    </Card>
  )

  if (wanted && !view?.ready) return (
    <Card cardRef={ref} compact={compact}>
      <Title>Your account</Title>
      {loadFailed
        ? <>
            <Note>Couldn’t load your account. Your progress is safe on this device.</Note>
            <SecondaryButton onClick={() => setAttempt(a => a + 1)}>Try again</SecondaryButton>
          </>
        : <div role="status" aria-busy="true"><Note>Checking your account…</Note></div>}
    </Card>
  )

  if (signedIn && view) {
    const line = statusLine(view, now)
    if (confirmDelete) return (
      <Card cardRef={ref} compact={compact}>
        <Title>Delete your account?</Title>
        <Note>This deletes your account and the progress saved in it. Your other devices stop syncing. This device keeps its progress. It can’t be undone.</Note>
        <Alert text={error} />
        <PrimaryButton accent={T.danger} disabled={busy === "delete"} aria-busy={busy === "delete"}
          onClick={async () => {
            const ok = await act("delete", s => s.deleteAccount())
            if (ok) { setConfirmDelete(false); setDeleted(true) }
          }}>
          {busy === "delete" ? "Deleting…" : "Delete account"}
        </PrimaryButton>
        <SecondaryButton disabled={busy === "delete"} onClick={() => { setError(""); setConfirmDelete(false) }}>Cancel</SecondaryButton>
      </Card>
    )
    return (
      <Card cardRef={ref} compact={compact}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="geo-micro" style={{ fontSize: 10, color: ACC }}>Signed in</span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span className="geo-display" style={{ fontSize: 17, fontWeight: 700, color: T.text, overflowWrap: "anywhere" }}>{view.email ?? "Your account"}</span>
            {view.badge && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, color: T.gold, background: tint(T.gold, 0.12), border: `1px solid ${tint(T.gold, 0.35)}` }}>
                {view.badge}
              </span>
            )}
          </div>
        </div>
        <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: line.color, flexShrink: 0 }} />
          <span className="text-sm" style={{ color: T.text, fontVariantNumeric: "tabular-nums" }}>{line.text}</span>
        </div>
        <Note>Your progress is saved to your account and kept the same on every device you sign in on.</Note>
        {view.supporter && <Note color={T.gold}>Supporter: ads are off on every device you sign in on.</Note>}
        <Alert text={error} />
        <SecondaryButton disabled={busy === "signout"} aria-busy={busy === "signout"} onClick={() => act("signout", s => s.signOut())}>
          {busy === "signout" ? "Signing out…" : "Sign out"}
        </SecondaryButton>
        <button type="button" onClick={() => { setError(""); setConfirmDelete(true) }} className="text-xs font-semibold"
          style={{ alignSelf: "center", padding: "8px 16px", minHeight: 44, color: T.danger, background: "transparent", border: "none", cursor: "pointer" }}>
          Delete account
        </button>
      </Card>
    )
  }

  // Signed out.
  if (sentTo) return (
    <Card cardRef={ref} compact={compact}>
      <Title>Check your email</Title>
      <Note>We sent a sign-in link to <strong style={{ color: T.text, overflowWrap: "anywhere" }}>{sentTo}</strong>. Open it on this device. It can take a minute, so check your spam folder too.</Note>
      {EMAIL_CODE ? (
      <form onSubmit={async (e: FormEvent) => {
        e.preventDefault()
        const token = code.replace(/\s+/g, "")
        if (!/^\d{6,10}$/.test(token)) { setError("Enter the code from the email: 6 or more digits."); return }
        const ok = await act("code", s => s.verifyCode(sentTo, token))
        if (ok) { setSentTo(""); setCode("") }
      }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label htmlFor="account-code" className="text-xs font-semibold" style={{ color: T.muted }}>Or enter the code from the email</label>
        <input id="account-code" className="pf-input" value={code} onChange={e => { setCode(e.target.value); setError("") }}
          inputMode="numeric" autoComplete="one-time-code" maxLength={12} placeholder="123456"
          style={{ ...inputStyle(!!error), fontFamily: FONT.mono, letterSpacing: "0.2em", fontVariantNumeric: "tabular-nums" }} />
        <Alert text={error} />
        <PrimaryButton type="submit" accent={ACC} disabled={!code.trim() || busy === "code"} aria-busy={busy === "code"}>
          {busy === "code" ? "Signing in…" : "Sign in"}
        </PrimaryButton>
      </form>
      ) : <Alert text={error} />}
      <SecondaryButton onClick={() => { setSentTo(""); setCode(""); setError("") }}>Use a different email</SecondaryButton>
    </Card>
  )

  const sendLink = async (e: FormEvent) => {
    e.preventDefault()
    const address = email.trim()
    if (!EMAIL.test(address)) { setError("Enter your email address, like name@example.com."); return }
    const ok = await act("link", s => s.sendSignInLink(address))
    if (ok) { setSentTo(address); setCode("") }
  }

  return (
    <Card cardRef={ref} compact={compact}>
      {/* compact: opened from a row that already says it */}
      {!compact && <Title>Keep your progress on every device</Title>}
      <Note>Sign in and your flags, streaks and best scores stay the same on your phone, tablet and computer. What’s on this device now comes with you.</Note>
      {deleted && <div role="status"><Note color={T.green}>Your account is deleted. Your progress is still on this device.</Note></div>}
      <GoogleButton busy={busy === "google"}
        onToken={(token, nonce) => { void act("google", s => s.signInWithGoogleToken(token, nonce)) }}
        fallback={
          <PrimaryButton accent={ACC} disabled={busy !== ""} aria-busy={busy === "google"}
            onClick={() => act("google", s => s.signInWithGoogle())}>
            {busy === "google" ? "Opening Google…" : "Continue with Google"}
          </PrimaryButton>
        } />
      {EMAIL_SIGNIN ? (<>
      <div aria-hidden style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, height: 1, background: T.line }} />
        <span className="text-xs" style={{ color: T.dim }}>or</span>
        <span style={{ flex: 1, height: 1, background: T.line }} />
      </div>
      <form onSubmit={sendLink} noValidate style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label htmlFor="account-email" className="text-xs font-semibold" style={{ color: T.muted }}>Email</label>
        <input id="account-email" className="pf-input" type="email" autoComplete="email" inputMode="email" autoCapitalize="off" spellCheck={false}
          value={email} onChange={e => { setEmail(e.target.value); setError("") }} placeholder="name@example.com"
          style={inputStyle(!!error && !!email)} />
        <Alert text={error} />
        <SecondaryButton type="submit" disabled={busy !== ""} aria-busy={busy === "link"}>
          <LineIcon name="mail" size={16} color={busy !== "" ? T.dim : T.muted} />
          {busy === "link" ? "Sending…" : "Email me a sign-in link"}
        </SecondaryButton>
      </form>
      </>) : <Alert text={error} />}
      <Fine inSettings={inSettings} />
    </Card>
  )
}
