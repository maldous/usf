# Runtime Compose Provider Binding

Document type: Architecture / runtime proof boundary.
Status: Draft / USF-183.
Authority level: Runtime proof interpretation; subordinate to the Charter, Authority Model,
service catalogue, schemas, validators, and executed proof output.

USF-183 continues the USF-181 compose-provider deferral by proving bounded SDK-backed
Postgres tenant-membership repository and Mailpit notification provider bindings. The
semantic service catalogue authority remains
`spec/instances/compose-service/service-catalogue.json`; generated Compose files remain
derivative. Remaining provider bindings stay explicit deferrals unless separately removed
from scope by human-approved narrowing and linked follow-up work.

## Binding Scope

`dev-in-memory` remains hermetic and reports provider mode `dev in-memory`.

`dev-compose-backed` now reports provider mode `local-composed-real-service` and binds the
tenant-membership repository/directory boundary to composed Postgres and the notification
provider port to composed Mailpit:

| Binding                               | Service catalogue id | Provider registry id                          | Adapter                              | SDK boundary                                                | Proof                                                                                                                              |
| ------------------------------------- | -------------------- | --------------------------------------------- | ------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Postgres tenant-membership repository | `postgres`           | `database-postgres-composed-test`             | `PostgresTenantMembershipRepository` | `pg` imported only by `adapters/db/src/index.ts`            | API permission path refreshes tenant membership from Postgres before PDP evaluation; worker executes SDK-backed write and readback |
| Mailpit notification provider         | `mailpit`            | `notification-delivery-mailpit-composed-test` | `MailpitNotificationProvider`        | `mailpit-api` imported only by `adapters/mail/src/index.ts` | API safe-view binding evidence; worker SDK-backed readiness, write, readback, and cleanup evidence                                 |

Remaining composed dependencies are explicit deferrals or boundary-only records in
`spec/instances/runtime-proof/runtime-application-compose-parity.json`:

| Binding                            | Status                                    | Follow-up |
| ---------------------------------- | ----------------------------------------- | --------- |
| NATS event-bus binding             | no runtime adapter proof                  | USF-151   |
| MinIO object-store binding         | no runtime adapter proof                  | USF-147   |
| Keycloak runtime identity binding  | compose-boundary-only                     | USF-149   |
| OpenBao secret-provider binding    | no provider registry row or adapter proof | USF-145   |
| Temporal workflow provider binding | profile-gated                             | USF-151   |

## SDK Selection

`mailpit-api` version `2.1.0` is exact-version pinned. Registry metadata inspected on
2026-06-30 identified it as a maintained zero-dependency TypeScript Mailpit REST API client
with Node >=18 support, MIT licensing, ESM/CJS exports, and bundled declarations. It is used
because it provides service-specific Mailpit operations for readiness, synthetic message
write, readback, and cleanup.

Rejected alternatives:

- Raw HTTP or socket code: rejected because provider bindings must use an approved client boundary when one exists.
- Nodemailer: rejected for this proof because it is a generic SMTP client and does not provide Mailpit service readback and cleanup through the same service-specific client.
- `mailpit-ws`: rejected because deterministic provider proof does not need real-time event streaming.

The runtime validator and provider proof fail if `mailpit-api` is imported by core, ports,
capabilities, API routes, API runtime assembly, or worker orchestration.

`pg` version `8.22.0` is exact-version pinned with `@types/pg` version `8.20.0` for
TypeScript. Registry metadata inspected on 2026-06-30 identified `pg` as the maintained
de-facto standard Node PostgreSQL client with MIT licensing, Node >=16 support, GitHub
repository metadata, and publish/update activity in June 2026. It is used through
Kysely's Postgres dialect inside `adapters/db/src/index.ts` only.

Rejected alternatives:

- Raw TCP/socket or hand-rolled protocol calls: rejected because a maintained client exists.
- Shelling out to `psql`: rejected for runtime provider proof because the adapter binding must use a client boundary.
- `postgres.js`: rejected because the repo already has Kysely as the database query boundary and Kysely integrates directly with `pg`.

The runtime validator and provider proof fail if `pg` is imported by core, ports,
capabilities, API routes, API runtime assembly, or worker orchestration.

## Evidence Boundary

`runtime:proof:compose` starts `compose/compose.dev.generated.yaml`, waits for the Compose
boundary, prepares the Postgres schema and synthetic seed data through the DB adapter, starts
the API and worker runtimes, and tears everything down. The API proof checks that
health/readiness expose active Postgres and Mailpit bindings, then calls a permission-protected
route that refreshes membership through `PostgresTenantMembershipRepository` before PDP
evaluation. Notification API safe views record provider mode `composed-test` with provider ref
`notification-delivery-mailpit-composed-test`.

The worker proof executes actual adapter round trips through both composed providers:
Postgres tenant-safe membership write/readback through `pg`, and Mailpit SDK readiness check,
synthetic message write, SDK readback, and SDK cleanup. Evidence records endpoint refs,
hashes, row counts, and value-free summaries only. It does not expose raw endpoints,
connection strings, credentials, tokens, provider response payloads, stack traces, or message
bodies.

## Enterprise And ISO-Supporting Posture

This adds future evidence organisation support for provider asset inventory traceability,
owner/risk/control linkage, access-control evidence, tenant isolation evidence, audit event
production, secret-reference posture, credential redaction, local transport boundary,
change/promotion evidence, provider teardown evidence, incident-response evidence boundary,
supplier/subprocessor boundary for later external providers, and Statement of Applicability
support fields only.

It does not claim ISO/IEC 27001 certification, SOC readiness, enterprise production
readiness, staging readiness, production readiness, live-provider readiness, full dev
readiness, test readiness, or full React parity.
