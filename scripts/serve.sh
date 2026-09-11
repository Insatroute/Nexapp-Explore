#!/usr/bin/env bash
#
# Serve the built site (out/) the way it is actually deployed.
#
# `npm run dev` ships ~9 MB of unminified JS per page and the browser spins while
# parsing it. This serves the production bundle instead — ~1.5 MB, and it is the
# exact output that gets published.
#
# out/ must be mounted AT /kb, not at /: every asset URL is emitted under /kb
# (see basePath in next.config.mjs), so serving out/ at the root 404s on all of
# them. Hence the symlink.
#
#   npm run serve              # port 3003
#   KB_PORT=4000 npm run serve # somewhere else
set -euo pipefail

PORT="${KB_PORT:-3003}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

if [[ ! -d out ]]; then
  echo "out/ does not exist yet — build it first:" >&2
  echo "    npm run build" >&2
  exit 1
fi

mkdir -p .serve
ln -sfn ../out .serve/kb

# Already serving? Say so instead of dying with a Python traceback that buries
# the one useful fact: it is already up, and the URL still works.
if command -v ss >/dev/null && ss -ltn "( sport = :$PORT )" 2>/dev/null | grep -q ":$PORT"; then
  PID="$(ss -ltnp "( sport = :$PORT )" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1 || true)"
  echo
  echo "  Already serving on port $PORT${PID:+ (PID $PID)}."
  echo "  Open http://localhost:$PORT/kb/"
  echo
  echo "  To restart it:   kill ${PID:-<pid>} && npm run serve"
  echo "  Or use another:  KB_PORT=4000 npm run serve"
  echo
  exit 0
fi

echo
echo "  Serving out/ at http://localhost:$PORT/kb/"
echo "  Ctrl+C to stop."
echo
exec python3 -m http.server "$PORT" --directory .serve
