# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: 3fe04dd13642318dd5a0c276499d599b1e37f47b
Base URL: http://127.0.0.1:14963
Generated: 2026-07-05T16:11:10.705Z

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
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-05T16:12:05.132Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/keycloak-db.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-05T16:12:05.339Z |
| http://127.0.0.1:8090/admin/master/console/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-keycloak.png | 2026-07-05T16:12:17.446Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/nats.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-05T16:12:17.649Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/temporal.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-05T16:12:17.850Z |
| http://127.0.0.1:9001/browser | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-minio.png | 2026-07-05T16:12:21.178Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/openbao.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-05T16:12:21.404Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/otel-collector.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-05T16:12:21.628Z |
| http://127.0.0.1:9090/targets | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-prometheus.png | 2026-07-05T16:12:22.053Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-grafana.png | 2026-07-05T16:12:27.551Z |
| http://127.0.0.1:3100/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-loki.png | 2026-07-05T16:12:42.693Z |
| http://127.0.0.1:3200/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-tempo.png | 2026-07-05T16:12:57.826Z |
| http://127.0.0.1:8025/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-mailpit.png | 2026-07-05T16:12:58.029Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/webhook-sink.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-05T16:12:58.208Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/redis.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-05T16:12:58.384Z |
| http://127.0.0.1:7700/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-meilisearch.png | 2026-07-05T16:12:58.632Z |
| http://127.0.0.1:18123/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-clickhouse.png | 2026-07-05T16:12:58.692Z |
| http://127.0.0.1:5050/browser/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-pgadmin.png | 2026-07-05T16:13:06.955Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/sonar-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-05T16:13:07.117Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/sonar-oidc-plugin.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-05T16:13:07.279Z |
| http://127.0.0.1:9002/projects/create | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-sonarqube.png | 2026-07-05T16:13:24.787Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/mock-oidc.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-05T16:13:24.928Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/localstack.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-05T16:13:25.077Z |
| http://127.0.0.1:8089/__admin/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-wiremock.png | 2026-07-05T16:13:25.146Z |
| http://127.0.0.1:9093/#/alerts | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-alertmanager.png | 2026-07-05T16:13:25.230Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/alloy.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-05T16:13:25.396Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/windmill-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-05T16:13:25.545Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/windmill-redis.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-05T16:13:25.695Z |
| http://127.0.0.1:8001/user/workspaces | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-windmill.png | 2026-07-05T16:13:29.147Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/windmill-worker.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-05T16:13:29.299Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/temporal-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-05T16:13:29.480Z |
| http://127.0.0.1:8088/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-temporal-ui.png | 2026-07-05T16:13:29.582Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/pgbackrest.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-05T16:13:29.786Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/clamav.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-05T16:13:29.949Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/sentry.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-05T16:13:30.113Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/public-proof-origin.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-05T16:13:30.298Z |
| http://127.0.0.1:8081/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-caddy.png | 2026-07-05T16:13:30.525Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/platform-api.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-05T16:13:30.702Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/service-evidence/react-app.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-react-app-evidence-page.png | 2026-07-05T16:13:30.861Z |
| /proof | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/home.png | 2026-07-05T16:13:42.086Z |
| /proof/foundation-substrate-closure | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/foundation-substrate-closure.png | 2026-07-05T16:13:42.986Z |
| /proof/capabilities | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/capabilities.png | 2026-07-05T16:13:43.424Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/first-capability-detail.png | 2026-07-05T16:13:43.799Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/first-scenario.png | 2026-07-05T16:13:43.994Z |
| /proof/roles | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/roles.png | 2026-07-05T16:13:44.113Z |
| /proof/actions | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/actions.png | 2026-07-05T16:13:44.254Z |
| /proof/actions/qa-mr7znxii-5s4hc1 | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/first-action-detail.png | 2026-07-05T16:13:44.374Z |
| /proof/machine-runs | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/machine-runs.png | 2026-07-05T16:13:44.500Z |
| /proof/import | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/machine-import.png | 2026-07-05T16:13:44.627Z |
| /proof/import/latest-machine-qa | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/machine-import-run.png | 2026-07-05T16:13:44.923Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/machine-import-capability.png | 2026-07-05T16:13:45.081Z |
| /proof/review | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/machine-review.png | 2026-07-05T16:13:45.276Z |
| /proof/review/gaps | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/machine-review-gaps.png | 2026-07-05T16:13:45.340Z |
| /proof/review/nonconformities | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/machine-review-nonconformities.png | 2026-07-05T16:13:45.404Z |
| /proof/review/corrective-actions | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/machine-review-corrective-actions.png | 2026-07-05T16:13:45.470Z |
| /proof/export | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/machine-export.png | 2026-07-05T16:13:45.596Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/first-evidence.png | 2026-07-05T16:13:45.728Z |
| /proof/evidence/usf-foundation-substrate-closure | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-05T16:13:45.864Z |
| /proof/audit | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/audit.png | 2026-07-05T16:13:46.091Z |
| /proof/observability | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/observability.png | 2026-07-05T16:13:46.325Z |
| /proof/fixtures | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/fixtures.png | 2026-07-05T16:13:46.507Z |
| /proof/alerts | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/alerts.png | 2026-07-05T16:13:47.071Z |
| /proof/signoff | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/signoff.png | 2026-07-05T16:13:47.461Z |
| /proof/result | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/result.png | 2026-07-05T16:13:47.521Z |
| /proof/enterprise | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise.png | 2026-07-05T16:13:47.832Z |
| /proof/enterprise/isms-scope | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-isms-scope.png | 2026-07-05T16:13:47.991Z |
| /proof/enterprise/risk-register | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-risk-register.png | 2026-07-05T16:13:48.143Z |
| /proof/enterprise/statement-of-applicability | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-05T16:13:48.308Z |
| /proof/enterprise/assets | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-assets.png | 2026-07-05T16:13:48.474Z |
| /proof/enterprise/suppliers | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-suppliers.png | 2026-07-05T16:13:48.626Z |
| /proof/enterprise/access-review | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-access-review.png | 2026-07-05T16:13:48.829Z |
| /proof/enterprise/secrets-crypto | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-secrets-crypto.png | 2026-07-05T16:13:48.995Z |
| /proof/enterprise/audit-retention | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-audit-retention.png | 2026-07-05T16:13:49.196Z |
| /proof/enterprise/backup-dr | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-backup-dr.png | 2026-07-05T16:13:49.362Z |
| /proof/enterprise/change-release | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-change-release.png | 2026-07-05T16:13:49.529Z |
| /proof/enterprise/supply-chain | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-supply-chain.png | 2026-07-05T16:13:49.690Z |
| /proof/enterprise/privacy-data-protection | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-05T16:13:49.849Z |
| /proof/enterprise/tenant-isolation | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-tenant-isolation.png | 2026-07-05T16:13:50.028Z |
| /proof/enterprise/resilience-capacity | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-resilience-capacity.png | 2026-07-05T16:13:50.191Z |
| /proof/enterprise/observability-runbooks | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-observability-runbooks.png | 2026-07-05T16:13:50.358Z |
| /proof/enterprise/policy-governance | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-policy-governance.png | 2026-07-05T16:13:50.525Z |
| /proof/enterprise/iso-control-support | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-iso-control-support.png | 2026-07-05T16:13:50.677Z |
| /proof/enterprise/internal-audit | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-internal-audit.png | 2026-07-05T16:13:50.840Z |
| /proof/enterprise/legal-regulatory | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-legal-regulatory.png | 2026-07-05T16:13:50.994Z |
| /proof/enterprise/security-objectives | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-security-objectives.png | 2026-07-05T16:13:51.158Z |
| /proof/enterprise/document-control | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-document-control.png | 2026-07-05T16:13:51.310Z |
| /proof/enterprise/competence-awareness | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-competence-awareness.png | 2026-07-05T16:13:51.476Z |
| /proof/enterprise/physical-environmental | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-physical-environmental.png | 2026-07-05T16:13:51.642Z |
| /proof/enterprise/secure-sdlc | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-secure-sdlc.png | 2026-07-05T16:13:51.794Z |
| /proof/enterprise/evidence-integrity | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-evidence-integrity.png | 2026-07-05T16:13:51.999Z |
| /proof/enterprise/nonconformity-corrective-action | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-05T16:13:52.160Z |
| /proof/enterprise/management-review | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-management-review.png | 2026-07-05T16:13:52.325Z |
| /proof/enterprise/single-operator-risk | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/enterprise-single-operator-risk.png | 2026-07-05T16:13:52.492Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | cli-equivalent | http://127.0.0.1:18080/.well-known/usf-public-edge.json | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| caddy | platform operator | direct-screenshot | http://127.0.0.1:8081/, https://127.0.0.1:8443/ | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-caddy.png | none |
| platform-api | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| react-app | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T16-11-10-665Z/screenshots/compose-service-react-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-05T16-11-10-705Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
