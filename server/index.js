import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { supabaseAuth } from "./supabaseClient.js";
import {
  getHistory,
  addHistoryEntry,
  hasTopic,
  getDailyEntry,
  saveDailyEntry,
  setDailyComplete,
  rerollDailyEntry,
  getStreak,
  todayStr,
  checkAndIncrementUsage,
  getStats,
  resetUserData,
  getUsageToday,
} from "./storage.js";
import { getRecommendation, embedText, getModelInfo } from "./llm.js";
import {
  buildContinuePrompt,
  buildSurprisePrompt,
  buildDeepenPrompt,
  SYSTEM_PROMPT,
} from "./prompts.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5174;
// Defaults to localhost-only, matching the desktop launcher's original
// intent (no LAN exposure). Hosting platforms like Render set HOST=0.0.0.0
// explicitly (see render.yaml) so the service is actually reachable.
const HOST = process.env.HOST || "127.0.0.1";

// Every /api/* route below (except /mentor/status, which is static info) is
// per-user data, so it requires a valid Supabase session. The browser client
// signs in via supabase-js and sends the resulting access token as
// `Authorization: Bearer <token>` on each request; we verify it here and
// attach the user id to req.user for the route handlers to use.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not signed in." });

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: "Invalid or expired session." });

  req.user = data.user;
  next();
}

// Adds a completed topic to permanent history, attaching a vector embedding
// (used for semantic duplicate detection on future recommendations) when
// the embedding call succeeds.
async function addToHistoryWithEmbedding(userId, topicData) {
  const embedding = await embedText(topicData.topic);
  return addHistoryEntry(userId, { ...topicData, embedding });
}

// ---------- Today's topic (the streak) ----------

app.get("/api/daily", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = todayStr();
    let entry = await getDailyEntry(userId, today);
    if (!entry) {
      await checkAndIncrementUsage(userId);
      const history = await getHistory(userId);
      const userPrompt = buildContinuePrompt(history);
      const recommendation = await getRecommendation(SYSTEM_PROMPT, userPrompt, history);
      entry = await saveDailyEntry(userId, today, recommendation);
    }
    const streak = await getStreak(userId);
    res.json({ date: today, entry, streak });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Couldn't plan today's topic. Check GEMINI_API_KEY in server/.env.",
    });
  }
});

app.post("/api/daily/complete", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const completed = req.body?.completed ?? true;
    const today = todayStr();
    const entry = await setDailyComplete(userId, today, completed);

    if (completed && entry.topic && !(await hasTopic(userId, entry.topic))) {
      await addToHistoryWithEmbedding(userId, {
        topic: entry.topic,
        category: entry.category,
        difficulty: entry.difficulty,
        related_topics: entry.related_topics ?? [],
        overview: entry.overview ?? null,
        key_ideas: entry.key_ideas ?? [],
        beginner_resource: entry.beginner_resource ?? null,
        advanced_resource: entry.advanced_resource ?? null,
        estimated_minutes: entry.estimated_minutes ?? null,
      });
    }

    const streak = await getStreak(userId);
    res.json({ date: today, entry, streak });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// One reroll per day: replaces today's topic with a fresh one, explicitly
// excluding the topic being discarded so the model can't just hand it back.
app.post("/api/daily/reroll", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = todayStr();
    const current = await getDailyEntry(userId, today);
    if (!current) return res.status(400).json({ error: "No topic generated for today yet." });
    if (current.completed) {
      return res.status(400).json({ error: "Today's topic is already completed." });
    }
    if (current.rerolled) {
      return res.status(400).json({ error: "You've already used today's reroll." });
    }

    await checkAndIncrementUsage(userId);
    const history = await getHistory(userId);
    const userPrompt = buildContinuePrompt(history);
    const recommendation = await getRecommendation(SYSTEM_PROMPT, userPrompt, history, [
      current.topic,
    ]);
    const entry = await rerollDailyEntry(userId, today, recommendation);
    const streak = await getStreak(userId);
    res.json({ date: today, entry, streak });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Couldn't reroll today's topic. Check GEMINI_API_KEY in server/.env.",
    });
  }
});

// ---------- Learning history ----------

app.get("/api/history", requireAuth, async (req, res) => {
  const history = await getHistory(req.user.id);
  // Embeddings are an internal implementation detail — no reason to ship
  // them to the client.
  res.json({ history: history.map(({ embedding, ...rest }) => rest) });
});

// ---------- Stats tab ----------

app.get("/api/stats", requireAuth, async (req, res) => {
  try {
    const stats = await getStats(req.user.id);
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Couldn't load stats." });
  }
});

// ---------- Account tab ----------

app.post("/api/account/reset", requireAuth, async (req, res) => {
  try {
    await resetUserData(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Couldn't reset your data." });
  }
});

app.get("/api/account/usage", requireAuth, async (req, res) => {
  try {
    const usage = await getUsageToday(req.user.id);
    res.json(usage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Couldn't load usage." });
  }
});

// ---------- AI Mentor: extra, on-demand content (doesn't touch the streak) ----------

app.get("/api/mentor/status", (req, res) => {
  res.json(getModelInfo());
});

app.post("/api/mentor/recommend", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mode, category } = req.body || {};
    const history = await getHistory(userId);

    let userPrompt;
    if (mode === "surprise") userPrompt = buildSurprisePrompt(history);
    else if (mode === "deepen") userPrompt = buildDeepenPrompt(history, category);
    else return res.status(400).json({ error: "Invalid mode. Use surprise | deepen." });

    await checkAndIncrementUsage(userId);
    const recommendation = await getRecommendation(SYSTEM_PROMPT, userPrompt, history);
    res.json({ recommendation });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error:
        err.message ||
        "Something went wrong talking to Gemini. Check GEMINI_API_KEY in server/.env.",
    });
  }
});

app.post("/api/mentor/complete", requireAuth, async (req, res) => {
  try {
    const record = await addToHistoryWithEmbedding(req.user.id, req.body);
    res.json({ record });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------- Serve the built frontend (single-process, single-port mode) ----------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");

app.use(express.static(CLIENT_DIST));
app.get(/^(?!\/api).*/, (req, res, next) => {
  res.sendFile(path.join(CLIENT_DIST, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Deep-ish running on http://${HOST}:${PORT}`);
  const { model, embedModel } = getModelInfo();
  console.log(`Using Gemini API — model "${model}", embeddings "${embedModel}"`);
});