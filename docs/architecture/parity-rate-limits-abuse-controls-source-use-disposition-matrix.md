# Parity Rate Limits / Abuse Controls Source-Use Disposition Matrix

Status: draft  
Domain: parity-rate-limits-abuse-controls  
Tracking: USF-160 implementation, USF-161 deferred depth under USF-133

This matrix records how React rate-limit, quota, throttling, abuse-control, tenant-fairness, retry-after, admission-control, and operational-guardrail lineage is used in USF. Linear tracks work only and does not define USF semantic authority.

No runtime/application code is copied from `../react`. No USF path mirrors React paths. React is historical semantic and proof evidence only.

| Source lineage | React paths | Foundation relevance | USF target | Source use | Disposition |
| --- | --- | --- | --- | --- | --- |
| Rate-limit use case | `../react/apps/platform-api/src/usecases/rate-limits.ts` | must-migrate | `packages/core/src/index.ts`, `adapters/guardrails/src/index.ts` | rewrite-from-behaviour | Local/dev/test fixed-window decisions, fail-closed unknown policy, retry-after, safe denial. |
| Rate-limit repository ports | `../react/apps/platform-api/src/ports/rate-limit-repository.ts` | must-migrate | `packages/ports/src/index.ts` | rewrite-from-behaviour | `GuardrailPort` replaces source port shape with broader guardrail semantics. |
| In-memory rate-limit repository | `../react/apps/platform-api/src/adapters/in-memory-rate-limit-repository.ts` | must-migrate | `adapters/guardrails/src/index.ts` | rewrite-from-behaviour | Deterministic bounded in-memory guardrail store for local/dev/test proof. |
| Redis/Postgres rate-limit providers | `../react/apps/platform-api/src/adapters/redis-rate-limit-repository.ts`, `../react/apps/platform-api/src/adapters/postgres-rate-limit-repository.ts` | deferred | `docs/architecture/rate-limits-quotas-and-abuse-controls-standard.md` | lineage-only | Distributed/live-capable enforcement classified and deferred; no live provider readiness claim. |
| Quota use case | `../react/apps/platform-api/src/usecases/quota.ts` | must-migrate | `packages/core/src/index.ts`, `adapters/guardrails/src/index.ts` | rewrite-from-behaviour | Tenant-isolated quota accounting and 409 quota-conflict posture. |
| Quota runtime proofs | `../react/apps/platform-api/scripts/quota-enforcement-runtime-proof.ts` | must-migrate | `packages/proof/src/rate-limits-abuse-controls-proof.ts` | rewrite-from-behaviour | Quota isolation and safe evidence rewritten as hermetic USF proof. |
| Rate-limit runtime proofs | `../react/apps/platform-api/scripts/rate-limits-runtime-proof.ts`, `../react/apps/platform-api/scripts/rate-limits-redis-runtime-proof.ts` | must-migrate | `packages/proof/src/rate-limits-abuse-controls-proof.ts` | rewrite-from-behaviour | Local proof covers in-memory semantics; Redis/live distributed proof is deferred. |
| Rate-limit and quota tests | `../react/apps/platform-api/tests/unit/rate-limits.test.ts`, `../react/apps/platform-api/tests/unit/quota.test.ts`, `../react/apps/platform-api/tests/unit/redis-rate-limit-repository.test.ts` | must-migrate | `tests/capabilities/rate-limits-abuse-controls.test.ts`, `tests/apps/api-contracts.test.ts` | rewrite-from-behaviour | Behaviours rewritten as capability/API/proof tests; no UI/Playwright added. |
| API route quota/limit posture | React API route and contract lineage | must-migrate | `apps/api/src/server.ts`, `packages/contracts/src/api-surface.ts`, `packages/openapi/openapi.json` | rewrite-from-behaviour | `POST /v1/jobs` has concrete local guardrail; route metadata and OpenAPI include 429. |
| File/storage quota lineage | `../react/packages/adapters-object-storage/src/index.ts`, storage object tests/proofs | partial | standard and proof posture | lineage-only | Resource guardrail posture classified; broad file quota runtime remains deferred to guardrail depth. |
| Notification send/bulk posture | React notification/bulk/send lineage | partial | standard and proof posture | lineage-only | Notification guardrails represented; broad send quota rollout deferred. |
| Provider protection/backpressure | React provider/health/rate-limit lineage | partial | `adapters/guardrails/src/index.ts`, standard | rewrite-from-behaviour | Provider backpressure model represented without live provider enforcement. |
| Observability/security signals | React monitoring and request instrumentation lineage | must-migrate | `apps/api/src/server.ts`, `packages/proof/src/rate-limits-abuse-controls-proof.ts` | rewrite-from-behaviour | Safe rate-limit and policy-denial signals through the local telemetry collector. |
| Audit/evidence | React audit and operational proof lineage | must-migrate | `packages/core/src/index.ts`, `apps/api/src/server.ts` | rewrite-from-behaviour | Guardrail event taxonomy and value-free denial evidence. |
| Future API/ops guardrail surfaces | React admin/API posture evidence | deferred | standard | lineage-only | `/v1/guardrails/*` routes classified and deferred; no UI or ops surface implemented. |
| Live WAF/edge/gateway/CDN/bot/fraud provider posture | React provider/adapters/compose lineage | deferred | standard and validator | lineage-only | Explicitly not implemented; exact future authority required before live integration. |
| React UI/Playwright guardrail behaviours | React persona/UI/E2E rate-limit or abuse posture where present | foundation-behaviour-rewritten-from-ui-test | capability/API/proof tests | rewrite-from-behaviour | Foundation behaviours rewritten without Playwright; UI/UX remains separate. |

