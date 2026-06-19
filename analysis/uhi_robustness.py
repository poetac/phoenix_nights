#!/usr/bin/env python3
"""Robustness check for the urban-rural pair: does the 'city share' of
Phoenix night-warming survive swapping the desert reference station?

Compares Phoenix (ThreadEx) TMIN trends against three rural references
over each reference's own period of record (common complete years,
1948 onward), including Casa Grande NM restricted to the same windows
so the comparison is apples-to-apples.

Stdlib only.
"""

import datetime
import json
import urllib.request

ACIS_URL = "https://data.rcc-acis.org/StnData"
MAX_MISSING_DAYS = 36
# Derived, never hardcoded: the most recent fully-elapsed calendar year.
LAST_COMPLETE_YEAR = datetime.date.today().year - 1

CITY = ("PHXthr 9", "Phoenix (ThreadEx)")
RURALS = [
    ("USC00021314", "Casa Grande NM"),
    ("USC00029287", "Wickenburg"),
    ("USC00027370", "Sacaton"),
]


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
    if n < 20:
        return None
    sx = sum(x for x, _ in pts)
    sy = sum(y for _, y in pts)
    sxy = sum(x * y for x, y in pts)
    sxx = sum(x * x for x, _ in pts)
    return (n * sxy - sx * sy) / (n * sxx - sx * sx) * 10


def main():
    phx = yearly_mint(CITY[0])
    print("reference        | window      | n  | city F/dec | rural F/dec | excess | city share")
    for sid, name in RURALS:
        rural = yearly_mint(sid)
        common = sorted(y for y in set(phx) & set(rural) if y >= 1948)
        if len(common) < 20:
            print(f"{name:16s} | too little overlap")
            continue
        p = slope_per_decade([(y, phx[y]) for y in common])
        c = slope_per_decade([(y, rural[y]) for y in common])
        share = (p - c) / p * 100
        print(f"{name:16s} | {common[0]}-{common[-1]} | {len(common):2d} | "
              f"{p:+10.2f} | {c:+11.2f} | {p - c:+5.2f} | {share:4.0f}%")


if __name__ == "__main__":
    main()
