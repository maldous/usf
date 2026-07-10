# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: 8e28cb3b3608b2acf7840372b0dcd65dee3c349c
Base URL: http://127.0.0.1:20111
Generated: 2026-07-10T11:07:22.934Z

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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-10T11:08:20.134Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-10T11:08:20.339Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-keycloak.png | 2026-07-10T11:08:32.342Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-10T11:08:32.544Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-10T11:08:32.741Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-minio.png | 2026-07-10T11:08:36.117Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-10T11:08:36.384Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-10T11:08:36.609Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-prometheus.png | 2026-07-10T11:08:37.109Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-grafana.png | 2026-07-10T11:08:42.729Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-loki.png | 2026-07-10T11:08:57.875Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-tempo.png | 2026-07-10T11:09:13.008Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-mailpit.png | 2026-07-10T11:09:13.210Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-10T11:09:13.410Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-10T11:09:13.584Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-meilisearch.png | 2026-07-10T11:09:13.831Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-clickhouse.png | 2026-07-10T11:09:13.890Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-pgadmin.png | 2026-07-10T11:09:19.337Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-10T11:09:19.485Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-10T11:09:19.656Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-sonarqube.png | 2026-07-10T11:09:37.137Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-10T11:09:37.289Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-10T11:09:37.455Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-wiremock.png | 2026-07-10T11:09:37.542Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-alertmanager.png | 2026-07-10T11:09:37.644Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-10T11:09:37.814Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-10T11:09:37.988Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-10T11:09:38.154Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-windmill.png | 2026-07-10T11:09:41.628Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-10T11:09:41.784Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-10T11:09:41.964Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-temporal-ui.png | 2026-07-10T11:09:42.063Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-10T11:09:42.279Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-10T11:09:42.463Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-10T11:09:42.630Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-10T11:09:42.829Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/staging-proof-cockpit.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | 2026-07-10T11:09:42.993Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/caddy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-caddy-evidence-page.png | 2026-07-10T11:09:43.177Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-10T11:09:43.353Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/service-evidence/web-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-web-app-evidence-page.png | 2026-07-10T11:09:43.520Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/home.png | 2026-07-10T11:09:54.713Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/foundation-substrate-closure.png | 2026-07-10T11:09:55.284Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/capabilities.png | 2026-07-10T11:09:55.720Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/first-capability-detail.png | 2026-07-10T11:09:56.096Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/first-scenario.png | 2026-07-10T11:09:56.293Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/roles.png | 2026-07-10T11:09:56.410Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/actions.png | 2026-07-10T11:09:56.554Z |
| /proof/actions/qa-mreu0iiq-6dsq6f | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/first-action-detail.png | 2026-07-10T11:09:56.690Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/machine-runs.png | 2026-07-10T11:09:56.831Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/machine-import.png | 2026-07-10T11:09:56.960Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/machine-import-run.png | 2026-07-10T11:09:57.257Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/machine-import-capability.png | 2026-07-10T11:09:57.413Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/machine-review.png | 2026-07-10T11:09:57.547Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/machine-review-gaps.png | 2026-07-10T11:09:57.621Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/machine-review-nonconformities.png | 2026-07-10T11:09:57.686Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/machine-review-corrective-actions.png | 2026-07-10T11:09:57.752Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/machine-export.png | 2026-07-10T11:09:57.879Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/first-evidence.png | 2026-07-10T11:09:58.011Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-10T11:09:58.145Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/audit.png | 2026-07-10T11:09:58.373Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/observability.png | 2026-07-10T11:09:58.606Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/fixtures.png | 2026-07-10T11:09:58.790Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/alerts.png | 2026-07-10T11:09:59.358Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/signoff.png | 2026-07-10T11:09:59.776Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/result.png | 2026-07-10T11:09:59.852Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise.png | 2026-07-10T11:10:00.164Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-isms-scope.png | 2026-07-10T11:10:00.323Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-risk-register.png | 2026-07-10T11:10:00.475Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-10T11:10:00.627Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-assets.png | 2026-07-10T11:10:00.789Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-suppliers.png | 2026-07-10T11:10:00.942Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-access-review.png | 2026-07-10T11:10:01.144Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-secrets-crypto.png | 2026-07-10T11:10:01.310Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-audit-retention.png | 2026-07-10T11:10:01.511Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-backup-dr.png | 2026-07-10T11:10:01.676Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-change-release.png | 2026-07-10T11:10:01.843Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-supply-chain.png | 2026-07-10T11:10:02.006Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-10T11:10:02.165Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-tenant-isolation.png | 2026-07-10T11:10:02.342Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-resilience-capacity.png | 2026-07-10T11:10:02.507Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-observability-runbooks.png | 2026-07-10T11:10:02.673Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-policy-governance.png | 2026-07-10T11:10:02.826Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-iso-control-support.png | 2026-07-10T11:10:02.990Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-internal-audit.png | 2026-07-10T11:10:03.142Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-legal-regulatory.png | 2026-07-10T11:10:03.306Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-security-objectives.png | 2026-07-10T11:10:03.474Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-document-control.png | 2026-07-10T11:10:03.639Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-competence-awareness.png | 2026-07-10T11:10:03.794Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-physical-environmental.png | 2026-07-10T11:10:03.959Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-secure-sdlc.png | 2026-07-10T11:10:04.123Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-evidence-integrity.png | 2026-07-10T11:10:04.329Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-10T11:10:04.492Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-management-review.png | 2026-07-10T11:10:04.655Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/enterprise-single-operator-risk.png | 2026-07-10T11:10:04.823Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| staging-proof-cockpit | platform operator | unsafe-to-screenshot |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | none |
| caddy | platform operator | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-caddy-evidence-page.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| web-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T11-07-22-890Z/screenshots/compose-service-web-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-10T11-07-22-934Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
