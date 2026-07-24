#!/usr/bin/env python3
"""Build per-year streak/threshold series from ACIS daily lows and highs.

One request fetches every daily min and max since 1896. For each
sufficiently complete year we emit:
  streak80  - longest run of consecutive nights with low >= 80F
  streak90  - same for low >= 90F
  streak110 - longest run of consecutive days with high >= 110F
  frost     - nights at or below 32F
  cool60    - nights at or below 60F
  first80   - day-of-year of the year's first 80F+ night (null if none)
  last80    - day-of-year of the year's last 80F+ night (null if none)
  count80   - number of 80F+ nights that year

first80/last80 bracket the warm-night *season*: the slice of the calendar
when overnight lows refuse to drop below 80F. Day-of-year is computed the
same way as build_heat_season.py so the two season cards line up.

Output: apps/web/public/data/phx-streaks.json. Stdlib only.
"""

import datetime

import assetio
from acis import LAST_COMPLETE_YEAR, MAX_MISSING_DAYS, acis_stndata
from cities import data_path, day_of_year, expected_days, get_city

# OUT is derived per-city in main() via data_path().


def fetch_daily(city):
    return acis_stndata(city["sid"], city["record_start"], f"{LAST_COMPLETE_YEAR}-12-31",
                         [{"name": "mint"}, {"name": "maxt"}], timeout=120)


def max_streak(vals, pred):
    best = cur = 0
    for v in vals:
        if v is not None and pred(v):
            cur += 1
            best = max(best, cur)
        else:
            cur = 0
    return best


def season_span(vals, dates, pred):
    """First and last day-of-year matching pred, plus the count.

    vals is the year's daily series in calendar order (missing days are None
    placeholders); dates is the parallel list of ISO date strings, so the
    day-of-year is derived from the actual calendar date, not the list index
    (see cities.day_of_year — the index coincidentally agrees with the date
    only because ACIS gap-pads to one row per day starting Jan 1; date-derived
    is correct even if that padding assumption were ever broken). Returns
    (first_doy, last_doy, count); first/last are None if nothing matched.
    """
    first = last = None
    count = 0
    for date, v in zip(dates, vals):
        if v is not None and pred(v):
            doy = day_of_year(date)
            if first is None:
                first = doy
            last = doy
            count += 1
    return first, last, count


def sustained_span(vals, dates, pred, win=7, need=5):
    """First and last day-of-year inside a 'sustained' stretch: a day counts
    only if >=`need` of the `win` days centered on it match `pred`. This is the
    outlier-robust companion to season_span — one isolated warm night can't open
    or close the season on its own. Returns (first_doy, last_doy), None if none.
    """
    half = win // 2
    n = len(vals)
    first = last = None
    for i in range(n):
        lo, hi = max(0, i - half), min(n, i + half + 1)
        if sum(1 for v in vals[lo:hi] if v is not None and pred(v)) >= need:
            doy = day_of_year(dates[i])
            if first is None:
                first = doy
            last = doy
    return first, last


def main():
    city = get_city(__doc__)
    OUT = data_path(city["prefix"], "streaks")
    years = {}
    for date, lo, hi in fetch_daily(city):
        y = int(date[:4])
        d = years.setdefault(y, {"lo": [], "hi": [], "dates": [], "missLo": 0, "missHi": 0})
        d["dates"].append(date)
        # Track missingness PER element: a missing daily HIGH must not discard an
        # observed overnight LOW. The low-based metrics — streak80/90, the warm-night
        # season, frost/cool counts — depend on every valid mint, and verify_v0 checks
        # them mint-only, so coupling the two (the old behaviour) could drop an observed
        # low and even push a complete-low year past the missing-day cutoff. One entry
        # per calendar day is still appended to each list (None when that element is
        # missing), so day_of_year(dates[i]) stays correct for every index.
        if lo in ("M", "T", None):
            d["lo"].append(None); d["missLo"] += 1
        else:
            d["lo"].append(float(lo))
        if hi in ("M", "T", None):
            d["hi"].append(None); d["missHi"] += 1
        else:
            d["hi"].append(float(hi))

    rows = []
    for y in sorted(years):
        d = years[y]
        # Every city's record_start is Jan 1 (analysis/cities.py), so ACIS's
        # gap-padding should yield exactly one row per calendar day for any
        # complete year — the invariant day_of_year(dates[i]) relies on lining
        # up with the list index. Assert it explicitly rather than silently
        # trust it.
        assert len(d["dates"]) == expected_days(y), (
            f"{city['prefix']} {y}: got {len(d['dates'])} days, expected {expected_days(y)}")
        # Qualify a year on its LOW record (what the warm-night metrics need, and what
        # verify_v0 mirrors). streak110 is the only high-based output; a year with gappy
        # highs just yields a conservative run, and its only consumer is the all-time
        # record, set in recent complete years.
        if d["missLo"] > MAX_MISSING_DAYS:
            continue
        first80, last80, count80 = season_span(d["lo"], d["dates"], lambda v: v >= 80)
        firstSus, lastSus = sustained_span(d["lo"], d["dates"], lambda v: v >= 80)
        rows.append({
            "year": y,
            "streak80": max_streak(d["lo"], lambda v: v >= 80),
            "streak90": max_streak(d["lo"], lambda v: v >= 90),
            "streak110": max_streak(d["hi"], lambda v: v >= 110),
            "frost": sum(1 for v in d["lo"] if v is not None and v <= 32),
            "cool60": sum(1 for v in d["lo"] if v is not None and v <= 60),
            "first80": first80,
            "last80": last80,
            "count80": count80,
            # outlier-robust boundaries: 5-of-7 nights >=80F (vs a lone night)
            "firstSus": firstSus,
            "lastSus": lastSus,
        })

    assetio.write_json(OUT, {
        "station": city["label"],
        "source": "NOAA/NWS ACIS daily mint/maxt",
        "note": ("streaks within calendar years; years missing >36 daily lows excluded "
                 "(low and high missingness tracked separately, so a missing high never "
                 "discards an observed low). first80/last80 are day-of-year of the first/"
                 "last single 80F+ night; firstSus/lastSus use a 5-of-7-night rule."),
        "generated": datetime.date.today().isoformat(),
        "throughYear": rows[-1]["year"] if rows else None,
        "years": rows,
    })

    rec = max(rows, key=lambda r: r["streak80"])
    print(f"wrote {OUT} ({len(rows)} years)")
    print(f"record streak80: {rec['streak80']} nights in {rec['year']}")
    print(f"2023 streak110: {[r for r in rows if r['year'] == 2023][0]['streak110']} (news: 31)")

    def avg(years, key):
        vals = [r[key] for r in years if r.get(key) is not None]
        return sum(vals) / len(vals) if vals else float("nan")

    early = [r for r in rows if 1970 <= r["year"] <= 1979]
    late = [r for r in rows if r["year"] > rows[-1]["year"] - 10]
    print(f"warm-night season, 1970s: first day {avg(early,'first80'):.0f}, "
          f"last day {avg(early,'last80'):.0f}, span {avg(early,'last80')-avg(early,'first80'):.0f} days")
    print(f"warm-night season, last 10y: first day {avg(late,'first80'):.0f}, "
          f"last day {avg(late,'last80'):.0f}, span {avg(late,'last80')-avg(late,'first80'):.0f} days")


if __name__ == "__main__":
    main()
