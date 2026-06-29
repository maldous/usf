import { InMemoryEventBus } from "@foundation/adapter-bus";
import {
  POSTGRES_PROVIDER_REGISTRY_ID,
  POSTGRES_RUNTIME_PROVIDER_BINDING_ID,
  POSTGRES_SERVICE_CATALOGUE_ID,
  PG_SDK_PACKAGE,
  PG_SDK_VERSION,
  PostgresTenantMembershipDirectory,
  createPostgresTenantMembershipDirectory,
  type PostgresComposedMembershipEvidence,
} from "@foundation/adapter-db";
import { InMemoryGuardrailStore } from "@foundation/adapter-guardrails";
import { InMemoryIdentityProvider } from "@foundation/adapter-idp";
import {
  InMemoryNotificationProvider,
  MailpitNotificationProvider,
  type MailpitComposedDeliveryEvidence,
} from "@foundation/adapter-mail";
import { CapturedObservabilitySink } from "@foundation/adapter-obs";
import { InMemorySecretStore } from "@foundation/adapter-secrets";
import {
  InMemoryFileMetadataStore,
  InMemoryObjectStore,
  InMemoryScanProvider,
} from "@foundation/adapter-store";
import { InMemoryOperationalJobStore, InMemoryWorkflowEngine } from "@foundation/adapter-wf";
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
import { FileCapability, createFileService, type FileService } from "@foundation/capability-files";
import { JobCapability, createJobService, type JobService } from "@foundation/capability-jobs";
import { NotificationCapability } from "@foundation/capability-notify";
import {
  DEFAULT_NOTIFICATION_BACKOFF,
  type GuardrailPolicy,
  type NotificationProviderConfig,
  type TenantContext,
} from "@foundation/core";
import type { NotificationProvider, TenantMembershipDirectory } from "@foundation/ports";

export const DEV_IN_MEMORY_PROVIDER_MODE_LABEL = "dev in-memory";
export const DEV_COMPOSE_BACKED_PROVIDER_MODE_LABEL = "local-composed-real-service";
export type DevProviderModeLabel =
  typeof DEV_IN_MEMORY_PROVIDER_MODE_LABEL | typeof DEV_COMPOSE_BACKED_PROVIDER_MODE_LABEL;
export type DevProviderClass = "hermetic-mock" | "local-composed-real-service";
export const DEV_RUNTIME_MODES = ["dev-in-memory", "dev-compose-backed"] as const;
export type DevRuntimeMode = (typeof DEV_RUNTIME_MODES)[number];

export const SERVICE_CATALOGUE_AUTHORITY_PATH =
  "spec/instances/compose-service/service-catalogue.json";
export const DEV_COMPOSE_TARGET = "compose/compose.dev.generated.yaml";
export const MAILPIT_PROVIDER_REGISTRY_ID = "notification-delivery-mailpit-composed-test";
export const MAILPIT_SERVICE_CATALOGUE_ID = "mailpit";

export interface RuntimeProviderBinding {
  readonly bindingId: string;
  readonly bindingStatus:
    | "active"
    | "compose-boundary-only"
    | "profile-gated"
    | "no-runtime-port"
    | "unsupported-deferred";
  readonly serviceCatalogueServiceIds: readonly string[];
  readonly providerRegistryIds: readonly string[];
  readonly adapterName: string | null;
  readonly portName: string | null;
  readonly providerMode: "composed-test" | "in-memory" | "live-external-deferred";
  readonly providerClass: DevProviderClass | "not-applicable";
  readonly serviceCatalogueAuthority: typeof SERVICE_CATALOGUE_AUTHORITY_PATH;
  readonly composeTarget: typeof DEV_COMPOSE_TARGET;
  readonly endpointRef: string | null;
  readonly sdkPackage: string | null;
  readonly sdkVersion: string | null;
  readonly sdkBoundary: "adapter-package-only" | "not-applicable";
  readonly proofSurfaces: readonly ("api" | "worker")[];
  readonly deferredReason: string | null;
  readonly followUpIssueRefs: readonly string[];
  readonly claimBoundary: string;
}

