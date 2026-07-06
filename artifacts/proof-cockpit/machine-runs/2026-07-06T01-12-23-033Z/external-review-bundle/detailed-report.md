# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: a213134711cbbd91d82a6ec55e133bd9d9bb2ec9
Base URL: http://127.0.0.1:30591
Generated: 2026-07-06T01:12:23.075Z

## Summary

Machine evidence produced: true
Sufficient for human acceptance without further decision: false
Reason: Machine QA produces audit evidence and explicit gaps, but USF-290 final acceptance remains a Matthew decision and final signoff controls remain disabled.

## Counts

| Metric | Count |
| --- | ---: |
| declaredRoutes | 71 |
| testedRoutes | 827 |
| capabilities | 75 |
| scenarios | 150 |
| services | 39 |
| serviceEvidenceScreenshots | 39 |
| actionsSubmitted | 7 |
| screenshots | 93 |
| pass | 1278 |
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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-06T01:13:19.161Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-06T01:13:19.395Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-keycloak.png | 2026-07-06T01:13:33.002Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-06T01:13:33.196Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-06T01:13:33.399Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-minio.png | 2026-07-06T01:13:36.732Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-06T01:13:36.943Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-06T01:13:37.137Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-prometheus.png | 2026-07-06T01:13:37.555Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-grafana.png | 2026-07-06T01:13:43.160Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-loki.png | 2026-07-06T01:13:58.328Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-tempo.png | 2026-07-06T01:14:13.477Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-mailpit.png | 2026-07-06T01:14:13.679Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-06T01:14:13.862Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-06T01:14:14.038Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-meilisearch.png | 2026-07-06T01:14:14.284Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-clickhouse.png | 2026-07-06T01:14:14.343Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-pgadmin.png | 2026-07-06T01:14:23.056Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-06T01:14:23.203Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-06T01:14:23.364Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-sonarqube.png | 2026-07-06T01:14:40.856Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-06T01:14:40.997Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-06T01:14:41.146Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-wiremock.png | 2026-07-06T01:14:41.227Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-alertmanager.png | 2026-07-06T01:14:41.312Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-06T01:14:41.482Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-06T01:14:41.647Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-06T01:14:41.798Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-windmill.png | 2026-07-06T01:14:45.215Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-06T01:14:45.367Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-06T01:14:45.547Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-temporal-ui.png | 2026-07-06T01:14:45.635Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-06T01:14:45.839Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-06T01:14:46.018Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-06T01:14:46.181Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-06T01:14:46.360Z |
| http://127.0.0.1:8081/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-caddy.png | 2026-07-06T01:14:46.591Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-06T01:14:46.772Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/service-evidence/react-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-react-app-evidence-page.png | 2026-07-06T01:14:46.928Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/home.png | 2026-07-06T01:14:58.154Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/foundation-substrate-closure.png | 2026-07-06T01:14:58.718Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/capabilities.png | 2026-07-06T01:14:59.156Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/first-capability-detail.png | 2026-07-06T01:14:59.533Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/first-scenario.png | 2026-07-06T01:14:59.729Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/roles.png | 2026-07-06T01:14:59.844Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/actions.png | 2026-07-06T01:14:59.990Z |
| /proof/actions/qa-mr8izya1-h2m0fl | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/first-action-detail.png | 2026-07-06T01:15:00.108Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/machine-runs.png | 2026-07-06T01:15:00.236Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/machine-import.png | 2026-07-06T01:15:00.362Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/machine-import-run.png | 2026-07-06T01:15:00.659Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/machine-import-capability.png | 2026-07-06T01:15:00.802Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/machine-review.png | 2026-07-06T01:15:00.994Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/machine-review-gaps.png | 2026-07-06T01:15:01.058Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/machine-review-nonconformities.png | 2026-07-06T01:15:01.122Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/machine-review-corrective-actions.png | 2026-07-06T01:15:01.188Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/machine-export.png | 2026-07-06T01:15:01.315Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/first-evidence.png | 2026-07-06T01:15:01.448Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-06T01:15:01.580Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/audit.png | 2026-07-06T01:15:01.807Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/observability.png | 2026-07-06T01:15:02.043Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/fixtures.png | 2026-07-06T01:15:02.226Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/alerts.png | 2026-07-06T01:15:02.788Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/signoff.png | 2026-07-06T01:15:03.179Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/result.png | 2026-07-06T01:15:03.239Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise.png | 2026-07-06T01:15:03.531Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-isms-scope.png | 2026-07-06T01:15:03.691Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-risk-register.png | 2026-07-06T01:15:03.844Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-06T01:15:04.009Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-assets.png | 2026-07-06T01:15:04.161Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-suppliers.png | 2026-07-06T01:15:04.326Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-access-review.png | 2026-07-06T01:15:04.531Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-secrets-crypto.png | 2026-07-06T01:15:04.696Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-audit-retention.png | 2026-07-06T01:15:04.897Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-backup-dr.png | 2026-07-06T01:15:05.063Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-change-release.png | 2026-07-06T01:15:05.229Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-supply-chain.png | 2026-07-06T01:15:05.391Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-06T01:15:05.549Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-tenant-isolation.png | 2026-07-06T01:15:05.729Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-resilience-capacity.png | 2026-07-06T01:15:05.891Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-observability-runbooks.png | 2026-07-06T01:15:06.058Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-policy-governance.png | 2026-07-06T01:15:06.211Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-iso-control-support.png | 2026-07-06T01:15:06.376Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-internal-audit.png | 2026-07-06T01:15:06.542Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-legal-regulatory.png | 2026-07-06T01:15:06.694Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-security-objectives.png | 2026-07-06T01:15:06.859Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-document-control.png | 2026-07-06T01:15:07.027Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-competence-awareness.png | 2026-07-06T01:15:07.193Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-physical-environmental.png | 2026-07-06T01:15:07.360Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-secure-sdlc.png | 2026-07-06T01:15:07.526Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-evidence-integrity.png | 2026-07-06T01:15:07.731Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-06T01:15:07.896Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-management-review.png | 2026-07-06T01:15:08.059Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/enterprise-single-operator-risk.png | 2026-07-06T01:15:08.211Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | cli-equivalent | http://127.0.0.1:18080/.well-known/usf-public-edge.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| caddy | platform operator | direct-screenshot | http://127.0.0.1:8081/, https://127.0.0.1:8443/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-caddy.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| react-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-12-23-033Z/screenshots/compose-service-react-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-06T01-12-23-075Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
