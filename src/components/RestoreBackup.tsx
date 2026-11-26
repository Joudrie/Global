import { useRef, useState } from "react"
import type { ChangeEvent, ReactNode } from "react"
import { FileText } from "lucide-react"
import { T, ACCENT, tint } from "../ui/tokens"
import { PrimaryButton, SecondaryButton } from "./gameUi"
import { readBackup, restoreBackup } from "../utils/backup"
import type { RestoreMode, RestoreResult } from "../utils/backup"
import { summarize, bestsRaised } from "../utils/mergeProgress"
import type { ProgressSummary, Snapshot } from "../utils/mergeProgress"

/* Restore, in three steps inside the Settings screen (no popup):
   1. paste a backup code or choose a backup file;
   2. combine it with this device (the default) or replace this device;
   3. see what changed, then combine another backup or finish (reloads).
   Nothing is written until step 2 is confirmed, and a bad code or file only
   shows a message. */

const ACC = ACCENT.learn
const MAX_FILE = 25 * 1024 * 1024 // far above any real backup; stops a wrong pick (a video) being read

type Step =
  | { at: "pick" }
  | { at: "choose"; backup: Snapshot; from: string }
  | { at: "done"; mode: RestoreMode; result: RestoreResult }

const n = (x: number) => x.toLocaleString("en-US")
const plural = (x: number, one: string, many = one + "s") => `${n(x)} ${x === 1 ? one : many}`
const headline = (s: ProgressSummary) => `${plural(s.flags, "flag")} learned, best streak ${n(s.bestStreak)}`

function Card({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section aria-label={label} className="mt-3"
      style={{ borderRadius: 16, padding: 16, background: T.surface, border: `1px solid ${T.line}`, display: "flex", flexDirection: "column", gap: 12 }}>
      {children}
    </section>
  )
}

const Title = ({ children }: { children: ReactNode }) => (
  <h3 className="geo-display" style={{ margin: 0, fontSize: 17, fontWeight: 700, lineHeight: 1.3, color: T.text }}>{children}</h3>
)
const Note = ({ children, color = T.muted }: { children: ReactNode; color?: string }) => (
  <p className="text-xs" style={{ margin: 0, lineHeight: 1.6, color }}>{children}</p>
)

function Option({ value, mode, onPick, title, badge, children }:
  { value: RestoreMode; mode: RestoreMode; onPick: (m: RestoreMode) => void; title: string; badge?: string; children: ReactNode }) {
  const on = value === mode
  const accent = value === "replace" ? T.danger : ACC
  return (
    <label style={{
      display: "flex", gap: 12, alignItems: "flex-start", padding: 12, borderRadius: 12, cursor: "pointer",
      background: on ? tint(accent, 0.08) : T.bg, border: `1px solid ${on ? accent : T.line}`,
    }}>
      <input type="radio" name="restore-mode" value={value} checked={on} onChange={() => onPick(value)}
        style={{ width: 18, height: 18, margin: "2px 0 0", flexShrink: 0, accentColor: accent }} />
      <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span className="text-sm font-semibold" style={{ color: T.text }}>{title}</span>
          {badge && <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, color: ACC, background: tint(ACC, 0.12), border: `1px solid ${tint(ACC, 0.3)}` }}>{badge}</span>}
        </span>
        <span className="text-xs" style={{ color: T.muted, lineHeight: 1.5 }}>{children}</span>
      </span>
    </label>
  )
}

/** Before → after lines for the confirmation; only what changed. */
function changes(r: RestoreResult): string[] {
  const a = summarize(r.before), b = summarize(r.after)
  const lines: string[] = []
  const line = (label: string, x: number, y: number) => { if (x !== y) lines.push(`${label}: ${n(x)} → ${n(y)}`) }
  line("Flags learned", a.flags, b.flags)
  line("Subdivision flags learned", a.subs, b.subs)
  line("Crowns", a.crowns, b.crowns)
  line("Best streak", a.bestStreak, b.bestStreak)
  line("Current streak", a.streak, b.streak)
  line("Daily puzzles played", a.dailies, b.dailies)
  const raised = bestsRaised(r.before, r.after)
  if (raised) lines.push(`${plural(raised, "best score")} raised`)
  return lines
}

