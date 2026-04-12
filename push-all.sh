#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMMIT_MESSAGE="${1:-update all repositories}"
FAILURES=0

process_repo() {
  local repo_path="$1"
  local label="$2"

  echo
  echo "============================================================"
  echo "PUSHING: $label"
  echo "PATH: $repo_path"
  echo "============================================================"

  if ! git -C "$repo_path" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Skipping: not a git repository."
    FAILURES=1
    return
  fi

  git -C "$repo_path" add -A

  if git -C "$repo_path" diff --cached --quiet; then
    echo "No changes to commit."
  else
    if git -C "$repo_path" commit -m "$COMMIT_MESSAGE"; then
      echo "Commit created."
    else
      echo "Commit failed."
      FAILURES=1
      return
    fi
  fi

  if ! git -C "$repo_path" remote get-url origin >/dev/null 2>&1; then
    echo "Push failed: remote 'origin' is not configured."
    FAILURES=1
    return
  fi

  local branch
  branch="$(git -C "$repo_path" branch --show-current)"

  if [ -z "$branch" ]; then
    git -C "$repo_path" branch -M main
    branch="main"
  fi

  if git -C "$repo_path" push -u origin "$branch"; then
    echo "Push successful."
  else
    echo "Push failed."
    FAILURES=1
  fi
}

process_repo "$ROOT_DIR" "root workspace"
process_repo "$ROOT_DIR/backend-trans-allal" "backend-trans-allal"
process_repo "$ROOT_DIR/dashboard-trans-allal" "dashboard-trans-allal"
process_repo "$ROOT_DIR/app-trans-allal" "app-trans-allal"

echo
if [ "$FAILURES" -eq 0 ]; then
  echo "All repositories processed successfully."
else
  echo "Completed with one or more failures."
fi

exit "$FAILURES"
