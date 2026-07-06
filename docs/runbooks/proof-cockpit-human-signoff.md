# Proof Cockpit Human Signoff Runbook

| | |
|---|---|
| Document type | Runbook / operational procedure |
| Status | Active / procedure |
| Authority level | Operational procedure; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, and proof evidence |
| Issue scope | USF-290 (human acceptance decision); USF-293 (acceptance-grade cockpit) |
| Audience | The accountable human operator (Matthew Aldous) |

This runbook records how the accountable human operator reviews the staging proof cockpit and records the final human signoff for USF-290, fully autonomously, with no AI assistance in the loop. The cockpit is served by `apps/staging-proof-cockpit/src/server.mjs`.

The acceptance is a single deliberate human browser action. The machine surface never auto-completes it: machine QA reports evidence, but a single operator decision on `/proof` is the only thing that records acceptance. This runbook does not itself accept anything and does not upgrade any readiness claim. It makes no staging, production, SOC, ISO, enterprise-production, product UI, browser end-to-end, live-provider, deployment, or full-Foundation-closure claim; recording the decision preserves those non-claims.

## Prerequisites

Serve the cockpit with writes enabled. The write path requires all three environment variables; without them the browser action controls stay read-only and POST writes are rejected.

Set, in the operator's shell:

- `USF_PROOF_COCKPIT_ALLOW_WRITES=yes` — enables the authenticated write mode.
- `USF_PROOF_COCKPIT_REVIEW_SECRET=<operator secret>` — the operator secret; it seeds the CSRF token derivation and gates writes.
- `USF_PROOF_COCKPIT_REVIEW_ACTOR="Matthew Aldous"` — the configured operator identity. The recorded actor is derived from this authenticated identity, not typed into the form.

Start the server:

```
corepack pnpm proof-cockpit:serve
```

The `proof-cockpit:serve` script (`package.json`) runs `node apps/staging-proof-cockpit/src/server.mjs`. Open the served cockpit in a browser. CSRF protection is a double-submit pair: a form token (`csrfToken` hidden input) and an HttpOnly, `SameSite=Strict` cookie (`proof_cockpit_csrf`, `Path=/proof`). Both are set and validated server-side, so no manual token handling is required — keep cookies enabled in the browser session.

### Turnkey composed operator surface: `make caddy-up` / `make proof-review-up` / `make proof-review-down`

For the fastest operator loop, the lifecycle is pure `docker compose` — no sudo, no systemd, no host `/etc/caddy`. The shared composed public proof edge (`external-caddy`, from `docker/caddy/Caddyfile`) is decoupled from the review session: it serves the public read-only proof routes always-on, and the `/proof` cockpit gate is toggled by a reload-managed include on a writable runtime mount whose committed default is CLOSED (responds 503).

- `make caddy-up` — brings up the shared composed public proof edge (`docker compose --profile gateway up -d external-caddy`) using the `USF_PROOF_STAGING_FQDN` / `USF_PROOF_PROD_FQDN` Makefile envs. It needs **no** operator credential (public edge only) and seeds the CLOSED `/proof` gate include on first bring-up. `make caddy-down` stops the edge.
- `make proof-review-up` — depends on `caddy-up` (runs it first), then prompts for an operator username and password, hashes the password with the Caddy image (`docker run --rm caddy:2-alpine caddy hash-password`), writes an operator-authenticated `/proof` gate include (`basic_auth` plus `reverse_proxy staging-proof-cockpit:8080`) to the gitignored `.proof-review/caddy` runtime mount, generates a fresh session `USF_PROOF_COCKPIT_REVIEW_SECRET` and enables cockpit write mode, seeds the acceptance-ledger volume from the committed corpus on first run, starts the compose-network-only cockpit, and reloads Caddy to OPEN the gate. It then fail-closed verifies at the staging FQDN `/proof` (no credential ⇒ 401, operator credential ⇒ 200; using `--resolve <fqdn>:443:127.0.0.1` and `-k` so it works locally) and prints the observed status codes and URL. The operator credential lives only in the gitignored runtime include — never committed and never in the caddy service environment. The authenticated operator name is recorded as the acceptance/signoff actor.
- `make proof-review-down` — reads the acceptance ledger back out of the volume, fails closed unless it is valid JSON with at least one action, overwrites `evidence/proof-evidence/proof-cockpit/human-review-actions.json`, and **git-commits** it (the manual operator reconciliation, now scripted — not pushed automatically), restores the CLOSED (503) `/proof` gate include and reloads Caddy to close the gate, then stops **only** the cockpit while leaving `external-caddy` up so the public proof routes keep serving and preserving the ledger volume. Review the commit with `git show HEAD` and push when ready.

The composed edge with the staging FQDN env is the same contract whether run against the local host or a staging host; the `/proof` gate is opened only for the duration of a review session and closed again on `proof-review-down`.

