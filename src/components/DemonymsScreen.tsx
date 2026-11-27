import { DEMONYMS } from "../data/demonyms"
import {
  DEMONYM_FIELD, DEMONYM_SAMPLES, afterAnswer, akaLine, demonymChoices, demonymHint, entryOf, isDemonym, judgeDemonym, pickDemonyms,
} from "../utils/demonyms"
import type { Demonym } from "../utils/demonyms"
import AbroadScreen from "./AbroadScreen"
import type { AbroadGame } from "./AbroadScreen"

/* Demonyms — "What do you call someone from Naples?" Neapolitan, not
   Nepalese. Pick the word from four (the answer and three believable fakes,
   some of them real words for somewhere else) or type it for double points.
   Same rules and screen as the Abroad games (AbroadScreen): ten right before
   three strikes. Every answer is checked against Wikidata, Wikipedia and
   Wiktionary (scripts/demonyms/verify.mjs → src/data/demonyms.ts). */

// "the Isle of Man", "the Philippines": places that take "the" in a sentence.
const withThe = (place: string) => (/^(isle of |canary |cayman )|islands$|territory$|^(philippines|seychelles)$/i.test(place) ? `the ${place}` : place)

/** "Someone from Naples is a Neapolitan." ("… is Manx", "… is Cornish": no article for an adjective-like word). */
function learnLine(d: Demonym): string {
  const bare = /(sh|ch|x)$/i.test(d.answer)
  const article = bare ? "" : /^[aeiouAEIOU]/.test(d.answer) ? "an " : "a "
  return [`Someone from ${withThe(d.place)} is ${article}${d.answer}.`, d.origin, akaLine(d)].filter(Boolean).join(" ")
}

const DEMONYM_GAME: AbroadGame = {
  id: "demonyms",
  title: "Demonyms",
  headline: "What do you call someone from Naples?",
  blurb: "Get ten right before three strikes. Some wrong answers are real words for somewhere else.",
  noun: "word",
  plural: "places",
  field: DEMONYM_FIELD,
  samples: DEMONYM_SAMPLES,
  languages: { en: "English" },
  typingNote: "Typing scores double. Spelling counts: one slip is allowed only in words of eight letters or more.",
  choicesLabel: "Choose the word for someone from there",
  rounds: (tier, rng) => pickDemonyms(DEMONYMS, tier, rng).map(d => ({
    entry: entryOf(d),
    answer: d.answer,
    where: "",
    learnAs: d.place,
    hint: demonymHint(d),
    choices: demonymChoices(d, rng),
    judge: typed => judgeDemonym(d, typed, DEMONYMS),
    isRight: picked => isDemonym(d, picked),
    prompt: "What do you call someone from",
    context: d.where,
    spoken: `What do you call someone from ${withThe(d.place)}, ${d.where}?`,
    learn: learnLine(d),
    aside: given => afterAnswer(d, given),
  })),
}

export default function DemonymsScreen({ onBack, onFinish }: { onBack: () => void; onFinish?: () => void }) {
  return <AbroadScreen game={DEMONYM_GAME} onBack={onBack} onFinish={onFinish} />
}
