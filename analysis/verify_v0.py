#!/usr/bin/env python3
"""Verify the app's headline numbers against the official NOAA record.

Pulls NCEI Global Summary of the Year (GSOY) for Phoenix Sky Harbor
(USW00023183), recomputes the same statistics the app computes from ACIS,
and checks them against the sanity targets in README.md:

  - 1970s avg annual low ~ 59 F, 2010s ~ 65 F
  - TMIN trend since 1970 roughly 2-3x the TMAX trend

GSOY has no per-day data, so the warm-night *season* claim (the
first->last 80F night span the streaks card draws) is re-derived
straight from ACIS daily lows instead:

  - the 80F-night season is longer now than it was in the 1970s, and stays
    longer under an outlier-robust definition (5-of-7 nights; 3-day 100F runs)
  - the 1970s seasonal "normal" low the live hero compares against is
    seasonally sane (mid-July ~80F, mid-January ~40F)
  - the overnight "cool window" (hours/night below 85F in the committed
    diurnal curve) is narrower now than in the 1970s
  - the night half of cooling degree-days ((low-65)/2 over cooling days) is a
    rising share of the total compared with the 1970s
  - the city's and the open desert's overnight-low trends since 1970 both
    outrun the published global background-warming rate

It also shape-checks every committed JSON asset (structure, not just values)
so a malformed or truncated dataset fails CI instead of silently breaking a
card. The latest-complete-year cutoff is derived, never hardcoded.

Stdlib only. Exit code 0 = all checks pass.
"""

import datetime
import json
import pathlib
import sys
import urllib.request

ACIS_URL = "https://data.rcc-acis.org/StnData"
MAX_MISSING_DAYS = 36
# Derived, not hardcoded: the most recent fully-elapsed calendar year.
LAST_COMPLETE_YEAR = datetime.date.today().year - 1

GSOY_URL = (
    "https://www.ncei.noaa.gov/access/services/data/v1"
    "?dataset=global-summary-of-the-year"
    "&stations=USW00023183"
    f"&startDate=1933-01-01&endDate={LAST_COMPLETE_YEAR}-12-31"
    "&units=standard&format=json"
)

# Published global background-warming rate (F/decade) the global-context card
# compares the local night-low trends against — see GlobalContextCard.jsx.
GLOBAL_BENCH = 0.36
CASA_GRANDE_SID = "USC00021314"  # the open-desert control (cities.js rural.sid)


