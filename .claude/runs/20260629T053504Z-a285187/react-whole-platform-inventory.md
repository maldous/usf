# React Whole Platform Inventory

Run: 20260629T053504Z-a285187.
React HEAD: a92d9734cf0f1f7a53f9093ce3bb3d2c02bfd767.

This inventory is historical lineage evidence only. It excludes node_modules from first-party package counts and does not copy runtime code.

Compose service count: 54.
First-party package manifests: 129.

| Service | Category | Purpose | USF accounting | Grade |
| --- | --- | --- | --- | --- |
| alertmanager | observability-alerting | alert routing posture | deferred | C |
| alloy | observability-agent | log/metric/trace collection agent | deferred | C |
| clamav | file-scan | antivirus scan provider | deferred | C |
| clickhouse | analytics-event-store | analytics and Sentry column store | requires-human-decision | D |
| external-caddy | gateway-operator-access | reverse proxy and forward-auth clickthrough | requires-human-decision | D |
| grafana | observability | local dashboard surface | implemented | A |
| keycloak | identity | brokered identity and issuer | implemented | A |
| keycloak-postgres | identity backing store | Keycloak local database | implemented-equivalent | A |
| localstack | cloud-mock | AWS-compatible local mocks | requires-human-decision | D |
| loki | observability | local log backend | implemented | A |
| mailpit | notification-test | local SMTP and message capture | implemented | A |
| meilisearch | search-index | full-text search provider | requires-human-decision | D |
| minio | object-storage | local S3-compatible object storage and console | implemented | A |
| mock-oidc | identity-test | hermetic mock issuer | covered-by-usf-runtime | B |
| openbao | secrets | local secret manager posture | implemented | A |
| otel-collector | observability | local telemetry collector | implemented | A |
| pgadmin | operator-admin | Postgres operator UI | requires-human-decision | D |
| pgbackrest | backup-restore | Postgres backup and restore substrate | deferred | C |
| platform-api | runtime-api | React historical platform API process | covered-by-usf-runtime | B |
| postgres | database | system-of-record relational database | implemented | A |
| prometheus | observability | local metrics backend | implemented | A |
| react-app | ui-runtime | React SPA runtime | out-of-foundation-scope | C |
| redis | cache-eventing | cache/session/queue local dependency | requires-human-decision | D |
| sentry-cleanup | error-monitoring | Sentry error-monitoring component | requires-human-decision | D |
| sentry-clickhouse | error-monitoring | Sentry analytics column store | requires-human-decision | D |
| sentry-events-consumer | error-monitoring | Sentry error-monitoring component | requires-human-decision | D |
| sentry-kafka | error-monitoring | Sentry event bus | requires-human-decision | D |
| sentry-kafka-init | error-monitoring | Sentry event bus | requires-human-decision | D |
| sentry-memcached | error-monitoring | Sentry error-monitoring component | requires-human-decision | D |
| sentry-migrate | error-monitoring | Sentry error-monitoring component | requires-human-decision | D |
| sentry-post-process-forwarder | error-monitoring | Sentry error-monitoring component | requires-human-decision | D |
| sentry-postgres | error-monitoring | Sentry relational store | requires-human-decision | D |
| sentry-redis | error-monitoring | Sentry cache/queue store | requires-human-decision | D |
| sentry-relay | error-monitoring | Sentry ingest/UI edge | requires-human-decision | D |
| sentry-snuba-api | error-monitoring | Sentry query/analytics component | requires-human-decision | D |
| sentry-snuba-errors | error-monitoring | Sentry query/analytics component | requires-human-decision | D |
| sentry-snuba-migrate | error-monitoring | Sentry query/analytics component | requires-human-decision | D |
| sentry-snuba-replacer | error-monitoring | Sentry query/analytics component | requires-human-decision | D |
| sentry-taskbroker | error-monitoring | Sentry error-monitoring component | requires-human-decision | D |
| sentry-taskscheduler | error-monitoring | Sentry error-monitoring component | requires-human-decision | D |
| sentry-taskworker | error-monitoring | Sentry error-monitoring component | requires-human-decision | D |
| sentry-web | error-monitoring | Sentry ingest/UI edge | requires-human-decision | D |
| sonar-oidc-plugin | quality-gate-auth | SonarQube OIDC plugin installer posture | requires-human-decision | D |
| sonar-postgres | quality-gate-backing | SonarQube database | requires-human-decision | D |
| sonarqube | quality-gate | static analysis and quality gate service | requires-human-decision | D |
| tempo | observability | local trace backend | implemented | A |
| temporal | workflow-engine | local workflow engine | implemented | A |
| temporal-postgres | workflow backing store | Temporal persistence database | substituted-partial | B |
| temporal-ui | operator-admin | Temporal operator UI | requires-human-decision | D |
| windmill | operator-automation | operator workflow automation UI/API | requires-human-decision | D |
| windmill-postgres | operator-automation-backing | Windmill persistence | requires-human-decision | D |
| windmill-redis | operator-automation-backing | Windmill queue/cache | requires-human-decision | D |
| windmill-worker | operator-automation-worker | Windmill worker execution | requires-human-decision | D |
| wiremock | external-http-mock | deterministic external HTTP mocks | substituted-partial | C |
