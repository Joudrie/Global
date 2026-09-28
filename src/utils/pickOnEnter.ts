// What Enter should submit in a type-a-country box. Prefer the option whose
// name is exactly what was typed (case-insensitive), so "Niger" submits Niger
// even though "Nigeria" also matches; otherwise only a single unambiguous match.
export function pickOnEnter<X extends { name: string }>(matches: X[], typed: string): X | undefined {
  const q = typed.trim().toLowerCase()
  if (!q) return undefined
  return matches.find(m => m.name.toLowerCase() === q) ?? (matches.length === 1 ? matches[0] : undefined)
}
