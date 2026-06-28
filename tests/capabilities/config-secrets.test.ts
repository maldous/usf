import { InMemorySecretStore } from "@foundation/adapter-secrets";
import { InMemoryAuditEventStore, createAuditRecorder } from "@foundation/capability-audit";
import {
  CONFIG_REGISTRY,
  ConfigAccessDeniedError,
  InMemoryConfigLayerProvider,
  InMemoryFeatureFlagSource,
  SecretAccessDeniedError,
  configDefinition,
  createConfigService,
  createSecretService,
} from "@foundation/capability-config";
import {
  InMemoryTenantMembershipDirectory,
  createPolicyDecisionPoint,
} from "@foundation/capability-tenant";
import {
  CONFIG_REDACTED,
  configChangeEvidence,
  createTenantContext,
  detectConfigDrift,
  evaluateFeatureFlag,
  isSecretLikeKey,
  redactConfigMap,
  resolveConfigValue,
  type MembershipStatus,
  type TenantContext,
} from "@foundation/core";
import { describe, expect, it } from "vitest";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const SECRET = "DO-NOT-LEAK-credential-xyz";

function ctx(
  tenantId: string,
  actorId = "actor",
  roles: readonly string[] = ["security-admin"],
): TenantContext {
  return createTenantContext({ tenantId, actorId, roles });
}

function membership(
  roles: readonly string[],
  tenantId = TENANT_A,
  actorId = "actor",
  status: MembershipStatus = "active",
) {
  const dir = new InMemoryTenantMembershipDirectory();
  dir.upsert({ membershipId: "m", tenantId, actorId, status, roles });
  return dir;
}

function stack(roles: readonly string[] = ["security-admin"]) {
  const auditStore = new InMemoryAuditEventStore();
  const recorder = createAuditRecorder({ ledger: auditStore, component: "test" });
  const pdp = createPolicyDecisionPoint({ memberships: membership(roles) });
  const layerProvider = new InMemoryConfigLayerProvider();
  const flagSource = new InMemoryFeatureFlagSource();
  const secrets = new InMemorySecretStore();
  const config = createConfigService({ layerProvider, flagSource, pdp, audit: recorder });
  const secretSvc = createSecretService({ resolver: secrets, pdp, audit: recorder });
  return { auditStore, recorder, pdp, layerProvider, flagSource, secrets, config, secretSvc };
}

describe("config validation fails closed", () => {
  it("required config with no value fails closed", () => {
    const def = { ...configDefinition("security.session.ttl-seconds")!, defaultValue: null };
    expect(() => resolveConfigValue(def, [])).toThrow(/required-missing/);
  });

  it("invalid type fails closed without echoing the value", () => {
    const def = configDefinition("security.session.ttl-seconds")!;
    expect(() => resolveConfigValue(def, [{ scope: "environment", value: "abc" }])).toThrow(
      /not-a-number/,
    );
  });

  it("enum validation rejects an out-of-set value", () => {
    const def = configDefinition("environment.name")!;
    expect(() => resolveConfigValue(def, [{ scope: "environment", value: "mars" }])).toThrow(
      /not-in-enum/,
    );
  });

  it("unknown config key fails closed", async () => {
    const { config } = stack(["security-admin"]);
    await expect(config.get(ctx(TENANT_A), "no.such.key")).rejects.toBeInstanceOf(
      ConfigAccessDeniedError,
    );
  });

  it("startup validation passes for the registry defaults", () => {
    const { config } = stack();
    expect(config.validateStartup().ok).toBe(true);
  });
});

describe("precedence and override policy", () => {
  it("a higher-trust layer wins deterministically", () => {
    const def = configDefinition("environment.name")!;
    const v = resolveConfigValue(def, [
      { scope: "compiled-default", value: "local-dev" },
      { scope: "environment", value: "local-composed-test" },
    ]);
    expect(v).toBe("local-composed-test");
  });

  it("a tenant layer cannot weaken a security-control config", () => {
    const def = configDefinition("security.session.ttl-seconds")!;
    const v = resolveConfigValue(def, [
      { scope: "compiled-default", value: "3600" },
      { scope: "tenant", value: "999999" },
    ]);
    expect(v).toBe(3600);
  });

  it("detects a tenant override of a security-control key as drift", () => {
    const findings = detectConfigDrift(CONFIG_REGISTRY, [
      { key: "security.session.ttl-seconds", scope: "tenant" },
    ]);
    expect(findings.some((f) => f.kind === "tenant-override-of-security-control")).toBe(true);
  });

  it("detects an unknown config key as drift", () => {
    const findings = detectConfigDrift(CONFIG_REGISTRY, [{ key: "mystery.key", scope: "tenant" }]);
    expect(findings.some((f) => f.kind === "unknown-key")).toBe(true);
  });
});

