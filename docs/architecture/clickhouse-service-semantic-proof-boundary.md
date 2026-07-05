# ClickHouse Analytics Event-Store Service Semantic Proof Boundary

USF-197 remains the historical proof-boundary issue. USF-206 now adds bounded local Compose ClickHouse analytics event-store proof for that boundary. This does not make ClickHouse ready, does not make analytics or event-store readiness true, and does not close USF-133.

The semantic source remains the Compose service catalogue. The machine-readable boundary is docs/architecture/clickhouse-service-semantic-proof-boundary.json.

## Current Boundary

USF-172 established the analytics/event-store disposition gate. USF-197 made the ClickHouse proof boundary explicit. USF-206 implements the bounded proof slice by using the official @clickhouse/client SDK inside the adapter boundary and running a profile-gated local Compose proof.

The proof covers synthetic tenant-safe event ingestion, tenant-filtered query, aggregate count, invalid classification denial, bounded readiness retry, timeout behaviour, cleanup through truncate/drop plus Compose down, unavailable provider fail-closed evidence, structured value-free audit evidence, redaction, metrics/tracing evidence, loopback-only Compose exposure, and teardown.

The proof does not cover API runtime analytics binding, worker runtime analytics binding, live/provider-managed ClickHouse, environment promotion readiness, backup/restore readiness, production alerting, operator access readiness, provider compatibility readiness, broader analytics readiness, or event-store readiness.

## Non-Equivalence

In-memory analytics evidence may be used only where a proof row explicitly permits hermetic local behaviour. It is not ClickHouse composed service proof and does not satisfy ClickHouse readiness, analytics readiness, event-store readiness, live-provider readiness, or environment promotion.

Generated Compose presence and Sentry-internal ClickHouse usage are not general product analytics/event-store readiness unless separately catalogued, adapter-bound, and proven.

## Enterprise Evidence Posture

The boundary records owner, risk owner, control owner, service catalogue linkage, provider registry linkage, Statement of Applicability support rows, threat and abuse cases, access posture, incident and vulnerability posture, privacy posture, retention posture, secret boundary, supplier boundary, SDK dependency governance, and explicit non-claims.

This is evidence organization only. It does not claim ISO certification, SOC readiness, production readiness, staging readiness, test readiness, live-provider readiness, full dev readiness, full product readiness, enterprise production readiness, or USF-133 closure.

## Remaining Boundaries

Future source issues are required before any claim about API or worker runtime analytics usage, live/provider-managed ClickHouse operation, environment promotion, backup/restore, production alerting, operator access, provider compatibility, analytics readiness, or event-store readiness.
