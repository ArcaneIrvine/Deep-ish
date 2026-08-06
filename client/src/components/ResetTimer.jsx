import { useEffect, useState } from "react";

function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ResetTimer({ onReset }) {
  const [remaining, setRemaining] = useState(msUntilMidnight());

  useEffect(() => {
    const id = setInterval(() => {
      const next = msUntilMidnight();
      setRemaining(next);
      // Crossed midnight — a new day's topic is due.
      if (next > 23 * 60 * 60 * 1000 && onReset) onReset();
    }, 1000);
    return () => clearInterval(id);
  }, [onReset]);

  return (
    <span className="reset-timer" title="Time until a new topic unlocks">
      New topic in {formatDuration(remaining)}
    </span>
  );
}
