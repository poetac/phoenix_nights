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
        "rural_sid": "USC00021314",  # Casa Grande NM — open-desert control (cities.js rural.sid)
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
        "rural_sid": "USC00027619",  # Sasabe — open-desert control (cities.js rural.sid)
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
        "rural_sid": "USC00262243",  # Desert NWR — open-desert control (cities.js rural.sid)
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
        "rural_sid": "USC00299686",  # White Sands — open-desert control (cities.js rural.sid)
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
        "rural_sid": "USW00003125",  # Yuma Proving Ground — open-desert control (cities.js rural.sid)
        "label": "Yuma (ThreadEx YUMthr 9)",
        "record_start": "1893-01-01",
        # Yuma keeps Arizona standard time (no DST), like phx/tus -> fixed offset.
        "utc_offset": -7,
        # Yuma's hourly record spans several ISD ids over time (the single modern
        # id is wrong); chain the eras: 1948-72, 1942-97, 2000-04, 2005-present.
        "diurnal": {"sids": ("99999923195", "72280023195", "72280099999", "74003503145"),
                    "station": "Yuma MCAS / Intl", "first_year": 1948},
    },
    "rno": {
        "key": "rno",
        "prefix": "rno",
        "sid": "RNOthr 9",
        "rural_sid": "USC00048758",  # Tahoe City — rural control (cities.js rural.sid)
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
        "rural_sid": "USC00295150",  # Los Lunas — rural control (cities.js rural.sid)
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
        "rural_sid": "USC00429133",  # Vernon — high-desert rural control (cities.js rural.sid)
        "label": "Salt Lake City (ThreadEx SLCthr 9)",
        "record_start": "1893-01-01",
        # Salt Lake City observes Mountain DST -> tz-aware hour bucketing.
        "utc_offset": -7,
        "tz": "America/Denver",
        "diurnal": {"sids": ("99999924127", "72572024127"),
                    "station": "Salt Lake City Intl", "first_year": 1948},
    },
    "atl": {
        "key": "atl",
        "prefix": "atl",
        "sid": "ATLthr 9",
        "rural_sid": "USC00093621",  # Gainesville — rural countryside control (cities.js rural.sid)
        "label": "Atlanta (ThreadEx ATLthr 9)",
        "record_start": "1879-01-01",
        "rural_ref": "rural countryside",
        # First humid-climate city (pilot). Eastern DST -> tz-aware bucketing.
        "utc_offset": -5,
        "tz": "America/New_York",
        "diurnal": {"sids": ("99999913874", "72219013874"),
                    "station": "Atlanta Hartsfield-Jackson Intl", "first_year": 1948},
    },
    "hou": {
        "key": "hou",
        "prefix": "hou",
        "sid": "IAHthr 9",
        "rural_sid": "USC00412266",  # Danevang — rural coastal-plain control (cities.js rural.sid)
        "label": "Houston (ThreadEx IAHthr 9)",
        "record_start": "1889-01-01",
        "rural_ref": "rural countryside",
        "utc_offset": -6,
        "tz": "America/Chicago",
        "diurnal": {"sids": ("99999912960", "72243012960"),
                    "station": "Houston Intercontinental", "first_year": 1948},
    },
    "nola": {
        "key": "nola",
        "prefix": "nola",
        "sid": "MSYthr 9",
        "rural_sid": "USC00162534",  # Donaldsonville — rural delta control (cities.js rural.sid)
        "label": "New Orleans (ThreadEx MSYthr 9)",
        "record_start": "1946-01-01",
        "rural_ref": "rural countryside",
        "utc_offset": -6,
        "tz": "America/Chicago",
        "diurnal": {"sids": ("99999912916", "72231012916"),
                    "station": "New Orleans Intl (MSY)", "first_year": 1948},
    },
    "rdu": {
        "key": "rdu",
        "prefix": "rdu",
        "sid": "RDUthr 9",
        "rural_sid": "USC00311820",  # Clayton — rural Piedmont control (cities.js rural.sid)
        "label": "Raleigh (ThreadEx RDUthr 9)",
        "record_start": "1888-01-01",
        "rural_ref": "rural countryside",
        "utc_offset": -5,
        "tz": "America/New_York",
        "diurnal": {"sids": ("99999913722", "72306013722"),
                    "station": "Raleigh-Durham Intl", "first_year": 1948},
    },
    "dfw": {
        "key": "dfw",
        "prefix": "dfw",
        "sid": "DFWthr 9",
        "rural_sid": "USC00410984",  # Bowie — rural North-Texas-plains control (cities.js rural.sid)
        "label": "Dallas (ThreadEx DFWthr 9)",
        "record_start": "1899-01-01",
        "rural_ref": "rural countryside",
        "utc_offset": -6,
        "tz": "America/Chicago",
        "diurnal": {"sids": ("99999903927", "72259003927"),
                    "station": "Dallas-Fort Worth Intl", "first_year": 1948},
    },
    "boi": {
        "key": "boi",
        "prefix": "boi",
        "sid": "BOIthr 9",
        "rural_sid": "USC00102942",  # Emmett — rural agricultural control (cities.js rural.sid)
        "label": "Boise (ThreadEx BOIthr 9)",
        "record_start": "1893-01-01",
        # Boise observes Mountain DST -> tz-aware hour bucketing.
        "utc_offset": -7,
        "tz": "America/Boise",
        # Idaho Power (IPCO) is the Boise metro's balancing authority (EIA-930).
        "grid": {"respondents": ("IPCO",),
                 "label": "IPCO (Idaho Power, EIA-930)"},
    },
    # --- First international city (Worldwide Phase B). No ACIS (US-only), so it
    # sources from NCEI GSOY via its GHCN-Daily id and renders in metric. Carries
    # only a yearly series + facts (GSOY is annual), so the daily/hourly cards
    # (streaks, heat-season, diurnal, grid) self-hide. Sydney Observatory Hill is
    # the GSOY-proven station (verify_v0 GHCN_INTL_SMOKE, +0.34 F/dec); Bathurst
    # Agricultural is a long-record rural-tablelands control (elevation offset noted
    # on the card — the honest signal is the gap's growth, not its size).
    "syd": {
        "key": "syd",
        "prefix": "syd",
        "source": "ghcn",            # NCEI GSOY, not ACIS
        "units": "metric",           # front-end renders °C
        "ghcn_sid": "ASN00066062",   # Sydney Observatory Hill (GSOY-proven)
        "rural_sid": "ASN00063005",  # Bathurst Agricultural — rural NSW tablelands control
        "rural_ref": "rural tablelands",
        "label": "Sydney (GHCN ASN00066062, Observatory Hill)",
        "record_start": "1970-01-01",
        "lat": -33.86,               # Southern Hemisphere
    },
    # Second international city (Worldwide Phase B). De Bilt is the Netherlands'
    # national reference station (KNMI), GSOY-proven reachable (verify_v0
    # GHCN_INTL_SMOKE, +0.59 F/dec night warming) — Europe + Northern Hemisphere, a
    # maritime-temperate counterpoint to Sydney. No clean rural pair (De Bilt is
    # itself the semi-rural national record), so it ships without urban_excess, like
    # the no-pair US cities. Same GSOY path: metric, a precomputed series + facts.
    "dbt": {
        "key": "dbt",
        "prefix": "dbt",
        "source": "ghcn",            # NCEI GSOY, not ACIS
        "units": "metric",           # front-end renders °C
        "ghcn_sid": "NLM00006260",   # De Bilt (KNMI national station; GSOY-proven)
        "label": "De Bilt (GHCN NLM00006260, KNMI Netherlands)",
        "record_start": "1970-01-01",
        "lat": 52.10,                # Northern Hemisphere
    },
}

