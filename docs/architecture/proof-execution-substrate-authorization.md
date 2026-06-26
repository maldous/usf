# Proof Execution Substrate Authorization

| | |
|---|---|
| **Document type** | Architecture / proof execution substrate authorization |
| **Status** | Draft / blocker decision |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validators, and runtime proof evidence |
| **Issue scope** | USF-76 |
| **Primary inputs** | `docs/architecture/proof-posture-execution-assessment.md`, `docs/architecture/production-proof-posture-matrix.md`, `docs/architecture/proof-and-evidence-pipeline-plan.md`, `spec/instances/command/authentication-slice-proof.json`, `docs/architecture/authentication-slice-source-use-disposition-matrix.md` |

This document records the proof execution substrate authorization decision for the authentication slice. It creates no proof evidence, emits no generated report, imports no runtime/application code, creates no implementation directory, and promotes no schema to `active`.

## Decision

No current proof execution substrate is authorized for the authentication slice.

The current USF repository has semantic instances, draft schemas, validators, source import manifests, and stale historical observability proof evidence. It does not have an executable authentication runtime, proof runner, package graph, service topology, Make target, package manifest, or composed proof substrate that can exercise the authentication slice without importing or executing historical runtime code.

The historical authentication proof files remain source and proof-command lineage only:

- `../react/apps/platform-api/scripts/auth-settings-runtime-proof.ts`
- `../react/apps/platform-api/scripts/domain-identity-matrix-runtime-proof.ts`
- `../react/apps/platform-api/scripts/tenant-custom-domain-auth-origin-runtime-proof.ts`
- `../react/apps/platform-api/tests/substrate/auth-routes.test.ts`

Those files depend on the historical runtime package graph, source handlers, adapters, local services, or test harnesses. Running them directly from USF would bypass USF source disposition and implementation-directory authorization. Copying them into USF would import runtime/application code or mirror historical source paths without a future implementation directive. Rewriting a proof runner now would create an unevidenced harness around behaviour that has not yet been implemented in USF. None of those paths may satisfy current proof readiness.

## Current Authorization Table

| Requirement | Current decision |
|---|---|
| Permitted proof execution substrate | None authorized from the current repository state. |
| Allowed runtime setup | None. No application runtime, source handler, adapter, server, package graph, or composed service may be created or executed under this issue. |
| Allowed package setup | None. No package manifest, package directory, dependency graph, or runtime package may be created under this issue. |
| Allowed service setup | None. No Redis, Postgres, Keycloak, mock IdP service, compose file, container setup, or service directory may be created under this issue. |
| Historical proof script source-use policy | Evidence-only lineage. The files may be read and cited as source evidence but not executed, copied, mirrored, or treated as USF proof commands. |
| Proof runner logic treatment | Reference only. Copy, adapt, and rewrite are not authorized for proof runner logic in the current repository state. |
| Target providerMode | No current proof target is authorized. The future minimum for the first authentication proof remains `hermetic-mock` unless a later accepted directive chooses a stronger posture. |
| Target environment | No current proof target is authorized. The future minimum for the first authentication proof remains `hermetic` unless a later accepted directive chooses a stronger posture. |
| Required proofLevelObserved | No current proof level is observed. A future first-slice proof must observe at least `behaviour-proven` for the hermetic internal proof floor before it may satisfy USF-59. |
| Freshness requirement | Any future proof claim must carry `freshness.stale` equal to `false` and `freshness.commit` equal to the USF commit being claimed. Historical or mismatched commits remain stale lineage only. |
| Evidence output expectation | No output is authorized now. Future proof execution must produce non-empty emitted evidence and collected evidence above discovery level, with proof-evidence and evidence-envelope records committed under the existing `evidence/` homes. |
| Generated report treatment | No generated report is authorized now. A future report may summarize evidence only as rank-7 output and may not replace proof evidence. |

## Future Authorization Bar

A later proof-substrate directive may authorize execution only if it supplies all of the following:

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

For the first authentication slice, the minimum future proof posture remains the hermetic internal proof floor from `docs/architecture/production-proof-posture-matrix.md`: `providerMode` `hermetic-mock`, `environment` `hermetic`, and `proofLevelObserved` at least `behaviour-proven`, with current commit freshness.

Local composed, external sandbox, production-shaped, live external provider, and production-live proof remain not authorized by this document. They require their own explicit substrate, credentials or topology where applicable, and fresh evidence. Hermetic, local, or sandbox proof must not be upgraded into live-external-provider or production-live readiness.

## Downstream Effect

- USF-73 remains not complete because no required proof posture has fresh current evidence.
- USF-59 remains blocked because no fresh commit-pinned authentication-slice proof record can be produced from the current repository state.
- USF-61 remains blocked from issuing an implementation-extraction directive while fresh proof remains absent, unless a later higher-authority decision explicitly changes that gate without weakening proof-freshness, provider-honesty, or no-overclaim rules.
- USF-75 remains blocked from a final go decision.
- USF-39 remains Backlog and must not start from this decision.

## Validation Expectations

This authorization decision must be merged only with clean validation:

- `python3 tools/validate-spec/validate-spec.py all --json`
- `python3 tools/validate-spec/validate-spec.py evidence --json`
- `python3 tools/validate-spec/validate-spec.py real-instances --json`
- `python3 tools/validate-spec/validate-spec.py selftest --json`
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD`

No JSON evidence is created by this document. If later work creates evidence records, every changed JSON file must parse strictly and validate under the relevant evidence/proof modes.

## No-Go Rules

- Do not start USF-39.
- Do not move USF-39 out of Backlog.
- Do not create product implementation/runtime code.
- Do not create product implementation directories.
- Do not import runtime/application code from `../react`.
- Do not execute historical proof commands as USF proof commands.
- Do not mirror historical source paths as USF target paths.
- Do not promote schemas to `active`.
- Do not treat generated reports as authority or proof.
- Do not treat stale evidence as current readiness.
- Do not treat hermetic, local, or sandbox evidence as live-external-provider or production-live proof.

## Readiness Verdict

USF-76 can close as a proof-substrate authorization decision once this document is merged and validation passes. The decision is a decline for current execution, not an authorization to run proof. It advances the prerequisite chain by making the blocker explicit and reviewable, but it does not unblock USF-73, USF-59, USF-61, USF-75, or USF-39.
