# Deep-ish

One AI-generated topic a day, with a streak — plus Surprise Me / Deepen
Knowledge for extra content. Uses Google's free Gemini API — no
local model, no GPU needed, no cost.

## Setup

Get a free API key (no credit card): https://aistudio.google.com/apikey

Copy `server/.env.example` to `server/.env` and paste your key in:

```
GEMINI_API_KEY=your-key-here
```

### Accounts + syncing with the Android app

This app now uses Supabase for accounts, so your streak/history sync
between this desktop app and the Android app in `android-app/`. One-time
setup: see `SUPABASE_SETUP.md`. Until that's done, sign-in won't work.

## Run it

Double-click the launcher for your OS — first run installs dependencies
automatically:

- **Windows:** `Deep-ish.bat`
- **macOS:** `Deep-ish.command`
- **Linux:** `Deep-ish.sh`

Opens `http://localhost:5174` automatically. Keep the console window open;
closing it stops the app.

Command line instead:

```bash
npm run setup   # once
npm start       # every time after that
```

## Troubleshooting

**"No GEMINI_API_KEY set"** — copy `server/.env.example` to `server/.env`
and paste in a key from https://aistudio.google.com/apikey.

**"Not signed in" / stuck on the sign-in screen** — Supabase isn't
configured yet, or `client/.env` / `server/.env` have the wrong values. See
`SUPABASE_SETUP.md`.

**"Gemini's free-tier rate limit was hit"** — the free tier has per-minute
and per-day request caps. Wait a bit, or try again the next day if it's the
daily quota. This is a single-user app making a handful of requests a day,
so it's rarely an issue in normal use.

**"model isn't available" / a 404 mentioning "no longer available to new
users"** — Google retires and restricts Gemini model versions fairly often,
sometimes within months of release. Check
https://ai.google.dev/gemini-api/docs/models for a current model name and
set `GEMINI_MODEL` in `server/.env` to it, then restart the app.

## Your data

Stored in Supabase (Postgres) under your account: `history` (everything
you've completed, including embeddings used for duplicate detection) and
`daily_entries` (today's topic + streak state) — see `supabase/schema.sql`.
Synced automatically between this app and the Android app whenever you're
signed in on both.

## Android app

There's also a standalone Android build in `android-app/` — same UI and
features, signed into the same account as this app so your streak and
history stay in sync across both. See `android-app/README.md` for setup.
