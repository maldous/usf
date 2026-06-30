# USF Dev Foundation Gap Register

Document type: Architecture / docs-only gap register.
Status: Review draft.
Run: 20260629T053504Z-a285187.
React HEAD: a92d9734cf0f1f7a53f9093ce3bb3d2c02bfd767.
USF HEAD: a285187b177a922ff422858c1bf8f180336f1dff.

This register is derived from followup.txt and todo.txt plus source inspection. Linear tracks work only; this register does not define semantic authority. No Linear mutation was made in this pass.

## P0 Blockers Before USF-133 Closure

| ID     | Gap                                                                                                   | Required action                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Boundary                                                                                                                                                                                                       |
| ------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-001 | USF-133 closure bar is undefined between in-memory, minimal compose, and universal compose            | Human must accept the target readiness tier before USF-133 can close.                                                                                                                                                                                                                                                                                                                                                                                                                         | USF-133 remains open; no readiness claim.                                                                                                                                                                      |
| P0-002 | Universal React compose services are not all implemented, equivalently substituted, or Linear-tracked | Create exact child blockers or human decisions for every grade C/D service row.                                                                                                                                                                                                                                                                                                                                                                                                               | No universal dev foundation claim.                                                                                                                                                                             |
| P0-003 | Durable service catalogue/CMDB posture needed semantic authority and enforcement                      | `spec/instances/compose-service/service-catalogue.json` is now the semantic service catalogue authority, with service-level owner/risk/control/evidence/non-claim metadata governed by `spec/schemas/compose-service.schema.json` and `tools/validate-compose/validate-compose.py`.                                                                                                                                                                                                           | This addresses the catalogue-asset gap only; it does not close USF-133 or claim full dev, test, staging, production, SOC, ISO, or live-provider readiness.                                                     |
| P0-004 | API and worker runtime proof needed explicit in-memory and compose-backed modes                       | USF-181 adds bounded API/worker proof. USF-183 updates `spec/instances/runtime-proof/runtime-application-compose-parity.json`, `runtime:proof:*`, and `tools/validate-runtime/validate-runtime.py` so compose-backed mode proves SDK-backed Postgres, Keycloak, Mailpit, MinIO, NATS, OpenBao, and Temporal runtime provider bindings with readiness retry, value-free evidence, adapter-boundary validation, and independent collision-free tenant/key/name path evidence for MinIO/OpenBao. | This addresses bounded runtime provider binding proof only; it does not close USF-133 or claim full dev, test, staging, production, SOC, ISO, live-provider, operator-surface, or full React parity readiness. |

## P1 Blockers Before Universal Dev Foundation Claim

| ID     | Gap                                                     | Required action                                                                                                                                            | Boundary                                      |
| ------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| P1-001 | Sentry service parity unresolved                        | Decide whether USF telemetry proof substitutes for Sentry or create deferred error-monitoring blocker.                                                     | No SOC/SIEM/error-monitoring readiness claim. |
| P1-002 | SonarQube quality gate parity unresolved                | Decide whether make verify substitutes for SonarQube or create quality-gate service blocker.                                                               | No SonarQube readiness claim.                 |
| P1-003 | ClickHouse analytics/event-store parity unresolved      | Decide include/defer for analytics/event-store capability.                                                                                                 | No ClickHouse/event-store readiness claim.    |
| P1-004 | Redis/cache parity unresolved                           | Decide if NATS/in-memory stores are sufficient or Redis remains required.                                                                                  | No Redis service equivalence claim.           |
| P1-005 | Meilisearch/search provider parity unresolved           | Decide whether in-memory search proof is sufficient or composed search provider is required.                                                               | No live/vector/AI search readiness claim.     |
| P1-006 | ClamAV composed file scanning absent                    | Implement or explicitly defer composed scan provider proof.                                                                                                | No live malware scanning readiness claim.     |
| P1-007 | LocalStack and WireMock mock-provider parity unresolved | Decide deterministic mock provider requirements.                                                                                                           | No external-provider mock completeness claim. |
| P1-008 | pgBackRest backup/restore proof absent                  | Create backup/restore deferred depth or implementation authority.                                                                                          | No backup/restore readiness claim.            |
| P1-009 | Windmill operator automation parity unresolved          | Decide if Temporal/jobs proof substitutes or Windmill remains required.                                                                                    | No operator automation readiness claim.       |
| P1-010 | Operator/admin surface catalogue incomplete             | Catalog pgAdmin, MinIO console, Grafana, Temporal UI, Sentry, SonarQube, Windmill, Mailpit, OpenBao, Prometheus, Loki, Tempo, Alertmanager access posture. | No operator console readiness claim.          |