## Runtime File Disposition

| USF file | Treatment | Source-use basis | Notes |
| --- | --- | --- | --- |
| `docs/architecture/rate-limits-quotas-and-abuse-controls-standard.md` | source-derived-rewrite | React rate-limit/quota/abuse lineage plus USF-160 enterprise guardrail controls | Defines controlled guardrail semantics and deferred live depth. |
| `docs/architecture/parity-rate-limits-abuse-controls-source-use-disposition-matrix.md` | evidence-only-support | USF source-use policy | Domain-specific lineage and disposition. |
| `packages/core/src/index.ts` | source-derived-rewrite | React rate-limit/quota, audit, telemetry, API, provider posture lineage | Adds guardrail taxonomy, decisions, validation, safe messages, HTTP status mapping, and audit event types. |
| `packages/ports/src/index.ts` | source-derived-rewrite | React repository/port lineage | Adds `GuardrailPort`. |
| `adapters/guardrails/package.json` | new-with-rationale | USF adapter package pattern | Workspace metadata for in-memory guardrail adapter. |
| `adapters/guardrails/src/index.ts` | source-derived-rewrite | React in-memory repository behaviour | Implements bounded in-memory local/dev/test policy store. |
| `apps/api/src/runtime.ts` | source-derived-rewrite | React runtime composition and route policy lineage | Seeds local jobs.create guardrail policy. |
| `apps/api/src/server.ts` | source-derived-rewrite | React API guard, retry-after, error-envelope, telemetry, audit lineage | Enforces jobs.create guardrail and safe 429 envelope. |
| `packages/contracts/src/api-surface.ts` | source-derived-rewrite | React API contract and route posture lineage | Documents concrete local guardrail posture and 429. |
| `packages/openapi/openapi.json` | evidence-only-support | Generated OpenAPI contract output | Regenerated to include 429 response. |
| `packages/proof/src/rate-limits-abuse-controls-proof.ts` | source-derived-rewrite | React proof behaviour rewritten for USF | Hermetic guardrail proof. |
| `packages/proof/src/index.ts` | new-with-rationale | Proof package target | Exports guardrails proof. |
| `tests/capabilities/rate-limits-abuse-controls.test.ts` | source-derived-rewrite | React rate-limit/quota tests rewritten as foundation tests | Tests fail-closed, tenant-safe, idempotent guardrail behaviour. |
| `tests/apps/api-contracts.test.ts` | source-derived-rewrite | React API/route guard tests rewritten as foundation tests | Tests side-effecting route guard and safe telemetry/audit. |
| `tests/packages/proof.test.ts` | evidence-only-support | Proof package test pattern | Runs guardrails proof in-process. |
| `tools/validate-parity/validate-guardrails.py` | source-derived-rewrite | Existing parity validator pattern and guardrail validator expectations | Static validator for guardrail invariants. |
| `tools/validate-parity/guardrails-planted-defects/*.json` | evidence-only-support | Validator planted-defect pattern | Planted defects for high-risk guardrail regressions. |

## Deferred Depth

Deferred work is tracked by USF-161 and is non-blocking for USF-160 local/dev/test parity acceptance unless a later directive authorises it:

- durable/distributed quota counters;
- persisted idempotency ledger for guardrail decisions;
- full API/resource rollout;
- guardrail admin API routes;
- policy approval workflow and review expiry enforcement;
- live WAF, edge, gateway, CDN, bot, fraud, or abuse provider integration;
- file, notification, provider, audit-export, and identity-action runtime guardrails beyond represented posture;
- live alerting/SIEM/DLP/UEBA integration.
