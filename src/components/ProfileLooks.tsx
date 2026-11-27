import { useEffect, useRef, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { createPortal } from "react-dom"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { LineIcon } from "./icons"
import Avatar, { DesignImage } from "./Avatar"
import { BadgeChip, cardData, fmt } from "./ProfileView"
import type { ProfileViewData } from "./ProfileView"
import { bannerUri } from "../profile/banners"
import { ACHIEVEMENTS, achievementById } from "../data/achievements"
import type { Achievement } from "../data/achievements"
import { bestsList, CROWN_COUNT } from "../profile/stats"
import { MAX_PINNED } from "../profile/local"
import { profileLink } from "../profile/link"
import type { Look } from "../profile/look"

/* Three compact profile layouts on trial (?look=a|b|c, see src/profile/look.ts),
   each used for your own profile and, read-only, for anyone else's:
   A "His sketch": slim banner, picture over its edge, small Edit, three
       pinned slots, one quiet stats line, a strip of published flags, then
       achievements as small badges.
   B "Tabs": a compact header, then Flags · Achievements · Stats, one at a time.
   C "Grid": picture and three counts, a slim Edit bar, pinned badges, then
       Flags | Achievements over a square grid.
   Small type from the app's ramp, the 4px scale, the parchment palette, line
   icons only. Hover changes colour and border only; the sheets fade in only
   when motion is welcome (index.css → .look-sheet). */

export interface LookData extends ProfileViewData {
  /** @username, when it isn't already the name. */
  handle: string | null
  /** { achievement id: unlock time }. */
  unlocks: Record<string, number>
  /** `unlocks` holds every one unlocked, so the rest are truly locked (another
   *  player's profile carries only their newest 20). */
  allKnown: boolean
  designs: (string | Record<string, unknown>)[]
}

export interface OwnControls {
  onEdit: () => void
  onPin: (pinned: string[]) => void
  onMakeFlag: () => void
  /** Pick saved designs to show (opens Edit profile at them). */
  onChooseFlags: () => void
  /** Saved Flag Studio designs exist (so there's something to choose). */
  hasDesigns: boolean
}

// ── Small parts ─────────────────────────────────────────────────────────────

const dateText = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
const plural = (n: number, one: string, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`

/** A 44px tap target around a small face (pill or circle). Hover: colour and border only. */
function Hit({ onClick, label, children, disabled, busy, pressed, style }: {
  onClick: () => void; label?: string; children: ReactNode; disabled?: boolean; busy?: boolean; pressed?: boolean; style?: CSSProperties
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} disabled={disabled} aria-busy={busy || undefined} aria-pressed={pressed}
      className="look-hit" style={{ minWidth: 44, minHeight: 44, padding: 0, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "transparent", border: "none", cursor: disabled ? "not-allowed" : busy ? "wait" : "pointer", ...style }}>
      {children}
    </button>
  )
}

const pillFace: CSSProperties = {
  height: 32, padding: "0 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
  fontSize: 13, fontWeight: 600, color: T.text, background: T.surface, border: `1px solid ${T.line}`,
}

/** The small "Edit profile" pill. */
export function EditPill({ onClick, text = "Edit profile" }: { onClick: () => void; text?: string }) {
  return <Hit onClick={onClick}><span className="look-face" style={pillFace}>{text}</span></Hit>
}

/** A small round icon button (save card, share link). */
export function IconPill({ icon, label, onClick, busy }: { icon: string; label: string; onClick: () => void; busy?: boolean }) {
  return (
    <Hit onClick={onClick} label={label} busy={busy} disabled={busy}>
      <span className="look-face" title={label} style={{ ...pillFace, width: 32, padding: 0, justifyContent: "center" }}>
        <LineIcon name={icon} size={16} color={busy ? T.dim : T.muted} />
      </span>
    </Hit>
  )
}

/** A quiet note at the bottom of the screen for a few seconds ("Card saved…"). */
function Said({ text, error }: { text: string; error?: boolean }) {
  return createPortal(
    <div role="status" aria-live="polite" style={{ position: "fixed", left: 0, right: 0, bottom: 96, zIndex: 70, display: "flex", justifyContent: "center", padding: "0 16px", pointerEvents: "none" }}>
      {text && <span className="look-sheet" style={{ maxWidth: 360, padding: "8px 12px", borderRadius: 12, fontSize: 13, lineHeight: 1.4, background: T.surface, color: error ? T.danger : T.text, border: `1px solid ${T.line}`, boxShadow: "0 8px 20px -14px rgba(31,58,60,0.25)" }}>{text}</span>}
    </div>,
    document.body,
  )
}

/** Save a profile's card as a picture: the same card as "Save my card". */
export function CardTool({ data, link }: { data: ProfileViewData; link: string }) {
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState("")
  useEffect(() => {
    if (!said || busy) return
    const t = window.setTimeout(() => setSaid(""), 3500)
    return () => window.clearTimeout(t)
  }, [said, busy])
  const save = async () => {
    if (busy) return
    setBusy(true); setSaid("Making the card…")
    try {
      const m = await import("../profile/saveCard")
      const picture = data.picture?.kind === "design" ? { kind: "design" as const, design: data.picture.design } : data.picture
      const how = await m.saveProfileCard(cardData(data, link), data.banner, picture, m.cardFileName(data.name))
      setSaid(how === "saved" ? "Card saved to your downloads." : how === "shared" ? "Card shared." : "")
    } catch {
      setSaid("Couldn’t make the card. Try again.")
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <IconPill icon="download" label={busy ? "Making the card…" : "Save the profile card"} onClick={save} busy={busy} />
      <Said text={said} error={said.startsWith("Couldn")} />
    </>
  )
}

/** Share (or copy) a public profile's link. */
export function ShareTool({ username }: { username: string }) {
  const [said, setSaid] = useState("")
  useEffect(() => {
    if (!said) return
    const t = window.setTimeout(() => setSaid(""), 3000)
    return () => window.clearTimeout(t)
  }, [said])
  const share = async () => {
    const link = profileLink(username, window.location.origin, window.location.pathname)
    try {
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
      if (typeof nav.share === "function" && window.matchMedia?.("(pointer: coarse)").matches) await nav.share({ url: link, title: `${username} on Globalio` })
      else { await navigator.clipboard.writeText(link); setSaid("Link copied.") }
    } catch { /* cancelled, or the clipboard is blocked */ }
  }
  return (
    <>
      <IconPill icon="share" label="Share profile link" onClick={() => void share()} />
      <Said text={said} />
    </>
  )
}

function Banner({ id, height }: { id: string; height: number }) {
  return <div aria-hidden style={{ height, borderRadius: 12, background: `${T.void} url("${bannerUri(id)}") center / cover no-repeat`, border: `1px solid ${T.line}` }} />
}

/** The picture with a ring in the page colour, so it sits cleanly over the banner. */
function Picture({ data, size }: { data: LookData; size: number }) {
  return (
    <span style={{ display: "inline-flex", padding: 4, borderRadius: "50%", background: T.bg, flexShrink: 0 }}>
      <Avatar source={data.picture} size={size} label={`${data.name}’s picture`} />
    </span>
  )
}

function BadgeFace({ a, size, unlocked, dashedPlus }: { a?: Achievement; size: number; unlocked: boolean; dashedPlus?: boolean }) {
  if (dashedPlus) return (
    <span className="look-face" style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px dashed ${T.lineHi}`, background: "transparent" }}>
      <LineIcon name="plus" size={Math.round(size * 0.42)} color={T.muted} />
    </span>
  )
  return (
    <span className="look-face" style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      ...(unlocked ? { background: tint(T.gold, 0.12), border: `1px solid ${tint(T.gold, 0.45)}` } : { border: `1px dashed ${T.lineHi}`, opacity: 0.55 }) }}>
      <LineIcon name={a?.icon ?? "lock"} size={Math.round(size * 0.46)} color={unlocked ? T.gold : T.dim} />
    </span>
  )
}

