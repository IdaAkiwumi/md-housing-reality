# Maryland Housing Burden

**Live app:** https://IdaAkiwumi.github.io/md-housing-reality/

A free, independent public interest housing comparison tool for Maryland counties and Baltimore City. Built by Ida Akiwumi.

[LinkedIn](https://www.linkedin.com/in/idaa11/) | [GitHub](https://github.com/IdaAkiwumi)

## What visitors can do
- Enter yearly household income and select Compare.
- Compare county median gross rent with that income.
- See the yearly income that would put median gross rent at a 30 percent benchmark.
- See the estimated share of renter households spending 30 percent or more of income on gross rent.
- Compare rent, household income, renter household income, and owner occupied home value across three survey windows.
- See current asking rent from the Zillow Observed Rent Index next to the Census median.
- Calculate hypothetical rent growth and fixed rate mortgage payments.
- Copy a county link without including personal income.
- Subscribe to Rent Watch, a free monthly email with one county finding.
- Download the prepared estimates as CSV.

## What this site does not do
It does not show live apartment listings, current home sale prices, individual landlord rent increases, or legal rent cap rules. It does not prove that a policy will solve affordability. Inputs are not stored. No paid API, database, npm package, or external JavaScript library is required. Public hosting still involves ordinary provider logs.

## Required tools
- VS Code: https://code.visualstudio.com/
- Python 3.10 or later: https://www.python.org/downloads/
- A free GitHub account: https://github.com/
- Activated Census API key: https://api.census.gov/data/key_signup.html

No npm or pip installation is needed. No real data is bundled. Generate it with the script.

## Local setup, Windows PowerShell
Open the extracted project folder in VS Code. Select Terminal, then New Terminal.

```powershell
python --version
$env:CENSUS_API_KEY="PASTE_YOUR_ACTIVATED_KEY"
python -m unittest discover -s tests -v
python scripts/fetch_data.py
python -m http.server 8000 --directory docs
```

If Windows recognizes py but not python, use py in all four commands.

Visit http://localhost:8000 in your browser. Leave the server running. Press Ctrl+C to stop it.

The API key is an environment variable for this terminal session. Python does not automatically read a .env file.

## Local setup, macOS or Linux

```bash
python3 --version
export CENSUS_API_KEY='PASTE_YOUR_ACTIVATED_KEY'
python3 -m unittest discover -s tests -v
python3 scripts/fetch_data.py
python3 -m http.server 8000 --directory docs
```

## How to use the income comparison
1. Enter your gross yearly household income before taxes.
2. Select Compare.
3. Review the column called Median rent as share of your income.
4. Use the county dropdown to change the detailed comparison and trend section.

If the income field is empty, zero, or invalid, the income share column says Not calculated. The other county estimates still display.

## How to use the scenarios
The rent scenario needs a starting monthly rent, yearly rent increase percent, yearly income increase percent, and number of years. Select Calculate rent scenario.

The mortgage scenario needs purchase price, down payment percent, interest rate, and loan term. It also accepts optional monthly property tax, insurance, HOA or condo fee, maintenance reserve, and mortgage insurance. Enter zero for any cost you want to leave out. Select Calculate mortgage estimate.

These are assumptions, not predictions, quotes, or legal limits.

## Rent Watch
Rent Watch is a free monthly email sent on the 15th of each month with one county finding from the latest data. Sign up at https://IdaAkiwumi.github.io/md-housing-reality/#newsletter.

Email addresses are stored by Buttondown (the email service), not by this project, and are never sold or shared.

The monthly email is generated automatically by `scripts/send_newsletter.py`, which reads the freshly fetched data and posts to the Buttondown API. It requires a BUTTONDOWN_API_KEY repository secret.

## Publish for free
1. Create a public GitHub repository named md-housing-reality. Use main as the default branch.
2. Upload this folder contents, including .github/workflows/publish.yml, scripts, tests, and docs. Do not upload an outer parent directory or your API key.
3. Open Settings, then Secrets and variables, then Actions. Create two repository secrets:
   - CENSUS_API_KEY with your activated Census key.
   - BUTTONDOWN_API_KEY with your Buttondown API key from https://buttondown.com/settings/api.
4. Open Settings, then Pages, then Build and deployment. Set Source to GitHub Actions.
5. Open Actions. Select Publish Maryland Housing Reality. Select Run workflow and choose main.
6. The deploy job outputs your exact live URL. Replace the README link and add it to the repository About section.

The workflow tests the code, fetches all three Census releases plus Zillow ZORI data, validates the result, sends the monthly Rent Watch email, uploads the static files, and deploys them. It does not commit generated data to Git. A failed data fetch prevents a replacement deployment. Scheduled runs are best effort, not real time. GitHub can disable schedules on inactive public repositories, so check Actions regularly.

## Methodology
Census API: https://api.census.gov/data/{YEAR}/acs/acs5  
Geography: for=county:* and in=state:24  
Years: 2014, 2019, and 2024, representing 2010 through 2014, 2015 through 2019, and 2020 through 2024.

Census variables:
- B25064_001E and B25064_001M: median gross rent and margin of error.
- B19013_001E and B19013_001M: median household income and margin of error.
- B25077_001E and B25077_001M: median owner occupied home value and margin of error.
- B25119_003E and B25119_003M: median renter household income and margin of error.
- B25070: gross rent as a percentage of household income.

Market rent source: Zillow Observed Rent Index (ZORI), county level, smoothed and seasonally adjusted. Public CSV download at https://www.zillow.com/research/data/. No API key required. Zillow does not publish ZORI for every county. In Maryland, Kent and Somerset are typically excluded because the rental sample is too small to produce a reliable monthly estimate.

The rent burden estimate adds B25070 categories 007 through 010. It divides that total by B25070 category 001 minus category 011. Households without a calculated rent to income ratio are excluded. No margin of error is calculated for the resulting percentage.

The 30 percent benchmark is monthly rent multiplied by 12, then divided by 0.30.

Percent change is the later estimate divided by the earlier estimate, minus one, then multiplied by 100. It is not annual growth and not adjusted for inflation. The site does not calculate statistical significance for changes.

A missing or suppressed primary dollar estimate stops publication rather than being replaced with zero. The data is validated before existing JSON is replaced. The fetch date is not the survey release date. Monthly refresh checks the same pinned Census releases and refreshes ZORI. Update the YEARS setting and site labels together after reviewing new releases.

## Source resources
- ACS API: https://www.census.gov/programs-surveys/acs/data/data-via-api.html
- Dataset: https://api.census.gov/data/2024/acs/acs5.html
- Tables: https://api.census.gov/data/2024/acs/acs5/groups.html
- Zillow Research: https://www.zillow.com/research/data/
- ZORI methodology: https://www.zillow.com/research/methodology-zori-repeat-rent-27092/
- Buttondown: https://buttondown.com/
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- Maryland General Assembly: https://mgaleg.maryland.gov/
- Prince George's County rent stabilization: https://www.princegeorgescountymd.gov/departments-offices/permitting-inspections-and-enforcement/about-dpie/permanent-rent-stabilization-and-protection-act-prsa

## Before sharing publicly
- Confirm 24 county level jurisdictions in each release.
- Check several figures against the Census tables and against Zillow ZORI.
- Test the income comparison, rent scenario, mortgage scenario, county links, newsletter signup, and CSV download.
- Test narrow screens, keyboard only navigation, 200 percent zoom, and a screen reader.
- Add your name, contact, portfolio link, live URL, and repository issue link.
- Make a screenshot and write a short case study covering the problem, decisions, methods, limitations, and testing.
- Do not claim this is the first housing dashboard, current asking rent, proof of a policy effect, or guaranteed news coverage.

## Troubleshooting
Missing data: run fetch_data.py before serving the site. Do not open index.html with file://.

API failure: check that your key is activated and that your internet connection works. The script does not print the request URL, so your key is not exposed in an error message. Retry later if Census is unavailable.

ZORI download failure: the script prints a warning and continues without market rent figures. The site still works with Census data only.

Buttondown failure: check that BUTTONDOWN_API_KEY is set correctly. A failed send does not block the site deploy. Check the Actions log for the specific error code.

GitHub Pages 404: verify that Pages source is GitHub Actions, the workflow succeeded, and the repository URL is correct.

No new release after refresh: Census release years are intentionally pinned, not automatically discovered. ZORI updates monthly.

## Project status
Python normalization and helper tests are included. Live Census retrieval, ZORI ingestion, Buttondown delivery, your account deployment, browser behavior, and accessibility must be verified before launch. There is no fake or demo data fallback presented as real data.

## License
Original project code is MIT licensed. See LICENSE. Third party data and linked materials remain subject to their providers terms. This is an independent project and not official government advice.