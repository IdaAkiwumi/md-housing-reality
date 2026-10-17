"use strict";

const $ = id => document.getElementById(id);

/* ---------- Config ---------- */
const SUBSTACK_SHARE_URL = "https://substack.com/notes";

const SITE_TITLE = "Maryland Housing Burden";
const SITE_BLURB =
  "What rent actually costs. What income you'd need. How you compare.";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

let data = null;
let comparedIncome = 65000;
let sortColumn = null;
let sortDirection = "asc";

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(message) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.textContent = "";
  }, 3400);
}

/* ---------- Formatting ---------- */
function dollars(value) {
  if (value === null || !Number.isFinite(value)) return "—";
  return currencyFormatter.format(value);
}

function percent(value) {
  if (value === null || !Number.isFinite(value)) return "Not available";
  return `${value.toFixed(1)} percent`;
}

function percentShort(value) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function readNumber(id) {
  const field = $(id);
  const raw = field.value.trim();
  if (raw === "" || !field.checkValidity()) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/* ---------- Small helpers ---------- */
function addTableRow(parent, values, dataAttrs) {
  const row = document.createElement("tr");
  if (dataAttrs) {
    for (const [k, v] of Object.entries(dataAttrs)) {
      row.dataset[k] = v;
    }
  }
  values.forEach((value, index) => {
    const cell = document.createElement(index === 0 ? "th" : "td");
    if (index === 0) cell.scope = "row";
    cell.textContent = value;
    row.append(cell);
  });
  parent.append(row);
}

function addResultLine(parent, text) {
  const p = document.createElement("p");
  p.textContent = text;
  parent.append(p);
}

function updateScenarioIncomeLabel() {
  const income = readNumber("income");
  $("scenarioIncome").textContent = income === null
    ? "Enter a valid yearly household income above."
    : `Starting yearly income: ${dollars(income)}.`;
}

function markResultAsNeedingUpdate(resultId, message) {
  $(resultId).textContent = message;
}

function latestRowFor(countyId) {
  if (!data) return null;
  const latestYear = Math.max(...data.metadata.years);
  return data.rows.find(
    row => row.id === countyId && row.year === latestYear
  ) || null;
}

/* ---------- Sorting ---------- */
function sortValueFor(row, column) {
  if (column === "name") return row.name;
  if (column === "rent") return row.rent;
  if (column === "market_rent_now") return row.market_rent_now;
  if (column === "benchmark") return row.rent == null ? null : row.rent * 12 / 0.30;
  if (column === "share") {
    if (comparedIncome == null || comparedIncome <= 0) return null;
    return row.rent == null ? null : row.rent * 12 / comparedIncome * 100;
  }
  if (column === "burden_percent") return row.burden_percent;
  return null;
}

function sortRows(rows) {
  if (!sortColumn) return rows;
  const dir = sortDirection === "asc" ? 1 : -1;
  const isString = sortColumn === "name";

  return [...rows].sort((a, b) => {
    const av = sortValueFor(a, sortColumn);
    const bv = sortValueFor(b, sortColumn);

    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    if (isString) return av.localeCompare(bv) * dir;
    return (av - bv) * dir;
  });
}

function updateSortIndicators() {
  document.querySelectorAll("#countiesTable thead th[data-sort]").forEach(th => {
    const col = th.dataset.sort;
    if (col === sortColumn) {
      th.setAttribute(
        "aria-sort",
        sortDirection === "asc" ? "ascending" : "descending"
      );
    } else {
      th.setAttribute("aria-sort", "none");
    }
  });
}

function handleSortClick(column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
  } else {
    sortColumn = column;
    sortDirection = "asc";
  }
  updateSortIndicators();
  renderIncomeTable();
  const countyId = $("county").value;
  if (countyId) highlightCountyRow(countyId, { scroll: false });
}

