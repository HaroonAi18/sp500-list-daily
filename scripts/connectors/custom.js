// scripts/connectors/custom.js
export async function fetchCustom({ company, base }) {
  console.warn(`[custom] Skipping ${company} (${base}) for now.`);
  return [];
}
