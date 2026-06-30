# USF-197 ClickHouse Service Semantic Proof Boundary

USF-197 records the ClickHouse analytics event-store service boundary as an explicit deferred proof with owner, risk owner, control owner, review date, and follow-up issue USF-206. It does not implement a ClickHouse adapter and does not claim ClickHouse readiness.

USF-172 remains the bounded analytics/event-store disposition gate. USF-197 narrows the next boundary: deterministic in-memory analytics evidence and generated Compose metadata are not equivalent to ClickHouse persisted event ingestion, queryable history, aggregation, retention, SDK/client use, provider failure modes, or cross-process runtime visibility.

USF-206 owns the actual deterministic composed or otherwise accepted ClickHouse proof. That proof must cover SDK/client selection, exact-version pinning where implemented, adapter-bound imports, service readiness and bounded retry, tenant-safe ingestion and query, retention or deletion, audit evidence, teardown cleanup, provider failure handling, supplier posture, secrets, privacy, backup, incident, and vulnerability posture.

USF-197 preserves non-claims for analytics readiness, event-store readiness, ClickHouse readiness, provider compatibility readiness, full dev readiness, test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, full React parity, and USF-133 closure.

Machine-readable authority for this boundary is `docs/architecture/clickhouse-service-semantic-proof-boundary.json`.
