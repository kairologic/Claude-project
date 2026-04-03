#!/usr/bin/env python3
"""
KairoLogic AI Evaluator Node
=============================
Principal Software Architect review gate for pull requests.
Sends the git diff to Claude with a strict system prompt,
parses the structured response, and exits non-zero on FAIL to block merge.

Usage:
    python scripts/evaluator_node.py <diff_file> [--context-files FILE...]
    python scripts/evaluator_node.py diff.txt --context-files DESIGN_PRINCIPLES.md API_ROUTES_INDEX.md

Environment:
    ANTHROPIC_API_KEY  - Required. Claude API key.
    EVALUATOR_MODEL    - Optional. Default: claude-sonnet-4-20250514

Exit codes:
    0  - PASS (all checks passed)
    1  - FAIL (issues found that block merge)
    2  - ERROR (script or API failure)
"""

import json
import os
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MODEL = os.environ.get("EVALUATOR_MODEL", "claude-sonnet-4-20250514")
MAX_DIFF_CHARS = 80_000  # Truncate very large diffs to stay within context
MAX_CONTEXT_CHARS = 30_000

SYSTEM_PROMPT = """### ROLE
You are a Principal Software Architect and Security Auditor for KairoLogic, a healthcare provider compliance platform built with Next.js 14, Supabase, and TypeScript. Your sole purpose is to critically evaluate code changes submitted via pull request. You do not write new features; you identify flaws, architectural regressions, and logic errors.

### CODEBASE CONTEXT
- Framework: Next.js 14 App Router + React 18 + TypeScript 5
- Database: Supabase PostgreSQL with Row Level Security
- Testing: Playwright E2E + regression smoke tests (pipeline wiring + baseline assertions)
- Scan pipeline: crawl -> extract -> match -> delta detection -> workflow triggers
- Payer sync: two-phase (Phase 1: read snapshots, Phase 2: refresh FHIR/scrape)
- Delta engine: three-source comparison (web scan, state board, NPPES) with confidence scoring
- Workflow system: five types (nppes_update, payer_directory, license_renewal, compliance, onboarding)
- Payer aliases: PAYER_ALIASES maps canonical codes to state variants (bcbs -> bcbs_tx, etc.)

### EVALUATION CRITERIA

1. **ARCHITECTURAL ADHERENCE**
   - Does the change violate established patterns (two-phase sync, DB-fallback triggers, three-source delta)?
   - Are new API routes following the existing pattern in app/api/?
   - Are dashboard queries using safeQuery() with proper error handling?
   - Is the payer alias / expandedAcceptedPayers pattern respected?

2. **LOGIC & EDGE CASES**
   - Off-by-one errors, unhandled nulls, race conditions
   - Missing error boundaries in async operations
   - SQL injection via string interpolation (must use parameterized queries)
   - Supabase queries missing .eq() or .in() filters that could return full tables

3. **HEALTHCARE COMPLIANCE**
   - PHI/PII exposure in logs, URLs, or error messages
   - Missing audit trail entries for data modifications
   - Verification status bypasses (all findings must have verification_status)

4. **EFFICIENCY**
   - N+1 query patterns (looping DB calls instead of batch)
   - O(n^2) where O(n) is possible
   - Missing indexes implied by new query patterns

5. **OVER-ENGINEERING**
   - Unnecessary abstractions or speculative code not requested
   - Dead code additions

6. **TEST COVERAGE**
   - If source files in lib/ or app/ changed, were corresponding tests updated?
   - If a new pipeline connection was added, was pipeline-wiring.test.ts updated?
   - If new DB columns are used, was seed-sentinel.sql updated?

7. **DOCUMENTATION**
   - If a new feature was added, was the Feature Code Documentation updated?

### OUTPUT FORMAT
You MUST respond in EXACTLY this structured format (the automated workflow parses it):

```
STATUS: [PASS|FAIL]
SEVERITY: [NONE|LOW|MEDIUM|HIGH|BLOCKER]
SUMMARY: <one-line summary>

ISSUES:
- [SEVERITY] <file>:<line> - <description>
- [SEVERITY] <file>:<line> - <description>

TEST_COVERAGE: [ADEQUATE|NEEDS_UPDATE]
DOC_COVERAGE: [ADEQUATE|NEEDS_UPDATE]

REMEDIATION:
- <specific fix instruction>
- <specific fix instruction>
```

If STATUS is PASS, ISSUES and REMEDIATION may be empty.

### CONSTRAINTS
- Be pedantic. If the code works but is inconsistent with codebase style, return FAIL with LOW severity.
- Trace how changes affect distant modules (e.g., changing a type in trigger-workflows.ts affects scan-scheduler.ts).
- NEVER return PASS if you find a BLOCKER or HIGH severity issue.
- For MEDIUM issues, return FAIL but note it can be addressed in a follow-up.
- For LOW issues only, return PASS with advisory notes.
"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def truncate(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + f"\n\n... [TRUNCATED at {max_chars} chars, {len(text) - max_chars} chars omitted]"


def load_context_files(file_paths: list[str]) -> str:
    """Load optional context files (design docs, architecture refs)."""
    parts = []
    total = 0
    for fp in file_paths:
        p = Path(fp)
        if not p.exists():
            # Try relative to repo root
            p = Path(__file__).parent.parent / fp
        if p.exists():
            content = p.read_text(encoding="utf-8", errors="replace")
            if total + len(content) > MAX_CONTEXT_CHARS:
                content = truncate(content, MAX_CONTEXT_CHARS - total)
            parts.append(f"### {p.name}\n{content}")
            total += len(content)
            if total >= MAX_CONTEXT_CHARS:
                break
    return "\n\n".join(parts)


def parse_response(text: str) -> dict:
    """Parse the structured response from the evaluator."""
    result = {
        "status": "ERROR",
        "severity": "BLOCKER",
        "summary": "",
        "issues": [],
        "test_coverage": "NEEDS_UPDATE",
        "doc_coverage": "NEEDS_UPDATE",
        "remediation": [],
        "raw": text,
    }

    # Extract STATUS
    m = re.search(r"STATUS:\s*(PASS|FAIL)", text, re.IGNORECASE)
    if m:
        result["status"] = m.group(1).upper()

    # Extract SEVERITY
    m = re.search(r"SEVERITY:\s*(NONE|LOW|MEDIUM|HIGH|BLOCKER)", text, re.IGNORECASE)
    if m:
        result["severity"] = m.group(1).upper()

    # Extract SUMMARY
    m = re.search(r"SUMMARY:\s*(.+)", text)
    if m:
        result["summary"] = m.group(1).strip()

    # Extract TEST_COVERAGE
    m = re.search(r"TEST_COVERAGE:\s*(ADEQUATE|NEEDS_UPDATE)", text, re.IGNORECASE)
    if m:
        result["test_coverage"] = m.group(1).upper()

    # Extract DOC_COVERAGE
    m = re.search(r"DOC_COVERAGE:\s*(ADEQUATE|NEEDS_UPDATE)", text, re.IGNORECASE)
    if m:
        result["doc_coverage"] = m.group(1).upper()

    # Extract ISSUES (bullet list)
    issues_match = re.search(r"ISSUES:\s*\n((?:- .+\n?)+)", text)
    if issues_match:
        result["issues"] = [
            line.strip("- ").strip()
            for line in issues_match.group(1).strip().split("\n")
            if line.strip().startswith("-")
        ]

    # Extract REMEDIATION (bullet list)
    rem_match = re.search(r"REMEDIATION:\s*\n((?:- .+\n?)+)", text)
    if rem_match:
        result["remediation"] = [
            line.strip("- ").strip()
            for line in rem_match.group(1).strip().split("\n")
            if line.strip().startswith("-")
        ]

    return result


def call_claude(diff_text: str, context_text: str) -> str:
    """Call the Claude API with the diff and context."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable not set")
        sys.exit(2)

    # Use the anthropic SDK if available, otherwise fall back to requests
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        user_message = f"## Code Diff to Review\n\n```diff\n{diff_text}\n```"
        if context_text:
            user_message = f"## Codebase Context\n\n{context_text}\n\n{user_message}"

        response = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text

    except ImportError:
        # Fall back to urllib (no external deps needed)
        import urllib.request
        import urllib.error

        user_message = f"## Code Diff to Review\n\n```diff\n{diff_text}\n```"
        if context_text:
            user_message = f"## Codebase Context\n\n{context_text}\n\n{user_message}"

        payload = json.dumps({
            "model": MODEL,
            "max_tokens": 4096,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_message}],
        })

        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=payload.encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                body = json.loads(resp.read().decode("utf-8"))
                return body["content"][0]["text"]
        except urllib.error.HTTPError as e:
            print(f"ERROR: Claude API returned {e.code}: {e.read().decode()}")
            sys.exit(2)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/evaluator_node.py <diff_file> [--context-files FILE...]")
        sys.exit(2)

    diff_path = Path(sys.argv[1])
    if not diff_path.exists():
        print(f"ERROR: Diff file not found: {diff_path}")
        sys.exit(2)

    diff_text = diff_path.read_text(encoding="utf-8", errors="replace")
    diff_text = truncate(diff_text, MAX_DIFF_CHARS)

    if not diff_text.strip():
        print("No changes detected in diff. Skipping evaluation.")
        print("STATUS: PASS")
        print("SEVERITY: NONE")
        sys.exit(0)

    # Parse optional context files
    context_files = []
    if "--context-files" in sys.argv:
        idx = sys.argv.index("--context-files")
        context_files = sys.argv[idx + 1:]

    context_text = load_context_files(context_files) if context_files else ""

    # Call Claude
    print(f"Evaluating {len(diff_text)} chars of diff with model {MODEL}...")
    raw_response = call_claude(diff_text, context_text)

    # Parse response
    result = parse_response(raw_response)

    # Output
    print("\n" + "=" * 60)
    print("AI EVALUATOR RESULTS")
    print("=" * 60)
    print(f"STATUS: {result['status']}")
    print(f"SEVERITY: {result['severity']}")
    print(f"SUMMARY: {result['summary']}")
    print(f"TEST_COVERAGE: {result['test_coverage']}")
    print(f"DOC_COVERAGE: {result['doc_coverage']}")

    if result["issues"]:
        print("\nISSUES:")
        for issue in result["issues"]:
            print(f"  - {issue}")

    if result["remediation"]:
        print("\nREMEDIATION:")
        for rem in result["remediation"]:
            print(f"  - {rem}")

    print("\n" + "=" * 60)

    # Write result as JSON for downstream consumption
    output_path = Path(os.environ.get("EVALUATOR_OUTPUT", "evaluator-result.json"))
    output_path.write_text(json.dumps(result, indent=2))
    print(f"\nFull result written to {output_path}")

    # Exit code
    if result["status"] == "FAIL":
        print("\n*** MERGE BLOCKED: AI Evaluator found issues ***")
        sys.exit(1)
    elif result["status"] == "PASS":
        print("\n*** MERGE APPROVED: AI Evaluator passed ***")
        sys.exit(0)
    else:
        print("\n*** ERROR: Could not parse evaluator response ***")
        sys.exit(2)


if __name__ == "__main__":
    main()
