// The site's own account: a crown on its picture and a verified check by its
// name. It comes only from public.entitlements.badge, which players can read
// but never write (only the owner sets it in the SQL editor), so nobody can
// give it to themselves. Any other badge is just shown as its chip.
export const CREATOR_BADGE = "Creator"

export const isCreator = (badge: string | null | undefined): boolean =>
  typeof badge === "string" && badge.trim().toLowerCase() === CREATOR_BADGE.toLowerCase()
