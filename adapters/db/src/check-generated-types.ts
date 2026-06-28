import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { generatedFromMigrationsManifestSha256 } from "./generated-types.ts";

interface ManifestEntry {
  readonly order: number;
  readonly id: string;
  readonly file: string;
  readonly sha256: string;
}

interface MigrationManifest {
  readonly migrations: readonly ManifestEntry[];
}

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function loadManifest(): MigrationManifest {
  const raw = readFileSync(new URL("../migrations/manifest.json", import.meta.url), "utf8");
  return JSON.parse(raw) as MigrationManifest;
}

// Forward-only order + per-file immutability/checksum verification. Throws on any
// gap, reorder, or content tamper.
export function verifyMigrationManifest(manifest: MigrationManifest = loadManifest()): void {
  const entries = [...manifest.migrations].sort((a, b) => a.order - b.order);
  entries.forEach((entry, index) => {
    if (entry.order !== index + 1) {
      throw new Error(
        `Migration order is not contiguous at ${entry.file}: expected ${index + 1}, got ${entry.order}`,
      );
    }
    const bytes = readFileSync(new URL(`../migrations/${entry.file}`, import.meta.url));
    const actual = sha256Hex(bytes);
    if (actual !== entry.sha256) {
      throw new Error(
        `Migration ${entry.file} checksum mismatch (immutability violation): manifest ${entry.sha256}, observed ${actual}`,
      );
    }
  });
}

export function migrationsManifestSha256(manifest: MigrationManifest = loadManifest()): string {
  const ordered = [...manifest.migrations].sort((a, b) => a.order - b.order);
  return sha256Hex(ordered.map((entry) => entry.sha256).join("\n"));
}

export function checkGeneratedTypes(): void {
  verifyMigrationManifest();
  const actual = migrationsManifestSha256();
  if (actual !== generatedFromMigrationsManifestSha256) {
    throw new Error(
      `Generated DB types are stale: expected ${generatedFromMigrationsManifestSha256}, observed ${actual}`,
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkGeneratedTypes();
  console.log(
    JSON.stringify({ status: "pass", check: "generated-db-types-and-migration-manifest" }),
  );
}
