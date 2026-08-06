import { useEffect, useState } from "react";
import TodayTopic from "./components/TodayTopic.jsx";
import AIMentor from "./components/AIMentor.jsx";
import HistoryPanel from "./components/HistoryPanel.jsx";
import Login from "./components/Login.jsx";
import { supabase } from "./lib/supabaseClient.js";
import "./App.css";

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3.5 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M15 17l5-5-5-5M20 12H9M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  const [showHistory, setShowHistory] = useState(false);
  const [session, setSession] = useState(undefined); // undefined = still loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="app">
        <main className="app-main">
          <p className="state-message">Loading…</p>
        </main>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-name">
            <span className="brand-mark" aria-hidden="true" />
            <h1>Deep-ish</h1>
          </div>
          <div className="header-actions">
            <button
              className="history-btn"
              onClick={() => setShowHistory(true)}
              aria-label="View learning history"
              title="Learning history"
            >
              <HistoryIcon />
            </button>
            <button
              className="history-btn"
              onClick={() => supabase.auth.signOut()}
              aria-label="Sign out"
              title={`Sign out (${session.user.email})`}
            >
              <SignOutIcon />
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <TodayTopic />
        <hr className="section-divider" />
        <AIMentor />
      </main>

      {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}
    </div>
  );
}
