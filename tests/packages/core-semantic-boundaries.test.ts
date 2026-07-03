import {
  AUDIT_METADATA_MAX_KEYS,
  CONFIG_REDACTED,
  ProviderUnavailableError,
  REDACTED_VALUE,
  TelemetryValidationError,
  TenantMismatchError,
  assertBoundedBackoff,
  assertNonEmpty,
  assertProviderUsable,
  assertSafeObjectKey,
  assertTenantMatch,
  canonicalAuditEventHash,
  createAuditEventDraft,
  createFileMetadata,
  createTenantContext,
  findProvider,
  isDownloadable,
  isRetryable,
  nextBackoffSeconds,
  opaqueHash,
  overrideAllowed,
  providerStatusViews,
  redactAuditMetadata,
  redactConfigMap,
  redactTelemetryAttributes,
  resolveConfigValue,
  safeFailureMessage,
  toSafeFileView,
  toSafeProviderStatus,
  toSafeSessionView,
  validateMetricLabels,
  validateProviderRegistry,
  verifyAuditChain,
  type AuditEvent,
  type AuditEventDraft,
  type ConfigKeyDefinition,
  type CreateAuditEventInput,
  type Session,
} from "@foundation/core";
import { describe, expect, it } from "vitest";

function auditInput(overrides: Partial<CreateAuditEventInput> = {}): CreateAuditEventInput {
  return {
    eventId: "evt-unit",
    eventType: "authorization.decision",
    tenantId: "tenant-a",
    actorId: "actor-a",
    action: "tenant.members.read",
    outcome: "success",
    ...overrides,
  };
}

function recordedEvent(
  draft: AuditEventDraft,
  sequence: number,
  previousHash: string | null = null,
): AuditEvent {
  const recordedAt = `2026-01-01T00:00:0${sequence}.000Z`;
  const eventHash = canonicalAuditEventHash(draft, recordedAt, sequence, previousHash);
  return Object.freeze({
    ...draft,
    recordedAt,
    ingestedAt: recordedAt,
    chainScope: `tenant:${draft.tenantId}`,
    sequence,
    previousHash,
    eventHash,
    signature: null,
    chainKeyId: null,
    verificationStatus: "recorded" as const,
  });
}

function configDefinition(overrides: Partial<ConfigKeyDefinition> = {}): ConfigKeyDefinition {
  return Object.freeze({
    key: "unit.config",
    classification: "security-control",
    scope: "compiled-default",
    owner: "unit",
    type: "number",
    required: true,
    sensitive: false,
    securityControl: true,
    secretReferenceAllowed: false,
    overridePolicy: "environment-only",
    allowedEnvironments: ["local-dev"] as const,
    defaultValue: "5",
    enumValues: null,
    auditPolicy: "always",
    deprecated: false,
    schemaVersion: "config-1",
    ...overrides,
  });
}

describe("core tenant and audit semantic boundaries", () => {
  it("fails closed on empty tenant and audit fields", () => {
    expect(assertNonEmpty("  value  ", "field")).toBe("value");
    expect(() => assertNonEmpty("  ", "field")).toThrow(/field must be non-empty/);

    const context = createTenantContext({ tenantId: "tenant-a", actorId: "actor-a" });
    expect(() => assertTenantMatch(context, "tenant-b", "request")).toThrow(TenantMismatchError);
    expect(() => createAuditEventDraft(auditInput({ eventType: "not-catalogued" }))).toThrow(
      /no category/,
    );
    expect(() => createAuditEventDraft(auditInput({ category: "not-canonical" as never }))).toThrow(
      /category is not canonical/,
    );
    expect(() => createAuditEventDraft(auditInput({ severity: "not-canonical" as never }))).toThrow(
      /severity is not canonical/,
    );
    expect(() => createAuditEventDraft(auditInput({ outcome: "not-canonical" as never }))).toThrow(
      /outcome is not canonical/,
    );
  });

  it("redacts and bounds sensitive audit metadata", () => {
    const metadata: Record<string, unknown> = {
      clientSecret: "do-not-leak",
      ok: "kept",
      long: "x".repeat(1200),
    };
    for (let index = 0; index < AUDIT_METADATA_MAX_KEYS + 4; index += 1) {
      metadata[`k${index}`] = index;
    }

    const redacted = redactAuditMetadata(metadata);
    expect(redacted.clientSecret).toBe(REDACTED_VALUE);
    expect(redacted.ok).toBe("kept");
    expect(redacted.long).toContain("[truncated]");
    expect(Object.keys(redacted)).toHaveLength(AUDIT_METADATA_MAX_KEYS);
  });

  it("detects audit hash-chain tampering and reorder gaps", () => {
    const first = recordedEvent(createAuditEventDraft(auditInput({ eventId: "evt-1" })), 0);
    const second = recordedEvent(
      createAuditEventDraft(auditInput({ eventId: "evt-2" })),
      1,
      first.eventHash,
    );
    expect(verifyAuditChain([first, second], "tenant:tenant-a")).toMatchObject({ ok: true });

    const tampered = { ...second, action: "tenant.members.delete" };
    expect(verifyAuditChain([first, tampered], "tenant:tenant-a")).toMatchObject({
      ok: false,
      reason: "event content does not match its recorded hash (tamper detected)",
    });

    const gap = { ...second, sequence: 3 };
    expect(verifyAuditChain([first, gap], "tenant:tenant-a")).toMatchObject({
      ok: false,
      brokenAtSequence: 3,
    });
  });
});

