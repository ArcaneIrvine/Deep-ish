#!/usr/bin/env bash
# Run this to launch Deep-ish: ./Deep-ish.sh
cd "$(dirname "$0")"

if [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
  echo "First run — installing dependencies (this only happens once)..."
  npm run setup
fi

npm run build --prefix client

( sleep 3 && xdg-open "http://localhost:5174" >/dev/null 2>&1 ) &

echo ""
echo "Deep-ish is starting at http://localhost:5174"
echo "Keep this window open while you use it. Close it (or Ctrl+C) to stop."
echo ""

npm run dev --prefix server
