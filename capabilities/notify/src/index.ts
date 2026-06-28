import type { TenantContext } from "@foundation/core";
import type { MailProvider } from "@foundation/ports";

export class NotificationCapability {
  constructor(private readonly mailProvider: MailProvider) {}

  async sendTenantNotice(context: TenantContext, subject: string, body: string): Promise<void> {
    await this.mailProvider.send({
      tenantId: context.tenantId,
      to: `${context.actorId}@example.test`,
      subject,
      body,
    });
  }
}
