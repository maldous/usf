# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: 80b7edfe4a0553a419d68d55384d0e5e836080ed
Base URL: http://127.0.0.1:27721
Generated: 2026-07-09T08:12:54.172Z

## Summary

Machine evidence produced: true
Sufficient for human acceptance without further decision: false
Reason: Machine QA produces audit evidence and explicit gaps, but USF-290 final acceptance remains a Matthew decision and final signoff controls remain disabled.

## Counts

| Metric | Count |
| --- | ---: |
| declaredRoutes | 71 |
| testedRoutes | 830 |
| capabilities | 75 |
| scenarios | 150 |
| services | 40 |
| serviceEvidenceScreenshots | 40 |
| actionsSubmitted | 7 |
| screenshots | 94 |
| pass | 1282 |
| fail | 0 |
| warn | 0 |
| reviewRequired | 0 |
| humanDecisionRequired | 1 |

## Gaps

| Status | Gap type | Category | Target | Message |
| --- | --- | --- | --- | --- |
| pass | none | none | none | No gaps recorded. |

## Screenshots

| Route | File | Timestamp |
| --- | --- | --- |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-09T08:13:48.961Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/keycloak-db.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-09T08:13:49.190Z |
| http://127.0.0.1:8090/admin/master/console/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-keycloak.png | 2026-07-09T08:14:07.329Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/nats.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-09T08:14:07.592Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/temporal.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-09T08:14:07.781Z |
| http://127.0.0.1:9001/browser | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-minio.png | 2026-07-09T08:14:11.091Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/openbao.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-09T08:14:11.338Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/otel-collector.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-09T08:14:11.540Z |
| http://127.0.0.1:9090/targets | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-prometheus.png | 2026-07-09T08:14:11.941Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-grafana.png | 2026-07-09T08:14:17.461Z |
| http://127.0.0.1:3100/ready | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-loki.png | 2026-07-09T08:14:32.601Z |
| http://127.0.0.1:3200/ready | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-tempo.png | 2026-07-09T08:14:47.733Z |
| http://127.0.0.1:8025/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-mailpit.png | 2026-07-09T08:14:47.934Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/webhook-sink.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-09T08:14:48.135Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/redis.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-09T08:14:48.309Z |
| http://127.0.0.1:7700/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-meilisearch.png | 2026-07-09T08:14:48.556Z |
| http://127.0.0.1:18123/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-clickhouse.png | 2026-07-09T08:14:48.615Z |
| http://127.0.0.1:5050/browser/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-pgadmin.png | 2026-07-09T08:14:57.229Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/sonar-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-09T08:14:57.392Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/sonar-oidc-plugin.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-09T08:14:57.563Z |
| http://127.0.0.1:9002/projects/create | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-sonarqube.png | 2026-07-09T08:15:15.046Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/mock-oidc.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-09T08:15:15.198Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/localstack.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-09T08:15:15.363Z |
| http://127.0.0.1:8089/__admin/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-wiremock.png | 2026-07-09T08:15:15.436Z |
| http://127.0.0.1:9093/#/alerts | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-alertmanager.png | 2026-07-09T08:15:15.508Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/alloy.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-09T08:15:15.673Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/windmill-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-09T08:15:15.846Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/windmill-redis.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-09T08:15:16.012Z |
| http://127.0.0.1:8001/user/workspaces | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-windmill.png | 2026-07-09T08:15:19.470Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/windmill-worker.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-09T08:15:19.623Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/temporal-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-09T08:15:19.805Z |
| http://127.0.0.1:8088/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-temporal-ui.png | 2026-07-09T08:15:19.891Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/pgbackrest.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-09T08:15:20.081Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/clamav.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-09T08:15:20.275Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/sentry.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-09T08:15:20.455Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/public-proof-origin.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-09T08:15:20.639Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/staging-proof-cockpit.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | 2026-07-09T08:15:20.818Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/caddy.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-caddy-evidence-page.png | 2026-07-09T08:15:21.002Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/platform-api.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-09T08:15:21.177Z |
| artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/service-evidence/web-app.json | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-web-app-evidence-page.png | 2026-07-09T08:15:21.344Z |
| /proof | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/home.png | 2026-07-09T08:15:32.603Z |
| /proof/foundation-substrate-closure | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/foundation-substrate-closure.png | 2026-07-09T08:15:33.174Z |
| /proof/capabilities | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/capabilities.png | 2026-07-09T08:15:33.612Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/first-capability-detail.png | 2026-07-09T08:15:33.990Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/first-scenario.png | 2026-07-09T08:15:34.185Z |
| /proof/roles | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/roles.png | 2026-07-09T08:15:34.300Z |
| /proof/actions | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/actions.png | 2026-07-09T08:15:34.431Z |
| /proof/actions/qa-mrd8c9v3-o961im | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/first-action-detail.png | 2026-07-09T08:15:34.564Z |
| /proof/machine-runs | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/machine-runs.png | 2026-07-09T08:15:34.690Z |
| /proof/import | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/machine-import.png | 2026-07-09T08:15:34.818Z |
| /proof/import/latest-machine-qa | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/machine-import-run.png | 2026-07-09T08:15:35.113Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/machine-import-capability.png | 2026-07-09T08:15:35.273Z |
| /proof/review | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/machine-review.png | 2026-07-09T08:15:35.403Z |
| /proof/review/gaps | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/machine-review-gaps.png | 2026-07-09T08:15:35.479Z |
| /proof/review/nonconformities | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/machine-review-nonconformities.png | 2026-07-09T08:15:35.543Z |
| /proof/review/corrective-actions | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/machine-review-corrective-actions.png | 2026-07-09T08:15:35.610Z |
| /proof/export | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/machine-export.png | 2026-07-09T08:15:35.736Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/first-evidence.png | 2026-07-09T08:15:35.868Z |
| /proof/evidence/usf-foundation-substrate-closure | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-09T08:15:36.002Z |
| /proof/audit | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/audit.png | 2026-07-09T08:15:36.231Z |
| /proof/observability | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/observability.png | 2026-07-09T08:15:36.466Z |
| /proof/fixtures | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/fixtures.png | 2026-07-09T08:15:36.648Z |
| /proof/alerts | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/alerts.png | 2026-07-09T08:15:37.212Z |
| /proof/signoff | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/signoff.png | 2026-07-09T08:15:37.613Z |
| /proof/result | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/result.png | 2026-07-09T08:15:37.679Z |
| /proof/enterprise | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise.png | 2026-07-09T08:15:37.970Z |
| /proof/enterprise/isms-scope | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-isms-scope.png | 2026-07-09T08:15:38.130Z |
| /proof/enterprise/risk-register | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-risk-register.png | 2026-07-09T08:15:38.297Z |
| /proof/enterprise/statement-of-applicability | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-09T08:15:38.450Z |
| /proof/enterprise/assets | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-assets.png | 2026-07-09T08:15:38.614Z |
| /proof/enterprise/suppliers | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-suppliers.png | 2026-07-09T08:15:38.781Z |
| /proof/enterprise/access-review | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-access-review.png | 2026-07-09T08:15:38.973Z |
| /proof/enterprise/secrets-crypto | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-secrets-crypto.png | 2026-07-09T08:15:39.135Z |
| /proof/enterprise/audit-retention | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-audit-retention.png | 2026-07-09T08:15:39.336Z |
| /proof/enterprise/backup-dr | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-backup-dr.png | 2026-07-09T08:15:39.502Z |
| /proof/enterprise/change-release | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-change-release.png | 2026-07-09T08:15:39.669Z |
| /proof/enterprise/supply-chain | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-supply-chain.png | 2026-07-09T08:15:39.831Z |
| /proof/enterprise/privacy-data-protection | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-09T08:15:40.004Z |
| /proof/enterprise/tenant-isolation | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-tenant-isolation.png | 2026-07-09T08:15:40.184Z |
| /proof/enterprise/resilience-capacity | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-resilience-capacity.png | 2026-07-09T08:15:40.349Z |
| /proof/enterprise/observability-runbooks | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-observability-runbooks.png | 2026-07-09T08:15:40.515Z |
| /proof/enterprise/policy-governance | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-policy-governance.png | 2026-07-09T08:15:40.669Z |
| /proof/enterprise/iso-control-support | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-iso-control-support.png | 2026-07-09T08:15:40.832Z |
| /proof/enterprise/internal-audit | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-internal-audit.png | 2026-07-09T08:15:40.983Z |
| /proof/enterprise/legal-regulatory | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-legal-regulatory.png | 2026-07-09T08:15:41.148Z |
| /proof/enterprise/security-objectives | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-security-objectives.png | 2026-07-09T08:15:41.302Z |
| /proof/enterprise/document-control | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-document-control.png | 2026-07-09T08:15:41.467Z |
| /proof/enterprise/competence-awareness | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-competence-awareness.png | 2026-07-09T08:15:41.632Z |
| /proof/enterprise/physical-environmental | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-physical-environmental.png | 2026-07-09T08:15:41.786Z |
| /proof/enterprise/secure-sdlc | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-secure-sdlc.png | 2026-07-09T08:15:41.949Z |
| /proof/enterprise/evidence-integrity | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-evidence-integrity.png | 2026-07-09T08:15:42.154Z |
| /proof/enterprise/nonconformity-corrective-action | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-09T08:15:42.317Z |
| /proof/enterprise/management-review | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-management-review.png | 2026-07-09T08:15:42.481Z |
| /proof/enterprise/single-operator-risk | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/enterprise-single-operator-risk.png | 2026-07-09T08:15:42.633Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | host-unpublished-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| staging-proof-cockpit | platform operator | unsafe-to-screenshot |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | none |
| caddy | platform operator | host-unpublished-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-caddy-evidence-page.png | none |
| platform-api | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| web-app | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-09T08-12-54-130Z/screenshots/compose-service-web-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-09T08-12-54-172Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
