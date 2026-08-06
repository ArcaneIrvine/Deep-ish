// Ported from server/llm.js (the desktop version's server). Identical
// Gemini calls, prompt schema, and duplicate-detection logic. The API key
// and model now come from a build-time .env file (see .env.example) — the
// same "copy .env.example to .env" workflow as the desktop server, instead
// of an in-app settings screen. Vite embeds VITE_-prefixed variables into
// the built JS bundle at `npm run build` time.
//
// Security note: because there's no server process to keep secrets behind,
// the key ends up compiled into the app bundle rather than staying on a
// machine you control — see android-app/README.md for what that means and
// why this app is meant to stay private to you, not published/shared as-is.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-3.6-flash";
const EMBED_MODEL = import.meta.env.VITE_GEMINI_EMBED_MODEL || "gemini-embedding-001";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Cosine similarity at/above this is treated as "the same topic, worded
// differently" rather than a genuinely new one.
const DUPLICATE_THRESHOLD = 0.87;

// Matches the recommendation schema exactly, enforced by Gemini (unlike a
// plain "return JSON" instruction, this makes malformed output essentially
// impossible rather than just discouraged).
const RECOMMENDATION_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string" },
    topic: { type: "string" },
    difficulty: { type: "integer" },
    overview: { type: "string" },
    key_ideas: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
    beginner_resource: { type: "string" },
    advanced_resource: { type: "string" },
    estimated_minutes: { type: "integer" },
  },
  required: [
    "category",
    "topic",
    "difficulty",
    "overview",
    "key_ideas",
    "beginner_resource",
    "advanced_resource",
    "estimated_minutes",
  ],
};

const REQUIRED_KEYS = RECOMMENDATION_SCHEMA.required;

function validateShape(obj) {
  if (!obj || typeof obj !== "object") return false;
  return REQUIRED_KEYS.every((k) => k in obj);
}

async function requireApiKey() {
  if (!API_KEY) {
    throw new Error(
      "No Gemini API key set. Copy android-app/.env.example to android-app/.env, " +
        "paste in a free key from https://aistudio.google.com/apikey, then rebuild the app."
    );
  }
  return API_KEY;
}

async function callModel(systemPrompt, userPrompt) {
  const apiKey = await requireApiKey();
  const model = MODEL;

  let res;
  try {
    res = await fetch(`${API_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RECOMMENDATION_SCHEMA,
          temperature: 0.8,
        },
      }),
    });
  } catch {
    throw new Error(
      "Can't reach the Gemini API. Check your internet connection and try again."
    );
  }

  if (res.status === 429) {
    throw new Error(
      "Gemini's free-tier rate limit was hit. Wait a bit (or try again tomorrow if it's the daily quota) and try again."
    );
  }
  if (res.status === 404) {
    throw new Error(
      `Gemini model "${model}" isn't available (Google retires/restricts model ` +
        `versions fairly often). Check https://ai.google.dev/gemini-api/docs/models for a ` +
        `current model name and set VITE_GEMINI_MODEL in android-app/.env to it, then rebuild.`
    );
  }
  if (res.status === 400 || res.status === 403) {
    throw new Error(
      "Gemini rejected the request — double-check VITE_GEMINI_API_KEY in android-app/.env is correct."
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini request failed (${res.status}). ${text}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;

  if (!text) {
    const reason = candidate?.finishReason;
    throw new Error(
      reason ? `Gemini returned no content (reason: ${reason}).` : "Gemini returned no content."
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Model did not return valid JSON.");
  }
}

/**
 * Gets a vector embedding for a piece of text. Returns null (rather than
 * throwing) on any failure, so callers can fall back to exact-string
 * matching instead of hard-failing the whole recommendation flow.
 */
let warnedEmbedFailure = false;

export async function embedText(text) {
  if (!API_KEY) return null;
  try {
    const res = await fetch(`${API_BASE}/${EMBED_MODEL}:embedContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    });
    if (!res.ok) {
      if (!warnedEmbedFailure) {
        warnedEmbedFailure = true;
        const body = await res.text().catch(() => "");
        console.warn(
          `[deep-ish] Embedding calls are failing (${res.status}) — duplicate detection is falling ` +
            `back to exact-text matching only. Check VITE_GEMINI_EMBED_MODEL in android-app/.env. ${body}`
        );
      }
      return null;
    }
    const data = await res.json();
    const values = data?.embedding?.values;
    return Array.isArray(values) ? values : null;
  } catch {
    return null;
  }
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Real duplicate detection: an exact-string check first (cheap, always
 * works), then a semantic check via embeddings so "Nature vs. Nurture" and
 * "The Nature-Nurture Debate" are correctly caught as the same topic even
 * though the wording differs. If embeddings aren't available, this silently
 * falls back to exact-match only rather than failing the request.
 */
export async function isDuplicateTopic(candidateTopic, history, excludeTopics = []) {
  const normalizedCandidate = candidateTopic.trim().toLowerCase();
  const exactPool = [...history.map((h) => h.topic), ...excludeTopics];
  if (exactPool.some((t) => t.trim().toLowerCase() === normalizedCandidate)) {
    return true;
  }

  const candidateEmbedding = await embedText(candidateTopic);
  if (!candidateEmbedding) return false; // embeddings unavailable — exact check already ran

  for (const h of history) {
    if (!h.embedding) continue;
    if (cosineSimilarity(candidateEmbedding, h.embedding) >= DUPLICATE_THRESHOLD) return true;
  }
  for (const t of excludeTopics) {
    const emb = await embedText(t);
    if (emb && cosineSimilarity(candidateEmbedding, emb) >= DUPLICATE_THRESHOLD) return true;
  }
  return false;
}

/**
 * Calls the model, validates shape, and retries once if the topic collides
 * (exactly or semantically) with the student's existing history or the
 * JSON shape is malformed. `excludeTopics` additionally blocks specific
 * topics outside of history — used when rerolling today's topic so the
 * model can't just hand back the same thing it already suggested.
 */
export async function getRecommendation(systemPrompt, userPrompt, history = [], excludeTopics = []) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const prompt =
        attempt === 0
          ? userPrompt
          : `${userPrompt}\n\nIMPORTANT: Your previous attempt repeated an already-explored topic. Pick a genuinely new one.`;

      const result = await callModel(systemPrompt, prompt);
      if (!validateShape(result)) {
        lastError = new Error("Model response missing required fields.");
        continue;
      }
      if (await isDuplicateTopic(result.topic, history, excludeTopics)) {
        lastError = new Error("Model repeated an already-explored topic.");
        continue;
      }
      return result;
    } catch (err) {
      lastError = err;
      // Don't retry on config/rate-limit errors — retrying won't help and
      // just doubles the wait before the user sees the real problem.
      if (!(err instanceof Error) || /No Gemini API key|rate limit|isn't available/i.test(err.message)) break;
    }
  }
  throw lastError || new Error("Failed to get a recommendation.");
}

export async function getModelInfo() {
  return { model: MODEL, embedModel: EMBED_MODEL };
}
