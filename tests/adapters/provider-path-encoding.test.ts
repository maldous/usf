import { describe, expect, it } from "vitest";
import { encodeOpenBaoPathSegment } from "@foundation/adapter-secrets";
import { encodeMinioObjectPathSegment } from "@foundation/adapter-store";

describe("compose provider path encoding", () => {
  it("keeps MinIO tenant and object key segments collision-free", () => {
    const tenantWithSeparator = encodeMinioObjectPathSegment("acme/prod");
    const tenantWithReplacement = encodeMinioObjectPathSegment("acme_prod");
    const keyWithSeparator = encodeMinioObjectPathSegment("file/proof.txt");
    const keyWithReplacement = encodeMinioObjectPathSegment("file_proof.txt");

    expect(tenantWithSeparator).not.toBe(tenantWithReplacement);
    expect(keyWithSeparator).not.toBe(keyWithReplacement);
    expect(tenantWithSeparator).not.toContain("/");
    expect(keyWithSeparator).not.toContain("/");
    expect(tenantWithSeparator).toMatch(/^b64_[A-Za-z0-9_-]+$/);
  });

  it("keeps OpenBao tenant and secret name segments collision-free", () => {
    const tenantWithSeparator = encodeOpenBaoPathSegment("acme/prod");
    const tenantWithReplacement = encodeOpenBaoPathSegment("acme_prod");
    const nameWithSeparator = encodeOpenBaoPathSegment("secret/proof");
    const nameWithReplacement = encodeOpenBaoPathSegment("secret_proof");

    expect(tenantWithSeparator).not.toBe(tenantWithReplacement);
    expect(nameWithSeparator).not.toBe(nameWithReplacement);
    expect(tenantWithSeparator).not.toContain("/");
    expect(nameWithSeparator).not.toContain("/");
    expect(tenantWithSeparator).toMatch(/^b64_[A-Za-z0-9_-]+$/);
  });
});
