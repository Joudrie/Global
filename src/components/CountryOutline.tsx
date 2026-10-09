import { useRef, useState, useEffect, useLayoutEffect } from "react"
import type { CSSProperties } from "react"
import { WORLD_VIEWBOX, OUTLINES } from "virtual:world-outlines"

/**
 * Renders a single country's outline from the local @svg-maps/world path data
 * (no network). The Geography quiz previously pulled raster outlines from the
 * mapsicon CDN, which is missing/mismatched for a number of countries — so some
 * outlines silently failed to load. Drawing the vector path locally is reliable
 * and instant. For the handful of codes the map doesn't include, we fall back
 * to the mapsicon image so nothing renders blank.
 *
 * Each country's path is its own small chunk, simplified at build time by
 * scripts/world-paths.mjs, so a screen loads only the outlines it draws.
 */
const PATHS = new Map<string, string>()

export function hasOutline(code: string): boolean {
  return code.toLowerCase() in OUTLINES
}

/** Starts loading these outlines (e.g. a whole quiz round up front). Never
 *  rejects: one that fails to load is simply missing, and tried again next time. */
export function loadOutlines(codes: string[]): Promise<void> {
  const want = codes.map(c => c.toLowerCase()).filter(c => !PATHS.has(c) && c in OUTLINES)
  return Promise.all(want.map(c => OUTLINES[c]().then(m => { PATHS.set(c, m.default) }, () => {}))).then(() => {})
}

/** Paths by lower-case code once all of `codes` have loaded; null until then. */
export function useOutlines(codes: string[]): Map<string, string> | null {
  const key = codes.join()
  const ready = () => codes.every(c => PATHS.has(c.toLowerCase()) || !hasOutline(c))
  const [loaded, setLoaded] = useState(() => (ready() ? key : null))
  useEffect(() => {
    if (ready()) { setLoaded(key); return }
    let live = true
    loadOutlines(codes).then(() => { if (live) setLoaded(key) })
    return () => { live = false }
  }, [key])
  return loaded === key ? PATHS : null
}

interface Props {
  code: string
  fill?: string
  className?: string
  style?: CSSProperties
}

export default function CountryOutline({ code, fill = "#fff", className, style }: Props) {
  const path = useOutlines([code])?.get(code.toLowerCase())
  const pathRef = useRef<SVGPathElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [vb, setVb] = useState<string | null>(null)
  const [forCode, setForCode] = useState<string | null>(null)

  useLayoutEffect(() => {
    if (!path) return
    const measure = (): boolean => {
      const el = pathRef.current
      if (!el) return false
      let b: DOMRect
      try { b = el.getBBox() } catch { return false }
      // getBBox returns a 0×0 box when an ancestor is display:none. Don't latch
      // a viewBox yet — re-measure when the element actually becomes visible,
      // otherwise the outline stays at opacity:0 forever.
      if (b.width === 0 || b.height === 0) return false
      const pad = Math.max(b.width, b.height) * 0.08
      setVb(`${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`)
      setForCode(code)
      return true
    }
    if (measure()) return
    const target = svgRef.current
    if (!target || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting) && measure()) io.disconnect()
    })
    io.observe(target)
    return () => io.disconnect()
  }, [code, path])

  if (!hasOutline(code)) {
    // Fallback for codes not present in the local map: mapsicon raster.
    const c = code.toLowerCase()
    return (
      <img
        src={`https://cdn.jsdelivr.net/gh/djaiss/mapsicon@master/all/${c}/512.png`}
        alt=""
        className={className}
        style={{ ...style, filter: "brightness(0) invert(1)" }}
        onError={e => {
          const el = e.target as HTMLImageElement
          if (!el.dataset.fb) {
            el.dataset.fb = "1"
            el.src = `https://cdn.jsdelivr.net/gh/djaiss/mapsicon@master/all/${c}/vector.svg`
          }
        }}
      />
    )
  }

  const ready = forCode === code && vb != null
  return (
    <svg
      ref={svgRef}
      viewBox={vb ?? WORLD_VIEWBOX}
      className={className}
      style={{ ...style, opacity: ready ? 1 : 0, transition: "opacity 0.2s" }}
      preserveAspectRatio="xMidYMid meet"
    >
      {path && <path ref={pathRef} d={path} fill={fill} />}
    </svg>
  )
}
