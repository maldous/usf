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

export type LocalCommandFormMapping = {
  formId: string;
  componentFixtureRef: string;
  commandRef: string;
  capabilityId: string;
  permissionRefs: string[];
  tenantBoundaryRef: string;
  validationRefs: string[];
  errorRefs: string[];
  auditEventRefs: string[];
  idempotencyBoundaryRef: string;
  semanticSourceRefs: string[];
  proofRefs: string[];
  uiOnlyBusinessRulesAllowed: false;
  rejectedUiOnlyBusinessRuleInputs: string[];
  nonClaimBoundary: string;
};

export type LocalCommandFormRegistry = {
  artifactId: string;
  ownerIssueId: string;
  providerMode: LocalAppSurfaceProviderMode;
  environment: LocalAppSurfaceEnvironment;
  commands: LocalCommandFormMapping[];
  unknownCommandFormPolicy: "fail-closed";
  externalSubmissionAllowed: false;
  serverMutationProviderAllowed: false;
  nonClaims: Record<string, boolean>;
};

export type LocalCommandFormSemanticAuthority = {
  commandRefs: ReadonlySet<string>;
  capabilityIds: ReadonlySet<string>;
  permissionIds: ReadonlySet<string>;
  tenantBoundaryIds: ReadonlySet<string>;
  validationIds: ReadonlySet<string>;
  errorIds: ReadonlySet<string>;
  auditEventIds: ReadonlySet<string>;
  componentFixtureIds: ReadonlySet<string>;
  idempotencyBoundaryRefs: ReadonlySet<string>;
  semanticSourceRefs: ReadonlySet<string>;
  proofRefs: ReadonlySet<string>;
};

export type LocalCommandFormValidationResult = {
  ok: boolean;
  findings: string[];
};

export type LocalCommandFormExerciseOutcome = {
  formId: string;
  commandRef: string;
  capabilityId: string;
  tenantBoundaryRef: string;
  permissionRefsChecked: string[];
  validationRefsChecked: string[];
  errorRefsAvailable: string[];
  auditEventRefsEmitted: string[];
  idempotencyBoundaryRef: string;
  providerMode: LocalAppSurfaceProviderMode;
  externalSubmissionUsed: false;
  serverMutationProviderUsed: false;
  uiOnlyBusinessRulesUsed: false;
  stagingUsed: false;
  deploymentUsed: false;
};

const REQUIRED_COMMAND_FORM_STRING_FIELDS = [
  "formId",
  "componentFixtureRef",
  "commandRef",
  "capabilityId",
  "tenantBoundaryRef",
  "idempotencyBoundaryRef",
  "nonClaimBoundary",
] as const;

const REQUIRED_COMMAND_FORM_ARRAY_FIELDS = [
  "permissionRefs",
  "validationRefs",
  "errorRefs",
  "auditEventRefs",
  "semanticSourceRefs",
  "proofRefs",
  "rejectedUiOnlyBusinessRuleInputs",
] as const;

const REQUIRED_COMMAND_FORM_NON_CLAIMS = [
  "commandExecutionReadiness",
  "productionCommandReadiness",
  "providerReadiness",
  "deploymentReadiness",
  "stagingReadiness",
  "productionReadiness",
  "liveProviderReadiness",
  "complianceReadiness",
  "humanAcceptance",
] as const;

export const LOCAL_COMMAND_FORM_REGISTRY = {
  artifactId: "usf.app-surface-command-form-registry",
  ownerIssueId: "USF-1021",
  providerMode: "in-memory-only",
  environment: "dev-local",
  unknownCommandFormPolicy: "fail-closed",
  externalSubmissionAllowed: false,
  serverMutationProviderAllowed: false,
  commands: [
    {
      formId: "command-form-api-key-onboarding",
      componentFixtureRef: "component-fixture-api-key-onboarding",
      commandRef: "command.onboardApiKey",
      capabilityId: "graphql-federation-generated-client-disposition",
      permissionRefs: ["developer:key:onboard"],
      tenantBoundaryRef: "tenant.dev-local-fixture",
      validationRefs: [
        "docs/architecture/generated-client-contract-validation-semantics.json#validationSchemaGeneration",
        "typed-error-problem-details-model",
      ],
      errorRefs: ["typed-error-problem-details-model", "safe-denial:invalid-label"],
      auditEventRefs: ["client-audit-event-emission", "graphql.onboardApiKey"],
      idempotencyBoundaryRef: "idempotency-boundary-required-for-command",
      semanticSourceRefs: [
        "docs/architecture/app-surface-local-in-memory-runtime.json",
        "docs/architecture/app-surface-shared-client-consumption-path.json",
        "docs/architecture/shared-client-interaction-contract-semantics.json",
        "tools/validate-app-surface/fixtures/conforming/003-command-form-with-validation-audit.json",
      ],
      proofRefs: [
        "tests/packages/app-surface-command-form-implementation.test.ts",
        "tools/validate-app-surface/validate-app-surface.py",
      ],
      uiOnlyBusinessRulesAllowed: false,
      rejectedUiOnlyBusinessRuleInputs: [
        "ui-only-required-field",
        "presentation-only-permission-check",
        "client-only-business-state-transition",
      ],
      nonClaimBoundary: "local command form mapping only; no server mutation provider, external form submission, production command execution, deployment, staging, live-provider, compliance, or human-acceptance readiness claim",
    },
  ],
  nonClaims: {
    commandExecutionReadiness: false,
    productionCommandReadiness: false,
    providerReadiness: false,
    deploymentReadiness: false,
    stagingReadiness: false,
    productionReadiness: false,
    liveProviderReadiness: false,
    complianceReadiness: false,
    humanAcceptance: false,
  },
} as const satisfies LocalCommandFormRegistry;

