#!/usr/bin/env python3
"""
Fetch Maryland county housing data from the Census ACS API and Zillow
Research public CSVs, then write docs/data.json and docs/counties.csv.

Requires a Census API key in the CENSUS_API_KEY environment variable.
Get one free at https://api.census.gov/data/key_signup.html
"""

from __future__ import annotations

import csv
import json
import os
import sys
from datetime import datetime, timezone
from io import StringIO
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

CENSUS_API_KEY = os.environ.get("CENSUS_API_KEY", "").strip()
if not CENSUS_API_KEY:
    print(
        "CENSUS_API_KEY is not set. Request one free at "
        "https://api.census.gov/data/key_signup.html",
        file=sys.stderr,
    )
    sys.exit(1)

STATE_FIPS = "24"  # Maryland
YEARS = [2014, 2019, 2024]

TABLES = {
    "rent":              "B25064_001E",
    "rent_moe":          "B25064_001M",
    "income":            "B19013_001E",
    "income_moe":        "B19013_001M",
    "home_value":        "B25077_001E",
    "home_value_moe":    "B25077_001M",
    "renter_income":     "B25119_003E",
    "renter_income_moe": "B25119_003M",
}

BURDEN_NUM = [f"B25070_{n:03d}E" for n in (7, 8, 9, 10)]
BURDEN_DEN_TOTAL = "B25070_001E"
BURDEN_DEN_EXCLUDE = "B25070_011E"

ZORI_COUNTY_CSV = (
    "https://files.zillowstatic.com/research/public_csvs/zori/"
    "County_zori_uc_sfrcondomfr_sm_sa_month.csv"
)

DATA_JSON = os.path.join("docs", "data.json")
COUNTIES_CSV = os.path.join("docs", "counties.csv")


# ---------- Pure helpers (unit-tested in tests/test_data.py) ----------

def parse_number(value):
    """
    Convert a raw Census string to a float, or None if it is empty or
    the Census null sentinel (-666666666).
    """
    if value is None:
        return None
    s = str(value).strip()
    if s == "" or s == "-666666666":
        return None
    try:
        return float(s)
    except ValueError:
        return None


def normalize_county(name):
    """
    Normalize a county name so that Census ('St. Mary's County') and
    Zillow ('Saint Mary's County, MD') forms match.
    """
    n = (name or "").lower().strip()
    if "," in n:
        n = n.split(",")[0].strip()
    # "saint" and "st" should be the same word
    n = n.replace("saint ", "st ")
    # Drop punctuation that differs between sources
    n = n.replace(".", "").replace("'", "").replace("\u2019", "")
    # Collapse internal whitespace
    n = " ".join(n.split())
    return n


# ---------- HTTP ----------

def fetch_json(url):
    req = Request(url, headers={"User-Agent": "maryland-housing-reality/1.0"})
    with urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_text(url):
    req = Request(url, headers={"User-Agent": "maryland-housing-reality/1.0"})
    with urlopen(req, timeout=120) as r:
        return r.read().decode("utf-8")


def acs_url(year, variables):
    varlist = ",".join(["NAME"] + variables)
    return (
        f"https://api.census.gov/data/{year}/acs/acs5"
        f"?get={varlist}"
        f"&for=county:*&in=state:{STATE_FIPS}"
        f"&key={CENSUS_API_KEY}"
    )


# ---------- Census ----------

def pull_acs_year(year):
    wanted = list(TABLES.values()) + BURDEN_NUM + [
        BURDEN_DEN_TOTAL, BURDEN_DEN_EXCLUDE
    ]
    rows = fetch_json(acs_url(year, wanted))
    header, *body = rows
    idx = {name: i for i, name in enumerate(header)}

    out = {}
    for row in body:
        fips = row[idx["state"]] + row[idx["county"]]
        rec = {"name": row[idx["NAME"]].split(",")[0]}

        for key, var in TABLES.items():
            rec[key] = parse_number(row[idx[var]])

        nums = [parse_number(row[idx[v]]) for v in BURDEN_NUM]
        total = parse_number(row[idx[BURDEN_DEN_TOTAL]])
        excl = parse_number(row[idx[BURDEN_DEN_EXCLUDE]])
        denom = (total - excl) if total is not None and excl is not None else None
        if denom and denom > 0 and all(n is not None for n in nums):
            rec["burden_percent"] = sum(nums) / denom * 100
        else:
            rec["burden_percent"] = None

        out[fips] = rec
    return out


# ---------- Zillow ZORI ----------

