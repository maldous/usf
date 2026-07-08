# App-Surface Source-Use Disposition Matrix

| | |
|---|---|
| **Document type** | Architecture / source-use disposition matrix |
| **Status** | Draft / USF-1016 local in-memory runtime coverage |
| **Authority level** | Reviewable source-use matrix; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, runtime proof evidence, semantic instances, and the app-surface implementation realisation plan |
| **Issue scope** | USF-1014, USF-1015, USF-1016 |
| **Source row basis** | `docs/architecture/app-surface-implementation-realisation-plan.json`, `docs/architecture/app-surface-workspace-package-boundaries.json`, `docs/architecture/target-implementation-topology-plan.md` |

This matrix records target-file treatment for bounded app-surface workspace/package boundary work, the USF-1015 local shared-client consumption path, and the USF-1016 local in-memory app-surface runtime. It does not authorise web/mobile scaffolds, external provider setup, deployment, staging, store setup, live-provider integration, production readiness, monetisation readiness, package publication readiness, generated SDK readiness, or direct runtime/application code import from source lineage.

## Treatment Rules

- `source-derived-adapt`: freshly authored implementation informed by cited historical behaviour or provider inventory. No source code or configuration is copied.
- `source-derived-rewrite`: freshly authored implementation that rewrites semantic intent from lineage. No source code or configuration is copied.
- `new-with-rationale`: freshly authored file required by USF app-surface local package-boundary work, with no direct source row driving implementation.
- `evidence-only-support`: non-runtime validation, proof, test, documentation, or configuration support. It cannot import runtime code from evidence-only rows.

## App-Surface Package-Boundary and Runtime Files

| Target file | Treatment | Source-use basis | Rationale |
|---|---|---|---|
| `packages/ui/package.json` | new-with-rationale | USF-1014 workspace/package boundary acceptance criteria and `docs/architecture/app-surface-workspace-package-boundaries.json` | Defines a dependency-free private workspace boundary for future app-surface UI primitives without runtime implementation, external packages, global install state, provider setup, deployment, staging, store setup, or production readiness claims. |
| `packages/client/package.json` | new-with-rationale | USF-1015 shared-client consumption acceptance criteria and `docs/architecture/app-surface-shared-client-consumption-path.json` | Defines a dependency-free private workspace boundary for the bounded local shared-client consumption adapter without package publication, external packages, global install state, provider setup, deployment, staging, store setup, or production readiness claims. |
| `packages/client/src/index.ts` | new-with-rationale | USF-1015 shared-client consumption acceptance criteria, `docs/adr/0018-shared-client-sdk-adapter-strategy.md`, `docs/architecture/shared-client-sdk-semantic-surface.json`, `docs/architecture/shared-client-interaction-contract-semantics.json`, and `docs/architecture/generated-client-contract-validation-semantics.json` | Implements a local fail-closed adapter validator over repository-owned shared-client mappings. It rejects stale generated-client inputs, missing semantic inputs, missing permission or audit semantics, and UI-only invented behaviour. It imports no external provider, creates no credentials, performs no network call, publishes no SDK, and claims no generated-client readiness. |
| `tests/packages/app-surface-shared-client-consumption.test.ts` | new-with-rationale | USF-1015 Test contract proof requirements and `docs/architecture/app-surface-shared-client-consumption-path.json` | Provides local contract tests proving the shared-client consumption mapping passes when governed and fails closed for stale generated-client input, missing semantic input, missing permission or audit semantics, and UI-only invented behaviour. |
| `packages/app-surface/package.json` | new-with-rationale | USF-1016 local in-memory runtime acceptance criteria and `docs/architecture/app-surface-local-in-memory-runtime.json` | Defines a dependency-free private workspace package for bounded local app-surface runtime proof without external packages, provider setup, credentials, deployment, staging, or production readiness claims. |
| `packages/app-surface/src/index.ts` | new-with-rationale | USF-1016 local in-memory runtime acceptance criteria, `docs/architecture/app-surface-local-in-memory-runtime.json`, and `docs/architecture/app-surface-shared-client-consumption-path.json` | Implements a local in-memory component-fixture runtime validator and runner. It fails closed on missing capability or permission semantics, rejects external provider or credential-shaped configuration, performs no network calls, and claims no web, mobile, staging, deployment, production, or live-provider readiness. |
| `tests/packages/app-surface-local-in-memory-runtime.test.ts` | new-with-rationale | USF-1016 Dev local runtime proof requirements and `docs/architecture/app-surface-local-in-memory-runtime.json` | Provides local unit tests proving governed component fixtures exercise in memory only, missing capability or permission semantics fail closed, external provider configuration is rejected, and non-claims are preserved. |

