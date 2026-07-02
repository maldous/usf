# Runtime Application Source-Use Disposition Matrix

| | |
|---|---|
| **Document type** | Governance / source-use disposition gate |
| **Status** | Draft / Foundational |
| **Authority level** | semantic-definition for source-use treatment only |
| **Issue scope** | USF-181, child of USF-133 |
| **Historical lineage** | `../react` compose, platform API, worker, and runtime proof command evidence only |

This matrix records source-use treatment for files touched by the USF-181 bounded
runtime proof. It is a source-use gate for validator coverage. It does not define
runtime semantics beyond the committed USF artefacts and validators.

No React runtime/application code is copied. No React path is mirrored. No full dev
readiness, full React parity, test readiness, staging readiness, production readiness,
live-provider readiness, SOC readiness, or ISO/IEC 27001 certification is claimed.

## Implementation Target Files

| Target file | Treatment | Source-use basis | Rationale |
|---|---|---|---|
| `apps/api/src/main.ts` | new-with-rationale | Existing USF API entry point and `../react` runtime proof command lineage as evidence only | Logs selected runtime proof mode and provider mode from the USF runtime instance; does not import React code. |
| `apps/api/src/runtime.ts` | source-derived-rewrite | Existing USF in-memory runtime stack and `../react` provider-mode proof lineage as evidence only | Adds explicit dev runtime mode metadata while keeping provider mode truthful as in-memory unless future composed provider bindings are implemented. |
| `apps/api/src/server.ts` | source-derived-rewrite | Existing USF API routes plus React tenant/auth/audit proof lineage as evidence only | Exposes runtime mode, service-catalogue traceability, and deferred boundaries on health/readiness responses without upgrading provider/readiness claims. |
| `apps/work/src/main.ts` | new-with-rationale | Existing USF worker entry point and React worker/proof command lineage as evidence only | Adds proof run-once behaviour for deterministic worker proof and keeps the long-running local worker path. |
| `apps/work/src/worker.ts` | source-derived-rewrite | Existing USF jobs service plus React worker/job proof lineage as evidence only | Reuses USF runtime job service to execute a synthetic tenant job and verify audit, tenant, and authorization boundaries. |
| `packages/contracts/src/index.ts` | source-derived-rewrite | Existing USF API contract schemas and React health/readiness contract lineage as evidence only | Adds runtime mode and service-catalogue proof metadata to health/readiness/tenant-context response schemas. |
| `packages/proof/src/dev-smoke.ts` | new-with-rationale | Existing USF dev smoke proof and React runtime proof command lineage as evidence only | Delegates to the in-memory runtime proof so dev smoke covers API and worker paths. |
| `packages/proof/src/index.ts` | new-with-rationale | Existing USF proof export pattern | Exports runtime proof functions for local proof reuse. |
| `packages/proof/src/runtime-application-proof.ts` | new-with-rationale | `../react` runtime proof command and compose proof lineage as evidence only | New USF proof-only harness for API/worker in-memory and compose-boundary dev runtime proof with deterministic teardown. |
| `packages/proof/src/composed-semantic-test-harness-proof.ts` | new-with-rationale | USF-236 test-readiness harness acceptance and the USF-235 service contract | Runs the existing composed runtime proof path against the canonical generated test Compose target, rejects in-memory service substitutes, and records bounded semantic test evidence without claiming final test readiness. |
| `tests/apps/worker.test.ts` | new-with-rationale | Existing USF worker test and React worker proof lineage as evidence only | Verifies the worker smoke proof summary, audit evidence, and fail-closed boundaries. |

## Governance And Validator Files

| Target file | Treatment | Source-use basis | Rationale |
|---|---|---|---|
| `spec/schemas/runtime-proof.schema.json` | new-with-rationale | Existing USF proof-evidence, command, and compose-service schema patterns | Governs the runtime proof manifest shape so the manifest is validator-checkable under `spec/instances`. |
| `spec/instances/runtime-proof/runtime-application-compose-parity.json` | new-with-rationale | Service catalogue authority and runtime proof command design | Records proof modes, commands, boundaries, deferred provider-binding posture, and explicit non-claims. |
| `spec/registries/schema-registry.json` | new-with-rationale | Existing schema registry pattern | Registers the runtime proof schema as draft runtime-proof evidence support. |
| `tools/validate-runtime/validate-runtime.py` | new-with-rationale | Existing USF validator and planted-defect patterns | Enforces USF-181 runtime proof manifest, command wiring, service-catalogue linkage, teardown, evidence boundaries, and non-claims. |
| `tools/validate-runtime/planted-defects/*.json` | new-with-rationale | Existing validator selftest pattern | Proves each runtime validator rule class fails closed. |
| `tools/validate-spec/validate-spec.py` | new-with-rationale | Existing enum binding validator | Binds the runtime proof evidence-grade enum to the existing controlled grade set. |
| `package.json` | new-with-rationale | Existing proof, parity, verify, and compose script pattern | Adds runtime proof and validation scripts and wires runtime validation into repository validation. |
| `Makefile` | new-with-rationale | Existing make proof target pattern | Adds runtime proof and validation targets. |

## Boundary Confirmation

USF-181 proves bounded dev runtime behaviour only. The compose-backed proof starts the
canonical dev Compose boundary and then starts API and worker runtimes against that
boundary, but the current runtime provider adapters remain in-memory. That deferred
provider-binding boundary is explicit in the runtime proof manifest and remains carried
by USF-133 until a later issue proves composed provider bindings.
