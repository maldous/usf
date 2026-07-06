# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: 6d0f95efa3faf5789361bc2b41135d4db58daca0
Base URL: http://127.0.0.1:31625
Generated: 2026-07-06T02:13:15.648Z

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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-06T02:14:10.952Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-06T02:14:11.180Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-keycloak.png | 2026-07-06T02:14:23.222Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-06T02:14:23.418Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-06T02:14:23.619Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-minio.png | 2026-07-06T02:14:26.965Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-06T02:14:27.189Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-06T02:14:27.409Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-prometheus.png | 2026-07-06T02:14:27.855Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-grafana.png | 2026-07-06T02:14:33.455Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-loki.png | 2026-07-06T02:14:48.598Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-tempo.png | 2026-07-06T02:15:03.732Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-mailpit.png | 2026-07-06T02:15:03.933Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-06T02:15:04.114Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-06T02:15:04.290Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-meilisearch.png | 2026-07-06T02:15:04.522Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-clickhouse.png | 2026-07-06T02:15:04.580Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-pgadmin.png | 2026-07-06T02:15:13.327Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-06T02:15:13.491Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-06T02:15:13.653Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-sonarqube.png | 2026-07-06T02:15:31.126Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-06T02:15:31.268Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-06T02:15:31.418Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-wiremock.png | 2026-07-06T02:15:31.499Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-alertmanager.png | 2026-07-06T02:15:31.584Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-06T02:15:31.753Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-06T02:15:31.918Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-06T02:15:32.068Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-windmill.png | 2026-07-06T02:15:35.519Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-06T02:15:35.671Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-06T02:15:35.851Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-temporal-ui.png | 2026-07-06T02:15:35.952Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-06T02:15:36.160Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-06T02:15:36.342Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-06T02:15:36.520Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-06T02:15:36.713Z |
| http://127.0.0.1:8081/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-caddy.png | 2026-07-06T02:15:36.928Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-06T02:15:37.106Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/service-evidence/react-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-react-app-evidence-page.png | 2026-07-06T02:15:37.266Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/home.png | 2026-07-06T02:15:48.493Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/foundation-substrate-closure.png | 2026-07-06T02:15:49.039Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/capabilities.png | 2026-07-06T02:15:49.478Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/first-capability-detail.png | 2026-07-06T02:15:49.857Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/first-scenario.png | 2026-07-06T02:15:50.051Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/roles.png | 2026-07-06T02:15:50.167Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/actions.png | 2026-07-06T02:15:50.309Z |
| /proof/actions/qa-mr8l67p0-d0o8vu | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/first-action-detail.png | 2026-07-06T02:15:50.430Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/machine-runs.png | 2026-07-06T02:15:50.572Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/machine-import.png | 2026-07-06T02:15:50.700Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/machine-import-run.png | 2026-07-06T02:15:50.995Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/machine-import-capability.png | 2026-07-06T02:15:51.140Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/machine-review.png | 2026-07-06T02:15:51.334Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/machine-review-gaps.png | 2026-07-06T02:15:51.409Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/machine-review-nonconformities.png | 2026-07-06T02:15:51.475Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/machine-review-corrective-actions.png | 2026-07-06T02:15:51.542Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/machine-export.png | 2026-07-06T02:15:51.668Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/first-evidence.png | 2026-07-06T02:15:51.800Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-06T02:15:51.936Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/audit.png | 2026-07-06T02:15:52.163Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/observability.png | 2026-07-06T02:15:52.397Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/fixtures.png | 2026-07-06T02:15:52.580Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/alerts.png | 2026-07-06T02:15:53.145Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/signoff.png | 2026-07-06T02:15:53.537Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/result.png | 2026-07-06T02:15:53.608Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise.png | 2026-07-06T02:15:53.903Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-isms-scope.png | 2026-07-06T02:15:54.062Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-risk-register.png | 2026-07-06T02:15:54.215Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-06T02:15:54.381Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-assets.png | 2026-07-06T02:15:54.546Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-suppliers.png | 2026-07-06T02:15:54.699Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-access-review.png | 2026-07-06T02:15:54.902Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-secrets-crypto.png | 2026-07-06T02:15:55.067Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-audit-retention.png | 2026-07-06T02:15:55.268Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-backup-dr.png | 2026-07-06T02:15:55.435Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-change-release.png | 2026-07-06T02:15:55.600Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-supply-chain.png | 2026-07-06T02:15:55.762Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-06T02:15:55.922Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-tenant-isolation.png | 2026-07-06T02:15:56.100Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-resilience-capacity.png | 2026-07-06T02:15:56.262Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-observability-runbooks.png | 2026-07-06T02:15:56.430Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-policy-governance.png | 2026-07-06T02:15:56.597Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-iso-control-support.png | 2026-07-06T02:15:56.763Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-internal-audit.png | 2026-07-06T02:15:56.914Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-legal-regulatory.png | 2026-07-06T02:15:57.079Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-security-objectives.png | 2026-07-06T02:15:57.248Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-document-control.png | 2026-07-06T02:15:57.413Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-competence-awareness.png | 2026-07-06T02:15:57.580Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-physical-environmental.png | 2026-07-06T02:15:57.747Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-secure-sdlc.png | 2026-07-06T02:15:57.899Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-evidence-integrity.png | 2026-07-06T02:15:58.103Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-06T02:15:58.282Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-management-review.png | 2026-07-06T02:15:58.445Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/enterprise-single-operator-risk.png | 2026-07-06T02:15:58.598Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | cli-equivalent | http://127.0.0.1:18080/.well-known/usf-public-edge.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| caddy | platform operator | direct-screenshot | http://127.0.0.1:8081/, https://127.0.0.1:8443/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-caddy.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| react-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T02-13-15-607Z/screenshots/compose-service-react-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-06T02-13-15-648Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
