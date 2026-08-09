import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function StatsTab() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="state-message error">{error}</p>;
  if (!stats) return <p className="state-message">Loading…</p>;

  const maxCategoryCount = Math.max(1, ...stats.categories.map((c) => c.count));

  return (
    <section>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.currentStreak}</div>
          <div className="stat-label">Current streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.longestStreak}</div>
          <div className="stat-label">Longest streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalCompleted}</div>
          <div className="stat-label">Topics learned</div>
        </div>
      </div>

      {stats.categories.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginTop: 36 }}>
            By category
          </h3>
          <div className="category-bars">
            {stats.categories.map((c) => (
              <div className="category-bar-row" key={c.category}>
                <div className="category-bar-label">{c.category}</div>
                <div className="category-bar-track">
                  <div
                    className="category-bar-fill"
                    style={{ width: `${(c.count / maxCategoryCount) * 100}%` }}
                  />
                </div>
                <div className="category-bar-count">{c.count}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {stats.totalCompleted === 0 && (
        <p className="state-message" style={{ marginTop: 24 }}>
          Complete a few topics and your stats will show up here.
        </p>
      )}
    </section>
  );
}