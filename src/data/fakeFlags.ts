// ── Doctored flags for Flag Forgery ─────────────────────────────────────────
// Each entry is a real country's flag with exactly one detail quietly wrong.
// The SVGs in /public/fakes are edited copies of the self-hosted /public/flags
// originals, so they render pixel-identical in style to the genuine article —
// nothing about image quality gives them away.

export interface FakeFlag {
  /** ISO code of the country being forged (never shown as a real card in the same round). */
  code: string
  name: string
  /** Doctored SVG under /fakes/. */
  src: string
  /** Terse in-round toast shown right after the swipe. */
  short: string
  /** Full explanation for the end-of-round recap. */
  reason: string
}

export const FAKE_FLAGS: FakeFlag[] = [
  {
    code: "es", name: "Spain", src: "/fakes/es.svg",
    short: "The crest was centred",
    reason: "The coat of arms sits dead centre — on the real flag it's offset toward the hoist.",
  },
  {
    code: "ad", name: "Andorra", src: "/fakes/ad.svg",
    short: "The stripes ran the wrong way",
    reason: "The blue–yellow–red bands run horizontally — Andorra's tricolour is vertical.",
  },
  {
    code: "br", name: "Brazil", src: "/fakes/br.svg",
    short: "The motto lost its E",
    reason: "The banner reads ORDEM PROGRESSO — the real motto is ORDEM E PROGRESSO.",
  },
  {
    code: "au", name: "Australia", src: "/fakes/au.svg",
    short: "St Patrick's saltire was missing",
    reason: "The Union Jack is missing the red St Patrick's saltire that represents Northern Ireland.",
  },
  {
    code: "cd", name: "DR Congo", src: "/fakes/cd.svg",
    short: "A second star sneaked in",
    reason: "There's an extra star in the lower fly — the real flag has a single star, up by the hoist.",
  },
  {
    code: "mx", name: "Mexico", src: "/fakes/mx.svg",
    short: "Green and red traded places",
    reason: "The stripes run red–white–green — on the real flag, green leads at the hoist.",
  },
  {
    code: "ma", name: "Morocco", src: "/fakes/ma.svg",
    short: "The star was filled in",
    reason: "The pentagram is solid green — the real star is an interlaced outline with red showing through.",
  },
  {
    code: "pk", name: "Pakistan", src: "/fakes/pk.svg",
    short: "The white stripe switched sides",
    reason: "The white stripe sits at the fly end — it belongs at the hoist, before the green.",
  },
  {
    code: "sy", name: "Syria", src: "/fakes/sy.svg",
    short: "A star went missing",
    reason: "Only two red stars — the new Syrian flag carries three.",
  },
  {
    code: "tr", name: "Turkey", src: "/fakes/tr.svg",
    short: "The star lost its tilt",
    reason: "The star sits perfectly upright — on the real flag it's tilted, with one point aimed away from the crescent.",
  },
  {
    code: "jm", name: "Jamaica", src: "/fakes/jm.svg",
    short: "Green and black traded places",
    reason: "The hoist and fly triangles are green — on the real flag they're black, with green top and bottom.",
  },
  {
    code: "de", name: "Germany", src: "/fakes/de.jpg",
    short: "Red and black swapped places",
    reason: "The bands run red–black–gold — Germany's tricolour is black on top, then red, then gold.",
  },
  {
    code: "ar", name: "Argentina", src: "/fakes/ar.jpg",
    short: "The sun lost its face",
    reason: "The Sun of May is a blank golden disc — the real sun wears a human face.",
  },
  {
    code: "cu", name: "Cuba", src: "/fakes/cu.jpg",
    short: "The lone star gained a point",
    reason: "The star has six points — Cuba's is a five-pointed star.",
  },
  {
    code: "no", name: "Norway", src: "/fakes/no.jpg",
    short: "The cross was centred",
    reason: "The cross sits dead centre — Norway's Nordic cross is shifted toward the hoist.",
  },
  {
    code: "bi", name: "Burundi", src: "/fakes/bi.jpg",
    short: "A fourth star crept in",
    reason: "The white roundel holds four stars — Burundi's carries three.",
  },
  {
    code: "kr", name: "South Korea", src: "/fakes/kr.jpg",
    short: "The taegeuk was flipped",
    reason: "The central taegeuk shows blue over red — on the real flag the red half sits on top.",
  },
  {
    code: "pa", name: "Panama", src: "/fakes/pa.jpg",
    short: "The red star was upside down",
    reason: "The star in the fly quarter points downward — on Panama's flag both stars stand upright.",
  },
  {
    code: "gr", name: "Greece", src: "/fakes/gr.jpg",
    short: "The canton was inverted",
    reason: "The upper-hoist canton shows a blue cross on white — Greece flies a white cross on a blue field.",
  },
  {
    code: "dz", name: "Algeria", src: "/fakes/dz.jpg",
    short: "The star slipped off the crescent",
    reason: "The star floats clear of the crescent — on Algeria's flag it nestles between the horns.",
  },
]

