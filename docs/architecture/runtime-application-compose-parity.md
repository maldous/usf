# Runtime Application Compose Parity

Document type: Architecture / runtime proof boundary.
Status: Draft / USF-181, updated by USF-183.
Authority level: Runtime proof interpretation; subordinate to the Charter, Authority Model,
service catalogue, schemas, validators, and executed proof output.

This note documents the bounded USF API and worker runtime proof required by USF-181 and
the Postgres and Mailpit provider-binding follow-up continued by USF-183.
Linear tracks the work only. The semantic service catalogue authority remains
`spec/instances/compose-service/service-catalogue.json`; generated Compose files remain
derivative.

## Proof Model

USF-181 defines two machine-checkable runtime modes:

| Mode                 | API proof                                                                                                                                                                                                                                    | Worker proof                                                                                                                                                                                                                         | Compose boundary                                                       | Provider mode                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev-in-memory`      | `runtime:proof:in-memory` starts `apps/api/src/main.ts` on loopback with an ephemeral port and verifies health, readiness, OpenAPI, tenant mismatch, authorization denial, and audit evidence.                                               | `runtime:proof:in-memory` starts `apps/work/src/main.ts` in run-once proof mode and verifies synthetic tenant job execution, tenant-boundary denial, authorization denial, and audit evidence.                                       | Not required.                                                          | `dev in-memory`; provider class `hermetic-mock`.                                                                                             |
| `dev-compose-backed` | `runtime:proof:compose` starts the canonical dev Compose target first, prepares Postgres through the DB adapter, then starts the API proof and verifies active Postgres and Mailpit binding metadata plus a Postgres-backed permission path. | `runtime:proof:compose` starts the canonical dev Compose target first, then starts the worker proof and executes SDK-backed Postgres write/readback plus Mailpit readiness, write, readback, and cleanup through adapter boundaries. | `compose/compose.dev.generated.yaml`, traced to the service catalogue. | `local-composed-real-service`; Postgres and Mailpit use provider mode `composed-test`, with remaining provider bindings explicitly deferred. |

The compose-backed proof is intentionally not a silent alias for in-memory proof: runtime
responses report `runtimeMode: dev-compose-backed`, provider mode
`local-composed-real-service`, and active Postgres and Mailpit provider bindings. The proof starts and
tears down the canonical dev Compose target and records unresolved provider bindings
separately.

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
- provider binding matrix or required Postgres/Mailpit binding evidence is missing;
- provider SDK imports escape the authorised adapter boundary;
- provider proof metadata exposes raw endpoint or credential material;
- provider registry linkage or exact SDK pinning is missing.

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

USF-183 resolves bounded Postgres tenant-membership repository and Mailpit notification
provider bindings for local composed proof. The implementation and SDK selection are documented in
`docs/architecture/runtime-compose-provider-binding.md`.

The manifest records the remaining deferred or boundary-only provider bindings for NATS,
MinIO, Keycloak, OpenBao, and Temporal. Those entries are carried by the open parent USF-133
and the named follow-up issues unless human-approved scope narrowing removes them from
USF-183 acceptance; they are not upgraded by the Postgres or Mailpit proof.

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
