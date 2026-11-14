import { LANGUAGES, NAMES } from "../data/nativeNames"
import { NATIVE_NAMES_SAMPLES, countryRounds } from "../utils/countryNames"
import AbroadScreen from "./AbroadScreen"
import type { AbroadGame } from "./AbroadScreen"

/* Native Names — what a country calls itself in its own official language
   ("Suomi", Finnish); type the English name ("Finland"), or pick it from
   four. Same rules and screen as Cities Abroad (AbroadScreen). The names come
   from Wikidata (src/data/nativeNames.ts), with a Latin spelling under every
   name in another script. */

const NATIVE_NAMES: AbroadGame = {
  id: "nativenames",
  title: "Native Names",
  headline: "Name the country from what it calls itself.",
  blurb: "Get ten right before three strikes. The further a name strays from English, the more it's worth.",
  noun: "country",
  plural: "countries",
  ...countryRounds(NAMES, { maxOtherScript: Infinity }),
  samples: NATIVE_NAMES_SAMPLES,
  languages: LANGUAGES,
}

export default function NativeNamesScreen({ onBack, onFinish }: { onBack: () => void; onFinish?: () => void }) {
  return <AbroadScreen game={NATIVE_NAMES} onBack={onBack} onFinish={onFinish} />
}