# GHCN-Daily station ids (queried via NCEI Global-Summary-of-the-Year) for the
# worldwide Phase A parallel-source check (see WORLDWIDE.md). Format is
# "USW00" + zero-padded WBAN, derived from each city's modern ISD id above
# (e.g. Phoenix ISD 72278023183 -> WBAN 23183 -> USW00023183, the same station the
# existing GSOY check already uses). verify_v0.py asserts the GHCN-Daily-derived
# night-warming trend reproduces the ACIS one — the keystone that earns the right to
# trust a global GHCN backend before any non-US city ships. US-only by construction
# (GHCN "USW" network); international cities will carry their own GHCN ids.
_GHCN_SIDS = {
    "phx": "USW00023183", "tus": "USW00023160", "lv": "USW00023169",
    "ep": "USW00023044", "yum": "USW00023195", "rno": "USW00023185",
    "abq": "USW00023050", "slc": "USW00024127", "boi": "USW00024131",
    "atl": "USW00013874", "hou": "USW00012960", "nola": "USW00012916",
    "rdu": "USW00013722", "dfw": "USW00003927",
}
for _k, _g in _GHCN_SIDS.items():
    CITIES[_k]["ghcn_sid"] = _g

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


def source_of(city):
    """'acis' (US, the default) or 'ghcn' (international, via NCEI GSOY)."""
    return city.get("source", "acis")


def primary_sid(city):
    """The station id a builder queries for this city: the ACIS ThreadEx sid, or
    the GHCN-Daily id (GSOY) for international cities. Lets every CITIES consumer
    stay source-agnostic while the ACIS path stays byte-for-byte unchanged."""
    return city["ghcn_sid"] if source_of(city) == "ghcn" else city["sid"]
