import type { AuditRecord, IdentityClaims, TenantContext } from "@foundation/core";

export interface IdentityProvider {
  readonly mode: "hermetic-mock" | "local-composed-real-service";
  issueLogin(input: { tenantId: string; email: string }): Promise<IdentityClaims>;
}

export interface AuditLedger {
  append(record: AuditRecord): Promise<void>;
  list(tenantId: string): readonly AuditRecord[];
}

export interface ObjectStore {
  putObject(input: { tenantId: string; key: string; body: string }): Promise<void>;
  getObject(input: { tenantId: string; key: string }): Promise<string | undefined>;
}

export interface EventBus {
  publish(input: { tenantId: string; subject: string; payload: unknown }): Promise<void>;
  drain(tenantId: string): readonly unknown[];
}

export interface WorkflowEngine {
  schedule(input: { tenantId: string; workflow: string; payload: unknown }): Promise<string>;
}

export interface MailProvider {
  send(input: { tenantId: string; to: string; subject: string; body: string }): Promise<void>;
}

export interface SecretStore {
  writeSecret(input: { tenantId: string; name: string; value: string }): Promise<void>;
  readSecret(input: { tenantId: string; name: string }): Promise<string | undefined>;
}

export interface ObservabilitySink {
  record(input: { tenantId: string; signal: string; attributes: Record<string, string> }): void;
  list(tenantId: string): readonly string[];
}

export interface TenantScopedRepository<T> {
  insert(context: TenantContext, value: T): Promise<void>;
  list(context: TenantContext, tenantId: string): Promise<readonly T[]>;
}
