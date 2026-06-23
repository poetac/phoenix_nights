# Phoenix Nights — Roadmap

**Thesis:** Cities are abandoning their overnight lows faster than their highs — the
urban-heat-island fingerprint, written in the official station record. The desert
still cools off at night; the city doesn't — and the same fingerprint now shows up
across 14 US metros in two biomes. Phoenix is the curated flagship; the engine proves
the pattern is **universal**.

This document is the working plan. It is meant to be edited — milestones get
re-ordered, cards get promoted or rejected. What does *not* move is the bar every
card has to clear (see Principles).

---

## Direction (June 2026) — two products on one shared engine

The project started as a single-city Phoenix depth play, **became** a 14-city national
explorer, and is now **splitting into two products built on one shared engine** (cards,
fetchers, map, salience — all city-agnostic):

- **Desert Nights** — the curated, opinionated heat-island story, anchored in the arid
  West where the city-vs-open-desert control is cleanest. Phoenix is the flagship. Its
  city pages use the **curated** layout: the full, fixed card stack (`DashboardBody`),
  thesis-forward. ("Desert Nights" is the generic-desert rename of the old "Phoenix
  Nights" brand — Phoenix is the flagship, not the brand.)
- **City Signals** (the explorer) — the platform: every city (US now, worldwide later),
  map-first. Its city pages use the **salience** layout (`SignalsBody`): each city shows
  ONLY the cards matching *its own* top-ranked facts, in salience order, so **every
  city's page is laid out differently** — the explorer surfaces what's distinctive about
  each place rather than a fixed template.

A product is a composition over the shared engine (`apps/web/src/products.js`): which
cities it includes, its landing framing, brand, and **`layout`** (`curated` vs
`signals`). The active product is fixed per deployed site (`VITE_PRODUCT`), with a
`?product=` override for preview/CI. The two products **fully diverge** at the page
level (different hero + different body) while sharing the atomic cards, fetchers, map,
and salience engine.

What that commits us to (and what this pass delivered):

- **Verification parity** — every city, not just Phoenix, now has its displayed
  headline numbers (night-warming, urban excess, lows-vs-highs ratio) reproduced live
  from ACIS and value-checked against its committed facts JSON in CI (`check_cities`
  in `verify_v0.py`), so "reproduce or reject" holds across the whole set.
- **One source of truth for the registry** — rural-pair station ids live once in
  `analysis/cities.py` (`rural_sid`); `build_facts.py` and `verify_v0.py` read them
  from there. Front-end asset paths are derived from a city's `id` (`withAssets` in
  `lib/cities.js`), not spelled out per city.
- **No hardcoded cutoffs** — the salience engine and the vetting/reproduce scripts all
  derive the last-complete-year window, matching the guarantee the data-trust work made.

Go-forward (the split, phased):

- **Phase 1 — product layer (done):** `products.js` + a product-aware engine; both
  products build (`npm run build` = City Signals, `npm run build:desert` = Desert Nights).
