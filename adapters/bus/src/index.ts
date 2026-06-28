import type { EventBus } from "@foundation/ports";

export class InMemoryEventBus implements EventBus {
  readonly #events = new Map<string, unknown[]>();

  async publish(input: { tenantId: string; subject: string; payload: unknown }): Promise<void> {
    const list = this.#events.get(input.tenantId) ?? [];
    list.push({ subject: input.subject, payload: input.payload });
    this.#events.set(input.tenantId, list);
  }

  drain(tenantId: string): readonly unknown[] {
    const events = this.#events.get(tenantId) ?? [];
    this.#events.set(tenantId, []);
    return events;
  }
}
