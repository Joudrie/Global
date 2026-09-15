import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initAnalytics } from './analytics'

initAnalytics()

// Lock pinch-zoom. iOS Safari deliberately ignores the viewport meta's
// `user-scalable=no` / `maximum-scale`, so a pinch still zooms the page — and
// once zoomed it can be dragged off to one side, clipping content on the left
// and leaving blank space on the right. Pinches fire the non-standard iOS
// `gesture*` events; swallowing them keeps the layout locked to the viewport.
// (Double-tap zoom is handled by `touch-action: manipulation` in index.css.)
const preventZoom = (e: Event) => e.preventDefault()
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, preventZoom, { passive: false })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
