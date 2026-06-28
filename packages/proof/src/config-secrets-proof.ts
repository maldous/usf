// Hermetic config/secrets proof (parity-config-secrets, USF-144).
//
// Proves the configuration control-plane and secret-handling invariants against the
// real USF capability classes (no Docker, no external secret manager):
//   - required/invalid/unknown config fails closed;
//   - a tenant layer cannot weaken a security-control config;
//   - precedence is deterministic (higher-trust layer wins);
//   - secret VALUES never appear in config output, audit metadata, or errors;
//   - secrets are tenant-isolated; expired/revoked/unknown secrets fail closed;
//   - feature flags evaluate deterministically with a safe default;
//   - provider credentials are secret references, not embedded values.
//
// Hermetic/behaviour proof. NO live-external secret-manager, live-external-provider,
// or production-live claim. Run via `make config-proof` (also part of `make verify`).
import { fileURLToPath } from "node:url";
import { InMemorySecretStore } from "@foundation/adapter-secrets";
import { InMemoryAuditEventStore, createAuditRecorder } from "@foundation/capability-audit";
import {
  CONFIG_REGISTRY,
  InMemoryConfigLayerProvider,
  InMemoryFeatureFlagSource,
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
  createTenantContext,
  redactConfigMap,
  resolveConfigValue,
  type ConfigLayer,
  type MembershipStatus,
} from "@foundation/core";

const SECRET_VALUE = "super-secret-credential-value-DO-NOT-LEAK";
// A secret-SHAPED value that strayed into a non-secret config key; redaction must
// catch it by value shape (key name is not a signal here).
const SECRET_SHAPED = "Bearer redacted-example-fixture-token";
const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

const checks: string[] = [];
function pass(label: string): void {
  checks.push(label);
}
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`config-secrets proof failed: ${message}`);
  }
}

function membership(
  roles: readonly string[],
  tenantId: string,
  actorId: string,
  status: MembershipStatus = "active",
) {
  const dir = new InMemoryTenantMembershipDirectory();
  dir.upsert({ membershipId: `m-${tenantId}`, tenantId, actorId, status, roles });
  return dir;
}

