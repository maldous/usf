# Parity Config/Secrets Source-Use Disposition Matrix

| | |
|---|---|
| Document type | Architecture / source-use governance matrix |
| Status | Draft / parity-config-secrets (USF-144) implementation coverage plus bounded enterprise depth (USF-145) |
| Authority level | Reviewable implementation coverage; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, runtime proof evidence, semantic instances, and the implementation directive |
| Issue scope | USF-144 under USF-133; deferred depth tracked in USF-145 |
| Source row basis | `docs/architecture/config-and-secrets-standard.md`, ADR 0010 (PDP), the audit-evidence standard, and historical `../react` config/secrets behaviour as lineage only |
| Repository state | No React runtime/application code copied; no React path mirroring; no UI; no Playwright; local OpenBao remains bounded composed-test evidence only; no live Vault/Key Vault/KMS/OpenBao, staging, production, or certification claim |

## Treatment Rules

`source-derived-rewrite` means the behaviour was recovered from historical `../react` evidence and freshly authored against USF semantics (no copy, no path mirroring). `new-with-rationale` means USF-defined. `evidence-only-support` means a test/proof artefact. Files modified in this slice that already carry a disposition row in another matrix (`packages/core`, `packages/ports`, `packages/contracts`, `packages/openapi`, `apps/api`, `capabilities/config/src/index.ts`, `capabilities/tenant/src/authorization-policy.ts`, `adapters/secrets/src/index.ts`) are not re-listed here.

## Implementation Target Files

| Target file | Treatment | Source-use basis | Rationale |
| --- | --- | --- | --- |
| `capabilities/config/src/registry.ts` | source-derived-rewrite | React `@platform/config-runtime` typed kernel + per-field metadata lineage | USF config key registry: classification, scope, owner, type, required, sensitive, override policy, allowed environments. Unknown keys fail closed. |
| `capabilities/config/src/config-service.ts` | source-derived-rewrite | React config-runtime fail-closed read + tenant settings lineage | PDP-protected, tenant-scoped typed config read/list/feature-flag/validate/drift with config audit; secret-keyed/shaped values redacted. |
| `capabilities/config/src/secret-service.ts` | source-derived-rewrite | React SecretStorePort access + honest-degradation lineage | Internal-only secret resolution, PDP-guarded, audited without value; fail-closed on revoked/expired/unknown. |
| `packages/proof/src/config-secrets-proof.ts` | evidence-only-support | Config/secrets fail-closed + non-leakage proof requirement | Hermetic proof: fail-closed validation, redaction/non-leakage, tenant isolation, secret lifecycle, deterministic flags. `make config-proof` (also in `make verify`). |
| `docs/architecture/config-secrets-enterprise-proof-depth-matrix.json` | evidence-only-support | USF-145 enterprise config/secrets depth gate | Machine-readable bounded proof matrix for OpenBao reconciliation, rotation posture, tenant settings, change history, override SoD, runtime reload/cache invalidation, provider config plane, data residency, schema migration, redaction, validator linkage, evidence refs, and non-claims. |
| `tests/capabilities/config-secrets.test.ts` | evidence-only-support | Config/secrets behaviour proof requirement | Hermetic model/precedence/override/secret/redaction/flag/change-evidence tests. |
| `tests/apps/config-api.test.ts` | evidence-only-support | Config surface proof requirement | API tests: redacted config, deterministic flags, provider modes, tenant mismatch; no secret values. |

## Sub-Domain Classification

