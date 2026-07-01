// USF authorization policy (parity-tenant-authz, USF-140). Single source of truth
// for the PDP. Default deny; least privilege; no implicit global admin; identity
// claims are inputs, not final authorization. Enforced by
// tools/validate-parity/validate-authz.py.

export const POLICY_VERSION = "authz-policy-1";

// Default decision effect. The PDP fails closed: anything not explicitly permitted
// is denied.
export const DEFAULT_EFFECT = "deny";

// Identity (IdP/OIDC/Keycloak claims, roles, groups, email) supplies identity only.
// It never constitutes final authorization by itself.
export const IDP_GRANTS_AUTHORIZATION = false;

// RBAC: role -> permissions. No wildcard grants; no implicit global admin. Tenant
// roles do not leak across tenants (enforced by tenant-boundary + membership).
export const ROLE_PERMISSIONS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "tenant-admin": Object.freeze([
    "tenant.members.read",
    "tenant.members.write",
    "tenant.members.delete",
    "audit.read",
    "audit.search",
    "audit.verify",
    "config.read",
    "config.write",
    "file.create",
    "file.read",
    "file.download",
    "file.delete",
    "file.restore",
    "file.list",
    "job.create",
    "job.read",
    "job.list",
    "job.cancel",
    "job.retry",
    "job.schedule",
    "workflow.start",
    "workflow.signal",
    "workflow.query",
    "workflow.cancel",
    "workflow.approve",
    "workflow.reject",
    "notification.create",
    "notification.read",
    "notification.list",
    "notification.render",
    "notification.send",
    "notification.cancel",
    "notification.retry",
    "notification.dead_letter.read",
    "notification.dead_letter.retry",
    "notification.template.create",
    "notification.template.update",
    "notification.template.approve",
    "notification.preference.read",
    "notification.preference.update",
    "notification.suppression.update",
    "notification.provider.configure",
    "notification.bulk.send",
    "tenant_sso.request",
    "tenant_sso.configure",
    "tenant_sso.verify_domain",
    "tenant_sso.activate",
    "tenant_sso.suspend",
    "tenant_sso.revoke",
    "tenant_sso.rotate_secret",
    "tenant_sso.update_mapping",
    "tenant_sso.view_audit",
  ]),
  "tenant-member": Object.freeze([
    "tenant.members.read",
    "config.read",
    "file.read",
    "file.download",
    "file.list",
    "job.read",
    "job.list",
    "workflow.query",
    "notification.read",
    "notification.list",
    "notification.preference.read",
    "notification.preference.update",
  ]),
  auditor: Object.freeze(["audit.read", "audit.search", "audit.verify"]),
  "security-admin": Object.freeze([
    "tenant.members.read",
    "tenant.members.write",
    "tenant.members.delete",
    "audit.read",
    "audit.search",
    "audit.verify",
    "audit.export",
    "audit.correct",
    "audit.purge",
    "config.read",
    "config.write",
    "provider.config.read",
    "provider.config.write",
    "provider.read",
    "provider.list",
    "provider.health.read",
    "provider.readiness.read",
    "provider.configure",
    "provider.mode.change",
    "observability.signal.read",
    "observability.metric.read",
    "observability.trace.read",
    "observability.log.read",
    "observability.health.read",
    "observability.readiness.read",
    "observability.security_signal.read",
    "observability.export",
    "observability.configure",
    "observability.alert.configure",
    "secret.read",
    "file.create",
    "file.read",
    "file.download",
    "file.delete",
    "file.restore",
    "file.purge",
    "file.list",
    "file.scan",
    "file.quarantine",
    "file.release",
    "security.restricted.read",
    "job.create",
    "job.read",
    "job.list",
    "job.cancel",
    "job.retry",
    "job.schedule",
    "job.run",
    "job.dead_letter.read",
    "job.dead_letter.retry",
    "workflow.start",
    "workflow.signal",
    "workflow.query",
    "workflow.cancel",
    "workflow.approve",
    "workflow.reject",
    "notification.create",
    "notification.read",
    "notification.list",
    "notification.render",
    "notification.send",
    "notification.cancel",
    "notification.retry",
    "notification.dead_letter.read",
    "notification.dead_letter.retry",
    "notification.template.create",
    "notification.template.update",
    "notification.template.approve",
    "notification.preference.read",
    "notification.preference.update",
    "notification.suppression.update",
    "notification.provider.configure",
    "notification.bulk.send",
    "tenant_sso.request",
    "tenant_sso.configure",
    "tenant_sso.verify_domain",
    "tenant_sso.activate",
    "tenant_sso.suspend",
    "tenant_sso.revoke",
    "tenant_sso.rotate_secret",
    "tenant_sso.update_mapping",
    "tenant_sso.view_audit",
  ]),
  // Concrete service actor for system jobs (ADR 0013). NOT a global bypass: it has
  // exactly these explicit permissions, runs in a tenant context, and is audited.
  "service-worker": Object.freeze([
    "job.create",
    "job.read",
    "job.run",
    "job.schedule",
    "workflow.signal",
    "workflow.query",
    "notification.create",
    "notification.read",
    "notification.render",
    "notification.send",
  ]),
});

