#!/usr/bin/env bash
# Operator lifecycle for the ADR 0015 staging proof-cockpit review surface.
#
#   proof-review.sh up     Prompt for an operator credential, seed the acceptance
#                          ledger volume from the committed evidence corpus (first
#                          run only), bring up the loopback staging-proof-cockpit
#                          service, and front it with an operator-authenticated
#                          (HTTP basic-auth) Caddy so /proof requires the credential.
#   proof-review.sh down   Materialise the acceptance ledger back out of the volume
#                          into the committed evidence corpus, JSON-validate it, git
#                          commit it (operator reconciliation), then tear the surface
#                          down while preserving the ledger volume.
#
# ponytail: operator tooling only — it drives the existing staging Compose service
# plus an ad-hoc Caddy; it does not touch the governed Compose catalogue. The Caddy
# credential is generated at runtime and never committed. Upgrade path: replace the
# ad-hoc Caddy with the origin-host Caddyfile (self-hosted-public-proof-origin
# runbook) / Keycloak SSO without changing this contract.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/compose/compose.staging.generated.yaml"
SERVICE="staging-proof-cockpit"
LEDGER_IN_CONTAINER="/var/lib/usf-proof-cockpit/human-review-actions.json"
COMMITTED_LEDGER="${REPO_ROOT}/evidence/proof-evidence/proof-cockpit/human-review-actions.json"
CADDY_IMAGE="caddy:2-alpine"
CADDY_CONTAINER="usf-proof-review-caddy"
COCKPIT_LOOPBACK="127.0.0.1:18085"
REVIEW_PORT="8446"
RUNTIME_DIR="${REPO_ROOT}/.proof-review"          # gitignored
CADDYFILE="${RUNTIME_DIR}/Caddyfile"

log() { printf '\033[1m[proof-review]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[proof-review] %s\033[0m\n' "$*" >&2; exit 1; }

require() { command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"; }

compose() { docker compose -f "${COMPOSE_FILE}" --profile proof-cockpit "$@"; }

up() {
  require docker
  [ -f "${COMPOSE_FILE}" ] || die "missing compose file: ${COMPOSE_FILE}"

  # 1. Operator credential (never written to a tracked file).
  local user pass hash
  read -r -p "Operator username: " user
  [ -n "${user}" ] || die "username must not be empty"
  read -r -s -p "Operator password: " pass; echo
  [ -n "${pass}" ] || die "password must not be empty"
  log "Hashing credential with ${CADDY_IMAGE} caddy hash-password ..."
  hash="$(docker run --rm "${CADDY_IMAGE}" caddy hash-password --plaintext "${pass}")"
  [ -n "${hash}" ] || die "failed to hash password"
  unset pass

  # 2. Pin the deployed source SHA so recorded operator actions carry a real commit
  #    (node:alpine has no git; the cockpit falls back to USF_SOURCE_SHA).
  export USF_SOURCE_SHA
  USF_SOURCE_SHA="$(git -C "${REPO_ROOT}" rev-parse HEAD 2>/dev/null || echo unavailable)"
  log "Pinning USF_SOURCE_SHA=${USF_SOURCE_SHA}"

  # 3. Seed the ledger volume from the committed corpus on first run only.
  log "Seeding acceptance ledger volume from committed evidence (first run only) ..."
  compose run --rm --no-deps \
    -v "${REPO_ROOT}/evidence/proof-evidence/proof-cockpit:/seed:ro" \
    --entrypoint sh "${SERVICE}" -c \
    'mkdir -p /var/lib/usf-proof-cockpit; [ -f '"${LEDGER_IN_CONTAINER}"' ] || cp /seed/human-review-actions.json '"${LEDGER_IN_CONTAINER}" \
    >/dev/null

  # 4. Bring up the loopback cockpit (write mode is set in the Compose catalogue).
  log "Starting ${SERVICE} (loopback ${COCKPIT_LOOPBACK}) ..."
  compose up -d "${SERVICE}"

  # 5. Front it with an operator-authenticated Caddy (ad-hoc, host network).
  mkdir -p "${RUNTIME_DIR}"
  cat >"${CADDYFILE}" <<CADDY
{
	auto_https off
	admin off
}
http://:${REVIEW_PORT} {
	@proof path /proof /proof/*
	handle @proof {
		basic_auth {
			${user} ${hash}
		}
		reverse_proxy ${COCKPIT_LOOPBACK}
	}
	handle {
		respond "USF proof review surface — authenticate at /proof" 404
	}
}
CADDY
  docker rm -f "${CADDY_CONTAINER}" >/dev/null 2>&1 || true
  docker run -d --name "${CADDY_CONTAINER}" --network host \
    -v "${CADDYFILE}:/etc/caddy/Caddyfile:ro" "${CADDY_IMAGE}" >/dev/null
  unset hash

  log "Proof review surface is up."
  log "  URL:   http://localhost:${REVIEW_PORT}/proof"
  log "  Login: the operator credential you just entered (recorded as the acceptance actor)."
  log "  When finished reviewing and signing off, run: make proof-review-down"
}

down() {
  require docker
  local tmp
  tmp="$(mktemp)"

  # 1. Materialise the acceptance ledger out of the running container's volume.
  if ! compose ps --status running --services 2>/dev/null | grep -qx "${SERVICE}"; then
    die "${SERVICE} is not running; run 'make proof-review-up' first (nothing committed)."
  fi
  log "Copying acceptance ledger out of the volume ..."
  compose cp "${SERVICE}:${LEDGER_IN_CONTAINER}" "${tmp}" \
    || die "could not read ${LEDGER_IN_CONTAINER} from the ${SERVICE} volume"

  # 2. Fail closed on an invalid or empty ledger.
  python3 - "${tmp}" <<'PY' || die "materialised ledger is not valid JSON with actions; nothing committed"
import json, sys
d = json.load(open(sys.argv[1]))
acts = d.get("actions")
assert isinstance(acts, list) and len(acts) >= 1, "ledger has no actions"
print(f"[proof-review] ledger has {len(acts)} action(s); finalAcceptanceClaimed={d.get('finalAcceptanceClaimed')}")
PY

  # 3. Reconcile into the committed corpus and commit (operator-driven).
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

  # 4. Tear down, preserving the ledger volume.
  docker rm -f "${CADDY_CONTAINER}" >/dev/null 2>&1 || true
  log "Stopping ${SERVICE} (ledger volume preserved) ..."
  compose down --remove-orphans >/dev/null 2>&1 || compose stop "${SERVICE}" >/dev/null 2>&1 || true
  log "Proof review surface is down."
}

case "${1:-}" in
  up) up ;;
  down) down ;;
  *) die "usage: proof-review.sh up|down" ;;
esac