describe("secret handling and non-leakage", () => {
  it("resolves a secret only for an authorised internal caller, audited without value", async () => {
    const { secrets, secretSvc, auditStore } = stack(["security-admin"]);
    await secrets.writeSecret({ tenantId: TENANT_A, name: "k", value: SECRET });
    const value = await secretSvc.resolve(ctx(TENANT_A), "k", "smtp");
    expect(value).toBe(SECRET);
    const events = await auditStore.query(ctx(TENANT_A), { tenantId: TENANT_A, limit: 100 });
    expect(events.events.some((e) => e.eventType === "secret.accessed")).toBe(true);
    expect(JSON.stringify(events.events)).not.toContain(SECRET);
  });

  it("denies secret resolution for an unauthorised role and records the denial", async () => {
    const { secrets, secretSvc, auditStore } = stack(["tenant-member"]);
    await secrets.writeSecret({ tenantId: TENANT_A, name: "k", value: SECRET });
    await expect(
      secretSvc.resolve(ctx(TENANT_A, "actor", ["tenant-member"]), "k", "smtp"),
    ).rejects.toBeInstanceOf(SecretAccessDeniedError);
    const events = await auditStore.query(ctx(TENANT_A), { tenantId: TENANT_A, limit: 100 });
    expect(events.events.some((e) => e.eventType === "secret.denied")).toBe(true);
  });

  it("fails closed on a revoked secret (no silent downgrade)", async () => {
    const { secrets, secretSvc } = stack(["security-admin"]);
    await secrets.writeSecret({
      tenantId: TENANT_A,
      name: "old",
      value: SECRET,
      status: "revoked",
    });
    await expect(secretSvc.resolve(ctx(TENANT_A), "old", "smtp")).rejects.toMatchObject({
      reasonCode: "secret-revoked",
    });
  });

  it("isolates secrets across tenants", async () => {
    const { secrets } = stack();
    await secrets.writeSecret({ tenantId: TENANT_A, name: "k", value: SECRET });
    expect(await secrets.describe({ tenantId: TENANT_B, name: "k" })).toBeUndefined();
    expect(await secrets.readSecret({ tenantId: TENANT_B, name: "k" })).toBeUndefined();
  });

  it("config list never returns a secret value and redacts secret-shaped/keyed entries", async () => {
    const { config, layerProvider } = stack(["security-admin"]);
    layerProvider.setLayer({
      key: "app.public-name",
      scope: "tenant",
      value: "Bearer redacted-example-fixture-token",
      tenantId: TENANT_A,
    });
    const listed = await config.list(ctx(TENANT_A));
    expect(listed["app.public-name"]).toBe(CONFIG_REDACTED);
    expect(listed["provider.mail.api-key-ref"]).toBe(CONFIG_REDACTED);
    expect(JSON.stringify(listed)).not.toContain("example-fixture-token");
  });

  it("redacts separator variants of secret-like keys", () => {
    expect(isSecretLikeKey("provider.mail.api-key-ref")).toBe(true);
    expect(isSecretLikeKey("API_KEY")).toBe(true);
    expect(isSecretLikeKey("clientSecret")).toBe(true);
    expect(isSecretLikeKey("public-name")).toBe(false);
    expect(redactConfigMap({ password: "x", ok: "y" })).toEqual({
      password: CONFIG_REDACTED,
      ok: "y",
    });
  });

  it("the committed OpenAPI document carries no secret values", async () => {
    const doc = JSON.stringify(
      await import("@foundation/openapi").then((m) => m.buildOpenApiDocument()),
    );
    for (const needle of ["password", "Bearer ", "secret://", "-----BEGIN"]) {
      expect(doc).not.toContain(needle);
    }
  });
});

describe("feature flags", () => {
  it("evaluates deterministically with a safe default for unknown/missing", () => {
    const def = {
      flagKey: "f",
      defaultValue: false,
      safeDefault: false,
      scope: "tenant" as const,
      owner: "p",
      expiresAt: null,
      securityControl: false,
    };
    expect(evaluateFeatureFlag(undefined, true)).toBe(false); // unknown flag → safe off
    expect(evaluateFeatureFlag(def, undefined)).toBe(false); // missing value → safe default
    expect(evaluateFeatureFlag(def, true)).toBe(true); // explicit value wins
  });

  it("evaluates and audits through the config service", async () => {
    const { config, flagSource, auditStore } = stack(["security-admin"]);
    flagSource.set({ tenantId: TENANT_A, flagKey: "experimental-config-editor", value: true });
    expect(await config.evaluateFlag(ctx(TENANT_A), "experimental-config-editor")).toBe(true);
    expect(await config.evaluateFlag(ctx(TENANT_A), "unknown-flag")).toBe(false);
    const events = await auditStore.query(ctx(TENANT_A), { tenantId: TENANT_A, limit: 100 });
    expect(events.events.some((e) => e.eventType === "feature_flag.evaluated")).toBe(true);
  });
});

describe("config change governance", () => {
  it("produces value-free change evidence (hashes, not raw values)", () => {
    const evidence = configChangeEvidence({
      key: "security.session.ttl-seconds",
      previousValue: "3600",
      newValue: SECRET,
      changeActor: "admin",
      changeReason: "test",
      changeSource: "runtime-override",
    });
    expect(JSON.stringify(evidence)).not.toContain(SECRET);
    expect(evidence.newValueHash).toMatch(/^[0-9a-f]{64}$/);
    expect(evidence.previousValueHash).not.toBe(evidence.newValueHash);
  });
});
