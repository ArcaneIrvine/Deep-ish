import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.warn(
    "[deep-ish] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set in server/.env — " +
      "auth and data storage will fail until they're configured."
  );
}

// Service role key bypasses Row Level Security — that's intentional here:
// this client only ever runs on the server, and every query below is
// manually scoped with `.eq("user_id", userId)` using a userId that came
// from a verified Supabase auth token (see the `requireAuth` middleware in
// index.js), so user isolation is still enforced, just by our own code
// instead of Postgres RLS.
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});

// Separate client using the public anon key, used only to verify a bearer
// token handed to us by the browser (auth.getUser reads the token itself —
// it doesn't need the service role key, and using the anon key here keeps
// this call's blast radius limited to "check who this token belongs to").
const anonKey = process.env.SUPABASE_ANON_KEY;
export const supabaseAuth = createClient(url, anonKey || serviceRoleKey, {
  auth: { persistSession: false },
});
