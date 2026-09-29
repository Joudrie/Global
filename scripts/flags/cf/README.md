# Self-hosting the Wikimedia flags (public/cf)

Flags that were hot-linked from Wikimedia Commons are self-hosted under
`public/cf/` so the app serves them same-origin (no 429 rate-limits) and to
improve our licensing posture. Every Commons flag goes through one resolver,
`commonsFlag()` in `src/data/flagUrl.ts` (used by `fp()` in codex.ts and
`wiki()` in challenges.ts): LOCAL_FLAGS → `HOSTED_FLAGS` (src/data/hostedFlags.ts)
→ the live Commons hotlink, so a partial set is always safe.

- `collect.mjs`   — finds every flag the app still hotlinks (data modules + src/ scan) and adds it to `files.txt`.
- `download.mjs`  — polite, resumable downloader (2 at a time, backoff on 429, skips `manifest.json` and `missing.json`).
- `genhosted.mjs` — regenerates src/data/hostedFlags.ts from the manifest (canonical filename keys).

## Flow
1. Actions → **Self-host flags** → Run workflow (limit per run, default 1500). It runs collect → download → genhosted → build/test and pushes to the `selfhost-flags-data` branch.
2. Re-run until the run summary says "Still to host: 0" (each run resumes from that branch).
3. Open a PR `selfhost-flags-data` → `main` and merge it; screens switch to `/cf/…` automatically.
4. Locally: `node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/flags/cf/collect.mjs --dry` prints what is still hotlinked, by source.
