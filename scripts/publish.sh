#!/usr/bin/env bash
#
# Build both handbooks and publish them.
#
# The bundle in out/ now holds TWO handbooks — SDWAN Lite at /docs and the Nexapp
# Controller at /controller — served together under /kb.
#
# Usage:
#   KB_HOST=user@host scripts/publish.sh --dry-run   # show what would transfer
#   KB_HOST=user@host scripts/publish.sh             # publish
#   scripts/publish.sh --local                       # build only, no transfer
set -euo pipefail

# NO DEFAULT HOST, deliberately.
#
# This used to default to the SDWAN Lite box. That was safe when the bundle was
# only SDWAN Lite; it stopped being safe the moment the controller handbook
# joined it. `rsync --delete` with a default target means one careless
# `npm run publish` replaces a live handbook with whatever happens to be in out/
# — and today SDWAN Lite's half is three placeholder pages, so the accident
# would be silent and total. An explicit target is cheap; that mistake is not.
HOST="${KB_HOST:-}"
REMOTE_DIR="${KB_REMOTE_DIR:-~/kb}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

DRY=""
LOCAL_ONLY=0
ALLOW_PARTIAL=0
for arg in "$@"; do
  case "$arg" in
    --dry-run)       DRY="--dry-run" ;;
    --local)         LOCAL_ONLY=1 ;;
    --allow-partial) ALLOW_PARTIAL=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

say() { printf '\n=== %s ===\n' "$1"; }

say "1/3 build"
# `build` regenerates both handbooks, checks every internal link and exports.
# A handbook whose inputs are missing is skipped rather than failing the build,
# which is exactly why step 2 exists.
npm run --silent build

say "2/3 what is in the bundle"
DOCS=$(find out/docs -name index.html 2>/dev/null | wc -l | tr -d ' ')
CTRL=$(find out/controller -name index.html 2>/dev/null | wc -l | tr -d ' ')
TOTAL=$(find out -name index.html | wc -l | tr -d ' ')
printf '  SDWAN Lite  /docs        %4s pages\n' "$DOCS"
printf '  Controller  /controller  %4s pages\n' "$CTRL"
printf '  total                    %4s pages (%s)\n' "$TOTAL" "$(du -sh out | cut -f1)"

# A handbook that generated almost nothing means its source was not available,
# not that it shrank. Publishing that over a live one with --delete destroys it.
THIN=""
[[ "$DOCS" -lt 5 ]] && THIN="SDWAN Lite (/docs)"
[[ "$CTRL" -lt 5 ]] && THIN="${THIN:+$THIN and }Nexapp Controller (/controller)"
if [[ -n "$THIN" && "$ALLOW_PARTIAL" != "1" ]]; then
  echo
  echo "  REFUSING TO PUBLISH: $THIN generated almost nothing." >&2
  echo "  Its source repo is probably missing, so the build skipped it — publishing" >&2
  echo "  now would replace a live handbook with placeholders." >&2
  echo >&2
  echo "  Fix the inputs, or pass --allow-partial if this is really what you want." >&2
  exit 1
fi

if [[ "$LOCAL_ONLY" == "1" ]]; then
  say "done (local only — nothing transferred)"
  exit 0
fi

if [[ -z "$HOST" ]]; then
  echo
  echo "  KB_HOST is not set, so there is nowhere to publish to." >&2
  echo "      KB_HOST=user@host scripts/publish.sh --dry-run" >&2
  echo "  Use --local to build without transferring." >&2
  exit 2
fi

say "3/3 publish to ${HOST}:${REMOTE_DIR}"
# --delete so a page removed from the console disappears from the published site
# too; a stale page is worse than a missing one, because it still reads as current.
# Trailing slash on the source copies the CONTENTS of out/, not the directory.
rsync -az --delete ${DRY:+$DRY} --info=stats1 out/ "${HOST}:${REMOTE_DIR}/"

if [[ -n "$DRY" ]]; then
  say "dry run — nothing was written"
else
  say "published"
  echo "nginx reads the directory per request — no restart needed."
fi
