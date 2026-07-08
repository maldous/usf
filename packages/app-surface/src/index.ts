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

export type LocalQueryViewKind = "list" | "detail";

export type LocalQueryListDetailMapping = {
  viewId: string;
  viewKind: LocalQueryViewKind;
  componentFixtureRef: string;
  queryRef: string;
  capabilityId: string;
  permissionRefs: string[];
  tenantBoundaryRef: string;
  cacheFreshnessRef: string;
  cachePolicyRefs: string[];
  privacyClassificationRefs: string[];
  errorRefs: string[];
  auditEventRefs: string[];
  i18nKeyRefs: string[];
  accessibilityRefs: string[];
  telemetryRefs: string[];
  semanticSourceRefs: string[];
  proofRefs: string[];
  resultItemShapeRef?: string;
  recordIdentityRef?: string;
  emptyStateRef?: string;
  notFoundStateRef?: string;
  errorStateRef: string;
  nonClaimBoundary: string;
};

export type LocalQueryListDetailRegistry = {
  artifactId: string;
  ownerIssueId: string;
  providerMode: LocalAppSurfaceProviderMode;
  environment: LocalAppSurfaceEnvironment;
  queryViews: LocalQueryListDetailMapping[];
  unknownQueryViewPolicy: "fail-closed";
  serverStateProviderAllowed: false;
  persistentSensitiveStorageAllowed: false;
  realtimeSubscriptionAllowed: false;
  backgroundRefreshAllowed: false;
  nonClaims: Record<string, boolean>;
};

export type LocalQueryListDetailSemanticAuthority = {
  queryRefs: ReadonlySet<string>;
  capabilityIds: ReadonlySet<string>;
  permissionIds: ReadonlySet<string>;
  tenantBoundaryIds: ReadonlySet<string>;
  cacheFreshnessRefs: ReadonlySet<string>;
  cachePolicyRefs: ReadonlySet<string>;
  privacyClassificationRefs: ReadonlySet<string>;
  errorIds: ReadonlySet<string>;
  auditEventIds: ReadonlySet<string>;
  componentFixtureIds: ReadonlySet<string>;
  i18nKeyRefs: ReadonlySet<string>;
  accessibilityRefs: ReadonlySet<string>;
  telemetryRefs: ReadonlySet<string>;
  semanticSourceRefs: ReadonlySet<string>;
  proofRefs: ReadonlySet<string>;
};

export type LocalQueryListDetailValidationResult = {
  ok: boolean;
  findings: string[];
};

export type LocalQueryListDetailExerciseOutcome = {
  viewId: string;
  viewKind: LocalQueryViewKind;
  queryRef: string;
  capabilityId: string;
  tenantBoundaryRef: string;
  permissionRefsChecked: string[];
  cacheFreshnessRefChecked: string;
  cachePolicyRefsChecked: string[];
  privacyClassificationRefsChecked: string[];
  errorRefsAvailable: string[];
  auditEventRefsEmitted: string[];
  i18nKeyRefsChecked: string[];
  accessibilityRefsChecked: string[];
  telemetryRefsChecked: string[];
  providerMode: LocalAppSurfaceProviderMode;
  serverStateProviderUsed: false;
  persistentSensitiveStorageUsed: false;
  realtimeSubscriptionUsed: false;
  backgroundRefreshUsed: false;
  stagingUsed: false;
  deploymentUsed: false;
};

const REQUIRED_QUERY_VIEW_STRING_FIELDS = [
  "viewId",
  "viewKind",
  "componentFixtureRef",
  "queryRef",
  "capabilityId",
  "tenantBoundaryRef",
  "cacheFreshnessRef",
  "errorStateRef",
  "nonClaimBoundary",
] as const;

const REQUIRED_QUERY_VIEW_ARRAY_FIELDS = [
  "permissionRefs",
  "cachePolicyRefs",
  "privacyClassificationRefs",
  "errorRefs",
  "auditEventRefs",
  "i18nKeyRefs",
  "accessibilityRefs",
  "telemetryRefs",
  "semanticSourceRefs",
  "proofRefs",
] as const;

const REQUIRED_QUERY_VIEW_NON_CLAIMS = [
  "cacheReadiness",
  "syncReadiness",
  "queryLibraryReadiness",
  "serverStateProviderReadiness",
  "persistentStorageReadiness",
  "providerReadiness",
  "deploymentReadiness",
  "stagingReadiness",
  "productionReadiness",
  "liveProviderReadiness",
  "privacyCompliance",
  "humanAcceptance",
] as const;

export const LOCAL_QUERY_LIST_DETAIL_REGISTRY = {
  artifactId: "usf.app-surface-query-list-detail-registry",
  ownerIssueId: "USF-1022",
  providerMode: "in-memory-only",
  environment: "dev-local",
  unknownQueryViewPolicy: "fail-closed",
  serverStateProviderAllowed: false,
  persistentSensitiveStorageAllowed: false,
  realtimeSubscriptionAllowed: false,
  backgroundRefreshAllowed: false,
  queryViews: [
    {
      viewId: "query-view-developer-profile-list",
      viewKind: "list",
      componentFixtureRef: "component-fixture-developer-profile-summary",
      queryRef: "query.developerProfile",
      capabilityId: "graphql-federation-generated-client-disposition",
      permissionRefs: ["developer:read"],
      tenantBoundaryRef: "tenant.dev-local-fixture",
      cacheFreshnessRef: "query-cache-freshness-required",
      cachePolicyRefs: [
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/client-query-cache-privacy-semantics.json#cacheInvalidationSemantics",
        "docs/architecture/client-query-cache-privacy-semantics.json#queryViewModelMapping",
      ],
      privacyClassificationRefs: [
        "privacy-classification-required",
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/app-surface-observability-privacy-semantics.json",
      ],
      errorRefs: ["typed-error-problem-details-model"],
      auditEventRefs: ["client-audit-event-emission", "graphql.developerProfile"],
      i18nKeyRefs: ["docs/architecture/app-surface-i18n-localisation-semantics.json#query-list-empty-error-state-keys"],
      accessibilityRefs: ["docs/architecture/app-surface-accessibility-semantics.json#query-list-keyboard-focus-screen-reader-labels"],
      telemetryRefs: [
        "tenant-user-context-propagation",
        "docs/architecture/generated-client-contract-validation-semantics.json#capabilityToScreenViewModelMapping",
      ],
      semanticSourceRefs: [
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/app-surface-local-in-memory-runtime.json",
        "docs/architecture/app-surface-shared-client-consumption-path.json",
        "tools/validate-app-surface/fixtures/conforming/004-query-with-cache-privacy.json",
      ],
      proofRefs: [
        "tests/packages/app-surface-query-list-detail-implementation.test.ts",
        "tools/validate-app-surface/validate-app-surface.py",
      ],
      resultItemShapeRef: "developer-profile-summary-result-item",
      emptyStateRef: "developer-profile-summary-empty-state",
      errorStateRef: "developer-profile-summary-error-state",
      nonClaimBoundary: "local query list view-model mapping only; no live server-state provider, persistent storage, query library readiness, cache readiness, sync readiness, deployment, staging, privacy compliance, production, live-provider, or human-acceptance readiness claim",
    },
    {
      viewId: "query-view-developer-profile-detail",
      viewKind: "detail",
      componentFixtureRef: "component-fixture-developer-profile-summary",
      queryRef: "query.developerProfile",
      capabilityId: "graphql-federation-generated-client-disposition",
      permissionRefs: ["developer:read"],
      tenantBoundaryRef: "tenant.dev-local-fixture",
      cacheFreshnessRef: "query-cache-freshness-required",
      cachePolicyRefs: [
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/client-query-cache-privacy-semantics.json#cacheInvalidationSemantics",
        "docs/architecture/client-query-cache-privacy-semantics.json#queryViewModelMapping",
      ],
      privacyClassificationRefs: [
        "privacy-classification-required",
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/app-surface-observability-privacy-semantics.json",
      ],
      errorRefs: ["typed-error-problem-details-model"],
      auditEventRefs: ["client-audit-event-emission", "graphql.developerProfile"],
      i18nKeyRefs: ["docs/architecture/app-surface-i18n-localisation-semantics.json#query-detail-not-found-error-state-keys"],
      accessibilityRefs: ["docs/architecture/app-surface-accessibility-semantics.json#query-detail-keyboard-focus-screen-reader-labels"],
      telemetryRefs: [
        "tenant-user-context-propagation",
        "docs/architecture/generated-client-contract-validation-semantics.json#capabilityToScreenViewModelMapping",
      ],
      semanticSourceRefs: [
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/app-surface-local-in-memory-runtime.json",
        "docs/architecture/app-surface-shared-client-consumption-path.json",
        "tools/validate-app-surface/fixtures/conforming/004-query-with-cache-privacy.json",
      ],
      proofRefs: [
        "tests/packages/app-surface-query-list-detail-implementation.test.ts",
        "tools/validate-app-surface/validate-app-surface.py",
      ],
      recordIdentityRef: "developer-profile-summary-record-identity",
      notFoundStateRef: "developer-profile-summary-not-found-state",
      errorStateRef: "developer-profile-summary-error-state",
      nonClaimBoundary: "local query detail view-model mapping only; no live server-state provider, persistent storage, query library readiness, cache readiness, sync readiness, deployment, staging, privacy compliance, production, live-provider, or human-acceptance readiness claim",
    },
  ],
  nonClaims: {
    cacheReadiness: false,
    syncReadiness: false,
    queryLibraryReadiness: false,
    serverStateProviderReadiness: false,
    persistentStorageReadiness: false,
    providerReadiness: false,
    deploymentReadiness: false,
    stagingReadiness: false,
    productionReadiness: false,
    liveProviderReadiness: false,
    privacyCompliance: false,
    humanAcceptance: false,
  },
} as const satisfies LocalQueryListDetailRegistry;

