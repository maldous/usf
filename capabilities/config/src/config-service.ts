import {
  createAuditEventDraft,
  detectConfigDrift,
  evaluateFeatureFlag,
  redactConfigMap,
  resolveConfigValue,
  stableId,
  type AuthorizationRequest,
  type ConfigDriftFinding,
  type ConfigKeyDefinition,
  type ConfigLayer,
  type ConfigScope,
  type TenantContext,
} from "@foundation/core";
import type {
  AuditRecorder,
  ConfigLayerProvider,
  FeatureFlagSource,
  PolicyDecisionPoint,
} from "@foundation/ports";
import { CONFIG_REGISTRY, configDefinition, featureFlagDefinition } from "./registry.ts";

const COMPONENT = "config-service";

export class ConfigAccessDeniedError extends Error {
  readonly reasonCode: string;
  constructor(reasonCode: string) {
    super("Not authorized");
    this.name = "ConfigAccessDeniedError";
    this.reasonCode = reasonCode;
  }
}

// In-memory config layers seeded from the registry compiled defaults. Tests/dev may
// add environment/deployment/tenant/runtime layers; precedence + override policy are
// enforced by resolveConfigValue in core.
export class InMemoryConfigLayerProvider implements ConfigLayerProvider {
  // key -> (tenantId|"*") -> layers
  readonly #layers = new Map<string, ConfigLayer[]>();

  setLayer(input: { key: string; scope: ConfigScope; value: string; tenantId?: string }): void {
    const mapKey = `${input.tenantId ?? "*"}::${input.key}`;
    const list = this.#layers.get(mapKey) ?? [];
    list.push({ scope: input.scope, value: input.value });
    this.#layers.set(mapKey, list);
  }