### Staging access at `https://1e100.network/proof` (ADR 0015)

For the staging fixture, the same cockpit is reached at `https://<USF_PROOF_STAGING_FQDN>/proof` (default `https://1e100.network/proof`) instead of a local serve. Per [ADR 0015](../adr/0015-operator-authenticated-staging-proof-cockpit-access-surface.md), the route is served by the composed `external-caddy` edge (`docker/caddy/Caddyfile`, staging FQDN parameterised by `USF_PROOF_STAGING_FQDN`), which reverse-proxies to the profile-gated `staging-proof-cockpit` Compose service reachable only over the compose network as `staging-proof-cockpit:8080` (no direct public host port). The `/proof` gate is opened by a reload-managed operator HTTP basic-authentication include on a writable runtime mount (its committed default is CLOSED, responding 503); the include and the operator credential are written by `make proof-review-up` and are described in the self-hosted public proof origin runbook. Authenticate with the operator credential at the browser prompt; the authenticated operator name is recorded as the acceptance/signoff actor. The write guard, CSRF pair, and non-auto-completed signoff behave identically to the local serve. The route exposes hermetic, synthetic proof content only and upgrades no readiness claim. Acceptance and signoff persist to the service's durable volume; promote them into the committed `evidence/proof-evidence/proof-cockpit/human-review-actions.json` corpus by the manual reconciliation step (copy the volume ledger into the repo, review the diff, and commit) — the running service is never given repository write credentials.

## Step 1 — Review the current proof state at `/proof`

Open `/proof`. It is a single-column decision page. Read the concise state summary: the machine-QA counts (pass / warn / gaps / fail), the current review-item count, the machine-QA run id, the source SHA, and the current acceptance status. One short sentence states the non-claims (synthetic, hermetic proof only; no staging, production, deployment, live-provider, SOC, ISO, enterprise-production, product-UI, browser-E2E, or full-product readiness claim).

Everything below the decision is secondary artifact navigation — capabilities, services, evidence, screenshots, registers, the action ledger, the printable report, and the read-only signoff state view. Viewing any of it is optional; none of it is a required step. If you want to inspect a specific item, follow the artifact links (for example an individual review item at `/proof/review?item=N`, which is a read-only detail page). The gap register (`/proof/review/gaps`), nonconformities (`/proof/review/nonconformities`), and corrective actions (`/proof/review/corrective-actions`) remain visible for inspection.

## Step 2 — Record the single Accept or Reject decision on `/proof`

The one decision covers the whole current proof state. In the "Decision" section:

1. Tick the single confirmation checkbox: **I, the authenticated operator, accept the current proof state.** This is the only friction — there is no four-checkbox set and no typed phrase.
2. Choose one:
   - **Accept** submits `POST /proof/accept`. In one deliberate human action it records an acceptance of every currently-open review item at that item's current evidence fingerprint (equivalent to the former "accept all") **and** the final USF-290 human acceptance decision (`human-final-decision`, outcome `human-accepted`).
   - **Reject** submits `POST /proof/reject`. It records the final human decision (`human-final-decision`, outcome `human-rejected`) and does not record any item acceptances.

The server validates the write policy (allow-writes plus a non-empty review secret), the CSRF double-submit (form token plus HttpOnly `SameSite=Strict` cookie), and the single confirmation checkbox, then derives the actor from the authenticated operator identity. Acceptance is never auto-completed by the machine surface.

## What gets recorded

Human actions persist to the file-backed action ledger `human-review-actions.json` (default path `/var/lib/usf-proof-cockpit/human-review-actions.json`, overridable via `USF_PROOF_COCKPIT_STATE_PATH`).

- **Per-item acceptance (Accept only)** — each currently-open review item is recorded as a `machine-evidence-accepted` action with its acceptance fingerprint, so the delta model carries it forward until the evidence changes. A future evidence, screenshot, report, or route change alters the affected fingerprints and returns only those items to the open set.
- **The guarded final human decision** — recorded as a `human-final-decision` action with outcome `human-accepted` (Accept) or `human-rejected` (Reject), the derived actor, an acceptance fingerprint, the machine counts observed at decision time, the preserved non-claims, and markers that this was an explicit browser action and was not auto-completed.

`finalAcceptanceClaimed` stays governed: the recorded action sets it to `false`. Recording the human decision is the human's acceptance decision; it does not itself flip a final-acceptance claim, and the machine surface never sets that claim automatically.

## Stop conditions

Stop and do not record a decision if:

- the three write-mode environment variables are not all set (writes stay read-only);
- the single confirmation checkbox is not ticked (the write is rejected);
- the browser cannot present the CSRF cookie (writes are rejected).

The Accept or Reject decision must always be a deliberate human action taken by the accountable operator.
