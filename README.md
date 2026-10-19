# 🏘️ Maryland Housing Burden

**What rent actually costs. What income you'd need. How you compare.**

[![GitHub Sponsor](https://img.shields.io/badge/Sponsor-GitHub-EA4AAA?style=for-the-badge&logo=github-sponsors)](https://github.com/sponsors/IdaAkiwumi)
[![PayPal](https://img.shields.io/badge/Donate-PayPal-00457C?style=for-the-badge&logo=paypal)](https://www.paypal.com/paypalme/iakiwumi)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-22c55e?style=for-the-badge&logo=github)](https://IdaAkiwumi.github.io/md-housing-reality/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-Monthly-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/features/actions)
[![Census ACS](https://img.shields.io/badge/U.S.%20Census-ACS%205--year-1a3d7c?style=for-the-badge)](https://www.census.gov/programs-surveys/acs)
[![Zillow ZORI](https://img.shields.io/badge/Zillow-ZORI-006AFF?style=for-the-badge)](https://www.zillow.com/research/data/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**Maryland Housing Burden** is a free public data dashboard comparing median rent, renter income, and renter cost burden across all 24 Maryland jurisdictions. It pulls U.S. Census and Zillow data every month via GitHub Actions, flags where official Census figures lag current asking rents, and lets any visitor see what their salary actually buys by county.

---

### ✨ Why Maryland Housing Burden?

Maryland publishes the data, but it is buried across five Census tables and three rolling five year windows. Nothing on one page tells a renter how burdened people are where they live.

- **One page, all 24 jurisdictions.** Every county plus Baltimore City in a single sortable table
- **Census vs. market gap.** Shows the Zillow Observed Rent Index next to the Census median, exposing where official figures lag asking rents by 30 to 60 percent
- **Renter burden hook.** Each county opens with a plain language headline like "6 in 10 renter households here spend 30% or more of income on rent"
- **Personal rent share.** Enter your income, and every county row shows what rent would take out of your paycheck
- **Fully automated.** GitHub Actions refreshes the data and sends a monthly email on the 15th of every month
- **No ads, no tracking, no cookies.** Two font files from Google Fonts are the only external request

---

### 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Data pipeline** | Python 3.10+ (standard library only) |
| **Census data** | U.S. Census ACS 5 year estimates (B25064, B19013, B25077, B25119, B25070) |
| **Market rent** | Zillow Observed Rent Index (ZORI) public CSV |
| **Front end** | Plain HTML, CSS, and vanilla JavaScript |
| **Typography** | Bricolage Grotesque and JetBrains Mono via Google Fonts |
| **Automation** | GitHub Actions (monthly cron, manual dispatch, push to main) |
| **Newsletter** | Buttondown via API |
| **Hosting** | GitHub Pages |

---

### 🚀 Live Demo

**[→ Explore the dashboard](https://IdaAkiwumi.github.io/md-housing-reality/)**

**Try this:**
- Enter your household income and click Compare to see your rent share across all 24 counties
- Switch the county dropdown to Kent County and read the renter burden headline
- Sort the table by "Renters spending 30% or more" to find the most burdened counties
- Click any trend card to compare 2010 through 2024 windows

**Headline findings:**
- Kent County: 59.6 percent of renter households spend 30 percent or more of income on rent
- Garrett County: 35 percent, the lowest in the state
- Allegany County: Census reports median rent at $805, Zillow asking rent index is $1,020

---

### 🧠 How It Works

**Data pipeline.** A Python script pulls five Census tables and the Zillow ZORI CSV, normalizes county names across the two sources, computes the rent burden percentage and the 30 percent income benchmark, and writes a single JSON file the site reads.

**Monthly automation.** GitHub Actions runs the pipeline on the 15th of every month at 08:23 UTC. It validates the fetched data, redeploys the site to GitHub Pages, then triggers the Buttondown newsletter with one new county finding.

**Front end.** Everything runs in the browser. County selection, income comparison, sorting, and the newsletter signup are all vanilla JavaScript. No build step, no dependencies, no tracking.

**Census vs. market gap.** The Census median rent is a five year rolling average ending in 2024. Zillow's Observed Rent Index updates monthly. The site places them side by side so the lag is visible per county.

---

### 🖥️ Local Development

```powershell
# 1. Clone
git clone https://github.com/IdaAkiwumi/md-housing-reality.git
cd md-housing-reality

# 2. Get a free Census API key
# https://api.census.gov/data/key_signup.html

# 3. Set the key and fetch data
$env:CENSUS_API_KEY="YOUR_KEY_HERE"
python scripts/fetch_data.py

# 4. Serve locally
python -m http.server 8000 --directory docs
```

Visit http://localhost:8000 in your browser. On macOS or Linux, replace the `$env:` line with `export CENSUS_API_KEY='YOUR_KEY_HERE'`.

Required environment variables:

```
CENSUS_API_KEY        # https://api.census.gov/data/key_signup.html
BUTTONDOWN_API_KEY    # only needed to send the monthly newsletter
```

---

### 📁 Project Structure

```
md-housing-reality/
├── .github/workflows/
│   └── publish.yml              # Monthly refresh, Pages deploy, newsletter send
├── docs/                        # Deployed site (GitHub Pages root)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── data.json                # Generated by the pipeline
│   ├── counties.csv             # Generated by the pipeline
│   ├── favicon.svg
│   ├── site.webmanifest
│   ├── robots.txt
│   └── sitemap.xml
├── scripts/
│   ├── fetch_data.py            # Census and ZORI pipeline
│   └── send_newsletter.py       # Buttondown newsletter
├── tests/
│   └── test_data.py             # Normalization and helper tests
└── README.md
```

---

### 🔒 Privacy Notes

- No analytics, no cookies, no external JavaScript libraries
- Two web fonts load from Google Fonts. All other requests are same origin
- Income and calculator inputs stay in the browser tab. Nothing is submitted or stored
- Newsletter emails are stored by Buttondown only, never by this project
- No paid API, no database, no server beyond GitHub Pages static hosting

---



### 💡 For Hiring Managers

This project demonstrates:

- **Data engineering.** Python pipeline normalizing two sources with mismatched county naming, monthly automation via GitHub Actions, secret management
- **Front end craft.** Fully accessible vanilla JS dashboard with sortable table, SVG visualizations, and a responsive layout, no framework overhead
- **Product thinking.** Framed around a real user question (how burdened are renters here) instead of just displaying the data
- **Public interest engineering.** Free, no ads, no tracking, with an honest caveats section and reproducible methodology

---

### ☕ Support This Project

- [Sponsor on GitHub](https://github.com/sponsors/IdaAkiwumi)
- [Donate via PayPal](https://www.paypal.com/paypalme/iakiwumi)

---

Developed by Ida Akiwumi
*UX Designer | Analytics Engineer*

[LinkedIn](https://www.linkedin.com/in/idaa11/) | [GitHub](https://github.com/IdaAkiwumi)

## Star History

<a href="https://www.star-history.com/?repos=IdaAkiwumi%2Fmd-housing-reality&type=timeline&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=IdaAkiwumi/md-housing-reality&type=timeline&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=IdaAkiwumi/md-housing-reality&type=timeline&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=IdaAkiwumi/md-housing-reality&type=timeline&legend=top-left" />
 </picture>
</a>
