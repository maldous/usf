# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: d2bf1eba9da1c89d9f0c688f5295df4eda6978b1
Base URL: http://127.0.0.1:6711
Generated: 2026-07-05T11:20:13.693Z

## Summary

Machine evidence produced: true
Sufficient for human acceptance without further decision: false
Reason: Machine QA produces audit evidence and explicit gaps, but USF-290 final acceptance remains a Matthew decision and final signoff controls remain disabled.

## Counts

| Metric | Count |
| --- | ---: |
| declaredRoutes | 71 |
| testedRoutes | 781 |
| capabilities | 75 |
| scenarios | 150 |
| services | 39 |
| serviceEvidenceScreenshots | 39 |
| actionsSubmitted | 7 |
| screenshots | 93 |
| pass | 1230 |
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
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-05T11:20:56.883Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/keycloak-db.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-05T11:20:57.065Z |
| http://127.0.0.1:8090/admin/master/console/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-keycloak.png | 2026-07-05T11:21:09.113Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/nats.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-05T11:21:09.278Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/temporal.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-05T11:21:09.459Z |
| http://127.0.0.1:9001/browser | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-minio.png | 2026-07-05T11:21:12.828Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/openbao.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-05T11:21:13.038Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/otel-collector.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-05T11:21:13.250Z |
| http://127.0.0.1:9090/targets | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-prometheus.png | 2026-07-05T11:21:13.744Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-grafana.png | 2026-07-05T11:21:19.350Z |
| http://127.0.0.1:3100/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-loki.png | 2026-07-05T11:21:34.492Z |
| http://127.0.0.1:3200/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-tempo.png | 2026-07-05T11:21:49.625Z |
| http://127.0.0.1:8025/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-mailpit.png | 2026-07-05T11:21:49.827Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/webhook-sink.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-05T11:21:49.990Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/redis.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-05T11:21:50.148Z |
| http://127.0.0.1:7700/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-meilisearch.png | 2026-07-05T11:21:50.382Z |
| http://127.0.0.1:18123/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-clickhouse.png | 2026-07-05T11:21:50.442Z |
| http://127.0.0.1:5050/browser/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-pgadmin.png | 2026-07-05T11:21:55.820Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/sonar-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-05T11:21:55.964Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/sonar-oidc-plugin.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-05T11:21:56.117Z |
| http://127.0.0.1:9002/projects/create | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-sonarqube.png | 2026-07-05T11:22:13.587Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/mock-oidc.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-05T11:22:13.733Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/localstack.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-05T11:22:13.875Z |
| http://127.0.0.1:8089/__admin/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-wiremock.png | 2026-07-05T11:22:13.944Z |
| http://127.0.0.1:9093/#/alerts | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-alertmanager.png | 2026-07-05T11:22:14.045Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/alloy.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-05T11:22:14.192Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/windmill-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-05T11:22:14.334Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/windmill-redis.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-05T11:22:14.484Z |
| http://127.0.0.1:8001/user/workspaces | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-windmill.png | 2026-07-05T11:22:17.896Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/windmill-worker.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-05T11:22:18.031Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/temporal-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-05T11:22:18.191Z |
| http://127.0.0.1:8088/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-temporal-ui.png | 2026-07-05T11:22:18.265Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/pgbackrest.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-05T11:22:18.426Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/clamav.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-05T11:22:18.597Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/sentry.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-05T11:22:18.744Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/public-proof-origin.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-05T11:22:18.921Z |
| http://127.0.0.1:8081/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-caddy.png | 2026-07-05T11:22:19.138Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/platform-api.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-05T11:22:19.299Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/service-evidence/react-app.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-react-app-evidence-page.png | 2026-07-05T11:22:19.450Z |
| /proof | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/home.png | 2026-07-05T11:22:30.769Z |
| /proof/foundation-substrate-closure | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/foundation-substrate-closure.png | 2026-07-05T11:22:31.331Z |
| /proof/capabilities | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/capabilities.png | 2026-07-05T11:22:31.641Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/first-capability-detail.png | 2026-07-05T11:22:31.991Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/first-scenario.png | 2026-07-05T11:22:32.177Z |
| /proof/roles | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/roles.png | 2026-07-05T11:22:32.286Z |
| /proof/actions | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/actions.png | 2026-07-05T11:22:32.418Z |
| /proof/actions/qa-mr7p9jpw-4t3x92 | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/first-action-detail.png | 2026-07-05T11:22:32.541Z |
| /proof/machine-runs | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/machine-runs.png | 2026-07-05T11:22:32.663Z |
| /proof/import | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/machine-import.png | 2026-07-05T11:22:32.769Z |
| /proof/import/latest-machine-qa | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/machine-import-run.png | 2026-07-05T11:22:33.060Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/machine-import-capability.png | 2026-07-05T11:22:33.196Z |
| /proof/review | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/machine-review.png | 2026-07-05T11:22:33.254Z |
| /proof/review/gaps | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/machine-review-gaps.png | 2026-07-05T11:22:33.321Z |
| /proof/review/nonconformities | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/machine-review-nonconformities.png | 2026-07-05T11:22:33.386Z |
| /proof/review/corrective-actions | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/machine-review-corrective-actions.png | 2026-07-05T11:22:33.453Z |
| /proof/export | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/machine-export.png | 2026-07-05T11:22:33.577Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/first-evidence.png | 2026-07-05T11:22:33.697Z |
| /proof/evidence/usf-foundation-substrate-closure | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-05T11:22:33.829Z |
| /proof/audit | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/audit.png | 2026-07-05T11:22:34.056Z |
| /proof/observability | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/observability.png | 2026-07-05T11:22:34.283Z |
| /proof/fixtures | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/fixtures.png | 2026-07-05T11:22:34.461Z |
| /proof/alerts | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/alerts.png | 2026-07-05T11:22:34.995Z |
| /proof/signoff | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/signoff.png | 2026-07-05T11:22:35.202Z |
| /proof/result | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/result.png | 2026-07-05T11:22:35.269Z |
| /proof/enterprise | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise.png | 2026-07-05T11:22:35.518Z |
| /proof/enterprise/isms-scope | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-isms-scope.png | 2026-07-05T11:22:35.671Z |
| /proof/enterprise/risk-register | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-risk-register.png | 2026-07-05T11:22:35.820Z |
| /proof/enterprise/statement-of-applicability | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-05T11:22:35.971Z |
| /proof/enterprise/assets | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-assets.png | 2026-07-05T11:22:36.120Z |
| /proof/enterprise/suppliers | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-suppliers.png | 2026-07-05T11:22:36.270Z |
| /proof/enterprise/access-review | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-access-review.png | 2026-07-05T11:22:36.445Z |
| /proof/enterprise/secrets-crypto | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-secrets-crypto.png | 2026-07-05T11:22:36.612Z |
| /proof/enterprise/audit-retention | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-audit-retention.png | 2026-07-05T11:22:36.792Z |
| /proof/enterprise/backup-dr | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-backup-dr.png | 2026-07-05T11:22:36.944Z |
| /proof/enterprise/change-release | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-change-release.png | 2026-07-05T11:22:37.095Z |
| /proof/enterprise/supply-chain | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-supply-chain.png | 2026-07-05T11:22:37.239Z |
| /proof/enterprise/privacy-data-protection | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-05T11:22:37.397Z |
| /proof/enterprise/tenant-isolation | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-tenant-isolation.png | 2026-07-05T11:22:37.563Z |
| /proof/enterprise/resilience-capacity | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-resilience-capacity.png | 2026-07-05T11:22:37.708Z |
| /proof/enterprise/observability-runbooks | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-observability-runbooks.png | 2026-07-05T11:22:37.855Z |
| /proof/enterprise/policy-governance | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-policy-governance.png | 2026-07-05T11:22:38.006Z |
| /proof/enterprise/iso-control-support | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-iso-control-support.png | 2026-07-05T11:22:38.155Z |
| /proof/enterprise/internal-audit | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-internal-audit.png | 2026-07-05T11:22:38.303Z |
| /proof/enterprise/legal-regulatory | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-legal-regulatory.png | 2026-07-05T11:22:38.454Z |
| /proof/enterprise/security-objectives | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-security-objectives.png | 2026-07-05T11:22:38.605Z |
| /proof/enterprise/document-control | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-document-control.png | 2026-07-05T11:22:38.755Z |
| /proof/enterprise/competence-awareness | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-competence-awareness.png | 2026-07-05T11:22:38.905Z |
| /proof/enterprise/physical-environmental | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-physical-environmental.png | 2026-07-05T11:22:39.057Z |
| /proof/enterprise/secure-sdlc | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-secure-sdlc.png | 2026-07-05T11:22:39.205Z |
| /proof/enterprise/evidence-integrity | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-evidence-integrity.png | 2026-07-05T11:22:39.379Z |
| /proof/enterprise/nonconformity-corrective-action | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-05T11:22:39.543Z |
| /proof/enterprise/management-review | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-management-review.png | 2026-07-05T11:22:39.688Z |
| /proof/enterprise/single-operator-risk | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/enterprise-single-operator-risk.png | 2026-07-05T11:22:39.838Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | cli-equivalent | http://127.0.0.1:18080/.well-known/usf-public-edge.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| caddy | platform operator | direct-screenshot | http://127.0.0.1:8081/, https://127.0.0.1:8443/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-caddy.png | none |
| platform-api | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| react-app | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-20-13-660Z/screenshots/compose-service-react-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-05T11-20-13-693Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
