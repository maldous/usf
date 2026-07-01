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
| P0-002 | Universal React compose services are not all implemented, equivalently substituted, or Linear-tracked | USF-167 upgrades `docs/architecture/compose-service-disposition-closure-matrix.json` from a Lane 1 evidence matrix into a source-issue execution gate by linking each unresolved grade C/D service row to a downstream implementation/proof/source issue and by recording the environment-promotion standard dependency. `tools/validate-parity/validate-parity.py` rejects unresolved rows that only point back to USF-167, USF-166, USF-182, USF-185, USF-184, USF-192, or USF-133 instead of a downstream source owner. | No universal dev foundation, test, staging, production, live-provider, SOC, ISO, enterprise production, full React parity, or USF-133 closure claim. Downstream source issues remain open until their own acceptance criteria are proven. |
| P0-003 | Durable service catalogue/CMDB posture needed semantic authority and enforcement                      | `spec/instances/compose-service/service-catalogue.json` is now the semantic service catalogue authority, with service-level owner/risk/control/evidence/non-claim metadata governed by `spec/schemas/compose-service.schema.json` and `tools/validate-compose/validate-compose.py`.                                                                                                                                                                                                           | This addresses the catalogue-asset gap only; it does not close USF-133 or claim full dev, test, staging, production, SOC, ISO, or live-provider readiness.                                                     |
| P0-004 | API and worker runtime proof needed explicit in-memory and compose-backed modes                       | USF-181 adds bounded API/worker proof. USF-183 updates `spec/instances/runtime-proof/runtime-application-compose-parity.json`, `runtime:proof:*`, and `tools/validate-runtime/validate-runtime.py` so compose-backed mode proves SDK-backed Postgres, Keycloak, Mailpit, MinIO, NATS, OpenBao, and Temporal runtime provider bindings with readiness retry, value-free evidence, adapter-boundary validation, and independent collision-free tenant/key/name path evidence for MinIO/OpenBao. | This addresses bounded runtime provider binding proof only; it does not close USF-133 or claim full dev, test, staging, production, SOC, ISO, live-provider, operator-surface, or full React parity readiness. |
| P0-005 | Environment promotion semantics needed a repository-defined readiness gate standard                   | USF-193 adds `spec/instances/environment-promotion/environment-promotion-enterprise-standard.json`, `spec/schemas/environment-promotion.schema.json`, `docs/architecture/environment-promotion-enterprise-standard.md`, enterprise evidence rows, and validator coverage so dev, test, staging, and production are separated by environment class, provider mode, data posture, destructive semantics, evidence freshness, approval, and non-claim boundaries. | This defines promotion assessment gates only; it does not prove dev, test, staging, production, deployment, live-provider, SOC, ISO, enterprise production, full React parity, or USF-133 closure readiness. |

## P1 Blockers Before Universal Dev Foundation Claim

