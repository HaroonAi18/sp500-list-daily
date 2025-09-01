const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");   // v2
const cheerio = require("cheerio");

const WIKI = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies";
const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const JSON_PATH = path.join(DATA_DIR, "sp500_companies.json");
const CSV_PATH  = path.join(DATA_DIR, "sp500_companies.csv");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

async function getHtml(){
  const res = await fetch(WIKI, { headers: { "User-Agent": "sp500listdaily/1.0" }});
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

function parseTable(html){
  const $ = cheerio.load(html);
  let table = $("#constituents");
  if (!table.length) table = $("table.wikitable").first();

  const rows = [];
  table.find("tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length >= 2){
      const symbol = $(tds[0]).text().trim().replace(/\u00A0/g," ");
      const name   = $(tds[1]).text().trim().replace(/\u00A0/g," ");
      const sector = tds[3] ? $(tds[3]).text().trim() : "";
      if (symbol && name) rows.push({ symbol, name, sector });
    }
  });
  if (!rows.length) throw new Error("Parsed 0 rows — Wikipedia layout may have changed.");
  rows.sort((a,b)=>a.symbol.localeCompare(b.symbol));
  return rows;
}

function prevList(){
  try{
    if (!fs.existsSync(JSON_PATH)) return [];
    const j = JSON.parse(fs.readFileSync(JSON_PATH,"utf8"));
    return Array.isArray(j) ? j : (j.companies || []);
  }catch{ return []; }
}

function diff(prev,next){
  const P=new Set(prev.map(x=>x.symbol)), N=new Set(next.map(x=>x.symbol));
  return {
    added:   next.filter(x=>!P.has(x.symbol)),
    removed: prev.filter(x=>!N.has(x.symbol))
  };
}

function writeCSV(list){
  const header = "Ticker,Company Name,Sector\n";
  const body = list.map(r => [r.symbol, r.name.replace(/,/g," "), (r.sector||"").replace(/,/g," ")].join(",")).join("\n");
  fs.writeFileSync(CSV_PATH, header + body);
}

(async function main(){
  console.log("Fetching Wikipedia…");
  const html = await getHtml();
  const companies = parseTable(html);
  const prev = prevList();

  const payload = {
    updated_at: new Date().toISOString(),
    source: WIKI,
    companies
  };
  fs.writeFileSync(JSON_PATH, JSON.stringify(payload, null, 2));
  console.log(`✔ Wrote JSON → ${JSON_PATH} (${companies.length} companies)`);

  writeCSV(companies);
  console.log(`✔ Wrote CSV  → ${CSV_PATH}`);

  const { added, removed } = diff(prev, companies);
  if (added.length || removed.length){
    const stamp = new Date().toISOString().slice(0,10);
    const changes = path.join(DATA_DIR, `sp500_changes_${stamp}.json`);
    fs.writeFileSync(changes, JSON.stringify({ added, removed }, null, 2));
    console.log(`Δ Changes: ${added.length} added, ${removed.length} removed → ${changes}`);
  } else {
    console.log("No changes detected.");
  }
})().catch(err => {
  console.error("Updater failed:", err);
  process.exit(1);
});
