#!/usr/bin/env python3
"""Build per-year streak/threshold series from ACIS daily lows and highs.

One request fetches every daily min and max since 1896. For each
sufficiently complete year we emit:
  streak80  - longest run of consecutive nights with low >= 80F
  streak90  - same for low >= 90F
  streak110 - longest run of consecutive days with high >= 110F
  frost     - nights at or below 32F
  cool60    - nights at or below 60F

Output: apps/web/public/data/phx-streaks.json. Stdlib only.
"""

import datetime
import json
import pathlib
import urllib.request

MAX_MISSING_DAYS = 36
LAST_COMPLETE_YEAR = datetime.date.today().year - 1

OUT = (pathlib.Path(__file__).resolve().parent.parent
       / "apps" / "web" / "public" / "data" / "phx-streaks.json")


def fetch_daily():
    body = json.dumps({
        "sid": "PHXthr 9", "sdate": "1896-01-01",
        "edate": f"{LAST_COMPLETE_YEAR}-12-31",
        "elems": [{"name": "mint"}, {"name": "maxt"}],
    }).encode()
    req = urllib.request.Request("https://data.rcc-acis.org/StnData", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)["data"]


def max_streak(vals, pred):
    best = cur = 0
    for v in vals:
        if v is not None and pred(v):
            cur += 1
            best = max(best, cur)
        else:
            cur = 0
    return best


def main():
    years = {}
    for date, lo, hi in fetch_daily():
        y = int(date[:4])
        d = years.setdefault(y, {"lo": [], "hi": [], "miss": 0})
        if lo in ("M", None) or hi in ("M", None):
            d["miss"] += 1
            d["lo"].append(None)
            d["hi"].append(None)
        else:
            d["lo"].append(float(lo))
            d["hi"].append(float(hi))

    rows = []
    for y in sorted(years):
        d = years[y]
        if d["miss"] > MAX_MISSING_DAYS:
            continue
        rows.append({
            "year": y,
            "streak80": max_streak(d["lo"], lambda v: v >= 80),
            "streak90": max_streak(d["lo"], lambda v: v >= 90),
            "streak110": max_streak(d["hi"], lambda v: v >= 110),
            "frost": sum(1 for v in d["lo"] if v is not None and v <= 32),
            "cool60": sum(1 for v in d["lo"] if v is not None and v <= 60),
        })

    OUT.write_text(json.dumps({
        "station": "Phoenix (ThreadEx PHXthr 9)",
        "source": "NOAA/NWS ACIS daily mint/maxt",
        "note": "streaks within calendar years; years missing >36 days excluded",
        "years": rows,
    }, indent=1))

    rec = max(rows, key=lambda r: r["streak80"])
    print(f"wrote {OUT} ({len(rows)} years)")
    print(f"record streak80: {rec['streak80']} nights in {rec['year']}")
    print(f"2023 streak110: {[r for r in rows if r['year'] == 2023][0]['streak110']} (news: 31)")


if __name__ == "__main__":
    main()
