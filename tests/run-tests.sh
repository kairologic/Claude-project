#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# KairoLogic Dashboard — Test Suite Runner
#
# Usage:
#   ./tests/run-tests.sh              # Full suite (API + E2E)
#   ./tests/run-tests.sh api          # API tests only (no browser)
#   ./tests/run-tests.sh e2e          # E2E browser tests only
#   ./tests/run-tests.sh grep UC-WF1  # Specific use case category
#   ./tests/run-tests.sh smoke        # Quick smoke test (cross-browser)
#   ./tests/run-tests.sh mobile       # Mobile responsive tests
#
# Environment:
#   TEST_BASE_URL=https://kairologic.net  (default: http://localhost:3000)
#
# See tests/USE_CASES_AND_TEST_PLAN.md for the full use case catalog.
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
GOLD='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   KairoLogic Dashboard — Test Suite Runner   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Base URL: ${GOLD}${TEST_BASE_URL:-http://localhost:3000}${NC}"
echo -e "Date:     $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Ensure results directory exists
mkdir -p tests/results

# Parse arguments
MODE="${1:-all}"
EXTRA="${2:-}"

case "$MODE" in
  api)
    echo -e "${GREEN}Running API tests (no browser needed)...${NC}"
    npx playwright test --project=api
    ;;
  e2e)
    echo -e "${GREEN}Running E2E browser tests...${NC}"
    npx playwright test --project=chromium
    ;;
  grep)
    if [ -z "$EXTRA" ]; then
      echo -e "${RED}Usage: ./run-tests.sh grep UC-WF1${NC}"
      exit 1
    fi
    echo -e "${GREEN}Running tests matching: ${GOLD}${EXTRA}${NC}"
    npx playwright test --grep "$EXTRA"
    ;;
  smoke)
    echo -e "${GREEN}Running cross-browser smoke tests...${NC}"
    npx playwright test --project=chromium --project=firefox --project=safari \
      tests/e2e/cross-browser.e2e.spec.ts
    ;;
  mobile)
    echo -e "${GREEN}Running mobile responsive tests...${NC}"
    npx playwright test --project=mobile
    ;;
  all)
    echo -e "${GREEN}Running full test suite (API + E2E)...${NC}"
    echo ""

    echo -e "${BLUE}── Phase 1: API Tests ──${NC}"
    npx playwright test --project=api || API_FAIL=1

    echo ""
    echo -e "${BLUE}── Phase 2: E2E Browser Tests ──${NC}"
    npx playwright test --project=chromium || E2E_FAIL=1

    echo ""
    echo -e "${BLUE}── Results ──${NC}"
    if [ "${API_FAIL:-0}" = "1" ] || [ "${E2E_FAIL:-0}" = "1" ]; then
      echo -e "${RED}Some tests failed. See tests/results/test-results.json for details.${NC}"
      exit 1
    else
      echo -e "${GREEN}All tests passed!${NC}"
    fi
    ;;
  report)
    echo -e "${GREEN}Opening HTML test report...${NC}"
    npx playwright show-report
    ;;
  *)
    echo -e "${RED}Unknown mode: $MODE${NC}"
    echo ""
    echo "Usage:"
    echo "  ./tests/run-tests.sh              # Full suite"
    echo "  ./tests/run-tests.sh api          # API tests only"
    echo "  ./tests/run-tests.sh e2e          # E2E browser tests"
    echo "  ./tests/run-tests.sh grep UC-WF1  # Filter by use case"
    echo "  ./tests/run-tests.sh smoke        # Cross-browser smoke"
    echo "  ./tests/run-tests.sh mobile       # Mobile responsive"
    echo "  ./tests/run-tests.sh report       # View HTML report"
    exit 1
    ;;
esac

echo ""
echo -e "${BLUE}Results saved to: tests/results/test-results.json${NC}"
echo -e "${BLUE}HTML report:      npx playwright show-report${NC}"
