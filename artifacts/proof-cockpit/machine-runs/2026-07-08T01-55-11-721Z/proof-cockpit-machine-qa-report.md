# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: d998e3439f2893c67172833f016bc3aff51f647a
Base URL: http://127.0.0.1:3473
Generated: 2026-07-08T01:55:11.765Z

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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-08T01:56:07.633Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-08T01:56:07.882Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-keycloak.png | 2026-07-08T01:56:20.382Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-08T01:56:20.591Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-08T01:56:20.779Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-minio.png | 2026-07-08T01:56:24.157Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-08T01:56:24.403Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-08T01:56:24.615Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-prometheus.png | 2026-07-08T01:56:25.038Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-grafana.png | 2026-07-08T01:56:30.721Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-loki.png | 2026-07-08T01:56:45.864Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-tempo.png | 2026-07-08T01:57:00.996Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-mailpit.png | 2026-07-08T01:57:01.199Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-08T01:57:01.399Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-08T01:57:01.589Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-meilisearch.png | 2026-07-08T01:57:01.836Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-clickhouse.png | 2026-07-08T01:57:01.895Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-pgadmin.png | 2026-07-08T01:57:07.108Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-08T01:57:07.272Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-08T01:57:07.443Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-sonarqube.png | 2026-07-08T01:57:24.941Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-08T01:57:25.107Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-08T01:57:25.274Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-wiremock.png | 2026-07-08T01:57:25.363Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-alertmanager.png | 2026-07-08T01:57:25.449Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-08T01:57:25.618Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-08T01:57:25.792Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-08T01:57:25.957Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-windmill.png | 2026-07-08T01:57:29.401Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-08T01:57:29.554Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-08T01:57:29.734Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-temporal-ui.png | 2026-07-08T01:57:29.822Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-08T01:57:30.025Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-08T01:57:30.221Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-08T01:57:30.405Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-08T01:57:30.602Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/staging-proof-cockpit.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | 2026-07-08T01:57:30.779Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/caddy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-caddy-evidence-page.png | 2026-07-08T01:57:30.965Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-08T01:57:31.140Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/service-evidence/web-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-web-app-evidence-page.png | 2026-07-08T01:57:31.308Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/home.png | 2026-07-08T01:57:42.500Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/foundation-substrate-closure.png | 2026-07-08T01:57:42.875Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/capabilities.png | 2026-07-08T01:57:43.311Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/first-capability-detail.png | 2026-07-08T01:57:43.687Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/first-scenario.png | 2026-07-08T01:57:43.880Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/roles.png | 2026-07-08T01:57:43.996Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/actions.png | 2026-07-08T01:57:44.127Z |
| /proof/actions/qa-mrbfepf0-7c1ut2 | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/first-action-detail.png | 2026-07-08T01:57:44.262Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/machine-runs.png | 2026-07-08T01:57:44.403Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/machine-import.png | 2026-07-08T01:57:44.531Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/machine-import-run.png | 2026-07-08T01:57:44.829Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/machine-import-capability.png | 2026-07-08T01:57:44.986Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/machine-review.png | 2026-07-08T01:57:45.115Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/machine-review-gaps.png | 2026-07-08T01:57:45.191Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/machine-review-nonconformities.png | 2026-07-08T01:57:45.256Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/machine-review-corrective-actions.png | 2026-07-08T01:57:45.323Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/machine-export.png | 2026-07-08T01:57:45.450Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/first-evidence.png | 2026-07-08T01:57:45.582Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-08T01:57:45.717Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/audit.png | 2026-07-08T01:57:45.944Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/observability.png | 2026-07-08T01:57:46.178Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/fixtures.png | 2026-07-08T01:57:46.362Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/alerts.png | 2026-07-08T01:57:46.938Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/signoff.png | 2026-07-08T01:57:47.344Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/result.png | 2026-07-08T01:57:47.409Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise.png | 2026-07-08T01:57:47.719Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-isms-scope.png | 2026-07-08T01:57:47.877Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-risk-register.png | 2026-07-08T01:57:48.030Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-08T01:57:48.196Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-assets.png | 2026-07-08T01:57:48.361Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-suppliers.png | 2026-07-08T01:57:48.514Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-access-review.png | 2026-07-08T01:57:48.716Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-secrets-crypto.png | 2026-07-08T01:57:48.883Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-audit-retention.png | 2026-07-08T01:57:49.082Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-backup-dr.png | 2026-07-08T01:57:49.249Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-change-release.png | 2026-07-08T01:57:49.416Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-supply-chain.png | 2026-07-08T01:57:49.576Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-08T01:57:49.737Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-tenant-isolation.png | 2026-07-08T01:57:49.916Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-resilience-capacity.png | 2026-07-08T01:57:50.077Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-observability-runbooks.png | 2026-07-08T01:57:50.247Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-policy-governance.png | 2026-07-08T01:57:50.413Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-iso-control-support.png | 2026-07-08T01:57:50.578Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-internal-audit.png | 2026-07-08T01:57:50.744Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-legal-regulatory.png | 2026-07-08T01:57:50.911Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-security-objectives.png | 2026-07-08T01:57:51.080Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-document-control.png | 2026-07-08T01:57:51.244Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-competence-awareness.png | 2026-07-08T01:57:51.413Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-physical-environmental.png | 2026-07-08T01:57:51.579Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-secure-sdlc.png | 2026-07-08T01:57:51.743Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-evidence-integrity.png | 2026-07-08T01:57:51.937Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-08T01:57:52.098Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-management-review.png | 2026-07-08T01:57:52.260Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/enterprise-single-operator-risk.png | 2026-07-08T01:57:52.417Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| staging-proof-cockpit | platform operator | unsafe-to-screenshot |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | none |
| caddy | platform operator | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-caddy-evidence-page.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| web-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-08T01-55-11-721Z/screenshots/compose-service-web-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-08T01-55-11-765Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
