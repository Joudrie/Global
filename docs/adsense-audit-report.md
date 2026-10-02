# AdSense pre-review audit: report

Audit run on 2 October 2026 against `main` at `ba1c62e`, following `docs/adsense-review-audit.md`.
Fixes are on the `adsense-audit` branch.

**First line, as the audit requires: globalio.app is not running the current build.** The live
site still serves the old SPA: `/about/`, `/whats-new/` and `/zzz-test` all return the homepage with
HTTP 200, and `/flags/sa/` has the old title ("Saudi Arabia Flag — meaning, colors & facts").
The audit therefore checked the current code: a local `npm run build` served with
`vite preview` (port 4195), plus samples of the test site (https://joudrie.github.io/Global/),
which matches `main` (real pages for `/about/`, `/whats-new/`, `/flags/sa/`, a 404 for a bogus path,
noindex everywhere, no ad code).

Sandbox notes: HTTPS goes through a proxy, so Google Fonts and AdSense fail with certificate
errors in headless Chrome. Those are not counted as site bugs. Lighthouse performance numbers are
from a throttled sandbox and are only useful as before/after comparisons.

## 0. Deployment, ads.txt, robots, sitemap, 404

| Check | Result |
| --- | --- |
| Live is the current build | **No.** Old build (see above). Owner must deploy. |
| `ads.txt` (live and in `dist/`) | Exactly `google.com, pub-2216954143093824, DIRECT, f08c47fec0942fa0` |
| www → apex | `https://www.globalio.app/` → 301 to `https://globalio.app/` |
| `robots.txt` | Allows everything, points to `https://globalio.app/sitemap.xml` |
| `sitemap.xml` (`dist/`) | 217 URLs (home, 214 content pages, privacy, terms); every one exists in `dist/` |
| `404.html` | Generated, `noindex`; `netlify.toml` has no catch-all redirect, so Netlify serves it with a 404 (confirmed on the test site) |
| Internal links | 275 distinct internal hrefs across 218 HTML pages; 0 dead |

## 1. What the reviewer sees

### Rendered pages (Playwright, 412x900, Googlebot and Mediapartners-Google user agents)

Before the fixes:

| Page | Words / unique | h1 | Overlay | Notes |
| --- | --- | --- | --- | --- |
| `/` | 219 / 139 | "Globalio: learn every flag in the world" (visually hidden suffix) | 1.6 s full-screen splash for everyone; first-run intro overlay for humans (bots skipped it by user agent) | Lighthouse (no "Lighthouse" in its UA) saw the intro overlay as the LCP element |
| `/flags/` | 382 / 326 | Flags of the World | none | |
| `/flags/sa/` | 831 / 384 | Flag of Saudi Arabia | none | |
| `/flags/tv/` | 375 / 220 | Flag of Tuvalu | none | thin |
| `/flags/ad/` | 304 / 194 | Flag of Andorra | none | thin |
| `/flags/kn/` | 457 / 236 | Flag of Saint Kitts and Nevis | none | thin |
| `/historical/` | 175 / 130 | Historical flags | none | thin hub |
| `/identity/` | 172 / 116 | Identity flags | none | thin hub |
| `/identity/micronations/` | 1,463 / 752 | Micronations flags | none | |
| `/games/` | 936 / 454 | Every Globalio game | none | |
| `/about/` | 281 / 187 | About Globalio | none | |
| `/contact/` | 123 / 100 | Contact | none | |
| `/whats-new/` | 297 / 184 | What's new | none | |
| `/privacy.html`, `/terms.html` | 850 / 396, 283 / 180 | one each | none | |

Content pages showed meaningful text in under 100 ms. No page errors, no broken images, no
Wikimedia requests on any sampled page.

### Thin and duplicate content (every page in `dist/`, nav/header/footer excluded)

Before: 143 of 197 country pages had under 250 unique words (min 122 on `/flags/mr/`, median 209).
The historical and identity hubs had 90 and 75. The most similar pairs were country pages that repeat
historical-state notes from the regional archive (Italy → `/historical/europe/` 58%); none above 60%.

After: country pages have a median of 261 unique words (min 188) and at least ~400 words of main
text each; 67 small countries remain under the 250-unique-word heuristic (see Should-fix S1).
Hubs: `/historical/` and `/identity/` now list every entry. Highest similarity 54%.

### Meta checks

Every content page has a unique title, a meta description, one h1, a canonical URL and OG tags; no
image lacks alt text. Before the fixes `/privacy.html` and `/terms.html` had no canonical, OG tags or
favicon link (fixed).

### Unfinished-looking things found

- Codex: "197 countries · flag histories in beta", a "Beta" badge, and "Flag history for Taiwan is
  coming soon. This feature is in beta" (Taiwan was the only country with no history).
- Challenge Mode: locked country tiles labelled "Coming soon" / "Not enough region flags yet".
- Play tab and `/games/`: "Beta Sandbox … experimental & niche games … still being polished".
- Settings: a visible "creator unlock code" field and a "Flag Check (QA)" button that lists broken
  and missing flags.
- No "lorem", TODO or placeholder text in shipped pages; the AdBox placeholder only renders in dev.

## 2. Policy and placement

- **Auto ads on the game itself.** `index.html` loaded `adsbygoogle.js?client=…`, which turns on
  Auto ads for the whole SPA. Auto ads choose their own positions (in-page, anchor, vignette), so they
  could land between quiz answers or as an overlay, against CLAUDE.md's "no ads in popups, modals or
  over gameplay" rule. Fixed (B3).
- **Ad script on low-content pages:** the 404 page, `/contact/`, `/privacy.html` and `/terms.html`
  carried the Auto ads script. Fixed: none of them load it now.
- **Hate symbols:** `NO_AD_FLAGS` works. Pages without the ad script: `/flags/at/`, `/flags/de/`,
  `/flags/us/`, `/historical/americas/`, `/historical/europe/` (plus the utility pages above). But the
  Nazi and Confederate notes described the flags neutrally ("the first lone-star…", "later became the
  basis of the rebel flag") with no word on what they stood for. Fixed (S5). The Jain flag (an
  ancient religious swastika) on `/identity/civic-and-ideological/` is explained as such; left as is.
- **Ad labels and wording:** AdBox units are labelled "Advertisement"; no "support us by clicking"
  wording anywhere. All `AD_SLOTS` are empty, so the app currently shows no unit ads.
- **Privacy policy:** covers AdSense, cookies, analytics, EEA/UK/Swiss consent, US state opt-out,
  data controller (Sean Joudrie), rights, retention, children. It said flag images come from
  Wikimedia (no longer true: all 4,016 image URLs in the data now resolve to self-hosted copies).
  Updated. Its consent and US-privacy sentences depend on Google's messages being published (owner).
- **Contact/About:** both exist and use sjoudrie@gmail.com, but neither named the person behind the
  site (only the privacy policy did). Fixed.
- **Consent message (Funding Choices):** cannot be checked from here; must be verified by the owner
  from an EEA location or with a VPN after publishing the message.

## 3. Quality and maintenance signals

- **Changelog:** newest entry was 29 September; real work from that day (0.4 MB first load,
  self-hosted flags) was missing, and there is a gap from 2 July to 28 September, so the footer's
  "New games every month" promise was not kept in August. Entries added for 29 September (real
  commits) and 2 October (this work). The gap itself can only be fixed by shipping (owner).
- **Games:** all 52 registry entries opened via `/?play=<id>` at 375x812 with no page errors, no broken
  images, no horizontal scroll and a playable first screen; same result after the fixes
  (connections, realorbot, flagle, challenge, substumper, uscityflags and codex included).
- **Wikimedia at runtime:** 0 requests on every sampled page and game; all flag URLs in the data
  resolve to `/cf/` or `/flags/` copies. Only the dev-only Flag Check screen and the Codex
  "source" links mention Commons.
- **Accuracy errors found:** Syria's page showed the new green-white-black flag but described the
  old red-white-black one (tip, history and attributes); Mauritania's tip said yellow stripes (they
  are red); Japan's said the disc is off-centre (it is centred, Bangladesh's is offset); Comoros,
  Antigua and Barbuda and Guyana tips described the flags wrongly; the Romania/Chad tips claimed
  different proportions; Libya's history note had the bands in the wrong order. All fixed (S4).
