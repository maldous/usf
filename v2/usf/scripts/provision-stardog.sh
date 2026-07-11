#!/usr/bin/env bash
# Read-only Stardog connectivity check. Reads config from the environment.
# Never creates, deletes, or modifies the database. No credentials are stored.
set -euo pipefail

SD="/usr/local/bin/stardog"
SDA="/usr/local/bin/stardog-admin"

# Load .env if present (never committed).
if [ -f "$(dirname "${BASH_SOURCE[0]}")/../.env" ]; then
  set -a; . "$(dirname "${BASH_SOURCE[0]}")/../.env"; set +a
fi

: "${STARDOG_SERVER:?STARDOG_SERVER is required (e.g. https://host:5820)}"
: "${STARDOG_DATABASE:?STARDOG_DATABASE is required (e.g. USF)}"

# --server is a GLOBAL option (before the subcommand); --token/-u/-p are subcommand options.
GLOBAL=(--server "$STARDOG_SERVER")
AUTH=()
if [ -n "${STARDOG_TOKEN:-}" ]; then
  AUTH=(--token "$STARDOG_TOKEN")
elif [ -n "${STARDOG_USERNAME:-}" ]; then
  if [ -z "${STARDOG_PASSWORD:-}" ]; then
    read -rs -p "Stardog password for ${STARDOG_USERNAME}: " STARDOG_PASSWORD; echo
  fi
  AUTH=(-u "$STARDOG_USERNAME" -p "$STARDOG_PASSWORD")
else
  echo "error: provide STARDOG_TOKEN, or STARDOG_USERNAME (+ interactive password)." >&2
  exit 2
fi

echo "== stardog-admin db status (read-only) =="
"$SDA" "${GLOBAL[@]}" db status "${AUTH[@]}" "$STARDOG_DATABASE"

echo "== stardog query execute: ASK { ?s ?p ?o } =="
"$SD" "${GLOBAL[@]}" query execute "${AUTH[@]}" "$STARDOG_DATABASE" 'ASK { ?s ?p ?o }'

echo "provision-stardog: OK (read-only checks completed; database unchanged)"
