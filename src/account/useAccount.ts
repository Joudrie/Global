// The account, for components that only show something about it (the
// profile's badge and username). Loads nothing for a signed-out player; picks
// the account up as soon as anything on the page loads it (signing in on the
// account card, say).
import { useEffect, useReducer, useState } from "react"
import { accountsConfigured, hasStoredSession, loadAccountService, loadedAccountService, onAccountServiceLoad, SIGN_IN_RETURN } from "../accounts"
import type { AccountView } from "./service"

type Service = NonNullable<ReturnType<typeof loadedAccountService>>

export function useAccount(): { svc: Service | null; view: AccountView | null } {
  const [svc, setSvc] = useState<Service | null>(loadedAccountService)
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    if (svc) return
    let live = true
    const off = onAccountServiceLoad(() => { if (live) setSvc(loadedAccountService()) })
    if (accountsConfigured() && (hasStoredSession() || SIGN_IN_RETURN)) {
      loadAccountService().then(m => { if (live) setSvc(m) }, () => { /* offline: shown without the account */ })
    }
    return () => { live = false; off() }
  }, [svc])
  useEffect(() => svc?.subscribe(rerender), [svc])
  return { svc, view: svc ? svc.getView() : null }
}
