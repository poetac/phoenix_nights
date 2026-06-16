# Session handoff / onboarding

Read this first if you're picking up Phoenix Nights in a new session. It captures
where the project is, what's in flight, and — most importantly — what this
environment needs to have that earlier sandboxes lacked, so you can do the work
that was previously blocked.

For the *why* and the bar every change clears, read `ROADMAP.md` (milestones +
Principles) and `README.md` (data sources + methodology). This file is the
operational state.

---

## Status snapshot (as of the handoff)

- `main` builds green; CI = **build** + **verify-data** (`analysis/verify_v0.py`).
- Deployed to GitHub Pages: <https://poetac.github.io/phoenix_nights/>
- All precomputed assets under `apps/web/public/data/` are current **through 2025**
  (refreshed by the *Rebuild data assets* workflow). The live hero, night-cooling
  card, freshness stamps, and sustained-season stats are all active.
- 18 cards + the live "last night vs the 1970s normal" hero. M4 evidence milestone
  is essentially complete (only the spatial-gradient *stretch* item is open).

## In-flight pull requests (both blocked on human verification)

| PR | Branch | What it does | What it needs |
|----|--------|--------------|---------------|
| **#11** | `claude/human-cost-demographics` | M4-3: replaces the human-cost card's vague prose with a cited "who the heat finds" demographic grid (2024 county report) | The six percentages were sourced via web *search* (the county PDF 403'd the old sandbox). **Re-read them from the primary 2024 Maricopa County Heat-Related Deaths Report PDF** and confirm/correct, then merge. |
| **#14** | `claude/perf-budget` | M6 perf: lazy-loads the whole chart body (`DashboardBody.jsx`) so recharts (~125 KB gzip) leaves the critical path | A **live render check** — the old sandbox couldn't load the page. Confirm the page renders, charts draw, and the window/view toggles + freshness footer work, then merge. With a browser here you can now do this yourself (see below). |

## Next autonomous work (was blocked by the sandbox)

1. **M5 — second city (Tucson).** Generalize the `build_*.py` pipelines to take a
   city (sid + output prefix), add a `TUCSON` entry to `apps/web/src/lib/cities.js`
   (ThreadEx sid, a validated rural-pair station, baseline decade, citations), add
   a city picker, and wire the rebuild workflow to build Tucson's assets. *Was
   blocked because picking/validating the ThreadEx sid + rural pair needs live
   ACIS, and the new city's render couldn't be verified.*
2. **M4-5 — intra-metro spatial gradient.** Several Maricopa stations on one chart
   showing the night-low gradient downtown→fringe. *Was blocked on station
   selection (needs live ACIS metadata).*
3. **M6 leftover** — per-card share *images* (reuse the `scripts/make-og.mjs`
   resvg path, one per chart).

## What this environment must provide (the unblockers)

The previous sandbox was network-walled and headless. Confirm this one has:

1. **Outbound network egress** to at least:
   - `data.rcc-acis.org` (ACIS — the primary station record)
   - `www.ncei.noaa.gov` (NCEI GSOY + hourly ISD)
   - `api.eia.gov` (EIA grid demand)
   - general HTTPS is ideal (lets you read primary-source PDFs, e.g. the county
     heat report for PR #11).
   Quick check: `python3 analysis/verify_v0.py` should *run to completion* (it
   hits ACIS + NCEI). In the old sandbox it failed with HTTP 403.
2. **A browser for render verification.** With egress open, `npm run dev` actually
   fetches live ACIS, so the app renders. Drive a headless browser (Playwright) or
   the `verify` skill to screenshot and self-check UI PRs like #14 — the thing the
   old sandbox could never do.
3. **`EIA_API_KEY`** env var / repo secret (free key) — only the grid builder needs it.
4. Toolchain: Node 18+ and Python 3.12 (stdlib only for `analysis/`).

If egress is **still** closed, fall back to the old playbook: build carefully,
`npm run build` + unit-test pipeline logic offline against synthetic data, ship a
draft PR flagged for human smoke-test, and let the *Rebuild data assets* workflow
(which runs in GitHub Actions, where the network is open) generate real assets.

## Conventions (how this repo is worked)

- **Branches:** `claude/<short-topic>`. One focused PR per change; draft → CI
  green → mark ready → squash-merge.
- **Build:** `cd apps/web && npm run build`. **Verify:** `python3 analysis/verify_v0.py`
  (no deps beyond stdlib).
- **Every new card** adds a sanity check to `verify_v0.py` and a line to the
  README "Sanity checks" list + ROADMAP. The four **Principles** (reproduce or
  reject · lows first · state the caveat in the card · no redundant cards) are the
  bar — see ROADMAP.
- **Precomputed assets** are committed JSON under `apps/web/public/data/`, stamped
  with `generated`/`throughYear`. They go stale until the **Rebuild data assets**
  GitHub Action reruns the pipelines (Actions → "Rebuild data assets" → Run
  workflow, or monthly cron). Run it after any pipeline change.
- **Hand-curated data:** `phx-heat-deaths.json` is the only non-pipeline dataset —
  update it per `analysis/HEAT_DEATHS.md`.
- **OG image:** regenerate with `cd apps/web && npm i --no-save @resvg/resvg-js && node scripts/make-og.mjs`.
