#!/usr/bin/env python3
"""Split annual cooling-degree-days into a day-half and a night-half.

Cooling degree days use the daily mean, (Tmax + Tmin) / 2, against a 65F base.
On any cooling day (mean > 65F) that excess splits *exactly* in two:

    mean - 65 = (Tmax - 65)/2  +  (Tmin - 65)/2
                \___ day half __/   \__ night half __/

so summing each half over the year decomposes the standard CDD total into the
share the afternoon high is responsible for and the share the overnight low is.
No arbitrary attribution — it is an algebraic identity. As lows warm faster than
highs, the night half grows faster than the day half: a rising share of the
cooling bill comes from the hours that used to cost nothing to cool.

One ACIS request fetches every daily min/max since 1896. Output:
apps/web/public/data/phx-cdd-split.json. Stdlib only.
"""

import datetime
import json
import urllib.request

from cities import data_path, get_city

MAX_MISSING_DAYS = 36
BASE = 65.0
LAST_COMPLETE_YEAR = datetime.date.today().year - 1

# OUT is derived per-city in main() via data_path().


def fetch_daily(city):
    body = json.dumps({
        "sid": city["sid"], "sdate": city["record_start"],
        "edate": f"{LAST_COMPLETE_YEAR}-12-31",
        "elems": [{"name": "mint"}, {"name": "maxt"}],
    }).encode()
    req = urllib.request.Request("https://data.rcc-acis.org/StnData", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)["data"]


def main():
    city = get_city(__doc__)
    OUT = data_path(city["prefix"], "cdd-split")
    years = {}
    for date, lo, hi in fetch_daily(city):
        y = int(date[:4])
        d = years.setdefault(y, {"day": 0.0, "night": 0.0, "miss": 0})
        if lo in ("M", "T", None) or hi in ("M", "T", None):
            d["miss"] += 1
            continue
        lo, hi = float(lo), float(hi)
        if (lo + hi) / 2 > BASE:  # a cooling day
            d["day"] += (hi - BASE) / 2
            d["night"] += (lo - BASE) / 2

    rows = []
    for y in sorted(years):
        d = years[y]
        if d["miss"] > MAX_MISSING_DAYS or y > LAST_COMPLETE_YEAR:
            continue
        rows.append({
            "year": y,
            "dayCdd": round(d["day"]),
            "nightCdd": round(d["night"]),
        })

    OUT.write_text(json.dumps({
        "station": city["label"],
        "source": "NOAA/NWS ACIS daily mint/maxt",
        "base": BASE,
        "note": ("annual cooling degree days split by the identity "
                 "mean-65 = (Tmax-65)/2 + (Tmin-65)/2 over cooling days "
                 "(mean>65F); years missing >36 days excluded."),
        "generated": datetime.date.today().isoformat(),
        "throughYear": rows[-1]["year"] if rows else None,
        "years": rows,
    }, indent=1, allow_nan=False))

    print(f"wrote {OUT} ({len(rows)} years)")

    def share(yrs):
        n = sum(r["nightCdd"] for r in yrs)
        t = sum(r["dayCdd"] + r["nightCdd"] for r in yrs)
        return 100 * n / t if t else float("nan")

    early = [r for r in rows if 1970 <= r["year"] <= 1979]
    late = [r for r in rows if r["year"] > rows[-1]["year"] - 10]
    print(f"night share of CDD, 1970s: {share(early):.1f}% | last 10y: {share(late):.1f}%")


if __name__ == "__main__":
    main()
