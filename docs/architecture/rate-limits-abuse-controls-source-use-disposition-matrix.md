# Rate Limits / Abuse Controls Source-Use Disposition Matrix

Status: draft  
Domain: rate-limits-abuse-controls  
Tracking: USF-160 local foundation and USF-161 bounded distributed-depth proof under USF-133

This matrix records how rate-limit, quota, throttling, abuse-control, tenant-fairness, retry-after, admission-control, and operational-guardrail semantics are authored in USF, with USF's own self-defined source lineage as evidence. Linear tracks work only and does not define USF semantic authority.

USF authors its own runtime; no external runtime/application code is copied and no USF path mirrors an external source path. USF's own self-defined source lineage is retained as semantic and proof evidence only.

| Source lineage | Source lineage detail | Foundation relevance | USF target | Source use | Disposition |
| --- | --- | --- | --- | --- | --- |
| Rate-limit use case | USF source lineage: rate-limit use case | in-scope | `packages/core/src/index.ts`, `adapters/guardrails/src/index.ts` | rewrite-from-behaviour | Local/dev/test fixed-window decisions, fail-closed unknown policy, retry-after, safe denial. |
| Rate-limit repository ports | USF source lineage: rate-limit repository port | in-scope | `packages/ports/src/index.ts` | rewrite-from-behaviour | `GuardrailPort` replaces source port shape with broader guardrail semantics. |
| In-memory rate-limit repository | USF source lineage: in-memory rate-limit repository | in-scope | `adapters/guardrails/src/index.ts` | rewrite-from-behaviour | Deterministic bounded in-memory guardrail store for local/dev/test proof. |
| Redis/Postgres rate-limit providers | USF source lineage: Redis and Postgres rate-limit repositories | partial | `docs/architecture/rate-limits-quotas-and-abuse-controls-standard.md`, `docs/architecture/guardrails-distributed-enforcement-proof-depth-matrix.json` | lineage-only | USF-161 proves proof-local durable distributed counters and multi-node consistency with synthetic fixtures. Redis/Postgres/live provider counter readiness remains unclaimed. |
| Quota use case | USF source lineage: quota use case | in-scope | `packages/core/src/index.ts`, `adapters/guardrails/src/index.ts` | rewrite-from-behaviour | Tenant-isolated quota accounting and 409 quota-conflict posture. |
| Quota runtime proofs | USF source lineage: quota-enforcement runtime proof | in-scope | `packages/proof/src/rate-limits-abuse-controls-proof.ts` | rewrite-from-behaviour | Quota isolation and safe evidence rewritten as hermetic USF proof. |
| Rate-limit runtime proofs | USF source lineage: rate-limit and Redis rate-limit runtime proofs | in-scope | `packages/proof/src/rate-limits-abuse-controls-proof.ts` | rewrite-from-behaviour | Local proof covers in-memory semantics. USF-161 adds synthetic durable counter, multi-node consistency, route/domain rollout, policy approval, cost quota, and provider fail-closed evidence without claiming Redis/live provider readiness. |
| Rate-limit and quota tests | USF source lineage: rate-limit, quota, and Redis rate-limit repository unit tests | in-scope | `tests/capabilities/rate-limits-abuse-controls.test.ts`, `tests/apps/api-contracts.test.ts` | rewrite-from-behaviour | Behaviours rewritten as capability/API/proof tests; no UI/Playwright added. |
| API route quota/limit posture | USF source lineage: API route and contract | in-scope | `apps/api/src/server.ts`, `packages/contracts/src/api-surface.ts`, `packages/openapi/openapi.json` | rewrite-from-behaviour | `POST /v1/jobs` has concrete local guardrail; route metadata and OpenAPI include 429. |
| File/storage quota lineage | USF source lineage: object-storage adapter, storage object tests/proofs | partial | standard and proof posture | lineage-only | Resource guardrail posture classified; broad file quota runtime remains deferred to guardrail depth. |
| Notification send/bulk posture | React notification/bulk/send lineage | partial | standard and proof posture | lineage-only | Notification guardrails represented; broad send quota rollout deferred. |
| Provider protection/backpressure | React provider/health/rate-limit lineage | partial | `adapters/guardrails/src/index.ts`, standard | rewrite-from-behaviour | Provider backpressure model represented without live provider enforcement. |
| Observability/security signals | React monitoring and request instrumentation lineage | in-scope | `apps/api/src/server.ts`, `packages/proof/src/rate-limits-abuse-controls-proof.ts` | rewrite-from-behaviour | Safe rate-limit and policy-denial signals through the local telemetry collector. |
| Audit/evidence | React audit and operational proof lineage | in-scope | `packages/core/src/index.ts`, `apps/api/src/server.ts` | rewrite-from-behaviour | Guardrail event taxonomy and value-free denial evidence. |
| Future API/ops guardrail surfaces | React admin/API posture evidence | partial | standard and USF-161 proof matrix | lineage-only | USF-161 proves a proof-local operator control-plane flow for policy draft, approval, publication, and value-free journal evidence. Public HTTP `/v1/guardrails/*` routes, UI, break-glass operation, and production operator readiness remain unclaimed. |
| Live WAF/edge/gateway/CDN/bot/fraud provider posture | React provider/adapters/compose lineage | deferred | standard and validator | lineage-only | Explicitly not implemented; exact future authority required before live integration. |
| React UI/Playwright guardrail behaviours | React persona/UI/E2E rate-limit or abuse posture where present | foundation-behaviour-rewritten-from-ui-test | capability/API/proof tests | rewrite-from-behaviour | Foundation behaviours rewritten without Playwright; UI/UX remains separate. |

