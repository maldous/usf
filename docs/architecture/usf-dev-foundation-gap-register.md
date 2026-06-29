# USF Dev Foundation Gap Register

Document type: Architecture / docs-only gap register.
Status: Review draft.
Run: 20260629T053504Z-a285187.
React HEAD: a92d9734cf0f1f7a53f9093ce3bb3d2c02bfd767.
USF HEAD: a285187b177a922ff422858c1bf8f180336f1dff.

This register is derived from followup.txt and todo.txt plus source inspection. Linear tracks work only; this register does not define semantic authority. No Linear mutation was made in this pass.

## P0 Blockers Before USF-133 Closure

| ID | Gap | Required action | Boundary |
| --- | --- | --- | --- |
| P0-001 | USF-133 closure bar is undefined between in-memory, minimal compose, and universal compose | Human must accept the target readiness tier before USF-133 can close. | USF-133 remains open; no readiness claim. |
| P0-002 | Universal React compose services are not all implemented, equivalently substituted, or Linear-tracked | Create exact child blockers or human decisions for every grade C/D service row. | No universal dev foundation claim. |
| P0-003 | Durable service catalogue/CMDB posture is only this review matrix | Promote or replace the matrix with an accepted service-catalog artefact if required for closure. | Do not treat this generated review as semantic authority. |

## P1 Blockers Before Universal Dev Foundation Claim

| ID | Gap | Required action | Boundary |
| --- | --- | --- | --- |
| P1-001 | Sentry service parity unresolved | Decide whether USF telemetry proof substitutes for Sentry or create deferred error-monitoring blocker. | No SOC/SIEM/error-monitoring readiness claim. |
| P1-002 | SonarQube quality gate parity unresolved | Decide whether make verify substitutes for SonarQube or create quality-gate service blocker. | No SonarQube readiness claim. |
| P1-003 | ClickHouse analytics/event-store parity unresolved | Decide include/defer for analytics/event-store capability. | No ClickHouse/event-store readiness claim. |
| P1-004 | Redis/cache parity unresolved | Decide if NATS/in-memory stores are sufficient or Redis remains required. | No Redis service equivalence claim. |
| P1-005 | Meilisearch/search provider parity unresolved | Decide whether in-memory search proof is sufficient or composed search provider is required. | No live/vector/AI search readiness claim. |
| P1-006 | ClamAV composed file scanning absent | Implement or explicitly defer composed scan provider proof. | No live malware scanning readiness claim. |
| P1-007 | LocalStack and WireMock mock-provider parity unresolved | Decide deterministic mock provider requirements. | No external-provider mock completeness claim. |
| P1-008 | pgBackRest backup/restore proof absent | Create backup/restore deferred depth or implementation authority. | No backup/restore readiness claim. |
| P1-009 | Windmill operator automation parity unresolved | Decide if Temporal/jobs proof substitutes or Windmill remains required. | No operator automation readiness claim. |
| P1-010 | Operator/admin surface catalogue incomplete | Catalog pgAdmin, MinIO console, Grafana, Temporal UI, Sentry, SonarQube, Windmill, Mailpit, OpenBao, Prometheus, Loki, Tempo, Alertmanager access posture. | No operator console readiness claim. |

## P2 Follow-Ups Before Broader Environment or Operator Readiness

| ID | Gap | Required action | Boundary |
| --- | --- | --- | --- |
| P2-001 | Alertmanager and Alloy composed observability services absent | Record as deferred or implement local alert routing/agent proof. | No live alerting claim. |
| P2-002 | Gateway/forward-auth clickthrough absent | Decide local gateway and admin clickthrough posture. | No gateway readiness claim. |
| P2-003 | Temporal UI absent | Decide if workflow operator UI is in dev foundation. | No operator UI readiness claim. |
| P2-004 | GraphQL compatibility surface unresolved | Decide REST/OpenAPI only versus GraphQL compatibility. | No external-client/API platform claim. |
| P2-005 | i18n/runtime and future UI readiness unresolved | Carry under USF-134 or a future API/UI issue. | No UI readiness claim. |

## Requires Human Decision

| ID | Decision required |
| --- | --- |
| HD-001 | Which readiness tier is the closure bar for USF-133? |
| HD-002 | Does ClickHouse remain required for universal local/dev platform parity? |
| HD-003 | Does SonarQube remain required or is make verify sufficient? |
| HD-004 | Does Sentry remain required or is USF telemetry proof sufficient? |
| HD-005 | Does Meilisearch remain required or is in-memory/Postgres search sufficient? |
| HD-006 | Are LocalStack and WireMock required mock-provider substrates? |
| HD-007 | Is ClamAV required as composed proof or deferred scanner posture? |
| HD-008 | Is Windmill required as operator automation or deferred? |
| HD-009 | Which operator/admin surfaces must be present before closure? |

## Draft Linear Plan

Recommended draft-only Linear work, if accepted by a human in a later apply-mode request:

| Draft issue | Purpose | Priority |
| --- | --- | --- |
| React parity: universal compose service disposition closure | Create exact trackers for all grade C/D compose service rows and close or defer them truthfully. | P0 |
| React parity: service catalogue and trust-boundary review | Promote the review matrix into durable service catalogue/data-flow/control mapping posture. | P0 |
| React parity: operational service decisions | Resolve Sentry, SonarQube, ClickHouse, Redis, Meilisearch, ClamAV, LocalStack, WireMock, Windmill, pgAdmin, pgBackRest. | P1 |
| React parity: operator/admin surface posture | Define admin console set, authn/authz, tenant safety, and future ops UI boundaries. | P1 |
| React parity: alerting, dashboard, incident posture depth | Resolve Alertmanager, Alloy, dashboards, alert routing, and incident evidence depth. | P2 |

## Validator Recommendations

- Add a validator that checks every React compose service has a row in complete-react-to-usf-compose-service-parity-matrix.json.
- Add a closure-only validator mode that fails USF-133 closure if any service has evidence grade D or F without a Linear tracker or accepted human decision.
- Add a validator that rejects local/in-memory substitute rows claiming composed or live equivalence.
- Add a validator that rejects readiness overclaims in complete review artifacts.
- Add planted defects for missing service row, false equivalence, live readiness overclaim, and v2-bootstrap movement in docs-only review.

## No-Claim Boundary

This register does not claim full React parity readiness, universal dev readiness, staging, production, deployment, live provider, live monitoring, SOC, ISO, legal/regulatory, public API, AI/RAG, or production-live readiness.