function validateQueryViewNonClaims(nonClaims: unknown): string[] {
  if (!isRecord(nonClaims)) {
    return ["query-list-detail-registry:missing-non-claims"];
  }
  const findings: string[] = [];
  for (const claim of REQUIRED_QUERY_VIEW_NON_CLAIMS) {
    if (!(claim in nonClaims)) {
      findings.push(`query-list-detail-registry:missing-non-claim:${claim}`);
    } else if (nonClaims[claim] !== false) {
      findings.push(`query-list-detail-registry:overclaimed:${claim}`);
    }
  }
  for (const [claim, value] of Object.entries(nonClaims)) {
    if (value !== false) {
      findings.push(`query-list-detail-registry:overclaimed:${claim}`);
    }
  }
  return findings;
}

function validateQueryViewArrayAuthority(
  findings: string[],
  viewId: string,
  refs: unknown,
  authorityIds: ReadonlySet<string>,
  findingPrefix: string,
): void {
  const values = hasNonEmptyStringArray(refs) ? refs : [];
  for (const ref of values) {
    if (!authorityIds.has(ref)) {
      findings.push(`${viewId}:${findingPrefix}:${ref}`);
    }
  }
}

function validateQueryViewStringAuthority(
  findings: string[],
  viewId: string,
  ref: unknown,
  authorityIds: ReadonlySet<string>,
  findingPrefix: string,
): void {
  if (!isNonEmptyString(ref) || !authorityIds.has(ref)) {
    findings.push(`${viewId}:${findingPrefix}:${isNonEmptyString(ref) ? ref : "missing"}`);
  }
}

function queryViewArraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function queryViewMatchesRegistry(
  registered: (typeof LOCAL_QUERY_LIST_DETAIL_REGISTRY.queryViews)[number],
  candidate: LocalQueryListDetailMapping,
): boolean {
  for (const field of REQUIRED_QUERY_VIEW_STRING_FIELDS) {
    if (registered[field] !== candidate[field]) {
      return false;
    }
  }
  for (const field of REQUIRED_QUERY_VIEW_ARRAY_FIELDS) {
    if (!queryViewArraysEqual(registered[field], candidate[field])) {
      return false;
    }
  }
  if (registered.viewKind === "list") {
    return registered.resultItemShapeRef === candidate.resultItemShapeRef && registered.emptyStateRef === candidate.emptyStateRef;
  }
  return registered.recordIdentityRef === candidate.recordIdentityRef && registered.notFoundStateRef === candidate.notFoundStateRef;
}

function validateQueryView(
  queryView: LocalQueryListDetailMapping | unknown,
  index: number,
  semanticAuthority?: LocalQueryListDetailSemanticAuthority,
): string[] {
  if (!isRecord(queryView)) {
    return [`query-view-${index}:missing`];
  }
  const viewId = isNonEmptyString(queryView.viewId) ? queryView.viewId : `query-view-${index}`;
  const findings: string[] = [];
  for (const field of REQUIRED_QUERY_VIEW_STRING_FIELDS) {
    if (!isNonEmptyString(queryView[field])) {
      findings.push(`${viewId}:missing-${field}`);
    }
  }
  for (const field of REQUIRED_QUERY_VIEW_ARRAY_FIELDS) {
    if (!hasNonEmptyStringArray(queryView[field])) {
      findings.push(`${viewId}:missing-${field}`);
    }
  }
  if (queryView.viewKind !== "list" && queryView.viewKind !== "detail") {
    findings.push(`${viewId}:unknown-viewKind`);
  }
  if (queryView.viewKind === "list") {
    if (!isNonEmptyString(queryView.resultItemShapeRef)) {
      findings.push(`${viewId}:missing-resultItemShapeRef`);
    }
    if (!isNonEmptyString(queryView.emptyStateRef)) {
      findings.push(`${viewId}:missing-emptyStateRef`);
    }
  }
  if (queryView.viewKind === "detail") {
    if (!isNonEmptyString(queryView.recordIdentityRef)) {
      findings.push(`${viewId}:missing-recordIdentityRef`);
    }
    if (!isNonEmptyString(queryView.notFoundStateRef)) {
      findings.push(`${viewId}:missing-notFoundStateRef`);
    }
  }
  for (const key of FORBIDDEN_EXTERNAL_KEYS) {
    if (key in queryView) {
      findings.push(`${viewId}:${key}-not-authorised`);
    }
  }
  if (semanticAuthority) {
    validateQueryViewStringAuthority(findings, viewId, queryView.queryRef, semanticAuthority.queryRefs, "query-authority-missing");
    validateQueryViewStringAuthority(findings, viewId, queryView.capabilityId, semanticAuthority.capabilityIds, "capability-authority-missing");
    validateQueryViewStringAuthority(findings, viewId, queryView.tenantBoundaryRef, semanticAuthority.tenantBoundaryIds, "tenant-authority-missing");
    validateQueryViewStringAuthority(findings, viewId, queryView.componentFixtureRef, semanticAuthority.componentFixtureIds, "component-fixture-authority-missing");
    validateQueryViewStringAuthority(findings, viewId, queryView.cacheFreshnessRef, semanticAuthority.cacheFreshnessRefs, "cache-freshness-authority-missing");
    validateQueryViewArrayAuthority(findings, viewId, queryView.permissionRefs, semanticAuthority.permissionIds, "permission-authority-missing");
    validateQueryViewArrayAuthority(findings, viewId, queryView.cachePolicyRefs, semanticAuthority.cachePolicyRefs, "cache-policy-authority-missing");
    validateQueryViewArrayAuthority(findings, viewId, queryView.privacyClassificationRefs, semanticAuthority.privacyClassificationRefs, "privacy-classification-authority-missing");
    validateQueryViewArrayAuthority(findings, viewId, queryView.errorRefs, semanticAuthority.errorIds, "error-authority-missing");
    validateQueryViewArrayAuthority(findings, viewId, queryView.auditEventRefs, semanticAuthority.auditEventIds, "audit-authority-missing");
    validateQueryViewArrayAuthority(findings, viewId, queryView.i18nKeyRefs, semanticAuthority.i18nKeyRefs, "i18n-authority-missing");
    validateQueryViewArrayAuthority(findings, viewId, queryView.accessibilityRefs, semanticAuthority.accessibilityRefs, "accessibility-authority-missing");
    validateQueryViewArrayAuthority(findings, viewId, queryView.telemetryRefs, semanticAuthority.telemetryRefs, "telemetry-authority-missing");
    validateQueryViewArrayAuthority(findings, viewId, queryView.semanticSourceRefs, semanticAuthority.semanticSourceRefs, "semantic-source-authority-missing");
    validateQueryViewArrayAuthority(findings, viewId, queryView.proofRefs, semanticAuthority.proofRefs, "proof-authority-missing");
  }
  return findings;
}

export function validateLocalQueryListDetailRegistry(
  registry: LocalQueryListDetailRegistry | unknown,
  semanticAuthority?: LocalQueryListDetailSemanticAuthority,
): LocalQueryListDetailValidationResult {
  if (!isRecord(registry)) {
    return { ok: false, findings: ["query-list-detail-registry:missing"] };
  }
  const findings: string[] = [];
  if (registry.ownerIssueId !== "USF-1022") {
    findings.push("query-list-detail-registry:unexpected-owner-issue");
  }
  if (registry.providerMode !== "in-memory-only") {
    findings.push("query-list-detail-registry:provider-mode-must-be-in-memory-only");
  }
  if (registry.environment !== "dev-local") {
    findings.push("query-list-detail-registry:environment-must-be-dev-local");
  }
  if (registry.unknownQueryViewPolicy !== "fail-closed") {
    findings.push("query-list-detail-registry:unknown-query-view-policy-must-fail-closed");
  }
  if (registry.serverStateProviderAllowed !== false) {
    findings.push("query-list-detail-registry:server-state-provider-not-authorised");
  }
  if (registry.persistentSensitiveStorageAllowed !== false) {
    findings.push("query-list-detail-registry:persistent-sensitive-storage-not-authorised");
  }
  if (registry.realtimeSubscriptionAllowed !== false) {
    findings.push("query-list-detail-registry:realtime-subscription-not-authorised");
  }
  if (registry.backgroundRefreshAllowed !== false) {
    findings.push("query-list-detail-registry:background-refresh-not-authorised");
  }
  if (!Array.isArray(registry.queryViews) || registry.queryViews.length === 0) {
    findings.push("query-list-detail-registry:missing-queryViews");
  } else {
    const seenViewIds = new Set<string>();
    const viewKinds = new Set<string>();
    registry.queryViews.forEach((queryView, index) => {
      findings.push(...validateQueryView(queryView, index, semanticAuthority));
      if (isRecord(queryView) && isNonEmptyString(queryView.viewId)) {
        if (seenViewIds.has(queryView.viewId)) {
          findings.push(`${queryView.viewId}:duplicate-view-id`);
        }
        seenViewIds.add(queryView.viewId);
      }
      if (isRecord(queryView) && isNonEmptyString(queryView.viewKind)) {
        viewKinds.add(queryView.viewKind);
      }
    });
    for (const requiredKind of ["list", "detail"]) {
      if (!viewKinds.has(requiredKind)) {
        findings.push(`query-list-detail-registry:missing-view-kind:${requiredKind}`);
      }
    }
  }
  findings.push(...validateQueryViewNonClaims(registry.nonClaims));
  return { ok: findings.length === 0, findings };
}

export function getLocalQueryViewById(viewId: string): LocalQueryListDetailMapping {
  const queryView = LOCAL_QUERY_LIST_DETAIL_REGISTRY.queryViews.find((candidate) => candidate.viewId === viewId);
  if (!queryView) {
    throw new Error(`query-view-unknown:${viewId}`);
  }
  return queryView;
}

