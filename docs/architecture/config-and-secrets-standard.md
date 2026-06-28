# USF Configuration and Secrets Standard

| | |
|---|---|
| Document type | Architecture / domain semantic standard |
| Status | Draft / parity-config-secrets (USF-144) |
| Authority level | semantic-definition; subordinate to the Charter, Authority Model, Standards Profile, ADR 0010; consistent with the audit-evidence standard and the Enterprise Persistence Metadata and Classification Standard |
| Issue scope | USF-144 under USF-133; deferred depth tracked in USF-145 |
| Evidence basis | Historical `../react` config/secrets behaviour as lineage only; PR 92 DB/RLS; PR 93 PDP; PR 94 audit/evidence |
| Compliance note | ISO 27001-supporting **technical control evidence** (configuration management, access control, secret handling). **Not** a certification claim. |

> Normative language follows BCP 14; only uppercase keywords are normative.

## 1. Config is control-plane data

- **configuration** — typed, validated, scoped control-plane data that changes system behaviour.
- **secret reference** — an opaque pointer (`SecretReference`) to a secret value held by a secrets provider.
- **secret value** — sensitive credential material that MUST NEVER be returned, logged, audited, exposed in OpenAPI, or committed.
- **feature flag** — a typed runtime decision input with deterministic evaluation and a safe default.
- **provider config** — connection/behaviour metadata for providers; never raw credentials.

Configuration MUST be typed, classified, and validated before use; secrets MUST be referenced, not embedded; missing/invalid required config fails closed; config changes are privileged actions; config values MUST NOT silently broaden tenant, provider, or security scope.

## 2. Classification and ownership

Every config item declares: config_key, classification, scope, owner, type, required, sensitive, secret_reference_allowed, override_policy, allowed_environments, default, audit_policy, deprecated, schema_version (`ConfigKeyDefinition` in `packages/core`). Classifications: public-config, internal-config, security-control, tenant-config, environment-config, provider-config, feature-flag, secret-reference, credential-metadata, runtime-ephemeral, deprecated-config. Unclassified config is not representable (the registry requires a classification). Security-control config cannot be weakened by tenant override unless explicitly authorised; credential material cannot be classified as ordinary config; deprecated config cannot be newly introduced.

## 3. Precedence, override, and drift

Deterministic precedence (lowest trust first): compiled-default, repository-default, environment, deployment, tenant, runtime-override, break-glass-override (`CONFIG_SCOPES`). A higher-trust permitted layer wins; a lower-trust layer MUST NOT override a higher-trust security control (`overrideAllowed`). Operator overrides are scoped/expiring/audited; break-glass overrides require reason, requester, approver, expiry, and audit evidence (fields defined; full workflow deferred, USF-145). `detectConfigDrift` reports unknown keys, missing required keys, and tenant overrides of security controls; provider mismatch, flag-out-of-schema, and stale-secret-version are reserved.

## 4. Environment separation

Environment classes: local-dev, local-composed-test, ci, staging, production (`ENVIRONMENT_CLASSES`). This slice proves local-dev/local-composed-test only. Production config readiness is NOT claimed; production secrets MUST NOT exist in fixtures, tests, examples, docs, OpenAPI, or generated evidence. Environment-specific config carries allowed_environments.

## 5. Secret lifecycle and access

Lifecycle states: created, active, deprecated, rotating, revoked, expired, destroyed, unknown (`SECRET_LIFECYCLE_STATES`). `SecretReference` carries secret_ref, secret_provider, scope, version, status, rotation_policy, last_rotated_at, next_rotation_due_at, owner — never the value. Secret values leave the secret adapter only via `SecretResolver.resolveSecretValue` to an authorised internal consumer; normal API routes never return secret values; tenant users never resolve provider credentials; expired/revoked/unknown states fail closed (no silent downgrade). Secret access requires actor/tenant/scope/purpose and is audited without value. Live external Vault/Key Vault/KMS/OpenBao is a declared, deferred port (`ExternalSecretManager`, USF-145); no live integration.

## 6. Redaction and leak prevention

`redactConfigMap` masks secret-like keys (`SECRET_KEY_PATTERNS`, separator-insensitive: password/passwd/pwd/secret/token/api_key/apikey/authorization/cookie/client_secret/private_key/credential/connection_string/dsn/sas/bearer/jwt) and secret-shaped values (`looksLikeSecretValue`: Bearer/JWT/private-key/provider-key/DSN-with-creds). Redaction applies to API responses, OpenAPI, audit metadata, errors, validation findings, and tooling output. Validation errors are value-free. `validate-config` (USF-CONFIG-006) fails if a secret value appears in the committed OpenAPI document; planted defects prove the rules fire.

