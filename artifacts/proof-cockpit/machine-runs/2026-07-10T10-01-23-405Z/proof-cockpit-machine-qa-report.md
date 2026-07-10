# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: e4fd5ee1a3cb47364565960dd0114b3320160202
Base URL: http://127.0.0.1:14851
Generated: 2026-07-10T10:01:23.443Z

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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-10T10:02:19.483Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-10T10:02:19.722Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-keycloak.png | 2026-07-10T10:02:31.816Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-10T10:02:32.005Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-10T10:02:32.204Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-minio.png | 2026-07-10T10:02:35.580Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-10T10:02:35.828Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-10T10:02:36.065Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-prometheus.png | 2026-07-10T10:02:36.506Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-grafana.png | 2026-07-10T10:02:42.108Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-loki.png | 2026-07-10T10:02:57.250Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-tempo.png | 2026-07-10T10:03:12.385Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-mailpit.png | 2026-07-10T10:03:12.585Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-10T10:03:12.787Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-10T10:03:12.959Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-meilisearch.png | 2026-07-10T10:03:13.206Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-clickhouse.png | 2026-07-10T10:03:13.267Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-pgadmin.png | 2026-07-10T10:03:18.879Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-10T10:03:19.043Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-10T10:03:19.214Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-sonarqube.png | 2026-07-10T10:03:36.696Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-10T10:03:36.846Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-10T10:03:37.011Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-wiremock.png | 2026-07-10T10:03:37.100Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-alertmanager.png | 2026-07-10T10:03:37.186Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-10T10:03:37.357Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-10T10:03:37.513Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-10T10:03:37.679Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-windmill.png | 2026-07-10T10:03:41.121Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-10T10:03:41.275Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-10T10:03:41.455Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-temporal-ui.png | 2026-07-10T10:03:41.556Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-10T10:03:41.763Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-10T10:03:41.942Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-10T10:03:42.121Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-10T10:03:42.320Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/staging-proof-cockpit.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | 2026-07-10T10:03:42.500Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/caddy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-caddy-evidence-page.png | 2026-07-10T10:03:42.685Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-10T10:03:42.861Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/service-evidence/web-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-web-app-evidence-page.png | 2026-07-10T10:03:43.029Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/home.png | 2026-07-10T10:03:54.220Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/foundation-substrate-closure.png | 2026-07-10T10:03:54.595Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/capabilities.png | 2026-07-10T10:03:55.030Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/first-capability-detail.png | 2026-07-10T10:03:55.405Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/first-scenario.png | 2026-07-10T10:03:55.601Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/roles.png | 2026-07-10T10:03:55.717Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/actions.png | 2026-07-10T10:03:55.847Z |
| /proof/actions/qa-mrernntz-o577lv | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/first-action-detail.png | 2026-07-10T10:03:55.982Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/machine-runs.png | 2026-07-10T10:03:56.125Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/machine-import.png | 2026-07-10T10:03:56.252Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/machine-import-run.png | 2026-07-10T10:03:56.546Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/machine-import-capability.png | 2026-07-10T10:03:56.704Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/machine-review.png | 2026-07-10T10:03:56.836Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/machine-review-gaps.png | 2026-07-10T10:03:56.911Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/machine-review-nonconformities.png | 2026-07-10T10:03:56.977Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/machine-review-corrective-actions.png | 2026-07-10T10:03:57.044Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/machine-export.png | 2026-07-10T10:03:57.170Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/first-evidence.png | 2026-07-10T10:03:57.303Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-10T10:03:57.436Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/audit.png | 2026-07-10T10:03:57.665Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/observability.png | 2026-07-10T10:03:57.899Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/fixtures.png | 2026-07-10T10:03:58.081Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/alerts.png | 2026-07-10T10:03:58.642Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/signoff.png | 2026-07-10T10:03:59.047Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/result.png | 2026-07-10T10:03:59.113Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise.png | 2026-07-10T10:03:59.420Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-isms-scope.png | 2026-07-10T10:03:59.581Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-risk-register.png | 2026-07-10T10:03:59.734Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-10T10:03:59.899Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-assets.png | 2026-07-10T10:04:00.065Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-suppliers.png | 2026-07-10T10:04:00.217Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-access-review.png | 2026-07-10T10:04:00.421Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-secrets-crypto.png | 2026-07-10T10:04:00.586Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-audit-retention.png | 2026-07-10T10:04:00.787Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-backup-dr.png | 2026-07-10T10:04:00.953Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-change-release.png | 2026-07-10T10:04:01.120Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-supply-chain.png | 2026-07-10T10:04:01.281Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-10T10:04:01.454Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-tenant-isolation.png | 2026-07-10T10:04:01.634Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-resilience-capacity.png | 2026-07-10T10:04:01.798Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-observability-runbooks.png | 2026-07-10T10:04:01.951Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-policy-governance.png | 2026-07-10T10:04:02.114Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-iso-control-support.png | 2026-07-10T10:04:02.282Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-internal-audit.png | 2026-07-10T10:04:02.434Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-legal-regulatory.png | 2026-07-10T10:04:02.597Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-security-objectives.png | 2026-07-10T10:04:02.765Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-document-control.png | 2026-07-10T10:04:02.917Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-competence-awareness.png | 2026-07-10T10:04:03.081Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-physical-environmental.png | 2026-07-10T10:04:03.234Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-secure-sdlc.png | 2026-07-10T10:04:03.397Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-evidence-integrity.png | 2026-07-10T10:04:03.590Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-10T10:04:03.749Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-management-review.png | 2026-07-10T10:04:03.913Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/enterprise-single-operator-risk.png | 2026-07-10T10:04:04.081Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| staging-proof-cockpit | platform operator | unsafe-to-screenshot |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | none |
| caddy | platform operator | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-caddy-evidence-page.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| web-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T10-01-23-405Z/screenshots/compose-service-web-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-10T10-01-23-443Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