export function exerciseLocalQueryView(
  queryView: LocalQueryListDetailMapping,
  semanticAuthority?: LocalQueryListDetailSemanticAuthority,
): LocalQueryListDetailExerciseOutcome {
  const registered = LOCAL_QUERY_LIST_DETAIL_REGISTRY.queryViews.find((candidate) => candidate.viewId === queryView.viewId);
  if (!registered) {
    throw new Error(`query-view-unregistered:${queryView.viewId}`);
  }
  if (!queryViewMatchesRegistry(registered, queryView)) {
    throw new Error(`query-view-registry-mismatch:${queryView.viewId}`);
  }
  const validation = validateQueryView(queryView, 0, semanticAuthority);
  if (validation.length > 0) {
    throw new Error(`query-view-invalid:${validation.join(",")}`);
  }
  return {
    viewId: queryView.viewId,
    viewKind: queryView.viewKind,
    queryRef: queryView.queryRef,
    capabilityId: queryView.capabilityId,
    tenantBoundaryRef: queryView.tenantBoundaryRef,
    permissionRefsChecked: [...queryView.permissionRefs],
    cacheFreshnessRefChecked: queryView.cacheFreshnessRef,
    cachePolicyRefsChecked: [...queryView.cachePolicyRefs],
    privacyClassificationRefsChecked: [...queryView.privacyClassificationRefs],
    errorRefsAvailable: [...queryView.errorRefs],
    auditEventRefsEmitted: [...queryView.auditEventRefs],
    i18nKeyRefsChecked: [...queryView.i18nKeyRefs],
    accessibilityRefsChecked: [...queryView.accessibilityRefs],
    telemetryRefsChecked: [...queryView.telemetryRefs],
    providerMode: "in-memory-only",
    serverStateProviderUsed: false,
    persistentSensitiveStorageUsed: false,
    realtimeSubscriptionUsed: false,
    backgroundRefreshUsed: false,
    stagingUsed: false,
    deploymentUsed: false,
  };
}

export type LocalStateCacheQueryClientProviderMode = "in-memory-only";
export type LocalStateCacheQueryClientEnvironment = "dev-local";
export type LocalStateClass = "server-query-cache" | "ui-ephemeral-state" | "session-purge-signal";
export type LocalStateScope = "server-state-query-result" | "ui-only-view-state" | "session-purge-boundary";
export type LocalStateStorageLocation = "in-memory-only";

export interface LocalStateCacheQueryBoundaryMapping {
  readonly stateId: string;
  readonly stateClass: string;
  readonly stateScope: string;
  readonly queryRef: string;
  readonly queryViewRefs: readonly string[];
  readonly capabilityId: string;
  readonly permissionRefs: readonly string[];
  readonly tenantBoundaryRef: string;
  readonly privacyClassificationRefs: readonly string[];
  readonly cachePolicyRefs: readonly string[];
  readonly storageLocationRef: string;
  readonly retentionPolicyRef: string;
  readonly purgeTriggerRefs: readonly string[];
  readonly logoutPurgeRef: string;
  readonly sharedDevicePostureRef: string;
  readonly failClosedRefs: readonly string[];
  readonly semanticSourceRefs: readonly string[];
  readonly proofRefs: readonly string[];
  readonly persistentSensitiveStorageAllowed: boolean;
  readonly queryLibraryRequired: boolean;
  readonly syncAllowed: boolean;
  readonly offlineAllowed: boolean;
  readonly realtimeAllowed: boolean;
  readonly backgroundRefreshAllowed: boolean;
  readonly nonClaimBoundary: string;
}

export interface LocalStateCacheQueryClientRegistry {
  readonly artifactId: string;
  readonly ownerIssueId: string;
  readonly providerMode: string;
  readonly environment: string;
  readonly unknownStatePolicy: string;
  readonly persistentSensitiveStorageAllowed: boolean;
  readonly queryLibrarySetupAllowed: boolean;
  readonly syncEngineAllowed: boolean;
  readonly offlineReadinessAllowed: boolean;
  readonly realtimeProviderAllowed: boolean;
  readonly backgroundRefreshAllowed: boolean;
  readonly stateBoundaries: readonly LocalStateCacheQueryBoundaryMapping[];
  readonly nonClaims: Record<string, boolean>;
}

export interface LocalStateCacheQueryClientAuthority {
  readonly stateClasses?: ReadonlySet<string> | readonly string[];
  readonly queryRefs?: ReadonlySet<string> | readonly string[];
  readonly queryViewRefs?: ReadonlySet<string> | readonly string[];
  readonly capabilityIds?: ReadonlySet<string> | readonly string[];
  readonly permissionRefs?: ReadonlySet<string> | readonly string[];
  readonly tenantBoundaryRefs?: ReadonlySet<string> | readonly string[];
  readonly privacyClassificationRefs?: ReadonlySet<string> | readonly string[];
  readonly cachePolicyRefs?: ReadonlySet<string> | readonly string[];
  readonly storageLocationRefs?: ReadonlySet<string> | readonly string[];
  readonly retentionPolicyRefs?: ReadonlySet<string> | readonly string[];
  readonly purgeTriggerRefs?: ReadonlySet<string> | readonly string[];
  readonly logoutPurgeRefs?: ReadonlySet<string> | readonly string[];
  readonly sharedDevicePostureRefs?: ReadonlySet<string> | readonly string[];
  readonly failClosedRefs?: ReadonlySet<string> | readonly string[];
  readonly semanticSourceRefs?: ReadonlySet<string> | readonly string[];
  readonly proofRefs?: ReadonlySet<string> | readonly string[];
}

export interface LocalStateCacheQueryClientExerciseResult {
  readonly stateId: string;
  readonly stateClass: string;
  readonly stateScope: string;
  readonly queryRef: string;
  readonly capabilityId: string;
  readonly tenantBoundaryRef: string;
  readonly providerMode: LocalStateCacheQueryClientProviderMode;
  readonly environment: LocalStateCacheQueryClientEnvironment;
  readonly storageLocationRef: LocalStateStorageLocation;
  readonly persistentSensitiveStorageUsed: false;
  readonly queryLibraryUsed: false;
  readonly syncEngineUsed: false;
  readonly offlineFirstUsed: false;
  readonly realtimeProviderUsed: false;
  readonly backgroundRefreshUsed: false;
  readonly externalStateServiceUsed: false;
  readonly stagingUsed: false;
  readonly deploymentUsed: false;
  readonly nonClaimBoundary: string;
}

const LOCAL_STATE_CACHE_QUERY_CLIENT_RULE = "USF-1023";
const LOCAL_STATE_CACHE_QUERY_CLIENT_ARTIFACT_ID = "usf.app-surface-state-cache-query-client-registry";
const LOCAL_STATE_CACHE_QUERY_CLIENT_PROVIDER_MODE: LocalStateCacheQueryClientProviderMode = "in-memory-only";
const LOCAL_STATE_CACHE_QUERY_CLIENT_ENVIRONMENT: LocalStateCacheQueryClientEnvironment = "dev-local";
const LOCAL_STATE_CACHE_QUERY_CLIENT_UNKNOWN_STATE_POLICY = "fail-closed";
const LOCAL_STATE_CACHE_QUERY_CLIENT_REQUIRED_STATE_CLASSES = [
  "server-query-cache",
  "ui-ephemeral-state",
  "session-purge-signal",
] as const;
const LOCAL_STATE_CACHE_QUERY_CLIENT_REQUIRED_NON_CLAIMS = [
  "cacheReadiness",
  "queryClientReadiness",
  "queryLibraryReadiness",
  "syncReadiness",
  "offlineReadiness",
  "authReadiness",
  "serverStateProviderReadiness",
  "persistentStorageReadiness",
  "privacyCompliance",
  "dataRetentionCompliance",
  "providerReadiness",
  "deploymentReadiness",
  "stagingReadiness",
  "productionReadiness",
  "liveProviderReadiness",
  "humanAcceptance",
] as const;

const LOCAL_STATE_CACHE_QUERY_CLIENT_REQUIRED_STRING_FIELDS = [
  "stateId",
  "stateClass",
  "stateScope",
  "queryRef",
  "capabilityId",
  "tenantBoundaryRef",
  "storageLocationRef",
  "retentionPolicyRef",
  "logoutPurgeRef",
  "sharedDevicePostureRef",
  "nonClaimBoundary",
] as const;

const LOCAL_STATE_CACHE_QUERY_CLIENT_REQUIRED_ARRAY_FIELDS = [
  "queryViewRefs",
  "permissionRefs",
  "privacyClassificationRefs",
  "cachePolicyRefs",
  "purgeTriggerRefs",
  "failClosedRefs",
  "semanticSourceRefs",
  "proofRefs",
] as const;

const LOCAL_STATE_CACHE_QUERY_CLIENT_FORBIDDEN_FLAGS = [
  ["persistentSensitiveStorageAllowed", "persistent-sensitive-storage-not-authorised"],
  ["queryLibraryRequired", "query-library-setup-not-authorised"],
  ["syncAllowed", "sync-engine-not-authorised"],
  ["offlineAllowed", "offline-first-not-authorised"],
  ["realtimeAllowed", "realtime-provider-not-authorised"],
  ["backgroundRefreshAllowed", "background-refresh-not-authorised"],
] as const;

const LOCAL_STATE_CACHE_QUERY_CLIENT_REGISTRY_FORBIDDEN_FLAGS = [
  ["persistentSensitiveStorageAllowed", "persistent-sensitive-storage-not-authorised"],
  ["queryLibrarySetupAllowed", "query-library-setup-not-authorised"],
  ["syncEngineAllowed", "sync-engine-not-authorised"],
  ["offlineReadinessAllowed", "offline-first-not-authorised"],
  ["realtimeProviderAllowed", "realtime-provider-not-authorised"],
  ["backgroundRefreshAllowed", "background-refresh-not-authorised"],
] as const;

const LOCAL_STATE_CACHE_QUERY_CLIENT_FORBIDDEN_KEYS = [
  "externalStateService",
  "persistentStorageProvider",
  "queryClientProvider",
  "syncProvider",
  "realtimeProvider",
  "backgroundTaskProvider",
  "credentialRef",
  "deploymentRef",
  "stagingRef",
] as const;

