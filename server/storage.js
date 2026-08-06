// Every function here now takes a userId as its first argument — this used
// to be a single-user file store (server/data/*.json), and is now a
// multi-user Postgres store (Supabase), scoped per call rather than per
// machine. See supabaseClient.js for how the service role key + manual
// `.eq("user_id", userId)` filtering enforces isolation between users.
import { supabaseAdmin } from "./supabaseClient.js";

function rowToHistoryEntry(row) {
  return {
    topic: row.topic,
    category: row.category,
    difficulty: row.difficulty,
    date_completed: row.date_completed,
    status: row.status,
    related_topics: row.related_topics ?? [],
    overview: row.overview,
    key_ideas: row.key_ideas ?? [],
    beginner_resource: row.beginner_resource,
    advanced_resource: row.advanced_resource,
    estimated_minutes: row.estimated_minutes,
    embedding: row.embedding,
  };
}

function rowToDailyEntry(row) {
  return { ...row.data, completed: row.completed, rerolled: row.rerolled };
}

// ---------- Learning history ----------

export async function getHistory(userId) {
  const { data, error } = await supabaseAdmin
    .from("history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(rowToHistoryEntry);
}

export async function addHistoryEntry(userId, entry) {
  const normalized = entry.topic.trim().toLowerCase();
  const history = await getHistory(userId);
  const existing = history.find((h) => h.topic.trim().toLowerCase() === normalized);
  if (existing) return existing;

  const row = {
    user_id: userId,
    topic: entry.topic,
    category: entry.category,
    difficulty: entry.difficulty ?? null,
    date_completed: new Date().toISOString().slice(0, 10),
    status: "completed",
    related_topics: entry.related_topics ?? [],
    overview: entry.overview ?? null,
    key_ideas: entry.key_ideas ?? [],
    beginner_resource: entry.beginner_resource ?? null,
    advanced_resource: entry.advanced_resource ?? null,
    estimated_minutes: entry.estimated_minutes ?? null,
    embedding: entry.embedding ?? null,
  };
  const { data, error } = await supabaseAdmin.from("history").insert(row).select().single();
  if (error) throw new Error(error.message);
  return rowToHistoryEntry(data);
}

export async function hasTopic(userId, topic) {
  const normalized = topic.trim().toLowerCase();
  const history = await getHistory(userId);
  return history.some((h) => h.topic.trim().toLowerCase() === normalized);
}

// ---------- Date helpers ----------

function pad(n) {
  return String(n).padStart(2, "0");
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateStrToUTC(s) {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function addDays(dateStr, days) {
  const d = new Date(dateStrToUTC(dateStr) + days * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// ---------- Daily topic + streak ----------
//
// One AI-generated topic per real calendar date, cached so reopening the
// app the same day doesn't re-generate it. Completing today's topic keeps
// the streak alive; missing a day (no entry, or entry not completed) breaks
// the chain the next time the streak is computed.

export async function getDailyEntry(userId, date) {
  const { data, error } = await supabaseAdmin
    .from("daily_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToDailyEntry(data) : null;
}

export async function saveDailyEntry(userId, date, recommendation) {
  const row = { user_id: userId, date, data: recommendation, completed: false, rerolled: false };
  const { data, error } = await supabaseAdmin
    .from("daily_entries")
    .upsert(row, { onConflict: "user_id,date" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToDailyEntry(data);
}

export async function setDailyComplete(userId, date, completed) {
  const { data, error } = await supabaseAdmin
    .from("daily_entries")
    .update({ completed })
    .eq("user_id", userId)
    .eq("date", date)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`No topic generated for ${date} yet.`);
  return rowToDailyEntry(data);
}

/**
 * Replaces today's topic with a freshly generated one, capped at one reroll
 * per day. Throws if there's no entry yet, it's already completed, or the
 * reroll has already been used today.
 */
export async function rerollDailyEntry(userId, date, recommendation) {
  const existing = await getDailyEntry(userId, date);
  if (!existing) throw new Error(`No topic generated for ${date} yet.`);
  if (existing.completed) throw new Error("Today's topic is already completed.");
  if (existing.rerolled) throw new Error("You've already used today's reroll.");

  const { data, error } = await supabaseAdmin
    .from("daily_entries")
    .update({ data: recommendation, completed: false, rerolled: true })
    .eq("user_id", userId)
    .eq("date", date)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToDailyEntry(data);
}

/**
 * Current streak: consecutive completed days counting back from today. If
 * today isn't completed yet, that's not a broken streak (the day isn't over)
 * — counting simply starts from yesterday instead.
 */
export async function getStreak(userId) {
  const { data, error } = await supabaseAdmin
    .from("daily_entries")
    .select("date")
    .eq("user_id", userId)
    .eq("completed", true);
  if (error) throw new Error(error.message);

  const completedDates = new Set((data || []).map((r) => r.date));
  const today = todayStr();
  let cursor = today;
  if (!completedDates.has(cursor)) {
    cursor = addDays(cursor, -1);
  }
  let count = 0;
  while (completedDates.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

// ---------- Daily Gemini usage cap (per user) ----------
//
// Protects the shared Gemini key from being run up by any one account —
// especially relevant now that signups are public. Throws once a user hits
// their daily cap; callers should call this right before any Gemini call.
const DAILY_GEMINI_LIMIT = 20;

export async function checkAndIncrementUsage(userId) {
  const date = todayStr();
  const { data: existing, error: selErr } = await supabaseAdmin
    .from("api_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);

  const count = existing?.count ?? 0;
  if (count >= DAILY_GEMINI_LIMIT) {
    throw new Error(`Daily limit reached (${DAILY_GEMINI_LIMIT} AI requests). Try again tomorrow.`);
  }

  const { error: upErr } = await supabaseAdmin
    .from("api_usage")
    .upsert({ user_id: userId, date, count: count + 1 }, { onConflict: "user_id,date" });
  if (upErr) throw new Error(upErr.message);
}