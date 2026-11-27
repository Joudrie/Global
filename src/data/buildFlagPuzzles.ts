export type Layout = 'v3' | 'h3' | 'h2' | 'v2' | 'h4' | 'disc' | 'star'

export interface Piece {
  id: string
  color: string
  label: string
}

export interface BuildPuzzle {
  code: string
  name: string
  layout: Layout
  slots: string[]                    // ordered slot ids
  solution: Record<string, string>   // slotId -> pieceId
  pieces: Piece[]                    // correct + decoys, shuffled
}

function p(id: string, color: string, label: string): Piece {
  return { id, color, label }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const GREEN   = (id: string) => p(id, '#169B62', 'Green')
const RED     = (id: string) => p(id, '#CF0921', 'Red')
const BLUE    = (id: string) => p(id, '#003189', 'Blue')
const WHITE   = (id: string) => p(id, '#F5F5F5', 'White')
const BLACK   = (id: string) => p(id, '#1A1A1A', 'Black')
const YELLOW  = (id: string) => p(id, '#FFCE00', 'Yellow')
const ORANGE  = (id: string) => p(id, '#FF883E', 'Orange')
const SKYBLUE = (id: string) => p(id, '#4189DD', 'Light Blue')

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ── Puzzles ───────────────────────────────────────────────────────────────────
const raw: BuildPuzzle[] = [

  // ── Vertical tricolors (v3) ──────────────────────────────────────────────
  {
    code: 'IE', name: 'Ireland', layout: 'v3',
    slots: ['left', 'center', 'right'],
    solution: { left: 'g', center: 'w', right: 'o' },
    pieces: shuffle([GREEN('g'), WHITE('w'), ORANGE('o'),
      RED('r'), BLUE('b'), YELLOW('y')]),
  },
  {
    code: 'FR', name: 'France', layout: 'v3',
    slots: ['left', 'center', 'right'],
    solution: { left: 'b', center: 'w', right: 'r' },
    pieces: shuffle([BLUE('b'), WHITE('w'), RED('r'),
      GREEN('g'), YELLOW('y'), BLACK('k')]),
  },
  {
    code: 'IT', name: 'Italy', layout: 'v3',
    slots: ['left', 'center', 'right'],
    solution: { left: 'g', center: 'w', right: 'r' },
    pieces: shuffle([GREEN('g'), WHITE('w'), RED('r'),
      BLUE('b'), ORANGE('o'), YELLOW('y')]),
  },
  {
    code: 'BE', name: 'Belgium', layout: 'v3',
    slots: ['left', 'center', 'right'],
    solution: { left: 'k', center: 'y', right: 'r' },
    pieces: shuffle([BLACK('k'), YELLOW('y'), RED('r'),
      WHITE('w'), BLUE('b'), GREEN('g')]),
  },
  {
    code: 'RO', name: 'Romania', layout: 'v3',
    slots: ['left', 'center', 'right'],
    solution: { left: 'b', center: 'y', right: 'r' },
    pieces: shuffle([BLUE('b'), YELLOW('y'), RED('r'),
      GREEN('g'), WHITE('w'), ORANGE('o')]),
  },

  // ── Horizontal tricolors (h3) ──────────────────────────────────────────
  {
    code: 'DE', name: 'Germany', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'k', middle: 'r', bottom: 'y' },
    pieces: shuffle([BLACK('k'), RED('r'), YELLOW('y'),
      WHITE('w'), BLUE('b'), GREEN('g')]),
  },
  {
    code: 'NL', name: 'Netherlands', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'r', middle: 'w', bottom: 'b' },
    pieces: shuffle([RED('r'), WHITE('w'), p('b','#21468B','Blue'),
      GREEN('g'), YELLOW('y'), BLACK('k')]),
  },
  {
    code: 'RU', name: 'Russia', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'w', middle: 'b', bottom: 'r' },
    pieces: shuffle([WHITE('w'), BLUE('b'), RED('r'),
      GREEN('g'), YELLOW('y'), BLACK('k')]),
  },
  {
    code: 'AT', name: 'Austria', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'r', middle: 'w', bottom: 'r2' },
    pieces: shuffle([RED('r'), WHITE('w'), p('r2','#CF0921','Red'),
      BLUE('b'), GREEN('g'), BLACK('k')]),
  },
  {
    code: 'HU', name: 'Hungary', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'r', middle: 'w', bottom: 'g' },
    pieces: shuffle([RED('r'), WHITE('w'), GREEN('g'),
      BLUE('b'), YELLOW('y'), BLACK('k')]),
  },
  {
    code: 'BG', name: 'Bulgaria', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'w', middle: 'g', bottom: 'r' },
    pieces: shuffle([WHITE('w'), GREEN('g'), RED('r'),
      BLUE('b'), YELLOW('y'), BLACK('k')]),
  },
  {
    code: 'LT', name: 'Lithuania', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'y', middle: 'g', bottom: 'r' },
    pieces: shuffle([YELLOW('y'), GREEN('g'), RED('r'),
      WHITE('w'), BLUE('b'), BLACK('k')]),
  },
  {
    code: 'ET', name: 'Ethiopia', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'g', middle: 'y', bottom: 'r' },
    pieces: shuffle([GREEN('g'), YELLOW('y'), RED('r'),
      WHITE('w'), BLUE('b'), BLACK('k')]),
  },
  {
    code: 'GA', name: 'Gabon', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'g', middle: 'y', bottom: 'b' },
    pieces: shuffle([GREEN('g'), YELLOW('y'), BLUE('b'),
      WHITE('w'), RED('r'), BLACK('k')]),
  },

  // ── Horizontal bicolors (h2) ──────────────────────────────────────────
  {
    code: 'PL', name: 'Poland', layout: 'h2',
    slots: ['top', 'bottom'],
    solution: { top: 'w', bottom: 'r' },
    pieces: shuffle([WHITE('w'), RED('r'),
      BLUE('b'), GREEN('g'), YELLOW('y'), BLACK('k')]),
  },
  {
    code: 'ID', name: 'Indonesia', layout: 'h2',
    slots: ['top', 'bottom'],
    solution: { top: 'r', bottom: 'w' },
    pieces: shuffle([RED('r'), WHITE('w'),
      BLUE('b'), GREEN('g'), YELLOW('y'), BLACK('k')]),
  },
  {
    code: 'UA', name: 'Ukraine', layout: 'h2',
    slots: ['top', 'bottom'],
    solution: { top: 'b', bottom: 'y' },
    pieces: shuffle([p('b','#005BBB','Blue'), p('y','#FFD500','Yellow'),
      RED('r'), WHITE('w'), GREEN('g'), BLACK('k')]),
  },
  {
    code: 'EE', name: 'Estonia', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'b', middle: 'k', bottom: 'w' },
    pieces: shuffle([BLUE('b'), BLACK('k'), WHITE('w'),
      RED('r'), GREEN('g'), YELLOW('y')]),
  },

  // ── Disc (Japan) ──────────────────────────────────────────────────────
  {
    code: 'JP', name: 'Japan', layout: 'disc',
    slots: ['bg', 'disc'],
    solution: { bg: 'w', disc: 'r' },
    pieces: shuffle([
      WHITE('w'), RED('r'),
      BLUE('b'), GREEN('g'), p('y','#FFD500','Yellow'),
    ]),
  },

  // ── Single big star (star) ────────────────────────────────────────────────
  {
    code: 'VN', name: 'Vietnam', layout: 'star',
    slots: ['bg', 'star'],
    solution: { bg: 'r', star: 'y' },
    pieces: shuffle([RED('r'), YELLOW('y'), WHITE('w'), GREEN('g'), BLUE('b')]),
  },
  {
    code: 'MA', name: 'Morocco', layout: 'star',
    slots: ['bg', 'star'],
    solution: { bg: 'r', star: 'g' },
    pieces: shuffle([RED('r'), GREEN('g'), YELLOW('y'), WHITE('w'), BLACK('k')]),
  },
  {
    code: 'SO', name: 'Somalia', layout: 'star',
    slots: ['bg', 'star'],
    solution: { bg: 's', star: 'w' },
    pieces: shuffle([SKYBLUE('s'), WHITE('w'), RED('r'), YELLOW('y'), BLUE('b')]),
  },

  // ── More vertical tricolors (v3) ─────────────────────────────────────────
  {
    code: 'TD', name: 'Chad', layout: 'v3',
    slots: ['left', 'center', 'right'],
    solution: { left: 'b', center: 'y', right: 'r' },
    pieces: shuffle([BLUE('b'), YELLOW('y'), RED('r'), WHITE('w'), GREEN('g'), BLACK('k')]),
  },
  {
    code: 'ML', name: 'Mali', layout: 'v3',
    slots: ['left', 'center', 'right'],
    solution: { left: 'g', center: 'y', right: 'r' },
    pieces: shuffle([GREEN('g'), YELLOW('y'), RED('r'), WHITE('w'), BLUE('b'), BLACK('k')]),
  },
  {
    code: 'GN', name: 'Guinea', layout: 'v3',
    slots: ['left', 'center', 'right'],
    solution: { left: 'r', center: 'y', right: 'g' },
    pieces: shuffle([RED('r'), YELLOW('y'), GREEN('g'), WHITE('w'), BLUE('b'), BLACK('k')]),
  },
  {
    code: 'CI', name: "Côte d'Ivoire", layout: 'v3',
    slots: ['left', 'center', 'right'],
    solution: { left: 'o', center: 'w', right: 'g' },
    pieces: shuffle([ORANGE('o'), WHITE('w'), GREEN('g'), RED('r'), BLUE('b'), YELLOW('y')]),
  },
  {
    code: 'NG', name: 'Nigeria', layout: 'v3',
    slots: ['left', 'center', 'right'],
    solution: { left: 'g', center: 'w', right: 'g2' },
    pieces: shuffle([GREEN('g'), WHITE('w'), p('g2', '#169B62', 'Green'), RED('r'), BLUE('b'), YELLOW('y')]),
  },
  {
    code: 'PE', name: 'Peru', layout: 'v3',
    slots: ['left', 'center', 'right'],
    solution: { left: 'r', center: 'w', right: 'r2' },
    pieces: shuffle([RED('r'), WHITE('w'), p('r2', '#CF0921', 'Red'), BLUE('b'), GREEN('g'), YELLOW('y')]),
  },

  // ── More horizontal tricolors (h3) ───────────────────────────────────────
  {
    code: 'AM', name: 'Armenia', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'r', middle: 'b', bottom: 'o' },
    pieces: shuffle([p('r', '#D90012', 'Red'), p('b', '#0033A0', 'Blue'), p('o', '#F2A800', 'Orange'), WHITE('w'), GREEN('g'), BLACK('k')]),
  },
  {
    code: 'CO', name: 'Colombia', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'y', middle: 'b', bottom: 'r' },
    pieces: shuffle([p('y', '#FCD116', 'Yellow'), p('b', '#003893', 'Blue'), p('r', '#CE1126', 'Red'), WHITE('w'), GREEN('g'), BLACK('k')]),
  },
  {
    code: 'BO', name: 'Bolivia', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'r', middle: 'y', bottom: 'g' },
    pieces: shuffle([RED('r'), YELLOW('y'), GREEN('g'), WHITE('w'), BLUE('b'), BLACK('k')]),
  },
  {
    code: 'YE', name: 'Yemen', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'r', middle: 'w', bottom: 'k' },
    pieces: shuffle([RED('r'), WHITE('w'), BLACK('k'), BLUE('b'), GREEN('g'), YELLOW('y')]),
  },
  {
    code: 'SL', name: 'Sierra Leone', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'g', middle: 'w', bottom: 'b' },
    pieces: shuffle([p('g', '#1EB53A', 'Green'), WHITE('w'), p('b', '#0072C6', 'Blue'), RED('r'), YELLOW('y'), BLACK('k')]),
  },
  {
    code: 'IN', name: 'India', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'o', middle: 'w', bottom: 'g' },
    pieces: shuffle([p('o', '#FF9933', 'Saffron'), WHITE('w'), p('g', '#138808', 'Green'), RED('r'), BLUE('b'), YELLOW('y')]),
  },
  {
    code: 'LU', name: 'Luxembourg', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'r', middle: 'w', bottom: 'lb' },
    pieces: shuffle([RED('r'), WHITE('w'), p('lb', '#00A1DE', 'Light blue'), BLUE('b'), GREEN('g'), YELLOW('y')]),
  },
  {
    code: 'LV', name: 'Latvia', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'm', middle: 'w', bottom: 'm2' },
    pieces: shuffle([p('m', '#9E3039', 'Maroon'), WHITE('w'), p('m2', '#9E3039', 'Maroon'), RED('r'), BLUE('b'), BLACK('k')]),
  },

  // ── More horizontal bicolors (h2) ────────────────────────────────────────
  {
    code: 'MC', name: 'Monaco', layout: 'h2',
    slots: ['top', 'bottom'],
    solution: { top: 'r', bottom: 'w' },
    pieces: shuffle([RED('r'), WHITE('w'), BLUE('b'), GREEN('g'), YELLOW('y'), BLACK('k')]),
  },
  {
    code: 'GM', name: 'The Gambia', layout: 'h3',
    slots: ['top', 'middle', 'bottom'],
    solution: { top: 'r', middle: 'b', bottom: 'g' },
    pieces: shuffle([RED('r'), BLUE('b'), GREEN('g'), WHITE('w'), YELLOW('y'), BLACK('k')]),
  },

  // ── Four horizontal bands (h4) ───────────────────────────────────────────
  {
    code: 'MU', name: 'Mauritius', layout: 'h4',
    slots: ['top', 'upper', 'lower', 'bottom'],
    solution: { top: 'r', upper: 'b', lower: 'y', bottom: 'g' },
    pieces: shuffle([RED('r'), BLUE('b'), YELLOW('y'), GREEN('g'), WHITE('w'), BLACK('k')]),
  },
]

