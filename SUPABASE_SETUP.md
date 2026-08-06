# Supabase setup (do this once)

Both the desktop app (`client/` + `server/`) and the Android app
(`android-app/`) now share one Supabase project for accounts and synced
data — sign in on either, see the same streak and history on both.

## 1. Create a project

https://supabase.com/dashboard → New project (free tier is plenty for
personal use). Pick any name/region/password (the DB password isn't
something you'll need again day-to-day).

## 2. Create the tables

Dashboard → **SQL Editor** → New query → paste the contents of
`supabase/schema.sql` (in this repo) → **Run**.

This creates two tables (`history`, `daily_entries`) with Row Level
Security policies so each account only ever sees its own rows.

## 3. Confirm email sign-up is enabled

Dashboard → **Authentication → Providers → Email** — on by default, nothing
to change unless you want to require email confirmation before first
sign-in (Authentication → Settings). Either is fine; the apps handle both.

## 4. Get your keys

Dashboard → **Settings → API**. You need three values total, split across
the two apps:

| Value | Where it goes | Secret? |
|---|---|---|
| Project URL | `client/.env`, `server/.env`, `android-app/.env` | No |
| `anon` / `public` key | `client/.env`, `android-app/.env` | No (safe to ship — enforcement is via RLS) |
| `service_role` key | `server/.env` **only** | **Yes — never put this in a client `.env`** |

### `client/.env` (copy from `client/.env.example`)
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### `android-app/.env` (copy from `android-app/.env.example`, keep the Gemini lines too)
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### `server/.env` (add to the existing file)
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # the OTHER key — service_role, not anon
SUPABASE_ANON_KEY=eyJ...
```

## 5. Rebuild/restart both apps

- Desktop: relaunch via `Deep-ish.sh`/`.bat`/`.command`, or `npm start`.
- Android: `npm run build && npx cap sync android`, then Run again from
  Android Studio.

## Using it

First launch of either app now shows a sign-in/create-account screen
(email + password). Create an account on one device, sign in with the same
email/password on the other — same streak, same history, kept in sync via
the shared database.
