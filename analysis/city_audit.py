#!/usr/bin/env python3
"""Vet a candidate metro for the desert-UHI dashboard: PASS / REVISE / REJECT.

The registry plumbing to add a city is cheap; the data integrity is not. This
audits a candidate against the bar the existing cities meet, so adding a city is
a vetted decision rather than a manual slog:

  1. the city ThreadEx record reaches the 1970s baseline;
  2. the city's overnight-low (TMIN) trend since 1970 beats the published global
     background rate (~0.36 F/decade) — a real urban warming signal;
  3. a usable *arid rural* reference exists nearby — a long-record station whose
     night-low warms slower than the city's, so the control experiment holds;
  4. it reports the elevation delta (a caveat, not a blocker), and whether an ISD
     station (diurnal card) and an EIA balancing authority (grid card) are wired.
  5. it predicts CARD-FIT: which premise-gated cards (tropical-nights, the 100F-day
     season, night-cooling-share) will actually apply, using the SAME thresholds as
     analysis/build_facts.py and the card guards — the El Paso lesson made a
     checklist (high-elevation cities have cool 1970s nights, so night-cooling-share
     goes <=0 and that card, plus its share image, must omit).

Auto-suggests the rural pair by scanning a ring around the city for long TMIN
records and ranking by record length, distance, and (slower) warming.

Stdlib only. Usage: python3 analysis/city_audit.py [name ...]   (default: all)
"""

import concurrent.futures as cf
import datetime
import json
import sys
import urllib.request

# Derived, never hardcoded: the most recent fully-elapsed calendar year and the
# trailing-decade window — mirrors build_facts.py so the audit's card-fit
# prediction tracks the real pipeline as years roll over.
LAST_COMPLETE_YEAR = datetime.date.today().year - 1
RECENT0 = LAST_COMPLETE_YEAR - 9

ACIS = "https://data.rcc-acis.org"
GLOBAL_BENCH = 0.36  # F/decade, published global background rate (matches verify_v0)

# Candidate arid/interior-West metros. city = ThreadEx sid; ring = +/- degrees to
# search for a rural pair; isd = (pre1973, modern) ISD ids; ba = EIA-930 respondent.
CANDIDATES = {
    "El Paso, TX":   dict(city="ELPthr 9", ll=(31.81, -106.38), ring=0.8,
                          isd=("99999923044", "72270023044"), ba="EPE", dst=True),
    "Albuquerque, NM": dict(city="ABQthr 9", ll=(35.04, -106.62), ring=0.9,
                          isd=("99999923050", "72365023050"), ba="PNM", dst=True),
    "Reno, NV":      dict(city="RNOthr 9", ll=(39.48, -119.77), ring=0.9,
                          isd=("99999923185", "72488023185"), ba="NEVP", dst=True),
    "Yuma, AZ":      dict(city="YUMthr 9", ll=(32.66, -114.61), ring=0.9,
                          isd=("99999923195", "69002003145"), ba="WALC", dst=False),
    "Boise, ID":     dict(city="BOIthr 9", ll=(43.57, -116.22), ring=0.9,
                          isd=("99999924131", "72681024131"), ba="IPCO", dst=True),
    "Salt Lake City, UT": dict(city="SLCthr 9", ll=(40.79, -111.98), ring=0.9,
                          isd=("99999924127", "72572024127"), ba="PACE", dst=True),
    "Bakersfield, CA": dict(city="BFLthr 9", ll=(35.43, -119.05), ring=0.8,
                          isd=("99999923155", "72384023155"), ba="CISO", dst=True),
}


def _post(path, body):
    req = urllib.request.Request(ACIS + path, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=60))


def yearly_low(sid, start=1970, maxmissing=20):
    body = {"sid": sid, "sdate": f"{start}-01-01", "edate": f"{LAST_COMPLETE_YEAR}-12-31",
            "elems": [{"name": "mint", "interval": "yly", "duration": "yly",
                       "reduce": "mean", "maxmissing": maxmissing}]}
    pts = []
    for y, v in _post("/StnData", body).get("data", []):
        try:
            pts.append((int(y[:4]), float(v)))
        except (ValueError, TypeError):
            pass
    return pts


def trend(pts):
    if len(pts) < 25:
        return None
    n = len(pts); sx = sum(x for x, _ in pts); sy = sum(y for _, y in pts)
    sxx = sum(x * x for x, _ in pts); sxy = sum(x * y for x, y in pts)
    return (n * sxy - sx * sy) / (n * sxx - sx * sx) * 10


