#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=tools/github-runner/common.sh
. "${SCRIPT_DIR}/common.sh"

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

need_command node
need_command corepack
need_command python3
need_command git

node_version="$(node -v)"
python_version="$(python3 --version | awk '{print $2}')"
pnpm_version="$(corepack pnpm -v)"
node_ok=false
python_ok=false
pnpm_ok=false

case "$node_version" in
  v24.*) node_ok=true ;;
esac
case "$python_version" in
  3.12.*) python_ok=true ;;
esac
[ "$pnpm_version" = "11.9.0" ] && pnpm_ok=true

payload="$(printf '{"nodeVersion":"%s","node24":%s,"pythonVersion":"%s","python312":%s,"pnpmVersion":"%s","pnpmExpected":%s,"toolchainReady":%s}\n' \
  "$node_version" "$node_ok" "$python_version" "$python_ok" "$pnpm_version" "$pnpm_ok" "$([ "$node_ok" = true ] && [ "$python_ok" = true ] && [ "$pnpm_ok" = true ] && printf true || printf false)")"

if [ "$json" = true ]; then
  printf '%s' "$payload"
else
  printf '%s\n' "$payload"
fi

[ "$node_ok" = true ] && [ "$python_ok" = true ] && [ "$pnpm_ok" = true ]
