# Curio 🗂️

> A daily cabinet of curiosities. Swipe less, do more — one small real-world skill challenge a day, rated by how it felt, collected in a cabinet that only grows.

**Working name:** Curio *(alt: Dabble — verify trademark before committing)*
**Status:** Spec complete, pre-build.

## Start here

**[`CURIO.md`](./CURIO.md) is the complete build bible** — everything needed to build Curio from scratch, in one self-contained document:
the thesis, the core loop, every feature spec, the full 381-skill catalog, the data model, authored-challenge templates, the full design system (tokens + type + motion), monetization, roadmap, and the rationale behind every non-obvious decision.

If you're picking this up in a fresh repo, read `CURIO.md` top to bottom. Nothing else is required.

## The one-paragraph pitch

Most apps sell *more*. Curio sells *less, better*: instead of an infinite feed, it hands you one thing to actually go do today — pulled from a library of hundreds of small skills — teaches you a two-minute sliver of it, and asks only "how did that feel?" Trying is the win; skill is a side effect. You're replacing a doomscroll with something you made, learned, or noticed. Success is measured by **challenges completed per week**, never time-in-app.

## Illustrated docs (`/docs`)

Visual, browser-viewable versions of the design history. Open any in a browser.

| File | What it is |
|------|-----------|
| `curio-master-spec.html` | The v0.4 spec, illustrated (mirrors `CURIO.md`) |
| `curio-design-system.html` | Color / type / spacing / components / motion, with live swatches |
| `curio-ui-analysis.html` | Screen-by-screen UI teardown with annotated mobile mockups |
| `curio-concept.html` | The original concept (with the full 381-skill catalog) |
| `curio-teardown.html` | Product audit round 1 — 29 metrics scored, with fixes |
| `curio-audit-r2.html` | Product audit round 2 — 44 features scored, with fixes |

## MVP scope (Phase 0)

Local-only PWA (React / Vite / Tailwind). Prove the habit before building any backend:

`taste quiz → Today's Curio + Right-Now tier → do → stamp → cabinet → daily share card`

~50 fully-authored challenges across all drawers + one fully-laddered flagship drawer (Culinary). One-tap export. No accounts, no gallery, no social — yet.

See **§20 Tech, Platform & MVP Scope** in `CURIO.md` for the suggested build order.
