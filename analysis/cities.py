#!/usr/bin/env python3
"""City registry for the build_*.py pipelines.

The front-end engine is city-agnostic (a city is one entry in
apps/web/src/lib/cities.js); the Python pipelines are too. Every ACIS builder
takes ``--city <key>`` (default ``phx``) and reads the station id, ThreadEx
label, record start, and output prefix from here, writing to
``apps/web/public/data/<prefix>-<asset>.json``.

Keeping ``phx`` the default means running any builder with no arguments
reproduces its original Phoenix output byte-for-byte — the generalization is
invisible to the existing workflow until ``--city tus`` is passed.

Stdlib only (mirrors the builders).
"""

import argparse
import pathlib

# Each city: the ACIS ThreadEx sid the front end queries live, a human label
# stamped into every asset, the first year of usable record, and the filename
# prefix for its committed JSON assets.
CITIES = {
    "phx": {
        "key": "phx",
        "prefix": "phx",
        "sid": "PHXthr 9",
        "label": "Phoenix (ThreadEx PHXthr 9)",
        "record_start": "1896-01-01",
        # EIA-930 balancing authorities summed for the July grid-demand card.
        "grid": {"respondents": ("AZPS", "SRP"),
                 "label": "AZPS + SRP (EIA-930 balancing authorities)"},
        # Local standard-time offset (Arizona keeps no DST) — used by the
        # hour-of-day builders (diurnal, grid).
        "utc_offset": -7,
        # NCEI global-hourly (ISD) station ids for the summer diurnal curve:
        # pre-1973 (999999 USAF) then the modern pair.
        "diurnal": {"sids": ("99999923183", "72278023183"),
                    "station": "Phoenix Sky Harbor", "first_year": 1948},
    },
    "tus": {
        "key": "tus",
        "prefix": "tus",
        "sid": "TUSthr 9",
        "label": "Tucson (ThreadEx TUSthr 9)",
        # ACIS reports the Tucson Area thread valid from 1894-09-01; start at the
        # first full calendar year so partial-1894 doesn't skew a yearly reduce.
        "record_start": "1895-01-01",
        # Tucson Electric Power is the metro's balancing authority (EIA-930).
        "grid": {"respondents": ("TEPC",),
                 "label": "TEPC (Tucson Electric Power, EIA-930)"},
        "utc_offset": -7,
        # Tucson Int'l Airport ISD (WBAN 23160); hourly record begins 1949.
        "diurnal": {"sids": ("99999923160", "72274023160"),
                    "station": "Tucson Int'l Airport", "first_year": 1949},
    },
    "lv": {
        "key": "lv",
        "prefix": "lv",
        "sid": "LASthr 9",
        "label": "Las Vegas (ThreadEx LASthr 9)",
        # ACIS reports the Las Vegas Area thread from 1937.
        "record_start": "1937-01-01",
        # Nevada Power Company is the Las Vegas balancing authority (EIA-930).
        "grid": {"respondents": ("NEVP",),
                 "label": "NEVP (Nevada Power Company, EIA-930)"},
        # Las Vegas observes Pacific DST, so the hour-of-day builders bucket via
        # the IANA tz (not a fixed offset). utc_offset is kept only as a fallback.
        "utc_offset": -8,
        "tz": "America/Los_Angeles",
        # McCarran / Harry Reid Intl ISD (WBAN 23169); hourly record begins 1949.
        "diurnal": {"sids": ("99999923169", "72386023169"),
                    "station": "Las Vegas (Harry Reid Intl)", "first_year": 1949},
    },
    "ep": {
        "key": "ep",
        "prefix": "ep",
        "sid": "ELPthr 9",
        "label": "El Paso (ThreadEx ELPthr 9)",
        "record_start": "1887-01-01",
        # El Paso Electric is the metro's balancing authority (EIA-930).
        "grid": {"respondents": ("EPE",),
                 "label": "EPE (El Paso Electric, EIA-930)"},
        # El Paso observes Mountain DST -> tz-aware hour bucketing.
        "utc_offset": -7,
        "tz": "America/Denver",
        # El Paso Intl ISD (WBAN 23044) is a single continuous id back to ~1949.
        "diurnal": {"sids": ("72270023044",),
                    "station": "El Paso Intl", "first_year": 1948},
    },
}

DATA_DIR = (pathlib.Path(__file__).resolve().parent.parent
            / "apps" / "web" / "public" / "data")


def get_city(description=""):
    """Parse ``--city`` and return its registry entry (default phx).

    Uses parse_known_args so a builder can add its own flags without clashing.
    """
    p = argparse.ArgumentParser(description=description)
    p.add_argument("--city", choices=sorted(CITIES), default="phx",
                   help="city key to build (default: phx)")
    args, _ = p.parse_known_args()
    return CITIES[args.city]


def data_path(prefix, asset):
    """apps/web/public/data/<prefix>-<asset>.json"""
    return DATA_DIR / f"{prefix}-{asset}.json"
