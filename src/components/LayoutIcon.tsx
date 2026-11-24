import { useId } from "react"
import { T } from "../ui/tokens"

/* Small drawn flag layouts for the Flag Identifier's first question (and its
   poster): plain geometry in two neutral tones, never a real flag, so the
   picture shows the shape without hinting at a country. 60×40, 3:2. */

export type LayoutIconId =
  | "hstripes" | "vstripes" | "split" | "cross" | "nordic" | "saltire" | "diagonal" | "hoist"
  | "chevron" | "canton" | "unionjack" | "disc" | "diamond" | "border" | "plain" | "quartered" | "shape"

const STAR = "30,12.5 31.8,17.6 37.1,17.7 32.8,20.9 34.4,26 30,23 25.6,26 27.2,20.9 22.9,17.7 28.2,17.6"

export function LayoutIcon({ id, ink = T.muted, field = T.surface, line = T.lineHi, width = 60 }:
  { id: LayoutIconId; ink?: string; field?: string; line?: string; width?: number }) {
  const clip = `li${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
  const shapes = (() => {
    switch (id) {
      case "hstripes": return <><rect width={60} height={13.3} fill={ink} /><rect y={26.7} width={60} height={13.3} fill={ink} /></>
      case "vstripes": return <><rect width={20} height={40} fill={ink} /><rect x={40} width={20} height={40} fill={ink} /></>
      case "split": return <rect width={60} height={20} fill={ink} />
      case "cross": return <><rect x={25} width={10} height={40} fill={ink} /><rect y={15} width={60} height={10} fill={ink} /></>
      case "nordic": return <><rect x={16} width={8} height={40} fill={ink} /><rect y={16} width={60} height={8} fill={ink} /></>
      case "saltire": return <path d="M0 0 L60 40 M60 0 L0 40" stroke={ink} strokeWidth={7} />
      case "diagonal": return <path d="M0 40 L60 0" stroke={ink} strokeWidth={10} />
      case "hoist": return <polygon points="0,0 26,20 0,40" fill={ink} />
      case "chevron": return <polyline points="0,3 30,20 0,37" fill="none" stroke={ink} strokeWidth={7} />
      case "canton": return <rect width={26} height={20} fill={ink} />
      case "unionjack": return (
        <>
          <rect width={28} height={20} fill={ink} />
          <path d="M0 0 L28 20 M28 0 L0 20" stroke={field} strokeWidth={3} />
          <path d="M14 0 V20 M0 10 H28" stroke={field} strokeWidth={4} />
        </>
      )
      case "disc": return <circle cx={30} cy={20} r={11} fill={ink} />
      case "diamond": return <polygon points="30,4 55,20 30,36 5,20" fill={ink} />
      case "border": return <path fillRule="evenodd" d="M0 0 H60 V40 H0 Z M7 7 V33 H53 V7 Z" fill={ink} />
      case "plain": return <polygon points={STAR} fill={ink} />
      case "quartered": return <><rect width={30} height={20} fill={ink} /><rect x={30} y={20} width={30} height={20} fill={ink} /></>
      case "shape": return null
    }
  })()
  return (
    <svg viewBox="-1 -1 62 42" width={width} height={width * 2 / 3} aria-hidden style={{ display: "block", overflow: "visible" }}>
      {id === "shape"
        ? <polygon points="2,0 40,19 18,19 40,40 2,40" fill={ink} stroke={line} strokeWidth={1} strokeLinejoin="round" />
        : (
          <>
            <defs><clipPath id={clip}><rect width={60} height={40} rx={2} /></clipPath></defs>
            <rect width={60} height={40} rx={2} fill={field} />
            <g clipPath={`url(#${clip})`}>{shapes}</g>
            <rect width={60} height={40} rx={2} fill="none" stroke={line} strokeWidth={1} />
          </>
        )}
    </svg>
  )
}
