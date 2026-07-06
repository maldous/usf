# Proof Execution Substrate Authorization

| | |
|---|---|
| **Document type** | Architecture / proof execution substrate authorization |
| **Status** | Draft / amended proof-substrate decision |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validators, and runtime proof evidence |
| **Issue scope** | USF-76, amended by USF-77 Option A |
| **Primary inputs** | `docs/architecture/proof-posture-execution-assessment.md`, `docs/architecture/production-proof-posture-matrix.md`, `docs/architecture/proof-and-evidence-pipeline-plan.md`, `spec/instances/command/authentication-slice-proof.json`, `docs/architecture/authentication-slice-source-use-disposition-matrix.md` |

This document records the proof execution substrate authorization decisions for the authentication slice. It imports no runtime/application code, creates no implementation directory, and promotes no schema to `active`.

## Decision

USF-76 declined proof execution from the then-current repository state. USF-77 Option A later authorizes a bounded proof-only authentication-slice substrate for the hermetic authentication login API/audit/workflow/provider-mode slice.

The USF-77 Option A authorization is narrow:

- The only authorized proof tool is `tools/validate-bootstrap/validate-bootstrap.py proof-authentication-slice`.
- The only authorized proof output records are:
  - `evidence/proof-evidence/authentication-slice-proof.json`
  - `evidence/evidence-envelope/authentication-slice-proof.json`
  - `evidence/evidence-envelope/authentication-slice-proof-lineage.json`
- The proof substrate is a deterministic semantic harness over committed USF semantic instances and governance artefacts.
- The proof substrate is not product implementation runtime.
- Historical source-lineage proof scripts and tests are lineage/design inputs only; they are not executed, copied, imported as runtime, mirrored as target paths, or treated as USF proof commands.
- The authorized provider mode is `hermetic-mock`.
- The authorized environment is `hermetic`.
- The authorized observed proof level is `behaviour-proven`.
- `liveExternalProviderClaim` must be `false`.
- No production-live claim is authorized.

No other proof runner, runtime substrate, package graph, service topology, Make target, package manifest, product handler, adapter, server, database, cache, identity-provider service, compose file, implementation directory, or historical source-lineage proof command is authorized by this decision.

## USF-76 Decline Baseline

The current USF repository has semantic instances, draft schemas, validators, source import manifests, and stale historical observability proof evidence. It does not have an executable authentication runtime, proof runner, package graph, service topology, Make target, package manifest, or composed proof substrate that can exercise the authentication slice without importing or executing historical runtime code.

The authentication proof files recorded in USF's own source lineage remain source and proof-command lineage only (paths held in USF's source-import registry):

- `apps/platform-api/scripts/auth-settings-runtime-proof.ts`
- `apps/platform-api/scripts/domain-identity-matrix-runtime-proof.ts`
- `apps/platform-api/scripts/tenant-custom-domain-auth-origin-runtime-proof.ts`
- `apps/platform-api/tests/substrate/auth-routes.test.ts`

Those files depend on the historical runtime package graph, source handlers, adapters, local services, or test harnesses. Running them directly from USF would bypass USF source disposition and implementation-directory authorization. Copying them into USF would import runtime/application code or mirror historical source paths without a future implementation directive. None of those paths may satisfy current proof readiness.

## Current Authorization Table

| Requirement | Current decision |
|---|---|
| Permitted proof execution substrate | `tools/validate-bootstrap/validate-bootstrap.py proof-authentication-slice` only, as a proof-only semantic harness authorized by USF-77 Option A. |
| Allowed runtime setup | None. No application runtime, source handler, adapter, server, package graph, or composed service may be created or executed under this issue. |
| Allowed package setup | None. No package manifest, package directory, dependency graph, or runtime package may be created under this issue. |
| Allowed service setup | None. No Redis, Postgres, Keycloak, mock IdP service, compose file, container setup, or service directory may be created under this issue. |
| Historical proof script source-use policy | Evidence-only lineage. The files may be read and cited as source evidence but not executed, copied, mirrored, or treated as USF proof commands. |
| Proof runner logic treatment | New proof-only semantic harness logic is authorized in the `proof-authentication-slice` mode of `tools/validate-bootstrap/validate-bootstrap.py`; source-lineage proof runner logic remains evidence-only lineage and is not copied or executed. |
| Target providerMode | `hermetic-mock` for the USF-77 Option A proof. Stronger provider modes are not authorized here. |
| Target environment | `hermetic` for the USF-77 Option A proof. Stronger environments are not authorized here. |
| Required proofLevelObserved | `behaviour-proven` for the bounded proof-only authentication slice. |
| Freshness requirement | Any future proof claim must carry `freshness.stale` equal to `false` and `freshness.commit` equal to the USF commit being claimed. Historical or mismatched commits remain stale lineage only. |
| Evidence output expectation | The authorized proof must produce non-empty emitted evidence and collected evidence above discovery level, with proof-evidence and evidence-envelope records committed under the existing `evidence/` homes. |
| Generated report treatment | No generated report is authorized here. A future report may summarize evidence only as rank-6 output and may not replace proof evidence. |

