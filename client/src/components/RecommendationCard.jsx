export default function RecommendationCard({ recommendation, onComplete, completed, completing }) {
  const {
    category,
    topic,
    difficulty,
    overview,
    key_ideas = [],
    beginner_resource,
    advanced_resource,
    estimated_minutes,
  } = recommendation;

  return (
    <article className="rec-card">
      <div className="rec-eyebrow">
        <span className="rec-category">{category}</span>
        <div className="rec-difficulty" aria-label={`Difficulty ${difficulty} of 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={n <= difficulty ? "filled" : ""} />
          ))}
        </div>
      </div>

      <h2 className="rec-topic">{topic}</h2>

      <div className="rec-block">
        <p>{overview}</p>
      </div>

      {key_ideas.length > 0 && (
        <div className="rec-block">
          <div className="rec-block-label">Key ideas</div>
          <ul>
            {key_ideas.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rec-meta-row">
        <div className="rec-meta-item">
          <strong>Beginner resource</strong>
          {beginner_resource}
        </div>
        <div className="rec-meta-item">
          <strong>Advanced resource</strong>
          {advanced_resource}
        </div>
      </div>

      <div className="rec-footer">
        <span className="rec-time">~{estimated_minutes} minutes</span>
        <button
          className={`complete-btn ${completed ? "done" : ""}`}
          onClick={onComplete}
          disabled={completed || completing}
        >
          {completed ? "✔ Marked as completed" : completing ? "Saving…" : "Mark as Completed"}
        </button>
      </div>
    </article>
  );
}
