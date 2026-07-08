export type LocalAppSurfaceProviderMode = "in-memory-only";
export type LocalAppSurfaceEnvironment = "dev-local";
export type LocalAppSurfaceFixtureOutcomeStatus = "exercised-local-in-memory";

export type LocalAppSurfaceSemanticRef = {
  id: string;
  sourceRef: string;
};

export type LocalAppSurfaceTenantContext = LocalAppSurfaceSemanticRef & {
  userRef: string;
};

export type LocalAppSurfaceSemanticInputs = {
  capabilities: LocalAppSurfaceSemanticRef[];
  permissions: LocalAppSurfaceSemanticRef[];
  commands: LocalAppSurfaceSemanticRef[];
  queries: LocalAppSurfaceSemanticRef[];
  validationRules: LocalAppSurfaceSemanticRef[];
  errorRefs: LocalAppSurfaceSemanticRef[];
  auditEvents: LocalAppSurfaceSemanticRef[];
  tenantContexts: LocalAppSurfaceTenantContext[];
};

export type LocalAppSurfaceInMemoryAdapterBoundary = {
  inMemoryAdapter: true;
  externalProviderAllowed: false;
  credentialsAllowed: false;
  networkAllowed: false;
  deploymentAllowed: false;
  stagingAllowed: false;
  liveIdentityProviderAllowed: false;
};

export type LocalAppSurfaceComponentFixture = {
  fixtureId: string;
  componentSurfaceId: string;
  capabilityId: string;
  tenantContextId: string;
  requiredPermissionRefs: string[];
  commandRefs: string[];
  queryRefs: string[];
  validationRefs: string[];
  errorRefs: string[];
  auditEventRefs: string[];
  expectedOutcome: LocalAppSurfaceFixtureOutcomeStatus;
};

export type LocalAppSurfaceRuntimeDefinition = {
  artifactId: string;
  ownerIssueId: string;
  providerMode: LocalAppSurfaceProviderMode;
  environment: LocalAppSurfaceEnvironment;
  semanticInputs: LocalAppSurfaceSemanticInputs;
  componentFixtures: LocalAppSurfaceComponentFixture[];
  adapterBoundary: LocalAppSurfaceInMemoryAdapterBoundary;
  nonClaims: Record<string, boolean>;
};

export type LocalAppSurfaceRuntimeFinding = string;

export type LocalAppSurfaceRuntimeValidationResult = {
  ok: boolean;
  findings: LocalAppSurfaceRuntimeFinding[];
};

export type LocalAppSurfaceFixtureOutcome = {
  fixtureId: string;
  componentSurfaceId: string;
  status: LocalAppSurfaceFixtureOutcomeStatus;
  providerMode: LocalAppSurfaceProviderMode;
  tenantContextId: string;
  capabilityId: string;
  permissionRefsChecked: string[];
  commandRefsChecked: string[];
  queryRefsChecked: string[];
  validationRefsChecked: string[];
  auditEventRefsEmitted: string[];
  externalProviderUsed: false;
  credentialsUsed: false;
  stagingUsed: false;
  deploymentUsed: false;
};

const REQUIRED_SEMANTIC_COLLECTIONS = [
  "capabilities",
  "permissions",
  "commands",
  "queries",
  "validationRules",
  "errorRefs",
  "auditEvents",
  "tenantContexts",
] as const;

const REQUIRED_ADAPTER_FALSE_FLAGS = [
  "externalProviderAllowed",
  "credentialsAllowed",
  "networkAllowed",
  "deploymentAllowed",
  "stagingAllowed",
  "liveIdentityProviderAllowed",
] as const;

const REQUIRED_NON_CLAIMS = [
  "productUiReadiness",
  "webReadiness",
  "mobileReadiness",
  "deploymentReadiness",
  "stagingReadiness",
  "productionReadiness",
  "liveProviderReadiness",
  "complianceReadiness",
  "monetisationReadiness",
  "humanAcceptance",
] as const;