| ID     | Gap                                                     | Required action                                                                                                                                            | Boundary                                      |
| ------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| P1-001 | Sentry service parity unresolved                        | USF-170 records a bounded Sentry/error-monitoring disposition with local observability proof kept non-equivalent to Sentry service proof. USF-196 records the Sentry row as an explicit deferred service-proof boundary, and USF-205 owns actual event capture, redaction, tenant-safe labels, retention, alert handoff, incident, and operator-console proof. | No Sentry, SOC/SIEM/error-monitoring, live monitoring, incident, alerting, or environment readiness claim. |
| P1-002 | SonarQube quality gate parity unresolved                | USF-171 records a bounded SonarQube/static-analysis quality-gate disposition with local deterministic verification kept non-equivalent to SonarQube service proof. USF-195 records the SonarQube row as explicit deferred service proof, and USF-204 owns actual composed scan, quality-gate, security-hotspot, and operator-console proof. | No SonarQube, test-readiness, SOC, or ISO certification claim. |
| P1-003 | ClickHouse analytics/event-store proof bounded; runtime and readiness boundaries remain | USF-206 proves bounded SDK-backed local Compose ClickHouse analytics event-store semantics for synthetic ingestion, tenant-safe query, aggregation, invalid-classification denial, retention deletion, audit-shaped evidence, readiness retry, redaction, teardown, and unavailable-provider fail-closed behaviour. USF-172 keeps in-memory evidence non-equivalent, and USF-197 records the proof boundary lineage. API/worker analytics binding, live/provider-managed ClickHouse, environment promotion, provider compatibility, operator/access depth, backup/restore, and broader analytics readiness remain outside this proof. | No ClickHouse/event-store readiness, analytics readiness, live-provider, environment readiness, or USF-133 closure claim. |
| P1-004 | Redis/cache proof bounded; runtime and readiness boundaries remain | USF-207 proves bounded SDK-backed local Compose Redis cache operations, expiration, readiness retry, timeout, audit-shaped evidence, teardown, redaction, and provider failure mode evidence. USF-173 keeps NATS event-bus and in-memory evidence non-equivalent, and USF-198 records the proof boundary lineage. API/worker cache binding, live/provider-managed Redis, environment promotion, backup/restore, and operator/alerting depth remain outside this proof. | No Redis/cache/eventing readiness, live-provider, environment readiness, or USF-133 closure claim. |
| P1-005 | Meilisearch/search provider parity partially bounded    | USF-199 proves bounded SDK-backed local Compose Meilisearch service semantics for synthetic adapter-level indexing, tenant-filtered query, async task visibility, update/reindex boundary, deletion, cleanup, readiness retry, and redaction. API/worker runtime binding remains deferred because the current SearchIndexPort is synchronous while the Meilisearch SDK proof is async; ranking equivalence, vector search, AI/RAG, live-provider, environment readiness, and provider-compatibility readiness remain unclaimed. | No Meilisearch readiness, composed-search readiness, search-provider readiness, API/worker runtime search-binding readiness, vector/AI readiness, live-provider readiness, or environment readiness claim. |
| P1-006 | ClamAV live scanner and DLP depth absent                | USF-200 proves bounded SDK-backed local Compose ClamAV clean/infected scan outcomes, readiness retry, provider-unavailable fail-closed quarantine routing, quarantined download denial, deletion, tenant isolation, value-free audit evidence, redaction, and teardown for synthetic payloads. USF-175 keeps deterministic scan markers non-equivalent. Quarantine release workflow, signature freshness readiness, DLP, live scanner provider operation, API/worker runtime binding, and environment readiness remain deferred. | No ClamAV readiness, live malware scanning, DLP readiness, vulnerability-clearance readiness, test/staging/production readiness, SOC, ISO, full dev readiness, or full React parity claim. |
| P1-007 | Local mock-provider substrate remains bounded; webhook-sink, WireMock, and LocalStack local proofs present; mock OIDC selected-tier supersession recorded | USF-201 proves bounded webhook-sink local capture. USF-209 proves bounded WireMock configured HTTP mock semantics through a profile-gated local Compose proof and adapter-contained wiremock-captain SDK boundary. USF-208 proves bounded LocalStack S3, SQS, SNS, and Secrets Manager emulator semantics through a profile-gated local Compose proof and adapter-contained official AWS SDK v3 clients. USF-210 records historical mock OIDC service operation as superseded for the selected closure tier by hermetic identity and composed Keycloak proof evidence, without standalone mock OIDC service equivalence. | No local mock completeness, notification delivery, standalone mock OIDC service equivalence, external-provider compatibility, provider contract certification, SSO readiness, environment readiness, or live-provider readiness claim. |
| P1-008 | pgBackRest backup/restore proof absent                  | USF-177 records a bounded backup/restore disposition, and USF-202 records a blocked proof reclassification because the current generated image is not pullable and no configured repository, stanza, Postgres linkage, readiness retry, timeout, or restore drill boundary exists; USF-211 owns the image/configuration unblocker. DB/RLS/files proof, documentation, or fixture evidence is not backup artifact or restore drill proof. | No backup/restore or disaster recovery readiness claim. |
| P1-009 | Windmill operator automation parity unresolved          | USF-178 records a bounded operator workflow disposition, USF-203 records blocked reclassification, and USF-212 owns actual Windmill bootstrap and proof; Temporal application workflow proof, jobs proof, and worker runtime proof are not Windmill operator automation proof.          | No operator automation or Windmill readiness claim.       |
| P1-010 | Operator/admin surface catalogue incomplete             | USF-186 adds `docs/architecture/operator-access-gateway-posture-matrix.json` and `USF-ENTERPRISE-014` so pgAdmin, MinIO, Grafana, Temporal UI, Sentry, SonarQube, Windmill, Mailpit, OpenBao, Prometheus, Loki, Tempo, Alertmanager, Keycloak, and Caddy have machine-checkable owner/auth/audit/break-glass/exposure/deferred-risk posture. USF-169 adds hermetic API operator-access proof for provider posture and observability posture surfaces. Composed service console login, executed access reviews, gateway route proof, and clickthrough UX remain deferred. | No operator console readiness, test readiness, staging readiness, production readiness, public exposure, live-provider, SOC, ISO, full dev readiness, or full React parity claim. |
| P1-011 | Shared security scanning posture incomplete             | USF-187 defines a security-scanning posture for static analysis, compose security checks, dependency advisory review, and vulnerability triage; USF-171 records the bounded disposition gate and stronger scanner-service proof, exceptions, and operating evidence remain deferred to USF-195/USF-187 follow-up evidence. | No live scanner, vulnerability-clearance, deployment-readiness, SOC, or ISO certification claim. |


