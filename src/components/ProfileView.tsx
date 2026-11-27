import { useEffect, useId, useRef, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { createPortal } from "react-dom"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { LineIcon, CrownIcon, FlameIcon } from "./icons"
import Avatar, { DesignImage } from "./Avatar"
import type { AvatarSource } from "./Avatar"
import FlagImage from "./FlagImage"
import { BANNER_TAN, FLAG_WASH, bannerFlag, bannerUri } from "../profile/banners"
import { ACHIEVEMENTS, achievementById } from "../data/achievements"
import type { Achievement } from "../data/achievements"
import { bestsList, CROWN_COUNT, shownStreak } from "../profile/stats"
import type { ProfileStats } from "../profile/stats"
import type { CardData } from "../profile/card"
import { MAX_PINNED, monthName } from "../profile/local"
import { profileLink } from "../profile/link"
import type { PlayerProfile } from "../account/profiles"
import { todayString } from "../utils/prng"

/* The profile, laid out the same for the player's own and, read-only, for
   anyone else's: a slim banner with Edit profile and the save-card button on
   it, the picture over its edge, three pinned slots (your own empty ones are
   dashed "+" to pin), the name, rank and bio, three counts (flags learned,
   achievements, published flags; the last two jump to their section), a quiet
   streak line, a sideways strip of published flags with See all, then the
   achievements as small badges with a detail sheet.

   Small type from the app's ramp, the 4px scale, the parchment palette, line
   icons only. Hover changes colour and border only; sheets fade in, and the
   counts scroll smoothly, only when motion is welcome (index.css → .pf-*). */

export interface ProfileData {
  name: string
  /** @username, when it isn't already the name. */
  handle: string | null
  badge: string | null
  rank: string
  /** "November 2026", or null. */
  since: string | null
  bio: string
  banner: string
  picture: AvatarSource
  pinned: string[]
  stats: ProfileStats
  /** The streak as of today (0 once it has lapsed). */
  streak: number
  designs: (string | Record<string, unknown>)[]
  /** { achievement id: unlock time }. */
  unlocks: Record<string, number>
  /** `unlocks` holds every one unlocked, so the rest are truly locked (another
   *  player's profile carries only their newest 20). */
  allKnown: boolean
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

/** Another player's profile (or the sample one) as the profile shows it. */
export function playerData(p: PlayerProfile, opts: { name?: string; unlocks?: Record<string, number> } = {}): ProfileData {
  const unlocks = opts.unlocks ?? Object.fromEntries(p.stats.activity)
  return {
    name: opts.name ?? p.username,
    handle: opts.name ? p.username : null,
    badge: p.badge,
    rank: rankFor(p.stats.flags),
    since: monthName(p.stats.since) ?? monthName(p.createdAt?.slice(0, 7)),
    bio: p.bio,
    banner: p.banner,
    picture: p.picture,
    pinned: p.pinned,
    stats: p.stats,
    streak: shownStreak(p.stats, todayString()),
    designs: p.designs,
    unlocks,
    allKnown: Object.keys(unlocks).length >= p.stats.achievements,
  }
}

// ── Words and numbers ───────────────────────────────────────────────────────

// Explorer titles, earned by flags learned. Just a nicer word under the name.
const RANKS: { min: number; title: string }[] = [
  { min: 195, title: "Atlas Incarnate" },
  { min: 130, title: "Master Cartographer" },
  { min: 80, title: "Seasoned Navigator" },
  { min: 40, title: "Wayfinder" },
  { min: 10, title: "Apprentice Cartographer" },
  { min: 0, title: "Armchair Traveller" },
]
export const rankFor = (learned: number) => RANKS.find(r => learned >= r.min)!.title

const nf = new Intl.NumberFormat("en-US")
export const fmt = (n: number) => nf.format(n)
const dateText = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

/** The stat tiles on the saved card. */
export function statTiles(s: ProfileStats, streak: number) {
  return [
    { label: "Crowns", value: s.crowns, of: CROWN_COUNT },
    { label: "Day streak", value: streak },
    { label: "Best streak", value: s.bestStreak },
    { label: "Daily Games", value: s.dailies },
    { label: "Games played", value: s.games },
    { label: "Gacha flags", value: s.collection },
  ]
}

/** What the saved card shows, from a profile. */
export function cardData(d: ProfileData, link: string): CardData {
  return {
    name: d.name, badge: d.badge, rank: d.rank, since: d.since, bio: d.bio,
    flags: d.stats.flags, flagsOf: d.stats.flagsOf,
    tiles: statTiles(d.stats, d.streak).map(t => ({ label: t.of ? `${t.label} of ${t.of}` : t.label, value: t.value })),
    bests: bestsList(d.stats).map(b => ({ title: b.title, value: b.value })),
    pinned: d.pinned, link,
  }
}

/** The link printed on a card: always the real site (a card saved on the test
 *  site or a dev server still points people to globalio.app), plus the
 *  profile's own link when it is public. */
export function cardLink(username: string | null): string {
  return username ? `globalio.app/?u=${username}` : "globalio.app"
}

// ── Small parts ─────────────────────────────────────────────────────────────

export function BadgeChip({ text }: { text: string }) {
  return (
    <span style={{ display: "inline-block", maxWidth: "100%", overflowWrap: "anywhere", fontSize: 11, fontWeight: 600, lineHeight: 1.4, padding: "2px 8px", borderRadius: 999,
      color: T.gold, background: tint(T.gold, 0.12), border: `1px solid ${tint(T.gold, 0.35)}` }}>{text}</span>
  )
}

/** A 44px tap target around a small face (pill or circle). Hover: colour and border only. */
function Hit({ onClick, label, children, disabled, busy, pressed, style }: {
  onClick: () => void; label?: string; children: ReactNode; disabled?: boolean; busy?: boolean; pressed?: boolean; style?: CSSProperties
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} disabled={disabled} aria-busy={busy || undefined} aria-pressed={pressed}
      className="pf-hit" style={{ minWidth: 44, minHeight: 44, padding: 0, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "transparent", border: "none", cursor: disabled ? "not-allowed" : busy ? "wait" : "pointer", ...style }}>
      {children}
    </button>
  )
}

const pillFace: CSSProperties = {
  height: 32, padding: "0 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
  fontSize: 13, fontWeight: 600, color: T.text, background: T.surface, border: `1px solid ${T.line}`,
}

/** The small "Edit profile" pill ("Edit" on a narrow phone, so it keeps clear of the banner's motif). */
function EditPill({ onClick, text }: { onClick: () => void; text?: string }) {
  return (
    <Hit onClick={onClick} label={text ? undefined : "Edit profile"}>
      <span className="pf-face" style={pillFace}>
        {text ?? <><span className="pf-wide">Edit profile</span><span aria-hidden className="pf-narrow">Edit</span></>}
      </span>
    </Hit>
  )
}

/** A small round icon button (save card, share link, close). */
function IconPill({ icon, label, onClick, busy }: { icon: string; label: string; onClick: () => void; busy?: boolean }) {
  return (
    <Hit onClick={onClick} label={label} busy={busy} disabled={busy}>
      <span className="pf-face" title={label} style={{ ...pillFace, width: 32, padding: 0, justifyContent: "center" }}>
        <LineIcon name={icon} size={16} color={busy ? T.dim : T.muted} />
      </span>
    </Hit>
  )
}

/** A quiet note at the bottom of the screen for a few seconds ("Card saved…"). */
function Said({ text, error }: { text: string; error?: boolean }) {
  return createPortal(
    <div role="status" aria-live="polite" style={{ position: "fixed", left: 0, right: 0, bottom: 96, zIndex: 70, display: "flex", justifyContent: "center", padding: "0 16px", pointerEvents: "none" }}>
      {text && <span className="pf-sheet" style={{ maxWidth: 360, padding: "8px 12px", borderRadius: 12, fontSize: 13, lineHeight: 1.4, background: T.surface, color: error ? T.danger : T.text, border: `1px solid ${T.line}`, boxShadow: `0 8px 20px -14px ${tint(T.text, 0.25)}` }}>{text}</span>}
    </div>,
    document.body,
  )
}

/** Save a profile's card as a picture (banner, picture, badges and stats). */
export function CardTool({ data, link }: { data: ProfileData; link: string }) {
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

/** A banner's art filling its box: a preset, or a flag under a light tan wash. */
export function BannerArt({ id, style }: { id: string; style?: CSSProperties }) {
  const flag = bannerFlag(id)
  if (flag) return (
    <div aria-hidden style={{ position: "relative", overflow: "hidden", background: BANNER_TAN, ...style }}>
      <FlagImage code={flag} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <span style={{ position: "absolute", inset: 0, background: FLAG_WASH }} />
    </div>
  )
  return <div aria-hidden style={{ background: `${BANNER_TAN} url("${bannerUri(id)}") center / cover no-repeat`, ...style }} />
}

/** The picture with a ring in the page colour, so it sits cleanly over the banner. */
export function RingedAvatar({ source, size, label }: { source: AvatarSource; size: number; label?: string }) {
  return (
    <span style={{ display: "inline-flex", padding: 4, borderRadius: "50%", background: T.bg, flexShrink: 0 }}>
      <Avatar source={source} size={size} label={label} />
    </span>
  )
}

function BadgeFace({ a, size, unlocked, dashedPlus }: { a?: Achievement; size: number; unlocked: boolean; dashedPlus?: boolean }) {
  if (dashedPlus) return (
    <span className="pf-face" style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px dashed ${T.lineHi}`, background: "transparent" }}>
      <LineIcon name="plus" size={Math.round(size * 0.42)} color={T.muted} />
    </span>
  )
  return (
    <span className="pf-face" style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      ...(unlocked ? { background: tint(T.gold, 0.12), border: `1px solid ${tint(T.gold, 0.45)}` } : { border: `1px dashed ${T.lineHi}`, opacity: 0.55 }) }}>
      <LineIcon name={a?.icon ?? "lock"} size={Math.round(size * 0.46)} color={unlocked ? T.gold : T.dim} />
    </span>
  )
}

/** The three pinned slots. Your own empty ones are dashed "+" (tap to pin);
 *  on anyone else's profile empty slots aren't drawn. */
function PinnedSlots({ data, own, size, onOpen, onAdd }: { data: ProfileData; own?: OwnControls; size: number; onOpen: (id: string) => void; onAdd: () => void }) {
  const slots = Array.from({ length: MAX_PINNED }, (_, i) => data.pinned[i] ?? null).filter((id, i) => id || (own && i >= data.pinned.length))
  if (!slots.length) return null
  return (
    <ul aria-label="Pinned badges" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex" }}>
      {slots.map((id, i) => {
        const a = id ? achievementById(id) : undefined
        return (
          <li key={id ?? `empty-${i}`}>
            {a
              ? <Hit onClick={() => onOpen(a.id)} label={`Pinned badge: ${a.title}`}><BadgeFace a={a} size={size} unlocked /></Hit>
              : <Hit onClick={onAdd} label="Pin a badge"><BadgeFace size={size} unlocked={false} dashedPlus /></Hit>}
          </li>
        )
      })}
    </ul>
  )
}

function Identity({ data }: { data: ProfileData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <h2 className="geo-display" style={{ margin: 0, minWidth: 0, overflowWrap: "anywhere", color: T.text, fontWeight: 700, fontSize: 22, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{data.name}</h2>
      {data.handle && <div style={{ fontSize: 13, color: T.muted, overflowWrap: "anywhere" }}>@{data.handle}</div>}
      {data.badge && <div><BadgeChip text={data.badge} /></div>}
      <div style={{ fontSize: 13, lineHeight: 1.5, color: T.muted, overflowWrap: "anywhere" }}>
        <span style={{ color: ACCENT.learn, fontWeight: 600 }}>{data.rank}</span>
        {data.since && <> · Playing since {data.since}</>}
      </div>
      {data.bio && <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: 1.5, color: T.text, overflowWrap: "anywhere" }}>{data.bio}</p>}
    </div>
  )
}

/** Three small counts. Achievements and Published jump to their section. */
function Counts({ data, achievements, onAchievements, onFlags }: { data: ProfileData; achievements: number; onAchievements: () => void; onFlags: () => void }) {
  const face = (n: number, label: string) => (
    <>
      <span style={{ fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 18, lineHeight: "24px", color: T.text, whiteSpace: "nowrap" }}>{fmt(n)}</span>
      <span className="pf-count-label" style={{ fontSize: 12, lineHeight: "16px", color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{label}</span>
    </>
  )
  const box: CSSProperties = { minWidth: 0, minHeight: 44, padding: "4px 0", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", textAlign: "left" }
  const tap = (n: number, label: string, onClick: () => void, to: string) => (
    <button type="button" onClick={onClick} aria-label={`${fmt(n)} ${label.toLowerCase()}: go to ${to}`} className="pf-count"
      style={{ ...box, background: "transparent", border: "none", cursor: "pointer" }}>
      {face(n, label)}
    </button>
  )
  return (
    <div role="group" aria-label="Counts" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", columnGap: 8 }}>
      <div style={box}>{face(data.stats.flags, "Flags learned")}</div>
      {tap(achievements, "Achievements", onAchievements, "achievements")}
      {tap(data.designs.length, "Published", onFlags, "published flags")}
    </div>
  )
}

/** The streak and crowns, quietly (nothing while both are 0). */
function Streak({ data }: { data: ProfileData }) {
  const crowns = data.stats.crowns
  if (data.streak <= 0 && crowns <= 0) return null
  const item = (icon: ReactNode, text: string) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      <span aria-hidden style={{ display: "flex" }}>{icon}</span>{text}
    </span>
  )
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 12, rowGap: 4, fontSize: 13, color: T.muted }}>
      {data.streak > 0 && item(<FlameIcon size={13} color={T.amber} strokeWidth={1.8} />, `${fmt(data.streak)}-day streak`)}
      {crowns > 0 && item(<CrownIcon size={13} color={T.gold} strokeWidth={1.8} />, `${crowns} of ${CROWN_COUNT} crowns`)}
    </div>
  )
}

function SectionHead({ id, title, count, action }: { id: string; title: string; count?: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}>
      <h3 id={id} tabIndex={-1} className="geo-display" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text, outline: "none" }}>{title}</h3>
      {count && <span style={{ fontSize: 13, color: T.muted, fontVariantNumeric: "tabular-nums" }}>{count}</span>}
      <span style={{ flex: 1 }} />
      {action}
    </div>
  )
}

function TextLink({ children, onClick, label }: { children: ReactNode; onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="pf-link"
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
function FlagStrip({ data, own, onAll }: { data: ProfileData; own?: OwnControls; onAll: () => void }) {
  if (!data.designs.length) return <EmptyFlags own={own} />
  const shown = data.designs.slice(0, 12)
  return (
    <ul aria-label="Published flags" className="carto-rail" style={{ listStyle: "none", margin: 0, padding: "0 0 4px", display: "flex", gap: 8, overflowX: "auto", scrollSnapType: "x mandatory" }}>
      {shown.map((d, i) => (
        <li key={i} style={{ flex: "0 0 64px", scrollSnapAlign: "start" }}>
          <button type="button" onClick={onAll} aria-label={`Published flag ${i + 1}: see all`} className="pf-hit"
            style={{ display: "block", width: "100%", padding: 0, background: "transparent", border: "none", cursor: "pointer" }}>
            <Thumb design={d} i={i} />
          </button>
        </li>
      ))}
      <li style={{ flex: "0 0 64px", scrollSnapAlign: "start" }}>
        <button type="button" onClick={onAll} className="pf-hit"
          style={{ width: "100%", aspectRatio: "3 / 2", padding: 0, background: "transparent", border: "none", cursor: "pointer" }}>
          <span className="pf-face" style={{ width: "100%", height: "100%", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 2, fontSize: 12, fontWeight: 600, color: ACCENT.learn, border: `1px solid ${T.line}`, background: T.surface }}>
            See all <LineIcon name="chevronright" size={12} color={ACCENT.learn} />
          </span>
        </button>
      </li>
    </ul>
  )
}

interface Badge { a: Achievement; at: number | null }

function badgesOf(d: ProfileData): { list: Badge[]; unlocked: number } {
  const done = ACHIEVEMENTS.filter(a => d.unlocks[a.id]).sort((x, y) => d.unlocks[y.id] - d.unlocks[x.id])
  const locked = d.allKnown ? ACHIEVEMENTS.filter(a => !d.unlocks[a.id]) : []
  return {
    list: [...done.map(a => ({ a, at: d.unlocks[a.id] })), ...locked.map(a => ({ a, at: null }))],
    unlocked: Math.max(done.length, d.stats.achievements),
  }
}

/** Small round badges: unlocked first, newest first; locked ones faded. */
function BadgeGrid({ badges, onOpen }: { badges: Badge[]; onOpen: (id: string) => void }) {
  return (
    <ul aria-label="Achievements" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", rowGap: 4, columnGap: 0, justifyItems: "center" }}>
      {badges.map(({ a, at }) => (
        <li key={a.id}>
          <Hit onClick={() => onOpen(a.id)} label={`${a.title}${at ? "" : " (locked)"}`}>
            <BadgeFace a={a} size={36} unlocked={!!at} />
          </Hit>
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
      <div role="dialog" aria-modal="true" aria-labelledby="pf-sheet-title" className="pf-sheet"
        style={{ position: "relative", width: "100%", maxWidth: 720, margin: "0 auto", maxHeight: "80vh", overflowY: "auto", padding: "8px 16px calc(24px + env(safe-area-inset-bottom, 0px))",
          background: T.surface, borderTop: `1px solid ${T.line}`, borderRadius: "16px 16px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 id="pf-sheet-title" ref={head} tabIndex={-1} className="geo-display" style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 17, fontWeight: 700, color: T.text, outline: "none", overflowWrap: "anywhere" }}>{title}</h2>
          <IconPill icon="close" label="Close" onClick={() => close.current()} />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

function AchievementSheet({ id, data, own, onClose }: { id: string; data: ProfileData; own?: OwnControls; onClose: () => void }) {
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
            <span className="pf-face" style={{ ...pillFace, color: full ? T.dim : pinned ? T.onAccent : T.text, background: pinned ? T.gold : T.surface, borderColor: pinned ? T.gold : T.line }}>
              <LineIcon name="pushpin" size={14} color={full ? T.dim : pinned ? T.onAccent : T.muted} />{pinned ? "Pinned" : "Pin to profile"}
            </span>
          </Hit>
          {full && <span style={{ fontSize: 13, color: T.muted }}>Unpin one first (up to {MAX_PINNED}).</span>}
        </div>
      )}
    </Sheet>
  )
}

function PinPicker({ data, own, onClose }: { data: ProfileData; own: OwnControls; onClose: () => void }) {
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
              <button type="button" aria-pressed={on} disabled={full} className="pf-row"
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
function FlagsPage({ data, own, onClose }: { data: ProfileData; own?: OwnControls; onClose: () => void }) {
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
    <div role="dialog" aria-modal="true" aria-labelledby="pf-flags-title"
      style={{ position: "fixed", inset: 0, zIndex: 60, background: T.bg, display: "flex", flexDirection: "column", maxWidth: 720, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px 8px 16px", borderBottom: `1px solid ${T.line}` }}>
        <h2 id="pf-flags-title" ref={head} tabIndex={-1} className="geo-display" style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 20, fontWeight: 700, color: T.text, outline: "none", overflowWrap: "anywhere" }}>
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

// ── The profile ─────────────────────────────────────────────────────────────

/** Scroll a section into view (smoothly, when motion is welcome) and move focus to its heading. */
function jumpTo(section: HTMLElement | null, headingId: string) {
  if (!section) return
  let smooth = true
  try { smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches } catch { /* old browser */ }
  section.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" })
  document.getElementById(headingId)?.focus({ preventScroll: true })
}

/** One profile, with its sheets (badge detail, pin picker, all flags).
 *  `own` adds the edit controls; without it, read-only. `tools` sit on the
 *  banner (save card; share link on someone else's). */
export default function ProfileView({ data, own, tools }: { data: ProfileData; own?: OwnControls; tools: ReactNode }) {
  const [badge, setBadge] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [flags, setFlags] = useState(false)
  const [allBadges, setAllBadges] = useState(false)
  const key = useId()
  const flagsRef = useRef<HTMLDivElement>(null)
  const badgesRef = useRef<HTMLDivElement>(null)
  const { list, unlocked } = badgesOf(data)
  const FOLD = 12
  const openFlags = () => setFlags(true)
  return (
    <section aria-label={`Profile: ${data.name}`} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ position: "relative" }}>
          <BannerArt id={data.banner} style={{ aspectRatio: "18 / 5", minHeight: 80, maxHeight: 132, borderRadius: 12, border: `1px solid ${T.line}` }} />
          <div style={{ position: "absolute", top: 4, right: 4, display: "flex", alignItems: "center" }}>
            {own && <EditPill onClick={own.onEdit} />}
            {tools}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "0 0 0 8px" }}>
          <div style={{ marginTop: -40 }}><RingedAvatar source={data.picture} size={72} label={`${data.name}’s picture`} /></div>
          <div style={{ paddingTop: 4, minWidth: 0 }}>
            <PinnedSlots data={data} own={own} size={36} onOpen={setBadge} onAdd={() => setPicking(true)} />
          </div>
        </div>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          <Identity data={data} />
          <Counts data={data} achievements={unlocked}
            onAchievements={() => jumpTo(badgesRef.current, `${key}-achievements`)}
            onFlags={() => jumpTo(flagsRef.current, `${key}-flags`)} />
          <Streak data={data} />
        </div>
      </div>

      <div ref={flagsRef} style={{ scrollMarginTop: 8 }}>
        <SectionHead id={`${key}-flags`} title="Published flags" count={data.designs.length ? String(data.designs.length) : undefined}
          action={data.designs.length > 0 ? <TextLink onClick={openFlags}>See all</TextLink> : undefined} />
        <FlagStrip data={data} own={own} onAll={openFlags} />
      </div>

      <div ref={badgesRef} style={{ scrollMarginTop: 8 }}>
        <SectionHead id={`${key}-achievements`} title="Achievements" count={`${unlocked} of ${ACHIEVEMENTS.length}`}
          action={list.length > FOLD ? <TextLink onClick={() => setAllBadges(v => !v)}>{allBadges ? "Show fewer" : "See all"}</TextLink> : undefined} />
        {list.length
          ? <BadgeGrid badges={allBadges ? list : list.slice(0, FOLD)} onOpen={setBadge} />
          : <p style={{ margin: 0, fontSize: 14, color: T.muted }}>No achievements yet.</p>}
      </div>

      {badge && <AchievementSheet id={badge} data={data} own={own} onClose={() => setBadge(null)} />}
      {picking && own && <PinPicker data={data} own={own} onClose={() => setPicking(false)} />}
      {flags && <FlagsPage data={data} own={own} onClose={() => setFlags(false)} />}
    </section>
  )
}