def fetch_gsoy():
    req = urllib.request.Request(GSOY_URL, headers={"User-Agent": "phoenix-nights-verify/0.1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def fetch_acis_mint(start_year):
    """Every daily low from start_year through the last complete year."""
    body = json.dumps({
        "sid": "PHXthr 9",
        "sdate": f"{start_year}-01-01",
        "edate": f"{LAST_COMPLETE_YEAR}-12-31",
        "elems": [{"name": "mint"}],
    }).encode()
    req = urllib.request.Request(ACIS_URL, data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)["data"]


def warm_night_spans(start_year):
    """Per-year span (days) from the first to the last 80F+ night.

    Mirrors build_streaks.py's first80/last80 but recomputes from the raw
    daily record, so it independently confirms the streaks card's claim.
    Years missing more than 36 daily lows, or with no 80F night at all,
    are dropped. Returns {year: span_in_days}.
    """
    years = {}
    for date, val in fetch_acis_mint(start_year):
        y = int(date[:4])
        if y > LAST_COMPLETE_YEAR:
            continue
        d = years.setdefault(y, {"first": None, "last": None, "miss": 0})
        try:
            lo = float(val)
        except (TypeError, ValueError):
            d["miss"] += 1
            continue
        if lo >= 80:
            doy = datetime.date.fromisoformat(date).timetuple().tm_yday
            if d["first"] is None:
                d["first"] = doy
            d["last"] = doy
    return {y: d["last"] - d["first"] + 1
            for y, d in years.items()
            if d["miss"] <= MAX_MISSING_DAYS and d["first"] is not None}


def fetch_acis_daily_mint(start_year, end_year):
    """Every daily low across a closed year range (one ACIS request)."""
    body = json.dumps({
        "sid": "PHXthr 9",
        "sdate": f"{start_year}-01-01",
        "edate": f"{end_year}-12-31",
        "elems": [{"name": "mint"}],
    }).encode()
    req = urllib.request.Request(ACIS_URL, data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)["data"]


def fetch_acis_daily_minmax(start_year, end_year):
    """Every daily low and high across a closed year range (one request)."""
    body = json.dumps({
        "sid": "PHXthr 9",
        "sdate": f"{start_year}-01-01",
        "edate": f"{end_year}-12-31",
        "elems": [{"name": "mint"}, {"name": "maxt"}],
    }).encode()
    req = urllib.request.Request(ACIS_URL, data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)["data"]


def acis_yearly_low_trend(sid, start_year):
    """OLS trend (F/decade) of a station's annual mean low since start_year.

    Backs the global-context card's claim that the local night-low trends
    outrun the published global rate. Years missing >36 days are dropped.
    """
    body = json.dumps({
        "sid": sid,
        "sdate": f"{start_year}-01-01",
        "edate": f"{LAST_COMPLETE_YEAR}-12-31",
        "elems": [{"name": "mint", "interval": "yly", "duration": "yly",
                   "reduce": {"reduce": "mean", "add": "mcnt"}}],
    }).encode()
    req = urllib.request.Request(ACIS_URL, data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.load(r)["data"]
    pts = []
    for row in data:
        y = int(row[0])
        val, mcnt = row[1]
        try:
            v, m = float(val), float(mcnt)
        except (TypeError, ValueError):
            continue
        if m <= MAX_MISSING_DAYS and y <= LAST_COMPLETE_YEAR:
            pts.append((y, v))
    return linreg(pts) * 10


def cdd_night_share(rows, y0, y1):
    """Night half's share of cooling degree-days over [y0, y1].

    Reproduces build_cdd_split.py's identity decomposition: on cooling days
    (mean > 65F) the degree-days split exactly into (high-65)/2 + (low-65)/2.
    Returns the night half as a percentage of the total.
    """
    night = day = 0.0
    for date, lo, hi in rows:
        y = int(date[:4])
        if not (y0 <= y <= y1):
            continue
        try:
            lo, hi = float(lo), float(hi)
        except (TypeError, ValueError):
            continue
        if (lo + hi) / 2 > 65:
            night += (lo - 65) / 2
            day += (hi - 65) / 2
    t = night + day
    return 100 * night / t if t else float("nan")


def _daily_by_year(rows, idx):
    """Date-ordered daily values (idx 1=low, 2=high) grouped by year."""
    by_year = {}
    for r in rows:
        try:
            v = float(r[idx])
        except (TypeError, ValueError):
            v = None
        by_year.setdefault(int(r[0][:4]), []).append(v)
    return by_year


def sustained_window_span(vals, pred, win=7, need=5):
    """Season length where >=need of any win consecutive days match (5-of-7)."""
    half, n = win // 2, len(vals)
    first = last = None
    for i in range(n):
        lo, hi = max(0, i - half), min(n, i + half + 1)
        if sum(1 for v in vals[lo:hi] if v is not None and pred(v)) >= need:
            if first is None:
                first = i + 1
            last = i + 1
    return (last - first + 1) if first is not None else None


def sustained_run_span(vals, pred, run=3):
    """Season length bounded by runs of >=run consecutive matching days."""
    first = last = cur = None
    cur = 0
    for i, v in enumerate(vals):
        if v is not None and pred(v):
            cur += 1
            if cur >= run:
                if first is None:
                    first = i - run + 2
                last = i + 1
        else:
            cur = 0
    return (last - first + 1) if first is not None else None


def mean_season_len(by_year, fn, y0, y1):
    vals = [fn(by_year[y]) for y in range(y0, y1 + 1) if y in by_year]
    vals = [v for v in vals if v is not None]
    return sum(vals) / len(vals) if vals else float("nan")


def seasonal_normal_low(rows, month, day, window=7):
    """1970s mean daily low in a +/-window-day window around month/day.

    Independently reproduces build_normals.py's seasonal baseline (the
    yardstick the live hero compares last night against). The two test dates
    (mid-July, mid-January) sit far from year boundaries, so no wrap needed.
    """
    lo = datetime.date(2000, month, day) - datetime.timedelta(days=window)
    hi = datetime.date(2000, month, day) + datetime.timedelta(days=window)
    vals = []
    for date, val in rows:
        try:
            v = float(val)
        except (TypeError, ValueError):
            continue
        if lo <= datetime.date(2000, int(date[5:7]), int(date[8:10])) <= hi:
            vals.append(v)
    return sum(vals) / len(vals) if vals else float("nan")


DIURNAL_ASSET = (pathlib.Path(__file__).resolve().parent.parent
                 / "apps" / "web" / "public" / "data" / "phx-diurnal.json")


def cool_window_hours():
    """Hours/night below 85F in the committed JJA diurnal curve, 1970s vs the
    latest solid decade — the 'narrowing cool window' card. Read from the asset
    build_diurnal.py emits from NCEI hourly (re-deriving here would re-pull MB
    across two station eras); the trend is the guard against a bad rebuild.
    Returns (hrs_1970s, hrs_now, now_label) or None if the asset is absent.
    """
    if not DIURNAL_ASSET.exists():
        return None
    dec = json.loads(DIURNAL_ASSET.read_text())["decades"]
    solid = sorted(k for k in dec if sum(dec[k]["nObs"]) / 24 >= 500)
    below85 = lambda k: sum(1 for x in dec[k]["temp"] if x < 85)
    return below85("1970"), below85(solid[-1]), f"{solid[-1]}s"


DATA_DIR = pathlib.Path(__file__).resolve().parent.parent / "apps" / "web" / "public" / "data"

# (collection key, expected container type, required fields on a list row).
ASSET_SCHEMAS = {
    "phx-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "phx-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "phx-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "phx-heat-deaths.json": ("series", list, ("year", "deaths")),
    "phx-grid.json": ("years", dict, None),
    "phx-diurnal.json": ("decades", dict, None),
    "phx-normals.json": ("byDate", dict, None),
    # Second city (generated by the rebuild workflow with --city tus); skipped
    # until present, then shape-checked like Phoenix's.
    "tus-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "tus-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "tus-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "tus-normals.json": ("byDate", dict, None),
    "tus-grid.json": ("years", dict, None),
    "tus-diurnal.json": ("decades", dict, None),
    # Third city (Las Vegas)
    "lv-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "lv-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "lv-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "lv-normals.json": ("byDate", dict, None),
    "lv-grid.json": ("years", dict, None),
    "lv-diurnal.json": ("decades", dict, None),
    # Fourth city (El Paso)
    "ep-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "ep-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "ep-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "ep-normals.json": ("byDate", dict, None),
    "ep-grid.json": ("years", dict, None),
    "ep-diurnal.json": ("decades", dict, None),
    # Salience engine output (one ranked fact list per city)
    "phx-facts.json": ("facts", list, ("key", "rank", "score", "label")),
    "tus-facts.json": ("facts", list, ("key", "rank", "score", "label")),
    "lv-facts.json": ("facts", list, ("key", "rank", "score", "label")),
    "ep-facts.json": ("facts", list, ("key", "rank", "score", "label")),
}


def validate_assets():
    """Shape-check every committed JSON asset a card consumes.

    Catches the failure verify's value checks can't: a malformed, truncated, or
    empty asset that would silently break a card. Assets not yet rebuilt (no
    file on disk) are skipped. Yields (name, ok, count, detail).
    """
    for fname, (key, typ, fields) in ASSET_SCHEMAS.items():
        path = DATA_DIR / fname
        if not path.exists():
            yield (fname, True, 0, "absent (not yet rebuilt) — skipped")
            continue
        try:
            j = json.loads(path.read_text())
        except (ValueError, OSError) as e:
            yield (fname, False, 0, f"unreadable: {e}")
            continue
        coll = j.get(key)
        if not isinstance(coll, typ) or len(coll) == 0:
            yield (fname, False, 0, f"missing/empty '{key}'")
            continue
        if fields and typ is list:
            missing = [f for f in fields if f not in coll[0]]
            yield (fname, not missing, len(coll), "ok" if not missing else f"row missing {missing}")
        else:
            yield (fname, True, len(coll), "ok")


def fnum(row, key):
    v = row.get(key)
    if v is None:
        return None
    try:
        return float(str(v).strip())
    except ValueError:
        return None


def linreg(points):
    n = len(points)
    if n < 3:
        return None
    sx = sum(x for x, _ in points)
    sy = sum(y for _, y in points)
    sxy = sum(x * y for x, y in points)
    sxx = sum(x * x for x, _ in points)
    return (n * sxy - sx * sy) / (n * sxx - sx * sx)


def main():
    rows = fetch_gsoy()
    years = {}
    for row in rows:
        y = int(row["DATE"])
        if y > LAST_COMPLETE_YEAR:
            continue
        tmin, tmax = fnum(row, "TMIN"), fnum(row, "TMAX")
        if tmin is None or tmax is None:
            continue
        # EMNT = the year's single coldest daily low (the "floor" the
        # extremes card plots); EMXT = the hottest daily high.
        years[y] = {"tmin": tmin, "tmax": tmax, "cdsd": fnum(row, "CDSD"),
                    "emnt": fnum(row, "EMNT")}

    print(f"GSOY rows with TMIN+TMAX: {len(years)} ({min(years)}-{max(years)})")

    def decade_mean(d0, key):
        vals = [v[key] for y, v in years.items() if d0 <= y <= d0 + 9]
        return sum(vals) / len(vals) if vals else None

    low_70s = decade_mean(1970, "tmin")
    low_10s = decade_mean(2010, "tmin")
    since70 = sorted((y, v) for y, v in years.items() if y >= 1970)
    tmin_slope = linreg([(y, v["tmin"]) for y, v in since70]) * 10
    tmax_slope = linreg([(y, v["tmax"]) for y, v in since70]) * 10
    ratio = tmin_slope / tmax_slope if abs(tmax_slope) > 0.05 else float("nan")

    # Extremes card claim: even the year's coldest night (EMNT) is warming.
    emnt70 = [(y, v["emnt"]) for y, v in since70 if v["emnt"] is not None]
    emnt_slope = linreg(emnt70) * 10 if len(emnt70) >= 3 else float("nan")

    # Gap card claim: the diurnal range (TMAX - TMIN) is shrinking because lows
    # rise faster than highs. Scoped to 1948+ (Sky Harbor modern era), matching
    # the card, to avoid the earlier agricultural "oasis effect" confound.
    since48 = sorted((y, v) for y, v in years.items() if y >= 1948)
    dtr_slope = linreg([(y, v["tmax"] - v["tmin"]) for y, v in since48]) * 10

    checks = [
        ("1970s avg low ~59F", low_70s, 57.0 <= low_70s <= 61.0),
        ("2010s avg low ~65F", low_10s, 63.0 <= low_10s <= 67.0),
        ("TMIN trend since 1970 (F/decade) positive", tmin_slope, tmin_slope > 0),
        ("TMIN/TMAX trend ratio in 1.5-5x", ratio, 1.5 <= ratio <= 5.0),
        ("coldest-night (EMNT) trend since 1970 positive", emnt_slope, emnt_slope > 0),
        ("diurnal range (TMAX-TMIN) shrinking since 1948", dtr_slope, dtr_slope < 0),
    ]

    # Warm-night season: re-derived from ACIS daily lows (GSOY has no per-day).
    spans = warm_night_spans(1970)
    span_70s = sum(s for y, s in spans.items() if 1970 <= y <= 1979)
    n_70s = sum(1 for y in spans if 1970 <= y <= 1979)
    span_70s = span_70s / n_70s if n_70s else float("nan")
    recent = [s for y, s in spans.items() if y > LAST_COMPLETE_YEAR - 10]
    span_recent = sum(recent) / len(recent) if recent else float("nan")
    print(f"ACIS daily lows: {len(spans)} years with an 80F-night season")
    checks.append(
        ("80F-night season longer than the 1970s", span_recent, span_recent > span_70s))

    # Hero baseline: the 1970s seasonal normal low the live "last night vs the
    # 1970s normal" hook measures against — recomputed straight from ACIS.
    base_rows = fetch_acis_daily_mint(1970, 1979)
    july_norm = seasonal_normal_low(base_rows, 7, 15)
    jan_norm = seasonal_normal_low(base_rows, 1, 15)
    checks.append(("1970s mid-July normal low ~80F (hero baseline)", july_norm, 76.0 <= july_norm <= 84.0))
    checks.append(("1970s mid-Jan normal low ~40F (hero baseline)", jan_norm, 34.0 <= jan_norm <= 46.0))

    # Narrowing cool window: hours/night below 85F shrink from the 1970s to now.
    cw = cool_window_hours()
    if cw is not None:
        cw70, cw_now, cw_label = cw
        checks.append((f"cool window <85F shrinks 1970s({cw70}h)->{cw_label}({cw_now}h)",
                       cw70 - cw_now, cw_now < cw70))

    # Night share of cooling demand rising: the night half of CDD grows faster
    # than the day half (the "thermostat that never turns off" card).
    split_rows = fetch_acis_daily_minmax(1970, LAST_COMPLETE_YEAR)
    share_70s = cdd_night_share(split_rows, 1970, 1979)
    share_now = cdd_night_share(split_rows, LAST_COMPLETE_YEAR - 9, LAST_COMPLETE_YEAR)
    checks.append((f"night share of CDD rising {share_70s:.0f}%->{share_now:.0f}%",
                   share_now - share_70s, share_now > share_70s))

    # Global context: both the city's and the open desert's overnight-low trends
    # since 1970 outrun the published global background rate.
    desert_trend = acis_yearly_low_trend(CASA_GRANDE_SID, 1970)
    checks.append((f"Phoenix night-low trend since 1970 > global ~{GLOBAL_BENCH}F/dec",
                   tmin_slope, tmin_slope > GLOBAL_BENCH))
    checks.append((f"desert (Casa Grande) night-low trend since 1970 > global ~{GLOBAL_BENCH}F/dec",
                   desert_trend, desert_trend > GLOBAL_BENCH))

    # Second city (Tucson): the same desert-UHI signal must reproduce — Tucson's
    # overnight-low trend since 1970 outruns both the global background rate and
    # its own open-desert pair (Sasabe). Live from ACIS; sids match cities.js.
    tucson_trend = acis_yearly_low_trend("TUSthr 9", 1970)
    sasabe_trend = acis_yearly_low_trend("USC00027619", 1970)
    checks.append((f"Tucson night-low trend since 1970 > global ~{GLOBAL_BENCH}F/dec",
                   tucson_trend, tucson_trend > GLOBAL_BENCH))
    checks.append((f"Tucson night-low trend > its desert pair Sasabe ({tucson_trend:.2f} vs {sasabe_trend:.2f}/dec)",
                   tucson_trend - sasabe_trend, tucson_trend > sasabe_trend))

    # Third city (Las Vegas): same desert-UHI signal — McCarran/Harry Reid's
    # overnight-low trend since 1970 outruns the global rate and its desert pair
    # (Desert National Wildlife Refuge). Live from ACIS; sids match cities.js.
    lv_trend = acis_yearly_low_trend("LASthr 9", 1970)
    dnwr_trend = acis_yearly_low_trend("USC00262243", 1970)
    checks.append((f"Las Vegas night-low trend since 1970 > global ~{GLOBAL_BENCH}F/dec",
                   lv_trend, lv_trend > GLOBAL_BENCH))
    checks.append((f"Las Vegas night-low trend > its desert pair Desert NWR ({lv_trend:.2f} vs {dnwr_trend:.2f}/dec)",
                   lv_trend - dnwr_trend, lv_trend > dnwr_trend))

    # Fourth city (El Paso): same desert-UHI signal with the cleanest control —
    # its open-desert pair (White Sands) is at nearly the same elevation.
    elp_trend = acis_yearly_low_trend("ELPthr 9", 1970)
    wsnm_trend = acis_yearly_low_trend("USC00299686", 1970)
    checks.append((f"El Paso night-low trend since 1970 > global ~{GLOBAL_BENCH}F/dec",
                   elp_trend, elp_trend > GLOBAL_BENCH))
    checks.append((f"El Paso night-low trend > its desert pair White Sands ({elp_trend:.2f} vs {wsnm_trend:.2f}/dec)",
                   elp_trend - wsnm_trend, elp_trend > wsnm_trend))

    # Season cards' outlier-robust definitions: the *sustained* warm-night
    # season (5-of-7 nights >=80F) and the *sustained* 100F-day season (runs of
    # >=3 days) are both longer now than in the 1970s, so the lengthening isn't
    # an artifact of lone freak days at the edges. Reuses split_rows (no fetch).
    low_by_year = _daily_by_year(split_rows, 1)
    high_by_year = _daily_by_year(split_rows, 2)
    recent0 = LAST_COMPLETE_YEAR - 9
    sus80_70s = mean_season_len(low_by_year, lambda v: sustained_window_span(v, lambda x: x >= 80), 1970, 1979)
    sus80_now = mean_season_len(low_by_year, lambda v: sustained_window_span(v, lambda x: x >= 80), recent0, LAST_COMPLETE_YEAR)
    sus100_70s = mean_season_len(high_by_year, lambda v: sustained_run_span(v, lambda x: x >= 100), 1970, 1979)
    sus100_now = mean_season_len(high_by_year, lambda v: sustained_run_span(v, lambda x: x >= 100), recent0, LAST_COMPLETE_YEAR)
    checks.append((f"sustained 80F-night season (5/7) longer than 1970s ({sus80_70s:.0f}->{sus80_now:.0f}d)",
                   sus80_now - sus80_70s, sus80_now > sus80_70s))
    checks.append((f"sustained 100F-day season (3-run) longer than 1970s ({sus100_70s:.0f}->{sus100_now:.0f}d)",
                   sus100_now - sus100_70s, sus100_now > sus100_70s))

    # Shape-check every committed asset (structure, not just values).
    for name, ok_a, count, detail in validate_assets():
        checks.append((f"asset {name}: {detail}", float(count), ok_a))

    ok = True
    for name, value, passed in checks:
        ok &= passed
        print(f"  [{'PASS' if passed else 'FAIL'}] {name}: {value:.2f}")

    print(f"\nTMIN: +{tmin_slope:.2f} F/decade | TMAX: +{tmax_slope:.2f} F/decade | ratio {ratio:.1f}x")
    print(f"80F-night season: 1970s ~{span_70s:.0f} days vs last 10y ~{span_recent:.0f} days")
    print(f"1970s normal low (hero baseline): mid-Jul ~{july_norm:.0f}F, mid-Jan ~{jan_norm:.0f}F")
    print(f"night share of cooling demand: 1970s ~{share_70s:.0f}% vs last 10y ~{share_now:.0f}%")
    print(f"night-low trend since 1970 vs global ~{GLOBAL_BENCH}/dec: "
          f"Phoenix +{tmin_slope:.2f}, desert +{desert_trend:.2f}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
