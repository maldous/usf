# Adversarial API/Contracts Parity Review

Run: 20260628T212708Z-42f7ccb

## Questions

Did we inventory all React API/contracts behaviour?

Yes for the authorised foundation-relevant API/contracts slice. The inventory covers route catalogue, OpenAPI, contracts, schemas, validation, middleware, auth guard, tenant guard, PDP posture, error envelope, pagination, idempotency, correlation, generated client lineage, GraphQL/federation lineage, API tests, UI/Playwright API behaviours, and proof scripts. GraphQL/federation and generated-client depth are explicitly deferred to USF-155.

Did we migrate all authorised API/contracts behaviours?

Yes for local/dev/test foundation API contract parity. Implemented route metadata, OpenAPI generation/checking, guarded jobs and notifications routes, safe error envelope, validation redaction, tenant/PDP guards, idempotency, opaque cursor proof, request/correlation IDs, security-header posture, future UI/API metadata, tests, proof, and validator.

Did any React API/contracts test/proof disappear silently?

No. React UI/Playwright API behaviours are classified and rewritten as API/capability/contract/proof tests where foundation-relevant. UI-only/browser assertions remain out of scope. Deferred API depth is tracked in USF-155.

Is every API/contracts gap classified?

Yes. Gap map classifies 24 items: 16 migrated, 3 partial, 5 deferred, 0 missing, 0 requires-human-decision.

Does every route map to a capability?

Yes. API_ROUTE_CONTRACTS records owningDomain and owningCapability for every implemented route. The proof checks every route contract maps to a Fastify route and capability metadata.

Are protected routes guarded?

Yes. Protected local/dev/test routes use tenant context and PDP guards directly or through capabilities. Tests prove missing tenant and no-permission denial.

Are tenant routes tenant-guarded?

Yes. Tenant context is required and mismatch fails closed. Tests and proof cover missing tenant and tenant mismatch.

Are side-effecting routes idempotent or explicitly excepted?

Yes. Job create, job cancel, notification send, and notification cancel require Idempotency-Key. Other routes carry explicit route metadata exceptions. Tests prove replay and deterministic conflict.

Is OpenAPI complete and consistent with implementation?

Yes. OpenAPI is generated from route metadata. The checker verifies generated/committed parity, implemented-route coverage, OpenAPI-without-implementation detection, unique operation IDs, metadata, schema refs, safe examples, and no readiness overclaim.

Are examples synthetic and secret-free?

Yes. OpenAPI examples use synthetic IDs/placeholders. The checker rejects tokens, credentials, private keys, raw object key markers, raw recipient address refs, real example email domains, and public/production/SDK readiness overclaims.

Are errors safe and non-enumerating where required?

Yes for implemented local/dev/test API routes. Safe envelope includes stable IDs, code/reason code, safe message, request/correlation IDs, and safe details. Tenant mismatch and unknown resources avoid cross-tenant disclosure.

Is pagination safe?

Partial. File-list cursor proof verifies the cursor does not expose raw tenant ID. Broader persisted cursor/search/filter depth is deferred to USF-155.

Is future UI/API readiness improved without UI implementation?

Yes. Route metadata, operation IDs, OpenAPI tags, examples, schema refs, lifecycle, compatibility, field exposure, security/browser posture, and reason codes are present. No UI runtime or Playwright was added.

Is source-use honest?

Yes. Domain-specific and bootstrap source-use matrices record all touched files as source-derived rewrites, new-with-rationale, or evidence-only support. No React runtime/application code is copied.

Does make parity pass?

Yes. Full validation log records make parity passing with validate-api included.

Does make verify pass?

Yes. Full validation log records make verify passing: format, lint, typecheck, 165 tests, OpenAPI check, DB type check, dev smoke, compose smoke, proofs, repo validators, and parity.

Any public API or production readiness overclaim?

No. API proof and OpenAPI boundary explicitly set public API, external SDK, production, and production-live claims false. Standard/source-use/matrix state local/dev/test only.

## Negative Findings

No blocking negative findings remain.

## Deferred Items

USF-155 tracks GraphQL/federation, generated clients or external SDK posture, public compatibility guarantees, browser-session CSRF/cookie runtime, advanced filtering/search, rate limiting/abuse runtime, bulk/import/export APIs, API deprecation runtime policy, and gateway/edge controls.
