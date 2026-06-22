#!/usr/bin/env python3
"""Yearly temperature series for an international (GHCN-Daily) city.

ACIS is US-only, so a non-US city can't fetch its yearly overnight-low / daytime-
high series live in the browser the way the US cities do (fetchCityYearly). This
builder precomputes that series from NCEI GSOY — annual TMIN (mean daily low),
TMAX (mean daily high), and EMNT (the year's coldest daily low) — in °F, the
canonical scale the rest of the pipeline uses; the front end renders °C through the
units layer. It writes data/<prefix>-series.json, which a source:"ghcn" city loads
in place of the live ACIS call.

GSOY is annual, so only the yearly-trend-based cards light up for an international
city (trend, UHI control, global-context, day-night gap); the daily/hourly cards
(streaks, heat-season, diurnal, grid) have no asset and self-hide.

Stdlib only (mirrors the other builders). Usage:
    python3 analysis/build_series.py --city syd
"""

import datetime
import json
import sys
import urllib.request

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from cities import get_city, data_path, source_of, primary_sid  # noqa: E402

GSOY = "https://www.ncei.noaa.gov/access/services/data/v1"
LAST_COMPLETE_YEAR = datetime.date.today().year - 1


def fetch_gsoy(sid, start=1948):
    url = (f"{GSOY}?dataset=global-summary-of-the-year&stations={sid}"
           f"&startDate={start}-01-01&endDate={LAST_COMPLETE_YEAR}-12-31"
           "&dataTypes=TMIN,TMAX,EMNT&units=standard&format=json")
    req = urllib.request.Request(url, headers={"User-Agent": "phoenix-nights-build/0.1"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def _fnum(row, key):
    try:
        return float(row[key])
    except (KeyError, ValueError, TypeError):
        return None


def main():
    city = get_city("Yearly GSOY temperature series for an international city")
    if source_of(city) != "ghcn":
        sys.exit(f"build_series is for source:'ghcn' cities only; "
                 f"{city['key']} is source:'{source_of(city)}' (its series comes live from ACIS).")
    sid = primary_sid(city)
    rows = []
    for row in fetch_gsoy(sid):
        try:
            year = int(row["DATE"])
        except (KeyError, ValueError, TypeError):
            continue
        low, high, cold = _fnum(row, "TMIN"), _fnum(row, "TMAX"), _fnum(row, "EMNT")
        if low is None and high is None:
            continue
        rows.append({"year": year, "low": low, "high": high, "coldLow": cold})
    rows.sort(key=lambda r: r["year"])
    out = {
        "city": city["key"], "name": city["label"], "units": "F",
        "generated": datetime.date.today().isoformat(),
        "throughYear": rows[-1]["year"] if rows else None,
        "years": rows,
    }
    path = data_path(city["prefix"], "series")
    path.write_text(json.dumps(out, indent=1, allow_nan=False))
    span = f"{rows[0]['year']}–{rows[-1]['year']}" if rows else "no data"
    print(f"{city['key']}: wrote {len(rows)} yearly rows -> {path.name} ({span})")


if __name__ == "__main__":
    main()
