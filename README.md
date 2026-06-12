# Phoenix Nights

**The desert still cools off at night. The city doesn't.**

A public-facing app that shows the *true* local climate trajectory — especially the divergence of **overnight low temperatures** from their historical norms — using official NOAA station data.

## Why this exists

Mainstream weather apps grade each day against a "normal range" and spotlight the afternoon high. That framing hides the real story in heat-island cities:

1. **Rolling "normals" absorb the warming.** A 30-year rolling baseline quietly bakes 50 years of warming into what counts as "normal." We use a fixed 1970s baseline instead.
2. **The biggest signal is in the lows, not the highs.** Asphalt and concrete release stored heat after sunset; nights warm far faster than days.
3. **Warm nights matter most.** Daily mean = (high + low) ÷ 2, so cooling degree days — the standard AC-demand proxy — rise just as much from a +6°F shift in lows as from +6°F in highs. Warm nights are also the dominant heat-mortality driver: no overnight recovery for bodies, buildings, or grids.

## The science

The hypothesis — Phoenix lows deviating from historic norms faster than highs — is confirmed by published research:

- Phoenix annual average low: ~59°F in the 1970s → ~65°F by the 2010s (≈ +6°F). ([Climate Change Dispatch](https://climatechangedispatch.com/news-outlet-blames-phoenix-warming-trend-on-climate-change-leaves-out-uhi-effect/))
- Sky Harbor urbanization raised nighttime minimums ~5°C (9°F) vs. only 3.1°C for daily averages. (Brazel et al., ["Urbanization and warming of Phoenix"](https://www.researchgate.net/publication/226592731))
- Phoenix summer nights warmed ~6°F since 1970 vs. ~2.5°F national average. (Climate Central via [NPR](https://www.npr.org/2023/07/14/1187646149/))
- Urban heat island magnitude: 10–14°F gap between Sky Harbor and rural stations like Wickenburg, Queen Creek, Casa Grande, and Maricopa. ([ASU Arizona Climate](https://globalfutures.asu.edu/azclimate/urban-heat-island/))
- City of Phoenix: Sky Harbor warming ≈ 7.5°F, ~3× the increase at a nearby rural monument station; nighttime up ~9°F. (City of Phoenix records)

## Data sources

| Source | Role | Notes |
|---|---|---|
| [ACIS](https://www.rcc-acis.org/docs_webservices.html) (`data.rcc-acis.org`) | Primary, fetched live in-browser | NOAA/NWS Regional Climate Centers API; free, no key, CORS-enabled. Phoenix threaded record (downtown 1896–1933 + Sky Harbor 1933–present) via ThreadEx sid `PHXthr 9`. Yearly elements with `reduce:{reduce:"mean",add:"mcnt"}` for completeness checks; `cnt_ge_N` reduces for threshold counts; monthly (`mly`) interval for seasonal series. |
| [NCEI GSOY](https://www.ncei.noaa.gov/access/services/data/v1) | Verification pipeline | Global Summary of the Year for Sky Harbor (`USW00023183`); used by `analysis/verify_v0.py`. |
| [NCEI global-hourly (ISD)](https://www.ncei.noaa.gov/access/services/data/v1?dataset=global-hourly) | Precomputed diurnal curves | Hourly observations since 1948. **Station-id era split:** `99999923183` covers ~1948–1972, `72278023183` covers 1973–present — query both. `TMP` is scaled tenths-°C with a quality flag (`+0306,1` = 30.6 °C); timestamps are UTC (Phoenix = UTC-7, no DST). Built into `apps/web/public/data/phx-diurnal.json` by `analysis/build_diurnal.py` (raw cache gitignored). |
| [Open-Meteo archive](https://open-meteo.com/) | Fallback only | ERA5 reanalysis on a ~25 km grid — smooths the urban heat island, so it *understates* the signal. Labeled "modeled" in the UI. |

Promising sources not yet wired in: EIA electricity demand (AC load vs. warm nights; needs free API key), Maricopa County heat-surveillance reports (annual heat deaths, PDFs), Census population series (correlate metro growth with the urban–rural gap), and dew-point trends (already captured in the diurnal JSON build, unused).

## Methodology

- **Trends:** ordinary least-squares on yearly means, reported as °F/decade with 95% confidence intervals, computed separately for lows and highs over a selectable window (default since 1970). Headline = the ratio (lows warming N× faster than highs).
- **Baseline:** fixed 1970–1979 station average for anomaly views, explicitly contrasted with rolling 30-year "normals."
- **Felt metrics:** nights/year with min ≥ 80°F; annual cooling degree days.
- **Hygiene:** years missing more than 36 days of observations (ACIS `mcnt`) are excluded, as is the still-incomplete current year (computed dynamically).
- **Urban–rural pair:** Sky Harbor vs. Casa Grande National Monument (`USC00021314`, the same rural control the City of Phoenix analysis used). Over common complete years since 1948, city lows warm ~+1.4°F/decade vs. ~+0.8 in the open desert — i.e. roughly half the city's night-warming is the city itself. The decade-average gap grew from ~6.6°F (1950s) to ~10.5°F (1990s), then narrowed slightly as the Casa Grande–Maricopa corridor urbanized. Since 1970 alone the city excess is small (~+0.2°F/decade) — the card states this nuance rather than hiding it. Reproduce with `python3 analysis/uhi_pair.py`.

## Repo layout

```
apps/web/src/
  CityDashboard.jsx   the page — takes a city config, renders the cards
  cards/              one component per card (UHI pair, goalposts, seasons, diurnal)
  lib/cities.js       city registry: station ids, baselines, rural pair, assets
  lib/data.js         ACIS/NCEI/Open-Meteo fetchers, parameterized by city config
  lib/stats.js        OLS with confidence intervals, helpers
  ui.jsx              shared design tokens + Card/Tooltip primitives
apps/web/public/data/ precomputed assets (e.g. phx-diurnal.json)
analysis/             Python verification + precompute pipelines (stdlib only)
.github/workflows/    CI: build + data verification; Pages deploy
```

**Adding a city** (the M3 path): add an entry to `lib/cities.js` (ThreadEx sid via ACIS StnMeta, a rural pair station, baseline decade), optionally run the diurnal builder for its airport station, and render `<CityDashboard city={...} />`. The cards and fetchers don't change.

## Development

```sh
cd apps/web
npm install
npm run dev
```

Verification (no dependencies beyond Python 3 stdlib):

```sh
python3 analysis/verify_v0.py
```

## Sanity checks

Any data pipeline must reproduce these (from the official record):

- 1970s Phoenix annual average low ≈ 59°F; 2010s ≈ 65°F.
- TMIN trend since 1970 roughly 2–3× the TMAX trend.
- June normals (1991–2020, Sky Harbor): high ≈ 104.2°F, low ≈ 78.6°F.
- First 90°F+ daily minimum was 1936; the next didn't occur until 1970 — now they're routine.
