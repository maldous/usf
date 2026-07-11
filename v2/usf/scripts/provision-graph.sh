#!/usr/bin/env bash
# Provision and empirically verify the USF v2 semantic graph in Stardog.
#
# Runs inside the chroot (the graph is at /usf/graph, config at /usf/.env). Reproduces the
# database solely from v2/usf/graph: recreate -> load authored+shape+derived graphs ->
# validate (SHACL) -> integrity -> contamination -> guarded-write proof (invalid transactions
# rejected atomically) -> readiness responsiveness. Credentials are read from /usf/.env and
# are never printed.
#
# Usage (from the host):  sudo chroot v2 /bin/bash /usf/scripts/provision-graph.sh
set -uo pipefail

GRAPH_DIR="${GRAPH_DIR:-/usf/graph}"
ENV_FILE="${ENV_FILE:-/usf/.env}"
SD="${SD:-/usr/local/bin/stardog}"
SDA="${SDA:-/usr/local/bin/stardog-admin}"
DB="${STARDOG_DATABASE:-USF}"

[ -f "$ENV_FILE" ] && { set -a; . "$ENV_FILE"; set +a; }
: "${STARDOG_SERVER:?STARDOG_SERVER is required}"
DB="${STARDOG_DATABASE:-USF}"

G=(--server "$STARDOG_SERVER")
if [ -n "${STARDOG_TOKEN:-}" ]; then AUTH=(--token "$STARDOG_TOKEN")
elif [ -n "${STARDOG_USERNAME:-}" ]; then AUTH=(-u "$STARDOG_USERNAME" -p "${STARDOG_PASSWORD:?password required}")
else echo "error: provide STARDOG_TOKEN or STARDOG_USERNAME(+PASSWORD)" >&2; exit 2; fi

cd "$GRAPH_DIR"
noise(){ grep -vE 'SLF4J|log4j|Picked up|^\s*$'; }
adminq(){ "$SDA" "${G[@]}" "$@" "${AUTH[@]}" 2>&1 | noise; }
sdq(){ "$SD" "${G[@]}" query execute "${AUTH[@]}" "$DB" "$1" 2>&1 | noise; }
load(){ "$SD" "${G[@]}" data add "${AUTH[@]}" "$DB" "$@" >/dev/null 2>&1; }

# Named graphs, in deterministic load order (mirrors manifest.yaml).
DEFN=(ontology taxonomy vocabulary authority registry)
TTL_AUTHORED=(providers environments claims)
TRIG_AUTHORED=(contracts/capabilities contracts/policies contracts/interfaces contracts/interactions
  contracts/platform contracts/data contracts/signals contracts/experience
  assurance/proofs assurance/evidence assurance/controls assurance/tests
  realisation/services realisation/implementations realisation/bindings
  execution/agents execution/validators)
SHAPES=(shapes shapes/contracts shapes/assurance shapes/realisation shapes/execution shapes/derivation)
DERIVED=(derived/obligations derived/evidence derived/surfaces derived/coverage derived/readiness)

graph_iri(){ echo "urn:usf:graph:$1"; }

recreate_and_load(){
  echo "== recreate database (delete + recreate solely from the graph) =="
  adminq db drop "$DB" | tail -1
  # query.all.graphs makes the default graph the union; SERIALIZABLE isolation is required for ICV.
  "$SDA" "${G[@]}" db create "${AUTH[@]}" -o query.all.graphs=true transaction.isolation=SERIALIZABLE -n "$DB" 2>&1 | noise | tail -1

  echo "== load definition + authored + shape + derived graphs =="
  for f in "${DEFN[@]}";        do load -g "$(graph_iri "$f")" "$f.ttl"; done
  for f in "${TTL_AUTHORED[@]}"; do load -g "$(graph_iri "$f")" "$f.ttl"; done
  for f in "${TRIG_AUTHORED[@]}"; do load "$f.trig"; done                 # .trig carries its own graph
  for f in "${SHAPES[@]}";      do load -g urn:usf:graph:shapes "$f.ttl"; done
  for f in "${DERIVED[@]}";     do load "$f.trig"; done
}