export const LOCAL_STATE_CACHE_QUERY_CLIENT_REGISTRY = {
  artifactId: LOCAL_STATE_CACHE_QUERY_CLIENT_ARTIFACT_ID,
  ownerIssueId: LOCAL_STATE_CACHE_QUERY_CLIENT_RULE,
  providerMode: LOCAL_STATE_CACHE_QUERY_CLIENT_PROVIDER_MODE,
  environment: LOCAL_STATE_CACHE_QUERY_CLIENT_ENVIRONMENT,
  unknownStatePolicy: LOCAL_STATE_CACHE_QUERY_CLIENT_UNKNOWN_STATE_POLICY,
  persistentSensitiveStorageAllowed: false,
  queryLibrarySetupAllowed: false,
  syncEngineAllowed: false,
  offlineReadinessAllowed: false,
  realtimeProviderAllowed: false,
  backgroundRefreshAllowed: false,
  stateBoundaries: [
    {
      stateId: "state-cache-developer-profile-query-result",
      stateClass: "server-query-cache",
      stateScope: "server-state-query-result",
      queryRef: "query.developerProfile",
      queryViewRefs: [
        "query-view-developer-profile-list",
        "query-view-developer-profile-detail",
      ],
      capabilityId: "graphql-federation-generated-client-disposition",
      permissionRefs: ["developer:read"],
      tenantBoundaryRef: "tenant.dev-local-fixture",
      privacyClassificationRefs: [
        "privacy-classification-required",
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/app-surface-observability-privacy-semantics.json",
      ],
      cachePolicyRefs: [
        "query-cache-freshness-required",
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/client-query-cache-privacy-semantics.json#cacheInvalidationSemantics",
        "docs/architecture/client-query-cache-privacy-semantics.json#queryViewModelMapping",
      ],
      storageLocationRef: "in-memory-only",
      retentionPolicyRef: "docs/architecture/client-state-storage-sync-semantics.json#client-device-browser-retention",
      purgeTriggerRefs: [
        "docs/architecture/client-state-storage-sync-semantics.json#logout-session-expiry-purge",
        "docs/architecture/client-state-storage-sync-semantics.json#privacy-mode-shared-device-posture",
      ],
      logoutPurgeRef: "docs/architecture/client-state-storage-sync-semantics.json#logout-session-expiry-purge",
      sharedDevicePostureRef: "docs/architecture/client-state-storage-sync-semantics.json#privacy-mode-shared-device-posture",
      failClosedRefs: [
        "missing-state-classification",
        "missing-privacy-classification",
        "missing-purge-policy",
        "partial-purge-fail-closed",
        "persistent-sensitive-storage-not-authorised",
        "query-library-setup-not-authorised",
      ],
      semanticSourceRefs: [
        "docs/architecture/client-state-storage-sync-semantics.json",
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/app-surface-local-in-memory-runtime.json",
        "docs/architecture/app-surface-query-list-detail-implementation.json",
        "docs/architecture/app-surface-shared-client-consumption-path.json",
      ],
      proofRefs: [
        "docs/architecture/app-surface-state-cache-query-client-implementation.json",
        "tests/packages/app-surface-state-cache-query-client-implementation.test.ts",
        "tools/validate-app-surface/validate-app-surface.py",
      ],
      persistentSensitiveStorageAllowed: false,
      queryLibraryRequired: false,
      syncAllowed: false,
      offlineAllowed: false,
      realtimeAllowed: false,
      backgroundRefreshAllowed: false,
      nonClaimBoundary: "server query cache is an in-memory local mapping only, not cache readiness or query-library readiness",
    },
    {
      stateId: "state-ui-developer-profile-view-state",
      stateClass: "ui-ephemeral-state",
      stateScope: "ui-only-view-state",
      queryRef: "query.developerProfile",
      queryViewRefs: [
        "query-view-developer-profile-list",
        "query-view-developer-profile-detail",
      ],
      capabilityId: "graphql-federation-generated-client-disposition",
      permissionRefs: ["developer:read"],
      tenantBoundaryRef: "tenant.dev-local-fixture",
      privacyClassificationRefs: [
        "privacy-classification-required",
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/app-surface-observability-privacy-semantics.json",
      ],
      cachePolicyRefs: [
        "query-cache-freshness-required",
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/client-query-cache-privacy-semantics.json#queryViewModelMapping",
      ],
      storageLocationRef: "in-memory-only",
      retentionPolicyRef: "docs/architecture/client-state-storage-sync-semantics.json#client-device-browser-retention",
      purgeTriggerRefs: [
        "docs/architecture/client-state-storage-sync-semantics.json#logout-session-expiry-purge",
        "docs/architecture/client-state-storage-sync-semantics.json#privacy-mode-shared-device-posture",
      ],
      logoutPurgeRef: "docs/architecture/client-state-storage-sync-semantics.json#logout-session-expiry-purge",
      sharedDevicePostureRef: "docs/architecture/client-state-storage-sync-semantics.json#privacy-mode-shared-device-posture",
      failClosedRefs: [
        "missing-state-classification",
        "missing-privacy-classification",
        "missing-purge-policy",
        "ui-only-behaviour-not-authorised",
        "persistent-sensitive-storage-not-authorised",
        "query-library-setup-not-authorised",
      ],
      semanticSourceRefs: [
        "docs/architecture/client-state-storage-sync-semantics.json",
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/app-surface-local-in-memory-runtime.json",
        "docs/architecture/app-surface-query-list-detail-implementation.json",
        "docs/architecture/app-surface-shared-client-consumption-path.json",
      ],
      proofRefs: [
        "docs/architecture/app-surface-state-cache-query-client-implementation.json",
        "tests/packages/app-surface-state-cache-query-client-implementation.test.ts",
        "tools/validate-app-surface/validate-app-surface.py",
      ],
      persistentSensitiveStorageAllowed: false,
      queryLibraryRequired: false,
      syncAllowed: false,
      offlineAllowed: false,
      realtimeAllowed: false,
      backgroundRefreshAllowed: false,
      nonClaimBoundary: "UI state is ephemeral presentation state and does not define product behaviour",
    },
    {
      stateId: "state-session-developer-profile-purge-signal",
      stateClass: "session-purge-signal",
      stateScope: "session-purge-boundary",
      queryRef: "query.developerProfile",
      queryViewRefs: [
        "query-view-developer-profile-list",
        "query-view-developer-profile-detail",
      ],
      capabilityId: "graphql-federation-generated-client-disposition",
      permissionRefs: ["developer:read"],
      tenantBoundaryRef: "tenant.dev-local-fixture",
      privacyClassificationRefs: [
        "privacy-classification-required",
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/app-surface-observability-privacy-semantics.json",
      ],
      cachePolicyRefs: [
        "query-cache-freshness-required",
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/client-query-cache-privacy-semantics.json#cacheInvalidationSemantics",
      ],
      storageLocationRef: "in-memory-only",
      retentionPolicyRef: "docs/architecture/client-state-storage-sync-semantics.json#logout-session-expiry-purge",
      purgeTriggerRefs: [
        "docs/architecture/client-state-storage-sync-semantics.json#logout-session-expiry-purge",
        "docs/architecture/client-state-storage-sync-semantics.json#privacy-mode-shared-device-posture",
      ],
      logoutPurgeRef: "docs/architecture/client-state-storage-sync-semantics.json#logout-session-expiry-purge",
      sharedDevicePostureRef: "docs/architecture/client-state-storage-sync-semantics.json#privacy-mode-shared-device-posture",
      failClosedRefs: [
        "missing-state-classification",
        "missing-purge-policy",
        "partial-purge-fail-closed",
        "persistent-sensitive-storage-not-authorised",
        "query-library-setup-not-authorised",
      ],
      semanticSourceRefs: [
        "docs/architecture/client-state-storage-sync-semantics.json",
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/app-surface-local-in-memory-runtime.json",
        "docs/architecture/app-surface-query-list-detail-implementation.json",
        "docs/architecture/app-surface-shared-client-consumption-path.json",
      ],
      proofRefs: [
        "docs/architecture/app-surface-state-cache-query-client-implementation.json",
        "tests/packages/app-surface-state-cache-query-client-implementation.test.ts",
        "tools/validate-app-surface/validate-app-surface.py",
      ],
      persistentSensitiveStorageAllowed: false,
      queryLibraryRequired: false,
      syncAllowed: false,
      offlineAllowed: false,
      realtimeAllowed: false,
      backgroundRefreshAllowed: false,
      nonClaimBoundary: "Logout and session expiry purge signalling is local and does not claim auth readiness",
    },
  ],
  nonClaims: {
    cacheReadiness: false,
    queryClientReadiness: false,
    queryLibraryReadiness: false,
    syncReadiness: false,
    offlineReadiness: false,
    authReadiness: false,
    serverStateProviderReadiness: false,
    persistentStorageReadiness: false,
    privacyCompliance: false,
    dataRetentionCompliance: false,
    providerReadiness: false,
    deploymentReadiness: false,
    stagingReadiness: false,
    productionReadiness: false,
    liveProviderReadiness: false,
    humanAcceptance: false,
  },
} as const satisfies LocalStateCacheQueryClientRegistry;

const asStateCacheAuthorityValues = (values: ReadonlySet<string> | readonly string[] | undefined): readonly string[] | undefined => {
  if (values === undefined) {
    return undefined;
  }
  if (Array.isArray(values)) {
    return values;
  }
  return Array.from(values);
};

const stateCacheAuthorityHas = (
  values: ReadonlySet<string> | readonly string[] | undefined,
  value: string,
): boolean => {
  if (values === undefined) {
    return false;
  }
  return asStateCacheAuthorityValues(values)?.includes(value) ?? false;
};

const hasStateCacheString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const hasStateCacheStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.length > 0 && value.every((item) => hasStateCacheString(item));

const stateCacheSubject = (mapping: Pick<LocalStateCacheQueryBoundaryMapping, "stateId"> | { readonly stateId?: unknown }): string =>
  hasStateCacheString(mapping.stateId) ? mapping.stateId : "state-cache-boundary";

const validateStateCacheAuthorityValue = (
  findings: string[],
  subject: string,
  authority: LocalStateCacheQueryClientAuthority | undefined,
  authorityKey: keyof LocalStateCacheQueryClientAuthority,
  value: string,
  code: string,
): void => {
  if (!stateCacheAuthorityHas(authority?.[authorityKey], value)) {
    findings.push(`${subject}:${code}:${value}`);
  }
};

const validateStateCacheAuthorityArray = (
  findings: string[],
  subject: string,
  authority: LocalStateCacheQueryClientAuthority | undefined,
  authorityKey: keyof LocalStateCacheQueryClientAuthority,
  values: readonly string[],
  code: string,
): void => {
  for (const value of values) {
    validateStateCacheAuthorityValue(findings, subject, authority, authorityKey, value, code);
  }
};

