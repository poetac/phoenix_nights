# Session handoff / onboarding

Read this first if you're picking up Phoenix Nights in a new session. It captures
where the project is, what's deferred, and what the environment needs.

For the *why* and the bar every change clears, read `ROADMAP.md` (milestones +
Principles + the "City-climate engine" and "Breadth" sections), `CLAUDE.md`, and
`README.md` (data sources + methodology). This file is the operational state.

---

## In flight right now (check this first)

- **As of 2026-07-24** — `main` is green (build + verify-data + render). This
  session worked straight through the M8 durability backlog (see ROADMAP.md
  M8 for the full detail on each): #134 corrected `HANDOFF.md`'s own stale
  "no browser libs" claim (it's a network *policy* blocking ACIS/NCEI/EIA/
  open-meteo egress, not a missing browser); #136 (a Dependabot patch bump)
  and #135's regression are clean; #137 shipped the M8 #18 lint gate
  (`no-undef`/`no-unused-vars`); #138 pinned Playwright as an exact
  devDependency (M8 #13); #139 product-split `CityMap` so each product only
  fetches its own map geometry (M8 #1, ~41–53 KB gz saved); #140 cache-busts
  `public/data` with a build-time content hash (M8 #3); #141 split
  `cities.js` (926 lines) into per-city files under `lib/cityData/` (M8 #8);
  #142 split `verify_v0.py` into offline (hard gate, zero network) and live
  (soft, retried) phases (M8 #14) — genuinely testable end-to-end in this
  sandbox for the first time, since the offline half needs no ACIS/NCEI
  access; #144 unified day-of-year onto one shared, leap-year-aware
  `cities.day_of_year()` (M8 #12), verified as a pure dedup (zero value
  change) by exhaustively comparing the old/new formulas across 6 years.
  **#10 (shared `acis.py`/`assetio.py`) is in progress, deliberately
  phased** — #143 shipped Phase 1 (the new modules + tests, purely
  additive, zero existing files touched); migrating the ~17 consumer
  files continues in small follow-up PRs, each meant to be gated by
  triggering the real "Rebuild data assets" GitHub Action and confirming
  it opens no refresh PR (its own `git diff` check on `apps/web/public/data`
  means a byte-identical migration silently, safely proves itself — see
  ROADMAP for the planned order, riskiest — `build_facts.py`,
  `verify_v0.py` — last). Remaining M8 items: #7 (`CityDashboard`
  reducer — deferred, see below), #17 (branch protection on `main` — a
  repo *setting*, no GitHub API/MCP tool exposes it; still needs you in
  the Settings UI).
- **Owner action needed — the monthly automated data refresh has been silently
  broken for at least a month.** Confirmed by triggering `rebuild-data.yml`
  directly (workflow_dispatch): every rebuild fetches fresh data, computes it,
  and passes `verify_v0.py` correctly, but the final "open a PR with refreshed
  assets" step fails every time with `GitHub Actions is not permitted to
  create or approve pull requests (createPullRequest)` — a repo *setting*
  (Settings → Actions → General → Workflow permissions → "Allow GitHub Actions
  to create and approve pull requests"), not a code bug; the workflow file's
  own `permissions: pull-requests: write` block doesn't override it. Confirmed
  this isn't new: a dispatch against `main` itself on 2026-06-26 failed
  identically. So `apps/web/public/data` has been quietly going stale (last
  successful refresh predates that) with **no visible failure anywhere** —
  the job itself shows green right up to the last step. Enable that repo
  setting, then re-run "Rebuild data assets" by hand to catch main back up.
- **M8 #7 (`CityDashboard` reducer) — partially addressed.** Researching the
  reducer collapse turned up a sharper reason than "browser-attended" to
  leave the refactor itself deferred — `CityDashboard` is keyed on `city.id`
  in `App.jsx` (`<CityDashboard key={city.id} .../>`), so React remounts a
  fresh instance on every city switch; the reset-on-an-already-mounted-
  instance code path this item would refactor only ever runs today via the
  Retry button (`reloadKey` bump) after a fetch failure. Closed the coverage
  gap that made this refactor unsafe to attempt: `render-smoke.mjs` now has a
  Retry-path case (mocks the live ACIS + Open-Meteo calls to fail once via
  `page.route`, confirms the error card appears, then confirms Retry clears
  it) — fully offline-verifiable since it's simulating the failure, not
  relying on real ACIS to fail. The reducer collapse itself is still not
  done; this test is the prerequisite that makes it safe to attempt.
- **A real bug was caught and fixed this session — read this if anything
  still looks broken.** After #133 (the vite 8 bump) merged, `SeasonsCard`
  started throwing `TREND_START is not defined` on **every render** — i.e.
  every ACIS-sourced city's Desert Nights page. Root cause: `TREND_START` was
  moved into `lib/seasonsModel.js` during an earlier model extraction (#115)
  but never re-exported/re-imported into the card, which used it directly in
  its prose. **This bug existed since #115** but was masked for months by the
  old bundler's (Rollup) scope-hoisting accidentally concatenating the two
  modules into one scope; Vite 8 defaults to a different bundler (Rolldown)
  whose chunking finally exposed it. Fixed in #135 (verified via CI's `render`
  job hitting the real live ACIS path — the exact thing this sandbox's network
  policy can't test locally). **Lesson for any future model extraction:** if
  you move a top-level `const` out of a card into its `lib/*Model.js`, grep the
  card for every remaining bare reference to that name before calling the
  extraction done — a local build succeeding is NOT sufficient proof (it
  passed here too, both times, until Rolldown's chunking differed).
- **M8 items #4, #5, #6 all completed** this session (PRs #105–#132):
  every card's prose/guard logic is now a pure, unit-tested `lib/<name>Model.js`
  (see the compact table at ROADMAP.md M8 item 6), and the shared year-window
  helpers (`lib/series.js`) are adopted everywhere. 23 test suites, all offline.
- **recharts bumped to v3.9.0** (#130, merged) for maintenance/EOL currency —
  see ROADMAP M8 item 2 for the honestly-measured (flat, not a size win) result.

## Status snapshot

- `main` builds green; CI = **build** + **verify-data** (`analysis/verify_v0.py`,
  live ACIS) + **render** (Playwright smoke test, `apps/web/tests/render-smoke.mjs`).
- Deployed to GitHub Pages: <https://poetac.github.io/phoenix_nights/>
- The product is now a **generalized, worldwide city-climate engine**, not a single page:
  - **Explore landing (`/`)** leads with a clickable map over a ranked list; both
    share one ranking (night-low warming). Click a city → `?city=<id>`. The map is
    product-aware: **City Signals uses a world map** (`worldMap.js`, generated by the
    "Build world map" Action), Desert Nights the US Albers map; before generation City
    Signals falls back to the US map.
  - **16 cities**, registry-driven: 14 US — Phoenix (curated flagship), Tucson, Las
    Vegas, El Paso, Yuma, Reno, Albuquerque, Salt Lake City, Boise (arid West) +
    Atlanta, Houston, New Orleans, Raleigh, Dallas (humid South/Gulf) — **plus two
    international cities, Sydney, AU and De Bilt, NL** (`source:"ghcn"`, NCEI GSOY,
    `units:"metric"`; Sydney southern-temperate coast, De Bilt maritime-temperate Europe).
  - **Worldwide (Phase B) shipped:** the City Signals product was realigned to its
    neutral, worldwide, per-city-signal voice (no longer the US lows-first thesis —
    that's Desert Nights'). Sydney is the maritime *signal* where days outpace nights
    (gap widens), value-checked live by `check_cities_ghcn`. Per-product OG/meta is
    wired (`productMeta()` in `vite.config.js`). See `WORLDWIDE.md`.
  - **Each city page** leads with its own top-ranked verified facts ("What stands
    out in <city>", the salience engine), then its applicable cards. Phoenix keeps
    its curated hero via a registry `featured` overlay; others get an auto hero.
  - **Phase 5** adds a labeled "if the trend continued" extrapolation to 2050 on
    every city page — a straight-line hypothetical inside the bootstrap slope fan,
    explicitly **not** a forecast.

## Engine phases (see ROADMAP "City-climate engine")

**1 ✅ fact engine · 2 ✅ per-city page + auto hero · 3a ✅ explore + ranking ·
3b ✅ the literal US map · 4 ✅ scale cities · 5 ✅ honest extrapolation.** Now **16 cities** — 14 US incl.
five humid/eastern (Atlanta, Houston, New Orleans, Raleigh, Dallas) + Sydney and De Bilt (GHCN/GSOY).

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

**This section covers two different sandbox types** — check which one you're in
(if `mcp__github__*` tools are present, you're in the first).

### A. Claude Code on the web / GitHub Action (this session's type)

1. **GitHub MCP tools work out of the box** — `mcp__github__get_me` confirms
   auth, no PAT needed. Use them for all PR/CI/repo operations (see CLAUDE.md's
   GitHub Integration section). If a tool call returns "server disconnected,"
   the connector needs the user to re-authorize (claude.ai connector settings) —
   it usually reconnects on its own after a beat; verify with `get_me` before
   assuming it's still down.
2. **Network egress is a POLICY, not a missing-libs problem — and it may deny
   ACIS/NCEI/EIA/open-meteo.** Confirmed on 2026-07-13: `curl` to
   `data.rcc-acis.org`, `archive-api.open-meteo.com`, and even
   `www.google.com` all get `403` from the proxy gateway
   (`curl -sS "$HTTPS_PROXY/__agentproxy/status"` shows `recentRelayFailures`
   with `"policy denial"` for each) — this is the environment's configured
   network policy (chosen at environment-creation time), not a code or library
   issue, and it blocks **both** shell (`curl`/Python `requests`) and a
   Playwright-launched browser identically (tested independently — same 403
   either way). If you hit this: **`python3 analysis/verify_v0.py` and the
   data pipelines cannot run here** — don't burn time debugging what looks like
   a connectivity bug; check the status endpoint above to confirm it's policy,
   then rely on CI's `verify-data` job (GitHub-hosted runners have full
   internet). If live data pipeline work is actually the task, tell the user
   their environment's network policy needs ACIS/NCEI/EIA/open-meteo allowed
   (see the docs page in the system prompt for how policies are configured).
3. **Chromium IS pre-installed and DOES work locally**
   (`/opt/pw-browsers/chromium-1194/...`; the system prompt has the exact
   paths/env vars) — correcting an earlier version of this note that said
   otherwise. You can run `tests/render-smoke.mjs` locally against a served
   `dist/` build, and it will correctly validate everything backed by
   **precomputed/committed JSON** (explore landing, world/US map, compare
   chart, city switcher, cross-city signal hero, climate tags). What it
   **cannot** validate locally is any route needing a **live** fetch (the
   curated Desert-Nights-layout dashboards' "last night" / daily-record calls
   to ACIS/Open-Meteo) — those cards gate on `if (!rows.length) return null`,
   so a blocked fetch means the whole card set silently renders nothing,
   which reads exactly like a real regression if you don't know the network
   is policy-blocked. **CI's `render` job is the only authoritative check for
   those routes.** (If a freshly-installed local `playwright` package
   mismatches the pre-baked browser version — `chrome-headless-shell`
   version-not-found — pass `executablePath` pointing at the pre-baked
   `chrome-linux/chrome` binary instead of reinstalling browsers.)
4. **Dependency bumps that touch a build-tool/plugin pair must be checked
   together.** Learned from Dependabot #129/#131 (2026-07): `vite` and
   `@vitejs/plugin-react` have peer ranges that only overlap for specific
   version pairs — bumping one without the other can silently break CI with
   an `ERESOLVE` peer conflict. Before merging any Dependabot PR that touches
   a `devDependencies` build-tool package, check `npm install` locally for
   `ERESOLVE` and check whether a coupled package (its plugin, its peer)
   needs to move too.
5. **Before trusting a "performance win" hypothesis in ROADMAP.md, measure
   it.** The "recharts v3 could cut 50–80 KB gz" hunch (M8 perf item 2)
   turned out flat (310.63 → 313.57 KB gzip, measured 2026-07) once actually
   built both ways under controlled conditions. Worth doing anyway (recharts
   2.x is npm-flagged EOL) but don't re-attempt the same bet expecting a
   different result — a real size win there needs a different approach
   (hand-rolled SVG/d3-shape renderer, or auditing which recharts
   subcomponents are actually pulled into the bundle).

### B. Bare shell sandbox (no GitHub MCP — older/different setup)

1. **No git write + no EIA key by default.** Ask the user to paste a
   **fine-grained GitHub PAT** for `poetac/phoenix_nights` (Contents R/W, Pull
   requests R/W, Workflows R/W — note: **no** Actions:write, so you can't re-run a
   stuck run via API; re-trigger with an empty commit). For grid builds only, ask
   for the free **`EIA_API_KEY`** (eia.gov/opendata).
2. **Egress may be open** from the shell (ACIS, NCEI, EIA, api.github.com, npm) —
   this varies by sandbox provisioning; verify before assuming (see the policy
   check in A.2 above, which applies here too if this sandbox uses the same
   agent-proxy mechanism). Clone into a **sandbox-native dir** (e.g. `$HOME/work`),
   NOT the mounted outputs folder (git locking fails there). Push via
   `git push https://x-access-token:<PAT>@github.com/...`; open/squash-merge via the
   REST API. Never echo the token.
3. **Do NOT attempt a local full-app browser render** if the sandbox genuinely
   lacks browser system libs (verify — this may not apply to your sandbox; see
   A.3 above). **Rely on CI** (`build`, `verify-data`, `render`) as the fallback.
   You *can* run `npm run build`, and — if egress is confirmed open —
   `python3 analysis/verify_v0.py` (hits ACIS), the data pipelines, and
   rasterize a committed SVG via `@resvg/resvg-js` to eyeball the map.
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
  `/desert/`). **Per-product branding/OG is done** — `index.html` carries `__META_*__`
  tokens filled at build time by `productMeta()` (`vite.config.js`) per `VITE_PRODUCT`
  (City Signals → `og-citysignals.svg`; Desert Nights → `og.png`). **Worldwide is
  shipped** (Sydney; City Signals reframed; world map) — see ROADMAP "Direction" + `WORLDWIDE.md`.
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
- An **international (worldwide) city** is `source:"ghcn"` instead of ACIS: set `ghcn_sid`
  (a GSOY-reachable GHCN-Daily station — verify it returns TMIN first via `verify_v0.py`'s
  `GHCN_INTL_SMOKE`) + `units:"metric"` in both registries. No ACIS, so it carries only a
  precomputed `series` asset (`build_series.py` → `withAssets(city, ["series"])`; the ACIS
  base four auto-skip for ghcn) + facts; daily/hourly cards self-omit. `build_facts` and
  `build_series` take the GSOY path; `check_cities_ghcn` value-checks the °C facts live
  (counterexample-aware). Add the city to the `build_series` loop in `rebuild-data.yml`, and
  rerun the **Build world map** Action so its dot lands. **Sydney (`syd`) is the worked example.**
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
  cities' fact scores (expected). The rural-pair sid is read from `cities.py` (`rural_sid`,
  the single source of truth) — there is no separate `REF` dict to update.
- The **card-fit** lesson: high-elevation cities have cool 1970s nights, so
  night-cooling-share goes ≤0 and tropical-nights ≈0 — those cards omit (guarded in
  `NightCoolingCard`, the salience applicability checks, the share generator). New
  cities inherit the guards; `city_audit.py` now predicts card-fit up front.
  **`WinterCard` ("Winter left first") is now guarded too**: it's a frost-*disappearance*
  story, so it self-omits unless the most recent winters no longer reach five frosts AND
  some are frost-free (i.e. frost genuinely collapsed — phx/yum/lv). Cold cities that
  still freeze 90–160 nights/yr (Reno/SLC/Boise/ABQ) used to render it with numbers that
  contradicted its own headline. Related: shared cards must read their station/control
  copy from city fields (`stationLabel`/`threadSid`/`urbanShort`/`rural.kind`), never
  hardcode "Phoenix"/"Sky Harbor"/"PHXthr" — `render-smoke.mjs` now fails if that copy
  leaks onto a non-Phoenix page. The Desert-Nights-only cards are swept too: **`GridCard`
  reads its utility name from the grid asset's `respondents`** (e.g. "TEPC (Tucson Electric
  Power)"), and **`GrowthCard` reads `city.county`** — no more "metro Phoenix's APS + SRP"
  or "Maricopa County" on Tucson/Vegas/El Paso, guarded by a `?product=desert&city=tus`
  render assertion.
- The **US map** is generated by `apps/web/scripts/build-map.mjs` (devDeps `--no-save`:
  `us-atlas topojson-client d3-geo`); it commits `src/lib/usMap.js`. The **world map**
  (City Signals) is `apps/web/scripts/build-world-map.mjs` (`--no-save`: `d3-geo
  topojson-client world-atlas`; geoNaturalEarth1 over countries-110m) → `src/lib/worldMap.js`,
  run via the **Build world map** Action. **Re-run the relevant generator after
  adding/moving a city** so the new dot + viewBox land. `CityMap` is product-aware (world
  for City Signals once `worldMap.js` is non-null, US Albers for Desert Nights + as the
  pre-generation fallback). The committed projected paths mean **no runtime map deps**.
- The **city switcher** (top nav) is a collapsible dropdown — don't revert it to a
  wrapping pill bar (it overflowed at 9 cities).
- Grid card needs a **single-utility** EIA balancing authority — California cities
  (CISO is statewide) can't get one, and check northern vs southern NV (`NEVP` ≠ Reno).
- **Diurnal ISD ids must cover recent decades**, not just "any data": Yuma's single
  modern id was wrong, so its hourly record is chained across era ids in `cities.py`
  (`build_diurnal` fetches them all). The **cool-window** card self-omits where
  overnight sub-85°F relief is still abundant (cool/high-elevation cities) — it's a
  hot-city scarcity story.
- The explore ranked list shows a per-city **climate chip** via `climateOf(id)` in
  `cities.js`, now **data-driven**: a city can declare its own `climate: {key,label}`
  (worldwide cities do — Sydney is "Temperate coast"); US cities fall back to the `HUMID`
  set → "Humid South", else "Arid West" (**add new humid US cities to `HUMID`**).
- The explore **map dots are sized by night-warming rate** (`CityMap` takes the
  ranked rows from `CityExplore`); re-running `build-map.mjs` only changes geometry,
  not the sizing.
- Playwright `waitForFunction(fn, arg, options)` — **arg before options** (a real
  bug that once cost a render run).
