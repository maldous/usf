import type { ConfigKeyDefinition, FeatureFlagDefinition } from "@foundation/core";

// USF config key registry (parity-config-secrets, USF-144). Every config key the
// foundation reads is declared here with its classification, scope, owner, type,
// required-ness, sensitivity, override policy, and allowed environments. Unknown
// keys fail closed (they are not in this registry). Dev/test defaults are explicit
// and marked local-dev/local-composed-test only.

const DEV_ENVS = Object.freeze(["local-dev", "local-composed-test"] as const);

function def(partial: Partial<ConfigKeyDefinition> & { key: string }): ConfigKeyDefinition {
  return Object.freeze({
    key: partial.key,
    classification: partial.classification ?? "internal-config",
    scope: partial.scope ?? "compiled-default",
    owner: partial.owner ?? "platform",
    type: partial.type ?? "string",
    required: partial.required ?? false,
    sensitive: partial.sensitive ?? false,
    securityControl: partial.securityControl ?? false,
    secretReferenceAllowed: partial.secretReferenceAllowed ?? false,
    overridePolicy: partial.overridePolicy ?? "environment-only",
    allowedEnvironments: partial.allowedEnvironments ?? DEV_ENVS,
    defaultValue: partial.defaultValue ?? null,
    enumValues: partial.enumValues ?? null,
    auditPolicy: partial.auditPolicy ?? "on-change",
    deprecated: partial.deprecated ?? false,
    schemaVersion: partial.schemaVersion ?? "config-1",
  });
}

export const CONFIG_REGISTRY: readonly ConfigKeyDefinition[] = Object.freeze([
  def({
    key: "app.public-name",
    classification: "public-config",
    type: "string",
    defaultValue: "USF Foundation",
    owner: "platform",
    overridePolicy: "tenant-allowed",
  }),
  def({
    key: "environment.name",
    classification: "environment-config",
    type: "enum",
    enumValues: ["local-dev", "local-composed-test", "ci", "staging", "production"],
    required: true,
    defaultValue: "local-dev",
    overridePolicy: "environment-only",
  }),
  def({
    // A security control: the session TTL. Required, and a tenant must NOT weaken it.
    key: "security.session.ttl-seconds",
    classification: "security-control",
    type: "number",
    required: true,
    securityControl: true,
    defaultValue: "3600",
    overridePolicy: "environment-only",
    auditPolicy: "always",
  }),
  def({
    key: "security.audit.required",
    classification: "security-control",
    type: "boolean",
    required: true,
    securityControl: true,
    defaultValue: "true",
    overridePolicy: "immutable",
    auditPolicy: "always",
  }),
  def({
    key: "tenant.locale",
    classification: "tenant-config",
    type: "string",
    defaultValue: "en",
    overridePolicy: "tenant-allowed",
  }),
  def({
    key: "provider.mode",
    classification: "provider-config",
    type: "enum",
    enumValues: [
      "in-memory",
      "local-test",
      "mock",
      "composed-test",
      "live-external-deferred",
      "live-external-authorised",
      "disabled",
      "unavailable",
    ],
    required: true,
    defaultValue: "in-memory",
    overridePolicy: "environment-only",
  }),
  def({
    key: "provider.notification.mode",
    classification: "provider-config",
    type: "enum",
    enumValues: ["in-memory", "local-test", "mock", "live-external-deferred"],
    required: true,
    defaultValue: "in-memory",
    overridePolicy: "environment-only",
  }),
  def({
    key: "provider.notification.mail.credential-ref",
    classification: "secret-reference",
    type: "string",
    sensitive: true,
    secretReferenceAllowed: true,
    defaultValue: "secret://local-dev/notification-mail-api-key",
    overridePolicy: "environment-only",
  }),
  def({
    // A secret REFERENCE (opaque pointer), never the value. secretReferenceAllowed.
    key: "provider.mail.api-key-ref",
    classification: "secret-reference",
    type: "string",
    sensitive: true,
    secretReferenceAllowed: true,
    defaultValue: "secret://local-dev/mail-api-key",
    overridePolicy: "environment-only",
  }),
]);

export const FEATURE_FLAG_REGISTRY: readonly FeatureFlagDefinition[] = Object.freeze([
  Object.freeze({
    flagKey: "audit-retrieval-ui",
    defaultValue: false,
    safeDefault: false,
    scope: "tenant",
    owner: "platform",
    expiresAt: null,
    securityControl: false,
  }),
  Object.freeze({
    flagKey: "experimental-config-editor",
    defaultValue: false,
    safeDefault: false,
    scope: "tenant",
    owner: "platform",
    expiresAt: null,
    securityControl: false,
  }),
]);

export function configDefinition(key: string): ConfigKeyDefinition | undefined {
  return CONFIG_REGISTRY.find((d) => d.key === key);
}

export function featureFlagDefinition(flagKey: string): FeatureFlagDefinition | undefined {
  return FEATURE_FLAG_REGISTRY.find((f) => f.flagKey === flagKey);
}
