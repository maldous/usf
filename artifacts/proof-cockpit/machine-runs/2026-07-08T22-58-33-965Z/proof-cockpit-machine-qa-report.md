# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: 01a2e90da3791649d6f450d0330d5991356b04f1
Base URL: http://127.0.0.1:14405
Generated: 2026-07-08T22:58:34.008Z

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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-08T22:59:29.119Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-08T22:59:29.346Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-keycloak.png | 2026-07-08T22:59:41.896Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-08T22:59:42.088Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-08T22:59:42.290Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-minio.png | 2026-07-08T22:59:45.666Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-08T22:59:45.925Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-08T22:59:46.154Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-prometheus.png | 2026-07-08T22:59:46.626Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-grafana.png | 2026-07-08T22:59:52.171Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-loki.png | 2026-07-08T23:00:07.314Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-tempo.png | 2026-07-08T23:00:22.447Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-mailpit.png | 2026-07-08T23:00:22.649Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-08T23:00:22.849Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-08T23:00:23.024Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-meilisearch.png | 2026-07-08T23:00:23.253Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-clickhouse.png | 2026-07-08T23:00:23.298Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-pgadmin.png | 2026-07-08T23:00:31.526Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-08T23:00:31.672Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-08T23:00:31.843Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-sonarqube.png | 2026-07-08T23:00:49.341Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-08T23:00:49.491Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-08T23:00:49.659Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-wiremock.png | 2026-07-08T23:00:49.747Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-alertmanager.png | 2026-07-08T23:00:49.833Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-08T23:00:50.001Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-08T23:00:50.159Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-08T23:00:50.327Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-windmill.png | 2026-07-08T23:00:53.751Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-08T23:00:53.905Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-08T23:00:54.083Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-temporal-ui.png | 2026-07-08T23:00:54.185Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-08T23:00:54.393Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-08T23:00:54.569Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-08T23:00:54.733Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-08T23:00:54.916Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/staging-proof-cockpit.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | 2026-07-08T23:00:55.081Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/caddy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-caddy-evidence-page.png | 2026-07-08T23:00:55.265Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-08T23:00:55.442Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/service-evidence/web-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-web-app-evidence-page.png | 2026-07-08T23:00:55.607Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/home.png | 2026-07-08T23:01:06.838Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/foundation-substrate-closure.png | 2026-07-08T23:01:07.406Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/capabilities.png | 2026-07-08T23:01:07.844Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/first-capability-detail.png | 2026-07-08T23:01:08.221Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/first-scenario.png | 2026-07-08T23:01:08.417Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/roles.png | 2026-07-08T23:01:08.533Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/actions.png | 2026-07-08T23:01:08.674Z |
| /proof/actions/qa-mrcoje4j-ww75gv | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/first-action-detail.png | 2026-07-08T23:01:08.812Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/machine-runs.png | 2026-07-08T23:01:08.937Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/machine-import.png | 2026-07-08T23:01:09.066Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/machine-import-run.png | 2026-07-08T23:01:09.362Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/machine-import-capability.png | 2026-07-08T23:01:09.505Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/machine-review.png | 2026-07-08T23:01:09.650Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/machine-review-gaps.png | 2026-07-08T23:01:09.710Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/machine-review-nonconformities.png | 2026-07-08T23:01:09.774Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/machine-review-corrective-actions.png | 2026-07-08T23:01:09.841Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/machine-export.png | 2026-07-08T23:01:09.966Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/first-evidence.png | 2026-07-08T23:01:10.100Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-08T23:01:10.232Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/audit.png | 2026-07-08T23:01:10.448Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/observability.png | 2026-07-08T23:01:10.668Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/fixtures.png | 2026-07-08T23:01:10.845Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/alerts.png | 2026-07-08T23:01:11.411Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/signoff.png | 2026-07-08T23:01:11.809Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/result.png | 2026-07-08T23:01:11.890Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise.png | 2026-07-08T23:01:12.186Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-isms-scope.png | 2026-07-08T23:01:12.345Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-risk-register.png | 2026-07-08T23:01:12.497Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-08T23:01:12.661Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-assets.png | 2026-07-08T23:01:12.813Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-suppliers.png | 2026-07-08T23:01:12.977Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-access-review.png | 2026-07-08T23:01:13.184Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-secrets-crypto.png | 2026-07-08T23:01:13.350Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-audit-retention.png | 2026-07-08T23:01:13.550Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-backup-dr.png | 2026-07-08T23:01:13.716Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-change-release.png | 2026-07-08T23:01:13.882Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-supply-chain.png | 2026-07-08T23:01:14.046Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-08T23:01:14.205Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-tenant-isolation.png | 2026-07-08T23:01:14.383Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-resilience-capacity.png | 2026-07-08T23:01:14.546Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-observability-runbooks.png | 2026-07-08T23:01:14.698Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-policy-governance.png | 2026-07-08T23:01:14.862Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-iso-control-support.png | 2026-07-08T23:01:15.029Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-internal-audit.png | 2026-07-08T23:01:15.181Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-legal-regulatory.png | 2026-07-08T23:01:15.344Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-security-objectives.png | 2026-07-08T23:01:15.513Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-document-control.png | 2026-07-08T23:01:15.665Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-competence-awareness.png | 2026-07-08T23:01:15.830Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-physical-environmental.png | 2026-07-08T23:01:15.997Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-secure-sdlc.png | 2026-07-08T23:01:16.161Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-evidence-integrity.png | 2026-07-08T23:01:16.355Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-08T23:01:16.513Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-management-review.png | 2026-07-08T23:01:16.677Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/enterprise-single-operator-risk.png | 2026-07-08T23:01:16.845Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| staging-proof-cockpit | platform operator | unsafe-to-screenshot |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | none |
| caddy | platform operator | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-caddy-evidence-page.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| web-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-58-33-965Z/screenshots/compose-service-web-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-08T22-58-34-008Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
