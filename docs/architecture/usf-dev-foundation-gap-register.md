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
| P0-001 | USF-133 closure tier needs executable repository evidence before any closure claim                    | USF-166 adds `docs/architecture/usf-133-closure-tier-evidence-gate.json` and `docs/architecture/usf-133-closure-tier-evidence-gate.md` as a bounded source-issue evidence gate. The gate records the selected risk-based tier, required service/capability dispositions, proof commands, validator wiring, enterprise/SoA-support references, assurance maturity, exception rows, promotion impact, future evidence-package shape, source/deferred issues, substitutes, non-equivalence boundaries, negative assurance, and status-integrity rules. USF-193 remains the formal tracker for dev/test/staging/production promotion definitions; PR #133 only makes the closure-tier gate able to consume that future standard. | USF-133 remains open; the gate does not claim full dev, test, staging, production, deployment, live-provider, SOC, ISO, enterprise production, full React parity, ASVS conformance, NIST compliance, or USF-133 closure readiness. |
| P0-002 | Universal React compose services are not all implemented, equivalently substituted, or Linear-tracked | Create exact child blockers or human decisions for every grade C/D service row.                                                                                                                                                                                                                                                                                                                                                                                                               | No universal dev foundation claim.                                                                                                                                                                             |
| P0-003 | Durable service catalogue/CMDB posture needed semantic authority and enforcement                      | `spec/instances/compose-service/service-catalogue.json` is now the semantic service catalogue authority, with service-level owner/risk/control/evidence/non-claim metadata governed by `spec/schemas/compose-service.schema.json` and `tools/validate-compose/validate-compose.py`.                                                                                                                                                                                                           | This addresses the catalogue-asset gap only; it does not close USF-133 or claim full dev, test, staging, production, SOC, ISO, or live-provider readiness.                                                     |
| P0-004 | API and worker runtime proof needed explicit in-memory and compose-backed modes                       | USF-181 adds bounded API/worker proof. USF-183 updates `spec/instances/runtime-proof/runtime-application-compose-parity.json`, `runtime:proof:*`, and `tools/validate-runtime/validate-runtime.py` so compose-backed mode proves SDK-backed Postgres, Keycloak, Mailpit, MinIO, NATS, OpenBao, and Temporal runtime provider bindings with readiness retry, value-free evidence, adapter-boundary validation, and independent collision-free tenant/key/name path evidence for MinIO/OpenBao. | This addresses bounded runtime provider binding proof only; it does not close USF-133 or claim full dev, test, staging, production, SOC, ISO, live-provider, operator-surface, or full React parity readiness. |

## P1 Blockers Before Universal Dev Foundation Claim

