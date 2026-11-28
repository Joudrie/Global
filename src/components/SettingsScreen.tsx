import { useState, lazy, Suspense } from "react"
import type { CSSProperties, ReactNode } from "react"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { LineIcon, HeartIcon } from "./icons"
import { openSupporter } from "../utils/supporterNav"
import { SUPPORTER_LIVE } from "../ads"
import { loadState, saveState, setPremium, isSupporter } from "../utils/storage"
import { exportProgress } from "../utils/backup"
import RestoreBackup from "./RestoreBackup"
import { accountsVisible } from "../accounts"
import { previewAll, setPreviewAll } from "../profile/preview"

const AccountCard = lazy(() => import("./AccountCard"))

interface Props { onBack: () => void; onFlagCheck: () => void; onPatchNotes: () => void }

// The creator's own tools (the ad-free unlock and the flag QA list) stay out of
// sight for players: they show in dev builds, or after opening the site once
// with ?creator in the address, which this device then remembers.
const CREATOR_KEY = "globalio_creator"
function creatorTools(): boolean {
  if (import.meta.env.DEV) return true
  try {
    if (new URLSearchParams(window.location.search).has("creator")) localStorage.setItem(CREATOR_KEY, "1")
    return localStorage.getItem(CREATOR_KEY) === "1"
  } catch { return false }
}

// Creator preview — show every achievement unlocked on this device, to look
// them all over. Display only (see shownUnlocks): the real unlocks, the
// account and what friends see don't change, and switching it off undoes it.
function PreviewAllToggle() {
  const [on, setOn] = useState(previewAll)
  const flip = () => { setPreviewAll(!on); setOn(!on) }
  return (
    <button onClick={flip} aria-pressed={on}
      className="w-full mt-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
      style={{ background: on ? tint(T.gold, 0.14) : 'transparent', border: `1px ${on ? 'solid' : 'dashed'} ${on ? tint(T.gold, 0.4) : T.line}`, color: on ? T.gold : T.dim }}>
      {on ? "✓ Every achievement shown unlocked (tap to turn off)" : "Show every achievement unlocked (preview)"}
    </button>
  )
}

// Creator unlock — typing the passcode flips on the Supporter flag locally,
// which hides every ad on this device. Reloads so ad components re-read it.
function CreatorUnlock() {
  const [code, setCode] = useState("")
  const [done, setDone] = useState(() => isSupporter())
  const submit = () => {
    if (code.trim().toLowerCase() === "zip") {
      saveState(setPremium(loadState(), true))
      setDone(true)
      location.reload()
    } else {
      setCode("")
    }
  }
  if (done) return (
    <div className="text-xs mt-3 text-center" style={{ color: T.gold }}>✓ ads are off on this device</div>
  )
  return (
    <div className="mt-3 flex gap-2">
      <input
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit() }}
        placeholder="creator unlock code"
        style={{ flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: 10, fontSize: 16, background: T.surfaceHi, border: `1px solid ${T.line}`, color: T.text, outline: "none" }}
      />
      <button onClick={submit} className="active:scale-95"
        style={{ flexShrink: 0, padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: tint(T.gold, 0.14), border: `1px solid ${tint(T.gold, 0.4)}`, color: T.gold }}>
        Unlock
      </button>
    </div>
  )
}

