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
    },
    "tus": {
        "key": "tus",
        "prefix": "tus",
        "sid": "TUSthr 9",
        "label": "Tucson (ThreadEx TUSthr 9)",
        # ACIS reports the Tucson Area thread valid from 1894-09-01; start at the
        # first full calendar year so partial-1894 doesn't skew a yearly reduce.
        "record_start": "1895-01-01",
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