function validateCommandFormNonClaims(nonClaims: unknown): string[] {
  if (!isRecord(nonClaims)) {
    return ["command-form-registry:missing-non-claims"];
  }
  const findings: string[] = [];
  for (const claim of REQUIRED_COMMAND_FORM_NON_CLAIMS) {
    if (!(claim in nonClaims)) {
      findings.push(`command-form-registry:missing-non-claim:${claim}`);
    } else if (nonClaims[claim] !== false) {
      findings.push(`command-form-registry:overclaimed:${claim}`);
    }
  }
  for (const [claim, value] of Object.entries(nonClaims)) {
    if (value !== false) {
      findings.push(`command-form-registry:overclaimed:${claim}`);
    }
  }
  return findings;
}

function validateCommandFormArrayAuthority(
  findings: string[],
  formId: string,
  refs: unknown,
  authorityIds: ReadonlySet<string>,
  findingPrefix: string,
): void {
  const values = hasNonEmptyStringArray(refs) ? refs : [];
  for (const ref of values) {
    if (!authorityIds.has(ref)) {
      findings.push(`${formId}:${findingPrefix}:${ref}`);
    }
  }
}

function validateCommandFormStringAuthority(
  findings: string[],
  formId: string,
  ref: unknown,
  authorityIds: ReadonlySet<string>,
  findingPrefix: string,
): void {
  if (!isNonEmptyString(ref) || !authorityIds.has(ref)) {
    findings.push(`${formId}:${findingPrefix}:${isNonEmptyString(ref) ? ref : "missing"}`);
  }
}

function commandFormArraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function commandFormMatchesRegistry(
  registered: (typeof LOCAL_COMMAND_FORM_REGISTRY.commands)[number],
  candidate: LocalCommandFormMapping,
): boolean {
  for (const field of REQUIRED_COMMAND_FORM_STRING_FIELDS) {
    if (registered[field] !== candidate[field]) {
      return false;
    }
  }
  for (const field of REQUIRED_COMMAND_FORM_ARRAY_FIELDS) {
    if (!commandFormArraysEqual(registered[field], candidate[field])) {
      return false;
    }
  }
  return registered.uiOnlyBusinessRulesAllowed === candidate.uiOnlyBusinessRulesAllowed;
}

function validateCommandForm(
  commandForm: LocalCommandFormMapping | unknown,
  index: number,
  semanticAuthority?: LocalCommandFormSemanticAuthority,
): string[] {
  if (!isRecord(commandForm)) {
    return [`command-form-${index}:missing`];
  }
  const formId = isNonEmptyString(commandForm.formId) ? commandForm.formId : `command-form-${index}`;
  const findings: string[] = [];
  for (const field of REQUIRED_COMMAND_FORM_STRING_FIELDS) {
    if (!isNonEmptyString(commandForm[field])) {
      findings.push(`${formId}:missing-${field}`);
    }
  }
  for (const field of REQUIRED_COMMAND_FORM_ARRAY_FIELDS) {
    if (!hasNonEmptyStringArray(commandForm[field])) {
      findings.push(`${formId}:missing-${field}`);
    }
  }
  if (commandForm.uiOnlyBusinessRulesAllowed !== false) {
    findings.push(`${formId}:ui-only-business-rules-not-authorised`);
  }
  for (const key of FORBIDDEN_EXTERNAL_KEYS) {
    if (key in commandForm) {
      findings.push(`${formId}:${key}-not-authorised`);
    }
  }
  if (semanticAuthority) {
    validateCommandFormStringAuthority(findings, formId, commandForm.commandRef, semanticAuthority.commandRefs, "command-authority-missing");
    validateCommandFormStringAuthority(findings, formId, commandForm.capabilityId, semanticAuthority.capabilityIds, "capability-authority-missing");
    validateCommandFormStringAuthority(findings, formId, commandForm.tenantBoundaryRef, semanticAuthority.tenantBoundaryIds, "tenant-authority-missing");
    validateCommandFormStringAuthority(findings, formId, commandForm.componentFixtureRef, semanticAuthority.componentFixtureIds, "component-fixture-authority-missing");
    validateCommandFormStringAuthority(findings, formId, commandForm.idempotencyBoundaryRef, semanticAuthority.idempotencyBoundaryRefs, "idempotency-authority-missing");
    validateCommandFormArrayAuthority(findings, formId, commandForm.permissionRefs, semanticAuthority.permissionIds, "permission-authority-missing");
    validateCommandFormArrayAuthority(findings, formId, commandForm.validationRefs, semanticAuthority.validationIds, "validation-authority-missing");
    validateCommandFormArrayAuthority(findings, formId, commandForm.errorRefs, semanticAuthority.errorIds, "error-authority-missing");
    validateCommandFormArrayAuthority(findings, formId, commandForm.auditEventRefs, semanticAuthority.auditEventIds, "audit-authority-missing");
    validateCommandFormArrayAuthority(findings, formId, commandForm.semanticSourceRefs, semanticAuthority.semanticSourceRefs, "semantic-source-authority-missing");
    validateCommandFormArrayAuthority(findings, formId, commandForm.proofRefs, semanticAuthority.proofRefs, "proof-authority-missing");
  }
  return findings;
}

