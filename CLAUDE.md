# Phoenix Nights — project guide

Two products on one shared, city-agnostic engine — React + Vite front end
(`apps/web/`), Python stdlib pipelines (`analysis/`), deployed to GitHub Pages:
- **City Signals** (the root site) — the worldwide explorer: each city's official
  station record, read for the trend that most stands out (neutral, per-city).
- **Desert Nights** (`/desert/`) — the curated arid-West urban-heat-island thesis
  ("the desert still cools off at night; the city doesn't"), Phoenix the flagship.

The app originally proved, from the official NOAA record, that a city's **overnight
lows** abandon their history faster than its highs — the UHI fingerprint. That's now
the Desert Nights thesis; City Signals generalizes the same engine worldwide (Sydney
and De Bilt are the first two international cities).

**→ Read `HANDOFF.md` first for current state, in-flight PRs, and what this
environment needs (network egress to ACIS/NCEI/EIA + a browser for render
checks).** Then `ROADMAP.md` (milestones + the Principles), `WORLDWIDE.md` (the
international backend), and `README.md` (data sources + methodology).

## Commands
- Build: `cd apps/web && npm install && npm run build` (City Signals; `npm run build:desert` for Desert Nights)
- Dev server: `cd apps/web && npm run dev` (renders only if ACIS is reachable)
- Verify data claims: `python3 analysis/verify_v0.py` (stdlib only; hits ACIS + NCEI)
- Rebuild precomputed assets: GitHub Actions → "Rebuild data assets" → Run workflow
- Build the City Signals world map: GitHub Actions → "Build world map" → Run workflow

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
- A card with a non-trivial transform puts it in a pure `lib/<name>Model.js`
  (no React/JSX/units), called from a thin `useMemo(() => <name>Model(asset))`;
  its direction branches and guards get a `tests/<name>Model.test.mjs`
  (auto-discovered by `npm test`). This keeps the prose-deciding logic out of JSX,
  where only the browser smoke test would exercise it — see
  `grid`/`streak`/`extremes`/`seasons`/`extrapolation` `Model.js`.
- Precomputed JSON lives in `apps/web/public/data/` (committed, stamped with
  `generated`/`throughYear`); it goes stale until the rebuild workflow reruns.
- `phx-heat-deaths.json` is the only hand-curated dataset — update via
  `analysis/HEAT_DEATHS.md`.
- The engine is city-agnostic: a city is an entry in `apps/web/src/lib/cities.js`
  + `analysis/cities.py` + `<CityDashboard city={…} />`; cards and fetchers don't
  change. US cities source live from ACIS; **international cities are `source:"ghcn"`**
  (NCEI GSOY, `units:"metric"`, a precomputed yearly series via `build_series.py`, and
  no daily/hourly cards) — **Sydney is the first, De Bilt the second**. City Signals (the explorer, all
  cities) is the worldwide product; Desert Nights is the curated arid-West flagship
  (5 hot deserts) — see ROADMAP "Direction" and `WORLDWIDE.md`.
- Single source of truth: a city's **rural-pair sid lives once** in `analysis/cities.py`
  (`rural_sid`), read by `build_facts.py` and `verify_v0.py`; front-end asset paths derive
  from the city `id` via `withAssets(...)` in `cities.js`. Never hardcode a year cutoff —
  derive `LAST_COMPLETE_YEAR`. `verify_v0.py` value-checks every city's facts JSON live
  (not just shape) — `check_cities` for US (ACIS), `check_cities_ghcn` for international
  (GSOY, counterexample-aware) — so breadth meets the same bar as Phoenix.