- **Inconsistent counts:** "2,000-flag codex" (meta), "4,000+" (Codex slide), "4,500+" (intro);
  the Codex actually holds 4,570 flags. Now "4,500+" everywhere. "50+ games" is now "50".

### Lighthouse (mobile, Lighthouse 12)

| Page | Perf | A11y | Best practices | SEO | FCP | LCP |
| --- | --- | --- | --- | --- | --- | --- |
| `/` before | 58 | 100 | 100 | 100 | 5.4 s | 8.7 s |
| `/` after | **88** | 100 | 100 | 100 | 2.0 s | 3.6 s |
| `/flags/fr/` before | 60 | 100 | 100 | 100 | 5.6 s | 8.2 s |
| `/flags/fr/` after | **100** | 100 | 100 | 100 | 0.8 s | 1.0 s |

Failing audits before: render-blocking Google Fonts (three stylesheets on the home page, including
four historic-script fonts only Guess the Language uses), a 593 KB `logo.png` drawn at 26–92 px,
the intro overlay as LCP. Remaining after: unused JavaScript in the main bundle (~40 KiB on home),
image format suggestions for flag art, two non-HTTP/2 requests (sandbox preview server), unsized
thumbnails on country pages. None affect review.

First-load JS (`dist/assets/index-*.js`): **408.9 KB before, 407.4 KB after.**

