// scripts/connectors/greenhouse.js
import fetch from "node-fetch";
import { normalize } from "../model.js";

export async function fetchGreenhouse({ company, token }) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) return [];
  const data = await res.json();

  return (data.jobs || []).map(j => normalize({
    source: "greenhouse",
    company,
    reqId: String(j.id),
    title: j.title,
    department: j.departments?.[0]?.name,
    location: j.location?.name,
    remote: /remote/i.test(j.location?.name || ""),
    employmentType: j.metadata?.find(m => m.name === "Employment Type")?.value || null,
    postedAt: j.updated_at || j.created_at || null,
    applyUrl: j.absolute_url,
    descriptionHtml: null,
    tags: (j.departments || []).map(d => d.name)
  }));
}