| ID     | Gap                                                     | Required action                                                                                                                                            | Boundary                                      |
| ------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| P1-001 | Sentry service parity unresolved                        | USF-187 records Sentry as a shared error-assurance control-plane disposition with owner/risk/control owner metadata, risk treatment, evidence mapping, and deferred USF-170 proof for event capture, redaction, tenant-safe labels, retention, alert handoff, and operator access. | No SOC/SIEM/error-monitoring readiness claim. |
| P1-002 | SonarQube quality gate parity unresolved                | USF-187 records SonarQube/static analysis as a shared assurance control-plane disposition with local deterministic verification kept non-equivalent to deferred USF-171 SonarQube service proof, quality-gate scope, exception handling, and operator access. | No SonarQube, test-readiness, SOC, or ISO certification claim. |
| P1-003 | ClickHouse analytics/event-store parity unresolved      | USF-189 records an explicit deferred provider disposition linked to USF-172; future work must add adapter proof before stronger claims.                     | No ClickHouse/event-store readiness claim.    |
| P1-004 | Redis/cache parity unresolved                           | USF-189 records an explicit deferred provider disposition linked to USF-173; NATS and in-memory stores are not Redis cache equivalence.                     | No Redis service equivalence claim.           |
| P1-005 | Meilisearch/search provider parity unresolved           | USF-189 records an explicit deferred provider disposition linked to USF-174; in-memory search proof is not Meilisearch provider proof.                      | No live/vector/AI search readiness claim.     |
| P1-006 | ClamAV composed file scanning absent                    | USF-189 records an explicit deferred provider disposition linked to USF-175; deterministic scan markers are not ClamAV provider proof.                      | No live malware scanning readiness claim.     |
| P1-007 | LocalStack and WireMock mock-provider parity unresolved | USF-189 records explicit deferred provider dispositions linked to USF-176 for LocalStack, WireMock, and webhook sink capture.                               | No external-provider mock completeness claim. |
| P1-008 | pgBackRest backup/restore proof absent                  | USF-189 records an explicit deferred provider disposition linked to USF-177; documentation or fixture evidence is not restore proof.                        | No backup/restore readiness claim.            |
| P1-009 | Windmill operator automation parity unresolved          | USF-189 records an explicit deferred provider disposition linked to USF-178; Temporal application workflow proof is not Windmill automation proof.          | No operator automation readiness claim.       |
| P1-010 | Operator/admin surface catalogue incomplete             | USF-186 adds `docs/architecture/operator-access-gateway-posture-matrix.json` and `USF-ENTERPRISE-014` so pgAdmin, MinIO, Grafana, Temporal UI, Sentry, SonarQube, Windmill, Mailpit, OpenBao, Prometheus, Loki, Tempo, Alertmanager, Keycloak, and Caddy have machine-checkable owner/auth/audit/break-glass/exposure/deferred-risk posture. Runtime access proof, executed access reviews, and clickthrough UX remain deferred to USF-169 and USF-180. | No operator console readiness, test readiness, staging readiness, production readiness, public exposure, live-provider, SOC, ISO, full dev readiness, or full React parity claim. |
| P1-011 | Shared security scanning posture incomplete             | USF-187 defines a security-scanning posture for static analysis, compose security checks, dependency advisory review, and vulnerability triage; stronger scanner-service proof, exceptions, and operating evidence remain deferred to USF-171/USF-187 follow-up evidence. | No live scanner, vulnerability-clearance, deployment-readiness, SOC, or ISO certification claim. |


## P2 Follow-Ups Before Broader Environment or Operator Readiness

| ID     | Gap                                                           | Required action                                                  | Boundary                               |
| ------ | ------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------- |
| P2-001 | Alertmanager and Alloy composed observability services require operations evidence depth | Lane 4 adds `usf-188` enterprise evidence rows, an observability operations metadata instance, and validator coverage for telemetry, redaction, unsafe logs, and incident boundaries. Alert delivery, dashboard runtime, and incident workflow readiness remain deferred to USF-159 with owner/risk/treatment/review metadata. | No live alerting, dashboard, incident-response, SIEM, staging, production, SOC, ISO, full dev, or full React parity claim. |
| P2-002 | Gateway/forward-auth clickthrough absent                      | USF-186 records Caddy gateway posture as loopback-only, no public/LAN exposure, operator-auth-required, operator-action-audit-required, and defined-only clickthrough boundary. No UI or route implementation is created by this lane; future gateway/clickthrough proof remains under USF-180. | No gateway readiness, clickthrough readiness, UI readiness, test readiness, staging readiness, production readiness, deployment readiness, or public exposure claim. |
| P2-003 | Temporal UI absent                                            | Decide if workflow operator UI is in dev foundation.             | No operator UI readiness claim.        |
| P2-004 | GraphQL compatibility surface unresolved                      | Decide REST/OpenAPI only versus GraphQL compatibility.           | No external-client/API platform claim. |
| P2-005 | i18n/runtime and future UI readiness unresolved               | Carry under USF-134 or a future API/UI issue.                    | No UI readiness claim.                 |

## Requires Human Decision

