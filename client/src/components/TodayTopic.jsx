import { useEffect, useState } from "react";
import { api } from "../api.js";
import RecommendationCard from "./RecommendationCard.jsx";
import ResetTimer from "./ResetTimer.jsx";

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

  const { entry } = data;
  const canReroll = !entry.completed && !entry.rerolled;

  return (
    <section>
      <div className="today-meta-row">
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