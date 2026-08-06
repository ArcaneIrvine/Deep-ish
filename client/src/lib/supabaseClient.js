import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "[deep-ish] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set in client/.env — sign-in won't work."
  );
}

// This is only used for authentication (sign in/up, session, sign out) —
// actual data reads/writes go through the Express API (see api.js), which
// verifies the session token server-side before touching Supabase itself.
export const supabase = createClient(url, anonKey);
