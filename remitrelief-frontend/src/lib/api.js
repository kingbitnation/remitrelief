const API_URL = import.meta.env.VITE_API_URL || "";

const TOKEN_KEY = "remitrelief_sid";

let sessionToken = sessionStorage.getItem(TOKEN_KEY) || "";
let onUnauthorized = null;

export function setSessionToken(token) {
  sessionToken = token || "";
  if (sessionToken) sessionStorage.setItem(TOKEN_KEY, sessionToken);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function getSessionToken() {
  return sessionToken;
}

export function clearSessionToken() {
  setSessionToken("");
}

/** @deprecated use setSessionToken */
export function setAuthToken(token) {
  setSessionToken(token);
}
export function getAuthToken() {
  return getSessionToken();
}
export function clearAuthToken() {
  clearSessionToken();
}

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearSessionToken();
    if (typeof onUnauthorized === "function") onUnauthorized(data);
  }
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.code = data.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

export function fetchAuthChallenge(publicKey) {
  return request("/auth/challenge", {
    method: "POST",
    body: JSON.stringify({ publicKey }),
  });
}

export function verifyAuthChallenge(body) {
  return request("/auth/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function logoutAuth() {
  return request("/auth/logout", { method: "POST", body: JSON.stringify({}) });
}

export function fetchMe() {
  return request("/auth/me");
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