// Every protected action maps to exactly one required permission. An action absent
// from this map is unknown and fails closed.
export const ACTION_PERMISSIONS: Readonly<Record<string, string>> = Object.freeze({
  "tenant.members.read": "tenant.members.read",
  "tenant.members.write": "tenant.members.write",
  "tenant.members.delete": "tenant.members.delete",
  "audit.read": "audit.read",
  "audit.search": "audit.search",
  "audit.verify": "audit.verify",
  "audit.export": "audit.export",
  "audit.correct": "audit.correct",
  "audit.purge": "audit.purge",
  "config.read": "config.read",
  "config.write": "config.write",
  "provider.config.read": "provider.config.read",
  "provider.config.write": "provider.config.write",
  "provider.read": "provider.read",
  "provider.list": "provider.list",
  "provider.health.read": "provider.health.read",
  "provider.readiness.read": "provider.readiness.read",
  "provider.configure": "provider.configure",
  "provider.mode.change": "provider.mode.change",
  "observability.signal.read": "observability.signal.read",
  "observability.metric.read": "observability.metric.read",
  "observability.trace.read": "observability.trace.read",
  "observability.log.read": "observability.log.read",
  "observability.health.read": "observability.health.read",
  "observability.readiness.read": "observability.readiness.read",
  "observability.security_signal.read": "observability.security_signal.read",
  "observability.export": "observability.export",
  "observability.configure": "observability.configure",
  "observability.alert.configure": "observability.alert.configure",
  "secret.read": "secret.read",
  "file.create": "file.create",
  "file.read": "file.read",
  "file.download": "file.download",
  "file.delete": "file.delete",
  "file.restore": "file.restore",
  "file.purge": "file.purge",
  "file.list": "file.list",
  "file.scan": "file.scan",
  "file.quarantine": "file.quarantine",
  "file.release": "file.release",
  "security.restricted.read": "security.restricted.read",
  "job.create": "job.create",
  "job.read": "job.read",
  "job.list": "job.list",
  "job.cancel": "job.cancel",
  "job.retry": "job.retry",
  "job.schedule": "job.schedule",
  "job.run": "job.run",
  "job.dead_letter.read": "job.dead_letter.read",
  "job.dead_letter.retry": "job.dead_letter.retry",
  "workflow.start": "workflow.start",
  "workflow.signal": "workflow.signal",
  "workflow.query": "workflow.query",
  "workflow.cancel": "workflow.cancel",
  "workflow.approve": "workflow.approve",
  "workflow.reject": "workflow.reject",
  "notification.create": "notification.create",
  "notification.read": "notification.read",
  "notification.list": "notification.list",
  "notification.render": "notification.render",
  "notification.send": "notification.send",
  "notification.cancel": "notification.cancel",
  "notification.retry": "notification.retry",
  "notification.dead_letter.read": "notification.dead_letter.read",
  "notification.dead_letter.retry": "notification.dead_letter.retry",
  "notification.template.create": "notification.template.create",
  "notification.template.update": "notification.template.update",
  "notification.template.approve": "notification.template.approve",
  "notification.preference.read": "notification.preference.read",
  "notification.preference.update": "notification.preference.update",
  "notification.suppression.update": "notification.suppression.update",
  "notification.provider.configure": "notification.provider.configure",
  "notification.bulk.send": "notification.bulk.send",
  "tenant_sso.request": "tenant_sso.request",
  "tenant_sso.configure": "tenant_sso.configure",
  "tenant_sso.verify_domain": "tenant_sso.verify_domain",
  "tenant_sso.activate": "tenant_sso.activate",
  "tenant_sso.suspend": "tenant_sso.suspend",
  "tenant_sso.revoke": "tenant_sso.revoke",
  "tenant_sso.rotate_secret": "tenant_sso.rotate_secret",
  "tenant_sso.update_mapping": "tenant_sso.update_mapping",
  "tenant_sso.view_audit": "tenant_sso.view_audit",
});

// ABAC: data classifications that require the stronger sensitive-read permission.
export const SENSITIVE_CLASSIFICATIONS: readonly string[] = Object.freeze([
  "restricted",
  "security-sensitive",
]);
export const SENSITIVE_READ_PERMISSION = "security.restricted.read";

// ABAC: a missing data_classification attribute defaults to a safe value (absence
// is explicitly allowed with a confidential default; it never opens access).
export const DEFAULT_DATA_CLASSIFICATION = "confidential";

export function permissionsForRoles(roles: readonly string[]): ReadonlySet<string> {
  const granted = new Set<string>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      granted.add(permission);
    }
  }
  return granted;
}

export function requiredPermission(action: string): string | undefined {
  return ACTION_PERMISSIONS[action];
}

export function isSensitiveClassification(classification: string): boolean {
  return SENSITIVE_CLASSIFICATIONS.includes(classification);
}

// Break-glass scope coverage. A grant scope of "*" covers everything; a trailing
// ".*" is a prefix wildcard; otherwise the scope must equal the action exactly.
export function scopeCoversAction(scope: string, action: string): boolean {
  if (scope === "*") {
    return true;
  }
  if (scope.endsWith(".*")) {
    return action.startsWith(scope.slice(0, -1));
  }
  return scope === action;
}
