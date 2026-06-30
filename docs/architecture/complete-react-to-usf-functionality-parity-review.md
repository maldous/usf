# Complete React-to-USF Functionality Parity Review

Document type: Architecture / complete functionality and operational-substrate parity review.
Status: Review draft, docs-only.
Run: 20260629T053504Z-a285187.
React HEAD: a92d9734cf0f1f7a53f9093ce3bb3d2c02bfd767.
USF HEAD: a285187b177a922ff422858c1bf8f180336f1dff.
Bootstrap marker: a25e9d55dd88831c3792a7b157e4314433bb5ff6; unchanged by this review.

This review answers the follow-up directive for a complete React-to-USF functionality and operational-substrate accounting pass. It creates no implementation/runtime code, no UI, no Playwright tests, no validator changes, no schema activation, no compose changes, and no provider enablement. It uses ../react only as historical semantic/source evidence and does not copy React runtime/application code or mirror React paths.

## Verdict

USF-133 is not ready to close. The authorised foundation slices through resource lifecycle are locally proven, but React's full local platform included 54 compose services and 129 first-party package manifests. USF currently composes 14 services and uses authorised ports, in-memory/local adapters, and standards for many behaviours. That is not universal React-derived dev/test platform parity.

Dev-in-memory-ready assessment: conditionally ready for the authorised local proof slices only, not a full React parity claim.

Dev-compose-minimal-ready assessment: conditionally ready for the current USF compose substrate and proof ladder only, not a universal React service parity claim.

Dev-compose-universal-ready assessment: not ready. Missing, substituted, or decision-bound areas include Sentry, SonarQube, ClickHouse, Redis, Meilisearch, ClamAV, LocalStack, WireMock, pgAdmin, pgBackRest, Alertmanager, Alloy, Windmill, Temporal UI, and gateway/forward-auth operator access.

## Review Basis

- React compose inventory: 54 services from ../react/compose.yaml.
- USF compose inventory: 14 services from compose/compose.yaml.
- React first-party package inventory: 129 package manifests excluding node_modules.
- USF first-party package inventory: 32 package manifests.
- Baseline validation: passed before this docs-only review; see .claude/runs/20260629T053504Z-a285187/baseline-validation.log.
- Linear: USF-133 open; recent child issues USF-164 and USF-165 Done; deferred issues remain non-blocking for this review but blocking for closure where named.

## Capability Matrix Summary

Status counts: deferred=6, migrated=5, not-applicable=1, partial=13, requires-human-decision=6.
Evidence grades: A=5, B=11, C=7, D=8.

