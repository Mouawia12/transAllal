#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo
echo "============================================================"
echo "STATUS: workspace root repository"
echo "PATH: $ROOT_DIR"
echo "============================================================"

if ! git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository."
  exit 1
fi

git -C "$ROOT_DIR" status --short --branch
