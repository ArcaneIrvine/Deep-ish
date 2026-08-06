// On desktop, this file (client/src/api.js) is a thin fetch() wrapper
// calling the Express server (server/index.js). On Android there is no
// separate server process — this file directly runs the same logic that
// used to live in the server's route handlers, calling straight into the
// ported lib/storage.js, lib/llm.js, and lib/prompts.js. The exported `api`
// object's shape matches the desktop version exactly, so the copied
// components (TodayTopic, AIMentor, HistoryPanel) didn't need any changes.
import {
  getHistory as fetchHistory,
  addHistoryEntry,
  hasTopic,
  getDailyEntry,
  saveDailyEntry,
  setDailyComplete as storageSetDailyComplete,
  rerollDailyEntry,
  getStreak,
  todayStr,
} from "./lib/storage.js";
import { getRecommendation, embedText, getModelInfo } from "./lib/llm.js";
import {
  buildContinuePrompt,
  buildSurprisePrompt,
  buildDeepenPrompt,
  SYSTEM_PROMPT,
} from "./lib/prompts.js";

// Adds a completed topic to permanent history, attaching a vector embedding
// (used for semantic duplicate detection on future recommendations) when
// the embedding call succeeds.
async function addToHistoryWithEmbedding(topicData) {
  const embedding = await embedText(topicData.topic);
  return addHistoryEntry({ ...topicData, embedding });
}

export const api = {
  // ---------- Today's topic (the streak) ----------

  async getDaily() {
    try {
      const today = todayStr();
      let entry = await getDailyEntry(today);
      if (!entry) {
        const history = await fetchHistory();
        const userPrompt = buildContinuePrompt(history);
        const recommendation = await getRecommendation(SYSTEM_PROMPT, userPrompt, history);
        entry = await saveDailyEntry(today, recommendation);
      }
      const streak = await getStreak();
      return { date: today, entry, streak };
    } catch (err) {
      throw new Error(err.message || "Couldn't plan today's topic. Check VITE_GEMINI_API_KEY in android-app/.env.");
    }
  },

  async setDailyComplete(completed) {
    const today = todayStr();
    const entry = await storageSetDailyComplete(today, completed);

    if (completed && entry.topic && !(await hasTopic(entry.topic))) {
      await addToHistoryWithEmbedding({
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

    const streak = await getStreak();
    return { date: today, entry, streak };
  },

  // One reroll per day: replaces today's topic with a fresh one, explicitly
  // excluding the topic being discarded so the model can't just hand it back.
  async rerollDaily() {
    try {
      const today = todayStr();
      const current = await getDailyEntry(today);
      if (!current) throw new Error("No topic generated for today yet.");
      if (current.completed) throw new Error("Today's topic is already completed.");
      if (current.rerolled) throw new Error("You've already used today's reroll.");

      const history = await fetchHistory();
      const userPrompt = buildContinuePrompt(history);
      const recommendation = await getRecommendation(SYSTEM_PROMPT, userPrompt, history, [
        current.topic,
      ]);
      const entry = await rerollDailyEntry(today, recommendation);
      const streak = await getStreak();
      return { date: today, entry, streak };
    } catch (err) {
      throw new Error(err.message || "Couldn't reroll today's topic. Check VITE_GEMINI_API_KEY in android-app/.env.");
    }
  },

  // ---------- Learning history ----------

  async getHistory() {
    const history = await fetchHistory();
    // Embeddings are an internal implementation detail — no reason to show
    // them in the history panel.
    return { history: history.map(({ embedding, ...rest }) => rest) };
  },

  // ---------- AI Mentor: extra, on-demand content (doesn't touch the streak) ----------

  async getMentorStatus() {
    return getModelInfo();
  },

  async recommend(mode, category) {
    try {
      const history = await fetchHistory();

      let userPrompt;
      if (mode === "surprise") userPrompt = buildSurprisePrompt(history);
      else if (mode === "deepen") userPrompt = buildDeepenPrompt(history, category);
      else throw new Error("Invalid mode. Use surprise | deepen.");

      const recommendation = await getRecommendation(SYSTEM_PROMPT, userPrompt, history);
      return { recommendation };
    } catch (err) {
      throw new Error(
        err.message || "Something went wrong talking to Gemini. Check VITE_GEMINI_API_KEY in android-app/.env."
      );
    }
  },

  async completeTopic(recommendation) {
    const record = await addToHistoryWithEmbedding(recommendation);
    return { record };
  },
};
