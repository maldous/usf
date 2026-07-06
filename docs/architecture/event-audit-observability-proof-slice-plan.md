# Event Audit Observability Proof Slice Plan

## Status

This planning note is a proof and governance artefact for USF-82. It does not create product implementation runtime, does not start USF-39, does not activate schemas, does not claim OpenTelemetry compliance, and does not create proof evidence.

## Purpose

Define the first event, audit, observability, and correlation proof slice for authentication login. Event emission, audit recording, observability signal presence, and proof correlation must be governed together before implementation extraction can rely on runtime assurance claims.

## Governed Instances

The in-scope semantic instances are:

- `spec/instances/interface-contract/authentication-login-api.json`
- `spec/instances/workflow/authentication-login.json`
- `spec/instances/workflow/authentication-identity-context.json`
- `spec/instances/event-contract/authentication-login-audit.json`
- `spec/instances/audit-event/authentication-login.json`
- `spec/instances/observability-signal/authentication-login-audit.json`
- `spec/instances/semantic-contract/authentication-platform.json`
- `spec/instances/semantic-contract/tenant-host-identity-resolution.json`
- `spec/instances/semantic-contract/user-identity-and-tenant-membership.json`

## Historical Source Evidence

Historical source-lineage source may be used only as source evidence and design input. It is not future live authority, and its paths do not determine USF implementation paths.

Primary source lineage for this slice:

- `apps/platform-api/tests/unit/auth-settings-audit.test.ts`
- `apps/platform-api/src/usecases/audit.ts`
- `apps/platform-api/scripts/observability-signals-runtime-proof.ts`
- `apps/platform-api/src/server/observability.ts`
- `apps/platform-api/scripts/auth-settings-runtime-proof.ts`
- `apps/platform-api/src/server/auth.ts`
- `apps/platform-api/src/usecases/auth.ts`

## Required Assurance Behaviours

A future proof execution for this slice must demonstrate:

- Authentication login audit event emission after the authentication decision.
- Audit record creation for successful and denied login outcomes where behaviour is claimed.
- Request-id correlation from interface handling through workflow, audit event, observability signal, and proof output.
- Trace-id presence where request tracing is claimed.
- Proof-id presence where runtime proof output is claimed.
- Provider-mode and tenant-id attributes on the observability signal where those claims are made.
- Missing audit collection fails closed for proof claims that depend on audit coverage.
- Missing request-id or mismatched proof-id correlation fails closed for proof claims that depend on correlation.
- Generated reports do not substitute for raw collected audit, observability, or proof evidence.

## Proof Posture

The proof posture for this issue is plan-only until a later authorised proof execution creates evidence.

Any future proof execution under this plan must follow `docs/architecture/proof-tool-contract-standard.md` and must emit proof evidence plus an evidence envelope only from executed authorised proof.

Required claim shape for an executed hermetic slice:

- providerMode: `hermetic-mock`
- environment: `hermetic`
- proofLevelObserved: `behaviour-proven`
- freshness.stale: `false`
- freshness.commit: current USF commit being claimed
- liveExternalProviderClaim: `false`
- productionLiveClaim: `false`

## Evidence Rules

This plan creates no evidence records because no USF-82 proof was executed in this change.

Future evidence for this slice must cite the governed interface, workflow, event, audit, and observability instances above. It must preserve raw collected evidence separately from proof evidence, evidence envelopes, and generated reports.

Generated reports are never authority for this slice.

## No-Go Rules

- No product implementation extraction.
- No product runtime code.
- No source-path mirroring.
- No source-lineage runtime or application code import.
- No runtime code import without disposition.
- No schema activation.
- No generated report treated as authority.
- No OpenTelemetry compliance claim.
- No hermetic proof upgraded to live-external-provider proof.
- No hermetic proof upgraded to production-live proof.

## Validation

Before merging this planning slice, run:

- `python3 tools/validate-spec/validate-spec.py all --json`
- `python3 tools/validate-spec/validate-spec.py instances --json`
- `python3 tools/validate-spec/validate-spec.py evidence --json`
- `python3 tools/validate-spec/validate-spec.py real-instances --json`
- `python3 tools/validate-spec/validate-spec.py selftest --json`
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD --json`

Strict JSON parse is required for any changed JSON files.
