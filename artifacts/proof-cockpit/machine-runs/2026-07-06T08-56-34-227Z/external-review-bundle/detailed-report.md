# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: a74bd261c2909068d39782e2b7ed99845c1fb969
Base URL: http://127.0.0.1:18217
Generated: 2026-07-06T08:56:34.270Z

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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-06T08:57:32.345Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-06T08:57:32.617Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-keycloak.png | 2026-07-06T08:57:45.176Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-06T08:57:45.378Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-06T08:57:45.565Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-minio.png | 2026-07-06T08:57:48.904Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-06T08:57:49.177Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-06T08:57:49.406Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-prometheus.png | 2026-07-06T08:57:49.878Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-grafana.png | 2026-07-06T08:57:55.371Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-loki.png | 2026-07-06T08:58:10.514Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-tempo.png | 2026-07-06T08:58:25.664Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-mailpit.png | 2026-07-06T08:58:25.866Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-06T08:58:26.066Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-06T08:58:26.241Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-meilisearch.png | 2026-07-06T08:58:26.486Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-clickhouse.png | 2026-07-06T08:58:26.546Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-pgadmin.png | 2026-07-06T08:58:31.626Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-06T08:58:31.783Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-06T08:58:31.936Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-sonarqube.png | 2026-07-06T08:58:49.408Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-06T08:58:49.550Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-06T08:58:49.718Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-wiremock.png | 2026-07-06T08:58:49.814Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-alertmanager.png | 2026-07-06T08:58:49.899Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-06T08:58:50.070Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-06T08:58:50.236Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-06T08:58:50.402Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-windmill.png | 2026-07-06T08:58:53.834Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-06T08:58:53.998Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-06T08:58:54.170Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-temporal-ui.png | 2026-07-06T08:58:54.270Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-06T08:58:54.480Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-06T08:58:54.669Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-06T08:58:54.837Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-06T08:58:55.032Z |
| http://127.0.0.1:8081/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-caddy.png | 2026-07-06T08:58:55.261Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-06T08:58:55.442Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/service-evidence/web-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-web-app-evidence-page.png | 2026-07-06T08:58:55.601Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/home.png | 2026-07-06T08:59:06.875Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/foundation-substrate-closure.png | 2026-07-06T08:59:07.242Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/capabilities.png | 2026-07-06T08:59:07.673Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/first-capability-detail.png | 2026-07-06T08:59:08.032Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/first-scenario.png | 2026-07-06T08:59:08.232Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/roles.png | 2026-07-06T08:59:08.349Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/actions.png | 2026-07-06T08:59:08.491Z |
| /proof/actions/qa-mr8zky6y-t74pwq | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/first-action-detail.png | 2026-07-06T08:59:08.628Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/machine-runs.png | 2026-07-06T08:59:08.755Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/machine-import.png | 2026-07-06T08:59:08.883Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/machine-import-run.png | 2026-07-06T08:59:09.176Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/machine-import-capability.png | 2026-07-06T08:59:09.333Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/machine-review.png | 2026-07-06T08:59:09.564Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/machine-review-gaps.png | 2026-07-06T08:59:09.626Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/machine-review-nonconformities.png | 2026-07-06T08:59:09.690Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/machine-review-corrective-actions.png | 2026-07-06T08:59:09.757Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/machine-export.png | 2026-07-06T08:59:09.882Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/first-evidence.png | 2026-07-06T08:59:10.015Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-06T08:59:10.148Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/audit.png | 2026-07-06T08:59:10.363Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/observability.png | 2026-07-06T08:59:10.578Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/fixtures.png | 2026-07-06T08:59:10.760Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/alerts.png | 2026-07-06T08:59:11.322Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/signoff.png | 2026-07-06T08:59:11.751Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/result.png | 2026-07-06T08:59:11.823Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise.png | 2026-07-06T08:59:12.115Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-isms-scope.png | 2026-07-06T08:59:12.276Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-risk-register.png | 2026-07-06T08:59:12.445Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-06T08:59:12.596Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-assets.png | 2026-07-06T08:59:12.760Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-suppliers.png | 2026-07-06T08:59:12.927Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-access-review.png | 2026-07-06T08:59:13.132Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-secrets-crypto.png | 2026-07-06T08:59:13.297Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-audit-retention.png | 2026-07-06T08:59:13.498Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-backup-dr.png | 2026-07-06T08:59:13.664Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-change-release.png | 2026-07-06T08:59:13.831Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-supply-chain.png | 2026-07-06T08:59:13.993Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-06T08:59:14.166Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-tenant-isolation.png | 2026-07-06T08:59:14.347Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-resilience-capacity.png | 2026-07-06T08:59:14.510Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-observability-runbooks.png | 2026-07-06T08:59:14.663Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-policy-governance.png | 2026-07-06T08:59:14.827Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-iso-control-support.png | 2026-07-06T08:59:14.980Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-internal-audit.png | 2026-07-06T08:59:15.143Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-legal-regulatory.png | 2026-07-06T08:59:15.296Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-security-objectives.png | 2026-07-06T08:59:15.461Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-document-control.png | 2026-07-06T08:59:15.612Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-competence-awareness.png | 2026-07-06T08:59:15.777Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-physical-environmental.png | 2026-07-06T08:59:15.931Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-secure-sdlc.png | 2026-07-06T08:59:16.092Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-evidence-integrity.png | 2026-07-06T08:59:16.301Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-06T08:59:16.462Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-management-review.png | 2026-07-06T08:59:16.625Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/enterprise-single-operator-risk.png | 2026-07-06T08:59:16.793Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | cli-equivalent | http://127.0.0.1:18080/.well-known/usf-public-edge.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| caddy | platform operator | direct-screenshot | http://127.0.0.1:8081/, https://127.0.0.1:8443/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-caddy.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| web-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T08-56-34-227Z/screenshots/compose-service-web-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-06T08-56-34-270Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
