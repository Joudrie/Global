// Flag Fusion: the hand-made choices behind every round. A fused flag takes
// its STRUCTURE (layout) from one country, its EMBLEM from a second and its
// COLOURS from a third. This file says which flags may lend each part, how
// well known each one is (1 famous, 2 middling, 3 obscure) and, for
// structures, which countries share the same layout and so all count as
// right. The generated art lives in flagFusionStructures.ts (from
// scripts/flag-fusion/structures.mjs) and public/fusion/emblems/ (from
// scripts/flag-fusion/stencils.mjs); the rules are in utils/flagFusion.ts.

export type Fame = 1 | 2 | 3

/** Flags that share one layout once colours and emblems are gone. Every
 *  member counts as right for any of them. `show` lists the members whose
 *  structure can appear in a round, with how well known that layout is;
 *  the others are only accepted answers. */
export interface StructureFamily { members: string[]; show: Partial<Record<string, Fame>> }

export const STRUCTURE_FAMILIES: StructureFamily[] = [
  // One country each
  { members: ["BR"], show: { BR: 1 } },                       // field with a diamond
  { members: ["JM"], show: { JM: 1 } },                       // saltire, four triangles
  { members: ["BI"], show: { BI: 3 } },                       // saltire with a central disc
  { members: ["GB"], show: { GB: 1 } },                       // the Union Jack
  { members: ["GR"], show: { GR: 1 } },                       // stripes, canton with a cross
  { members: ["CH"], show: { CH: 1 } },                       // square cross that stops short of the edges
  { members: ["GE"], show: { GE: 2 } },                       // cross with four small crosses
  { members: ["CA", "VC"], show: { CA: 1 } },                 // vertical 1:2:1 (Canadian pale)
  { members: ["IL"], show: { IL: 1 } },                       // two bands set in from the edges
  { members: ["NP"], show: { NP: 1 } },                       // two pennants
  { members: ["KW"], show: { KW: 2 } },                       // trapezoid at the hoist
  { members: ["GY"], show: { GY: 2 } },                       // arrowhead
  { members: ["ER"], show: { ER: 2 } },                       // triangle reaching the fly
  { members: ["TL"], show: { TL: 3 } },                       // two nested triangles
  { members: ["SC"], show: { SC: 2 } },                       // rays from the lower hoist
  { members: ["MK"], show: { MK: 2 } },                       // eight rays and a sun disc
  { members: ["LC"], show: { LC: 2 } },                       // nested triangles on a field
  { members: ["AG"], show: { AG: 2 } },                       // V shape
  { members: ["BN"], show: { BN: 3 } },                       // two diagonal bands
  { members: ["CU"], show: { CU: 1 } },                       // five stripes and a triangle
  { members: ["CF"], show: { CF: 3 } },                       // four stripes crossed by a vertical band
  { members: ["PA"], show: { PA: 2 } },                       // quarters
  { members: ["DO"], show: { DO: 2 } },                       // centred cross, quarters
  { members: ["LA"], show: { LA: 3 } },                       // 1:2:1 stripes with a disc
  { members: ["UG"], show: { UG: 3 } },                       // six stripes with a disc
  { members: ["KP"], show: { KP: 2 } },                       // bordered band with a disc
  { members: ["MU"], show: { MU: 3 } },                       // four equal stripes
  { members: ["TO"], show: { TO: 3 } },                       // field, canton with a cross
  { members: ["LK"], show: { LK: 3 } },                       // border, two panels
  { members: ["GD"], show: { GD: 3 } },                       // border and triangles
  { members: ["DM"], show: { DM: 3 } },                       // triple cross with a disc
  { members: ["MV"], show: { MV: 3 } },                       // panel inside a border
  { members: ["KM"], show: { KM: 3 } },                       // four stripes and a triangle
  { members: ["CL"], show: { CL: 2 } },                       // two bands, canton
  { members: ["SR"], show: { SR: 3 } },                       // five unequal stripes
  { members: ["PK"], show: { PK: 2 } },                       // field with a hoist band
  { members: ["ME"], show: { ME: 3 } },                       // field with a border
  { members: ["LV"], show: { LV: 2 } },                       // 2:1:2 stripes
  { members: ["KI"], show: { KI: 3 } },                       // sky over waves
  { members: ["MH"], show: { MH: 3 } },                       // two rays
  { members: ["CV"], show: { CV: 3 } },                       // low stripes on a field
  { members: ["ZM"], show: { ZM: 3 } },                       // three bars at the lower fly
  { members: ["BA"], show: { BA: 2 } },                       // triangle on a field
  { members: ["TG"], show: { TG: 3 } },                       // five stripes, canton
  // Several countries each
  { members: ["ZA", "VU"], show: { ZA: 1, VU: 3 } },          // Y (pall)
  { members: ["CZ", "PH", "DJ"], show: { CZ: 1, PH: 2, DJ: 3 } }, // two bands and a hoist triangle
  { members: ["SD", "JO", "PS", "BS", "ST", "GQ"], show: { BS: 2, SD: 2, JO: 2, ST: 3 } }, // three bands and a hoist triangle
  { members: ["MZ", "SS"], show: { MZ: 3, SS: 3 } },          // bordered bands and a hoist triangle
  { members: ["US", "MY", "LR"], show: { US: 1, MY: 2, LR: 3 } }, // many stripes and a canton
  { members: ["JP", "BD", "PW"], show: { JP: 1, BD: 2, PW: 3 } }, // a disc on a field
  { members: ["DK", "SE", "FI"], show: { DK: 1, SE: 1, FI: 1 } }, // Nordic cross
  { members: ["NO", "IS"], show: { NO: 1, IS: 2 } },          // Nordic cross with a border
  { members: ["BT", "PG"], show: { BT: 2, PG: 3 } },          // split on the diagonal
  { members: ["TZ", "KN", "NA"], show: { TZ: 2, KN: 3, NA: 3 } }, // bordered diagonal band between triangles
  { members: ["TT", "CD"], show: { TT: 2, CD: 3 } },          // bordered diagonal band on a field
  { members: ["CG", "SB"], show: { CG: 3 } },                 // diagonal band between triangles
  { members: ["AE", "OM"], show: { AE: 2, OM: 3 } },          // hoist band and three stripes
  { members: ["BH", "QA"], show: { QA: 2, BH: 2 } },          // serrated hoist
  { members: ["BJ", "GW", "MG"], show: { BJ: 3, MG: 3 } },    // hoist band and two stripes
  { members: ["TH", "CR"], show: { TH: 2, CR: 3 } },          // five stripes, double middle
  { members: ["CO", "EC", "RW"], show: { CO: 2 } },           // 2:1:1 stripes
  { members: ["ES", "LB", "KH", "LY"], show: { ES: 1 } },     // 1:2:1 stripes
  { members: ["AU", "NZ", "TV", "FJ"], show: { AU: 1, NZ: 1 } }, // Union Jack canton on a field
  { members: ["WS", "TW"], show: { TW: 2, WS: 3 } },          // field with a canton
  { members: ["MR", "BZ"], show: { MR: 3 } },                 // field with a stripe along each edge
  { members: ["BW", "NR"], show: { BW: 3 } },                 // band across a field
  { members: ["NE", "ET"], show: { NE: 3 } },                 // three stripes with a disc
]

