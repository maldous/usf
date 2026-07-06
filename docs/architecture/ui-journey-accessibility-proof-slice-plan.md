# UI Journey Accessibility Proof Slice Plan

## Status

This planning note is a proof and governance artefact for USF-86. It does not create UI rendering code, product implementation runtime, proof evidence, or implementation extraction, and it does not start USF-39.

## Purpose

Define the first UI journey, accessibility, validation, permission, and command-mapping proof slice for authentication login. UI behaviour must be governed as semantic intent, not inferred from visual layout, JSX structure, source component names, screenshots, or generated reports.

## Governed Instance

The in-scope UI semantic model is:

- `spec/instances/ui-semantic-model/authentication-login.json`

Related semantic instances:

- `spec/instances/interface-contract/authentication-login-api.json`
- `spec/instances/workflow/authentication-login.json`
- `spec/instances/workflow/authentication-identity-context.json`
- `spec/instances/event-contract/authentication-login-audit.json`
- `spec/instances/audit-event/authentication-login.json`
- `spec/instances/semantic-contract/authentication-platform.json`
- `spec/instances/semantic-contract/rbac-roles-and-permissions.json`

## Historical Source Evidence

Historical source-lineage source may be used only as source evidence and design input. It is not future live authority, and its paths do not determine USF implementation paths.

Primary source lineage for this slice:

- `apps/react-enterprise-app/src/auth/login-providers.ts`
- `apps/react-enterprise-app/src/routes/__tests__/login.test.tsx`
- `apps/react-enterprise-app/src/hooks/use-session.ts`
- `apps/react-enterprise-app/src/tests/use-session.test.ts`
- `apps/react-enterprise-app/src/components/RequirePermission.tsx`
- `docs/evidence/frontend/source-lineage-component-platform-baseline.md`
- `docs/evidence/auth/oidc-login-mapping-proof.md`
- `docs/evidence/identity/keycloak-login-callback.md`

## Required UI Behaviours

A future UI proof execution for this slice must demonstrate:

- Login surface exposes a governed login handoff, not an implementation-inferred provider flow.
- Authentication error state is generic, explicit, accessible, and retryable.
- Denied, provider-failure, no-session, auth-error, authenticated, and forbidden states are semantically distinct.
- Error state is announced without relying on visual styling only.
- Login and retry controls have programmatic accessible names and keyboard reachability.
- Session query state is represented before permission-gated controls are shown as available.
- Missing permission renders an explicit forbidden state rather than merely hiding source structure.
- Command/query mappings invoke the governed login interface and related workflow semantics.
- UI behaviour is not inferred from visual source structure alone.

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

This plan creates no evidence records because no USF-86 proof was executed in this change.

Future evidence for this slice must cite the governed UI semantic model, related interface/workflow/audit instances, and source-use records for any adapted proof runner logic. Runtime UI proof output, accessibility observations, evidence envelopes, and generated reports remain distinct.

Generated reports are never authority for this slice.

## No-Go Rules

- No implementation extraction.
- No UI rendering code.
- No product runtime code.
- No source-path mirroring.
- No source-lineage runtime or application code import.
- No runtime code import without disposition.
- No schema activation.
- No generated report treated as authority.
- No visual source structure treated as semantic authority.
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
