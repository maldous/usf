# Authentication Authorization Tenant Role Permission Test Suite

This USF-249 evidence record maps owned auth tests to the existing semantic service obligation manifest, composed service integration matrix, and deterministic fixture corpus.

It does not edit the enterprise evidence model while that file is coordinator-locked. Required coordinator-owned rows are listed in `docs/architecture/authn-authz-tenant-role-permission-test-suite.json`.

Owned executable coverage:

- `tests/packages/auth/authn-authz-tenant-role-permission-unit.test.ts`
- `tests/packages/auth/authn-authz-tenant-role-permission-integration.test.ts`
- `tests/packages/auth/authn-authz-tenant-role-permission-regression.test.ts`

Non-claims preserved: no final USF-234 acceptance, test readiness, staging, production, deployment, live-provider, SOC, ISO certification, enterprise production, product UI, browser E2E, or full React parity claim.
