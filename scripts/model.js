// scripts/model.js
export function normalize({
  source, company, reqId, title, department, location,
  remote, employmentType, postedAt, applyUrl, descriptionHtml, tags
}) {
  return {
    source,
    company,
    reqId,
    title,
    department: department || null,
    location: location || null,
    remote: !!remote,
    employmentType: employmentType || null,
    postedAt: postedAt || null,
    applyUrl,
    descriptionHtml: descriptionHtml || null,
    tags: tags || []
  };
}
