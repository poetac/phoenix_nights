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
from cities import CITIES, DATA_DIR  # noqa: E402

ACIS = "https://data.rcc-acis.org/StnData"
GLOBAL_BENCH = 0.36  # F/decade


def _yearly(sid, elem, reduce_, start=1970, maxmissing=20):
    body = {"sid": sid, "sdate": f"{start}-01-01", "edate": "2025-12-31",
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
    sid = city["sid"]
    facts = {}
    mint = _yearly(sid, "mint", "mean")
    maxt = _yearly(sid, "maxt", "mean")
    emnt = _yearly(sid, "mint", "min")
    night, night_sig = linreg(mint)
    day, _ = linreg(maxt)
    cold, cold_sig = linreg(emnt)

    if night is not None:
        facts["night_warming"] = dict(
            label=f"Summer nights are warming {night:+.2f}°F per decade",
            value=round(night, 2), unit="°F/decade", magnitude=night,
            significant=night_sig, bench=GLOBAL_BENCH)
    if night and day:
        facts["lows_outpace_highs"] = dict(
            label=f"Overnight lows are rising {night/day:.1f}× as fast as afternoon highs"
            if day > 0 else "Overnight lows rise while afternoon highs barely move",
            value=round(night / day, 1) if day > 0 else None, unit="× ratio",
            magnitude=(night - day), significant=night_sig)
        facts["diurnal_compression"] = dict(
            label=f"The day–night temperature gap is shrinking {abs(night-day):.2f}°F per decade",
            value=round(night - day, 2), unit="°F/decade", magnitude=abs(night - day),
            significant=night_sig)
    if cold is not None:
        facts["coldest_night"] = dict(
            label=f"Even the coldest night of the year is warming {cold:+.2f}°F per decade",
            value=round(cold, 2), unit="°F/decade", magnitude=cold, significant=cold_sig)

    # control: city night-low trend minus its open-desert reference
    ref = city.get("rural") if isinstance(city.get("rural"), dict) else None
    # cities.py registries don't carry the JS rural; derive from known pairs below
    REF = {"phx": "USC00021314", "tus": "USC00027619", "lv": "USC00262243",
           "ep": "USC00299686", "yum": "USW00003125", "rno": "USC00048758",
           "abq": "USC00295150", "slc": "USC00429133", "boi": "USC00102942"}
    rsid = REF.get(city["key"])
    if rsid and night is not None:
        rtrend, _ = linreg(_yearly(rsid, "mint", "mean"))
        if rtrend is not None:
            facts["urban_excess"] = dict(
                label=f"City nights are warming {night-rtrend:+.2f}°F/decade faster than the nearby open desert",
                value=round(night - rtrend, 2), unit="°F/decade", magnitude=night - rtrend,
                significant=night_sig and night > rtrend, vs_reference=round(rtrend, 2))

    # asset-derived facts (1970s vs last decade), with applicability guards
    def load(asset):
        p = DATA_DIR / f"{city['prefix']}-{asset}.json"
        return json.loads(p.read_text()) if p.exists() else None
    streaks = load("streaks")
    if streaks:
        b = _decade_mean(streaks["years"], "count80", 1970, 1979)
        r = _decade_mean(streaks["years"], "count80", 2016, 2025)
        if r is not None and r >= 5:  # applicability: a non-trivial count today
            facts["tropical_nights"] = dict(
                label=f"{round(r)} nights a year now stay at or above 80°F (was {round(b or 0)} in the 1970s)",
                value=round(r), unit="nights", baseline=round(b or 0), magnitude=(r - (b or 0)),
                significant=True)
    heat = load("heat-season")
    if heat:
        b = _decade_mean(heat["years"], "count", 1970, 1979)
        r = _decade_mean(heat["years"], "count", 2016, 2025)
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
        b, r = share(1970, 1979), share(2016, 2025)
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
