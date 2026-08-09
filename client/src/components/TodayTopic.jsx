import { useEffect, useState } from "react";
import { api } from "../api.js";
import RecommendationCard from "./RecommendationCard.jsx";
import ResetTimer from "./ResetTimer.jsx";

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2c1 3-3 4-3 8a3 3 0 006 0c1.5 1 2 2.8 2 4.2A5.2 5.2 0 0112 19.4a5.2 5.2 0 01-5-5.2C7 10 9 8 9 8s.2 3 2 3c1.3 0 1-2 1-4 0-2-1-4-1-4z"
        stroke="var(--accent)"
        strokeWidth="1.4"
        fill="var(--accent-dim)"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TodayTopic() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [planning, setPlanning] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [rerolling, setRerolling] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError(null);
    setPlanning(true);
    try {
      const result = await api.getDaily();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlanning(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      const result = await api.setDailyComplete(true);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setCompleting(false);
    }
  }

  async function handleReroll() {
    setError(null);
    setRerolling(true);
    try {
      const result = await api.rerollDaily();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setRerolling(false);
    }
  }

  if (planning && !data) {
    return (
      <div className="loading-lamp">
        <span className="loading-dot" />
        Planning today's topic…
      </div>
    );
  }

  if (error && !data) return <p className="state-message error">{error}</p>;
  if (!data) return null;

  const { entry, streak } = data;
  const canReroll = !entry.completed && !entry.rerolled;

  return (
    <section>
      <div className="streak-row">
        <div className="streak-badge">
          <FlameIcon />
          <span className="streak-count">{streak}</span>
          <span className="streak-label">day streak</span>
        </div>
        <ResetTimer onReset={load} />
      </div>

      {error && <p className="state-message error">{error}</p>}

      <RecommendationCard
        recommendation={entry}
        onComplete={handleComplete}
        completed={entry.completed}
        completing={completing}
      />

      {canReroll && (
        <div className="reroll-row">
          <button className="reroll-btn" onClick={handleReroll} disabled={rerolling}>
            {rerolling ? "Finding something else…" : "Not feeling this? Get a different topic"}
          </button>
          <span className="reroll-hint">One reroll per day</span>
        </div>
      )}
    </section>
  );
}