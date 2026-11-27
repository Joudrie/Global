import { useEffect, useMemo, useReducer, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { ReactNode } from "react"
import { T, ACCENT, tint } from "../ui/tokens"
import { PrimaryButton, SecondaryButton } from "./gameUi"
import { LineIcon, SearchIcon } from "./icons"
import FlagImage from "./FlagImage"
import { DesignImage, avatarFor } from "./Avatar"
import { BannerArt, RingedAvatar } from "./ProfileView"
import { FLAGS } from "../data/flags"
import { BANNERS, bannerFlag, flagBanner } from "../profile/banners"
import { MAX_DESIGNS, PROFILE_EVENT, readProfile, saveProfile } from "../profile/local"
import { offeredDesigns, hasUpload } from "../profile/public"
import { gameSnapshot } from "../utils/backup"
import { bioLength, bioProblem, cleanBio, BIO_MAX, BIO_MESSAGE } from "../profile/text"

/* "Edit profile": name and username (passed in as `top`), then a preview of
   the banner and picture, the picture (any country's flag or one of your
   Flag Studio designs; no photo uploads), the banner (a flag-inspired preset
   on the site's tan, or any country's flag), the bio, and which designs show
   under Published flags. Every choice is saved on this device straight away;
   the bio when you press Save. A full-screen sheet with no ads, closed with
   Done or Escape. */

const Section = ({ title, children, note, action }: { title: string; children: ReactNode; note?: ReactNode; action?: ReactNode }) => (
  <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 24 }}>
      <h3 className="geo-display" style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>{title}</h3>
      {action}
    </div>
    {note && <p className="text-xs" style={{ margin: 0, color: T.muted, lineHeight: 1.6 }}>{note}</p>}
    {children}
  </section>
)

const choice = (on: boolean) => ({
  borderRadius: 8, padding: 0, overflow: "hidden", cursor: "pointer", background: T.surfaceHi,
  border: `2px solid ${on ? ACCENT.learn : T.line}`,
} as const)

const SmallLink = ({ children, onClick, color = ACCENT.learn }: { children: ReactNode; onClick: () => void; color?: string }) => (
  <button type="button" onClick={onClick} className="pf-link"
    style={{ minHeight: 44, margin: "-10px 0", padding: "0 4px", fontSize: 13, fontWeight: 600, color, background: "transparent", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
    {children}
  </button>
)

/** Search every country's flag and pick one, in a short box that scrolls. */
function FlagPicker({ chosen, onPick, label }: { chosen: string | null; onPick: (code: string) => void; label: string }) {
  const [q, setQ] = useState("")
  const query = q.trim().toLowerCase()
  const flags = query ? FLAGS.filter(f => f.name.toLowerCase().includes(query) || f.code.toLowerCase() === query) : FLAGS
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ position: "relative" }}>
        <span aria-hidden style={{ position: "absolute", left: 12, top: 13, display: "flex" }}><SearchIcon size={18} color={T.muted} strokeWidth={1.7} /></span>
        <input type="search" className="pf-input" value={q} onChange={e => setQ(e.target.value)} aria-label={`Search countries for your ${label}`} placeholder="Search countries"
          autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          style={{ width: "100%", height: 44, padding: "0 12px 0 40px", borderRadius: 10, fontSize: 16, background: T.surface, border: `1px solid ${T.line}`, color: T.text }} />
      </div>
      {flags.length === 0
        ? <p className="text-xs" style={{ margin: 0, color: T.muted, overflowWrap: "anywhere" }}>No country matches “{q.trim()}”.</p>
        : (
          <div style={{ maxHeight: 196, overflowY: "auto", padding: 8, borderRadius: 10, background: T.surface, border: `1px solid ${T.line}` }}>
            <div role="group" aria-label={`Flags for your ${label}`} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(66px, 1fr))", gap: 8 }}>
              {flags.map(f => {
                const on = chosen === f.code
                return (
                  <button key={f.code} type="button" aria-pressed={on} aria-label={f.name} title={f.name} onClick={() => onPick(f.code)}
                    className="geo-row" style={{ ...choice(on), aspectRatio: "3 / 2" }}>
                    <FlagImage code={f.code} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </button>
                )
              })}
            </div>
          </div>
        )}
    </div>
  )
}

