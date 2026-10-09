import { fp } from "./flagUrl"
import type { EthnicRegion } from "./ethnicFlags"
import type { ExtinctRegion } from "./extinctStates"
import type { OrgRegion } from "./orgFlags"
import type { HistoricalEntity } from "./historicalFlags"
import type { IdentityFlag } from "./identityFlags"

// The Codex's "Beyond countries" galleries as plain rows, without React. The
// Codex loads a section's data when the section opens and builds its rows
// here; scripts/bundle.test.mjs builds them too, to keep CODEX_COUNTS (the
// counts the closed sections show) in step.

export interface GRow { file: string; title: string; detail: string }
/** icon: the name CodexScreen picks the region's icon by. */
export interface GRegion { label: string; icon?: string; groups: { label: string; items: GRow[] }[] }

export const rowCount = (regions: GRegion[]) =>
  regions.reduce((n, r) => n + r.groups.reduce((m, g) => m + g.items.length, 0), 0)

export const stripFlagOf = (s: string) => s.replace(/^Flag of (the )?/i, '')
export function splitParen(s: string): [string, string | null] {
  const m = s.match(/^(.*?)\s*\(([\s\S]*)\)\s*$/)
  return m ? [m[1].trim(), m[2].trim()] : [s.trim(), null]
}
export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

// "Movements & Identity" holds flags that stand for a cause or stance: Pride,
// Separatist & Autonomous, Civic & Ideological. Pan-National & Ethnic and
// Indigenous Peoples moved into "Peoples & Cultures"; Micronations stands alone.
export const isIdentityMain = (c: string) =>
  c !== 'Micronations' && c !== 'Pan-National & Ethnic' && c !== 'Indigenous Peoples'

// "Peoples & Cultures" — the full Commons ethnic/cultural gallery, merged with
// the Pan-National & Ethnic and Indigenous Peoples identity flags (E2/E3): all
// "flags of a people" now live under one top-level section.
export function peoplesRegions(ethnic: EthnicRegion[], identity: IdentityFlag[]): GRegion[] {
  const idRegion = (cat: string, label: string): GRegion => ({
    label,
    icon: cat,
    groups: [{ label: '', items: identity.filter(f => f.category === cat).map(f => ({ file: f.flagUrl, title: f.name, detail: f.note })) }],
  })
  const ethnicRegions: GRegion[] = ethnic.map(r => {
    const short = r.region.replace(/^Peoples of /, '')
    return {
      label: short,
      icon: r.region,
      groups: r.groups.map(g => ({
        label: g.label,
        items: g.items.map(it => ({ file: fp(it.file), title: it.name, detail: it.note ?? g.note ?? (g.label ? `${g.label} — ${short}` : short) })),
      })),
    }
  })
  return [
    ...ethnicRegions,
    idRegion('Pan-National & Ethnic', 'Pan-National & Ethnic'),
    idRegion('Indigenous Peoples', 'Indigenous Peoples'),
  ]
}

export function extinctRegions(extinct: ExtinctRegion[], historical: HistoricalEntity[]): GRegion[] {
  // The curated extinct-states gallery, merged with every predecessor/historical
  // flag — deduped against the gallery by name so a state that lives in both
  // datasets (Two Sicilies, Ottoman, USSR, Yugoslavia, Ashanti, Tibet…) shows
  // only once. Date-parentheses are stripped only when MATCHING the curated
  // names, so distinct historical variants (e.g. two Qing flags) are preserved.
  const norm = (s: string) => stripFlagOf(splitParen(s)[0]).toLowerCase().replace(/[^a-z0-9]+/g, '')
  const curatedNames = new Set<string>()
  const histBucket: Record<string, string> = {
    Europe: 'Europe', Americas: 'Americas',
    'Africa & Middle East': 'Africa', 'Asia & Oceania': 'Asia',
  }
  const regions: GRegion[] = extinct.map(r => ({
    label: r.region,
    icon: r.region,
    groups: [{ label: '', items: r.items.map(it => {
      const [pre, paren] = splitParen(it.name)
      curatedNames.add(norm(it.name))
      return { file: fp(it.file), title: stripFlagOf(pre), detail: paren ? cap(paren) + '.' : 'A former state.' }
    }) }],
  }))
  const byBucket: Record<string, GRow[]> = {}
  historical.forEach(h => {
    if (curatedNames.has(norm(h.name))) return // already in the curated gallery — skip
    const bucket = histBucket[h.region] ?? 'Europe'
    const arr = byBucket[bucket] || (byBucket[bucket] = [])
    arr.push({ file: h.flagUrl, title: h.name, detail: `${h.era} — ${h.note}` })
  })
  regions.forEach(rg => {
    const extra = byBucket[rg.label]
    if (extra && extra.length) rg.groups.push({ label: 'Predecessor & former states', items: extra })
  })
  return regions
}

export function orgRegions(orgs: OrgRegion[]): GRegion[] {
  return orgs.map(r => ({
    label: r.region,
    groups: r.groups.map(g => ({
      label: g.label,
      items: g.items.map(it => ({ file: fp(it.file), title: stripFlagOf(it.name), detail: g.label ? `${g.label} — ${r.region}` : r.region })),
    })),
  }))
}