- **Phase 2 — two-site deploy wiring (done):** one Pages artifact serves the explorer at
  the root and Desert Nights at `/desert/`. **Per-product branding/OG done** — `index.html`
  `__META_*__` tokens filled at build time by `productMeta()` (`vite.config.js`) per product
  (City Signals → `og-citysignals.svg`; Desert Nights → `og.png`). (Custom-domain + a
  rendered-PNG OG remain owner's-call polish.)
- **Phase 3a — full page divergence (done):** City Signals named; "Phoenix Nights"
  renamed to "Desert Nights"; City Signals city pages now use the salience-driven
  `SignalsBody` (a different layout per city), Desert Nights keeps the curated
  `DashboardBody`.
- **Now — button down each product:** *Desert Nights* — city cut **tightened to the 5 hot
  low deserts** (Phoenix, Tucson, Las Vegas, El Paso, Yuma — the cooler high-desert metros
  stay in City Signals); its curated pages now **lead with the city-vs-open-desert control**
  (UHI + global-rate context sit right under the trend, before the extrapolation/ladder).
  Still deferred (deploy-adjacent): regenerate share cards under the new brand and point
  Desert-specific share slugs at `?product=desert` (they currently resolve against City
  Signals). *City Signals* — **done:** each top fact now renders its full card *family*
  (e.g. the diurnal-compression fact pulls in the hour-by-hour "then and now" curve; the
  tropical-nights fact pulls in the warm-night season + sleep-threshold + cool-window
  cards), each self-omitting when its data/asset is absent — so a city's lead signal is
  shown in depth, still salience-led and still a different layout per city.
- **Phase 3 — worldwide (City Signals) — shipping:** a station-record backend
  (**GHCN-Daily via NCEI GSOY** — *not* gridded reanalysis, which would smooth the UHI
  signal away), a world map, and °C rendering. **Phase A done** (GHCN-Daily reproduces the
  14 US cities' night trends). **Phase B live: Sydney, AU and De Bilt, NL are the first two international cities**
  (`source:"ghcn"`, metric, value-checked by `check_cities_ghcn`); City Signals' copy +
  map are now worldwide/neutral. Hemisphere-aware seasons + more cities (London/Tokyo
  rejected at GSOY for missing TMIN) are the next slice. Full design in
  [`WORLDWIDE.md`](WORLDWIDE.md).
- **Deployment details** (subpaths vs custom domains vs separate repos) — revisit once
  both products are in a good state.

Still open regardless: **card-depth parity** for the breadth cities — diurnal is now
**wired for all 14** (the humid set's `*-diurnal.json` builds on the next rebuild, then the
hour-by-hour + cool-window cards light up); what remains is grid for the humid set (none has
a clean single-utility metro BA) and heat-deaths (Phoenix-only by design).

---

## Where we are (June 2026)

A **worldwide city-climate explorer** (14 US cities + Sydney and De Bilt, the first
two international cities) — React + Vite, deployed to GitHub Pages —
on a city-agnostic engine (`lib/cities.js` registry + `<CityDashboard city={…} />`),
fronted by a clickable US map and a per-city salience ("what stands out") section.
Python stdlib pipelines precompute static JSON; CI builds the app, runs a real-browser
render smoke test across all cities, and verifies every city's stats live against
ACIS/NCEI. Cities: Phoenix (flagship), Tucson, Las Vegas, El Paso, Yuma, Reno,
Albuquerque, Salt Lake City, Boise (arid West) + Atlanta, Houston, New Orleans,
Raleigh, Dallas (humid South/Gulf).

**Shipped cards:** night-warming trend & ratio · UHI city-vs-desert decomposition ·
global/national warming-rate context · population-vs-night-gap growth ·
fixed-vs-rolling baseline goalposts · summer-night
seasonal series · hour-by-hour diurnal (coolest-hour rise) · hours of overnight relief ·
100°F-day season length · 80°F-night season span · 80°F-night streaks · vanished winter ·
cooling degree days (total + day/night split) · heat deaths (human cost) · July grid demand ·
sources. Plus a live "last night vs the 1970s normal" hero above the stack.

The build is green and there is no half-finished work in the tree.

---

## Principles (the bar for every card)

1. **Reproduce or reject.** Every number on the page comes from a committed pipeline
   that re-derives it from the official record. If a story can't survive the raw data,
   it doesn't ship — see the dew-point / "drying city" story, tested and rejected
   (monsoon variability dominates; no clean decade signal). Don't re-open it.
2. **Lows first.** When two framings compete, the one that surfaces overnight lows wins.
   That's the whole point of the project.
3. **State the caveat in the card.** Elevation offsets, surveillance-improvement bias,
   non-AC load growth, short EIA records — name them where the reader sees the chart,
   the way the UHI and human-cost cards already do.
4. **No redundant cards.** A new card has to say something the diurnal, grid, streak,
   and seasonal cards don't already say.
5. **Parity, not just presence** — *(supersedes the old "one city's depth before breadth")*.
   Breadth is now the product, so every city must clear the same bar Phoenix does: its
   displayed numbers reproduced and value-checked live in CI, its caveats stated in-card,
   and its premise-failing cards omitted cleanly. A city that can only be *shown* but not
   *verified* doesn't ship. (The earlier principle parked the multi-city engine; that
   engine is now the product — see Direction above.)

---

## M4 — Deeper Phoenix evidence (✅ SHIPPED)

Goal (met): make the flagship Phoenix story undeniable. All items below shipped; the
work then generalized into the multi-city engine (see "City-climate engine" and
"Direction" above). Phoenix remains the curated flagship and the deepest city; diurnal is
now wired for all 14, leaving grid (humid set) and heat-deaths (Phoenix-only) as the last
card-parity gaps — not more Phoenix cards. Backlog was ordered by impact ÷ risk.

### 1. Extreme-minimum erosion — ✅ SHIPPED (PR #1)
**Claim:** Even the *coldest* night of the year is warming, and the *hottest* night
keeps setting records. Every other card is a mean, a count, or a streak; this one shows
the single warmest and single coldest overnight low per year.
**Built:** `ExtremesCard.jsx`, fed by two extra ACIS yearly reduces (`mint` `max`/`min`)
added to `fetchCityYearly` — no new asset. CI guards it via a GSOY `EMNT` (coldest-night)
trend check in `verify_v0.py`.

### 2. Hot-night season calendar creep — ✅ SHIPPED (PR #2)
**Claim:** The first 80°F+ night arrives earlier and the last one ends later — the
warm-night *season* is lengthening. Distinct from the shipped 100°F-*day* season card
(nights vs days) and from the streak/count cards (when in the year vs how long / how many).
**Built:** `HotNightSeasonCard.jsx`, fed by `first80`/`last80`/`count80` per year (first/last
day-of-year crossing 80°F) emitted by `build_streaks.py`, same DOY convention as the
100°F-day builder. CI-guarded by a warm-night-season-span check in `verify_v0.py` that
re-derives the lengthening from ACIS daily lows (GSOY has no per-day data). Result: the first
80°F night now lands ~17 days earlier and the last ~14 days later than in the 1970s — a season
~31 days longer (~85 such nights/year vs ~47). Asset refresh is automated (see M7).

### 3. Human-cost demographics — ✅ SHIPPED (PR #11)
**Claim:** Who the heat kills — unsheltered vs housed, indoors-with-AC-off vs outdoors, by age.
Replaces the card's old "roughly half were unsheltered" prose with a real breakdown.
**Built:** a `demographics` block in `phx-heat-deaths.json` (2024 final report — the most recent
complete demographic report) drives a "Who the heat finds" grid in `HumanCostCard.jsx`: 49%
homeless, 77% outdoors, 70% of indoor A/C units not working (of the 88% of indoor deaths where a
unit was present), ~60% aged 50+, 78% men, 57% substance-involved (≈9 in 10 of those stimulants) —
each with its denominator, framed as systems failures (missing shelter bed, shut-off utility,
unfixable unit), not personal fault. Hand-curated asset, so it ships without a rebuild.
**Provenance:** every figure was read from the primary Maricopa County DPH *2024 Heat-Related
Deaths Report* (May 2025) PDF, not secondary reporting — the hand-verification the
`HEAT_DEATHS.md` runbook requires (CI shape-checks the JSON but can't check these values).

### 4. Global / national context — ✅ SHIPPED (PR #6)
**Claim:** Even the desert control warms faster than the global average; the city faster still.
**Built:** `GlobalContextCard.jsx`, reusing the existing city + rural pair (no new fetch): a
°F/decade ladder of Phoenix night lows and Casa Grande desert night lows (computed live, since
1970) against published global (~0.36) and contiguous-U.S. (~0.50) background rates as cited
reference lines. The "defensible benchmark" risk is handled by **stating the metric mismatch in
the card**: the benchmarks are all-hours annual means while the local figures are overnight lows,
so they're framed as a *conservative floor*, and the like-for-like city-vs-desert claim is left to
the control card. CI-guarded in `verify_v0.py`: both the city's and the desert's night-low trends
since 1970 are checked to exceed the global rate, reproduced from ACIS.

### 5. Intra-metro spatial gradient — *investigated, deferred (June 2026)*
**Claim:** The heat island is geographic — downtown/Sky Harbor hot, the valley fringe
cooler — shown across several ACIS stations on one chart or a small map.
**Data:** multiple ACIS station records across Maricopa County.
**Risk:** higher (station selection, record-length alignment, more UI). Conceptually
adjacent to the multi-city work, so it may instead seed M5.
**Verdict: deferred — the readily-available stations don't support a clean, non-redundant
card.** `analysis/spatial_gradient_probe.py` reproduces the scan: long *complete* records exist
almost only at the airports (COOP sites are gappy under any reasonable missing-data filter);
overnight-low warming *rates* are near-uniform across the metro (~1.1–1.4 °F/dec, no rate
gradient); and recent absolute night-lows are confounded by elevation, which varies
non-monotonically with distance from the core (Goodyear at 968 ft is the 2nd-warmest station,
Youngtown at 1135 ft the coolest). The one clean *same-elevation* contrast (Sky Harbor vs the NW
valley) just restates the city-vs-desert UHI control card (Principle 4: no redundant cards).
Revisit if a denser, elevation-matched, record-aligned set becomes available (e.g. an urban
mesonet). M5's second city already delivered the spatial-breadth value this card was chasing.

### 6. The collapsing day–night gap (diurnal temperature range) — ✅ SHIPPED (PR #1)
**Claim:** The desert's signature swing between afternoon and dawn is shrinking — the city
is erasing the difference between day and night itself.
**Built:** `GapCard.jsx`, DTR = `high − low` per year (no new data). Scoped to **1948+**
(Sky Harbor modern era) to avoid the early-record agricultural "oasis effect" that
suppressed DTR and confounds the urban signal. CI-guarded by a TMAX−TMIN since-1948
negative-trend check in `verify_v0.py`.

### 7. The narrowing cool window (hours of overnight relief) — ✅ SHIPPED (PR #4)
**Claim:** The pre-dawn window cool enough to recover in has shrunk to almost nothing —
not just a warmer minimum, but fewer hours below a comfort threshold.
**Built:** `CoolWindowCard.jsx`, derived client-side from the committed `phx-diurnal.json`
(no new asset): a stacked bar of hours/night below 85°F per decade, split out below the
cited 77°F sleep-recovery line. A typical summer night gave ~6 h below 85°F in the 1970s →
0 h in the 2020s; the deep 77°F recovery window closed after the 1960s. Caveat stated: it's
the decade's *average* JJA night (mean hourly curve), not a per-night distribution.
CI-guarded by a cool-window-shrinks check in `verify_v0.py`. Leads with "hours of cool,"
not clock-time of the minimum, per the note below. Distinct from the diurnal curve compare.

### 8. The night you can't sleep through (sleep-loss threshold) — ✅ SHIPPED (PR #1)
**Claim:** Phoenix now spends most of summer above the ~77°F (25°C) nighttime low where
sleep measurably degrades — a human-physiology line, not just a statistical one.
**Built:** `SleepCard.jsx`, fed by a new `mint cnt_ge_77` ACIS reduce on `fetchCityYearly`.
Threshold cited to Obradovich et al. (*Sci. Adv.* 2017) and Minor et al. (*One Earth* 2022),
framed as a published average effect (not Phoenix-specific causation). Differentiated from
the 80°F-night card by the cited threshold and the sleep/health narrative.

### 9. The thermostat that never turns off (overnight share of cooling demand) — ✅ SHIPPED (PR #5)
**Claim:** A rising share of total cooling demand comes from the *night* — the hours that
used to cost nothing to cool.
**Built:** `NightCoolingCard.jsx`, fed by `analysis/build_cdd_split.py` → `phx-cdd-split.json`.
The "defensible split method" risk is retired by using an **exact algebraic identity** rather
than an attribution model: on cooling days (mean > 65°F), `mean−65 = (Tmax−65)/2 + (Tmin−65)/2`,
so the day half and night half sum to the standard mean-based CDD the existing total-CDD card
plots. The card stacks the two halves over time and reports the night's rising share. Station-only
(no grid overlap); CI-guarded by a night-share-rising check in `verify_v0.py`. Renders only once
the asset is rebuilt (M7 workflow), like the other daily-derived assets.

*Researched and parked as risky/redundant:* frost-free-season length likely saturates
against the vanished-winter card (Phoenix already near-zero frost); a "broken-AC / mobile
home" angle should fold into item 3 (human-cost) rather than ship standalone; NWS
heat-alert calendar creep has a product-criteria-change confound and is daytime-driven.

### Audit (June 2026)
With 17 cards live, the lineup covers the trend, the attribution, the felt experience, and
the human cost thoroughly. Two genuinely new angles the backlog above doesn't yet capture:

- **10. "Last night vs the normal your grandparents knew"** — ✅ SHIPPED (PR #3). A live hook
  at the top of the page: `LastNightHero.jsx` fetches the most recently reported night's low
  from ACIS (a 2-week window; Phoenix-local date computed at UTC-7, no DST) and shows it as an
  anomaly against a *seasonal* 1970s normal — so a June night is judged against a 1970s June
  night, not the yearly average. The baseline is `analysis/build_normals.py` → `phx-normals.json`
  (1970–1979 daily low/high, smoothed ±7 days, keyed `MM-DD`); CI-guarded by a mid-July/mid-Jan
  normal-low sanity check in `verify_v0.py`. Honest on cool nights too (shows "below" when it is),
  and captioned "one night is weather, not climate." Lives above the card stack, as planned.
- **Heat & equity / tree canopy** — overnight heat is not evenly distributed; canopy and
  surface temperature track income. Powerful, but it rides a **different data spine**
  (satellite land-surface temperature, American Forests Tree Equity, census tracts) rather
  than the single-station thesis — treat as its own track, not a quick card. Parked.

Everything else obvious is already covered above or shipped.

**Cross-cutting for M4:**
- Add a sanity check per new card to `analysis/verify_v0.py` so CI guards the claim.
- Update the README "Sanity checks" list and card inventory as cards ship.
- Keep the vendor/app chunk split healthy as bundle grows.

**M4 done when:** at least items 1–3 ship with pipelines + CI checks, README updated.

---

## Parked milestones (sequenced, not started)

### M5 — Second city (Tucson) — ✅ SHIPPED (PR #19)
Exercise the generalized engine with a second desert-UHI city.
**Built:** `analysis/cities.py` (a Python registry mirroring `lib/cities.js`) + a `--city`
flag on the four ACIS builders (`build_streaks/heat_season/normals/cdd_split`), default
`phx` so Phoenix output is byte-identical; a `TUCSON` entry in `lib/cities.js` and a
`CITIES` registry driving a new in-app city picker (`App.jsx`); the rebuild workflow now
loops `phx`+`tus` for the ACIS assets; and `verify_v0.py` reproduces Tucson's city-vs-desert
UHI signal live from ACIS (Tucson night-low trend since 1970 > global rate, and > its desert
pair Sasabe). **Station validation (live ACIS / NCEI):** city = `TUSthr 9` ("Tucson Area",
record from 1894); overnight lows +~4°F since the 1970s (airport USW00023160 GSOY). Desert
pair = **Sasabe** `USC00027619` (+~0.75°F over the same span — a clear, growing gap); chosen
over the nearer Anvil Ranch, whose COOP record is too gappy for a 1970s baseline. Sasabe sits
~1,040 ft above the airport, so the card states the elevation caveat (signal = the gap's
*growth*).
**Shipped (PR #19):** the four ACIS `tus-*.json` assets, generated from live ACIS and committed;
Tucson view live on the deployed site. **Grid generalized (this PR):** `build_grid.py` is now
city-aware (Tucson = the **TEPC** balancing authority), with `tus-grid.json` committed and the
rebuild workflow looping `phx`+`tus` for the grid asset too. **Heat-deaths — intentionally Phoenix-only (documented reject):** the only primary
year-by-year Pima County heat-related (caused+contributed) series (AZDHS) is ~half
undocumented border-crossing desert deaths plus a 2023 surveillance-method break, with no
demographic breakdown comparable to Maricopa's — so it fails the reproduce-or-reject bar and
the card omits for Tucson (rationale in `analysis/HEAT_DEATHS.md`). Every other Tucson card
(ACIS suite, grid TEPC, diurnal ISD) is live; **M5 is complete.** Spatial work
from M4-5 may fold in here.

**Third city — Las Vegas (validates the engine).** `LASthr 9`, desert pair Desert NWR `USC00262243`, grid = NEVP (Nevada Power), diurnal = Harry Reid ISD. Las Vegas observes Pacific DST, which forced — and proved — a robustness fix: the hour-of-day builders now bucket DST cities through an IANA `tz` (`zoneinfo`) while AZ keeps its fixed offset (byte-identical). Las Vegas is the **fastest-warming of the three at night** (+1.68 °F/decade since 1970 vs its desert pair's +0.62), reproduced live in `verify_v0.py`. Heat-deaths deferred (Clark County data not yet verified to the bar). Adding a fourth city is now two registry entries (`cities.py` + `cities.js`) plus an asset rebuild.

### M6 — Launch & polish (IN PROGRESS)
Treat Phoenix as the flagship and get it in front of people.
- ✅ **Shipped (PR #10):** Open Graph + Twitter card meta and a `theme-color`/canonical; an
  on-brand social card (`public/og.svg`); display font moved out of a render-blocking runtime
  `@import` into a non-blocking `<head>` load with a system-serif fallback; a `<main>` landmark;
  and fetch timeouts + retry/backoff in `data.js` so a flaky network degrades to the Open-Meteo
  fallback instead of hanging. The in-app methodology section already shipped with the audit work.
- ✅ **Shipped (PR #12):** a rasterized **PNG** social card (`public/og.png`, 1200×630) so
  Facebook/Twitter/X render a preview, not just text — generated from `og.svg` by
  `apps/web/scripts/make-og.mjs` (resvg; the dep is intentionally not in `package.json`, the PNG is
  committed). Meta now points at the PNG with `og:image:width/height/type/alt`.
- ✅ **Shipped (PR #13):** accessibility pass — a skip-to-content link, a focusable `#content`
  `<main>`, the decorative background marked `aria-hidden`, `color-scheme: dark`, link focus
  outlines, and `role="img"` + descriptive `aria-label`s on the headline charts (the prose under
  each card already states the finding, so these are concise chart descriptors).
- ✅ **Shipped (PR #15):** `role="img"` + a descriptive `aria-label` on every remaining per-card
  chart (15 cards), so each visualization has a text alternative for assistive tech.
- ✅ **Shipped (PR #17):** shareable deep links — every `CardHead` heading is now a slug `id` with a
  hover-revealed `#` permalink, so any section is linkable/shareable by URL hash (centralized in
  `ui.jsx`, no per-card edits).
- ✅ **Shipped (PR #14):** performance budget — the whole chart body (`DashboardBody.jsx`, every
  recharts card + the trend math) is now a `React.lazy` chunk, warmed in parallel with the ACIS
  fetch, so recharts leaves the critical path. Build: the eager shell drops to ~9 KB gzip (was a
  ~159 KB-gzip combined vendor chunk); recharts now ships in a ~126 KB-gzip chunk loaded after
  first paint. `vite.config.js` pins only react/scheduler into an eager chunk and lets recharts
  auto-split into the dynamic import.
- ✅ **Shipped (PR #24):** per-card share *images* — `apps/web/scripts/make-share-cards.mjs`
  reuses the OG SVG→PNG path (resvg, dep `--no-save`, PNGs committed) to emit a 1200×630 share
  card per flagship metric per city to `public/share/<city>-<slug>.png` (6 cards: hot-nights,
  night-cooling, 100°F-days × Phoenix + Tucson). Headline numbers are read live from the committed
  data assets so a share card can't drift from the cards. Only count/share metrics get the
  two-bar treatment; temperature deltas are deliberately excluded — a zero-baseline bar would make
  a real +5°F shift look negligible.
- ✅ **Shipped (PR #25):** the share UX is wired end-to-end — `make-share-cards.mjs` also emits
  a static **share landing page** per flagship card (`public/share/<city>-<slug>.html`) carrying
  that card's `og:image`/Twitter meta and redirecting humans into the app; `App.jsx` honors
  `?city=` (kept in sync by the picker) and scrolls to a deep-linked `#card` once the lazy body
  mounts; and every flagship `CardHead` gains a hover **“↗ share”** button (Web Share API, clipboard
  fallback) that copies the card's landing URL. So a single card now unfurls with its own image
  when shared, and opens to the right city + card.

### M7 — Automation & trust
Scheduled GitHub Action to refresh data assets annually — ✅ **shipped early** with M4-2
(`.github/workflows/rebuild-data.yml`, PR #2): re-runs the `build_*.py` pipelines against the
official record monthly (or on demand), gates on `verify_v0.py`, commits any refreshed JSON,
and redeploys Pages. The hand-verified heat-death update path is now documented as a repeatable
runbook (`analysis/HEAT_DEATHS.md`, PR #16) — the one dataset that isn't pipeline-generated.

**Season-metric robustness + transparency (PR #9, from the external audit):** the 100°F-day and
80°F-night pipelines now also emit *sustained*-season boundaries (runs of 3+ 100°F days; a
5-of-7-night rule for 80°F nights), so a lone freak day can't move a season edge; the cards lead
with the outlier-robust day/night count, quote the sustained season alongside the single-day
headline, disclose that the per-year band traces single days (noisy edges) while the shifts are
decade averages, and show how many complete years are on record. `verify_v0.py` reproduces the
sustained lengthening from ACIS daily (reusing data it already fetches). Still deferred: a full
data-quality scorecard and an in-UI dataset download (assets are already committed JSON).

**Statistical honesty (PR #8, from the external audit):** trend ± is now a deterministic
moving-block bootstrap (autocorrelation-aware, wider than OLS) instead of a fixed-t interval; a
new in-app methodology section documents the trend method and its limits, the 1970s-baseline
rationale, ThreadEx/diurnal station-continuity, data hygiene, and a combined-effects (climate +
UHI + land use + measurement) attribution statement so the page never implies bare climate
attribution.

**Data-trust hardening (PR #7, from the external audit):** every precomputed asset is now stamped
with `generated` + `throughYear`; the UI shows a "precomputed series through YYYY" line and a
staleness banner when a static dataset trails the live record; `verify_v0.py` shape-checks every
committed JSON (not just its values), so a malformed/empty asset fails CI; and the last-complete-year
cutoff is derived everywhere (the remaining hardcoded `2025` in `verify_v0.py` and `build_diurnal.py`
are gone).

---

## M8 — Durability & performance

A five-stream audit (performance · frontend architecture · Python pipelines · testing/CI ·
data/docs) of the whole project, captured here so the cross-cutting hardening lives in one place.
✅ = shipped this round; the rest are `deferred` with the concrete fix. The **Principles** (above)
are the immutable bar and stay untouched.

**Shipped this round**
- ✅ **Lazy-load the map geometry** — `CityMap` statically imported both maps (~95 KB gz) into the
  eager entry chunk; now lazy. Entry 336→62 KB (gzip 115→19). (#97)
- ✅ **Tested prose formatters** — `lib/format.js` (`signed`/`pluralize`/`direction`) extracts the
  sign/direction logic hand-written per card (the recurring "wrong direction word" bug class);
  adopted in the season cards, unit-tested in CI. (#99)
- ✅ **Pipeline integrity** — restored the orphaned `boi-diurnal` config (reproduce-or-reject), added
  the 4 international assets to the shape/finiteness gate, `cdd_split` `'T'` guard. (#98)
- ✅ **Offline Python test net** (item 9) — `analysis/tests/test_builders.py` (stdlib `unittest`): the
  builders' pure logic — `max_streak`/`season_span`/`sustained_span` incl. the `None`-gap missing-day
  contract, and the CDD-split identity (extracted to `split_cooling_day`). Wired into the CI build job.
  The layer where the missing-high-vs-observed-low bug lived now has a deterministic, ACIS-free net. (#101)
- ✅ **Registry-parity check** (item 11) — `tests/registry.test.mjs` asserts `cities.js` ⟷ `cities.py`
  agree on the city set, station ids, rural pair, source, and every per-card opt-in; the diurnal-opt-in
  assertion is exactly the one that would have caught the boi orphan. In the CI build job. (#102)
- ✅ Earlier this session: the non-finite commit gate (`allow_nan=False` + `_first_nonfinite`), the
  stdlib-only CI guard, Dependabot, the GHCN staleness banner, rebuild-opens-a-PR, the card/builder
  prose fixes (#82–#96).

**Performance** (`deferred`)
1. **Product-split the maps** — load only the active product's single map (~40–50 KB more off the
   lazy chunk). Needs the dynamic-import restructure inside `CityMap`.
2. **Lighten recharts** — the lazy `LineChart` chunk is 365 KB / 101 KB gz; recharts 2.x barely
   tree-shakes and the charts are static. recharts v3 (ESM) or a lightweight SVG/d3-shape renderer
   could cut 50–80 KB gz. Needs a dep swap + browser regression.
3. **Cache-bust `public/data`** — assets keep stable filenames across rebuilds while JS/CSS are
   hashed, so a browser/CDN can serve stale data. Append `?v=<throughYear>` (already stamped) in the
   fetchers, or hash filenames. Pair with a `schemaVersion` field for forward-compat.

**Frontend architecture** (`deferred`)
4. **Finish `lib/format.js` adoption** — ✅ *(partial, #105)* Extremes (3×) + Gap (1×) now use `signed()`
   for the `{x >= 0 ? "+" : ""}{…toFixed()}` sign prefix (proven output-identical: the unit converters
   preserve sign and `toFixed` keeps the minus, so `signed(conv(x), d)` reproduces the old string in every
   case). *Remaining:* Grid/GlobalContext (and Extremes `coldTrend`) hardcode `"+"` on contextually-positive
   values — adopting `signed()` there is a *semantic* change (would surface a `−` for a maritime/edge city),
   so it needs per-card judgment, not a drop-in; and unify `LastNightHero.signed` (real-minus glyph U+2212 +
   integers → generalize the helper). Do these browser-attended.
5. **Extract `lib/series.js`** — `splitEarlyLate`/`meanEarlyLate`/`decadeBuckets` are re-implemented in
   9 cards + `DashboardBody`; extract + unit-test. **Not a clean drop-in** (verified): the "early" window
   has two live variants — bounded `[baseline.start, baseline.end]` (Streak/NightCooling/HotNightSeason/
   SeasonLength) vs unbounded `≤ baseline.end` (Sleep/Extremes/Seasons) — plus bespoke windows (Winter:
   `<1970` / `-30y`; CoolWindow: decade buckets). A shared helper must take the window as a parameter and
   adopt per-card with output-equivalence checks; do it browser-attended, not unattended.
6. **Extract card `useMemo` models to pure, tested functions** — every card's transform is trapped in
   JSX, so the prose red-teams only run in the 30-navigation browser smoke test. Pull
   `gridModel`/`streakModel`/… into `lib/`, unit-test the direction branches, add to the "every new
   card" convention.
7. **Smaller extractions** — shared tooltip shell (6 inlined copies), `doyLabel`/`MONTH_TICKS`/
   `hourLabel`, era constants; data-driven `climateOf` (delete the hand-kept `HUMID` set); collapse
   `CityDashboard`'s 11 asset `useState`+resets into a reducer; remove/wire the unused `units` exports.
8. **Split `cities.js`** (922 lines) or push long-form prose into the facts JSON as it scales; a
   `<ChartCard>` scaffold.

**Pipelines** (`deferred`)
9. ✅ **Offline Python test net** (shipped #101) — `analysis/tests/test_builders.py` covers
   `max_streak`/`season_span`/`sustained_span` (incl. the `None`-gap missing-day contract) and the
   CDD-split identity (extracted to `split_cooling_day`); wired into the CI build job. *Remaining:*
   broaden to the other builders' reduces as they're extracted (pairs with item 6/10).
10. **Shared `analysis/acis.py` + `assetio.py`** — the ACIS/GSOY fetch boilerplate is copy-pasted ~16×,
    `LAST_COMPLETE_YEAR`/`MAX_MISSING_DAYS` redefined in 14/6 files, the stamped-write block 8×.
    Consolidate (stdlib-only; a local module passes the import guard) **with the rebuild workflow as the
    byte-identical gate**; fold in retry/backoff for the daily fetches (only diurnal/grid have it).
11. ✅ **Registry-parity CI check** (shipped #102) — `tests/registry.test.mjs` asserts `cities.js` ⟷
    `cities.py` agree on the city set, station ids, rural pair (`rural_sid` vs `rural.sid`), source, and
    every per-card opt-in (the diurnal-opt-in assertion catches the boi-orphan class). *Remaining:*
    cross-check the rebuild-workflow loops, and generate `ASSET_SCHEMAS` from the registry.
12. **Unify day-of-year** — three methods today (index-as-DOY in streaks couples to ACIS gap-padding;
    date-derived in heat_season; `tm_yday` in verify). Add a `len(year) ∈ {365,366}` assert now; unify
    on date-derived DOY (semantics change → rebuild gate). Also: leap-year DOY renders a date *label* 1
    day late in leap years (cosmetic).

**Testing / CI** (`deferred`)
13. **Pin Playwright** — `ci.yml` installs `playwright` unpinned (the only unpinned CI dep); a release
    can break render with no code change. Pin an exact (resolvable) version or add it to devDeps via the
    lockfile; cache the browser download.
14. **Split `verify_v0` offline/live** — the offline checks (shape/finiteness/stdlib) sit *after* an
    unguarded `fetch_gsoy()`, so an ACIS/NCEI outage fails the gate on PRs that never touched data and
    the most valuable PR checks never run. Run the offline checks as a network-free hard gate; make the
    live value-checks soft/retried.
15. ✅ **Test auto-discovery + reproducibility pins** (shipped #103) — `npm test` globs
    `tests/*.test.mjs` (one source of truth; a new suite auto-runs with no `ci.yml` edit), CI calls it,
    and `engines` + `.nvmrc` pin node 22. Used a glob runner rather than `node:test` because `node --test`
    doesn't cleanly run the exit-code-based hand-rolled suites on node 22. *Remaining (optional):* migrate
    the suites to `node:test` for per-assertion reporting if richer output is ever wanted.
16. **Smoke-test robustness** — ✅ *(partial, #104)* the desert city set + count now derive from
    `products.js` (`citiesOf(PRODUCTS.desert)`) instead of a hardcoded `=== 5`, so vetting in a sixth
    desert city no longer silently breaks the test. *Remaining:* reduce live-ACIS exposure / add a
    wall-clock budget; share `dist/` between the build and render jobs (built twice per PR today).

**Governance**
17. **Branch protection on `main`** (require build/verify-data/render) — a repo setting, not code. The
    rebuild flow opens a PR not a push, but that's moot if `main` isn't protected. The single largest
    durability hole.

---

## City-climate engine (generalization — shipped)

Evolving the registry-driven engine into a generalized city-climate explorer where each city surfaces *its own* most interesting trends, fronted by a map. Phoenix Nights is preserved as the curated flagship. Decision: hybrid salience (auto-rank + optional curated overlay).

- ✅ **Phase 1 — fact engine (this PR):** `analysis/build_facts.py` ranks each city's facts (magnitude × significance + cross-city rank), with per-fact applicability guards; emits a committed, CI-shape-checked `<city>-facts.json`. No UI yet. Sanity: Tucson tops on its 100°F season doubling, Las Vegas/El Paso on night-warming, Phoenix's night facts cluster at the top.
- ✅ **Phase 2 — per-city page + auto hero:** generic ranked-facts page; non-flagship cities get an auto hero from their top fact, Phoenix keeps its curated `featured` overlay.
- ✅ **Phase 3a — explore landing + ranking:** the root ranks every city by overnight-low warming → click into its page (`?city=<id>`).
- ✅ **Phase 3b — the literal map (this PR):** the explore landing now leads with a clickable US map of the interior West. A committed build script (`apps/web/scripts/build-map.mjs`) projects us-atlas `states-10m` and each city's `latLon` with one shared d3 `geoAlbersUsa`, validates each city falls inside its state, and emits `src/lib/usMap.js` (committed; no runtime map deps). City dots → `?city=<id>`; the ranked list stays beneath as the ordered, accessible fallback. Render smoke test asserts the map + a dot-click deep-link.
- ✅ **Phase 4 — scale cities (this PR):** the five vetted-PASS metros (Yuma, Reno, Albuquerque, Salt Lake City, Boise) are live — registry entries in `analysis/cities.py` + `cities.js`, committed ACIS assets, and verify + render + map coverage. The four high-elevation additions inherit the card-fit guards (night-cooling-share, and where applicable tropical-nights / 100°F-days, omit cleanly).
- ✅ **Phase 5 — honest extrapolation (this PR):** each city page carries its measured overnight-low trend forward to 2050 as a clearly-labeled dashed line inside the existing moving-block-bootstrap slope fan — framed as “a line, not a forecast” (no emissions scenario, no physics). A real CMIP6/LOCA2 projection layer remains a separate go/no-go, deliberately not dressed up here.
- ✅ **Cross-city comparison:** the explore landing overlays all nine cities' overnight-low departures from their *own* 1970s baselines on one chart (committed `compare-lows.json` via `analysis/build_compare.py`), so the divergence is visible at a glance — Reno steepest at ~+11°F above its 1970s normal. Lazy-loaded (React.lazy) so recharts stays off the landing's critical path.

## Breadth — vetted desert-UHI city pipeline

The multi-city engine is registry-driven, DST-aware, and render-tested, so the cost of a new city
is no longer plumbing — it's *data integrity*. `analysis/city_audit.py` makes that a fast, repeatable
yes/no: for a candidate metro it checks the city's night-low trend vs the global rate, auto-suggests
an arid rural pair (ranked by record length, distance, and slower warming), reports elevation,
ISD (diurnal), and EIA balancing-authority (grid) availability, and predicts **card-fit** — which
premise-gated cards (tropical-nights, the 100°F-day season, night-cooling-share) will actually apply,
using the same thresholds as `build_facts.py` → PASS / REVISE / REJECT.

Scope began as the **arid interior West**, where the control experiment ("city vs nearby open desert")
is cleanest. A June 2026 probe of humid metros showed the city-vs-rural control **transfers** to humid
*continental/Gulf* cities (Atlanta nights +0.92°F/dec, 1.6× their days, vs rural Gainesville +0.38;
Houston and New Orleans similar) — so the engine is generalizing beyond the desert. **Maritime tropical**
cities are the exception and **reject**: Miami's nights warm *slower* than its days and it has no clean
rural reference (the ocean moderates the night, and SE-Florida "rural" stations are themselves
urbanized). So the bar is now "any continental-US metro with a clean, slower-warming rural control,"
not just the desert. **Five humid/eastern cities are now shipped** \u2014 Atlanta (pilot), **Houston**, **New Orleans**
(Gulf coast; New Orleans has the set\u2019s strongest lows-vs-highs ratio, ~2.4\u00d7), **Raleigh** (humid
Piedmont; cleanest eastern control, Clayton ~28mi), and **Dallas** (1.4\u00d7). Probe rejects/skips, recorded
so they aren\u2019t re-attempted: **Charlotte** rejects (nights warm *slower* than days, 0.6\u00d7); **Memphis**
and **Nashville** have a real UHI excess but a flat ~1.0\u00d7 lows-vs-highs ratio, too weak to feature the
lows-first headline; **Miami** rejects (maritime, no clean rural control). The landing is reframed
around the *universal* UHI fingerprint (every climate), with Phoenix still the curated flagship. First audit pass (June 2026):

| Metro | City night-low /dec | Suggested rural pair (gap) | Grid BA | Verdict |
|---|---|---|---|---|
| El Paso, TX | +1.50 | NMSU State University, same elev (+0.46) | EPE | **PASS** (cleanest) |
| Reno, NV | +2.16 | Tahoe stations — high-elev caveat (+1.9) | NEVP | PASS* |
| Albuquerque, NM | +1.09 | Los Lunas / Santa Fe (+1.0–1.4) | PNM | **PASS** |
| Salt Lake City, UT | +1.05 | Vernon (+0.90) | PACE | **PASS** |
| Boise, ID | +0.94 | Emmett 2 E (+0.61) | IPCO | **PASS** |
| Yuma, AZ | +0.84 | Yuma Proving Ground, same elev (+0.28); no DST | WALC | **PASS** |
| Bakersfield, CA | +0.22 | pairs warm faster (−0.17) | CISO (statewide) | **REJECT** |

Adding a vetted city is then two registry entries (`cities.py` + `cities.js`) + an asset rebuild.

**Shipped (Phase 4): Yuma, Reno, Albuquerque, Salt Lake City, Boise** — the full vetted set is now live (**nine cities**). Yuma is a second clean low-desert control; the four interior-West cities surface their own leaders (Reno the fastest night-warming in the set at **+2.16°F/decade**; Boise and Salt Lake led by their fast-warming *coldest* nights, +2.7 / +2.6°F/decade) and omit the cards whose premise fails — flagged up front by the new card-fit audit, not discovered at build time. Grid (EIA-930) is wired for the two cities with a clean single-utility metro balancing authority — **Albuquerque (PNM)** and **Boise (IPCO)**; Yuma/Reno/Salt Lake grid stays deferred (no clean single-utility metro BA — e.g. Reno's `NEVP` is Las Vegas's utility). Diurnal (NCEI hourly ISD) is now wired for all five (the then-vs-now diurnal-curve card); Yuma needed a multi-era ISD id chain (its single modern id was wrong). The **cool-window** card stays a hot-city scarcity story via a new applicability guard: it shows for Yuma (and the original hot cities incl. El Paso ~12h) but omits for the cool/high-elevation cities (Reno/SLC/Boise/Albuquerque), which still spend most of the summer night below 85°F.

**Shipped: El Paso (4th city, PR #30)** — `ELPthr 9`, pair White Sands `USC00299686` at
near-identical elevation (the cleanest control in the set), grid EPE, diurnal El Paso Intl,
tz `America/Denver`. **Lesson surfaced:** the audit checks the *warming signal*, but generating a
high-elevation city's cards revealed the suite is implicitly calibrated for *low-elevation*
extreme-heat desert — at 3,900 ft El Paso's nights are warming fast but from a cool base, so its
1970s night-cooling share is net-negative and it has few 80°F nights. Fixed by graceful per-card
omission (the night-cooling card and degenerate share images now omit when their premise fails),
so high-elevation cities ship their working cards (UHI control, diurnal, normals, season, grid…).
**Done (this PR):** `city_audit.py` now reports a **card-fit** dimension — for each candidate it
recomputes the 80°F-night count, the 100°F-day count, and the 1970s night-CDD baseline share from
ACIS and flags which cards will omit (the same premises `build_facts.py`, `NightCoolingCard`, and the
share generator enforce), so the next high-elevation candidate is flagged up front rather than at
asset-build time. Validated against El Paso (night-cooling baseline −11.6% → omits; tropical-nights
~8/yr, 100°F-days ~43/yr → fit).

## Rejected / not pursuing (don't re-open without new data)

- **Dew-point / "drying city" trend** — no clean signal at decade resolution; monsoon
  variability dominates. Dew curves remain in `phx-diurnal.json` for possible future use.
