# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: 2d6078d57d8dde04dcceb93cb472feac50177aba
Base URL: http://127.0.0.1:18547
Generated: 2026-07-08T12:40:08.113Z

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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-08T12:41:01.803Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-08T12:41:02.023Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-keycloak.png | 2026-07-08T12:41:16.712Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-08T12:41:16.900Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-08T12:41:17.098Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-minio.png | 2026-07-08T12:41:20.445Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-08T12:41:20.700Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-08T12:41:20.908Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-prometheus.png | 2026-07-08T12:41:21.328Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-grafana.png | 2026-07-08T12:41:26.924Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-loki.png | 2026-07-08T12:41:42.065Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-tempo.png | 2026-07-08T12:41:57.198Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-mailpit.png | 2026-07-08T12:41:57.399Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-08T12:41:57.600Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-08T12:41:57.774Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-meilisearch.png | 2026-07-08T12:41:58.021Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-clickhouse.png | 2026-07-08T12:41:58.080Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-pgadmin.png | 2026-07-08T12:42:03.510Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-08T12:42:03.657Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-08T12:42:03.828Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-sonarqube.png | 2026-07-08T12:42:21.327Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-08T12:42:21.478Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-08T12:42:21.645Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-wiremock.png | 2026-07-08T12:42:21.731Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-alertmanager.png | 2026-07-08T12:42:21.817Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-08T12:42:21.988Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-08T12:42:22.160Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-08T12:42:22.326Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-windmill.png | 2026-07-08T12:42:25.752Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-08T12:42:25.906Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-08T12:42:26.087Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-temporal-ui.png | 2026-07-08T12:42:26.189Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-08T12:42:26.393Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-08T12:42:26.573Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-08T12:42:26.753Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-08T12:42:26.952Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/staging-proof-cockpit.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | 2026-07-08T12:42:27.133Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/caddy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-caddy-evidence-page.png | 2026-07-08T12:42:27.333Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-08T12:42:27.510Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/service-evidence/web-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-web-app-evidence-page.png | 2026-07-08T12:42:27.676Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/home.png | 2026-07-08T12:42:38.868Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/foundation-substrate-closure.png | 2026-07-08T12:42:39.424Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/capabilities.png | 2026-07-08T12:42:39.859Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/first-capability-detail.png | 2026-07-08T12:42:40.235Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/first-scenario.png | 2026-07-08T12:42:40.434Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/roles.png | 2026-07-08T12:42:40.565Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/actions.png | 2026-07-08T12:42:40.709Z |
| /proof/actions/qa-mrc2g2fu-kdagik | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/first-action-detail.png | 2026-07-08T12:42:40.846Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/machine-runs.png | 2026-07-08T12:42:40.972Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/machine-import.png | 2026-07-08T12:42:41.100Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/machine-import-run.png | 2026-07-08T12:42:41.397Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/machine-import-capability.png | 2026-07-08T12:42:41.538Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/machine-review.png | 2026-07-08T12:42:41.668Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/machine-review-gaps.png | 2026-07-08T12:42:41.743Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/machine-review-nonconformities.png | 2026-07-08T12:42:41.808Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/machine-review-corrective-actions.png | 2026-07-08T12:42:41.875Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/machine-export.png | 2026-07-08T12:42:42.002Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/first-evidence.png | 2026-07-08T12:42:42.133Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-08T12:42:42.267Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/audit.png | 2026-07-08T12:42:42.494Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/observability.png | 2026-07-08T12:42:42.713Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/fixtures.png | 2026-07-08T12:42:42.897Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/alerts.png | 2026-07-08T12:42:43.458Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/signoff.png | 2026-07-08T12:42:43.858Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/result.png | 2026-07-08T12:42:43.942Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise.png | 2026-07-08T12:42:44.236Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-isms-scope.png | 2026-07-08T12:42:44.396Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-risk-register.png | 2026-07-08T12:42:44.548Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-08T12:42:44.712Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-assets.png | 2026-07-08T12:42:44.879Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-suppliers.png | 2026-07-08T12:42:45.030Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-access-review.png | 2026-07-08T12:42:45.234Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-secrets-crypto.png | 2026-07-08T12:42:45.399Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-audit-retention.png | 2026-07-08T12:42:45.600Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-backup-dr.png | 2026-07-08T12:42:45.768Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-change-release.png | 2026-07-08T12:42:45.934Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-supply-chain.png | 2026-07-08T12:42:46.095Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-08T12:42:46.268Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-tenant-isolation.png | 2026-07-08T12:42:46.449Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-resilience-capacity.png | 2026-07-08T12:42:46.612Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-observability-runbooks.png | 2026-07-08T12:42:46.766Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-policy-governance.png | 2026-07-08T12:42:46.930Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-iso-control-support.png | 2026-07-08T12:42:47.095Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-internal-audit.png | 2026-07-08T12:42:47.261Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-legal-regulatory.png | 2026-07-08T12:42:47.430Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-security-objectives.png | 2026-07-08T12:42:47.583Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-document-control.png | 2026-07-08T12:42:47.745Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-competence-awareness.png | 2026-07-08T12:42:47.912Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-physical-environmental.png | 2026-07-08T12:42:48.082Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-secure-sdlc.png | 2026-07-08T12:42:48.246Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-evidence-integrity.png | 2026-07-08T12:42:48.442Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-08T12:42:48.599Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-management-review.png | 2026-07-08T12:42:48.761Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/enterprise-single-operator-risk.png | 2026-07-08T12:42:48.930Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| staging-proof-cockpit | platform operator | unsafe-to-screenshot |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | none |
| caddy | platform operator | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-caddy-evidence-page.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| web-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T12-40-08-070Z/screenshots/compose-service-web-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-08T12-40-08-113Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
