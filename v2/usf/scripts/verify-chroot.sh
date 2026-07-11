#!/usr/bin/env bash
# Runs INSIDE the chroot (expected cwd /usf). Verifies structure + tooling.
# Diagnostics go to stderr; on success stdout is exactly: USF v2 chroot verified
set -u
fail=0
note() { echo "$@" >&2; }

for p in \
  /usf \
  /usf/graph \
  /usf/graph/ontology.ttl \
  /usf/graph/shapes.ttl \
  /usf/graph/contracts/capabilities.trig \
  /usf/graph/assurance/evidence.trig \
  /usf/graph/realisation/implementations.trig \
  /usf/graph/planning/classifications.trig \
  /usf/graph/derived/readiness.trig \
  /usf/.venv/bin/python \
  /usr/local/bin/stardog \
  /usr/local/bin/stardog-admin ; do
  if [ -e "$p" ]; then note "ok   $p"; else note "MISS $p"; fail=1; fi
done

if /usr/local/bin/stardog version >/dev/null 2>&1; then note "ok   stardog version"; else note "FAIL stardog version"; fail=1; fi
if /usf/.venv/bin/python --version >/dev/null 2>&1; then note "ok   python --version"; else note "FAIL python --version"; fail=1; fi
if /usf/.venv/bin/python -c 'import rdflib, pyshacl, yaml, pydantic' >/dev/null 2>&1; then
  note "ok   python imports (rdflib, pyshacl, yaml, pydantic)"
else
  note "FAIL python imports"; fail=1
fi

if [ "$fail" -ne 0 ]; then
  note "verification FAILED"
  exit 1
fi
echo "USF v2 chroot verified"
