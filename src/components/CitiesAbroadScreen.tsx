import { ABROAD_CITIES, ABROAD_LANGUAGES, ABROAD_NAMES } from "../data/citiesAbroad"
import { GUESS_FIELD, TIER_SAMPLES, hintFor, isCity, judgeAnswer, pickRounds } from "../utils/citiesAbroad"
import AbroadScreen from "./AbroadScreen"
import type { AbroadGame } from "./AbroadScreen"

/* Cities Abroad — a city's name as another language writes it ("Benetke",
   Slovenian); type the English name ("Venice"), or pick it from four. Ten
   right before three strikes wins. The names come from Wikidata
   (src/data/citiesAbroad.ts); the screen is shared with Countries Abroad and
   Native Names (AbroadScreen). */

const CITY_LIST = Object.values(ABROAD_CITIES)

const CITIES_ABROAD: AbroadGame = {
  id: "citiesabroad",
  title: "Cities Abroad",
  headline: "Name the city from its name in another language.",
  blurb: "Get ten right before three strikes. The further a name strays from English, the more it's worth.",
  noun: "city",
  plural: "cities",
  field: GUESS_FIELD,
  samples: TIER_SAMPLES,
  languages: ABROAD_LANGUAGES,
  rounds: (tier, rng) => pickRounds(ABROAD_NAMES, ABROAD_CITIES, tier, rng).map(r => ({
    entry: r.entry,
    answer: r.city.city,
    where: r.city.country,
    learnAs: `${r.city.city}, ${r.city.country}`,
    hint: hintFor(r.city),
    choices: r.choices,
    judge: typed => judgeAnswer(r.city, typed, r.entry.roman ?? r.entry.name, CITY_LIST),
    isRight: picked => isCity(r.city, picked),
  })),
}

export default function CitiesAbroadScreen({ onBack, onFinish }: { onBack: () => void; onFinish?: () => void }) {
  return <AbroadScreen game={CITIES_ABROAD} onBack={onBack} onFinish={onFinish} />
}
