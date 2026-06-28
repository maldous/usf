# Current USF Provider/Adapters Inventory

Inventory count: 6 aggregate items.

Current USF implementation now includes:

- Provider registry and taxonomy in `packages/core/src/index.ts`.
- Provider status safe views and fail-closed validation.
- Provider audit event taxonomy and value-free provider audit proof.
- Provider config mode alignment and SecretReference-only credential posture.
- Operator-only, PDP-protected provider status API routes.
- OpenAPI schemas and safe examples for provider status.
- `make providers-proof`, proof package export, and in-process proof tests.
- `validate-providers` with planted defects.

Remaining depth is tracked in USF-157 and is not claimed as complete.
