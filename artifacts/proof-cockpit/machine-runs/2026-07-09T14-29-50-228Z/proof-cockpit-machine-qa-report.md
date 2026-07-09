# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: 9b81620969d667f1bd2191f8c5007f8760629eff
Base URL: http://127.0.0.1:8595
Generated: 2026-07-09T14:29:50.270Z

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
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/postgres.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-09T14:30:46.541Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/keycloak-db.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-09T14:30:46.787Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-keycloak.png | 2026-07-09T14:30:59.296Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/nats.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-09T14:30:59.483Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/temporal.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-09T14:30:59.687Z |
| http://127.0.0.1:9001/browser | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-minio.png | 2026-07-09T14:31:03.057Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/openbao.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-09T14:31:03.314Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/otel-collector.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-09T14:31:03.544Z |
| http://127.0.0.1:9090/targets | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-prometheus.png | 2026-07-09T14:31:04.004Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-grafana.png | 2026-07-09T14:31:09.553Z |
| http://127.0.0.1:3100/ready | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-loki.png | 2026-07-09T14:31:24.696Z |
| http://127.0.0.1:3200/ready | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-tempo.png | 2026-07-09T14:31:39.828Z |
| http://127.0.0.1:8025/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-mailpit.png | 2026-07-09T14:31:40.030Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/webhook-sink.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-09T14:31:40.230Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/redis.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-09T14:31:40.406Z |
| http://127.0.0.1:7700/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-meilisearch.png | 2026-07-09T14:31:40.636Z |
| http://127.0.0.1:18123/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-clickhouse.png | 2026-07-09T14:31:40.681Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-pgadmin.png | 2026-07-09T14:31:49.441Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/sonar-postgres.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-09T14:31:49.605Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-09T14:31:49.775Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-sonarqube.png | 2026-07-09T14:32:07.273Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/mock-oidc.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-09T14:32:07.424Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/localstack.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-09T14:32:07.591Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-wiremock.png | 2026-07-09T14:32:07.664Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-alertmanager.png | 2026-07-09T14:32:07.748Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/alloy.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-09T14:32:07.918Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/windmill-postgres.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-09T14:32:08.091Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/windmill-redis.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-09T14:32:08.257Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-windmill.png | 2026-07-09T14:32:11.683Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/windmill-worker.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-09T14:32:11.836Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/temporal-postgres.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-09T14:32:12.017Z |
| http://127.0.0.1:8088/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-temporal-ui.png | 2026-07-09T14:32:12.105Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/pgbackrest.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-09T14:32:12.293Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/clamav.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-09T14:32:12.502Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/sentry.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-09T14:32:12.668Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/public-proof-origin.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-09T14:32:12.849Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/staging-proof-cockpit.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | 2026-07-09T14:32:13.014Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/caddy.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-caddy-evidence-page.png | 2026-07-09T14:32:13.198Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/platform-api.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-09T14:32:13.374Z |
| /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/service-evidence/web-app.json | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-web-app-evidence-page.png | 2026-07-09T14:32:13.540Z |
| /proof | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/home.png | 2026-07-09T14:32:24.798Z |
| /proof/foundation-substrate-closure | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/foundation-substrate-closure.png | 2026-07-09T14:32:25.354Z |
| /proof/capabilities | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/capabilities.png | 2026-07-09T14:32:25.793Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/first-capability-detail.png | 2026-07-09T14:32:26.167Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/first-scenario.png | 2026-07-09T14:32:26.363Z |
| /proof/roles | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/roles.png | 2026-07-09T14:32:26.481Z |
| /proof/actions | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/actions.png | 2026-07-09T14:32:26.625Z |
| /proof/actions/qa-mrdlt0cz-jyjzl5 | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/first-action-detail.png | 2026-07-09T14:32:26.759Z |
| /proof/machine-runs | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/machine-runs.png | 2026-07-09T14:32:26.901Z |
| /proof/import | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/machine-import.png | 2026-07-09T14:32:27.030Z |
| /proof/import/latest-machine-qa | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/machine-import-run.png | 2026-07-09T14:32:27.328Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/machine-import-capability.png | 2026-07-09T14:32:27.483Z |
| /proof/review | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/machine-review.png | 2026-07-09T14:32:27.615Z |
| /proof/review/gaps | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/machine-review-gaps.png | 2026-07-09T14:32:27.691Z |
| /proof/review/nonconformities | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/machine-review-nonconformities.png | 2026-07-09T14:32:27.756Z |
| /proof/review/corrective-actions | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/machine-review-corrective-actions.png | 2026-07-09T14:32:27.822Z |
| /proof/export | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/machine-export.png | 2026-07-09T14:32:27.949Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/first-evidence.png | 2026-07-09T14:32:28.081Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-09T14:32:28.214Z |
| /proof/audit | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/audit.png | 2026-07-09T14:32:28.443Z |
| /proof/observability | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/observability.png | 2026-07-09T14:32:28.677Z |
| /proof/fixtures | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/fixtures.png | 2026-07-09T14:32:28.861Z |
| /proof/alerts | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/alerts.png | 2026-07-09T14:32:29.425Z |
| /proof/signoff | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/signoff.png | 2026-07-09T14:32:29.825Z |
| /proof/result | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/result.png | 2026-07-09T14:32:29.891Z |
| /proof/enterprise | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise.png | 2026-07-09T14:32:30.200Z |
| /proof/enterprise/isms-scope | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-isms-scope.png | 2026-07-09T14:32:30.360Z |
| /proof/enterprise/risk-register | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-risk-register.png | 2026-07-09T14:32:30.513Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-09T14:32:30.677Z |
| /proof/enterprise/assets | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-assets.png | 2026-07-09T14:32:30.843Z |
| /proof/enterprise/suppliers | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-suppliers.png | 2026-07-09T14:32:31.009Z |
| /proof/enterprise/access-review | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-access-review.png | 2026-07-09T14:32:31.204Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-secrets-crypto.png | 2026-07-09T14:32:31.364Z |
| /proof/enterprise/audit-retention | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-audit-retention.png | 2026-07-09T14:32:31.565Z |
| /proof/enterprise/backup-dr | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-backup-dr.png | 2026-07-09T14:32:31.731Z |
| /proof/enterprise/change-release | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-change-release.png | 2026-07-09T14:32:31.897Z |
| /proof/enterprise/supply-chain | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-supply-chain.png | 2026-07-09T14:32:32.061Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-09T14:32:32.232Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-tenant-isolation.png | 2026-07-09T14:32:32.414Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-resilience-capacity.png | 2026-07-09T14:32:32.577Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-observability-runbooks.png | 2026-07-09T14:32:32.744Z |
| /proof/enterprise/policy-governance | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-policy-governance.png | 2026-07-09T14:32:32.897Z |
| /proof/enterprise/iso-control-support | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-iso-control-support.png | 2026-07-09T14:32:33.060Z |
| /proof/enterprise/internal-audit | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-internal-audit.png | 2026-07-09T14:32:33.212Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-legal-regulatory.png | 2026-07-09T14:32:33.377Z |
| /proof/enterprise/security-objectives | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-security-objectives.png | 2026-07-09T14:32:33.543Z |
| /proof/enterprise/document-control | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-document-control.png | 2026-07-09T14:32:33.696Z |
| /proof/enterprise/competence-awareness | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-competence-awareness.png | 2026-07-09T14:32:33.860Z |
| /proof/enterprise/physical-environmental | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-physical-environmental.png | 2026-07-09T14:32:34.013Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-secure-sdlc.png | 2026-07-09T14:32:34.175Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-evidence-integrity.png | 2026-07-09T14:32:34.385Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-09T14:32:34.547Z |
| /proof/enterprise/management-review | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-management-review.png | 2026-07-09T14:32:34.709Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/enterprise-single-operator-risk.png | 2026-07-09T14:32:34.864Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | host-unpublished-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| staging-proof-cockpit | platform operator | unsafe-to-screenshot |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | none |
| caddy | platform operator | host-unpublished-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-caddy-evidence-page.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| web-app | read-only observer | cli-equivalent |  | /tmp/usf-1044-proof-cockpit-machine-qa/2026-07-09T14-29-50-228Z/screenshots/compose-service-web-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-09T14-29-50-270Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
