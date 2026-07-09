#!/usr/bin/env bash

set -euo pipefail

USF_RUNNER_REPO="${USF_RUNNER_REPO:-maldous/usf}"
USF_RUNNER_URL="${USF_RUNNER_URL:-https://github.com/maldous/usf}"
USF_RUNNER_USER="${USF_RUNNER_USER:-usf-runner}"
USF_RUNNER_NAME="${USF_RUNNER_NAME:-usf-linux-x64-controller-01}"
USF_RUNNER_VERSION="${USF_RUNNER_VERSION:-2.335.1}"
USF_RUNNER_ROOT="${USF_RUNNER_ROOT:-/opt/usf-github-runner}"
USF_RUNNER_DIR="${USF_RUNNER_DIR:-${USF_RUNNER_ROOT}/actions-runner}"
USF_RUNNER_HOOK_DIR="${USF_RUNNER_HOOK_DIR:-${USF_RUNNER_ROOT}/hooks}"
USF_RUNNER_WORK="${USF_RUNNER_WORK:-/var/lib/usf-github-runner/work}"
USF_RUNNER_CACHE="${USF_RUNNER_CACHE:-/var/cache/usf-github-runner}"
USF_RUNNER_TEMP="${USF_RUNNER_TEMP:-/var/tmp/usf-github-runner}"
USF_RUNNER_LOG="${USF_RUNNER_LOG:-/var/log/usf-github-runner}"
USF_RUNNER_LABELS="${USF_RUNNER_LABELS:-usf,usf-ci,usf-trusted}"
USF_RUNNER_REQUIRED_LABELS="${USF_RUNNER_REQUIRED_LABELS:-self-hosted,linux,x64,usf,usf-ci,usf-trusted}"

fail() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

need_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

run_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    need_command sudo
    sudo -n "$@"
  fi
}

run_as_runner() {
  run_root sudo -u "$USF_RUNNER_USER" -H "$@"
}

repo_root() {
  git rev-parse --show-toplevel 2>/dev/null || pwd
}

json_string() {
  python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$1"
}

iso_now() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

ensure_linux_x64() {
  [ "$(uname -s)" = "Linux" ] || fail "runner host must be Linux"
  [ "$(uname -m)" = "x86_64" ] || fail "runner host must be x86_64"
}

ensure_runner_user_safe() {
  if ! id "$USF_RUNNER_USER" >/dev/null 2>&1; then
    fail "runner user does not exist: $USF_RUNNER_USER"
  fi
  [ "$(id -u "$USF_RUNNER_USER")" != "0" ] || fail "runner user must not be root"
  if id -nG "$USF_RUNNER_USER" | tr ' ' '\n' | grep -Eq '^(sudo|docker)$'; then
    fail "runner user must not belong to sudo or docker groups"
  fi
}

ensure_not_in_repo() {
  case "$1" in
    "$(repo_root)"/*|"$(repo_root)") fail "runner host path must not be inside repository: $1" ;;
  esac
}