## P2 Follow-Ups Before Broader Environment or Operator Readiness

| ID     | Gap                                                           | Required action                                                  | Boundary                               |
| ------ | ------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------- |
| P2-001 | Alertmanager and Alloy composed observability services absent | Record as deferred or implement local alert routing/agent proof. | No live alerting claim.                |
| P2-002 | Gateway/forward-auth clickthrough absent                      | Decide local gateway and admin clickthrough posture.             | No gateway readiness claim.            |
| P2-003 | Temporal UI absent                                            | Decide if workflow operator UI is in dev foundation.             | No operator UI readiness claim.        |
| P2-004 | GraphQL compatibility surface unresolved                      | Decide REST/OpenAPI only versus GraphQL compatibility.           | No external-client/API platform claim. |
| P2-005 | i18n/runtime and future UI readiness unresolved               | Carry under USF-134 or a future API/UI issue.                    | No UI readiness claim.                 |

## Requires Human Decision

| ID     | Decision required                                                            |
| ------ | ---------------------------------------------------------------------------- |
| HD-001 | Which readiness tier is the closure bar for USF-133?                         |
| HD-002 | Does ClickHouse remain required for universal local/dev platform parity?     |
| HD-003 | Does SonarQube remain required or is make verify sufficient?                 |
| HD-004 | Does Sentry remain required or is USF telemetry proof sufficient?            |
| HD-005 | Does Meilisearch remain required or is in-memory/Postgres search sufficient? |
| HD-006 | Are LocalStack and WireMock required mock-provider substrates?               |
| HD-007 | Is ClamAV required as composed proof or deferred scanner posture?            |
| HD-008 | Is Windmill required as operator automation or deferred?                     |
| HD-009 | Which operator/admin surfaces must be present before closure?                |

## Draft Linear Plan

Recommended draft-only Linear work, if accepted by a human in a later apply-mode request:

| Draft issue                                                 | Purpose                                                                                                                                                                                                                                                                           | Priority                   |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| React parity: universal compose service disposition closure | Create exact trackers for all grade C/D compose service rows and close or defer them truthfully.                                                                                                                                                                                  | P0                         |
| React parity: service catalogue and trust-boundary review   | Keep the semantic service catalogue current as service decisions change; use validators to prevent metadata, evidence, and non-claim drift.                                                                                                                                       | P0 follow-up governance    |
| React parity: non-runtime composed service disposition      | USF-183 proves the service-catalogue-required runtime provider bindings that have USF runtime ports. Operator surfaces, backup/restore, scanner, observability backend, quality-gate, mock-provider, gateway, and automation service disposition still require USF-133 decisions. | P0 follow-up under USF-133 |
| React parity: operational service decisions                 | Resolve Sentry, SonarQube, ClickHouse, Redis, Meilisearch, ClamAV, LocalStack, WireMock, Windmill, pgAdmin, pgBackRest.                                                                                                                                                           | P1                         |
| React parity: operator/admin surface posture                | Define admin console set, authn/authz, tenant safety, and future ops UI boundaries.                                                                                                                                                                                               | P1                         |
| React parity: alerting, dashboard, incident posture depth   | Resolve Alertmanager, Alloy, dashboards, alert routing, and incident evidence depth.                                                                                                                                                                                              | P2                         |

## Cleanup-To-Implementation Orchestration

`docs/architecture/usf-dev-readiness-cleanup-orchestration.md` records the cleanup-to-implementation readiness pass for the remaining USF-133 lanes. It keeps decision-titled issues open, re-scopes them into executable proof, validator, documentation, matrix, and evidence work, and requires a coordinator evidence pack before implementation prompts are issued.