export const DEV_COMPOSE_ACTIVE_PROVIDER_BINDINGS: readonly RuntimeProviderBinding[] =
  Object.freeze([
    Object.freeze({
      bindingId: POSTGRES_RUNTIME_PROVIDER_BINDING_ID,
      bindingStatus: "active",
      serviceCatalogueServiceIds: Object.freeze([POSTGRES_SERVICE_CATALOGUE_ID]),
      providerRegistryIds: Object.freeze([POSTGRES_PROVIDER_REGISTRY_ID]),
      adapterName: "PostgresTenantMembershipRepository",
      portName: "TenantScopedRepository,TenantMembershipDirectory",
      providerMode: "composed-test",
      providerClass: "local-composed-real-service",
      serviceCatalogueAuthority: SERVICE_CATALOGUE_AUTHORITY_PATH,
      composeTarget: DEV_COMPOSE_TARGET,
      endpointRef: "endpoint://compose/postgres",
      sdkPackage: PG_SDK_PACKAGE,
      sdkVersion: PG_SDK_VERSION,
      sdkBoundary: "adapter-package-only",
      proofSurfaces: Object.freeze(["api", "worker"] as const),
      deferredReason: null,
      followUpIssueRefs: Object.freeze([]),
      claimBoundary:
        "Bounded local composed-test tenant-membership repository proof only; no stronger database readiness claim.",
    }),
    Object.freeze({
      bindingId: "mailpit-notification-provider",
      bindingStatus: "active",
      serviceCatalogueServiceIds: Object.freeze([MAILPIT_SERVICE_CATALOGUE_ID]),
      providerRegistryIds: Object.freeze([MAILPIT_PROVIDER_REGISTRY_ID]),
      adapterName: "MailpitNotificationProvider",
      portName: "NotificationProvider",
      providerMode: "composed-test",
      providerClass: "local-composed-real-service",
      serviceCatalogueAuthority: SERVICE_CATALOGUE_AUTHORITY_PATH,
      composeTarget: DEV_COMPOSE_TARGET,
      endpointRef: "endpoint://compose/mailpit",
      sdkPackage: "mailpit-api",
      sdkVersion: "2.1.0",
      sdkBoundary: "adapter-package-only",
      proofSurfaces: Object.freeze(["api", "worker"] as const),
      deferredReason: null,
      followUpIssueRefs: Object.freeze([]),
      claimBoundary:
        "Bounded local composed-test notification sink proof only; no stronger readiness claim.",
    }),
  ]);

