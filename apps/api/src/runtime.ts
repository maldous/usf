import { InMemoryEventBus } from "@foundation/adapter-bus";
import { InMemoryIdentityProvider } from "@foundation/adapter-idp";
import { InMemoryMailProvider } from "@foundation/adapter-mail";
import { CapturedObservabilitySink } from "@foundation/adapter-obs";
import { InMemorySecretStore } from "@foundation/adapter-secrets";
import { InMemoryObjectStore } from "@foundation/adapter-store";
import { InMemoryWorkflowEngine } from "@foundation/adapter-wf";
import {
  InMemoryAuditEventStore,
  InMemoryAuditLedger,
  createAuditQueryService,
  createAuditRecorder,
  type AuditEventRecorder,
  type AuditQueryService,
} from "@foundation/capability-audit";
import { createAuthService, type AuthService } from "@foundation/capability-auth";
import {
  BreakGlassRegistry,
  InMemoryTenantMembershipDirectory,
  createAuthorizer,
  createPolicyDecisionPoint,
  type Authorizer,
} from "@foundation/capability-tenant";
import type { PolicyDecisionPoint } from "@foundation/ports";
import {
  InMemoryConfigLayerProvider,
  InMemoryConfigProvider,
  InMemoryFeatureFlagSource,
  createConfigService,
  createSecretService,
  devProviderPlan,
  type ConfigService,
  type SecretService,
} from "@foundation/capability-config";
import { FileCapability } from "@foundation/capability-files";
import { JobCapability } from "@foundation/capability-jobs";
import { NotificationCapability } from "@foundation/capability-notify";

export const DEV_PROVIDER_MODE_LABEL = "dev in-memory";

export interface DevRuntime {
  readonly providerModeLabel: typeof DEV_PROVIDER_MODE_LABEL;
  readonly providerClass: "hermetic-mock";
  readonly environment: "local";
  readonly providers: Readonly<Record<string, string>>;
  readonly auditLedger: InMemoryAuditLedger;
  readonly authService: AuthService;
  readonly config: InMemoryConfigProvider;
  readonly eventBus: InMemoryEventBus;
  readonly fileCapability: FileCapability;
  readonly jobCapability: JobCapability;
  readonly notificationCapability: NotificationCapability;
  readonly observability: CapturedObservabilitySink;
  readonly secrets: InMemorySecretStore;
  readonly membershipDirectory: InMemoryTenantMembershipDirectory;
  readonly breakGlass: BreakGlassRegistry;
  readonly pdp: PolicyDecisionPoint;
  readonly authorizer: Authorizer;
  readonly auditEvents: InMemoryAuditEventStore;
  readonly auditRecorder: AuditEventRecorder;
  readonly auditQuery: AuditQueryService;
  readonly configService: ConfigService;
  readonly secretService: SecretService;
}

export const DEV_TENANT_ID = "dev-tenant";
export const DEV_ACTOR_ID = "dev-actor";

export function createDevRuntime(): DevRuntime {
  const auditLedger = new InMemoryAuditLedger();
  const identityProvider = new InMemoryIdentityProvider();
  const eventBus = new InMemoryEventBus();
  const config = new InMemoryConfigProvider();
  const workflowEngine = new InMemoryWorkflowEngine();
  const objectStore = new InMemoryObjectStore();
  const mailProvider = new InMemoryMailProvider();
  const observability = new CapturedObservabilitySink();
  const secrets = new InMemorySecretStore();

  const membershipDirectory = new InMemoryTenantMembershipDirectory();
  membershipDirectory.upsert({
    membershipId: "membership_dev",
    tenantId: DEV_TENANT_ID,
    actorId: DEV_ACTOR_ID,
    status: "active",
    roles: ["tenant-admin"],
  });
  const breakGlass = new BreakGlassRegistry();
  const pdp = createPolicyDecisionPoint({ memberships: membershipDirectory, breakGlass });
  const auditEvents = new InMemoryAuditEventStore();
  const auditRecorder = createAuditRecorder({ ledger: auditEvents, component: "api" });
  const authorizer = createAuthorizer({ pdp, auditLedger, audit: auditRecorder });
  const auditQuery = createAuditQueryService({ ledger: auditEvents, pdp, recorder: auditRecorder });

  const configLayers = new InMemoryConfigLayerProvider();
  configLayers.setLayer({ key: "environment.name", scope: "environment", value: "local-dev" });
  const flagSource = new InMemoryFeatureFlagSource();
  flagSource.set({ tenantId: DEV_TENANT_ID, flagKey: "audit-retrieval-ui", value: true });
  const configService = createConfigService({
    layerProvider: configLayers,
    flagSource,
    pdp,
    audit: auditRecorder,
  });
  // Dev-only seed secret (a synthetic local value, never a real credential).
  void secrets.writeSecret({
    tenantId: DEV_TENANT_ID,
    name: "mail-api-key",
    value: "dev-local-only",
  });
  const secretService = createSecretService({ resolver: secrets, pdp, audit: auditRecorder });

  return {
    providerModeLabel: DEV_PROVIDER_MODE_LABEL,
    providerClass: "hermetic-mock",
    environment: "local",
    providers: devProviderPlan,
    auditLedger,
    authService: createAuthService({ auditLedger, identityProvider }),
    config,
    eventBus,
    fileCapability: new FileCapability(objectStore),
    jobCapability: new JobCapability(workflowEngine),
    notificationCapability: new NotificationCapability(mailProvider),
    observability,
    secrets,
    membershipDirectory,
    breakGlass,
    pdp,
    authorizer,
    auditEvents,
    auditRecorder,
    auditQuery,
    configService,
    secretService,
  };
}
