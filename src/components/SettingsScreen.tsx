import { useState } from "react"
import { T, ACCENT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { LineIcon } from "./icons"
import { openSupporter } from "../utils/supporterNav"
import { SUPPORTER_LIVE } from "../ads"
import { loadState, saveState, setPremium, isSupporter } from "../utils/storage"
import { exportProgress, importProgress } from "../utils/backup"

interface Props { onBack: () => void; onMegaCodex: () => void; onFlagCheck: () => void }

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
        style={{ flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: 10, fontSize: 13, background: T.surfaceHi, border: `1px solid ${T.line}`, color: T.text, outline: "none" }}
      />
      <button onClick={submit} className="active:scale-95"
        style={{ flexShrink: 0, padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: tint(T.gold, 0.14), border: `1px solid ${tint(T.gold, 0.4)}`, color: T.gold }}>
        Unlock
      </button>
    </div>
  )
}

// Back up = copy a portable code to the clipboard AND download it as a file.
async function backUpProgress() {
  const code = exportProgress()
  try { await navigator.clipboard.writeText(code) } catch { /* clipboard may be blocked */ }
  try {
    const blob = new Blob([code], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `globalio-backup-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  } catch { /* download may be blocked */ }
  alert("Backup copied to your clipboard and downloaded.\n\nKeep it somewhere safe — paste it into “Restore” on any device (or after clearing your browser) to bring all your progress back.")
}

function restoreProgress() {
  const code = window.prompt("Paste your Globalio backup code.\n\nThis replaces the progress currently on this device.")
  if (!code) return
  if (importProgress(code)) {
    alert("Progress restored! Reloading…")
    window.location.reload()
  } else {
    alert("That doesn’t look like a valid Globalio backup code. Make sure you copied the whole thing.")
  }
}

export default function SettingsScreen({ onBack, onMegaCodex, onFlagCheck }: Props) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text, position: 'relative', zIndex: 1 }}>
      <ScreenHeader title="Settings" subtitle="Progress, support & feedback" onBack={onBack} />

      <div className="px-5 pb-10">
        {/* Support Globalio — opens the Supporter screen (hidden until checkout is live) */}
        {SUPPORTER_LIVE && <button onClick={openSupporter}
          className="w-full mt-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 block text-center"
          style={{ background: tint(T.gold, 0.12), border: `1px solid ${tint(T.gold, 0.4)}`, color: T.gold }}>
          <span className="inline-flex items-center justify-center gap-2">💛 Support Globalio</span>
        </button>}

        {/* Your data — back up / restore progress (no account needed) */}
        <h2 className="text-xs font-semibold uppercase tracking-widest mt-8 mb-3" style={{ color: T.muted }}>Your Progress</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={backUpProgress}
            className="py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: tint(ACCENT.codex, 0.12), border: `1px solid ${tint(ACCENT.codex, 0.4)}`, color: ACCENT.codex }}>
            <span className="inline-flex items-center justify-center gap-2"><LineIcon name="codex" size={15} color={ACCENT.codex} /> Back up</span>
          </button>
          <button onClick={restoreProgress}
            className="py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: tint(ACCENT.learn, 0.12), border: `1px solid ${tint(ACCENT.learn, 0.4)}`, color: ACCENT.learn }}>
            <span className="inline-flex items-center justify-center gap-2"><LineIcon name="historical" size={15} color={ACCENT.learn} /> Restore</span>
          </button>
        </div>
        <div className="text-xs mt-2 text-center" style={{ color: T.muted }}>
          Progress lives on this device. Back up to keep your streaks safe or move to another device.
        </div>

        {/* Creator unlock — enter the passcode to turn ads off on this device */}
        <CreatorUnlock />

        {/* Replay the first-run intro (clears the flag and reloads) */}
        <button onClick={() => { try { localStorage.removeItem("globalio_onboarded") } catch { /* ignore */ } window.location.reload() }}
          className="w-full mt-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
          style={{ background: 'transparent', border: `1px dashed ${T.line}`, color: T.dim }}>
          <span className="inline-flex items-center justify-center gap-2">🌍 Replay intro</span>
        </button>

        {/* Feedback — opens the user's mail app, pre-addressed to the dev */}
        <a href={"mailto:sjoudrie@gmail.com?subject=" + encodeURIComponent("Globalio feedback") + "&body=" + encodeURIComponent("What I love / what I'd change / an idea:\n\n")}
          className="w-full mt-3 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 block text-center"
          style={{ textDecoration: 'none', background: tint(ACCENT.learn, 0.12), border: `1px solid ${tint(ACCENT.learn, 0.4)}`, color: ACCENT.learn }}>
          <span className="inline-flex items-center justify-center gap-2"><LineIcon name="historical" size={15} color={ACCENT.learn} /> Send feedback or ideas</span>
        </a>
        <div className="text-xs mt-2 text-center" style={{ color: T.muted }}>
          i'm a one-man operation, so i genuinely read every message — thanks for playing, and i'll do my best to make it happen 💛
        </div>

        {/* Legal — required for ad networks & app stores */}
        <div className="text-xs mt-5 text-center" style={{ color: T.dim }}>
          <a href="/privacy.html" target="_blank" rel="noopener" style={{ color: T.muted, textDecoration: 'underline' }}>Privacy Policy</a>
          <span style={{ margin: '0 8px' }}>·</span>
          <a href="/terms.html" target="_blank" rel="noopener" style={{ color: T.muted, textDecoration: 'underline' }}>Terms of Use</a>
        </div>

        {/* Accuracy disclaimer — moved here from the Codex so it doesn't crowd
            the galleries; the Codex leans on Wikipedia / Wikimedia Commons. */}
        <div className="mt-5" style={{ padding: '10px 12px', borderRadius: 10, background: tint(T.amber, 0.07), border: `1px solid ${tint(T.amber, 0.28)}` }}>
          <p className="text-xs" style={{ color: T.muted, lineHeight: 1.6, margin: 0 }}>
            <strong style={{ color: T.text }}>A note on accuracy.</strong> Flags, names and dates in the Codex are sourced from Wikipedia and Wikimedia Commons. We do our best to get them right, but we're not an authoritative reference and small mistakes may slip through. Spot something off?{' '}
            <a href="mailto:sjoudrie@gmail.com?subject=Globalio%20flag%20correction" style={{ color: T.amber, fontWeight: 600 }}>Tell us</a>{' '}and we'll fix it fast.
          </p>
        </div>

        {/* secret */}
        <button onClick={onMegaCodex}
          className="w-full mt-8 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
          style={{ background: 'transparent', border: `1px dashed ${T.line}`, color: T.dim }}>
          <span className="inline-flex items-center justify-center gap-2"><LineIcon name="codex" size={14} color={T.dim} /> Secret MegaCodex</span>
        </button>

        {/* temporary flag-QA list */}
        <button onClick={onFlagCheck}
          className="w-full mt-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
          style={{ background: 'transparent', border: `1px dashed ${T.line}`, color: T.dim }}>
          <span className="inline-flex items-center justify-center gap-2"><LineIcon name="flags" size={14} color={T.dim} /> Flag Check (QA)</span>
        </button>
      </div>
    </div>
  )
}
