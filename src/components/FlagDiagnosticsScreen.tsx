import { useState } from "react"
import { FIXED_FLAGS, MISSING_FLAGS, RECENT_FLAGS } from "../data/flagDiagnostics"
import type { DiagFlag, MissingFlag } from "../data/flagDiagnostics"
import { HISTORY_NOTES } from "../data/historyNotes"
import type { HistoryNote } from "../data/historyNotes"
import { ADDED_FLAGS } from "../data/addedFlags"
import { STATE_CANDIDATES } from "../data/formerStatesCandidates"
import { fp } from "../data/flagUrl"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"

// Temporary QA screen (Settings → Flag Check).
//  • Fixed   – repaired dead links; every image should load.
//  • Missing – dead links with candidate guesses. Tap the correct flag(s), then
//              Submit to get a copy-paste block to send back for wiring in.
interface Props { onBack: () => void }

// ── Fixed tab tile ──────────────────────────────────────────────────────────
function FixedTile({ f }: { f: DiagFlag }) {
  const [state, setState] = useState<"loading" | "ok" | "err">("loading")
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderBottom: `1px solid ${T.line}` }}>
      <div style={{ width: 54, height: 36, flexShrink: 0, borderRadius: 4, overflow: "hidden", background: T.surfaceHi, display: "flex", alignItems: "center", justifyContent: "center", outline: state === "err" ? `2px solid ${T.danger}` : "none" }}>
        <img src={f.url} alt={f.label} loading="lazy" onLoad={() => setState("ok")} onError={() => setState("err")}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: state === "err" ? "none" : "block" }} />
        {state === "err" && <span style={{ fontSize: 16, fontWeight: 800, color: T.danger }}>✕</span>}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, color: T.text, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.label}</div>
        <div style={{ fontSize: 10, color: state === "ok" ? T.green : state === "err" ? T.danger : T.dim }}>
          {state === "ok" ? "loads ✓" : state === "err" ? "BROKEN" : "…"}
        </div>
      </div>
    </div>
  )
}

// ── Missing tab: tap-to-select candidates ──────────────────────────────────
function CandidateTile({ url, file, selected, onTap }: { url: string; file: string; selected: boolean; onTap: () => void }) {
  const [err, setErr] = useState(false)
  if (err) return null
  return (
    <button onClick={onTap} style={{
      width: 104, flexShrink: 0, padding: 0, border: "none", background: "none", cursor: "pointer", textAlign: "left",
    }}>
      <div style={{
        width: 104, height: 70, borderRadius: 6, overflow: "hidden", position: "relative",
        background: T.surfaceHi, display: "flex", alignItems: "center", justifyContent: "center",
        outline: selected ? `3px solid ${T.green}` : `1px solid ${T.line}`,
      }}>
        <img src={url} alt={file} loading="lazy" onError={() => setErr(true)}
          style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        {selected && (
          <div style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: 999, background: T.green, color: T.onAccent, fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>
        )}
      </div>
      <div style={{ fontSize: 9, color: selected ? T.green : T.muted, marginTop: 2, lineHeight: 1.2, wordBreak: "break-word" }}>{file}</div>
    </button>
  )
}

