export type SharedClientBehaviourClass =
  | "commands"
  | "queries"
  | "workflows"
  | "events"
  | "validation"
  | "permissions"
  | "audit-events"
  | "errors"
  | "privacy-classification"
  | "telemetry"
  | "offline-envelopes-and-retries"
  | "cache-semantics"
  | "subscriptions";

export type SharedClientGeneratedClientCurrentness = {
  semanticInputHashRef: string;
  provenanceRef: string;
  freshnessRef: string;
  validatorEvidenceRef: string;
  currentWithSemanticInputs: boolean;
};

export type SharedClientOfflineRetryCachePosture = {
  offlineAllowed: boolean;
  retryAllowed: boolean;
  cacheSemanticsRef: string;
  tenantIsolationRequired: boolean;
};

export type SharedClientConsumptionMapping = {
  mappingId: string;
  semanticContractId: string;
  interfaceContractId: string;
  behaviourClass: SharedClientBehaviourClass;
  capabilityId: string;
  commandOrQueryOrWorkflowOrEventId: string;
  permissionRefs: string[];
  validationRefs: string[];
  errorRefs: string[];
  auditEventRefs: string[];
  privacyCategoryRefs: string[];
  telemetryRefs: string[];
  offlineRetryCachePosture: SharedClientOfflineRetryCachePosture;
  proofRefs: string[];
  nonClaimBoundary: string;
};

export type SharedClientUiOnlyBehaviourPolicy = {
  uiOnlyBehaviourAllowed: false;
  rejectedInputs: string[];
};

export type SharedClientConsumptionPath = {
  artifactId: string;
  ownerIssueId: string;
  generatedClient: SharedClientGeneratedClientCurrentness;
  mappings: SharedClientConsumptionMapping[];
  uiOnlyBehaviourPolicy: SharedClientUiOnlyBehaviourPolicy;
  nonClaims: Record<string, boolean>;
};

export type SharedClientValidationResult = {
  ok: boolean;
  findings: string[];
};

const ALLOWED_BEHAVIOUR_CLASSES = new Set<SharedClientBehaviourClass>([
  "commands",
  "queries",
  "workflows",
  "events",
  "validation",
  "permissions",
  "audit-events",
  "errors",
  "privacy-classification",
  "telemetry",
  "offline-envelopes-and-retries",
  "cache-semantics",
  "subscriptions",
]);

const REQUIRED_MAPPING_FIELDS = [
  "semanticContractId",
  "interfaceContractId",
  "behaviourClass",
  "capabilityId",
  "commandOrQueryOrWorkflowOrEventId",
  "permissionRefs",
  "validationRefs",
  "errorRefs",
  "auditEventRefs",
  "privacyCategoryRefs",
  "telemetryRefs",
  "offlineRetryCachePosture",
  "proofRefs",
  "nonClaimBoundary",
] as const;

const REQUIRED_GENERATED_CLIENT_FIELDS = [
  "semanticInputHashRef",
  "provenanceRef",
  "freshnessRef",
  "validatorEvidenceRef",
] as const;

