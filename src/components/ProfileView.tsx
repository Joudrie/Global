import { useState } from "react"
import type { ReactNode } from "react"
import { T, ACCENT, FONT, tint } from "../ui/tokens"
import { LineIcon, CrownIcon, FlameIcon } from "./icons"
import Avatar from "./Avatar"
import type { AvatarSource } from "./Avatar"
import { DesignImage } from "./Avatar"
import { bannerUri } from "../profile/banners"
import { achievementById } from "../data/achievements"
import { bestsList, CROWN_COUNT } from "../profile/stats"
import type { ProfileStats } from "../profile/stats"
import type { CardData } from "../profile/card"
import { SecondaryButton } from "./gameUi"

/* One profile, laid out the same for the player's own and for anyone else's:
   the banner, the round picture over its edge, pinned badges on the right,
   name, badge and "Playing since", the bio, then the stats, best scores, the
   achievement activity and (on a public profile) the designs they show. It
   reads well in a screenshot. Edit controls come in through the slots. */

export interface ProfileViewData {
  name: string
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
  activity: [string, number][]
  designs?: (string | Record<string, unknown>)[]
}

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

function when(ms: number, now = Date.now()): string {
  const d = new Date(ms)
  const sameYear = d.getFullYear() === new Date(now).getFullYear()
  return d.toLocaleDateString("en-GB", sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" })
}

export function BadgeChip({ text }: { text: string }) {
  return (
    <span style={{ display: "inline-block", maxWidth: "100%", overflowWrap: "anywhere", fontSize: 11, fontWeight: 600, lineHeight: 1.4, padding: "2px 8px", borderRadius: 999,
      color: T.gold, background: tint(T.gold, 0.12), border: `1px solid ${tint(T.gold, 0.35)}` }}>{text}</span>
  )
}

export function PinnedBadge({ id, size = 40 }: { id: string; size?: number }) {
  const a = achievementById(id)
  if (!a) return null
  return (
    <span role="img" aria-label={`Badge: ${a.title}`} title={a.title}
      style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: tint(T.gold, 0.12), border: `1px solid ${tint(T.gold, 0.45)}` }}>
      <LineIcon name={a.icon} size={Math.round(size * 0.48)} color={T.gold} />
    </span>
  )
}

