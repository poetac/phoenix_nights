# Phoenix Nights — Roadmap

**Thesis:** The desert still cools off at night. The city doesn't. This app proves
that from the official record, one reproducible card at a time.

This document is the working plan. It is meant to be edited — milestones get
re-ordered, cards get promoted or rejected. What does *not* move is the bar every
card has to clear (see Principles).

---

## Where we are (June 2026)

A single-city Phoenix dashboard — React + Vite, deployed to GitHub Pages — built on
a deliberately city-agnostic engine (`lib/cities.js` registry + `<CityDashboard
city={…} />`). Python stdlib pipelines precompute static JSON; CI builds the app and
verifies stats against NCEI GSOY.

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
5. **One city's depth before many cities' breadth** — for now. The multi-city engine is
   paid for and parked (M5), not abandoned.

---

## M4 — Deeper Phoenix evidence (ACTIVE)

Goal: make the single-city story undeniable. Backlog is ordered by impact ÷ risk;
build top-down, but any item can be pulled forward.

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

## City-climate engine (generalization — in progress)

Evolving the registry-driven engine into a generalized city-climate explorer where each city surfaces *its own* most interesting trends, fronted by a map. Phoenix Nights is preserved as the curated flagship. Decision: hybrid salience (auto-rank + optional curated overlay).

- ✅ **Phase 1 — fact engine (this PR):** `analysis/build_facts.py` ranks each city's facts (magnitude × significance + cross-city rank), with per-fact applicability guards; emits a committed, CI-shape-checked `<city>-facts.json`. No UI yet. Sanity: Tucson tops on its 100°F season doubling, Las Vegas/El Paso on night-warming, Phoenix's night facts cluster at the top.
- ✅ **Phase 2 — per-city page + auto hero:** generic ranked-facts page; non-flagship cities get an auto hero from their top fact, Phoenix keeps its curated `featured` overlay.
- ✅ **Phase 3a — explore landing + ranking:** the root ranks every city by overnight-low warming → click into its page (`?city=<id>`).
- ✅ **Phase 3b — the literal map (this PR):** the explore landing now leads with a clickable US map of the interior West. A committed build script (`apps/web/scripts/build-map.mjs`) projects us-atlas `states-10m` and each city's `latLon` with one shared d3 `geoAlbersUsa`, validates each city falls inside its state, and emits `src/lib/usMap.js` (committed; no runtime map deps). City dots → `?city=<id>`; the ranked list stays beneath as the ordered, accessible fallback. Render smoke test asserts the map + a dot-click deep-link.
- ✅ **Phase 4 — scale cities (this PR):** the five vetted-PASS metros (Yuma, Reno, Albuquerque, Salt Lake City, Boise) are live — registry entries in `analysis/cities.py` + `cities.js`, committed ACIS assets, and verify + render + map coverage. The four high-elevation additions inherit the card-fit guards (night-cooling-share, and where applicable tropical-nights / 100°F-days, omit cleanly).
- ✅ **Phase 5 — honest extrapolation (this PR):** each city page carries its measured overnight-low trend forward to 2050 as a clearly-labeled dashed line inside the existing moving-block-bootstrap slope fan — framed as “a line, not a forecast” (no emissions scenario, no physics). A real CMIP6/LOCA2 projection layer remains a separate go/no-go, deliberately not dressed up here.

## Breadth — vetted desert-UHI city pipeline

The multi-city engine is registry-driven, DST-aware, and render-tested, so the cost of a new city
is no longer plumbing — it's *data integrity*. `analysis/city_audit.py` makes that a fast, repeatable
yes/no: for a candidate metro it checks the city's night-low trend vs the global rate, auto-suggests
an arid rural pair (ranked by record length, distance, and slower warming), reports elevation,
ISD (diurnal), and EIA balancing-authority (grid) availability, and predicts **card-fit** — which
premise-gated cards (tropical-nights, the 100°F-day season, night-cooling-share) will actually apply,
using the same thresholds as `build_facts.py` → PASS / REVISE / REJECT.

Scope is deliberately the **arid interior West**, where the control experiment ("city vs nearby open
desert") is valid — not "every US city" (humid/coastal metros break the framing and would need a
product rethink). First audit pass (June 2026):

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

**Shipped (Phase 4): Yuma, Reno, Albuquerque, Salt Lake City, Boise** — the full vetted set is now live (**nine cities**). Yuma is a second clean low-desert control; the four interior-West cities surface their own leaders (Reno the fastest night-warming in the set at **+2.16°F/decade**; Boise and Salt Lake led by their fast-warming *coldest* nights, +2.7 / +2.6°F/decade) and omit the cards whose premise fails — flagged up front by the new card-fit audit, not discovered at build time. Grid (EIA-930) is wired for the two cities with a clean single-utility metro balancing authority — **Albuquerque (PNM)** and **Boise (IPCO)**; Yuma/Reno/Salt Lake grid stays deferred (no clean single-utility metro BA — e.g. Reno's `NEVP` is Las Vegas's utility). Diurnal (NCEI hourly ISD) is deferred for all five (a heavy pull) and those cards omit until committed.

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