def record_start(sid):
    meta = _post("/StnMeta", {"sids": sid, "meta": ["valid_daterange"],
                              "elems": [{"name": "mint", "interval": "yly"}]}).get("meta", [])
    dr = meta[0].get("valid_daterange") if meta else None
    return int(dr[0][0][:4]) if dr and dr[0] else None


def rural_candidates(lat, lon, ring, city_sid):
    """Scan a ring around the city for long-record stations; rank as rural refs."""
    bbox = f"{lon-ring},{lat-ring},{lon+ring},{lat+ring}"
    meta = _post("/StnMeta", {"bbox": bbox, "meta": ["name", "sids", "ll", "elev", "valid_daterange"],
                              "elems": [{"name": "mint", "interval": "yly", "duration": "yly"}]}).get("meta", [])
    cands = []
    for s in meta:
        dr = s.get("valid_daterange", [[]])
        rng = dr[0] if dr and dr[0] else None
        if not rng:
            continue
        sy, ey = int(rng[0][:4]), int(rng[1][:4])
        if sy > 1972 or ey < 2024:
            continue
        ghcn = [x.split()[0] for x in s.get("sids", []) if "USC00" in x or "USW00" in x]
        if not ghcn:
            continue
        sl = s.get("ll") or [lon, lat]
        dist = round(((sl[0]-lon)**2 + (sl[1]-lat)**2) ** 0.5 * 69)  # ~miles
        if dist < 12:   # too close to the urban core to be a rural reference
            continue
        cands.append(dict(sid=ghcn[0], name=s["name"], elev=s.get("elev"), dist=dist))
    # fetch trends in parallel, keep the long, slow-warming, far ones
    def fill(c):
        p = yearly_low(c["sid"])
        c["trend"] = trend(p); c["n"] = len(p)
        return c
    with cf.ThreadPoolExecutor(max_workers=10) as ex:
        cands = [c for c in ex.map(fill, cands) if c["trend"] is not None and c["n"] >= 35]
    # prefer farther + slower-warming (a good rural reference) + long record
    cands.sort(key=lambda c: (c["trend"], -c["dist"]))
    return cands[:3]


def check_isd(isd):
    for sid in reversed(isd):  # modern first
        y = 2020 if not sid.startswith("999") else 1965
        u = (f"https://www.ncei.noaa.gov/access/services/data/v1?dataset=global-hourly"
             f"&stations={sid}&startDate={y}-07-01&endDate={y}-07-02&dataTypes=TMP&format=csv")
        try:
            t = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "pn/0.1"}), timeout=40).read()
            if t.count(b"\n") > 5:
                return True
        except Exception:
            pass
    return False


def check_eia(ba):
    import os
    key = os.environ.get("EIA_API_KEY")
    if not key:
        return None  # unknown without a key
    import urllib.parse
    p = {"api_key": key, "frequency": "hourly", "data[0]": "value",
         "facets[respondent][]": ba, "facets[type][]": "D",
         "start": "2024-07-01T00", "end": "2024-07-02T00", "length": 50}
    u = "https://api.eia.gov/v2/electricity/rto/region-data/data/?" + urllib.parse.urlencode(p)
    try:
        return len(json.load(urllib.request.urlopen(u, timeout=40))["response"]["data"]) > 10
    except Exception:
        return False


def card_fit(city_sid):
    """Predict which premise-gated cards will apply for a candidate, using the
    SAME thresholds as analysis/build_facts.py + the live card guards. One daily
    ACIS request; mirrors build_streaks (count80/count100) and build_cdd_split
    (the day/night CDD identity over cooling days, mean>65F)."""
    body = {"sid": city_sid, "sdate": "1970-01-01", "edate": f"{LAST_COMPLETE_YEAR}-12-31",
            "elems": [{"name": "mint"}, {"name": "maxt"}]}
    years = {}
    for date, lo, hi in _post("/StnData", body).get("data", []):
        y = int(date[:4])
        d = years.setdefault(y, dict(c80=0, c100=0, day=0.0, night=0.0, miss=0))
        if lo in ("M", "T", None) or hi in ("M", "T", None):
            d["miss"] += 1
            continue
        lo, hi = float(lo), float(hi)
        if lo >= 80:
            d["c80"] += 1
        if hi >= 100:
            d["c100"] += 1
        if (lo + hi) / 2 > 65:            # a cooling day (matches build_cdd_split)
            d["day"] += (hi - 65) / 2
            d["night"] += (lo - 65) / 2
    good = {y: d for y, d in years.items() if d["miss"] <= 36}

    def dec_mean(y0, y1, k):
        v = [good[y][k] for y in good if y0 <= y <= y1]
        return sum(v) / len(v) if v else None

    def night_share(y0, y1):
        rows = [good[y] for y in good if y0 <= y <= y1]
        tot = sum(r["day"] + r["night"] for r in rows)
        return 100 * sum(r["night"] for r in rows) / tot if tot else None

    return dict(
        trop_now=dec_mean(RECENT0, LAST_COMPLETE_YEAR, "c80"), trop_70s=dec_mean(1970, 1979, "c80"),
        hot_now=dec_mean(RECENT0, LAST_COMPLETE_YEAR, "c100"), hot_70s=dec_mean(1970, 1979, "c100"),
        nshare_70s=night_share(1970, 1979), nshare_now=night_share(RECENT0, LAST_COMPLETE_YEAR),
    )