function Tile({ label, value, accent = T.text, icon }: { label: string; value: string; accent?: string; icon?: ReactNode }) {
  // Long numbers step the type down so they never spill out of the tile.
  const size = value.length > 7 ? 16 : value.length > 5 ? 19 : 22
  return (
    <div style={{ minWidth: 0, padding: "12px 12px 10px", borderRadius: 12, background: T.surfaceHi, border: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
        {icon}
        <span style={{ fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: size, lineHeight: 1.1, color: accent, letterSpacing: "-0.02em", overflowWrap: "anywhere" }}>{value}</span>
      </div>
      <div className="geo-micro" style={{ fontSize: 9, color: T.muted, marginTop: 4, lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}

export function statTiles(s: ProfileStats, streak: number) {
  return [
    { label: "Crowns", value: s.crowns, of: CROWN_COUNT },
    { label: "Day streak", value: streak },
    { label: "Best streak", value: s.bestStreak },
    { label: "Daily games", value: s.dailies },
    { label: "Games played", value: s.games },
    { label: "Gacha flags", value: s.collection },
  ]
}

/** What the saved card shows, from a profile. */
export function cardData(d: ProfileViewData, link: string): CardData {
  return {
    name: d.name, badge: d.badge, rank: d.rank, since: d.since, bio: d.bio,
    flags: d.stats.flags, flagsOf: d.stats.flagsOf,
    tiles: statTiles(d.stats, d.streak).map(t => ({ label: t.of ? `${t.label} of ${t.of}` : t.label, value: t.value })),
    bests: bestsList(d.stats).map(b => ({ title: b.title, value: b.value })),
    pinned: d.pinned, link,
  }
}

/** The link printed on a card: this site's address, and the profile's own
 *  link when it is public. */
export function cardLink(username: string | null): string {
  try {
    const host = window.location.host.replace(/^www\./, "")
    return username ? `${host}${window.location.pathname}?u=${username}` : host
  } catch { return "globalio.app" }
}

/** "Save my card": draws the profile as a picture and shares or downloads it. */
export function SaveCardButton({ data, link, label = "Save my card" }: { data: ProfileViewData; link: string; label?: string }) {
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState("")
  const save = async () => {
    if (busy) return
    setBusy(true); setSaid("")
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
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
      <SecondaryButton onClick={save} disabled={busy} aria-busy={busy} style={{ padding: "0 12px" }}>
        <LineIcon name="download" size={16} color={busy ? T.dim : T.muted} />
        {busy ? "Making card…" : label}
      </SecondaryButton>
      <div role="status" aria-live="polite" className="text-xs" style={{ color: said.startsWith("Couldn") ? T.danger : T.muted, minHeight: said ? undefined : 0 }}>{said}</div>
    </div>
  )
}

const Heading = ({ children }: { children: ReactNode }) => (
  <h3 className="geo-micro" style={{ margin: 0, fontSize: 10, color: T.muted, display: "flex", alignItems: "center", gap: 8 }}>
    <span aria-hidden style={{ width: 12, height: 1.5, background: T.muted, opacity: 0.7 }} />{children}
  </h3>
)

export default function ProfileView({ data, who, nameSlot, headerAction, actions, children, pinnedSlot }: {
  data: ProfileViewData
  /** How the activity list names the player: "You" or their username. */
  who: string
  /** Replaces the plain name (the own profile's editable name). */
  nameSlot?: ReactNode
  /** A small button on the banner (Edit). */
  headerAction?: ReactNode
  /** Buttons under the header (Edit profile, Save my card). */
  actions?: ReactNode
  /** Replaces the pinned badges (a hint to pin some, on the own profile). */
  pinnedSlot?: ReactNode
  /** More sections at the end (username, achievements). */
  children?: ReactNode
}) {
  const s = data.stats
  const pct = s.flagsOf ? Math.min(100, Math.round((s.flags / s.flagsOf) * 100)) : 0
  const bests = bestsList(s)
  const [allActivity, setAllActivity] = useState(false)
  const activity = data.activity.filter(([id]) => achievementById(id))
  const shown = allActivity ? activity : activity.slice(0, 5)

  return (
    <section aria-label={`Profile: ${data.name}`} style={{ borderRadius: 16, background: T.surface, border: `1px solid ${T.line}`, overflow: "hidden" }}>
      {/* Banner, with the picture over its bottom edge and pinned badges on the right */}
      <div style={{ position: "relative", aspectRatio: "3 / 1", maxHeight: 180, background: `${T.void} url("${bannerUri(data.banner)}") center / cover no-repeat`, borderBottom: `1px solid ${T.line}` }}>
        {headerAction && <div style={{ position: "absolute", top: 8, right: 8 }}>{headerAction}</div>}
      </div>
      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ marginTop: -44 }}>
            <Avatar source={data.picture} size={88} ring={4} label={`${data.name}’s picture`} />
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 12, minWidth: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {pinnedSlot ?? data.pinned.map(id => <PinnedBadge key={id} id={id} />)}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: -4 }}>
          {nameSlot ?? (
            <h2 className="geo-display" style={{ margin: 0, minWidth: 0, overflowWrap: "anywhere", color: T.text, fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{data.name}</h2>
          )}
          {data.badge && <div><BadgeChip text={data.badge} /></div>}
          <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.5 }}>
            <span style={{ color: ACCENT.learn, fontWeight: 600 }}>{data.rank}</span>
            {data.since && <> · Playing since {data.since}</>}
          </div>
          {data.bio && <p style={{ margin: "4px 0 0", color: T.text, fontSize: 14, lineHeight: 1.5, overflowWrap: "anywhere" }}>{data.bio}</p>}
        </div>

        {actions}

        {/* Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: 32, lineHeight: 1, color: T.text, letterSpacing: "-0.03em" }}>{fmt(s.flags)}</span>
              <span style={{ color: T.muted, fontSize: 13 }}>of {fmt(s.flagsOf)} flags learned · {pct}%</span>
            </div>
            <div role="img" aria-label={`${s.flags} of ${s.flagsOf} flags learned`} style={{ marginTop: 8, height: 6, borderRadius: 3, overflow: "hidden", background: tint(T.text, 0.08) }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: ACCENT.learn }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {statTiles(s, data.streak).map(t => (
              <Tile key={t.label} label={t.label} value={t.of ? `${t.value}/${t.of}` : fmt(t.value)}
                accent={t.label === "Crowns" ? T.gold : t.label === "Day streak" ? T.amber : T.text}
                icon={t.label === "Crowns" ? <CrownIcon size={13} color={T.gold} strokeWidth={1.7} /> : t.label === "Day streak" ? <FlameIcon size={13} color={T.amber} strokeWidth={1.7} /> : undefined} />
            ))}
          </div>
        </div>

        {bests.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Heading>Best scores</Heading>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
              {bests.map((b, i) => (
                <li key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: i ? `1px solid ${T.line}` : "none" }}>
                  <LineIcon name={b.id} size={16} color={T.muted} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: T.text, overflowWrap: "anywhere" }}>{b.title}</span>
                  <span style={{ fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 14, color: T.text }}>{fmt(b.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activity.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Heading>Activity</Heading>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
              {shown.map(([id, at], i) => {
                const a = achievementById(id)!
                return (
                  <li key={id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: i ? `1px solid ${T.line}` : "none" }}>
                    <LineIcon name={a.icon} size={16} color={T.gold} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.text, lineHeight: 1.4, overflowWrap: "anywhere" }}>
                      {who} unlocked <strong style={{ fontWeight: 600 }}>{a.title}</strong>
                    </span>
                    <span style={{ flexShrink: 0, fontSize: 12, color: T.dim, fontVariantNumeric: "tabular-nums" }}>{when(at)}</span>
                  </li>
                )
              })}
            </ul>
            {activity.length > 5 && (
              <button type="button" onClick={() => setAllActivity(v => !v)} className="text-xs font-semibold"
                style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 4px", color: ACCENT.learn, background: "transparent", border: "none", cursor: "pointer" }}>
                {allActivity ? "Show less" : `Show all ${activity.length}`}
              </button>
            )}
          </div>
        )}

        {data.designs && data.designs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Heading>Flag Studio designs</Heading>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 8 }}>
              {data.designs.map((d, i) => (
                <div key={i} style={{ aspectRatio: "3 / 2", borderRadius: 6, overflow: "hidden", border: `1px solid ${T.line}`, background: T.surfaceHi }}>
                  <DesignImage design={d} alt={`Design ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {children}
      </div>
    </section>
  )
}
