# Runtime Application Compose Parity

Document type: Architecture / runtime proof boundary.
Status: Draft / USF-181.
Authority level: Runtime proof interpretation; subordinate to the Charter, Authority Model,
service catalogue, schemas, validators, and executed proof output.

This note documents the bounded USF API and worker runtime proof required by USF-181.
Linear tracks the work only. The semantic service catalogue authority remains
`spec/instances/compose-service/service-catalogue.json`; generated Compose files remain
derivative.

## Proof Model

USF-181 defines two machine-checkable runtime modes:

| Mode | API proof | Worker proof | Compose boundary | Provider mode |
|---|---|---|---|---|
| `dev-in-memory` | `runtime:proof:in-memory` starts `apps/api/src/main.ts` on loopback with an ephemeral port and verifies health, readiness, OpenAPI, tenant mismatch, authorization denial, and audit evidence. | `runtime:proof:in-memory` starts `apps/work/src/main.ts` in run-once proof mode and verifies synthetic tenant job execution, tenant-boundary denial, authorization denial, and audit evidence. | Not required. | `dev in-memory`; provider class `hermetic-mock`. |
| `dev-compose-backed` | `runtime:proof:compose` starts the canonical dev Compose target first, then starts the API proof against that running boundary. | `runtime:proof:compose` starts the canonical dev Compose target first, then starts the worker proof against that running boundary. | `compose/compose.dev.generated.yaml`, traced to the service catalogue. | `dev in-memory`; provider adapter binding to composed services is explicitly deferred. |

The compose-backed proof is intentionally not a silent alias for in-memory proof: runtime
responses report `runtimeMode: dev-compose-backed`, the proof starts and tears down the
canonical dev Compose target, and the manifest records the provider-binding deferral.

## Manifest And Validator

The runtime proof manifest is
`spec/instances/runtime-proof/runtime-application-compose-parity.json`, governed by
`spec/schemas/runtime-proof.schema.json`.

`tools/validate-runtime/validate-runtime.py` fails closed if:

- required runtime modes are missing;
- compose-backed mode is silently mapped to in-memory mode;
- API or worker proof surfaces are missing;
- proof commands are not wired through package scripts and Make targets;
- prohibited readiness/compliance/parity claims are allowed;
- compose-backed proof lacks service-catalogue linkage;
- proof code or manifest lacks teardown representation;
- audit, tenant, secret, access, and synthetic-data boundaries are missing;
- compose-backed deferred boundaries are missing.

Planted defects under `tools/validate-runtime/planted-defects/` exercise each rule class.

## Evidence Boundaries

The proof uses synthetic tenant, actor, and job data only. The API binds to loopback and
uses an ephemeral port. API and worker child processes are stopped in `finally` paths.
Compose-backed proof starts Docker Compose with a unique project name and always runs
Compose teardown with volume and orphan cleanup.

Audit evidence is bounded to the proof process:

- API proof requires tenant-context audit evidence.
- Worker proof requires job lifecycle and denial audit evidence.
- Audit output supports future evidence organisation only; it does not create a SOC,
ISO/IEC 27001, staging, production, or live-provider claim.

## Deferred Boundary

Current API and worker adapters remain in-memory in both modes. The compose-backed proof
proves the canonical dev Compose boundary can be started before API and worker runtime
execution, but it does not prove provider adapter binding to PostgreSQL, NATS, Temporal,
OpenBao, MinIO, or other composed services.

That deferred provider-binding boundary is recorded in the manifest and carried by the
open parent USF-133. Profile-gated workflow-provider and operator services remain
service-catalogue-tracked and require separate proof or decision before broader closure.

## Enterprise And ISO-Supporting Posture

The manifest supports future enterprise evidence organisation for:

- runtime asset evidence;
- owner, risk owner, and control owner linkage through the service catalogue;
- audit event production;
- health, readiness, and OpenAPI evidence;
- tenant isolation and fail-closed access-control evidence;
- secret and synthetic-data boundaries;
- operational teardown evidence;
- incident-response and change-promotion evidence boundaries;
- service-catalogue traceability;
- Statement of Applicability support fields.

This is support for future evidence organisation only. It is not ISO/IEC 27001
certification, SOC readiness, enterprise production readiness, live-provider readiness,
staging readiness, production readiness, full dev readiness, or full React parity.
