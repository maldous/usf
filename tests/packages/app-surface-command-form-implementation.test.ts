import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LOCAL_COMMAND_FORM_REGISTRY,
  exerciseLocalCommandForm,
  getLocalCommandFormById,
  validateLocalCommandFormRegistry,
  type LocalAppSurfaceRuntimeDefinition,
  type LocalCommandFormMapping,
  type LocalCommandFormRegistry,
  type LocalCommandFormSemanticAuthority,
} from "@foundation/app-surface";
import type { SharedClientConsumptionPath } from "@foundation/client";

type CommandFormImplementation = {
  ownerIssueId: string;
  implementedCommands: Array<{
    formId: string;
    commandRef: string;
    capabilityId: string;
    permissionRefs: string[];
    tenantBoundaryRef: string;
    validationRefs: string[];
    errorRefs: string[];
    auditEventRefs: string[];
    idempotencyBoundaryRef: string;
    uiOnlyBusinessRulesAllowed: false;
  }>;
  validationGuard: Record<string, boolean>;
  nonClaims: Record<string, boolean>;
};

type CommandFixture = {
  fixtureId: string;
  targetRuleId: string;
  ownerIssueId: string;
  expectedFailureRuleId?: string;
  command: {
    commandRef?: string;
    validationModelRef?: string;
    auditEventRef?: string;
    errorModelRef?: string;
    permissionRefs?: string[];
    idempotencyBoundaryRef?: string;
  };
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ids(values: Array<{ id: string }>): Set<string> {
  return new Set(values.map((value) => value.id));
}

function buildAuthority(): LocalCommandFormSemanticAuthority {
  const runtime = readJson<LocalAppSurfaceRuntimeDefinition>(
    "docs/architecture/app-surface-local-in-memory-runtime.json",
  );
  const sharedClient = readJson<SharedClientConsumptionPath>(
    "docs/architecture/app-surface-shared-client-consumption-path.json",
  );
  const conforming = readJson<CommandFixture>(
    "tools/validate-app-surface/fixtures/conforming/003-command-form-with-validation-audit.json",
  );
  const commandMappings = sharedClient.mappings.filter((mapping) => mapping.behaviourClass === "commands");
  const componentFixtureIds = new Set(runtime.componentFixtures.map((fixture) => fixture.fixtureId));
  const commandRefs = ids(runtime.semanticInputs.commands);
  const capabilityIds = ids(runtime.semanticInputs.capabilities);
  const permissionIds = ids(runtime.semanticInputs.permissions);
  const tenantBoundaryIds = ids(runtime.semanticInputs.tenantContexts);
  const validationIds = ids(runtime.semanticInputs.validationRules);
  const errorIds = ids(runtime.semanticInputs.errorRefs);
  const auditEventIds = ids(runtime.semanticInputs.auditEvents);

  for (const mapping of commandMappings) {
    commandRefs.add(mapping.commandOrQueryOrWorkflowOrEventId);
    capabilityIds.add(mapping.capabilityId);
    mapping.permissionRefs.forEach((ref) => permissionIds.add(ref));
    mapping.validationRefs.forEach((ref) => validationIds.add(ref));
    mapping.errorRefs.forEach((ref) => errorIds.add(ref));
    mapping.auditEventRefs.forEach((ref) => auditEventIds.add(ref));
  }

  return {
    commandRefs,
    capabilityIds,
    permissionIds,
    tenantBoundaryIds,
    validationIds,
    errorIds,
    auditEventIds,
    componentFixtureIds,
    idempotencyBoundaryRefs: new Set([conforming.command.idempotencyBoundaryRef ?? ""]),
    semanticSourceRefs: new Set([
      "docs/architecture/app-surface-local-in-memory-runtime.json",
      "docs/architecture/app-surface-shared-client-consumption-path.json",
      "docs/architecture/shared-client-interaction-contract-semantics.json",
      "tools/validate-app-surface/fixtures/conforming/003-command-form-with-validation-audit.json",
    ]),
    proofRefs: new Set([
      "tests/packages/app-surface-command-form-implementation.test.ts",
      "tools/validate-app-surface/validate-app-surface.py",
    ]),
  };
}

const implementation = readJson<CommandFormImplementation>(
  "docs/architecture/app-surface-command-form-implementation.json",
);
const conformingCommandFixture = readJson<CommandFixture>(
  "tools/validate-app-surface/fixtures/conforming/003-command-form-with-validation-audit.json",
);
const plantedCommandFixture = readJson<CommandFixture>(
  "tools/validate-app-surface/planted-defects/003-command-form-missing-validation-audit.json",
);
const semanticAuthority = buildAuthority();

describe("USF-1021 command and form implementation", () => {
  it("maps command forms to semantic command authority", () => {
    const validation = validateLocalCommandFormRegistry(LOCAL_COMMAND_FORM_REGISTRY, semanticAuthority);

    expect(validation).toEqual({ ok: true, findings: [] });
    expect(implementation.ownerIssueId).toBe("USF-1021");
    expect(implementation.implementedCommands.map((command) => command.formId)).toEqual(
      LOCAL_COMMAND_FORM_REGISTRY.commands.map((command) => command.formId),
    );
  });

  it("exercises the local command form without server mutation or external submission", () => {
    const commandForm = getLocalCommandFormById("command-form-api-key-onboarding");
    const outcome = exerciseLocalCommandForm(commandForm, semanticAuthority);

    expect(outcome).toMatchObject({
      formId: "command-form-api-key-onboarding",
      commandRef: "command.onboardApiKey",
      providerMode: "in-memory-only",
      externalSubmissionUsed: false,
      serverMutationProviderUsed: false,
      uiOnlyBusinessRulesUsed: false,
      stagingUsed: false,
      deploymentUsed: false,
    });
    expect(outcome.permissionRefsChecked).toContain("developer:key:onboard");
    expect(outcome.auditEventRefsEmitted).toContain("graphql.onboardApiKey");
  });

  it("fails closed when command authority is missing", () => {
    const registry = clone(LOCAL_COMMAND_FORM_REGISTRY) as LocalCommandFormRegistry;
    registry.commands[0]!.commandRef = "command.missing";

    const validation = validateLocalCommandFormRegistry(registry, semanticAuthority);

    expect(validation.ok).toBe(false);
    expect(validation.findings).toContain("command-form-api-key-onboarding:command-authority-missing:command.missing");
  });

  it("fails closed when validation and audit mappings are missing", () => {
    const registry = clone(LOCAL_COMMAND_FORM_REGISTRY) as LocalCommandFormRegistry;
    registry.commands[0]!.validationRefs = [];
    registry.commands[0]!.auditEventRefs = [];

    const validation = validateLocalCommandFormRegistry(registry, semanticAuthority);

    expect(validation.ok).toBe(false);
    expect(validation.findings).toEqual(
      expect.arrayContaining([
        "command-form-api-key-onboarding:missing-validationRefs",
        "command-form-api-key-onboarding:missing-auditEventRefs",
      ]),
    );
  });

  it("rejects UI-only business rules", () => {
    const registry = clone(LOCAL_COMMAND_FORM_REGISTRY) as LocalCommandFormRegistry;
    const command = registry.commands[0] as unknown as Record<string, unknown>;
    command.uiOnlyBusinessRulesAllowed = true;

    const validation = validateLocalCommandFormRegistry(registry, semanticAuthority);

    expect(validation.ok).toBe(false);
    expect(validation.findings).toContain("command-form-api-key-onboarding:ui-only-business-rules-not-authorised");
  });

  it("fails closed for unknown command forms", () => {
    expect(getLocalCommandFormById("command-form-api-key-onboarding").commandRef).toBe("command.onboardApiKey");
    expect(() => getLocalCommandFormById("command-form-missing")).toThrow("command-form-unknown:command-form-missing");
  });

  it("fails closed when a semantically valid command form is not registered", () => {
    const commandForm = clone(LOCAL_COMMAND_FORM_REGISTRY.commands[0]!) as LocalCommandFormMapping;
    commandForm.formId = "command-form-unregistered";

    expect(() => exerciseLocalCommandForm(commandForm, semanticAuthority)).toThrow(
      "command-form-unregistered:command-form-unregistered",
    );
  });

  it("satisfies USF-931-style command form validator expectations", () => {
    expect(conformingCommandFixture).toMatchObject({
      fixtureId: "command-form-with-validation-audit",
      targetRuleId: "USF-APP-SURFACE-VALIDATOR-003",
      ownerIssueId: "USF-931",
    });
    expect(conformingCommandFixture.command.commandRef).toBeTruthy();
    expect(conformingCommandFixture.command.validationModelRef).toBeTruthy();
    expect(conformingCommandFixture.command.auditEventRef).toBeTruthy();
    expect(conformingCommandFixture.command.errorModelRef).toBeTruthy();
    expect(conformingCommandFixture.command.permissionRefs?.length).toBeGreaterThan(0);
    expect(conformingCommandFixture.command.idempotencyBoundaryRef).toBeTruthy();

    expect(plantedCommandFixture).toMatchObject({
      fixtureId: "command-form-missing-validation-audit",
      targetRuleId: "USF-APP-SURFACE-VALIDATOR-003",
      ownerIssueId: "USF-931",
      expectedFailureRuleId: "USF-APP-SURFACE-VALIDATOR-003",
    });
    expect(plantedCommandFixture.command.validationModelRef).toBeUndefined();
    expect(plantedCommandFixture.command.auditEventRef).toBeUndefined();
  });

  it("preserves proof references and non-claims", () => {
    for (const command of LOCAL_COMMAND_FORM_REGISTRY.commands) {
      for (const proofRef of command.proofRefs) {
        expect(existsSync(proofRef), proofRef).toBe(true);
      }
    }
    expect(Object.values(implementation.validationGuard)).toEqual(
      Array.from({ length: Object.values(implementation.validationGuard).length }, () => true),
    );
    expect(Object.values(implementation.nonClaims)).toEqual(
      Array.from({ length: Object.values(implementation.nonClaims).length }, () => false),
    );
  });
});
