#!/usr/bin/env bash
# Load canonical graph files into the configured Stardog database.
# Scaffold: the graph is empty placeholders, so this is a safe no-op until content exists.
# It never creates or drops the database; it only adds data to named graphs.
set -euo pipefail

SD="/usr/local/bin/stardog"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GRAPH_DIR="$(cd "$HERE/../graph" && pwd)"

if [ -f "$HERE/../.env" ]; then set -a; . "$HERE/../.env"; set +a; fi
: "${STARDOG_SERVER:?STARDOG_SERVER is required}"
: "${STARDOG_DATABASE:?STARDOG_DATABASE is required}"

GLOBAL=(--server "$STARDOG_SERVER")
AUTH=()
if [ -n "${STARDOG_TOKEN:-}" ]; then AUTH=(--token "$STARDOG_TOKEN")
elif [ -n "${STARDOG_USERNAME:-}" ]; then AUTH=(-u "$STARDOG_USERNAME" -p "${STARDOG_PASSWORD:?STARDOG_PASSWORD required for user auth}")
else echo "error: provide STARDOG_TOKEN or STARDOG_USERNAME(+PASSWORD)" >&2; exit 2; fi

shopt -s nullglob globstar
loaded=0; skipped=0
for f in "$GRAPH_DIR"/**/*.ttl "$GRAPH_DIR"/**/*.trig; do
  if [ ! -s "$f" ]; then skipped=$((skipped+1)); continue; fi   # skip empty placeholders
  echo "loading $f"
  "$SD" "${GLOBAL[@]}" data add "${AUTH[@]}" "$STARDOG_DATABASE" "$f"
  loaded=$((loaded+1))
done
echo "load-graph: loaded=$loaded skipped-empty=$skipped (no content yet is expected in the scaffold)"
