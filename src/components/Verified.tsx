import { T, ACCENT } from "../ui/tokens"

/** The verified check by the creator's name: a filled disc with a check. */
export function VerifiedMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Verified creator" style={{ flexShrink: 0, display: "block" }}>
      <title>Verified creator</title>
      <path fill={ACCENT.learn} d="M12 1.5l2.6 1.9 3.2-.2 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.2z" />
      <path d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke={T.surface} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** The crown that sits on the creator's picture, tilted like a hat. */
export function CreatorCrown({ size }: { size: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.78)} viewBox="0 0 32 25" aria-hidden style={{ display: "block" }}>
      <path d="M3 21.5L1.5 6.5l8 6L16 2l6.5 10.5 8-6-1.5 15z" fill={T.amber} stroke={T.bg} strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 21.5h24" stroke={T.bg} strokeWidth="2" />
      <circle cx="16" cy="15.5" r="1.8" fill={T.bg} />
    </svg>
  )
}
