#!/usr/bin/env bash
# Operator lifecycle for the ADR 0015 staging proof-cockpit review surface.
#
# Pure `docker compose` — no sudo, no systemctl, no /etc/caddy, no ad-hoc
# `docker run` caddy edge. external-caddy is the SHARED, always-on composed public
# proof edge (docker/caddy/Caddyfile). The /proof cockpit gate is a reload-managed
# include on a writable runtime mount; the committed default is CLOSED (503).
#
#   proof-review.sh caddy-up    Bring up the shared composed public proof edge
#                               (external-caddy). No operator credential; serves
#                               the public read-only proof routes. Seeds the CLOSED
#                               /proof gate include on first bring-up.
#   proof-review.sh caddy-down  Stop the shared composed public proof edge.
#   proof-review.sh up          (Requires the edge up — Make runs caddy-up first.)
#                               Prompt for an operator credential, write an
#                               authenticated /proof gate include, bring up the
#                               loopback cockpit in write mode, reload Caddy to OPEN
#                               the gate, then fail-closed verify (401 no-cred / 200
#                               with cred at the staging FQDN via --resolve).
#   proof-review.sh down        Materialise the acceptance ledger out of the volume
#                               into the committed corpus, JSON-validate it, git
#                               commit it (operator reconciliation), CLOSE the /proof
#                               gate (restore the 503 default + reload), then stop
#                               ONLY the cockpit — the edge stays up.
#
# ponytail: operator tooling only — it drives the governed staging Compose services
# (external-caddy + staging-proof-cockpit) and toggles a gitignored runtime include.
# The operator credential is hashed at runtime and lives only in the gitignored
# runtime include, never committed and never in the caddy service environment.
# Upgrade path: replace the basic_auth include with a Keycloak OIDC forward-auth
# include without changing this contract.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/compose/compose.staging.generated.yaml"
COCKPIT="staging-proof-cockpit"
EDGE="external-caddy"
LEDGER_IN_CONTAINER="/var/lib/usf-proof-cockpit/human-review-actions.json"
COMMITTED_LEDGER="${REPO_ROOT}/evidence/proof-evidence/proof-cockpit/human-review-actions.json"
CADDY_IMAGE="caddy:2-alpine"

# Writable runtime dir bind-mounted into external-caddy at /srv/caddy-runtime
# (see the external-caddy volumes in the Compose catalogue). Gitignored.
RUNTIME_DIR="${REPO_ROOT}/.proof-review/caddy"
INCLUDE_FILE="${RUNTIME_DIR}/proof-cockpit-auth.caddy"
CLOSED_DEFAULT="${REPO_ROOT}/docker/caddy/proof-cockpit-auth.caddy"
CADDYFILE_IN_CONTAINER="/etc/caddy/Caddyfile"

# Public proof edge FQDNs (the Makefile exports these; provide the same defaults
# here so the script is runnable standalone).
export USF_PROOF_STAGING_FQDN="${USF_PROOF_STAGING_FQDN:-1e100.network}"
export USF_PROOF_PROD_FQDN="${USF_PROOF_PROD_FQDN:-aldous.info}"