## P2 Follow-Ups Before Broader Environment or Operator Readiness

| ID     | Gap                                                           | Required action                                                  | Boundary                               |
| ------ | ------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------- |
| P2-001 | Alertmanager and Alloy composed observability services require operations evidence depth | Lane 4 adds `usf-188` enterprise evidence rows, an observability operations metadata instance, and validator coverage for telemetry, redaction, unsafe logs, and incident boundaries. Alert delivery, dashboard runtime, and incident workflow readiness remain deferred to USF-159 with owner/risk/treatment/review metadata. | No live alerting, dashboard, incident-response, SIEM, staging, production, SOC, ISO, full dev, or full React parity claim. |
| P2-002 | Gateway/forward-auth clickthrough absent                      | USF-186 records Caddy gateway posture as loopback-only, no public/LAN exposure, operator-auth-required, operator-action-audit-required, and defined-only clickthrough boundary. USF-180 adds `docs/architecture/gateway-clickthrough-access-substrate-matrix.json` plus enterprise validator coverage for gateway inclusion, trusted proxy and forwarded-header posture, SSO/local transport boundary, service-routing non-equivalence, clickthrough proof criteria, explicit deferral to USF-155, and source-issue evidence rows. No UI, gateway route, forward-auth, or clickthrough runtime implementation is created by USF-180. | No gateway readiness, clickthrough readiness, UI readiness, test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, or public exposure claim. |
| P2-003 | Temporal UI absent                                            | Decide if workflow operator UI is in dev foundation.             | No operator UI readiness claim.        |
| P2-004 | GraphQL compatibility surface unresolved                      | Decide REST/OpenAPI only versus GraphQL compatibility.           | No external-client/API platform claim. |
| P2-005 | i18n/runtime and future UI readiness unresolved               | Carry under USF-134 or a future API/UI issue.                    | No UI readiness claim.                 |

## Requires Human Decision

