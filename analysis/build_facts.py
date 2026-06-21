#!/usr/bin/env python3
"""Salience engine: rank each city's climate facts so its page leads with its own.

Computes the SAME verified metric battery for every registered city, scores each
fact by how notable it is (magnitude * significance, plus a cross-city rank
bonus), drops facts whose premise doesn't hold for that city (the El Paso
card-fit lesson, generalized), and writes a ranked apps/web/public/data/
<prefix>-facts.json per city.

The point: "Phoenix = nights" should EMERGE from the data (Phoenix tops the
tropical-night and night-cooling facts), not be hand-coded — and other cities
surface their own leaders (Tucson = the clean urban-vs-desert excess, Las Vegas
= the fastest night warming, ...).

Builds ALL cities in one run (cross-city ranking needs the whole set). Stdlib
only. Usage: python3 analysis/build_facts.py
"""

import datetime
import json
import sys
import urllib.request

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from cities import CITIES, DATA_DIR, source_of, primary_sid  # noqa: E402

ACIS = "https://data.rcc-acis.org/StnData"
GSOY = "https://www.ncei.noaa.gov/access/services/data/v1"  # NCEI Global-Summary-of-the-Year
GLOBAL_BENCH = 0.36  # F/decade
# Derived, never hardcoded: the most recent fully-elapsed calendar year, and the
# trailing-decade window the "...now, was X in the 1970s" facts compare against.
# (Keeping these derived is the guarantee README/verify advertise; a literal year
# here would silently freeze the salience engine after the next year rolls over.)
LAST_COMPLETE_YEAR = datetime.date.today().year - 1
RECENT0 = LAST_COMPLETE_YEAR - 9