/* ---------- Maryland averages ---------- */
function computeStatewideAverages() {
  if (!data) return null;
  const latestYear = Math.max(...data.metadata.years);
  const latestRows = data.rows.filter(r => r.year === latestYear);
  if (latestRows.length === 0) return null;
  const avgRent =
    latestRows.reduce((s, r) => s + r.rent, 0) / latestRows.length;
  return { avgRent, count: latestRows.length };
}

/* ---------- Stat band ---------- */
function updateStatBand() {
  if (!data) return;
  const row = latestRowFor($("county").value);
  if (!row) return;

  $("hitsCountyName").textContent = row.name;
  $("hitRent").textContent = dollars(row.rent);
  $("hitMarketRent").textContent = row.market_rent_now
    ? dollars(row.market_rent_now)
    : "—";
  $("hitBenchmark").textContent = dollars(row.rent * 12 / 0.30);
  $("hitBurden").textContent = percentShort(row.burden_percent);

  const md = computeStatewideAverages();
  if (md) $("hitMdAvg").textContent = dollars(md.avgRent);

  if (comparedIncome === null || comparedIncome <= 0) {
    $("hitIncome").textContent = "—";
    $("hitShare").textContent = "—";
    return;
  }

  $("hitIncome").textContent = dollars(comparedIncome);
  const share = row.rent * 12 / comparedIncome * 100;
  $("hitShare").textContent = percentShort(share);
}

/* ---------- Row highlight ---------- */
let highlightTimer = null;

