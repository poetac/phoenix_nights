# Phoenix Nights — project guide

A public-facing data app proving, from the official NOAA station record, that a
city's **overnight lows** are abandoning their history faster than its highs —
the urban-heat-island fingerprint. React + Vite front end (`apps/web/`), Python
stdlib pipelines (`analysis/`), deployed to GitHub Pages.

**→ Read `HANDOFF.md` first for current state, in-flight PRs, and what this
environment needs (network egress to ACIS/NCEI/EIA + a browser for render
checks).** Then `ROADMAP.md` (milestones + the Principles) and `README.md`
(data sources + methodology).

## Commands
- Build: `cd apps/web && npm install && npm run build`
- Dev server: `cd apps/web && npm run dev` (renders only if ACIS is reachable)
- Verify data claims: `python3 analysis/verify_v0.py` (stdlib only; hits ACIS + NCEI)
- Rebuild precomputed assets: GitHub Actions → "Rebuild data assets" → Run workflow

## The bar (Principles — see ROADMAP for detail)
1. **Reproduce or reject** — every number comes from a committed pipeline that
   re-derives it from the official record; if a story can't survive the raw data,
   it doesn't ship.
2. **Lows first** — when two framings compete, the one surfacing overnight lows wins.
3. **State the caveat in the card** — elevation offsets, UHI, surveillance bias, etc.
4. **No redundant cards** — say something the existing cards don't.

## Conventions
- Branch `claude/<topic>`; one focused PR; draft → CI green → squash-merge.
- Every new card: add a sanity check to `verify_v0.py` + a line to the README
  "Sanity checks" list and ROADMAP.
- Precomputed JSON lives in `apps/web/public/data/` (committed, stamped with
  `generated`/`throughYear`); it goes stale until the rebuild workflow reruns.
- `phx-heat-deaths.json` is the only hand-curated dataset — update via
  `analysis/HEAT_DEATHS.md`.
- The engine is city-agnostic: a city is an entry in `apps/web/src/lib/cities.js`
  + `<CityDashboard city={…} />`; cards and fetchers don't change. The product is a
  **14-city national explorer** (arid West + humid South/Gulf), Phoenix the curated
  flagship — see ROADMAP "Direction".
- Single source of truth: a city's **rural-pair sid lives once** in `analysis/cities.py`
  (`rural_sid`), read by `build_facts.py` and `verify_v0.py`; front-end asset paths derive
  from the city `id` via `withAssets(...)` in `cities.js`. Never hardcode a year cutoff —
  derive `LAST_COMPLETE_YEAR`. `verify_v0.py`'s `check_cities` value-checks every city's
  facts JSON live (not just shape), so breadth meets the same bar as Phoenix.
