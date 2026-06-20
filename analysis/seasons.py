"""Hemisphere-aware meteorological summer for the worldwide engine.

The US/Northern engine hardcoded summer = JJA (June–August). Worldwide, summer is
DJF in the Southern Hemisphere, so the diurnal/season builders derive their month
windows from a city's latitude instead of assuming June–August. This is the
"non-optional" Phase B prerequisite called out in WORLDWIDE.md §6.

Northern-hemisphere cities resolve to exactly June 1–August 31 — identical to the
old hardcoded window — so this is a **no-op for the current 14-city US set** and any
other northern city; only Southern-Hemisphere cities take the DJF path.

Stdlib only (mirrors the builders).
"""


def is_southern(lat):
    """True for Southern-Hemisphere latitudes (lat < 0)."""
    return lat < 0


def warm_season_windows(lat):
    """The ("MM-DD", "MM-DD") date windows, within a single calendar year, that
    cover the hemisphere's three summer months.

    Northern: one contiguous June 1–August 31 window (byte-identical to the old
    builder). Southern: January 1–February 28 plus December 1–December 31 — for a
    by-decade hourly composite, December is averaged alongside the same year's
    Jan–Feb, and the "December belongs to next year's summer" nuance is immaterial
    to a decadal mean. Feb 29 is dropped (negligible for a decadal average, and it
    keeps the end date valid in non-leap years).
    """
    if is_southern(lat):
        return [("01-01", "02-28"), ("12-01", "12-31")]
    return [("06-01", "08-31")]


def warm_season_months(lat):
    """The three summer month numbers for the hemisphere (Northern JJA / Southern DJF)."""
    return (12, 1, 2) if is_southern(lat) else (6, 7, 8)


def warm_season_label(lat):
    """Human label stamped into the assets ("June–August" / "December–February")."""
    return "December-February" if is_southern(lat) else "June-August"


if __name__ == "__main__":  # runnable spec: python3 analysis/seasons.py
    assert warm_season_windows(33.4) == [("06-01", "08-31")]  # Phoenix (N) == old window
    assert warm_season_windows(-33.9) == [("01-01", "02-28"), ("12-01", "12-31")]  # Sydney (S)
    assert warm_season_months(40) == (6, 7, 8) and warm_season_months(-40) == (12, 1, 2)
    assert warm_season_label(40) == "June-August"
    assert warm_season_label(-40) == "December-February"
    print("seasons self-check OK")
