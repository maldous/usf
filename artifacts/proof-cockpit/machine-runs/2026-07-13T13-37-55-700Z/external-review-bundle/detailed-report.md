# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: 88289f38fc591970c6c31c14471d91b672f8ffc3
Base URL: http://127.0.0.1:1945
Generated: 2026-07-13T13:37:55.745Z

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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-13T13:38:51.357Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-13T13:38:51.579Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-keycloak.png | 2026-07-13T13:39:03.674Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-13T13:39:03.864Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-13T13:39:04.064Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-minio.png | 2026-07-13T13:39:07.431Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-13T13:39:07.697Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-13T13:39:07.950Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-prometheus.png | 2026-07-13T13:39:08.412Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-grafana.png | 2026-07-13T13:39:13.911Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-loki.png | 2026-07-13T13:39:29.054Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-tempo.png | 2026-07-13T13:39:44.187Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-mailpit.png | 2026-07-13T13:39:44.389Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-13T13:39:44.588Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-13T13:39:44.763Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-meilisearch.png | 2026-07-13T13:39:45.010Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-clickhouse.png | 2026-07-13T13:39:45.070Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-pgadmin.png | 2026-07-13T13:39:50.433Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-13T13:39:50.579Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-13T13:39:50.750Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-sonarqube.png | 2026-07-13T13:40:08.248Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-13T13:40:08.400Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-13T13:40:08.565Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-wiremock.png | 2026-07-13T13:40:08.655Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-alertmanager.png | 2026-07-13T13:40:08.739Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-13T13:40:08.909Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-13T13:40:09.067Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-13T13:40:09.231Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-windmill.png | 2026-07-13T13:40:12.676Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-13T13:40:12.829Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-13T13:40:13.009Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-temporal-ui.png | 2026-07-13T13:40:13.109Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-13T13:40:13.321Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-13T13:40:13.494Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-13T13:40:13.658Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-13T13:40:13.843Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/staging-proof-cockpit.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | 2026-07-13T13:40:14.021Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/caddy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-caddy-evidence-page.png | 2026-07-13T13:40:14.204Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-13T13:40:14.381Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/service-evidence/web-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-web-app-evidence-page.png | 2026-07-13T13:40:14.547Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/home.png | 2026-07-13T13:40:25.724Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/foundation-substrate-closure.png | 2026-07-13T13:40:26.895Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/capabilities.png | 2026-07-13T13:40:27.334Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/first-capability-detail.png | 2026-07-13T13:40:27.707Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/first-scenario.png | 2026-07-13T13:40:27.905Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/roles.png | 2026-07-13T13:40:28.022Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/actions.png | 2026-07-13T13:40:28.167Z |
| /proof/actions/qa-mrj9pofa-l3642k | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/first-action-detail.png | 2026-07-13T13:40:28.302Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/machine-runs.png | 2026-07-13T13:40:28.444Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/machine-import.png | 2026-07-13T13:40:28.572Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/machine-import-run.png | 2026-07-13T13:40:28.873Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/machine-import-capability.png | 2026-07-13T13:40:29.026Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/machine-review.png | 2026-07-13T13:40:29.158Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/machine-review-gaps.png | 2026-07-13T13:40:29.233Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/machine-review-nonconformities.png | 2026-07-13T13:40:29.299Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/machine-review-corrective-actions.png | 2026-07-13T13:40:29.365Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/machine-export.png | 2026-07-13T13:40:29.491Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/first-evidence.png | 2026-07-13T13:40:29.623Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-13T13:40:29.757Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/audit.png | 2026-07-13T13:40:29.986Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/observability.png | 2026-07-13T13:40:30.220Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/fixtures.png | 2026-07-13T13:40:30.402Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/alerts.png | 2026-07-13T13:40:30.964Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/signoff.png | 2026-07-13T13:40:31.365Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/result.png | 2026-07-13T13:40:31.448Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise.png | 2026-07-13T13:40:31.757Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-isms-scope.png | 2026-07-13T13:40:31.918Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-risk-register.png | 2026-07-13T13:40:32.085Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-13T13:40:32.252Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-assets.png | 2026-07-13T13:40:32.419Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-suppliers.png | 2026-07-13T13:40:32.571Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-access-review.png | 2026-07-13T13:40:32.775Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-secrets-crypto.png | 2026-07-13T13:40:32.940Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-audit-retention.png | 2026-07-13T13:40:33.140Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-backup-dr.png | 2026-07-13T13:40:33.306Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-change-release.png | 2026-07-13T13:40:33.473Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-supply-chain.png | 2026-07-13T13:40:33.634Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-13T13:40:33.807Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-tenant-isolation.png | 2026-07-13T13:40:33.989Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-resilience-capacity.png | 2026-07-13T13:40:34.151Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-observability-runbooks.png | 2026-07-13T13:40:34.319Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-policy-governance.png | 2026-07-13T13:40:34.471Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-iso-control-support.png | 2026-07-13T13:40:34.635Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-internal-audit.png | 2026-07-13T13:40:34.801Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-legal-regulatory.png | 2026-07-13T13:40:34.968Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-security-objectives.png | 2026-07-13T13:40:35.135Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-document-control.png | 2026-07-13T13:40:35.289Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-competence-awareness.png | 2026-07-13T13:40:35.452Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-physical-environmental.png | 2026-07-13T13:40:35.619Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-secure-sdlc.png | 2026-07-13T13:40:35.783Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-evidence-integrity.png | 2026-07-13T13:40:35.992Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-13T13:40:36.154Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-management-review.png | 2026-07-13T13:40:36.317Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/enterprise-single-operator-risk.png | 2026-07-13T13:40:36.485Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| staging-proof-cockpit | platform operator | unsafe-to-screenshot |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | none |
| caddy | platform operator | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-caddy-evidence-page.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| web-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-13T13-37-55-700Z/screenshots/compose-service-web-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-13T13-37-55-745Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