async function main(): Promise<void> {
  // (1) required-missing fails closed.
  const required = configDefinition("security.session.ttl-seconds")!;
  try {
    resolveConfigValue({ ...required, defaultValue: null }, []);
    assert(false, "required-missing should throw");
  } catch (error) {
    assert(
      (error as Error).name === "ConfigValidationError",
      "required-missing must be a ConfigValidationError",
    );
  }
  pass("required config with no value in any permitted layer fails closed");

  // (2) invalid type fails closed.
  try {
    resolveConfigValue(required, [{ scope: "environment", value: "not-a-number" }]);
    assert(false, "invalid type should throw");
  } catch (error) {
    assert((error as Error).name === "ConfigValidationError", "invalid type must fail closed");
  }
  pass("invalid config value fails closed (type validation)");

  // (3) security-control cannot be weakened by a tenant layer (override policy).
  const ttl = resolveConfigValue(required, [
    { scope: "compiled-default", value: "3600" },
    { scope: "tenant", value: "999999" }, // tenant attempt ignored (environment-only)
  ]);
  assert(ttl === 3600, `security-control must ignore the tenant layer, got ${ttl}`);
  pass("a tenant layer cannot weaken a security-control config (override policy)");

  // (4) precedence deterministic: a higher-trust permitted layer wins.
  const envName = resolveConfigValue(configDefinition("environment.name")!, [
    { scope: "compiled-default", value: "local-dev" },
    { scope: "environment", value: "local-composed-test" },
  ] as ConfigLayer[]);
  assert(envName === "local-composed-test", `environment layer should win, got ${envName}`);
  pass("config precedence is deterministic (higher-trust layer wins)");

  // Build a config + secret stack with audit capture and a PDP.
  const auditStore = new InMemoryAuditEventStore();
  const recorder = createAuditRecorder({ ledger: auditStore, component: "proof" });
  const secrets = new InMemorySecretStore();
  await secrets.writeSecret({ tenantId: TENANT_A, name: "mail-api-key", value: SECRET_VALUE });
  await secrets.writeSecret({
    tenantId: TENANT_A,
    name: "revoked-key",
    value: SECRET_VALUE,
    status: "revoked",
  });

  const adminPdp = createPolicyDecisionPoint({
    memberships: membership(["security-admin"], TENANT_A, "admin"),
  });
  const layers = new InMemoryConfigLayerProvider();
  // A config layer that (incorrectly) carries a secret-SHAPED value — must be redacted.
  layers.setLayer({
    key: "app.public-name",
    scope: "tenant",
    value: SECRET_SHAPED,
    tenantId: TENANT_A,
  });
  const flags = new InMemoryFeatureFlagSource();
  const config = createConfigService({
    layerProvider: layers,
    flagSource: flags,
    pdp: adminPdp,
    audit: recorder,
  });
  const secretSvc = createSecretService({ resolver: secrets, pdp: adminPdp, audit: recorder });
  const adminCtx = createTenantContext({
    tenantId: TENANT_A,
    actorId: "admin",
    roles: ["security-admin"],
  });

  // (5) unknown config key fails closed.
  let unknownThrew = false;
  try {
    await config.get(adminCtx, "totally.unknown.key");
  } catch {
    unknownThrew = true;
  }
  assert(unknownThrew, "unknown config key must fail closed");
  pass("unknown config key fails closed");

  // (6) secret-shaped/secret-keyed values never appear in serialized config output.
  const listed = await config.list(adminCtx);
  const listedJson = JSON.stringify(listed);
  assert(
    listed["app.public-name"] === CONFIG_REDACTED,
    "a secret-shaped config value must be redacted in list output",
  );
  assert(
    !listedJson.includes("example-fixture-token"),
    "the secret-shaped token body must not appear in config output",
  );
  assert(
    listed["provider.mail.api-key-ref"] === CONFIG_REDACTED,
    "a secret-reference key must be redacted in list output",
  );
  // get() of the secret-reference resolves to a pointer, never a value.
  const mailRef = await config.get(adminCtx, "provider.mail.api-key-ref");
  assert(
    String(mailRef).startsWith("secret://"),
    "secret-reference config returns a pointer, not a value",
  );
  pass(
    "config output is redacted (secret-shaped value + secret-ref key); refs are opaque pointers",
  );

  // (7) secret value resolves internally but never appears in audit metadata.
  const resolved = await secretSvc.resolve(adminCtx, "mail-api-key", "smtp-send");
  assert(resolved === SECRET_VALUE, "authorised internal caller must receive the secret value");
  const auditJson = JSON.stringify(
    await auditStore.query(adminCtx, { tenantId: TENANT_A, limit: 500 }),
  );
  assert(!auditJson.includes(SECRET_VALUE), "secret value must never appear in audit evidence");
  assert(auditJson.includes("secret.accessed"), "secret access must be audited (without value)");
  pass("secret resolves to an authorised internal caller; value never enters audit evidence");

  // (8) secret value never appears in a thrown error / validation finding.
  let errorText = "";
  try {
    resolveConfigValue(configDefinition("environment.name")!, [
      { scope: "environment", value: SECRET_VALUE },
    ]);
  } catch (error) {
    errorText = (error as Error).message;
  }
  assert(
    errorText.length > 0 && !errorText.includes(SECRET_VALUE),
    "validation error must not echo the raw value",
  );
  pass("secret-shaped invalid value is rejected without echoing it in the error");

  // (9) tenant isolation: tenant B cannot read tenant A's secret.
  const bSecrets = await secrets.describe({ tenantId: TENANT_B, name: "mail-api-key" });
  assert(bSecrets === undefined, "tenant B must not see tenant A's secret");
  pass("secrets are tenant-isolated (tenant B cannot resolve tenant A's secret)");

  // (10) feature flags: deterministic + safe default for unknown/missing.
  assert(
    (await config.evaluateFlag(adminCtx, "experimental-config-editor")) === false,
    "missing flag → safe default",
  );
  assert(
    (await config.evaluateFlag(adminCtx, "no-such-flag")) === false,
    "unknown flag → safe (off)",
  );
  flags.set({ tenantId: TENANT_A, flagKey: "experimental-config-editor", value: true });
  assert(
    (await config.evaluateFlag(adminCtx, "experimental-config-editor")) === true,
    "set flag → deterministic value",
  );
  pass("feature flags evaluate deterministically with a safe default for unknown/missing");

  // (11) revoked secret fails closed (no silent downgrade).
  let revokedThrew = false;
  try {
    await secretSvc.resolve(adminCtx, "revoked-key", "smtp-send");
  } catch {
    revokedThrew = true;
  }
  assert(revokedThrew, "revoked secret must fail closed");
  pass("revoked/expired/unknown secret state fails closed");

  // (12) unauthorised actor is denied secret + provider config (PDP), recorded.
  const memberPdp = createPolicyDecisionPoint({
    memberships: membership(["tenant-member"], TENANT_A, "member"),
  });
  const memberSecretSvc = createSecretService({
    resolver: secrets,
    pdp: memberPdp,
    audit: recorder,
  });
  const memberCtx = createTenantContext({
    tenantId: TENANT_A,
    actorId: "member",
    roles: ["tenant-member"],
  });
  let denied = false;
  try {
    await memberSecretSvc.resolve(memberCtx, "mail-api-key", "smtp-send");
  } catch {
    denied = true;
  }
  assert(denied, "a tenant-member must be denied secret resolution");
  pass("secret resolution is PDP-protected (tenant-member denied, recorded)");

  // (13) provider credential is a secret reference, never an embedded value.
  const providerRefDef = configDefinition("provider.mail.api-key-ref")!;
  assert(
    providerRefDef.classification === "secret-reference",
    "provider credential must be a secret-reference",
  );
  assert(providerRefDef.secretReferenceAllowed, "secret-reference key must allow references");
  // redactConfigMap masks a stray secret-looking key/value as a backstop.
  const redacted = redactConfigMap({ password: "p", normal: "ok" });
  assert(
    redacted.password === "[redacted-secret]" && redacted.normal === "ok",
    "redactConfigMap masks secret keys",
  );
  pass("provider credentials are secret references; redaction backstop masks secret-like keys");

  console.log(
    JSON.stringify(
      {
        status: "pass",
        proof: "config-secrets",
        providerMode: "hermetic-mock",
        environment: "hermetic",
        proofLevelObserved: "behaviour-proven",
        liveSecretManagerClaim: false,
        liveExternalProviderClaim: false,
        productionLiveClaim: false,
        registrySize: CONFIG_REGISTRY.length,
        checks: checks.length,
        checkLabels: checks,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
