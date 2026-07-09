#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=tools/github-runner/common.sh
. "${SCRIPT_DIR}/common.sh"

need_command gh

mode="${1:-status}"
case "$mode" in
  set)
    gh variable set USF_VALIDATE_RUNNER_TARGET --repo "$USF_RUNNER_REPO" --body github-hosted
    printf '{"fallback":"github-hosted","repositoryVariable":"USF_VALIDATE_RUNNER_TARGET","changed":true}\n'
    ;;
  clear|auto)
    gh variable set USF_VALIDATE_RUNNER_TARGET --repo "$USF_RUNNER_REPO" --body auto
    printf '{"fallback":"auto","repositoryVariable":"USF_VALIDATE_RUNNER_TARGET","changed":true}\n'
    ;;
  status)
    value="$(gh variable list --repo "$USF_RUNNER_REPO" --json name,value --jq '.[] | select(.name=="USF_VALIDATE_RUNNER_TARGET") | .value' 2>/dev/null || true)"
    [ -n "$value" ] || value="unset"
    printf '{"repositoryVariable":"USF_VALIDATE_RUNNER_TARGET","value":"%s","githubHostedFallbackActive":%s}\n' \
      "$value" "$([ "$value" = "github-hosted" ] && printf true || printf false)"
    ;;
  *)
    fail "usage: $0 [status|set|clear]"
    ;;
esac
