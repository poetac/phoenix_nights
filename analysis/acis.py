#!/usr/bin/env python3
"""Shared ACIS/GSOY HTTP plumbing.

The ACIS StnData POST + NCEI GSOY GET boilerplate was copy-pasted across
analysis/*.py, with LAST_COMPLETE_YEAR/MAX_MISSING_DAYS redefined locally in
each file. This centralizes ONLY the request/response wire format — never
shared statistics, reduce selection, or parsing logic, so verify_v0.py's
independent reproduction of build_facts.py's numbers stays a real check (one
bug here could otherwise pass both a builder and its own verifier with no
local signal, undermining "reproduce or reject").

Stdlib only.
"""

import datetime
import json
import time
import urllib.request

ACIS_STNDATA = "https://data.rcc-acis.org/StnData"
GSOY_URL = "https://www.ncei.noaa.gov/access/services/data/v1"
USER_AGENT = "phoenix-nights/0.1"

MAX_MISSING_DAYS = 36
# Derived, not hardcoded: the most recent fully-elapsed calendar year.
LAST_COMPLETE_YEAR = datetime.date.today().year - 1


def retry(fn, attempts=3, backoff=3, fail_msg=None, sleep=time.sleep):
    """Call fn() up to `attempts` times, sleeping backoff*(attempt+1) seconds
    between failures (the idiom already used in build_diurnal.py/build_grid.py).
    On final failure, re-raises the original exception — unless `fail_msg` is
    given, in which case it raises RuntimeError(fail_msg) WITHOUT the original
    chained (`from None`): an HTTPError retains the request URL in `.url`, which
    for an EIA call carries the api_key query param, so this keeps a secret out
    of a CI traceback. `sleep` is injectable so tests never really sleep."""
    for attempt in range(attempts):
        try:
            return fn()
        except Exception:
            if attempt == attempts - 1:
                if fail_msg:
                    raise RuntimeError(fail_msg) from None
                raise
            sleep(backoff * (attempt + 1))


def build_stndata_request(sid, sdate, edate, elems):
    """The ACIS StnData POST request every builder/verify constructs by hand
    today. Pure and testable — builds the Request object, touches no network."""
    body = json.dumps({"sid": sid, "sdate": sdate, "edate": edate, "elems": elems}).encode()
    return urllib.request.Request(ACIS_STNDATA, data=body,
                                  headers={"Content-Type": "application/json"})


def acis_stndata(sid, sdate, edate, elems, timeout=120, retries=1):
    """POST an ACIS StnData request, return the parsed "data" array.

    `retries` defaults to 1 (no retry): a real upstream failure should stay an
    immediate, loud failure for a builder or an offline-gated verify check.
    Callers that want resilience (verify_v0.py's live checks) pass retries>1
    explicitly — never bundled in as a silent default here.
    """
    req = build_stndata_request(sid, sdate, edate, elems)

    def _do():
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r)["data"]

    return retry(_do, attempts=retries) if retries > 1 else _do()


def gsoy_rows(sid, start_year, end_year=None, timeout=90):
    """NCEI Global-Summary-of-the-Year rows for a GHCN-Daily station, from
    start_year through end_year (default LAST_COMPLETE_YEAR)."""
    end_year = LAST_COMPLETE_YEAR if end_year is None else end_year
    url = (f"{GSOY_URL}?dataset=global-summary-of-the-year&stations={sid}"
           f"&startDate={start_year}-01-01&endDate={end_year}-12-31"
           "&units=standard&format=json")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)
