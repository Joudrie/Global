# Globalio

React 19 + Vite + Tailwind v4 flag game at https://globalio.app. `npm run build` builds the app,
then `scripts/prerender.mjs` writes the static content pages, 404 and sitemap into `dist/`.

## Merging

- Sean never merges by hand. When a PR is ready (build passes, checks green), merge it yourself
  (squash). Don't leave PRs waiting on him.
- After merging, deploy (see Deploys).

## Test site

- Every push to `main` publishes https://joudrie.github.io/Global/ (`.github/workflows/test-site.yml`):
  the same build under `/Global/`, with no ads or analytics and hidden from search. Sean and his
  friends test there. Always merge finished work so it reaches the test site, and give Sean the link.

## Deploys

- Netlify hosts the site, but it is **not** linked to GitHub: pushes never deploy by themselves.
- Sean wants finished work live right away (2026-10-08): after a PR is merged and verified, run the
  `Deploy to Netlify` workflow (`.github/workflows/deploy.yml`) on `main` yourself, then check the live
  site. It builds on GitHub, deploys `dist/`, then checks ads.txt, /about/ and a 404.
- Each deploy ships everything on `main`, including other sessions' merged work. Only merge work that
  is finished; never leave half-done work on `main`.

## What's new

- Every change that players will notice gets an entry at the top of `src/data/changelog.ts`.
  It feeds /whats-new/ and the "Last updated" line on the home screen and every content page,
  which show Google the site is maintained. The site promises new games every month.

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
