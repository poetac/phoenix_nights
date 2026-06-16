#!/usr/bin/env python3
"""Build the 100°F-season series for Phoenix from ACIS daily highs.

One request fetches every daily max temperature since 1896 (~47k rows, <1 MB).
For each year with a sufficiently complete record we emit the first and last
day-of-year reaching 100°F and the count of such days, to
apps/web/public/data/phx-heat-season.json.

Stdlib only. Usage: python3 analysis/build_heat_season.py
"""

import datetime
import json
import pathlib
import urllib.request

THRESHOLD = 100
MAX_MISSING_DAYS = 36
LAST_COMPLETE_YEAR = datetime.date.today().year - 1

OUT = (pathlib.Path(__file__).resolve().parent.parent
       / "apps" / "web" / "public" / "data" / "phx-heat-season.json")


def fetch_daily_maxt():
    body = json.dumps({
        "sid": "PHXthr 9",
        "sdate": "1896-01-01",
        "edate": f"{LAST_COMPLETE_YEAR}-12-31",
        "elems": [{"name": "maxt"}],
    }).encode()
    req = urllib.request.Request("https://data.rcc-acis.org/StnData", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)["data"]


def main():
    by_year = {}
    for date, val in fetch_daily_maxt():
        y = int(date[:4])
        d = by_year.setdefault(y, {"missing": 0, "first": None, "last": None, "count": 0})
        if val in ("M", "T") or val is None:
            d["missing"] += 1
            continue
        if float(val) >= THRESHOLD:
            doy = (datetime.date.fromisoformat(date) - datetime.date(y, 1, 1)).days + 1
            if d["first"] is None:
                d["first"] = doy
            d["last"] = doy
            d["count"] += 1

    years = []
    for y in sorted(by_year):
        d = by_year[y]
        if d["missing"] > MAX_MISSING_DAYS or d["first"] is None:
            continue
        years.append({
            "year": y, "first": d["first"], "last": d["last"],
            "length": d["last"] - d["first"] + 1, "count": d["count"],
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "station": "Phoenix (ThreadEx PHXthr 9)",
        "thresholdF": THRESHOLD,
        "note": "first/last are day-of-year; years missing >36 daily highs excluded",
        "source": "NOAA/NWS ACIS daily maxt",
        "generated": datetime.date.today().isoformat(),
        "throughYear": years[-1]["year"] if years else None,
        "years": years,
    }, indent=1))

    early = [r for r in years if 1970 <= r["year"] <= 1979]
    late = [r for r in years if r["year"] > LAST_COMPLETE_YEAR - 10]
    avg = lambda rows, k: sum(r[k] for r in rows) / len(rows)
    print(f"wrote {OUT} ({len(years)} years)")
    print(f"1970s: first day {avg(early,'first'):.0f}, span {avg(early,'length'):.0f} days, {avg(early,'count'):.0f} days>=100")
    print(f"last 10y: first day {avg(late,'first'):.0f}, span {avg(late,'length'):.0f} days, {avg(late,'count'):.0f} days>=100")


if __name__ == "__main__":
    main()
