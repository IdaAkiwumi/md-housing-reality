#!/usr/bin/env python3
"""
Read docs/data.json, pick one county finding, and send a monthly
Rent Watch email via the Buttondown API.

Includes a monthly deduplication guard that queries Buttondown before
sending so at most one Rent Watch email can go out per calendar month
(unless --force is explicitly passed).

Requires BUTTONDOWN_API_KEY in the environment.
Get one at https://buttondown.com/settings/api
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

DATA_JSON = os.path.join("docs", "data.json")
SITE_URL = "https://IdaAkiwumi.github.io/md-housing-reality/"
BUTTONDOWN_EMAILS_URL = "https://api.buttondown.com/v1/emails"

# Statuses in Buttondown that mean an email has already gone out or is queued
SENT_OR_QUEUED_STATUSES = {
    "sent",
    "about_to_send",
    "in_flight",
    "scheduled",
    "imported",
}


def get_api_key():
    api_key = os.environ.get("BUTTONDOWN_API_KEY", "").strip()
    if not api_key:
        print(
            "BUTTONDOWN_API_KEY is not set. Add it as a repository secret at "
            "Settings, Secrets and variables, Actions.",
            file=sys.stderr,
        )
        sys.exit(1)
    return api_key


def dollars(value):
    if value is None:
        return "$0"
    return f"${value:,.0f}"


def pick_finding(rows):
    burdened = [r for r in rows if r.get("burden_percent") is not None]
    burdened.sort(key=lambda r: r["burden_percent"], reverse=True)
    top_burden = burdened[0] if burdened else None

    gaps = [
        (r, r["market_rent_now"] - r["rent"])
        for r in rows
        if r.get("market_rent_now") and r.get("rent")
    ]
    gaps.sort(key=lambda x: x[1], reverse=True)
    biggest_gap = gaps[0] if gaps else None

    return top_burden, biggest_gap


def build_email(payload, now=None):
    if now is None:
        now = datetime.now(timezone.utc)

    rows = payload["rows"]
    fetched_at = (
        payload.get("metadata", {}).get("fetched_at")
        or now.isoformat(timespec="seconds")
    )

    latest_year = max(r["year"] for r in rows)
    latest = [r for r in rows if r["year"] == latest_year]

    top_burden, biggest_gap = pick_finding(latest)

    month = now.strftime("%B %Y")
    # Colon instead of em dash per your writing style.
    subject = f"Rent Watch: {month}"

    # No leading H1 here. Buttondown renders the subject as the top heading
    # automatically, so starting with an H1 in the body produces a duplicate.
    lines = [
        "One finding from this month's Maryland housing data.",
        "",
        "---",
        "",
    ]

    if top_burden:
        county = top_burden["name"]
        pct = top_burden["burden_percent"]
        rent = dollars(top_burden.get("rent"))
        renter_income = dollars(top_burden.get("renter_income"))

        lines += [
            f"## {county} has the highest renter burden in Maryland",
            "",
            f"**{pct:.1f}%** of renter households in {county} spend 30% or "
            f"more of income on rent. Median rent there is **{rent}**, and "
            f"renter household income is **{renter_income}**.",
            "",
        ]

    if biggest_gap:
        county, gap = biggest_gap
        census = dollars(county["rent"])
        market = dollars(county["market_rent_now"])
        pct = (county["market_rent_now"] / county["rent"] - 1) * 100
        lines += [
            f"## Where Census data lags reality most: {county['name']}",
            "",
            f"The Census reports median rent at **{census}**, but Zillow's "
            f"current asking-rent index is **{market}**, a gap of "
            f"**{pct:.0f}%**.",
            "",
        ]

    lines += [
        "---",
        "",
        f"[See the full data for every county]({SITE_URL})",
        "",
        f"Data retrieved: {fetched_at}",
    ]

    return subject, "\n".join(lines)


def find_existing_monthly_email(emails, subject, year_month):
    """
    Return the existing email dict if a Rent Watch newsletter has already
    been sent or queued for the target subject or YYYY-MM month, else None.
    Drafts and failed/deleted emails are ignored.
    """
    normalized_subject = subject.strip().lower()

    for item in emails:
        status = (item.get("status") or "").strip().lower()
        if status not in SENT_OR_QUEUED_STATUSES:
            continue

        item_subject = (item.get("subject") or "").strip()
        if item_subject.lower() == normalized_subject:
            return item

        if "rent watch" in item_subject.lower():
            for date_field in ("publish_date", "creation_date"):
                date_val = (item.get(date_field) or "").strip()
                if date_val.startswith(year_month):
                    return item

    return None


def fetch_existing_emails(api_key, max_pages=10):
    """
    Fetch existing emails from Buttondown to verify whether this month's
    edition has already been sent. Fails closed on API/network errors so
    we never accidentally send a duplicate when Buttondown is unreachable.
    """
    headers = {
        "Authorization": f"Token {api_key}",
        "Accept": "application/json",
    }
    url = f"{BUTTONDOWN_EMAILS_URL}?page_size=100"
    emails = []
    pages = 0

    while url and pages < max_pages:
        pages += 1
        req = Request(url, headers=headers, method="GET")
        try:
            with urlopen(req, timeout=30) as r:
                body = json.loads(r.read().decode("utf-8"))
        except HTTPError as exc:
            print(
                f"Buttondown API error while checking existing emails: "
                f"{exc.code} {exc.read().decode('utf-8', 'replace')}",
                file=sys.stderr,
            )
            sys.exit(1)
        except URLError as exc:
            print(
                f"Network error while checking existing emails: {exc}",
                file=sys.stderr,
            )
            sys.exit(1)

        if isinstance(body, list):
            emails.extend(body)
            break

        results = body.get("results") or []
        emails.extend(results)
        url = body.get("next")

    return emails


def send_email(api_key, subject, body):
    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "application/json",
        "X-Buttondown-Live-Dangerously": "true",
    }
    payload = {
        "subject": subject,
        "body": body,
        "status": "about_to_send",
    }
    req = Request(
        BUTTONDOWN_EMAILS_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urlopen(req, timeout=30) as r:
            response = json.loads(r.read().decode("utf-8"))
            print(
                f"Rent Watch sent. Email ID: {response.get('id', 'unknown')} - send_newsletter.py"
            )
    except HTTPError as exc:
        print(
            f"Buttondown API error: {exc.code} {exc.read().decode('utf-8', 'replace')}",
            file=sys.stderr,
        )
        sys.exit(1)
    except URLError as exc:
        print(f"Network error: {exc} - send_newsletter.py", file=sys.stderr)
        sys.exit(1)


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Send the monthly Rent Watch newsletter via Buttondown."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Build the email and check duplicate status without sending.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Bypass the once-per-month duplicate check and send anyway.",
    )
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    now = datetime.now(timezone.utc)
    year_month = now.strftime("%Y-%m")

    with open(DATA_JSON, encoding="utf-8") as fh:
        payload = json.load(fh)

    subject, body = build_email(payload, now=now)

    if args.dry_run and not os.environ.get("BUTTONDOWN_API_KEY", "").strip():
        print(f"[DRY RUN] Subject: {subject}\n\n{body}")
        return

    api_key = get_api_key()

    if not args.force:
        existing_emails = fetch_existing_emails(api_key)
        duplicate = find_existing_monthly_email(
            existing_emails, subject=subject, year_month=year_month
        )
        if duplicate:
            print(
                f"Skipping send: Rent Watch for {year_month} was already "
                f"sent or queued (id={duplicate.get('id', 'unknown')}, "
                f"status={duplicate.get('status', 'unknown')}, "
                f"subject={duplicate.get('subject', '')!r})."
            )
            return

    if args.dry_run:
        print(f"[DRY RUN] No existing email for {year_month}. Would send:\n")
        print(f"Subject: {subject}\n\n{body}")
        return

    send_email(api_key, subject, body)


if __name__ == "__main__":
    main()