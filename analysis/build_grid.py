#!/usr/bin/env python3
"""Build July electricity-demand-by-hour curves for a city's grid utilities.

Fetches EIA-930 hourly demand (UTC periods) for the city's balancing
authorities (Phoenix = AZPS + SRP; Tucson = TEPC) for every July since the
dataset began (2015), sums the utilities, averages by local hour
(DST-aware via the city's IANA tz), and writes per-year curves plus each year's
overnight-trough-to-evening-peak ratio.

Takes ``--city`` (default ``phx``; Phoenix output byte-identical apart from the
``generated`` date). Requires the EIA_API_KEY environment variable (free key:
eia.gov/opendata). The key stays out of the repo; only the derived JSON is
committed. Output: apps/web/public/data/<prefix>-grid.json. Stdlib only.
"""

import datetime
import json
import os
import time
import urllib.parse
import urllib.request

from zoneinfo import ZoneInfo

from cities import data_path, get_city

API = "https://api.eia.gov/v2/electricity/rto/region-data/data/"
FIRST_YEAR = 2015
LAST_YEAR = datetime.date.today().year - 1


def fetch_july(key, respondent, year):
    params = {
        "api_key": key, "frequency": "hourly", "data[0]": "value",
        "facets[respondent][]": respondent, "facets[type][]": "D",
        "start": f"{year}-07-01T00", "end": f"{year}-08-01T00", "length": 5000,
    }
    url = API + "?" + urllib.parse.urlencode(params)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return json.load(r)["response"]["data"]
        except Exception:
            if attempt == 2:
                raise
            time.sleep(3 * (attempt + 1))


def main():
    city = get_city(__doc__)
    respondents = tuple(city["grid"]["respondents"])
    OUT = data_path(city["prefix"], "grid")
    utc_offset = city.get("utc_offset")
    tz = city.get("tz")  # if set, DST-aware (zoneinfo); else fixed offset (no-DST AZ)
    zone = ZoneInfo(tz) if tz else None

    key = os.environ.get("EIA_API_KEY")
    if not key:
        raise SystemExit("set EIA_API_KEY (free key: https://www.eia.gov/opendata/)")

    years = {}
    for year in range(FIRST_YEAR, LAST_YEAR + 1):
        # period -> {respondent -> MW}; sum the utilities per timestamp first
        by_ts = {}
        ok = True
        for resp in respondents:
            rows = fetch_july(key, resp, year)
            if len(rows) < 600:
                print(f"  {year} {resp}: only {len(rows)} rows, skipping year")
                ok = False
                break
            for row in rows:
                v = row.get("value")
                if v is None:
                    continue
                v = float(v)
                if v <= 0:
                    continue
                by_ts.setdefault(row["period"], {})[resp] = v
        if not ok:
            continue
        hours = {h: [] for h in range(24)}
        for ts, vals in by_ts.items():
            if len(vals) != len(respondents):
                continue  # only hours where every utility reported
            if zone is None:
                local_h = (int(ts[11:13]) + utc_offset) % 24
            else:
                local_h = datetime.datetime(
                    int(ts[0:4]), int(ts[5:7]), int(ts[8:10]), int(ts[11:13]),
                    tzinfo=datetime.timezone.utc).astimezone(zone).hour
            hours[local_h].append(sum(vals.values()))
        if any(len(v) < 15 for v in hours.values()):
            print(f"  {year}: thin coverage, skipping")
            continue
        mw = [round(sum(v) / len(v)) for h, v in sorted(hours.items())]
        years[str(year)] = {
            "mw": mw,
            "troughPct": round(min(mw) / max(mw) * 100, 1),
        }
        print(f"{year}: trough {min(mw)} MW, peak {max(mw)} MW, trough/peak {years[str(year)]['troughPct']}%")

    OUT.write_text(json.dumps({
        "respondents": city["grid"]["label"],
        "month": "July",
        "hours": (f"local (UTC{utc_offset}, no DST)" if zone is None
                  else f"local time, DST-aware ({tz})"),
        "units": "average MW demand by hour of day",
        "source": "US EIA Hourly Electric Grid Monitor (api.eia.gov v2)",
        "generated": datetime.date.today().isoformat(),
        "throughYear": max((int(k) for k in years), default=None),
        "years": years,
    }, indent=1))
    print(f"wrote {OUT} ({len(years)} years)")


if __name__ == "__main__":
    main()
