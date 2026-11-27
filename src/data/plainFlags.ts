// ── Plain flags for Spot the Error's easiest tier ───────────────────────────
// Flags with nothing on them but stripes or a Nordic cross, described part by
// part in the artwork's 640×480 viewBox with their real colours. The game
// shows the genuine /flags/<code>.svg and paints ONE part over in a wrong
// colour, so the tap target is exactly that part.
//
// Only flags whose artwork really is this simple belong here: no coat of
// arms, star or emblem that a painted band would hide (Spain, Bolivia and
// Lithuania's scaled art are left out on purpose). scripts/spoterror.test.mjs
// draws every model and compares it with the real SVG point by point.

import type { HitBox } from "./fakeFlags"

export interface PlainPart {
  /** How the reveal names it: "The <label> should be red, not green." */
  label: string
  /** The real colour, as in the artwork. */
  color: string
  /** The colour's name when colorName() would get it wrong (Armenia's apricot is orange). */
  word?: string
  /** Where it is. Later parts are drawn over earlier ones. */
  boxes: HitBox[]
}

export interface PlainFlag { code: string; name: string; parts: PlainPart[] }

const W = 640, H = 480

const LABELS: Record<"h" | "v", Record<number, string[]>> = {
  h: { 3: ["top band", "middle band", "bottom band"], 4: ["top band", "second band", "third band", "bottom band"],
    5: ["top band", "second band", "middle band", "fourth band", "bottom band"] },
  v: { 3: ["left band", "middle band", "right band"] },
}

type Band = string | [color: string, size: number, word?: string]

/** Stripes across ("h", top to bottom) or down ("v", hoist to fly). A bare
 *  colour is an equal share; [colour, size] gives the band's height or width. */
function stripes(code: string, name: string, dir: "h" | "v", bands: Band[]): PlainFlag {
  const full = dir === "h" ? H : W
  const list = bands.map((b): [string, number, string?] => typeof b === "string" ? [b, full / bands.length] : b)
  let at = 0
  const parts = list.map(([color, size, word], i) => {
    const box: HitBox = dir === "h" ? { x: 0, y: at, w: W, h: size } : { x: at, y: 0, w: size, h: H }
    at += size
    return { label: LABELS[dir][bands.length][i], color, ...(word ? { word } : {}), boxes: [box] }
  })
  return { code, name, parts }
}

/** A field with crosses drawn over it, each an upright (x, width) and a bar (y, height). */
function crossed(code: string, name: string, field: string, crosses: { label: string; color: string; x: number; w: number; y: number; h: number }[]): PlainFlag {
  return {
    code, name,
    parts: [
      { label: "background", color: field, boxes: [{ x: 0, y: 0, w: W, h: H }] },
      ...crosses.map(c => ({ label: c.label, color: c.color, boxes: [{ x: c.x, y: 0, w: c.w, h: H }, { x: 0, y: c.y, w: W, h: c.h }] })),
    ],
  }
}

export const PLAIN_FLAGS: PlainFlag[] = [
  // ── Vertical tricolours ─────────────────────────────────────────────────
  stripes("fr", "France", "v", ["#000091", "#ffffff", "#e1000f"]),
  stripes("it", "Italy", "v", ["#009246", "#ffffff", "#ce2b37"]),
  stripes("ie", "Ireland", "v", ["#009a49", "#ffffff", "#ff7900"]),
  stripes("be", "Belgium", "v", ["#000001", "#ffd90c", "#f31830"]),
  stripes("ro", "Romania", "v", ["#00319c", "#ffde00", "#de2110"]),
  stripes("td", "Chad", "v", ["#002664", "#fecb00", "#c60c30"]),
  stripes("ml", "Mali", "v", ["#009a00", "#ffff00", "#ff0000"]),
  stripes("gn", "Guinea", "v", ["#ff0000", "#ffff00", "#009900"]),
  stripes("ci", "Côte d'Ivoire", "v", ["#ff9a00", "#ffffff", "#00cd00"]),
  stripes("ng", "Nigeria", "v", ["#008753", "#ffffff", "#008753"]),
  stripes("pe", "Peru", "v", ["#d91023", "#ffffff", "#d91023"]),

  // ── Horizontal stripes ──────────────────────────────────────────────────
  stripes("de", "Germany", "h", ["#000001", "#ff0000", "#ffcc00"]),
  stripes("nl", "Netherlands", "h", ["#ae1c28", "#ffffff", "#21468b"]),
  stripes("ru", "Russia", "h", ["#ffffff", "#0039a6", "#d52b1e"]),
  stripes("hu", "Hungary", "h", ["#d43516", "#ffffff", "#388d00"]),
  stripes("ee", "Estonia", "h", ["#1791ff", "#000001", "#ffffff"]),
  stripes("bg", "Bulgaria", "h", ["#ffffff", "#00966e", "#d62612"]),
  stripes("lu", "Luxembourg", "h", ["#ed2939", "#ffffff", "#00a1de"]),
  stripes("sl", "Sierra Leone", "h", [["#00cd00", 160.7], ["#ffffff", 159.6], ["#0000cd", 159.7]]),
  stripes("ga", "Gabon", "h", ["#36a100", "#ffe700", "#006dbc"]),
  stripes("am", "Armenia", "h", ["#d90012", "#0033a0", ["#f2a800", 160, "orange"]]),
  stripes("at", "Austria", "h", ["#c8102e", "#ffffff", "#c8102e"]),
  stripes("ye", "Yemen", "h", [["#f10600", 157.4], ["#ffffff", 165.2], ["#000001", 157.4]]),
  stripes("lv", "Latvia", "h", [["#981e32", 192], ["#ffffff", 96], ["#981e32", 192]]),
  stripes("co", "Colombia", "h", [["#ffe800", 240], ["#00148e", 120], ["#da0010", 120]]),
  stripes("mu", "Mauritius", "h", ["#ee2737", "#151f6d", "#ffcd00", "#00a04d"]),
  stripes("th", "Thailand", "h", [["#a51931", 82.5], ["#f4f5f8", 80], ["#2d2a4a", 160], ["#f4f5f8", 77.5], ["#a51931", 80]]),
  stripes("cr", "Costa Rica", "h", [["#0000b4", 75.4], ["#ffffff", 82.3], ["#d90000", 157.7], ["#ffffff", 82.3], ["#0000b4", 82.3]]),

  // ── Nordic crosses ──────────────────────────────────────────────────────
  crossed("se", "Sweden", "#005293", [{ label: "cross", color: "#fecb00", x: 176, w: 96, y: 192, h: 96 }]),
  crossed("fi", "Finland", "#ffffff", [{ label: "cross", color: "#002f6c", x: 175.5, w: 130.9, y: 174.5, h: 131 }]),
  crossed("dk", "Denmark", "#c8102e", [{ label: "cross", color: "#ffffff", x: 205.7, w: 68.6, y: 205.7, h: 68.6 }]),
  crossed("no", "Norway", "#ed2939", [
    { label: "outer cross", color: "#ffffff", x: 180, w: 120, y: 180, h: 120 },
    { label: "inner cross", color: "#002664", x: 210, w: 60, y: 210, h: 60 },
  ]),
]
