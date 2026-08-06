# Deep-ish — Android app

A self-contained Android build of Deep-ish. Same UI as the desktop version
(same `App.css`, same `components/`), same streak/reroll/duplicate-detection
logic. Gemini is called directly from the app (no server on the phone), and
your streak/history sync with the desktop app via a shared Supabase account
— sign in with the same email on both, see the same data on both.

This is a standalone project — nothing here depends on `client/`/`server/`
code, but it does share the same Supabase project/database as the desktop
app, which is the whole point (that's what makes syncing possible).

## Setup

### 1. Supabase (shared account + sync)

One-time, shared with the desktop app — see `../SUPABASE_SETUP.md` at the
repo root. You need the project URL and **anon** key from that guide.

### 2. Gemini + Supabase config

```bash
cd android-app
cp .env.example .env
```

Edit `.env`:

```
VITE_GEMINI_API_KEY=your-gemini-key-here
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Gemini key (free, no credit card): https://aistudio.google.com/apikey

There's no in-app settings screen for these — like the desktop server,
they're a build-time config file. If you change `.env` later, rebuild for
it to take effect (see below).

## ⚠️ Security note — the Gemini key, specifically

Unlike the Supabase anon key (safe to ship — enforcement is via Row Level
Security in the database), the Gemini key gets compiled directly into the
app's JS bundle with no equivalent protection:

- Anyone with the built APK could extract it by unzipping it and reading
  the bundled JavaScript — no rooting or advanced tooling required.
- Fine for a build you install only on your own phone.
- **Do not** publish this APK, share it, or upload it anywhere public with
  your real Gemini key baked in.

## Prerequisites (on your own machine, not this sandbox)

- [Node.js](https://nodejs.org) 18+
- [Android Studio](https://developer.android.com/studio) (installs the
  Android SDK and an emulator for you)
- A Java JDK — Android Studio bundles one; you don't need a separate install

## One-time setup

```bash
cd android-app
npm install
npx cap add android
```

`npx cap add android` generates a native `android/` project folder here
(large, gitignored — don't hand-edit it directly except where the Capacitor
docs specifically say to).

## Build & run

```bash
npm run build          # builds the React app into dist/, embedding .env
npx cap sync android    # copies dist/ + Capacitor plugins into android/
npx cap open android    # opens the project in Android Studio
```

In Android Studio: pick a device/emulator and hit **Run**. First launch
shows a sign-in/create-account screen — use the same email/password you'll
use (or already used) on the desktop app to share the same data.

Any time you change the React code or `.env`, re-run:

```bash
npm run build && npx cap sync android
```

then Run again from Android Studio (or `npx cap run android` to do
build+sync+run in one step).

## Getting an installable APK without Android Studio's UI

If you just want a debug APK to sideload onto your phone:

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

The APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`. Copy
it to your phone (e.g. via `adb install app-debug.apk`, email, or a cloud
drive) and install it — you'll need to allow "install from unknown sources"
for whichever app you use to open it, since it isn't from the Play Store.
(Remember the security note above — this APK will have your Gemini key
inside it.)

For a **release** build (smaller, optimized, but needs to be signed), use
Android Studio's *Build → Generate Signed Bundle / APK* — it'll walk you
through creating a signing key the first time.

## Resetting your data

Your history/streak now live in Supabase, shared with the desktop app —
clearing this app's local storage won't touch it. To actually reset: delete
the rows in the Supabase dashboard (Table Editor → `history` /
`daily_entries` → filter by your user, delete), or sign out and create a
second account if you want a clean slate to experiment with.

## Troubleshooting

**"No Gemini API key set"** — copy `.env.example` to `.env`, paste in your
Gemini key, then `npm run build && npx cap sync android` and rebuild/reinstall.

**Stuck on the sign-in screen / "Not signed in"** — check
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` — see
`../SUPABASE_SETUP.md`.

**"Gemini's free-tier rate limit was hit"** — the free tier has per-minute
and per-day request caps. Wait a bit, or try again the next day if it's the
daily quota.

**"model isn't available" / a 404 mentioning "no longer available to new
users"** — Google retires and restricts Gemini model versions fairly often.
Check https://ai.google.dev/gemini-api/docs/models for a current model
name, set `VITE_GEMINI_MODEL` in `.env`, and rebuild.

## Notes

- The app needs internet access on the phone (same as the desktop version)
  — to reach Gemini, and now to reach Supabase for your data too. There's
  no offline mode.
- To change the app icon/splash screen from Capacitor's defaults, look into
  [`@capacitor/assets`](https://capacitorjs.com/docs/guides/splash-screens-and-icons) —
  not set up here, purely cosmetic.
