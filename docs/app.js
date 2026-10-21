"use strict";

const $ = id => document.getElementById(id);

/* ---------- Config ---------- */
const SUBSTACK_SHARE_URL = "https://substack.com/notes";
const SITE_TITLE = "Maryland Housing Burden";
const SITE_BLURB =
  "What rent actually costs. What income you would need. How you compare across Maryland.";

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
  if (!field) return null;
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
  const el = $("scenarioIncome");
  if (!el) return;
  el.textContent = income === null
    ? "Enter a valid yearly household income above."
    : `Starting yearly income: ${dollars(income)}.`;
}

function markResultAsNeedingUpdate(resultId, message) {
  const el = $(resultId);
  if (el) el.textContent = message;
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
  if (column === "benchmark") return row.rent == null ? null : (row.rent * 12) / 0.30;
  if (column === "share") {
    if (comparedIncome == null || comparedIncome <= 0) return null;
    return row.rent == null ? null : (row.rent * 12 / comparedIncome) * 100;
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

/* ---------- YELLOW SUMMARY BAR & 2 MICROCHARTS ---------- */
function updateStatBand() {
  if (!data) return;
  const selectedCountyId = $("county").value;
  const row = latestRowFor(selectedCountyId);
  if (!row) return;

  // Header and standard number tiles
  $("hitsCountyName").textContent = row.name;
  $("hitRent").textContent = dollars(row.rent);
  $("hitMarketRent").textContent = row.market_rent_now
    ? dollars(row.market_rent_now)
    : "—";
  $("hitBenchmark").textContent = dollars((row.rent * 12) / 0.30);

  const md = computeStatewideAverages();
  if (md) $("hitMdAvg").textContent = dollars(md.avgRent);

  // MICROCHART 1: Renter Cost Burden (Horizontal Proportion Bar on 0-100% scale)
  const burdenVal = row.burden_percent;
  if (burdenVal !== null && Number.isFinite(burdenVal)) {
    $("hitBurden").textContent = percentShort(burdenVal);
    const clampedWidth = Math.max(0, Math.min(100, burdenVal));
    $("hitBurdenFill").style.width = `${clampedWidth.toFixed(1)}%`;
    $("hitBurdenBarWrap").setAttribute(
      "aria-label",
      `Renter cost burden in ${row.name}: ${percentShort(burdenVal)} of surveyed renter households spend 30% or more of income on rent.`
    );
  } else {
    $("hitBurden").textContent = "—";
    $("hitBurdenFill").style.width = "0%";
    $("hitBurdenBarWrap").setAttribute("aria-label", "Renter cost burden not available");
  }

  // Personal Income Display
  if (comparedIncome === null || comparedIncome <= 0) {
    $("hitIncome").textContent = "—";
    $("hitShare").textContent = "—";
    $("hitShareFill").style.width = "0%";
    $("hitShareTarget").style.display = "none";
    $("hitShareBulletWrap").setAttribute(
      "aria-label",
      "Rent share not calculated. Enter your household income to calculate."
    );
    return;
  }

  $("hitIncome").textContent = dollars(comparedIncome);

  // MICROCHART 2: Rent Share Bullet Chart with 30% Benchmark Marker
  const share = (row.rent * 12 / comparedIncome) * 100;
  $("hitShare").textContent = percentShort(share);

  // The displayed bullet scale spans 0% to 100%
  // 30% benchmark marker sits exactly at 30% position
  $("hitShareTarget").style.display = "block";
  $("hitShareTarget").style.left = "30%";

  if (share > 100) {
    $("hitShareFill").style.width = "100%";
  } else {
    $("hitShareFill").style.width = `${Math.max(0, share).toFixed(1)}%`;
  }

  $("hitShareBulletWrap").setAttribute(
    "aria-label",
    `Median rent is ${percentShort(share)} of your entered income of ${dollars(comparedIncome)}. The standard affordability benchmark is 30%.`
  );
}

/* ---------- MAIN IMPROVEMENT 3: Census vs. Zillow Rental Comparison ---------- */
function updateRentComparisonCard() {
  if (!data) return;
  const countyId = $("county").value;
  const row = latestRowFor(countyId);
  if (!row) return;

  $("rentCompHeading").textContent = `${row.name} Rental Comparison`;
  $("compCensusRent").textContent = dollars(row.rent);

  // Baseline scale for visual bars (maximum benchmark $2,800 to keep relative perspective)
  const maxAxis = 2800;
  const censusWidth = Math.min(100, (row.rent / maxAxis) * 100);
  $("compCensusBar").style.width = `${censusWidth.toFixed(1)}%`;
  $("compCensusDetail").textContent =
    `Census ACS 5-year median gross rent ($${row.rent_moe ? `±$${Math.round(row.rent_moe)} MOE` : ""}), including tenant-paid utilities.`;

  if (row.market_rent_now) {
    $("compZillowRent").textContent = dollars(row.market_rent_now);
    const zillowWidth = Math.min(100, (row.market_rent_now / maxAxis) * 100);
    $("compZillowBar").style.width = `${zillowWidth.toFixed(1)}%`;
    $("compZillowBar").style.background = "var(--zillow)";
    $("compZillowDetail").textContent =
      "Zillow Observed Rent Index (ZORI) monthly asking rent for available market listings.";
  } else {
    $("compZillowRent").textContent = "Not available";
    $("compZillowBar").style.width = "0%";
    $("compZillowDetail").textContent =
      `Zillow does not publish the Rent Index for ${row.name} due to low rental listing volume. Census median rent is shown.`;
  }
}

/* ---------- MAIN IMPROVEMENT 1: Statewide Renter Burden Distribution Dot-Plot ---------- */
function renderBurdenDistribution() {
  const svg = $("burdenDistributionSvg");
  if (!svg || !data) return;

  const latestYear = Math.max(...data.metadata.years);
  const rows = data.rows.filter(r => r.year === latestYear && r.burden_percent !== null);
  const selectedCountyId = $("county").value;

  // Clear previous SVG contents
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const width = 960;
  const height = 140;
  const padLeft = 40;
  const padRight = 40;
  const chartWidth = width - padLeft - padRight;
  const axisY = 95;

  const minPct = 20;
  const maxPct = 80;
  const getX = pct => padLeft + ((pct - minPct) / (maxPct - minPct)) * chartWidth;

  // Background subtle guide lines at 20, 30 (benchmark), 40, 50, 60, 70, 80
  const ticks = [20, 30, 40, 50, 60, 70, 80];
  ticks.forEach(t => {
    const x = getX(t);
    const isBenchmark = t === 30;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x);
    line.setAttribute("x2", x);
    line.setAttribute("y1", 20);
    line.setAttribute("y2", axisY + 12);
    line.setAttribute("stroke", isBenchmark ? "var(--warn)" : "var(--hair)");
    line.setAttribute("stroke-width", isBenchmark ? "1.5" : "1");
    if (isBenchmark) line.setAttribute("stroke-dasharray", "3 3");
    svg.appendChild(line);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", x);
    label.setAttribute("y", axisY + 26);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-family", "var(--f-mono)");
    label.setAttribute("font-size", isBenchmark ? "11" : "10");
    label.setAttribute("font-weight", isBenchmark ? "700" : "500");
    label.setAttribute("fill", isBenchmark ? "var(--warn)" : "var(--muted)");
    label.textContent = isBenchmark ? "30% benchmark" : `${t}%`;
    svg.appendChild(label);
  });

  // Base axis line
  const baseLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  baseLine.setAttribute("x1", padLeft);
  baseLine.setAttribute("x2", width - padRight);
  baseLine.setAttribute("y1", axisY);
  baseLine.setAttribute("y2", axisY);
  baseLine.setAttribute("stroke", "var(--ink-2)");
  baseLine.setAttribute("stroke-width", "2");
  svg.appendChild(baseLine);

  // Jitter points vertically slightly to prevent complete overlap
  // Sort rows by burden
  const sorted = [...rows].sort((a, b) => a.burden_percent - b.burden_percent);
  let selectedPointData = null;

  sorted.forEach((r, idx) => {
    const x = getX(r.burden_percent);
    // Vertical stagger around y=68
    const yOffsets = [68, 52, 82, 60, 74];
    const y = yOffsets[idx % yOffsets.length];
    const isSelected = r.id === selectedCountyId;

    if (isSelected) {
      selectedPointData = { r, x, y };
      return; // Draw selected point last on top
    }

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("tabindex", "0");
    group.setAttribute("role", "button");
    group.setAttribute("aria-label", `${r.name}: ${percentShort(r.burden_percent)} renter burden`);
    group.style.cursor = "pointer";

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${r.name}: ${percentShort(r.burden_percent)}`;
    group.appendChild(title);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", "5.5");
    circle.setAttribute("fill", "var(--accent)");
    circle.setAttribute("opacity", "0.75");
    circle.setAttribute("stroke", "var(--land)");
    circle.setAttribute("stroke-width", "1.5");
    group.appendChild(circle);

    const selectThisCounty = () => {
      $("county").value = r.id;
      renderHistory();
      updateStatBand();
      updateRentComparisonCard();
      renderBurdenDistribution();
      updateMarylandMap();
      highlightCountyRow(r.id, { scroll: false });
    };

    group.addEventListener("click", selectThisCounty);
    group.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectThisCounty();
      }
    });

    svg.appendChild(group);
  });

  // Highlighted Selected County Point
  if (selectedPointData) {
    const { r, x, y } = selectedPointData;

    // Drop line to axis
    const dropLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    dropLine.setAttribute("x1", x);
    dropLine.setAttribute("x2", x);
    dropLine.setAttribute("y1", y);
    dropLine.setAttribute("y2", axisY);
    dropLine.setAttribute("stroke", "var(--hits-ink)");
    dropLine.setAttribute("stroke-width", "1.5");
    dropLine.setAttribute("stroke-dasharray", "2 2");
    svg.appendChild(dropLine);

    // Callout badge above point
    const callout = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const calloutBox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const textWidth = Math.max(140, r.name.length * 9 + 44);
    const boxX = Math.max(padLeft, Math.min(width - padRight - textWidth, x - textWidth / 2));

    calloutBox.setAttribute("x", boxX);
    calloutBox.setAttribute("y", "6");
    calloutBox.setAttribute("width", textWidth);
    calloutBox.setAttribute("height", "32");
    calloutBox.setAttribute("rx", "6");
    calloutBox.setAttribute("fill", "#111317");
    calloutBox.setAttribute("stroke", "#ffffff");
    calloutBox.setAttribute("stroke-width", "1.5");
    callout.appendChild(calloutBox);

    const calloutText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    calloutText.setAttribute("x", boxX + textWidth / 2);
    calloutText.setAttribute("y", "26");
    calloutText.setAttribute("text-anchor", "middle");
    calloutText.setAttribute("font-family", "var(--f-display)");
    calloutText.setAttribute("font-size", "13");
    calloutText.setAttribute("font-weight", "800");
    calloutText.setAttribute("fill", "#ffffff");
    calloutText.textContent = `${r.name}: ${percentShort(r.burden_percent)}`;
    callout.appendChild(calloutText);
    svg.appendChild(callout);

    // Outer glow ring
    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ring.setAttribute("cx", x);
    ring.setAttribute("cy", y);
    ring.setAttribute("r", "10");
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", "var(--hits-border)");
    ring.setAttribute("stroke-width", "3");
    svg.appendChild(ring);

    // Center solid circle
    const center = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    center.setAttribute("cx", x);
    center.setAttribute("cy", y);
    center.setAttribute("r", "6");
    center.setAttribute("fill", "var(--hits-ink)");
    center.setAttribute("stroke", "#ffffff");
    center.setAttribute("stroke-width", "2");
    svg.appendChild(center);

    $("chartSummaryLine").textContent =
      `Selected: ${r.name} (${percentShort(r.burden_percent)} of surveyed renter households spending 30%+ on gross rent). Click any dot on the chart to inspect another county.`;

    const wrap = $("distributionChartWrap");
    if (wrap && wrap.scrollWidth > wrap.clientWidth) {
      const scrollRatio = x / width;
      const targetScroll = (scrollRatio * wrap.scrollWidth) - (wrap.clientWidth / 2);
      wrap.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
    }
  }
}

/* ---------- INTERACTIVE GEOGRAPHICAL MAP DATA VISUALIZATION ---------- */
let mapPathsData = null;
let currentMapMetric = "burden_percent";

const MAP_METRICS = {
  burden_percent: {
    label: "Renter Cost Burden (% spending 30%+ of income on gross rent)",
    shortLabel: "Renter Burden",
    unit: "%",
    formatter: v => (v !== null && Number.isFinite(v) ? `${v.toFixed(1)}%` : "N/A"),
    higherIsBurden: true,
    palette: [
      { stop: 0.0, color: "#d1fae5" }, // ~35%
      { stop: 0.25, color: "#fef08a" },
      { stop: 0.5, color: "#fed7aa" },
      { stop: 0.75, color: "#fb923c" },
      { stop: 1.0, color: "#dc2626" }
    ],
    getValue: row => row.burden_percent
  },
  rent: {
    label: "Census Median Gross Rent ($/month, includes utilities)",
    shortLabel: "Median Rent",
    unit: "$",
    formatter: v => dollars(v),
    higherIsBurden: true,
    palette: [
      { stop: 0.0, color: "#e0f2fe" },
      { stop: 0.25, color: "#bae6fd" },
      { stop: 0.5, color: "#38bdf8" },
      { stop: 0.75, color: "#0284c7" },
      { stop: 1.0, color: "#0369a1" }
    ],
    getValue: row => row.rent
  },
  market_rent_now: {
    label: "Zillow Current Asking Rent (ZORI Monthly Index)",
    shortLabel: "Market Rent",
    unit: "$",
    formatter: v => (v !== null && Number.isFinite(v) ? dollars(v) : "No listings"),
    higherIsBurden: true,
    palette: [
      { stop: 0.0, color: "#ccfbf1" },
      { stop: 0.25, color: "#5eead4" },
      { stop: 0.5, color: "#14b8a6" },
      { stop: 0.75, color: "#0f766e" },
      { stop: 1.0, color: "#115e59" }
    ],
    getValue: row => row.market_rent_now
  },
  share: {
    label: "Median Rent as Share of Your Household Income (%)",
    shortLabel: "Your Rent Share",
    unit: "%",
    formatter: v => (v !== null && Number.isFinite(v) ? `${v.toFixed(1)}%` : "Enter income"),
    higherIsBurden: true,
    palette: [
      { stop: 0.0, color: "#86efac" },
      { stop: 0.3, color: "#fde047" },
      { stop: 0.5, color: "#fb923c" },
      { stop: 0.75, color: "#f87171" },
      { stop: 1.0, color: "#b91c1c" }
    ],
    getValue: row => {
      if (comparedIncome === null || comparedIncome <= 0 || row.rent === null) return null;
      return (row.rent * 12 / comparedIncome) * 100;
    }
  },
  renter_income: {
    label: "Renter Household Median Income ($/year, ACS Table B25119)",
    shortLabel: "Renter Income",
    unit: "$",
    formatter: v => dollars(v),
    higherIsBurden: false,
    palette: [
      { stop: 0.0, color: "#fef3c7" },
      { stop: 0.25, color: "#a7f3d0" },
      { stop: 0.5, color: "#34d399" },
      { stop: 0.75, color: "#059669" },
      { stop: 1.0, color: "#064e3b" }
    ],
    getValue: row => row.renter_income
  }
};

function hexToRgb(hex) {
  const cleanHex = hex.replace("#", "");
  const bigint = parseInt(cleanHex, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("");
}

function interpolateHex(colorA, colorB, t) {
  const [r1, g1, b1] = hexToRgb(colorA);
  const [r2, g2, b2] = hexToRgb(colorB);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

function getColorForNormalizedValue(valNormalized, palette) {
  if (valNormalized <= 0) return palette[0].color;
  if (valNormalized >= 1) return palette[palette.length - 1].color;
  for (let i = 0; i < palette.length - 1; i++) {
    const s1 = palette[i];
    const s2 = palette[i + 1];
    if (valNormalized >= s1.stop && valNormalized <= s2.stop) {
      const segT = (valNormalized - s1.stop) / (s2.stop - s1.stop);
      return interpolateHex(s1.color, s2.color, segT);
    }
  }
  return palette[palette.length - 1].color;
}

/* Map Zoom and Pan State */
const MAP_BASE_WIDTH = 960;
const MAP_BASE_HEIGHT = 520;
let mapZoomScale = 1.0;
let mapViewX = 0;
let mapViewY = 0;
let mapViewWidth = MAP_BASE_WIDTH;
let mapViewHeight = MAP_BASE_HEIGHT;

let mapIsPointerDown = false;
let mapIsDragging = false;
let mapDragStartX = 0;
let mapDragStartY = 0;
let mapDragStartViewX = 0;
let mapDragStartViewY = 0;
let mapJustDragged = false;

function applyMapViewBox() {
  const mapSvg = $("marylandMapSvg");
  const zoomLevel = $("mapZoomLevel");
  const zoomInBtn = $("mapZoomIn");
  const zoomOutBtn = $("mapZoomOut");
  const zoomResetBtn = $("mapZoomReset");
  const svgWrap = $("mapSvgWrap");

  if (!mapSvg) return;

  mapSvg.setAttribute(
    "viewBox",
    `${mapViewX.toFixed(2)} ${mapViewY.toFixed(2)} ${mapViewWidth.toFixed(2)} ${mapViewHeight.toFixed(2)}`
  );

  if (zoomLevel) {
    zoomLevel.textContent = `${Math.round(mapZoomScale * 100)}%`;
  }
  if (zoomInBtn) {
    zoomInBtn.disabled = mapZoomScale >= 3.99;
  }
  if (zoomOutBtn) {
    zoomOutBtn.disabled = mapZoomScale <= 1.01;
  }
  if (zoomResetBtn) {
    zoomResetBtn.disabled = mapZoomScale <= 1.01 && mapViewX === 0 && mapViewY === 0;
  }
  if (svgWrap) {
    if (mapZoomScale > 1.05) {
      svgWrap.classList.add("is-zoomed");
    } else {
      svgWrap.classList.remove("is-zoomed");
    }
  }
}

function zoomMarylandMap(factor, anchorX, anchorY) {
  const minZoom = 1.0;
  const maxZoom = 4.0;
  const nextZoom = Math.max(minZoom, Math.min(maxZoom, mapZoomScale * factor));
  if (Math.abs(nextZoom - mapZoomScale) < 0.001) return;

  const nextWidth = MAP_BASE_WIDTH / nextZoom;
  const nextHeight = MAP_BASE_HEIGHT / nextZoom;

  const ax = anchorX !== undefined ? anchorX : mapViewX + mapViewWidth / 2;
  const ay = anchorY !== undefined ? anchorY : mapViewY + mapViewHeight / 2;

  const relX = (ax - mapViewX) / mapViewWidth;
  const relY = (ay - mapViewY) / mapViewHeight;

  let nextX = ax - relX * nextWidth;
  let nextY = ay - relY * nextHeight;

  const maxOverflowX = MAP_BASE_WIDTH * 0.08;
  const maxOverflowY = MAP_BASE_HEIGHT * 0.08;
  nextX = Math.max(-maxOverflowX, Math.min(MAP_BASE_WIDTH + maxOverflowX - nextWidth, nextX));
  nextY = Math.max(-maxOverflowY, Math.min(MAP_BASE_HEIGHT + maxOverflowY - nextHeight, nextY));

  if (nextZoom <= 1.001) {
    nextX = 0;
    nextY = 0;
  }

  mapZoomScale = nextZoom;
  mapViewX = nextX;
  mapViewY = nextY;
  mapViewWidth = nextWidth;
  mapViewHeight = nextHeight;

  applyMapViewBox();
}

function resetMarylandMapZoom() {
  mapZoomScale = 1.0;
  mapViewX = 0;
  mapViewY = 0;
  mapViewWidth = MAP_BASE_WIDTH;
  mapViewHeight = MAP_BASE_HEIGHT;
  applyMapViewBox();
}

function selectCountyFromMap(countyId) {
  if (!countyId) return;
  $("county").value = countyId;
  renderHistory();
  updateStatBand();
  updateRentComparisonCard();
  renderBurdenDistribution();
  updateMarylandMap();
  highlightCountyRow(countyId, { scroll: false });
}

function updateMapInspector(countyId) {
  if (!data) return;
  const row = latestRowFor(countyId);
  if (!row) return;

  const isSelected = row.id === $("county").value;
  $("inspStatusTag").textContent = isSelected ? "Selected County" : "Inspected County";
  $("inspStatusTag").style.background = isSelected ? "var(--hits-bg)" : "var(--hair)";
  $("inspStatusTag").style.color = isSelected ? "var(--hits-ink)" : "var(--ink)";
  $("inspCountyName").textContent = row.name;

  if (row.burden_percent !== null && Number.isFinite(row.burden_percent)) {
    $("inspSummaryText").textContent =
      `${row.name}: ${row.burden_percent.toFixed(1)}% of surveyed renter households pay 30% or more of income on gross rent.`;
    $("inspBurden").textContent = `${row.burden_percent.toFixed(1)}%`;
  } else {
    $("inspSummaryText").textContent = `${row.name}: Data not available in current survey window.`;
    $("inspBurden").textContent = "—";
  }

  const latestYear = Math.max(...data.metadata.years);
  const latestRows = data.rows.filter(r => r.year === latestYear);
  const sortedBurden = [...latestRows]
    .filter(r => r.burden_percent !== null)
    .sort((a, b) => b.burden_percent - a.burden_percent);
  const burdenRank = sortedBurden.findIndex(r => r.id === row.id) + 1;
  $("inspBurdenRank").textContent = burdenRank > 0 ? `Rank #${burdenRank} of 24 (highest burden)` : "—";

  $("inspCensusRent").textContent = dollars(row.rent);
  $("inspRentMoe").textContent = row.rent_moe ? `±$${Math.round(row.rent_moe)} MOE` : "—";

  if (row.market_rent_now) {
    $("inspMarketRent").textContent = dollars(row.market_rent_now);
  } else {
    $("inspMarketRent").textContent = "Not available";
  }

  if (comparedIncome && comparedIncome > 0 && row.rent) {
    const shareVal = (row.rent * 12 / comparedIncome) * 100;
    $("inspShare").textContent = `${shareVal.toFixed(1)}%`;
    if (shareVal <= 30) {
      $("inspShareAfford").textContent = "Affordable (under 30%)";
      $("inspShareAfford").style.color = "#15803d";
    } else if (shareVal <= 40) {
      $("inspShareAfford").textContent = "Moderately cost burdened";
      $("inspShareAfford").style.color = "#b45309";
    } else {
      $("inspShareAfford").textContent = "Severely cost burdened (>40%)";
      $("inspShareAfford").style.color = "#b91c1c";
    }
  } else {
    $("inspShare").textContent = "—";
    $("inspShareAfford").textContent = "Enter your income above";
    $("inspShareAfford").style.color = "var(--ink-2)";
  }
}

async function initMarylandMap() {
  const mapSvg = $("marylandMapSvg");
  const countiesGroup = $("mapCountiesGroup");
  const labelsGroup = $("mapLabelsGroup");
  const tooltip = $("mapTooltip");
  const svgWrap = $("mapSvgWrap");

  if (!mapSvg || !countiesGroup) return;

  // Load vector paths if not loaded
  if (!mapPathsData) {
    try {
      const res = await fetch("maryland-map-paths.json", { cache: "no-cache" });
      if (res.ok) {
        mapPathsData = await res.json();
      }
    } catch (err) {
      console.warn("Could not load maryland-map-paths.json:", err);
      return;
    }
  }

  if (!mapPathsData) return;

  // Clear previous elements
  while (countiesGroup.firstChild) countiesGroup.removeChild(countiesGroup.firstChild);
  while (labelsGroup.firstChild) labelsGroup.removeChild(labelsGroup.firstChild);

  // Render order: ensure Baltimore County (24005) is drawn BEFORE Baltimore City (24510)
  const fipsKeys = Object.keys(mapPathsData).sort((a, b) => {
    if (a === "24510") return 1;
    if (b === "24510") return -1;
    return 0;
  });

  fipsKeys.forEach(fips => {
    const item = mapPathsData[fips];
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", item.path);
    path.setAttribute("id", `mapCounty_${fips}`);
    path.setAttribute("data-fips", fips);
    path.setAttribute("class", "county-path");
    path.setAttribute("tabindex", "0");
    path.setAttribute("role", "button");

    path.addEventListener("click", () => {
      if (mapJustDragged) return;
      selectCountyFromMap(fips);
    });

    path.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectCountyFromMap(fips);
      }
    });

    path.addEventListener("mouseenter", e => {
      if (mapIsDragging) return;
      updateMapInspector(fips);
      showMapTooltip(fips, e);
    });

    path.addEventListener("mousemove", e => {
      if (mapIsDragging) return;
      positionMapTooltip(e);
    });

    path.addEventListener("mouseleave", () => {
      hideMapTooltip();
      updateMapInspector($("county").value);
    });

    path.addEventListener("focus", e => {
      updateMapInspector(fips);
      showMapTooltip(fips, e, item.cx, item.cy);
    });

    path.addEventListener("blur", () => {
      hideMapTooltip();
      updateMapInspector($("county").value);
    });

    countiesGroup.appendChild(path);
  });

  // County labels group left empty so map shapes and choropleth colors remain pristine and legible
  while (labelsGroup.firstChild) labelsGroup.removeChild(labelsGroup.firstChild);

  // Metric Toggle Buttons
  const buttons = document.querySelectorAll(".map-metric-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentMapMetric = btn.dataset.metric;
      updateMarylandMap();
    });
  });

  // Wire Zoom Toolbar buttons
  const zoomInBtn = $("mapZoomIn");
  const zoomOutBtn = $("mapZoomOut");
  const zoomResetBtn = $("mapZoomReset");

  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", e => {
      e.stopPropagation();
      zoomMarylandMap(1.3);
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", e => {
      e.stopPropagation();
      zoomMarylandMap(1 / 1.3);
    });
  }
  if (zoomResetBtn) {
    zoomResetBtn.addEventListener("click", e => {
      e.stopPropagation();
      resetMarylandMapZoom();
    });
  }

  // Mouse wheel zoom
  if (svgWrap && mapSvg) {
    svgWrap.addEventListener("wheel", e => {
      e.preventDefault();
      const rect = mapSvg.getBoundingClientRect();
      const mouseSvgX = mapViewX + ((e.clientX - rect.left) / rect.width) * mapViewWidth;
      const mouseSvgY = mapViewY + ((e.clientY - rect.top) / rect.height) * mapViewHeight;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      zoomMarylandMap(factor, mouseSvgX, mouseSvgY);
    }, { passive: false });

    // Drag to pan when zoomed
    svgWrap.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      if (mapZoomScale <= 1.0) return;
      mapIsPointerDown = true;
      mapIsDragging = false;
      mapDragStartX = e.clientX;
      mapDragStartY = e.clientY;
      mapDragStartViewX = mapViewX;
      mapDragStartViewY = mapViewY;
    });

    window.addEventListener("pointermove", e => {
      if (!mapIsPointerDown) return;
      const dx = e.clientX - mapDragStartX;
      const dy = e.clientY - mapDragStartY;
      if (!mapIsDragging && Math.hypot(dx, dy) > 4) {
        mapIsDragging = true;
        svgWrap.classList.add("is-panning");
        hideMapTooltip();
      }
      if (mapIsDragging) {
        const rect = mapSvg.getBoundingClientRect();
        const svgScaleX = mapViewWidth / rect.width;
        const svgScaleY = mapViewHeight / rect.height;
        let newX = mapDragStartViewX - dx * svgScaleX;
        let newY = mapDragStartViewY - dy * svgScaleY;
        const maxOverflowX = MAP_BASE_WIDTH * 0.08;
        const maxOverflowY = MAP_BASE_HEIGHT * 0.08;
        newX = Math.max(-maxOverflowX, Math.min(MAP_BASE_WIDTH + maxOverflowX - mapViewWidth, newX));
        newY = Math.max(-maxOverflowY, Math.min(MAP_BASE_HEIGHT + maxOverflowY - mapViewHeight, newY));
        mapViewX = newX;
        mapViewY = newY;
        applyMapViewBox();
      }
    });

    window.addEventListener("pointerup", () => {
      if (mapIsPointerDown) {
        mapIsPointerDown = false;
        svgWrap.classList.remove("is-panning");
        if (mapIsDragging) {
          mapJustDragged = true;
          mapIsDragging = false;
          setTimeout(() => { mapJustDragged = false; }, 80);
        }
      }
    });

    window.addEventListener("pointercancel", () => {
      mapIsPointerDown = false;
      mapIsDragging = false;
      svgWrap.classList.remove("is-panning");
    });

    // Touch pinch-to-zoom
    let initialPinchDistance = null;
    let pinchAnchor = null;

    svgWrap.addEventListener("touchstart", e => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialPinchDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const rect = mapSvg.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;
        pinchAnchor = {
          x: mapViewX + ((midX - rect.left) / rect.width) * mapViewWidth,
          y: mapViewY + ((midY - rect.top) / rect.height) * mapViewHeight
        };
      }
    }, { passive: true });

    svgWrap.addEventListener("touchmove", e => {
      if (e.touches.length === 2 && initialPinchDistance && pinchAnchor) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const ratio = currentDistance / initialPinchDistance;
        if (Math.abs(ratio - 1) > 0.04) {
          zoomMarylandMap(ratio > 1 ? 1.04 : 0.96, pinchAnchor.x, pinchAnchor.y);
          initialPinchDistance = currentDistance;
        }
      }
    }, { passive: false });

    svgWrap.addEventListener("touchend", e => {
      if (e.touches.length < 2) {
        initialPinchDistance = null;
        pinchAnchor = null;
      }
    }, { passive: true });

    // Mousemove for tooltip
    svgWrap.addEventListener("mousemove", e => {
      if (tooltip && !tooltip.hidden && !mapIsDragging) {
        positionMapTooltip(e);
      }
    });
  }

  // Initial update
  applyMapViewBox();
  updateMarylandMap();
}

