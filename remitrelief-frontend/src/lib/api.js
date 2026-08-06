const API_URL = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function fetchCampaigns(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
  ).toString();
  return request(`/campaigns${qs ? `?${qs}` : ""}`);
}

export function fetchCampaign(id) {
  return request(`/campaigns/${id}`);
}

export function createCampaign(body) {
  return request("/campaigns", { method: "POST", body: JSON.stringify(body) });
}

export function fetchStats() {
  return request("/stats");
}

export function fetchLedger(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
  ).toString();
  return request(`/ledger${qs ? `?${qs}` : ""}`);
}

export function fetchDonations(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
  ).toString();
  return request(`/donations${qs ? `?${qs}` : ""}`);
}

export function recordDonation(body) {
  return request("/donations", { method: "POST", body: JSON.stringify(body) });
}

export function prepareDeposit(body) {
  return request("/donations/prepare", { method: "POST", body: JSON.stringify(body) });
}

export function prepareVerify(campaignId, body) {
  return request(`/milestones/${campaignId}/prepare-verify`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function submitVerify(campaignId, body) {
  return request(`/milestones/${campaignId}/verify`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function submitRelease(campaignId, body) {
  return request(`/milestones/${campaignId}/release`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export { API_URL };
