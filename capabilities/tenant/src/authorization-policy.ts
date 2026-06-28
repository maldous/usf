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
  ]),
  "tenant-member": Object.freeze([
    "tenant.members.read",
    "config.read",
    "file.read",
    "file.download",
    "file.list",
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