export const validateLocalStateCacheBoundaryMapping = (
  mapping: LocalStateCacheQueryBoundaryMapping,
  authority?: LocalStateCacheQueryClientAuthority,
): string[] => {
  const findings: string[] = [];
  const subject = stateCacheSubject(mapping);
  const record = mapping as unknown as Record<string, unknown>;

  for (const field of LOCAL_STATE_CACHE_QUERY_CLIENT_REQUIRED_STRING_FIELDS) {
    if (!hasStateCacheString(record[field])) {
      findings.push(`${subject}:missing-${field}`);
    }
  }
  for (const field of LOCAL_STATE_CACHE_QUERY_CLIENT_REQUIRED_ARRAY_FIELDS) {
    if (!hasStateCacheStringArray(record[field])) {
      findings.push(`${subject}:missing-${field}`);
    }
  }
  if (hasStateCacheString(mapping.stateClass)) {
    validateStateCacheAuthorityValue(findings, subject, authority, "stateClasses", mapping.stateClass, "state-class-authority-missing");
    if (!LOCAL_STATE_CACHE_QUERY_CLIENT_REQUIRED_STATE_CLASSES.includes(mapping.stateClass as LocalStateClass)) {
      findings.push(`${subject}:state-class-unsupported:${mapping.stateClass}`);
    }
  }
  if (hasStateCacheString(mapping.queryRef)) {
    validateStateCacheAuthorityValue(findings, subject, authority, "queryRefs", mapping.queryRef, "query-authority-missing");
  }
  if (hasStateCacheString(mapping.capabilityId)) {
    validateStateCacheAuthorityValue(findings, subject, authority, "capabilityIds", mapping.capabilityId, "capability-authority-missing");
  }
  if (hasStateCacheString(mapping.tenantBoundaryRef)) {
    validateStateCacheAuthorityValue(findings, subject, authority, "tenantBoundaryRefs", mapping.tenantBoundaryRef, "tenant-authority-missing");
  }
  if (hasStateCacheString(mapping.storageLocationRef)) {
    validateStateCacheAuthorityValue(findings, subject, authority, "storageLocationRefs", mapping.storageLocationRef, "storage-authority-missing");
  }
  if (hasStateCacheString(mapping.retentionPolicyRef)) {
    validateStateCacheAuthorityValue(findings, subject, authority, "retentionPolicyRefs", mapping.retentionPolicyRef, "retention-authority-missing");
  }
  if (hasStateCacheString(mapping.logoutPurgeRef)) {
    validateStateCacheAuthorityValue(findings, subject, authority, "logoutPurgeRefs", mapping.logoutPurgeRef, "logout-purge-authority-missing");
  }
  if (hasStateCacheString(mapping.sharedDevicePostureRef)) {
    validateStateCacheAuthorityValue(findings, subject, authority, "sharedDevicePostureRefs", mapping.sharedDevicePostureRef, "shared-device-authority-missing");
  }
  for (const [field, code] of LOCAL_STATE_CACHE_QUERY_CLIENT_FORBIDDEN_FLAGS) {
    if (record[field] !== false) {
      findings.push(`${subject}:${code}`);
    }
  }
  for (const key of LOCAL_STATE_CACHE_QUERY_CLIENT_FORBIDDEN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      findings.push(`${subject}:forbidden-${key}`);
    }
  }
  if (hasStateCacheStringArray(mapping.queryViewRefs)) {
    validateStateCacheAuthorityArray(findings, subject, authority, "queryViewRefs", mapping.queryViewRefs, "query-view-authority-missing");
  }
  if (hasStateCacheStringArray(mapping.permissionRefs)) {
    validateStateCacheAuthorityArray(findings, subject, authority, "permissionRefs", mapping.permissionRefs, "permission-authority-missing");
  }
  if (hasStateCacheStringArray(mapping.privacyClassificationRefs)) {
    validateStateCacheAuthorityArray(findings, subject, authority, "privacyClassificationRefs", mapping.privacyClassificationRefs, "privacy-authority-missing");
  }
  if (hasStateCacheStringArray(mapping.cachePolicyRefs)) {
    validateStateCacheAuthorityArray(findings, subject, authority, "cachePolicyRefs", mapping.cachePolicyRefs, "cache-policy-authority-missing");
  }
  if (hasStateCacheStringArray(mapping.purgeTriggerRefs)) {
    validateStateCacheAuthorityArray(findings, subject, authority, "purgeTriggerRefs", mapping.purgeTriggerRefs, "purge-trigger-authority-missing");
  }
  if (hasStateCacheStringArray(mapping.failClosedRefs)) {
    validateStateCacheAuthorityArray(findings, subject, authority, "failClosedRefs", mapping.failClosedRefs, "fail-closed-authority-missing");
  }
  if (hasStateCacheStringArray(mapping.semanticSourceRefs)) {
    validateStateCacheAuthorityArray(findings, subject, authority, "semanticSourceRefs", mapping.semanticSourceRefs, "semantic-source-authority-missing");
  }
  if (hasStateCacheStringArray(mapping.proofRefs)) {
    validateStateCacheAuthorityArray(findings, subject, authority, "proofRefs", mapping.proofRefs, "proof-authority-missing");
  }
  return findings;
};

export const validateLocalStateCacheQueryClientRegistry = (
  registry: LocalStateCacheQueryClientRegistry = LOCAL_STATE_CACHE_QUERY_CLIENT_REGISTRY,
  authority?: LocalStateCacheQueryClientAuthority,
): string[] => {
  const findings: string[] = [];
  const record = registry as unknown as Record<string, unknown>;
  const registrySubject = "state-cache-query-client-registry";

  if (registry.artifactId !== LOCAL_STATE_CACHE_QUERY_CLIENT_ARTIFACT_ID) {
    findings.push(`${registrySubject}:artifactId-mismatch`);
  }
  if (registry.ownerIssueId !== LOCAL_STATE_CACHE_QUERY_CLIENT_RULE) {
    findings.push(`${registrySubject}:ownerIssueId-mismatch`);
  }
  if (registry.providerMode !== LOCAL_STATE_CACHE_QUERY_CLIENT_PROVIDER_MODE) {
    findings.push(`${registrySubject}:providerMode-mismatch`);
  }
  if (registry.environment !== LOCAL_STATE_CACHE_QUERY_CLIENT_ENVIRONMENT) {
    findings.push(`${registrySubject}:environment-mismatch`);
  }
  if (registry.unknownStatePolicy !== LOCAL_STATE_CACHE_QUERY_CLIENT_UNKNOWN_STATE_POLICY) {
    findings.push(`${registrySubject}:unknown-state-policy-must-fail-closed`);
  }
  for (const [field, code] of LOCAL_STATE_CACHE_QUERY_CLIENT_REGISTRY_FORBIDDEN_FLAGS) {
    if (record[field] !== false) {
      findings.push(`${registrySubject}:${code}`);
    }
  }
  for (const claim of LOCAL_STATE_CACHE_QUERY_CLIENT_REQUIRED_NON_CLAIMS) {
    if (registry.nonClaims?.[claim] !== false) {
      findings.push(`${registrySubject}:nonclaim-${claim}-must-be-false`);
    }
  }
  if (!Array.isArray(registry.stateBoundaries) || registry.stateBoundaries.length === 0) {
    findings.push(`${registrySubject}:missing-stateBoundaries`);
    return findings;
  }
  const seenStateIds = new Set<string>();
  const seenStateClasses = new Set<string>();
  for (const mapping of registry.stateBoundaries) {
    const subject = stateCacheSubject(mapping);
    if (seenStateIds.has(mapping.stateId)) {
      findings.push(`${subject}:duplicate-stateId`);
    }
    seenStateIds.add(mapping.stateId);
    if (hasStateCacheString(mapping.stateClass)) {
      seenStateClasses.add(mapping.stateClass);
    }
    findings.push(...validateLocalStateCacheBoundaryMapping(mapping, authority));
  }
  for (const requiredClass of LOCAL_STATE_CACHE_QUERY_CLIENT_REQUIRED_STATE_CLASSES) {
    if (!seenStateClasses.has(requiredClass)) {
      findings.push(`${registrySubject}:missing-stateClass-${requiredClass}`);
    }
  }
  return findings;
};

const stateCacheArraysEqual = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const localStateCacheBoundaryMatchesRegistry = (
  candidate: LocalStateCacheQueryBoundaryMapping,
  registered: LocalStateCacheQueryBoundaryMapping,
): boolean => {
  const stringFields: (keyof LocalStateCacheQueryBoundaryMapping)[] = [
    "stateClass",
    "stateScope",
    "queryRef",
    "capabilityId",
    "tenantBoundaryRef",
    "storageLocationRef",
    "retentionPolicyRef",
    "logoutPurgeRef",
    "sharedDevicePostureRef",
    "nonClaimBoundary",
  ];
  for (const field of stringFields) {
    if (candidate[field] !== registered[field]) {
      return false;
    }
  }
  for (const field of LOCAL_STATE_CACHE_QUERY_CLIENT_REQUIRED_ARRAY_FIELDS) {
    if (!stateCacheArraysEqual(candidate[field], registered[field])) {
      return false;
    }
  }
  for (const [field] of LOCAL_STATE_CACHE_QUERY_CLIENT_FORBIDDEN_FLAGS) {
    if (candidate[field] !== registered[field]) {
      return false;
    }
  }
  return true;
};

export const getLocalStateCacheBoundaryById = (stateId: string): LocalStateCacheQueryBoundaryMapping => {
  const mapping = LOCAL_STATE_CACHE_QUERY_CLIENT_REGISTRY.stateBoundaries.find((candidate) => candidate.stateId === stateId);
  if (mapping === undefined) {
    throw new Error(`state-cache-boundary-unknown:${stateId}`);
  }
  return mapping;
};

