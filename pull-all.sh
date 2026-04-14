#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo
echo "============================================================"
echo "PULLING: workspace root repository"
echo "PATH: $ROOT_DIR"
echo "============================================================"

if ! git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Pull failed: root directory is not a git repository."
  exit 1
fi

if ! git -C "$ROOT_DIR" remote get-url origin >/dev/null 2>&1; then
  echo "Pull failed: remote 'origin' is not configured."
  exit 1
fi

if git -C "$ROOT_DIR" pull origin main; then
  echo "Pull successful."
else
  echo "Pull failed."
  exit 1
fi