## 7. Provider configuration safety

Provider config classifies provider_type, provider_mode, endpoint, allowed_hosts, allowed_schemes, tls_required, timeout/retry/circuit-breaker policy, credential_ref, tenant_scope, data_classification, egress_policy. No provider endpoint defaults to an arbitrary user URL; TLS required unless documented local-only; provider credentials are secret references; provider mode distinguishes in-memory, local-composed-test, mock, live-external. Live-external-provider readiness is NOT claimed. The full per-provider plane (allow-lists/egress/circuit breakers) lands with the files/jobs/notifications/integration domains (USF-145).

## 8. Feature flags

`FeatureFlagDefinition` declares flag_key, default_value, safe_default, scope, owner, expires_at, security_control. `evaluateFeatureFlag` is deterministic; an unknown flag and a missing value both resolve to the safe default; flag changes are audited; security controls are not disabled by ordinary flags; tenant flag values do not leak across tenants.

## 9. Change governance and separation of duties

Config-change evidence (`configChangeEvidence`) records change_actor, change_reason, change_source, previous_value_hash, new_value_hash (sha256, never raw values). Approval fields (approval_required, approved_by, requester≠approver, rollback_ref) and high-risk approval workflow are defined and deferred (USF-145). Privileged config changes are audited; config-change evidence never includes secret values.

## 10. Config access audit

Events (PR 94 audit model, category configuration): config.read, config.changed, config.denied, config.validation_failed, config.drift.detected, secret.accessed, secret.denied, feature_flag.evaluated (emitted); config.override.created/expired, secret.rotated/revoked, feature_flag.changed, provider_config.changed (reserved). Config-change audit records old/new hashes, not raw values; secret-access audit records secret_ref and purpose, never the value; denied privileged access is recorded.

## 11. Startup and bootstrap safety

`ConfigService.validateStartup` validates that every required config resolves and type-checks before serving traffic; missing/invalid required config prevents a ready state. Readiness exposes safe status, not sensitive values; config validation errors are redacted; dev/test defaults are explicit and marked local-dev/local-composed-test only.

## 12. Runtime reload and cache invalidation (reserved)

Reserved fields: cache_key, scope, version, ttl, invalidation_event, reload_strategy, last_loaded_at, source_hash. No live reload/cache exists in this slice; it is deferred (USF-145). When implemented, the cache MUST be scoped by tenant/environment/provider, a cache miss MUST reload-and-validate (never permit by default), and cache failure for security controls MUST fail closed.

## 13. Schema versioning and compatibility

Every config item carries a schema_version (`CONFIG_SCHEMA_VERSION`). Unknown future versions fail safely; deprecated keys remain readable only if explicitly supported; a deterministic migration tool for breaking shape changes is deferred (USF-145).

## 14. Data residency and tenant boundary

Tenant config carries tenant scope; provider config carries tenant/global scope. Tenant A cannot read or infer tenant B config (layer provider keyed by tenant; PDP + tenant context). Cross-tenant provider sharing is explicit; residency reserved fields are defined and enforcement is deferred (USF-145).

## 15. Validator expectations

`tools/validate-parity/validate-config.py` fails closed when: config lacks classification; config lacks owner/scope; required config does not fail closed; secret-reference model is missing; secret-like keys are not blocked; a secret value appears in OpenAPI; config retrieval is not PDP-protected or not tenant-scoped; secret access is not PDP-guarded/audited; feature flags lack a safe default; config-change evidence is not value-free; live secret-manager/provider/production-live is overclaimed; provider credentials are not secret references; config routes are not tenant-guarded; or the parity matrix config row lacks tests/proofs. Each rule has a planted defect under `tools/validate-parity/config-planted-defects`.

## 16. Deferred config/secrets depth (USF-145)

Live external secret managers (OpenBao/Postgres/Vault/Key Vault/KMS) behind the port; secret rotation/revocation execution; DB-backed config + tenant_settings store and change history; config override approval workflow + separation of duties; runtime reload + cache invalidation; full provider configuration plane; data residency enforcement; config schema migration tooling. Each has a retry condition in USF-145. None is overclaimed in the parity matrix while open.