const FORBIDDEN_UI_ONLY_KEYS = [
  "uiOnlyBehaviour",
  "uiOnlyBehavior",
  "presentationOnlyBehaviour",
  "presentationOnlyBehavior",
  "inventedBehaviour",
  "inventedBehavior",
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

function addMissingStringFinding(findings: string[], subject: string, field: string): void {
  findings.push(`${subject}:missing-${field}`);
}

function validateGeneratedClientCurrentness(
  generatedClient: SharedClientGeneratedClientCurrentness | unknown,
): string[] {
  const findings: string[] = [];
  if (!isRecord(generatedClient)) {
    return ["generated-client:missing"];
  }
  for (const field of REQUIRED_GENERATED_CLIENT_FIELDS) {
    if (!isNonEmptyString(generatedClient[field])) {
      addMissingStringFinding(findings, "generated-client", field);
    }
  }
  if (generatedClient.currentWithSemanticInputs !== true) {
    findings.push("generated-client:stale-or-not-current-with-semantic-inputs");
  }
  return findings;
}

function validateOfflineRetryCachePosture(value: unknown, mappingId: string): string[] {
  const findings: string[] = [];
  if (!isRecord(value)) {
    return [`${mappingId}:missing-offlineRetryCachePosture`];
  }
  if (typeof value.offlineAllowed !== "boolean") {
    findings.push(`${mappingId}:missing-offlineAllowed`);
  }
  if (typeof value.retryAllowed !== "boolean") {
    findings.push(`${mappingId}:missing-retryAllowed`);
  }
  if (!isNonEmptyString(value.cacheSemanticsRef)) {
    findings.push(`${mappingId}:missing-cacheSemanticsRef`);
  }
  if (value.tenantIsolationRequired !== true) {
    findings.push(`${mappingId}:missing-tenantIsolationRequired`);
  }
  return findings;
}

function validateMapping(mapping: SharedClientConsumptionMapping | unknown, index: number): string[] {
  const findings: string[] = [];
  if (!isRecord(mapping)) {
    return [`mapping-${index}:missing`];
  }
  const mappingId = isNonEmptyString(mapping.mappingId) ? mapping.mappingId : `mapping-${index}`;
  for (const field of REQUIRED_MAPPING_FIELDS) {
    const value = mapping[field];
    if (field.endsWith("Refs")) {
      if (!hasNonEmptyStringArray(value)) {
        findings.push(`${mappingId}:missing-${field}`);
      }
    } else if (field === "offlineRetryCachePosture") {
      findings.push(...validateOfflineRetryCachePosture(value, mappingId));
    } else if (field === "behaviourClass") {
      if (!ALLOWED_BEHAVIOUR_CLASSES.has(value as SharedClientBehaviourClass)) {
        findings.push(`${mappingId}:unknown-behaviourClass`);
      }
    } else if (!isNonEmptyString(value)) {
      findings.push(`${mappingId}:missing-${field}`);
    }
  }
  for (const key of FORBIDDEN_UI_ONLY_KEYS) {
    if (key in mapping) {
      findings.push(`${mappingId}:ui-only-behaviour-not-authorised`);
    }
  }
  return findings;
}

function validateUiOnlyBehaviourPolicy(value: unknown): string[] {
  if (!isRecord(value)) {
    return ["ui-only-policy:missing"];
  }
  const findings: string[] = [];
  if (value.uiOnlyBehaviourAllowed !== false) {
    findings.push("ui-only-policy:behaviour-must-be-rejected");
  }
  if (!hasNonEmptyStringArray(value.rejectedInputs)) {
    findings.push("ui-only-policy:missing-rejected-inputs");
  }
  return findings;
}

function validateNonClaims(nonClaims: unknown): string[] {
  if (!isRecord(nonClaims)) {
    return ["non-claims:missing"];
  }
  return Object.entries(nonClaims)
    .filter(([, value]) => value !== false)
    .map(([key]) => `non-claims:${key}-overclaimed`);
}

export function validateSharedClientConsumptionPath(
  path: SharedClientConsumptionPath,
): SharedClientValidationResult {
  const findings: string[] = [];
  if (!isRecord(path)) {
    return { ok: false, findings: ["shared-client-consumption-path:missing"] };
  }
  if (path.ownerIssueId !== "USF-1015") {
    findings.push("shared-client-consumption-path:unexpected-owner-issue");
  }
  findings.push(...validateGeneratedClientCurrentness(path.generatedClient));
  if (!Array.isArray(path.mappings) || path.mappings.length === 0) {
    findings.push("mappings:missing");
  } else {
    path.mappings.forEach((mapping, index) => {
      findings.push(...validateMapping(mapping, index));
    });
  }
  findings.push(...validateUiOnlyBehaviourPolicy(path.uiOnlyBehaviourPolicy));
  findings.push(...validateNonClaims(path.nonClaims));
  return { ok: findings.length === 0, findings };
}

export function assertSharedClientConsumptionPath(path: SharedClientConsumptionPath): void {
  const result = validateSharedClientConsumptionPath(path);
  if (!result.ok) {
    throw new Error(`shared-client-consumption-path-invalid:${result.findings.join(",")}`);
  }
}