export const DEV_COMPOSE_DEFERRED_PROVIDER_BINDINGS: readonly RuntimeProviderBinding[] =
  Object.freeze([
    Object.freeze({
      bindingId: "nats-event-bus-provider",
      bindingStatus: "no-runtime-port",
      serviceCatalogueServiceIds: Object.freeze(["nats"]),
      providerRegistryIds: Object.freeze(["event-bus-nats-composed-test"]),
      adapterName: null,
      portName: "EventBus",
      providerMode: "composed-test",
      providerClass: "not-applicable",
      serviceCatalogueAuthority: SERVICE_CATALOGUE_AUTHORITY_PATH,
      composeTarget: DEV_COMPOSE_TARGET,
      endpointRef: "endpoint://compose/nats",
      sdkPackage: null,
      sdkVersion: null,
      sdkBoundary: "not-applicable",
      proofSurfaces: Object.freeze([]),
      deferredReason: "API and worker runtime proof does not yet use a composed event-bus adapter.",
      followUpIssueRefs: Object.freeze(["USF-151"]),
      claimBoundary: "No composed event-bus runtime binding claim.",
    }),
    Object.freeze({
      bindingId: "minio-object-storage-provider",
      bindingStatus: "no-runtime-port",
      serviceCatalogueServiceIds: Object.freeze(["minio"]),
      providerRegistryIds: Object.freeze(["object-storage-minio-composed-test"]),
      adapterName: null,
      portName: "ObjectStore",
      providerMode: "composed-test",
      providerClass: "not-applicable",
      serviceCatalogueAuthority: SERVICE_CATALOGUE_AUTHORITY_PATH,
      composeTarget: DEV_COMPOSE_TARGET,
      endpointRef: "endpoint://compose/minio",
      sdkPackage: null,
      sdkVersion: null,
      sdkBoundary: "not-applicable",
      proofSurfaces: Object.freeze([]),
      deferredReason:
        "File/object runtime adapter remains in-memory until composed object-store proof.",
      followUpIssueRefs: Object.freeze(["USF-147"]),
      claimBoundary: "No composed object-storage runtime binding claim.",
    }),
    Object.freeze({
      bindingId: "keycloak-identity-provider",
      bindingStatus: "compose-boundary-only",
      serviceCatalogueServiceIds: Object.freeze(["keycloak", "keycloak-db"]),
      providerRegistryIds: Object.freeze(["identity-keycloak-composed-test"]),
      adapterName: null,
      portName: "IdentityProvider",
      providerMode: "composed-test",
      providerClass: "not-applicable",
      serviceCatalogueAuthority: SERVICE_CATALOGUE_AUTHORITY_PATH,
      composeTarget: DEV_COMPOSE_TARGET,
      endpointRef: "endpoint://compose/keycloak",
      sdkPackage: null,
      sdkVersion: null,
      sdkBoundary: "not-applicable",
      proofSurfaces: Object.freeze([]),
      deferredReason:
        "Runtime dev claims remain hermetic; Keycloak composed verifier proof is separate from API/worker binding.",
      followUpIssueRefs: Object.freeze(["USF-149"]),
      claimBoundary: "No composed identity runtime binding claim.",
    }),
    Object.freeze({
      bindingId: "temporal-workflow-provider",
      bindingStatus: "profile-gated",
      serviceCatalogueServiceIds: Object.freeze(["temporal", "temporal-ui"]),
      providerRegistryIds: Object.freeze(["workflow-engine-temporal-composed-test"]),
      adapterName: null,
      portName: "WorkflowEngine",
      providerMode: "composed-test",
      providerClass: "not-applicable",
      serviceCatalogueAuthority: SERVICE_CATALOGUE_AUTHORITY_PATH,
      composeTarget: DEV_COMPOSE_TARGET,
      endpointRef: "endpoint://compose/temporal",
      sdkPackage: null,
      sdkVersion: null,
      sdkBoundary: "not-applicable",
      proofSurfaces: Object.freeze([]),
      deferredReason:
        "Workflow-provider runtime binding remains profile-gated and requires separate proof.",
      followUpIssueRefs: Object.freeze(["USF-151"]),
      claimBoundary: "No composed workflow runtime binding claim.",
    }),
    Object.freeze({
      bindingId: "openbao-secret-provider",
      bindingStatus: "no-runtime-port",
      serviceCatalogueServiceIds: Object.freeze(["openbao"]),
      providerRegistryIds: Object.freeze([]),
      adapterName: null,
      portName: "SecretResolver",
      providerMode: "composed-test",
      providerClass: "not-applicable",
      serviceCatalogueAuthority: SERVICE_CATALOGUE_AUTHORITY_PATH,
      composeTarget: DEV_COMPOSE_TARGET,
      endpointRef: "endpoint://compose/openbao",
      sdkPackage: null,
      sdkVersion: null,
      sdkBoundary: "not-applicable",
      proofSurfaces: Object.freeze([]),
      deferredReason:
        "Runtime secret resolver remains synthetic local; no composed OpenBao provider registry row or adapter binding exists yet.",
      followUpIssueRefs: Object.freeze(["USF-145"]),
      claimBoundary: "No composed secret-provider runtime binding claim.",
    }),
  ]);

export const DEV_COMPOSE_BACKED_DEFERRED_BOUNDARIES = Object.freeze([
  "Postgres tenant-membership repository and Mailpit notification provider bindings are active in dev-compose-backed mode; event-bus, object-storage, identity, workflow, and secret-provider runtime bindings remain explicitly deferred or boundary-only.",
  "Profile-gated workflow-provider and operator services remain catalogue-tracked boundaries and are not started by the default runtime proof.",
]);

