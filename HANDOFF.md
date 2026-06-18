# Session handoff / onboarding

Read this first if you're picking up Phoenix Nights in a new session. It captures
where the project is, what's deferred, and what the environment needs.

For the *why* and the bar every change clears, read `ROADMAP.md` (milestones +
Principles + the "City-climate engine" and "Breadth" sections), `CLAUDE.md`, and
`README.md` (data sources + methodology). This file is the operational state.

---

## Status snapshot

- `main` builds green; CI = **build** + **verify-data** (`analysis/verify_v0.py`,
  live ACIS) + **render** (Playwright smoke test, `apps/web/tests/render-smoke.mjs`).
- Deployed to GitHub Pages: <https://poetac.github.io/phoenix_nights/>
- The product is now a **generalized city-climate engine**, not a single page:
  - **Explore landing (`/`)** leads with a clickable **US map** of the interior
    West (Phase 3b) over a ranked list; both share one ranking (night-low warming).
    Click a city → `?city=<id>`.
  - **9 cities**, registry-driven: Phoenix (curated flagship), Tucson, Las Vegas,
    El Paso, Yuma, Reno, Albuquerque, Salt Lake City, Boise.
  - **Each city page** leads with its own top-ranked verified facts ("What stands
    out in <city>", the salience engine), then its applicable cards. Phoenix keeps
    its curated hero via a registry `featured` overlay; others get an auto hero.
  - **Phase 5** adds a labeled "if the trend continued" extrapolation to 2050 on
    every city page — a straight-line hypothetical inside the bootstrap slope fan,
    explicitly **not** a forecast.

## Engine phases (see ROADMAP "City-climate engine")

**1 ✅ fact engine · 2 ✅ per-city page + auto hero · 3a ✅ explore + ranking ·
3b ✅ the literal US map · 4 ✅ scale cities · 5 ✅ honest extrapolation.** Now **10 cities** incl.
the first humid-climate one (Atlanta).

Post-Phase-5: diurnal curves wired for all 9 cities; grid for the two clean-BA
metros (ABQ=PNM, Boise=IPCO); the explore-map dots are sized by night-warming
rate (now on a national map, names on hover/focus); per-city browser titles; a **cross-city
comparison overlay** on the
landing (`compare-lows.json` via `analysis/build_compare.py`) that charts every
city's overnight-low departure from its own 1970s baseline (lazy-loaded so recharts
stays off the landing's critical path). The intra-metro **spatial-gradient** card stays
*rejected* (reproduce-or-reject): uniform warming rates across the metro +
elevation-confounded absolute lows — see `analysis/spatial_gradient_probe.py`.
Also **rejected**: surfacing each city's raw `urban_excess` (warming above its rural
pair) in the comparison legend — Phoenix's Casa Grande reference is itself a booming
corridor, so its raw excess (+0.09°/dec) is misleadingly small without the per-city
caveat. UHI excess stays on the per-city `UhiCard`, where its caveats live.

**Humid pivot (in progress):** the engine generalized beyond the arid West. The city-vs-rural control
transfers to humid continental/Gulf cities (Atlanta is the shipped pilot, vs rural Gainesville) but
**rejects** for maritime tropical (Miami: nights warm slower than days, no clean rural reference). Cards
were de-aridified via a per-city `rural.kind` (default "open desert"; Atlanta "rural countryside") threaded
through `UhiCard` / `GlobalContextCard` / `build_facts` (`rural_ref`). `StreakCard` gained a card-fit guard
(omit where recent 80°F-night streaks ≈ 0) which also cleaned up the cool arid cities. `build_heat_season`
now survives a decade with no 100°F days. The explore map is **national** (full-US `geoAlbersUsa`), dots
sized by warming, names on hover/focus (always-on labels collide once cities span the country). Next humid
candidates that probed clean: Houston, New Orleans (+ likely Memphis, Nashville, Dallas, Raleigh).

## What's deferred (the next obvious work)