function showMapTooltip(fips, mouseEvent, fallbackX, fallbackY) {
  const tooltip = $("mapTooltip");
  if (!tooltip || !data) return;

  const row = latestRowFor(fips);
  if (!row) return;

  const metricDef = MAP_METRICS[currentMapMetric] || MAP_METRICS.burden_percent;
  const val = metricDef.getValue(row);

  // Compute statewide rank for this metric
  const latestYear = Math.max(...data.metadata.years);
  const latestRows = data.rows.filter(r => r.year === latestYear);
  const rowsWithVal = latestRows
    .map(r => ({ id: r.id, v: metricDef.getValue(r) }))
    .filter(item => item.v !== null && Number.isFinite(item.v));

  rowsWithVal.sort((a, b) => metricDef.higherIsBurden ? b.v - a.v : b.v - a.v);
  const rank = rowsWithVal.findIndex(item => item.id === fips) + 1;

  $("tipCountyName").textContent = row.name;
  $("tipCountyRank").textContent = rank > 0 ? `#${rank} of ${rowsWithVal.length}` : "—";
  $("tipPrimaryVal").textContent = metricDef.formatter(val);

  if (currentMapMetric === "burden_percent") {
    $("tipSecondaryVal").textContent = "Benchmark: 30% or less";
  } else if (currentMapMetric === "rent") {
    $("tipSecondaryVal").textContent = row.rent_moe ? `ACS MOE: ±$${Math.round(row.rent_moe)}` : "";
  } else if (currentMapMetric === "market_rent_now") {
    $("tipSecondaryVal").textContent = "Zillow Asking Rent Index";
  } else if (currentMapMetric === "share") {
    $("tipSecondaryVal").textContent = comparedIncome ? `Income: ${dollars(comparedIncome)}` : "Set your income";
  } else {
    $("tipSecondaryVal").textContent = "ACS Table B25119";
  }

  tooltip.hidden = false;
  if (mouseEvent) {
    positionMapTooltip(mouseEvent);
  } else if (fallbackX !== undefined && fallbackY !== undefined) {
    const wrap = $("mapSvgWrap");
    const pathEl = document.getElementById(`mapCounty_${fips}`);
    if (wrap && pathEl) {
      const pathRect = pathEl.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const screenX = pathRect.left - wrapRect.left + pathRect.width / 2;
      const screenY = pathRect.top - wrapRect.top + pathRect.height / 2;
      applyTooltipPosition(screenX, screenY);
    }
  }
}

