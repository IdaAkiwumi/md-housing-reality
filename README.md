# 🏘️ Maryland Housing Burden

**What rent actually costs. What income you'd need. How you compare.**

[![GitHub Sponsor](https://img.shields.io/badge/Sponsor-GitHub-EA4AAA?style=for-the-badge&logo=github-sponsors)](https://github.com/sponsors/IdaAkiwumi)
[![PayPal](https://img.shields.io/badge/Donate-PayPal-00457C?style=for-the-badge&logo=paypal)](https://www.paypal.com/paypalme/iakiwumi)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![HTML5](https://img.shields.io/badge/HTML5-Semantic-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Glossary/HTML5)
[![CSS3](https://img.shields.io/badge/CSS3-Design%20Tokens-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Census ACS](https://img.shields.io/badge/U.S.%20Census-ACS%205--year-1a3d7c?style=for-the-badge)](https://www.census.gov/programs-surveys/acs)
[![Zillow ZORI](https://img.shields.io/badge/Zillow-ZORI-006AFF?style=for-the-badge)](https://www.zillow.com/research/data/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**Maryland Housing Burden** is a public data dashboard and interactive geographical visualization comparing median rent, renter income, and renter cost burden across all 24 Maryland jurisdictions (23 counties plus Baltimore City). It synthesizes official U.S. Census Bureau ACS 5-year data with contemporary Zillow Observed Rent Index (ZORI) asking rents, highlights where official figures lag the live market, and enables visitors to evaluate housing affordability across every corner of the state in real time.

---

### ✨ Features

- 🗺️ **Interactive Geographic Choropleth Map**
  - Custom high-resolution vector SVG map covering all 24 Maryland jurisdictions from the Western Panhandle to the Eastern Shore.
  - **4 Dynamic Data Layers:**
    - *Renter Cost Burden (%):* Share of renter households paying 30%+ of income on rent.
    - *Census Median Gross Rent:* Official ACS benchmark rents.
    - *Zillow Asking Rent (ZORI):* Current market asking rents.
    - *Your Personal Rent Share (%):* Live jurisdiction heat map calibrated to your own entered household income.
  - Interactive county inspector card displaying region tags, median figures, market gaps, and rank.
  - Smart collision-aware hovering tooltips (with auto-flipping near borders to prevent clipping).
  - Quick region badges: Western Maryland, Capital Region, Central Maryland, Southern Maryland, and Eastern Shore.

- 📊 **Statewide Key Figures Banner**
  - Instant 7-metric headline banner providing state medians, market asking averages, cost-burden rates, median renter incomes, and home values.

- 💡 **Personal Rent Burden Calculator**
  - Enter any household income to compute personal rent share across every county in real time.
  - Clear visual indicators benchmarked against the standard 30% affordability rule.

- 🎯 **Renter Burden Visual Dot-Plot Gauge**
  - 20% to 80% distribution axis visualizing all 24 jurisdictions.
  - High-contrast, WCAG 2.1 AA accessible county indicator with comparisons to the county's all-household median income.

- 📋 **Sortable 24-Jurisdiction Comparison Table**
  - Instant sorting, filtering, and regional searching across all 24 counties.
  - Census median rent vs. Zillow ZORI market gap calculations with margin-of-error (MOE) details.
  - One-click CSV dataset export for analysts, researchers, and journalists.

- 📈 **Historical Multi-Period Trends**
  - Multi-window comparative cards across Census ACS 5-year releases (2018–2023).
  - Historical comparison table tracking gross rent inflation vs. renter income growth.

- 🧮 **Interactive Housing Scenarios**
  - *Rent vs. Income Escalation:* Models long-term compounding rent increases against personal wage growth over 3, 5, and 10-year horizons.
  - *Illustrative Homeownership Estimator:* Calculates estimated monthly ownership costs (Principal & Interest, Property Taxes, Homeowner's Insurance, PMI, and Maintenance Reserves).

- 🔒 **Privacy-First & Lightweight**
  - Zero third-party trackers, zero advertising, and no telemetry.
  - All salary calculations and data filtering execute purely in-memory in the browser.

---

### 🛠️ Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Runtime & Bundler** | [Vite 6](https://vitejs.dev/) | Ultra-fast development server and optimized static production builds |
| **Frontend Architecture** | Modern Vanilla JavaScript (ES6+) | Framework-overhead-free, high-performance DOM manipulation |
| **Styling & Design System** | Modern CSS3 | Custom design tokens, responsive CSS Grid/Flexbox, WCAG 2.1 AA compliance |
| **Geographic Mapping** | Native SVG Vector Projection | Custom Maryland county boundary paths (`maryland-map-paths.json`) |
| **Typography** | Google Fonts | Bricolage Grotesque (display & headings) and JetBrains Mono (data & metrics) |
| **Census Data** | U.S. Census Bureau ACS 5-Year | Tables B25064, B19013, B25077, B25119, B25070 |
| **Market Rent Data** | Zillow Research | Zillow Observed Rent Index (ZORI) smoothed asking rents |
| **Hosting & Deployment** | GitHub Pages | Pre-configured `/docs` deployment tree for instant static hosting |
| **Newsletter** | Buttondown | Privacy-friendly "Rent Watch" email updates |

---

### 🚀 Getting Started

#### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or later)
- [npm](https://www.npmjs.com/) (version 9 or later)

#### 1. Clone the repository
```bash
git clone https://github.com/IdaAkiwumi/maryland-housing-burden.git
cd maryland-housing-burden
```

#### 2. Install dependencies
```bash
npm install
```

#### 3. Run local development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

#### 4. Build for production
```bash
npm run build
```

---

### 📁 Project Structure

```
├── index.html                  # Semantic application markup, header, & sections
├── app.js                      # Core application logic, choropleth map, & calculators
├── styles.css                  # Design tokens, typography, layouts, and map themes
├── maryland-map-paths.json     # Custom SVG vector boundary paths & centroids
├── data.json                   # 24-jurisdiction ACS multi-period & ZORI dataset
├── counties.csv                # Downloadable open dataset for public analysis
├── docs/                       # Static production deployment (GitHub Pages ready)
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── maryland-map-paths.json
├── public/                     # Static assets, web manifest, and open data
│   ├── data.json
│   ├── counties.csv
│   ├── maryland-map-paths.json
│   ├── favicon.svg, favicon.ico
│   ├── site.webmanifest
│   └── robots.txt, sitemap.xml
├── metadata.json               # Application configuration & metadata
├── package.json                # Project dependencies & build scripts
├── vite.config.ts              # Vite configuration
└── README.md                   # Project documentation
```

---

### 📊 Data Sources & Methodology

1. **U.S. Census Bureau American Community Survey (ACS) 5-Year Estimates:**
   - Table `B25064`: Median Gross Rent (Renters paying cash)
   - Table `B19013`: Median Household Income (All households)
   - Table `B25119`: Median Household Income the Past 12 Months by Tenure (Renter households)
   - Table `B25070`: Gross Rent as a Percentage of Household Income (30%+ cost-burdened metric)
   - Table `B25077`: Median Value (Owner-occupied housing units)
2. **Zillow Observed Rent Index (ZORI):**
   - Measures asking rent for listings on Zillow, capturing recent market movements faster than the multi-year Census ACS surveys.
3. **Affordability Standard:**
   - Based on the standard Department of Housing and Urban Development (HUD) threshold where spending **over 30%** of gross household income on rent and utilities constitutes a cost burden.

---

### ☕ Support This Project

If you find this dashboard helpful for housing research, policy analysis, or finding an affordable place to live in Maryland, please consider supporting ongoing maintenance and data updates:

- 💖 [Sponsor on GitHub](https://github.com/sponsors/IdaAkiwumi)
- ☕ [Donate via PayPal](https://www.paypal.com/paypalme/iakiwumi)

Developed with care by **Ida Akiwumi** — UX Designer | Analytics Engineer.
