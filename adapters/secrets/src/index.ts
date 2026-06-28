import type { SecretLifecycleState, SecretReference } from "@foundation/core";
import type { SecretResolver, SecretStore } from "@foundation/ports";

interface StoredSecret {
  readonly value: string;
  readonly reference: SecretReference;
}

// In-memory secret store + resolver for dev/test (parity-config-secrets, USF-144).
// Holds opaque references with lifecycle metadata; the VALUE is returned only via
// resolveSecretValue and only for resolvable lifecycle states. Not a live external
// secret manager — that is a declared, deferred port (USF-145).
export class InMemorySecretStore implements SecretStore, SecretResolver {
  readonly #secrets = new Map<string, StoredSecret>();

  #key(tenantId: string, name: string): string {
    return `${tenantId}/${name}`;
  }

  async writeSecret(input: {
    tenantId: string;
    name: string;
    value: string;
    status?: SecretLifecycleState;
    provider?: string;
    version?: string;
  }): Promise<void> {
    const reference: SecretReference = Object.freeze({
      secretRef: `secret://${input.tenantId}/${input.name}`,
      secretProvider: input.provider ?? "in-memory",
      scope: input.tenantId,
      version: input.version ?? "1",
      status: input.status ?? "active",
      rotationPolicy: "manual-dev",
      lastRotatedAt: null,
      nextRotationDueAt: null,
      owner: "platform",
    });
    this.#secrets.set(this.#key(input.tenantId, input.name), { value: input.value, reference });
  }

  async readSecret(input: { tenantId: string; name: string }): Promise<string | undefined> {
    return this.#secrets.get(this.#key(input.tenantId, input.name))?.value;
  }

  async describe(input: { tenantId: string; name: string }): Promise<SecretReference | undefined> {
    return this.#secrets.get(this.#key(input.tenantId, input.name))?.reference;
  }

  async resolveSecretValue(reference: SecretReference): Promise<string> {
    // Adapter-level fail-closed backstop: only an active/rotating reference resolves.
    if (reference.status !== "active" && reference.status !== "rotating") {
      throw new Error(`secret reference is not resolvable in state ${reference.status}`);
    }
    const entry = [...this.#secrets.values()].find(
      (s) => s.reference.secretRef === reference.secretRef,
    );
    if (!entry) {
      throw new Error("secret reference does not resolve");
    }
    return entry.value;
  }
}
