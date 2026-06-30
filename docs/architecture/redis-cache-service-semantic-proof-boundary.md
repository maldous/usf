# Redis Cache Service Semantic Proof Boundary

USF-198 remains the historical Redis proof-boundary issue. USF-207 now adds bounded local Compose Redis cache proof for that boundary. This does not make Redis ready, does not make cache readiness true, and does not close USF-133.

The semantic source remains the Compose service catalogue. The machine-readable boundary is docs/architecture/redis-cache-service-semantic-proof-boundary.json.

## Current Boundary

USF-173 established the cache and eventing split. USF-198 made the second-level Redis proof boundary explicit. USF-207 implements the bounded proof slice by using the official redis SDK inside the adapter boundary and running a profile-gated local Compose proof.

The proof covers synthetic tenant-safe write/read/delete, TTL expiration, bounded readiness retry, timeout behaviour, cleanup, unavailable provider fail-closed evidence, structured value-free audit evidence, redaction, metrics/tracing evidence, loopback-only Compose exposure, and teardown.

The proof does not cover API runtime cache binding, worker runtime cache binding, live/provider-managed Redis, environment promotion readiness, backup/restore readiness, production alerting, operator access readiness, provider compatibility readiness, or broader cache readiness.

## Non-Equivalence

NATS event-bus publish/readback is not Redis cache proof. It does not prove Redis expiration, eviction, persistence, key-space behaviour, distributed runtime state, queue-adjacent cache use, Redis wire protocol, or cache provider failure handling.

In-memory cache evidence may be used only where a proof row explicitly permits hermetic local behaviour. It is not Redis composed service proof and does not satisfy Redis readiness, cache readiness, live-provider readiness, or environment promotion.

## Enterprise Evidence Posture

The boundary records owner, risk owner, control owner, service catalogue linkage, provider registry linkage, Statement of Applicability support rows, threat and abuse cases, access posture, incident and vulnerability posture, privacy posture, retention posture, secret boundary, supplier boundary, SDK dependency governance, and explicit non-claims.

This is evidence organization only. It does not claim ISO certification, SOC readiness, production readiness, staging readiness, test readiness, live-provider readiness, full dev readiness, full React parity, enterprise production readiness, or USF-133 closure.

## Remaining Boundaries

Future source issues are required before any claim about API or worker runtime cache usage, live/provider-managed Redis operation, environment promotion, backup/restore, production alerting, operator access, provider compatibility, or Redis/cache readiness.