export interface DevRuntime {
  readonly runtimeMode: DevRuntimeMode;
  readonly providerModeLabel: DevProviderModeLabel;
  readonly providerClass: DevProviderClass;
  readonly environment: "local";
  readonly serviceCatalogueAuthority: typeof SERVICE_CATALOGUE_AUTHORITY_PATH;
  readonly composeTarget: typeof DEV_COMPOSE_TARGET | null;
  readonly deferredBoundaries: readonly string[];
  readonly providers: Readonly<Record<string, string>>;
  readonly composedProviderBindings: readonly RuntimeProviderBinding[];
  readonly deferredProviderBindings: readonly RuntimeProviderBinding[];
  readonly databaseProviderEvidence: () => PostgresComposedMembershipEvidence | null;
  readonly refreshMembershipAuthority: (
    context: TenantContext,
  ) => Promise<PostgresComposedMembershipEvidence | null>;
  readonly proveDatabaseProviderRoundTrip: (
    context: TenantContext,
    value: {
      readonly tenantId: string;
      readonly actorId: string;
      readonly email: string;
      readonly roles: readonly string[];
    },
  ) => Promise<PostgresComposedMembershipEvidence | null>;
  readonly close: () => Promise<void>;
  readonly notificationProviderConfig: NotificationProviderConfig;
  readonly auditLedger: InMemoryAuditLedger;
  readonly authService: AuthService;
  readonly config: InMemoryConfigProvider;
  readonly eventBus: InMemoryEventBus;
  readonly fileCapability: FileCapability;
  readonly jobCapability: JobCapability;
  readonly jobService: JobService;
  readonly jobStore: InMemoryOperationalJobStore;
  readonly notificationCapability: NotificationCapability;
  readonly notificationProvider: NotificationProvider;
  readonly observability: CapturedObservabilitySink;
  readonly secrets: InMemorySecretStore;
  readonly membershipDirectory: TenantMembershipDirectory;
  readonly breakGlass: BreakGlassRegistry;
  readonly pdp: PolicyDecisionPoint;
  readonly authorizer: Authorizer;
  readonly auditEvents: InMemoryAuditEventStore;
  readonly auditRecorder: AuditEventRecorder;
  readonly auditQuery: AuditQueryService;
  readonly configService: ConfigService;
  readonly secretService: SecretService;
  readonly fileService: FileService;
  readonly guardrails: InMemoryGuardrailStore;
}

export const DEV_TENANT_ID = "11111111-1111-4111-8111-111111111111";
export const DEV_ACTOR_ID = "dev-actor";
export const DEV_SECURITY_ACTOR_ID = "dev-security-actor";

export function isDevRuntimeMode(value: string): value is DevRuntimeMode {
  return (DEV_RUNTIME_MODES as readonly string[]).includes(value);
}

export function runtimeModeFromEnv(env: NodeJS.ProcessEnv = process.env): DevRuntimeMode {
  const mode = env.USF_DEV_RUNTIME_MODE ?? "dev-in-memory";
  if (isDevRuntimeMode(mode)) {
    return mode;
  }
  throw new Error(`unsupported USF_DEV_RUNTIME_MODE: ${mode}`);
}

