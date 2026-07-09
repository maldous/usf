#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=tools/github-runner/common.sh
. "${SCRIPT_DIR}/common.sh"

need_command gh
need_command jq
ensure_linux_x64
ensure_runner_user_safe

run_root test -x "${USF_RUNNER_DIR}/config.sh" || fail "runner is not installed at ${USF_RUNNER_DIR}"
run_root test -d "$USF_RUNNER_WORK" || fail "runner work directory missing: ${USF_RUNNER_WORK}"

token="${USF_RUNNER_TOKEN:-}"
expires_at=""
if [ -z "$token" ]; then
  token_payload="$(gh api -X POST "repos/${USF_RUNNER_REPO}/actions/runners/registration-token")"
  token="$(printf '%s' "$token_payload" | jq -r '.token')"
  expires_at="$(printf '%s' "$token_payload" | jq -r '.expires_at')"
fi

[ -n "$token" ] && [ "$token" != "null" ] || fail "could not obtain runner registration token"

config_args=(
  ./config.sh
  --url "$USF_RUNNER_URL"
  --token "$token"
  --name "$USF_RUNNER_NAME"
  --labels "$USF_RUNNER_LABELS"
  --work "$USF_RUNNER_WORK"
  --unattended
  --replace
)

if [ "${USF_RUNNER_EPHEMERAL:-false}" = "true" ]; then
  config_args+=(--ephemeral)
fi

run_as_runner bash -c 'cd "$1" && shift && "$@"' bash "$USF_RUNNER_DIR" "${config_args[@]}"
unset token

printf '{"registered":true,"runnerName":"%s","repository":"%s","labels":"%s","registrationTokenPersisted":false,"registrationTokenExpiresAt":"%s"}\n' \
  "$USF_RUNNER_NAME" "$USF_RUNNER_REPO" "$USF_RUNNER_REQUIRED_LABELS" "$expires_at"