This orchestration pass is planning and issue hygiene only. It does not authorise runtime, source, provider, schema, validator, or semantic behaviour implementation. It does not claim full dev readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, test readiness, or full React parity. It does not close USF-133.

## Validator Recommendations

- Add a validator that checks every React compose service has a row in complete-react-to-usf-compose-service-parity-matrix.json.
- Add a closure-only validator mode that fails USF-133 closure if any service has evidence grade D or F without a Linear tracker or accepted human decision.
- Add a validator that rejects local/in-memory substitute rows claiming composed or live equivalence.
- Add a validator that rejects readiness overclaims in complete review artifacts.
- Add planted defects for missing service row, false equivalence, live readiness overclaim, and v2-bootstrap movement in docs-only review.

## No-Claim Boundary

This register does not claim full React parity readiness, universal dev readiness, staging, production, deployment, live provider, live monitoring, SOC, ISO, legal/regulatory, public API, AI/RAG, or production-live readiness.

## USF-168 Service Catalogue Status

`spec/instances/compose-service/service-catalogue.json` is the semantic authority for Compose service disposition. Generated Compose files are derivative outputs.

USF-168 adds service-level owner, risk owner, control owner, purpose, environment disposition, data classification, readiness tier, evidence grade, control purpose, asset inventory class, access posture, audit posture, secret posture, backup/restore posture, retention posture, tenant boundary, operational owner boundary, ISO/IEC 27001-supporting evidence posture, enterprise feature support posture, and explicit readiness allowed/prohibited claim metadata.

The catalogue supports asset inventory and Statement of Applicability evidence organisation only. It does not claim ISO/IEC 27001 certification, SOC readiness, staging readiness, production readiness, live-provider readiness, enterprise production readiness, full React parity, or full dev readiness.

## USF-181 / USF-183 Runtime Application Proof Status

`spec/instances/runtime-proof/runtime-application-compose-parity.json` records the bounded
runtime proof model for the USF API and worker. It is governed by
`spec/schemas/runtime-proof.schema.json` and enforced by
`tools/validate-runtime/validate-runtime.py`.

USF-181 adds two proof modes, updated by USF-183:

- `dev-in-memory`: API and worker start through their USF entry points, use the in-memory
  provider class, verify health/readiness/OpenAPI, tenant and authorization fail-closed
  behaviour, synthetic worker job execution, audit evidence, secret boundary, and
  synthetic-data boundary.
- `dev-compose-backed`: the canonical dev Compose target starts first, then the API and
  worker runtime proofs run with `runtimeMode` set to `dev-compose-backed` and provider
  mode `local-composed-real-service`. USF-183 binds Postgres, Keycloak, Mailpit, MinIO,
  NATS, OpenBao, and Temporal through exact-pinned SDK/client boundaries inside adapter
  packages. API proof exercises Postgres, NATS, MinIO, and Keycloak where API routes
  surface those ports; worker proof exercises all seven implemented provider bindings.
  MinIO and OpenBao worker evidence includes collision-free base64url per-segment provider
  path encoding for tenant-scoped object and secret paths, with tenant-only and key/name-only
  collision dimensions exercised separately.

Remaining gaps are outside the USF-183 runtime-provider binding claim. Operator/admin
surfaces, backup/restore, scanner, observability backend, quality-gate, mock-provider,
gateway, and automation service disposition remain under USF-133 closure decisions.

The runtime proof supports future enterprise evidence organisation for runtime assets,
owner/risk/control traceability through the service catalogue, audit evidence, health and
readiness evidence, tenant isolation, access-control fail-closed evidence, secret and
synthetic-data boundaries, teardown evidence, incident-response evidence boundary,
change-promotion evidence boundary, service-catalogue traceability, and Statement of
Applicability support fields.

This status does not claim ISO/IEC 27001 certification, SOC readiness, production
readiness, staging readiness, live-provider readiness, enterprise production readiness,
full dev readiness, test readiness, or full React parity.