function highlightCountyRow(countyId, { scroll = true } = {}) {
  document.querySelectorAll("tr.row-highlight")
    .forEach(el => el.classList.remove("row-highlight"));

  if (!countyId) return;

  const row = document.querySelector(
    `#counties tr[data-county-id="${countyId}"]`
  );
  if (!row) return;

  row.classList.add("row-highlight");

  if (scroll) {
    row.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (highlightTimer) clearTimeout(highlightTimer);
  highlightTimer = setTimeout(() => {
    row.classList.remove("row-highlight");
  }, 3200);
}

/* ---------- County table ---------- */
function renderIncomeTable() {
  if (!data) {
    $("tableNote").textContent = "The county estimates are still loading.";
    return;
  }

  const latestYear = Math.max(...data.metadata.years);
  const latestRows = data.rows.filter(row => row.year === latestYear);
  const sorted = sortRows(latestRows);

  $("counties").replaceChildren();

  sorted.forEach(row => {
    const incomeShare = comparedIncome === null
      ? null
      : row.rent * 12 / comparedIncome * 100;

    addTableRow(
      $("counties"),
      [
        row.name,
        dollars(row.rent),
        dollars(row.rent_moe),
        row.market_rent_now ? dollars(row.market_rent_now) : "—",
        dollars(row.rent * 12 / 0.30),
        incomeShare === null ? "Not calculated" : percentShort(incomeShare),
        percentShort(row.burden_percent)
      ],
      { countyId: row.id }
    );
  });

  $("tableNote").textContent = comparedIncome === null
    ? "Enter your income and press Compare to calculate the personal column."
    : `Using a yearly household income of ${dollars(comparedIncome)}.`;
}

/* ---------- Trend cards ---------- */
function renderTrendCards(history) {
  const container = $("trendCards");
  if (!container) return;
  container.replaceChildren();

  if (history.length === 0) return;

  const metrics = [
    { key: "rent", label: "Median monthly gross rent" },
    { key: "income", label: "Median yearly household income (all households)" },
    { key: "renter_income", label: "Median yearly renter household income" },
    { key: "home_value", label: "Median owner occupied home value" }
  ];

  metrics.forEach(metric => {
    const card = document.createElement("div");
    card.className = "trend-card";

    const h = document.createElement("h3");
    h.textContent = metric.label;
    card.append(h);

    const values = history.map(row => row[metric.key] ?? 0);
    const maxV = Math.max(...values, 1);

    const barsWrap = document.createElement("div");
    barsWrap.className = "trend-bars";

    history.forEach(row => {
      const v = row[metric.key];

      const bar = document.createElement("div");
      bar.className = "trend-bar";

      const val = document.createElement("b");
      val.textContent = v == null ? "—" : dollars(v);

      const colWrap = document.createElement("div");
      colWrap.className = "col-wrap";

      const col = document.createElement("div");
      col.className = "col";
      col.style.height = v == null ? "0%" : `${(v / maxV * 100).toFixed(1)}%`;
      colWrap.append(col);

      const label = document.createElement("span");
      label.textContent = `${row.year - 4}–${String(row.year).slice(-2)}`;

      bar.append(val, colWrap, label);
      barsWrap.append(bar);
    });

    card.append(barsWrap);

    const first = values[0];
    const last = values[values.length - 1];
    if (first > 0 && last > 0) {
      const deltaDollar = last - first;
      const deltaPct = (last / first - 1) * 100;
      const sign = deltaDollar >= 0 ? "+" : "−";
      const change = document.createElement("p");
      change.className = "trend-change";
      change.innerHTML =
        `<b>${sign}${dollars(Math.abs(deltaDollar))}</b> · ${percentShort(Math.abs(deltaPct))}`;
      card.append(change);
    }

    container.append(card);
  });
}

/* ---------- Renter burden story ---------- */
function renderBurdenStory() {
  const story = $("burdenStory");
  if (!story || !data) return;

  const latestYear = Math.max(...data.metadata.years);
  const latestRows = data.rows.filter(r => r.year === latestYear);
  const row = latestRowFor($("county").value);
  if (!row || row.burden_percent == null) {
    story.hidden = true;
    return;
  }

  const burdens = latestRows
    .filter(r => r.burden_percent != null)
    .map(r => ({ id: r.id, name: r.name, value: r.burden_percent }));

  burdens.sort((a, b) => a.value - b.value);
  const min = burdens[0];
  const max = burdens[burdens.length - 1];

  const share = row.burden_percent / 100;
  const householdsPerTen = Math.round(share * 10);

  const span = max.value - min.value || 1;
  const pctPos = ((row.burden_percent - min.value) / span) * 100;
  const clamp = Math.max(2, Math.min(98, pctPos));

  let comparison;
  if (row.id === min.id) {
    comparison = `${row.name} has the <b>lowest</b> renter burden in the state.`;
  } else if (row.id === max.id) {
    comparison = `${row.name} has the <b>highest</b> renter burden in the state.`;
  } else {
    const above = burdens.filter(b => b.value < row.burden_percent).length;
    comparison = `${row.name} ranks <b>${above + 1} of ${burdens.length}</b> counties by renter burden, from lowest to highest.`;
  }

  let renterIncomeLine = "";
  if (row.renter_income != null && row.income != null) {
    const gap = row.income - row.renter_income;
    const gapPct = (gap / row.income) * 100;
    renterIncomeLine = `<p>Renter household income is <b>${dollars(row.renter_income)}</b>, about <b>${percentShort(gapPct)}</b> below the all-household median of ${dollars(row.income)}.</p>`;
  }

  story.innerHTML = `
    <h3>Renter burden in ${row.name}</h3>
    <p class="hook">
      <b>${householdsPerTen} in 10</b> renter households here spend
      30% or more of income on rent.
    </p>
    <div class="burden-range" role="img"
         aria-label="Renter burden in ${row.name}: ${percentShort(row.burden_percent)}. Maryland range: ${percentShort(min.value)} to ${percentShort(max.value)}.">
      <div class="burden-track"></div>
      <div class="burden-pin" style="left: ${clamp}%"></div>
    </div>
    <div class="burden-scale">
      <span>${percentShort(min.value)} · ${min.name}</span>
      <span>${percentShort(max.value)} · ${max.name}</span>
    </div>
    <p>${comparison}</p>
    ${renterIncomeLine}
    <p style="font-size:0.78rem;opacity:0.75;margin-top:0.5rem;">
      Renter burden comes from ACS table B25070 and describes surveyed
      renter households. Renter income comes from B25119.
    </p>
  `;
  story.hidden = false;
}

/* ---------- History ---------- */
function renderHistory() {
  if (!data) return;

  const selectedId = $("county").value;
  const history = data.rows
    .filter(row => row.id === selectedId)
    .sort((a, b) => a.year - b.year);

  $("history").replaceChildren();
  $("trendCards").replaceChildren();
  $("burdenStory").hidden = true;

  if (history.length === 0) {
    $("trendTitle").textContent = "Choose a county to see its history.";
    return;
  }

  $("trendTitle").textContent =
    `${history[0].name} · Census ACS survey windows`;

  history.forEach(row => {
    addTableRow($("history"), [
      `${row.year - 4} through ${row.year}`,
      dollars(row.rent),
      dollars(row.rent_moe),
      dollars(row.income),
      dollars(row.income_moe),
      row.renter_income == null ? "—" : dollars(row.renter_income),
      dollars(row.home_value),
      dollars(row.home_value_moe)
    ]);
  });

  renderTrendCards(history);
  renderBurdenStory();
}

/* ---------- Rent scenario ---------- */
function calculateRentScenario() {
  const income = readNumber("income");
  const startingRent = readNumber("startRent");
  const rentGrowth = readNumber("rentGrowth");
  const incomeGrowth = readNumber("incomeGrowth");
  const years = readNumber("years");

  const result = $("rentResult");
  result.replaceChildren();

  if (income === null) {
    addResultLine(result,
      "Enter a valid yearly household income above, then calculate again.");
    $("income").focus();
    return;
  }

  if ([startingRent, rentGrowth, incomeGrowth, years].some(v => v === null)) {
    addResultLine(result, "Enter valid numbers in every field.");
    return;
  }

  const futureRent = startingRent * Math.pow(1 + rentGrowth / 100, years);
  const futureIncome = income * Math.pow(1 + incomeGrowth / 100, years);
  const startingShare = startingRent * 12 / income * 100;
  const futureShare = futureRent * 12 / futureIncome * 100;

  addResultLine(result, `After ${years} ${years === 1 ? "year" : "years"}:`);
  addResultLine(result,
    `Monthly rent: ${dollars(startingRent)} → about ${dollars(futureRent)}.`);
  addResultLine(result,
    `Yearly income: ${dollars(income)} → about ${dollars(futureIncome)}.`);
  addResultLine(result,
    `Rent share of income: ${percent(startingShare)} → ${percent(futureShare)}.`);
  addResultLine(result, "Assumes the same growth rates apply every year.");
}

/* ---------- Mortgage ---------- */
function calculateMortgage() {
  const fieldIds = [
    "price", "down", "interest", "term",
    "tax", "insurance", "hoa", "maintenance", "pmi"
  ];
  const values = fieldIds.map(readNumber);
  const result = $("mortgageResult");
  result.replaceChildren();

  if (values.some(v => v === null)) {
    addResultLine(result,
      "Enter valid numbers in every field. Use zero to leave a cost out.");
    return;
  }

  const [
    price, downPercent, yearlyInterest, termYears,
    tax, insurance, hoa, maintenance, mortgageInsurance
  ] = values;

  const downPayment = price * downPercent / 100;
  const principal = price - downPayment;
  const monthlyRate = yearlyInterest / 1200;
  const paymentCount = termYears * 12;

  let principalAndInterest;
  if (monthlyRate === 0) {
    principalAndInterest = principal / paymentCount;
  } else {
    principalAndInterest =
      principal * monthlyRate /
      (1 - Math.pow(1 + monthlyRate, -paymentCount));
  }

  const additionalCosts =
    tax + insurance + hoa + maintenance + mortgageInsurance;
  const monthlyTotal = principalAndInterest + additionalCosts;

  addResultLine(result, `Down payment: ${dollars(downPayment)}.`);
  addResultLine(result, `Loan amount: ${dollars(principal)}.`);
  addResultLine(result,
    `Principal and interest: ${dollars(principalAndInterest)} / month.`);
  addResultLine(result,
    `Other monthly costs entered: ${dollars(additionalCosts)}.`);
  addResultLine(result,
    `Estimated monthly total: ${dollars(monthlyTotal)}.`);

  const omittedCosts = [
    ["property tax", tax],
    ["homeowners insurance", insurance],
    ["HOA or condo fees", hoa],
    ["maintenance reserve", maintenance],
    ["mortgage insurance", mortgageInsurance]
  ].filter(([, amount]) => amount === 0).map(([label]) => label);

  if (omittedCosts.length > 0) {
    addResultLine(result,
      `Leaves out (entered as zero): ${omittedCosts.join(", ")}.`);
  }
}

/* ---------- Validation ---------- */
function validateData(payload) {
  if (!payload || !payload.metadata ||
      !Array.isArray(payload.metadata.years) ||
      !Array.isArray(payload.rows)) {
    throw new Error("Unexpected data structure.");
  }

  if (payload.metadata.years.length !== 3 || payload.rows.length !== 72) {
    throw new Error("Unexpected number of survey periods or county records.");
  }

  const invalidRow = payload.rows.some(row => (
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    !Number.isInteger(row.year) ||
    !Number.isFinite(row.rent) || row.rent <= 0 ||
    !Number.isFinite(row.income) || row.income <= 0 ||
    !Number.isFinite(row.home_value) || row.home_value <= 0
  ));

  if (invalidRow) {
    throw new Error("A required estimate is missing or invalid.");
  }

  return payload;
}

/* ---------- Share menu ---------- */
function currentShareUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function buildShareLinks() {
  const url = currentShareUrl();
  const text = `${SITE_TITLE} — ${SITE_BLURB}`;
  const fullText = `${text}\n${url}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const encodedFull = encodeURIComponent(fullText);
  const encodedSubject = encodeURIComponent(SITE_TITLE);
  const encodedBlurb = encodeURIComponent(SITE_BLURB);

  return {
    bluesky: `https://bsky.app/intent/compose?text=${encodedFull}`,
    substack: SUBSTACK_SHARE_URL,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin:
      `https://www.linkedin.com/shareArticle?mini=true` +
      `&url=${encodedUrl}&title=${encodedSubject}` +
      `&summary=${encodedBlurb}&source=${encodedSubject}`,
    reddit:
      `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedSubject}`,
    whatsapp: `https://wa.me/?text=${encodedFull}`,
    telegram:
      `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    email: `mailto:?subject=${encodedSubject}&body=${encodedFull}`
  };
}

function closeShareMenu() {
  const menu = $("shareMenu");
  const btn = $("shareBtn");
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  btn.setAttribute("aria-expanded", "false");
}

function openShareMenu() {
  const menu = $("shareMenu");
  const btn = $("shareBtn");
  if (!menu) return;

  const links = buildShareLinks();
  menu.querySelectorAll("[data-share]").forEach(el => {
    const kind = el.dataset.share;
    if (kind && links[kind] && el.tagName === "A") {
      el.href = links[kind];
    }
  });

  menu.hidden = false;
  btn.setAttribute("aria-expanded", "true");
}

function toggleShareMenu() {
  const menu = $("shareMenu");
  if (!menu || menu.hidden) openShareMenu();
  else closeShareMenu();
}

async function copyShareUrl() {
  const url = currentShareUrl();
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/* ---------- Event wiring ---------- */
$("shareBtn").addEventListener("click", event => {
  event.stopPropagation();
  toggleShareMenu();
});

$("shareMenu").addEventListener("click", event => {
  const target = event.target.closest("[data-share]");
  if (!target) return;
  const kind = target.dataset.share;

  if (kind === "copy") {
    event.preventDefault();
    copyShareUrl().then(ok => {
      showToast(ok ? "Link copied to clipboard" : "Could not copy link");
    });
    closeShareMenu();
    return;
  }

  copyShareUrl().then(ok => {
    if (ok) showToast("Link copied — paste into the share window");
  });
  closeShareMenu();
});

document.addEventListener("click", event => {
  if (!$("shareMenu").hidden && !event.target.closest(".share-wrap")) {
    closeShareMenu();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeShareMenu();
});

/* Sortable headers */
document.querySelectorAll("#countiesTable thead th[data-sort]").forEach(th => {
  const btn = th.querySelector(".th-sort");
  if (!btn) return;
  btn.addEventListener("click", () => handleSortClick(th.dataset.sort));
});

$("incomeForm").addEventListener("submit", event => {
  event.preventDefault();
  comparedIncome = readNumber("income");
  renderIncomeTable();
  updateStatBand();
  updateScenarioIncomeLabel();
  markResultAsNeedingUpdate(
    "rentResult",
    "Income changed. Press Calculate rent scenario to refresh."
  );
});

$("income").addEventListener("input", () => {
  updateScenarioIncomeLabel();
  $("tableNote").textContent =
    "Income edited. Press Compare to update the table.";
  markResultAsNeedingUpdate(
    "rentResult",
    "Income changed. Press Calculate rent scenario to refresh."
  );
});

$("county").addEventListener("change", () => {
  renderHistory();
  updateStatBand();
  highlightCountyRow($("county").value, { scroll: false });
});

$("rentForm").addEventListener("submit", event => {
  event.preventDefault();
  calculateRentScenario();
});

$("rentForm").addEventListener("input", () => {
  markResultAsNeedingUpdate(
    "rentResult",
    "Assumptions changed. Press Calculate rent scenario to refresh."
  );
});

$("mortgageForm").addEventListener("submit", event => {
  event.preventDefault();
  calculateMortgage();
});

$("mortgageForm").addEventListener("input", () => {
  markResultAsNeedingUpdate(
    "mortgageResult",
    "Assumptions changed. Press Calculate mortgage estimate to refresh."
  );
});

$("showCounty").addEventListener("click", () => {
  const countyId = $("county").value;
  if (!data || !countyId) return;
  highlightCountyRow(countyId, { scroll: true });
});

/* ---------- Boot ---------- */
async function start() {
  updateScenarioIncomeLabel();

  try {
    const response = await fetch("data.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Data file not found.");

    data = validateData(await response.json());

    const latestYear = Math.max(...data.metadata.years);
    const latestRows = data.rows.filter(row => row.year === latestYear);

    $("county").replaceChildren();
    latestRows.forEach(row => {
      const option = document.createElement("option");
      option.value = row.id;
      option.textContent = row.name;
      $("county").append(option);
    });

    const requestedCounty = new URLSearchParams(
      window.location.search
    ).get("county");

    const countyExists = Array.from($("county").options)
      .some(option => option.value === requestedCounty);

    if (countyExists) $("county").value = requestedCounty;

    const refreshDate = new Date(
      data.metadata.fetched_at
    ).toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "2-digit"
    });

    $("status").textContent = `Refreshed ${refreshDate}`;

    const lastYear = data.metadata.years[data.metadata.years.length - 1];
    $("stamp").textContent = `Census ACS · ${lastYear - 4}–${lastYear}`;

    renderIncomeTable();
    renderHistory();
    updateStatBand();

    if (requestedCounty && countyExists) {
      requestAnimationFrame(() => {
        highlightCountyRow(requestedCounty, { scroll: true });
      });
    }
  } catch (error) {
    data = null;
    $("status").textContent =
      "Data failed to load. Check that data.json exists in docs/ and open via a local web server.";
    $("tableNote").textContent =
      "County comparisons are unavailable until the data loads. The calculators still work.";
  }
}

start();