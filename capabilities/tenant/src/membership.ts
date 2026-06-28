import type { ActorIdentity, TenantMembership } from "@foundation/core";
import type { IdentityDirectory, TenantMembershipDirectory } from "@foundation/ports";

// In-memory tenant membership directory (dev/test). Authorization uses membership
// status as authority; only active memberships authorize normal tenant actions.
export class InMemoryTenantMembershipDirectory implements TenantMembershipDirectory {
  readonly #byKey = new Map<string, TenantMembership>();

  upsert(membership: TenantMembership): void {
    this.#byKey.set(`${membership.tenantId}:${membership.actorId}`, membership);
  }

  membership(input: { actorId: string; tenantId: string }): TenantMembership | undefined {
    return this.#byKey.get(`${input.tenantId}:${input.actorId}`);
  }

  activeTenants(actorId: string): readonly string[] {
    return [...this.#byKey.values()]
      .filter((membership) => membership.actorId === actorId && membership.status === "active")
      .map((membership) => membership.tenantId);
  }
}

// In-memory identity directory (dev/test). Maps a stable internal actor from an
// external IdP subject + provider. Email is not the primary identity key.
export class InMemoryIdentityDirectory implements IdentityDirectory {
  readonly #bySubject = new Map<string, ActorIdentity>();

  upsert(actor: ActorIdentity): void {
    this.#bySubject.set(`${actor.identityProvider}:${actor.externalSubject}`, actor);
  }

  resolveActor(input: {
    externalSubject: string;
    identityProvider: string;
  }): ActorIdentity | undefined {
    return this.#bySubject.get(`${input.identityProvider}:${input.externalSubject}`);
  }
}
