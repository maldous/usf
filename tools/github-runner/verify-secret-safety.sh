#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/common.sh" ]; then
  # shellcheck source=tools/github-runner/common.sh
  . "${SCRIPT_DIR}/common.sh"
else
  USF_RUNNER_WORK="${USF_RUNNER_WORK:-/var/lib/usf-github-runner/work}"
  USF_RUNNER_TEMP="${USF_RUNNER_TEMP:-/var/tmp/usf-github-runner}"
  USF_RUNNER_LOG="${USF_RUNNER_LOG:-/var/log/usf-github-runner}"
  fail() { printf 'error: %s\n' "$*" >&2; exit 1; }
  iso_now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
fi

json=false
while [ "$#" -gt 0 ]; do
  case "$1" in
    --json)
      json=true
      shift
      ;;
    *)
      fail "unknown argument: $1"
      ;;
  esac
done

if command -v need_command >/dev/null 2>&1; then
  need_command jq
elif ! command -v jq >/dev/null 2>&1; then
  fail "missing required command: jq"
fi

secret_names=(
  GITHUB_TOKEN
  GH_TOKEN
  LINEAR_API_KEY
  ACTIONS_ID_TOKEN_REQUEST_TOKEN
  NPM_TOKEN
  PYPI_TOKEN
)

paths=()
for path in "$USF_RUNNER_WORK" "$USF_RUNNER_TEMP"; do
  [ -d "$path" ] && paths+=("$path")
done

checked=0
hits=0
hit_names=()
for name in "${secret_names[@]}"; do
  value="${!name:-}"
  if [ "${#value}" -ge 12 ] && [ "${#paths[@]}" -gt 0 ]; then
    checked=$((checked + 1))
    if grep -R -F -l -- "$value" "${paths[@]}" >/tmp/usf-runner-secret-safety-hits.$$ 2>/dev/null; then
      hits=$((hits + 1))
      hit_names+=("$name")
    fi
    rm -f /tmp/usf-runner-secret-safety-hits.$$
  fi
done

hit_json="$(printf '%s\n' "${hit_names[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')"
result="pass"
[ "$hits" -eq 0 ] || result="fail"
payload="$(printf '{"timestamp":"%s","result":"%s","checkedSecretValues":%s,"secretValueHits":%s,"hitVariableNames":%s,"secretValuesPrinted":false,"runnerLocalStateAuthority":false}\n' \
  "$(iso_now)" "$result" "$checked" "$hits" "$hit_json")"

if [ "$json" = true ]; then
  printf '%s' "$payload"
else
  printf '%s\n' "$payload"
fi

[ "$hits" -eq 0 ]