def audit(name, c):
    out = [f"\n=== {name} ==="]
    cs = record_start(c["city"])
    cp = yearly_low(c["city"])
    ct = trend(cp)
    if ct is None or cs is None or cs > 1971:
        out.append(f"  city {c['city']}: record from {cs}, n={len(cp)} since 1970 — INSUFFICIENT")
        return "REJECT", out
    out.append(f"  city {c['city']}: record from {cs} | night-low {ct:+.2f} F/dec since 1970 "
               f"({'> ' if ct > GLOBAL_BENCH else '!< '}global {GLOBAL_BENCH})")
    rurals = rural_candidates(c["ll"][0], c["ll"][1], c["ring"], c["city"])
    if rurals:
        out.append("  rural-pair candidates (slowest-warming first):")
        for r in rurals:
            gap = ct - r["trend"]
            out.append(f"    {r['sid']} {r['name'][:24]:24} elev {r['elev']} ~{r['dist']}mi "
                       f"| {r['trend']:+.2f}/dec | gap {gap:+.2f}")
    best = rurals[0] if rurals else None
    isd_ok = check_isd(c["isd"])
    eia_ok = check_eia(c["ba"])
    out.append(f"  diurnal ISD: {'yes' if isd_ok else 'NO'} | grid EIA {c['ba']}: "
               f"{'yes' if eia_ok else ('no' if eia_ok is False else 'unknown(no key)')} "
               f"| DST: {c['dst']}")
    # card-fit: which premise-gated cards this city's page will actually show
    cf = card_fit(c["city"])
    trop_ok = cf["trop_now"] is not None and cf["trop_now"] >= 5
    hot_ok = cf["hot_now"] is not None and cf["hot_now"] >= 10
    nc_ok = cf["nshare_70s"] is not None and cf["nshare_70s"] > 0
    pf = lambda v, s="%.0f": "n/a" if v is None else (s % v)
    out.append("  card-fit (build_facts thresholds + card guards):")
    out.append(f"    tropical-nights {'fits ' if trop_ok else 'OMITS'} ~{pf(cf['trop_now'])}/yr now "
               f"(1970s ~{pf(cf['trop_70s'])}; needs >=5)")
    out.append(f"    100F-day-season {'fits ' if hot_ok else 'OMITS'} ~{pf(cf['hot_now'])}/yr now "
               f"(1970s ~{pf(cf['hot_70s'])}; needs >=10)")
    out.append(f"    night-cooling   {'fits ' if nc_ok else 'OMITS'} baseline share "
               f"{pf(cf['nshare_70s'], '%+.1f')}%, now {pf(cf['nshare_now'], '%+.1f')}% (needs 1970s>0)")
    omit = [n for n, ok in (("tropical-nights", trop_ok), ("100F-day-season", hot_ok),
                            ("night-cooling", nc_ok)) if not ok]
    if omit:
        out.append(f"    -> page omits: {', '.join(omit)} (engine guards handle this automatically)")
    # verdict
    signal = ct > GLOBAL_BENCH
    control = best is not None and ct > best["trend"]
    if signal and control:
        verdict = "PASS"
    elif signal and best:
        verdict = "REVISE"   # signal ok but city not clearly > pair
    else:
        verdict = "REJECT"
    out.append(f"  VERDICT: {verdict}"
               + ("" if best is None else f" (pair {best['sid']}, gap {ct-best['trend']:+.2f}/dec)"))
    return verdict, out


def main():
    names = sys.argv[1:] or list(CANDIDATES)
    results = {}
    for n in names:
        key = next((k for k in CANDIDATES if n.lower() in k.lower()), None)
        if not key:
            print(f"unknown candidate: {n}"); continue
        v, lines = audit(key, CANDIDATES[key])
        results[key] = v
        print("\n".join(lines))
    print("\n=== SUMMARY ===")
    for k, v in results.items():
        print(f"  {v:7} {k}")


if __name__ == "__main__":
    main()
