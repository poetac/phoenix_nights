#!/usr/bin/env python3
"""Offline unit tests for the builders' pure logic — the net under the numbers
that ACIS-driven CI can't reach.

The builders fetch live ACIS data in main(), but their core algorithms are pure
functions over a day-indexed series. Those are where the subtle bugs live (a
missing daily high once discarded an observed overnight low; day-of-year is the
1-based list index; the CDD split is an algebraic identity that must balance), so
they get a deterministic, network-free regression net here. Run with:

    python3 -m unittest discover -s analysis/tests

Stdlib only — no ACIS, no third-party deps — so it runs in the CI build job
alongside the node test suites, not the live verify-data job.
"""

import os
import sys
import unittest

# The builders live one directory up (analysis/); put it on the path so the
# pure functions import without ACIS ever being touched (main() is __main__-gated).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import build_streaks  # noqa: E402
import build_cdd_split  # noqa: E402


class MaxStreak(unittest.TestCase):
    """Longest run of consecutive matching days; None (a missing day) breaks it."""

    def pred(self, v):
        return v >= 80

    def test_empty(self):
        self.assertEqual(build_streaks.max_streak([], self.pred), 0)

    def test_no_match(self):
        self.assertEqual(build_streaks.max_streak([70, 60, 79], self.pred), 0)

    def test_all_match(self):
        self.assertEqual(build_streaks.max_streak([80, 85, 90], self.pred), 3)

    def test_longest_of_several_runs(self):
        # runs of 2, then 3 — the 3 wins
        vals = [85, 81, 70, 80, 82, 88, 60]
        self.assertEqual(build_streaks.max_streak(vals, self.pred), 3)

    def test_none_resets_run(self):
        # a missing day (None) must break the streak just like a sub-threshold day
        vals = [80, 81, None, 82, 83]
        self.assertEqual(build_streaks.max_streak(vals, self.pred), 2)

    def test_threshold_is_inclusive(self):
        # pred is v >= 80, so exactly 80 counts and 79 does not
        self.assertEqual(build_streaks.max_streak([79, 80, 79], self.pred), 1)


class SeasonSpan(unittest.TestCase):
    """First/last matching day-of-year (1-based index) and the count."""

    def pred(self, v):
        return v >= 80

    def test_nothing_matches(self):
        self.assertEqual(build_streaks.season_span([70, 60, None], self.pred),
                         (None, None, 0))

    def test_single_match_is_one_based(self):
        # index 0 -> day-of-year 1
        self.assertEqual(build_streaks.season_span([85], self.pred), (1, 1, 1))
        # match at index 2 -> day-of-year 3
        self.assertEqual(build_streaks.season_span([70, 60, 85], self.pred),
                         (3, 3, 1))

    def test_first_last_and_count_with_gaps(self):
        # vals: day1=70, day2=missing, day3=82, day4=missing, day5=85, day6=70
        # warm days are 3 and 5; the missing days neither count nor move the edges
        vals = [70, None, 82, None, 85, 70]
        self.assertEqual(build_streaks.season_span(vals, self.pred), (3, 5, 2))

    def test_none_is_not_counted(self):
        # the missing-high/observed-low fix relies on None placeholders preserving
        # day-of-year *without* being counted as warm nights
        vals = [None, 80, None, 80, None]
        self.assertEqual(build_streaks.season_span(vals, self.pred), (2, 4, 2))


class SustainedSpan(unittest.TestCase):
    """Outlier-robust season edges: a day counts only if >= need of the win-day
    window centered on it match. One isolated warm day can't open the season."""

    def pred(self, v):
        return v >= 1

    def test_isolated_match_does_not_open_season(self):
        # a single warm day in a sea of cool ones never reaches 5-of-7
        vals = [0, 0, 0, 1, 0, 0, 0]
        self.assertEqual(build_streaks.sustained_span(vals, self.pred),
                         (None, None))

    def test_solid_block_opens_and_closes(self):
        # 7 consecutive matches flanked by 3 cool days each side.
        # With win=7/need=5 the sustained window is days 5..9 (1-based).
        vals = [0, 0, 0] + [1] * 7 + [0, 0, 0]
        self.assertEqual(build_streaks.sustained_span(vals, self.pred), (5, 9))

    def test_none_counts_as_non_match(self):
        # a None inside an otherwise-solid block is treated as a miss, exactly
        # like a sub-threshold day, so it shrinks the sustained window: the same
        # block with a hole at its center narrows from (5, 9) to (6, 8).
        vals = [0, 0, 0] + [1, 1, 1, None, 1, 1, 1] + [0, 0, 0]
        self.assertEqual(build_streaks.sustained_span(vals, self.pred), (6, 8))


class SplitCoolingDay(unittest.TestCase):
    """The day/night CDD split is an algebraic identity; it must balance exactly."""

    def test_non_cooling_day_is_zero(self):
        # mean (50+70)/2 = 60 <= 65 base -> contributes nothing
        self.assertEqual(build_cdd_split.split_cooling_day(50, 70), (0.0, 0.0))

    def test_exactly_at_base_is_zero(self):
        # mean == base is NOT > base, so still a non-cooling day
        self.assertEqual(build_cdd_split.split_cooling_day(60, 70), (0.0, 0.0))

    def test_cooling_day_halves(self):
        # lo=70, hi=100 -> day=(100-65)/2=17.5, night=(70-65)/2=2.5
        self.assertEqual(build_cdd_split.split_cooling_day(70, 100), (17.5, 2.5))

    def test_identity_balances(self):
        # for any cooling day, day_half + night_half == mean - base, exactly
        for lo, hi in [(70, 100), (66, 66), (80, 120), (65.5, 90.25)]:
            day_half, night_half = build_cdd_split.split_cooling_day(lo, hi)
            mean = (lo + hi) / 2
            if mean > build_cdd_split.BASE:
                self.assertAlmostEqual(day_half + night_half,
                                       mean - build_cdd_split.BASE, places=9)
            else:
                self.assertEqual((day_half, night_half), (0.0, 0.0))


if __name__ == "__main__":
    unittest.main()
