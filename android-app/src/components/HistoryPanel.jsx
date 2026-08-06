import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

export default function HistoryPanel({ onClose }) {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);

  useEffect(() => {
    api
      .getHistory()
      .then((r) => setHistory(r.history))
      .catch((err) => setError(err.message));
  }, []);

  // Category -> its topics (newest first), categories ordered by most
  // recently active first so the discipline you're currently in stays on top.
  const grouped = useMemo(() => {
    if (!history) return [];
    const byCategory = {};
    for (const h of history) (byCategory[h.category] ||= []).push(h);
    for (const cat in byCategory) {
      byCategory[cat].sort((a, b) => (a.date_completed < b.date_completed ? 1 : -1));
    }
    return Object.entries(byCategory).sort(
      (a, b) => (a[1][0].date_completed < b[1][0].date_completed ? 1 : -1)
    );
  }, [history]);

  function toggleCategory(cat) {
    setExpandedTopic(null);
    setExpandedCategory((cur) => (cur === cat ? null : cat));
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="section-title" style={{ margin: 0 }}>
            Learning history
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && <p className="state-message error">{error}</p>}
        {!history && !error && <p className="state-message">Loading…</p>}
        {history && history.length === 0 && (
          <p className="state-message">Nothing completed yet — it'll show up here.</p>
        )}

        {grouped.length > 0 && (
          <ul className="history-category-list">
            {grouped.map(([cat, topics]) => {
              const categoryOpen = expandedCategory === cat;
              return (
                <li key={cat} className="history-category">
                  <button
                    className="history-category-row"
                    onClick={() => toggleCategory(cat)}
                    aria-expanded={categoryOpen}
                  >
                    <span className="history-category-name">{cat}</span>
                    <span className="history-category-count">{topics.length}</span>
                  </button>

                  {categoryOpen && (
                    <ul className="history-list">
                      {topics.map((h) => {
                        const topicOpen = expandedTopic === h.topic;
                        return (
                          <li key={h.topic} className="history-item">
                            <button
                              className="history-item-row"
                              onClick={() => setExpandedTopic(topicOpen ? null : h.topic)}
                              aria-expanded={topicOpen}
                            >
                              <span className="history-topic">{h.topic}</span>
                              <span className="history-date">{h.date_completed}</span>
                            </button>

                            {topicOpen && (
                              <div className="history-detail">
                                {h.overview && <p>{h.overview}</p>}
                                {h.key_ideas?.length > 0 && (
                                  <ul className="history-key-ideas">
                                    {h.key_ideas.map((k, i) => (
                                      <li key={i}>{k}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
