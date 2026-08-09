import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import RecommendationCard from "./RecommendationCard.jsx";

// Always offered in the Deepen picker, whether or not you've touched them
// yet — this is the standing menu of disciplines, not just ones with history.
const BASE_CATEGORIES = [
  "Philosophy",
  "Psychology",
  "History",
  "Science",
  "Economics",
  "Literature",
  "Politics",
];

export default function AIMentor() {
  const [history, setHistory] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [deepenCategory, setDeepenCategory] = useState("");
  const [showDeepenPicker, setShowDeepenPicker] = useState(false);

  useEffect(() => {
    api
      .getHistory()
      .then((r) => setHistory(r.history))
      .catch((err) => setError(err.message));
  }, []);

  const categoryOrder = useMemo(() => {
    if (!history) return [];
    const seen = [];
    for (const h of history) if (!seen.includes(h.category)) seen.push(h.category);
    return seen;
  }, [history]);

  // The full menu: the standing disciplines, plus anything Surprise Me has
  // organically introduced that isn't already in that standing list.
  const allCategories = useMemo(() => {
    const extras = categoryOrder.filter((c) => !BASE_CATEGORIES.includes(c));
    return [...BASE_CATEGORIES, ...extras];
  }, [categoryOrder]);

  async function requestRecommendation(mode, category) {
    setLoading(true);
    setError(null);
    setRecommendation(null);
    setCompleted(false);
    try {
      const { recommendation } = await api.recommend(mode, category);
      setRecommendation(recommendation);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    if (!recommendation) return;
    setCompleting(true);
    try {
      const { record } = await api.completeTopic(recommendation);
      setHistory((prev) => [...(prev || []), record]);
      setCompleted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setCompleting(false);
    }
  }

  return (
    <section>
      <h2 className="section-title">Explore more</h2>
      <p className="section-sub">
        Optional extra content, on top of today's topic
      </p>

      <div className="mentor-actions">
        <button
          className="mentor-action"
          disabled={loading}
          onClick={() => requestRecommendation("surprise")}
        >
          <div className="mentor-action-title">Surprise Me</div>
          <div className="mentor-action-desc">
            An unexpected, valuable idea from a field you haven't explored yet.
          </div>
        </button>

        <button
          className="mentor-action"
          disabled={loading}
          onClick={() => setShowDeepenPicker((s) => !s)}
        >
          <div className="mentor-action-title">Deepen Knowledge</div>
          <div className="mentor-action-desc">
            Pick a discipline and get your next topic in it.
          </div>
        </button>
      </div>

      {showDeepenPicker && (
        <div className="deepen-picker">
          <div className="rec-block-label">Which discipline?</div>
          <select value={deepenCategory} onChange={(e) => setDeepenCategory(e.target.value)}>
            <option value="">Let the mentor choose the best one</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <div className="reset-row" style={{ marginTop: 14 }}>
            <button
              className="mark-btn"
              disabled={loading}
              onClick={() => {
                setShowDeepenPicker(false);
                requestRecommendation("deepen", deepenCategory || undefined);
              }}
            >
              Get recommendation
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-lamp">
          <span className="loading-dot" />
          Thinking…
        </div>
      )}

      {error && !loading && <p className="state-message error">{error}</p>}

      {recommendation && !loading && (
        <RecommendationCard
          recommendation={recommendation}
          onComplete={handleComplete}
          completed={completed}
          completing={completing}
        />
      )}
    </section>
  );
}