## App-Surface Authority and Validator Support Files

| Target file | Treatment | Source-use basis | Rationale |
|---|---|---|---|
| `docs/architecture/app-surface-workspace-package-boundaries.json` | evidence-only-support | USF-1014 package-boundary acceptance criteria | Machine-readable repository artefact classifying app-surface package boundaries, owner issues, package/dependency policy, external-service restrictions, proof level, and future-to-create paths. |
| `docs/architecture/app-surface-shared-client-consumption-path.json` | evidence-only-support | USF-1015 shared-client consumption acceptance criteria | Machine-readable repository artefact mapping the bounded local shared-client adapter to semantic contracts, generated-client currentness, capability, command, query, validation, permission, audit, privacy, telemetry, proof references, fail-closed behaviour, and non-claims. |
| `docs/architecture/app-surface-local-in-memory-runtime.json` | evidence-only-support | USF-1016 local in-memory runtime acceptance criteria | Machine-readable repository artefact mapping local component fixtures to capability, tenant, permission, command, query, validation, error, and audit semantics, with explicit in-memory adapter boundaries and non-claims. |
| `docs/architecture/app-surface-source-use-disposition-matrix.md` | evidence-only-support | USF-1014 package-boundary acceptance criteria | Records source-use disposition coverage for app-surface package-boundary files. |
| `docs/architecture/target-implementation-topology-plan.md` | evidence-only-support | USF implementation topology guardrail | Adds narrow app-surface topology authority for `packages/ui/package.json`, the USF-1015 local shared-client consumption files, and the USF-1016 local in-memory runtime files only; later app/runtime paths remain blocked until their owner issues update topology and source-use coverage. |
| `tools/validate-parity/validate-observability.py` | evidence-only-support | USF-225 browser telemetry guardrail and USF-1014 app-surface package-boundary authority | Preserves the product UI/browser path prohibition while allowing only the dependency-free `packages/ui/package.json` metadata boundary authorised by USF-1014. |
| `tools/validate-spec/validate-spec.py` | evidence-only-support | USF implementation path validator | Extends validator-enforced authorised implementation roots to include only the `packages/ui` app-surface boundary authorised by USF-1014, the `packages/client` shared-client adapter boundary authorised by USF-1015, and the `packages/app-surface` local in-memory runtime boundary authorised by USF-1016. |

## Non-Claims Preserved

- Only the USF-1016 dependency-free local in-memory app-surface runtime is authorised by this matrix.
- No web app scaffold is authorised by this matrix.
- No mobile app scaffold is authorised by this matrix.
- No external provider, credential, deployment, staging, store, live push, ads, CMP, analytics, monetisation, production, compliance, or human-acceptance readiness is claimed.
- `apps/web` and `apps/mobile` remain future-to-create paths owned by their separate Linear issues and require their own topology, source-use, and validation coverage before files are created.
- `packages/client` exists only as the USF-1015 bounded local shared-client consumption adapter and does not create generated SDK readiness, package publication readiness, product UI readiness, public API readiness, deployment readiness, staging readiness, production readiness, live-provider readiness, compliance readiness, monetisation readiness, or human acceptance.
- `packages/app-surface` exists only as the USF-1016 bounded local in-memory runtime and does not create web readiness, mobile readiness, route scaffold readiness, product UI readiness, deployment readiness, staging readiness, production readiness, live-provider readiness, compliance readiness, monetisation readiness, or human acceptance.