// Back up = copy a portable code to the clipboard AND download it as a file.
// The message only claims the steps that worked; if both are blocked, the code
// is shown so it can be copied by hand.
async function backUpProgress() {
  let code: string
  try { code = exportProgress() } catch {
    alert("Couldn’t read your progress on this device, so there’s nothing to back up.")
    return
  }
  let copied = false, downloaded = false
  try { await navigator.clipboard.writeText(code); copied = true } catch { /* clipboard may be blocked */ }
  try {
    const blob = new Blob([code], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `globalio-backup-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    // Some browsers start the download after click() returns; revoking at once
    // can cancel it.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    downloaded = true
  } catch { /* download may be blocked */ }
  const keep = "Keep it somewhere safe. Restore it on any device (or after clearing your browser) to bring your progress back, or to combine it with the progress already there."
  if (!copied && !downloaded) {
    window.prompt("Copy this backup code and keep it somewhere safe. Paste it into “Restore” to bring your progress back.", code)
    return
  }
  const what = copied && downloaded ? "Backup copied to your clipboard and downloaded."
    : copied ? "Backup copied to your clipboard." : "Backup downloaded as a file."
  alert(`${what}\n\n${keep}`)
}

// ── Layout pieces: a section title, a grouped list of rows, a footnote ──────
function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: T.muted, margin: "28px 4px 10px" }}>{children}</h2>
}
function Group({ children }: { children: ReactNode }) {
  return <div style={{ borderRadius: 14, overflow: "hidden", background: T.surface, border: `1px solid ${T.line}` }}>{children}</div>
}
function Footnote({ children }: { children: ReactNode }) {
  return <p className="text-xs" style={{ color: T.dim, lineHeight: 1.5, margin: "8px 4px 0" }}>{children}</p>
}
function Row({ icon, label, hint, onClick, href, external = false, last = false }:
  { icon: Parameters<typeof LineIcon>[0]["name"]; label: string; hint?: string; onClick?: () => void; href?: string; external?: boolean; last?: boolean }) {
  const style: CSSProperties = { width: "100%", minHeight: 52, display: "flex", alignItems: "center", gap: 12, padding: "0 14px",
    background: "transparent", border: "none", borderBottom: last ? "none" : `1px solid ${T.line}`, color: T.text, textAlign: "left", textDecoration: "none", cursor: "pointer" }
  const inner = (
    <>
      <LineIcon name={icon} size={16} color={T.muted} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>{label}</span>
      {hint && <span style={{ fontSize: 12, color: T.dim, flexShrink: 0 }}>{hint}</span>}
      <LineIcon name="chevronright" size={16} color={T.dim} />
    </>
  )
  return href
    ? <a href={href} {...(external ? { target: "_blank", rel: "noopener" } : {})} className="geo-row" style={style}>{inner}</a>
    : <button type="button" onClick={onClick} className="geo-row" style={style}>{inner}</button>
}

export default function SettingsScreen({ onBack, onFlagCheck, onPatchNotes }: Props) {
  const [creator] = useState(creatorTools)
  const [accounts] = useState(accountsVisible)
  const [restoring, setRestoring] = useState(false)
  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text, position: 'relative', zIndex: 1 }}>
      <ScreenHeader title="Settings" subtitle="Account, progress and help" onBack={onBack} />

      <div className="px-5 pb-10">
        {/* Support Globalio — opens the Supporter screen (hidden until checkout is live) */}
        {SUPPORTER_LIVE && <button onClick={openSupporter}
          className="w-full mt-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 block text-center"
          style={{ background: tint(T.gold, 0.12), border: `1px solid ${tint(T.gold, 0.4)}`, color: T.gold }}>
          <span className="inline-flex items-center justify-center gap-2"><HeartIcon size={15} color={T.gold} strokeWidth={1.7} /> Support Globalio</span>
        </button>}

        {/* Account (when accounts are on) */}
        {accounts && (
          <>
            <SectionTitle>Account</SectionTitle>
            <Suspense fallback={null}><AccountCard inSettings /></Suspense>
          </>
        )}

        {/* Your progress — back up / restore (no account needed) */}
        <SectionTitle>Your progress</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={backUpProgress}
            className="py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: tint(ACCENT.codex, 0.12), border: `1px solid ${tint(ACCENT.codex, 0.4)}`, color: ACCENT.codex }}>
            <span className="inline-flex items-center justify-center gap-2"><LineIcon name="codex" size={15} color={ACCENT.codex} /> Back up</span>
          </button>
          <button onClick={() => setRestoring(r => !r)} aria-expanded={restoring}
            className="py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: tint(ACCENT.learn, restoring ? 0.2 : 0.12), border: `1px solid ${tint(ACCENT.learn, restoring ? 0.7 : 0.4)}`, color: ACCENT.learn }}>
            <span className="inline-flex items-center justify-center gap-2"><LineIcon name="historical" size={15} color={ACCENT.learn} /> Restore</span>
          </button>
        </div>
        {restoring && <RestoreBackup onClose={() => setRestoring(false)} />}
        <Footnote>Keep a copy of your progress, or move it to another device.</Footnote>

        {/* Help — feedback, patch notes, the intro */}
        <SectionTitle>Help</SectionTitle>
        <Group>
          <Row icon="mail" label="Send feedback or ideas"
            href={"mailto:sjoudrie@gmail.com?subject=" + encodeURIComponent("Globalio feedback") + "&body=" + encodeURIComponent("What I love / what I'd change / an idea:\n\n")} />
          <Row icon="scroll" label="Patch notes" hint="What changed lately" onClick={onPatchNotes} />
          {/* Replay the first-run intro (clears the flag and reloads) */}
          <Row icon="intro" label="Replay intro" last
            onClick={() => { try { localStorage.removeItem("globalio_onboarded") } catch { /* ignore */ } window.location.reload() }} />
        </Group>
        <Footnote>Globalio is made by one person, and I read every message.</Footnote>

        {/* About — legal (required for ad networks & app stores) and accuracy */}
        <SectionTitle>About</SectionTitle>
        <Group>
          <Row icon="lock" label="Privacy Policy" href="/privacy.html" external />
          <Row icon="scroll" label="Terms of Use" href="/terms.html" external />
          <Row icon="flags" label="Report a flag mistake" last href="mailto:sjoudrie@gmail.com?subject=Globalio%20flag%20correction" />
        </Group>
        <Footnote>Flags, names and dates come from Wikipedia and Wikimedia Commons. Small mistakes can slip through; tell us and we'll fix them fast.</Footnote>

        {/* Creator tools (only with ?creator): the ad-free unlock, the
            achievements preview and the flag-QA list */}
        {creator && (
          <>
            <SectionTitle>Creator tools</SectionTitle>
            <CreatorUnlock />
            <PreviewAllToggle />
            <button onClick={onFlagCheck}
              className="w-full mt-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
              style={{ background: 'transparent', border: `1px dashed ${T.line}`, color: T.dim }}>
              <span className="inline-flex items-center justify-center gap-2"><LineIcon name="flags" size={14} color={T.dim} /> Flag Check (QA)</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