def load_zori_county_latest():
    """
    Return {normalized_county_name: latest_monthly_rent}.
    No API key required — this is a public research CSV.
    """
    try:
        csv_text = fetch_text(ZORI_COUNTY_CSV)
    except (HTTPError, URLError) as exc:
        print(f"ZORI download failed ({exc}); skipping current-rent data.",
              file=sys.stderr)
        return {}

    reader = csv.DictReader(StringIO(csv_text))
    out = {}
    for row in reader:
        if row.get("State") != "MD":
            continue
        region = (row.get("RegionName") or "").strip()
        key = normalize_county(region)

        # Most recent month column with a value.
        month_cols = [c for c in row.keys() if c and c[0].isdigit() and "-" in c]
        for col in reversed(month_cols):
            val = (row.get(col) or "").strip()
            if val:
                try:
                    out[key] = float(val)
                except ValueError:
                    pass
                break
    return out


# ---------- Assemble ----------

def build_rows():
    zori = load_zori_county_latest()

    rows = []
    for year in YEARS:
        by_fips = pull_acs_year(year)
        for fips, rec in by_fips.items():
            name_key = normalize_county(rec["name"])
            row = {
                "id": fips,
                "name": rec["name"],
                "year": year,
                "rent": rec["rent"],
                "rent_moe": rec["rent_moe"],
                "income": rec["income"],
                "income_moe": rec["income_moe"],
                "home_value": rec["home_value"],
                "home_value_moe": rec["home_value_moe"],
                "renter_income": rec["renter_income"],
                "renter_income_moe": rec["renter_income_moe"],
                "burden_percent": rec["burden_percent"],
                "market_rent_now": None,
            }
            if year == YEARS[-1] and name_key in zori:
                row["market_rent_now"] = round(zori[name_key], 0)
            rows.append(row)
    return rows


def report_zori_coverage(rows, zori):
    """
    Print which MD counties are missing from ZORI and which ZORI keys
    were never matched. Helps debug name-mismatch problems.
    """
    latest_year = max(YEARS)
    latest = [r for r in rows if r["year"] == latest_year]

    matched_keys = set()
    missing = []
    for r in latest:
        key = normalize_county(r["name"])
        if key in zori:
            matched_keys.add(key)
        else:
            missing.append(r["name"])

    unmatched_keys = sorted(set(zori.keys()) - matched_keys)

    print(f"ZORI: {len(matched_keys)} MD jurisdictions matched.", file=sys.stderr)
    if missing:
        print(f"ZORI: no data for {len(missing)} jurisdiction(s):", file=sys.stderr)
        for name in missing:
            print(f"   - {name}", file=sys.stderr)
    if unmatched_keys:
        print(f"ZORI: {len(unmatched_keys)} ZORI key(s) not matched to Census:",
              file=sys.stderr)
        for name in unmatched_keys:
            print(f"   ? {name}", file=sys.stderr)


def write_outputs(rows):
    payload = {
        "metadata": {
            "source": "U.S. Census Bureau, American Community Survey 5-year estimates",
            "tables": ["B25064", "B19013", "B25077", "B25119", "B25070"],
            "market_rent_source": (
                "Zillow Observed Rent Index (ZORI), smoothed, seasonally adjusted"
            ),
            "state_fips": STATE_FIPS,
            "years": YEARS,
            "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        },
        "rows": rows,
    }
    os.makedirs("docs", exist_ok=True)
    with open(DATA_JSON, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)

    latest = [r for r in rows if r["year"] == YEARS[-1]]
    latest.sort(key=lambda r: r["name"])
    with open(COUNTIES_CSV, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow([
            "county", "fips",
            "median_rent", "rent_moe",
            "median_income", "income_moe",
            "median_renter_income", "renter_income_moe",
            "median_home_value", "home_value_moe",
            "renter_burden_percent",
            "market_rent_now_zori",
        ])
        for r in latest:
            w.writerow([
                r["name"], r["id"],
                r["rent"], r["rent_moe"],
                r["income"], r["income_moe"],
                r["renter_income"], r["renter_income_moe"],
                r["home_value"], r["home_value_moe"],
                round(r["burden_percent"], 1) if r["burden_percent"] is not None else "",
                r["market_rent_now"] or "",
            ])


def main():
    rows = build_rows()
    if len(rows) != len(YEARS) * 24:
        print(f"Expected {len(YEARS) * 24} rows, got {len(rows)}. "
              "Check the Census API response.", file=sys.stderr)
        sys.exit(1)
    report_zori_coverage(rows, load_zori_county_latest())
    write_outputs(rows)
    print(f"Wrote {len(rows)} rows to {DATA_JSON} and {COUNTIES_CSV}.")


if __name__ == "__main__":
    main()