## Runtime File Disposition

| USF file | Treatment | Source-use basis | Notes |
| --- | --- | --- | --- |
| `docs/architecture/rate-limits-quotas-and-abuse-controls-standard.md` | source-derived-rewrite | React rate-limit/quota/abuse lineage plus USF-160 enterprise guardrail controls | Defines controlled guardrail semantics and deferred live depth. |
| `docs/architecture/rate-limits-abuse-controls-source-use-disposition-matrix.md` | evidence-only-support | USF source-use policy | Domain-specific lineage and disposition. |
| `packages/core/src/index.ts` | source-derived-rewrite | React rate-limit/quota, audit, telemetry, API, provider posture lineage | Adds guardrail taxonomy, decisions, validation, safe messages, HTTP status mapping, and audit event types. |
| `packages/ports/src/index.ts` | source-derived-rewrite | React repository/port lineage | Adds `GuardrailPort`. |
| `adapters/guardrails/package.json` | new-with-rationale | USF adapter package pattern | Workspace metadata for in-memory guardrail adapter. |
| `adapters/guardrails/src/index.ts` | source-derived-rewrite | React in-memory repository behaviour | Implements bounded in-memory local/dev/test policy store. |
| `apps/api/src/runtime.ts` | source-derived-rewrite | React runtime composition and route policy lineage | Seeds local jobs.create guardrail policy. |
| `apps/api/src/server.ts` | source-derived-rewrite | React API guard, retry-after, error-envelope, telemetry, audit lineage | Enforces jobs.create guardrail and safe 429 envelope. |
| `packages/contracts/src/api-surface.ts` | source-derived-rewrite | React API contract and route posture lineage | Documents concrete local guardrail posture and 429. |
| `packages/openapi/openapi.json` | evidence-only-support | Generated OpenAPI contract output | Regenerated to include 429 response. |
| `packages/proof/src/rate-limits-abuse-controls-proof.ts` | source-derived-rewrite | React proof behaviour rewritten for USF | Hermetic guardrail proof plus USF-161 bounded synthetic distributed guardrails depth evidence. |
| `docs/architecture/guardrails-distributed-enforcement-proof-depth-matrix.json` | evidence-only-support | USF-161 source-issue evidence gate | Machine-checkable distributed-depth proof matrix, deferred live/provider boundaries, enterprise evidence references, and non-claims. |
| `packages/proof/src/index.ts` | new-with-rationale | Proof package target | Exports guardrails proof. |
| `tests/capabilities/rate-limits-abuse-controls.test.ts` | source-derived-rewrite | React rate-limit/quota tests rewritten as foundation tests | Tests fail-closed, tenant-safe, idempotent guardrail behaviour. |
| `tests/apps/api-contracts.test.ts` | source-derived-rewrite | React API/route guard tests rewritten as foundation tests | Tests side-effecting route guard and safe telemetry/audit. |
| `tests/packages/proof.test.ts` | evidence-only-support | Proof package test pattern | Runs guardrails proof in-process. |
| `tools/validate-parity/validate-guardrails.py` | source-derived-rewrite | Existing parity validator pattern and guardrail validator expectations | Static validator for guardrail invariants. |
| `tools/validate-parity/guardrails-planted-defects/*.json` | evidence-only-support | Validator planted-defect pattern | Planted defects for high-risk guardrail regressions. |

## USF-161 Distributed Depth

USF-161 proves bounded synthetic distributed guardrails depth for the selected source issue:

- proof-local durable/distributed quota counters;
- multi-node consistency over a shared synthetic counter key;
- route/domain rollout posture across API, jobs, notifications, files, providers, and import/export boundaries;
- proof-local operator policy approval workflow and value-free journal evidence;
- cost quota denial and unavailable-provider fail-closed behaviour;
- IP-derived privacy posture using opaque hashes only;
- tenant fairness, audit, cleanup, and retention-boundary evidence.

Remaining out-of-scope or deferred boundaries are not hidden:

- live WAF, edge, gateway, CDN, bot, fraud, or abuse provider integration;
- public HTTP guardrail admin APIs, operator UI, and break-glass operation;
- provider-managed Redis/Postgres/CDN/WAF counters and customer traffic operation;
- live alerting/SIEM/DLP/UEBA integration;
- staging readiness, production readiness, live-provider readiness, SOC readiness, ISO certification, full dev readiness, full product readiness, and USF-133 closure.