| ID     | Decision required                                                            |
| ------ | ---------------------------------------------------------------------------- |
| HD-001 | Accepted for USF-166 execution: the closure tier is a bounded source-issue evidence gate, not a full readiness claim or USF-133 closure. |
| HD-002 | Does ClickHouse remain required for universal local/dev platform parity?     |
| HD-003 | Accepted decision: SonarQube/static analysis is split between mandatory local deterministic verification and deferred shared service proof where SonarQube semantics are claimed. |
| HD-004 | Accepted decision: Sentry/error monitoring remains a shared error-assurance control plane where Sentry semantics are claimed, with service proof deferred under USF-170. |
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
| React parity: operational service decisions                 | Complete or defer remaining evidence for Sentry, SonarQube, security scanning, ClickHouse, Redis, Meilisearch, ClamAV, LocalStack, WireMock, Windmill, pgAdmin, pgBackRest.                                                                                                       | P1                         |
| React parity: operator/admin surface posture                | Define admin console set, authn/authz, tenant safety, and future ops UI boundaries.                                                                                                                                                                                               | P1                         |
| React parity: alerting, dashboard, incident posture depth   | Resolve Alertmanager, Alloy, dashboards, alert routing, and incident evidence depth.                                                                                                                                                                                              | P2                         |

## Cleanup-To-Implementation Orchestration

`docs/architecture/usf-dev-readiness-cleanup-orchestration.md` records the cleanup-to-implementation readiness pass for the remaining USF-133 lanes. It keeps decision-titled issues open, re-scopes them into executable proof, validator, documentation, matrix, and evidence work, and requires a coordinator evidence pack before implementation prompts are issued.

This orchestration pass is planning and issue hygiene only. It does not authorise runtime, source, provider, schema, validator, or semantic behaviour implementation. It does not claim full dev readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, test readiness, or full React parity. It does not close USF-133.

## Validator Recommendations

- `tools/validate-compose/validate-compose.py` checks every React compose service has a service-catalogue classification and generated Compose remains derivative.
- `docs/architecture/compose-service-disposition-closure-matrix.json` records Lane 1 service-disposition closure evidence for each semantic service-catalogue row.
- `tools/validate-parity/validate-parity.py` now fails service-disposition closure evidence when a closure-relevant service row is missing, a disposition is absent, an unresolved row lacks linked follow-up issues, proof evidence is missing, runtime proof is falsely treated as Compose service equivalence, or closure/readiness is overclaimed.
- `docs/architecture/usf-133-closure-tier-evidence-gate.json` records the USF-166 bounded source-issue closure-tier gate. `tools/validate-parity/validate-parity.py` fails when the gate is missing, a required service or capability disposition is missing, proof commands or validator linkage are absent, substitutes lack non-equivalence boundaries, source issue Done is implied, USF-133 closure is implied, or readiness/certification claims are overclaimed.
- `spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json` records repository-level enterprise evidence organisation for SoA-support mappings, evidence-register rows, threat/abuse posture, SDK dependency governance, observability evidence standards, access review posture, resilience posture, incident/vulnerability evidence, privacy/data minimisation, done-state governance, and non-claims.
- `tools/validate-enterprise/validate-enterprise.py` fails lane work when enterprise evidence model coverage, commit/command/issue-linked evidence, SDK governance, threat posture, observability evidence standards, posture registers, done-state governance, Lane 1 closure-matrix enterprise linkage, Lane 3 assurance control-plane disposition, or assurance readiness/certification non-claims are missing.
- Lane 4 appends `usf-188` observability operations evidence rows and extends observability/enterprise validators so missing telemetry posture, raw secret leakage, unsafe logs, missing incident boundary, missing redaction, and overclaims fail closed.
- `docs/architecture/operator-access-gateway-posture-matrix.json` records USF-186 Lane 2 operator/admin/gateway access posture with effectiveness state, owners, authn/authz posture, audit posture, break-glass relevance, no public/LAN exposure, deferred risk treatment, change-management evidence, rollback/deferred boundary, privacy posture boundary, incident/vulnerability boundary, control/evidence references, and explicit non-claims.
- Lane 2 extends `tools/validate-enterprise/validate-enterprise.py` with `USF-ENTERPRISE-014` so missing or unsafe operator access/gateway posture fails closed without redefining Lane 4's `USF-ENTERPRISE-010`, Lane 6's `USF-ENTERPRISE-011`, or Lane 3's `USF-ENTERPRISE-012`/`USF-ENTERPRISE-013`.
- `tools/validate-runtime/validate-runtime.py` now fails USF-189 provider disposition gaps when missing provider proof or explicit deferral, hidden in-memory fallback, missing SDK boundary, unsafe readiness posture, or provider overclaim is introduced.
- Add a validator that rejects readiness overclaims in complete review artifacts.
- Planted defects cover missing service row, missing disposition, false closure, missing follow-up issue, missing proof evidence, false runtime-to-Compose equivalence, missing enterprise evidence linkage, missing SoA-support coverage, missing commit-pinned evidence, missing threat posture, SDK governance drift, observability evidence drift, done-state overclaim, readiness overclaim, public operator exposure, missing operator auth, missing operator audit, missing access owner, and operator access readiness overclaim.

