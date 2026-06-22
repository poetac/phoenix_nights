#!/usr/bin/env python3
"""Build the 1970s day-of-year "normal" low/high for Phoenix from ACIS.

The live hero hook ("last night was +N°F above the 1970s normal") needs a
seasonal baseline, not the annual one: a June night has to be judged against a
1970s *June* night, not the 1970s yearly average. So for every calendar date
(MM-DD) we average the daily low and high over a centered +/-7-day window
across all years 1970-1979 — a smoothed picture of an ordinary night and day
in the fixed-baseline decade the whole app measures against.

One ACIS request fetches every daily min/max in 1970-1979. Output:
apps/web/public/data/phx-normals.json. Stdlib only.
"""

import datetime
import json
import pathlib
import urllib.request

from cities import data_path, get_city

BASE_START, BASE_END = 1970, 1979
WINDOW = 7  # days on each side of the target date
DAYS_IN_YEAR = 366  # canonical (leap) calendar so Feb 29 has a slot

# OUT is derived per-city in main() via data_path().

# A leap year gives every (month, day) — including Feb 29 — a stable index.
CANON = datetime.date(2000, 1, 1)


def fetch_daily(city):
    body = json.dumps({
        "sid": city["sid"],
        "sdate": f"{BASE_START}-01-01",
        "edate": f"{BASE_END}-12-31",
        "elems": [{"name": "mint"}, {"name": "maxt"}],
    }).encode()
    req = urllib.request.Request("https://data.rcc-acis.org/StnData", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)["data"]


def canon_index(month, day):
    return (datetime.date(2000, month, day) - CANON).days  # 0..365


def fnum(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def main():
    city = get_city(__doc__)
    OUT = data_path(city["prefix"], "normals")
    # buckets[i] = list of (low, high) observed on canonical day-of-year i
    buckets = [[] for _ in range(DAYS_IN_YEAR)]
    for date, lo, hi in fetch_daily(city):
        low, high = fnum(lo), fnum(hi)
        if low is None or high is None:
            continue
        m, d = int(date[5:7]), int(date[8:10])
        buckets[canon_index(m, d)].append((low, high))

    by_date = {}
    for i in range(DAYS_IN_YEAR):
        lows, highs = [], []
        for off in range(-WINDOW, WINDOW + 1):
            for low, high in buckets[(i + off) % DAYS_IN_YEAR]:
                lows.append(low)
                highs.append(high)
        if not lows:
            continue
        key = (CANON + datetime.timedelta(days=i)).strftime("%m-%d")
        by_date[key] = {
            "low": round(sum(lows) / len(lows), 1),
            "high": round(sum(highs) / len(highs), 1),
            "n": len(lows),
        }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "station": city["label"],
        "baseline": [BASE_START, BASE_END],
        "baselineLabel": "1970s",
        "window": f"centered +/-{WINDOW} days",
        "note": "byDate is keyed MM-DD; low/high are 1970-1979 means over the window",
        "source": "NOAA/NWS ACIS daily mint/maxt",
        "generated": datetime.date.today().isoformat(),
        "byDate": by_date,
    }, indent=1, allow_nan=False))

    print(f"wrote {OUT} ({len(by_date)} calendar days)")
    for k in ("01-15", "04-15", "07-15", "10-15"):
        v = by_date.get(k, {})
        print(f"  {k}: 1970s normal low {v.get('low')}F / high {v.get('high')}F (n={v.get('n')})")


if __name__ == "__main__":
    main()
