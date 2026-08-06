import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "[deep-ish] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set in android-app/.env — sign-in won't work."
  );
}

// Unlike the desktop app (which routes data through its Express server),
// there's no server process on the phone — this client talks to Postgres
// directly. Row Level Security (supabase/schema.sql) enforces that a signed
// -in user can only ever read/write their own rows; the anon key is safe to
// ship in the app bundle precisely because RLS does the actual enforcement.
export const supabase = createClient(url, anonKey);