## USF-186 Operator Access and Gateway Status

USF-186 adds a defined-only operator access and gateway posture matrix plus enterprise validator coverage. The posture is machine-checkable for operator/admin/control-plane/gateway service coverage, service-catalogue alignment, loopback-only local exposure, no public/LAN exposure, owner/risk/control ownership, auth requirement, audit requirement, break-glass relevance, deferred risk treatment, change-management evidence, rollback/deferred boundary, control/evidence references, incident/vulnerability posture, privacy/data minimisation posture, and explicit non-claims.

This closes the Lane 2 documentation and validator substrate only. It does not implement UI, clickthrough, runtime gateway routes, provider console integrations, access-review execution, privileged-operation audit runtime proof, public exposure, or live-provider evidence. USF-169 and USF-180 remain the follow-up issues for stronger access/gateway proof.

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

## USF-187 Lane 3 Shared Assurance Control-Plane Status

USF-187 appends Lane 3-owned enterprise rows with stable `usf-187` ids for:

- Sentry/error monitoring: `usf-187-sentry-error-monitoring-*`.
- SonarQube/static analysis: `usf-187-sonarqube-static-analysis-*`.
- Security scanning posture: `usf-187-security-scanning-*`.

Each bundle records SoA-support mapping, evidence register linkage, threat/abuse posture,
access review posture, risk-treatment/deferred-boundary posture, incident/vulnerability
posture, privacy/data-minimisation posture, owner, risk owner, control owner, effectiveness
state, risk statement, threat/failure scenario, affected asset/service, impact, likelihood,
treatment, review date, follow-up issue, validation command, and explicit non-claims.

Sentry and SonarQube closure-matrix rows remain closure-blocking and link to the Lane 3
enterprise evidence rows. Sentry runtime event capture, redaction, tenant-safe labels,
retention, alert handoff, and operator-console proof remain deferred under USF-170.
SonarQube service-semantic proof, quality-gate scope, unresolved issue handling, exceptions,
security hotspot treatment, and operator-console proof remain deferred under USF-171.
Security scanning is defined-only for this lane; live scanner provider proof, vulnerability
clearance, SAST/DAST completeness, secret-scanning completeness, and certification evidence are
not claimed.

`tools/validate-enterprise/validate-enterprise.py` enforces Lane 3 disposition with
USF-ENTERPRISE-011 and assurance overclaim prevention with USF-ENTERPRISE-012. Planted defects
`008-assurance-disposition-missing.json` and
`009-assurance-certification-overclaim.json` prove the validator catches hidden assurance gaps
and certification overclaims.
