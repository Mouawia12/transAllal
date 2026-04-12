#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FAILURES=0

pull_repo() {
  local repo_path="$1"
  local label="$2"

  echo
  echo "============================================================"
  echo "PULLING: $label"
  echo "PATH: $repo_path"
  echo "============================================================"

  if ! git -C "$repo_path" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Skipping: not a git repository."
    FAILURES=1
    return
  fi

  if ! git -C "$repo_path" remote get-url origin >/dev/null 2>&1; then
    echo "Skipping: remote 'origin' is not configured."
    FAILURES=1
    return
  fi

  if git -C "$repo_path" pull origin main; then
    echo "Pull successful."
  else
    echo "Pull failed."
    FAILURES=1
  fi
}

pull_repo "$ROOT_DIR" "root workspace"
pull_repo "$ROOT_DIR/backend-trans-allal" "backend-trans-allal"
pull_repo "$ROOT_DIR/dashboard-trans-allal" "dashboard-trans-allal"
pull_repo "$ROOT_DIR/app-trans-allal" "app-trans-allal"

echo
if [ "$FAILURES" -eq 0 ]; then
  echo "All repositories processed successfully."
else
  echo "Completed with one or more failures."
fi

exit "$FAILURES"
