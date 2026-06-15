#!/usr/bin/env python3
"""Verify the app's headline numbers against an independent NOAA source.

Pulls NCEI Global Summary of the Year (GSOY) for Phoenix Sky Harbor
(USW00023183), recomputes the same statistics the app computes from ACIS,
and checks them against the sanity targets in README.md:

  - 1970s avg annual low ~ 59 F, 2010s ~ 65 F
  - TMIN trend since 1970 roughly 2-3x the TMAX trend

Stdlib only. Exit code 0 = all checks pass.
"""

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

LAST_COMPLETE_YEAR = 2025


def fetch_gsoy():
    req = urllib.request.Request(GSOY_URL, headers={"User-Agent": "phoenix-nights-verify/0.1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


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

    checks = [
        ("1970s avg low ~59F", low_70s, 57.0 <= low_70s <= 61.0),
        ("2010s avg low ~65F", low_10s, 63.0 <= low_10s <= 67.0),
        ("TMIN trend since 1970 (F/decade) positive", tmin_slope, tmin_slope > 0),
        ("TMIN/TMAX trend ratio in 1.5-5x", ratio, 1.5 <= ratio <= 5.0),
        ("coldest-night (EMNT) trend since 1970 positive", emnt_slope, emnt_slope > 0),
    ]

    ok = True
    for name, value, passed in checks:
        ok &= passed
        print(f"  [{'PASS' if passed else 'FAIL'}] {name}: {value:.2f}")

    print(f"\nTMIN: +{tmin_slope:.2f} F/decade | TMAX: +{tmax_slope:.2f} F/decade | ratio {ratio:.1f}x")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
