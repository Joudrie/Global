// Frankenflag shows half of each flag, and many halves look the same: plain
// red (Poland, Liechtenstein, Chile), red over white (Austria, Netherlands,
// Hungary). A guess counts when its half looks like the one shown.

const W = 40, H = 30           // the 4:3 artwork, small
const cache = new Map<string, Promise<Uint8ClampedArray | null>>()

function pixels(url: string): Promise<Uint8ClampedArray | null> {
  let p = cache.get(url)
  if (!p) {
    p = new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        try {
          const c = document.createElement("canvas"); c.width = W; c.height = H
          const ctx = c.getContext("2d")!
          ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H)
          ctx.drawImage(img, 0, 0, W, H)
          resolve(ctx.getImageData(0, 0, W, H).data)
        } catch { resolve(null) }
      }
      img.onerror = () => resolve(null)
      img.src = url
    })
    cache.set(url, p)
  }
  return p
}

/** True when the two flags' top (or bottom) halves look alike: mean channel difference under 30. */
export async function sameHalf(aUrl: string, bUrl: string, half: "top" | "bottom"): Promise<boolean> {
  if (aUrl === bUrl) return true
  const [a, b] = await Promise.all([pixels(aUrl), pixels(bUrl)])
  if (!a || !b) return false
  const from = half === "top" ? 0 : H / 2, to = half === "top" ? H / 2 : H
  let diff = 0, n = 0
  for (let y = from; y < to; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4
    diff += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])
    n += 3
  }
  return diff / n < 30
}
