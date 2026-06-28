import { stableId } from "@foundation/core";
import type { WorkflowEngine } from "@foundation/ports";

export class InMemoryWorkflowEngine implements WorkflowEngine {
  readonly #scheduled: string[] = [];

  async schedule(input: { tenantId: string; workflow: string; payload: unknown }): Promise<string> {
    const id = stableId("workflow", [
      input.tenantId,
      input.workflow,
      String(this.#scheduled.length + 1),
    ]);
    this.#scheduled.push(id);
    return id;
  }

  list(): readonly string[] {
    return [...this.#scheduled];
  }
}
