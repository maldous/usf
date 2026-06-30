# Parity Provider Adapters Source-Use Disposition Matrix

| | |
| --- | --- |
| Document type | Architecture / source-use disposition matrix |
| Status | Draft; USF-156 provider adapters/modes slice |
| Authority level | Source-use evidence; subordinate to semantic definitions, ADRs, validators, and proof evidence |
| Historical source | `../react` as lineage and behaviour evidence only |

No React runtime/application code is copied. No USF path mirrors a React path. Generated reports are not semantic authority.

| Provider topic | Historical React lineage | USF target | Status | Evidence | Deferred depth |
| --- | --- | --- | --- | --- | --- |
| provider registry | provider inventory, runtime provider inventory, readiness reports | `packages/core/src/index.ts` provider registry | migrated | `PROVIDER_REGISTRY`, `validateProviderRegistry`, `make providers-proof` | deeper inventory sync with live provider catalogues |
| provider categories | adapter package and compose provider families | `PROVIDER_CATEGORIES` | migrated | 15 categories represented and tested | category expansion only by future directive |
| provider modes | proof model, environment gates, in-memory vs real reports | `PROVIDER_MODES` | migrated | in-memory/local-test/mock/composed-test/live-deferred/disabled/unavailable represented; no live-authorised entry | live-external-authorised authority path |
| provider lifecycle | readiness and provider config posture | lifecycle fields in registry | partial | local/composed approvals and suspended placeholders represented | approval workflow and expiry enforcement |
| provider ownership | ports/adapters/dependencies lineage | owning capability, team/role, port, adapter | migrated | registry validation and proof | organisational ownership workflow |
| provider risk classification | config/readiness/evidence posture | risk classification and drivers | migrated | tests/proof require classification | quantitative risk scoring |
| data residency/egress control | compose/local/external provider config lineage | region, allowed regions, egress posture, endpoint refs | partial | registry entries record local/composed/deferred posture | live egress enforcement and residency attestations |
| provider config classification | provider config and secret store lineage | config refs, config registry mode values | migrated | `config://` refs and provider-config registry | DB-backed provider config history |
| provider secret references | bootstrap secrets, OpenBao/Postgres secret store lineage | `SecretReference` only | migrated | tests reject raw credentials; status redacts refs | live secret manager adapters and rotation execution |
| TLS/certificate posture | HTTP provider readiness and endpoint config lineage | transport posture fields | partial | external/deferred providers require TLS posture; local/composed exceptions explicit | live certificate validation/pinning proof |
| provider health/readiness | health handlers and readiness probes | health/readiness/liveness/capability status | migrated | proof separates healthy vs deferred readiness | deep composed-provider readiness aggregation |
| provider status redaction | health/readiness status and API examples | safe provider status view and `/v1/providers` routes | migrated | API tests, OpenAPI examples, provider proof | richer operator filters/pagination |
| capability-provider boundary | adapter package boundaries and import-boundary evidence | ports plus import-boundary proof | migrated | proof scans capabilities/core/API route imports | full dependency graph validator |
| provider audit/evidence | provider readiness and config evidence lineage | provider audit event taxonomy | migrated | value-free provider audit test/proof | provider config change workflows |
| provider drift posture | provider config runtime proof lineage | drift posture fields | partial | represented in registry | runtime drift detector and exception workflow |
| provider resilience posture | timeout/retry/degraded/fail-closed evidence lineage | timeout, retry, circuit, fallback, degraded posture | partial | represented and proof-checked | runtime circuit breaker/bulkhead implementation |
| failover/DR posture | backup/PITR and resilience proof lineage | failover posture fields | deferred | no DR readiness claim | failover/failback execution and proof |
| supplier/subprocessor posture | external provider readiness lineage | supplier posture fields | partial | represented as posture, not approval | supplier review approval workflow |
| local/composed/live-deferred separation | compose substrate and proof-gate lineage | provider mode hard-boundary validation | migrated | tests and proof reject live overclaims | live provider authority and proof package |
| provider test safety | in-memory/mock/local test provider lineage | synthetic tests and proof output | migrated | tests avoid real endpoints/credentials/customer data | broader fixture scanner |
| webhook-sink local capture provider | webhook/mock-provider lineage and compose echo substrate | `WebhookSinkCaptureProvider` plus `proof:mock-substrate` | bounded-local-proof | USF-201 proves only local Compose capture with adapter-contained protocol exception, readiness retry, fail-closed unavailable handling, redaction, audit-shaped evidence, and teardown | notification delivery, callback/replay, live webhook compatibility, LocalStack, WireMock, and mock OIDC remain separate follow-ups |
| future API/provider status surfaces | readiness/status API lineage | `/v1/providers`, `/v1/providers/{id}` | migrated | PDP-protected, OpenAPI-covered, redacted | health/readiness subroutes if authorised |
| React UI/Playwright provider behaviours | provider status/admin UI and E2E lineage | API/capability/proof tests | foundation-behaviour-rewritten-from-ui-test | no Playwright added; provider behaviours covered by foundation tests | UI/UX remains separate |

## Implementation Target File Additions

| Target file | Treatment | Source-use basis | Rationale |
| --- | --- | --- | --- |
| `tests/adapters/provider-path-encoding.test.ts` | new-with-rationale | evidence-only-support | Hermetic test proving MinIO and OpenBao composed-provider tenant path segments use collision-free base64url encoding rather than lossy normalisation. |
| `packages/proof/src/mock-provider-substrate-proof.ts` | new-with-rationale | runtime-proof-support | Profile-gated local Compose proof for webhook-sink capture only; it does not copy React runtime/application code and does not prove LocalStack, WireMock, mock OIDC, notification delivery, or live provider compatibility. |
| `adapters/mail/src/index.ts` | adapter-boundary-extension | runtime-proof-support | Hosts the `WebhookSinkCaptureProvider` protocol exception inside the adapter package, keeping protocol calls out of core, ports, capabilities, API routes, worker orchestration, and PDP code. |

Boundary: provider modes and environment classes remain separate. `composed-test` is not production readiness. `live-external-deferred` is not live readiness. No live-external-authorised provider is registered in this slice.
