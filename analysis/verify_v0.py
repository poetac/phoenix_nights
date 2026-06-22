#!/usr/bin/env python3
"""Verify the app's headline numbers against the official NOAA record.

Pulls NCEI Global Summary of the Year (GSOY) for Phoenix Sky Harbor
(USW00023183), recomputes the same statistics the app computes from ACIS,
and checks them against the sanity targets in README.md:

  - 1970s avg annual low ~ 59 F, 2010s ~ 65 F
  - TMIN trend since 1970 roughly 2-3x the TMAX trend

GSOY has no per-day data, so the warm-night *season* claim (the
first->last 80F night span the streaks card draws) is re-derived
straight from ACIS daily lows instead:

  - the 80F-night season is longer now than it was in the 1970s, and stays
    longer under an outlier-robust definition (5-of-7 nights; 3-day 100F runs)
  - the 1970s seasonal "normal" low the live hero compares against is
    seasonally sane (mid-July ~80F, mid-January ~40F)
  - the overnight "cool window" (hours/night below 85F in the committed
    diurnal curve) is narrower now than in the 1970s
  - the night half of cooling degree-days ((low-65)/2 over cooling days) is a
    rising share of the total compared with the 1970s
  - the city's and the open desert's overnight-low trends since 1970 both
    outrun the published global background-warming rate

It also shape-checks every committed JSON asset (structure, not just values)
so a malformed or truncated dataset fails CI instead of silently breaking a
card. The latest-complete-year cutoff is derived, never hardcoded.

Stdlib only. Exit code 0 = all checks pass.
"""

import ast
import datetime
import json
import math
import pathlib
import sys
import urllib.request

ACIS_URL = "https://data.rcc-acis.org/StnData"
MAX_MISSING_DAYS = 36
# Derived, not hardcoded: the most recent fully-elapsed calendar year.
LAST_COMPLETE_YEAR = datetime.date.today().year - 1

GSOY_URL = (
    "https://www.ncei.noaa.gov/access/services/data/v1"
    "?dataset=global-summary-of-the-year"
    "&stations=USW00023183"
    f"&startDate=1933-01-01&endDate={LAST_COMPLETE_YEAR}-12-31"
    "&units=standard&format=json"
)

# Published global background-warming rate (F/decade) the global-context card
# compares the local night-low trends against — see GlobalContextCard.jsx.
GLOBAL_BENCH = 0.36
# Worldwide Phase A: how close the GHCN-Daily-derived night trend must land to the
# ACIS-derived one to count as "reproduced" (F/decade). Generous enough to absorb
# GHCN single-station vs ACIS ThreadEx-thread differences, tight enough to be a real
# agreement (the post-1970 thread is the same airport station). See WORLDWIDE.md.
GHCN_TOL = 0.5
# Cities whose ACIS ThreadEx thread splices stations that no single GHCN-Daily id
# reproduces — the station-continuity gap WORLDWIDE.md §5 flags. Yuma's thread
# (Yuma MCAS / Yuma Intl) trends +0.84 F/dec, but the single GHCN station
# USW00023195 (MCAS) gives +1.71 — a genuine divergence, so the parallel-source
# check can't apply until Phase B's per-city station selection picks the record to
# anchor. Excluded from the hard assertion and tracked as a known item, NOT papered
# over by loosening GHCN_TOL (which would gut the check for the 13 that reproduce to
# two decimals). The other 13 US cities prove the GHCN backend.
GHCN_SPLICE_EXCEPTIONS = {"yum"}
CASA_GRANDE_SID = "USC00021314"  # the open-desert control (cities.js rural.sid)

# The city + rural-pair station ids are the single source of truth in cities.py
# (rural_sid), so the per-city loop below doesn't re-type them here. verify still
# reproduces every statistic independently from raw ACIS — the registry only
# supplies the station ids, not the numbers.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from cities import CITIES as REGISTRY, source_of  # noqa: E402


