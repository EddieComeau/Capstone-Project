#!/usr/bin/env bash
set -euo pipefail

BRANCH="full-updated-project"
COMMIT_MSG="Full project update: syncs, derived metrics, EPA trainer, notifications, admin UI, exports"
REPO_OWNER="EddieComeau"
REPO_NAME="Capstone-Project"
PR_TITLE="Full project update"
read -r -d '' PR_BODY <<'EOF' || true
Full project update — includes the following major changes:

Backend (server/)
- Added persistent cursor support (SyncState) to resume long syncs.
- Implemented EPAModel and trainer (epaTrainer): nightly training of binned EP lookup.
- Enhanced epaService to compute EPA per-play using richer features and trained model.
- Implemented notificationService that posts webhooks and evaluates alerts.
- Added Alert and Webhook models and controllers for webhook/alert management.
- Added export endpoint: GET /api/export/team-metrics/:season?format=csv|json
- Added SyncState API: GET /api/syncstate, POST /api/syncstate/reset

Frontend (frontend/)
- Public client: frontend/
- Admin client: frontend/admin/ — admin UI for SyncState/Webhooks/Alerts served at /admin

How to test:
1. server: cd server && npm install && npm run dev
2. public client: cd frontend && npm install && REACT_APP_API_BASE=http://localhost:4000 npm start
3. admin client: cd frontend/admin && npm install && REACT_APP_API_BASE=http://localhost:4000 npm start
EOF

# make sure on main and up-to-date
git checkout main
git pull origin main

# create or checkout branch
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH"
fi

# stage and commit
git add -A
if git diff --cached --quiet; then
  echo "No staged changes to commit. Continuing."
else
  git commit -m "$COMMIT_MSG"
fi

# push branch
git push -u origin "$BRANCH"

# create PR (prefer gh if available)
if command -v gh >/dev/null 2>&1; then
  echo "Creating PR using gh..."
  gh pr create --title "$PR_TITLE" --body "$PR_BODY" --base main --head "$BRANCH" --web || true
  echo "PR command issued (check browser or run 'gh pr view --web')."
else
  if [ -z "${GITHUB_TOKEN:-}" ]; then
    echo "gh is not installed and GITHUB_TOKEN is not set. PR creation skipped."
    echo ""
    echo "To create PR manually run:"
    echo "  curl -H \"Authorization: token \$GITHUB_TOKEN\" -X POST https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/pulls -d '{\"title\":\"$PR_TITLE\",\"head\":\"$BRANCH\",\"base\":\"main\",\"body\":\"$PR_BODY\"}'"
    exit 0
  fi
  # create PR via curl
  RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" -X POST "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/pulls" -d "$(jq -nc --arg t "$PR_TITLE" --arg h "$BRANCH" --arg b "$PR_BODY" --arg base "main" '{title:$t, head:$h, base:$base, body:$b}')")
  PR_URL=$(echo "$RESPONSE" | jq -r .html_url)
  if [ "$PR_URL" = "null" ] || [ -z "$PR_URL" ]; then
    echo "PR creation failed: $RESPONSE"
    exit 1
  else
    echo "PR created: $PR_URL"
  fi
fi

echo "Done. Branch '$BRANCH' pushed and PR created if possible."