export function validateLocalCommandFormRegistry(
  registry: LocalCommandFormRegistry | unknown,
  semanticAuthority?: LocalCommandFormSemanticAuthority,
): LocalCommandFormValidationResult {
  if (!isRecord(registry)) {
    return { ok: false, findings: ["command-form-registry:missing"] };
  }
  const findings: string[] = [];
  if (registry.ownerIssueId !== "USF-1021") {
    findings.push("command-form-registry:unexpected-owner-issue");
  }
  if (registry.providerMode !== "in-memory-only") {
    findings.push("command-form-registry:provider-mode-must-be-in-memory-only");
  }
  if (registry.environment !== "dev-local") {
    findings.push("command-form-registry:environment-must-be-dev-local");
  }
  if (registry.unknownCommandFormPolicy !== "fail-closed") {
    findings.push("command-form-registry:unknown-command-form-policy-must-fail-closed");
  }
  if (registry.externalSubmissionAllowed !== false) {
    findings.push("command-form-registry:external-submission-not-authorised");
  }
  if (registry.serverMutationProviderAllowed !== false) {
    findings.push("command-form-registry:server-mutation-provider-not-authorised");
  }
  if (!Array.isArray(registry.commands) || registry.commands.length === 0) {
    findings.push("command-form-registry:missing-commands");
  } else {
    const seenFormIds = new Set<string>();
    registry.commands.forEach((commandForm, index) => {
      findings.push(...validateCommandForm(commandForm, index, semanticAuthority));
      if (isRecord(commandForm) && isNonEmptyString(commandForm.formId)) {
        if (seenFormIds.has(commandForm.formId)) {
          findings.push(`${commandForm.formId}:duplicate-form-id`);
        }
        seenFormIds.add(commandForm.formId);
      }
    });
  }
  findings.push(...validateCommandFormNonClaims(registry.nonClaims));
  return { ok: findings.length === 0, findings };
}

export function getLocalCommandFormById(formId: string): LocalCommandFormMapping {
  const commandForm = LOCAL_COMMAND_FORM_REGISTRY.commands.find((candidate) => candidate.formId === formId);
  if (!commandForm) {
    throw new Error(`command-form-unknown:${formId}`);
  }
  return commandForm;
}

export function exerciseLocalCommandForm(
  commandForm: LocalCommandFormMapping,
  semanticAuthority?: LocalCommandFormSemanticAuthority,
): LocalCommandFormExerciseOutcome {
  const registered = LOCAL_COMMAND_FORM_REGISTRY.commands.find((candidate) => candidate.formId === commandForm.formId);
  if (!registered) {
    throw new Error(`command-form-unregistered:${commandForm.formId}`);
  }
  if (!commandFormMatchesRegistry(registered, commandForm)) {
    throw new Error(`command-form-registry-mismatch:${commandForm.formId}`);
  }
  const validation = validateCommandForm(commandForm, 0, semanticAuthority);
  if (validation.length > 0) {
    throw new Error(`command-form-invalid:${validation.join(",")}`);
  }
  return {
    formId: commandForm.formId,
    commandRef: commandForm.commandRef,
    capabilityId: commandForm.capabilityId,
    tenantBoundaryRef: commandForm.tenantBoundaryRef,
    permissionRefsChecked: [...commandForm.permissionRefs],
    validationRefsChecked: [...commandForm.validationRefs],
    errorRefsAvailable: [...commandForm.errorRefs],
    auditEventRefsEmitted: [...commandForm.auditEventRefs],
    idempotencyBoundaryRef: commandForm.idempotencyBoundaryRef,
    providerMode: "in-memory-only",
    externalSubmissionUsed: false,
    serverMutationProviderUsed: false,
    uiOnlyBusinessRulesUsed: false,
    stagingUsed: false,
    deploymentUsed: false,
  };
}