| Capability ID              | Capability                   | Status                  | Grade | Blocker      | Carrier                                                           | Readiness impact                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ---------------------------- | ----------------------- | ----- | ------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| db-rls-migrations          | DB/RLS/migrations            | migrated                | A     | none         | USF-138/USF-139                                                   | Deferred depth remains for backup/restore and broader DB operations.                                                                                                                                                                                                                                                                                     |
| tenant-authz-pdp           | Tenant/PDP authorization     | migrated                | A     | none         | USF-140/USF-141                                                   | Core PDP migrated; ABAC depth remains deferred.                                                                                                                                                                                                                                                                                                          |
| audit-evidence             | Audit/evidence               | migrated                | A     | none         | USF-142/USF-143                                                   | Durable bus and external evidence integrations remain deferred.                                                                                                                                                                                                                                                                                          |
| config-secrets             | Config/secrets               | migrated                | A     | none         | USF-144/USF-145                                                   | OpenBao is local; live secret-manager readiness not claimed.                                                                                                                                                                                                                                                                                             |
| files-storage              | Files/storage                | partial                 | B     | P1           | USF-146/USF-147                                                   | ClamAV composed scanner and richer DLP remain deferred.                                                                                                                                                                                                                                                                                                  |
| auth-identity              | Auth/session/identity        | migrated                | A     | none         | USF-148/USF-149                                                   | Privileged SSO administration depth remains deferred.                                                                                                                                                                                                                                                                                                    |
| jobs-workflows             | Jobs/workflows               | partial                 | B     | P1           | USF-150/USF-151                                                   | Temporal local is present; Windmill operator automation is not equivalent.                                                                                                                                                                                                                                                                               |
| notifications              | Notifications/messaging      | partial                 | B     | P1           | USF-152/USF-153                                                   | Live providers and broader delivery feedback remain deferred.                                                                                                                                                                                                                                                                                            |
| api-contracts              | API/OpenAPI/contracts        | partial                 | B     | P1           | USF-154/USF-155                                                   | OpenAPI/local REST covered; GraphQL/browser-client parity requires decision.                                                                                                                                                                                                                                                                             |
| providers                  | Provider adapters/modes      | partial                 | B     | P1           | USF-156/USF-157                                                   | Several live/composed providers remain deferred or decision-bound.                                                                                                                                                                                                                                                                                       |
| observability              | Observability/telemetry      | partial                 | B     | P1           | USF-158/USF-159                                                   | Sentry/Alertmanager/Alloy not equivalent; live monitoring not claimed.                                                                                                                                                                                                                                                                                   |
| guardrails                 | Rate limits/guardrails       | partial                 | B     | P1           | USF-160/USF-161                                                   | Distributed and edge enforcement deferred.                                                                                                                                                                                                                                                                                                               |
| import-export-bulk         | Import/export/bulk           | partial                 | B     | P1           | USF-162/USF-163                                                   | Production migration/export readiness not claimed.                                                                                                                                                                                                                                                                                                       |
| search-indexing            | Search/indexing/discovery    | deferred                | D     | P1           | USF-164/USF-174/USF-199                                           | USF-174 records the bounded composed search provider disposition and non-equivalence boundary; in-memory search remains hermetic only, and Meilisearch adapter/service-semantic proof remains deferred to USF-199 before any Meilisearch, composed search, search-provider, vector, AI, or provider-compatibility readiness claim. |
| resource-lifecycle         | Resource lifecycle           | partial                 | B     | P1           | USF-165                                                           | Broad HTTP resource surfaces and eDiscovery depth remain deferred.                                                                                                                                                                                                                                                                                       |
| graphql-surface            | GraphQL/contracts/client     | requires-human-decision | D     | P1           | draft decision required                                           | Decide whether REST/OpenAPI foundation is sufficient or GraphQL compatibility is required.                                                                                                                                                                                                                                                               |
| analytics-event-store      | Analytics/event store        | deferred                | D     | P1           | USF-172/USF-197                                                   | USF-172 records the bounded disposition gate and non-equivalence boundary; ClickHouse adapter/service-semantic proof remains deferred to USF-197 before any analytics-provider or event-store readiness claim.                                                                                                                                               |
| cache-eventing             | Cache/eventing               | deferred                | D     | P1           | USF-173/USF-198                                                   | USF-173 records the bounded disposition gate and non-equivalence boundary; NATS event-bus proof is not Redis cache proof, in-memory stores are non-equivalent, and Redis adapter/service-semantic proof remains deferred to USF-198 before any Redis or cache readiness claim.                 |
| error-monitoring           | Error monitoring             | requires-human-decision | D     | P1           | draft decision required                                           | Decide whether Sentry service parity is required or observability proof suffices.                                                                                                                                                                                                                                                                        |
| quality-gate               | Quality gate/static analysis | requires-human-decision | D     | P1           | draft decision required                                           | Decide whether SonarQube remains required for universal dev foundation.                                                                                                                                                                                                                                                                                  |
| backup-restore             | Backup/restore               | deferred                | C     | P1           | new blocker recommended                                           | Backup/restore service proof remains absent.                                                                                                                                                                                                                                                                                                             |
| operator-admin-surfaces    | Operator/admin surfaces      | requires-human-decision | D     | P1           | draft decision required                                           | Need explicit operator surface set and auth model before close.                                                                                                                                                                                                                                                                                          |
| external-mocks             | External provider mocks      | requires-human-decision | D     | P1           | draft decision required                                           | Need decide mock provider coverage and behavioural contract.                                                                                                                                                                                                                                                                                             |
| file-scanning              | File scanning                | deferred                | C     | P1           | new blocker recommended                                           | Composed scanner proof absent.                                                                                                                                                                                                                                                                                                                           |
| workflow-automation        | Operator automation          | requires-human-decision | D     | P1           | draft decision required                                           | Windmill is not substituted by Temporal/jobs alone.                                                                                                                                                                                                                                                                                                      |
| infra-cloud                | Cloud/edge infra             | deferred                | C     | P2           | future environment blockers                                       | No live cloud/edge/deployment readiness claimed.                                                                                                                                                                                                                                                                                                         |
| ui-runtime                 | UI/UX app                    | not-applicable          | C     | non-blocking | USF-134                                                           | UI/UX is future non-foundation scope.                                                                                                                                                                                                                                                                                                                    |
| i18n-runtime               | Internationalisation         | deferred                | C     | P2           | future UI/API blocker                                             | Need decide if foundation requires i18n contracts before UI work.                                                                                                                                                                                                                                                                                        |
| dev-commands               | Developer command parity     | partial                 | B     | P1           | USF-133 follow-up                                                 | Runtime proof commands now cover bounded API/worker in-memory proof plus compose-backed Postgres, Keycloak, Mailpit, MinIO, NATS, OpenBao, and Temporal runtime provider binding proof, including independent collision-free tenant/key/name path evidence for MinIO/OpenBao; Sonar/Sentry/operator-surface/compose-universal parity remains incomplete. |
| service-catalog-cmdb       | Service catalogue/CMDB       | partial                 | C     | P0           | USF-168 / `spec/instances/compose-service/service-catalogue.json` | Semantic service catalogue authority now exists and is validator-enforced, but it does not close USF-133 or prove broader readiness.                                                                                                                                                                                                                     |
| data-flow-trust-boundaries | Data flows/trust boundaries  | partial                 | C     | P0           | new tracker recommended                                           | Need complete data-flow/trust-boundary review for missing optional services.                                                                                                                                                                                                                                                                             |

## Service Catalogue and CMDB Interpretation

