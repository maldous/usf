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

scope="manual"
json=false
while [ "$#" -gt 0 ]; do
  case "$1" in
    --scope)
      scope="${2:-}"
      shift 2
      ;;
    --json)
      json=true
      shift
      ;;
    *)
      fail "unknown argument: $1"
      ;;
  esac
done

safe_path() {
  case "$1" in
    /var/lib/usf-github-runner/*|/var/tmp/usf-github-runner|/var/tmp/usf-github-runner/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

current_workspace="$(realpath -m "${GITHUB_WORKSPACE:-/nonexistent-usf-workspace}")"
cleaned=0
skipped_current=0
failed=0

clean_contents() {
  target="$(realpath -m "$1")"
  if ! safe_path "$target"; then
    failed=$((failed + 1))
    return
  fi
  case "$target" in
    /|/home|/home/*|/opt|/opt/*)
      failed=$((failed + 1))
      return
      ;;
  esac
  if [ -n "${GITHUB_WORKSPACE:-}" ] && { [ "$target" = "$current_workspace" ] || [[ "$current_workspace" == "$target"/* ]] || [[ "$target" == "$current_workspace"/* ]]; }; then
    skipped_current=$((skipped_current + 1))
    return
  fi
  if [ -d "$target" ]; then
    find "$target" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
    cleaned=$((cleaned + 1))
  fi
}

mkdir -p "$USF_RUNNER_TEMP" "${USF_RUNNER_WORK}/_temp" 2>/dev/null || true
clean_contents "$USF_RUNNER_TEMP"
clean_contents "${USF_RUNNER_WORK}/_temp"

if [ -d "$USF_RUNNER_WORK" ]; then
  for child in "$USF_RUNNER_WORK"/*; do
    [ -e "$child" ] || continue
    case "$(basename "$child")" in
      _actions|_tool|_temp)
        continue
        ;;
    esac
    clean_contents "$child"
  done
fi

result="pass"
[ "$failed" -eq 0 ] || result="fail"
payload="$(printf '{"scope":"%s","timestamp":"%s","result":"%s","runningAsRoot":%s,"cleanedTargets":%s,"skippedCurrentWorkspace":%s,"failedTargets":%s,"cachePreserved":true,"runnerLocalStateAuthority":false}\n' \
  "$scope" "$(iso_now)" "$result" "$([ "$(id -u)" -eq 0 ] && printf true || printf false)" "$cleaned" "$skipped_current" "$failed")"

if [ "$json" = true ]; then
  printf '%s' "$payload"
else
  printf '%s\n' "$payload"
fi

[ "$failed" -eq 0 ]
