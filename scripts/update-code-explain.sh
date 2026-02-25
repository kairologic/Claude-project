#!/usr/bin/env bash
# scripts/update-code-explain.sh
# ─────────────────────────────────────────────────────────────────
# Validates that CODE_EXPLAIN.md is up-to-date with the current
# HEAD commit. Refreshes the "Doc Sync" section with the current
# commit hash and UTC timestamp.
#
# Exit codes:
#   0 — CODE_EXPLAIN.md is up-to-date (or was refreshed with --fix)
#   1 — CODE_EXPLAIN.md is stale (Doc Sync commit hash does not match HEAD)
#   2 — CODE_EXPLAIN.md is missing
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
DOC_FILE="$REPO_ROOT/CODE_EXPLAIN.md"
FIX_MODE=false

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --fix)
      FIX_MODE=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--fix]"
      echo ""
      echo "  --fix    Auto-update the Doc Sync section with current commit hash/date"
      echo "  (no flag) Check only — exit 1 if stale"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# 1. Check file exists
if [[ ! -f "$DOC_FILE" ]]; then
  echo "ERROR: CODE_EXPLAIN.md not found at $DOC_FILE" >&2
  echo "Run the documentation generator to create it." >&2
  exit 2
fi

# 2. Get current HEAD
HEAD_HASH="$(git rev-parse HEAD)"
HEAD_SHORT="$(git rev-parse --short HEAD)"
UTC_NOW="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

# 3. Extract the commit hash from Doc Sync section
DOC_HASH="$(grep -oP 'Generated from commit \K`[a-f0-9]+`' "$DOC_FILE" 2>/dev/null | tr -d '`' || echo "")"

if [[ -z "$DOC_HASH" ]]; then
  echo "WARNING: No Doc Sync commit hash found in CODE_EXPLAIN.md"
  DOC_HASH="(none)"
fi

# 4. Compare
if [[ "$DOC_HASH" == "$HEAD_HASH" ]]; then
  echo "OK: CODE_EXPLAIN.md is up-to-date (commit $HEAD_SHORT)"
  exit 0
fi

echo "STALE: CODE_EXPLAIN.md references commit ${DOC_HASH:0:12}... but HEAD is $HEAD_SHORT"

# 5. Fix mode — update the Doc Sync line
if $FIX_MODE; then
  # Replace the Doc Sync line with current values
  sed -i "s|Generated from commit \`[a-f0-9]*\` on [0-9T:ZU\-]*|Generated from commit \`$HEAD_HASH\` on ${UTC_NOW} UTC|" "$DOC_FILE"

  echo "FIXED: Updated Doc Sync to commit $HEAD_SHORT at $UTC_NOW"
  exit 0
fi

echo ""
echo "To fix, run:"
echo "  bash scripts/update-code-explain.sh --fix"
echo ""
echo "Or update CODE_EXPLAIN.md manually to reflect the latest changes."
exit 1