| ID     | Decision required                                                            |
| ------ | ---------------------------------------------------------------------------- |
| HD-001 | Accepted for USF-166 execution: the closure tier is a bounded source-issue evidence gate, not a full readiness claim or USF-133 closure. |
| HD-002 | Accepted decision: ClickHouse remains required where analytics event-store semantics are claimed. USF-206 provides bounded local Compose proof only; API/worker analytics binding, live/provider-managed ClickHouse, environment readiness, provider compatibility, and analytics readiness remain non-claims. |
| HD-003 | Accepted decision: SonarQube/static analysis is split between mandatory local deterministic verification and deferred shared service proof where SonarQube semantics are claimed. |
| HD-004 | Accepted decision: Sentry/error monitoring remains a shared error-assurance control plane where Sentry semantics are claimed; USF-170 records the bounded disposition gate, USF-196 records the explicit service-proof boundary, and actual proof remains deferred under USF-205. |
| HD-005 | Accepted decision: Search provider parity is split by semantic requirement; in-memory search is valid only where catalogue authority permits it. USF-199 adds bounded profile-gated local Compose Meilisearch service proof, while API/worker runtime binding and broader Meilisearch/search-provider readiness remain deferred and non-claimed. |
| HD-006 | Accepted decision: LocalStack remains a required mock-provider substrate, now bounded by USF-208 local cloud-emulator proof for S3, SQS, SNS, and Secrets Manager only. USF-209 records bounded WireMock configured HTTP mock proof only. USF-210 records mock OIDC selected-tier supersession only; future standalone mock OIDC service-equivalence proof requires a new source issue if closure-tier scope changes. |
| HD-007 | Accepted decision: file scanner provider parity is split by semantic requirement; deterministic scan markers are valid only where catalogue authority permits them. USF-200 proves bounded profile-gated local Compose ClamAV scanner semantics only; live scanner, DLP, signature freshness, API/worker runtime binding, and environment readiness remain non-claims. |
| HD-008 | Is Windmill required as operator automation or deferred?                     |
| HD-009 | Which operator/admin surfaces must be present before closure?                |

## Draft Linear Plan

Recommended draft-only Linear work, if accepted by a human in a later apply-mode request:

| Draft issue                                                 | Purpose                                                                                                                                                                                                                                                                           | Priority                   |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| React parity: universal compose service disposition closure | Create exact trackers for all grade C/D compose service rows and close or defer them truthfully.                                                                                                                                                                                  | P0                         |
| React parity: service catalogue and trust-boundary review   | Keep the semantic service catalogue current as service decisions change; use validators to prevent metadata, evidence, and non-claim drift.                                                                                                                                       | P0 follow-up governance    |
| React parity: non-runtime composed service disposition      | USF-183 proves the service-catalogue-required runtime provider bindings that have USF runtime ports. Operator surfaces, backup/restore, scanner, observability backend, quality-gate, mock-provider (USF-176 disposition, USF-201 webhook-sink capture proof, USF-208 bounded LocalStack local proof, USF-209 bounded WireMock proof, and USF-210 selected-tier mock OIDC supersession), gateway, and automation service disposition still require USF-133 decisions. | P0 follow-up under USF-133 |
| React parity: operational service decisions                 | Complete or defer remaining evidence for Sentry, SonarQube, security scanning, ClickHouse, Redis, Meilisearch, ClamAV, LocalStack, WireMock, webhook sink, mock OIDC, Windmill, pgAdmin, pgBackRest.                                                                                                       | P1                         |
| React parity: operator/admin surface posture                | Define admin console set, authn/authz, tenant safety, and future ops UI boundaries.                                                                                                                                                                                               | P1                         |
| React parity: alerting, dashboard, incident posture depth   | Resolve Alertmanager, Alloy, dashboards, alert routing, and incident evidence depth.                                                                                                                                                                                              | P2                         |

## Cleanup-To-Implementation Orchestration

`docs/architecture/usf-dev-readiness-cleanup-orchestration.md` records the cleanup-to-implementation readiness pass for the remaining USF-133 lanes. It keeps decision-titled issues open, re-scopes them into executable proof, validator, documentation, matrix, and evidence work, and requires a coordinator evidence pack before implementation prompts are issued.

