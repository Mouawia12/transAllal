#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

show_status() {
  local repo_path="$1"
  local label="$2"

  echo
  echo "============================================================"
  echo "STATUS: $label"
  echo "PATH: $repo_path"
  echo "============================================================"

  if ! git -C "$repo_path" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Not a git repository."
    return
  fi

  git -C "$repo_path" status --short --branch
}

show_status "$ROOT_DIR" "root workspace"
show_status "$ROOT_DIR/backend-trans-allal" "backend-trans-allal"
show_status "$ROOT_DIR/dashboard-trans-allal" "dashboard-trans-allal"
show_status "$ROOT_DIR/app-trans-allal" "app-trans-allal"
