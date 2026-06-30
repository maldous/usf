# Runtime Application Compose Parity

Document type: Architecture / runtime proof boundary.
Status: Draft / USF-181, updated by USF-183.
Authority level: Runtime proof interpretation; subordinate to the Charter, Authority Model,
service catalogue, schemas, validators, and executed proof output.

This note documents the bounded USF API and worker runtime proof required by USF-181 and
the composed runtime provider-binding follow-up completed by USF-183.
Linear tracks the work only. The semantic service catalogue authority remains
`spec/instances/compose-service/service-catalogue.json`; generated Compose files remain
derivative.

## Proof Model

USF-181 defines two machine-checkable runtime modes:

| Mode                 | API proof                                                                                                                                                                                                            | Worker proof                                                                                                                                                                                                                                                                            | Compose boundary                                                       | Provider mode                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `dev-in-memory`      | `runtime:proof:in-memory` starts `apps/api/src/main.ts` on loopback with an ephemeral port and verifies health, readiness, OpenAPI, tenant mismatch, authorization denial, and audit evidence.                       | `runtime:proof:in-memory` starts `apps/work/src/main.ts` in run-once proof mode and verifies synthetic tenant job execution, tenant-boundary denial, authorization denial, and audit evidence.                                                                                          | Not required.                                                          | `dev in-memory`; provider class `hermetic-mock`.                                                        |
| `dev-compose-backed` | `runtime:proof:compose` starts the canonical dev Compose target first, then verifies active composed binding metadata and exercises Postgres, NATS, MinIO, and Keycloak through API paths where those ports surface. | `runtime:proof:compose` starts the canonical dev Compose target first, then executes SDK-backed Postgres, Mailpit, NATS, MinIO, Keycloak, OpenBao, and Temporal proof paths through adapter boundaries, including independent tenant and key/name collision evidence for MinIO/OpenBao. | `compose/compose.dev.generated.yaml`, traced to the service catalogue. | `local-composed-real-service`; all USF-183 runtime provider bindings use provider mode `composed-test`. |

The compose-backed proof is intentionally not a silent alias for in-memory proof: runtime
responses report `runtimeMode: dev-compose-backed`, provider mode
`local-composed-real-service`, and active Postgres, Keycloak, Mailpit, MinIO, NATS,
OpenBao, and Temporal provider bindings. The proof starts and tears down the canonical dev
Compose target and fails if runtime provider deferrals are hidden behind the compose-backed
mode.

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
- compose-backed deferred boundaries are missing;
- provider binding matrix or required composed runtime binding evidence is missing;
- provider SDK imports escape the authorised adapter boundary;
- readiness retry, metrics, tracing, audit, or redaction evidence markers are missing;
- provider proof metadata exposes raw endpoint or credential material;
- provider registry linkage or exact SDK pinning is missing;
- tenant-scoped provider paths use lossy normalisation instead of collision-free encoding
  evidence;
- tenant-collision and key/name-collision proof dimensions are collapsed into one combined
  probe.

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

## Provider Binding Boundary

USF-183 resolves bounded Postgres, Keycloak, Mailpit, MinIO, NATS, OpenBao, and Temporal
provider bindings for local composed proof. The implementation and SDK selection are documented in
`docs/architecture/runtime-compose-provider-binding.md`.
MinIO and OpenBao tenant-scoped provider paths encode each tenant/object/secret segment as
base64url before provider storage. Worker proof checks slash-separated and
underscore-separated source values remain distinct with same-key/name tenant probes and
same-tenant key/name probes.

Other composed services in the service catalogue remain outside this runtime-provider claim
unless they have a USF runtime port and proof command. Operator/admin surfaces, scanner
services, observability backends, backup/restore services, quality gates, mock-provider
substrates, gateways, and automation consoles remain under USF-133 disposition.

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