export function createDevRuntime(
  options: { readonly runtimeMode?: DevRuntimeMode } = {},
): DevRuntime {
  const runtimeMode = options.runtimeMode ?? runtimeModeFromEnv();
  const auditLedger = new InMemoryAuditLedger();
  const identityProvider = new InMemoryIdentityProvider();
  const eventBus = new InMemoryEventBus();
  const config = new InMemoryConfigProvider();
  const workflowEngine = new InMemoryWorkflowEngine();
  const jobStore = new InMemoryOperationalJobStore();
  const objectStore = new InMemoryObjectStore();
  const notificationProvider =
    runtimeMode === "dev-compose-backed"
      ? new MailpitNotificationProvider()
      : new InMemoryNotificationProvider();
  const observability = new CapturedObservabilitySink();
  const secrets = new InMemorySecretStore();
  const guardrails = new InMemoryGuardrailStore();
  guardrails.upsertPolicy(defaultJobCreateGuardrailPolicy());

  const membershipDirectory =
    runtimeMode === "dev-compose-backed"
      ? createPostgresTenantMembershipDirectory()
      : new InMemoryTenantMembershipDirectory();
  seedRuntimeMembership(membershipDirectory, {
    membershipId: "membership_dev",
    tenantId: DEV_TENANT_ID,
    actorId: DEV_ACTOR_ID,
    status: "active",
    roles: ["tenant-admin"],
  });
  seedRuntimeMembership(membershipDirectory, {
    membershipId: "membership_dev_security",
    tenantId: DEV_TENANT_ID,
    actorId: DEV_SECURITY_ACTOR_ID,
    status: "active",
    roles: ["security-admin"],
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

  const fileMetadataStore = new InMemoryFileMetadataStore();
  const scanProvider = new InMemoryScanProvider();
  const fileService = createFileService({
    objectStore,
    metadataStore: fileMetadataStore,
    scanProvider,
    pdp,
    audit: auditRecorder,
    objectKeySalt: "dev-object-key-salt",
  });
  const jobService = createJobService({
    jobs: jobStore,
    pdp,
    memberships: membershipDirectory,
    audit: auditRecorder,
  });
  const notificationCapability = new NotificationCapability(notificationProvider, {
    pdp,
    audit: auditRecorder,
    jobs: jobService,
  });
  const providerModeLabel = providerModeLabelForRuntime(runtimeMode);
  const notificationProviderConfig = notificationProviderConfigForRuntime(runtimeMode);

  return {
    runtimeMode,
    providerModeLabel,
    providerClass:
      runtimeMode === "dev-compose-backed" ? "local-composed-real-service" : "hermetic-mock",
    environment: "local",
    serviceCatalogueAuthority: SERVICE_CATALOGUE_AUTHORITY_PATH,
    composeTarget: runtimeMode === "dev-compose-backed" ? DEV_COMPOSE_TARGET : null,
    deferredBoundaries:
      runtimeMode === "dev-compose-backed" ? DEV_COMPOSE_BACKED_DEFERRED_BOUNDARIES : [],
    providers:
      runtimeMode === "dev-compose-backed"
        ? Object.freeze({
            ...devProviderPlan,
            database: "postgres-composed-test",
            mail: "mailpit-composed-test",
          })
        : devProviderPlan,
    composedProviderBindings:
      runtimeMode === "dev-compose-backed" ? DEV_COMPOSE_ACTIVE_PROVIDER_BINDINGS : [],
    deferredProviderBindings:
      runtimeMode === "dev-compose-backed" ? DEV_COMPOSE_DEFERRED_PROVIDER_BINDINGS : [],
    databaseProviderEvidence: () =>
      membershipDirectory instanceof PostgresTenantMembershipDirectory
        ? (membershipDirectory.lastEvidence ?? null)
        : null,
    refreshMembershipAuthority: async (context) => {
      if (membershipDirectory instanceof PostgresTenantMembershipDirectory) {
        return membershipDirectory.refreshTenant(context);
      }
      return null;
    },
    proveDatabaseProviderRoundTrip: async (context, value) => {
      if (membershipDirectory instanceof PostgresTenantMembershipDirectory) {
        return membershipDirectory.proveRoundTrip(context, value);
      }
      return null;
    },
    close: async () => {
      if (membershipDirectory instanceof PostgresTenantMembershipDirectory) {
        await membershipDirectory.close();
      }
    },
    notificationProviderConfig,
    auditLedger,
    authService: createAuthService({ auditLedger, identityProvider }),
    config,
    eventBus,
    fileCapability: new FileCapability(objectStore),
    jobCapability: new JobCapability(workflowEngine),
    jobService,
    jobStore,
    notificationCapability,
    notificationProvider,
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
    fileService,
    guardrails,
  };
}

function seedRuntimeMembership(
  directory: TenantMembershipDirectory,
  membership: {
    readonly membershipId: string;
    readonly tenantId: string;
    readonly actorId: string;
    readonly status: "active";
    readonly roles: readonly string[];
  },
): void {
  if (directory instanceof InMemoryTenantMembershipDirectory) {
    directory.upsert(membership);
    return;
  }
  if (directory instanceof PostgresTenantMembershipDirectory) {
    directory.seedLocalMembership(membership);
  }
}

export function providerModeLabelForRuntime(mode: DevRuntimeMode): DevProviderModeLabel {
  return mode === "dev-compose-backed"
    ? DEV_COMPOSE_BACKED_PROVIDER_MODE_LABEL
    : DEV_IN_MEMORY_PROVIDER_MODE_LABEL;
}

export function notificationProviderConfigForRuntime(
  mode: DevRuntimeMode,
): NotificationProviderConfig {
  if (mode === "dev-compose-backed") {
    return Object.freeze({
      providerRef: MAILPIT_PROVIDER_REGISTRY_ID,
      providerType: "mailpit",
      providerMode: "composed-test",
      channel: "test",
      endpoint: "http://127.0.0.1:8025",
      allowedHosts: Object.freeze(["127.0.0.1", "localhost"]),
      allowedSchemes: Object.freeze(["http"]),
      tlsRequired: false,
      credentialRef: null,
      senderIdentityRef: "sender:mailpit-compose",
      rateLimitPolicy: "local-composed-test-no-external-egress",
      retryPolicy: DEFAULT_NOTIFICATION_BACKOFF,
      timeoutPolicy: "local-composed-test",
      circuitBreakerPolicy: "local-composed-test-fail-closed",
      egressPolicy: "loopback-compose-only",
    });
  }
  return Object.freeze({
    providerRef: "notify-in-memory",
    providerType: "in-memory",
    providerMode: "in-memory",
    channel: "test",
    endpoint: null,
    allowedHosts: Object.freeze([]),
    allowedSchemes: Object.freeze([]),
    tlsRequired: false,
    credentialRef: {
      secretRef: "secret://dev-tenant/mail-api-key",
      secretProvider: "in-memory",
      scope: "tenant",
      version: "1",
      status: "active" as const,
      rotationPolicy: "local-dev-test-only",
      lastRotatedAt: null,
      nextRotationDueAt: null,
      owner: "platform",
    },
    senderIdentityRef: "sender:test",
    rateLimitPolicy: "local-dev-test-no-external-egress",
    retryPolicy: DEFAULT_NOTIFICATION_BACKOFF,
    timeoutPolicy: "local-dev-test",
    circuitBreakerPolicy: "local-dev-test",
    egressPolicy: "no-external-egress",
  });
}

export async function configureRuntimeNotificationProvider(
  runtime: DevRuntime,
  context: TenantContext,
): Promise<void> {
  const result = await runtime.notificationCapability.configureProvider(
    context,
    runtime.notificationProviderConfig,
  );
  if (!result.ok) {
    throw new Error("notification provider configuration failed");
  }
}

export function mailpitDeliveryEvidence(
  runtime: DevRuntime,
): MailpitComposedDeliveryEvidence | undefined {
  if (runtime.notificationProvider instanceof MailpitNotificationProvider) {
    return runtime.notificationProvider.lastDeliveryEvidence;
  }
  return undefined;
}

function defaultJobCreateGuardrailPolicy(): GuardrailPolicy {
  const timestamp = "2026-01-01T00:00:00.000Z";
  return Object.freeze({
    policyId: "api.jobs.create.local",
    policyType: "rate-limit",
    classification: "availability-protection",
    scope: "route",
    scopeRef: "jobs.create",
    tenantId: null,
    actorId: null,
    serviceActorId: null,
    routeId: "jobs.create",
    operationId: "postJobCreateV1",
    resourceType: "job",
    providerId: null,
    limit: 1000,
    windowSeconds: 60,
    burstLimit: null,
    lifecycle: "active",
    policyOwner: "platform",
    owningCapability: "jobs-workflows",
    riskLevel: "medium",
    createdBy: "system",
    approvedBy: "system",
    lastReviewedAt: null,
    reviewExpiresAt: null,
    changeReason: "local dev and test route guardrail",
    retryAfterPolicy: "safe-window-reset",
    denialPolicy: "rate-limit-exceeded",
    telemetryPolicy: "tenant-safe guardrail security signal",
    auditPolicy: "value-free guardrail denial evidence",
    environmentScope: "local-dev",
    dataClassification: "security-sensitive",
    distributedEnforcement: "single-node-in-memory",
    liveWafReadinessClaim: false,
    liveEdgeReadinessClaim: false,
    productionReadinessClaim: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}