| Config/secrets concern | Status | Where | Notes |
| --- | --- | --- | --- |
| Typed config schema | migrated | `packages/core` (ConfigKeyDefinition, resolveConfigValue), `capabilities/config/src/registry.ts` | Typed coercion; fail-closed on invalid. |
| Config classification | migrated | `packages/core` (CONFIG_CLASSIFICATIONS, 11 values) | Unclassified config is not representable (registry requires a classification). |
| Secret-reference model | migrated | `packages/core` (SecretReference), `adapters/secrets` | Opaque pointer, no value field; distinct from secret value. |
| Secret-value handling | migrated | `capabilities/config/src/secret-service.ts`, `adapters/secrets` | Internal-only resolve; never returned by API; audited without value. |
| Tenant config isolation | migrated | `config-service` + layer provider keyed by tenant | Tenant A cannot read tenant B config/secrets (proof + tests). |
| Environment config | migrated | `packages/core` (ENVIRONMENT_CLASSES), registry allowedEnvironments | local-dev/local-composed-test proven only; production not claimed. |
| Provider config | bounded-local-proof | registry provider.* keys + standard provider-safety fields + USF-145 proof | Credentials are secret refs; OpenBao provider registry linkage, local endpoint ref, no external egress, timeout/retry posture, and local-compose data residency are proven locally. Live provider approval, supplier evidence, managed TLS, staging, and production readiness are not claimed. |
| Feature flags | migrated | `packages/core` (evaluateFeatureFlag), registry | Deterministic, safe default on unknown/missing; audited. |
| Config precedence | migrated | `packages/core` (CONFIG_SCOPES + resolveConfigValue + overrideAllowed) | Deterministic; lower-trust cannot override a security control. |
| Override policy | migrated | `packages/core` (OverridePolicy + overrideAllowed) | Operator/break-glass override evidence fields defined; full workflow deferred (USF-145). |
| Redaction | migrated | `packages/core` (SECRET_KEY_PATTERNS, redactConfigMap, looksLikeSecretValue) | Key-name (separator-insensitive) + value-shape; applied to API/audit/error/list. |
| Rotation posture | bounded-local-proof | `SecretReference` lifecycle fields + `make config-proof` | Versioned local rotation posture is proven with active-to-rotating state, authorised internal resolution, value-free audit/evidence, and no raw secret output. Live automatic rotation, KMS custody, and production lifecycle readiness are not claimed. |
| Config audit | migrated | `config-service` + PR 94 audit model | config.read/changed/denied/validation_failed/drift.detected; value-free change evidence. |
| Startup/readiness validation | migrated | `config-service.validateStartup` | Required/invalid config fails validation. |
| Schema versioning | bounded-local-proof | `CONFIG_SCHEMA_VERSION`, def.schemaVersion, `make config-proof` | Deterministic config-0 to current-schema migration and unknown future-version fail-closed behaviour are proven locally. Production migration tooling, rollback, and release approval remain non-claims. |
| Runtime reload/cache invalidation | bounded-local-proof | `make config-proof` | Tenant/key-scoped local cache versioning and invalidation reload are proven. Distributed runtime reload and fleet-wide cache invalidation remain non-claims. |
| Override workflow + SoD | bounded-local-proof | `make config-proof` | Self-approval denial and fail-closed security-control override posture are proven with synthetic actors. Executed operator workflow and production break-glass readiness remain non-claims. |
| Data residency | bounded-local-proof | provider registry + `make config-proof` | Local-compose OpenBao region and allowed-region boundary are proven. Production residency and cross-border transfer governance remain non-claims. |
| Future external secret manager ports | bounded-local-reconciled | `packages/ports` (ExternalSecretManager), OpenBao provider registry, runtime provider evidence | OpenBao composed-test binding is reconciled as local provider evidence only; no live Vault/Key Vault/KMS/OpenBao readiness. |

## React UI/Playwright Config Behaviours

The historical `../react` config/secrets inventory (`.claude/runs/.../react-config-secrets-inventory.json`, 28 items) found **1 UI/Playwright-only** config behaviour: the stage-policy E2E that asserts auth-mode/credential and secret/provider readiness gates. It is classified **foundation-behaviour-rewritten-from-ui-test** and is re-proven at the foundation level by the config proof's fail-closed validation, provider-mode classification, and secret lifecycle checks (`make config-proof`) — not by Playwright. No UI/Playwright config test disappears silently.

## Non-goals

No React runtime/application code copy. No React path mirroring. No UI/UX. No Playwright. No live external Vault/Key Vault/KMS/OpenBao/secret-manager. No live-external-provider. No staging/production/deployment/production-live claim. No SOC readiness, ISO certification, enterprise production readiness, full dev readiness, full product readiness, or USF-133 closure claim.
