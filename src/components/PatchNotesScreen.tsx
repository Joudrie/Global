import { useEffect, useState } from "react"
import { CHANGELOG } from "../data/changelog"
import { REGISTRY } from "../ui/registry"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { LineIcon } from "./icons"
import { gameFor, groupPatches, itemGame, loadSeen, markAllSeen, plural, shortDate, unseenFlags } from "../utils/patchNotes"

// Screens an entry can link to: everything opened by its id (not the quiz launches).
const LINKABLE = REGISTRY.filter(r => !r.action)

function NewLabel({ text = "New" }: { text?: string }) {
  return (
    <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1,
      padding: "4px 8px", borderRadius: 999, color: T.warm, background: tint(T.warm, 0.1), border: `1px solid ${tint(T.warm, 0.35)}` }}>
      {text}
    </span>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span className="codex-chev" aria-hidden style={{ transform: open ? "rotate(90deg)" : "none" }}>
      <LineIcon name="chevronright" size={16} color={T.dim} />
    </span>
  )
}

/* ── Patch notes: the changelog grouped by day, newest first. Everything
   starts closed: tap a day to see its list of updates, tap an update to read
   what changed. Days and updates the player hadn't read when the screen
   opened say New, and opening it counts as reading them all. A bullet that
   starts with a game's name ("Flag Bracket: …") links to that game. ───── */
const SUPPORT_HREF = "mailto:sjoudrie@gmail.com?subject=" + encodeURIComponent("Globalio: support or feature request") +
  "&body=" + encodeURIComponent("Something's not working, or a feature I'd like:\n\n")

export default function PatchNotesScreen({ onBack, onPlay }: { onBack: () => void; onPlay: (id: string) => void }) {
  const [unseen] = useState(() => unseenFlags(CHANGELOG, loadSeen()))
  useEffect(() => { markAllSeen(CHANGELOG) }, [])
  const patches = groupPatches(CHANGELOG)
  const [openDays, setOpenDays] = useState<Set<string>>(() => new Set())
  const [openEntries, setOpenEntries] = useState<Set<number>>(() => new Set())
  const flip = <K,>(set: Set<K>, k: K) => { const next = new Set(set); if (!next.delete(k)) next.add(k); return next }
  const fresh = unseen.filter(Boolean).length

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <ScreenHeader title="Patch notes" onBack={onBack}
        subtitle={fresh ? `${plural(fresh, "update")} you haven't read` : "Every change to Globalio, newest first"} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 16px 40px" }}>
        {/* Contact support or ask for a feature — opens the mail app */}
        <a href={SUPPORT_HREF} className="geo-tap"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, padding: "12px 16px", borderRadius: 12,
            background: ACCENT.play, color: T.onAccent, textDecoration: "none", fontFamily: FONT.display, fontWeight: 700, fontSize: 15 }}>
          <LineIcon name="mail" size={16} color={T.onAccent} strokeWidth={1.8} /> Contact support or request a feature
        </a>
        {patches.map(p => {
          const open = openDays.has(p.date)
          const newHere = p.entries.filter(e => unseen[e.index]).length
          return (
            <section key={p.date} className="geo-note" style={{ borderRadius: 12, overflow: "hidden" }}>
              <h2 style={{ margin: 0 }}>
                <button onClick={() => setOpenDays(s => flip(s, p.date))} aria-expanded={open} aria-controls={`patch-${p.date}`} className="geo-row"
                  style={{ width: "100%", minHeight: 52, display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", border: "none", textAlign: "left", cursor: "pointer" }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="geo-display" style={{ fontWeight: 700, fontSize: 16, color: T.text }}>{shortDate(p.date)}</span>
                    <span style={{ fontFamily: FONT.mono, fontWeight: 400, fontSize: 12, color: T.muted }}> · {plural(p.entries.length, "update")}</span>
                  </span>
                  {newHere > 0 && !open && <NewLabel text={`${newHere} new`} />}
                  <Chevron open={open} />
                </button>
              </h2>

              {open && (
                <ul id={`patch-${p.date}`} style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {p.entries.map(({ entry, index }) => {
                    const expanded = openEntries.has(index)
                    const game = gameFor(entry.title, LINKABLE)
                    return (
                      <li key={index} style={{ borderTop: `1px solid ${T.line}` }}>
                        <button onClick={() => setOpenEntries(s => flip(s, index))} aria-expanded={expanded} className="geo-row"
                          style={{ width: "100%", minHeight: 48, display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", border: "none", textAlign: "left", cursor: "pointer" }}>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: T.text }}>{entry.title}</span>
                          {unseen[index] && <NewLabel />}
                          <Chevron open={expanded} />
                        </button>
                        {expanded && (
                          <div style={{ padding: "0 16px 16px" }}>
                            <ul style={{ listStyle: "disc", margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 8,
                              color: T.muted, fontSize: 13, lineHeight: 1.55 }}>
                              {entry.items.map((item, k) => {
                                const about = itemGame(item, LINKABLE)
                                if (!about) return <li key={k}>{item}</li>
                                return (
                                  <li key={k}>
                                    <strong style={{ color: T.text, fontWeight: 600 }}>{about.name}:</strong> {about.rest}{" "}
                                    <button onClick={() => onPlay(about.game.id)} className="geo-tap"
                                      aria-label={`${about.game.tool || about.game.tab === "you" ? "Open" : "Play"} ${about.game.title}`}
                                      style={{ display: "inline", padding: 0, border: "none", background: "none", cursor: "pointer",
                                        fontWeight: 600, fontSize: 13, color: ACCENT[about.game.accent], textDecoration: "underline" }}>
                                      {about.game.tool || about.game.tab === "you" ? "Open" : "Play"}<span aria-hidden> →</span>
                                    </button>
                                  </li>
                                )
                              })}
                            </ul>
                            {game && (
                              <button onClick={() => onPlay(game.id)} className="geo-tap"
                                style={{ marginTop: 12, minHeight: 36, display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: 999,
                                  fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: ACCENT[game.accent],
                                  background: tint(ACCENT[game.accent], 0.1), border: `1px solid ${tint(ACCENT[game.accent], 0.4)}`, cursor: "pointer" }}>
                                {game.tool || game.tab === "you" ? "Open" : "Play"} {game.title} <span aria-hidden>→</span>
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}

        <p style={{ margin: "8px 0 0", textAlign: "center", fontSize: 12, color: T.muted }}>
          Every update on one page: <a href="/whats-new/" style={{ color: T.text, fontWeight: 600, textDecoration: "underline" }}>What's new</a>
        </p>
      </div>
    </div>
  )
}