export default function RestoreBackup({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>({ at: "pick" })
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [reading, setReading] = useState(false)
  const [mode, setMode] = useState<RestoreMode>("combine")
  const [combined, setCombined] = useState(0) // backups brought in this visit
  const fileRef = useRef<HTMLInputElement>(null)

  const found = (backup: Snapshot, from: string) => { setError(""); setMode("combine"); setStep({ at: "choose", backup, from }) }

  const fromPaste = () => {
    const backup = readBackup(code)
    if (backup) found(backup, "the pasted code")
    else setError("That doesn’t look like a Globalio backup code. Make sure you copied all of it, starting with GLOBALIO1:")
  }

  const fromFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // the same file can be chosen again
    if (!file) return
    setError("")
    if (file.size > MAX_FILE) { setError("That file is too big to be a Globalio backup. Choose the globalio-backup file you downloaded."); return }
    setReading(true)
    let text = ""
    try { text = await file.text() } catch { /* unreadable: same message as a wrong file */ }
    setReading(false)
    const backup = readBackup(text)
    if (backup) found(backup, file.name)
    else setError("That file isn’t a Globalio backup. Choose the globalio-backup-….txt file you downloaded from Back up.")
  }

  const apply = (backup: Snapshot) => {
    const result = restoreBackup(backup, mode)
    if (!result) {
      setError("Couldn’t save to this device’s storage (it may be full or blocked), so nothing was changed.")
      return
    }
    setError("")
    if (mode === "combine") setCombined(c => c + 1)
    setCode("")
    setStep({ at: "done", mode, result })
  }

  const again = () => { setError(""); setCode(""); setStep({ at: "pick" }) }
  const errorLine = error && <div role="alert"><Note color={T.danger}>{error}</Note></div>

  if (step.at === "pick") return (
    <Card label="Restore a backup">
      <Title>{combined ? "Combine another backup" : "Restore a backup"}</Title>
      <Note>Paste the code you copied when you backed up, or choose the backup file you downloaded (globalio-backup-….txt).</Note>
      <textarea value={code} onChange={e => { setCode(e.target.value); setError("") }}
        aria-label="Backup code" placeholder="GLOBALIO1:…" rows={3} spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off"
        style={{
          width: "100%", resize: "vertical", padding: "8px 12px", borderRadius: 10, fontSize: 16, lineHeight: 1.4,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", wordBreak: "break-all",
          background: T.surfaceHi, border: `1px solid ${error ? T.danger : T.line}`, color: T.text, outline: "none",
        }} />
      {errorLine}
      <PrimaryButton accent={ACC} disabled={!code.trim()} onClick={fromPaste}>Continue</PrimaryButton>
      <input ref={fileRef} type="file" accept=".txt,text/plain" onChange={fromFile} hidden />
      <SecondaryButton disabled={reading} aria-busy={reading} onClick={() => fileRef.current?.click()}>
        <FileText size={16} strokeWidth={1.7} color={reading ? T.dim : T.muted} absoluteStrokeWidth aria-hidden />
        {reading ? "Reading file…" : "Choose a backup file"}
      </SecondaryButton>
      <button onClick={onClose} className="text-xs font-semibold" style={{ alignSelf: "center", padding: "8px 16px", color: T.muted, background: "transparent", border: "none" }}>
        {combined ? "Close" : "Cancel"}
      </button>
    </Card>
  )

  if (step.at === "choose") {
    const s = summarize(step.backup)
    return (
      <Card label="Combine or replace">
        <Title>Backup found</Title>
        <Note>
          From {step.from}: {plural(s.flags, "flag")} learned · best streak {n(s.bestStreak)} · {plural(s.dailies, "daily puzzle")}
        </Note>
        <div role="radiogroup" aria-label="What to do with this backup" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Option value="combine" mode={mode} onPick={setMode} title="Combine with this device" badge="Recommended">
            Keeps the best of both — higher scores, every flag learned, longest streaks.
          </Option>
          <Option value="replace" mode={mode} onPick={setMode} title="Replace this device">
            This device’s progress is swapped for the backup’s. Anything not in the backup is lost.
          </Option>
        </div>
        {errorLine}
        <PrimaryButton accent={mode === "replace" ? T.danger : ACC} onClick={() => apply(step.backup)}>
          {mode === "combine" ? "Combine" : "Replace this device’s progress"}
        </PrimaryButton>
        <SecondaryButton onClick={again}>Back</SecondaryButton>
      </Card>
    )
  }

  const after = summarize(step.result.after)
  const lines = step.mode === "combine" ? changes(step.result) : []
  return (
    <Card label="Restore finished">
      <div role="status" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Title>{step.mode === "combine" ? `Combined: ${headline(after)}` : `Replaced: ${headline(after)}`}</Title>
        {step.mode === "combine" && (lines.length
          ? <ul className="text-xs" style={{ margin: 0, paddingLeft: 16, listStyle: "disc", color: T.muted, lineHeight: 1.7, fontVariantNumeric: "tabular-nums" }}>
              {lines.map(l => <li key={l}>{l}</li>)}
            </ul>
          : <Note>This device already had everything in that backup, so nothing changed.</Note>)}
        {step.mode === "replace" && <Note>This device now has the backup’s progress.</Note>}
        {combined > 1 && <Note>{n(combined)} backups combined so far.</Note>}
      </div>
      <PrimaryButton accent={ACC} onClick={() => window.location.reload()}>Done</PrimaryButton>
      <SecondaryButton onClick={again}>Combine another backup</SecondaryButton>
    </Card>
  )
}
