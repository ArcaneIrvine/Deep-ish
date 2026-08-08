import { useEffect, useState } from "react";
import { api } from "../api.js";

function pad(n) {
  return String(n).padStart(2, "0");
}

function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Builds a GitHub-style heatmap grid: 12 weeks back from today, Sun-Sat rows.
function buildWeeks(calendar) {
  const byDate = new Map(calendar.map((c) => [c.date, c.completed]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Walk back to the most recent Sunday on/before today, then 11 more weeks
  // before that, so the grid always ends on the current week.
  const end = new Date(today);
  const endDay = end.getDay(); // 0 = Sunday
  const gridEnd = new Date(end);
  gridEnd.setDate(end.getDate() + (6 - endDay)); // pad out to end of this week (Saturday)

  const weeks = [];
  for (let w = 11; w >= 0; w--) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(gridEnd);
      day.setDate(gridEnd.getDate() - w * 7 - (6 - d));
      const dateStr = toDateStr(day);
      const isFuture = day > today;
      week.push({
        date: dateStr,
        completed: byDate.get(dateStr),
        isFuture,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

function cellClass(cell) {
  if (cell.isFuture) return "calendar-cell future";
  if (cell.completed === true) return "calendar-cell completed";
  if (cell.completed === false) return "calendar-cell attempted";
  return "calendar-cell empty";
}

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
  const weeks = buildWeeks(stats.calendar);

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

      <h3 className="section-title" style={{ marginTop: 36 }}>
        Activity
      </h3>
      <div className="calendar-heatmap">
        {weeks.map((week, i) => (
          <div className="calendar-week" key={i}>
            {week.map((cell) => (
              <div key={cell.date} className={cellClass(cell)} title={cell.date} />
            ))}
          </div>
        ))}
      </div>
      <div className="calendar-legend">
        <span className="calendar-cell empty" />
        <span>no data</span>
        <span className="calendar-cell attempted" />
        <span>attempted</span>
        <span className="calendar-cell completed" />
        <span>completed</span>
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