describe("core config, provider, file, and session semantic boundaries", () => {
  it("validates config precedence, override policy, and redaction locally", () => {
    const securityControl = configDefinition();
    expect(resolveConfigValue(securityControl, [{ scope: "tenant", value: "999" }])).toBe(5);
    expect(overrideAllowed(securityControl, "tenant")).toBe(false);
    expect(overrideAllowed(securityControl, "environment")).toBe(true);
    expect(
      resolveConfigValue(
        configDefinition({
          type: "boolean",
          required: false,
          defaultValue: null,
          securityControl: false,
          overridePolicy: "tenant-allowed",
        }),
        [],
      ),
    ).toBe(false);
    expect(redactConfigMap({ apiKey: "plain", visible: "hello" })).toEqual({
      apiKey: CONFIG_REDACTED,
      visible: "hello",
    });
  });

  it("keeps safe provider and session views value-free", () => {
    expect(validateProviderRegistry().ok).toBe(true);
    const provider = findProvider("identity-keycloak-composed-test");
    expect(provider).toBeDefined();
    const safeProvider = toSafeProviderStatus(provider!);
    expect(safeProvider.endpointPosture).toBe("local-or-composed-reference");
    expect(JSON.stringify(safeProvider)).not.toContain("endpoint://");
    expect(JSON.stringify(providerStatusViews())).not.toContain("secret://");

    const overclaim = {
      ...provider!,
      liveReadinessClaim: true,
    };
    expect(validateProviderRegistry([overclaim]).findings).toContainEqual(
      expect.objectContaining({ ruleId: "test-provider-readiness-overclaim" }),
    );
    expect(() =>
      assertProviderUsable({ ...provider!, providerMode: "disabled" }, "unit-test"),
    ).toThrow(ProviderUnavailableError);

    const session: Session = {
      sessionId: "session-1",
      actorId: "actor-a",
      keycloakRealm: "internal",
      keycloakSubjectHash: opaqueHash("subject"),
      keycloakSessionIdHash: opaqueHash("kc-session"),
      selectedTenantId: "tenant-a",
      assuranceLevel: "loa1-password-or-brokered-basic",
      status: "active",
      riskLevel: "low",
      authenticationTime: "2026-01-01T00:00:00.000Z",
      lastActivityAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T01:00:00.000Z",
      idleExpiresAt: "2026-01-01T00:30:00.000Z",
      revokedAt: null,
      revocationReason: null,
    };
    const safeSession = toSafeSessionView(session);
    expect(safeSession).not.toHaveProperty("keycloakSubjectHash");
    expect(safeSession).not.toHaveProperty("keycloakRealm");
  });

  it("validates file metadata and least-disclosure file views", () => {
    const meta = createFileMetadata({
      fileId: "file-a",
      tenantId: "tenant-a",
      ownerActorId: "actor-a",
      salt: "unit-salt",
      filenameOriginal: "../Sensitive Report.pdf",
      contentType: "application/pdf",
      sizeBytes: 5,
      body: "%PDF%",
      classification: "regulated",
    });
    expect(meta.dataClassification).toBe("restricted");
    expect(meta.filenameSafe).toBe("Sensitive_Report.pdf");
    expect(() => assertSafeObjectKey(meta.objectKey)).not.toThrow();
    expect(isDownloadable({ status: "quarantined", scanStatus: "clean" })).toEqual({
      ok: false,
      reasonCode: "status-quarantined",
    });
    const safeView = toSafeFileView(meta);
    expect(safeView).not.toHaveProperty("objectKey");
    expect(safeView).not.toHaveProperty("filenameOriginal");
  });
});

describe("core execution and telemetry semantic boundaries", () => {
  it("validates bounded retry and safe failure output", () => {
    const policy = assertBoundedBackoff({
      strategy: "exponential",
      baseSeconds: 2,
      factor: 3,
      maxRetries: 4,
      maxBackoffSeconds: 20,
      jitter: false,
    });
    expect(nextBackoffSeconds(policy, 3)).toBe(18);
    expect(nextBackoffSeconds({ ...policy, jitter: true }, 2)).toBeLessThanOrEqual(6);
    expect(isRetryable("provider-timeout", 4, 4)).toBe(true);
    expect(isRetryable("provider-timeout", 5, 4)).toBe(false);
    expect(isRetryable("permanent-error", 1, 4)).toBe(false);
    expect(safeFailureMessage("failed Bearer secret-token-value")).not.toContain(
      "secret-token-value",
    );
  });

  it("redacts telemetry attributes and rejects unsafe metric labels", () => {
    expect(
      redactTelemetryAttributes({
        token: "secret",
        tenant_id: "tenant-a",
        route_id: "Bearer unsafe-token-value",
      }),
    ).toEqual({
      redacted_attribute_0: CONFIG_REDACTED,
      tenant_id: "tenant-a",
      route_id: `${CONFIG_REDACTED} ${CONFIG_REDACTED}`,
    });
    expect(() =>
      validateMetricLabels({ tenant_id: "tenant-a", route_id: "/health" }),
    ).not.toThrow();
    expect(() => validateMetricLabels({ email: "user@example.com" })).toThrow(
      TelemetryValidationError,
    );
    expect(() => validateMetricLabels({ tenant_id: "user@example.com" })).toThrow(
      TelemetryValidationError,
    );
  });
});
