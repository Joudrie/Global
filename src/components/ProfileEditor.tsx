import { useEffect, useMemo, useReducer, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { ReactNode } from "react"
import { T, ACCENT, tint } from "../ui/tokens"
import { PrimaryButton, SecondaryButton } from "./gameUi"
import { LineIcon, SearchIcon } from "./icons"
import FlagImage from "./FlagImage"
import { DesignImage } from "./Avatar"
import { FLAGS } from "../data/flags"
import { BANNERS, bannerUri } from "../profile/banners"
import { MAX_DESIGNS, PROFILE_EVENT, readProfile, saveProfile } from "../profile/local"
import { offeredDesigns, hasUpload } from "../profile/public"
import { gameSnapshot } from "../utils/backup"
import { bioLength, bioProblem, cleanBio, BIO_MAX, BIO_MESSAGE } from "../profile/text"

/* "Edit profile": picture (a country flag or one of your Flag Studio designs),
   banner, bio and (while profiles are public) which designs to show. Every
   choice is saved on this device straight away; the bio when you press Save.
   A full-screen sheet with no ads, closed with Done or Escape. */

const Section = ({ title, children, note }: { title: string; children: ReactNode; note?: ReactNode }) => (
  <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <h3 className="geo-display" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>{title}</h3>
    {note && <p className="text-xs" style={{ margin: 0, color: T.muted, lineHeight: 1.6 }}>{note}</p>}
    {children}
  </section>
)

const choice = (on: boolean) => ({
  borderRadius: 8, padding: 0, overflow: "hidden", cursor: "pointer", background: T.surfaceHi,
  border: `2px solid ${on ? ACCENT.learn : T.line}`, outline: "none",
} as const)

export default function ProfileEditor({ onClose, showDesignChoice, top, designTitle, designNote, startAt }: {
  onClose: () => void
  showDesignChoice: boolean
  /** More sections first (the trial layouts put the name and username here). */
  top?: ReactNode
  designTitle?: string
  designNote?: string
  /** Open scrolled to the designs to show ("Choose flags"). */
  startAt?: "designs"
}) {
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  const profile = readProfile()
  const designs = useMemo(() => offeredDesigns(gameSnapshot()), [])
  const [tab, setTab] = useState<"flag" | "design">(profile.picture?.kind === "design" ? "design" : "flag")
  const [q, setQ] = useState("")
  const [bio, setBio] = useState(profile.bio)
  const [bioSaid, setBioSaid] = useState("")
  const [failed, setFailed] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const designsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null
    heading.current?.focus()
    if (startAt === "designs") designsRef.current?.scrollIntoView({ block: "start" })
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
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
  }, [onClose])

  const save = (patch: Parameters<typeof saveProfile>[0]) => setFailed(!saveProfile(patch))
  const query = q.trim().toLowerCase()
  const flags = query ? FLAGS.filter(f => f.name.toLowerCase().includes(query) || f.code.toLowerCase() === query) : FLAGS
  const bioClean = cleanBio(bio)
  const bioBad = bioProblem(bio)
  const bioChanged = bioClean !== profile.bio

  // On <body>: the You tab's own transform would otherwise pin the sheet to the tab.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="profile-editor-title"
      style={{ position: "fixed", inset: 0, zIndex: 60, background: T.bg, display: "flex", flexDirection: "column", maxWidth: 720, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${T.line}`, background: T.bg }}>
        <h2 id="profile-editor-title" ref={heading} tabIndex={-1} className="geo-display"
          style={{ flex: 1, margin: 0, fontSize: 20, fontWeight: 700, color: T.text, outline: "none" }}>Edit profile</h2>
        <PrimaryButton accent={ACCENT.learn} onClick={onClose} style={{ width: "auto", height: 44 }}>Done</PrimaryButton>
      </header>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 16px 48px", display: "flex", flexDirection: "column", gap: 24 }}>
        {failed && <p role="alert" className="text-xs" style={{ margin: 0, color: T.danger }}>Couldn’t save on this device: its storage is full or blocked.</p>}
        {top}

        <Section title="Picture" note="A country’s flag or one of your Flag Studio designs, shown in a circle.">
          <div role="tablist" aria-label="Picture" style={{ display: "flex", gap: 8 }}>
            {([["flag", "Country flags"], ["design", "My designs"]] as const).map(([id, label]) => (
              <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className="geo-row"
                style={{ flex: 1, minHeight: 44, borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  color: tab === id ? T.onAccent : T.text, background: tab === id ? ACCENT.learn : T.surface, border: `1px solid ${tab === id ? ACCENT.learn : T.line}` }}>
                {label}
              </button>
            ))}
          </div>
          {profile.picture && (
            <button type="button" onClick={() => save({ picture: null })} className="text-xs font-semibold"
              style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 4px", color: T.danger, background: "transparent", border: "none", cursor: "pointer" }}>
              Remove picture
            </button>
          )}
          {tab === "flag" ? (
            <>
              <div style={{ position: "relative" }}>
                <span aria-hidden style={{ position: "absolute", left: 12, top: 14, display: "flex" }}><SearchIcon size={18} color={T.muted} strokeWidth={1.7} /></span>
                <input type="search" value={q} onChange={e => setQ(e.target.value)} aria-label="Search countries" placeholder="Search countries"
                  autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                  style={{ width: "100%", height: 48, padding: "0 12px 0 40px", borderRadius: 10, fontSize: 16, background: T.surface, border: `1px solid ${T.line}`, color: T.text, outline: "none" }} />
              </div>
              {flags.length === 0 && <p className="text-xs" style={{ margin: 0, color: T.muted }}>No country matches “{q.trim()}”.</p>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 8 }}>
                {flags.map(f => {
                  const on = profile.picture?.kind === "flag" && profile.picture.code === f.code
                  return (
                    <button key={f.code} type="button" aria-pressed={on} aria-label={f.name} title={f.name} onClick={() => save({ picture: { kind: "flag", code: f.code } })}
                      className="geo-row" style={{ ...choice(on), aspectRatio: "3 / 2" }}>
                      <FlagImage code={f.code} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </button>
                  )
                })}
              </div>
            </>
          ) : designs.length === 0 ? (
            <p className="text-xs" style={{ margin: 0, color: T.muted, lineHeight: 1.6 }}>Save a design in Flag Studio and it can be your picture.</p>
          ) : (
            <>
              <p className="text-xs" style={{ margin: 0, color: T.muted, lineHeight: 1.6 }}>Your newest {Math.min(designs.length, MAX_DESIGNS)} saved designs. A design with an uploaded picture in it can’t be used.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 8 }}>
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
            </>
          )}
        </Section>

        <Section title="Banner">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
            {BANNERS.map(b => {
              const on = profile.banner === b.id
              return (
                <button key={b.id} type="button" aria-pressed={on} onClick={() => save({ banner: b.id })} className="geo-row"
                  style={{ ...choice(on), display: "flex", flexDirection: "column", textAlign: "left" }}>
                  <span aria-hidden style={{ display: "block", width: "100%", aspectRatio: "3 / 1", background: `url("${bannerUri(b.id)}") center / cover no-repeat` }} />
                  <span style={{ padding: "6px 8px", fontSize: 12, fontWeight: 600, color: on ? ACCENT.learn : T.text }}>{b.name}</span>
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="Bio" note={`A line about you, up to ${BIO_MAX} characters. No links.`}>
          <label htmlFor="profile-bio" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Bio</label>
          <textarea id="profile-bio" value={bio} onChange={e => { setBio(e.target.value); setBioSaid("") }} rows={3}
            autoComplete="off" spellCheck placeholder="e.g. Learning every flag in Africa this year"
            aria-invalid={!!bioBad} aria-describedby="profile-bio-help"
            style={{ width: "100%", padding: 12, borderRadius: 10, fontSize: 16, lineHeight: 1.5, resize: "vertical", background: T.surface, border: `1px solid ${bioBad ? T.danger : T.line}`, color: T.text, outline: "none", fontFamily: "inherit" }} />
          <div id="profile-bio-help" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span role="alert" className="text-xs" style={{ color: bioBad ? T.danger : T.green }}>{bioBad ? BIO_MESSAGE[bioBad] : bioSaid}</span>
            <span className="text-xs" style={{ flexShrink: 0, color: bioLength(bioClean) > BIO_MAX ? T.danger : T.dim, fontVariantNumeric: "tabular-nums" }}>{bioLength(bioClean)}/{BIO_MAX}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SecondaryButton disabled={!!bioBad || !bioChanged} onClick={() => { save({ bio: bioClean }); setBio(bioClean); setBioSaid("Bio saved.") }} style={{ flex: "1 1 140px", width: "auto" }}>Save bio</SecondaryButton>
            {profile.bio && <SecondaryButton onClick={() => { save({ bio: "" }); setBio(""); setBioSaid("Bio removed.") }} style={{ flex: "1 1 140px", width: "auto" }}>Remove bio</SecondaryButton>}
          </div>
        </Section>

        {showDesignChoice && (
          <div ref={designsRef} style={{ scrollMarginTop: 16 }}>
          <Section title={designTitle ?? "Designs on your public profile"} note={designNote ?? "Choose which of your Flag Studio designs anyone can see on your profile. None are shown unless you choose them. Their names stay private."}>
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
        )}
      </div>
    </div>,
    document.body,
  )
}