// ── Notes tab: history-flag candidate with a live preview ───────────────────
function NoteRow({ n }: { n: HistoryNote }) {
  const [state, setState] = useState<"loading" | "ok" | "err">(n.candidate ? "loading" : "err")
  const url = n.candidate ? fp(n.candidate) : null
  return (
    <div style={{ display: "flex", gap: 11, padding: "10px 12px", borderBottom: `1px solid ${T.line}` }}>
      <div style={{ width: 66, height: 44, flexShrink: 0, borderRadius: 5, overflow: "hidden", background: T.surfaceHi, border: `1px solid ${state === "err" ? tint(T.danger, 0.5) : T.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {url && state !== "err" && (
          <img src={url} alt="" loading="lazy" onLoad={() => setState("ok")} onError={() => setState("err")}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: state === "ok" ? "block" : "none" }} />
        )}
        {state !== "ok" && (
          <span style={{ fontSize: 8.5, color: T.dim, textAlign: "center", lineHeight: 1.25, padding: 2 }}>
            {state === "loading" ? "…" : n.candidate ? "won't\nload" : "no file\nyet"}
          </span>
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, color: T.text, fontWeight: 700 }}>{n.country}</span>
          <span style={{ fontSize: 10.5, color: T.muted }}>{n.era}</span>
          <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, color: n.status === "to-verify" ? T.amber : T.dim, border: `1px solid ${tint(n.status === "to-verify" ? T.amber : T.dim, 0.4)}`, borderRadius: 999, padding: "2px 7px", whiteSpace: "nowrap" }}>
            {n.status}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: T.muted, lineHeight: 1.45 }}>{n.detail}</div>
        {n.candidate && <div style={{ fontFamily: FONT.mono, fontSize: 10, color: state === "ok" ? T.green : ACCENT.codex, marginTop: 4, wordBreak: "break-all" }}>{state === "ok" ? "✓ " : ""}{n.candidate}</div>}
      </div>
    </div>
  )
}

function MissingRow({ f, sel, toggle }: { f: MissingFlag; sel: Set<string>; toggle: (file: string) => void }) {
  return (
    <div style={{ padding: "8px 10px", borderBottom: `1px solid ${T.line}` }}>
      <div style={{ fontSize: 13, color: T.text, fontWeight: 600, marginBottom: 5 }}>{f.label}</div>
      {f.cands.length === 0
        ? <div style={{ fontSize: 11, color: T.danger }}>no candidate found — needs a filename</div>
        : <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {f.cands.map((c) => (
              <CandidateTile key={c.file} url={c.url} file={c.file}
                selected={sel.has(c.file)} onTap={() => toggle(c.file)} />
            ))}
          </div>}
    </div>
  )
}

// Resolve an addedFlags `file` (self-hosted path or Wikimedia name) to a URL.
const addedUrl = (file: string) => file.startsWith("/") || file.startsWith("http") ? file : fp(file)

// One combined list: today's predecessor adds, the former-state references, and
// every repaired/recently-fixed link — all things that should simply load.
const ALL_FLAGS: DiagFlag[] = [
  ...ADDED_FLAGS.map((a) => ({ label: `${a.country} · ${a.era}`, url: addedUrl(a.file) })),
  ...STATE_CANDIDATES.map((s) => ({ label: `${s.name} · ${s.region}`, url: addedUrl(s.file) })),
  ...RECENT_FLAGS,
  ...FIXED_FLAGS,
]

export default function FlagDiagnosticsScreen({ onBack }: Props) {
  const [tab, setTab] = useState<"flags" | "missing" | "notes">("flags")
  // selections: arg -> set of chosen candidate filenames
  const [picks, setPicks] = useState<Record<string, Set<string>>>({})
  const [submitText, setSubmitText] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const toggle = (arg: string, file: string) =>
    setPicks((prev) => {
      const next = { ...prev }
      const s = new Set(next[arg] ?? [])
      s.has(file) ? s.delete(file) : s.add(file)
      if (s.size) next[arg] = s
      else delete next[arg]
      return next
    })

  const count = Object.values(picks).reduce((n, s) => n + s.size, 0)

  const buildSubmit = () => {
    const lines = ["=== FLAG PICKS ==="]
    for (const f of MISSING_FLAGS) {
      const s = picks[f.arg]
      if (s && s.size) for (const file of s) lines.push(`${f.arg}  =>  ${file}`)
    }
    const text = lines.join("\n")
    setSubmitText(text)
    setCopied(false)
    navigator.clipboard?.writeText(text).then(() => setCopied(true)).catch(() => {})
  }

  return (
    <div style={{ position: "fixed", inset: 0, maxWidth: 720, margin: "0 auto", background: T.bg, color: T.text, zIndex: 1, display: "flex", flexDirection: "column" }}>
      <ScreenHeader title="Dev test list" subtitle="Developer use only" onBack={onBack} />
      <div style={{ display: "flex", gap: 6, padding: "0 12px 10px" }}>
        {([["flags", `Flags (${ALL_FLAGS.length})`], ["missing", `Missing (${MISSING_FLAGS.length})`], ["notes", `Notes (${HISTORY_NOTES.length})`]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
            background: tab === id ? ACCENT.codex : T.surface, color: tab === id ? T.onAccent : T.muted,
            border: `1px solid ${tab === id ? ACCENT.codex : T.line}`,
          }}>{label}</button>
        ))}
      </div>
      <div style={{ padding: "0 12px 8px", fontSize: 11, color: T.muted, lineHeight: 1.4 }}>
        {tab === "flags"
          ? "Every flag wired into the Codex this round — predecessor adds, former-state references, and repaired links — in one list. Each should show “loads ✓”. Colonial entries intentionally show the ruling country's own flag (France, Portugal, the Union Jack…). Tell me if any looks wrong."
          : tab === "missing"
          ? "Tap the correct flag(s) for each entry (pick more than one if several are right). Then hit Submit at the bottom and send me the copied text."
          : "Historical-flag candidates from the Codex sweep that weren't added yet — couldn't verify the filename, or it's ambiguous whether it belongs. A running to-do, not bugs."}
      </div>

      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", paddingBottom: tab === "missing" ? 72 : 0 }}>
        {tab === "flags"
          ? ALL_FLAGS.map((f, i) => <FixedTile key={"f" + i} f={f} />)
          : tab === "missing"
          ? MISSING_FLAGS.map((f, i) => <MissingRow key={"m" + i} f={f} sel={picks[f.arg] ?? new Set()} toggle={(file) => toggle(f.arg, file)} />)
          : HISTORY_NOTES.map((n, i) => <NoteRow key={"n" + i} n={n} />)}
      </div>

      {tab === "missing" && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 10, background: tint(T.bg, 0.95), borderTop: `1px solid ${T.line}`, backdropFilter: "blur(6px)" }}>
          <button onClick={buildSubmit} disabled={count === 0} style={{
            width: "100%", padding: "12px 0", borderRadius: 12, fontSize: 14, fontWeight: 700,
            cursor: count ? "pointer" : "default",
            background: count ? T.green : T.surface, color: count ? T.onAccent : T.dim,
            border: `1px solid ${count ? T.green : T.line}`,
          }}>{count ? `Submit ${count} pick${count > 1 ? "s" : ""}` : "Tap flags to select"}</button>
        </div>
      )}

      {submitText !== null && (
        <div onClick={() => setSubmitText(null)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, width: "100%", maxWidth: 460, maxHeight: "80%", display: "flex", flexDirection: "column" }}>
            <div style={{ color: copied ? T.green : T.text, fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{copied ? "✓ Copied — paste it to me" : "Copy this and paste it to me"}</div>
            <textarea readOnly value={submitText} style={{ flex: 1, minHeight: 160, fontFamily: FONT.mono, fontSize: 11, padding: 10, borderRadius: 8, border: `1px solid ${T.line}`, background: T.surfaceHi, color: T.text, resize: "none" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => { navigator.clipboard?.writeText(submitText).then(() => setCopied(true)) }} style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontWeight: 700, border: "none", background: T.green, color: T.onAccent, cursor: "pointer" }}>Copy</button>
              <button onClick={() => setSubmitText(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontWeight: 700, border: `1px solid ${T.line}`, background: "transparent", color: T.muted, cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
