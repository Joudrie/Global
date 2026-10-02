import { useEffect, useRef } from "react"
import { ADSENSE_CLIENT, ADS_ENABLED } from "../ads"
import { isSupporter } from "../utils/storage"

// The app's index.html deliberately doesn't load the AdSense library, so Auto
// ads never place anything inside a game. The first configured slot injects it
// once, without the ?client= parameter that would switch on Auto ads for the
// whole page: only these labelled, inline units show.
let scriptRequested = false
function ensureAdScript() {
  if (scriptRequested || typeof document === "undefined") return
  scriptRequested = true
  if (document.querySelector('script[src*="adsbygoogle.js"]')) return
  const s = document.createElement("script")
  s.async = true
  s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
  s.crossOrigin = "anonymous"
  document.head.appendChild(s)
}

declare global {
  interface Window { adsbygoogle?: Record<string, unknown>[] }
}

// A single responsive AdSense display unit. Renders nothing until both a
// publisher ID (ads.ts) and this slot's unit ID are set, so it's safe to drop
// anywhere in the UI now and flip on later.
export default function AdSlot({ slot, style }: { slot: string; style?: React.CSSProperties }) {
  const supporter = isSupporter()
  // Push exactly once per mounted <ins>. Re-running push({}) (effect re-fire or
  // StrictMode's double-invoke) fills the *next* unfilled <ins> on the page,
  // desyncing units and throwing "All ins elements already have ads".
  const pushed = useRef(false)
  useEffect(() => {
    if (!ADS_ENABLED || !slot || supporter || pushed.current) return
    ensureAdScript()
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
      pushed.current = true
    } catch { /* AdSense not ready yet */ }
  }, [slot, supporter])

  if (!ADS_ENABLED || !slot || supporter) return null
  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", ...style }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}
