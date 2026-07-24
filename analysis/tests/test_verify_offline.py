#!/usr/bin/env python3
"""Regression fence for verify_v0.py's offline/live split (M8 #14): proves
run_offline_checks() has zero network dependency, regardless of what future
edits touch — the exact bug that let an ACIS/NCEI outage fail CI on PRs that
never touched data (the offline shape/finiteness/stdlib checks sat after an
unguarded live fetch, so they never even ran to report anything).

Run with:

    python3 -m unittest discover -s analysis/tests

Stdlib only — importing verify_v0 never touches the network (its module-level
code is just constants + a sibling import; main() is __main__-gated).
"""

import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import verify_v0  # noqa: E402


class OfflineChecksAreNetworkFree(unittest.TestCase):
    def test_runs_and_returns_checks_with_urlopen_disabled(self):
        with patch("urllib.request.urlopen", side_effect=AssertionError("network touched")):
            checks = verify_v0.run_offline_checks()
        self.assertGreater(len(checks), 0)
        for name, value, passed in checks:
            self.assertIsInstance(name, str)
            self.assertIsInstance(passed, bool)

    def test_all_offline_checks_pass_against_the_committed_tree(self):
        # Not just "didn't crash" — the actual committed assets/imports are clean.
        checks = verify_v0.run_offline_checks()
        failed = [name for name, value, passed in checks if not passed]
        self.assertEqual(failed, [])


if __name__ == "__main__":
    unittest.main()