// The palette offers each colour once and it never runs out: a colour can
// fill any number of bands. Listing Austria's red twice told a player that
// two of its three bands were red before they'd thought about the flag.
// Pieces of the same colour merge into one (the solution points at it), and
// a decoy takes the freed place, so the palette is always the same size and
// a short one can't hint that a colour repeats.
const DECOYS = [RED, WHITE, BLUE, GREEN, YELLOW, BLACK, ORANGE, SKYBLUE]
const colourKey = (c: string) => c.toLowerCase()

export function oneOfEachColour(pz: BuildPuzzle): BuildPuzzle {
  const byColour = new Map<string, Piece>()
  for (const pc of pz.pieces) if (!byColour.has(colourKey(pc.color))) byColour.set(colourKey(pc.color), pc)
  const pieces = [...byColour.values()]
  for (const make of DECOYS) {
    if (pieces.length >= pz.pieces.length) break
    const d = make(`d${pieces.length}`)
    if (!pieces.some(pc => colourKey(pc.color) === colourKey(d.color) || pc.label.toLowerCase() === d.label.toLowerCase())) pieces.push(d)
  }
  const keptId = (id: string) => byColour.get(colourKey(pz.pieces.find(pc => pc.id === id)!.color))!.id
  const solution = Object.fromEntries(Object.entries(pz.solution).map(([slot, id]) => [slot, keptId(id)]))
  return { ...pz, pieces: pieces.length === pz.pieces.length && pieces.every((pc, i) => pc === pz.pieces[i]) ? pz.pieces : shuffle(pieces), solution }
}

export const PUZZLES: BuildPuzzle[] = raw.map(oneOfEachColour)
