import type { SecretStore } from "@foundation/ports";

export class InMemorySecretStore implements SecretStore {
  readonly #secrets = new Map<string, string>();

  async writeSecret(input: { tenantId: string; name: string; value: string }): Promise<void> {
    this.#secrets.set(`${input.tenantId}/${input.name}`, input.value);
  }

  async readSecret(input: { tenantId: string; name: string }): Promise<string | undefined> {
    return this.#secrets.get(`${input.tenantId}/${input.name}`);
  }
}
