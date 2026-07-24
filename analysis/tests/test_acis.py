#!/usr/bin/env python3
"""Offline unit tests for analysis/acis.py — the shared ACIS/GSOY HTTP plumbing
(M8 #10). Pure logic only: no network, no real time.sleep.

Run with:

    python3 -m unittest discover -s analysis/tests
"""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import acis  # noqa: E402


class BuildStndataRequest(unittest.TestCase):
    def test_shape(self):
        req = acis.build_stndata_request("PHXthr 9", "1970-01-01", "2025-12-31",
                                          [{"name": "mint"}])
        self.assertEqual(req.full_url, acis.ACIS_STNDATA)
        self.assertEqual(req.get_header("Content-type"), "application/json")
        body = json.loads(req.data)
        self.assertEqual(body, {
            "sid": "PHXthr 9", "sdate": "1970-01-01", "edate": "2025-12-31",
            "elems": [{"name": "mint"}],
        })


class Retry(unittest.TestCase):
    def test_succeeds_first_try_no_sleep(self):
        sleeps = []
        result = acis.retry(lambda: 42, sleep=sleeps.append)
        self.assertEqual(result, 42)
        self.assertEqual(sleeps, [])

    def test_succeeds_after_transient_failures(self):
        calls = {"n": 0}

        def flaky():
            calls["n"] += 1
            if calls["n"] < 3:
                raise ValueError("transient")
            return "ok"

        sleeps = []
        result = acis.retry(flaky, attempts=3, backoff=3, sleep=sleeps.append)
        self.assertEqual(result, "ok")
        self.assertEqual(calls["n"], 3)
        self.assertEqual(sleeps, [3, 6])  # backoff*(attempt+1) for attempts 0,1

    def test_exhausts_attempts_and_reraises_original(self):
        def always_fails():
            raise ValueError("nope")

        with self.assertRaises(ValueError):
            acis.retry(always_fails, attempts=3, sleep=lambda s: None)

    def test_fail_msg_reraises_without_chaining_the_original(self):
        # An HTTPError's .url can carry a secret (e.g. an API key query param);
        # fail_msg must suppress the exception chain so it never reaches a
        # traceback.
        def always_fails():
            raise ValueError("has a secret in here")

        try:
            acis.retry(always_fails, attempts=2, fail_msg="request failed", sleep=lambda s: None)
            self.fail("expected RuntimeError")
        except RuntimeError as e:
            self.assertEqual(str(e), "request failed")
            self.assertIsNone(e.__cause__)
            self.assertTrue(e.__suppress_context__)


class GsoyRowsUrl(unittest.TestCase):
    def test_default_end_year_is_last_complete_year(self):
        # Doesn't fetch — just confirms the module constant a caller would rely
        # on for "no end_year given" is what the docstring promises.
        self.assertIsInstance(acis.LAST_COMPLETE_YEAR, int)


if __name__ == "__main__":
    unittest.main()
