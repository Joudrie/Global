import { T, ACCENT, tint } from "../ui/tokens"
import EarthLogo from "./EarthLogo"

interface Props {
  onBack: () => void
  premium: boolean
  onSetPremium: (on: boolean) => void
}

const PERKS = [
  { icon: "🚫", title: "No ads, ever", body: "Every banner and break disappears across the whole app." },
  { icon: "🌍", title: "Keeps Globalio free", body: "Your $2 helps cover hosting so the world keeps free access." },
  { icon: "💌", title: "A real thank-you", body: "A personal note from me — this is a one-person, human project." },
  { icon: "⚡", title: "Front-of-the-queue help", body: "Questions and ideas from Supporters get answered first." },
]

export default function SupporterScreen({ onBack, premium }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center px-5 py-10" style={{ background: T.bg, color: T.text, overflowY: "auto" }}>
      <div className="w-full max-w-sm flex flex-col gap-5">

        <div className="flex flex-col items-center text-center gap-3">
          <EarthLogo size={52} />
          <div className="geo-display" style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em" }}>
            {premium ? "You're a Supporter 💛" : "Become a Supporter"}
          </div>
          <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.55 }}>
            {premium
              ? "Thank you — ads are off on this device, and you're helping keep Globalio free and online for everyone."
              : "Globalio is a one-person labour of love. A one-time $2 keeps it free and online for everyone — and turns off every ad for you."}
          </p>
        </div>

        {/* Perks */}
        <div className="flex flex-col gap-3">
          {PERKS.map(p => (
            <div key={p.title} className="flex items-start gap-3 rounded-2xl p-4"
              style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{p.icon}</span>
              <div>
                <div className="geo-display" style={{ fontWeight: 700, fontSize: 15 }}>{p.title}</div>
                <div style={{ color: T.muted, fontSize: 12.5, marginTop: 2, lineHeight: 1.45 }}>{p.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Primary action */}
        {!premium && (
          <div className="rounded-2xl p-4 text-center" style={{ background: tint(T.gold, 0.1), border: `1px solid ${tint(T.gold, 0.4)}` }}>
            <div className="geo-display" style={{ fontWeight: 800, fontSize: 20, color: T.gold }}>$2 · one-time</div>
            <div style={{ color: T.muted, fontSize: 11.5, marginTop: 2 }}>No subscription. Supports a human, not a corporation.</div>
            <button disabled
              className="w-full mt-3 py-3 rounded-xl font-bold text-sm"
              style={{ background: tint(T.gold, 0.18), border: `1px solid ${tint(T.gold, 0.4)}`, color: T.gold, opacity: 0.85, cursor: "not-allowed" }}>
              Checkout coming soon
            </button>
            <div style={{ color: T.dim, fontSize: 10.5, marginTop: 6 }}>Secure payment is being set up. Thank you for your patience 💛</div>
          </div>
        )}

        <button onClick={onBack}
          className="w-full py-3 rounded-xl font-bold text-base transition-all active:scale-95"
          style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.muted }}>
          ← Back
        </button>
      </div>
    </div>
  )
}
