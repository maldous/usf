import type { ObjectStore } from "@foundation/ports";

export class InMemoryObjectStore implements ObjectStore {
  readonly #objects = new Map<string, string>();

  async putObject(input: { tenantId: string; key: string; body: string }): Promise<void> {
    this.#objects.set(`${input.tenantId}/${input.key}`, input.body);
  }

  async getObject(input: { tenantId: string; key: string }): Promise<string | undefined> {
    return this.#objects.get(`${input.tenantId}/${input.key}`);
  }
}
