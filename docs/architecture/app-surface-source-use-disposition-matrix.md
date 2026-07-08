# App-Surface Source-Use Disposition Matrix

| | |
|---|---|
| **Document type** | Architecture / source-use disposition matrix |
| **Status** | Draft / USF-1014 package-boundary coverage |
| **Authority level** | Reviewable source-use matrix; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, runtime proof evidence, semantic instances, and the app-surface implementation realisation plan |
| **Issue scope** | USF-1014 |
| **Source row basis** | `docs/architecture/app-surface-implementation-realisation-plan.json`, `docs/architecture/app-surface-workspace-package-boundaries.json`, `docs/architecture/target-implementation-topology-plan.md` |

This matrix records target-file treatment for bounded app-surface workspace/package boundary work. It does not authorise broad app runtime implementation, web/mobile scaffolds, generated-client consumption, external provider setup, deployment, staging, store setup, live-provider integration, production readiness, monetisation readiness, or direct runtime/application code import from source lineage.

## Treatment Rules

- `source-derived-adapt`: freshly authored implementation informed by cited historical behaviour or provider inventory. No source code or configuration is copied.
- `source-derived-rewrite`: freshly authored implementation that rewrites semantic intent from lineage. No source code or configuration is copied.
- `new-with-rationale`: freshly authored file required by USF app-surface local package-boundary work, with no direct source row driving implementation.
- `evidence-only-support`: non-runtime validation, proof, test, documentation, or configuration support. It cannot import runtime code from evidence-only rows.

## USF-1014 Package-Boundary Files

| Target file | Treatment | Source-use basis | Rationale |
|---|---|---|---|
| `packages/ui/package.json` | new-with-rationale | USF-1014 workspace/package boundary acceptance criteria and `docs/architecture/app-surface-workspace-package-boundaries.json` | Defines a dependency-free private workspace boundary for future app-surface UI primitives without runtime implementation, external packages, global install state, provider setup, deployment, staging, store setup, or production readiness claims. |

## USF-1014 Authority and Validator Support Files

| Target file | Treatment | Source-use basis | Rationale |
|---|---|---|---|
| `docs/architecture/app-surface-workspace-package-boundaries.json` | evidence-only-support | USF-1014 package-boundary acceptance criteria | Machine-readable repository artefact classifying app-surface package boundaries, owner issues, package/dependency policy, external-service restrictions, proof level, and future-to-create paths. |
| `docs/architecture/app-surface-source-use-disposition-matrix.md` | evidence-only-support | USF-1014 package-boundary acceptance criteria | Records source-use disposition coverage for app-surface package-boundary files. |
| `docs/architecture/target-implementation-topology-plan.md` | evidence-only-support | USF implementation topology guardrail | Adds narrow app-surface boundary topology authority for `packages/ui/package.json` only; later app/runtime paths remain blocked until their owner issues update topology and source-use coverage. |
| `tools/validate-parity/validate-observability.py` | evidence-only-support | USF-225 browser telemetry guardrail and USF-1014 app-surface package-boundary authority | Preserves the product UI/browser path prohibition while allowing only the dependency-free `packages/ui/package.json` metadata boundary authorised by USF-1014. |
| `tools/validate-spec/validate-spec.py` | evidence-only-support | USF implementation path validator | Extends validator-enforced authorised implementation roots to include only the `packages/ui` app-surface boundary authorised by USF-1014. |

## Non-Claims Preserved

- No app runtime implementation is authorised by this matrix.
- No web app scaffold is authorised by this matrix.
- No mobile app scaffold is authorised by this matrix.
- No generated client consumption path is implemented by this matrix.
- No external provider, credential, deployment, staging, store, live push, ads, CMP, analytics, monetisation, production, compliance, or human-acceptance readiness is claimed.
- `apps/web`, `apps/mobile`, `packages/client`, and `packages/app-surface` remain future-to-create paths owned by their separate Linear issues and require their own topology, source-use, and validation coverage before files are created.