This orchestration pass is planning and issue hygiene only. It does not authorise runtime, source, provider, schema, validator, or semantic behaviour implementation. It does not claim full dev readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, test readiness, or full React parity. It does not close USF-133.

## Validator Recommendations

- `tools/validate-compose/validate-compose.py` checks every React compose service has a service-catalogue classification and generated Compose remains derivative.
- `docs/architecture/compose-service-disposition-closure-matrix.json` records Lane 1 service-disposition closure evidence for each semantic service-catalogue row.
- `tools/validate-parity/validate-parity.py` now fails service-disposition closure evidence when a closure-relevant service row is missing, a disposition is absent, an unresolved row lacks downstream source follow-up issues outside closure gate/wrapper/meta issues, tracking rationale is missing, proof evidence is missing, runtime proof is falsely treated as Compose service equivalence, the USF-167 source execution gate or USF-193 environment promotion standard link is missing, or closure/readiness is overclaimed.
- `docs/architecture/usf-133-closure-tier-evidence-gate.json` records the USF-166 bounded source-issue closure-tier gate. `tools/validate-parity/validate-parity.py` fails when the gate is missing, a required service or capability disposition is missing, proof commands or validator linkage are absent, substitutes lack non-equivalence boundaries, source issue Done is implied, USF-133 closure is implied, or readiness/certification claims are overclaimed.
- `spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json` records repository-level enterprise evidence organisation for SoA-support mappings, evidence-register rows, threat/abuse posture, SDK dependency governance, observability evidence standards, access review posture, resilience posture, incident/vulnerability evidence, privacy/data minimisation, done-state governance, and non-claims.
- `tools/validate-enterprise/validate-enterprise.py` fails lane work when enterprise evidence model coverage, commit/command/issue-linked evidence, SDK governance, threat posture, observability evidence standards, posture registers, done-state governance, Lane 1 closure-matrix enterprise linkage, Lane 3 assurance control-plane disposition, or assurance readiness/certification non-claims are missing.
- `spec/instances/environment-promotion/environment-promotion-enterprise-standard.json` records the USF-193 dev/test/staging/production promotion standard. `tools/validate-enterprise/validate-enterprise.py` fails when environment rows, promotion gates, ownership/risk/SoA support, provider/environment separation, destructive semantics, evidence package shape, enterprise evidence rows, validation linkage, or non-claims are missing or overclaimed.
- `docs/architecture/usf-133-closure-tier-evidence-gate.json` now links the USF-193 environment promotion standard. `tools/validate-parity/validate-parity.py` fails when that closure-gate dependency is missing, stale, lacks enterprise validation linkage, or implies readiness from the presence of the standard alone.
- Lane 4 appends `usf-188` observability operations evidence rows and extends observability/enterprise validators so missing telemetry posture, raw secret leakage, unsafe logs, missing incident boundary, missing redaction, and overclaims fail closed.
- `docs/architecture/operator-access-gateway-posture-matrix.json` records USF-186 Lane 2 operator/admin/gateway access posture with effectiveness state, owners, authn/authz posture, audit posture, break-glass relevance, no public/LAN exposure, deferred risk treatment, change-management evidence, rollback/deferred boundary, privacy posture boundary, incident/vulnerability boundary, control/evidence references, and explicit non-claims.
- Lane 2 extends `tools/validate-enterprise/validate-enterprise.py` with `USF-ENTERPRISE-014` so missing or unsafe operator access/gateway posture fails closed without redefining Lane 4's `USF-ENTERPRISE-010`, Lane 6's `USF-ENTERPRISE-011`, or Lane 3's `USF-ENTERPRISE-012`/`USF-ENTERPRISE-013`.
- `tools/validate-runtime/validate-runtime.py` now fails USF-189 provider disposition gaps when missing provider proof or explicit deferral, hidden in-memory fallback, missing SDK boundary, unsafe readiness posture, or provider overclaim is introduced.
- Add a validator that rejects readiness overclaims in complete review artifacts.
- Planted defects cover missing service row, missing disposition, false closure, missing follow-up issue, missing proof evidence, false runtime-to-Compose equivalence, missing enterprise evidence linkage, missing SoA-support coverage, missing commit-pinned evidence, missing threat posture, SDK governance drift, observability evidence drift, done-state overclaim, readiness overclaim, public operator exposure, missing operator auth, missing operator audit, missing access owner, and operator access readiness overclaim.

