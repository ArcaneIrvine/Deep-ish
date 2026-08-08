import { useEffect, useState } from "react";
import { api } from "../api.js";
import { supabase } from "../lib/supabaseClient.js";

export default function AccountTab({ session }) {
  const [usage, setUsage] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMessage, setPwMessage] = useState(null);
  const [pwError, setPwError] = useState(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [resetError, setResetError] = useState(null);

  useEffect(() => {
    api.getUsage().then(setUsage).catch(() => {});
  }, []);

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwMessage(null);
    setPwError(null);

    if (newPassword.length < 6) {
      setPwError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords don't match.");
      return;
    }

    setPwBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwMessage("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(err.message || "Something went wrong.");
    } finally {
      setPwBusy(false);
    }
  }

  async function handleReset() {
    setResetBusy(true);
    setResetError(null);
    try {
      await api.resetData();
      setConfirmingReset(false);
      setResetDone(true);
      setTimeout(() => setResetDone(false), 3000);
    } catch (err) {
      setResetError(err.message || "Couldn't reset your data.");
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <section>
      <div className="deepen-picker" style={{ marginBottom: 20 }}>
        <div className="rec-block-label">Signed in as</div>
        <p className="section-sub" style={{ marginTop: 6, marginBottom: 0 }}>
          {session.user.email}
        </p>
      </div>

      {usage && (
        <div className="deepen-picker" style={{ marginBottom: 20 }}>
          <div className="rec-block-label">AI usage today</div>
          <p className="section-sub" style={{ marginTop: 6, marginBottom: 0 }}>
            {usage.count} of {usage.limit} requests used
          </p>
        </div>
      )}

      <h3 className="section-title" style={{ marginTop: 8 }}>
        Change password
      </h3>
      {pwError && <p className="state-message error">{pwError}</p>}
      {pwMessage && <p className="state-message">{pwMessage}</p>}
      <form onSubmit={handleChangePassword}>
        <div className="deepen-picker" style={{ marginBottom: 20 }}>
          <div className="rec-block-label">New password</div>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <div className="rec-block-label" style={{ marginTop: 14 }}>
            Confirm new password
          </div>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <div className="reset-row">
          <button className="mark-btn" type="submit" disabled={pwBusy}>
            {pwBusy ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>

      <h3 className="section-title" style={{ marginTop: 36 }}>
        Sign out
      </h3>
      <div className="reset-row">
        <button className="reroll-btn" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>

      <h3 className="section-title" style={{ marginTop: 36 }}>
        Delete my data
      </h3>
      <p className="section-sub" style={{ marginTop: 6, marginBottom: 10 }}>
        Erases your streak and learning history. Can't be undone.
      </p>
      {resetError && <p className="state-message error">{resetError}</p>}
      {!confirmingReset ? (
        <div className="reset-row">
          <button className="reroll-btn" onClick={() => setConfirmingReset(true)}>
            {resetDone ? "Data reset ✓" : "Reset all data"}
          </button>
        </div>
      ) : (
        <div className="reset-row" style={{ justifyContent: "flex-start", gap: 10 }}>
          <button className="mark-btn" onClick={handleReset} disabled={resetBusy}>
            {resetBusy ? "Erasing…" : "Yes, erase everything"}
          </button>
          <button className="reroll-btn" onClick={() => setConfirmingReset(false)}>
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}