# Proof Cockpit Machine QA Evidence Model

This document defines the first durable evidence model for USF-290 machine QA. It supports machine collection, human import, external review, and future capability/service growth. It does not claim staging readiness, production readiness, SOC readiness, ISO certification, enterprise production readiness, browser E2E readiness, full product readiness, or USF-290 completion.

The model separates discovery, execution, evidence normalization, evaluation, human import, and reporting. Machine QA may collect and normalize evidence, but Matthew’s acceptance remains a separate audited human decision.

## Durable Records

Every evidence record includes a stable ID, evidence type, target object, source method, source URL or command, timestamp, source SHA, environment, actor/executor, role or persona, synthetic tenant or dataset, correlation ID, trace ID, artifact paths, normalized summary, claim supported, proof method, limitations, sensitivity classification, redaction status, content hash, previous evidence reference, retention status, freshness state, and human acceptance status.

Machine QA runs also record `sourceTreeHash` using `sha256-git-ls-tree-non-proof-evidence-v1`, excluding `artifacts/proof-cockpit/` and `evidence/proof-evidence/proof-cockpit/`. This hash is the squash-stable freshness anchor for proof-cockpit rule USF-PROOF-COCKPIT-009; `sourceSha` remains provenance and must not be the sole freshness authority after squash merge or rebase.

## Chain Of Custody

Each major claim maps to semantic source, scenario, actor/tool, role/persona, service/resource, route/API/port/adapter, artifact hash, timestamp, environment, source SHA, deployment SHA, validation result, limitations, and human import status.

## Service Adapters

Service evidence adapters are data-driven and may be implemented incrementally. Initial classes cover IdP/SSO, Grafana, Prometheus, Loki, Tempo, Alertmanager, Sentry, MinIO, OpenBao, Temporal, Windmill, Mailpit, webhook sink, Meilisearch, SonarQube, Postgres, Redis, NATS, and Caddy origin evidence. If an adapter cannot safely authenticate or capture evidence, the machine QA report records a gap with required role, credential path, and next action.

## Human Import

The cockpit exposes import, review, gap, nonconformity, corrective action, and export routes. These routes let a human auditor inspect machine runs, accept or reject evidence per capability, annotate gaps, request re-test, accept residual risk, and export an evidence bundle. Acceptance is not automatic.

## Extensibility

Future capabilities, services, controls, risks, and evidence sources must be added through registry data. Unknown new capabilities and services must appear as explicit unmapped gaps rather than being silently ignored. Reports include schema version and migration status so older QA runs remain readable.
