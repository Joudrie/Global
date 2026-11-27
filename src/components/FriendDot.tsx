import { T } from "../ui/tokens"
import { useAccount } from "../account/useAccount"

/* The count of friend requests waiting, on the header's profile button. Tiny
   on purpose: it's in the first-load bundle, and loads nothing for a player
   who isn't signed in (the account service loads at start for those who are). */

/** Friend requests waiting for this player (0 signed out, or before friends exist). */
export function useFriendRequests(): number {
  const { view } = useAccount()
  return view?.signedIn && view.friends.status === "ready" ? view.friends.incoming.length : 0
}

export function FriendDot({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span aria-hidden style={{ position: "absolute", top: -4, right: -4, minWidth: 20, height: 20, padding: "0 4px", borderRadius: 999,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, lineHeight: 1,
      color: T.onAccent, background: T.warm, border: `2px solid ${T.bg}`, fontVariantNumeric: "tabular-nums" }}>
      {count > 9 ? "9+" : count}
    </span>
  )
}

export const friendRequestsLabel = (count: number) =>
  count > 0 ? `Your profile: ${count} friend ${count === 1 ? "request" : "requests"}` : "Your profile"
