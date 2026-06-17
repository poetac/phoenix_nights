#!/usr/bin/env python3
"""Build the decade-by-decade summer diurnal curve for a city.

Downloads NCEI global-hourly observations for June-August of every year since
the city's hourly record begins (Phoenix 1948, Tucson 1949), buckets
temperatures by local hour of day, and writes per-decade mean curves to
apps/web/public/data/<prefix>-diurnal.json for the app to plot.

Takes ``--city`` (default ``phx``; Phoenix output byte-identical apart from the
``generated`` date). The station ids, label, first year, and UTC offset come
from analysis/cities.py, so adding a city is a registry entry, not a code edit.
Hour bucketing: a no-DST city (no ``tz``) uses its fixed ``utc_offset`` (so
Arizona output is byte-identical to before); a DST-observing city sets ``tz``
(an IANA zone) and each UTC observation is converted through it, so DST is
handled correctly. (Arizona's own ``America/Phoenix`` zone encodes a 1967 DST
blip, so we keep the fixed offset for AZ rather than the zone.)

Raw CSVs are cached under analysis/cache/hourly/ so re-runs are cheap.
Stdlib only. Usage: python3 analysis/build_diurnal.py [--city phx|tus]
"""

import csv
import datetime
import json
import pathlib
import sys
import time
import urllib.request

from zoneinfo import ZoneInfo

from cities import data_path, get_city

BASE = ("https://www.ncei.noaa.gov/access/services/data/v1"
        "?dataset=global-hourly&stations={sid}"
        "&startDate={y}-06-01&endDate={y}-08-31&dataTypes=TMP,DEW&format=csv")
LAST_YEAR = datetime.date.today().year - 1  # last complete year
BAD_QUALITY = {"2", "3", "6", "7"}  # ISD suspect/erroneous codes
MIN_OBS_PER_HOUR = 150  # per decade; drops the 3-hourly-era gaps

ROOT = pathlib.Path(__file__).resolve().parent
CACHE = ROOT / "cache" / "hourly"


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
    city = get_city(__doc__)
    cfg = city["diurnal"]
    sids = tuple(cfg["sids"])
    first_year = cfg.get("first_year", 1948)
    utc_offset = city.get("utc_offset")
    tz = city.get("tz")  # if set, DST-aware (zoneinfo); else fixed offset (no-DST AZ)
    zone = ZoneInfo(tz) if tz else None
    source = ("NCEI global-hourly (ISD), station ids "
              + " / ".join(f"{s[:6]}-{s[6:]}" for s in sids))
    OUT = data_path(city["prefix"], "diurnal")

    CACHE.mkdir(parents=True, exist_ok=True)
    # acc[decade][hour] = [sum_t, n_t, sum_d, n_d]
    acc = {}
    for year in range(first_year, LAST_YEAR + 1):
        decade = year // 10 * 10
        for sid in sids:
            text = fetch_year(sid, year)
            if not text or "\n" not in text:
                continue
            for row in csv.DictReader(text.splitlines()):
                date = row.get("DATE", "")
                if len(date) < 13:
                    continue
                if zone is None:
                    hour = (int(date[11:13]) + utc_offset) % 24
                else:
                    hour = datetime.datetime(
                        int(date[0:4]), int(date[5:7]), int(date[8:10]), int(date[11:13]),
                        tzinfo=datetime.timezone.utc).astimezone(zone).hour
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
        "station": cfg["station"],
        "months": "June-August",
        "hours": (f"local (UTC{utc_offset}, no DST)" if zone is None
                  else f"local time, DST-aware ({tz})"),
        "source": source,
        "yearsCovered": [first_year, LAST_YEAR],
        "generated": datetime.date.today().isoformat(),
        "throughYear": LAST_YEAR,
        "decades": decades,
    }, indent=1))
    print(f"\nwrote {OUT} with decades: {', '.join(decades)}")


if __name__ == "__main__":
    main()
