import { lazy, Suspense, useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { AbroadKind } from "../ui/registry"
import { T } from "../ui/tokens"
import { ScreenHeader } from "./ui"
import { ABROAD_STYLES, Segmented } from "./AbroadScreen"

/* Abroad — Countries Abroad and Cities Abroad as one game. The start screen
   opens with a Countries / Cities switch; each switch is the old game, with
   its own names, settings and best scores (globalio_countriesabroad_best,
   globalio_citiesabroad_best), so nothing a player had is lost. The switch
   remembers its last setting (globalio_abroad_prefs). Old links
   (?play=citiesabroad, ?play=countriesabroad) open here on the right switch
   (ABROAD_LINK_KINDS in ui/registry.ts).

   Each switch's names are a big file, so each loads when it's first shown;
   the other one is fetched in the background, so flipping is usually instant. */

const loadCountries = () => import("./CountriesAbroadScreen")
const loadCities = () => import("./CitiesAbroadScreen")
const SCREENS = { countries: lazy(loadCountries), cities: lazy(loadCities) }
const NOUN: Record<AbroadKind, string> = { countries: "countries", cities: "cities" }

const KIND_KEY = "globalio_abroad_prefs"
function loadKind(): AbroadKind {
  try { return JSON.parse(localStorage.getItem(KIND_KEY) ?? "null")?.kind === "cities" ? "cities" : "countries" } catch { return "countries" }
}
function saveKind(kind: AbroadKind) {
  try { localStorage.setItem(KIND_KEY, JSON.stringify({ kind })) } catch { /* not saved */ }
}

interface Props { initialKind?: AbroadKind | null; onBack: () => void; onFinish?: () => void }

export default function AbroadGameScreen({ initialKind, onBack, onFinish }: Props) {
  const [kind, setKind] = useState<AbroadKind>(() => initialKind ?? loadKind())
  // Once, on opening: fetch the switch not shown.
  const [first] = useState(kind)
  useEffect(() => { (first === "cities" ? loadCountries : loadCities)().catch(() => { /* loads when chosen */ }) }, [first])
  const choose = (k: string) => {
    const next: AbroadKind = k === "cities" ? "cities" : "countries"
    setKind(next)
    saveKind(next)
  }
  const switcher = (
    <Segmented id="abroad-kind" label="Names of" value={kind} onChange={choose}
      options={[{ id: "countries", label: "Countries" }, { id: "cities", label: "Cities" }]} />
  )
  const Screen = SCREENS[kind]
  return (
    <Suspense fallback={<Loading switcher={switcher} onBack={onBack} noun={NOUN[kind]} />}>
      <Screen key={kind} title="Abroad" switcher={switcher} onBack={onBack} onFinish={onFinish} />
    </Suspense>
  )
}

/* While a switch's names load: the same header, the switch, and a plain
   status in the poster's place, so nothing jumps when they arrive. */
function Loading({ switcher, onBack, noun }: { switcher: ReactNode; onBack: () => void; noun: string }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>
      <style>{ABROAD_STYLES}</style>
      <ScreenHeader title="Abroad" onBack={onBack} />
      <main className="w-full mx-auto flex flex-col" style={{ maxWidth: 720, padding: "4px 16px 32px", gap: 20 }}>
        {switcher}
        <div role="status" aria-busy="true"
          style={{ height: 112, borderRadius: 16, border: `1px solid ${T.line}`, background: T.surfaceHi,
            display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontSize: 13 }}>
          Loading the {noun}…
        </div>
      </main>
    </div>
  )
}
