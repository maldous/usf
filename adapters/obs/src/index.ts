import type { ObservabilitySink } from "@foundation/ports";

export class CapturedObservabilitySink implements ObservabilitySink {
  readonly #signals = new Map<string, string[]>();

  record(input: { tenantId: string; signal: string; attributes: Record<string, string> }): void {
    const list = this.#signals.get(input.tenantId) ?? [];
    list.push(`${input.signal}:${Object.keys(input.attributes).sort().join(",")}`);
    this.#signals.set(input.tenantId, list);
  }

  list(tenantId: string): readonly string[] {
    return this.#signals.get(tenantId) ?? [];
  }
}
