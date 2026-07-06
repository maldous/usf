# Full Parity Linear Tracking Plan

| | |
|---|---|
| Document type | Architecture / work-tracking plan (planning) |
| Status | Draft / planning |
| Authority level | Reviewable planning plan; Linear tracks work only and is not USF semantic authority (AGENTS.md, Authority Model) |
| Follows | `docs/architecture/superseded-lineage-closure-provenance.md`, `docs/architecture/functional-scope-classification-matrix.md` |
| Canonical team | Universal Service Foundation; project Foundation & Governance |
| Repository state | Planning only; introduces no new implementation/runtime code. The repository already contains the authorised local dev/test bootstrap runtime (PR #88/#89). |

This plan records the Linear tracking structure for foundation readiness disposition work. Linear is an external execution tracker; the readiness bar and disposition model are defined in the directive, not here.

## 1. Created in this pass (apply mode, authorised)

| Key | Title | Role | Blocks readiness? | Labels |
|---|---|---|---|---|
| USF-133 | functional completeness foundation readiness | Umbrella tracker | n/a (tracker) | governance, coverage-matrix, source-import, implementation-gate, bootstrap-followup |
| USF-134 | Future UI/UX integration surface from USF foundation contracts (non-foundation-blocking) | Future UI scope | No | (none — see §4) |
| USF-135 | Parity matrix enforcement validator and make parity gate | Validator/gate blocker | Yes (blocks USF-133) | validator, implementation-gate, governance |
| USF-136 | Semantic authority decisions required before parity migration | Human-decision blocker | Yes (blocks USF-133) | semantic-corpus, implementation-gate, governance |
| USF-137 | Relocate validator-load-bearing .codex evidence, then untrack .codex | Repo hygiene / validator robustness | No (not readiness-blocking) | governance, validator, source-import |

Comments added: a readiness-correction comment on USF-39 (bootstrap-only scope); a UI/UX boundary clarification on USF-133; an execution-state hygiene (.codex) note on USF-133.

Note on .codex: untracking .codex was initially blocked because durable bootstrap evidence was referenced from local agent state. USF-137 relocates the validator-load-bearing bootstrap start record to docs/architecture/bootstrap-start.json and updates the bootstrap validator, schema registry, and governance references so .codex remains local-only agent execution state rather than repository authority.

## 2. Planned per-domain children (NOT created yet — gated)

These map one-to-one to the 12 foundation domains in the scope-classification matrix. They are **implementation work items** and, per AGENTS.md, MUST NOT be created until a separate human-approved implementation directive authorises the corresponding scope. They are listed here so the full child set is enumerated and reviewable now.

| Planned child | Domain | First deliverable |
|---|---|---|
| parity-auth | Auth / identity | Item-level inventory + rewrite of identity broker, session, cookie, claim-mapping behaviours as foundation tests |
| parity-tenant | Tenant isolation + RBAC/ABAC | Cross-tenant 403 + RLS contract tests; ABAC blocked on USF-136 |
| parity-audit | Audit / evidence / events | Audit recording + event bus durability/DLQ contract tests |
| parity-config | Config + secrets | Config registry/history + real secrets provider behaviour |
| parity-files | Files / storage | Object storage, tenant prefixes, signed URL behaviour |
| parity-jobs | Jobs / workflows / scheduling | Job + workflow behaviour; engine choice blocked on USF-136 |
| parity-notify | Notifications | Multi-transport delivery + preferences behaviour |
| parity-api | API routes / OpenAPI | Route parity, OpenAPI drift gate, security headers, error safety |
| parity-db | DB / RLS / migrations | Real Postgres/RLS/migration parity (strongest near-term candidate) |
| parity-providers | Provider adapters / modes | Provider-mode parity; compose-local then sandbox; live deferred |
| parity-observability | Observability | Request/trace instrumentation + metrics/logs/traces parity |
| parity-commands | Developer commands + proof tooling | Command parity + proof-ladder parity behind make targets |

Each child, when created, MUST use the AGENTS.md issue template, set parent USF-133, relate to USF-39, carry a source-use disposition expectation, and state its own non-goals and validation. Each `partial`/`missing`/`requires-human-decision` item it enumerates MUST be a tracked blocker, never a markdown-only note.

## 3. Dependencies

USF-135 and USF-136 block the foundation-readiness claim (USF-133). USF-136 specifically blocks parity-tenant (ABAC) and parity-jobs (workflow engine). USF-134 is non-blocking. All per-domain children depend on a separate approved implementation directive.

## 4. Label policy

Existing Linear labels were reused (governance, coverage-matrix, source-import, implementation-gate, bootstrap-followup, validator, semantic-corpus). The labels named in the originating directive — parity, future-ui, not-foundation-blocking — were **not** created: AGENTS.md requires explicit authorisation to create labels, which this pass did not have. `coverage-matrix` carries the parity dimension; non-blocking status for USF-134 is recorded in its title and body. A human may create the dedicated labels later if desired.

## 5. Boundary

This plan creates no semantic authority and authorises no implementation. The next implementation scope, and the per-domain children, await a separate human-approved implementation directive.
