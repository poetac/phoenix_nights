#!/usr/bin/env python3
"""Build the cross-city comparison series for the explore landing.

Each city's annual mean overnight low (TMIN), expressed as a departure from its
OWN 1970s baseline, so every city is comparable on one chart regardless of its
absolute climate — the same "departure from the 1970s" view each city page shows,
overlaid across the whole registry. One ACIS yearly request per city.

Output: apps/web/public/data/compare-lows.json. Stdlib only.
Usage: python3 analysis/build_compare.py
"""

import datetime
import json
import sys
import urllib.request

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from cities import CITIES, DATA_DIR, source_of  # noqa: E402

ACIS = "https://data.rcc-acis.org/StnData"
LAST_COMPLETE_YEAR = datetime.date.today().year - 1
BASE0, BASE1 = 1970, 1979


def yearly_low(sid):
    body = {"sid": sid, "sdate": "1970-01-01", "edate": f"{LAST_COMPLETE_YEAR}-12-31",
            "elems": [{"name": "mint", "interval": "yly", "duration": "yly",
                       "reduce": "mean", "maxmissing": 36}]}
    req = urllib.request.Request(ACIS, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    out = []
    for y, v in json.load(urllib.request.urlopen(req, timeout=60)).get("data", []):
        try:
            out.append((int(y[:4]), float(v)))
        except (ValueError, TypeError):
            pass
    return out


def slope_per_decade(pts):
    n = len(pts)
    sx = sum(x for x, _ in pts); sy = sum(y for _, y in pts)
    sxx = sum(x * x for x, _ in pts); sxy = sum(x * y for x, y in pts)
    return (n * sxy - sx * sy) / (n * sxx - sx * sx) * 10


def main():
    cities = []
    for c in CITIES.values():
        # Cross-city compare is ACIS-sourced. International (source:"ghcn") cities
        # join the explore ranking once the mixed-unit policy is settled (WORLDWIDE
        # §6); for now skip them so the ACIS output stays byte-identical.
        if source_of(c) != "acis":
            continue
        pts = yearly_low(c["sid"])
        base = [y for (yr, y) in pts if BASE0 <= yr <= BASE1]
        if len(base) < 5 or len(pts) < 25:
            print(f"  skip {c['prefix']}: insufficient record")
            continue
        bmean = sum(base) / len(base)
        anomalies = [[yr, round(y - bmean, 2)] for (yr, y) in pts]
        cities.append({"id": c["prefix"], "slope": round(slope_per_decade(pts), 2),
                       "anomalies": anomalies})
        print(f"{c['prefix']}: {len(anomalies)} yrs | +{slope_per_decade(pts):.2f}F/dec | "
              f"latest anom {anomalies[-1][1]:+.1f}F")
    cities.sort(key=lambda d: -d["slope"])
    (DATA_DIR / "compare-lows.json").write_text(json.dumps({
        "generated": datetime.date.today().isoformat(),
        "throughYear": LAST_COMPLETE_YEAR,
        "baseline": "1970s",
        "metric": "annual mean overnight low, departure from the 1970s (°F)",
        "source": "NOAA/NWS ACIS yearly TMIN mean (maxmissing 36)",
        "cities": cities,
    }, indent=1, allow_nan=False))
    print(f"wrote {DATA_DIR / 'compare-lows.json'} ({len(cities)} cities)")


if __name__ == "__main__":
    main()
