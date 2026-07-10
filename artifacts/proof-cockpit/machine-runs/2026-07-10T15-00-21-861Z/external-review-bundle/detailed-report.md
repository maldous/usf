# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: 105c550b6b0690283dfeb6bce324ebabb3634205
Base URL: http://127.0.0.1:8539
Generated: 2026-07-10T15:00:21.904Z

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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-10T15:01:17.555Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-10T15:01:17.794Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-keycloak.png | 2026-07-10T15:01:32.869Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-10T15:01:33.072Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-10T15:01:33.261Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-minio.png | 2026-07-10T15:01:36.567Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-10T15:01:36.798Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-10T15:01:36.998Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-prometheus.png | 2026-07-10T15:01:37.389Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-grafana.png | 2026-07-10T15:01:43.032Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-loki.png | 2026-07-10T15:01:58.182Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-tempo.png | 2026-07-10T15:02:13.316Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-mailpit.png | 2026-07-10T15:02:13.517Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-10T15:02:13.717Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-10T15:02:13.889Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-meilisearch.png | 2026-07-10T15:02:14.138Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-clickhouse.png | 2026-07-10T15:02:14.200Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-pgadmin.png | 2026-07-10T15:02:20.078Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-10T15:02:20.227Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-10T15:02:20.395Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-sonarqube.png | 2026-07-10T15:02:37.893Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-10T15:02:38.045Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-10T15:02:38.215Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-wiremock.png | 2026-07-10T15:02:38.300Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-alertmanager.png | 2026-07-10T15:02:38.386Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-10T15:02:38.554Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-10T15:02:38.729Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-10T15:02:38.895Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-windmill.png | 2026-07-10T15:02:42.386Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-10T15:02:42.542Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-10T15:02:42.723Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-temporal-ui.png | 2026-07-10T15:02:42.811Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-10T15:02:42.986Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-10T15:02:43.173Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-10T15:02:43.353Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-10T15:02:43.536Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/staging-proof-cockpit.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | 2026-07-10T15:02:43.700Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/caddy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-caddy-evidence-page.png | 2026-07-10T15:02:43.884Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-10T15:02:44.060Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/service-evidence/web-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-web-app-evidence-page.png | 2026-07-10T15:02:44.227Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/home.png | 2026-07-10T15:02:55.440Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/foundation-substrate-closure.png | 2026-07-10T15:02:56.024Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/capabilities.png | 2026-07-10T15:02:56.462Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/first-capability-detail.png | 2026-07-10T15:02:56.837Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/first-scenario.png | 2026-07-10T15:02:57.036Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/roles.png | 2026-07-10T15:02:57.151Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/actions.png | 2026-07-10T15:02:57.294Z |
| /proof/actions/qa-mrf2c4s1-6t5rkr | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/first-action-detail.png | 2026-07-10T15:02:57.432Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/machine-runs.png | 2026-07-10T15:02:57.559Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/machine-import.png | 2026-07-10T15:02:57.684Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/machine-import-run.png | 2026-07-10T15:02:57.981Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/machine-import-capability.png | 2026-07-10T15:02:58.138Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/machine-review.png | 2026-07-10T15:02:58.272Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/machine-review-gaps.png | 2026-07-10T15:02:58.345Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/machine-review-nonconformities.png | 2026-07-10T15:02:58.410Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/machine-review-corrective-actions.png | 2026-07-10T15:02:58.477Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/machine-export.png | 2026-07-10T15:02:58.603Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/first-evidence.png | 2026-07-10T15:02:58.736Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-10T15:02:58.870Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/audit.png | 2026-07-10T15:02:59.097Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/observability.png | 2026-07-10T15:02:59.333Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/fixtures.png | 2026-07-10T15:02:59.506Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/alerts.png | 2026-07-10T15:03:00.080Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/signoff.png | 2026-07-10T15:03:00.476Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/result.png | 2026-07-10T15:03:00.560Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise.png | 2026-07-10T15:03:00.853Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-isms-scope.png | 2026-07-10T15:03:01.013Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-risk-register.png | 2026-07-10T15:03:01.165Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-10T15:03:01.329Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-assets.png | 2026-07-10T15:03:01.496Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-suppliers.png | 2026-07-10T15:03:01.662Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-access-review.png | 2026-07-10T15:03:01.869Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-secrets-crypto.png | 2026-07-10T15:03:02.034Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-audit-retention.png | 2026-07-10T15:03:02.234Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-backup-dr.png | 2026-07-10T15:03:02.402Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-change-release.png | 2026-07-10T15:03:02.569Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-supply-chain.png | 2026-07-10T15:03:02.731Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-10T15:03:02.890Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-tenant-isolation.png | 2026-07-10T15:03:03.066Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-resilience-capacity.png | 2026-07-10T15:03:03.229Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-observability-runbooks.png | 2026-07-10T15:03:03.399Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-policy-governance.png | 2026-07-10T15:03:03.564Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-iso-control-support.png | 2026-07-10T15:03:03.717Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-internal-audit.png | 2026-07-10T15:03:03.881Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-legal-regulatory.png | 2026-07-10T15:03:04.047Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-security-objectives.png | 2026-07-10T15:03:04.199Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-document-control.png | 2026-07-10T15:03:04.364Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-competence-awareness.png | 2026-07-10T15:03:04.533Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-physical-environmental.png | 2026-07-10T15:03:04.697Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-secure-sdlc.png | 2026-07-10T15:03:04.850Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-evidence-integrity.png | 2026-07-10T15:03:05.054Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-10T15:03:05.216Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-management-review.png | 2026-07-10T15:03:05.380Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/enterprise-single-operator-risk.png | 2026-07-10T15:03:05.534Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| staging-proof-cockpit | platform operator | unsafe-to-screenshot |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | none |
| caddy | platform operator | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-caddy-evidence-page.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| web-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T15-00-21-861Z/screenshots/compose-service-web-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-10T15-00-21-904Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
