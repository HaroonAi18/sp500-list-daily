// scripts/fetch-jobs.mjs
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import companies from "../config/companies.json" assert { type: "json" };
import { fetchGreenhouse } from "./connectors/greenhouse.js";
import { fetchWorkday } from "./connectors/workday.js";
import { fetchCustom } from "./connectors/custom.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const all = [];

  for (const c of companies) {
    try {
      let rows = [];
      if (c.type === "greenhouse") rows = await fetchGreenhouse(c);
      else if (c.type === "workday") rows = await fetchWorkday(c);
      else rows = await fetchCustom(c);

      all.push(...rows);
      console.log(`${c.company}: ${rows.length} jobs`);
    } catch (e) {
      console.error(`${c.company} failed:`, e.message || e);
    }
  }

  // dedupe by company+reqId
  const seen = new Set();
  const deduped = all.filter(j => {
    const key = `${j.company}::${j.reqId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const outDir = path.resolve(__dirname, "../public");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "jobs.json"),
    JSON.stringify(deduped, null, 2)
  );
  console.log(`Wrote ${deduped.length} jobs → public/jobs.json`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
