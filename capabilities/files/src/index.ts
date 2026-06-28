import type { TenantContext } from "@foundation/core";
import type { ObjectStore } from "@foundation/ports";

export class FileCapability {
  constructor(private readonly objectStore: ObjectStore) {}

  async putTenantFile(context: TenantContext, key: string, body: string): Promise<void> {
    await this.objectStore.putObject({ tenantId: context.tenantId, key, body });
  }

  async getTenantFile(context: TenantContext, key: string): Promise<string | undefined> {
    return this.objectStore.getObject({ tenantId: context.tenantId, key });
  }
}

export {
  FileAccessDeniedError,
  createFileService,
  type FileAccessContext,
  type FileService,
  type UploadFileInput,
} from "./file-service.ts";