  layers(input: { tenantId: string; key: string }): readonly ConfigLayer[] {
    return [
      ...(this.#layers.get(`*::${input.key}`) ?? []),
      ...(this.#layers.get(`${input.tenantId}::${input.key}`) ?? []),
    ];
  }
}

export class InMemoryFeatureFlagSource implements FeatureFlagSource {
  readonly #values = new Map<string, boolean>();

  set(input: { tenantId: string; flagKey: string; value: boolean }): void {
    this.#values.set(`${input.tenantId}::${input.flagKey}`, input.value);
  }

  flagValue(input: { tenantId: string; flagKey: string }): boolean | undefined {
    return this.#values.get(`${input.tenantId}::${input.flagKey}`);
  }
}

export interface ConfigService {
  get(context: TenantContext, key: string): Promise<string | number | boolean>;
  list(context: TenantContext): Promise<Readonly<Record<string, string>>>;
  evaluateFlag(context: TenantContext, flagKey: string): Promise<boolean>;
  validateStartup(): { ok: boolean; findings: readonly string[] };
  detectDrift(
    providedKeys: readonly { key: string; scope: ConfigScope }[],
  ): readonly ConfigDriftFinding[];
}

function readAction(def: ConfigKeyDefinition): string {
  return def.classification === "provider-config" ? "provider.config.read" : "config.read";
}

export function createConfigService(deps: {
  readonly layerProvider: ConfigLayerProvider;
  readonly flagSource: FeatureFlagSource;
  readonly pdp: PolicyDecisionPoint;
  readonly audit: AuditRecorder;
  readonly registry?: readonly ConfigKeyDefinition[];
}): ConfigService {
  const registry = deps.registry ?? CONFIG_REGISTRY;
  let counter = 0;
  const nextId = (kind: string, context: TenantContext): string =>
    stableId("evt", [context.tenantId, context.actorId, kind, String(counter++)]);

  function authzRequest(context: TenantContext, action: string, key: string): AuthorizationRequest {
    return {
      context,
      action,
      // Config access is governed by the explicit config.* RBAC permissions (not ABAC
      // escalation); secret VALUES are never returned here regardless.
      resource: { type: "config-key", id: key, tenantId: context.tenantId, attributes: {} },
      requestContext: {
        correlation_id: stableId("corr", [context.tenantId, context.actorId, "config"]),
      },
    };
  }

  async function audit(
    context: TenantContext,
    fields: {
      eventType: string;
      action: string;
      outcome: "success" | "denied" | "failed";
      reasonCode: string;
      subjectId: string;
      severity?: "debug" | "info" | "notice" | "warning" | "high";
      metadata?: Record<string, string>;
    },
  ): Promise<void> {
    await deps.audit.record(
      createAuditEventDraft({
        eventId: nextId(fields.eventType, context),
        eventType: fields.eventType,
        category: "configuration",
        tenantId: context.tenantId,
        actorId: context.actorId,
        action: fields.action,
        outcome: fields.outcome,
        reasonCode: fields.reasonCode,
        subjectType: "config-key",
        subjectId: fields.subjectId,
        resourceType: "config-key",
        resourceId: fields.subjectId,
        recordedByComponent: COMPONENT,
        ...(fields.severity ? { severity: fields.severity } : {}),
        ...(fields.metadata ? { metadata: fields.metadata } : {}),
      }),
    );
  }

  async function permit(context: TenantContext, def: ConfigKeyDefinition): Promise<boolean> {
    const action = readAction(def);
    const decision = deps.pdp.decide(authzRequest(context, action, def.key));
    if (decision.effect !== "permit") {
      await audit(context, {
        eventType: "config.denied",
        action,
        outcome: "denied",
        reasonCode: decision.reasonCode,
        subjectId: def.key,
        severity: "warning",
      });
      return false;
    }
    return true;
  }

  return {
    async get(context, key) {
      const def = configDefinition(key);
      if (!def) {
        // Unknown config key fails closed (not in the registry).
        await audit(context, {
          eventType: "config.validation_failed",
          action: "config.read",
          outcome: "failed",
          reasonCode: "unknown-key",
          subjectId: key,
          severity: "high",
        });
        throw new ConfigAccessDeniedError("unknown-key");
      }
      if (!(await permit(context, def))) {
        throw new ConfigAccessDeniedError("config-read-denied");
      }
      const value = resolveConfigValue(
        def,
        deps.layerProvider.layers({ tenantId: context.tenantId, key }),
      );
      await audit(context, {
        eventType: "config.read",
        action: readAction(def),
        outcome: "success",
        reasonCode: "ok",
        subjectId: key,
        metadata: { classification: def.classification },
      });
      return value;
    },

    async list(context) {
      const out: Record<string, string> = {};
      for (const def of registry) {
        const action = readAction(def);
        const decision = deps.pdp.decide(authzRequest(context, action, def.key));
        if (decision.effect !== "permit") {
          continue; // non-enumerating: skip keys the actor may not read
        }
        const value = resolveConfigValue(
          def,
          deps.layerProvider.layers({ tenantId: context.tenantId, key: def.key }),
        );
        out[def.key] = String(value);
      }
      await audit(context, {
        eventType: "config.read",
        action: "config.read",
        outcome: "success",
        reasonCode: "list",
        subjectId: "all",
        metadata: { count: String(Object.keys(out).length) },
      });
      // Redaction backstop: secret-like keys/values are masked even though config
      // never holds raw secret values (defence in depth).
      return redactConfigMap(out);
    },

    async evaluateFlag(context, flagKey) {
      const def = featureFlagDefinition(flagKey);
      const value = deps.flagSource.flagValue({ tenantId: context.tenantId, flagKey });
      const result = evaluateFeatureFlag(def, value);
      await audit(context, {
        eventType: "feature_flag.evaluated",
        action: "config.read",
        outcome: "success",
        reasonCode: result ? "on" : "off",
        subjectId: flagKey,
        severity: "debug",
        metadata: { result: String(result), known: String(Boolean(def)) },
      });
      return result;
    },

    validateStartup() {
      const findings: string[] = [];
      for (const def of registry) {
        try {
          // Validate the compiled/repository default resolves and type-checks.
          const layers: ConfigLayer[] =
            def.defaultValue !== null
              ? [{ scope: "compiled-default", value: def.defaultValue }]
              : [];
          resolveConfigValue(def, layers);
        } catch (error) {
          findings.push(error instanceof Error ? error.message : `invalid:${def.key}`);
        }
      }
      return { ok: findings.length === 0, findings };
    },

    detectDrift(providedKeys) {
      return detectConfigDrift(registry, providedKeys);
    },
  };
}
