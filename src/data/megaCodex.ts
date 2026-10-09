import { FLAGS } from "./flags"
import { fp } from "./flagUrl"
import { CODEX } from "./codex"
import { UK_NATIONS } from "./ukNations"
import { TERRITORIES } from "./territories"
import { ETHNIC_FLAGS } from "./ethnicFlags"
import { EXTINCT_STATES } from "./extinctStates"
import { ORG_FLAGS } from "./orgFlags"
import { HISTORICAL_FLAGS } from "./historicalFlags"
import { IDENTITY_FLAGS } from "./identityFlags"
import { US_CITY_FLAGS } from "./usCityFlags"
import { SUB_FLAGS } from "./subdivisions"
import { stripFlagOf, splitParen } from "./codexGalleries"
import { curatedFact, pickPhrase } from "./curatedFacts"

// Every flag in the app for the Codex's Mega Codex wall and its search: it
// needs all the data, so the Codex loads it only when either is used.
// Aggregated once at module load: countries, identity, cities, ethnic, extinct,
// org and historical flags, deduped by display name.
export interface MegaFlag { title: string; url: string; fact: string }
function gatherAllFlags(): MegaFlag[] {
  const seen = new Set<string>()
  const all: MegaFlag[] = []
  // Reuse the rich facts we already have (country fun facts, identity-flag and
  // city notes, historical-flag notes); generate a brief descriptor for the
  // gallery imports that ship without one, so every tile says something.
  const push = (title: string, url: string, fact: string) => {
    const t = (title || '').trim()
    if (!t || !url) return
    const key = t.toLowerCase()
    if (seen.has(key)) return
    seen.add(key); all.push({ title: t, url, fact: (fact || '').trim() || `A flag in the Globalio Codex.` })
  }
  FLAGS.forEach(f => push(f.name, f.flagUrl, f.funFact))
  SUB_FLAGS.forEach(s => push(s.name, s.flagUrl, curatedFact(s.name) ?? pickPhrase(s.name, [
    `The flag of ${s.name}, a subdivision of ${s.countryName}.`,
    `${s.name}, one of the administrative divisions of ${s.countryName}.`,
    `A regional flag from ${s.countryName} — that of ${s.name}.`,
    `The banner of ${s.name}, a region of ${s.countryName}.`,
    `Flag of ${s.name}, part of ${s.countryName}.`,
  ])))
  IDENTITY_FLAGS.forEach(f => push(f.name, f.flagUrl, f.note))
  US_CITY_FLAGS.forEach(f => push(f.name, f.flagUrl, f.note))
  ETHNIC_FLAGS.forEach(r => r.groups.forEach(g => g.items.forEach(it => {
    // Use the most specific classification (deepest group segment), but never
    // when it just repeats the people's own name.
    const seg = (g.label || "").split(" · ").pop() || ""
    const overlaps = !!seg && (seg.toLowerCase().includes(it.name.toLowerCase()) || it.name.toLowerCase().includes(seg.toLowerCase()))
    const n = it.name
    const tmpl = seg && !overlaps
      ? pickPhrase(n, [
          `The ${n} are a people of the ${seg}.`,
          `A flag of the ${n}, an ethnic group of the ${seg}.`,
          `The ${n} — one of the peoples of the ${seg}.`,
          `Flag of the ${n}, an ethnic and cultural group of the ${seg}.`,
          `The ${n}, a people of the ${seg}.`,
        ])
      : pickPhrase(n, [
          `The flag of the ${n}, an ethnic and cultural group.`,
          `A banner of the ${n} people.`,
          `The ${n}, a distinct ethnic and cultural community.`,
          `Colours of the ${n}, an ethnic and cultural group.`,
        ])
    push(it.name, fp(it.file), curatedFact(it.name) ?? tmpl)
  })))
  EXTINCT_STATES.forEach(r => r.items.forEach(it => {
    const title = stripFlagOf(splitParen(it.name)[0])
    const [, paren] = splitParen(it.name)
    const p = paren ? paren.replace(/^(de facto |nominally )/i, "") : ""
    const tmpl = p
      ? pickPhrase(title, [
          `A state that no longer exists, ${p}.`,
          `A former state — ${p}.`,
          `Once a state in its own right, ${p}; now vanished.`,
          `A bygone state, ${p}.`,
        ])
      : pickPhrase(title, [
          `A vanished state of ${r.region}.`,
          `A former state of ${r.region}, now consigned to history.`,
          `A state of ${r.region} that no longer exists.`,
          `Once a sovereign entity in ${r.region}.`,
        ])
    push(title, fp(it.file), curatedFact(title) ?? tmpl)
  }))
  ORG_FLAGS.forEach(r => r.groups.forEach(g => g.items.forEach(it => {
    const title = stripFlagOf(it.name)
    const sports = /sport/i.test(r.region), former = /former/i.test(r.region)
    const scope = ["Africa", "Americas", "Asia", "Europe", "Oceania"].includes(g.label) ? ` operating across ${g.label}` : ""
    const tmpl = former
      ? pickPhrase(title, [
          `A now-defunct international organisation.`,
          `A former international body, since dissolved.`,
          `An international organisation that no longer operates.`,
        ])
      : sports
      ? pickPhrase(title, [
          `An international sports federation.`,
          `A governing body of international sport.`,
          `An international sporting organisation.`,
        ])
      : pickPhrase(title, [
          `An international organisation${scope}.`,
          `An international body${scope}.`,
          `A multinational organisation${scope}.`,
        ])
    push(title, fp(it.file), curatedFact(title) ?? tmpl)
  })))
  Object.values(CODEX).forEach(e => e.flagHistory.forEach(h => { push(h.label, h.flagUrl, h.note); h.parallel?.forEach(p => push(p.label, p.flagUrl, p.note)) }))
  // Standalone historical states (dedup-safe against the CODEX timelines above).
  HISTORICAL_FLAGS.forEach(h => push(h.name, h.flagUrl, h.note))
  // Present-day dependent territories (skip ones with no distinct flag).
  Object.values(TERRITORIES).forEach(list => list.forEach(t => { if (t.flagUrl && !t.noFlag) push(t.name, t.flagUrl, t.note) }))
  // UK constituent nations + their flag histories (England, Scotland, …).
  UK_NATIONS.forEach(n => { const first = n.flagHistory[0]; if (first) push(n.name, first.flagUrl, first.note); n.flagHistory.forEach(h => push(h.label, h.flagUrl, h.note)) })
  return all
}
export const ALL_FLAGS_AZ = gatherAllFlags()
