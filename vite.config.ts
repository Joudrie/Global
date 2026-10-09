import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { worldMapPlugin } from './scripts/world-paths.mjs'
import { flagUrlsPlugin } from './scripts/flag-urls.mjs'

export default defineConfig({
  // The GitHub Pages test site lives under /Global/ (see .github/workflows/test-site.yml).
  base: process.env.PAGES_BASE || '/',
  plugins: [react(), tailwindcss(), worldMapPlugin(), flagUrlsPlugin()],
})