export default function ProfileEditor({ onClose, publicOn, top, startAt }: {
  onClose: () => void
  /** Public profiles are on (the notes say who sees what). */
  publicOn: boolean
  /** Sections first: the name and (while profiles are on) the username. */
  top?: ReactNode
  /** Open scrolled to the designs to show ("Choose from your designs"). */
  startAt?: "designs"
}) {
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  const profile = readProfile()
  const snap = useMemo(() => gameSnapshot(), [])
  const designs = useMemo(() => offeredDesigns(snap), [snap])
  const [tab, setTab] = useState<"flag" | "design">(profile.picture?.kind === "design" ? "design" : "flag")
  const bannerCode = bannerFlag(profile.banner)
  const [anyFlag, setAnyFlag] = useState(false)
  const [bio, setBio] = useState(profile.bio)
  const [bioSaid, setBioSaid] = useState("")
  const [failed, setFailed] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const designsRef = useRef<HTMLDivElement>(null)
  // The parent hands a new onClose on every render (a saved choice, a name, a
  // sync re-renders it). Read it through a ref so this setup runs once: re-running
  // it moved the focus to the heading (and scrolled back to the designs) after
  // every pick and while typing.
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null
    heading.current?.focus()
    if (startAt === "designs") designsRef.current?.scrollIntoView({ block: "start" })
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close.current() }
    document.addEventListener("keydown", onKey)
    window.addEventListener(PROFILE_EVENT, refresh)
    const body = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      window.removeEventListener(PROFILE_EVENT, refresh)
      document.body.style.overflow = body
      back?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = (patch: Parameters<typeof saveProfile>[0]) => setFailed(!saveProfile(patch))
  const bioClean = cleanBio(bio)
  const bioBad = bioProblem(bio)
  const bioChanged = bioClean !== profile.bio
  const pictureFlag = profile.picture?.kind === "flag" ? profile.picture.code : null

  // On <body>: the You tab's own transform would otherwise pin the sheet to the tab.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="profile-editor-title"
      style={{ position: "fixed", inset: 0, zIndex: 60, background: T.bg, display: "flex", flexDirection: "column", maxWidth: 720, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${T.line}`, background: T.bg }}>
        <h2 id="profile-editor-title" ref={heading} tabIndex={-1} className="geo-display"
          style={{ flex: 1, margin: 0, fontSize: 20, fontWeight: 700, color: T.text, outline: "none" }}>Edit profile</h2>
        <PrimaryButton accent={ACCENT.learn} onClick={() => close.current()} style={{ width: "auto", height: 44 }}>Done</PrimaryButton>
      </header>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 16px 48px", display: "flex", flexDirection: "column", gap: 24 }}>
        {failed && <p role="alert" className="text-xs" style={{ margin: 0, color: T.danger }}>Couldn’t save on this device: its storage is full or blocked.</p>}
        {top}

        {/* What the top of your profile looks like now */}
        <div aria-label="Preview" role="img" style={{ display: "flex", flexDirection: "column" }}>
          <BannerArt id={profile.banner} style={{ aspectRatio: "18 / 5", minHeight: 72, maxHeight: 112, borderRadius: 12, border: `1px solid ${T.line}` }} />
          <div style={{ marginTop: -32, paddingLeft: 8 }}><RingedAvatar source={avatarFor(profile.picture, snap)} size={56} /></div>
        </div>

        <Section title="Picture" note="Any country’s flag, or one of your Flag Studio designs."
          action={profile.picture ? <SmallLink color={T.danger} onClick={() => save({ picture: null })}>Remove</SmallLink> : undefined}>
          <div role="tablist" aria-label="Picture" style={{ display: "flex", padding: 4, gap: 4, borderRadius: 12, background: T.surfaceHi, border: `1px solid ${T.line}` }}>
            {([["flag", "Country flag"], ["design", "My designs"]] as const).map(([id, label]) => {
              const on = tab === id
              return (
                <button key={id} role="tab" type="button" aria-selected={on} onClick={() => setTab(id)} className={on ? undefined : "pf-row"}
                  style={{ flex: 1, minWidth: 0, minHeight: 44, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    color: on ? T.text : T.muted, background: on ? T.surface : "transparent", border: `1px solid ${on ? T.lineHi : "transparent"}` }}>
                  {label}
                </button>
              )
            })}
          </div>
          {tab === "flag" ? (
            <FlagPicker chosen={pictureFlag} label="picture" onPick={code => save({ picture: { kind: "flag", code } })} />
          ) : designs.length === 0 ? (
            <p className="text-xs" style={{ margin: 0, color: T.muted, lineHeight: 1.6 }}>Save a design in Flag Studio and it can be your picture.</p>
          ) : (
            <>
              <p className="text-xs" style={{ margin: 0, color: T.muted, lineHeight: 1.6 }}>Your newest {Math.min(designs.length, MAX_DESIGNS)} saved designs. A design with an uploaded picture in it can’t be used.</p>
              <div style={{ maxHeight: 196, overflowY: "auto", padding: 8, borderRadius: 10, background: T.surface, border: `1px solid ${T.line}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8 }}>
                  {designs.map((d, i) => {
                    const id = String(d.id)
                    const blocked = hasUpload(d)
                    const on = profile.picture?.kind === "design" && profile.picture.id === id
                    const name = typeof d.name === "string" && d.name.trim() ? d.name : `Design ${i + 1}`
                    return (
                      <button key={id} type="button" aria-pressed={on} disabled={blocked} aria-label={blocked ? `${name} (has an uploaded picture)` : name}
                        onClick={() => save({ picture: { kind: "design", id } })} className="geo-row"
                        style={{ ...choice(on), aspectRatio: "3 / 2", cursor: blocked ? "not-allowed" : "pointer", opacity: blocked ? 0.45 : 1 }}>
                        <DesignImage design={d} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </Section>

        <Section title="Banner" note="The site’s tan paper with one colour, after a flag. Or any country’s flag.">
          <div role="group" aria-label="Banners" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 8 }}>
            {BANNERS.map(b => {
              const on = profile.banner === b.id
              return (
                <button key={b.id} type="button" aria-pressed={on} onClick={() => { save({ banner: b.id }); setAnyFlag(false) }} className="geo-row"
                  style={{ ...choice(on), display: "flex", flexDirection: "column", textAlign: "left" }}>
                  <BannerArt id={b.id} style={{ width: "100%", aspectRatio: "3 / 1" }} />
                  <span style={{ padding: "4px 8px", fontSize: 12, lineHeight: "16px", fontWeight: 600, color: on ? ACCENT.learn : T.text }}>{b.name}</span>
                </button>
              )
            })}
            <button type="button" aria-pressed={!!bannerCode} aria-expanded={anyFlag} aria-controls="profile-banner-flags" onClick={() => setAnyFlag(v => !v)} className="geo-row"
              style={{ ...choice(!!bannerCode), display: "flex", flexDirection: "column", textAlign: "left" }}>
              {bannerCode
                ? <BannerArt id={profile.banner} style={{ width: "100%", aspectRatio: "3 / 1" }} />
                : <span aria-hidden style={{ width: "100%", aspectRatio: "3 / 1", display: "flex", alignItems: "center", justifyContent: "center", background: tint(T.text, 0.04) }}><LineIcon name="flag" size={16} color={T.muted} /></span>}
              <span style={{ padding: "4px 8px", fontSize: 12, lineHeight: "16px", fontWeight: 600, color: bannerCode ? ACCENT.learn : T.text }}>Any flag</span>
            </button>
          </div>
          {anyFlag && (
            <div id="profile-banner-flags">
              <FlagPicker chosen={bannerCode} label="banner" onPick={code => save({ banner: flagBanner(code) })} />
            </div>
          )}
        </Section>

        <Section title="Bio" note={`A line about you, up to ${BIO_MAX} characters. No links.`}>
          <label htmlFor="profile-bio" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Bio</label>
          <textarea id="profile-bio" className="pf-input" value={bio} onChange={e => { setBio(e.target.value); setBioSaid("") }} rows={3}
            autoComplete="off" spellCheck placeholder="e.g. Learning every flag in Africa this year"
            aria-invalid={!!bioBad} aria-describedby="profile-bio-help"
            style={{ width: "100%", padding: 12, borderRadius: 10, fontSize: 16, lineHeight: 1.5, resize: "vertical", background: T.surface, border: `1px solid ${bioBad ? T.danger : T.line}`, color: T.text, fontFamily: "inherit" }} />
          <div id="profile-bio-help" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span role="alert" className="text-xs" style={{ color: bioBad ? T.danger : T.green }}>{bioBad ? BIO_MESSAGE[bioBad] : bioSaid}</span>
            <span className="text-xs" style={{ flexShrink: 0, color: bioLength(bioClean) > BIO_MAX ? T.danger : T.dim, fontVariantNumeric: "tabular-nums" }}>{bioLength(bioClean)}/{BIO_MAX}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SecondaryButton disabled={!!bioBad || !bioChanged} onClick={() => { save({ bio: bioClean }); setBio(bioClean); setBioSaid("Bio saved.") }} style={{ flex: "1 1 140px", width: "auto" }}>Save bio</SecondaryButton>
            {profile.bio && <SecondaryButton onClick={() => { save({ bio: "" }); setBio(""); setBioSaid("Bio removed.") }} style={{ flex: "1 1 140px", width: "auto" }}>Remove bio</SecondaryButton>}
          </div>
        </Section>

        <div ref={designsRef} style={{ scrollMarginTop: 16 }}>
          <Section title="Published flags" note={publicOn
            ? "Choose which of your Flag Studio designs show under Published flags. Anyone can see them on your public profile. Their names stay private."
            : "Choose which of your Flag Studio designs show under Published flags on your profile. Their names stay private."}>
            {designs.length === 0 ? (
              <p className="text-xs" style={{ margin: 0, color: T.muted }}>You haven’t saved any designs yet.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 8 }}>
                {designs.map((d, i) => {
                  const id = String(d.id)
                  const blocked = hasUpload(d)
                  const on = profile.designs.includes(id)
                  const name = typeof d.name === "string" && d.name.trim() ? d.name : `Design ${i + 1}`
                  return (
                    <button key={id} type="button" aria-pressed={on} disabled={blocked}
                      aria-label={blocked ? `${name}: has an uploaded picture, so it can’t be shown` : `Show ${name}`}
                      onClick={() => save({ designs: on ? profile.designs.filter(x => x !== id) : [...profile.designs, id] })}
                      className="geo-row" style={{ ...choice(on), position: "relative", aspectRatio: "3 / 2", cursor: blocked ? "not-allowed" : "pointer", opacity: blocked ? 0.45 : 1 }}>
                      <DesignImage design={d} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                      {on && (
                        <span aria-hidden style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: ACCENT.learn }}>
                          <LineIcon name="check" size={12} color={T.onAccent} strokeWidth={2.2} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            {designs.some(hasUpload) && <p className="text-xs" style={{ margin: 0, color: T.muted, background: tint(T.amber, 0.08), padding: 8, borderRadius: 8 }}>Designs with an uploaded picture can’t go on a public profile.</p>}
          </Section>
        </div>
      </div>
    </div>,
    document.body,
  )
}