1. **Grid for Yuma / Reno / Salt Lake City.** Diurnal is now wired for all 9
   cities, and grid for the two with a clean single-utility metro balancing
   authority — **Albuquerque (PNM)** and **Boise (IPCO)**. Yuma/Reno/SLC grid stays
   deferred: no clean single-utility metro BA (Reno's `NEVP` is Las Vegas's utility;
   `WALC`/`PACE` aren't metro-specific) — don't ship wrong-region demand. To wire one
   later: add a `grid` block to `cities.py`, `gridAsset` to `cities.js`, the city to
   the grid loop in `rebuild-data.yml`, a verify shape-check, and run `build_grid.py`.
2. **A real projection layer (CMIP6 / LOCA2 downscaling)** — the separate go/no-go
   behind Phase 5. The current extrapolation is deliberately a labeled trend line,
   not a forecast; a true projection is a different, physics-based layer.
3. **More cities** are possible, but the original vetted set is now fully shipped.
   `analysis/city_audit.py` (PASS/REVISE/REJECT + card-fit) is the gate; Bakersfield
   was REJECTED (signal below the global rate). Scope stays the **arid interior
   West**, where the city-vs-open-desert control experiment is valid.

## Environment / unblockers

1. **A fresh sandbox has no git write + no EIA key.** Ask the user to paste a
   **fine-grained GitHub PAT** for `poetac/phoenix_nights` (Contents R/W, Pull
   requests R/W, Workflows R/W — note: **no** Actions:write, so you can't re-run a
   stuck run via API; re-trigger with an empty commit). For grid builds only, ask
   for the free **`EIA_API_KEY`** (eia.gov/opendata).
2. **Egress is open** from the shell (ACIS, NCEI, EIA, api.github.com, npm). Clone
   into a **sandbox-native dir** (e.g. `$HOME/work`), NOT the mounted outputs folder
   (git locking fails there). Push via
   `git push https://x-access-token:<PAT>@github.com/...`; open/squash-merge via the
   REST API. Never echo the token.
3. **Do NOT attempt a local full-app browser render** — the sandbox lacks the
   browser system libs. **Rely on CI** (`build`, `verify-data`, `render`). You *can*
   run `npm run build`, `python3 analysis/verify_v0.py` (hits ACIS), the data
   pipelines, and rasterize a committed SVG via `@resvg/resvg-js` to eyeball the map.
4. **Background jobs don't survive across shell calls** (each call is isolated) —
   keep long ACIS/pipeline runs inside one call (the audit + builders finish in
   seconds per city).

## Conventions

- Branch `claude/<topic>`; one focused PR; draft/PR → CI green → squash-merge.
  ("keep going" = standing approval to merge green PRs.)
- **Principles** (the bar — see ROADMAP): reproduce or reject · lows first · state
  the caveat in the card · no redundant cards.
- Every new **city** = two registry entries (`analysis/cities.py` + `cities.js`) +
  committed ACIS assets + a `build_facts` rural-pair sid + a `verify_v0.py` trend
  gate + a render assertion + a README/ROADMAP line. Every new **card** adds a
  `verify_v0.py` check (if it makes a data claim) + a render assertion.
- **Precomputed assets** are committed JSON under `apps/web/public/data/`, stamped
  `generated`/`throughYear`; they go stale until the **Rebuild data assets** Action
  reruns the pipelines (monthly cron, or manual dispatch — which needs Actions:write).
- Keep Phoenix & Tucson hour-of-day output **byte-identical**: no-DST cities use a
  fixed `utc_offset`; DST cities set an IANA `tz`.

## Gotchas

- `cities.py` `CITIES` is a **dict** (iterate `.values()`); `cities.js` `CITIES` is
  an **array**. Asset filename **prefix == city `id`** (phx/tus/lv/ep/yum/rno/abq/slc/boi).
- `build_facts.py` builds **all** cities in one run (cross-city ranking needs the
  whole set) and rewrites every `*-facts.json` — so adding a city shifts existing
  cities' fact scores (expected). Its rural-pair `REF` dict must gain each new sid.
- The **card-fit** lesson: high-elevation cities have cool 1970s nights, so
  night-cooling-share goes ≤0 and tropical-nights ≈0 — those cards omit (guarded in
  `NightCoolingCard`, the salience applicability checks, the share generator). New
  cities inherit the guards; `city_audit.py` now predicts card-fit up front.
- The **map** is generated by `apps/web/scripts/build-map.mjs` (devDeps `--no-save`:
  `us-atlas topojson-client d3-geo`); it commits `src/lib/usMap.js`. **Re-run it
  after adding/moving a city** so the new dot + viewBox land. us-atlas v3 ships
  *geographic* coords — project both states and cities with one `geoAlbersUsa`.
- The **city switcher** (top nav) is a collapsible dropdown — don't revert it to a
  wrapping pill bar (it overflowed at 9 cities).
- Grid card needs a **single-utility** EIA balancing authority — California cities
  (CISO is statewide) can't get one, and check northern vs southern NV (`NEVP` ≠ Reno).
- **Diurnal ISD ids must cover recent decades**, not just "any data": Yuma's single
  modern id was wrong, so its hourly record is chained across era ids in `cities.py`
  (`build_diurnal` fetches them all). The **cool-window** card self-omits where
  overnight sub-85°F relief is still abundant (cool/high-elevation cities) — it's a
  hot-city scarcity story.
- The explore **map dots are sized by night-warming rate** (`CityMap` takes the
  ranked rows from `CityExplore`); re-running `build-map.mjs` only changes geometry,
  not the sizing.
- Playwright `waitForFunction(fn, arg, options)` — **arg before options** (a real
  bug that once cost a render run).
