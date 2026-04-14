#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMMIT_MESSAGE="${1:-update workspace repository}"

echo
echo "============================================================"
echo "PUSHING: workspace root repository"
echo "PATH: $ROOT_DIR"
echo "============================================================"

if ! git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Push failed: root directory is not a git repository."
  exit 1
fi

git -C "$ROOT_DIR" add -A

if git -C "$ROOT_DIR" diff --cached --quiet; then
  echo "No changes to commit."
else
  if git -C "$ROOT_DIR" commit -m "$COMMIT_MESSAGE"; then
    echo "Commit created."
  else
    echo "Commit failed."
    exit 1
  fi
fi

if ! git -C "$ROOT_DIR" remote get-url origin >/dev/null 2>&1; then
  echo "Push failed: remote 'origin' is not configured."
  exit 1
fi

BRANCH="$(git -C "$ROOT_DIR" branch --show-current)"

if [ -z "$BRANCH" ]; then
  git -C "$ROOT_DIR" branch -M main
  BRANCH="main"
fi

if git -C "$ROOT_DIR" push -u origin "$BRANCH"; then
  echo "Push successful."
else
  echo "Push failed."
  exit 1
fi
