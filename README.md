# 🏘️ Maryland Housing Burden

**What rent actually costs. What income you'd need. How you compare.**

[![GitHub Sponsor](https://img.shields.io/badge/Sponsor-GitHub-EA4AAA?style=for-the-badge&logo=github-sponsors)](https://github.com/sponsors/IdaAkiwumi)
[![PayPal](https://img.shields.io/badge/Donate-PayPal-00457C?style=for-the-badge&logo=paypal)](https://www.paypal.com/paypalme/iakiwumi)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Census ACS](https://img.shields.io/badge/U.S.%20Census-ACS%205--year-1a3d7c?style=for-the-badge)](https://www.census.gov/programs-surveys/acs)
[![Zillow ZORI](https://img.shields.io/badge/Zillow-ZORI-006AFF?style=for-the-badge)](https://www.zillow.com/research/data/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**Maryland Housing Burden** is a public data dashboard comparing median rent, renter income, and renter cost burden across all 24 Maryland jurisdictions. It presents U.S. Census ACS and Zillow ZORI market data, flags where official Census figures lag current asking rents, and lets any visitor see what their salary actually buys by county.

---

### ✨ Features

- **One page, all 24 jurisdictions.** Every county plus Baltimore City in a single sortable, accessible comparison table.
- **Census vs. market gap.** Shows the Zillow Observed Rent Index (ZORI) next to Census median gross rent, exposing market dynamics.
- **Renter burden story.** Interactive visual scale highlighting the proportion of renters spending 30%+ of income on rent, county rank, and renter income vs all-household median.
- **Personal rent share calculation.** Enter any household income to compute personal rent share across every county in real time.
- **Historical trends.** Interactive multi-window historical comparison cards across Census ACS 5-year periods with margin-of-error details.
- **Interactive scenarios.**
  - *Rent vs. Income Growth:* Compares long-term rent escalation against earnings growth.
  - *Illustrative Mortgage Estimator:* Models monthly homeownership expenses including principal, interest, taxes, insurance, and reserves.
- **Zero ads, no tracking, complete privacy.** All calculations run purely in-memory in the browser.

---

### 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Front end** | React 19, TypeScript, Vite |
| **Typography** | Bricolage Grotesque and JetBrains Mono |
| **Census data** | U.S. Census ACS 5-year estimates (B25064, B19013, B25077, B25119, B25070) |
| **Market rent** | Zillow Observed Rent Index (ZORI) |
| **Newsletter** | Buttondown embed integration |

---

### 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production
npm run build
```

---

### 📁 Project Structure

```
├── public/                      # Static data files and assets
│   ├── data.json                # 24-county multi-year ACS & ZORI data
│   ├── counties.csv             # Downloadable CSV dataset
│   ├── favicon.svg, favicon.ico
│   └── site.webmanifest
├── src/
│   ├── components/
│   │   ├── Header.tsx           # Hero title, share menu, and navigation
│   │   ├── StatBand.tsx         # 7-column key figures banner
│   │   ├── CountyCompare.tsx    # Household income input & county selector
│   │   ├── BurdenStory.tsx      # Renter burden visual gauge and insights
│   │   ├── Trends.tsx           # Multi-period trend cards and data table
│   │   ├── CountyTable.tsx      # Sortable comparison table & side notes
│   │   ├── Scenarios.tsx        # Rent growth & mortgage calculators
│   │   ├── Methodology.tsx      # Understanding the numbers & FAQs
│   │   ├── About.tsx            # Background and creator info
│   │   ├── Newsletter.tsx       # Rent Watch subscription
│   │   ├── Support.tsx          # GitHub Sponsors & PayPal links
│   │   ├── Footer.tsx           # Footer & refresh timestamp
│   │   └── Toast.tsx            # Temporary feedback toasts
│   ├── utils/
│   │   └── format.ts            # Currency, percent, and sort utilities
│   ├── types.ts                 # TypeScript data interfaces
│   ├── App.tsx                  # Root application component
│   ├── main.tsx                 # Application entry point
│   └── styles.css               # Design tokens, theme, and layouts
├── metadata.json                # AI Studio application metadata
├── package.json
└── tsconfig.json
```

---

### ☕ Support This Project

- [Sponsor on GitHub](https://github.com/sponsors/IdaAkiwumi)
- [Donate via PayPal](https://www.paypal.com/paypalme/iakiwumi)

Developed by Ida Akiwumi — UX Designer | Analytics Engineer.
