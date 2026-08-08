import { supabase } from "./lib/supabaseClient.js";

const BASE = "/api";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options, retried = false) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // A token can very briefly fail validation right after sign-in (e.g. a
    // transient clock-skew check on a freshly-issued JWT) — refreshing the
    // session mints a new token and clears it, same as a manual page
    // reload would, but automatically and without the user noticing.
    if (res.status === 401 && !retried) {
      await supabase.auth.refreshSession();
      return request(path, options, true);
    }
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  getDaily: () => request("/daily"),
  setDailyComplete: (completed) =>
    request("/daily/complete", {
      method: "POST",
      body: JSON.stringify({ completed }),
    }),
  rerollDaily: () => request("/daily/reroll", { method: "POST" }),

  getHistory: () => request("/history"),
  getStats: () => request("/stats"),
  getUsage: () => request("/account/usage"),
  resetData: () => request("/account/reset", { method: "POST" }),

  getMentorStatus: () => request("/mentor/status"),
  recommend: (mode, category) =>
    request("/mentor/recommend", {
      method: "POST",
      body: JSON.stringify({ mode, category }),
    }),
  completeTopic: (recommendation) =>
    request("/mentor/complete", {
      method: "POST",
      body: JSON.stringify(recommendation),
    }),
};