# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: f6bf044571b6a8d08118647627a0202173c207e7
Base URL: http://127.0.0.1:30059
Generated: 2026-07-10T04:56:11.863Z

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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-10T04:57:06.794Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-10T04:57:06.996Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-keycloak.png | 2026-07-10T04:57:21.392Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-10T04:57:21.601Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-10T04:57:21.816Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-minio.png | 2026-07-10T04:57:25.162Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-10T04:57:25.428Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-10T04:57:25.653Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-prometheus.png | 2026-07-10T04:57:26.094Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-grafana.png | 2026-07-10T04:57:31.540Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-loki.png | 2026-07-10T04:57:46.684Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-tempo.png | 2026-07-10T04:58:01.831Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-mailpit.png | 2026-07-10T04:58:02.034Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-10T04:58:02.235Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-10T04:58:02.410Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-meilisearch.png | 2026-07-10T04:58:02.640Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-clickhouse.png | 2026-07-10T04:58:02.699Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-pgadmin.png | 2026-07-10T04:58:11.329Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-10T04:58:11.490Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-10T04:58:11.663Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-sonarqube.png | 2026-07-10T04:58:29.161Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-10T04:58:29.328Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-10T04:58:29.494Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-wiremock.png | 2026-07-10T04:58:29.569Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-alertmanager.png | 2026-07-10T04:58:29.641Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-10T04:58:29.806Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-10T04:58:29.979Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-10T04:58:30.145Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-windmill.png | 2026-07-10T04:58:33.553Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-10T04:58:33.708Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-10T04:58:33.887Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-temporal-ui.png | 2026-07-10T04:58:33.973Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-10T04:58:34.177Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-10T04:58:34.358Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-10T04:58:34.540Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-10T04:58:34.737Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/staging-proof-cockpit.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | 2026-07-10T04:58:34.900Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/caddy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-caddy-evidence-page.png | 2026-07-10T04:58:35.102Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-10T04:58:35.277Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/service-evidence/web-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-web-app-evidence-page.png | 2026-07-10T04:58:35.445Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/home.png | 2026-07-10T04:58:46.669Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/foundation-substrate-closure.png | 2026-07-10T04:58:47.242Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/capabilities.png | 2026-07-10T04:58:47.681Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/first-capability-detail.png | 2026-07-10T04:58:48.056Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/first-scenario.png | 2026-07-10T04:58:48.251Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/roles.png | 2026-07-10T04:58:48.369Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/actions.png | 2026-07-10T04:58:48.510Z |
| /proof/actions/qa-mregr5sx-xiwpcs | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/first-action-detail.png | 2026-07-10T04:58:48.647Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/machine-runs.png | 2026-07-10T04:58:48.772Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/machine-import.png | 2026-07-10T04:58:48.901Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/machine-import-run.png | 2026-07-10T04:58:49.196Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/machine-import-capability.png | 2026-07-10T04:58:49.355Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/machine-review.png | 2026-07-10T04:58:49.486Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/machine-review-gaps.png | 2026-07-10T04:58:49.560Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/machine-review-nonconformities.png | 2026-07-10T04:58:49.627Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/machine-review-corrective-actions.png | 2026-07-10T04:58:49.694Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/machine-export.png | 2026-07-10T04:58:49.820Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/first-evidence.png | 2026-07-10T04:58:49.954Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-10T04:58:50.086Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/audit.png | 2026-07-10T04:58:50.314Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/observability.png | 2026-07-10T04:58:50.548Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/fixtures.png | 2026-07-10T04:58:50.733Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/alerts.png | 2026-07-10T04:58:51.313Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/signoff.png | 2026-07-10T04:58:51.715Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/result.png | 2026-07-10T04:58:51.793Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise.png | 2026-07-10T04:58:52.089Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-isms-scope.png | 2026-07-10T04:58:52.247Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-risk-register.png | 2026-07-10T04:58:52.401Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-10T04:58:52.565Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-assets.png | 2026-07-10T04:58:52.731Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-suppliers.png | 2026-07-10T04:58:52.883Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-access-review.png | 2026-07-10T04:58:53.086Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-secrets-crypto.png | 2026-07-10T04:58:53.252Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-audit-retention.png | 2026-07-10T04:58:53.452Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-backup-dr.png | 2026-07-10T04:58:53.619Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-change-release.png | 2026-07-10T04:58:53.786Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-supply-chain.png | 2026-07-10T04:58:53.948Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-10T04:58:54.119Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-tenant-isolation.png | 2026-07-10T04:58:54.300Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-resilience-capacity.png | 2026-07-10T04:58:54.464Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-observability-runbooks.png | 2026-07-10T04:58:54.617Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-policy-governance.png | 2026-07-10T04:58:54.782Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-iso-control-support.png | 2026-07-10T04:58:54.936Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-internal-audit.png | 2026-07-10T04:58:55.097Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-legal-regulatory.png | 2026-07-10T04:58:55.264Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-security-objectives.png | 2026-07-10T04:58:55.431Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-document-control.png | 2026-07-10T04:58:55.583Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-competence-awareness.png | 2026-07-10T04:58:55.749Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-physical-environmental.png | 2026-07-10T04:58:55.916Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-secure-sdlc.png | 2026-07-10T04:58:56.080Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-evidence-integrity.png | 2026-07-10T04:58:56.275Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-10T04:58:56.434Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-management-review.png | 2026-07-10T04:58:56.596Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/enterprise-single-operator-risk.png | 2026-07-10T04:58:56.751Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| staging-proof-cockpit | platform operator | unsafe-to-screenshot |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | none |
| caddy | platform operator | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-caddy-evidence-page.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| web-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T04-56-11-817Z/screenshots/compose-service-web-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-10T04-56-11-863Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
