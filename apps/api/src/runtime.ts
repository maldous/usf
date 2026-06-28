import { InMemoryEventBus } from "@foundation/adapter-bus";
import { InMemoryIdentityProvider } from "@foundation/adapter-idp";
import { InMemoryMailProvider } from "@foundation/adapter-mail";
import { CapturedObservabilitySink } from "@foundation/adapter-obs";
import { InMemorySecretStore } from "@foundation/adapter-secrets";
import { InMemoryObjectStore } from "@foundation/adapter-store";
import { InMemoryWorkflowEngine } from "@foundation/adapter-wf";
import { InMemoryAuditLedger } from "@foundation/capability-audit";
import { createAuthService, type AuthService } from "@foundation/capability-auth";
import {
  BreakGlassRegistry,
  InMemoryTenantMembershipDirectory,
  createAuthorizer,
  createPolicyDecisionPoint,
  type Authorizer,
} from "@foundation/capability-tenant";
import type { PolicyDecisionPoint } from "@foundation/ports";
import { InMemoryConfigProvider, devProviderPlan } from "@foundation/capability-config";
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
  const authorizer = createAuthorizer({ pdp, auditLedger });

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
  };
}
