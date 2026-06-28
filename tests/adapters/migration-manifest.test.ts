import {
  checkGeneratedTypes,
  generatedFromMigrationsManifestSha256,
  loadManifest,
  migrationsManifestSha256,
  verifyMigrationManifest,
} from "@foundation/adapter-db";
import { describe, expect, it } from "vitest";

describe("migration manifest integrity", () => {
  it("verifies the real migration manifest (contiguous order + matching checksums)", () => {
    expect(() => verifyMigrationManifest()).not.toThrow();
  });

  it("keeps generated DB types fresh against the manifest", () => {
    expect(() => checkGeneratedTypes()).not.toThrow();
    expect(migrationsManifestSha256()).toBe(generatedFromMigrationsManifestSha256);
  });

  it("detects a tampered migration checksum (immutability violation)", () => {
    const manifest = loadManifest();
    const tampered = {
      migrations: manifest.migrations.map((entry, index) =>
        index === 0 ? { ...entry, sha256: "0".repeat(64) } : entry,
      ),
    };
    expect(() => verifyMigrationManifest(tampered)).toThrow(/checksum mismatch/);
  });

  it("detects a non-contiguous migration order", () => {
    const manifest = loadManifest();
    const reordered = {
      migrations: manifest.migrations.map((entry) => ({ ...entry, order: entry.order + 5 })),
    };
    expect(() => verifyMigrationManifest(reordered)).toThrow(/contiguous/);
  });
});
