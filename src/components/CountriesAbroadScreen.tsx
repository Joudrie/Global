import { LANGUAGES, NAMES } from "../data/countriesAbroad"
import { COUNTRIES_ABROAD_SAMPLES, countryRounds } from "../utils/countryNames"
import AbroadScreen from "./AbroadScreen"
import type { AbroadGame } from "./AbroadScreen"

/* Countries Abroad — a country's name as another language writes it
   ("Allemagne", French); type the English name ("Germany"), or pick it from
   four. Same rules and screen as Cities Abroad (AbroadScreen). The names come
   from Wikidata (src/data/countriesAbroad.ts); a country's own languages are
   left out, for Native Names. */

const COUNTRIES_ABROAD: AbroadGame = {
  id: "countriesabroad",
  title: "Countries Abroad",
  headline: "Name the country from its name in another language.",
  blurb: "Get ten right before three strikes. The further a name strays from English, the more it's worth.",
  noun: "country",
  plural: "countries",
  ...countryRounds(NAMES),
  samples: COUNTRIES_ABROAD_SAMPLES,
  languages: LANGUAGES,
}

export default function CountriesAbroadScreen({ onBack, onFinish }: { onBack: () => void; onFinish?: () => void }) {
  return <AbroadScreen game={COUNTRIES_ABROAD} onBack={onBack} onFinish={onFinish} />
}
