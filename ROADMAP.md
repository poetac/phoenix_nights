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
population-vs-night-gap growth · fixed-vs-rolling baseline goalposts · summer-night
seasonal series · hour-by-hour diurnal (coolest-hour rise) · 100°F-day season length ·
80°F-night streaks · vanished winter · cooling degree days · heat deaths (human cost) ·
July grid demand · sources.

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

### 1. Extreme-minimum erosion — *recommended first*
**Claim:** Even the *coldest* night of the year is warming, and the *hottest* night
keeps setting records. Every existing card is a mean, a count, or a streak; none shows
the single warmest and single coldest overnight low per year.
**Data:** ACIS yearly reduce on TMIN (`reduce:"max"` and `reduce:"min"`) — one request,
no new asset needed beyond extending `fetchCityYearly`. Trivially reproducible.
**Why it lands:** "the floor is rising" is the thesis in its purest form — the desert's
nightly reset is disappearing even on the year's best night.
**Risk:** low. **Verdict:** supportable, build it.

### 2. Hot-night season calendar creep
**Claim:** The first 80°F+ night arrives earlier and the last one ends later — the
warm-night *season* is lengthening by weeks/decade. Distinct from the shipped 100°F-*day*
season card (days vs nights, and a calendar-window framing vs a count).
**Data:** ACIS daily TMIN; extend `build_streaks.py` (or a sibling builder) to emit
first/last day-of-year crossing 80°F per year.
**Risk:** low–medium (define the threshold and missing-data handling carefully).
**Verdict:** supportable.

### 3. Human-cost demographics
**Claim:** Who the heat kills — unsheltered vs housed, indoors-with-AC-off vs outdoors,
by age. The current card *asserts* "roughly half were unsheltered" in prose but shows no
breakdown.
**Data:** Maricopa County heat-surveillance reports (same hand-verified source as
`phx-heat-deaths.json`); add structured fields with per-figure citations.
**Risk:** medium — hand extraction, and the data is sensitive; cite every number and
keep the framing about systems, not blame.
**Verdict:** high impact, supportable; sequence after 1–2 so it gets proper care.

### 4. Global / national context
**Claim:** This is *extra*. Even the desert control warms faster than the global average;
the city faster still. Quantifies the gap between Phoenix nights and background warming.
**Data:** reuse the existing rural pair; add cited benchmark reference lines
(global/CONUS °F/decade) rather than fetching a new series, to keep risk low.
**Risk:** medium (sourcing an honest, defensible benchmark constant).
**Verdict:** supportable as a framing card; lower priority than 1–3.

### 5. Intra-metro spatial gradient — *stretch*
**Claim:** The heat island is geographic — downtown/Sky Harbor hot, the valley fringe
cooler — shown across several ACIS stations on one chart or a small map.
**Data:** multiple ACIS station records across Maricopa County.
**Risk:** higher (station selection, record-length alignment, more UI). Conceptually
adjacent to the multi-city work, so it may instead seed M5.
**Verdict:** promising; revisit once 1–3 land.

**Cross-cutting for M4:**
- Add a sanity check per new card to `analysis/verify_v0.py` so CI guards the claim.
- Update the README "Sanity checks" list and card inventory as cards ship.
- Keep the vendor/app chunk split healthy as bundle grows.

**M4 done when:** at least items 1–3 ship with pipelines + CI checks, README updated.

---

## Parked milestones (sequenced, not started)

### M5 — Second city
Exercise the generalized engine: wire a second city into `lib/cities.js` (ThreadEx sid,
rural pair, baseline decade), add a city picker / route, re-run the diurnal/heat-season/
streak builders, source local heat-death data. Candidates: Las Vegas or Tucson (same
desert-UHI thesis, easy validation) or a humid city like Houston (does the thesis
travel out of the desert?). Spatial work from M4-5 may fold in here.

### M6 — Launch & polish
Treat Phoenix as the flagship and get it in front of people: OG/meta tags, per-card
share images, an about/methodology page, accessibility pass, performance budget.

### M7 — Automation & trust
Scheduled GitHub Action to refresh data assets annually; grow `verify_v0.py` into a real
sanity-check suite; make the hand-verified heat-death update path documented and repeatable.

---

## Rejected / not pursuing (don't re-open without new data)

- **Dew-point / "drying city" trend** — no clean signal at decade resolution; monsoon
  variability dominates. Dew curves remain in `phx-diurnal.json` for possible future use.
