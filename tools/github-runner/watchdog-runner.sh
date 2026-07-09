#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/common.sh" ]; then
  # shellcheck source=tools/github-runner/common.sh
  . "${SCRIPT_DIR}/common.sh"
else
  USF_RUNNER_LOG="${USF_RUNNER_LOG:-/var/log/usf-github-runner}"
  fail() { printf 'error: %s\n' "$*" >&2; exit 1; }
  iso_now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
fi

RUNNER_DIAG="${USF_RUNNER_DIAG:-/opt/usf-github-runner/actions-runner/_diag}"
RUNNER_SERVICE="${USF_RUNNER_SERVICE:-actions.runner.maldous-usf.usf-linux-x64-controller-01.service}"
STATE_FILE="${USF_RUNNER_WATCHDOG_STATE:-${USF_RUNNER_LOG}/watchdog-state}"
EVIDENCE_FILE="${USF_RUNNER_WATCHDOG_EVIDENCE:-${USF_RUNNER_LOG}/evidence/watchdog.jsonl}"
RESTART_COOLDOWN_SECONDS=900
# Signatures observed when the listener stops dispatching while the service
# stays alive: broker socket errors, disposed message tokens, stale canceled
# job messages, and upstream acquirejob failures (run 29019768528 stall).
ERROR_PATTERN='ERR |Back off|already disposed|Job message not found|ServiceUnavailable|SocketException'

mode="check"
json=false
while [ "$#" -gt 0 ]; do
  case "$1" in
    --install) mode="install"; shift ;;
    --check) mode="check"; shift ;;
    --json) json=true; shift ;;
    *) fail "unknown argument: $1" ;;
  esac
done

emit() {
  payload="$1"
  if [ "$json" = true ]; then printf '%s' "$payload"; else printf '%s\n' "$payload"; fi
  mkdir -p "$(dirname "$EVIDENCE_FILE")" 2>/dev/null || true
  printf '%s\n' "$payload" >> "$EVIDENCE_FILE" 2>/dev/null || true
}

install_units() {
  [ "$(id -u)" -eq 0 ] || fail "--install requires root"
  script_path="$(realpath "${BASH_SOURCE[0]}")"
  cat > /etc/systemd/system/usf-runner-watchdog.service <<UNIT
[Unit]
Description=USF GitHub runner dispatch watchdog (heals wedged listener; never touches a live job)

[Service]
Type=oneshot
ExecStart=${script_path} --check --json
UNIT
  cat > /etc/systemd/system/usf-runner-watchdog.timer <<UNIT
[Unit]
Description=Run the USF runner dispatch watchdog every 3 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=3min

[Install]
WantedBy=timers.target
UNIT
  systemctl daemon-reload
  systemctl enable --now usf-runner-watchdog.timer
  printf 'installed and started usf-runner-watchdog.timer\n'
}

if [ "$mode" = "install" ]; then
  install_units
  exit 0
fi

now_epoch="$(date +%s)"
worker_live=false
if pgrep -f 'bin/Runner\.Worker' >/dev/null 2>&1; then
  worker_live=true
fi

newest_log=""
tail_matches=false
if [ -d "$RUNNER_DIAG" ]; then
  newest_log="$(ls -t "$RUNNER_DIAG" 2>/dev/null | grep '^Runner_' | head -n 1 || true)"
fi
if [ -n "$newest_log" ] && tail -n 10 "${RUNNER_DIAG}/${newest_log}" 2>/dev/null | grep -Eq "$ERROR_PATTERN"; then
  tail_matches=true
fi

prev_state="none"
prev_epoch=0
last_restart_epoch=0
if [ -f "$STATE_FILE" ]; then
  # shellcheck disable=SC1090
  . "$STATE_FILE" 2>/dev/null || true
fi

action="none"
state="healthy-idle"
if [ "$worker_live" = true ]; then
  state="healthy-busy"
elif [ "$tail_matches" = true ]; then
  if [ "$prev_state" = "error-tail" ] && [ $((now_epoch - last_restart_epoch)) -ge "$RESTART_COOLDOWN_SECONDS" ]; then
    # Two consecutive error-tail observations while idle: restart the
    # listener. Safe by construction: no Runner.Worker process is live, so no
    # job can be interrupted; a healthy-but-noisy listener just reconnects.
    if systemctl restart "$RUNNER_SERVICE" 2>/dev/null; then
      action="restarted-listener"
      last_restart_epoch="$now_epoch"
    else
      action="restart-failed"
    fi
    state="error-tail-healed"
  else
    state="error-tail"
  fi
fi

{
  printf 'prev_state=%q\n' "$state"
  printf 'prev_epoch=%q\n' "$now_epoch"
  printf 'last_restart_epoch=%q\n' "$last_restart_epoch"
} > "$STATE_FILE" 2>/dev/null || true

emit "$(printf '{"timestamp":"%s","state":"%s","action":"%s","workerLive":%s,"errorTailMatched":%s,"newestRunnerLog":"%s","runnerLocalStateAuthority":false}' \
  "$(iso_now)" "$state" "$action" "$worker_live" "$tail_matches" "$newest_log")"
