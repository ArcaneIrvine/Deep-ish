import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

export default function Login() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  async function handleGoogle() {
    setError(null);
    setGoogleBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      // On success the browser navigates away to Google, then back — no
      // further code runs here; App.jsx's onAuthStateChange picks up the
      // new session once the redirect completes.
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setGoogleBusy(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setCheckEmail(true);
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="app">
        <main className="app-main">
          <section>
            <h2 className="section-title">Check your email</h2>
            <p className="section-sub">
              We sent a confirmation link to {email}. Click it, then come back and sign in.
            </p>
            <div className="reset-row">
              <button
                className="reroll-btn"
                onClick={() => {
                  setCheckEmail(false);
                  setMode("signin");
                }}
              >
                Back to sign in
              </button>
            </div>
          </section>
        </main>
      </div>
    );
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
        <section>
          <h2 className="section-title">{mode === "signin" ? "Sign in" : "Create account"}</h2>
          <p className="section-sub">
            {mode === "signin"
              ? "Sign in to sync your streak and history across devices."
              : "One account, synced between desktop and your phone."}
          </p>

          {error && <p className="state-message error">{error}</p>}

          <div className="reset-row" style={{ justifyContent: "center", marginBottom: 20 }}>
            <button className="reroll-btn" onClick={handleGoogle} disabled={googleBusy} type="button">
              {googleBusy ? "Redirecting…" : "Continue with Google"}
            </button>
          </div>

          <p
            className="section-sub"
            style={{ textAlign: "center", margin: "0 0 20px", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.08em" }}
          >
            or {mode === "signin" ? "sign in" : "sign up"} with email
          </p>

          <form onSubmit={handleSubmit}>
            <div className="deepen-picker" style={{ marginBottom: 20 }}>
              <div className="rec-block-label">Email</div>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="rec-block-label" style={{ marginTop: 14 }}>
                Password
              </div>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="reset-row">
              <button className="mark-btn" type="submit" disabled={busy}>
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </div>
          </form>

          <p className="section-sub" style={{ marginTop: 24, textAlign: "center" }}>
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              className="reroll-btn"
              style={{ display: "inline", padding: "4px 10px" }}
              onClick={() => {
                setError(null);
                setMode(mode === "signin" ? "signup" : "signin");
              }}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}