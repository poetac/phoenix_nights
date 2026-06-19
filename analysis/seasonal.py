import datetime, json, urllib.request

# Derived, never hardcoded: most recent complete year + trailing-decade start.
LAST = datetime.date.today().year - 1
RECENT0 = LAST - 9

body = json.dumps({
    "sid": "PHXthr 9", "sdate": "1896-01", "edate": f"{LAST}-12",
    "elems": [{"name": "mint", "interval": "mly", "duration": "mly",
               "reduce": {"reduce": "mean", "add": "mcnt"}},
              {"name": "maxt", "interval": "mly", "duration": "mly",
               "reduce": {"reduce": "mean", "add": "mcnt"}}],
}).encode()
req = urllib.request.Request("https://data.rcc-acis.org/StnData", data=body,
                             headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req, timeout=60) as r:
    j = json.load(r)

# month -> season; Dec belongs to the following year's winter
SEASONS = {12: "DJF", 1: "DJF", 2: "DJF", 3: "MAM", 4: "MAM", 5: "MAM",
           6: "JJA", 7: "JJA", 8: "JJA", 9: "SON", 10: "SON", 11: "SON"}

vals = {}  # (season_year, season) -> {month: (lo, hi)}
for row in j["data"]:
    ym, lo, hi = row[0], row[1], row[2]
    if lo[0] == "M" or hi[0] == "M" or float(lo[1]) > 6 or float(hi[1]) > 6:
        continue
    y, m = int(ym[:4]), int(ym[5:7])
    sy = y + 1 if m == 12 else y
    vals.setdefault((sy, SEASONS[m]), {})[m] = (float(lo[0]), float(hi[0]))

def series(season, key):
    out = []
    for (sy, s), months in sorted(vals.items()):
        if s == season and len(months) == 3 and sy <= LAST:
            out.append((sy, sum(v[key] for v in months.values()) / 3))
    return out

def slope10(pts):
    n = len(pts)
    sx = sum(x for x, _ in pts); sy = sum(y for _, y in pts)
    sxy = sum(x * y for x, y in pts); sxx = sum(x * x for x, _ in pts)
    return (n * sxy - sx * sy) / (n * sxx - sx * sx) * 10

print(f"season | low trend F/dec since 1970 | high trend | 1970s avg low | {RECENT0}-{LAST} avg low")
for s in ("DJF", "MAM", "JJA", "SON"):
    lows = [(y, v) for y, v in series(s, 0) if y >= 1970]
    highs = [(y, v) for y, v in series(s, 1) if y >= 1970]
    l70 = [v for y, v in lows if y <= 1979]
    lrec = [v for y, v in lows if y >= RECENT0]
    print(f"{s}: {slope10(lows):+.2f} | {slope10(highs):+.2f} | "
          f"{sum(l70)/len(l70):.1f} | {sum(lrec)/len(lrec):.1f}")