/** Emblems that read well as a one-colour stencil, with how well known each is.
 *  Each counts only for its own country. */
export const EMBLEM_FAME: Record<string, Fame> = {
  af: 1, al: 1, ar: 1, br: 1, cy: 1, lb: 1, mx: 1, sa: 1, bt: 1, kh: 1,
  eg: 2, hr: 2, iq: 2, kg: 2, kz: 2, lk: 2, mz: 2, xk: 2, ug: 2, pt: 2, li: 2, er: 2,
  ao: 3, bn: 3, mw: 3, om: 3, sz: 3, vu: 3, zm: 3, zw: 3, me: 3, si: 3, va: 3,
}

/** Countries whose colours may dress a round, with how well known the flag
 *  is. A colour set is only used when few countries share it
 *  (utils/flagFusion.ts → COLOUR_POOL), and every one of them counts. */
export const COLOUR_FAME: Record<string, Fame> = {
  BR: 1, DE: 1, BE: 1, JM: 1, SE: 1, UA: 1, IN: 1, IE: 1, AR: 1, ZA: 1, GR: 1, IL: 1, CH: 1, JP: 1, CA: 1,
  ES: 1, CN: 1, MX: 1, IT: 1, FR: 1, US: 1, GB: 1, TR: 1, KR: 1, PT: 1, NL: 1, AU: 1, SA: 1,
  BT: 2, LK: 2, CO: 2, VE: 2, RO: 2, LT: 2, BO: 2, GH: 2, ET: 2, KE: 2, NG: 2, PK: 2,
  EE: 2, FI: 2, BA: 2, MN: 2, NP: 2, QA: 2, LV: 2, AM: 2, AZ: 2, UY: 2, BS: 2, TZ: 2, SC: 2, MU: 2, CU: 2,
  ZM: 3, BW: 3, MH: 3, LC: 3, PW: 3, GY: 3, TT: 3, KN: 3, SR: 3, GD: 3, DM: 3, VU: 3, RW: 3, MR: 3,
  NA: 3, ZW: 3, GA: 3, KI: 3, CV: 3, MZ: 3, SS: 3, CF: 3, KM: 3, BB: 3, SB: 3, AG: 3, NR: 3, TO: 3,
}