/** The three pinned slots. Your own empty ones are dashed "+" (tap to pin);
 *  on anyone else's profile empty slots aren't drawn. */
function PinnedSlots({ data, own, size, onOpen, onAdd, labels }: {
  data: LookData; own?: OwnControls; size: number; onOpen: (id: string) => void; onAdd: () => void; labels?: boolean
}) {
  const slots = Array.from({ length: MAX_PINNED }, (_, i) => data.pinned[i] ?? null).filter((id, i) => id || (own && i >= data.pinned.length))
  if (!slots.length) return null
  return (
    <ul aria-label="Pinned badges" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: labels ? 8 : 0 }}>
      {slots.map((id, i) => {
        const a = id ? achievementById(id) : undefined
        const face = <BadgeFace a={a} size={size} unlocked={!!a} dashedPlus={!a} />
        return (
          <li key={id ?? `empty-${i}`} style={labels ? { width: 64, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 } : undefined}>
            {a
              ? <Hit onClick={() => onOpen(a.id)} label={`Pinned badge: ${a.title}`}>{face}</Hit>
              : <Hit onClick={onAdd} label="Pin a badge">{face}</Hit>}
            {labels && (
              <span style={{ fontSize: 11, lineHeight: 1.3, color: a ? T.muted : T.dim, textAlign: "center", width: "100%", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflowWrap: "anywhere" }}>
                {a ? a.title : "Pin"}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Identity({ data, nameSize = 22 }: { data: LookData; nameSize?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <h2 className="geo-display" style={{ margin: 0, minWidth: 0, overflowWrap: "anywhere", color: T.text, fontWeight: 700, fontSize: nameSize, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{data.name}</h2>
      {data.handle && <div style={{ fontSize: 13, color: T.muted, overflowWrap: "anywhere" }}>@{data.handle}</div>}
      {data.badge && <div><BadgeChip text={data.badge} /></div>}
      <div style={{ fontSize: 13, lineHeight: 1.5, color: T.muted }}>
        <span style={{ color: ACCENT.learn, fontWeight: 600 }}>{data.rank}</span>
        {data.since && <> · Playing since {data.since}</>}
      </div>
      {data.bio && <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: 1.5, color: T.text, overflowWrap: "anywhere" }}>{data.bio}</p>}
    </div>
  )
}

function statsLine(d: LookData): string {
  const parts = [plural(d.stats.flags, "flag") + " learned"]
  if (d.streak > 0) parts.push(`${fmt(d.streak)}-day streak`)
  if (d.stats.crowns > 0) parts.push(plural(d.stats.crowns, "crown"))
  return parts.join(" · ")
}

function SectionHead({ title, count, action }: { title: string; count?: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}>
      <h3 className="geo-display" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>{title}</h3>
      {count && <span style={{ fontSize: 13, color: T.muted, fontVariantNumeric: "tabular-nums" }}>{count}</span>}
      <span style={{ flex: 1 }} />
      {action}
    </div>
  )
}

function TextLink({ children, onClick, label }: { children: ReactNode; onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="look-link"
      style={{ minHeight: 44, padding: "0 4px", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: ACCENT.learn, background: "transparent", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
      {children}
    </button>
  )
}

function Thumb({ design, i, style }: { design: string | Record<string, unknown>; i: number; style?: CSSProperties }) {
  return (
    <span style={{ display: "block", aspectRatio: "3 / 2", borderRadius: 4, overflow: "hidden", border: `1px solid ${T.line}`, background: T.surfaceHi, ...style }}>
      <DesignImage design={design} alt={`Published flag ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
    </span>
  )
}

function EmptyFlags({ own }: { own?: OwnControls }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 4, fontSize: 14, color: T.muted }}>
      <span>No published flags yet.</span>
      {own && (own.hasDesigns
        ? <TextLink onClick={own.onChooseFlags}>Choose from your designs</TextLink>
        : <TextLink onClick={own.onMakeFlag}>Make one in Flag Studio</TextLink>)}
    </div>
  )
}

/** A row of thumbnails that scrolls sideways, ending in "See all". */
function FlagStrip({ data, own, onAll }: { data: LookData; own?: OwnControls; onAll: () => void }) {
  if (!data.designs.length) return <EmptyFlags own={own} />
  const shown = data.designs.slice(0, 12)
  return (
    <ul aria-label="Published flags" className="carto-rail" style={{ listStyle: "none", margin: 0, padding: "0 0 4px", display: "flex", gap: 8, overflowX: "auto", scrollSnapType: "x mandatory" }}>
      {shown.map((d, i) => (
        <li key={i} style={{ flex: "0 0 64px", scrollSnapAlign: "start" }}>
          <button type="button" onClick={onAll} aria-label={`Published flag ${i + 1}: see all`} className="look-hit"
            style={{ display: "block", width: "100%", padding: 0, background: "transparent", border: "none", cursor: "pointer" }}>
            <Thumb design={d} i={i} />
          </button>
        </li>
      ))}
      <li style={{ flex: "0 0 64px", scrollSnapAlign: "start" }}>
        <button type="button" onClick={onAll} className="look-hit"
          style={{ width: "100%", aspectRatio: "3 / 2", padding: 0, background: "transparent", border: "none", cursor: "pointer" }}>
          <span className="look-face" style={{ width: "100%", height: "100%", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 2, fontSize: 12, fontWeight: 600, color: ACCENT.learn, border: `1px solid ${T.line}`, background: T.surface }}>
            See all <LineIcon name="chevronright" size={12} color={ACCENT.learn} />
          </span>
        </button>
      </li>
    </ul>
  )
}

interface Badge { a: Achievement; at: number | null }

function badgesOf(d: LookData): { list: Badge[]; unlocked: number } {
  const done = ACHIEVEMENTS.filter(a => d.unlocks[a.id]).sort((x, y) => d.unlocks[y.id] - d.unlocks[x.id])
  const locked = d.allKnown ? ACHIEVEMENTS.filter(a => !d.unlocks[a.id]) : []
  return {
    list: [...done.map(a => ({ a, at: d.unlocks[a.id] })), ...locked.map(a => ({ a, at: null }))],
    unlocked: Math.max(done.length, d.stats.achievements),
  }
}

/** Small round badges: unlocked first, newest first; locked ones faded. */
function BadgeGrid({ badges, size = 36, cols = 6, onOpen }: { badges: Badge[]; size?: number; cols?: number; onOpen: (id: string) => void }) {
  return (
    <ul aria-label="Achievements" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, rowGap: 4, columnGap: 0, justifyItems: "center" }}>
      {badges.map(({ a, at }) => (
        <li key={a.id}>
          <Hit onClick={() => onOpen(a.id)} label={`${a.title}${at ? "" : " (locked)"}`}>
            <BadgeFace a={a} size={size} unlocked={!!at} />
          </Hit>
        </li>
      ))}
    </ul>
  )
}

/** Square cells for the Grid layout: a badge and its name. */
function BadgeSquares({ badges, onOpen }: { badges: Badge[]; onOpen: (id: string) => void }) {
  return (
    <ul aria-label="Achievements" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4 }}>
      {badges.map(({ a, at }) => (
        <li key={a.id}>
          <button type="button" onClick={() => onOpen(a.id)} aria-label={`${a.title}${at ? "" : " (locked)"}`} className="look-row"
            style={{ width: "100%", aspectRatio: "1 / 1", padding: 8, borderRadius: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
              background: T.surfaceHi, border: `1px solid ${T.line}`, cursor: "pointer", opacity: at ? 1 : 0.6 }}>
            <BadgeFace a={a} size={36} unlocked={!!at} />
            <span style={{ fontSize: 11, lineHeight: 1.3, fontWeight: 600, color: at ? T.text : T.dim, textAlign: "center", width: "100%", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflowWrap: "anywhere" }}>{a.title}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

// ── Sheets ──────────────────────────────────────────────────────────────────

/** A small sheet from the bottom of the screen: focus moves in, Escape or a
 *  tap outside closes it, focus goes back. No ads, ever. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const head = useRef<HTMLHeadingElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null
    head.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close.current() }
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("keydown", onKey); back?.focus?.() }
  }, [])
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 65, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div aria-hidden onClick={() => close.current()} style={{ position: "absolute", inset: 0, background: tint(T.text, 0.32) }} />
      <div role="dialog" aria-modal="true" aria-labelledby="look-sheet-title" className="look-sheet"
        style={{ position: "relative", width: "100%", maxWidth: 720, margin: "0 auto", maxHeight: "80vh", overflowY: "auto", padding: "8px 16px calc(24px + env(safe-area-inset-bottom, 0px))",
          background: T.surface, borderTop: `1px solid ${T.line}`, borderRadius: "16px 16px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 id="look-sheet-title" ref={head} tabIndex={-1} className="geo-display" style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 17, fontWeight: 700, color: T.text, outline: "none", overflowWrap: "anywhere" }}>{title}</h2>
          <IconPill icon="close" label="Close" onClick={() => close.current()} />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

function AchievementSheet({ id, data, own, onClose }: { id: string; data: LookData; own?: OwnControls; onClose: () => void }) {
  const a = achievementById(id)
  if (!a) return null
  const at = data.unlocks[id] ?? null
  const pinned = data.pinned.includes(id)
  const full = !pinned && data.pinned.length >= MAX_PINNED
  return (
    <Sheet title={a.title} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingTop: 8 }}>
        <BadgeFace a={a} size={48} unlocked={!!at} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: T.text }}>{a.how}</p>
          <p style={{ margin: 0, fontSize: 13, color: at ? T.green : T.muted }}>
            {at ? `Unlocked ${dateText(at)}` : data.allKnown ? "Not unlocked yet" : "Not on this profile"}
            <span style={{ color: T.dim }}> · {a.group}</span>
          </p>
        </div>
      </div>
      {own && at && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8 }}>
          <Hit onClick={() => own.onPin(pinned ? data.pinned.filter(x => x !== id) : [...data.pinned, id].slice(0, MAX_PINNED))} disabled={full} pressed={pinned}>
            <span className="look-face" style={{ ...pillFace, color: full ? T.dim : pinned ? T.onAccent : T.text, background: pinned ? T.gold : T.surface, borderColor: pinned ? T.gold : T.line }}>
              <LineIcon name="pushpin" size={14} color={full ? T.dim : pinned ? T.onAccent : T.muted} />{pinned ? "Pinned" : "Pin to profile"}
            </span>
          </Hit>
          {full && <span style={{ fontSize: 13, color: T.muted }}>Unpin one first (up to {MAX_PINNED}).</span>}
        </div>
      )}
    </Sheet>
  )
}

function PinPicker({ data, own, onClose }: { data: LookData; own: OwnControls; onClose: () => void }) {
  const done = ACHIEVEMENTS.filter(a => data.unlocks[a.id]).sort((x, y) => data.unlocks[y.id] - data.unlocks[x.id])
  return (
    <Sheet title="Pin a badge" onClose={onClose}>
      <p style={{ margin: "4px 0 8px", fontSize: 13, lineHeight: 1.5, color: T.muted }}>
        {done.length ? `Pinned badges show on your profile and card, up to ${MAX_PINNED}.` : "Nothing to pin yet. Finish a Daily Game to unlock “First expedition”, then pin it here."}
      </p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {done.map((a, i) => {
          const on = data.pinned.includes(a.id)
          const full = !on && data.pinned.length >= MAX_PINNED
          return (
            <li key={a.id} style={{ borderTop: i ? `1px solid ${T.line}` : "none" }}>
              <button type="button" aria-pressed={on} disabled={full} className="look-row"
                onClick={() => {
                  if (on) own.onPin(data.pinned.filter(x => x !== a.id))
                  else { own.onPin([...data.pinned, a.id].slice(0, MAX_PINNED)); onClose() }
                }}
                style={{ width: "100%", minHeight: 52, display: "flex", alignItems: "center", gap: 12, padding: "4px 8px", textAlign: "left", background: "transparent", border: "1px solid transparent", borderRadius: 8, cursor: full ? "not-allowed" : "pointer", opacity: full ? 0.5 : 1 }}>
                <BadgeFace a={a} size={32} unlocked />
                <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: T.text, overflowWrap: "anywhere" }}>{a.title}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: on ? T.gold : T.muted }}>{on ? "Pinned" : full ? "Full" : "Pin"}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}

/** Every published flag, bigger: a plain full-screen page with Done. */
function FlagsPage({ data, own, onClose }: { data: LookData; own?: OwnControls; onClose: () => void }) {
  const head = useRef<HTMLHeadingElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null
    head.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close.current() }
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("keydown", onKey); back?.focus?.() }
  }, [])
  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="look-flags-title"
      style={{ position: "fixed", inset: 0, zIndex: 60, background: T.bg, display: "flex", flexDirection: "column", maxWidth: 720, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px 8px 16px", borderBottom: `1px solid ${T.line}` }}>
        <h2 id="look-flags-title" ref={head} tabIndex={-1} className="geo-display" style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 20, fontWeight: 700, color: T.text, outline: "none", overflowWrap: "anywhere" }}>
          Published flags <span style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 600, color: T.muted }}>{data.designs.length}</span>
        </h2>
        <EditPill text="Done" onClick={() => close.current()} />
      </header>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: T.muted, overflowWrap: "anywhere" }}>Flag Studio designs {own ? "you show" : `${data.name} shows`} on {own ? "your" : "their"} profile.</p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {data.designs.map((d, i) => <li key={i}><Thumb design={d} i={i} style={{ borderRadius: 8 }} /></li>)}
        </ul>
        {own && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {own.hasDesigns && <TextLink onClick={() => { close.current(); own.onChooseFlags() }}>Choose which to show</TextLink>}
            <TextLink onClick={() => { close.current(); own.onMakeFlag() }}>Make a new one</TextLink>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ── The three layouts ───────────────────────────────────────────────────────

interface Ctx {
  data: LookData
  own?: OwnControls
  tools: ReactNode
  openBadge: (id: string) => void
  openPicker: () => void
  openFlags: () => void
}

/** A: the owner's sketch. */
function LookA({ data, own, tools, openBadge, openPicker, openFlags }: Ctx) {
  const [allBadges, setAllBadges] = useState(false)
  const { list, unlocked } = badgesOf(data)
  const FOLD = 12
  return (
    <section aria-label={`Profile: ${data.name}`} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ position: "relative" }}>
          <Banner id={data.banner} height={96} />
          <div style={{ position: "absolute", top: 4, right: 4, display: "flex", alignItems: "center" }}>
            {own && <EditPill onClick={own.onEdit} />}
            {tools}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "0 0 0 8px" }}>
          <div style={{ marginTop: -40 }}><Picture data={data} size={72} /></div>
          <div style={{ paddingTop: 4, minWidth: 0 }}>
            <PinnedSlots data={data} own={own} size={36} onOpen={openBadge} onAdd={openPicker} />
          </div>
        </div>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          <Identity data={data} />
          <div style={{ fontSize: 13, color: T.muted, fontVariantNumeric: "tabular-nums" }}>{statsLine(data)}</div>
        </div>
      </div>

      <div>
        <SectionHead title="Published flags" count={data.designs.length ? String(data.designs.length) : undefined}
          action={data.designs.length > 0 ? <TextLink onClick={openFlags}>See all</TextLink> : undefined} />
        <FlagStrip data={data} own={own} onAll={openFlags} />
      </div>

      <div>
        <SectionHead title="Achievements" count={`${unlocked} of ${ACHIEVEMENTS.length}`}
          action={list.length > FOLD ? <TextLink onClick={() => setAllBadges(v => !v)}>{allBadges ? "Show fewer" : "See all"}</TextLink> : undefined} />
        {list.length
          ? <BadgeGrid badges={allBadges ? list : list.slice(0, FOLD)} onOpen={openBadge} />
          : <p style={{ margin: 0, fontSize: 14, color: T.muted }}>No achievements yet.</p>}
      </div>
    </section>
  )
}

type BTab = "flags" | "achievements" | "stats"

function StatRows({ data }: { data: LookData }) {
  const s = data.stats
  const rows: [string, string][] = [
    ["Flags learned", `${fmt(s.flags)} of ${fmt(s.flagsOf)}`],
    ["Day streak", fmt(data.streak)],
    ["Best streak", fmt(s.bestStreak)],
    ["Crowns", `${s.crowns} of ${CROWN_COUNT}`],
    ["Daily Games", fmt(s.dailies)],
    ["Games played", fmt(s.games)],
    ["Gacha flags", fmt(s.collection)],
  ]
  const bests = bestsList(s)
  const row = (label: string, value: string, i: number, icon?: string) => (
    <li key={label} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 40, borderTop: i ? `1px solid ${T.line}` : "none" }}>
      {icon && <LineIcon name={icon} size={16} color={T.muted} />}
      <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: T.text, overflowWrap: "anywhere" }}>{label}</span>
      <span style={{ fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontSize: 15, fontWeight: 600, color: T.text, whiteSpace: "nowrap" }}>{value}</span>
    </li>
  )
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <ul aria-label="Stats" style={{ listStyle: "none", margin: 0, padding: 0 }}>{rows.map(([l, v], i) => row(l, v, i))}</ul>
      {bests.length > 0 && (
        <>
          <h4 style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 600, color: T.muted }}>Best scores</h4>
          <ul aria-label="Best scores" style={{ listStyle: "none", margin: 0, padding: 0 }}>{bests.map((b, i) => row(b.title, fmt(b.value), i, b.id))}</ul>
        </>
      )}
    </div>
  )
}

/** B: a compact header, then one section at a time. */
function LookB({ data, own, tools, openBadge, openPicker, openFlags }: Ctx) {
  const [tab, setTab] = useState<BTab>("flags")
  const { list, unlocked } = badgesOf(data)
  const tabs: [BTab, string][] = [["flags", "Flags"], ["achievements", "Achievements"], ["stats", "Stats"]]
  const GRID = 9
  return (
    <section aria-label={`Profile: ${data.name}`} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Banner id={data.banner} height={64} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, paddingLeft: 8 }}>
          <div style={{ marginTop: -32 }}><Picture data={data} size={56} /></div>
          <div style={{ display: "flex", alignItems: "center", paddingTop: 4 }}>
            {own && <EditPill onClick={own.onEdit} text="Edit" />}
            {tools}
          </div>
        </div>
        <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
          <Identity data={{ ...data, bio: "" }} />
          <div style={{ marginLeft: -4 }}><PinnedSlots data={data} own={own} size={28} onOpen={openBadge} onAdd={openPicker} /></div>
          {data.bio && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: T.text, overflowWrap: "anywhere" }}>{data.bio}</p>}
        </div>
      </div>

      <div role="tablist" aria-label="Profile sections" style={{ display: "flex", padding: 4, gap: 4, borderRadius: 12, background: T.surfaceHi, border: `1px solid ${T.line}` }}>
        {tabs.map(([id, label]) => {
          const on = tab === id
          return (
            <button key={id} id={`look-b-${id}`} role="tab" type="button" aria-selected={on} aria-controls="look-b-panel" onClick={() => setTab(id)} className={on ? undefined : "look-row"}
              style={{ flex: 1, minWidth: 0, minHeight: 36, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                color: on ? T.text : T.muted, background: on ? T.surface : "transparent", border: `1px solid ${on ? T.lineHi : "transparent"}` }}>
              {label}
            </button>
          )
        })}
      </div>

      <div id="look-b-panel" role="tabpanel" aria-labelledby={`look-b-${tab}`}>
        {tab === "flags" && (data.designs.length === 0 ? <EmptyFlags own={own} /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <ul aria-label="Published flags" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {data.designs.slice(0, GRID).map((d, i) => <li key={i}><Thumb design={d} i={i} /></li>)}
            </ul>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <TextLink onClick={openFlags}>{data.designs.length > GRID ? `See all ${data.designs.length}` : "See all"}</TextLink>
            </div>
          </div>
        ))}
        {tab === "achievements" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 13, color: T.muted }}>{unlocked} of {ACHIEVEMENTS.length} unlocked</div>
            {list.length ? <BadgeGrid badges={list} onOpen={openBadge} /> : <p style={{ margin: 0, fontSize: 14, color: T.muted }}>No achievements yet.</p>}
          </div>
        )}
        {tab === "stats" && <StatRows data={data} />}
      </div>
    </section>
  )
}

/** Under 360px wide the Grid layout's picture shrinks so three counts fit beside it. */
function useNarrow(): boolean {
  const query = "(max-width: 359px)"
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(query).matches)
  useEffect(() => {
    const m = window.matchMedia?.(query)
    if (!m) return
    const on = () => setNarrow(m.matches)
    m.addEventListener?.("change", on)
    return () => m.removeEventListener?.("change", on)
  }, [])
  return narrow
}

/** C: Instagram-like. */
function LookC({ data, own, tools, openBadge, openPicker }: Ctx) {
  const narrow = useNarrow()
  const [tab, setTab] = useState<"flags" | "achievements">("flags")
  const { list, unlocked } = badgesOf(data)
  const grid = useRef<HTMLDivElement>(null)
  const show = (t: "flags" | "achievements") => { setTab(t); grid.current?.scrollIntoView({ block: "nearest" }) }
  const count = (n: number, label: string, onClick?: () => void) => {
    const body = (
      <>
        <span style={{ fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 17, color: T.text, lineHeight: 1.2 }}>{fmt(n)}</span>
        <span style={{ fontSize: narrow ? 11 : 12, color: T.muted, lineHeight: 1.3, textAlign: "center" }}>{label}</span>
      </>
    )
    const box: CSSProperties = { flex: 1, minWidth: 0, minHeight: 44, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 0, padding: "4px 0", borderRadius: 8 }
    return onClick
      ? <button type="button" onClick={onClick} className="look-row" style={{ ...box, background: "transparent", border: "1px solid transparent", cursor: "pointer" }}>{body}</button>
      : <div style={{ ...box, border: "1px solid transparent" }}>{body}</div>
  }
  const tabs: ["flags" | "achievements", string, string][] = [["flags", "Flags", "grid"], ["achievements", "Achievements", "award"]]
  return (
    <section aria-label={`Profile: ${data.name}`} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Avatar source={data.picture} size={narrow ? 56 : 80} label={`${data.name}’s picture`} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 8 }}>
          {count(data.stats.flags, "Flags learned")}
          {count(unlocked, "Achievements", () => show("achievements"))}
          {count(data.designs.length, "Published", () => show("flags"))}
        </div>
      </div>
      {own ? <Identity data={data} /> : (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
          <div style={{ flex: 1, minWidth: 0 }}><Identity data={data} /></div>
          <div style={{ display: "flex", flexShrink: 0, marginTop: -8, marginRight: -6 }}>{tools}</div>
        </div>
      )}
      {own && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button type="button" onClick={own.onEdit} className="look-row"
            style={{ flex: 1, minWidth: 0, height: 32, borderRadius: 8, fontSize: 13, fontWeight: 600, color: T.text, background: T.surface, border: `1px solid ${T.line}`, cursor: "pointer", margin: "6px 0" }}>
            Edit profile
          </button>
          <div style={{ display: "flex", marginRight: -6 }}>{tools}</div>
        </div>
      )}
      <PinnedSlots data={data} own={own} size={44} onOpen={openBadge} onAdd={openPicker} labels />

      <div ref={grid} style={{ display: "flex", flexDirection: "column", gap: 4, scrollMarginTop: 8 }}>
        <div role="tablist" aria-label="Profile sections" style={{ display: "flex", borderBottom: `1px solid ${T.line}` }}>
          {tabs.map(([id, label, icon]) => {
            const on = tab === id
            return (
              <button key={id} id={`look-c-${id}`} role="tab" type="button" aria-selected={on} aria-controls="look-c-panel" onClick={() => setTab(id)}
                style={{ flex: 1, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  color: on ? T.text : T.muted, background: "transparent", border: "none", borderBottom: `2px solid ${on ? T.text : "transparent"}`, marginBottom: -1 }}>
                <LineIcon name={icon} size={16} color={on ? T.text : T.muted} />{label}
              </button>
            )
          })}
        </div>
        <div id="look-c-panel" role="tabpanel" aria-labelledby={`look-c-${tab}`} style={{ paddingTop: 4 }}>
          {tab === "flags" && (data.designs.length === 0 ? <EmptyFlags own={own} /> : (
            <ul aria-label="Published flags" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4 }}>
              {data.designs.map((d, i) => (
                <li key={i} style={{ aspectRatio: "1 / 1", borderRadius: 4, overflow: "hidden", background: T.surfaceHi, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
                  <DesignImage design={d} alt={`Published flag ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                </li>
              ))}
            </ul>
          ))}
          {tab === "achievements" && (list.length ? <BadgeSquares badges={list} onOpen={openBadge} /> : <p style={{ margin: 0, fontSize: 14, color: T.muted }}>No achievements yet.</p>)}
        </div>
      </div>
    </section>
  )
}

/** One profile in the chosen layout, with its sheets (badge detail, pin
 *  picker, all flags). `own` adds the edit controls; without it, read-only. */
export default function ProfileLook({ look, data, own, tools }: { look: Look; data: LookData; own?: OwnControls; tools: ReactNode }) {
  const [badge, setBadge] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [flags, setFlags] = useState(false)
  const ctx: Ctx = { data, own, tools, openBadge: setBadge, openPicker: () => setPicking(true), openFlags: () => setFlags(true) }
  return (
    <>
      {look === "a" && <LookA {...ctx} />}
      {look === "b" && <LookB {...ctx} />}
      {look === "c" && <LookC {...ctx} />}
      {badge && <AchievementSheet id={badge} data={data} own={own} onClose={() => setBadge(null)} />}
      {picking && own && <PinPicker data={data} own={own} onClose={() => setPicking(false)} />}
      {flags && <FlagsPage data={data} own={own} onClose={() => setFlags(false)} />}
    </>
  )
}

/** Another player's profile (or the sample) as LookData. */
export function lookFromView(view: ProfileViewData, opts: { handle?: string | null; unlocks?: Record<string, number> } = {}): LookData {
  const unlocks = opts.unlocks ?? Object.fromEntries(view.activity)
  return {
    ...view,
    handle: opts.handle ?? null,
    unlocks,
    allKnown: Object.keys(unlocks).length >= view.stats.achievements,
    designs: view.designs ?? [],
  }
}

/** Another player's profile in a trial layout: read-only, with share and save card. */
export function PlayerLook({ look, view, username, link }: { look: Look; view: ProfileViewData; username: string; link: string }) {
  return <ProfileLook look={look} data={lookFromView(view)} tools={<><ShareTool username={username} /><CardTool data={view} link={link} /></>} />
}
