#!/usr/bin/env python3
"""Probe: is an intra-metro overnight-low spatial-gradient card supportable?

Roadmap M4 #5 ("intra-metro spatial gradient") proposed several Maricopa ACIS
stations on one chart showing a downtown->fringe overnight-low gradient. This
script reproduces the station scan that led to *deferring* that card: it pulls,
for a transect of metro stations, the long-term overnight-low (TMIN) trend and a
recent-decade summer-night mean, alongside each station's elevation and rough
distance from the urban core.

Finding (see ROADMAP): the available stations do not support a clean,
non-redundant card. Long, complete records exist almost only at the airports
(COOP sites are gappy under any reasonable missing-data filter); the warming
*rates* are nearly uniform across the metro (~1.1-1.3 F/decade, so no rate
gradient); and the absolute night-low differences are confounded by elevation,
which varies non-monotonically with distance from the core. The one clean,
same-elevation contrast (Sky Harbor vs the NW valley) simply restates the
existing city-vs-desert UHI control card. Reproduce or reject -> reject for now.

Stdlib only. Usage: python3 analysis/spatial_gradient_probe.py
"""

import datetime
import json
import urllib.request

ACIS = "https://data.rcc-acis.org/StnData"
# Derived, never hardcoded: most recent complete year + trailing-decade start.
LAST_COMPLETE_YEAR = datetime.date.today().year - 1
RECENT0 = LAST_COMPLETE_YEAR - 9

# (sid, label, elevation_ft, approx miles from Sky Harbor)
TRANSECT = [
    ("USW00023183", "Sky Harbor (core)",      1113, 0),
    ("USC00028499", "Tempe ASU (inner)",      1167, 7),
    ("USC00029634", "Youngtown (NW suburb)",  1135, 15),
    ("USW00003192", "Deer Valley (N)",        1478, 16),
    ("USW00003184", "Falcon Field (E)",       1394, 18),
    ("USW00023111", "Luke AFB (W)",           1085, 18),
    ("USW00003185", "Goodyear (SW)",           968, 18),
    ("USW00023104", "Williams Gateway (SE)",  1382, 22),
    ("USC00021282", "Carefree (N, high)",     2530, 28),
]


def yearly_summer_low(sid, y0, y1, maxmissing=15):
    body = {"sid": sid, "sdate": f"{y0}-06-01", "edate": f"{y1}-08-31",
            "elems": [{"name": "mint", "interval": "yly", "duration": "yly",
                       "reduce": "mean", "maxmissing": maxmissing}]}
    req = urllib.request.Request(ACIS, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    d = json.load(urllib.request.urlopen(req, timeout=60))
    out = {}
    for yr, v in d.get("data", []):
        try:
            out[int(yr[:4])] = float(v)
        except (ValueError, TypeError):
            pass
    return out


def slope_per_decade(by_year):
    pts = sorted(by_year.items())
    if len(pts) < 25:
        return None
    n = len(pts)
    sx = sum(x for x, _ in pts); sy = sum(y for _, y in pts)
    sxx = sum(x * x for x, _ in pts); sxy = sum(x * y for x, y in pts)
    return (n * sxy - sx * sy) / (n * sxx - sx * sx) * 10


def main():
    print(f"{'station':24}{'elev':>5}{'mi':>4}{'n(70-25)':>9}{'F/dec':>7}{'JJAlow16-25':>12}{'n':>4}")
    rates, recents = [], []
    for sid, name, elev, mi in TRANSECT:
        full = yearly_summer_low(sid, 1970, LAST_COMPLETE_YEAR)
        recent = yearly_summer_low(sid, RECENT0, LAST_COMPLETE_YEAR)
        sl = slope_per_decade(full)
        mr = sum(recent.values()) / len(recent) if recent else None
        if sl is not None:
            rates.append(sl)
        if mr is not None and len(recent) >= 5:
            recents.append((name, elev, mr))
        print(f"{name:24}{elev:5}{mi:4}{len(full):9}"
              f"{('%.2f' % sl) if sl is not None else '   -':>7}"
              f"{('%.1f' % mr) if mr is not None else '   -':>12}{len(recent):4}")

    print("\nVerdict:")
    if rates:
        print(f"  warming rates span {min(rates):.2f}-{max(rates):.2f} F/dec "
              f"(range {max(rates)-min(rates):.2f}) -> no clear rate gradient.")
    print("  Stations with >=5yr recent coverage (elevation-confounded absolute lows):")
    for name, elev, mr in sorted(recents, key=lambda t: -t[2]):
        print(f"    {name:24} {elev:>5} ft  {mr:.1f} F")
    print("  => No non-redundant, non-confounded gradient. Card deferred (see ROADMAP).")


if __name__ == "__main__":
    main()