verify(){
  echo "== graph counts =="
  sdq "SELECT ?g (COUNT(*) AS ?n) WHERE { GRAPH ?g { ?s ?p ?o } } GROUP BY ?g ORDER BY ?g" | tail -n +1
  echo "== total triples =="; sdq "SELECT (COUNT(*) AS ?n) WHERE { GRAPH ?g { ?s ?p ?o } }" | tail -4
  echo "== SHACL validation (expect sh:conforms true) =="
  if "$SD" "${G[@]}" icv report "${AUTH[@]}" "$DB" 2>&1 | grep -qE 'sh:conforms[[:space:]]+true'; then
    echo "  sh:conforms true"
  else
    echo "  SHACL NOT CONFORMANT (or unavailable) — failing closed"; PROOF_FAIL=1
  fi
  echo "== integrity query (expect 0 rows) =="; sdq "$(cat rules/integrity.rq)" | tail -5
  echo "== contamination query over all graphs except shapes (expect 0 rows) =="
  sdq 'SELECT ?s WHERE { GRAPH ?g { ?s ?p ?o } FILTER(?g != <urn:usf:graph:shapes>) FILTER( REGEX(STR(?s),"linear[.]app|USF-[0-9]|github[.]com|gitlab[.]com|refs/heads|commitSha|branchName|issueId|projectId|ADR-[0-9]") || (isLiteral(?o) && REGEX(STR(?o),"linear[.]app|USF-[0-9]|github[.]com|gitlab[.]com|refs/heads|commitSha|branchName|issueId|projectId|ADR-[0-9]")) ) } LIMIT 10' | tail -5
  echo "== readiness derived for every capability (expect 67, all notready without live evidence) =="
  sdq "PREFIX usf: <urn:usf:ontology:> SELECT (COUNT(?r) AS ?readiness) WHERE { ?r a usf:Readiness }" | tail -4
}

set_icv(){
  # metadata set uses a `--` separator, so auth options MUST precede it (not be appended after).
  adminq db offline "$DB" | tail -1
  "$SDA" "${G[@]}" metadata set "${AUTH[@]}" -o "icv.enabled=$1" -- "$DB" 2>&1 | noise | tail -1
  adminq db online "$DB" | tail -1
}

guarded_writes(){
  echo "== enable guarded validation and prove invalid writes are rejected atomically =="
  set_icv true
  "$SDA" "${G[@]}" metadata get "${AUTH[@]}" -o "icv.enabled" -- "$DB" 2>&1 | noise | grep -i icv
  echo "-- conforming transaction (expect committed) --"
  out=$("$SD" "${G[@]}" data add "${AUTH[@]}" "$DB" -g urn:usf:graph:capabilities fixtures/conforming/capability.ttl 2>&1 | noise)
  echo "$out" | grep -qi "committed successfully" && echo "  conforming => COMMITTED" || { echo "  conforming => UNEXPECTEDLY REJECTED"; PROOF_FAIL=1; }
  for d in missingpermission readinessoverclaim staleevidence providermismatch missingauditsignal missingcontractfacet undefinedterm; do
    out=$("$SD" "${G[@]}" data add "${AUTH[@]}" "$DB" -g urn:usf:graph:probe "fixtures/defects/$d.ttl" 2>&1 | noise)
    if echo "$out" | grep -qi "committed successfully"; then
      echo "  defect $d => NOT REJECTED (escaped!)"; PROOF_FAIL=1
    else
      msg=$(echo "$out" | grep -oE 'resultMessage "[^"]+"' | head -1)
      echo "  defect $d => REJECTED atomically ${msg}"
    fi
  done
  "$SD" "${G[@]}" data remove "${AUTH[@]}" "$DB" -g urn:usf:graph:capabilities fixtures/conforming/capability.ttl >/dev/null 2>&1
  set_icv false
}

main(){
  PROOF_FAIL=0
  echo "== connectivity (read-only) =="
  adminq db list | grep -E "Databases|$DB" | head -3
  recreate_and_load
  verify
  guarded_writes
  echo "== final SHACL (authoritative graph unpolluted) =="
  if "$SD" "${G[@]}" icv report "${AUTH[@]}" "$DB" 2>&1 | grep -qE 'sh:conforms[[:space:]]+true'; then
    echo "  sh:conforms true"
  else
    echo "  final SHACL NOT CONFORMANT — failing closed"; PROOF_FAIL=1
  fi
  if [ "$PROOF_FAIL" -ne 0 ]; then echo "provision-graph: FAILED"; exit 1; fi
  echo "provision-graph: DONE"
}
main "$@"
