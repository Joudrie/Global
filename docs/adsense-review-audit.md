# AdSense pre-review audit (prompt)

Paste everything below the line into a fresh Claude Code session with the `Joudrie/Global` repo.

---

You are auditing Globalio (repo `Joudrie/Global`, live at https://globalio.app) before it is resubmitted
to Google AdSense. It was rejected for **"Low value content"**: Google wants sites that (1) provide
authentic, high-quality information, tools or services, (2) show ongoing curation and maintenance, and
(3) generate genuine user interest. A second rejection costs at least another week, so be thorough and
skeptical. Do not fix anything until the report is done; then fix what's in scope, merge, and list
what only the owner can do.

Read `CLAUDE.md` first and follow it (merging, deploy rules, ad placement, analytics, contact email).

## 0. Is the live site the current build?
- Compare live with `main`: `curl` https://globalio.app/about/, /whats-new/, /flags/sa/, and a bogus
  path like /zzz-test. The current build returns real pages for the first three (titles "About
  Globalio", "What's new on Globalio", "Flag of Saudi Arabia: history, meaning & facts") and a
  **404** for the bogus path. If any of these fail, STOP: the site isn't deployed, and the report's
  first line must say so.
- Check https://globalio.app/ads.txt is exactly `google.com, pub-2216954143093824, DIRECT, f08c47fec0942fa0`,
  and that www.globalio.app redirects to the apex.
- Check robots.txt allows crawling and points to sitemap.xml; the sitemap lists every content page
  and every listed URL returns 200.

## 1. What Google's reviewer sees (most important)
- Fetch the live homepage HTML with a Googlebot user agent and as rendered by Playwright
  (`require('/opt/node22/lib/node_modules/playwright')`, viewport 412x900, UA containing
  "Googlebot" and separately "Mediapartners-Google"). Report the word count of visible text, the h1,
  whether any overlay/modal/splash covers content, and how long until meaningful content shows.
- Do the same for: /flags/, 5 random /flags/<code>/ pages, /historical/ and one region page,
  /identity/ and one category page, /games/, /about/, /contact/, /whats-new/, /privacy.html, /terms.html.
- For every content page in `dist/` (build with `npm run build`): count unique words (excluding nav,
  header and footer boilerplate). List pages under 250 unique words, and any pages whose main text is
  more than ~60% identical to another page (templated or duplicate content). Thin or near-duplicate
  pages are the core of "low value content".
- Check that every page has a unique <title>, a meta description, one h1, a canonical URL, OG tags,
  and alt text on meaningful images.
- Check for anything that looks unfinished: "coming soon", "TODO", "lorem", placeholder text,
  disabled buttons with no explanation, empty sections, broken images, "Example" content not
  labelled as such, dead links (crawl every internal href in dist and on the live site).

## 2. Policy and placement
- AdSense script is present on every page that should show ads and absent on the pages that show
  hate symbols (`NO_AD_FLAGS` in `scripts/prerender.mjs`); confirm on the live site.
- No ads in popups, modals, overlays, sticky elements or next to game controls where accidental
  clicks are likely; ad containers are labelled only "Advertisement" or "Sponsored links".
- No content that breaks AdSense content policies without context: hateful symbols (only in
  educational framing), violence, adult content, misleading claims. Review the historical and
  identity archives' text for this.
- Nothing encourages clicking ads; no "support us by clicking" wording.
- Privacy policy covers AdSense, cookies, analytics, consent for EEA/UK/Switzerland, US state
  opt-out, data controller, rights; it's linked from every page. Terms exist and are linked.
- Contact and About pages exist, look like a real person runs the site, and use sjoudrie@gmail.com.
- Check whether Google's consent message (Funding Choices) loads on the live site from an EEA
  location if you can simulate it; otherwise say it must be verified manually.

## 3. Quality and maintenance signals
- `/whats-new/` and the "Last updated" line reflect recent work; `src/data/changelog.ts` is current.
- Every game in `src/ui/registry.ts` opens via `/?play=<id>` at 375x812 with no page errors, no
  broken images and a playable first round (sample at least 15, including connections, realorbot,
  flagle, challenge, substumper, uscityflags, codex).
- Count images still loaded from commons.wikimedia.org or upload.wikimedia.org at runtime (they can
  be rate-limited and show broken); list where they come from.
- Run Lighthouse (`npx lighthouse@12`, Chrome at `/opt/pw-browsers/chromium-*/chrome-linux/chrome`)
  on the homepage and one country page, mobile. Report Performance, Accessibility, Best Practices,
  SEO and every failing audit. Note that cert errors for third-party scripts come from the sandbox
  proxy, not the site.

## 4. Output
A single report, most important first:
1. **Blockers:** anything likely to cause another rejection, each with evidence (URL, numbers,
   screenshot path) and the fix.
2. **Should fix:** weaker signals worth fixing before submitting.
3. **Owner-only actions:** things code can't do (deploy, Search Console, consent message publish,
   traffic, AdSense "Request review"), in order.
4. **Verdict:** submit now / submit after X / wait N days, and why.

Then fix every Blocker and Should-fix that's in code: one focused PR each, `npm run build` and
`npm test` passing, checked at 375px, merged (squash) per CLAUDE.md, with a changelog entry when
players will notice. Do not deploy unless the owner says "deploy".