function applyTooltipPosition(x, y) {
  const tooltip = $("mapTooltip");
  const wrap = $("mapSvgWrap");
  if (!tooltip || !wrap) return;

  const wrapRect = wrap.getBoundingClientRect();
  const tipW = tooltip.offsetWidth || 230;
  const tipH = tooltip.offsetHeight || 115;

  // Horizontal clamping: keep at least 10px inside the container boundaries
  let targetLeft = x - tipW / 2;
  const minLeft = 10;
  const maxLeft = Math.max(minLeft, wrapRect.width - tipW - 10);
  if (targetLeft < minLeft) targetLeft = minLeft;
  if (targetLeft > maxLeft) targetLeft = maxLeft;

  // Vertical placement:
  // When hovering near top corners or edges (e.g. Garrett, Allegany, Washington, Carroll, Cecil),
  // there isn't enough space above the cursor without clipping, so flip cleanly downwards below cursor.
  let targetTop = y - tipH - 14;
  if (targetTop < 8) {
    targetTop = y + 20; // flip cleanly below the cursor
  }
  // Guard against bottom edge spillover
  if (targetTop + tipH > wrapRect.height - 8) {
    targetTop = Math.max(8, wrapRect.height - tipH - 8);
  }

  tooltip.style.left = `${Math.round(targetLeft)}px`;
  tooltip.style.top = `${Math.round(targetTop)}px`;
  tooltip.style.transform = "none";
}

