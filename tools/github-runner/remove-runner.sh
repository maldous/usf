#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=tools/github-runner/common.sh
. "${SCRIPT_DIR}/common.sh"

need_command gh
need_command jq
ensure_runner_user_safe

if run_root test -x "${USF_RUNNER_DIR}/svc.sh"; then
  run_root bash -c 'cd "$1" && ./svc.sh stop' bash "$USF_RUNNER_DIR" || true
  run_root bash -c 'cd "$1" && ./svc.sh uninstall' bash "$USF_RUNNER_DIR" || true
fi

if run_root test -x "${USF_RUNNER_DIR}/config.sh" && run_root test -f "${USF_RUNNER_DIR}/.runner"; then
  token="${USF_RUNNER_REMOVE_TOKEN:-}"
  if [ -z "$token" ]; then
    token_payload="$(gh api -X POST "repos/${USF_RUNNER_REPO}/actions/runners/remove-token")"
    token="$(printf '%s' "$token_payload" | jq -r '.token')"
  fi
  [ -n "$token" ] && [ "$token" != "null" ] || fail "could not obtain runner removal token"
  run_as_runner bash -c 'cd "$1" && ./config.sh remove --token "$2"' bash "$USF_RUNNER_DIR" "$token"
  unset token
fi

printf '{"removed":true,"runnerName":"%s","registrationTokenPersisted":false}\n' "$USF_RUNNER_NAME"
