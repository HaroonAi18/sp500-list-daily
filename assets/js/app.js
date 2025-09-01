const state = {
  data: [],
  filtered: [],
  sortKey: "symbol",
  sortDir: "asc",
  page: 1,
  pageSize: 20,
  updatedAt: null
};

const els = {
  year:        document.getElementById("year"),
  metaCount:   document.getElementById("meta-count"),
  metaUpdated: document.getElementById("meta-updated"),
  search:      document.getElementById("search"),
  pageSize:    document.getElementById("pageSize"),
  status:      document.getElementById("status"),
  tbody:       document.getElementById("tbody"),
  pager:       document.getElementById("pager"),
  headers:     Array.from(document.querySelectorAll("th[data-key]"))
};

els.year.textContent = new Date().getFullYear();

async function loadData() {
  showStatus(null);
  try {
    const res = await fetch("data/sp500_companies.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} loading data/sp500_companies.json`);
    const payload = await res.json();
    const companies = Array.isArray(payload) ? payload : payload.companies;
    const updatedAt = Array.isArray(payload) ? null : payload.updated_at;

    state.data = (companies || []).map(r => ({
      symbol: (r.symbol || r.Ticker || "").trim(),
      name:   (r.name || r["Company Name"] || "").trim(),
      sector: (r.sector || r.Sector || "").trim()
    })).filter(r => r.symbol && r.name);

    state.updatedAt = updatedAt;
    applyFilters();
  } catch (e) {
    showStatus(e.message || String(e));
  }
}

function showStatus(msg){
  if (!msg){ els.status.hidden = true; els.status.textContent = ""; return; }
  els.status.hidden = false;
  els.status.textContent = msg;
}

function applyFilters(){
  const q = (els.search.value || "").toLowerCase();
  const rows = state.data.filter(r =>
    r.symbol.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
  );
  rows.sort((a,b) => {
    const av = String(a[state.sortKey] || "").toLowerCase();
    const bv = String(b[state.sortKey] || "").toLowerCase();
    if (av < bv) return state.sortDir === "asc" ? -1 : 1;
    if (av > bv) return state.sortDir === "asc" ? 1 : -1;
    return 0;
  });
  state.filtered = rows;
  state.pageSize = Number(els.pageSize.value || 20);
  state.page = Math.min(state.page, Math.max(1, Math.ceil(rows.length / state.pageSize)));
  render();
}

function render(){
  els.metaCount.textContent = `${state.filtered.length.toLocaleString()} companies`;
  els.metaUpdated.textContent = state.updatedAt ? `Updated: ${new Date(state.updatedAt).toLocaleString()}` : "";

  const start = (state.page - 1) * state.pageSize;
  const slice = state.filtered.slice(start, start + state.pageSize);

  els.tbody.innerHTML = slice.map(r => `
    <tr>
      <td><code>${r.symbol}</code></td>
      <td>${r.name}</td>
      <td>${r.sector || ""}</td>
    </tr>
  `).join("");

  const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  els.pager.innerHTML = `
    <button ${state.page<=1 ? "disabled":""} data-act="prev">← Prev</button>
    ${pageNumbers(state.page, totalPages, 7).map(n =>
      n==="…" ? `<span>…</span>` :
      `<button data-act="page" data-n="${n}" ${n===state.page?"style='background:#fff;color:#111'":""}>${n}</button>`
    ).join("")}
    <button ${state.page>=totalPages ? "disabled":""} data-act="next">Next →</button>
  `;
}

function pageNumbers(current, total, width=7){
  const arr=[];
  if (total<=width){ for(let i=1;i<=total;i++) arr.push(i); return arr; }
  const half=Math.floor(width/2);
  let start=Math.max(1,current-half), end=Math.min(total,start+width-1);
  if (end-start+1<width) start=Math.max(1,end-width+1);
  if (start>1){ arr.push(1); if (start>2) arr.push("…"); }
  for(let i=start;i<=end;i++) arr.push(i);
  if (end<total){ if (end<total-1) arr.push("…"); arr.push(total); }
  return arr;
}

// events
els.search.addEventListener("input", () => { state.page=1; applyFilters(); });
els.pageSize.addEventListener("change", () => { state.page=1; applyFilters(); });
els.pager.addEventListener("click", e => {
  const act = e.target.getAttribute("data-act");
  if (!act) return;
  if (act==="prev") state.page = Math.max(1, state.page-1);
  else if (act==="next"){
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    state.page = Math.min(totalPages, state.page+1);
  } else if (act==="page"){
    state.page = Number(e.target.getAttribute("data-n"));
  }
  render();
});
els.headers.forEach(th => {
  th.addEventListener("click", () => {
    const key = th.getAttribute("data-key");
    if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    else { state.sortKey = key; state.sortDir = "asc"; }
    applyFilters();
  });
});

loadData();