export const exerciseLocalStateCacheBoundary = (
  mapping: LocalStateCacheQueryBoundaryMapping,
  authority?: LocalStateCacheQueryClientAuthority,
): LocalStateCacheQueryClientExerciseResult => {
  const findings = validateLocalStateCacheBoundaryMapping(mapping, authority);
  if (findings.length > 0) {
    throw new Error(`local-state-cache-boundary-invalid:${findings.join(",")}`);
  }
  const registered = LOCAL_STATE_CACHE_QUERY_CLIENT_REGISTRY.stateBoundaries.find((candidate) => candidate.stateId === mapping.stateId);
  if (registered === undefined) {
    throw new Error(`state-cache-boundary-unregistered:${mapping.stateId}`);
  }
  if (!localStateCacheBoundaryMatchesRegistry(mapping, registered)) {
    throw new Error(`state-cache-boundary-registry-mismatch:${mapping.stateId}`);
  }
  return {
    stateId: mapping.stateId,
    stateClass: mapping.stateClass,
    stateScope: mapping.stateScope,
    queryRef: mapping.queryRef,
    capabilityId: mapping.capabilityId,
    tenantBoundaryRef: mapping.tenantBoundaryRef,
    providerMode: LOCAL_STATE_CACHE_QUERY_CLIENT_PROVIDER_MODE,
    environment: LOCAL_STATE_CACHE_QUERY_CLIENT_ENVIRONMENT,
    storageLocationRef: "in-memory-only",
    persistentSensitiveStorageUsed: false,
    queryLibraryUsed: false,
    syncEngineUsed: false,
    offlineFirstUsed: false,
    realtimeProviderUsed: false,
    backgroundRefreshUsed: false,
    externalStateServiceUsed: false,
    stagingUsed: false,
    deploymentUsed: false,
    nonClaimBoundary: mapping.nonClaimBoundary,
  };
};

export type LocalAuthSessionProviderMode = "in-memory-dev-stub";
export type LocalAuthSessionEnvironment = "dev-local";
export type LocalAuthDecision = "allow" | "deny";
export type LocalAuthRequestContextKind = "query" | "command";

export interface LocalAuthSessionIdentityMapping {
  readonly identityId: string;
  readonly userRef: string;
  readonly tenantBoundaryRef: string;
  readonly sessionContextRef: string;
  readonly roleRefs: readonly string[];
  readonly permissionRefs: readonly string[];
  readonly capabilityRefs: readonly string[];
  readonly commandRefs: readonly string[];
  readonly queryRefs: readonly string[];
  readonly semanticSourceRefs: readonly string[];
  readonly proofRefs: readonly string[];
  readonly providerMode: string;
  readonly productionIdentityProviderAllowed: boolean;
  readonly liveOAuthOidcAllowed: boolean;
  readonly credentialsAllowed: boolean;
  readonly secureStorageClaimAllowed: boolean;
  readonly externalProviderAllowed: boolean;
  readonly nonClaimBoundary: string;
}

export interface LocalAuthPermissionCheckCase {
  readonly checkId: string;
  readonly identityRef: string;
  readonly requestContextKind: string;
  readonly permissionRef: string;
  readonly tenantBoundaryRef: string;
  readonly targetRef: string;
  readonly expectedDecision: string;
  readonly reasonCode: string;
  readonly auditEventRef: string;
}

export interface LocalAuthPermissionRequest {
  readonly identityRef: string;
  readonly userRef: string;
  readonly tenantBoundaryRef: string;
  readonly permissionRef: string;
  readonly requestContextKind: LocalAuthRequestContextKind;
  readonly targetRef: string;
}

export interface LocalAuthPermissionDecisionResult {
  readonly identityRef: string;
  readonly userRef: string;
  readonly tenantBoundaryRef: string;
  readonly permissionRef: string;
  readonly requestContextKind: LocalAuthRequestContextKind;
  readonly targetRef: string;
  readonly decision: LocalAuthDecision;
  readonly reasonCode: string;
  readonly providerMode: LocalAuthSessionProviderMode;
  readonly environment: LocalAuthSessionEnvironment;
  readonly auditEventRef: string;
  readonly authReadinessClaimed: false;
  readonly providerReadinessClaimed: false;
  readonly productionIdentityReadinessClaimed: false;
  readonly liveProviderReadinessClaimed: false;
}

export interface LocalAuthSessionDevIdentityRegistry {
  readonly artifactId: string;
  readonly ownerIssueId: string;
  readonly providerMode: string;
  readonly environment: string;
  readonly unknownIdentityPolicy: string;
  readonly missingPermissionPolicy: string;
  readonly productionIdentityProviderAllowed: boolean;
  readonly liveOAuthOidcAllowed: boolean;
  readonly keycloakProviderSetupAllowed: boolean;
  readonly credentialsAllowed: boolean;
  readonly secureStorageClaimAllowed: boolean;
  readonly externalProviderAllowed: boolean;
  readonly identities: readonly LocalAuthSessionIdentityMapping[];
  readonly permissionCheckCases: readonly LocalAuthPermissionCheckCase[];
  readonly nonClaims: Record<string, boolean>;
}

export interface LocalAuthSessionDevIdentityAuthority {
  readonly identityRefs?: ReadonlySet<string> | readonly string[];
  readonly userRefs?: ReadonlySet<string> | readonly string[];
  readonly tenantBoundaryRefs?: ReadonlySet<string> | readonly string[];
  readonly sessionContextRefs?: ReadonlySet<string> | readonly string[];
  readonly roleRefs?: ReadonlySet<string> | readonly string[];
  readonly permissionRefs?: ReadonlySet<string> | readonly string[];
  readonly capabilityRefs?: ReadonlySet<string> | readonly string[];
  readonly commandRefs?: ReadonlySet<string> | readonly string[];
  readonly queryRefs?: ReadonlySet<string> | readonly string[];
  readonly targetRefs?: ReadonlySet<string> | readonly string[];
  readonly auditEventRefs?: ReadonlySet<string> | readonly string[];
  readonly semanticSourceRefs?: ReadonlySet<string> | readonly string[];
  readonly proofRefs?: ReadonlySet<string> | readonly string[];
}

const LOCAL_AUTH_SESSION_DEV_IDENTITY_RULE = "USF-1024";
const LOCAL_AUTH_SESSION_DEV_IDENTITY_ARTIFACT_ID = "usf.app-surface-auth-session-dev-identity-implementation-registry";
const LOCAL_AUTH_SESSION_DEV_IDENTITY_PROVIDER_MODE: LocalAuthSessionProviderMode = "in-memory-dev-stub";
const LOCAL_AUTH_SESSION_DEV_IDENTITY_ENVIRONMENT: LocalAuthSessionEnvironment = "dev-local";
const LOCAL_AUTH_SESSION_DEV_IDENTITY_REQUIRED_NON_CLAIMS = [
  "authReadiness",
  "providerReadiness",
  "identityProviderReadiness",
  "credentialReadiness",
  "secureStorageReadiness",
  "deploymentReadiness",
  "stagingReadiness",
  "productionReadiness",
  "liveProviderReadiness",
  "privacyCompliance",
  "humanAcceptance",
] as const;

const LOCAL_AUTH_SESSION_REQUIRED_IDENTITY_STRINGS = [
  "identityId",
  "userRef",
  "tenantBoundaryRef",
  "sessionContextRef",
  "providerMode",
  "nonClaimBoundary",
] as const;

const LOCAL_AUTH_SESSION_REQUIRED_IDENTITY_ARRAYS = [
  "roleRefs",
  "permissionRefs",
  "capabilityRefs",
  "commandRefs",
  "queryRefs",
  "semanticSourceRefs",
  "proofRefs",
] as const;

const LOCAL_AUTH_SESSION_REQUIRED_CHECK_STRINGS = [
  "checkId",
  "identityRef",
  "requestContextKind",
  "permissionRef",
  "tenantBoundaryRef",
  "targetRef",
  "expectedDecision",
  "reasonCode",
  "auditEventRef",
] as const;

const LOCAL_AUTH_SESSION_IDENTITY_FORBIDDEN_FLAGS = [
  ["productionIdentityProviderAllowed", "production-identity-provider-not-authorised"],
  ["liveOAuthOidcAllowed", "live-oauth-oidc-not-authorised"],
  ["credentialsAllowed", "credentials-not-authorised"],
  ["secureStorageClaimAllowed", "secure-storage-claim-not-authorised"],
  ["externalProviderAllowed", "external-provider-not-authorised"],
] as const;

const LOCAL_AUTH_SESSION_REGISTRY_FORBIDDEN_FLAGS = [
  ["productionIdentityProviderAllowed", "production-identity-provider-not-authorised"],
  ["liveOAuthOidcAllowed", "live-oauth-oidc-not-authorised"],
  ["keycloakProviderSetupAllowed", "keycloak-provider-setup-not-authorised"],
  ["credentialsAllowed", "credentials-not-authorised"],
  ["secureStorageClaimAllowed", "secure-storage-claim-not-authorised"],
  ["externalProviderAllowed", "external-provider-not-authorised"],
] as const;

const LOCAL_AUTH_SESSION_FORBIDDEN_KEYS = [
  "oauthClientId",
  "oauthClientSecret",
  "oidcIssuerUrl",
  "keycloakRealm",
  "keycloakClientId",
  "credentialRef",
  "secureStorageProvider",
  "externalIdentityProvider",
  "deploymentRef",
  "stagingRef",
] as const;

