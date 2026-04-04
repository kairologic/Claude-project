#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Push payer directory feature to GitHub
# Run from Git Bash: bash push-to-github.sh
# ═══════════════════════════════════════════════════════════════

set -e

REPO_URL="https://github.com/kairologic/Claude-project.git"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMP_DIR=$(mktemp -d)

echo "🔄 Cloning repo to temp directory..."
git clone "$REPO_URL" "$TEMP_DIR/repo" --depth 1
cd "$TEMP_DIR/repo"

echo "📁 Copying new/modified files..."

# New files
mkdir -p app/practice/\[id\]/payer-directory
cp "$SCRIPT_DIR/app/practice/[id]/payer-directory/page.tsx" "app/practice/[id]/payer-directory/page.tsx"

cp "$SCRIPT_DIR/components/dashboard/PayerDirectoryView.tsx" components/dashboard/PayerDirectoryView.tsx

cp "$SCRIPT_DIR/migrations/create-payer-directory-tables.sql" migrations/create-payer-directory-tables.sql
cp "$SCRIPT_DIR/migrations/seed-payer-directory-demo.sql" migrations/seed-payer-directory-demo.sql
cp "$SCRIPT_DIR/migrations/migration-restructure-workflow-tasks.sql" migrations/migration-restructure-workflow-tasks.sql

# Modified files
cp "$SCRIPT_DIR/components/dashboard/Sidebar.tsx" components/dashboard/Sidebar.tsx
cp "$SCRIPT_DIR/components/dashboard/DashboardHome.tsx" components/dashboard/DashboardHome.tsx

# Updated trigger-workflows
cp "$SCRIPT_DIR/scripts/trigger-workflows.ts" scripts/trigger-workflows.ts

echo "📝 Staging and committing..."
git add -A
git status

git commit -m "Add Payer Directory grid view (#44) + workflow task restructure

- New route: /practice/[id]/payer-directory
- New component: PayerDirectoryView.tsx (provider x payer grid)
- Sidebar: added Payer directories nav item
- Dashboard home: View details link on Payer sync panel
- Migration: create-payer-directory-tables.sql
- Migration: seed-payer-directory-demo.sql
- Migration: migration-restructure-workflow-tasks.sql
- Updated trigger-workflows.ts for 4-task structure

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

echo "🚀 Pushing to GitHub..."
git push origin main

echo "✅ Done! Vercel should auto-deploy."

# Cleanup
cd /
rm -rf "$TEMP_DIR"
