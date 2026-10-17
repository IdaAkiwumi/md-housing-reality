"""
Unit tests for scripts/fetch_data.py.

Run from the project root:
    python -m unittest discover -s tests -v
"""

import os
import sys
import unittest

# Make scripts/ importable
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = os.path.join(ROOT, "scripts")
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

import fetch_data as module  # noqa: E402


class NormalizeCountyTests(unittest.TestCase):
    def test_plain_name(self):
        self.assertEqual(
            module.normalize_county("Allegany County"),
            "allegany county",
        )

    def test_name_with_state_suffix(self):
        self.assertEqual(
            module.normalize_county("Allegany County, MD"),
            "allegany county",
        )

    def test_saint_matches_st(self):
        # ZORI uses "Saint Mary's County, MD"; Census uses "St. Mary's County".
        self.assertEqual(
            module.normalize_county("St. Mary's County"),
            module.normalize_county("Saint Mary's County, MD"),
        )

    def test_apostrophes_and_periods_ignored(self):
        self.assertEqual(
            module.normalize_county("Prince George's County"),
            module.normalize_county("Prince Georges County, MD"),
        )

    def test_baltimore_city_vs_county(self):
        self.assertNotEqual(
            module.normalize_county("Baltimore city"),
            module.normalize_county("Baltimore County"),
        )

    def test_extra_whitespace(self):
        self.assertEqual(
            module.normalize_county("  Baltimore   city  "),
            "baltimore city",
        )


class ParseNumberTests(unittest.TestCase):
    def test_valid_number(self):
        self.assertEqual(module.parse_number("100"), 100.0)
        self.assertEqual(module.parse_number("1234.5"), 1234.5)

    def test_census_null_sentinel(self):
        self.assertIsNone(module.parse_number("-666666666"))

    def test_empty_string(self):
        self.assertIsNone(module.parse_number(""))

    def test_none_input(self):
        self.assertIsNone(module.parse_number(None))

    def test_whitespace(self):
        self.assertIsNone(module.parse_number("   "))

    def test_non_numeric(self):
        self.assertIsNone(module.parse_number("not a number"))


class BurdenCalculationTests(unittest.TestCase):
    """
    The burden percent is (sum of categories 7-10) / (001 minus 011) * 100.
    These tests exercise the math using the same inputs pull_acs_year uses.
    """

    def _burden(self, nums, total, excl):
        denom = total - excl
        if denom and denom > 0 and all(n is not None for n in nums):
            return sum(nums) / denom * 100
        return None

    def test_normal_case(self):
        # 10 + 20 + 30 + 40 = 100 burdened households, denom 200 → 50%
        result = self._burden([10, 20, 30, 40], 250, 50)
        self.assertAlmostEqual(result, 50.0, places=4)

    def test_zero_denominator(self):
        self.assertIsNone(self._burden([10, 20, 30, 40], 50, 50))

    def test_negative_denominator(self):
        # Can't happen in real data, but guard against it.
        self.assertIsNone(self._burden([10, 20, 30, 40], 50, 100))

    def test_missing_category(self):
        self.assertIsNone(self._burden([10, None, 30, 40], 250, 50))


class ConstantsTests(unittest.TestCase):
    def test_md_state_fips(self):
        self.assertEqual(module.STATE_FIPS, "24")

    def test_three_acs_windows(self):
        self.assertEqual(module.YEARS, [2014, 2019, 2024])

    def test_required_tables_present(self):
        for key in ("rent", "income", "renter_income", "home_value"):
            self.assertIn(key, module.TABLES)


if __name__ == "__main__":
    unittest.main()