export const LOCAL_AUTH_SESSION_DEV_IDENTITY_REGISTRY = {
  artifactId: LOCAL_AUTH_SESSION_DEV_IDENTITY_ARTIFACT_ID,
  ownerIssueId: LOCAL_AUTH_SESSION_DEV_IDENTITY_RULE,
  providerMode: LOCAL_AUTH_SESSION_DEV_IDENTITY_PROVIDER_MODE,
  environment: LOCAL_AUTH_SESSION_DEV_IDENTITY_ENVIRONMENT,
  unknownIdentityPolicy: "fail-closed",
  missingPermissionPolicy: "fail-closed",
  productionIdentityProviderAllowed: false,
  liveOAuthOidcAllowed: false,
  keycloakProviderSetupAllowed: false,
  credentialsAllowed: false,
  secureStorageClaimAllowed: false,
  externalProviderAllowed: false,
  identities: [
    {
      identityId: "identity.dev-local-developer",
      userRef: "user.dev-local-fixture",
      tenantBoundaryRef: "tenant.dev-local-fixture",
      sessionContextRef: "session.dev-local-in-memory",
      roleRefs: ["role.dev-local-developer"],
      permissionRefs: ["developer:read", "developer:key:onboard"],
      capabilityRefs: ["graphql-federation-generated-client-disposition"],
      commandRefs: ["command.onboardApiKey"],
      queryRefs: ["query.developerProfile"],
      semanticSourceRefs: [
        "docs/architecture/app-surface-local-in-memory-runtime.json",
        "docs/architecture/app-surface-shared-client-consumption-path.json",
        "docs/architecture/app-surface-auth-session-security-semantics.json",
        "docs/architecture/shared-client-interaction-contract-semantics.json",
        "docs/architecture/auth-and-identity-standard.md",
        "docs/adr/0010-authorization-policy-decision-point.md",
        "docs/adr/0012-keycloak-sole-idp-and-token-validation.md",
        "docs/architecture/app-surface-command-form-implementation.json",
        "docs/architecture/app-surface-query-list-detail-implementation.json",
        "docs/architecture/app-surface-state-cache-query-client-implementation.json",
      ],
      proofRefs: [
        "docs/architecture/app-surface-auth-session-dev-identity-implementation.json",
        "tests/packages/app-surface-auth-session-dev-identity-implementation.test.ts",
        "tools/validate-app-surface/validate-app-surface.py",
      ],
      providerMode: "in-memory-dev-stub",
      productionIdentityProviderAllowed: false,
      liveOAuthOidcAllowed: false,
      credentialsAllowed: false,
      secureStorageClaimAllowed: false,
      externalProviderAllowed: false,
      nonClaimBoundary: "local dev identity implementation only; not authentication or identity-provider readiness",
    },
  ],
  permissionCheckCases: [
    {
      checkId: "auth-check-developer-profile-query-allowed",
      identityRef: "identity.dev-local-developer",
      requestContextKind: "query",
      permissionRef: "developer:read",
      tenantBoundaryRef: "tenant.dev-local-fixture",
      targetRef: "query.developerProfile",
      expectedDecision: "allow",
      reasonCode: "permission-authorised-by-local-semantic-stub",
      auditEventRef: "client-audit-event-emission",
    },
    {
      checkId: "auth-check-api-key-command-allowed",
      identityRef: "identity.dev-local-developer",
      requestContextKind: "command",
      permissionRef: "developer:key:onboard",
      tenantBoundaryRef: "tenant.dev-local-fixture",
      targetRef: "command.onboardApiKey",
      expectedDecision: "allow",
      reasonCode: "permission-authorised-by-local-semantic-stub",
      auditEventRef: "client-audit-event-emission",
    },
    {
      checkId: "auth-check-missing-permission-denied",
      identityRef: "identity.dev-local-developer",
      requestContextKind: "query",
      permissionRef: "developer:admin",
      tenantBoundaryRef: "tenant.dev-local-fixture",
      targetRef: "query.developerProfile",
      expectedDecision: "deny",
      reasonCode: "permission-semantics-missing-fail-closed",
      auditEventRef: "client-audit-event-emission",
    },
  ],
  nonClaims: {
    authReadiness: false,
    providerReadiness: false,
    identityProviderReadiness: false,
    credentialReadiness: false,
    secureStorageReadiness: false,
    deploymentReadiness: false,
    stagingReadiness: false,
    productionReadiness: false,
    liveProviderReadiness: false,
    privacyCompliance: false,
    humanAcceptance: false,
  },
} as const satisfies LocalAuthSessionDevIdentityRegistry;

const asLocalAuthAuthorityValues = (values: ReadonlySet<string> | readonly string[] | undefined): readonly string[] | undefined => {
  if (values === undefined) {
    return undefined;
  }
  if (Array.isArray(values)) {
    return values;
  }
  return Array.from(values);
};

const localAuthAuthorityHas = (
  values: ReadonlySet<string> | readonly string[] | undefined,
  value: string,
): boolean => {
  if (values === undefined) {
    return false;
  }
  return asLocalAuthAuthorityValues(values)?.includes(value) ?? false;
};

const hasLocalAuthString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const hasLocalAuthStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.length > 0 && value.every((item) => hasLocalAuthString(item));

const localAuthSubject = (mapping: Pick<LocalAuthSessionIdentityMapping, "identityId"> | { readonly identityId?: unknown }): string =>
  hasLocalAuthString(mapping.identityId) ? mapping.identityId : "local-auth-identity";

const validateLocalAuthAuthorityValue = (
  findings: string[],
  subject: string,
  authority: LocalAuthSessionDevIdentityAuthority | undefined,
  authorityKey: keyof LocalAuthSessionDevIdentityAuthority,
  value: string,
  code: string,
): void => {
  if (!localAuthAuthorityHas(authority?.[authorityKey], value)) {
    findings.push(`${subject}:${code}:${value}`);
  }
};

const validateLocalAuthAuthorityArray = (
  findings: string[],
  subject: string,
  authority: LocalAuthSessionDevIdentityAuthority | undefined,
  authorityKey: keyof LocalAuthSessionDevIdentityAuthority,
  values: readonly string[],
  code: string,
): void => {
  for (const value of values) {
    validateLocalAuthAuthorityValue(findings, subject, authority, authorityKey, value, code);
  }
};

export const validateLocalAuthSessionIdentityMapping = (
  identity: LocalAuthSessionIdentityMapping,
  authority?: LocalAuthSessionDevIdentityAuthority,
): string[] => {
  const findings: string[] = [];
  const subject = localAuthSubject(identity);
  const record = identity as unknown as Record<string, unknown>;

  for (const field of LOCAL_AUTH_SESSION_REQUIRED_IDENTITY_STRINGS) {
    if (!hasLocalAuthString(record[field])) {
      findings.push(`${subject}:missing-${field}`);
    }
  }
  for (const field of LOCAL_AUTH_SESSION_REQUIRED_IDENTITY_ARRAYS) {
    if (!hasLocalAuthStringArray(record[field])) {
      findings.push(`${subject}:missing-${field}`);
    }
  }
  if (identity.providerMode !== LOCAL_AUTH_SESSION_DEV_IDENTITY_PROVIDER_MODE) {
    findings.push(`${subject}:providerMode-must-be-in-memory-dev-stub`);
  }
  for (const [field, code] of LOCAL_AUTH_SESSION_IDENTITY_FORBIDDEN_FLAGS) {
    if (record[field] !== false) {
      findings.push(`${subject}:${code}`);
    }
  }
  for (const key of LOCAL_AUTH_SESSION_FORBIDDEN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      findings.push(`${subject}:forbidden-${key}`);
    }
  }
  if (hasLocalAuthString(identity.identityId)) {
    validateLocalAuthAuthorityValue(findings, subject, authority, "identityRefs", identity.identityId, "identity-authority-missing");
  }
  if (hasLocalAuthString(identity.userRef)) {
    validateLocalAuthAuthorityValue(findings, subject, authority, "userRefs", identity.userRef, "user-authority-missing");
  }
  if (hasLocalAuthString(identity.tenantBoundaryRef)) {
    validateLocalAuthAuthorityValue(findings, subject, authority, "tenantBoundaryRefs", identity.tenantBoundaryRef, "tenant-authority-missing");
  }
  if (hasLocalAuthString(identity.sessionContextRef)) {
    validateLocalAuthAuthorityValue(findings, subject, authority, "sessionContextRefs", identity.sessionContextRef, "session-authority-missing");
  }
  if (hasLocalAuthStringArray(identity.roleRefs)) {
    validateLocalAuthAuthorityArray(findings, subject, authority, "roleRefs", identity.roleRefs, "role-authority-missing");
  }
  if (hasLocalAuthStringArray(identity.permissionRefs)) {
    validateLocalAuthAuthorityArray(findings, subject, authority, "permissionRefs", identity.permissionRefs, "permission-authority-missing");
  }
  if (hasLocalAuthStringArray(identity.capabilityRefs)) {
    validateLocalAuthAuthorityArray(findings, subject, authority, "capabilityRefs", identity.capabilityRefs, "capability-authority-missing");
  }
  if (hasLocalAuthStringArray(identity.commandRefs)) {
    validateLocalAuthAuthorityArray(findings, subject, authority, "commandRefs", identity.commandRefs, "command-authority-missing");
  }
  if (hasLocalAuthStringArray(identity.queryRefs)) {
    validateLocalAuthAuthorityArray(findings, subject, authority, "queryRefs", identity.queryRefs, "query-authority-missing");
  }
  if (hasLocalAuthStringArray(identity.semanticSourceRefs)) {
    validateLocalAuthAuthorityArray(findings, subject, authority, "semanticSourceRefs", identity.semanticSourceRefs, "semantic-source-authority-missing");
  }
  if (hasLocalAuthStringArray(identity.proofRefs)) {
    validateLocalAuthAuthorityArray(findings, subject, authority, "proofRefs", identity.proofRefs, "proof-authority-missing");
  }
  return findings;
};

