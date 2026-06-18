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
    "yum": {
        "key": "yum",
        "prefix": "yum",
        "sid": "YUMthr 9",
        "label": "Yuma (ThreadEx YUMthr 9)",
        "record_start": "1893-01-01",
        # Yuma keeps Arizona standard time (no DST), like phx/tus -> fixed offset.
        "utc_offset": -7,
        "diurnal": {"sids": ("99999923195", "69002003145"),
                    "station": "Yuma MCAS / Intl", "first_year": 1948},
    },
    "rno": {
        "key": "rno",
        "prefix": "rno",
        "sid": "RNOthr 9",
        "label": "Reno (ThreadEx RNOthr 9)",
        "record_start": "1893-01-01",
        # Reno observes Pacific DST -> tz-aware hour bucketing.
        "utc_offset": -8,
        "tz": "America/Los_Angeles",
        "diurnal": {"sids": ("99999923185", "72488023185"),
                    "station": "Reno-Tahoe Intl", "first_year": 1948},
    },
    "abq": {
        "key": "abq",
        "prefix": "abq",
        "sid": "ABQthr 9",
        "label": "Albuquerque (ThreadEx ABQthr 9)",
        "record_start": "1893-01-01",
        # Albuquerque observes Mountain DST -> tz-aware hour bucketing.
        "utc_offset": -7,
        "tz": "America/Denver",
        # PNM (Public Service Co. of New Mexico) is the Albuquerque metro's
        # balancing authority (EIA-930) — a clean single utility for the metro.
        "grid": {"respondents": ("PNM",),
                 "label": "PNM (Public Service Co. of New Mexico, EIA-930)"},
        "diurnal": {"sids": ("99999923050", "72365023050"),
                    "station": "Albuquerque Intl Sunport", "first_year": 1948},
    },
    "slc": {
        "key": "slc",
        "prefix": "slc",
        "sid": "SLCthr 9",
        "label": "Salt Lake City (ThreadEx SLCthr 9)",
        "record_start": "1893-01-01",
        # Salt Lake City observes Mountain DST -> tz-aware hour bucketing.
        "utc_offset": -7,
        "tz": "America/Denver",
        "diurnal": {"sids": ("99999924127", "72572024127"),
                    "station": "Salt Lake City Intl", "first_year": 1948},
    },
    "boi": {
        "key": "boi",
        "prefix": "boi",
        "sid": "BOIthr 9",
        "label": "Boise (ThreadEx BOIthr 9)",
        "record_start": "1893-01-01",
        # Boise observes Mountain DST -> tz-aware hour bucketing.
        "utc_offset": -7,
        "tz": "America/Boise",
        # Idaho Power (IPCO) is the Boise metro's balancing authority (EIA-930).
        "grid": {"respondents": ("IPCO",),
                 "label": "IPCO (Idaho Power, EIA-930)"},
        "diurnal": {"sids": ("99999924131", "72681024131"),
                    "station": "Boise Air Terminal", "first_year": 1948},
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