The dedicated compose matrix is a review catalogue, not the durable CMDB. The semantic service catalogue is `spec/instances/compose-service/service-catalogue.json`, governed by `spec/schemas/compose-service.schema.json` and `tools/validate-compose/validate-compose.py`. It records service purpose, owner, risk owner, control owner, environment disposition, data classification, readiness tier, evidence grade, access/audit/secret/backup/retention posture, tenant and operator boundaries, ISO/IEC 27001-supporting evidence posture, enterprise feature support posture, and explicit readiness non-claims.

This service catalogue remains bounded to service disposition and generated Compose derivation. It does not claim full React parity readiness, full dev readiness, test readiness, staging readiness, production readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, or enterprise production readiness.

## Runtime Application Proof Interpretation

USF-181 adds a bounded runtime proof manifest, updated by USF-183, at
`spec/instances/runtime-proof/runtime-application-compose-parity.json`, governed by
`spec/schemas/runtime-proof.schema.json` and enforced by
`tools/validate-runtime/validate-runtime.py`.

The proof model has two explicit modes:

- `dev-in-memory` proves API and worker execution through the USF entry points with
  in-memory providers, synthetic data, tenant and authorization fail-closed behaviour, and
  audit evidence.
- `dev-compose-backed` starts the canonical dev Compose target before API and worker proof
  execution, reports `runtimeMode: dev-compose-backed`, reports provider mode
  `local-composed-real-service`, verifies safe API binding metadata for Postgres, Keycloak,
  Mailpit, MinIO, NATS, OpenBao, and Temporal, proves API paths for Postgres, NATS, MinIO,
  and Keycloak where those ports surface, and executes worker proof paths for all seven
  SDK-backed adapters.

The compose-backed mode is not service-equivalent to React's platform API container or
Windmill worker service. USF-183 resolves bounded runtime provider bindings for Postgres,
Keycloak, Mailpit, MinIO, NATS, OpenBao, and Temporal, including independent collision-free
tenant/key/name path evidence for MinIO/OpenBao composed storage and secrets bindings.
Operator/admin surfaces,
backup/restore, scanner, observability backend, quality-gate, mock-provider, gateway, and
automation service disposition remain separate USF-133 closure questions.

This update supports runtime asset evidence, audit evidence, health/readiness evidence,
tenant isolation evidence, fail-closed access-control evidence, secret and synthetic-data
boundaries, operational teardown evidence, readiness retry, local metrics/tracing/audit
evidence, SDK import-boundary evidence, provider registry
traceability, service-catalogue traceability, and future Statement of Applicability
evidence organisation only. It does not claim ISO/IEC 27001 certification, SOC readiness,
staging readiness, production readiness, live-provider readiness, full dev readiness, test
readiness, or full React parity.

## Control Mapping

The review maps React evidence to access control, identity, tenant isolation, secrets, provider boundaries, observability, audit/evidence, backup/restore, file scanning, quality gates, mock providers, guardrails, import/export, search, and operator/admin surfaces. The strongest implementation evidence is in the already-authorised proof commands. Weak evidence is concentrated in operational substrates that React expressed as compose services but USF currently expresses only as standards, in-memory substitutes, or deferred posture.

## Data Flow and Trust Boundary Review

The current USF substrate has explicit provider-mode and tenant/PDP boundaries for implemented domains. Missing or weak trust-boundary areas are external mock providers, file scanning, backup/restore, error-monitoring pipelines, analytics/event-store flows, operator/admin clickthrough, and automated operator workflows. These should be resolved by decision, explicit deferral, or implementation authority before any broad readiness claim.

## Operator and Admin Surfaces

React compose evidence includes pgAdmin, MinIO console, Grafana, SonarQube, Sentry, Temporal UI, Windmill, Mailpit, ClickHouse interfaces, Prometheus, Loki, Tempo, Alertmanager, and OpenBao style surfaces. USF composes some underlying services but has not proven a consistent operator/admin surface catalogue, forward-auth/SSO posture, or clickthrough readiness. This is a P1/P2 gap depending on the chosen readiness tier.

## Linear Plan

No Linear mutation is made by this review. Draft-only recommended follow-ups are in docs/architecture/usf-dev-foundation-gap-register.md. Linear remains work tracking only and does not define USF semantic authority.

## Validator Recommendations

Do not implement validators in this docs-only pass. Recommended future validator rules are: fail if a React compose service is absent from the dedicated service matrix; fail if a grade D/F service remains without Linear tracker or explicit human decision before USF-133 closure; fail if service status claims equivalence while no runtime/proof exists; fail if an in-memory/local substitute is upgraded to live/composed equivalence; fail if a readiness document claims universal dev, staging, production, public API, SOC, ISO, or regulatory readiness without authority; fail if v2-bootstrap is moved by a docs-only review.

## Boundary Statement

This review does not claim full React parity readiness. It does not claim dev-universal, staging, production, deployment, live provider, live monitoring, public API, AI/RAG, SOC, ISO, regulatory, legal export, or production-live readiness. It does not move v2-bootstrap.
