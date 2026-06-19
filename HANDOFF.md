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
  - **14 cities**, registry-driven: Phoenix (curated flagship), Tucson, Las Vegas,
    El Paso, Yuma, Reno, Albuquerque, Salt Lake City, Boise (arid West) + Atlanta,
    Houston, New Orleans, Raleigh, Dallas (humid South/Gulf). **Direction (June 2026):
    own the national explorer — see ROADMAP "Direction".**
  - **Each city page** leads with its own top-ranked verified facts ("What stands
    out in <city>", the salience engine), then its applicable cards. Phoenix keeps
    its curated hero via a registry `featured` overlay; others get an auto hero.
  - **Phase 5** adds a labeled "if the trend continued" extrapolation to 2050 on
    every city page — a straight-line hypothetical inside the bootstrap slope fan,
    explicitly **not** a forecast.

## Engine phases (see ROADMAP "City-climate engine")

**1 ✅ fact engine · 2 ✅ per-city page + auto hero · 3a ✅ explore + ranking ·
3b ✅ the literal US map · 4 ✅ scale cities · 5 ✅ honest extrapolation.** Now **14 cities** incl. five
humid/eastern (Atlanta, Houston, New Orleans, Raleigh, Dallas).

Post-Phase-5: diurnal curves wired for **all 14 cities** (the humid set's `*-diurnal.json`
builds on the next rebuild); grid for the clean-BA metros only (ABQ=PNM, Boise=IPCO, +the
arid airports); the explore-map dots are sized by night-warming
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
sized by warming, names on hover/focus (always-on labels collide once cities span the country). Houston & New Orleans are now shipped (Gulf coast; full card sets \u2014 tropical nights +
night-cooling, since the Gulf is hot AND humid). Raleigh & Dallas now shipped too. **Probed but NOT added** (don\u2019t re-attempt): Charlotte (rejects,
nights warm slower than days 0.6\u00d7), Memphis & Nashville (real UHI excess but flat ~1.0\u00d7 lows-vs-highs,
too weak to feature), Miami (maritime, no clean rural control). Next clean candidates worth a probe:
Kansas City, Oklahoma City, San Antonio, Birmingham, Columbia SC, Tampa (probe maritime carefully).

## What's deferred (the next obvious work)

**The chosen direction is card-depth parity, not more cities** (see ROADMAP "Direction").
The breadth cities are shallower than Phoenix; close that before widening further.

1. **Card-depth parity for the breadth cities.** ✅ Diurnal is now wired for **all 14**:
   the 5 humid cities (atl/hou/nola/rdu/dfw) are opted into `diurnal` in `cities.js`, added
   to the diurnal loop in `rebuild-data.yml`, and shape-checked in `verify_v0.py` — their
   `*-diurnal.json` builds on the next rebuild (until then the cards self-omit via the 404→
   null path). The hour-by-hour + cool-window cards then extend to the humid set. Remaining
   gap: heat-deaths is still Phoenix-only — the next clean transcription (LV/El Paso) to the
   `HEAT_DEATHS.md` bar adds the human-cost card for another city.
2. **Grid where a clean single-utility metro BA exists.** Wired for PHX, TUS, LV, EP,
   ABQ, BOI. Yuma/Reno/SLC stay deferred: no clean single-utility metro BA (Reno's `NEVP`
   is Las Vegas's utility; `WALC`/`PACE` aren't metro-specific); humid Gulf/eastern cities
   sit inside ERCOT/MISO/Southern, also not metro BAs. To wire one: add a `grid` block to
   `cities.py`, mark `grid` in `withAssets(...)`, add the city to the grid loop in
   `rebuild-data.yml`, and run `build_grid.py`.
3. **A real projection layer (CMIP6 / LOCA2 downscaling)** — the separate go/no-go behind
   Phase 5. The current extrapolation is deliberately a labeled trend line, not a forecast;
   a true projection is a different, physics-based layer.
4. **More cities** are lower priority now (depth-before-more-breadth). `analysis/city_audit.py`
   (PASS/REVISE/REJECT + card-fit) is the gate; the scope is **any continental-US metro with
   a clean, slower-warming rural control** (no longer arid-only — humid continental/Gulf
   transfers; maritime tropical like Miami rejects). Bakersfield REJECTED (signal below the
   global rate); next probes: Kansas City, OKC, San Antonio, Birmingham, Columbia SC, Tampa.

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

- **Two products, one engine** (`apps/web/src/products.js`): `desert` ("Desert Nights",
  the 5 hot-desert cities — phx/tus/lv/ep/yum — Phoenix flagship) and `explorer`
  ("City Signals", all cities). They
  **fully diverge at the page level** via a `layout` field: `curated` (Desert Nights →
  `DashboardBody`, the full fixed stack) vs `signals` (City Signals → `SignalsBody`, only
  this city's top-fact cards in salience order, so every city's page differs).
  `CityDashboard` branches on `product.layout` (hero + body); the atomic cards, fetchers,
  map, and salience engine are shared. City Signals' fact→card map lives in
  `SignalsBody.jsx` (`FACT_CARD`); `night_warming`/`lows_outpace_highs` are the universal
  trend backbone, the other 6 fact keys each map to a full card *family* (gated on data,
  so cards self-omit where the asset is absent — e.g. the humid set's diurnal until its next
  rebuild). The active product
  is fixed per deployed site via `VITE_PRODUCT` (`npm run build` = City Signals,
  `npm run build:desert`), with `?product=<id>` for preview/CI. Components take the scoped
  `cities` + `product` as props (never import `CITIES` directly in the landing/map/compare).
  Deploy wiring ships both from one Pages artifact (explorer at root, Desert Nights at
  `/desert/`); branding/OG/worldwide are deferred — see ROADMAP "Direction".
- Branch `claude/<topic>`; one focused PR; draft/PR → CI green → squash-merge.
  ("keep going" = standing approval to merge green PRs.)
- **Principles** (the bar — see ROADMAP): reproduce or reject · lows first · state
  the caveat in the card · no redundant cards.
- Every new **city** = two registry entries (`analysis/cities.py` with its
  **`rural_sid`** + `cities.js`) + committed ACIS assets + a render assertion + a
  README/ROADMAP line. The rural-pair sid lives **once** in `cities.py` (`rural_sid`);
  `build_facts.py` and `verify_v0.py` both read it from there — don't re-type it. Front-end
  asset paths are **derived from the city `id`** by `withAssets(city, [...optIn])` at the
  `CITIES` array in `cities.js` (list the opt-in assets: `diurnal`/`grid`/`heatDeaths`); the
  base four are automatic. `verify_v0.py`'s registry-driven **`check_cities`** then value-checks
  the new city's facts JSON live (night-warming / urban-excess / lows-vs-highs) — no per-city
  block to add. Every new **card** still adds a `verify_v0.py` check (if it makes a data claim)
  + a render assertion.
- **No hardcoded year cutoffs.** Pipelines/scripts derive `LAST_COMPLETE_YEAR`
  (`datetime.date.today().year - 1`) and the trailing decade (`RECENT0`); never paste a
  literal year (it silently freezes the next rollover). `build_facts.py`, `city_audit.py`,
  and the reproduce scripts all follow this.
- **Precomputed assets** are committed JSON under `apps/web/public/data/`, stamped
  `generated`/`throughYear`; they go stale until the **Rebuild data assets** Action
  reruns the pipelines (monthly cron, or manual dispatch — which needs Actions:write).
- Keep Phoenix & Tucson hour-of-day output **byte-identical**: no-DST cities use a
  fixed `utc_offset`; DST cities set an IANA `tz`.

## Gotchas

- `cities.py` `CITIES` is a **dict** (iterate `.values()`); `cities.js` `CITIES` is
  an **array** built by `withAssets(...)` (the bare consts have no `*Asset` fields —
  always consume `CITIES`). Asset filename **prefix == city `id`**
  (phx/tus/lv/ep/yum/rno/abq/slc/boi/atl/hou/nola/rdu/dfw).
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
- The explore ranked list shows a per-city **climate chip** (Arid West / Humid South) via
  `climateOf(id)` in `cities.js` — **add new humid cities to the `HUMID` set** there, or they
  default to "Arid West".
- The explore **map dots are sized by night-warming rate** (`CityMap` takes the
  ranked rows from `CityExplore`); re-running `build-map.mjs` only changes geometry,
  not the sizing.
- Playwright `waitForFunction(fn, arg, options)` — **arg before options** (a real
  bug that once cost a render run).