## USF-186 Operator Access and Gateway Status

USF-186 adds a defined-only operator access and gateway posture matrix plus enterprise validator coverage. The posture is machine-checkable for operator/admin/control-plane/gateway service coverage, service-catalogue alignment, loopback-only local exposure, no public/LAN exposure, owner/risk/control ownership, auth requirement, audit requirement, break-glass relevance, deferred risk treatment, change-management evidence, rollback/deferred boundary, control/evidence references, incident/vulnerability posture, privacy/data minimisation posture, and explicit non-claims.

USF-169 adds a bounded API operator-access proof for provider posture and observability posture routes. It exercises tenant-context fail-closed behaviour, PDP denial, security-admin permit, redacted provider and observability responses, value-free audit evidence, and tenant-safe security signals. It does not implement UI, clickthrough, runtime gateway routes, provider console integrations, access-review execution, public exposure, or live-provider evidence.

USF-180 adds `docs/architecture/gateway-clickthrough-access-substrate-matrix.json` as the source-issue gateway/clickthrough substrate gate. The matrix records that Caddy remains a required/profile-gated local Compose gateway substrate with loopback-only publication, trusted forwarded-header posture limited to the local gateway boundary, no direct-client forwarded-header trust, no public/LAN exposure, no WAF/TLS/deployment readiness claim, explicit route non-equivalence, and clickthrough proof criteria deferred to USF-155 before test readiness. It does not create runtime gateway routes, forward-auth, clickthrough UI, service-console login, public gateway exposure, or any staging/production/live-provider/operator-product readiness claim. Composed service console login and periodic access review execution remain deferred boundaries.

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
surfaces, backup/restore (USF-177 disposition, USF-202 blocked proof reclassification, USF-211 image/configuration unblocker), Windmill operator automation (USF-178 disposition, USF-203 blocked proof reclassification, USF-212 bootstrap/proof unblocker), scanner, observability backend, quality-gate, mock-provider (USF-176 disposition, USF-201 webhook-sink capture proof, USF-208 bounded LocalStack local proof, USF-209 bounded WireMock proof, and USF-210 selected-tier mock OIDC supersession),
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
enterprise evidence rows. USF-196 records the Sentry row as an explicit deferred
service-proof boundary after USF-170 records the bounded disposition gate. Actual Sentry
event capture, redaction, tenant-safe labels, retention, alert handoff, incident, and
operator-console proof remain deferred under USF-205.
USF-195 records the SonarQube row as an explicit deferred service-proof boundary after
USF-171 records the bounded disposition gate. Actual composed scan execution, quality-gate
scope, unresolved issue handling, exceptions, security hotspot treatment, and operator-console
proof remain deferred under USF-204.
Security scanning is defined-only for this lane. USF-200 adds bounded local Compose ClamAV proof
for synthetic scanner behaviour, but live scanner provider readiness, DLP, vulnerability
clearance, SAST/DAST completeness, secret-scanning completeness, and certification evidence are
not claimed.

`tools/validate-enterprise/validate-enterprise.py` enforces Lane 3 disposition with
USF-ENTERPRISE-011 and assurance overclaim prevention with USF-ENTERPRISE-012. Planted defects
`008-assurance-disposition-missing.json` and
`009-assurance-certification-overclaim.json` prove the validator catches hidden assurance gaps
and certification overclaims.
