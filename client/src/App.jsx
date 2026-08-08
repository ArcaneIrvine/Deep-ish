import { useEffect, useState } from "react";
import TodayTopic from "./components/TodayTopic.jsx";
import AIMentor from "./components/AIMentor.jsx";
import Login from "./components/Login.jsx";
import TabBar from "./components/TabBar.jsx";
import StatsTab from "./components/StatsTab.jsx";
import BrowseTab from "./components/BrowseTab.jsx";
import AccountTab from "./components/AccountTab.jsx";
import { supabase } from "./lib/supabaseClient.js";
import "./App.css";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [tab, setTab] = useState("today");

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
        </div>
      </header>

      <main className="app-main">
        <TabBar active={tab} onChange={setTab} />
        {tab === "today" && (
          <>
            <TodayTopic />
            <hr className="section-divider" />
            <AIMentor />
          </>
        )}
        {tab === "stats" && <StatsTab />}
        {tab === "browse" && <BrowseTab />}
        {tab === "account" && <AccountTab session={session} />}
      </main>
    </div>
  );
}