## 4. Findings and status

### Blockers

| # | Finding | Status |
| --- | --- | --- |
| B1 | globalio.app serves the old build: no content pages, no 404, old titles. A review now would see the rejected site. | NOT FIXED: owner-only (deploy). |
| B2 | Thin country pages: 143/197 under 250 unique words; title promised "meaning" but most pages had none. | FIXED: hand-written meaning for all 197 countries, a second paragraph for the 90 shortest, facts box, neighbour and same-colour grids. Median 209 → 261 unique words; every page now ~400+ words. Residual in S1. |
| B3 | Auto ads ran on the whole game SPA, free to place ads beside game controls or as anchors/vignettes. | FIXED: `index.html` uses the `google-adsense-account` meta tag for verification and loads no ad script; app ads are only labelled AdBox units (library loaded without `?client=`). Content pages keep Auto ads; overlay formats must be turned off by the owner. |
| B4 | Splash (1.6 s, every visit) and full-screen intro overlay on first visit; the intro was hidden from bots by user agent, so people and crawlers saw different first screens. | FIXED: splash removed; intro is an inline welcome card on Today, same for everyone. |

### Should fix

| # | Finding | Status |
| --- | --- | --- |
| S1 | 67 small-country pages still under the 250-unique-word heuristic (min 188). Each has ~400+ words of specific, hand-written text. | PARTLY FIXED: padding them further would add little value; grows naturally as flag histories are added. |
| S2 | "Beta", "coming soon", locked Challenge tiles, "Beta Sandbox", visible creator passcode field and Flag Check (QA) screen. | FIXED: labels removed or renamed ("More games"), locked countries hidden, Taiwan given a real flag history, creator tools only in dev or after visiting `/?creator` once. |
| S3 | `/historical/` and `/identity/` hubs thin (90 and 75 unique words); About and Contact anonymous and short. | FIXED: hubs list every entry and explain how difficult flags are handled; About names Sean Joudrie and explains research and ads; Contact expanded. |
| S4 | Factual errors (Syria, Mauritania, Japan, Comoros, Antigua and Barbuda, Guyana, Romania/Chad, Libya). | FIXED. |
| S5 | Nazi and Confederate flag notes lacked context. | FIXED: notes say what the regimes did and how the flags are seen today. Pages still carry no ads. |
| S6 | Auto ads script on 404, contact, privacy and terms pages. | FIXED. |
| S7 | Privacy and terms pages missing canonical, OG and favicon; privacy text out of date on images. | FIXED. |
| S8 | Inconsistent flag and game counts; generic "beautiful" tagline in meta description. | FIXED. |
| S9 | Render-blocking fonts, unused Lora and historic-script fonts on every page, 593 KB logo. | FIXED: Lighthouse performance 58 → 88 (home), 60 → 100 (country page). |
| S10 | Changelog missing real 29 September work; "new games every month" not kept in August. | PARTLY FIXED: entries added from real commits. Keeping the promise needs a new game in October (owner). |
| S11 | Consent message and US privacy message: the privacy policy says Google shows them; not verifiable from code. | NOT FIXED: owner-only (publish in AdSense, then check). |

## 5. Owner-only actions, in order

1. Review and merge the `adsense-audit` branch (it reaches the test site on merge).
2. Say "deploy" so the Netlify workflow publishes `main`; then check `/about/`, `/flags/sy/`,
   `/zzz-test` (must be 404) and `/ads.txt` on globalio.app.
3. AdSense > Privacy & messaging: publish the European regulations (GDPR) message and the US state
   regulations message. Check from an EEA location (or VPN) that the consent message appears.
4. AdSense > Ads > globalio.app > Auto ads: turn off overlay formats (anchor ads, vignettes and side
   rails) so Auto ads on the content pages stay inline. Keep ad load modest.
5. Google Search Console: verify globalio.app (domain property), submit `sitemap.xml`, and request
   indexing for `/`, `/flags/`, `/about/` and a few country pages. Wait until a good share of the 217
   URLs is indexed.
6. Optional: create display ad units for the app and paste their IDs into `AD_SLOTS` in `src/ads.ts`
   (they render as labelled, inline banners). On your own devices, open `/?creator` once to reach the
   ad-free unlock and Flag Check.
7. Ship the October game and add it to the changelog, so "new games every month" holds.
8. AdSense > Sites: request review.

## 6. Verdict

**Submit after deploying this branch and doing steps 3–5; wait about one to two weeks after the
deploy before requesting review.** The code-side problems that most likely caused "low value
content" (thin, templated country pages served only to a live site that isn't deployed yet,
auto ads inside a game, overlays on the first screen, unfinished labels, factual errors) are fixed.
What remains is outside the code: the live site must actually serve these pages, Google needs time to
crawl and index them, and the consent messages must be live. Submitting before the deploy would put
the old build in front of the reviewer again.
