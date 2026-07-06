# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: 2ed0bdad70c623d77eabbcf64f4bda686a617ded
Base URL: http://127.0.0.1:3705
Generated: 2026-07-06T03:22:56.953Z

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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-06T03:23:51.539Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-06T03:23:51.780Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-keycloak.png | 2026-07-06T03:24:03.874Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-06T03:24:04.071Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-06T03:24:04.259Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-minio.png | 2026-07-06T03:24:07.589Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-06T03:24:07.798Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-06T03:24:08.022Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-prometheus.png | 2026-07-06T03:24:08.513Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-grafana.png | 2026-07-06T03:24:14.085Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-loki.png | 2026-07-06T03:24:29.231Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-tempo.png | 2026-07-06T03:24:44.364Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-mailpit.png | 2026-07-06T03:24:44.566Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-06T03:24:44.749Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-06T03:24:44.923Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-meilisearch.png | 2026-07-06T03:24:45.171Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-clickhouse.png | 2026-07-06T03:24:45.232Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-pgadmin.png | 2026-07-06T03:24:50.476Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-06T03:24:50.622Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-06T03:24:50.783Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-sonarqube.png | 2026-07-06T03:25:08.278Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-06T03:25:08.435Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-06T03:25:08.585Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-wiremock.png | 2026-07-06T03:25:08.665Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-alertmanager.png | 2026-07-06T03:25:08.751Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-06T03:25:08.922Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-06T03:25:09.086Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-06T03:25:09.252Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-windmill.png | 2026-07-06T03:25:12.802Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-06T03:25:12.956Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-06T03:25:13.135Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-temporal-ui.png | 2026-07-06T03:25:13.238Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-06T03:25:13.439Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-06T03:25:13.605Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-06T03:25:13.786Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-06T03:25:13.979Z |
| http://127.0.0.1:8081/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-caddy.png | 2026-07-06T03:25:14.213Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-06T03:25:14.391Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/service-evidence/react-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-react-app-evidence-page.png | 2026-07-06T03:25:14.549Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/home.png | 2026-07-06T03:25:25.809Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/foundation-substrate-closure.png | 2026-07-06T03:25:26.358Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/capabilities.png | 2026-07-06T03:25:26.795Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/first-capability-detail.png | 2026-07-06T03:25:27.170Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/first-scenario.png | 2026-07-06T03:25:27.369Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/roles.png | 2026-07-06T03:25:27.483Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/actions.png | 2026-07-06T03:25:27.625Z |
| /proof/actions/qa-mr8nntza-05nd82 | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/first-action-detail.png | 2026-07-06T03:25:27.762Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/machine-runs.png | 2026-07-06T03:25:27.889Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/machine-import.png | 2026-07-06T03:25:28.016Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/machine-import-run.png | 2026-07-06T03:25:28.315Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/machine-import-capability.png | 2026-07-06T03:25:28.469Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/machine-review.png | 2026-07-06T03:25:28.666Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/machine-review-gaps.png | 2026-07-06T03:25:28.728Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/machine-review-nonconformities.png | 2026-07-06T03:25:28.792Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/machine-review-corrective-actions.png | 2026-07-06T03:25:28.858Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/machine-export.png | 2026-07-06T03:25:28.984Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/first-evidence.png | 2026-07-06T03:25:29.117Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-06T03:25:29.251Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/audit.png | 2026-07-06T03:25:29.481Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/observability.png | 2026-07-06T03:25:29.698Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/fixtures.png | 2026-07-06T03:25:29.875Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/alerts.png | 2026-07-06T03:25:30.445Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/signoff.png | 2026-07-06T03:25:30.891Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/result.png | 2026-07-06T03:25:30.974Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise.png | 2026-07-06T03:25:31.271Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-isms-scope.png | 2026-07-06T03:25:31.429Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-risk-register.png | 2026-07-06T03:25:31.596Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-06T03:25:31.763Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-assets.png | 2026-07-06T03:25:31.930Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-suppliers.png | 2026-07-06T03:25:32.095Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-access-review.png | 2026-07-06T03:25:32.288Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-secrets-crypto.png | 2026-07-06T03:25:32.451Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-audit-retention.png | 2026-07-06T03:25:32.651Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-backup-dr.png | 2026-07-06T03:25:32.816Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-change-release.png | 2026-07-06T03:25:32.983Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-supply-chain.png | 2026-07-06T03:25:33.145Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-06T03:25:33.304Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-tenant-isolation.png | 2026-07-06T03:25:33.483Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-resilience-capacity.png | 2026-07-06T03:25:33.646Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-observability-runbooks.png | 2026-07-06T03:25:33.800Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-policy-governance.png | 2026-07-06T03:25:33.963Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-iso-control-support.png | 2026-07-06T03:25:34.117Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-internal-audit.png | 2026-07-06T03:25:34.278Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-legal-regulatory.png | 2026-07-06T03:25:34.434Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-security-objectives.png | 2026-07-06T03:25:34.596Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-document-control.png | 2026-07-06T03:25:34.749Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-competence-awareness.png | 2026-07-06T03:25:34.913Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-physical-environmental.png | 2026-07-06T03:25:35.068Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-secure-sdlc.png | 2026-07-06T03:25:35.228Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-evidence-integrity.png | 2026-07-06T03:25:35.422Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-06T03:25:35.583Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-management-review.png | 2026-07-06T03:25:35.745Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/enterprise-single-operator-risk.png | 2026-07-06T03:25:35.900Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | cli-equivalent | http://127.0.0.1:18080/.well-known/usf-public-edge.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| caddy | platform operator | direct-screenshot | http://127.0.0.1:8081/, https://127.0.0.1:8443/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-caddy.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| react-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T03-22-56-912Z/screenshots/compose-service-react-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-06T03-22-56-953Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
