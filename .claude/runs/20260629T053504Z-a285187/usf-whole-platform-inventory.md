# USF Whole Platform Inventory

Run: 20260629T053504Z-a285187.
USF HEAD: a285187b177a922ff422858c1bf8f180336f1dff.

Compose service count: 14.
First-party package manifests: 32.

| Service | Image | Ports |
| --- | --- | --- |
| grafana | grafana/grafana:11.4.0 | ['3000:3000'] |
| keycloak | quay.io/keycloak/keycloak:26.2.5 | ['8090:8080'] |
| keycloak-db | postgres:16.6-alpine | None |
| loki | grafana/loki:3.3.2 | ['3100:3100'] |
| mailpit | axllent/mailpit:v1.21.0 | ['1025:1025', '8025:8025'] |
| minio | minio/minio:RELEASE.2024-12-18T13-15-44Z | ['9000:9000', '9001:9001'] |
| nats | nats:2.10.26-alpine | ['4222:4222'] |
| openbao | openbao/openbao:2.2.0 | ['8200:8200'] |
| otel-collector | otel/opentelemetry-collector-contrib:0.114.0 | ['4317:4317', '4318:4318'] |
| postgres | postgres:16.6-alpine | ['5433:5432'] |
| prometheus | prom/prometheus:v3.0.1 | ['9090:9090'] |
| tempo | grafana/tempo:2.6.1 | ['3200:3200'] |
| temporal | temporalio/auto-setup:1.25.2 | ['7233:7233'] |
| webhook-sink | mendhak/http-https-echo:35 | ['18088:8080'] |
