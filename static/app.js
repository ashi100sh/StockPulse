// ---- State ----
let allHoldings = [];
let currentPeriod = "pct_1w";

// ---- Formatters ----
function fmtCurrency(val) {
  if (val == null) return "—";
  return "₹" + Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(val) {
  if (val == null) return '<span class="na-cell">—</span>';
  const cls = val > 0 ? "positive" : val < 0 ? "negative" : "neutral";
  const sign = val > 0 ? "+" : "";
  return `<span class="${cls} perf-cell">${sign}${val.toFixed(2)}%</span>`;
}

function fmtPL(val) {
  if (val == null) return "—";
  const cls = val > 0 ? "positive" : val < 0 ? "negative" : "";
  const sign = val > 0 ? "+" : "";
  return `<span class="${cls}">${sign}${fmtCurrency(val)}</span>`;
}

// ---- API ----
async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ---- Refresh Portfolio ----
async function refreshPortfolio() {
  const btn = document.getElementById("refreshBtn");
  const loading = document.getElementById("loadingBar");
  btn.disabled = true;
  loading.style.display = "flex";

  try {
    const data = await api("/api/portfolio/refresh");
    allHoldings = data.holdings;
    renderSummary(data.summary);
    renderTable(allHoldings);
    renderHeatmap(allHoldings, currentPeriod);
    if (allHoldings.length > 0) {
      document.getElementById("heatmapSection").style.display = "block";
    }
  } catch (e) {
    alert("Failed to refresh: " + e.message);
  } finally {
    btn.disabled = false;
    loading.style.display = "none";
  }
}

// ---- Summary Cards ----
function renderSummary(summary) {
  document.getElementById("totalInvested").textContent = fmtCurrency(summary.total_invested).replace("₹", "₹");

  const curEl = document.getElementById("totalCurrent");
  curEl.textContent = fmtCurrency(summary.total_current);

  const plEl = document.getElementById("totalPL");
  plEl.innerHTML = fmtPL(summary.total_pl);

  const plPctEl = document.getElementById("totalPLPct");
  plPctEl.innerHTML = fmtPct(summary.total_pl_pct);
}

// ---- Table ----
function renderTable(holdings) {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const exFilter = document.getElementById("filterExchange").value;

  const filtered = holdings.filter(h => {
    const matchSearch = !search ||
      h.symbol.toLowerCase().includes(search) ||
      (h.name || "").toLowerCase().includes(search);
    const matchEx = !exFilter || h.exchange === exFilter;
    return matchSearch && matchEx;
  });

  const tbody = document.getElementById("holdingsBody");

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="15">No holdings found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(h => {
    const errBadge = h.error ? `<br/><span class="error-badge">⚠ ${h.error}</span>` : "";
    return `
    <tr class="${h.error ? "error-row" : ""}">
      <td class="symbol-cell">${h.symbol}${errBadge}</td>
      <td class="name-cell" title="${h.name || ""}">${truncate(h.name || h.symbol, 20)}</td>
      <td><span class="exchange-badge">${h.exchange}</span></td>
      <td>${h.quantity}</td>
      <td>${fmtCurrency(h.buy_price)}</td>
      <td>${h.current_price ? fmtCurrency(h.current_price) : '<span class="na-cell">—</span>'}</td>
      <td>${fmtCurrency(h.invested)}</td>
      <td>${fmtCurrency(h.current_value)}</td>
      <td>${fmtPL(h.pl)}</td>
      <td>${fmtPct(h.pl_pct)}</td>
      <td class="perf-col">${fmtPct(h.pct_1w)}</td>
      <td class="perf-col">${fmtPct(h.pct_1m)}</td>
      <td class="perf-col">${fmtPct(h.pct_3m)}</td>
      <td class="perf-col">${fmtPct(h.pct_1y)}</td>
      <td class="actions-cell">
        <button class="btn btn-edit" onclick="openEdit(${h.id}, ${h.buy_price}, ${h.quantity}, '${h.buy_date || ""}')">Edit</button>
        <button class="btn btn-danger" onclick="deleteHolding(${h.id})">Del</button>
      </td>
    </tr>`;
  }).join("");
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

// ---- Heatmap ----
function renderHeatmap(holdings, period) {
  const grid = document.getElementById("heatmapGrid");
  if (!holdings.length) { grid.innerHTML = ""; return; }

  grid.innerHTML = holdings.map(h => {
    const val = h[period];
    const bg = heatColor(val);
    const pctHtml = val != null
      ? `<div class="tile-pct">${val > 0 ? "+" : ""}${val.toFixed(1)}%</div>`
      : `<div class="tile-na">N/A</div>`;
    return `
    <div class="heatmap-tile" style="background:${bg}">
      <div class="tile-symbol">${h.symbol}</div>
      ${pctHtml}
    </div>`;
  }).join("");
}

function heatColor(val) {
  if (val == null) return "rgba(42,46,64,0.8)";
  if (val >= 10)   return "rgba(34,197,94,0.5)";
  if (val >= 0)    return "rgba(34,197,94,0.2)";
  if (val >= -10)  return "rgba(239,68,68,0.2)";
  return "rgba(239,68,68,0.5)";
}

// ---- Add Holding ----
document.getElementById("addHoldingForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    symbol: document.getElementById("fSymbol").value,
    exchange: document.getElementById("fExchange").value,
    asset_type: document.getElementById("fAssetType").value,
    buy_price: document.getElementById("fBuyPrice").value,
    quantity: document.getElementById("fQuantity").value,
    buy_date: document.getElementById("fBuyDate").value,
  };

  try {
    await api("/api/holdings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    e.target.reset();
    await refreshPortfolio();
  } catch (err) {
    alert("Failed to add: " + err.message);
  }
});

// ---- Delete ----
async function deleteHolding(id) {
  if (!confirm("Remove this holding?")) return;
  await api(`/api/holdings/${id}`, { method: "DELETE" });
  await refreshPortfolio();
}

// ---- Edit Modal ----
function openEdit(id, buyPrice, quantity, buyDate) {
  document.getElementById("editId").value = id;
  document.getElementById("editBuyPrice").value = buyPrice;
  document.getElementById("editQuantity").value = quantity;
  document.getElementById("editBuyDate").value = buyDate;
  document.getElementById("editModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
}

async function saveEdit() {
  const id = document.getElementById("editId").value;
  const payload = {
    buy_price: document.getElementById("editBuyPrice").value,
    quantity: document.getElementById("editQuantity").value,
    buy_date: document.getElementById("editBuyDate").value,
  };
  try {
    await api(`/api/holdings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    closeModal();
    await refreshPortfolio();
  } catch (err) {
    alert("Failed to save: " + err.message);
  }
}

// ---- CSV Import ----
document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("csvFileInput").click();
});

document.getElementById("csvFileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await api("/api/import/csv", { method: "POST", body: formData });
    alert(res.message);
    await refreshPortfolio();
  } catch (err) {
    alert("Import failed: " + err.message);
  }
  e.target.value = "";
});

// ---- Filters ----
document.getElementById("searchInput").addEventListener("input", () => renderTable(allHoldings));
document.getElementById("filterExchange").addEventListener("change", () => renderTable(allHoldings));

// ---- Heatmap Tabs ----
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentPeriod = btn.dataset.period;
    renderHeatmap(allHoldings, currentPeriod);
  });
});

// ---- Init: load holdings without live prices, then refresh ----
(async () => {
  try {
    const holdings = await api("/api/holdings");
    if (holdings.length > 0) {
      await refreshPortfolio();
    }
  } catch (e) {
    console.error(e);
  }
})();
