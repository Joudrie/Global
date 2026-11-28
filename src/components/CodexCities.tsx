import { useState } from 'react'
import { CITY_ATLAS, formatPopulation } from '../data/cityAtlas'
import type { AtlasCity, AtlasCountry } from '../data/cityAtlas'
import { commonsSource } from '../utils/commons'
import { T, ACCENT, FONT, tint } from '../ui/tokens'
import { ChevronDown, Castle, Landmark, Sun, Mountain, Sailboat } from 'lucide-react'

// The inside of the Codex's "City Flags" section (beta): continents, then
// their countries A–Z, then a country's cities biggest first; a city opens its
// flag large beneath its row. Its own chunk with its data (cityAtlas.ts),
// loaded when the section first opens.

const CONTINENT_ICONS: Record<string, typeof Castle> = {
  Europe: Castle, 'North America': Landmark, 'South America': Landmark, Africa: Sun, Asia: Mountain, Oceania: Sailboat,
}
const cityCount = (n: number) => `${n} ${n === 1 ? 'city' : 'cities'}`
const popLine = (c: AtlasCity) => [c.population != null ? formatPopulation(c.population) : null, c.year, c.state].filter(Boolean).join(' · ')

export default function CitiesBrowser({ color }: { color: string }) {
  // One continent, one country and one city open at a time.
  const [continent, setContinent] = useState<string | null>(null)
  const [country, setCountry] = useState<string | null>(null)
  const [city, setCity] = useState<string | null>(null)
  return (
    <div className="mt-2">
      {CITY_ATLAS.map(cont => {
        const open = continent === cont.name
        const Icon = CONTINENT_ICONS[cont.name] ?? Landmark
        const n = cont.countries.reduce((s, k) => s + k.cities.length, 0)
        return (
          <div key={cont.name} className="mb-0.5">
            <button onClick={() => { setContinent(open ? null : cont.name); setCountry(null); setCity(null) }} aria-expanded={open}
              className="geo-tap w-full flex items-center justify-between px-1 py-2.5 transition-all active:scale-[0.99]"
              style={{ background: 'transparent', borderBottom: `1px solid ${tint(T.line, 0.6)}` }}>
              <div className="flex items-center gap-2 min-w-0">
                <Icon size={13} color={color} strokeWidth={1.6} absoluteStrokeWidth style={{ flexShrink: 0 }} />
                <span className="text-xs font-bold uppercase tracking-wider truncate" style={{ color }}>{cont.name}</span>
                <span className="text-xs" style={{ color: T.dim, fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{n}</span>
              </div>
              <ChevronDown size={15} color={color} strokeWidth={1.6} absoluteStrokeWidth className="codex-chev"
                style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>
            {open && (
              <div className="mt-1">
                {cont.countries.map(k => (
                  <CountryRow key={k.code} country={k} color={color} open={country === k.code}
                    onToggle={() => { setCountry(c => (c === k.code ? null : k.code)); setCity(null) }}
                    openCity={city} onCity={key => setCity(c => (c === key ? null : key))} />
                ))}
              </div>
            )}
          </div>
        )
      })}
      <p className="text-xs px-1 pt-3" style={{ color: T.dim }}>More continents are coming.</p>
    </div>
  )
}

// A country: its flag, name and city count; open for its cities.
function CountryRow({ country: k, color, open, onToggle, openCity, onCity }: {
  country: AtlasCountry; color: string; open: boolean; onToggle: () => void; openCity: string | null; onCity: (key: string) => void
}) {
  return (
    <div id={`codex-cities-${k.code.toLowerCase()}`}>
      <button onClick={onToggle} aria-expanded={open}
        className="geo-tap w-full flex items-center gap-3 px-1.5 py-2.5 rounded-lg transition-all active:scale-[0.99] text-left"
        style={{ background: open ? tint(color, 0.07) : 'transparent', borderBottom: `1px solid ${tint(T.line, 0.55)}` }}>
        <img src={k.flagUrl} alt={k.name} loading="lazy"
          style={{ width: 46, height: 30, objectFit: 'cover', borderRadius: 5, border: `1px solid ${T.line}`, flexShrink: 0 }}
          onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: T.text }}>{k.name}</div>
          <div style={{ color: T.muted, marginTop: 2, fontSize: 11, opacity: 0.75 }}>{cityCount(k.cities.length)}</div>
        </div>
        <span className="codex-chev" style={{ color, fontSize: 18, transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
      </button>
      {open && (
        <div className="carto-slide-up" style={{ margin: '4px 0 8px 12px', paddingLeft: 8, borderLeft: `2px solid ${tint(color, 0.25)}` }}>
          {k.cities.map(c => <CityRow key={c.key} city={c} color={color} open={openCity === c.key} onToggle={() => onCity(c.key)} />)}
        </div>
      )}
    </div>
  )
}

// A city: its flag, name, population and a line of its description; tap to
// open the flag large with the rest.
function CityRow({ city: c, color, open, onToggle }: { city: AtlasCity; color: string; open: boolean; onToggle: () => void }) {
  return (
    <div>
      <button onClick={onToggle} aria-expanded={open}
        className="geo-tap w-full flex items-center gap-3 px-1.5 py-2.5 rounded-lg transition-all active:scale-[0.99] text-left"
        style={{ background: open ? tint(color, 0.07) : 'transparent', borderBottom: `1px solid ${tint(T.line, 0.55)}` }}>
        <div style={{ width: 46, height: 30, flexShrink: 0, borderRadius: 5, overflow: 'hidden', border: `1px solid ${T.line}`, background: T.surfaceHi }}>
          <img src={c.flagUrl} alt={`Flag of ${c.name}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: T.text }}>{c.name}</div>
          <div className="truncate" style={{ color: T.muted, marginTop: 2, fontSize: 11, fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums' }}>{popLine(c)}</div>
          {c.note && !open && <div className="truncate" style={{ color: T.dim, marginTop: 2, fontSize: 11 }}>{c.note}</div>}
        </div>
        <span className="codex-chev" style={{ color, fontSize: 16, transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
      </button>
      {open && <CityDetail city={c} color={color} />}
    </div>
  )
}

function CityDetail({ city: c, color }: { city: AtlasCity; color: string }) {
  const link = { color: tint(color, 0.9), fontWeight: 600 }
  const source = c.credit?.commons ?? commonsSource(c.flagUrl)
  return (
    <div className="carto-slide-up" style={{ margin: '6px 0 10px', padding: 14, borderRadius: 14, background: T.surfaceHi, border: `1px solid ${tint(color, 0.22)}` }}>
      <div className="rounded-xl overflow-hidden mb-3" style={{ border: `1px solid ${T.line}`, background: T.surface }}>
        <img src={c.flagUrl} alt={`Flag of ${c.name}`}
          style={{ width: '100%', height: 180, objectFit: 'contain', display: 'block', padding: 12, boxSizing: 'border-box' }}
          onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
      </div>
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="geo-display font-bold text-sm" style={{ color: T.text, margin: 0 }}>
          {c.name}{c.local && <span style={{ color: T.muted, fontWeight: 400 }}> · {c.local}</span>}
        </h3>
        {c.capital && (
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: tint(ACCENT.codex, 0.12), color: ACCENT.codex, border: `1px solid ${tint(ACCENT.codex, 0.25)}`, whiteSpace: 'nowrap' }}>
            Capital
          </span>
        )}
      </div>
      {c.population != null && (
        <p className="text-xs mb-1.5" style={{ color: T.muted, fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums' }}>
          Population {c.population.toLocaleString('en-US')}{c.year ? ` (${c.year})` : ''}
        </p>
      )}
      {c.note && <p className="text-xs leading-relaxed" style={{ color: T.text, lineHeight: 1.6 }}>{c.note}</p>}
      {c.article && (
        <a href={c.article} target="_blank" rel="noopener noreferrer" className="text-xs inline-block mt-1.5" style={link}>
          Source: Wikipedia ↗
        </a>
      )}
      {c.credit ? (
        <p className="text-xs" style={{ color: T.dim, lineHeight: 1.6, marginTop: 8, overflowWrap: 'anywhere' }}>
          Image: <a href={c.credit.commons} target="_blank" rel="noopener noreferrer" style={link}>Wikimedia Commons ↗</a>
          {c.credit.author && <> · {c.credit.author}</>}
          {' · '}
          {c.credit.licenceUrl ? <a href={c.credit.licenceUrl} target="_blank" rel="noopener noreferrer" style={link}>{c.credit.licence}</a> : c.credit.licence}
        </p>
      ) : source && (
        <a href={source} target="_blank" rel="noopener noreferrer" className="text-xs inline-block mt-2" style={link}>
          Source: Wikimedia Commons ↗
        </a>
      )}
    </div>
  )
}
