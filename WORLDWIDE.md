# Worldwide — design proposal for the global City Signals explorer

**Status: proposal (no code).** This scopes taking City Signals from a 14-city US
explorer to a worldwide one *without* abandoning the thing that makes the project
credible: every number comes from the official **station record**, re-derived by a
committed pipeline (Principle 1, reproduce-or-reject). It is design-first because
the build environment has no egress to the global data sources, so the work has to
be validated in CI, in vertical slices, against a known-good baseline.

Read alongside `ROADMAP.md` ("Direction" + "Phase 3 — worldwide") and `README.md`
(current data sources + methodology).

---

## 1. The bar this has to clear

The Principles don't relax when we cross a border — they get *harder*:

1. **Station record, not a grid.** The whole thesis ("overnight lows abandoning
   their history") is a station-level, urban-heat-island claim. Gridded reanalysis
   (ERA5, Berkeley Earth) smooths exactly the UHI signal we're measuring. **Global
   means global *stations*, or it isn't this project.**
2. **Reproduce or reject, per city.** `verify_v0.py`'s `check_cities` already
   re-derives all 14 US cities live; a 200-city world set needs the same bar, which
   constrains both the data source (must be queryable in CI) and the runtime budget.
3. **Lows-first, and state the caveat in the card.** The rural-control caveat
   (elevation, growth, record gaps) is per-card today. Globally the *availability*
   of a clean control varies wildly — so "no valid control → omit the UHI claim,
   keep the city's own warming" must be a first-class outcome, not an error.

## 2. What is US-specific today (the spine to replace)

Concrete, so the work is scoped to real files, not vibes:

| Concern | Today (US-only) | Where |
| --- | --- | --- |
| Daily TMIN/TMAX | **ACIS** `StnData`, queried **live in the browser** | `apps/web/src/lib/data.js` (`ACIS_URL`, `acis()`) |
| Station continuity | **ThreadEx** spliced threads (`threadSid`) | `lib/cities.js`, `analysis/cities.py` |
| Hourly (diurnal) | **NCEI ISD** global-hourly | `analysis/build_diurnal.py` |
| "Summer" | hardcoded **JJA** (June–Aug) | `analysis/seasonal.py`, `build_diurnal.py` |
| Units | **°F** throughout (25 source files) | `apps/web/src/cards/*` |
| Map | **`geoAlbersUsa`** (us-atlas) | `apps/web/src/lib/usMap.js`, `scripts/build-map.mjs` |
| Population | **US Census** decennial | `lib/cities.js` `metroPopulation` |
| Grid | **EIA-930** balancing authorities | `analysis/build_grid.py` |

The salience engine (`analysis/build_facts.py`) and the card/fetcher layer are
**already city-agnostic** — they're the part that ports cleanly.

## 3. Data backend — the keystone decision

**Recommendation: NOAA GHCN-Daily** (Global Historical Climatology Network — Daily)
as the worldwide daily TMIN/TMAX source.

- **Why GHCN-Daily.** It *is* the global station record (~100k stations, daily, free,
  NOAA-curated, QC-flagged), and ACIS is essentially a US-focused window onto the same
  GHCN lineage — so it preserves the station-record ethos and keeps US numbers
  comparable. Access via NCEI web services, the `.dly` flat files, or the AWS Open
  Data mirror (`s3://noaa-ghcn-pds`, including a per-station CSV layout that's cheap to
  pull one city at a time in CI).
- **Why not reanalysis (ERA5 / Berkeley Earth).** Gridded products dissolve the UHI
  signal and the single-station provenance the cards cite. Rejected on Principle 1.
- **The architecture consequence (important).** ACIS is queried **live in the
  browser** today. There is no equivalently cheap global live daily API, and pulling
  GHCN per-city in the client is too heavy. So the global set moves to a
  **precomputed-assets** model: the pipeline computes every series and commits
  `<id>-*.json`, the front end just reads them (the same `withAssets` mechanism that
  already backs diurnal/grid/streaks). US flagship cities can keep their live-ACIS
  cards; global cities are precomputed-only. **This is the single biggest structural
  change** and should be proven in Phase A before any new city ships.

## 4. The rural-control problem (the hard part)

The US method pairs each city with one nearby long-record rural station (`rural_sid`)
to isolate the city's own heat. Globally this is where it gets genuinely hard, and
where most of the research risk lives:

- **Control availability is wildly uneven.** Dense, long rural networks in
  Europe / Japan / Australia / the US; sparse-to-absent in much of Africa, the Middle
  East, South/Southeast Asia, and large parts of South America.
- **Selection criteria (codify in a `build_pairs.py`-style auditor, à la
  `analysis/city_audit.py`):** within ~30–80 km; elevation within a tolerance (record
  the offset as the caveat, as we do now); ≥40-year overlapping record; low
  urbanization proxy (population and/or VIIRS nightlights low and roughly flat).
- **Reject cleanly.** If no station clears the bar, the city ships with its **own**
  overnight-warming story and the **UHI card omits** — same self-omit contract the
  humid/high-desert cards already use. Never fabricate a control to fill the slot.
- **Per-region validation.** The control method must be spot-checked region by region
  before a region's cities ship (the maritime-tropical Miami rejection is the template:
  some climates/geographies simply won't support the experiment).

## 5. Station continuity without ThreadEx

ThreadEx (NOAA's US thread-splicing) has no global equivalent. Options, cheapest first:

1. **Single long-record station per city** (usually the principal airport's GHCN id) —
   accept it, document any move in the caveat. Covers most major world cities.
2. **A documented splice heuristic** (city-center early record → airport modern record)
   only where a single station is too short and a defensible overlap exists — encoded
   per city in the registry, never silent.

Make the homogeneity check explicit in `verify_v0.py` (flag step-changes that smell
like an undocumented station move).

## 6. The assumptions that *break* at the border

Concrete gotchas found in the current code, each a required change:

- **Hemisphere.** "Summer" is hardcoded to **JJA** (`seasonal.py` season map;
  `build_diurnal.py` "June–August"). For Sydney, Buenos Aires, Cape Town, summer is
  **DJF**. Introduce a hemisphere-aware "warm season" (lat sign → JJA or DJF) threaded
  through the seasonal/diurnal/heat-season builders. This is non-optional and touches
  every "summer night" framing.
- **Units.** °F is baked into ~25 card files. Add a unit layer (°C default outside the
  US, miles→km, locale number formatting). Thresholds that are physiological port in
  °C cleanly (the 25 °C / 77 °F sleep line, 20 °C tropical-night); the Imperial round
  numbers (100 °F-day season, 85 °F cool window) need °C-native reframing or a metric
  twin, decided per card.
- **Timezone bucketing.** The hour-of-day builders already bucket by local time via an
  IANA `tz` (added for DST cities) — that generalizes worldwide for free. Good.
- **The global background rate** (~0.36 °F/dec reference line) is already a *global*
  figure — it ports unchanged (just expressed in °C).

## 7. Map / projection

Swap `geoAlbersUsa` for a world projection — **`geoNaturalEarth1`** or `geoEqualEarth`
(d3-geo) — and regenerate the basemap in `scripts/build-map.mjs` from a world atlas
(Natural Earth / world-atlas TopoJSON) instead of us-atlas. The dot encoding
(position + warming-rate size) is projection-independent and carries over. Likely a
zoom/region affordance once there are >~50 dots.

## 8. Verification at scale

- **Same bar, more cities.** Every global city's headline facts re-derived from
  GHCN-Daily in CI, value-checked against its committed `*-facts.json` — the existing
  `check_cities` pattern, repointed at the GHCN backend.
- **Runtime budget.** Pulling N cities × stations live in CI won't scale linearly to
  hundreds. Plan for: per-city caching, a sharded/sampled nightly verify (full sweep
  on a schedule, a representative subset per PR), and the AWS per-station mirror to
  keep pulls cheap.
- **The keystone check (Phase A):** GHCN-Daily must **reproduce the existing 14 US
  cities** to within tolerance of the current ACIS numbers. That parallel-source
  agreement is what earns the right to trust the backend everywhere else.

## 9. Phasing (each phase independently shippable + verifiable)

- **Phase A — GHCN backend, US-validated. ✅ landed.** `verify_v0.py` now re-derives
  each of the 14 US cities' night-warming trend from the GHCN-Daily station record
  (NCEI Global-Summary-of-the-Year, the same proven path the Phoenix GSOY check
  already used) and asserts it reproduces the ACIS trend within `GHCN_TOL` (0.5 °F/dec).
  Station ids live in `analysis/cities.py` (`ghcn_sid`, `USW00`+WBAN). *No new cities,
  no UI change.* This de-risks the whole track: if GHCN can't reproduce the US record,
  stop. (Validated live in CI — the build sandbox has no egress.)
- **Phase B — first international slice (precomputed).** ~5 cities with dense networks
  and clean rural controls (candidates: London, Tokyo, Madrid, Berlin, Melbourne).
  Hemisphere-aware season + °C land here. Ship behind the existing engine; no map
  change yet (list/ranking only).
- **Phase C — world map + units.** `geoNaturalEarth1`, °C default, the unit layer.
- **Phase D — regional expansion.** Region by region, each gated on a rural-control
  validation pass; UHI card omits where no control qualifies.

## 10. Risks, open questions, non-goals

**Risks / open questions**
- Rural-control transferability is the dominant research risk (Section 4).
- GHCN-Daily latency and gaps vary by country (recent-year completeness, missing-day
  density) — the `MAX_MISSING_DAYS` guard generalizes but thresholds need per-region
  sanity.
- CI runtime/cost at hundreds of cities (Section 8).
- Live-vs-precomputed split: is keeping US live worth the dual path, or unify on
  precomputed for everyone? (Leaning: keep Phoenix/US live as the flagship "watch it
  compute" demo, precompute the rest.)
- Units/framing per card — case-by-case (Section 6).

**Non-goals (for this track)**
- Full UI internationalization/translation (English + °C is the near-term target).
- A real climate **projection** layer (CMIP6 / LOCA2) — a separate go/no-go, already
  flagged in `ExtrapolationCard.jsx`; the extrapolation stays a labeled trend line.
- Sub-daily/grid (EIA-930) cards globally — no clean worldwide equivalent; they stay
  US-only and self-omit, exactly as they already do for most cities.

## 11. First move — done

Phase A is **implemented** (`verify_v0.py` `ghcn_night_trend` + the per-city parity
check in `check_cities`, station ids in `analysis/cities.py`). It runs in the
`verify-data` CI job — the cheapest possible test of the most expensive assumption,
and the gate for everything after it. **Next** is Phase B: the first international
slice (precomputed assets, hemisphere-aware season, °C), each city gated on a
rural-control validation pass.