export const validateLocalAuthSessionDevIdentityRegistry = (
  registry: LocalAuthSessionDevIdentityRegistry = LOCAL_AUTH_SESSION_DEV_IDENTITY_REGISTRY,
  authority?: LocalAuthSessionDevIdentityAuthority,
): string[] => {
  const findings: string[] = [];
  const record = registry as unknown as Record<string, unknown>;
  const registrySubject = "local-auth-session-dev-identity-registry";

  if (registry.artifactId !== LOCAL_AUTH_SESSION_DEV_IDENTITY_ARTIFACT_ID) {
    findings.push(`${registrySubject}:artifactId-mismatch`);
  }
  if (registry.ownerIssueId !== LOCAL_AUTH_SESSION_DEV_IDENTITY_RULE) {
    findings.push(`${registrySubject}:ownerIssueId-mismatch`);
  }
  if (registry.providerMode !== LOCAL_AUTH_SESSION_DEV_IDENTITY_PROVIDER_MODE) {
    findings.push(`${registrySubject}:providerMode-must-be-in-memory-dev-stub`);
  }
  if (registry.environment !== LOCAL_AUTH_SESSION_DEV_IDENTITY_ENVIRONMENT) {
    findings.push(`${registrySubject}:environment-must-be-dev-local`);
  }
  if (registry.unknownIdentityPolicy !== "fail-closed") {
    findings.push(`${registrySubject}:unknown-identity-policy-must-fail-closed`);
  }
  if (registry.missingPermissionPolicy !== "fail-closed") {
    findings.push(`${registrySubject}:missing-permission-policy-must-fail-closed`);
  }
  for (const [field, code] of LOCAL_AUTH_SESSION_REGISTRY_FORBIDDEN_FLAGS) {
    if (record[field] !== false) {
      findings.push(`${registrySubject}:${code}`);
    }
  }
  for (const claim of LOCAL_AUTH_SESSION_DEV_IDENTITY_REQUIRED_NON_CLAIMS) {
    if (registry.nonClaims?.[claim] !== false) {
      findings.push(`${registrySubject}:nonclaim-${claim}-must-be-false`);
    }
  }
  if (!Array.isArray(registry.identities) || registry.identities.length === 0) {
    findings.push(`${registrySubject}:missing-identities`);
  }
  const seenIdentities = new Set<string>();
  for (const identity of registry.identities) {
    if (seenIdentities.has(identity.identityId)) {
      findings.push(`${identity.identityId}:duplicate-identityId`);
    }
    seenIdentities.add(identity.identityId);
    findings.push(...validateLocalAuthSessionIdentityMapping(identity, authority));
  }
  if (!Array.isArray(registry.permissionCheckCases) || registry.permissionCheckCases.length === 0) {
    findings.push(`${registrySubject}:missing-permissionCheckCases`);
    return findings;
  }
  let hasAllowCase = false;
  let hasDenyCase = false;
  for (const check of registry.permissionCheckCases) {
    const checkRecord = check as unknown as Record<string, unknown>;
    const subject = hasLocalAuthString(check.checkId) ? check.checkId : "local-auth-permission-check";
    for (const field of LOCAL_AUTH_SESSION_REQUIRED_CHECK_STRINGS) {
      if (!hasLocalAuthString(checkRecord[field])) {
        findings.push(`${subject}:missing-${field}`);
      }
    }
    if (check.expectedDecision === "allow") {
      hasAllowCase = true;
    } else if (check.expectedDecision === "deny") {
      hasDenyCase = true;
    } else {
      findings.push(`${subject}:expectedDecision-must-be-allow-or-deny`);
    }
    if (check.requestContextKind !== "query" && check.requestContextKind !== "command") {
      findings.push(`${subject}:requestContextKind-must-be-query-or-command`);
    }
    validateLocalAuthAuthorityValue(findings, subject, authority, "identityRefs", check.identityRef, "identity-authority-missing");
    if (check.expectedDecision === "allow") {
      validateLocalAuthAuthorityValue(findings, subject, authority, "permissionRefs", check.permissionRef, "permission-authority-missing");
    }
    validateLocalAuthAuthorityValue(findings, subject, authority, "tenantBoundaryRefs", check.tenantBoundaryRef, "tenant-authority-missing");
    validateLocalAuthAuthorityValue(findings, subject, authority, "targetRefs", check.targetRef, "target-authority-missing");
    validateLocalAuthAuthorityValue(findings, subject, authority, "auditEventRefs", check.auditEventRef, "audit-authority-missing");
  }
  if (!hasAllowCase) {
    findings.push(`${registrySubject}:missing-allow-case`);
  }
  if (!hasDenyCase) {
    findings.push(`${registrySubject}:missing-deny-case`);
  }
  return findings;
};

const getLocalAuthIdentity = (identityRef: string): LocalAuthSessionIdentityMapping | undefined =>
  LOCAL_AUTH_SESSION_DEV_IDENTITY_REGISTRY.identities.find((identity) => identity.identityId === identityRef);

export const getLocalAuthSessionIdentityById = (identityRef: string): LocalAuthSessionIdentityMapping => {
  const identity = getLocalAuthIdentity(identityRef);
  if (identity === undefined) {
    throw new Error(`local-auth-identity-unknown:${identityRef}`);
  }
  return identity;
};

export const exerciseLocalAuthPermissionCheck = (
  request: LocalAuthPermissionRequest,
  authority?: LocalAuthSessionDevIdentityAuthority,
): LocalAuthPermissionDecisionResult => {
  const identity = getLocalAuthIdentity(request.identityRef);
  if (identity === undefined) {
    return {
      ...request,
      decision: "deny",
      reasonCode: "identity-semantics-missing-fail-closed",
      providerMode: LOCAL_AUTH_SESSION_DEV_IDENTITY_PROVIDER_MODE,
      environment: LOCAL_AUTH_SESSION_DEV_IDENTITY_ENVIRONMENT,
      auditEventRef: "client-audit-event-emission",
      authReadinessClaimed: false,
      providerReadinessClaimed: false,
      productionIdentityReadinessClaimed: false,
      liveProviderReadinessClaimed: false,
    };
  }
  if (authority === undefined) {
    return {
      ...request,
      decision: "deny",
      reasonCode: "authority-semantics-missing-fail-closed",
      providerMode: LOCAL_AUTH_SESSION_DEV_IDENTITY_PROVIDER_MODE,
      environment: LOCAL_AUTH_SESSION_DEV_IDENTITY_ENVIRONMENT,
      auditEventRef: "client-audit-event-emission",
      authReadinessClaimed: false,
      providerReadinessClaimed: false,
      productionIdentityReadinessClaimed: false,
      liveProviderReadinessClaimed: false,
    };
  }
  const identityFindings = validateLocalAuthSessionIdentityMapping(identity, authority);
  if (identityFindings.length > 0) {
    return {
      ...request,
      decision: "deny",
      reasonCode: "identity-semantics-invalid-fail-closed",
      providerMode: LOCAL_AUTH_SESSION_DEV_IDENTITY_PROVIDER_MODE,
      environment: LOCAL_AUTH_SESSION_DEV_IDENTITY_ENVIRONMENT,
      auditEventRef: "client-audit-event-emission",
      authReadinessClaimed: false,
      providerReadinessClaimed: false,
      productionIdentityReadinessClaimed: false,
      liveProviderReadinessClaimed: false,
    };
  }
  if (identity.userRef !== request.userRef) {
    return {
      ...request,
      decision: "deny",
      reasonCode: "user-context-mismatch-fail-closed",
      providerMode: LOCAL_AUTH_SESSION_DEV_IDENTITY_PROVIDER_MODE,
      environment: LOCAL_AUTH_SESSION_DEV_IDENTITY_ENVIRONMENT,
      auditEventRef: "client-audit-event-emission",
      authReadinessClaimed: false,
      providerReadinessClaimed: false,
      productionIdentityReadinessClaimed: false,
      liveProviderReadinessClaimed: false,
    };
  }
  if (identity.tenantBoundaryRef !== request.tenantBoundaryRef) {
    return {
      ...request,
      decision: "deny",
      reasonCode: "tenant-context-mismatch-fail-closed",
      providerMode: LOCAL_AUTH_SESSION_DEV_IDENTITY_PROVIDER_MODE,
      environment: LOCAL_AUTH_SESSION_DEV_IDENTITY_ENVIRONMENT,
      auditEventRef: "client-audit-event-emission",
      authReadinessClaimed: false,
      providerReadinessClaimed: false,
      productionIdentityReadinessClaimed: false,
      liveProviderReadinessClaimed: false,
    };
  }
  if (!localAuthAuthorityHas(authority?.permissionRefs, request.permissionRef) || !identity.permissionRefs.includes(request.permissionRef)) {
    return {
      ...request,
      decision: "deny",
      reasonCode: "permission-semantics-missing-fail-closed",
      providerMode: LOCAL_AUTH_SESSION_DEV_IDENTITY_PROVIDER_MODE,
      environment: LOCAL_AUTH_SESSION_DEV_IDENTITY_ENVIRONMENT,
      auditEventRef: "client-audit-event-emission",
      authReadinessClaimed: false,
      providerReadinessClaimed: false,
      productionIdentityReadinessClaimed: false,
      liveProviderReadinessClaimed: false,
    };
  }
  if (!localAuthAuthorityHas(authority?.targetRefs, request.targetRef)) {
    return {
      ...request,
      decision: "deny",
      reasonCode: "target-semantics-missing-fail-closed",
      providerMode: LOCAL_AUTH_SESSION_DEV_IDENTITY_PROVIDER_MODE,
      environment: LOCAL_AUTH_SESSION_DEV_IDENTITY_ENVIRONMENT,
      auditEventRef: "client-audit-event-emission",
      authReadinessClaimed: false,
      providerReadinessClaimed: false,
      productionIdentityReadinessClaimed: false,
      liveProviderReadinessClaimed: false,
    };
  }
  if (request.requestContextKind === "query" && !identity.queryRefs.includes(request.targetRef)) {
    return {
      ...request,
      decision: "deny",
      reasonCode: "query-context-missing-fail-closed",
      providerMode: LOCAL_AUTH_SESSION_DEV_IDENTITY_PROVIDER_MODE,
      environment: LOCAL_AUTH_SESSION_DEV_IDENTITY_ENVIRONMENT,
      auditEventRef: "client-audit-event-emission",
      authReadinessClaimed: false,
      providerReadinessClaimed: false,
      productionIdentityReadinessClaimed: false,
      liveProviderReadinessClaimed: false,
    };
  }
  if (request.requestContextKind === "command" && !identity.commandRefs.includes(request.targetRef)) {
    return {
      ...request,
      decision: "deny",
      reasonCode: "command-context-missing-fail-closed",
      providerMode: LOCAL_AUTH_SESSION_DEV_IDENTITY_PROVIDER_MODE,
      environment: LOCAL_AUTH_SESSION_DEV_IDENTITY_ENVIRONMENT,
      auditEventRef: "client-audit-event-emission",
      authReadinessClaimed: false,
      providerReadinessClaimed: false,
      productionIdentityReadinessClaimed: false,
      liveProviderReadinessClaimed: false,
    };
  }
  return {
    ...request,
    decision: "allow",
    reasonCode: "permission-authorised-by-local-semantic-stub",
    providerMode: LOCAL_AUTH_SESSION_DEV_IDENTITY_PROVIDER_MODE,
    environment: LOCAL_AUTH_SESSION_DEV_IDENTITY_ENVIRONMENT,
    auditEventRef: "client-audit-event-emission",
    authReadinessClaimed: false,
    providerReadinessClaimed: false,
    productionIdentityReadinessClaimed: false,
    liveProviderReadinessClaimed: false,
  };
};
