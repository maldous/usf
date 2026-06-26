# Provider Environment Configuration Proof Slice Plan

## Status

This planning note is a proof and governance artefact for USF-84. It does not create product implementation runtime, does not start USF-39, does not activate schemas, does not create live or production proof, and does not create proof evidence.

## Purpose

Define the first provider, environment, and configuration proof slice for authentication login. Provider mode, environment, configuration, secret classification, generated-source lineage, and readiness posture must remain honest before implementation extraction can rely on proof claims.

## Governed Instances

The in-scope semantic instances are:

- `spec/instances/provider-mode/mock-identity-provider.json`
- `spec/instances/environment/hermetic.json`
- `spec/instances/environment/production-shaped.json`
- `spec/instances/configuration/provider-mode-selector.json`

Related proof posture authority:

- `docs/architecture/proof-tool-contract-standard.md`
- `docs/architecture/production-proof-posture-matrix.md`
- `docs/architecture/proof-posture-execution-assessment.md`

## Historical Source Evidence

Historical React source may be used only as source evidence and design input. It is not future live authority, and its paths do not determine USF implementation paths.

Primary source lineage for this slice:

- `apps/platform-api/scripts/provider-config-runtime-proof.ts`
- `apps/platform-api/scripts/provider-environment-classification-runtime-proof.ts`
- `apps/platform-api/scripts/composed-provider-readiness-runtime-proof.ts`

## Required Provider and Environment Behaviours

A future proof execution for this slice must demonstrate:

- Hermetic environment permits hermetic-mock provider mode for internal behaviour proof.
- Hermetic proof does not satisfy local, external-sandbox, live-external-provider, production-shaped, or production-live claims.
- Production-shaped environment remains productionLiveClaim false.
- Production-shaped does not satisfy production-live or live-external-provider readiness by naming, source path, or generated report status.
- Provider mode cannot be upgraded by environment name.
- Environment cannot be upgraded by provider mode name.
- Generated reports do not upgrade provider or environment posture.

## Required Configuration Behaviours

A future proof execution for this slice must demonstrate:

- Provider mode selector configuration declares providerMode and environment explicitly.
- Provider mode selector is non-secret in this slice and contains no secret value.
- Any future secret-bearing provider configuration must not serialize a literal value.
- Any future generated provider configuration must declare sourceManifest before a readiness claim can depend on it.
- Configuration reload or restart semantics are explicit where behaviour depends on changed provider mode.

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

This plan creates no evidence records because no USF-84 proof was executed in this change.

Future evidence for this slice must cite the governed provider, environment, and configuration instances above and must preserve raw collected provider/config observations separately from proof evidence, evidence envelopes, and generated reports.

Generated reports are never authority for this slice.

## No-Go Rules

- No product implementation extraction.
- No product runtime code.
- No source-path mirroring.
- No React runtime or application code import.
- No runtime code import without disposition.
- No schema activation.
- No live-external-provider claim.
- No production-live claim.
- No generated report treated as authority.
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
