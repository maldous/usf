#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=tools/github-runner/common.sh
. "${SCRIPT_DIR}/common.sh"

need_command gh
need_command jq

payload="$(gh api "repos/${USF_RUNNER_REPO}/actions/runners")"
health="$(
  printf '%s' "$payload" | jq -c \
    --arg name "$USF_RUNNER_NAME" \
    --arg required "$USF_RUNNER_REQUIRED_LABELS" '
      def lower_labels: [.labels[].name | ascii_downcase];
      ($required | split(",")) as $requiredLabels |
      (.runners[]? | select(.name == $name)) as $runner |
      if $runner == null then
        {runnerFound:false, online:false, missingLabels:$requiredLabels}
      else
        ($runner | lower_labels) as $labels |
        {runnerFound:true, runnerName:$runner.name, status:$runner.status, busy:$runner.busy, os:$runner.os, labels:$labels, missingLabels:($requiredLabels - $labels), online:($runner.status == "online")}
      end
    '
)"

if [ -z "$health" ]; then
  health="$(printf '{"runnerFound":false,"online":false,"missingLabels":%s}\n' "$(printf '%s' "$USF_RUNNER_REQUIRED_LABELS" | jq -R 'split(",")')")"
fi

runner_user_ok=true
runner_user_groups=""
if id "$USF_RUNNER_USER" >/dev/null 2>&1; then
  runner_user_groups="$(id -nG "$USF_RUNNER_USER")"
  if [ "$(id -u "$USF_RUNNER_USER")" = "0" ] || printf '%s\n' "$runner_user_groups" | tr ' ' '\n' | grep -Eq '^(sudo|docker)$'; then
    runner_user_ok=false
  fi
else
  runner_user_ok=false
fi

printf '%s' "$health" | jq -c --argjson runnerUserSafe "$runner_user_ok" --arg groups "$runner_user_groups" '. + {runnerUserSafe:$runnerUserSafe, runnerUserGroups:$groups}'
printf '\n'

printf '%s' "$health" | jq -e '.runnerFound == true and .online == true and (.missingLabels | length == 0)' >/dev/null
[ "$runner_user_ok" = true ]