## Future Authorization Bar Beyond USF-77 Option A

A later proof-substrate directive beyond USF-77 Option A may authorize additional execution only if it supplies all of the following:

- the exact proof substrate and command to run;
- the exact proof-only or implementation directories and files, if any, that are authorized;
- the source-use treatment for every historical proof input;
- whether proof logic is source-derived-adapt, source-derived-rewrite, new-with-rationale, or evidence-only-support;
- the target provider mode and environment;
- the required proof level observed;
- the expected emitted evidence and collected evidence;
- the proof-evidence and evidence-envelope record paths to be created;
- the validation commands to run before merge;
- the stop conditions for missing evidence, stale evidence, provider/environment overclaim, generated-report authority, source-path mirroring, and un-dispositioned runtime import.

For the authentication proof-substrate slice, USF-77 Option A authorizes the hermetic internal proof floor from `docs/architecture/production-proof-posture-matrix.md`: `providerMode` `hermetic-mock`, `environment` `hermetic`, and `proofLevelObserved` `behaviour-proven`, with current commit freshness.

Local composed, external sandbox, production-shaped, live external provider, and production-live proof remain not authorized by this document. They require their own explicit substrate, credentials or topology where applicable, and fresh evidence. Hermetic, local, or sandbox proof must not be upgraded into live-external-provider or production-live readiness.

## Downstream Effect

- USF-77 Option A can close only if the proof-only harness and evidence records merge with clean validation.
- USF-59 can close for the hermetic authentication proof substrate proof only if the merged evidence is fresh, non-stale, schema-valid, and validator-clean.
- USF-73 is only satisfied for the hermetic internal proof floor. Local composed, external sandbox, production-shaped, live external provider, and production-live postures remain unproven unless a later issue explicitly narrows or separately authorizes those gates.
- USF-61 remains blocked until USF-59 is closed and USF-73 is either closed for the required implementation-entry scope or explicitly narrowed with recorded authority.
- USF-75 remains blocked from a final go decision until USF-61 and every required downstream gate close.
- USF-39 remains Backlog and must not start from this decision.

## Validation Expectations

This authorization decision must be merged only with clean validation:

- `python3 tools/validate-spec/validate-spec.py all --json`
- `python3 tools/validate-spec/validate-spec.py evidence --json`
- `python3 tools/validate-spec/validate-spec.py real-instances --json`
- `python3 tools/validate-spec/validate-spec.py selftest --json`
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD`

If evidence records are created, every changed JSON file must parse strictly and validate under the relevant evidence/proof modes.

## No-Go Rules

- Do not start USF-39.
- Do not move USF-39 out of Backlog.
- Do not create product implementation/runtime code.
- Do not create product implementation directories.
- Do not import runtime/application code from USF's own source lineage.
- Do not execute historical proof commands as USF proof commands.
- Do not mirror historical source paths as USF target paths.
- Do not promote schemas to `active`.
- Do not treat generated reports as authority or proof.
- Do not treat stale evidence as current readiness.
- Do not treat hermetic, local, or sandbox evidence as live-external-provider or production-live proof.

## Readiness Verdict

USF-76 remains closed as the prior decline decision. USF-77 Option A is now the bounded proof-only authorization for the hermetic authentication slice. It can unblock USF-59 only for the proof-substrate hermetic proof if the corresponding proof/evidence records merge with clean validation. It does not by itself close broader multi-environment, live-provider, production-live, implementation-directive, final-readiness, or USF-39 gates.
