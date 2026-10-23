"""
Unit tests for scripts/send_newsletter.py monthly deduplication and email builder.

Run from the project root:
    CENSUS_API_KEY=dummy python -m unittest discover -s tests -v
"""

import os
import sys
import unittest
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = os.path.join(ROOT, "scripts")
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

import send_newsletter as newsletter  # noqa: E402


class MonthlyDeduplicationTests(unittest.TestCase):
    def test_blocks_exact_subject_when_sent(self):
        emails = [
            {
                "id": "em_oct_1",
                "subject": "Rent Watch: October 2026",
                "status": "sent",
                "publish_date": "2026-10-15T08:23:10+00:00",
            }
        ]
        found = newsletter.find_existing_monthly_email(
            emails, "Rent Watch: October 2026", "2026-10"
        )
        self.assertIsNotNone(found)
        self.assertEqual(found["id"], "em_oct_1")

    def test_blocks_when_queued_or_in_flight(self):
        for status in ("about_to_send", "in_flight", "scheduled"):
            emails = [
                {
                    "id": f"em_{status}",
                    "subject": "Rent Watch: October 2026",
                    "status": status,
                    "creation_date": "2026-10-15T08:23:10+00:00",
                }
            ]
            found = newsletter.find_existing_monthly_email(
                emails, "Rent Watch: October 2026", "2026-10"
            )
            self.assertIsNotNone(found, f"Expected status={status} to block duplicate")

    def test_ignores_drafts_and_errored_emails(self):
        emails = [
            {
                "id": "em_draft",
                "subject": "Rent Watch: October 2026",
                "status": "draft",
                "creation_date": "2026-10-10T12:00:00+00:00",
            },
            {
                "id": "em_err",
                "subject": "Rent Watch: October 2026",
                "status": "errored",
                "creation_date": "2026-10-11T12:00:00+00:00",
            },
        ]
        found = newsletter.find_existing_monthly_email(
            emails, "Rent Watch: October 2026", "2026-10"
        )
        self.assertIsNone(found)

    def test_blocks_custom_rent_watch_subject_sent_same_month(self):
        emails = [
            {
                "id": "em_custom",
                "subject": "Rent Watch: Special Fall Edition",
                "status": "sent",
                "publish_date": "2026-10-03T14:00:00+00:00",
            }
        ]
        found = newsletter.find_existing_monthly_email(
            emails, "Rent Watch: October 2026", "2026-10"
        )
        self.assertIsNotNone(found)
        self.assertEqual(found["id"], "em_custom")

    def test_allows_send_when_only_previous_months_exist(self):
        emails = [
            {
                "id": "em_sep",
                "subject": "Rent Watch: September 2026",
                "status": "sent",
                "publish_date": "2026-09-15T08:23:10+00:00",
            }
        ]
        found = newsletter.find_existing_monthly_email(
            emails, "Rent Watch: October 2026", "2026-10"
        )
        self.assertIsNone(found)


class BuildEmailTests(unittest.TestCase):
    def test_build_email_uses_passed_timestamp(self):
        payload = {
            "metadata": {"fetched_at": "2026-10-15T08:23:00+00:00"},
            "rows": [
                {
                    "id": "24510",
                    "name": "Baltimore city",
                    "year": 2024,
                    "rent": 1400,
                    "renter_income": 46000,
                    "burden_percent": 54.2,
                    "market_rent_now": 1750,
                }
            ],
        }
        fixed_now = datetime(2026, 10, 15, 8, 23, tzinfo=timezone.utc)
        subject, body = newsletter.build_email(payload, now=fixed_now)
        self.assertEqual(subject, "Rent Watch: October 2026")
        self.assertIn("Baltimore city", body)


if __name__ == "__main__":
    unittest.main()