function positionMapTooltip(e) {
  const wrap = $("mapSvgWrap");
  if (!wrap) return;

  const rect = wrap.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  applyTooltipPosition(x, y);
}

function hideMapTooltip() {
  const tooltip = $("mapTooltip");
  if (tooltip) tooltip.hidden = true;
}

function updateMarylandMap() {
  if (!data || !mapPathsData) return;

  const metricDef = MAP_METRICS[currentMapMetric] || MAP_METRICS.burden_percent;
  const latestYear = Math.max(...data.metadata.years);
  const latestRows = data.rows.filter(r => r.year === latestYear);
  const selectedCountyId = $("county").value;

  // Collect valid values
  const values = [];
  const countyValMap = {};

  latestRows.forEach(row => {
    const val = metricDef.getValue(row);
    countyValMap[row.id] = val;
    if (val !== null && Number.isFinite(val)) {
      values.push(val);
    }
  });

  if (values.length === 0) return;

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const sortedVals = [...values].sort((a, b) => a - b);
  const midVal = sortedVals[Math.floor(sortedVals.length / 2)];
  const avgVal = values.reduce((sum, v) => sum + v, 0) / values.length;

  // Update County Paths Fill and ARIA
  Object.keys(mapPathsData).forEach(fips => {
    const path = $(`mapCounty_${fips}`);
    if (!path) return;

    const row = latestRows.find(r => r.id === fips);
    const val = countyValMap[fips];
    const isSelected = fips === selectedCountyId;

    if (val === null || !Number.isFinite(val)) {
      path.setAttribute("fill", "url(#diagonalHatch)");
    } else {
      const norm = maxVal === minVal ? 0.5 : (val - minVal) / (maxVal - minVal);
      const color = getColorForNormalizedValue(norm, metricDef.palette);
      path.setAttribute("fill", color);
    }

    if (isSelected) {
      path.classList.add("selected");
    } else {
      path.classList.remove("selected");
    }

    const cName = row ? row.name : mapPathsData[fips].name;
    const valText = metricDef.formatter(val);
    path.setAttribute(
      "aria-label",
      `${cName}: ${valText} (${metricDef.shortLabel}). ${isSelected ? "Currently selected." : "Click to select."}`
    );
  });

  // Update Selected Badge in Header
  const selectedRow = latestRowFor(selectedCountyId);
  if (selectedRow) {
    $("mapSelectedBadgeName").textContent = selectedRow.name;
  }

  // Update Selection Marker in SVG
  const selectionGroup = $("mapSelectionGroup");
  if (selectionGroup) {
    while (selectionGroup.firstChild) selectionGroup.removeChild(selectionGroup.firstChild);

    if (mapPathsData[selectedCountyId]) {
      const { cx, cy } = mapPathsData[selectedCountyId];

      const pulseRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      pulseRing.setAttribute("cx", cx);
      pulseRing.setAttribute("cy", cy);
      pulseRing.setAttribute("r", "15");
      pulseRing.setAttribute("fill", "none");
      pulseRing.setAttribute("stroke", "var(--hits-bg)");
      pulseRing.setAttribute("stroke-width", "4");
      pulseRing.setAttribute("opacity", "0.95");
      selectionGroup.appendChild(pulseRing);

      const centerDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      centerDot.setAttribute("cx", cx);
      centerDot.setAttribute("cy", cy);
      centerDot.setAttribute("r", "5.5");
      centerDot.setAttribute("fill", "#000000");
      centerDot.setAttribute("stroke", "#ffffff");
      centerDot.setAttribute("stroke-width", "2");
      selectionGroup.appendChild(centerDot);
    }
  }

  // Update Legend
  $("legendMetricLabel").textContent = metricDef.label;
  $("legendStateAvg").textContent = `MD State Average: ${metricDef.formatter(avgVal)}`;

  const gradientStops = metricDef.palette
    .map(p => `${p.color} ${(p.stop * 100).toFixed(0)}%`)
    .join(", ");
  $("legendGradientTrack").style.background = `linear-gradient(to right, ${gradientStops})`;

  $("legendMin").textContent = `Min: ${metricDef.formatter(minVal)}`;
  $("legendMid").textContent = `Median: ${metricDef.formatter(midVal)}`;
  $("legendMax").textContent = `Max: ${metricDef.formatter(maxVal)}`;

  // Update bottom inspector
  updateMapInspector(selectedCountyId);
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
  if (!data) return;

  const latestYear = Math.max(...data.metadata.years);
  const latestRows = data.rows.filter(row => row.year === latestYear);
  const sorted = sortRows(latestRows);

  $("counties").replaceChildren();

  sorted.forEach(row => {
    const incomeShare = comparedIncome === null
      ? null
      : (row.rent * 12 / comparedIncome) * 100;

    addTableRow(
      $("counties"),
      [
        row.name,
        dollars(row.rent),
        dollars(row.rent_moe),
        row.market_rent_now ? dollars(row.market_rent_now) : "—",
        dollars((row.rent * 12) / 0.30),
        incomeShare === null ? "Not calculated" : percentShort(incomeShare),
        percentShort(row.burden_percent)
      ],
      { countyId: row.id }
    );
  });
}

