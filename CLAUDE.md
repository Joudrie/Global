# Globalio

React 19 + Vite + Tailwind v4 flag game at https://globalio.app. `npm run build` builds the app,
then `scripts/prerender.mjs` writes the static content pages, 404 and sitemap into `dist/`.

## Merging

- Sean never merges by hand. When a PR is ready (build passes, checks green), merge it yourself
  (squash). Don't leave PRs waiting on him.
- Merging is not deploying: `main` only goes live when he says "deploy".

## Deploys

- Netlify hosts the site, but it is **not** linked to GitHub: pushes never deploy.
- Deploy only when Sean says "deploy". "Deploy" always means Netlify production.
- To deploy, run the `Deploy to Netlify` workflow (`.github/workflows/deploy.yml`) on `main`.
  It builds on GitHub, deploys `dist/`, then checks ads.txt, /about/ and a 404 on the live site.
- Don't spend deploys on work in progress. Batch fixes, then deploy once.

## Ads

- AdSense publisher `ca-pub-2216954143093824`; `public/ads.txt` must stay served at the root.
- Ad units only as inline, non-sticky banners labelled "Advertisement". No ads in popups,
  modals or over gameplay. Slot IDs live in `src/ads.ts`.
- Supporter: $2 one-time removes ads on the device (`premium` in `src/utils/storage.ts`).

## Analytics and consent

- `public/analytics.js` is loaded by every page (app, content pages, privacy, terms). Set
  `GOATCOUNTER_CODE` and/or `GA4_ID` there. GA4 runs with Consent Mode v2 denied by default in
  the EEA, UK and Switzerland; the consent message itself is Google's (AdSense > Privacy & messaging).
- Collect as little as possible. Any new tracking must be added to `public/privacy.html`.

## Contact

One public email everywhere: sjoudrie@gmail.com.
