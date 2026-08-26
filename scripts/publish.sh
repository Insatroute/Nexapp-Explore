#!/usr/bin/env bash
#
# Refresh the knowledge base from the live console and publish it.
#
#   capture  read the rendered console -> nav-manifest.json
#   spec     dump the platform's OpenAPI document
#   generate rebuild every page from those two
#   build    static export + link check (fails on a dead link)
#   publish  rsync to the host, where the frontend container mounts it at /kb
#
# The KB is a VOLUME on the server, not part of the frontend image, so publishing
# is a file sync: no image build, no container restart, no downtime. nginx serves
# whatever is in the directory on the next request.
#
# Run it on a schedule and the KB cannot fall behind the console.
#
# Usage:
#   scripts/publish.sh              # refresh and publish
#   scripts/publish.sh --dry-run    # refresh, show what would transfer
#   scripts/publish.sh --local      # refresh and build only, no transfer
set -euo pipefail

HOST="${KB_HOST:-admin_nexapp@103.164.94.11}"
REMOTE_DIR="${KB_REMOTE_DIR:-~/sdwan-lite/kb}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

DRY=""
LOCAL_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY="--dry-run" ;;
    --local)   LOCAL_ONLY=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

say() { printf '\n=== %s ===\n' "$1"; }

say "1/4 capture the live console"
# Needs the console reachable and KB_USER/KB_PASSWORD (or the script defaults).
npm run --silent capture

say "2/4 dump the OpenAPI spec"
npm run --silent spec

say "3/4 generate + build"
# `build` runs generate, then the link checker, then the static export. A broken
# internal link fails here rather than reaching a reader.
npm run --silent build

PAGES=$(find out -name index.html | wc -l | tr -d ' ')
SIZE=$(du -sh out | cut -f1)
echo "built ${PAGES} pages (${SIZE})"

if [[ "$LOCAL_ONLY" == "1" ]]; then
  say "done (local only — nothing transferred)"
  exit 0
fi

say "4/4 publish to ${HOST}:${REMOTE_DIR}"
# --delete so a page removed from the console disappears from the published site
# too; a stale page is worse than a missing one, because it still reads as current.
# Trailing slash on the source copies the CONTENTS of out/, not the directory.
rsync -az --delete ${DRY:+$DRY} \
  --info=stats1 \
  out/ "${HOST}:${REMOTE_DIR}/"

if [[ -n "$DRY" ]]; then
  say "dry run — nothing was written"
else
  say "published"
  echo "the console serves it at /kb (nginx reads the directory per request —"
  echo "no restart needed)"
fi