def _yearly(sid, elem, reduce_, start=1970, maxmissing=20):
    body = {"sid": sid, "sdate": f"{start}-01-01", "edate": f"{LAST_COMPLETE_YEAR}-12-31",
            "elems": [{"name": elem, "interval": "yly", "duration": "yly",
                       "reduce": reduce_, "maxmissing": maxmissing}]}
    req = urllib.request.Request(ACIS, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    out = []
    for y, v in json.load(urllib.request.urlopen(req, timeout=60)).get("data", []):
        try:
            out.append((int(y[:4]), float(v)))
        except (ValueError, TypeError):
            pass
    return out


def _yearly_gsoy(sid, elem, start=1970):
    """Annual GSOY series [(year, value_F)] for an international (GHCN-Daily) station —
    the GSOY parallel of _yearly(), in °F (units=standard) so trends/magnitudes stay
    on the same scale as the ACIS cities. Elements: TMIN (annual mean daily low),
    TMAX (annual mean daily high), EMNT (extreme/coldest daily low)."""
    url = (f"{GSOY}?dataset=global-summary-of-the-year&stations={sid}"
           f"&startDate={start}-01-01&endDate={LAST_COMPLETE_YEAR}-12-31"
           f"&dataTypes={elem}&units=standard&format=json")
    req = urllib.request.Request(url, headers={"User-Agent": "phoenix-nights-build/0.1"})
    out = []
    for row in json.load(urllib.request.urlopen(req, timeout=90)):
        try:
            out.append((int(row["DATE"]), float(row[elem])))
        except (KeyError, ValueError, TypeError):
            pass
    return out


# Metric formatting for international cities: trends are computed and ranked in °F
# (the canonical scale, so cross-city magnitudes stay comparable), but a metric
# city's *labels and values* are rendered in °C. A trend/gap is a temperature
# DIFFERENCE, so it scales by 5/9 with no 32° offset.
def _deg(metric):
    return "°C" if metric else "°F"


def _d(v, metric):
    return v * 5 / 9 if metric else v


def linreg(pts):
    """Return (slope_per_decade, significant) via OLS with a t>2 slope test."""
    n = len(pts)
    if n < 25:
        return None, False
    xb = sum(x for x, _ in pts) / n
    yb = sum(y for _, y in pts) / n
    sxx = sum((x - xb) ** 2 for x, _ in pts)
    sxy = sum((x - xb) * (y - yb) for x, y in pts)
    if sxx == 0:
        return None, False
    b = sxy / sxx
    a = yb - b * xb
    resid = sum((y - (a + b * x)) ** 2 for x, y in pts)
    se = (resid / (n - 2) / sxx) ** 0.5 if resid > 0 else 1e-9
    return b * 10, abs(b / se) > 2 if se else True


def _decade_mean(rows, key, y0, y1):
    v = [r[key] for r in rows if y0 <= r["year"] <= y1]
    return sum(v) / len(v) if v else None


def compute_raw(city):
    """All candidate facts for one city (value, magnitude, significance, ref)."""
    metric = city.get("units") == "metric"
    ghcn = source_of(city) == "ghcn"
    sid = primary_sid(city)
    facts = {}
    if ghcn:  # international: NCEI GSOY annual series (TMIN/TMAX/EMNT), in °F
        mint = _yearly_gsoy(sid, "TMIN")
        maxt = _yearly_gsoy(sid, "TMAX")
        emnt = _yearly_gsoy(sid, "EMNT")
    else:     # US: ACIS yearly reduces (unchanged)
        mint = _yearly(sid, "mint", "mean")
        maxt = _yearly(sid, "maxt", "mean")
        emnt = _yearly(sid, "mint", "min")
    night, night_sig = linreg(mint)
    day, _ = linreg(maxt)
    cold, cold_sig = linreg(emnt)

    if night is not None:
        facts["night_warming"] = dict(
            label=f"Summer nights are warming {_d(night, metric):+.2f}{_deg(metric)} per decade",
            value=round(_d(night, metric), 2), unit=f"{_deg(metric)}/decade", magnitude=night,
            significant=night_sig, bench=GLOBAL_BENCH)
    if night and day:
        facts["lows_outpace_highs"] = dict(
            label=f"Overnight lows are rising {night/day:.1f}× as fast as afternoon highs"
            if day > 0 else "Overnight lows rise while afternoon highs barely move",
            value=round(night / day, 1) if day > 0 else None, unit="× ratio",
            magnitude=(night - day), significant=night_sig)
        # Day-night gap = DTR (high - low); its trend is (day - night). Nights
        # leading (night > day, every US city) shrinks the gap; days leading
        # (Sydney's harbour-moderated nights) widens it. Sign-aware so the label is
        # never false — the project's reproduce-or-reject bar applies to prose too.
        facts["diurnal_compression"] = dict(
            label=f"The day–night temperature gap is {'widening' if day > night else 'shrinking'} "
                  f"{abs(_d(night-day, metric)):.2f}{_deg(metric)} per decade",
            value=round(_d(night - day, metric), 2), unit=f"{_deg(metric)}/decade", magnitude=abs(night - day),
            significant=night_sig)
    if cold is not None:
        facts["coldest_night"] = dict(
            label=f"Even the coldest night of the year is warming {_d(cold, metric):+.2f}{_deg(metric)} per decade",
            value=round(_d(cold, metric), 2), unit=f"{_deg(metric)}/decade", magnitude=cold, significant=cold_sig)

    # control: city night-low trend minus its open-desert / rural reference. The
    # rural pair's station id is the single source of truth in cities.py (rural_sid).
    rsid = city.get("rural_sid")
    if rsid and night is not None:
        rtrend, _ = linreg(_yearly_gsoy(rsid, "TMIN") if ghcn else _yearly(rsid, "mint", "mean"))
        if rtrend is not None:
            facts["urban_excess"] = dict(
                label=f"City nights are warming {_d(night-rtrend, metric):+.2f}{_deg(metric)}/decade faster than the nearby {city.get('rural_ref', 'open desert')}",
                value=round(_d(night - rtrend, metric), 2), unit=f"{_deg(metric)}/decade", magnitude=night - rtrend,
                significant=night_sig and night > rtrend, vs_reference=round(_d(rtrend, metric), 2))

    # asset-derived facts (1970s vs last decade), with applicability guards
    def load(asset):
        p = DATA_DIR / f"{city['prefix']}-{asset}.json"
        return json.loads(p.read_text()) if p.exists() else None
    streaks = load("streaks")
    if streaks:
        b = _decade_mean(streaks["years"], "count80", 1970, 1979)
        r = _decade_mean(streaks["years"], "count80", RECENT0, LAST_COMPLETE_YEAR)
        if r is not None and r >= 5:  # applicability: a non-trivial count today
            facts["tropical_nights"] = dict(
                label=f"{round(r)} nights a year now stay at or above 80°F (was {round(b or 0)} in the 1970s)",
                value=round(r), unit="nights", baseline=round(b or 0), magnitude=(r - (b or 0)),
                significant=True)
    heat = load("heat-season")
    if heat:
        b = _decade_mean(heat["years"], "count", 1970, 1979)
        r = _decade_mean(heat["years"], "count", RECENT0, LAST_COMPLETE_YEAR)
        if r is not None and r >= 10:
            facts["hot_day_season"] = dict(
                label=f"{round(r)} days a year now reach 100°F (was {round(b or 0)} in the 1970s)",
                value=round(r), unit="days", baseline=round(b or 0), magnitude=(r - (b or 0)),
                significant=True)
    cdd = load("cdd-split")
    if cdd:
        def share(y0, y1):
            rows = [x for x in cdd["years"] if y0 <= x["year"] <= y1]
            tot = sum(x["dayCdd"] + x["nightCdd"] for x in rows)
            return 100 * sum(x["nightCdd"] for x in rows) / tot if tot else None
        b, r = share(1970, 1979), share(RECENT0, LAST_COMPLETE_YEAR)
        if b is not None and r is not None and b > 0:  # premise: positive baseline
            facts["night_cooling_share"] = dict(
                label=f"{round(r)}% of cooling demand now falls after dark (was {round(b)}% in the 1970s)",
                value=round(r), unit="%", baseline=round(b), magnitude=(r - b), significant=True)
    return facts


# per-fact magnitude scale (denominator) to normalise into ~0..1
SCALE = {"night_warming": 1.5, "lows_outpace_highs": 1.0, "diurnal_compression": 1.0,
         "coldest_night": 1.5, "urban_excess": 1.0, "tropical_nights": 80,
         "hot_day_season": 60, "night_cooling_share": 15}


def main():
    raw = {c["key"]: compute_raw(c) for c in CITIES.values()}
    # cross-city percentile per fact key (rewards "this city is the leader")
    keys = set().union(*[set(f) for f in raw.values()])
    pct = {}
    for k in keys:
        vals = sorted(abs(raw[ck][k]["magnitude"]) for ck in raw if k in raw[ck])
        for ck in raw:
            if k in raw[ck]:
                m = abs(raw[ck][k]["magnitude"])
                rank = sum(1 for v in vals if v <= m)
                pct.setdefault(ck, {})[k] = rank / len(vals)
    # score + rank per city
    for c in CITIES.values():
        ck = c["key"]
        out = []
        for k, f in raw[ck].items():
            mag_norm = min(1.0, abs(f["magnitude"]) / SCALE.get(k, 1.0))
            score = round(0.55 * mag_norm + 0.30 * pct[ck][k] + 0.15 * bool(f["significant"]), 3)
            out.append({"key": k, "score": score, "crossCityPercentile": round(pct[ck][k], 2),
                        **{kk: vv for kk, vv in f.items() if kk != "magnitude"}})
        out.sort(key=lambda d: -d["score"])
        for i, d in enumerate(out):
            d["rank"] = i + 1
        path = DATA_DIR / f"{c['prefix']}-facts.json"
        path.write_text(json.dumps({
            "city": c["key"], "name": c["label"],
            "generated": datetime.date.today().isoformat(),
            "facts": out,
        }, indent=1))
        top = out[0] if out else None
        print(f"{ck}: {len(out)} facts | TOP = {top['key'] if top else '-'} "
              f"(score {top['score'] if top else '-'}) :: {top['label'] if top else ''}")


if __name__ == "__main__":
    main()
