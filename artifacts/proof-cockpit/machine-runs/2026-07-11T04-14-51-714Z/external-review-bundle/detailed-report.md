# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: a33c0a551efe9776bf6cdb77880a6013ab5ffdae
Base URL: http://127.0.0.1:24761
Generated: 2026-07-11T04:14:51.757Z

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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-11T04:15:47.607Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-11T04:15:47.828Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-keycloak.png | 2026-07-11T04:15:59.881Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-11T04:16:00.089Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-11T04:16:00.332Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-minio.png | 2026-07-11T04:16:03.738Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-11T04:16:03.992Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-11T04:16:04.213Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-prometheus.png | 2026-07-11T04:16:04.657Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-grafana.png | 2026-07-11T04:16:10.350Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-loki.png | 2026-07-11T04:16:25.493Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-tempo.png | 2026-07-11T04:16:40.642Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-mailpit.png | 2026-07-11T04:16:40.844Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-11T04:16:41.044Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-11T04:16:41.219Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-meilisearch.png | 2026-07-11T04:16:41.465Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-clickhouse.png | 2026-07-11T04:16:41.526Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-pgadmin.png | 2026-07-11T04:16:46.954Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-11T04:16:47.102Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-11T04:16:47.273Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-sonarqube.png | 2026-07-11T04:17:04.771Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-11T04:17:04.922Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-11T04:17:05.088Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-wiremock.png | 2026-07-11T04:17:05.177Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-alertmanager.png | 2026-07-11T04:17:05.263Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-11T04:17:05.432Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-11T04:17:05.604Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-11T04:17:05.771Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-windmill.png | 2026-07-11T04:17:09.214Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-11T04:17:09.368Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-11T04:17:09.547Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-temporal-ui.png | 2026-07-11T04:17:09.634Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-11T04:17:09.813Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-11T04:17:10.001Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-11T04:17:10.182Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-11T04:17:10.379Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/staging-proof-cockpit.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | 2026-07-11T04:17:10.543Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/caddy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-caddy-evidence-page.png | 2026-07-11T04:17:10.730Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-11T04:17:10.905Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/service-evidence/web-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-web-app-evidence-page.png | 2026-07-11T04:17:11.072Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/home.png | 2026-07-11T04:17:22.279Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/foundation-substrate-closure.png | 2026-07-11T04:17:22.869Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/capabilities.png | 2026-07-11T04:17:23.306Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/first-capability-detail.png | 2026-07-11T04:17:23.681Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/first-scenario.png | 2026-07-11T04:17:23.876Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/roles.png | 2026-07-11T04:17:23.992Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/actions.png | 2026-07-11T04:17:24.122Z |
| /proof/actions/qa-mrfupvij-msb3uc | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/first-action-detail.png | 2026-07-11T04:17:24.261Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/machine-runs.png | 2026-07-11T04:17:24.400Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/machine-import.png | 2026-07-11T04:17:24.527Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/machine-import-run.png | 2026-07-11T04:17:24.824Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/machine-import-capability.png | 2026-07-11T04:17:24.980Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/machine-review.png | 2026-07-11T04:17:25.113Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/machine-review-gaps.png | 2026-07-11T04:17:25.188Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/machine-review-nonconformities.png | 2026-07-11T04:17:25.253Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/machine-review-corrective-actions.png | 2026-07-11T04:17:25.319Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/machine-export.png | 2026-07-11T04:17:25.445Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/first-evidence.png | 2026-07-11T04:17:25.577Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-11T04:17:25.712Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/audit.png | 2026-07-11T04:17:25.943Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/observability.png | 2026-07-11T04:17:26.176Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/fixtures.png | 2026-07-11T04:17:26.360Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/alerts.png | 2026-07-11T04:17:26.938Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/signoff.png | 2026-07-11T04:17:27.336Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/result.png | 2026-07-11T04:17:27.419Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise.png | 2026-07-11T04:17:27.715Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-isms-scope.png | 2026-07-11T04:17:27.875Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-risk-register.png | 2026-07-11T04:17:28.026Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-11T04:17:28.192Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-assets.png | 2026-07-11T04:17:28.358Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-suppliers.png | 2026-07-11T04:17:28.510Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-access-review.png | 2026-07-11T04:17:28.713Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-secrets-crypto.png | 2026-07-11T04:17:28.879Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-audit-retention.png | 2026-07-11T04:17:29.079Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-backup-dr.png | 2026-07-11T04:17:29.246Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-change-release.png | 2026-07-11T04:17:29.412Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-supply-chain.png | 2026-07-11T04:17:29.574Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-11T04:17:29.734Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-tenant-isolation.png | 2026-07-11T04:17:29.911Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-resilience-capacity.png | 2026-07-11T04:17:30.073Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-observability-runbooks.png | 2026-07-11T04:17:30.228Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-policy-governance.png | 2026-07-11T04:17:30.391Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-iso-control-support.png | 2026-07-11T04:17:30.557Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-internal-audit.png | 2026-07-11T04:17:30.709Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-legal-regulatory.png | 2026-07-11T04:17:30.872Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-security-objectives.png | 2026-07-11T04:17:31.040Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-document-control.png | 2026-07-11T04:17:31.194Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-competence-awareness.png | 2026-07-11T04:17:31.357Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-physical-environmental.png | 2026-07-11T04:17:31.511Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-secure-sdlc.png | 2026-07-11T04:17:31.672Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-evidence-integrity.png | 2026-07-11T04:17:31.883Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-11T04:17:32.043Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-management-review.png | 2026-07-11T04:17:32.205Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/enterprise-single-operator-risk.png | 2026-07-11T04:17:32.374Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| staging-proof-cockpit | platform operator | unsafe-to-screenshot |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | none |
| caddy | platform operator | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-caddy-evidence-page.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| web-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-11T04-14-51-714Z/screenshots/compose-service-web-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-11T04-14-51-757Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
