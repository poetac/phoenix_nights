#!/usr/bin/env python3
"""Offline unit tests for analysis/assetio.py — the shared committed-JSON write
helper (M8 #10). Pure filesystem logic; a tempfile round-trip, no network.

Run with:

    python3 -m unittest discover -s analysis/tests
"""

import json
import os
import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import assetio  # noqa: E402


class WriteJson(unittest.TestCase):
    def test_creates_parent_dirs(self):
        with tempfile.TemporaryDirectory() as d:
            path = pathlib.Path(d) / "nested" / "dir" / "out.json"
            assetio.write_json(path, {"a": 1})
            self.assertTrue(path.exists())

    def test_round_trip_preserves_key_order_and_values(self):
        with tempfile.TemporaryDirectory() as d:
            path = pathlib.Path(d) / "out.json"
            payload = {"generated": "2026-01-01", "throughYear": 2025, "years": [{"year": 2025}]}
            assetio.write_json(path, payload)
            # Key order preserved in the raw text (not just equal after parsing) —
            # a reordering would make every commit diff unreviewable.
            raw = path.read_text()
            self.assertLess(raw.index('"generated"'), raw.index('"throughYear"'))
            self.assertLess(raw.index('"throughYear"'), raw.index('"years"'))
            self.assertEqual(json.loads(raw), payload)

    def test_indent_matches_every_builder_today(self):
        with tempfile.TemporaryDirectory() as d:
            path = pathlib.Path(d) / "out.json"
            assetio.write_json(path, {"a": 1})
            expected = json.dumps({"a": 1}, indent=1, allow_nan=False)
            self.assertEqual(path.read_text(), expected)

    def test_rejects_non_finite_values(self):
        with tempfile.TemporaryDirectory() as d:
            path = pathlib.Path(d) / "out.json"
            with self.assertRaises(ValueError):
                assetio.write_json(path, {"a": float("nan")})


if __name__ == "__main__":
    unittest.main()