const FORBIDDEN_EXTERNAL_KEYS = [
  "providerEndpoint",
  "providerUrl",
  "credential",
  "credentials",
  "apiKey",
  "oauthClientId",
  "oidcIssuer",
  "deploymentTarget",
  "stagingTarget",
  "productionTarget",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

function validateSemanticRef(value: unknown, subject: string): string[] {
  if (!isRecord(value)) {
    return [`${subject}:missing`];
  }
  const findings: string[] = [];
  if (!isNonEmptyString(value.id)) {
    findings.push(`${subject}:missing-id`);
  }
  if (!isNonEmptyString(value.sourceRef)) {
    findings.push(`${subject}:missing-sourceRef`);
  }
  return findings;
}

function collectIds(values: unknown): Set<string> {
  if (!Array.isArray(values)) {
    return new Set();
  }
  return new Set(values.filter(isRecord).map((value) => value.id).filter(isNonEmptyString));
}

function validateSemanticInputs(value: unknown): string[] {
  if (!isRecord(value)) {
    return ["semantic-inputs:missing"];
  }
  const findings: string[] = [];
  for (const collection of REQUIRED_SEMANTIC_COLLECTIONS) {
    const entries = value[collection];
    if (!Array.isArray(entries) || entries.length === 0) {
      findings.push(`semantic-inputs:${collection}-missing`);
      continue;
    }
    entries.forEach((entry, index) => {
      findings.push(...validateSemanticRef(entry, `semantic-inputs:${collection}-${index}`));
      if (collection === "tenantContexts" && isRecord(entry) && !isNonEmptyString(entry.userRef)) {
        findings.push(`semantic-inputs:${collection}-${index}:missing-userRef`);
      }
    });
  }
  return findings;
}

function validateAdapterBoundary(value: unknown): string[] {
  if (!isRecord(value)) {
    return ["adapter-boundary:missing"];
  }
  const findings: string[] = [];
  if (value.inMemoryAdapter !== true) {
    findings.push("adapter-boundary:in-memory-adapter-required");
  }
  for (const flag of REQUIRED_ADAPTER_FALSE_FLAGS) {
    if (value[flag] !== false) {
      findings.push(`adapter-boundary:${flag}-must-be-false`);
    }
  }
  for (const key of FORBIDDEN_EXTERNAL_KEYS) {
    if (key in value) {
      findings.push(`adapter-boundary:${key}-not-authorised`);
    }
  }
  return findings;
}

function validateNonClaims(nonClaims: unknown): string[] {
  if (!isRecord(nonClaims)) {
    return ["non-claims:missing"];
  }
  const findings: string[] = [];
  for (const claim of REQUIRED_NON_CLAIMS) {
    if (!(claim in nonClaims)) {
      findings.push(`non-claims:${claim}-missing`);
    } else if (nonClaims[claim] !== false) {
      findings.push(`non-claims:${claim}-overclaimed`);
    }
  }
  for (const [claim, value] of Object.entries(nonClaims)) {
    if (!REQUIRED_NON_CLAIMS.includes(claim as (typeof REQUIRED_NON_CLAIMS)[number]) && value !== false) {
      findings.push(`non-claims:${claim}-overclaimed`);
    }
  }
  return findings;
}

function validateFixtureReferences(
  fixture: Record<string, unknown>,
  fixtureId: string,
  semanticInputs: LocalAppSurfaceSemanticInputs,
): string[] {
  const findings: string[] = [];
  const capabilityIds = collectIds(semanticInputs.capabilities);
  const permissionIds = collectIds(semanticInputs.permissions);
  const commandIds = collectIds(semanticInputs.commands);
  const queryIds = collectIds(semanticInputs.queries);
  const validationIds = collectIds(semanticInputs.validationRules);
  const errorIds = collectIds(semanticInputs.errorRefs);
  const auditIds = collectIds(semanticInputs.auditEvents);
  const tenantIds = collectIds(semanticInputs.tenantContexts);

  if (isNonEmptyString(fixture.capabilityId) && !capabilityIds.has(fixture.capabilityId)) {
    findings.push(`${fixtureId}:unknown-capability`);
  }
  if (isNonEmptyString(fixture.tenantContextId) && !tenantIds.has(fixture.tenantContextId)) {
    findings.push(`${fixtureId}:unknown-tenant-context`);
  }
  for (const permission of Array.isArray(fixture.requiredPermissionRefs) ? fixture.requiredPermissionRefs : []) {
    if (!permissionIds.has(permission)) {
      findings.push(`${fixtureId}:unknown-permission:${permission}`);
    }
  }
  for (const command of Array.isArray(fixture.commandRefs) ? fixture.commandRefs : []) {
    if (!commandIds.has(command)) {
      findings.push(`${fixtureId}:unknown-command:${command}`);
    }
  }
  for (const query of Array.isArray(fixture.queryRefs) ? fixture.queryRefs : []) {
    if (!queryIds.has(query)) {
      findings.push(`${fixtureId}:unknown-query:${query}`);
    }
  }
  for (const validation of Array.isArray(fixture.validationRefs) ? fixture.validationRefs : []) {
    if (!validationIds.has(validation)) {
      findings.push(`${fixtureId}:unknown-validation:${validation}`);
    }
  }
  for (const errorRef of Array.isArray(fixture.errorRefs) ? fixture.errorRefs : []) {
    if (!errorIds.has(errorRef)) {
      findings.push(`${fixtureId}:unknown-error:${errorRef}`);
    }
  }
  for (const auditEvent of Array.isArray(fixture.auditEventRefs) ? fixture.auditEventRefs : []) {
    if (!auditIds.has(auditEvent)) {
      findings.push(`${fixtureId}:unknown-audit-event:${auditEvent}`);
    }
  }
  return findings;
}

function validateComponentFixture(
  fixture: LocalAppSurfaceComponentFixture | unknown,
  index: number,
  semanticInputs: LocalAppSurfaceSemanticInputs,
): string[] {
  if (!isRecord(fixture)) {
    return [`component-fixture-${index}:missing`];
  }
  const findings: string[] = [];
  const fixtureId = isNonEmptyString(fixture.fixtureId) ? fixture.fixtureId : `component-fixture-${index}`;
  for (const field of ["componentSurfaceId", "capabilityId", "tenantContextId"] as const) {
    if (!isNonEmptyString(fixture[field])) {
      findings.push(`${fixtureId}:missing-${field}`);
    }
  }
  for (const field of [
    "requiredPermissionRefs",
    "validationRefs",
    "errorRefs",
    "auditEventRefs",
  ] as const) {
    if (!hasNonEmptyStringArray(fixture[field])) {
      findings.push(`${fixtureId}:missing-${field}`);
    }
  }
  if (!Array.isArray(fixture.commandRefs)) {
    findings.push(`${fixtureId}:missing-commandRefs`);
  }
  if (!Array.isArray(fixture.queryRefs)) {
    findings.push(`${fixtureId}:missing-queryRefs`);
  }
  const commandCount = Array.isArray(fixture.commandRefs) ? fixture.commandRefs.length : 0;
  const queryCount = Array.isArray(fixture.queryRefs) ? fixture.queryRefs.length : 0;
  if (commandCount === 0 && queryCount === 0) {
    findings.push(`${fixtureId}:missing-command-or-query-ref`);
  }
  if (fixture.expectedOutcome !== "exercised-local-in-memory") {
    findings.push(`${fixtureId}:unexpected-outcome`);
  }
  findings.push(...validateFixtureReferences(fixture, fixtureId, semanticInputs));
  for (const key of FORBIDDEN_EXTERNAL_KEYS) {
    if (key in fixture) {
      findings.push(`${fixtureId}:${key}-not-authorised`);
    }
  }
  return findings;
}

export function validateLocalInMemoryAppSurfaceRuntime(
  definition: LocalAppSurfaceRuntimeDefinition,
): LocalAppSurfaceRuntimeValidationResult {
  if (!isRecord(definition)) {
    return { ok: false, findings: ["local-runtime:missing"] };
  }
  const findings: string[] = [];
  if (definition.ownerIssueId !== "USF-1016") {
    findings.push("local-runtime:unexpected-owner-issue");
  }
  if (definition.providerMode !== "in-memory-only") {
    findings.push("local-runtime:provider-mode-must-be-in-memory-only");
  }
  if (definition.environment !== "dev-local") {
    findings.push("local-runtime:environment-must-be-dev-local");
  }
  findings.push(...validateSemanticInputs(definition.semanticInputs));
  if (!Array.isArray(definition.componentFixtures) || definition.componentFixtures.length === 0) {
    findings.push("component-fixtures:missing");
  } else if (isRecord(definition.semanticInputs)) {
    definition.componentFixtures.forEach((fixture, index) => {
      findings.push(...validateComponentFixture(fixture, index, definition.semanticInputs));
    });
  }
  findings.push(...validateAdapterBoundary(definition.adapterBoundary));
  findings.push(...validateNonClaims(definition.nonClaims));
  return { ok: findings.length === 0, findings };
}

export function exerciseLocalInMemoryAppSurfaceRuntime(
  definition: LocalAppSurfaceRuntimeDefinition,
): LocalAppSurfaceFixtureOutcome[] {
  const validation = validateLocalInMemoryAppSurfaceRuntime(definition);
  if (!validation.ok) {
    throw new Error(`local-in-memory-app-surface-runtime-invalid:${validation.findings.join(",")}`);
  }
  return definition.componentFixtures.map((fixture) => ({
    fixtureId: fixture.fixtureId,
    componentSurfaceId: fixture.componentSurfaceId,
    status: "exercised-local-in-memory",
    providerMode: definition.providerMode,
    tenantContextId: fixture.tenantContextId,
    capabilityId: fixture.capabilityId,
    permissionRefsChecked: [...fixture.requiredPermissionRefs],
    commandRefsChecked: [...fixture.commandRefs],
    queryRefsChecked: [...fixture.queryRefs],
    validationRefsChecked: [...fixture.validationRefs],
    auditEventRefsEmitted: [...fixture.auditEventRefs],
    externalProviderUsed: false,
    credentialsUsed: false,
    stagingUsed: false,
    deploymentUsed: false,
  }));
}

export function assertLocalInMemoryAppSurfaceRuntime(definition: LocalAppSurfaceRuntimeDefinition): void {
  const validation = validateLocalInMemoryAppSurfaceRuntime(definition);
  if (!validation.ok) {
    throw new Error(`local-in-memory-app-surface-runtime-invalid:${validation.findings.join(",")}`);
  }
}
