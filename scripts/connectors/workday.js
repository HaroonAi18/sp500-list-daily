// scripts/connectors/workday.js
import fetch from "node-fetch";
import { normalize } from "../model.js";

function deriveCxs(baseUrl) {
  // ex: https://cvshealth.wd1.myworkdayjobs.com/CVS_Health_Careers
  const u = new URL(baseUrl);
  const [tenant] = u.hostname.split(".");
  const site = u.pathname.split("/").filter(Boolean)[0];
  return `https://${tenant}.wd1.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
}

export async function fetchWorkday({ company, base }) {
  const api = deriveCxs(base);
  const limit = 100;
  let offset = 0;
  const out = [];

  while (true) {
    const body = { limit, offset, searchText: "" };
    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) break; // some tenants may block; fail soft
    const data = await res.json();
    const rows = (data?.jobPostings || []).map(j => normalize({
      source: "workday",
      company,
      reqId: j.externalPath || j.id || j.jobPostingId,
      title: j.title,
      department: j.businessLine || j.primaryLocation || null,
      location: j.locationsText || j.primaryLocation || null,
      remote: /remote/i.test(j.locationsText || ""),
      employmentType: j.timeType || null,
      postedAt: j.postedOn || null,
      applyUrl: j.externalPath ? `${base}/${j.externalPath}` : base,
      descriptionHtml: null,
      tags: [j.category || ""].filter(Boolean)
    }));
    out.push(...rows);
    if (rows.length < limit) break;
    offset += limit;
  }

  return out;
}
