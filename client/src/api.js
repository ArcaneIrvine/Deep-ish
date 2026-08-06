import { supabase } from "./lib/supabaseClient.js";

const BASE = "/api";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
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
