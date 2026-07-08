# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: 77bbe24a35d05d315b41186db93259dd5492c74f
Base URL: http://127.0.0.1:9953
Generated: 2026-07-08T22:01:04.554Z

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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-08T22:01:58.609Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-08T22:01:58.845Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-keycloak.png | 2026-07-08T22:02:11.006Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-08T22:02:11.233Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-08T22:02:11.459Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-minio.png | 2026-07-08T22:02:14.823Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-08T22:02:15.084Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-08T22:02:15.283Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-prometheus.png | 2026-07-08T22:02:15.698Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-grafana.png | 2026-07-08T22:02:21.342Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-loki.png | 2026-07-08T22:02:36.485Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-tempo.png | 2026-07-08T22:02:51.635Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-mailpit.png | 2026-07-08T22:02:51.837Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-08T22:02:52.037Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-08T22:02:52.213Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-meilisearch.png | 2026-07-08T22:02:52.443Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-clickhouse.png | 2026-07-08T22:02:52.486Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-pgadmin.png | 2026-07-08T22:03:00.598Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-08T22:03:00.761Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-08T22:03:00.933Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-sonarqube.png | 2026-07-08T22:03:18.429Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-08T22:03:18.581Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-08T22:03:18.748Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-wiremock.png | 2026-07-08T22:03:18.836Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-alertmanager.png | 2026-07-08T22:03:18.921Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-08T22:03:19.090Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-08T22:03:19.264Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-08T22:03:19.430Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-windmill.png | 2026-07-08T22:03:22.906Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-08T22:03:23.060Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-08T22:03:23.240Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-temporal-ui.png | 2026-07-08T22:03:23.340Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-08T22:03:23.548Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-08T22:03:23.726Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-08T22:03:23.907Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-08T22:03:24.106Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/staging-proof-cockpit.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | 2026-07-08T22:03:24.269Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/caddy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-caddy-evidence-page.png | 2026-07-08T22:03:24.454Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-08T22:03:24.630Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/service-evidence/web-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-web-app-evidence-page.png | 2026-07-08T22:03:24.797Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/home.png | 2026-07-08T22:03:35.989Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/foundation-substrate-closure.png | 2026-07-08T22:03:36.562Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/capabilities.png | 2026-07-08T22:03:37.000Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/first-capability-detail.png | 2026-07-08T22:03:37.373Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/first-scenario.png | 2026-07-08T22:03:37.574Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/roles.png | 2026-07-08T22:03:37.688Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/actions.png | 2026-07-08T22:03:37.830Z |
| /proof/actions/qa-mrcmhg3t-ec7c00 | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/first-action-detail.png | 2026-07-08T22:03:37.967Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/machine-runs.png | 2026-07-08T22:03:38.094Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/machine-import.png | 2026-07-08T22:03:38.221Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/machine-import-run.png | 2026-07-08T22:03:38.517Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/machine-import-capability.png | 2026-07-08T22:03:38.661Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/machine-review.png | 2026-07-08T22:03:38.803Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/machine-review-gaps.png | 2026-07-08T22:03:38.865Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/machine-review-nonconformities.png | 2026-07-08T22:03:38.930Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/machine-review-corrective-actions.png | 2026-07-08T22:03:38.996Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/machine-export.png | 2026-07-08T22:03:39.122Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/first-evidence.png | 2026-07-08T22:03:39.258Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-08T22:03:39.389Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/audit.png | 2026-07-08T22:03:39.618Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/observability.png | 2026-07-08T22:03:39.850Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/fixtures.png | 2026-07-08T22:03:40.034Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/alerts.png | 2026-07-08T22:03:40.602Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/signoff.png | 2026-07-08T22:03:40.997Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/result.png | 2026-07-08T22:03:41.079Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise.png | 2026-07-08T22:03:41.376Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-isms-scope.png | 2026-07-08T22:03:41.533Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-risk-register.png | 2026-07-08T22:03:41.687Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-08T22:03:41.851Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-assets.png | 2026-07-08T22:03:42.001Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-suppliers.png | 2026-07-08T22:03:42.166Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-access-review.png | 2026-07-08T22:03:42.373Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-secrets-crypto.png | 2026-07-08T22:03:42.537Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-audit-retention.png | 2026-07-08T22:03:42.739Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-backup-dr.png | 2026-07-08T22:03:42.903Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-change-release.png | 2026-07-08T22:03:43.071Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-supply-chain.png | 2026-07-08T22:03:43.232Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-08T22:03:43.406Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-tenant-isolation.png | 2026-07-08T22:03:43.587Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-resilience-capacity.png | 2026-07-08T22:03:43.751Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-observability-runbooks.png | 2026-07-08T22:03:43.917Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-policy-governance.png | 2026-07-08T22:03:44.070Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-iso-control-support.png | 2026-07-08T22:03:44.234Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-internal-audit.png | 2026-07-08T22:03:44.387Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-legal-regulatory.png | 2026-07-08T22:03:44.552Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-security-objectives.png | 2026-07-08T22:03:44.718Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-document-control.png | 2026-07-08T22:03:44.883Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-competence-awareness.png | 2026-07-08T22:03:45.039Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-physical-environmental.png | 2026-07-08T22:03:45.201Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-secure-sdlc.png | 2026-07-08T22:03:45.353Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-evidence-integrity.png | 2026-07-08T22:03:45.557Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-08T22:03:45.719Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-management-review.png | 2026-07-08T22:03:45.882Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/enterprise-single-operator-risk.png | 2026-07-08T22:03:46.050Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| staging-proof-cockpit | platform operator | unsafe-to-screenshot |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | none |
| caddy | platform operator | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-caddy-evidence-page.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| web-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T22-01-04-512Z/screenshots/compose-service-web-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-08T22-01-04-554Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
