import type { MailProvider } from "@foundation/ports";

export class InMemoryMailProvider implements MailProvider {
  readonly messages: Array<{ tenantId: string; to: string; subject: string; body: string }> = [];

  async send(input: {
    tenantId: string;
    to: string;
    subject: string;
    body: string;
  }): Promise<void> {
    this.messages.push(input);
  }
}
