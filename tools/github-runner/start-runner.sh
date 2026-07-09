#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=tools/github-runner/common.sh
. "${SCRIPT_DIR}/common.sh"

ensure_runner_user_safe
run_root test -x "${USF_RUNNER_DIR}/svc.sh" || fail "runner service helper missing at ${USF_RUNNER_DIR}/svc.sh"

if ! systemctl list-unit-files 'actions.runner.*' --no-legend 2>/dev/null | grep -Fq "$USF_RUNNER_NAME"; then
  run_root bash -c 'cd "$1" && ./svc.sh install "$2"' bash "$USF_RUNNER_DIR" "$USF_RUNNER_USER"
fi

run_root bash -c 'cd "$1" && ./svc.sh start' bash "$USF_RUNNER_DIR"
run_root bash -c 'cd "$1" && ./svc.sh status' bash "$USF_RUNNER_DIR" || true
printf '{"started":true,"runnerName":"%s","serviceManagedBy":"systemd"}\n' "$USF_RUNNER_NAME"
