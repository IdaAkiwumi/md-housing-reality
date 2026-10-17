#!/usr/bin/env python3
"""
Read docs/data.json, pick one county finding, and send a monthly
Rent Watch email via the Buttondown API.

Requires BUTTONDOWN_API_KEY in the environment.
Get one at https://buttondown.com/settings/api
"""

import json
import os
import sys
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BUTTONDOWN_API_KEY = os.environ.get("BUTTONDOWN_API_KEY", "").strip()
if not BUTTONDOWN_API_KEY:
    print(
        "BUTTONDOWN_API_KEY is not set. Add it as a repository secret at "
        "Settings, Secrets and variables, Actions.",
        file=sys.stderr,
    )
    sys.exit(1)

DATA_JSON = os.path.join("docs", "data.json")
SITE_URL = "https://IdaAkiwumi.github.io/md-housing-reality/"


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


def build_email(payload):
    rows = payload["rows"]
    fetched_at = (
        payload.get("metadata", {}).get("fetched_at")
        or datetime.now(timezone.utc).isoformat(timespec="seconds")
    )

    latest_year = max(r["year"] for r in rows)
    latest = [r for r in rows if r["year"] == latest_year]

    top_burden, biggest_gap = pick_finding(latest)

    month = datetime.now(timezone.utc).strftime("%B %Y")
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


def send_email(subject, body):
    url = "https://api.buttondown.com/v1/emails"
    headers = {
        "Authorization": f"Token {BUTTONDOWN_API_KEY}",
        "Content-Type": "application/json",
        "X-Buttondown-Live-Dangerously": "true",
    }
    payload = {
        "subject": subject,
        "body": body,
        "status": "about_to_send",
    }
    req = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urlopen(req, timeout=30) as r:
            response = json.loads(r.read().decode("utf-8"))
            print(f"Rent Watch sent. Email ID: {response.get('id', 'unknown')} - send_newsletter.py:139")
    except HTTPError as exc:
        print(
            f"Buttondown API error: {exc.code} {exc.read().decode('utf-8', 'replace')}",
            file=sys.stderr,
        )
        sys.exit(1)
    except URLError as exc:
        print(f"Network error: {exc} - send_newsletter.py:147", file=sys.stderr)
        sys.exit(1)


def main():
    with open(DATA_JSON, encoding="utf-8") as fh:
        payload = json.load(fh)
    subject, body = build_email(payload)
    send_email(subject, body)


if __name__ == "__main__":
    main()