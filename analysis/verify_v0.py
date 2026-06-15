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

  - the 80F-night season is longer now than it was in the 1970s

Stdlib only. Exit code 0 = all checks pass.
"""

import datetime
import json
import sys
import urllib.request

GSOY_URL = (
    "https://www.ncei.noaa.gov/access/services/data/v1"
    "?dataset=global-summary-of-the-year"
    "&stations=USW00023183"
    "&startDate=1933-01-01&endDate=2025-12-31"
    "&units=standard&format=json"
)

ACIS_URL = "https://data.rcc-acis.org/StnData"
MAX_MISSING_DAYS = 36
LAST_COMPLETE_YEAR = 2025


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
        years[y] = {"tmin": tmin, "tmax": tmax, "cdsd": fnum(row, "CDSD")}

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

    checks = [
        ("1970s avg low ~59F", low_70s, 57.0 <= low_70s <= 61.0),
        ("2010s avg low ~65F", low_10s, 63.0 <= low_10s <= 67.0),
        ("TMIN trend since 1970 (F/decade) positive", tmin_slope, tmin_slope > 0),
        ("TMIN/TMAX trend ratio in 1.5-5x", ratio, 1.5 <= ratio <= 5.0),
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

    ok = True
    for name, value, passed in checks:
        ok &= passed
        print(f"  [{'PASS' if passed else 'FAIL'}] {name}: {value:.2f}")

    print(f"\nTMIN: +{tmin_slope:.2f} F/decade | TMAX: +{tmax_slope:.2f} F/decade | ratio {ratio:.1f}x")
    print(f"80F-night season: 1970s ~{span_70s:.0f} days vs last 10y ~{span_recent:.0f} days")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
