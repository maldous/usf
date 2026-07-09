#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=tools/github-runner/common.sh
. "${SCRIPT_DIR}/common.sh"

run_root test -x "${USF_RUNNER_DIR}/svc.sh" || fail "runner service helper missing at ${USF_RUNNER_DIR}/svc.sh"
run_root bash -c 'cd "$1" && ./svc.sh stop' bash "$USF_RUNNER_DIR" || true
printf '{"stopped":true,"runnerName":"%s"}\n' "$USF_RUNNER_NAME"
