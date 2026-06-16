#!/usr/bin/env python3
"""Build the decade-by-decade summer diurnal curve for Sky Harbor.

Downloads NCEI global-hourly observations for June-August of every year
since 1948 (two station ids: 999999-23183 pre-1973, 722780-23183 after),
buckets temperatures by local hour of day, and writes per-decade mean
curves to apps/web/public/data/phx-diurnal.json for the app to plot.

Raw CSVs are cached under analysis/cache/hourly/ so re-runs are cheap.
Stdlib only. Usage: python3 analysis/build_diurnal.py
"""

import csv
import datetime
import json
import pathlib
import sys
import time
import urllib.request

BASE = ("https://www.ncei.noaa.gov/access/services/data/v1"
        "?dataset=global-hourly&stations={sid}"
        "&startDate={y}-06-01&endDate={y}-08-31&dataTypes=TMP,DEW&format=csv")
SIDS = ("99999923183", "72278023183")
FIRST_YEAR = 1948
LAST_YEAR = datetime.date.today().year - 1  # last complete year
UTC_OFFSET = -7  # Phoenix has no DST
BAD_QUALITY = {"2", "3", "6", "7"}  # ISD suspect/erroneous codes
MIN_OBS_PER_HOUR = 150  # per decade; drops the 3-hourly-era gaps

ROOT = pathlib.Path(__file__).resolve().parent
CACHE = ROOT / "cache" / "hourly"
OUT = ROOT.parent / "apps" / "web" / "public" / "data" / "phx-diurnal.json"


def fetch_year(sid, year):
    path = CACHE / f"{sid}_{year}.csv"
    if path.exists():
        return path.read_text()
    url = BASE.format(sid=sid, y=year)
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "phoenix-nights/0.1"})
            with urllib.request.urlopen(req, timeout=120) as r:
                text = r.read().decode("utf-8", "replace")
            path.write_text(text)
            return text
        except Exception as e:
            if attempt == 2:
                print(f"  WARN {sid} {year}: {e}", file=sys.stderr)
                return ""
            time.sleep(3 * (attempt + 1))


def parse_scaled(field):
    """ISD scaled value like '+0400,1' -> degrees C, or None."""
    if not field or "," not in field:
        return None
    raw, quality = field.split(",", 1)
    if raw in ("+9999", "9999") or quality.strip() in BAD_QUALITY:
        return None
    try:
        c = int(raw) / 10.0
    except ValueError:
        return None
    if not -60 <= c <= 60:
        return None
    return c


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    # acc[decade][hour] = [sum_t, n_t, sum_d, n_d]
    acc = {}
    for year in range(FIRST_YEAR, LAST_YEAR + 1):
        decade = year // 10 * 10
        for sid in SIDS:
            text = fetch_year(sid, year)
            if not text or "\n" not in text:
                continue
            for row in csv.DictReader(text.splitlines()):
                date = row.get("DATE", "")
                if len(date) < 13:
                    continue
                hour = (int(date[11:13]) + UTC_OFFSET) % 24
                slot = acc.setdefault(decade, {}).setdefault(hour, [0.0, 0, 0.0, 0])
                t = parse_scaled(row.get("TMP", ""))
                if t is not None:
                    slot[0] += t * 9 / 5 + 32
                    slot[1] += 1
                d = parse_scaled(row.get("DEW", ""))
                if d is not None:
                    slot[2] += d * 9 / 5 + 32
                    slot[3] += 1
        print(f"{year} done", flush=True)

    decades = {}
    for dec in sorted(acc):
        hours = acc[dec]
        if len(hours) < 24 or any(hours[h][1] < MIN_OBS_PER_HOUR for h in range(24)):
            print(f"skipping {dec}s: incomplete hourly coverage "
                  f"({sorted((h, v[1]) for h, v in hours.items())[:4]}...)")
            continue
        decades[str(dec)] = {
            "temp": [round(hours[h][0] / hours[h][1], 1) for h in range(24)],
            "dew": [round(hours[h][2] / hours[h][3], 1) if hours[h][3] else None
                    for h in range(24)],
            "nObs": [hours[h][1] for h in range(24)],
        }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "station": "Phoenix Sky Harbor",
        "months": "June-August",
        "hours": "local (UTC-7, no DST)",
        "source": "NCEI global-hourly (ISD), station ids 999999-23183 / 722780-23183",
        "yearsCovered": [FIRST_YEAR, LAST_YEAR],
        "generated": datetime.date.today().isoformat(),
        "throughYear": LAST_YEAR,
        "decades": decades,
    }, indent=1))
    print(f"\nwrote {OUT} with decades: {', '.join(decades)}")


if __name__ == "__main__":
    main()
