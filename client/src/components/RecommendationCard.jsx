import { useState } from "react";

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12l5 5L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function RecommendationCard({ recommendation, onComplete, completed, completing }) {
  const [copied, setCopied] = useState(false);

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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(topic);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (permissions, insecure context, etc.) —
      // just silently skip the "copied" feedback rather than showing an error
      // for what's a minor convenience feature.
    }
  }

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

      <div className="rec-topic-row">
        <h2 className="rec-topic">{topic}</h2>
        <button
          className="copy-topic-btn"
          onClick={handleCopy}
          aria-label="Copy topic title"
          title="Copy topic title"
          type="button"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>

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