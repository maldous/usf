import { InMemoryEventBus } from "@foundation/adapter-bus";
import { InMemoryIdentityProvider } from "@foundation/adapter-idp";
import { InMemoryMailProvider } from "@foundation/adapter-mail";
import { CapturedObservabilitySink } from "@foundation/adapter-obs";
import { InMemorySecretStore } from "@foundation/adapter-secrets";
import { InMemoryObjectStore } from "@foundation/adapter-store";
import { InMemoryWorkflowEngine } from "@foundation/adapter-wf";
import { InMemoryAuditLedger } from "@foundation/capability-audit";
import { createAuthService, type AuthService } from "@foundation/capability-auth";
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
}

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
  };
}
