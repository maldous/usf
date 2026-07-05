# Runtime Compose Provider Binding

Document type: Architecture / runtime proof boundary.
Status: Draft / USF-183.
Authority level: Runtime proof interpretation; subordinate to the Charter, Authority Model,
service catalogue, schemas, validators, and executed proof output.

USF-183 resolves the USF-181 compose-provider deferral for the service-catalogue-required
runtime provider bindings that have USF runtime ports. The semantic service catalogue
authority remains `spec/instances/compose-service/service-catalogue.json`; generated Compose
files are derivative.

## Binding Scope

`dev-in-memory` remains hermetic and reports provider mode `dev in-memory`.

`dev-compose-backed` reports provider mode `local-composed-real-service` and proves these
SDK-backed adapter bindings:

| Binding                               | Service catalogue id      | Provider registry id                          | Adapter                              | SDK boundary                                                                                     | Proof                                                                                                                                                                                                                                   |
| ------------------------------------- | ------------------------- | --------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Postgres tenant-membership repository | `postgres`                | `database-postgres-composed-test`             | `PostgresTenantMembershipRepository` | `pg` in `adapters/db/src/index.ts`                                                               | API permission path refreshes tenant membership before synchronous PDP evaluation; worker write/readback                                                                                                                                |
| Mailpit notification provider         | `mailpit`                 | `notification-delivery-mailpit-composed-test` | `MailpitNotificationProvider`        | `mailpit-api` in `adapters/mail/src/index.ts`                                                    | Worker readiness, send, readback, and cleanup; API queues with composed provider metadata only                                                                                                                                          |
| NATS event bus                        | `nats`                    | `event-bus-nats-composed-test`                | `NatsEventBus`                       | `@nats-io/transport-node` in `adapters/bus/src/index.ts`                                         | API publish evidence; worker publish/readback and tenant-boundary evidence                                                                                                                                                              |
| MinIO object store                    | `minio`                   | `object-storage-minio-composed-test`          | `MinioObjectStore`                   | `minio` in `adapters/store/src/index.ts`                                                         | API object write/read; worker write/read/delete, collision-free base64url per-segment tenant/object path encoding, same-key tenant-collision evidence, same-tenant object-key-collision evidence, and tenant-boundary evidence          |
| Keycloak identity provider            | `keycloak`, `keycloak-db` | `identity-keycloak-composed-test`             | `KeycloakComposedIdentityProvider`   | `@keycloak/keycloak-admin-client` in `adapters/idp/src/index.ts`                                 | API synthetic login; worker synthetic identity readback and fail-closed tenant check                                                                                                                                                    |
| OpenBao secret provider               | `openbao`                 | `secret-store-openbao-composed-test`          | `OpenBaoSecretStore`                 | `node-vault` in `adapters/secrets/src/index.ts`                                                  | Worker synthetic secret write, describe, resolve, collision-free base64url per-segment tenant/secret path encoding, same-name tenant-collision evidence, same-tenant secret-name-collision evidence, tenant-boundary check, and cleanup |
| Temporal workflow provider            | `temporal`                | `workflow-engine-temporal-composed-test`      | `TemporalComposedWorkflowEngine`     | `@temporalio/client`, `@temporalio/worker`, `@temporalio/workflow` in `adapters/wf/src/index.ts` | Worker workflow schedule, one-shot worker execution, result readback, fail-closed input check, and connection cleanup                                                                                                                   |

Other composed services such as observability backends, operator consoles, quality gates,
mock-provider substrates, backup/restore services, scanner services, gateway surfaces, and
automation consoles are not runtime provider bindings in USF-183. They remain tracked under
USF-133 readiness disposition and do not receive readiness claims from this proof.

## Readiness And Evidence

Every implemented adapter has service-specific bounded readiness retry and fails closed if
readiness cannot be proven. Keycloak has a longer `120s` readiness budget; the other runtime
provider adapters use bounded exponential backoff with a `60s` readiness budget. Adapter
evidence distinguishes container startup, service readiness, adapter connection, runtime use,
operation outcome, retry counts, latency buckets, safe error codes, and cleanup.

Tenant-scoped provider paths are required to be collision-free. MinIO object keys and OpenBao
KV paths encode each tenant/object/secret segment with deterministic base64url encoding before
the segment is placed into the provider path. The composed worker proof includes independent
same-key/name tenant-collision probes and same-tenant key/name-collision probes, then verifies
distinct readback before cleanup.

Evidence is value-free. It records endpoint refs, hashes, counters, duration buckets, and safe
provider summaries only. It does not expose raw endpoints, connection strings, credentials,
tokens, provider payloads, stack traces, or SDK error payloads.

## SDK Selection

Selected SDK/client packages are exact-version pinned in `package.json`. SDK usage is confined
to adapter packages. Core, ports, capabilities, API route handlers, API runtime assembly, worker
orchestration, and PDP code do not import provider SDKs.

The SDK rationale is recorded in
`spec/instances/runtime-proof/runtime-application-compose-parity.json` under
`providerSdkBoundary`. Raw protocol calls, shell commands, direct socket code, and ad hoc HTTP
clients were rejected where a suitable SDK/client exists.

## Enterprise And ISO-Supporting Posture

The proof adds future evidence organisation support for provider asset inventory traceability,
owner/risk/control linkage, access-control evidence, tenant isolation evidence, audit event
production, secret-reference posture, credential redaction, local transport boundary,
change/promotion evidence, provider teardown evidence, incident-response evidence boundary,
supplier/subprocessor boundary for later external providers, and Statement of Applicability
support fields only.

It does not claim ISO/IEC 27001 certification, SOC readiness, enterprise production readiness,
staging readiness, production readiness, live-provider readiness, full dev readiness, test
readiness, or full product readiness.
