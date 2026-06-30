# USF-198 Redis Cache Service Semantic Proof Boundary

USF-198 records the current Redis-compatible cache service boundary as an explicit deferred proof boundary. It does not implement a Redis adapter and does not prove Redis readiness.

The semantic source remains the Compose service catalogue. The machine-readable boundary is docs/architecture/redis-cache-service-semantic-proof-boundary.json. The current disposition is: Redis-compatible cache service semantics are not proven, NATS event-bus proof is not equivalent, and in-memory cache evidence is not equivalent.

## Current Boundary

USF-173 established the cache and eventing split. USF-198 makes the second-level Redis proof boundary explicit and transfers actual Redis adapter proof to USF-207.

The remaining proof requires SDK or client selection, exact dependency pinning if implemented, adapter-only imports, bounded readiness retry, tenant-safe write/read/delete or equivalent operation evidence, expiration or TTL evidence, retry and timeout evidence, fail-closed behaviour, audit evidence, teardown cleanup, provider failure handling, and enterprise posture evidence.

## Non-Equivalence

NATS event-bus publish/readback is not Redis cache proof. It does not prove Redis expiration, eviction, persistence, key-space behaviour, distributed runtime state, queue-adjacent cache use, Redis wire protocol, or cache provider failure handling.

In-memory cache evidence may be used only where a proof row explicitly permits hermetic local behaviour. It is not Redis composed service proof and does not satisfy Redis readiness, cache readiness, live-provider readiness, or environment promotion.

## Enterprise Evidence Posture

The boundary records owner, risk owner, control owner, service catalogue linkage, provider registry linkage, Statement of Applicability support rows, threat and abuse cases, access posture, incident and vulnerability posture, privacy posture, retention posture, secret boundary, supplier boundary, and explicit non-claims.

This is evidence organization only. It does not claim ISO certification, SOC readiness, production readiness, staging readiness, test readiness, live-provider readiness, full dev readiness, full React parity, or USF-133 closure.

## Required Follow-Up

USF-207 owns the actual Redis composed cache adapter proof or an accepted repository reclassification. Until USF-207 is merged and reconciled, Redis readiness and cache readiness remain prohibited claims.
