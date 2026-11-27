// Which games people open, counted in GoatCounter (cookie-free, no IP stored,
// nothing tied to a player). Each open is sent as an event at the path
// "game/<id>", so the dashboard lists games side by side with page views.
//
// public/analytics.js loads GoatCounter's script asynchronously, and the test
// site strips it entirely, so this does nothing until window.goatcounter is
// there: an open that happens before the script arrives waits briefly for it.

interface GoatCounter { count?: (o: { path: string; title?: string; event?: boolean }) => void }
declare global { interface Window { goatcounter?: GoatCounter } }

const RECENT_MS = 30_000
const recent = new Map<string, number>()

/** Count one open of a game. Re-renders and quick back-and-forths within 30 s
 *  count once. Never throws. */
export function countGameOpen(id: string, title: string): void {
  try {
    const now = Date.now()
    if (now - (recent.get(id) ?? 0) < RECENT_MS) return
    recent.set(id, now)
    const send = () => window.goatcounter?.count?.({ path: `game/${id}`, title: `Game: ${title}`, event: true })
    if (window.goatcounter?.count) { send(); return }
    // The script may still be loading: try for a few seconds, then give up quietly.
    let tries = 0
    const t = window.setInterval(() => {
      if (window.goatcounter?.count) { window.clearInterval(t); send() }
      else if (++tries > 20) window.clearInterval(t)
    }, 250)
  } catch { /* counting must never break a game */ }
}

/** Forget recent opens (tests). */
export function resetGameCounts(): void { recent.clear() }