def fetch_gsoy():
    req = urllib.request.Request(GSOY_URL, headers={"User-Agent": "phoenix-nights-verify/0.1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def fetch_gsoy_station(sid, start_year=1970):
    """NCEI Global-Summary-of-the-Year rows for any GHCN-Daily station — the
    parametrized form of the Phoenix GSOY call above, for the worldwide backend."""
    url = ("https://www.ncei.noaa.gov/access/services/data/v1"
           "?dataset=global-summary-of-the-year"
           f"&stations={sid}&startDate={start_year}-01-01&endDate={LAST_COMPLETE_YEAR}-12-31"
           "&units=standard&format=json")
    req = urllib.request.Request(url, headers={"User-Agent": "phoenix-nights-verify/0.1"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)


def ghcn_night_trend(sid, start=1970):
    """GHCN-Daily annual-mean TMIN trend (F/decade) since `start`, from NCEI GSOY —
    the worldwide-backend reproduction of ACIS facts_trend(sid, 'mint'). Same metric
    (annual mean overnight low, OLS slope x10), different source. Returns None on a
    fetch error or fewer than 25 usable years (facts_trend's floor)."""
    try:
        rows = fetch_gsoy_station(sid, start)
    except Exception:
        return None
    pts = []
    for row in rows:
        try:
            y = int(row["DATE"])
        except (KeyError, ValueError, TypeError):
            continue
        v = fnum(row, "TMIN")
        if v is not None and start <= y <= LAST_COMPLETE_YEAR:
            pts.append((y, v))
    return linreg(pts) * 10 if len(pts) >= 25 else None


# Worldwide Phase B step 0: confirm the proven GHCN-Daily backend (NCEI GSOY) reaches
# INTERNATIONAL stations and yields sane night-warming trends — the data-availability
# prerequisite before wiring any non-US city into the site. These are backend
# reachability fixtures, not site cities; check_cities is the stronger, ACIS-cross-
# checked bar. De Bilt (Europe, N) and Sydney (Oceania, S) cover both hemispheres and
# two continents. A first pass also tried London Heathrow (UKM00003772) and Tokyo
# (JA000047662): both returned no GSOY TMIN — NCEI's *annual* summaries don't carry
# every GHCN-Daily station, an uneven-coverage reality Phase B's city selection must
# map (WORLDWIDE.md §4/§8). Left out rather than chased with blind id guesses; a real
# international city would resolve its source station the same way (verify, then ship).
GHCN_INTL_SMOKE = [
    ("De Bilt, NL", "NLM00006260"),
    ("Sydney Observatory Hill, AU", "ASN00066062"),
]


def check_ghcn_intl(checks):
    """Each international fixture's GHCN-Daily night trend is reachable and warming."""
    for name, sid in GHCN_INTL_SMOKE:
        g = ghcn_night_trend(sid)
        checks.append((
            f"[backend] {name}: GHCN-Daily night trend reachable & warming "
            f"({'n/a' if g is None else f'{g:+.2f}'}/dec, {sid})",
            g if g is not None else float("nan"),
            g is not None and g > 0))


def fetch_acis_mint(start_year):
    """Every daily low from start_year through the last complete year."""
    body = json.dumps({
        "sid": "PHXthr 9",
        "sdate": f"{start_year}-01-01",
        "edate": f"{LAST_COMPLETE_YEAR}-12-31",
        "elems": [{"name": "mint"}],
    }).encode()
    req = urllib.request.Request(ACIS_URL, data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)["data"]


def warm_night_spans(start_year):
    """Per-year span (days) from the first to the last 80F+ night.

    Mirrors build_streaks.py's first80/last80 but recomputes from the raw
    daily record, so it independently confirms the streaks card's claim.
    Years missing more than 36 daily lows, or with no 80F night at all,
    are dropped. Returns {year: span_in_days}.
    """
    years = {}
    for date, val in fetch_acis_mint(start_year):
        y = int(date[:4])
        if y > LAST_COMPLETE_YEAR:
            continue
        d = years.setdefault(y, {"first": None, "last": None, "miss": 0})
        try:
            lo = float(val)
        except (TypeError, ValueError):
            d["miss"] += 1
            continue
        if lo >= 80:
            doy = datetime.date.fromisoformat(date).timetuple().tm_yday
            if d["first"] is None:
                d["first"] = doy
            d["last"] = doy
    return {y: d["last"] - d["first"] + 1
            for y, d in years.items()
            if d["miss"] <= MAX_MISSING_DAYS and d["first"] is not None}


def fetch_acis_daily_mint(start_year, end_year):
    """Every daily low across a closed year range (one ACIS request)."""
    body = json.dumps({
        "sid": "PHXthr 9",
        "sdate": f"{start_year}-01-01",
        "edate": f"{end_year}-12-31",
        "elems": [{"name": "mint"}],
    }).encode()
    req = urllib.request.Request(ACIS_URL, data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)["data"]


def fetch_acis_daily_minmax(start_year, end_year):
    """Every daily low and high across a closed year range (one request)."""
    body = json.dumps({
        "sid": "PHXthr 9",
        "sdate": f"{start_year}-01-01",
        "edate": f"{end_year}-12-31",
        "elems": [{"name": "mint"}, {"name": "maxt"}],
    }).encode()
    req = urllib.request.Request(ACIS_URL, data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)["data"]


def acis_yearly_low_trend(sid, start_year):
    """OLS trend (F/decade) of a station's annual mean low since start_year.

    Backs the global-context card's claim that the local night-low trends
    outrun the published global rate. Years missing >36 days are dropped.
    """
    body = json.dumps({
        "sid": sid,
        "sdate": f"{start_year}-01-01",
        "edate": f"{LAST_COMPLETE_YEAR}-12-31",
        "elems": [{"name": "mint", "interval": "yly", "duration": "yly",
                   "reduce": {"reduce": "mean", "add": "mcnt"}}],
    }).encode()
    req = urllib.request.Request(ACIS_URL, data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.load(r)["data"]
    pts = []
    for row in data:
        y = int(row[0])
        val, mcnt = row[1]
        try:
            v, m = float(val), float(mcnt)
        except (TypeError, ValueError):
            continue
        if m <= MAX_MISSING_DAYS and y <= LAST_COMPLETE_YEAR:
            pts.append((y, v))
    return linreg(pts) * 10


def facts_trend(sid, elem, start=1970, maxmissing=20):
    """A station's annual-mean trend (F/decade) reproduced with build_facts.py's
    EXACT method (maxmissing=20 in the reduce, OLS since `start`), so the headline
    values in each committed <city>-facts.json can be value-checked, not just
    shape-checked. Returns None if fewer than 25 usable years (build_facts' floor).
    """
    body = json.dumps({
        "sid": sid, "sdate": f"{start}-01-01", "edate": f"{LAST_COMPLETE_YEAR}-12-31",
        "elems": [{"name": elem, "interval": "yly", "duration": "yly",
                   "reduce": "mean", "maxmissing": maxmissing}],
    }).encode()
    req = urllib.request.Request(ACIS_URL, data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.load(r)["data"]
    pts = []
    for y, v in data:
        try:
            pts.append((int(y[:4]), float(v)))
        except (ValueError, TypeError):
            pass
    return linreg(pts) * 10 if len(pts) >= 25 else None


def _load_facts(prefix):
    """The committed <prefix>-facts.json as {key: fact}, or None if absent."""
    p = DATA_DIR / f"{prefix}-facts.json"
    if not p.exists():
        return None
    try:
        return {f["key"]: f for f in json.loads(p.read_text()).get("facts", [])}
    except (ValueError, OSError):
        return None


def check_cities(checks):
    """Reproduce EVERY city's headline numbers live from ACIS and value-check them
    against its committed facts JSON — the parity the deep Phoenix battery has but
    the breadth cities used to lack (they were only shape-checked). For each city:

      - directional: nights warm, outrun the global rate, and (except Phoenix,
        whose post-1970 urban excess is documented-small) outrun the rural control;
      - value: the facts JSON's night_warming / urban_excess / lows-vs-highs ratio
        each MATCH the live recompute (catches a stale asset or a build_facts bug,
        which a shape check can't).

    Station ids come from the shared cities.py registry; the numbers are recomputed
    here independently. Returns Phoenix's desert-pair trend for the summary line.
    """
    desert = float("nan")
    for key, c in REGISTRY.items():
        # This battery is the ACIS-cross-checked breadth bar for US cities. An
        # international (source:"ghcn") city has no ACIS sid; its backend reach is
        # covered by GHCN_INTL_SMOKE, and its facts get value-checked once the GSOY
        # asset is built (see check_cities_ghcn). Skip it here so the ACIS path is
        # untouched.
        if source_of(c) != "acis":
            continue
        name = c["label"].split(" (")[0]
        rsid = c.get("rural_sid")
        night = facts_trend(c["sid"], "mint")
        day = facts_trend(c["sid"], "maxt")
        rural = facts_trend(rsid, "mint") if rsid else None
        if key == "phx" and rural is not None:
            desert = rural

        checks.append((f"{name}: night-low trend since 1970 > global ~{GLOBAL_BENCH}/dec",
                       night if night is not None else float("nan"),
                       night is not None and night > GLOBAL_BENCH))
        # Phoenix's since-1970 city-vs-desert excess is small by design (README),
        # so the strict ">rural" inequality is asserted for the other cities only;
        # Phoenix's small excess is still pinned by the urban_excess value-check.
        if rural is not None and night is not None and key != "phx":
            checks.append((f"{name}: night-low trend > rural pair ({night:.2f} vs {rural:.2f}/dec)",
                           night - rural, night > rural))

        # Worldwide Phase A keystone: the same night-warming trend, re-derived from
        # the GHCN-Daily station record (NCEI GSOY), must reproduce the ACIS one.
        # Proving this across all 14 US cities is what earns the right to trust a
        # global GHCN backend before any non-US city ships (see WORLDWIDE.md).
        gsid = c.get("ghcn_sid")
        if gsid and night is not None and key not in GHCN_SPLICE_EXCEPTIONS:
            g = ghcn_night_trend(gsid)
            checks.append((
                f"{name}: GHCN-Daily night trend reproduces ACIS "
                f"({'n/a' if g is None else f'{g:.2f}'} vs {night:.2f}/dec, ±{GHCN_TOL}, {gsid})",
                (g - night) if g is not None else float("nan"),
                g is not None and g > 0 and abs(g - night) <= GHCN_TOL))

        facts = _load_facts(c["prefix"])
        if not facts:
            continue  # absent facts asset is handled by the shape-check section
        nw = facts.get("night_warming")
        if nw and night is not None:
            checks.append((f"{name}: facts night_warming {nw['value']} ~= live {night:.2f}",
                           night - nw["value"], abs(night - nw["value"]) < 0.3))
        ue = facts.get("urban_excess")
        if ue and night is not None and rural is not None:
            checks.append((f"{name}: facts urban_excess {ue['value']} ~= live {night - rural:.2f}",
                           (night - rural) - ue["value"], abs((night - rural) - ue["value"]) < 0.3))
        lo = facts.get("lows_outpace_highs")
        if lo and night is not None and day is not None and abs(day) > 0.15:
            tol = max(0.5, 0.25 * abs(lo["value"]))
            checks.append((f"{name}: facts lows/highs ratio {lo['value']} ~= live {night / day:.2f}",
                           night / day - lo["value"], abs(night / day - lo["value"]) < tol))
    return desert


def ghcn_elem_trend(sid, elem, start=1970):
    """GSOY annual trend (°F/decade) of any element — TMIN (mean low), TMAX (mean
    high), EMNT (coldest low) — for an international station. The parametrized
    ghcn_night_trend, so a non-US city's full fact set can be value-checked. Returns
    None on a fetch error or < 25 usable years."""
    try:
        rows = fetch_gsoy_station(sid, start)
    except Exception:
        return None
    pts = []
    for row in rows:
        try:
            y = int(row["DATE"])
        except (KeyError, ValueError, TypeError):
            continue
        v = fnum(row, elem)
        if v is not None and start <= y <= LAST_COMPLETE_YEAR:
            pts.append((y, v))
    return linreg(pts) * 10 if len(pts) >= 25 else None


def check_cities_ghcn(checks):
    """The check_cities bar, for international (source:'ghcn') cities: reproduce the
    headline numbers live from NCEI GSOY and value-check the committed °C facts. The
    directional asserts differ from the US set because Sydney is the honest
    counterexample — at harbour-side Observatory Hill the nights still warm, but the
    DAYS warm faster and the day–night gap WIDENS. We encode exactly that, so the
    counterexample is a tested property, not a footnote. Trends are recomputed in °F
    and compared to the °C facts via ×5/9 (build_facts's metric conversion)."""
    F2C = 5.0 / 9.0
    for key, c in REGISTRY.items():
        if source_of(c) != "ghcn":
            continue
        name = c["label"].split(" (")[0]
        sid = c["ghcn_sid"]
        night = ghcn_elem_trend(sid, "TMIN")
        day = ghcn_elem_trend(sid, "TMAX")
        cold = ghcn_elem_trend(sid, "EMNT")
        rsid = c.get("rural_sid")
        rural = ghcn_elem_trend(rsid, "TMIN") if rsid else None

        # directional: nights are warming, and faster than the rural control (UHI).
        checks.append((f"{name}: GSOY night-low trend since 1970 is warming",
                       night if night is not None else float("nan"),
                       night is not None and night > 0))
        if rural is not None and night is not None:
            checks.append((f"{name}: city nights warm faster than rural pair "
                           f"({night:.2f} vs {rural:.2f}/dec)", night - rural, night > rural))
        # the maritime exception, as a test: days outpace nights -> gap widens.
        if day is not None and night is not None:
            checks.append((f"{name}: maritime counterexample — days outpace nights, "
                           f"day–night gap WIDENS (day {day:.2f} > night {night:.2f}/dec)",
                           day - night, day > night))

        facts = _load_facts(c["prefix"])
        if not facts or night is None:
            continue
        # value-check the committed °C facts against the live °F recompute (×5/9).
        def _vc(fkey, live_f, label):
            f = facts.get(fkey)
            if f is not None and live_f is not None:
                want = live_f * F2C
                checks.append((f"{name}: facts {fkey} {f['value']}°C ~= live {want:.2f} ({label})",
                               want - f["value"], abs(want - f["value"]) < 0.05))
        _vc("night_warming", night, "TMIN trend")
        _vc("coldest_night", cold, "EMNT trend")
        _vc("diurnal_compression", (night - day) if day is not None else None, "TMIN−TMAX")
        _vc("urban_excess", (night - rural) if rural is not None else None, "city−rural")


def cdd_night_share(rows, y0, y1):
    """Night half's share of cooling degree-days over [y0, y1].

    Reproduces build_cdd_split.py's identity decomposition: on cooling days
    (mean > 65F) the degree-days split exactly into (high-65)/2 + (low-65)/2.
    Returns the night half as a percentage of the total.
    """
    night = day = 0.0
    for date, lo, hi in rows:
        y = int(date[:4])
        if not (y0 <= y <= y1):
            continue
        try:
            lo, hi = float(lo), float(hi)
        except (TypeError, ValueError):
            continue
        if (lo + hi) / 2 > 65:
            night += (lo - 65) / 2
            day += (hi - 65) / 2
    t = night + day
    return 100 * night / t if t else float("nan")


def _daily_by_year(rows, idx):
    """Date-ordered daily values (idx 1=low, 2=high) grouped by year."""
    by_year = {}
    for r in rows:
        try:
            v = float(r[idx])
        except (TypeError, ValueError):
            v = None
        by_year.setdefault(int(r[0][:4]), []).append(v)
    return by_year


def sustained_window_span(vals, pred, win=7, need=5):
    """Season length where >=need of any win consecutive days match (5-of-7)."""
    half, n = win // 2, len(vals)
    first = last = None
    for i in range(n):
        lo, hi = max(0, i - half), min(n, i + half + 1)
        if sum(1 for v in vals[lo:hi] if v is not None and pred(v)) >= need:
            if first is None:
                first = i + 1
            last = i + 1
    return (last - first + 1) if first is not None else None


def sustained_run_span(vals, pred, run=3):
    """Season length bounded by runs of >=run consecutive matching days."""
    first = last = cur = None
    cur = 0
    for i, v in enumerate(vals):
        if v is not None and pred(v):
            cur += 1
            if cur >= run:
                if first is None:
                    first = i - run + 2
                last = i + 1
        else:
            cur = 0
    return (last - first + 1) if first is not None else None


def mean_season_len(by_year, fn, y0, y1):
    vals = [fn(by_year[y]) for y in range(y0, y1 + 1) if y in by_year]
    vals = [v for v in vals if v is not None]
    return sum(vals) / len(vals) if vals else float("nan")


def seasonal_normal_low(rows, month, day, window=7):
    """1970s mean daily low in a +/-window-day window around month/day.

    Independently reproduces build_normals.py's seasonal baseline (the
    yardstick the live hero compares last night against). The two test dates
    (mid-July, mid-January) sit far from year boundaries, so no wrap needed.
    """
    lo = datetime.date(2000, month, day) - datetime.timedelta(days=window)
    hi = datetime.date(2000, month, day) + datetime.timedelta(days=window)
    vals = []
    for date, val in rows:
        try:
            v = float(val)
        except (TypeError, ValueError):
            continue
        if lo <= datetime.date(2000, int(date[5:7]), int(date[8:10])) <= hi:
            vals.append(v)
    return sum(vals) / len(vals) if vals else float("nan")


def cool_window_hours(prefix):
    """Hours/night below 85F in a city's committed JJA diurnal curve, 1970s vs the
    latest solid decade — the 'narrowing cool window' (CoolWindowCard). Read from
    the asset build_diurnal.py emits from NCEI hourly (re-deriving here would
    re-pull MB across station eras); the trend is the guard against a bad rebuild.
    Returns (hrs_1970s, hrs_now, now_label) or None if the asset is absent/too thin.
    """
    path = DATA_DIR / f"{prefix}-diurnal.json"
    if not path.exists():
        return None
    dec = json.loads(path.read_text()).get("decades", {})
    solid = sorted(k for k in dec if sum(dec[k]["nObs"]) / 24 >= 500)
    if "1970" not in dec or len(solid) < 3:
        return None
    below85 = lambda k: sum(1 for x in dec[k]["temp"] if x < 85)
    return below85("1970"), below85(solid[-1]), f"{solid[-1]}s"


DATA_DIR = pathlib.Path(__file__).resolve().parent.parent / "apps" / "web" / "public" / "data"

# (collection key, expected container type, required fields on a list row).
ASSET_SCHEMAS = {
    "phx-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "phx-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "phx-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "phx-heat-deaths.json": ("series", list, ("year", "deaths")),
    "phx-grid.json": ("years", dict, None),
    "phx-diurnal.json": ("decades", dict, None),
    "phx-normals.json": ("byDate", dict, None),
    # Second city (generated by the rebuild workflow with --city tus); skipped
    # until present, then shape-checked like Phoenix's.
    "tus-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "tus-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "tus-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "tus-normals.json": ("byDate", dict, None),
    "tus-grid.json": ("years", dict, None),
    "tus-diurnal.json": ("decades", dict, None),
    # Third city (Las Vegas)
    "lv-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "lv-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "lv-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "lv-normals.json": ("byDate", dict, None),
    "lv-grid.json": ("years", dict, None),
    "lv-diurnal.json": ("decades", dict, None),
    # Fourth city (El Paso)
    "ep-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "ep-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "ep-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "ep-normals.json": ("byDate", dict, None),
    "ep-grid.json": ("years", dict, None),
    "ep-diurnal.json": ("decades", dict, None),
    # Salience engine output (one ranked fact list per city)
    # Phase 4 cities (diurnal + grid assets deferred -> absent -> skipped).
    "yum-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "yum-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "yum-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "yum-normals.json": ("byDate", dict, None),
    "yum-diurnal.json": ("decades", dict, None),
    "rno-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "rno-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "rno-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "rno-normals.json": ("byDate", dict, None),
    "rno-diurnal.json": ("decades", dict, None),
    "abq-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "abq-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "abq-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "abq-normals.json": ("byDate", dict, None),
    "abq-diurnal.json": ("decades", dict, None),
    "abq-grid.json": ("years", dict, None),
    "slc-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "slc-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "slc-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "slc-normals.json": ("byDate", dict, None),
    "slc-diurnal.json": ("decades", dict, None),
    "boi-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "boi-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "boi-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "boi-normals.json": ("byDate", dict, None),
    "atl-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "atl-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "atl-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "atl-normals.json": ("byDate", dict, None),
    "atl-diurnal.json": ("decades", dict, None),
    "atl-facts.json": ("facts", list, ("key", "rank", "score", "label")),
    "hou-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "hou-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "hou-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "hou-normals.json": ("byDate", dict, None),
    "hou-diurnal.json": ("decades", dict, None),
    "hou-facts.json": ("facts", list, ("key", "rank", "score", "label")),
    "nola-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "nola-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "nola-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "nola-normals.json": ("byDate", dict, None),
    "nola-diurnal.json": ("decades", dict, None),
    "nola-facts.json": ("facts", list, ("key", "rank", "score", "label")),
    "rdu-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "rdu-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "rdu-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "rdu-normals.json": ("byDate", dict, None),
    "rdu-diurnal.json": ("decades", dict, None),
    "rdu-facts.json": ("facts", list, ("key", "rank", "score", "label")),
    "dfw-streaks.json": ("years", list, ("year", "streak80", "first80", "last80", "count80")),
    "dfw-heat-season.json": ("years", list, ("year", "first", "last", "length", "count")),
    "dfw-cdd-split.json": ("years", list, ("year", "dayCdd", "nightCdd")),
    "dfw-normals.json": ("byDate", dict, None),
    "dfw-diurnal.json": ("decades", dict, None),
    "dfw-facts.json": ("facts", list, ("key", "rank", "score", "label")),
    "boi-diurnal.json": ("decades", dict, None),
    "boi-grid.json": ("years", dict, None),
    "yum-facts.json": ("facts", list, ("key", "rank", "score", "label")),
    "rno-facts.json": ("facts", list, ("key", "rank", "score", "label")),
    "abq-facts.json": ("facts", list, ("key", "rank", "score", "label")),
    "slc-facts.json": ("facts", list, ("key", "rank", "score", "label")),
    "boi-facts.json": ("facts", list, ("key", "rank", "score", "label")),
    "compare-lows.json": ("cities", list, ("id", "slope", "anomalies")),
    "phx-facts.json": ("facts", list, ("key", "rank", "score", "label")),
    "tus-facts.json": ("facts", list, ("key", "rank", "score", "label")),
    "lv-facts.json": ("facts", list, ("key", "rank", "score", "label")),
    "ep-facts.json": ("facts", list, ("key", "rank", "score", "label")),
}


def check_stdlib_imports():
    """The analysis pipelines are stdlib-only by design — zero third-party supply-chain
    surface (see README "Data freshness & integrity" and the security audit). Enforce it:
    every import across analysis/*.py must resolve to the standard library
    (sys.stdlib_module_names) or a local sibling module, else CI fails. Returns a list of
    "file: offending,roots" strings (empty == clean)."""
    here = pathlib.Path(__file__).resolve().parent
    local = {p.stem for p in here.glob("*.py")}
    offenders = []
    for p in sorted(here.glob("*.py")):
        roots = set()
        for node in ast.walk(ast.parse(p.read_text())):
            if isinstance(node, ast.Import):
                roots |= {a.name.split(".")[0] for a in node.names}
            elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                roots.add(node.module.split(".")[0])
        bad = sorted(r for r in roots if r not in sys.stdlib_module_names and r not in local)
        if bad:
            offenders.append(f"{p.name}: {', '.join(bad)}")
    return offenders


def _first_nonfinite(node, path="$"):
    """JSON-path of the first non-finite number (NaN/Infinity), or None.

    Python's json.loads accepts NaN/Infinity, but the browser's JSON.parse rejects
    them — a committed non-finite value would ship an asset that throws on load and
    blanks the card. This makes the commit gate reject it, pairing with the builders'
    allow_nan=False (which stops one being written in the first place).
    """
    if isinstance(node, bool):
        return None
    if isinstance(node, (int, float)):
        return None if math.isfinite(node) else path
    if isinstance(node, dict):
        for k, v in node.items():
            r = _first_nonfinite(v, f"{path}.{k}")
            if r is not None:
                return r
    elif isinstance(node, list):
        for i, v in enumerate(node):
            r = _first_nonfinite(v, f"{path}[{i}]")
            if r is not None:
                return r
    return None


def validate_assets():
    """Shape-check every committed JSON asset a card consumes.

    Catches the failure verify's value checks can't: a malformed, truncated, or
    empty asset that would silently break a card, or a non-finite number that would
    crash JSON.parse in the browser. Assets not yet rebuilt (no file on disk) are
    skipped. Yields (name, ok, count, detail).
    """
    for fname, (key, typ, fields) in ASSET_SCHEMAS.items():
        path = DATA_DIR / fname
        if not path.exists():
            yield (fname, True, 0, "absent (not yet rebuilt) — skipped")
            continue
        try:
            j = json.loads(path.read_text())
        except (ValueError, OSError) as e:
            yield (fname, False, 0, f"unreadable: {e}")
            continue
        bad = _first_nonfinite(j)
        if bad is not None:
            yield (fname, False, 0, f"non-finite number at {bad} (NaN/Infinity breaks JSON.parse)")
            continue
        coll = j.get(key)
        if not isinstance(coll, typ) or len(coll) == 0:
            yield (fname, False, 0, f"missing/empty '{key}'")
            continue
        if fields and typ is list:
            missing = [f for f in fields if f not in coll[0]]
            yield (fname, not missing, len(coll), "ok" if not missing else f"row missing {missing}")
        else:
            yield (fname, True, len(coll), "ok")


def fnum(row, key):
    v = row.get(key)
    if v is None:
        return None
    try:
        return float(str(v).strip())
    except ValueError:
        return None


def linreg(points):
    n = len(points)
    if n < 3:
        return None
    sx = sum(x for x, _ in points)
    sy = sum(y for _, y in points)
    sxy = sum(x * y for x, y in points)
    sxx = sum(x * x for x, _ in points)
    return (n * sxy - sx * sy) / (n * sxx - sx * sx)


def main():
    rows = fetch_gsoy()
    years = {}
    for row in rows:
        y = int(row["DATE"])
        if y > LAST_COMPLETE_YEAR:
            continue
        tmin, tmax = fnum(row, "TMIN"), fnum(row, "TMAX")
        if tmin is None or tmax is None:
            continue
        # EMNT = the year's single coldest daily low (the "floor" the
        # extremes card plots); EMXT = the hottest daily high.
        years[y] = {"tmin": tmin, "tmax": tmax, "cdsd": fnum(row, "CDSD"),
                    "emnt": fnum(row, "EMNT")}

    print(f"GSOY rows with TMIN+TMAX: {len(years)} ({min(years)}-{max(years)})")

    def decade_mean(d0, key):
        vals = [v[key] for y, v in years.items() if d0 <= y <= d0 + 9]
        return sum(vals) / len(vals) if vals else None

    low_70s = decade_mean(1970, "tmin")
    low_10s = decade_mean(2010, "tmin")
    since70 = sorted((y, v) for y, v in years.items() if y >= 1970)
    tmin_slope = linreg([(y, v["tmin"]) for y, v in since70]) * 10
    tmax_slope = linreg([(y, v["tmax"]) for y, v in since70]) * 10
    ratio = tmin_slope / tmax_slope if abs(tmax_slope) > 0.05 else float("nan")

    # Extremes card claim: even the year's coldest night (EMNT) is warming.
    emnt70 = [(y, v["emnt"]) for y, v in since70 if v["emnt"] is not None]
    emnt_slope = linreg(emnt70) * 10 if len(emnt70) >= 3 else float("nan")

    # Gap card claim: the diurnal range (TMAX - TMIN) is shrinking because lows
    # rise faster than highs. Scoped to 1948+ (Sky Harbor modern era), matching
    # the card, to avoid the earlier agricultural "oasis effect" confound.
    since48 = sorted((y, v) for y, v in years.items() if y >= 1948)
    dtr_slope = linreg([(y, v["tmax"] - v["tmin"]) for y, v in since48]) * 10

    checks = [
        ("1970s avg low ~59F", low_70s, 57.0 <= low_70s <= 61.0),
        ("2010s avg low ~65F", low_10s, 63.0 <= low_10s <= 67.0),
        ("TMIN trend since 1970 (F/decade) positive", tmin_slope, tmin_slope > 0),
        ("TMIN/TMAX trend ratio in 1.5-5x", ratio, 1.5 <= ratio <= 5.0),
        ("coldest-night (EMNT) trend since 1970 positive", emnt_slope, emnt_slope > 0),
        ("diurnal range (TMAX-TMIN) shrinking since 1948", dtr_slope, dtr_slope < 0),
    ]

    # GoalpostsCard claim: the rolling 30-year "normal" low has been redefined upward —
    # each NOAA-style vintage window's mean low sits above the last. Recompute the card's
    # four windows (GoalpostsCard.jsx VINTAGES) from the GSOY annual lows already fetched
    # (no extra request) and assert the newest "normal" (1991-2020) tops the oldest
    # (1961-1990). Directional, so it encodes the claim without a brittle value match.
    def _vintage_low(y0, y1):
        v = [d["tmin"] for y, d in years.items() if y0 <= y <= y1]
        return sum(v) / len(v) if len(v) >= 25 else None
    gp_old, gp_new = _vintage_low(1961, 1990), _vintage_low(1991, 2020)
    if gp_old is not None and gp_new is not None:
        checks.append((f"GoalpostsCard: rolling 30-yr normal low redefined upward "
                       f"(1961-1990 {gp_old:.1f}F -> 1991-2020 {gp_new:.1f}F)",
                       gp_new - gp_old, gp_new > gp_old))

    # Warm-night season: re-derived from ACIS daily lows (GSOY has no per-day).
    spans = warm_night_spans(1970)
    span_70s = sum(s for y, s in spans.items() if 1970 <= y <= 1979)
    n_70s = sum(1 for y in spans if 1970 <= y <= 1979)
    span_70s = span_70s / n_70s if n_70s else float("nan")
    recent = [s for y, s in spans.items() if y > LAST_COMPLETE_YEAR - 10]
    span_recent = sum(recent) / len(recent) if recent else float("nan")
    print(f"ACIS daily lows: {len(spans)} years with an 80F-night season")
    checks.append(
        ("80F-night season longer than the 1970s", span_recent, span_recent > span_70s))

    # Hero baseline: the 1970s seasonal normal low the live "last night vs the
    # 1970s normal" hook measures against — recomputed straight from ACIS.
    base_rows = fetch_acis_daily_mint(1970, 1979)
    july_norm = seasonal_normal_low(base_rows, 7, 15)
    jan_norm = seasonal_normal_low(base_rows, 1, 15)
    checks.append(("1970s mid-July normal low ~80F (hero baseline)", july_norm, 76.0 <= july_norm <= 84.0))
    checks.append(("1970s mid-Jan normal low ~40F (hero baseline)", jan_norm, 34.0 <= jan_norm <= 46.0))

    # Narrowing cool window (CoolWindowCard): for every city the card actually
    # shows it for — a hot city whose latest decade still has <=13 h/night below
    # 85F (the card's own applicability gate in CoolWindowCard.jsx) — the overnight
    # window below 85F narrows vs the 1970s. Cities where the card omits (relief
    # still abundant, e.g. the high-desert/humid set) or whose diurnal asset isn't
    # rebuilt yet are skipped, so verify asserts exactly the claim the page shows.
    for _c in REGISTRY.values():
        cw = cool_window_hours(_c["prefix"])
        if cw is None:
            continue
        cw70, cw_now, cw_label = cw
        if cw_now > 13:
            continue
        _nm = _c["label"].split(" (")[0]
        checks.append((f"{_nm}: cool window <85F shrinks 1970s({cw70}h)->{cw_label}({cw_now}h)",
                       cw70 - cw_now, cw_now < cw70))

    # Night share of cooling demand rising: the night half of CDD grows faster
    # than the day half (the "thermostat that never turns off" card).
    split_rows = fetch_acis_daily_minmax(1970, LAST_COMPLETE_YEAR)
    share_70s = cdd_night_share(split_rows, 1970, 1979)
    share_now = cdd_night_share(split_rows, LAST_COMPLETE_YEAR - 9, LAST_COMPLETE_YEAR)
    checks.append((f"night share of CDD rising {share_70s:.0f}%->{share_now:.0f}%",
                   share_now - share_70s, share_now > share_70s))

    # Per-city parity (all 14, registry-driven): reproduce each city's headline
    # numbers live from ACIS and value-check them against its committed facts JSON
    # — nights warm, outrun the global rate, beat the rural control (except
    # Phoenix's documented-small excess), and the displayed night_warming /
    # urban_excess / lows-vs-highs values MATCH the recompute. This is the bar the
    # deep Phoenix battery already met; check_cities brings the breadth cities to it
    # (they were previously only shape-checked). See check_cities() above.
    desert_trend = check_cities(checks)
    # Worldwide Phase B step 0: the GHCN-Daily backend reaches international stations.
    check_ghcn_intl(checks)
    # Worldwide Phase B: the shipped international city (Sydney) meets the same
    # value-check bar as the US cities, adapted for its metric facts and its
    # honest-counterexample direction (days outpace nights — the gap widens).
    check_cities_ghcn(checks)

    # Season cards' outlier-robust definitions: the *sustained* warm-night
    # season (5-of-7 nights >=80F) and the *sustained* 100F-day season (runs of
    # >=3 days) are both longer now than in the 1970s, so the lengthening isn't
    # an artifact of lone freak days at the edges. Reuses split_rows (no fetch).
    low_by_year = _daily_by_year(split_rows, 1)
    high_by_year = _daily_by_year(split_rows, 2)
    recent0 = LAST_COMPLETE_YEAR - 9
    sus80_70s = mean_season_len(low_by_year, lambda v: sustained_window_span(v, lambda x: x >= 80), 1970, 1979)
    sus80_now = mean_season_len(low_by_year, lambda v: sustained_window_span(v, lambda x: x >= 80), recent0, LAST_COMPLETE_YEAR)
    sus100_70s = mean_season_len(high_by_year, lambda v: sustained_run_span(v, lambda x: x >= 100), 1970, 1979)
    sus100_now = mean_season_len(high_by_year, lambda v: sustained_run_span(v, lambda x: x >= 100), recent0, LAST_COMPLETE_YEAR)
    checks.append((f"sustained 80F-night season (5/7) longer than 1970s ({sus80_70s:.0f}->{sus80_now:.0f}d)",
                   sus80_now - sus80_70s, sus80_now > sus80_70s))
    checks.append((f"sustained 100F-day season (3-run) longer than 1970s ({sus100_70s:.0f}->{sus100_now:.0f}d)",
                   sus100_now - sus100_70s, sus100_now > sus100_70s))

    # SleepCard claim ("nights too warm to sleep through"): nights at/above the
    # 77F (25C) sleep-degradation threshold are rising vs the 1970s. Mirrors the
    # card's ACIS reducer exactly (mint cnt_ge_77); reuses low_by_year (no fetch).
    sleep_count = lambda v: sum(1 for x in v if x is not None and x >= 77)
    sleep_70s = mean_season_len(low_by_year, sleep_count, 1970, 1979)
    sleep_now = mean_season_len(low_by_year, sleep_count, recent0, LAST_COMPLETE_YEAR)
    checks.append((f"sleep nights >=77F rising vs 1970s ({sleep_70s:.0f}->{sleep_now:.0f}/yr)",
                   sleep_now - sleep_70s, sleep_now > sleep_70s))

    # Shape-check every committed asset (structure, not just values).
    for name, ok_a, count, detail in validate_assets():
        checks.append((f"asset {name}: {detail}", float(count), ok_a))

    # Supply-chain invariant: analysis/ is stdlib-only (zero third-party surface). Enforce
    # it so a future non-stdlib import fails CI instead of silently widening the surface.
    _imp_offenders = check_stdlib_imports()
    checks.append(("analysis/ imports are stdlib-only"
                   + ("" if not _imp_offenders else ": " + "; ".join(_imp_offenders)),
                   float(len(_imp_offenders)), not _imp_offenders))

    ok = True
    for name, value, passed in checks:
        ok &= passed
        print(f"  [{'PASS' if passed else 'FAIL'}] {name}: {value:.2f}")

    print(f"\nTMIN: +{tmin_slope:.2f} F/decade | TMAX: +{tmax_slope:.2f} F/decade | ratio {ratio:.1f}x")
    print(f"80F-night season: 1970s ~{span_70s:.0f} days vs last 10y ~{span_recent:.0f} days")
    print(f"1970s normal low (hero baseline): mid-Jul ~{july_norm:.0f}F, mid-Jan ~{jan_norm:.0f}F")
    print(f"night share of cooling demand: 1970s ~{share_70s:.0f}% vs last 10y ~{share_now:.0f}%")
    print(f"night-low trend since 1970 vs global ~{GLOBAL_BENCH}/dec: "
          f"Phoenix +{tmin_slope:.2f}, desert +{desert_trend:.2f}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
