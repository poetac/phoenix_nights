#!/usr/bin/env python3
"""Urban-rural pair analysis: Phoenix (ThreadEx) vs Casa Grande National Monument.

Reproduces the numbers behind the app's "How much of this is the city itself?"
card from ACIS, independent of the front-end code:

  - yearly avg TMIN for both stations (years with >36 missing days excluded)
  - OLS trends over common years since 1948 and since 1970
  - decade-average gap (Phoenix minus desert)

Stdlib only.
"""

import datetime
import json
import urllib.request

ACIS_URL = "https://data.rcc-acis.org/StnData"
MAX_MISSING_DAYS = 36
# Derived, never hardcoded: the most recent fully-elapsed calendar year.
LAST_COMPLETE_YEAR = datetime.date.today().year - 1

PHOENIX = ("PHXthr 9", "Phoenix (ThreadEx)")
RURAL = ("USC00021314", "Casa Grande National Monument")


def yearly_mint(sid):
    body = json.dumps({
        "sid": sid, "sdate": "1896-01-01", "edate": f"{LAST_COMPLETE_YEAR}-12-31",
        "elems": [{"name": "mint", "interval": "yly", "duration": "yly",
                   "reduce": {"reduce": "mean", "add": "mcnt"}}],
    }).encode()
    req = urllib.request.Request(ACIS_URL, data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        j = json.load(r)
    out = {}
    for row in j["data"]:
        year, (val, mcnt) = row[0], row[1]
        if val != "M" and float(mcnt) <= MAX_MISSING_DAYS:
            out[int(year)] = float(val)
    return out


def slope_per_decade(pts):
    n = len(pts)
    if n < 3:
        return None
    sx = sum(x for x, _ in pts)
    sy = sum(y for _, y in pts)
    sxy = sum(x * y for x, y in pts)
    sxx = sum(x * x for x, _ in pts)
    return (n * sxy - sx * sy) / (n * sxx - sx * sx) * 10


def main():
    phx = yearly_mint(PHOENIX[0])
    rural = yearly_mint(RURAL[0])
    common = sorted(set(phx) & set(rural))
    print(f"{PHOENIX[1]} vs {RURAL[1]}: {len(common)} common years {common[0]}-{common[-1]}\n")

    for start in (1948, 1970):
        yrs = [y for y in common if y >= start]
        p = slope_per_decade([(y, phx[y]) for y in yrs])
        c = slope_per_decade([(y, rural[y]) for y in yrs])
        share = (p - c) / p * 100
        print(f"since {start} (n={len(yrs)} common yrs): "
              f"city {p:+.2f} F/dec | desert {c:+.2f} F/dec | "
              f"city excess {p - c:+.2f} F/dec ({share:.0f}% of city warming)")

    print("\ndecade-average gap, city minus desert (>=4 common years):")
    for d0 in range(1900, 2030, 10):
        yrs = [y for y in common if d0 <= y <= d0 + 9]
        if len(yrs) >= 4:
            gap = sum(phx[y] - rural[y] for y in yrs) / len(yrs)
            print(f"  {d0}s: {gap:+.1f} F  (n={len(yrs)})")


if __name__ == "__main__":
    main()