/* ---------- MAIN IMPROVEMENT 2: Historical Trend Cards with Distinct Measures ---------- */
function renderTrendCards(history) {
  const container = $("trendCards");
  if (!container) return;
  container.replaceChildren();

  if (history.length === 0) return;

  const metrics = [
    { key: "rent", label: "Median monthly gross rent (Census ACS)", unit: "monthly" },
    { key: "income", label: "Median household income, all households", unit: "annual" },
    { key: "renter_income", label: "Median renter household income", unit: "annual" },
    { key: "home_value", label: "Median owner occupied home value", unit: "value" }
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
      col.style.height = v == null ? "0%" : `${Math.max(4, (v / maxV) * 100).toFixed(1)}%`;
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
      const deltaPct = ((last / first) - 1) * 100;
      const sign = deltaDollar >= 0 ? "+" : "−";
      const change = document.createElement("p");
      change.className = "trend-change";
      change.innerHTML =
        `Nominal change: <b>${sign}${dollars(Math.abs(deltaDollar))}</b> (${percentShort(Math.abs(deltaPct))})`;
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
    comparison = `${row.name} has the <b>lowest</b> estimated renter burden in the state.`;
  } else if (row.id === max.id) {
    comparison = `${row.name} has the <b>highest</b> estimated renter burden in the state.`;
  } else {
    const above = burdens.filter(b => b.value < row.burden_percent).length;
    comparison = `${row.name} ranks <b>${above + 1} of ${burdens.length}</b> Maryland jurisdictions by point estimate.`;
  }

  let renterIncomeLine = "";
  if (row.renter_income != null && row.income != null) {
    const gap = row.income - row.renter_income;
    const gapPct = (gap / row.income) * 100;
    renterIncomeLine = `<p>Renter household median income is <b>${dollars(row.renter_income)}</b>, about <b>${percentShort(gapPct)}</b> below the all-household median of ${dollars(row.income)}.</p>`;
  }

  story.innerHTML = `
    <h3>Renter cost burden in ${row.name}</h3>
    <p class="hook">
      About <b>${householdsPerTen} in 10</b> surveyed renter households here spend 30% or more of income on rent.
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
      Renter burden comes from ACS table B25070 for households where rent-to-income ratio is calculated. Renter income comes from B25119.
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

/* ---------- Rent scenario calculator ---------- */
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
  const startingShare = (startingRent * 12 / income) * 100;
  const futureShare = (futureRent * 12 / futureIncome) * 100;

  addResultLine(result, `After ${years} ${years === 1 ? "year" : "years"}:`);
  addResultLine(result,
    `Monthly rent: ${dollars(startingRent)} → about ${dollars(futureRent)}.`);
  addResultLine(result,
    `Yearly income: ${dollars(income)} → about ${dollars(futureIncome)}.`);
  addResultLine(result,
    `Rent share of income: ${percent(startingShare)} → ${percent(futureShare)}.`);
  addResultLine(result, "Assumes the same constant growth rate applies every year.");
}

/* ---------- Mortgage calculator ---------- */
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

  const downPayment = (price * downPercent) / 100;
  const principal = price - downPayment;
  const monthlyRate = yearlyInterest / 1200;
  const paymentCount = termYears * 12;

  let principalAndInterest;
  if (monthlyRate === 0) {
    principalAndInterest = paymentCount > 0 ? principal / paymentCount : 0;
  } else {
    principalAndInterest =
      (principal * monthlyRate) /
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

/* ---------- Data validation ---------- */
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
  const text = `${SITE_TITLE}: ${SITE_BLURB}`;
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
    if (ok) showToast("Link copied: paste into the share window");
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

/* Sortable table headers */
document.querySelectorAll("#countiesTable thead th[data-sort]").forEach(th => {
  const btn = th.querySelector(".th-sort");
  if (!btn) return;
  btn.addEventListener("click", () => handleSortClick(th.dataset.sort));
});

/* Clicking table rows */
$("counties").addEventListener("click", event => {
  const tr = event.target.closest("tr[data-county-id]");
  if (!tr) return;
  const countyId = tr.dataset.countyId;
  if (!countyId) return;
  $("county").value = countyId;
  renderHistory();
  updateStatBand();
  updateRentComparisonCard();
  renderBurdenDistribution();
  updateMarylandMap();
  highlightCountyRow(countyId, { scroll: false });
});

$("incomeForm").addEventListener("submit", event => {
  event.preventDefault();
  comparedIncome = readNumber("income");
  renderIncomeTable();
  updateStatBand();
  updateScenarioIncomeLabel();
  updateMarylandMap();
  markResultAsNeedingUpdate(
    "rentResult",
    "Income updated. Press Calculate rent scenario to refresh."
  );
});

$("income").addEventListener("input", () => {
  updateScenarioIncomeLabel();
  markResultAsNeedingUpdate(
    "rentResult",
    "Income edited. Press Calculate rent scenario to refresh."
  );
});

$("county").addEventListener("change", () => {
  renderHistory();
  updateStatBand();
  updateRentComparisonCard();
  renderBurdenDistribution();
  updateMarylandMap();
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

    if (requestedCounty && countyExists) $("county").value = requestedCounty;

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
    updateRentComparisonCard();
    renderBurdenDistribution();
    await initMarylandMap();

    if (requestedCounty && countyExists) {
      requestAnimationFrame(() => {
        highlightCountyRow(requestedCounty, { scroll: true });
      });
    }
  } catch (error) {
    console.error("Boot error:", error);
    data = null;
    $("status").textContent =
      "Data failed to load. Check that data.json exists and open via a web server.";
  }
}

start();