log() { printf '\033[1m[proof-review]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[proof-review] %s\033[0m\n' "$*" >&2; exit 1; }
require() { command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"; }

compose() { docker compose -f "${COMPOSE_FILE}" --profile gateway --profile proof-cockpit "$@"; }

# Detect (do not mutate) stale/red proof-cockpit acceptance evidence and warn the
# operator so they never unknowingly sign off on stale evidence. Pure Python, no
# Chromium. Staleness is a build/release-time concern (re-pin with
# `make proof-review-repin`), not something up should auto-commit.
check_freshness() {
  command -v python3 >/dev/null 2>&1 || return 0
  local status
  status="$(cd "${REPO_ROOT}" && python3 tools/validate-proof-cockpit-acceptance/validate-proof-cockpit-acceptance.py all --json 2>/dev/null \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("status","unknown"))' 2>/dev/null || echo unknown)"
  if [ "${status}" != "pass" ]; then
    log "WARNING: proof-cockpit acceptance evidence is not fresh/green (status=${status})."
    log "         You may be about to review or sign off on STALE evidence."
    log "         Re-pin it to the current commit first, then commit the result:"
    log "           make proof-review-repin"
    log "         Continuing anyway (warning only)."
  fi
}

seed_closed_include() {
  mkdir -p "${RUNTIME_DIR}"
  [ -f "${CLOSED_DEFAULT}" ] || die "missing committed closed default: ${CLOSED_DEFAULT}"
  # Seed the runtime include with the committed CLOSED default only if absent, so
  # a caddy-up during an open review session does not silently slam the gate shut.
  [ -f "${INCLUDE_FILE}" ] || cp "${CLOSED_DEFAULT}" "${INCLUDE_FILE}"
}

close_gate() {
  mkdir -p "${RUNTIME_DIR}"
  cp "${CLOSED_DEFAULT}" "${INCLUDE_FILE}"
}

reload_caddy() {
  # Prefer an in-place reload so the edge keeps serving; fall back to restart.
  if compose exec -T "${EDGE}" caddy reload --config "${CADDYFILE_IN_CONTAINER}" >/dev/null 2>&1; then
    log "Reloaded ${EDGE} config in place."
  else
    log "caddy reload unavailable; restarting ${EDGE} ..."
    compose restart "${EDGE}" >/dev/null 2>&1 || die "could not reload or restart ${EDGE}"
  fi
}

edge_running() {
  compose ps --status running --services 2>/dev/null | grep -qx "${EDGE}"
}

caddy_up() {
  require docker
  [ -f "${COMPOSE_FILE}" ] || die "missing compose file: ${COMPOSE_FILE}"
  seed_closed_include
  log "Bringing up the shared composed public proof edge (${EDGE}) ..."
  log "  Staging FQDN: ${USF_PROOF_STAGING_FQDN}   Production FQDN: ${USF_PROOF_PROD_FQDN}"
  docker compose -f "${COMPOSE_FILE}" --profile gateway up -d "${EDGE}"
  log "Public proof edge is up. /proof is CLOSED until 'make proof-review-up'."
}

caddy_down() {
  require docker
  log "Stopping the shared composed public proof edge (${EDGE}) ..."
  compose rm -sf "${EDGE}" >/dev/null 2>&1 || compose stop "${EDGE}" >/dev/null 2>&1 || true
  log "Public proof edge is down."
}

up() {
  require docker
  [ -f "${COMPOSE_FILE}" ] || die "missing compose file: ${COMPOSE_FILE}"
  edge_running || die "${EDGE} is not running; run 'make caddy-up' first (proof-review-up depends on it)."
  check_freshness

  # 1. Operator credential (hashed at runtime; never written to a tracked file).
  local user pass hash
  read -r -p "Operator username: " user
  [ -n "${user}" ] || die "username must not be empty"
  read -r -s -p "Operator password: " pass; echo
  [ -n "${pass}" ] || die "password must not be empty"
  log "Hashing credential with ${CADDY_IMAGE} caddy hash-password ..."
  hash="$(docker run --rm "${CADDY_IMAGE}" caddy hash-password --plaintext "${pass}")"
  [ -n "${hash}" ] || die "failed to hash password"

  # 2. Write the authenticated /proof gate include on the writable runtime mount.
  #    The operator credential lives ONLY here (gitignored), never committed.
  mkdir -p "${RUNTIME_DIR}"
  cat >"${INCLUDE_FILE}" <<INCLUDE
# USF /proof cockpit gate — OPEN (written by make proof-review-up).
# Operator credential lives only in this gitignored runtime include.
basic_auth {
	${user} ${hash}
}
reverse_proxy ${COCKPIT}:8080 {
	header_up X-Forwarded-Host {host}
	header_up X-Forwarded-User {http.auth.user.id}
	header_up X-Real-IP {remote_host}
}
INCLUDE
  unset hash

  # 3. Pin the deployed source SHA so recorded operator actions carry a real commit.
  export USF_SOURCE_SHA
  USF_SOURCE_SHA="$(git -C "${REPO_ROOT}" rev-parse HEAD 2>/dev/null || echo unavailable)"
  log "Pinning USF_SOURCE_SHA=${USF_SOURCE_SHA}"

  # 4. Write mode requires an operator-supplied secret (no committed placeholder).
  export USF_PROOF_COCKPIT_ALLOW_WRITES=yes
  export USF_PROOF_COCKPIT_REVIEW_SECRET
  USF_PROOF_COCKPIT_REVIEW_SECRET="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  [ -n "${USF_PROOF_COCKPIT_REVIEW_SECRET}" ] || die "failed to generate review secret"
  log "Generated a fresh USF_PROOF_COCKPIT_REVIEW_SECRET for this session (not committed)."

  # 5. Seed the ledger volume from the committed corpus on first run only.
  log "Seeding acceptance ledger volume from committed evidence (first run only) ..."
  compose run --rm --no-deps \
    -v "${REPO_ROOT}/evidence/proof-evidence/proof-cockpit:/seed:ro" \
    --entrypoint sh "${COCKPIT}" -c \
    'mkdir -p /var/lib/usf-proof-cockpit; [ -f '"${LEDGER_IN_CONTAINER}"' ] || cp /seed/human-review-actions.json '"${LEDGER_IN_CONTAINER}" \
    >/dev/null

  # 6. Bring up the loopback cockpit (compose-network only; reached as cockpit:8080).
  log "Starting ${COCKPIT} (compose-network only) ..."
  compose up -d "${COCKPIT}"

  # 7. Reload Caddy so the OPEN include takes effect on the running edge.
  reload_caddy

  # 8. Fail-closed verify: no-cred must be 401, operator-cred must be 200.
  local url="https://${USF_PROOF_STAGING_FQDN}/proof"
  local resolve="${USF_PROOF_STAGING_FQDN}:443:127.0.0.1"
  log "Verifying fail-closed gate at ${url} ..."
  local code_nocred=000 code_cred=000 i
  for i in 1 2 3 4 5 6 7 8; do
    code_nocred="$(curl -k -s -o /dev/null -w '%{http_code}' --resolve "${resolve}" "${url}" 2>/dev/null || echo 000)"
    [ "${code_nocred}" != "000" ] && break
    sleep 1
  done
  code_cred="$(curl -k -s -o /dev/null -w '%{http_code}' --resolve "${resolve}" -u "${user}:${pass}" "${url}" 2>/dev/null || echo 000)"
  unset pass
  if [ "${code_nocred}" != "401" ]; then
    log "FAIL: no-credential response was ${code_nocred}, expected 401. Closing the gate and tearing the cockpit down."
    close_gate
    reload_caddy || true
    compose rm -sf "${COCKPIT}" >/dev/null 2>&1 || true
    die "fail-closed verification failed (no-cred != 401); nothing left open."
  fi
  if [ "${code_cred}" != "200" ]; then
    log "WARNING: operator-credential response was ${code_cred}, expected 200 (gate is closed/fail-safe)."
    log "         The fail-closed gate (no-cred=401) is confirmed; investigate the 200 path before reviewing."
  fi
  log "Fail-closed gate confirmed: no-credential=${code_nocred} (expected 401), operator-credential=${code_cred} (expected 200)."
  log "Proof review surface is open."
  log "  URL:   ${url}"
  log "  Login: the operator credential you just entered (recorded as the acceptance actor)."
  log "  When finished reviewing and signing off, run: make proof-review-down"
}

down() {
  require docker
  edge_running || log "note: ${EDGE} is not running; will still commit the ledger and restore the closed gate."
  local tmp
  tmp="$(mktemp)"

  # 1. Materialise the acceptance ledger out of the running cockpit's volume.
  if ! compose ps --status running --services 2>/dev/null | grep -qx "${COCKPIT}"; then
    rm -f "${tmp}"
    die "${COCKPIT} is not running; run 'make proof-review-up' first (nothing committed)."
  fi
  log "Copying acceptance ledger out of the volume ..."
  compose cp "${COCKPIT}:${LEDGER_IN_CONTAINER}" "${tmp}" \
    || die "could not read ${LEDGER_IN_CONTAINER} from the ${COCKPIT} volume"

  # 2. Fail closed on an invalid or empty ledger.
  python3 - "${tmp}" <<'PY' || die "materialised ledger is not valid JSON with actions; nothing committed"
import json, sys
d = json.load(open(sys.argv[1]))
acts = d.get("actions")
assert isinstance(acts, list) and len(acts) >= 1, "ledger has no actions"
print(f"[proof-review] ledger has {len(acts)} action(s); finalAcceptanceClaimed={d.get('finalAcceptanceClaimed')}")
PY

  # 3. Reconcile into the committed corpus and commit (operator-driven; not pushed).
  cp "${tmp}" "${COMMITTED_LEDGER}"
  rm -f "${tmp}"
  if git -C "${REPO_ROOT}" diff --quiet -- "${COMMITTED_LEDGER}"; then
    log "Committed ledger already matches the volume; nothing to commit."
  else
    log "Committing reconciled acceptance ledger:"
    git -C "${REPO_ROOT}" --no-pager diff --stat -- "${COMMITTED_LEDGER}" || true
    git -C "${REPO_ROOT}" add "${COMMITTED_LEDGER}"
    git -C "${REPO_ROOT}" commit -q -m "chore(proof): reconcile proof-cockpit acceptance ledger from review volume" \
      -m "Recorded via make proof-review-down (ADR 0015 operator reconciliation)."
    log "Committed. Review with 'git show HEAD', then push when ready — not pushed automatically."
  fi

  # 4. CLOSE the /proof gate: restore the committed 503 default and reload.
  log "Closing the /proof gate (restoring the CLOSED default) ..."
  close_gate
  if edge_running; then
    reload_caddy || true
  fi

  # 5. Stop ONLY the cockpit; leave the shared edge UP so the public proof routes
  #    keep serving. Preserve the ledger volume (no -v, no volume removal).
  log "Stopping ${COCKPIT} (ledger volume preserved; ${EDGE} left running) ..."
  compose rm -sf "${COCKPIT}" >/dev/null 2>&1 || compose stop "${COCKPIT}" >/dev/null 2>&1 || true
  log "Proof review gate is closed. The public proof edge remains up (stop it with 'make caddy-down')."
}

case "${1:-}" in
  caddy-up) caddy_up ;;
  caddy-down) caddy_down ;;
  up) up ;;
  down) down ;;
  *) die "usage: proof-review.sh caddy-up|caddy-down|up|down" ;;
esac
