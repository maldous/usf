#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=tools/github-runner/common.sh
. "${SCRIPT_DIR}/common.sh"

need_command curl
need_command tar
need_command sha256sum
need_command python3
ensure_linux_x64

if [ "$USF_RUNNER_VERSION" = "latest" ]; then
  need_command gh
  USF_RUNNER_VERSION="$(gh api repos/actions/runner/releases/latest --jq '.tag_name' | sed 's/^v//')"
fi

case "$USF_RUNNER_VERSION" in
  ''|*[!0-9.]*)
    fail "USF_RUNNER_VERSION must be a numeric GitHub Actions runner version or latest"
    ;;
esac

if ! id "$USF_RUNNER_USER" >/dev/null 2>&1; then
  run_root useradd --system --create-home --home-dir "/home/${USF_RUNNER_USER}" --shell /bin/bash "$USF_RUNNER_USER"
fi
ensure_runner_user_safe

for path in "$USF_RUNNER_ROOT" "$USF_RUNNER_DIR" "$USF_RUNNER_HOOK_DIR" "$USF_RUNNER_WORK" "$USF_RUNNER_CACHE" "$USF_RUNNER_TEMP" "$USF_RUNNER_LOG" "${USF_RUNNER_LOG}/evidence"; do
  ensure_not_in_repo "$path"
  run_root install -d -o "$USF_RUNNER_USER" -g "$USF_RUNNER_USER" -m 0750 "$path"
done

archive="actions-runner-linux-x64-${USF_RUNNER_VERSION}.tar.gz"
url="https://github.com/actions/runner/releases/download/v${USF_RUNNER_VERSION}/${archive}"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

curl -fsSL "$url" -o "${tmp_dir}/${archive}"
sha256sum "${tmp_dir}/${archive}" > "${tmp_dir}/${archive}.sha256"
chmod 0755 "$tmp_dir"
chmod 0644 "${tmp_dir}/${archive}" "${tmp_dir}/${archive}.sha256"

if [ ! -x "${USF_RUNNER_DIR}/config.sh" ]; then
  run_as_runner tar xzf "${tmp_dir}/${archive}" -C "$USF_RUNNER_DIR"
fi

run_root install -o "$USF_RUNNER_USER" -g "$USF_RUNNER_USER" -m 0750 "${SCRIPT_DIR}/cleanup-workspace.sh" "${USF_RUNNER_HOOK_DIR}/cleanup-workspace.sh"
run_root install -o "$USF_RUNNER_USER" -g "$USF_RUNNER_USER" -m 0750 "${SCRIPT_DIR}/verify-secret-safety.sh" "${USF_RUNNER_HOOK_DIR}/verify-secret-safety.sh"

job_started="${USF_RUNNER_HOOK_DIR}/job-started.sh"
job_completed="${USF_RUNNER_HOOK_DIR}/job-completed.sh"
run_root tee "$job_started" >/dev/null <<EOF
#!/usr/bin/env bash
set -euo pipefail
export USF_RUNNER_WORK="${USF_RUNNER_WORK}"
export USF_RUNNER_TEMP="${USF_RUNNER_TEMP}"
export USF_RUNNER_LOG="${USF_RUNNER_LOG}"
"${USF_RUNNER_HOOK_DIR}/cleanup-workspace.sh" --scope hook-job-start --json >> "${USF_RUNNER_LOG}/evidence/cleanup-hooks.jsonl"
EOF
run_root tee "$job_completed" >/dev/null <<EOF
#!/usr/bin/env bash
set -euo pipefail
export USF_RUNNER_WORK="${USF_RUNNER_WORK}"
export USF_RUNNER_TEMP="${USF_RUNNER_TEMP}"
export USF_RUNNER_LOG="${USF_RUNNER_LOG}"
"${USF_RUNNER_HOOK_DIR}/verify-secret-safety.sh" --json >> "${USF_RUNNER_LOG}/evidence/secret-safety-hooks.jsonl"
"${USF_RUNNER_HOOK_DIR}/cleanup-workspace.sh" --scope hook-job-completed --json >> "${USF_RUNNER_LOG}/evidence/cleanup-hooks.jsonl"
EOF
run_root chown "$USF_RUNNER_USER:$USF_RUNNER_USER" "$job_started" "$job_completed"
run_root chmod 0750 "$job_started" "$job_completed"

env_file="${USF_RUNNER_DIR}/.env"
run_root tee "$env_file" >/dev/null <<EOF
ACTIONS_RUNNER_HOOK_JOB_STARTED=${job_started}
ACTIONS_RUNNER_HOOK_JOB_COMPLETED=${job_completed}
RUNNER_TEMP=${USF_RUNNER_TEMP}
RUNNER_TOOL_CACHE=${USF_RUNNER_CACHE}/toolcache
AGENT_TOOLSDIRECTORY=${USF_RUNNER_CACHE}/toolcache
EOF
run_root chown "$USF_RUNNER_USER:$USF_RUNNER_USER" "$env_file"
run_root chmod 0640 "$env_file"
run_root chown -R "$USF_RUNNER_USER:$USF_RUNNER_USER" "$USF_RUNNER_ROOT" /var/lib/usf-github-runner /var/cache/usf-github-runner /var/tmp/usf-github-runner /var/log/usf-github-runner

printf '{"installed":true,"runnerVersion":"%s","runnerUser":"%s","runnerDirectory":"%s","workDirectory":"%s","cacheDirectory":"%s","tempDirectory":"%s","downloadSha256":"%s"}\n' \
  "$USF_RUNNER_VERSION" "$USF_RUNNER_USER" "$USF_RUNNER_DIR" "$USF_RUNNER_WORK" "$USF_RUNNER_CACHE" "$USF_RUNNER_TEMP" "$(cut -d' ' -f1 "${tmp_dir}/${archive}.sha256")"
